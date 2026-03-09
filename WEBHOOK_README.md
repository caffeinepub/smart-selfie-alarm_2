# Razorpay Webhook & Payment Integration Guide

## Architecture

The payment system uses Razorpay **Subscriptions API** (not the Orders API).

```
User taps "Start ₹1 Trial"
  → Frontend calls: create-order Edge Function (POST, Content-Type: application/json only)
      → Razorpay Subscriptions API creates subscription
      → Returns { subscription_id: "sub_XXXX" }
  → Frontend opens Razorpay checkout with subscription_id (NOT order_id)
  → User sets up UPI autopay mandate → ₹1 charged immediately
  → Razorpay calls razorpay-webhook:
      subscription.activated  → activates 7-day trial in DB
      subscription.charged    → activates trial (1st charge) / extends monthly (subsequent)
      payment.captured        → fallback activation if above fires late
      invoice.paid            → extends monthly access (+30 days)
      subscription.cancelled  → marks subscription as cancelled
  → Frontend polls subscriptions table → premium unlocked
```

---

## Subscription Plans

| Plan | Razorpay Plan ID | Price |
|------|-----------------|-------|
| ₹1 Trial (7 days) | Addon on plan_SONFVYmbADMnZR | ₹1 |
| Monthly (after trial) | plan_SONFVYmbADMnZR | ₹29/month |
| Half Yearly | plan_SONGMogCO9YlHQ | ₹149/6 months |
| Yearly | plan_SONGrpyyySiGEc | ₹279/year |

---

## Database Schema

Run `SUPABASE_SETUP.sql` in Supabase SQL Editor.

### subscriptions table

| Column | Type | Purpose |
|--------|------|---------|
| id | uuid | Primary key |
| user_id | uuid | References auth.users(id) |
| razorpay_subscription_id | text | Razorpay sub ID (sub_XXXX) |
| razorpay_payment_id | text | Last payment ID |
| status | text | free / active / cancelled |
| plan | text | free / trial / monthly |
| trial_used | boolean | Prevents second trial |
| trial_start | timestamptz | When trial started |
| trial_end | timestamptz | When trial expires |
| expires_at | timestamptz | When monthly access expires |
| created_at | timestamptz | Row creation time |

**Access granted if:** `trial_end > now()` OR `expires_at > now()`

### user_trials table

| Column | Type | Purpose |
|--------|------|---------|
| user_id | uuid | Primary key, references auth.users(id) |
| trial_used | boolean | true after the ₹1 trial is used once |
| created_at | timestamptz | Row creation time |

**Trial gating:** Frontend reads this table on the premium screen. If `trial_used = true`, the ₹1 trial option is hidden and full plan prices are shown directly.

---

## Edge Functions

### create-order
URL: `https://ozorrmrvvhmtpoeelewb.supabase.co/functions/v1/create-order`

Creates a Razorpay subscription (despite the "order" name).  
Request body: `{ plan_id, user_id, user_email }`  
Returns: `{ subscription_id, status, plan_id }`

The `plan_id` in the request body selects the billing plan:
- `plan_SONFVYmbADMnZR` — Monthly (₹29/month)
- `plan_SONGMogCO9YlHQ` — Half Yearly (₹149/6 months)
- `plan_SONGrpyyySiGEc` — Yearly (₹279/year)

Required secrets:
- `RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`
- `RAZORPAY_MONTHLY_PLAN_ID` (optional fallback, defaults to `plan_SONFVYmbADMnZR`)

### razorpay-webhook
URL: `https://ozorrmrvvhmtpoeelewb.supabase.co/functions/v1/razorpay-webhook`

Required secrets:
- `RAZORPAY_WEBHOOK_SECRET`
- `SUPABASE_SERVICE_ROLE_KEY`

---

## Deploy Steps

```bash
# 1. Link to Supabase project
supabase link --project-ref ozorrmrvvhmtpoeelewb

# 2. Set secrets
supabase secrets set RAZORPAY_KEY_ID=rzp_live_SOvVaQmeBO5hKJ
supabase secrets set RAZORPAY_KEY_SECRET=<your-secret>
supabase secrets set RAZORPAY_MONTHLY_PLAN_ID=plan_SONFVYmbADMnZR
supabase secrets set RAZORPAY_WEBHOOK_SECRET=<from-razorpay-dashboard>
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=<from-supabase-settings>

# 3. Deploy functions
supabase functions deploy create-order
supabase functions deploy razorpay-webhook
```

---

## Razorpay Dashboard — Webhook Setup

1. Razorpay Dashboard → Settings → Webhooks → Add New Webhook
2. Webhook URL: `https://ozorrmrvvhmtpoeelewb.supabase.co/functions/v1/razorpay-webhook`
3. Secret: (match `RAZORPAY_WEBHOOK_SECRET` in Supabase secrets)
4. Enable events:
   - ✅ `subscription.activated`
   - ✅ `subscription.charged`
   - ✅ `subscription.cancelled`
   - ✅ `invoice.paid`
   - ✅ `payment.captured`

---

## Testing

```bash
# Test create-order function (no auth header required)
curl -X POST https://ozorrmrvvhmtpoeelewb.supabase.co/functions/v1/create-order \
  -H "Content-Type: application/json" \
  -d '{"user_id":"<your-uid>","user_email":"test@example.com"}'

# Expected success response:
# {"subscription_id":"sub_XXXX","status":"created","plan_id":"plan_SONFVYmbADMnZR",...}

# If you get {"error":"Server misconfiguration: missing Razorpay keys"}
# → Secrets are not set in Supabase Dashboard
```

---

## Trial Once Enforcement

- On signup, `subscriptions` row created with `trial_used = false`.
- When ₹1 trial activated, `trial_used = true`.
- Frontend checks `trial_used` before showing "Start ₹1 Trial" button.
- If `trial_used = true`, button shows "Subscribe Now — ₹29/month" instead.

---

## Troubleshooting

| Error | Cause | Fix |
|-------|-------|-----|
| "Failed to fetch" | Edge Function not deployed or secrets missing | Deploy + set secrets |
| "No results found" (Supabase logs) | Frontend sending extra Authorization header | Use only `Content-Type: application/json` — no Bearer/apikey headers |
| "Server misconfiguration: missing Razorpay keys" | Secrets not set in Supabase | Set RAZORPAY_KEY_ID + RAZORPAY_KEY_SECRET |
| "invalid subscription_id" error | Old create-order code (Orders API) still deployed | Redeploy create-order with the updated code |
| "Order id is mandatory for payment" | Frontend using order_id in Razorpay checkout | Use subscription_id (not order_id) in Razorpay checkout options |
| "user_id is required" | Frontend not sending user_id | Check auth state, ensure user is logged in |
| Webhook not firing | Razorpay webhook not configured | Set webhook URL + events in Razorpay Dashboard |
| Premium not unlocking | Webhook not hitting DB | Check SUPABASE_SERVICE_ROLE_KEY secret |
| subscription.charged not handled | Old webhook code deployed | Redeploy razorpay-webhook with updated code |
