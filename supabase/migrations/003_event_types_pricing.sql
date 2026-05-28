-- Migration to support Paid Meetings and booking-level payment intent references
-- Run this in your Supabase SQL Editor

ALTER TABLE public.event_types ADD COLUMN IF NOT EXISTS is_paid BOOLEAN DEFAULT false;
ALTER TABLE public.event_types ADD COLUMN IF NOT EXISTS price NUMERIC DEFAULT 0;

ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'unpaid';
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT;
