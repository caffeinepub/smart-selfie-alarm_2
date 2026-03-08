// Supabase Edge Function: create-subscription
// Creates a Razorpay Subscription using the Subscriptions API (NOT orders).
//
// Plan: plan_SONFVYmbADMnZR (₹29/month)
// Flow: ₹1 charged immediately via addon → 7-day trial → ₹29/month autopay
//
// Deploy:
//   supabase functions deploy create-subscription
//
// Required secrets (set in Supabase Dashboard → Edge Functions → Secrets):
//   RAZORPAY_KEY_ID          = rzp_live_SNnU8ftzmAC4jA
//   RAZORPAY_KEY_SECRET      = e3fkInGlSS6S3qTV9RK43M9W
//   RAZORPAY_MONTHLY_PLAN_ID = plan_SONFVYmbADMnZR

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  // ── CORS preflight ─────────────────────────────────────────────────────────
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return new Response("Method Not Allowed", {
      status: 405,
      headers: CORS_HEADERS,
    });
  }

  try {
    // ── Read secrets ───────────────────────────────────────────────────────
    const RAZORPAY_KEY_ID = Deno.env.get("RAZORPAY_KEY_ID");
    const RAZORPAY_KEY_SECRET = Deno.env.get("RAZORPAY_KEY_SECRET");
    // Allow override from env but fall back to the known plan ID
    const PLAN_ID =
      Deno.env.get("RAZORPAY_MONTHLY_PLAN_ID") ?? "plan_SONFVYmbADMnZR";

    if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
      console.error("[create-subscription] Missing Razorpay secrets");
      return jsonResponse(
        { error: "Server misconfiguration: missing Razorpay keys" },
        500,
      );
    }

    // ── Parse request body ─────────────────────────────────────────────────
    let body: { user_id?: string; user_email?: string } = {};
    try {
      body = await req.json();
    } catch {
      // No body — use empty defaults
    }

    const userId = (body.user_id ?? "").trim();
    const userEmail = (body.user_email ?? "").trim();

    if (!userId) {
      return jsonResponse({ error: "user_id is required" }, 400);
    }

    // ── Build Basic Auth header ────────────────────────────────────────────
    const credentials = btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`);

    // ── Create Razorpay Subscription ───────────────────────────────────────
    //
    // Razorpay Subscriptions API:  POST /v1/subscriptions
    //
    // plan_id        — the recurring plan (₹29/month)
    // total_count    — number of billing cycles (12 = 1 year; Razorpay enforces min 12 for monthly)
    // customer_notify — 1 = Razorpay sends email/SMS notifications to the customer
    // trial_period   — days of free trial before first recurring charge
    // addons         — charged immediately when the mandate is set up (₹1 trial auth)
    // notes          — arbitrary key/value forwarded to webhook payloads
    //
    // IMPORTANT: total_count = 12 means 12 recurring cycles (months) after the trial.
    // Razorpay will charge ₹1 immediately (addon), then ₹29 × 12 monthly.
    // Set total_count to 120 for "effectively forever" subscriptions; user spec requires 12.

    const subscriptionPayload = {
      plan_id: PLAN_ID,
      total_count: 12,          // 12 monthly billing cycles after trial
      quantity: 1,
      customer_notify: 1,       // Razorpay notifies the customer via email/SMS
      trial_period: 7,          // 7-day trial before first recurring charge
      addons: [
        {
          item: {
            name: "Smart Selfie Alarm — ₹1 Trial Authorization",
            amount: 100,         // ₹1 in paise (charged immediately on mandate setup)
            currency: "INR",
          },
        },
      ],
      notes: {
        user_id: userId,
        user_email: userEmail,
        source: "smart_selfie_alarm",
      },
      // Only include notify_info when a valid email is present.
      // Passing an empty string to Razorpay causes a BAD_REQUEST_ERROR.
      ...(userEmail
        ? {
            notify_info: {
              notify_email: userEmail,
            },
          }
        : {}),
    };

    console.log(
      "[create-subscription] Creating subscription — plan:",
      PLAN_ID,
      "user:",
      userId,
    );

    const rzpRes = await fetch("https://api.razorpay.com/v1/subscriptions", {
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(subscriptionPayload),
    });

    const rzpBody = await rzpRes.json();

    if (!rzpRes.ok) {
      console.error("[create-subscription] Razorpay error:", rzpBody);
      return jsonResponse(
        {
          error:
            rzpBody?.error?.description ??
            "Razorpay subscription creation failed",
          code: rzpBody?.error?.code ?? "UNKNOWN",
          details: rzpBody,
        },
        rzpRes.status,
      );
    }

    const subscriptionId: string = rzpBody.id;
    const status: string = rzpBody.status;

    console.log(
      "[create-subscription] Subscription created:",
      subscriptionId,
      "status:",
      status,
    );

    // Return the subscription_id and supporting checkout data.
    // Frontend uses subscription_id (NOT order_id) when opening Razorpay checkout.
    return jsonResponse({
      subscription_id: subscriptionId,
      status,
      plan_id: rzpBody.plan_id ?? PLAN_ID,
      short_url: rzpBody.short_url ?? null,
      // Echo back so frontend can verify
      user_id: userId,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[create-subscription] Unexpected error:", msg);
    return jsonResponse({ error: msg }, 500);
  }
});
