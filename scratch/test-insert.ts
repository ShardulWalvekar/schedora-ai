import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log("Fetching a host profile to get user_id...");
  const { data: profiles, error: pErr } = await supabase
    .from("profiles")
    .select("id")
    .limit(1);

  if (pErr || !profiles || profiles.length === 0) {
    console.error("Failed to fetch host profile:", pErr);
    return;
  }
  const hostId = profiles[0].id;
  console.log("Using hostId:", hostId);

  console.log("\nAttempting to insert booking...");
  const { data, error } = await supabase
    .from("bookings")
    .insert({
      user_id: hostId,
      attendee_name: "Test Attendee",
      attendee_email: "test@example.com",
      event_type: "Test Event",
      meeting_platform: "Google Meet",
      duration: 30,
      booking_date: "2026-06-01",
      booking_time: "10:00",
      notes: "Test notes",
      status: "upcoming",
      meeting_provider: "Google Meet",
      meeting_link: "https://meet.google.com/abc-defg-hij",
      meeting_status: "ready",
      payment_status: "unpaid"
    })
    .select();

  if (error) {
    console.error("Insert error:", error);
  } else {
    console.log("Insert success:", data);
  }
}

run();
