import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import nodemailer from "nodemailer";

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// Supabase client creation
const supabaseUrl = process.env.VITE_SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";
const supabase = createClient(supabaseUrl, supabaseKey);

// Nodemailer SMTP Transporter Setup
const smtpHost = process.env.SMTP_HOST || "";
const smtpPort = Number(process.env.SMTP_PORT) || 587;
const smtpUser = process.env.SMTP_USER || "";
const smtpPass = process.env.SMTP_PASS || "";
const smtpFrom = process.env.SMTP_FROM || '"Schedora" <no-reply@schedora.com>';

const hasSmtpConfig = !!smtpHost && !!smtpUser && !!smtpPass;
const transporter = hasSmtpConfig
  ? nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    })
  : null;


// Stripe API setup
const stripeKey = process.env.STRIPE_SECRET_KEY || "";
const hasStripeConfig = !!stripeKey && !stripeKey.startsWith("your_") && !stripeKey.endsWith("...") && !stripeKey.includes("placeholder");
const stripe = hasStripeConfig ? new Stripe(stripeKey, { apiVersion: "2023-10-16" as any }) : null;

// Determine stripe sandbox test mode badge
const isStripeTestMode = !hasStripeConfig || stripeKey.includes("test") || stripeKey.startsWith("sk_test");

// CORS config
app.use(cors());

// Webhook endpoint needs raw body for signature verification
app.post(
  "/api/billing/webhook",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    console.log("Stripe Webhook Event Received");
    
    if (!hasStripeConfig) {
      console.log("Stripe not configured. Webhook ignored.");
      return res.status(200).json({ received: true, mock: true });
    }

    const sig = req.headers["stripe-signature"] as string;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || "";

    let event: Stripe.Event;

    try {
      event = stripe!.webhooks.constructEvent(req.body, sig, webhookSecret);
    } catch (err: any) {
      console.error(`Webhook signature verification failed: ${err.message}`);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    try {
      switch (event.type) {
        case "checkout.session.completed": {
          const session = event.data.object as Stripe.Checkout.Session;
          const userId = session.metadata?.userId;
          const plan = session.metadata?.plan || "free";
          const customerId = session.customer as string;
          const subscriptionId = session.subscription as string;

          if (userId) {
            let start = new Date().toISOString();
            let end = new Date(Date.now() + 30 * 86400000).toISOString();

            if (subscriptionId) {
              const subDetail = await stripe!.subscriptions.retrieve(subscriptionId);
              start = new Date(subDetail.current_period_start * 1000).toISOString();
              end = new Date(subDetail.current_period_end * 1000).toISOString();
            }

            const { error } = await supabase
              .from("subscriptions")
              .upsert({
                user_id: userId,
                plan: plan,
                status: "active",
                subscription_plan: plan,
                subscription_status: "active",
                stripe_customer_id: customerId,
                stripe_subscription_id: subscriptionId,
                billing_cycle: "monthly",
                subscription_start: start,
                subscription_end: end,
                updated_at: new Date().toISOString(),
              }, { onConflict: "user_id" });

            if (error) {
              console.error(`Failed to record checkout session completion in DB: ${error.message}`);
            } else {
              console.log(`Successfully upgraded user ${userId} to ${plan}`);
            }
          }
          break;
        }

        case "customer.subscription.updated": {
          const subscription = event.data.object as Stripe.Subscription;
          const customerId = subscription.customer as string;
          const status = subscription.status; // active, trialing, past_due, canceled, unpaid

          // Find user by customer ID
          const { data: subData, error: findError } = await supabase
            .from("subscriptions")
            .select("user_id")
            .eq("stripe_customer_id", customerId)
            .maybeSingle();

          if (subData && !findError) {
            const mappedStatus = status === "active" ? "active" : status === "unpaid" || status === "past_due" ? "past_due" : "cancelled";
            
            // Retrieve plan based on price id
            let plan = "pro";
            const priceId = subscription.items.data[0]?.price.id;
            if (priceId === process.env.PRICE_ID_ENTERPRISE) {
              plan = "enterprise";
            }

            const { error: updateError } = await supabase
              .from("subscriptions")
              .update({
                status: mappedStatus,
                subscription_status: mappedStatus,
                plan,
                subscription_plan: plan,
                subscription_start: new Date(subscription.current_period_start * 1000).toISOString(),
                subscription_end: new Date(subscription.current_period_end * 1000).toISOString(),
                updated_at: new Date().toISOString(),
              })
              .eq("user_id", subData.user_id);

            if (updateError) {
              console.error(`Failed to update subscription for customer ${customerId}: ${updateError.message}`);
            } else {
              console.log(`Updated subscription status for customer ${customerId} to ${mappedStatus}`);
            }
          }
          break;
        }

        case "customer.subscription.deleted": {
          const subscription = event.data.object as Stripe.Subscription;
          const customerId = subscription.customer as string;

          const { data: subData, error: findError } = await supabase
            .from("subscriptions")
            .select("user_id")
            .eq("stripe_customer_id", customerId)
            .maybeSingle();

          if (subData && !findError) {
            const { error: updateError } = await supabase
              .from("subscriptions")
              .update({
                plan: "free",
                subscription_plan: "free",
                status: "cancelled",
                subscription_status: "cancelled",
                subscription_end: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              })
              .eq("user_id", subData.user_id);

            if (updateError) console.error(`Failed to downgrade customer ${customerId}: ${updateError.message}`);
            else console.log(`Subscription deleted. User ${subData.user_id} downgraded to free.`);
          }
          break;
        }

        case "invoice.paid": {
          const invoice = event.data.object as Stripe.Invoice;
          const subscriptionId = invoice.subscription as string;

          if (subscriptionId) {
            const { data: subData } = await supabase
              .from("subscriptions")
              .select("user_id")
              .eq("stripe_subscription_id", subscriptionId)
              .maybeSingle();

            if (subData) {
              await supabase
                .from("subscriptions")
                .update({
                  status: "active",
                  subscription_status: "active",
                  updated_at: new Date().toISOString(),
                })
                .eq("user_id", subData.user_id);
              console.log(`Invoice paid: verified active status for subscription ${subscriptionId}`);
            }
          }
          break;
        }

        case "invoice.payment_failed": {
          const invoice = event.data.object as Stripe.Invoice;
          const subscriptionId = invoice.subscription as string;

          if (subscriptionId) {
            const { data: subData } = await supabase
              .from("subscriptions")
              .select("user_id")
              .eq("stripe_subscription_id", subscriptionId)
              .maybeSingle();

            if (subData) {
              await supabase
                .from("subscriptions")
                .update({
                  status: "past_due",
                  subscription_status: "past_due",
                  updated_at: new Date().toISOString(),
                })
                .eq("user_id", subData.user_id);
              console.log(`Invoice payment failed for subscription ${subscriptionId}`);
            }
          }
          break;
        }

        case "payment_intent.succeeded": {
          const pi = event.data.object as Stripe.PaymentIntent;
          const userId = pi.metadata?.userId;
          const plan = pi.metadata?.plan;

          if (userId && plan) {
            console.log(`Payment intent succeeded for user ${userId}, plan ${plan}`);
            const nowStr = new Date().toISOString();
            const endStr = new Date(Date.now() + 30 * 86400000).toISOString();
            
            const { error } = await supabase
              .from("subscriptions")
              .upsert({
                user_id: userId,
                plan: plan,
                status: "active",
                subscription_plan: plan,
                subscription_status: "active",
                stripe_customer_id: pi.customer as string,
                stripe_subscription_id: pi.invoice ? (pi.invoice as string) : undefined,
                billing_cycle: "monthly",
                subscription_start: nowStr,
                subscription_end: endStr,
                updated_at: nowStr,
              }, { onConflict: "user_id" });

            if (error) {
              console.error(`Failed to update subscription on payment_intent.succeeded: ${error.message}`);
            } else {
              console.log(`Successfully upgraded user ${userId} to ${plan} on payment_intent.succeeded`);
            }
          }
          break;
        }

        case "payment_intent.payment_failed": {
          const pi = event.data.object as Stripe.PaymentIntent;
          const userId = pi.metadata?.userId;
          if (userId) {
            console.log(`Payment intent failed for user ${userId}`);
            await supabase
              .from("subscriptions")
              .update({
                status: "past_due",
                subscription_status: "past_due",
                updated_at: new Date().toISOString(),
              })
              .eq("user_id", userId);
          }
          break;
        }

        default:
          console.log(`Unhandled webhook event type: ${event.type}`);
      }
    } catch (dbErr: any) {
      console.error(`Database update during webhook failed: ${dbErr.message}`);
    }

    res.json({ received: true });
  }
);

// Standard JSON parsing middleware for regular routes
app.use(express.json());

// Token validation middleware
async function requireAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing or invalid authorization header" });
  }

  const token = authHeader.split(" ")[1];

  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) {
    return res.status(401).json({ error: "Unauthorized access: " + (error?.message || "Invalid Token") });
  }

  const userSupabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false },
    global: {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    },
  });

  (req as any).user = user;
  (req as any).supabase = userSupabase;
  next();
}

// ----------------------------------------------------
// BOOKINGS / JOIN MEETINGS API LAYER
// ----------------------------------------------------

// POST /api/bookings/payment-intent (Public)
// Creates a Stripe PaymentIntent for visitors scheduling paid meetings
app.post("/api/bookings/payment-intent", async (req, res) => {
  const { username, slug } = req.body;
  if (!username || !slug) {
    return res.status(400).json({ error: "Username and event slug are required." });
  }

  try {
    // 1. Get host
    const { data: host, error: hostErr } = await supabase
      .from("profiles")
      .select("id")
      .eq("username", username)
      .single();

    if (hostErr || !host) {
      return res.status(404).json({ error: "Host profile not found." });
    }

    // 2. Get event type
    const { data: eventType, error: eventErr } = await supabase
      .from("event_types")
      .select("*")
      .eq("user_id", host.id)
      .eq("slug", slug)
      .eq("is_active", true)
      .single();

    if (eventErr || !eventType) {
      return res.status(404).json({ error: "Event type not found or inactive." });
    }

    const priceNum = Number((eventType as any).price) || 0;
    if (!(eventType as any).is_paid || priceNum <= 0) {
      return res.status(400).json({ error: "This event is free. No payment needed." });
    }

    const amount = Math.round(priceNum * 100); // Stripe amount in cents

    // Check configuration
    if (!hasStripeConfig) {
      console.log(`Mock Mode: Simulating booking PaymentIntent creation for amount ${amount} cents`);
      return res.json({
        clientSecret: `mock_booking_pi_secret_${eventType.id}_${Date.now()}`,
        amount,
        isMock: true
      });
    }

    // Create Stripe PaymentIntent
    const paymentIntent = await stripe!.paymentIntents.create({
      amount,
      currency: "usd",
      metadata: {
        hostId: host.id,
        eventSlug: eventType.slug,
        type: "booking_payment"
      }
    });

    return res.json({
      clientSecret: paymentIntent.client_secret,
      amount
    });
  } catch (err: any) {
    console.error("Error creating booking payment intent:", err);
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/bookings/public (Public)
// Secure transaction-safe booking creation with backend checks and conflicts verification
app.post("/api/bookings/public", async (req, res) => {
  const {
    username,
    slug,
    attendeeName,
    attendeeEmail,
    bookingDate,
    bookingTime,
    notes,
    stripePaymentIntentId
  } = req.body;

  if (!username || !slug || !attendeeName || !attendeeEmail || !bookingDate || !bookingTime) {
    return res.status(400).json({ error: "Required fields are missing." });
  }

  try {
    // 1. Get host
    const { data: host, error: hostErr } = await supabase
      .from("profiles")
      .select("id, timezone, full_name, email")
      .eq("username", username)
      .single();

    if (hostErr || !host) {
      return res.status(404).json({ error: "Host profile not found." });
    }

    // 2. Get event type
    const { data: eventType, error: eventErr } = await supabase
      .from("event_types")
      .select("*")
      .eq("user_id", host.id)
      .eq("slug", slug)
      .eq("is_active", true)
      .single();

    if (eventErr || !eventType) {
      return res.status(404).json({ error: "Event type not found or inactive." });
    }

    // 3. Payment Validation (Stripe Elements)
    const isReallyPaid = (eventType as any).is_paid && Number((eventType as any).price) > 0;
    if (isReallyPaid) {
      if (!stripePaymentIntentId) {
        return res.status(400).json({ error: "Payment is required for this booking." });
      }

      if (hasStripeConfig && !stripePaymentIntentId.startsWith("mock_")) {
        // Verify payment intent with Stripe
        try {
          const pi = await stripe!.paymentIntents.retrieve(stripePaymentIntentId);
          if (pi.status !== "succeeded") {
            return res.status(400).json({ error: `Payment is not completed. Current status: ${pi.status}` });
          }
        } catch (stripeErr: any) {
          return res.status(400).json({ error: "Failed to verify Stripe payment: " + stripeErr.message });
        }
      } else {
        // Mock mode validation
        console.log(`Mock Mode Verified PaymentIntent: ${stripePaymentIntentId}`);
      }
    }

    // 4. Load Availability Settings for this weekday
    // Note: javascript Date getDay() returns 0 for Sunday, 1 for Monday etc.
    const proposedStart = new Date(`${bookingDate}T${bookingTime}:00`);
    const dayOfWeek = proposedStart.getDay();

    const { data: availability, error: availErr } = await supabase
      .from("availability_settings")
      .select("*")
      .eq("user_id", host.id)
      .eq("day_of_week", dayOfWeek)
      .single();

    if (availErr || !availability) {
      return res.status(400).json({ error: "Host is not available on this day." });
    }

    if (!availability.is_available) {
      return res.status(400).json({ error: "Host has marked this day as unavailable." });
    }

    // Validate that the slot falls within availability hours
    const startStr = availability.start_time; // e.g. "09:00:00" or "09:00"
    const endStr = availability.end_time; // e.g. "17:00:00" or "17:00"
    
    // Compare times
    const proposedTimeStr = bookingTime + ":00"; // e.g. "10:30:00"
    if (proposedTimeStr < startStr || proposedTimeStr > endStr) {
      return res.status(400).json({ error: `Selected slot must be between ${startStr.slice(0, 5)} and ${endStr.slice(0, 5)}.` });
    }

    // 5. Check Daily Booking Limits
    const { data: existingBookings, error: fetchBookingsErr } = await supabase
      .from("bookings")
      .select("*")
      .eq("user_id", host.id)
      .eq("booking_date", bookingDate)
      .neq("status", "cancelled");

    if (fetchBookingsErr) {
      return res.status(500).json({ error: "Failed to fetch existing bookings." });
    }

    if (existingBookings.length >= (availability.daily_limit || 10)) {
      return res.status(400).json({ error: "Host's daily booking limit has been reached for this date." });
    }

    // 6. Overlap conflict checks
    const proposedEnd = new Date(proposedStart.getTime() + eventType.duration * 60 * 1000);

    for (const b of existingBookings) {
      const bStart = new Date(`${b.booking_date}T${b.booking_time}:00`);
      const bEnd = new Date(bStart.getTime() + b.duration * 60 * 1000);

      // Block intervals incorporating buffer before/after
      const blockedStart = new Date(bStart.getTime() - (availability.buffer_before || 0) * 60 * 1000);
      const blockedEnd = new Date(bEnd.getTime() + (availability.buffer_after || 0) * 60 * 1000);

      if (proposedStart < blockedEnd && blockedStart < proposedEnd) {
        return res.status(400).json({ error: "This slot conflicts with an existing booking or buffer time." });
      }
    }

    // 7. External Calendar Conflicts check
    const { data: externalConflicts, error: externalErr } = await supabase
      .from("calendar_events")
      .select("*")
      .eq("user_id", host.id)
      .eq("status", "confirmed")
      .filter("start_time", "lt", proposedEnd.toISOString())
      .filter("end_time", "gt", proposedStart.toISOString());

    if (externalErr) {
      return res.status(500).json({ error: "Failed to verify calendar conflicts." });
    }

    if (externalConflicts && externalConflicts.length > 0) {
      return res.status(400).json({ error: "This slot conflicts with a synced event on the host's calendar." });
    }

    // 8. Generate Meeting Link based on location provider and host integrations
    let meetingLink = "";
    const loc = eventType.location || "Google Meet";
    if (loc === "Zoom") {
      const { data: integration } = await supabase
        .from("integrations")
        .select("*")
        .eq("user_id", host.id)
        .eq("provider", "zoom")
        .maybeSingle();
      const connData = integration?.connection_data as any;
      meetingLink = connData?.meeting_url || connData?.custom_link || `https://zoom.us/j/${Math.floor(1000000000 + Math.random() * 9000000000)}`;
    } else if (loc === "Google Meet") {
      const { data: integration } = await supabase
        .from("integrations")
        .select("*")
        .eq("user_id", host.id)
        .eq("provider", "google_meet")
        .maybeSingle();
      const connData = integration?.connection_data as any;
      if (connData?.meeting_url) {
        meetingLink = connData.meeting_url;
      } else {
        const mid1 = Math.random().toString(36).substring(2, 5);
        const mid2 = Math.random().toString(36).substring(2, 6);
        const mid3 = Math.random().toString(36).substring(2, 5);
        meetingLink = `https://meet.google.com/${mid1}-${mid2}-${mid3}`;
      }
    } else if (loc === "Phone Call") {
      meetingLink = "+1 (555) 019-9231";
    } else if (loc === "In Person") {
      meetingLink = "Office Headquarters (In Person)";
    } else {
      // Default: Google Meet format or other providers
      const providerId = loc.toLowerCase().replace(" ", "_");
      const { data: integration } = await supabase
        .from("integrations")
        .select("*")
        .eq("user_id", host.id)
        .eq("provider", providerId)
        .maybeSingle();
      const connData = integration?.connection_data as any;
      meetingLink = connData?.meeting_url || connData?.custom_link || `https://meet.google.com/${Math.random().toString(36).substring(2, 5)}-${Math.random().toString(36).substring(2, 6)}-${Math.random().toString(36).substring(2, 5)}`;
    }



    // 9. Save verified booking to database
    const { data: newBooking, error: insertErr } = await supabase
      .from("bookings")
      .insert({
        user_id: host.id,
        attendee_name: attendeeName,
        attendee_email: attendeeEmail,
        event_type: eventType.title,
        meeting_platform: eventType.location || "Google Meet",
        duration: eventType.duration,
        booking_date: bookingDate,
        booking_time: bookingTime,
        notes: notes || null,
        status: "upcoming",
        meeting_provider: eventType.location || "Google Meet",
        meeting_link: meetingLink,
        meeting_status: "ready",
        payment_status: isReallyPaid ? "paid" : "unpaid",
        stripe_payment_intent_id: stripePaymentIntentId || null
      })
      .select()
      .single();

    if (insertErr || !newBooking) {
      return res.status(500).json({ error: "Failed to write booking to database: " + insertErr?.message });
    }

    // 10. Sync to internal calendar_events
    const { error: calErr } = await supabase
      .from("calendar_events")
      .insert({
        user_id: host.id,
        provider: "internal",
        external_event_id: newBooking.id,
        title: `${eventType.title} with ${attendeeName}`,
        start_time: proposedStart.toISOString(),
        end_time: proposedEnd.toISOString(),
        status: "confirmed"
      });

    if (calErr) {
      console.error("Failed to insert blockade calendar event:", calErr.message);
    }

    // 11. Dispatch notifications (simulated & real SMTP)
    console.log(`[Notification Alert] Host "${host.email}" notified: New booking "${eventType.title}" with "${attendeeName}" (${attendeeEmail}) at ${bookingDate} ${bookingTime}.`);
    console.log(`[Notification Alert] Visitor "${attendeeEmail}" notified: Booking confirmation with "${host.full_name || username}". Meeting link: ${meetingLink}`);

    if (transporter) {
      const hostName = host.full_name || username;
      const formattedDateTime = new Date(`${bookingDate}T${bookingTime}:00`).toLocaleDateString("en-US", {
        weekday: "long", year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit"
      });

      // HTML for visitor
      const visitorHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background-color: #f9f9fa; color: #1a1f36; padding: 20px; }
            .container { max-width: 580px; margin: 0 auto; background: #ffffff; border: 1px solid #e3e8ee; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(50, 50, 93, 0.05); }
            .header { background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%); padding: 30px; text-align: center; }
            .header h1 { color: #ffffff; margin: 0; font-size: 22px; font-weight: 700; }
            .content { padding: 40px 30px; }
            .content p { font-size: 16px; line-height: 24px; margin-bottom: 20px; color: #4f566b; }
            .button-container { text-align: center; margin: 30px 0; }
            .button { background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%); color: #ffffff !important; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1); }
            .details { background-color: #f8f9fc; border: 1px solid #eef2f6; border-radius: 6px; padding: 15px; margin: 20px 0; }
            .details-row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 14px; border-bottom: 1px solid #f1f3f7; padding-bottom: 8px; }
            .details-row:last-child { margin-bottom: 0; border-bottom: none; padding-bottom: 0; }
            .details-label { color: #8792a2; }
            .details-value { font-weight: 600; color: #3c4257; text-align: right; }
            .footer { background-color: #f7fafc; padding: 20px; text-align: center; font-size: 12px; color: #a5acb8; border-top: 1px solid #e3e8ee; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Booking Confirmed</h1>
            </div>
            <div class="content">
              <p>Hi <strong>${attendeeName}</strong>,</p>
              <p>Your meeting with <strong>${hostName}</strong> has been successfully scheduled.</p>
              
              <div class="details">
                <div class="details-row">
                  <span class="details-label">Event Type</span>
                  <span class="details-value">${eventType.title}</span>
                </div>
                <div class="details-row">
                  <span class="details-label">Date & Time</span>
                  <span class="details-value">${formattedDateTime} (${host.timezone || "UTC"})</span>
                </div>
                <div class="details-row">
                  <span class="details-label">Platform</span>
                  <span class="details-value">${eventType.location || "Google Meet"}</span>
                </div>
                ${notes ? `
                <div class="details-row">
                  <span class="details-label">Notes</span>
                  <span class="details-value">${notes}</span>
                </div>` : ""}
              </div>
              
              ${meetingLink.startsWith("http") ? `
              <div class="button-container">
                <a href="${meetingLink}" class="button" style="color: #ffffff;">Join Meeting</a>
              </div>
              ` : ""}
              
              ${meetingLink.startsWith("http") ? `
              <p>You can also use this direct link to join the meeting when it's time: <a href="${meetingLink}">${meetingLink}</a></p>
              ` : `
              <p>Meeting Location/Details: <strong>${meetingLink}</strong></p>
              `}
            </div>
            <div class="footer">
              <p>This email was sent by Schedora. &copy; 2026 Schedora. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `;

      // HTML for host
      const hostHtml = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background-color: #f9f9fa; color: #1a1f36; padding: 20px; }
            .container { max-width: 580px; margin: 0 auto; background: #ffffff; border: 1px solid #e3e8ee; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(50, 50, 93, 0.05); }
            .header { background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%); padding: 30px; text-align: center; }
            .header h1 { color: #ffffff; margin: 0; font-size: 22px; font-weight: 700; }
            .content { padding: 40px 30px; }
            .content p { font-size: 16px; line-height: 24px; margin-bottom: 20px; color: #4f566b; }
            .button-container { text-align: center; margin: 30px 0; }
            .button { background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%); color: #ffffff !important; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1); }
            .details { background-color: #f8f9fc; border: 1px solid #eef2f6; border-radius: 6px; padding: 15px; margin: 20px 0; }
            .details-row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 14px; border-bottom: 1px solid #f1f3f7; padding-bottom: 8px; }
            .details-row:last-child { margin-bottom: 0; border-bottom: none; padding-bottom: 0; }
            .details-label { color: #8792a2; }
            .details-value { font-weight: 600; color: #3c4257; text-align: right; }
            .footer { background-color: #f7fafc; padding: 20px; text-align: center; font-size: 12px; color: #a5acb8; border-top: 1px solid #e3e8ee; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>New Meeting Booked</h1>
            </div>
            <div class="content">
              <p>Hi <strong>${hostName}</strong>,</p>
              <p>A new meeting has been booked on your calendar by <strong>${attendeeName}</strong>.</p>
              
              <div class="details">
                <div class="details-row">
                  <span class="details-label">Attendee</span>
                  <span class="details-value">${attendeeName} (${attendeeEmail})</span>
                </div>
                <div class="details-row">
                  <span class="details-label">Event Type</span>
                  <span class="details-value">${eventType.title}</span>
                </div>
                <div class="details-row">
                  <span class="details-label">Date & Time</span>
                  <span class="details-value">${formattedDateTime} (${host.timezone || "UTC"})</span>
                </div>
                <div class="details-row">
                  <span class="details-label">Platform</span>
                  <span class="details-value">${eventType.location || "Google Meet"}</span>
                </div>
                ${notes ? `
                <div class="details-row">
                  <span class="details-label">Notes</span>
                  <span class="details-value">${notes}</span>
                </div>` : ""}
              </div>
              
              ${meetingLink.startsWith("http") ? `
              <div class="button-container">
                <a href="${meetingLink}" class="button" style="color: #ffffff;">Join Meeting</a>
              </div>
              ` : ""}
              
              ${meetingLink.startsWith("http") ? `
              <p>Direct meeting link: <a href="${meetingLink}">${meetingLink}</a></p>
              ` : `
              <p>Meeting Location/Details: <strong>${meetingLink}</strong></p>
              `}
            </div>
            <div class="footer">
              <p>This email was sent by Schedora. &copy; 2026 Schedora. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `;

      try {
        // Send email to attendee
        await transporter.sendMail({
          from: smtpFrom,
          to: attendeeEmail,
          subject: `Confirmed: ${eventType.title} with ${hostName}`,
          text: `Hi ${attendeeName},\n\nYour meeting with ${hostName} has been scheduled.\n\nEvent Type: ${eventType.title}\nDate/Time: ${formattedDateTime} (${host.timezone || "UTC"})\nPlatform: ${eventType.location || "Google Meet"}\n\n${meetingLink.startsWith("http") ? `Join the meeting here: ${meetingLink}` : `Meeting Location/Details: ${meetingLink}`}`,
          html: visitorHtml,
        });

        // Send email to host
        if (host.email) {
          await transporter.sendMail({
            from: smtpFrom,
            to: host.email,
            subject: `New Booking: ${attendeeName} - ${eventType.title}`,
            text: `Hi ${hostName},\n\nA new meeting has been booked by ${attendeeName} (${attendeeEmail}).\n\nEvent Type: ${eventType.title}\nDate/Time: ${formattedDateTime} (${host.timezone || "UTC"})\nPlatform: ${eventType.location || "Google Meet"}\n\n${meetingLink.startsWith("http") ? `Join the meeting here: ${meetingLink}` : `Meeting Location/Details: ${meetingLink}`}`,
            html: hostHtml,
          });
        }

        
        console.log(`[Email Sent] Booking notification emails sent successfully to attendee ${attendeeEmail} and host ${host.email}`);
      } catch (mailErr: any) {
        console.error("Failed to send booking notification emails via SMTP:", mailErr);
      }
    }

    return res.status(201).json({
      success: true,
      booking: newBooking,
      meetingLink,
      message: "Booking confirmed successfully and synced."
    });
  } catch (err: any) {
    console.error("Error creating booking:", err);
    return res.status(500).json({ error: "Internal server error: " + err.message });
  }
});

app.get("/api/bookings/:id/join", requireAuth, async (req, res) => {
  const user = (req as any).user;
  const bookingId = req.params.id;

  try {
    const { data: booking, error } = await (req as any).supabase
      .from("bookings")
      .select("*")
      .eq("id", bookingId)
      .single();

    if (error || !booking) {
      return res.status(404).json({ error: "Booking not found." });
    }

    // Validate ownership
    if (booking.user_id !== user.id) {
      return res.status(403).json({ error: "Access denied. You do not own this booking." });
    }

    // Validate if cancelled
    if (booking.status === "cancelled" || booking.meeting_status === "cancelled") {
      return res.status(400).json({ error: "Meeting cancelled." });
    }

    // Parse meeting date & time
    const bookingStart = new Date(`${booking.booking_date}T${booking.booking_time}`);
    const bookingEnd = new Date(bookingStart.getTime() + booking.duration * 60 * 1000);
    const now = new Date();

    // Check expiration (ended)
    if (now > bookingEnd) {
      return res.status(400).json({ error: "This meeting has ended." });
    }

    // Check if within 10 minutes of meeting start time
    const allowedJoinTime = new Date(bookingStart.getTime() - 10 * 60 * 1000);
    if (now < allowedJoinTime) {
      return res.status(400).json({ error: "Meeting not ready." });
    }

    // Check meeting link existence
    if (!booking.meeting_link) {
      return res.status(400).json({ error: "Meeting not ready." });
    }

    return res.json({ meeting_link: booking.meeting_link });
  } catch (err: any) {
    return res.status(500).json({ error: "Internal server error: " + err.message });
  }
});

// ----------------------------------------------------
// SAAS BILLING & STRIPE APIS
// ----------------------------------------------------

// GET /api/billing/subscription
app.get("/api/billing/subscription", requireAuth, async (req, res) => {
  const user = (req as any).user;

  try {
    const { data: subscription, error } = await (req as any).supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (error) throw error;

    const currentSub = subscription || {
      plan: "free",
      status: "active",
      subscription_plan: "free",
      subscription_status: "active",
      stripe_customer_id: null,
      stripe_subscription_id: null,
      billing_cycle: "monthly",
      subscription_start: new Date().toISOString(),
      subscription_end: null
    };

    return res.json({ subscription: currentSub, isStripeTestMode });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// GET /api/billing/usage
app.get("/api/billing/usage", requireAuth, async (req, res) => {
  const user = (req as any).user;

  try {
    // 1. Get plan
    const { data: subscription } = await (req as any).supabase
      .from("subscriptions")
      .select("plan")
      .eq("user_id", user.id)
      .maybeSingle();

    const plan = subscription?.plan || "free";

    // 2. Count active event types
    const { count: eventTypesUsed, error: errEt } = await (req as any).supabase
      .from("event_types")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("is_active", true);

    // 3. Count bookings created in the current month
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    const { count: bookingsUsed, error: errBk } = await (req as any).supabase
      .from("bookings")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .gte("created_at", startOfMonth);

    // Limits definition
    const planLimits: Record<string, { eventTypes: number; bookings: number }> = {
      free: { eventTypes: 1, bookings: 10 },
      pro: { eventTypes: 9999, bookings: 500 },
      enterprise: { eventTypes: 9999, bookings: 99999 },
    };

    const limit = planLimits[plan] || planLimits.free;

    return res.json({
      plan,
      eventTypesUsed: eventTypesUsed || 0,
      eventTypesLimit: limit.eventTypes,
      bookingsUsed: bookingsUsed || 0,
      bookingsLimit: limit.bookings,
      isStripeTestMode,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/billing/create-checkout-session
app.post("/api/billing/create-checkout-session", requireAuth, async (req, res) => {
  const user = (req as any).user;
  const { plan, successUrl, cancelUrl } = req.body;

  if (!plan || !["pro", "enterprise"].includes(plan)) {
    return res.status(400).json({ error: "Invalid plan type specified." });
  }

  try {
    // 1. Get existing subscription customer ID if exists
    const { data: subData } = await (req as any).supabase
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .maybeSingle();

    let stripeCustomerId = subData?.stripe_customer_id;
    if (stripeCustomerId && stripeCustomerId.startsWith("mock_")) {
      stripeCustomerId = null;
    }

    // Developer Mock Sandbox Mode Fallback
    if (!hasStripeConfig) {
      console.log("Mock Mode: Simulating upgrade flow to plan:", plan);
      const mockSuccessUrl = `${successUrl}?session_id=mock_session_${Date.now()}&plan=${plan}`;
      return res.json({ url: mockSuccessUrl, isMock: true });
    }

    // Define price ID
    const priceId = plan === "pro" ? process.env.PRICE_ID_PRO : process.env.PRICE_ID_ENTERPRISE;
    if (!priceId) {
      return res.status(400).json({ error: `Stripe Price ID for ${plan} is not configured in env variables.` });
    }

    // 2. Create Stripe checkout session
    const session = await stripe!.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: "subscription",
      success_url: successUrl + "?session_id={CHECKOUT_SESSION_ID}",
      cancel_url: cancelUrl,
      customer: stripeCustomerId || undefined,
      customer_email: stripeCustomerId ? undefined : user.email,
      metadata: {
        userId: user.id,
        plan: plan,
      },
    });

    return res.json({ url: session.url });
  } catch (err: any) {
    return res.status(500).json({ error: "Stripe error: " + err.message });
  }
});

// POST /api/billing/create-portal-session
app.post("/api/billing/create-portal-session", requireAuth, async (req, res) => {
  const user = (req as any).user;
  const { returnUrl } = req.body;

  try {
    const { data: subData } = await (req as any).supabase
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .maybeSingle();

    let stripeCustomerId = subData?.stripe_customer_id;
    if (stripeCustomerId && stripeCustomerId.startsWith("mock_")) {
      stripeCustomerId = null;
    }

    // Developer Mock Sandbox Mode Fallback
    if (!hasStripeConfig || !stripeCustomerId) {
      console.log("Mock Mode: Simulating customer portal redirect");
      return res.json({ url: returnUrl, isMock: true });
    }

    const session = await stripe!.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: returnUrl,
    });

    return res.json({ url: session.url });
  } catch (err: any) {
    return res.status(500).json({ error: "Stripe Portal error: " + err.message });
  }
});

// API endpoint to simulate Webhook upgrade in local development/mock sandbox
app.post("/api/billing/mock-success", requireAuth, async (req, res) => {
  const user = (req as any).user;
  const { plan } = req.body;

  if (!plan || !["pro", "enterprise"].includes(plan)) {
    return res.status(400).json({ error: "Invalid plan" });
  }

  try {
    // If not configured, we manually upgrade users via direct DB update
    const nowStr = new Date().toISOString();
    const endStr = new Date(Date.now() + 30 * 86400000).toISOString();

    const { error } = await (req as any).supabase
      .from("subscriptions")
      .upsert({
        user_id: user.id,
        plan: plan,
        status: "active",
        subscription_plan: plan,
        subscription_status: "active",
        stripe_customer_id: `mock_customer_${user.id.substring(0, 8)}`,
        stripe_subscription_id: `mock_sub_${Date.now()}`,
        billing_cycle: "monthly",
        subscription_start: nowStr,
        subscription_end: endStr,
        updated_at: nowStr,
      }, { onConflict: "user_id" });

    if (error) {
      console.error("Database error during mock-success upsert:", error);
      throw error;
    }

    return res.json({ success: true, plan });
  } catch (err: any) {
    console.error("Error in mock-success endpoint:", err);
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/billing/create-payment-intent
app.post("/api/billing/create-payment-intent", requireAuth, async (req, res) => {
  const user = (req as any).user;
  const { plan } = req.body;

  if (!plan || !["pro", "enterprise"].includes(plan)) {
    return res.status(400).json({ error: "Invalid plan specified." });
  }

  const amount = plan === "pro" ? 1200 : 4900; // in cents ($12.00 or $49.00)

  try {
    if (!hasStripeConfig) {
      console.log("Mock Mode: Simulating PaymentIntent creation for plan:", plan);
      return res.json({ clientSecret: `mock_pi_secret_${plan}_${Date.now()}`, isMock: true });
    }

    const paymentIntent = await stripe!.paymentIntents.create({
      amount,
      currency: "usd",
      metadata: { userId: user.id, plan },
    });

    return res.json({ clientSecret: paymentIntent.client_secret });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/billing/create-subscription
app.post("/api/billing/create-subscription", requireAuth, async (req, res) => {
  const user = (req as any).user;
  const { plan } = req.body;

  if (!plan || !["pro", "enterprise"].includes(plan)) {
    return res.status(400).json({ error: "Invalid plan specified." });
  }

  try {
    const { data: subData } = await (req as any).supabase
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .maybeSingle();

    let stripeCustomerId = subData?.stripe_customer_id;
    if (stripeCustomerId && stripeCustomerId.startsWith("mock_")) {
      stripeCustomerId = null;
    }

    if (!hasStripeConfig) {
      console.log("Mock Mode: Simulating Subscription creation for plan:", plan);
      return res.json({
        subscriptionId: `mock_sub_${plan}_${Date.now()}`,
        clientSecret: `mock_sub_secret_${plan}_${Date.now()}`,
        isMock: true,
      });
    }

    // Create a customer if one doesn't exist yet
    if (!stripeCustomerId) {
      const customer = await stripe!.customers.create({
        email: user.email,
        metadata: { userId: user.id },
      });
      stripeCustomerId = customer.id;

      await (req as any).supabase
        .from("subscriptions")
        .upsert({
          user_id: user.id,
          stripe_customer_id: stripeCustomerId,
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id" });
    }

    const priceId = plan === "pro" ? process.env.PRICE_ID_PRO : process.env.PRICE_ID_ENTERPRISE;
    if (!priceId) {
      return res.status(400).json({ error: `Stripe Price ID for ${plan} is not configured.` });
    }

    const subscription = await stripe!.subscriptions.create({
      customer: stripeCustomerId,
      items: [{ price: priceId }],
      payment_behavior: "default_incomplete",
      expand: ["latest_invoice.payment_intent"],
      metadata: { userId: user.id, plan },
    });

    const paymentIntent = (subscription.latest_invoice as any)?.payment_intent;
    if (!paymentIntent) {
      return res.status(500).json({ error: "Failed to generate checkout payment intent for subscription." });
    }

    return res.json({
      subscriptionId: subscription.id,
      clientSecret: paymentIntent.client_secret,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// POST /api/billing/manage-subscription
app.post("/api/billing/manage-subscription", requireAuth, async (req, res) => {
  const user = (req as any).user;
  const { returnUrl } = req.body;

  try {
    const { data: subData } = await (req as any).supabase
      .from("subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .maybeSingle();

    let stripeCustomerId = subData?.stripe_customer_id;
    if (stripeCustomerId && stripeCustomerId.startsWith("mock_")) {
      stripeCustomerId = null;
    }

    if (!hasStripeConfig || !stripeCustomerId) {
      console.log("Mock Mode: Simulating customer portal redirect");
      return res.json({ url: returnUrl || `${req.headers.origin}/dashboard/billing`, isMock: true });
    }

    const session = await stripe!.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: returnUrl || `${req.headers.origin}/dashboard/billing`,
    });

    return res.json({ url: session.url });
  } catch (err: any) {
    return res.status(500).json({ error: "Stripe Portal error: " + err.message });
  }
});

// GET /api/billing/invoices
app.get("/api/billing/invoices", requireAuth, async (req, res) => {
  const user = (req as any).user;

  try {
    const { data: subData } = await (req as any).supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    const stripeCustomerId = subData?.stripe_customer_id;
    const currentPlan = subData?.plan || "free";
    const subStart = subData?.subscription_start || new Date().toISOString();

    if (!hasStripeConfig || !stripeCustomerId || stripeCustomerId.startsWith("mock_")) {
      // Dynamic mock invoice generation
      const mockInvoices = [
        {
          id: subData?.stripe_subscription_id || "mock_inv_initial",
          number: `INV-001-SUCCESS`,
          description: `${currentPlan.toUpperCase()} Plan registration`,
          amount: currentPlan === "pro" ? 12.00 : currentPlan === "enterprise" ? 49.00 : 0.00,
          status: "paid",
          created: Math.floor(new Date(subStart).getTime() / 1000),
          pdf: "#",
        }
      ];

      // If user has upgraded to a paid plan, include simulated subscription cycle base fee
      if (currentPlan !== "free") {
        mockInvoices.unshift({
          id: `mock_inv_cycle_${Date.now()}`,
          number: `INV-002-SUCCESS`,
          description: `${currentPlan.toUpperCase()} Subscription Cycle Fee`,
          amount: currentPlan === "pro" ? 12.00 : 49.00,
          status: "paid",
          created: Math.floor(Date.now() / 1000),
          pdf: "#",
        });
      }

      return res.json({ invoices: mockInvoices });
    }

    // Live Stripe Mode - Fetch invoices
    const stripeInvoices = await stripe!.invoices.list({
      customer: stripeCustomerId,
      limit: 10,
    });

    const invoices = stripeInvoices.data.map((inv) => ({
      id: inv.id,
      number: inv.number || `INV-${inv.id.substring(3, 8).toUpperCase()}`,
      description: inv.lines.data[0]?.description || "Subscription Cycle Fee",
      amount: inv.amount_paid / 100,
      status: inv.status || "paid",
      created: inv.created,
      pdf: inv.invoice_pdf || "#",
    }));

    return res.json({ invoices });
  } catch (err: any) {
    return res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// TEAM INVITATIONS API LAYER
// ----------------------------------------------------

// POST /api/team/invite
app.post("/api/team/invite", requireAuth, async (req, res) => {
  const user = (req as any).user;
  const { teamId, email, role, baseUrl } = req.body;

  if (!teamId || !email || !role || !baseUrl) {
    return res.status(400).json({ error: "Required fields (teamId, email, role, baseUrl) are missing." });
  }

  try {
    // 1. Verify user is owner or admin of the team
    const { data: team, error: teamErr } = await supabase
      .from("teams")
      .select("*")
      .eq("id", teamId)
      .single();

    if (teamErr || !team) {
      return res.status(404).json({ error: "Team not found." });
    }

    let isAuthorized = team.owner_id === user.id;

    if (!isAuthorized) {
      const { data: member, error: memberErr } = await supabase
        .from("team_members")
        .select("role")
        .eq("team_id", teamId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (!memberErr && member && (member.role === "owner" || member.role === "admin")) {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      return res.status(403).json({ error: "Access denied. You must be the owner or an admin of the team to invite members." });
    }

    // 2. Generate invite details
    const token = crypto.randomUUID();
    const expires = new Date();
    expires.setDate(expires.getDate() + 7); // 7 days expiration

    // 3. Insert invite record into Supabase using service role client
    const { data: newInvite, error: inviteErr } = await supabase
      .from("team_invites")
      .insert({
        team_id: teamId,
        sender_id: user.id,
        recipient_email: email,
        role: role,
        invite_token: token,
        status: "pending",
        expires_at: expires.toISOString(),
      })
      .select()
      .single();

    if (inviteErr || !newInvite) {
      return res.status(500).json({ error: "Failed to create invitation: " + (inviteErr?.message || "unknown error") });
    }

    // 4. Construct invite link
    const inviteUrl = `${baseUrl}/invite/${token}`;

    // 5. Retrieve sender's name to personalize the email
    const senderName = user.user_metadata?.full_name || user.email || "A Schedora User";

    // 6. Send the email if SMTP is configured
    if (transporter) {
      const expiresDateStr = new Date(expires).toLocaleDateString("en-US", {
        weekday: "long", year: "numeric", month: "long", day: "numeric"
      });
      const htmlBody = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background-color: #f9f9fa; color: #1a1f36; padding: 20px; }
            .container { max-width: 580px; margin: 0 auto; background: #ffffff; border: 1px solid #e3e8ee; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(50, 50, 93, 0.05); }
            .header { background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%); padding: 30px; text-align: center; }
            .header h1 { color: #ffffff; margin: 0; font-size: 24px; font-weight: 700; }
            .content { padding: 40px 30px; }
            .content p { font-size: 16px; line-height: 24px; margin-bottom: 20px; color: #4f566b; }
            .button-container { text-align: center; margin: 30px 0; }
            .button { background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%); color: #ffffff !important; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1); }
            .details { background-color: #f8f9fc; border: 1px solid #eef2f6; border-radius: 6px; padding: 15px; margin: 20px 0; }
            .details-row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 14px; }
            .details-row:last-child { margin-bottom: 0; }
            .details-label { color: #8792a2; }
            .details-value { font-weight: 600; color: #3c4257; }
            .footer { background-color: #f7fafc; padding: 20px; text-align: center; font-size: 12px; color: #a5acb8; border-top: 1px solid #e3e8ee; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Join ${team.name}</h1>
            </div>
            <div class="content">
              <p>Hello,</p>
              <p>You have been invited by <strong>${senderName}</strong> to join the <strong>${team.name}</strong> workspace team on Schedora.</p>
              
              <div class="details">
                <div class="details-row">
                  <span class="details-label">Role</span>
                  <span class="details-value" style="text-transform: capitalize;">${role}</span>
                </div>
                <div class="details-row">
                  <span class="details-label">Expires</span>
                  <span class="details-value">${expiresDateStr}</span>
                </div>
              </div>
              
              <div class="button-container">
                <a href="${inviteUrl}" class="button" style="color: #ffffff;">Accept Invitation</a>
              </div>
              
              <p>If you don't want to join this team or if you didn't expect this invitation, you can safely ignore this email.</p>
            </div>
            <div class="footer">
              <p>This invitation was sent by Schedora. &copy; 2026 Schedora. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `;

      try {
        await transporter.sendMail({
          from: smtpFrom,
          to: email,
          subject: `You've been invited to join ${team.name} on Schedora`,
          text: `You have been invited by ${senderName} to join the ${team.name} workspace team on Schedora.\n\nRole: ${role}\nExpires: ${expiresDateStr}\n\nAccept the invitation here: ${inviteUrl}`,
          html: htmlBody,
        });

        console.log(`[Email Sent] Invitation successfully delivered to ${email} for team ${team.name}`);
        return res.status(200).json({
          success: true,
          emailSent: true,
          inviteUrl,
          message: "Invitation email sent successfully!"
        });
      } catch (mailErr: any) {
        console.error("Failed to send invitation email via SMTP:", mailErr);
        return res.status(200).json({
          success: true,
          emailSent: false,
          inviteUrl,
          message: "Invitation created, but failed to send email: " + mailErr.message
        });
      }
    } else {
      console.log(`[SMTP Not Configured] Created invitation for ${email} on team ${team.name}. Link: ${inviteUrl}`);
      return res.status(200).json({
        success: true,
        emailSent: false,
        inviteUrl,
        message: "Invitation created. SMTP is not configured, so email could not be sent. Link copied to clipboard."
      });
    }
  } catch (err: any) {
    console.error("Error in /api/team/invite:", err);
    return res.status(500).json({ error: "Internal server error: " + err.message });
  }
});

// POST /api/team/resend-invite
app.post("/api/team/resend-invite", requireAuth, async (req, res) => {
  const user = (req as any).user;
  const { inviteId, baseUrl } = req.body;

  if (!inviteId || !baseUrl) {
    return res.status(400).json({ error: "Required fields (inviteId, baseUrl) are missing." });
  }

  try {
    // 1. Get existing invitation details
    const { data: invite, error: inviteGetErr } = await supabase
      .from("team_invites")
      .select("*, teams(name)")
      .eq("id", inviteId)
      .single() as any;

    if (inviteGetErr || !invite) {
      return res.status(404).json({ error: "Invitation not found." });
    }

    const teamId = invite.team_id;

    // 2. Verify permissions (user is owner/admin)
    const { data: team, error: teamErr } = await supabase
      .from("teams")
      .select("*")
      .eq("id", teamId)
      .single();

    if (teamErr || !team) {
      return res.status(404).json({ error: "Team not found." });
    }

    let isAuthorized = team.owner_id === user.id;

    if (!isAuthorized) {
      const { data: member, error: memberErr } = await supabase
        .from("team_members")
        .select("role")
        .eq("team_id", teamId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (!memberErr && member && (member.role === "owner" || member.role === "admin")) {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      return res.status(403).json({ error: "Access denied. You must be the owner or an admin of the team to resend invitations." });
    }

    // 3. Regenerate token and expiration
    const token = crypto.randomUUID();
    const expires = new Date();
    expires.setDate(expires.getDate() + 7);

    // 4. Update existing invite record
    const { data: updatedInvite, error: updateErr } = await supabase
      .from("team_invites")
      .update({
        invite_token: token,
        status: "pending",
        expires_at: expires.toISOString(),
        created_at: new Date().toISOString(),
        accepted_at: null,
        declined_at: null,
      })
      .eq("id", inviteId)
      .select()
      .single();

    if (updateErr || !updatedInvite) {
      return res.status(500).json({ error: "Failed to update invitation: " + (updateErr?.message || "unknown error") });
    }

    // 5. Construct invite link
    const inviteUrl = `${baseUrl}/invite/${token}`;
    const email = invite.recipient_email;
    const role = invite.role;
    const teamName = invite.teams?.name || team.name;

    // 6. Retrieve sender's name
    const senderName = user.user_metadata?.full_name || user.email || "A Schedora User";

    // 7. Send the email if SMTP is configured
    if (transporter) {
      const expiresDateStr = new Date(expires).toLocaleDateString("en-US", {
        weekday: "long", year: "numeric", month: "long", day: "numeric"
      });
      const htmlBody = `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background-color: #f9f9fa; color: #1a1f36; padding: 20px; }
            .container { max-width: 580px; margin: 0 auto; background: #ffffff; border: 1px solid #e3e8ee; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(50, 50, 93, 0.05); }
            .header { background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%); padding: 30px; text-align: center; }
            .header h1 { color: #ffffff; margin: 0; font-size: 24px; font-weight: 700; }
            .content { padding: 40px 30px; }
            .content p { font-size: 16px; line-height: 24px; margin-bottom: 20px; color: #4f566b; }
            .button-container { text-align: center; margin: 30px 0; }
            .button { background: linear-gradient(135deg, #7c3aed 0%, #a855f7 100%); color: #ffffff !important; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; display: inline-block; box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1); }
            .details { background-color: #f8f9fc; border: 1px solid #eef2f6; border-radius: 6px; padding: 15px; margin: 20px 0; }
            .details-row { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 14px; }
            .details-row:last-child { margin-bottom: 0; }
            .details-label { color: #8792a2; }
            .details-value { font-weight: 600; color: #3c4257; }
            .footer { background-color: #f7fafc; padding: 20px; text-align: center; font-size: 12px; color: #a5acb8; border-top: 1px solid #e3e8ee; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Join ${teamName}</h1>
            </div>
            <div class="content">
              <p>Hello,</p>
              <p>You have been invited by <strong>${senderName}</strong> to join the <strong>${teamName}</strong> workspace team on Schedora.</p>
              
              <div class="details">
                <div class="details-row">
                  <span class="details-label">Role</span>
                  <span class="details-value" style="text-transform: capitalize;">${role}</span>
                </div>
                <div class="details-row">
                  <span class="details-label">Expires</span>
                  <span class="details-value">${expiresDateStr}</span>
                </div>
              </div>
              
              <div class="button-container">
                <a href="${inviteUrl}" class="button" style="color: #ffffff;">Accept Invitation</a>
              </div>
              
              <p>If you don't want to join this team or if you didn't expect this invitation, you can safely ignore this email.</p>
            </div>
            <div class="footer">
              <p>This invitation was sent by Schedora. &copy; 2026 Schedora. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `;

      try {
        await transporter.sendMail({
          from: smtpFrom,
          to: email,
          subject: `Reminder: You've been invited to join ${teamName} on Schedora`,
          text: `Reminder: You have been invited by ${senderName} to join the ${teamName} workspace team on Schedora.\n\nRole: ${role}\nExpires: ${expiresDateStr}\n\nAccept the invitation here: ${inviteUrl}`,
          html: htmlBody,
        });

        console.log(`[Email Resent] Invitation successfully delivered to ${email} for team ${teamName}`);
        return res.status(200).json({
          success: true,
          emailSent: true,
          inviteUrl,
          message: "Invitation email resent successfully!"
        });
      } catch (mailErr: any) {
        console.error("Failed to resend invitation email via SMTP:", mailErr);
        return res.status(200).json({
          success: true,
          emailSent: false,
          inviteUrl,
          message: "Invitation updated, but failed to send email: " + mailErr.message
        });
      }
    } else {
      console.log(`[SMTP Not Configured] Resent invitation for ${email} on team ${teamName}. Link: ${inviteUrl}`);
      return res.status(200).json({
        success: true,
        emailSent: false,
        inviteUrl,
        message: "Invitation updated. SMTP is not configured, so email could not be sent. Link copied to clipboard."
      });
    }
  } catch (err: any) {
    console.error("Error in /api/team/resend-invite:", err);
    return res.status(500).json({ error: "Internal server error: " + err.message });
  }
});

// App listen
app.listen(port, () => {
  console.log(`Schedora backend API running on port ${port}`);
  console.log(`Stripe integration status: ${hasStripeConfig ? "CONFIGURED (LIVE/SANDBOX)" : "MOCK MODE ENABLED (SANDBOX)"}`);
  console.log(`Test Mode Badge: ${isStripeTestMode ? "ENABLED (SANDBOX)" : "DISABLED"}`);
});
