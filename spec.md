# Smart Selfie Alarm

## Current State

- Frontend: React + Tailwind, Supabase Auth (email OTP only), SubscriptionContext, SubscriptionPage
- Backend: Supabase (project ozorrmrvvhmtpoeelewb), public.users and public.alarms tables
- Payments: Razorpay integration partially exists using one-time orders (amount-based, no real plan IDs)
- Current plans on SubscriptionPage: "trial" (₹1) and "monthly" (₹29) using Razorpay Orders API
- Webhook: Edge Function at supabase/functions/razorpay-webhook handles payment.captured, order.paid
- DB columns used: is_premium, plan_type, subscription_status, subscription_expiry_date, auto_renew, razorpay_subscription_id, last_payment_amount, last_payment_txn_id
- subscriptionService.ts uses column names is_premium, plan_type, subscription_expiry_date
- SUPABASE_SETUP.sql defines users table but does NOT have premium_expires_at, razorpay_payment_id columns (uses subscription_expiry_date, last_payment_txn_id instead)
- AuthContext: email OTP only — DO NOT MODIFY

## Requested Changes (Diff)

### Add
- 3 real Razorpay Subscription plan IDs wired into the checkout:
  - Monthly: plan_SONFVYmbADMnZR (₹29/month)
  - Half Yearly: plan_SONGMogC09Y1HQ (₹149/6 months)
  - Yearly: plan_SONGrpyyySiGEc (₹279/year)
- 7-day free trial period on each Razorpay Subscription (trial_period=7 passed in subscription creation options)
- "Start Free Trial" CTA button on subscription page
- "Best Value" badge on Yearly plan
- Razorpay Subscriptions API checkout flow: create subscription → open checkout with subscription_id → user approves UPI autopay mandate
- Supabase SQL stored function activate_premium(user_id, payment_amount, payment_id) to atomically update users table
- Webhook: listen for subscription.activated, subscription.charged, payment.captured events
- Backup link display: https://rzp.io/rzp/kcd3loz on subscription page
- New DB columns: premium_expires_at (timestamptz), razorpay_payment_id (text), auto_renew (boolean) — ADD IF NOT EXISTS in updated SQL

### Modify
- SubscriptionPage.tsx: replace 2-plan card layout with 3-plan layout (Monthly, Half Yearly, Yearly), update title to "Unlock Premium", update CTA to "Start Free Trial", add "7 Day Free Trial" badge, wire Razorpay Subscriptions checkout
- subscriptionService.ts: update plan types, price paise constants, plan duration days, isSubscriptionActive to read premium_expires_at or subscription_expiry_date
- supabase/functions/razorpay-webhook/index.ts: add handlers for subscription.activated and subscription.charged events, call activate_premium logic with correct plan durations, fix column names to match both premium_expires_at and subscription_expiry_date
- SUPABASE_SETUP.sql: add activate_premium() stored function, add missing columns, update plan duration mapping

### Remove
- Trial ₹1 one-time order flow from SubscriptionPage (replaced by Razorpay Subscriptions trial_period)
- Old PLANS array entries for "trial" and "monthly" as standalone paid plans (replaced by 3-plan Subscriptions flow)

## Implementation Plan

1. Update SUPABASE_SETUP.sql:
   - ALTER TABLE users ADD COLUMN IF NOT EXISTS for: premium_expires_at, razorpay_payment_id, auto_renew
   - Create activate_premium(uid uuid, p_amount numeric, p_payment_id text) stored function that sets is_premium=true, premium_expires_at based on plan, last_payment_amount, razorpay_payment_id, auto_renew=true

2. Update subscriptionService.ts:
   - New plan types: "monthly" | "halfYearly" | "yearly" | "free"
   - New price paise constants for all 3 plans
   - PLAN_DURATION_DAYS: monthly=30, halfYearly=183, yearly=365
   - isSubscriptionActive: check premium_expires_at (or subscription_expiry_date as fallback) > now()
   - activateSubscription: write to both premium_expires_at and subscription_expiry_date for compatibility

3. Update SubscriptionPage.tsx:
   - New PLANS array: Monthly ₹29, Half Yearly ₹149, Yearly ₹279 (Best Value badge + "Save 20%")
   - Title: "Unlock Premium", Badge strip: "7 Day Free Trial"
   - handleStartTrial: call Razorpay Subscriptions API to create subscription (using plan_id + trial_period=7), then open Razorpay checkout with subscription_id
   - Subscription checkout handler: on success, call activateSubscription with razorpay_subscription_id, razorpay_payment_id
   - Backup link as small text: "Or use: rzp.io/rzp/kcd3loz"
   - CTA button text: "Start Free Trial"

4. Update supabase/functions/razorpay-webhook/index.ts:
   - Add event handling for subscription.activated and subscription.charged
   - Extract subscription entity, plan, user_id from notes
   - Write is_premium=true, premium_expires_at, subscription_expiry_date, razorpay_payment_id, auto_renew=true
   - Existing payment.captured handling kept for backup

5. Validate build and deploy
