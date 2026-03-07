// Supabase Edge Function: create-subscription
// Creates a Razorpay Subscription (NOT a one-time order).
// The subscription uses a 7-day trial period — Razorpay charges ₹1 immediately
// as an add-on auth charge, then auto-bills ₹29/month after the trial ends.
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

serve(async (req) => {
  // ── CORS preflight ────────────────────────────────────────────────────────
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return new Response("Method Not Allowed", {
      status: 405,
      headers: CORS_HEADERS,
    });
  }

  // ── Read secrets ─────────────────────────────────────────────────────────
  const RAZORPAY_KEY_ID = Deno.env.get("RAZORPAY_KEY_ID");
  const RAZORPAY_KEY_SECRET = Deno.env.get("RAZORPAY_KEY_SECRET");
  const RAZORPAY_MONTHLY_PLAN_ID = Deno.env.get("RAZORPAY_MONTHLY_PLAN_ID");

  if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
    console.error("[create-subscription] Missing Razorpay secrets");
    return new Response(
      JSON.stringify({ error: "Server misconfiguration: missing Razorpay keys" }),
      {
        status: 500,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      },
    );
  }

  if (!RAZORPAY_MONTHLY_PLAN_ID) {
    console.error("[create-subscription] Missing RAZORPAY_MONTHLY_PLAN_ID");
    return new Response(
      JSON.stringify({ error: "Server misconfiguration: missing plan ID" }),
      {
        status: 500,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      },
    );
  }

  // ── Parse request body ───────────────────────────────────────────────────
  let body: { user_id?: string; user_email?: string } = {};
  try {
    body = await req.json();
  } catch {
    // no body is fine
  }

  const userId = body.user_id ?? "";
  const userEmail = body.user_email ?? "";

  if (!userId) {
    return new Response(
      JSON.stringify({ error: "user_id is required" }),
      {
        status: 400,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      },
    );
  }

  // ── Build Basic Auth header ──────────────────────────────────────────────
  const credentials = btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`);

  // ── Create Razorpay Subscription ─────────────────────────────────────────
  //
  // Razorpay Subscriptions API:
  //   POST https://api.razorpay.com/v1/subscriptions
  //
  // trial_period: number of days before the first recurring charge.
  // addons: a one-time ₹1 charge collected immediately when the user
  //         authorises the mandate — this is NOT the recurring amount.
  //
  // After trial_period days, Razorpay auto-charges ₹29 (the plan amount)
  // every month and fires invoice.paid / subscription.charged webhooks.

  const subscriptionPayload = {
    plan_id: RAZORPAY_MONTHLY_PLAN_ID,
    total_count: 120,        // ~10 years; effectively "until cancelled"
    quantity: 1,
    trial_period: 7,         // 7-day trial window
    addons: [
      {
        item: {
          name: "Smart Selfie Alarm — ₹1 Trial",
          amount: 100,       // ₹1 in paise
          currency: "INR",
        },
      },
    ],
    notes: {
      user_id: userId,
      user_email: userEmail,
    },
    notify_info: {
      notify_phone: null,
      notify_email: userEmail || null,
    },
  };

  console.log("[create-subscription] Creating subscription for user:", userId);

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
    return new Response(
      JSON.stringify({
        error:
          rzpBody?.error?.description ?? "Razorpay subscription creation failed",
        details: rzpBody,
      }),
      {
        status: rzpRes.status,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      },
    );
  }

  console.log(
    "[create-subscription] Subscription created:",
    rzpBody.id,
    "status:",
    rzpBody.status,
  );

  return new Response(
    JSON.stringify({
      subscription_id: rzpBody.id,
      status: rzpBody.status,
      plan_id: rzpBody.plan_id,
      short_url: rzpBody.short_url ?? null,
    }),
    {
      status: 200,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    },
  );
});
