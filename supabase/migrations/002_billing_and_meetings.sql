-- 1. Extend bookings table
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS meeting_provider TEXT;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS meeting_link TEXT;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS meeting_status TEXT DEFAULT 'ready';

-- 2. Extend subscriptions table
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS subscription_plan TEXT DEFAULT 'free';
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'active';
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS billing_cycle TEXT DEFAULT 'monthly';
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS subscription_start TIMESTAMPTZ DEFAULT now();
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS subscription_end TIMESTAMPTZ;

-- 3. Update the trigger function public.handle_new_user_subscription() to support new fields
CREATE OR REPLACE FUNCTION public.handle_new_user_subscription()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.subscriptions (
    user_id, 
    plan, 
    status, 
    subscription_plan, 
    subscription_status,
    billing_cycle,
    subscription_start
  )
  VALUES (
    NEW.id, 
    'free', 
    'active', 
    'free', 
    'active', 
    'monthly', 
    now()
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
