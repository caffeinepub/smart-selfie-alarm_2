# Smart Selfie Alarm

## Current State
- Full React + TypeScript frontend with Firebase (Auth, Firestore, Storage)
- Firebase credentials hardcoded in `lib/firebase.ts`
- Auth: Email/password + Google Sign-In (popup), email verification enforced
- Alarm storage: Firestore `alarms` collection
- Subscription storage: Firestore `users` collection (trial 7-day auto-created)
- Razorpay: placeholder only — payment not wired
- Navigation: Home, Alarms, Timer, Stopwatch, Settings (5-tab bottom nav)
- Selfie verification: round/oval face guide overlay
- Tools (Calculator, Calendar, World Clock): not present

## Requested Changes (Diff)

### Add
- Supabase client library (`@supabase/supabase-js`) replacing Firebase SDK
- `lib/supabase.ts` with hardcoded Supabase URL + anon key (provided by user)
- Razorpay live payment integration using `rzp_live_SNnU8ftzmAC4jA`
  - Checkout popup loaded from CDN script tag
  - All 4 plans: Trial ₹1 (7d), Monthly ₹29, 6-Month ₹150, Yearly ₹280
  - On payment success: call `activateSubscription()` and refresh subscription context
  - Razorpay secret only used backend-side (not in frontend); frontend only uses Key ID
- Navigation restructured: Dashboard, Alarms, Tools, Subscription, Settings (5 tabs)
- Tools section (`/tools`) with sub-pages: Calculator, Calendar, World Clock
- `pages/ToolsPage.tsx` with tabs for Calculator, Calendar, World Clock
- World Clock: show time in India, USA, UK, UAE, Japan, Australia
- Dashboard page improvements: total alarms, next alarm, subscription status, quick create button
- Selfie verification: replace oval with square face detection box + "Fit your face inside the box" instruction

### Modify
- Remove all `firebase/*` imports and replace with `@supabase/supabase-js`
- `lib/firebase.ts` → `lib/supabase.ts`
- `lib/alarmService.ts` → use Supabase `alarms` table instead of Firestore
- `lib/subscriptionService.ts` → use Supabase `users` table instead of Firestore
- `context/AuthContext.tsx` → use Supabase Auth (email+password, Google OAuth redirect)
- `context/AlarmContext.tsx` → update imports to use new alarm service
- `context/SubscriptionContext.tsx` → update imports to use new subscription service
- `pages/SubscriptionPage.tsx` → wire real Razorpay checkout
- `components/Layout.tsx` → update nav items to: Dashboard, Alarms, Tools, Subscription, Settings
- `components/FaceGuide.tsx` → change from oval to square box overlay
- `App.tsx` → add `/tools` route (subscription-gated)
- `package.json` → add `@supabase/supabase-js`, keep firebase removed

### Remove
- `lib/firebase.ts`
- `lib/webview.ts` (webview detection no longer needed for auth flow since Supabase OAuth uses redirect)
- All `firebase/*` npm imports from `package.json`

## Implementation Plan
1. Add `@supabase/supabase-js` to `package.json`, remove `firebase` packages
2. Create `lib/supabase.ts` with the provided credentials
3. Create new `lib/alarmService.ts` using Supabase client (CRUD on `alarms` table)
4. Create new `lib/subscriptionService.ts` using Supabase client (`users` table)
5. Rewrite `context/AuthContext.tsx` for Supabase Auth
6. Update `context/AlarmContext.tsx` imports
7. Update `context/SubscriptionContext.tsx` imports
8. Update `pages/SubscriptionPage.tsx` with Razorpay live checkout
9. Create `pages/ToolsPage.tsx` (Calculator + Calendar + World Clock tabs)
10. Update `components/Layout.tsx` nav structure (5 tabs: Dashboard, Alarms, Tools, Subscription, Settings)
11. Update `components/FaceGuide.tsx` square overlay
12. Update `App.tsx` routes
13. Update `pages/DashboardPage.tsx` with stats section
14. Remove firebase.ts and webview.ts
