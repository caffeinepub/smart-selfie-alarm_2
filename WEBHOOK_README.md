# Razorpay Webhook & Payment Integration Guide

## Quick Status

| Component | Status |
|-----------|--------|
| Frontend Razorpay checkout | ✅ Wired (rzp_live_SNnU8ftzmAC4jA) |
| Payment notes (user_id, plan_type) | ✅ Included in every order |
| ₹1 test payment → monthly plan | ✅ Auto-mapped |
| `premium = true` on activation | ✅ Set in DB |
| Supabase Edge Function (server-side) | ✅ Created at `supabase/functions/razorpay-webhook/` |
| Post-payment UI refresh | ✅ `refetch()` called after handler |

---

## 1. Subscription Plans

| Plan | Price (₹) | Paise | Duration |
|------|-----------|-------|----------|
| Free Trial | ₹1 | 100 | 7 days |
| Monthly | ₹29 | 2900 | 30 days |
| 6 Months | ₹150 | 15000 | 183 days |
| Yearly | ₹280 | 28000 | 365 days |

**Special rule:** If `payment.amount == 100` (₹1), the system automatically activates the **monthly** plan.

---

## 2. Database Schema (Supabase `users` table)

```sql
-- Run this in Supabase SQL editor to ensure all columns exist:
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS premium boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS subscription_plan text DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS subscription_expiry timestamptz,
  ADD COLUMN IF NOT EXISTS plan_type text DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS subscription_status text DEFAULT 'expired',
  ADD COLUMN IF NOT EXISTS subscription_start_date timestamptz,
  ADD COLUMN IF NOT EXISTS subscription_expiry_date timestamptz,
  ADD COLUMN IF NOT EXISTS auto_renew boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS razorpay_subscription_id text,
  ADD COLUMN IF NOT EXISTS last_payment_amount numeric,
  ADD COLUMN IF NOT EXISTS last_payment_date timestamptz,
  ADD COLUMN IF NOT EXISTS last_payment_txn_id text;
```

**Premium unlock condition (client-side):**
```
users.premium == true  AND  subscription_expiry > NOW()
```

---

## 3. RLS Policies

```sql
-- Users can read their own record
CREATE POLICY "Users can read own record"
  ON users FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own record
CREATE POLICY "Users can update own record"
  ON users FOR UPDATE
  USING (auth.uid() = id);

-- Service role can do anything (Edge Function uses service role)
-- This is automatic — Supabase service role bypasses RLS.
```

---

## 4. Supabase Edge Function Setup

### Deploy the function

```bash
# Install Supabase CLI if not already installed
npm install -g supabase

# Login
supabase login

# Link to your project
supabase link --project-ref ozorrmrvvhmtpoeelewb

# Set required secrets
supabase secrets set RAZORPAY_WEBHOOK_SECRET=<your-webhook-secret-from-razorpay>
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>

# Deploy the function
supabase functions deploy razorpay-webhook
```

### Edge Function URL
```
https://ozorrmrvvhmtpoeelewb.supabase.co/functions/v1/razorpay-webhook
```

---

## 5. Razorpay Webhook Configuration

1. Log in to Razorpay Dashboard → **Settings → Webhooks**
2. Click **Add New Webhook**
3. Set:
   - **Webhook URL:** `https://ozorrmrvvhmtpoeelewb.supabase.co/functions/v1/razorpay-webhook`
   - **Secret:** (generate a random string, then set it as `RAZORPAY_WEBHOOK_SECRET` in Supabase secrets)
   - **Active Events:** ✅ `payment.captured` ✅ `order.paid`
4. Save

The webhook must return HTTP 200. The Edge Function always returns 200, even on errors, to prevent Razorpay from retrying.

---

## 6. How Payment Flow Works

```
User clicks "Get Plan"
  → Razorpay checkout opens (notes include user_id + plan_type)
  → User completes payment
  → Razorpay calls handler() in SubscriptionPage.tsx
      → activateSubscription(uid, plan, paymentId, amount) called
      → Supabase users table updated: premium=true, expiry set
      → refetch() called → UI unlocks immediately
  → ALSO: Razorpay fires webhook to Edge Function (backup/authoritative)
      → Edge Function verifies signature
      → Extracts user_id from payment.notes
      → Updates Supabase users table (same fields)
```

The frontend handler and the webhook both update the DB — whichever fires first activates premium. This guarantees activation even if one path fails.

---

## 7. ₹1 Test Payment Behaviour

When `payment.amount == 100` paise (₹1):
- Frontend: `amountPaiseToplan(100)` returns `"monthly"` 
- Webhook: `amountPaiseToPlan(100)` returns `"monthly"`
- Result: `subscription_plan = "monthly"`, expiry = now + 30 days, `premium = true`

---

## 8. Error Debugging

If "Payment recorded but activation failed" appears:

1. Open browser DevTools → Console. Look for `[SubscriptionPage] Activation error:` log.
2. The error now shows the exact Supabase error code and message.
3. Most common causes:
   - **Missing `premium` column**: Run the `ALTER TABLE` SQL above.
   - **RLS blocking update**: The `update` call uses `auth.uid() = id` — ensure user is logged in.
   - **Wrong `id` column type**: Users table `id` must be UUID matching Supabase auth UID.

---

## 9. Feature Flags

```javascript
// Disable subscription paywall (dev/testing)
localStorage.setItem('ff_subscription_enabled', 'false');
```

---

## 10. Rollback Plan

1. If activation is broken: Manually set `premium = true` and `subscription_expiry = future date` in Supabase dashboard for affected users.
2. If webhook causes errors: The webhook always returns 200 — it won't break the app.
3. Emergency: Set `ff_subscription_enabled = false` in localStorage to bypass paywall.
