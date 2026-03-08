# Smart Selfie Alarm

## Current State

Full-stack alarm app with Supabase auth (email + password + OTP), Razorpay subscriptions (₹1 trial → ₹29/month autopay), and face verification alarm dismissal. The core flows are implemented but several bugs were found in the audit:

1. **CRITICAL SECURITY**: Razorpay live secret key (`e3fkInGlSS6S3qTV9RK43M9W`) was exposed in 3 public CSV files under `public/assets/`. These files must be deleted.
2. **SubscriptionPage**: No idempotency check — if a subscription was already created and the user re-taps "Start Trial", a duplicate Razorpay subscription is created.
3. **create-subscription edge function**: `notify_info.notify_email` sends an empty string to Razorpay when email is blank, which Razorpay may reject.
4. **Webhook**: `activateTrial` tries to update `users` table with `is_premium`, `plan_type`, `subscription_id`, `trial_end` columns — these only exist after the SQL setup is run. Any schema mismatch silently fails but also clutters logs.
5. **HomePage**: Test Alarm button is missing — it was requested and should appear above the alarm list.
6. **AuthContext `ensureUserRow`**: The function runs on every `SIGNED_IN` event (including token refreshes) and does redundant DB calls. Should be guarded to only run once per user per session.
7. **Dead code**: `useInternetIdentity.ts`, `StorageClient.ts`, `backend.d.ts` references, `ToolsPage`, `StopwatchPage`, `TimerPage` are orphaned from the ICP migration and unused.
8. **SUPABASE_SETUP.sql**: Must add missing columns to the `users` table and improve trigger to be idempotent.

## Requested Changes (Diff)

### Add
- Test Alarm button on `HomePage` above the alarm list, reusing the existing `AlarmTriggerPage` face verification flow
- Idempotency check in `SubscriptionPage.handleTrialPayment` — check if user already has an active or pending subscription before calling `create-subscription`
- `subscription.cancelled` webhook event handler that sets `status = cancelled`

### Modify
- Delete the 3 exposed CSV files from `public/assets/` (done)
- `create-subscription` edge function: sanitize `notify_info` — only include `notify_email` when a non-empty email is provided
- `razorpay-webhook`: wrap the `users` table update in a try/catch with graceful column-not-found handling; add `subscription.cancelled` event handler
- `AuthContext.ensureUserRow`: add a session-level guard so it only runs once per user session (not on every token refresh)
- `SubscriptionPage`: add pre-flight subscription check before showing the Razorpay checkout; show clearer error messages distinguishing network errors from API errors
- `SUPABASE_SETUP.sql`: ensure all required columns exist with correct defaults; improve trigger to handle re-runs safely

### Remove
- Nothing (dead code files are left — removing them is a separate refactor and does not affect the build)

## Implementation Plan

1. Fix `create-subscription/index.ts`: sanitize `notify_info` email
2. Fix `razorpay-webhook/index.ts`: add `subscription.cancelled` handler; make `users` update schema-safe with column existence check
3. Fix `AuthContext.tsx`: add `ensureUserRow` session guard
4. Fix `SubscriptionPage.tsx`: add subscription idempotency check before calling edge function; improve error messages
5. Fix `HomePage.tsx`: add Test Alarm button above alarm list that navigates to `/alarm-trigger` with a `?test=true` query param
6. Update `SUPABASE_SETUP.sql`: final production-ready SQL with all required columns and idempotent trigger
