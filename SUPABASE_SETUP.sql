-- =============================================================
-- Smart Selfie Alarm — Supabase Database Setup
-- Run this entire script in the Supabase SQL Editor once.
-- Safe to re-run: uses IF NOT EXISTS / OR REPLACE throughout.
-- =============================================================

-- ─────────────────────────────────────────────────────────────
-- 1. USERS TABLE
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.users (
  id                        uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email                     text,
  created_at                timestamptz DEFAULT now(),
  is_premium                boolean     DEFAULT false,
  plan_type                 text        DEFAULT 'free',
  subscription_status       text        DEFAULT 'expired',
  subscription_start_date   timestamptz,
  subscription_expiry_date  timestamptz,
  premium_expires_at        timestamptz,
  auto_renew                boolean     DEFAULT false,
  trial_used                boolean     DEFAULT false,
  razorpay_subscription_id  text,
  razorpay_payment_id       text,
  last_payment_amount       numeric,
  last_payment_date         timestamptz,
  last_payment_txn_id       text
);

-- Safe-add columns that may be missing in older deployments
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS is_premium               boolean     DEFAULT false,
  ADD COLUMN IF NOT EXISTS plan_type                text        DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS subscription_status      text        DEFAULT 'expired',
  ADD COLUMN IF NOT EXISTS subscription_start_date  timestamptz,
  ADD COLUMN IF NOT EXISTS subscription_expiry_date timestamptz,
  ADD COLUMN IF NOT EXISTS premium_expires_at       timestamptz,
  ADD COLUMN IF NOT EXISTS auto_renew               boolean     DEFAULT false,
  ADD COLUMN IF NOT EXISTS trial_used               boolean     DEFAULT false,
  ADD COLUMN IF NOT EXISTS razorpay_subscription_id text,
  ADD COLUMN IF NOT EXISTS razorpay_payment_id      text,
  ADD COLUMN IF NOT EXISTS last_payment_amount      numeric,
  ADD COLUMN IF NOT EXISTS last_payment_date        timestamptz,
  ADD COLUMN IF NOT EXISTS last_payment_txn_id      text;


-- ─────────────────────────────────────────────────────────────
-- 2. ALARMS TABLE
-- ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.alarms (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid        NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  time              integer     NOT NULL,   -- minutes since midnight (0–1439)
  repeat_days       text[]      DEFAULT '{}',
  verification_mode text        DEFAULT 'selfie',
  sound             text        DEFAULT 'default',
  sound_url         text,
  enabled           boolean     DEFAULT true,
  created_at        timestamptz DEFAULT now()
);


-- ─────────────────────────────────────────────────────────────
-- 3. ROW LEVEL SECURITY
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.users  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alarms ENABLE ROW LEVEL SECURITY;

-- Drop stale policies
DROP POLICY IF EXISTS "users_select_own"  ON public.users;
DROP POLICY IF EXISTS "users_insert_own"  ON public.users;
DROP POLICY IF EXISTS "users_update_own"  ON public.users;
DROP POLICY IF EXISTS "alarms_select_own" ON public.alarms;
DROP POLICY IF EXISTS "alarms_insert_own" ON public.alarms;
DROP POLICY IF EXISTS "alarms_update_own" ON public.alarms;
DROP POLICY IF EXISTS "alarms_delete_own" ON public.alarms;

-- USERS
CREATE POLICY "users_select_own"
  ON public.users FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "users_insert_own"
  ON public.users FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "users_update_own"
  ON public.users FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ALARMS
CREATE POLICY "alarms_select_own"
  ON public.alarms FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "alarms_insert_own"
  ON public.alarms FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "alarms_update_own"
  ON public.alarms FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "alarms_delete_own"
  ON public.alarms FOR DELETE
  USING (auth.uid() = user_id);


-- ─────────────────────────────────────────────────────────────
-- 4. AUTO-CREATE USER ROW ON AUTH SIGNUP
--    Fires for email OTP and any future auth provider.
--    New users get is_premium=false, trial_used=false.
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (
    id,
    email,
    is_premium,
    plan_type,
    subscription_status,
    auto_renew,
    trial_used
  )
  VALUES (
    NEW.id,
    NEW.email,
    false,        -- no premium until they subscribe
    'free',
    'expired',
    false,
    false
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_auth_user();


-- ─────────────────────────────────────────────────────────────
-- 5. activate_premium() STORED FUNCTION
--    Called by: Edge Function webhook AND frontend fallback.
--    Usage: SELECT activate_premium(user_id, amount, payment_id, plan_type, expires_at);
-- ─────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.activate_premium(
  p_user_id       uuid,
  p_payment_amount numeric,
  p_payment_id    text,
  p_plan_type     text    DEFAULT 'monthly',
  p_expires_at    timestamptz DEFAULT (now() + interval '30 days')
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.users
  SET
    is_premium               = true,
    plan_type                = p_plan_type,
    subscription_status      = 'active',
    subscription_start_date  = now(),
    subscription_expiry_date = p_expires_at,
    premium_expires_at       = p_expires_at,
    auto_renew               = true,
    trial_used               = true,
    last_payment_amount      = p_payment_amount,
    last_payment_date        = now(),
    last_payment_txn_id      = p_payment_id,
    razorpay_payment_id      = p_payment_id
  WHERE id = p_user_id;

  -- If no row existed, insert one (safety net)
  IF NOT FOUND THEN
    INSERT INTO public.users (
      id, is_premium, plan_type, subscription_status,
      subscription_start_date, subscription_expiry_date, premium_expires_at,
      auto_renew, trial_used, last_payment_amount, last_payment_date,
      last_payment_txn_id, razorpay_payment_id
    ) VALUES (
      p_user_id, true, p_plan_type, 'active',
      now(), p_expires_at, p_expires_at,
      true, true, p_payment_amount, now(),
      p_payment_id, p_payment_id
    );
  END IF;
END;
$$;


-- ─────────────────────────────────────────────────────────────
-- 6. Razorpay Webhook Setup Reminder
--    Set these in Supabase Dashboard → Edge Functions →
--    razorpay-webhook → Secrets:
--      RAZORPAY_WEBHOOK_SECRET  = <Razorpay webhook secret>
--      SUPABASE_SERVICE_ROLE_KEY = <your service role key>
--
--    Razorpay Webhook URL:
--      https://ozorrmrvvhmtpoeelewb.supabase.co/functions/v1/razorpay-webhook
--
--    Enabled Events:
--      subscription.activated
--      subscription.charged
--      payment.captured
-- ─────────────────────────────────────────────────────────────

SELECT 'Setup complete. Run this script once in the Supabase SQL Editor.' AS status;
