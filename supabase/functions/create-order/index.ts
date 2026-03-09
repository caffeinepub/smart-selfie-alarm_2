// Supabase Edge Function: create-order
//
// Creates a Razorpay SUBSCRIPTION (not a one-time order).
// Named "create-order" to match the frontend's requested endpoint URL.
//
// Flow:
//   ₹1 addon charged immediately when the UPI autopay mandate is set up
//   → 7-day trial access
//   → ₹29/month auto-billing after trial (plan_SONFVYmbADMnZR)
//
// Returns { subscription_id, status, plan_id } to the frontend.
// Frontend opens Razorpay checkout with subscription_id (NOT order_id).
//
// Deploy:
//   supabase functions deploy create-order
//
// Required secrets (Supabase Dashboard → Edge Functions → Secrets):
//   RAZORPAY_KEY_ID          = rzp_live_SNnU8ftzmAC4jA
//   RAZORPAY_KEY_SECRET      = <your secret>
//   RAZORPAY_MONTHLY_PLAN_ID = plan_SONFVYmbADMnZR   (optional — hardcoded fallback)

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  // ── CORS preflight ──────────────────────────────────────────────────────────
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method Not Allowed", {
      status: 405,
      headers: corsHeaders,
    });
  }

  try {
    // ── Environment secrets ─────────────────────────────────────────────────
    const RAZORPAY_KEY_ID = Deno.env.get("RAZORPAY_KEY_ID");
    const RAZORPAY_KEY_SECRET = Deno.env.get("RAZORPAY_KEY_SECRET");
    // Fall back to the known plan ID if env var not set
    const PLAN_ID =
      Deno.env.get("RAZORPAY_MONTHLY_PLAN_ID") ?? "plan_SONFVYmbADMnZR";

    if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
      console.error(
        "[create-order] Missing Razorpay secrets. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in Supabase Dashboard → Edge Functions → Secrets.",
      );
      return jsonResponse(
        {
          error:
            "Server misconfiguration: missing Razorpay keys. Contact support.",
        },
        500,
      );
    }

    // ── Parse request body ───────────────────────────────────────────────────
    // Accepts { plan_id, user_id, user_email } from the frontend.
    let body: { plan_id?: string; user_id?: string; user_email?: string } = {};
    try {
      body = await req.json();
    } catch {
      // No body or invalid JSON — use empty defaults
    }

    const userId = (body.user_id ?? "").trim();
    const userEmail = (body.user_email ?? "").trim();
    // Use plan_id from request body; fall back to env var, then hardcoded default
    const planId = (body.plan_id ?? "").trim() || PLAN_ID;

    if (!userId) {
      return jsonResponse({ error: "user_id is required" }, 400);
    }

    // ── Basic Auth header for Razorpay API ──────────────────────────────────
    const credentials = btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`);

    // ── Create Razorpay Subscription ────────────────────────────────────────
    //
    // Razorpay Subscriptions API: POST /v1/subscriptions
    //
    // plan_id        — selected plan from request body (monthly/half-yearly/yearly)
    // total_count    — 12 billing cycles after trial
    // customer_notify — 1 = Razorpay sends email/SMS to customer
    // trial_period   — 7 days free trial before first recurring charge
    // addons         — ₹1 charged IMMEDIATELY when autopay mandate is set up
    //                  NOTE: uses "items" (plural array) per Razorpay Subscriptions API
    // notes          — user_id forwarded to webhook so we can activate premium
    //
    const subscriptionPayload: Record<string, unknown> = {
      plan_id: planId,
      total_count: 12,
      quantity: 1,
      customer_notify: 1,
      trial_period: 7,
      addons: [
        {
          items: [
            {
              name: "Smart Selfie Alarm — ₹1 Trial",
              amount: 100, // ₹1 in paise
              currency: "INR",
              unit: 1,
            },
          ],
        },
      ],
      notes: {
        user_id: userId,
        user_email: userEmail,
        source: "smart_selfie_alarm",
      },
    };

    // Only attach notify_info when a valid email is present.
    // Passing an empty string to Razorpay causes BAD_REQUEST_ERROR.
    if (userEmail) {
      subscriptionPayload.notify_info = {
        notify_email: userEmail,
      };
    }

    console.log(
      "[create-order] Creating Razorpay subscription — plan:",
      planId,
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
      console.error("[create-order] Razorpay error:", JSON.stringify(rzpBody));
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
      "[create-order] Subscription created:",
      subscriptionId,
      "status:",
      status,
    );

    // Return subscription_id so the frontend can open Razorpay checkout.
    // IMPORTANT: Frontend must use `subscription_id` (not `order_id`) in
    // the Razorpay checkout options — this is required for the Subscriptions API.
    return jsonResponse({
      subscription_id: subscriptionId,
      status,
      plan_id: rzpBody.plan_id ?? planId,
      short_url: rzpBody.short_url ?? null,
      user_id: userId,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[create-order] Unexpected error:", msg);
    return jsonResponse({ error: msg }, 500);
  }
});
