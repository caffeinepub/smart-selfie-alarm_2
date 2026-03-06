# Smart Selfie Alarm

## Current State
The app is a full React + Firebase SPA with:
- Auth (email/password + Google popup, email verification, forgot password)
- Alarm CRUD stored in Firestore
- Selfie + Live face verification via MediaPipe
- Timer, Stopwatch, Home, Dashboard, Settings pages
- Subscription page with 3 plans: Trial ₹1, Monthly ₹14, Half-Yearly ₹75
- Legal pages: PrivacyPolicyPage, TermsAndConditionsPage, RefundPolicyPage, AboutPage, ContactPage — all with placeholder/older content
- SettingsPage with links to all legal pages, Subscription, About, Contact

## Requested Changes (Diff)

### Add
- New subscription plans: Monthly ₹29/month, 6-Month ₹150, Yearly ₹280 (with "Best Value" badge); replace the old ₹14/₹75 plans
- "Also Read" / legal cross-link section at the bottom of each legal page already exists; ensure all 3 legal pages cross-link each other
- ContactPage: update email to smartselfiealarm@gmail.com (already correct) and support@smartselfiealarm.com reference in legal pages

### Modify
- **PrivacyPolicyPage**: Replace content sections with the user-provided Privacy Policy text (same section structure, updated copy, contact email = support@smartselfiealarm.com)
- **TermsAndConditionsPage**: Replace content with user-provided Terms & Conditions text, contact = support@smartselfiealarm.com
- **RefundPolicyPage**: Replace content with user-provided Refund Policy text, contact = support@smartselfiealarm.com
- **AboutPage**:
  - Replace description paragraphs with user-provided About Us text
  - Update feature list to match: Selfie Verification Alarm, Live Face Detection, Multiple Alarm Scheduling, Clean Mobile Friendly Interface, Smart Productivity Tool
  - Update subscription plans shown to match new pricing: Trial ₹1 / 7 days, Monthly ₹29/month, 6-Month ₹150, Yearly ₹280 (Best Value)
  - Update contact email to smartselfiealarm@gmail.com
  - Keep Key Features, Technology, and Legal sections intact
- **SubscriptionPage**:
  - Replace plan list: Free Trial ₹1 (7 days), Monthly ₹29/month, 6-Month ₹150, Yearly ₹280 ("Best Value" badge)
  - Discount calculation: monthly_total_6 = 29*6 = 174; (174-150)/174 ≈ 14% OFF for 6-month; yearly: 29*12=348; (348-280)/348 ≈ 20% OFF for yearly
  - Yearly plan highlighted with "Best Value" badge
  - Small note: "Subscriptions renew automatically. Cancel anytime."
- **Selfie verification face guide circle**: Increase from ~50-60% width to 70-80% of screen width, centered

### Remove
- Nothing removed structurally

## Implementation Plan
1. Update `SubscriptionPage.tsx` — new 4 plans array with correct pricing and badges
2. Update `PrivacyPolicyPage.tsx` — replace sections array with user-provided content
3. Update `TermsAndConditionsPage.tsx` — replace sections array with user-provided content
4. Update `RefundPolicyPage.tsx` — replace sections array with user-provided content
5. Update `AboutPage.tsx` — update description, feature list, subscription plans table, contact email
6. Update `FaceGuide.tsx` (or wherever the selfie circle size is defined) to 70-80% width
7. Validate build
