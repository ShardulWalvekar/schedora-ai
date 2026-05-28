import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Calendar, Clock, MapPin, CheckCircle, ArrowLeft, Loader2, Sparkles } from "lucide-react";
import { DayPicker } from "react-day-picker";
import { format, addMinutes, parseISO } from "date-fns";
import { toast } from "sonner";
import { generateMeetingLink } from "@/lib/utils";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, CardNumberElement, CardExpiryElement, CardCvcElement, useStripe, useElements } from "@stripe/react-stripe-js";

// Lazy load Stripe.js
const stripePublishableKey = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || "";
const stripePromise = stripePublishableKey ? loadStripe(stripePublishableKey) : null;


export const Route = createFileRoute("/$username/$slug")({
  component: PublicBookingPage,
});

function PublicBookingPage() {
  const { username, slug } = Route.useParams();
  const [eventType, setEventType] = useState<any>(null);
  const [hostProfile, setHostProfile] = useState<any>(null);
  const [availability, setAvailability] = useState<any[]>([]);
  const [hostBookings, setHostBookings] = useState<any[]>([]);
  const [hostCalendarEvents, setHostCalendarEvents] = useState<any[]>([]);
  const [hostIntegrations, setHostIntegrations] = useState<any[]>([]);
  const [step, setStep] = useState<"date" | "time" | "form" | "payment" | "success">("date");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedTime, setSelectedTime] = useState("");
  const [guestForm, setGuestForm] = useState({ name: "", email: "", notes: "" });
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [isMockPayment, setIsMockPayment] = useState<boolean>(true);

  useEffect(() => { load(); }, [username, slug]);

  async function load() {
    const { data: profiles } = await supabase.from("profiles").select("*").eq("username", username).limit(1);
    if (!profiles || profiles.length === 0) { setLoading(false); return; }
    const host = profiles[0];
    setHostProfile(host);

    const { data: events } = await supabase.from("event_types").select("*").eq("user_id", host.id).eq("slug", slug).eq("is_active", true).limit(1);
    if (events && events.length > 0) setEventType(events[0]);

    const { data: avail } = await supabase.from("availability_settings").select("*").eq("user_id", host.id);
    if (avail) setAvailability(avail);

    // Fetch host bookings
    const { data: bks } = await supabase.from("bookings").select("*").eq("user_id", host.id).neq("status", "cancelled");
    if (bks) setHostBookings(bks);

    // Fetch host calendar events
    const { data: exts } = await supabase.from("calendar_events").select("*").eq("user_id", host.id);
    if (exts) setHostCalendarEvents(exts);

    // Fetch host integrations
    const { data: ints } = await supabase.from("integrations").select("*").eq("user_id", host.id).eq("status", "connected");
    if (ints) setHostIntegrations(ints);

    setLoading(false);
  }

  function getTimeSlots(): string[] {
    if (!selectedDate || !availability.length) return [];
    const dayOfWeek = selectedDate.getDay();
    const daySetting = availability.find((a) => a.day_of_week === dayOfWeek);
    if (!daySetting || !daySetting.is_available) return [];

    const slots: string[] = [];
    const [startH, startM] = daySetting.start_time.split(":").map(Number);
    const [endH, endM] = daySetting.end_time.split(":").map(Number);
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;
    const duration = eventType?.duration || 30;

    const dateStr = format(selectedDate, "yyyy-MM-dd");

    for (let m = startMinutes; m + duration <= endMinutes; m += 30) {
      const h = Math.floor(m / 60);
      const min = m % 60;
      const timeStr = `${String(h).padStart(2, "0")}:${String(min).padStart(2, "0")}`;
      
      const slotStart = new Date(`${dateStr}T${timeStr}`);
      const slotEnd = addMinutes(slotStart, duration);

      // Check conflict with bookings
      const hasBookingConflict = hostBookings.some((b) => {
        const start = new Date(`${b.booking_date}T${b.booking_time}`);
        const end = addMinutes(start, b.duration);
        return slotStart < end && slotEnd > start;
      });

      if (hasBookingConflict) continue;

      // Check conflict with calendar events
      const hasCalendarConflict = hostCalendarEvents.some((ev) => {
        const start = new Date(ev.start_time);
        const end = new Date(ev.end_time);
        return slotStart < end && slotEnd > start;
      });

      if (hasCalendarConflict) continue;

      slots.push(timeStr);
    }
    return slots;
  }

  async function handleDetailsSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedDate || !selectedTime || !eventType || !hostProfile) return;

    if (eventType.is_paid && eventType.price > 0) {
      setSubmitting(true);
      try {
        const res = await fetch("/api/bookings/payment-intent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, slug })
        });
        
        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.error || "Failed to initialize payment gateway.");
        }
        
        const data = await res.json();
        setClientSecret(data.clientSecret);
        setPaymentAmount(data.amount);
        setIsMockPayment(!!data.isMock);
        setStep("payment");
      } catch (err: any) {
        toast.error(err.message || "Could not connect to payment gateway.");
      } finally {
        setSubmitting(false);
      }
    } else {
      // Free meeting -> directly insert booking
      await executeBookingCreation(null);
    }
  }

  async function executeBookingCreation(paymentIntentId: string | null) {
    setSubmitting(true);
    const bookingDateStr = format(selectedDate!, "yyyy-MM-dd");
    const bookingTimeStr = selectedTime;

    try {
      const res = await fetch("/api/bookings/public", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          slug,
          attendeeName: guestForm.name,
          attendeeEmail: guestForm.email,
          bookingDate: bookingDateStr,
          bookingTime: bookingTimeStr,
          notes: guestForm.notes || null,
          stripePaymentIntentId: paymentIntentId
        })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Booking failed.");
      }

      const data = await res.json();
      toast.success("Appointment booked successfully!");
      setStep("success");
    } catch (err: any) {
      toast.error(err.message || "Failed to confirm booking.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <div className="min-h-screen bg-background flex items-center justify-center"><div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }

  if (!eventType || !hostProfile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <Card><CardContent className="p-12 text-center"><h2 className="text-xl font-bold mb-2">Event Not Found</h2><p className="text-muted-foreground">This booking page doesn't exist or is inactive.</p></CardContent></Card>
      </div>
    );
  }

  if (step === "success") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <Card className="max-w-md w-full"><CardContent className="p-8 text-center animate-slide-up">
          <CheckCircle className="h-16 w-16 text-emerald-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Booking Confirmed!</h2>
          <p className="text-muted-foreground mb-4">Your meeting has been scheduled successfully.</p>
          <div className="glass-card rounded-lg p-4 text-sm space-y-2 text-left">
            <p><strong>Event:</strong> {eventType.title}</p>
            <p><strong>Date:</strong> {selectedDate && format(selectedDate, "MMMM d, yyyy")}</p>
            <p><strong>Time:</strong> {selectedTime}</p>
            <p><strong>Host:</strong> {hostProfile.full_name}</p>
          </div>
        </CardContent></Card>
      </div>
    );
  }

  const timeSlots = getTimeSlots();

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-4xl grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left: Event Info */}
        <div className="lg:col-span-2">
          <Card>
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12"><AvatarFallback className="gradient-bg text-white text-lg">{(hostProfile.full_name || "H").charAt(0)}</AvatarFallback></Avatar>
                <div>
                  <p className="font-semibold">{hostProfile.full_name}</p>
                  <p className="text-xs text-muted-foreground">@{hostProfile.username}</p>
                </div>
              </div>
              <div>
                <h1 className="text-2xl font-bold" style={{ color: eventType.color }}>{eventType.title}</h1>
                {eventType.description && <p className="text-sm text-muted-foreground mt-2">{eventType.description}</p>}
              </div>
              <div className="flex flex-col gap-2 text-sm text-muted-foreground">
                <span className="flex items-center gap-2"><Clock className="h-4 w-4" /> {eventType.duration} minutes</span>
                <span className="flex items-center gap-2"><MapPin className="h-4 w-4" /> {eventType.location}</span>
                {eventType.is_paid && eventType.price > 0 && (
                  <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 font-bold self-start mt-1 text-xs">
                    Paid Meeting: ${eventType.price}
                  </Badge>
                )}
                {/* Timezone Info */}
                <div className="border-t border-border/40 mt-3 pt-3">
                  <span className="text-xs text-muted-foreground block mb-1">Host Timezone: {hostProfile.timezone || 'UTC'}</span>
                  <span className="text-xs font-semibold text-foreground block">Your Timezone: {Intl.DateTimeFormat().resolvedOptions().timeZone}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right: Booking flow */}
        <div className="lg:col-span-3">
          <Card>
            <CardContent className="p-6">
              {step === "date" && (
                <div className="animate-fade-in">
                  <h2 className="text-lg font-semibold mb-4">Select a Date</h2>
                  <DayPicker
                    mode="single"
                    selected={selectedDate}
                    onSelect={(d) => { setSelectedDate(d); if (d) setStep("time"); }}
                    disabled={{ before: new Date() }}
                    className="mx-auto"
                    classNames={{
                      day: "h-9 w-9 rounded-md text-sm flex items-center justify-center cursor-pointer hover:bg-primary/20 transition-colors",
                      selected: "bg-primary text-white",
                      today: "font-bold text-primary",
                    }}
                  />
                </div>
              )}

              {step === "time" && (
                <div className="animate-fade-in">
                  <button onClick={() => setStep("date")} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
                    <ArrowLeft className="h-4 w-4" /> Back
                  </button>
                  <h2 className="text-lg font-semibold mb-2">Select a Time</h2>
                  <p className="text-sm text-muted-foreground mb-2">{selectedDate && format(selectedDate, "EEEE, MMMM d, yyyy")}</p>
                  <p className="text-[11px] text-amber-500 bg-amber-500/10 border border-amber-500/20 rounded-lg p-2 mb-4 flex items-center gap-1.5">
                    <MapPin className="h-3 w-3 shrink-0" />
                    Note: All scheduling slots below are listed in the host's timezone (<strong>{hostProfile.timezone || 'UTC'}</strong>).
                  </p>
                  {timeSlots.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No available times on this date.</p>
                  ) : (
                    <div className="grid grid-cols-3 gap-2 max-h-64 overflow-y-auto">
                      {timeSlots.map((t) => (
                        <Button key={t} variant={selectedTime === t ? "default" : "outline"} className={selectedTime === t ? "gradient-bg" : ""} onClick={() => { setSelectedTime(t); setStep("form"); }}>
                          {t}
                        </Button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {step === "form" && (
                <div className="animate-fade-in">
                  <button onClick={() => setStep("time")} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
                    <ArrowLeft className="h-4 w-4" /> Back
                  </button>
                  <h2 className="text-lg font-semibold mb-4">Your Details</h2>
                  <p className="text-sm text-muted-foreground mb-4">
                    {selectedDate && format(selectedDate, "MMMM d, yyyy")} at {selectedTime}
                  </p>
                  <form onSubmit={handleDetailsSubmit} className="space-y-4">
                    <div><Label>Name</Label><Input value={guestForm.name} onChange={(e) => setGuestForm({ ...guestForm, name: e.target.value })} required className="mt-1.5" placeholder="Your name" /></div>
                    <div><Label>Email</Label><Input type="email" value={guestForm.email} onChange={(e) => setGuestForm({ ...guestForm, email: e.target.value })} required className="mt-1.5" placeholder="you@example.com" /></div>
                    <div><Label>Notes (optional)</Label><Textarea value={guestForm.notes} onChange={(e) => setGuestForm({ ...guestForm, notes: e.target.value })} className="mt-1.5" placeholder="Anything you'd like to discuss?" /></div>
                    <Button type="submit" className="w-full gradient-bg hover:opacity-90 h-11 font-semibold flex items-center justify-center gap-1.5" disabled={submitting}>
                      {submitting ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        (eventType.is_paid && eventType.price > 0) ? "Proceed to Payment" : "Confirm Booking"
                      )}
                    </Button>
                  </form>
                </div>
              )}

              {step === "payment" && (
                <div className="animate-fade-in">
                  <button onClick={() => setStep("form")} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4" disabled={submitting}>
                    <ArrowLeft className="h-4 w-4" /> Back
                  </button>
                  <h2 className="text-lg font-semibold mb-2">Secure Checkout</h2>
                  <p className="text-sm text-muted-foreground mb-4">
                    Complete payment of <strong>${(paymentAmount / 100).toFixed(2)} USD</strong> to confirm your appointment.
                  </p>
                  {isMockPayment ? (
                    <MockBookingPaymentForm 
                      amount={paymentAmount}
                      onSuccess={(piId) => executeBookingCreation(piId)}
                      submitting={submitting}
                    />
                  ) : (
                    <StripeBookingPaymentForm 
                      clientSecret={clientSecret!}
                      amount={paymentAmount}
                      onSuccess={(piId) => executeBookingCreation(piId)}
                      submitting={submitting}
                    />
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// SANDBOX MOCK CHECKOUT FORM FOR PAID MEETINGS
// ============================================================================
interface MockBookingPaymentFormProps {
  amount: number;
  onSuccess: (paymentIntentId: string) => void;
  submitting: boolean;
}

function MockBookingPaymentForm({ amount, onSuccess, submitting }: MockBookingPaymentFormProps) {
  const [cardNumber, setCardNumber] = useState("");
  const [expiry, setExpiry] = useState("");
  const [cvc, setCvc] = useState("");
  const [processing, setProcessing] = useState(false);
  const [errorAlert, setErrorAlert] = useState<string | null>(null);

  const fillTestCard = () => {
    setCardNumber("4242 4242 4242 4242");
    setExpiry("12/30");
    setCvc("123");
  };

  const handlePay = (e: React.FormEvent) => {
    e.preventDefault();
    setProcessing(true);
    setErrorAlert(null);

    const rawCard = cardNumber.replace(/\s/g, "");
    setTimeout(() => {
      if (rawCard === "4000000000000002") {
        setErrorAlert("Your card was declined. Use 4242 4242 4242 4242 to bypass.");
        setProcessing(false);
      } else if (rawCard === "4000000000009995") {
        setErrorAlert("Insufficient funds on this test card.");
        setProcessing(false);
      } else {
        setProcessing(false);
        onSuccess(`mock_pi_booking_${Date.now()}`);
      }
    }, 1200);
  };

  return (
    <form onSubmit={handlePay} className="space-y-4">
      <div className="bg-amber-500/10 text-amber-500 border border-amber-500/25 rounded-xl p-3 flex flex-col gap-1.5 text-xs">
        <div className="font-bold flex items-center gap-1"><Sparkles className="h-3.5 w-3.5" /> Sandbox Test Mode Active</div>
        <p className="text-muted-foreground text-[11px]">Use test card <strong>4242 4242 4242 4242</strong> for a successful booking charge.</p>
        <button type="button" onClick={fillTestCard} className="bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 text-amber-500 text-[10px] py-1 px-2 rounded mt-1 cursor-pointer transition-colors max-w-max">
          Auto-fill Test Card
        </button>
      </div>

      {errorAlert && (
        <div className="bg-red-500/10 text-red-500 border border-red-500/20 rounded-lg p-3 text-xs">
          {errorAlert}
        </div>
      )}

      <div>
        <Label>Card Number</Label>
        <Input 
          required 
          placeholder="4242 4242 4242 4242"
          value={cardNumber} 
          onChange={(e) => setCardNumber(e.target.value.replace(/\D/g, "").replace(/(.{4})/g, "$1 ").trim().slice(0, 19))}
          className="mt-1.5" 
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Expiration Date</Label>
          <Input 
            required 
            placeholder="MM/YY" 
            value={expiry} 
            onChange={(e) => setExpiry(e.target.value.replace(/\D/g, "").replace(/(.{2})/g, "$1/").trim().slice(0, 5))}
            className="mt-1.5" 
          />
        </div>
        <div>
          <Label>CVC</Label>
          <Input 
            required 
            placeholder="123" 
            value={cvc} 
            onChange={(e) => setCvc(e.target.value.replace(/\D/g, "").slice(0, 3))}
            className="mt-1.5" 
          />
        </div>
      </div>

      <Button type="submit" className="w-full gradient-bg hover:opacity-90 h-11 font-semibold flex items-center justify-center gap-1.5" disabled={processing || submitting}>
        {processing || submitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Confirming Payment...
          </>
        ) : (
          `Pay $${(amount / 100).toFixed(2)} & Book`
        )}
      </Button>
    </form>
  );
}

// ============================================================================
// STRIPE ELEMENTS CHECKOUT FORM FOR PAID MEETINGS
// ============================================================================
interface StripeBookingPaymentFormProps {
  clientSecret: string;
  amount: number;
  onSuccess: (paymentIntentId: string) => void;
  submitting: boolean;
}

function StripeBookingPaymentForm({ clientSecret, amount, onSuccess, submitting }: StripeBookingPaymentFormProps) {
  if (!stripePromise) {
    return <div className="text-red-500 text-xs">Stripe credentials are missing on the host configuration.</div>;
  }
  return (
    <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: "night" } }}>
      <StripeBookingCardForm clientSecret={clientSecret} amount={amount} onSuccess={onSuccess} submitting={submitting} />
    </Elements>
  );
}

function StripeBookingCardForm({ clientSecret, amount, onSuccess, submitting }: { clientSecret: string; amount: number; onSuccess: (piId: string) => void; submitting: boolean }) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [errorAlert, setErrorAlert] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setProcessing(true);
    setErrorAlert(null);

    const cardElement = elements.getElement(CardNumberElement);
    if (!cardElement) {
      setProcessing(false);
      return;
    }

    try {
      const { paymentIntent, error } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: { card: cardElement }
      });

      if (error) {
        setErrorAlert(error.message || "Payment failed.");
      } else if (paymentIntent && paymentIntent.status === "succeeded") {
        onSuccess(paymentIntent.id);
      } else {
        setErrorAlert("Payment authorization failed.");
      }
    } catch (err: any) {
      setErrorAlert(err.message || "An unexpected error occurred.");
    } finally {
      setProcessing(false);
    }
  };

  const stripeElementOptions = {
    style: {
      base: {
        color: "#ffffff",
        fontFamily: "Inter, sans-serif",
        fontSize: "14px",
        "::placeholder": { color: "#a1a1aa" }
      },
      invalid: { color: "#ef4444" }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {errorAlert && (
        <div className="bg-red-500/10 text-red-500 border border-red-500/20 rounded-lg p-3 text-xs">
          {errorAlert}
        </div>
      )}

      <div>
        <Label>Card Number</Label>
        <div className="flex h-10 w-full rounded-md border border-input bg-muted/20 px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 mt-1.5">
          <CardNumberElement className="w-full self-center" options={stripeElementOptions} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Expiration Date</Label>
          <div className="flex h-10 w-full rounded-md border border-input bg-muted/20 px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 mt-1.5">
            <CardExpiryElement className="w-full self-center" options={stripeElementOptions} />
          </div>
        </div>
        <div>
          <Label>CVC</Label>
          <div className="flex h-10 w-full rounded-md border border-input bg-muted/20 px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 mt-1.5">
            <CardCvcElement className="w-full self-center" options={stripeElementOptions} />
          </div>
        </div>
      </div>

      <Button type="submit" className="w-full gradient-bg hover:opacity-90 h-11 font-semibold flex items-center justify-center gap-1.5" disabled={processing || !stripe || submitting}>
        {processing || submitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Processing...
          </>
        ) : (
          `Pay $${(amount / 100).toFixed(2)} & Book`
        )}
      </Button>
    </form>
  );
}
