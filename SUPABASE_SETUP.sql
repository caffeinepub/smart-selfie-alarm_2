-- ============================================================
-- Smart Selfie Alarm — Supabase Setup (NEW SCHEMA)
-- Run this entire file in your Supabase SQL Editor.
-- It is safe to run multiple times (uses IF NOT EXISTS / OR REPLACE).
-- ============================================================

-- ─── 1. users table (bare) ──────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.users (
  id          uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       text NOT NULL DEFAULT '',
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users: self read"   ON public.users;
DROP POLICY IF EXISTS "users: self insert" ON public.users;
DROP POLICY IF EXISTS "users: self update" ON public.users;

CREATE POLICY "users: self read"   ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "users: self insert" ON public.users FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "users: self update" ON public.users FOR UPDATE USING (auth.uid() = id);

-- ─── 2. subscriptions table (NEW SCHEMA) ─────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.subscriptions (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan         text        NOT NULL DEFAULT 'free',
  status       text        NOT NULL DEFAULT 'free',
  trial_start  timestamptz,
  trial_end    timestamptz,
  expires_at   timestamptz,
  trial_used   boolean     NOT NULL DEFAULT false,
  razorpay_subscription_id text,
  razorpay_payment_id      text,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- Migrate old column names if they exist (safe no-ops if already correct)
DO $$
BEGIN
  -- plan_type → plan
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'subscriptions' AND column_name = 'plan_type'
  ) THEN
    ALTER TABLE public.subscriptions RENAME COLUMN plan_type TO plan;
  END IF;

  -- start_date → trial_start
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'subscriptions' AND column_name = 'start_date'
  ) THEN
    ALTER TABLE public.subscriptions RENAME COLUMN start_date TO trial_start;
  END IF;

  -- end_date → split into trial_end + expires_at then drop
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'subscriptions' AND column_name = 'end_date'
  ) THEN
    ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS trial_end  timestamptz;
    ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS expires_at timestamptz;
    UPDATE public.subscriptions SET trial_end = end_date, expires_at = end_date WHERE end_date IS NOT NULL;
    ALTER TABLE public.subscriptions DROP COLUMN end_date;
  END IF;
END;
$$;

-- Add any missing columns (idempotent)
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS trial_start              timestamptz;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS trial_end                timestamptz;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS expires_at               timestamptz;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS razorpay_subscription_id text;
ALTER TABLE public.subscriptions ADD COLUMN IF NOT EXISTS razorpay_payment_id      text;

-- Enforce one row per user
CREATE UNIQUE INDEX IF NOT EXISTS subscriptions_user_id_key ON public.subscriptions(user_id);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "subscriptions: self read"     ON public.subscriptions;
DROP POLICY IF EXISTS "subscriptions: self insert"   ON public.subscriptions;
DROP POLICY IF EXISTS "subscriptions: self update"   ON public.subscriptions;
DROP POLICY IF EXISTS "subscriptions: service write" ON public.subscriptions;

CREATE POLICY "subscriptions: self read"
  ON public.subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "subscriptions: self insert"
  ON public.subscriptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "subscriptions: self update"
  ON public.subscriptions FOR UPDATE
  USING (auth.uid() = user_id);

-- Allow Edge Functions (service_role) to write without RLS
CREATE POLICY "subscriptions: service write"
  ON public.subscriptions FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- ─── 3. alarms table ────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.alarms (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  time        text NOT NULL,
  label       text NOT NULL DEFAULT '',
  active      boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.alarms ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "alarms: self read"   ON public.alarms;
DROP POLICY IF EXISTS "alarms: self insert" ON public.alarms;
DROP POLICY IF EXISTS "alarms: self update" ON public.alarms;
DROP POLICY IF EXISTS "alarms: self delete" ON public.alarms;

CREATE POLICY "alarms: self read"   ON public.alarms FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "alarms: self insert" ON public.alarms FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "alarms: self update" ON public.alarms FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "alarms: self delete" ON public.alarms FOR DELETE USING (auth.uid() = user_id);

-- ─── 4. Trigger: auto-create rows on new user signup ────────────────────────

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.users (id, email)
  VALUES (NEW.id, COALESCE(NEW.email, ''))
  ON CONFLICT (id) DO NOTHING;

  -- Bare subscription row: status=free, no trial yet.
  -- Trial is only activated after the user pays ₹1.
  INSERT INTO public.subscriptions (user_id, plan, status, trial_used)
  VALUES (NEW.id, 'free', 'free', false)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ─── 5. RPC: activate_premium(p_user_id, p_plan) ────────────────────────────
--
-- Called by the webhook Edge Function after each payment event.
--
-- p_plan = 'trial'   → trial_start=now, trial_end=now+7d, expires_at=now+7d
-- p_plan = 'monthly' → expires_at extended by 30 days

CREATE OR REPLACE FUNCTION public.activate_premium(
  p_user_id uuid,
  p_plan    text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now        timestamptz := now();
  v_trial_end  timestamptz;
  v_expires_at timestamptz;
  v_base       timestamptz;
BEGIN
  IF p_plan = 'trial' THEN
    v_trial_end  := v_now + INTERVAL '7 days';
    v_expires_at := v_trial_end;

    INSERT INTO public.subscriptions (
      user_id, plan, status, trial_start, trial_end, expires_at, trial_used
    )
    VALUES (
      p_user_id, 'trial', 'active', v_now, v_trial_end, v_expires_at, true
    )
    ON CONFLICT (user_id) DO UPDATE SET
      plan        = 'trial',
      status      = 'active',
      trial_start = EXCLUDED.trial_start,
      trial_end   = EXCLUDED.trial_end,
      expires_at  = EXCLUDED.expires_at,
      trial_used  = true;

  ELSIF p_plan = 'monthly' THEN
    -- Extend from whichever is later: now or the current expires_at
    SELECT GREATEST(v_now, COALESCE(expires_at, v_now))
    INTO v_base
    FROM public.subscriptions
    WHERE user_id = p_user_id;

    v_expires_at := COALESCE(v_base, v_now) + INTERVAL '30 days';

    INSERT INTO public.subscriptions (
      user_id, plan, status, expires_at
    )
    VALUES (
      p_user_id, 'monthly', 'active', v_expires_at
    )
    ON CONFLICT (user_id) DO UPDATE SET
      plan       = 'monthly',
      status     = 'active',
      expires_at = v_expires_at;
  END IF;
END;
$$;

-- ─── 6. Helper: store Razorpay IDs (called by webhook) ──────────────────────

CREATE OR REPLACE FUNCTION public.set_razorpay_subscription(
  p_user_id         uuid,
  p_subscription_id text,
  p_payment_id      text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.subscriptions (user_id, plan, status, razorpay_subscription_id, razorpay_payment_id)
  VALUES (p_user_id, 'free', 'free', p_subscription_id, p_payment_id)
  ON CONFLICT (user_id) DO UPDATE SET
    razorpay_subscription_id = p_subscription_id,
    razorpay_payment_id      = COALESCE(p_payment_id, subscriptions.razorpay_payment_id);
END;
$$;

-- ─── Done ────────────────────────────────────────────────────────────────────
-- After running this SQL:
-- 1. Deploy Edge Functions:
--      supabase functions deploy create-subscription
--      supabase functions deploy razorpay-webhook
-- 2. Set secrets in Supabase Dashboard → Edge Functions → Secrets:
--      RAZORPAY_KEY_ID           = rzp_live_SNnU8ftzmAC4jA
--      RAZORPAY_KEY_SECRET       = e3fkInGlSS6S3qTV9RK43M9W
--      RAZORPAY_MONTHLY_PLAN_ID  = plan_SONFVYmbADMnZR
--      RAZORPAY_WEBHOOK_SECRET   = (from Razorpay Dashboard → Webhooks)
--      SUPABASE_SERVICE_ROLE_KEY = (from Supabase → Settings → API)
-- 3. Set webhook URL in Razorpay dashboard:
--      https://ozorrmrvvhmtpoeelewb.supabase.co/functions/v1/razorpay-webhook
--    Events to subscribe:
--      subscription.activated
--      invoice.paid
--      payment.captured
