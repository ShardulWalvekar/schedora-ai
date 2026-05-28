import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || "";
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY || "";
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log("Checking event_types table...");
  const { data: etData, error: etError } = await supabase
    .from("event_types")
    .select("*")
    .limit(1);

  if (etError) {
    console.error("event_types query error:", etError);
  } else {
    console.log("event_types columns present in first row:", etData[0] ? Object.keys(etData[0]) : "No rows found");
  }

  console.log("\nChecking bookings table...");
  const { data: bkData, error: bkError } = await supabase
    .from("bookings")
    .select("*")
    .limit(1);

  if (bkError) {
    console.error("bookings query error:", bkError);
  } else {
    console.log("bookings columns present in first row:", bkData[0] ? Object.keys(bkData[0]) : "No rows found");
  }
}

run();
