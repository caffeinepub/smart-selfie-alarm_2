# Razorpay Webhook & Payment Integration Guide

## Overview

This document explains how to complete the Razorpay payment integration when API keys are provided.

---

## 1. Subscription Plans

| Plan       | Price | Duration | Notes                        |
|------------|-------|----------|------------------------------|
| Free Trial | ₹1    | 7 days   | Verification hold (refundable)|
| Monthly    | ₹14   | 30 days  | Auto-renew, cancel anytime   |
| 6 Months   | ₹75   | 180 days | ≈11% off vs monthly          |

**Discount calculation:**
- Monthly × 6 = ₹84
- Half-yearly = ₹75
- Discount = (84 - 75) / 84 ≈ 10.7% → show "≈11% OFF"

---

## 2. Firebase Firestore Schema

Collection: `users/{uid}`

```json
{
  "email": "user@example.com",
  "planType": "trial | monthly | halfYearly | free",
  "subscriptionStatus": "active | trial | expired | canceled",
  "subscriptionStartDate": "<Firestore Timestamp>",
  "subscriptionExpiryDate": "<Firestore Timestamp>",
  "autoRenew": true,
  "razorpaySubscriptionId": null,
  "lastPayment": {
    "amount": 1400,
    "date": "<Firestore Timestamp>",
    "txnId": "pay_XXXXXXXXXX"
  }
}
```

---

## 3. Razorpay Integration Steps

### A. Environment Variables (add to your deployment config)
```
RAZORPAY_KEY_ID=rzp_live_XXXXXXXXXXXX
RAZORPAY_KEY_SECRET=XXXXXXXXXXXXXXXXXXXX
RAZORPAY_WEBHOOK_SECRET=XXXXXXXXXXXXXXXXXXXX
```

### B. Create Payment Order Endpoint
```
POST /api/payment/create-order
Body: { planType: "monthly" | "halfYearly" | "trial", uid: string }
Response: { orderId: string, amount: number, currency: "INR" }
```

### C. Frontend Checkout Flow
```typescript
// In SubscriptionPage.tsx, replace the alert() with:
const response = await fetch('/api/payment/create-order', {
  method: 'POST',
  body: JSON.stringify({ planType: selectedPlan.id, uid: user.uid }),
});
const { orderId, amount } = await response.json();

const rzp = new window.Razorpay({
  key: RAZORPAY_KEY_ID,
  amount,
  currency: 'INR',
  order_id: orderId,
  handler: async (paymentResponse) => {
    // Call activateSubscription() from subscriptionService.ts
    await activateSubscription(
      user.uid,
      selectedPlan.id,
      selectedPlan.id === 'monthly' ? 30 : 180,
      paymentResponse.razorpay_subscription_id,
      amount,
      paymentResponse.razorpay_payment_id,
    );
    navigate('/dashboard');
  },
});
rzp.open();
```

---

## 4. Webhook Endpoint

```
POST /api/payment/webhook
Headers: x-razorpay-signature: <HMAC SHA256>
```

### Webhook Handler Logic:
1. Verify signature using `RAZORPAY_WEBHOOK_SECRET`
2. Parse event type: `payment.captured`, `subscription.charged`, `subscription.cancelled`
3. For `payment.captured` or `subscription.charged`:
   - Extract `uid` from order metadata or subscription notes
   - Call `activateSubscription()` with correct plan and duration
4. For `subscription.cancelled`:
   - Call `updateDoc` to set `subscriptionStatus: "canceled"`, `autoRenew: false`
5. Return `200 OK` for all valid events (prevent retries)

### Idempotency:
- Store processed webhook event IDs in Firestore collection `webhookEvents/{eventId}`
- Before processing, check if event ID already exists → skip if already processed

### Signature Verification (Node.js):
```javascript
const crypto = require('crypto');

function verifyWebhookSignature(body, signature, secret) {
  const expectedSig = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(body))
    .digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(expectedSig),
    Buffer.from(signature)
  );
}
```

---

## 5. Webview / Median.co OAuth Flow

### How it works:
- `isInWebView()` in `src/lib/webview.ts` detects Median.co and Android WebView
- On detection, a confirmation dialog is shown before Google Sign-In
- Median.co opens Google OAuth in a Chrome Custom Tab (SFSafariViewController on iOS)
- The result is posted back to the app automatically

### OAuth Redirect URI Configuration:
1. Go to Firebase Console → Authentication → Sign-in methods → Google
2. Add your app's domain to **Authorized domains**: `smart-selfie-alarm.caffeine.xyz`
3. In Google Cloud Console → APIs & Services → Credentials → OAuth 2.0 Client
4. Add to **Authorized redirect URIs**: `https://smart-selfie-alarm.firebaseapp.com/__/auth/handler`

### Median.co Configuration:
In your Median.co app config, ensure:
```json
{
  "allowNavigation": ["accounts.google.com", "*.firebaseapp.com"]
}
```

---

## 6. Feature Flags

To quickly disable payment or webview flow without code changes, use localStorage flags:

```javascript
// Disable subscription UI
localStorage.setItem('ff_subscription_enabled', 'false');

// Disable webview detection (force popup flow)
localStorage.setItem('ff_webview_detection', 'false');
```

Read these in `subscriptionService.ts` and `webview.ts` respectively before major operations.

---

## 7. Expiry Behavior

- **Grace period**: 48 hours after `subscriptionExpiryDate` (see `isSubscriptionActive()`)
- **After grace period**: Lock premium features, show subscription modal
- **Admin override**: Manually set `subscriptionExpiryDate` in Firestore console

---

## 8. Trial Flow

1. User verifies email → `signup()` creates Firebase auth account
2. On first login (email verified), call `createTrialSubscription(uid, email)`
3. Sets `planType: "trial"`, `subscriptionStatus: "trial"`, expiry = now + 7 days
4. After trial expires (+ 48h grace), prompt to subscribe

**Important**: The ₹1 trial hold requires Razorpay. Until integrated, trials are free of charge. Implement the ₹1 authorization once keys are provided.

---

## 9. Rollback Plan

1. If payment webhook causes issues: Set `ff_subscription_enabled = false` in localStorage
2. If webview auth breaks: Set `ff_webview_detection = false`
3. Emergency: Revert to previous deployment tag in Caffeine console
4. Database is backward-compatible — no destructive schema changes made

---

## 10. QA Checklist

- [ ] Email signup sends verification email
- [ ] Login blocked until email verified
- [ ] Google Sign-In works on website (popup)
- [ ] Google Sign-In shows confirmation in Median webview
- [ ] Subscription page shows 3 plans with correct pricing
- [ ] Discount calculation shows ≈11% for 6-month plan
- [ ] Trial subscription creates Firestore document with +7 days expiry
- [ ] Razorpay placeholder shows "coming soon" message
- [ ] Success animation shows "🎉 Congratulations!" and "Alarm dismissed successfully. Keep it up 👍"
- [ ] Face guide oval shown during selfie verification
- [ ] Tips banner shown after 5+ failed face detections
