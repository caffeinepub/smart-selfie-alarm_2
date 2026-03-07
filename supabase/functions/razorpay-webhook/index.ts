// Supabase Edge Function: razorpay-webhook
// Handles Razorpay payment events and updates subscriptions via the
// activate_premium RPC (NEW SCHEMA: plan, trial_start, trial_end, expires_at).
//
// Deploy:
//   supabase functions deploy razorpay-webhook
//
// Required secrets:
//   RAZORPAY_WEBHOOK_SECRET   = (from Razorpay Dashboard → Webhooks → Secret)
//   SUPABASE_SERVICE_ROLE_KEY = (from Supabase → Settings → API)
//
// Webhook URL (set in Razorpay Dashboard):
//   https://ozorrmrvvhmtpoeelewb.supabase.co/functions/v1/razorpay-webhook
//
// Events to subscribe:
//   subscription.activated
//   invoice.paid
//   payment.captured

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const SUPABASE_URL = "https://ozorrmrvvhmtpoeelewb.supabase.co";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-razorpay-signature",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// ── HMAC-SHA256 signature verification ──────────────────────────────────────
async function verifySignature(
  body: string,
  signature: string,
  secret: string,
): Promise<boolean> {
  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );
    const sigBytes = await crypto.subtle.sign(
      "HMAC",
      key,
      encoder.encode(body),
    );
    const computed = Array.from(new Uint8Array(sigBytes))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    return computed === signature;
  } catch {
    return false;
  }
}

// ── Helper: extract user_id from notes object ────────────────────────────────
function extractUserId(notes: unknown): string {
  if (!notes || typeof notes !== "object") return "";
  const n = notes as Record<string, unknown>;
  return String(n.user_id ?? "").trim();
}

serve(async (req) => {
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
  const WEBHOOK_SECRET = Deno.env.get("RAZORPAY_WEBHOOK_SECRET");
  const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!SERVICE_ROLE_KEY) {
    console.error("[razorpay-webhook] Missing SUPABASE_SERVICE_ROLE_KEY");
    return new Response("Server misconfiguration", {
      status: 500,
      headers: CORS_HEADERS,
    });
  }

  // ── Read raw body ────────────────────────────────────────────────────────
  const rawBody = await req.text();

  // ── Verify Razorpay signature ─────────────────────────────────────────────
  if (WEBHOOK_SECRET) {
    const sig = req.headers.get("x-razorpay-signature") ?? "";
    const valid = await verifySignature(rawBody, sig, WEBHOOK_SECRET);
    if (!valid) {
      console.error("[razorpay-webhook] Invalid signature — rejecting");
      return new Response("Invalid signature", {
        status: 400,
        headers: CORS_HEADERS,
      });
    }
  } else {
    console.warn(
      "[razorpay-webhook] RAZORPAY_WEBHOOK_SECRET not set — skipping check",
    );
  }

  // ── Parse event ──────────────────────────────────────────────────────────
  let event: { event: string; payload: Record<string, unknown> };
  try {
    event = JSON.parse(rawBody);
  } catch {
    return new Response("Invalid JSON", {
      status: 400,
      headers: CORS_HEADERS,
    });
  }

  console.log("[razorpay-webhook] Received event:", event.event);

  // ── Supabase service-role client (bypasses RLS) ──────────────────────────
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  // ─────────────────────────────────────────────────────────────────────────
  // subscription.activated
  // Fired when the user completes the UPI mandate + ₹1 addon payment.
  // → Activate 7-day trial via activate_premium(user_id, 'trial').
  // ─────────────────────────────────────────────────────────────────────────
  if (event.event === "subscription.activated") {
    const sub = (
      event.payload?.subscription as Record<string, unknown>
    )?.entity as Record<string, unknown> | undefined;

    if (!sub) {
      console.warn("[razorpay-webhook] subscription.activated: missing entity");
      return ok();
    }

    const subId = String(sub.id ?? "");
    const userId = extractUserId(sub.notes);
    const paymentEntity = (
      event.payload?.payment as Record<string, unknown>
    )?.entity as Record<string, unknown> | undefined;
    const paymentId = String(paymentEntity?.id ?? "");

    if (!userId) {
      console.warn(
        "[razorpay-webhook] subscription.activated: no user_id in notes. sub_id:",
        subId,
      );
      return ok();
    }

    console.log(
      "[razorpay-webhook] Activating trial — user:",
      userId,
      "sub:",
      subId,
    );

    // Store Razorpay IDs
    const { error: idErr } = await supabase.rpc("set_razorpay_subscription", {
      p_user_id: userId,
      p_subscription_id: subId,
      p_payment_id: paymentId || null,
    });
    if (idErr) {
      console.error(
        "[razorpay-webhook] set_razorpay_subscription error:",
        idErr.message,
      );
    }

    // Activate trial
    const { error } = await supabase.rpc("activate_premium", {
      p_user_id: userId,
      p_plan: "trial",
    });

    if (error) {
      console.error(
        "[razorpay-webhook] activate_premium(trial) error:",
        error.message,
      );
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    console.log("[razorpay-webhook] Trial activated for", userId);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // invoice.paid
  // Fired every recurring billing cycle after trial ends.
  // → Extend expires_at by 30 days via activate_premium(user_id, 'monthly').
  // ─────────────────────────────────────────────────────────────────────────
  if (event.event === "invoice.paid") {
    const invoice = (
      event.payload?.invoice as Record<string, unknown>
    )?.entity as Record<string, unknown> | undefined;

    if (!invoice) {
      console.warn("[razorpay-webhook] invoice.paid: missing entity");
      return ok();
    }

    const invoiceId = String(invoice.id ?? "");
    const subId = String(invoice.subscription_id ?? "");
    const paymentId = String(invoice.payment_id ?? "");

    // Resolve user_id from invoice notes or by looking up the subscription row
    let userId = extractUserId(invoice.notes);

    if (!userId && subId) {
      const { data } = await supabase
        .from("subscriptions")
        .select("user_id")
        .eq("razorpay_subscription_id", subId)
        .maybeSingle();
      userId = data?.user_id ?? "";
    }

    if (!userId) {
      console.warn(
        "[razorpay-webhook] invoice.paid: could not resolve user_id. invoice:",
        invoiceId,
      );
      return ok();
    }

    console.log(
      "[razorpay-webhook] Extending monthly access — user:",
      userId,
      "invoice:",
      invoiceId,
    );

    // Update latest payment ID
    if (paymentId) {
      await supabase
        .from("subscriptions")
        .update({ razorpay_payment_id: paymentId })
        .eq("user_id", userId);
    }

    // Extend access
    const { error } = await supabase.rpc("activate_premium", {
      p_user_id: userId,
      p_plan: "monthly",
    });

    if (error) {
      console.error(
        "[razorpay-webhook] activate_premium(monthly) error:",
        error.message,
      );
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      });
    }

    console.log("[razorpay-webhook] Monthly access extended for", userId);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // payment.captured
  // Belt-and-suspenders: fires when the ₹1 addon charge is captured.
  // Only activates trial if subscription.activated hasn't already done so.
  // ─────────────────────────────────────────────────────────────────────────
  if (event.event === "payment.captured") {
    const payment = (
      event.payload?.payment as Record<string, unknown>
    )?.entity as Record<string, unknown> | undefined;

    if (!payment) {
      console.warn("[razorpay-webhook] payment.captured: missing entity");
      return ok();
    }

    const paymentId = String(payment.id ?? "");
    const subscriptionId = String(
      (payment as Record<string, unknown>).subscription_id ?? "",
    );
    const userId = extractUserId(payment.notes);

    // Only handle subscription-linked payments with a known user
    if (!userId || !subscriptionId) {
      console.log(
        "[razorpay-webhook] payment.captured: skipping — no user_id or not a subscription payment. payment_id:",
        paymentId,
      );
      return ok();
    }

    // Avoid double-activating if subscription.activated already ran
    const { data: existing } = await supabase
      .from("subscriptions")
      .select("status, trial_end")
      .eq("user_id", userId)
      .maybeSingle();

    const alreadyActive =
      existing?.status === "active" &&
      existing?.trial_end &&
      new Date(existing.trial_end) > new Date();

    if (alreadyActive) {
      console.log(
        "[razorpay-webhook] payment.captured: trial already active for",
        userId,
        "— skipping",
      );
      return ok();
    }

    console.log(
      "[razorpay-webhook] payment.captured: activating trial — user:",
      userId,
      "payment:",
      paymentId,
    );

    await supabase.rpc("set_razorpay_subscription", {
      p_user_id: userId,
      p_subscription_id: subscriptionId,
      p_payment_id: paymentId,
    });

    const { error } = await supabase.rpc("activate_premium", {
      p_user_id: userId,
      p_plan: "trial",
    });

    if (error) {
      console.error(
        "[razorpay-webhook] activate_premium(trial) via payment.captured error:",
        error.message,
      );
    } else {
      console.log(
        "[razorpay-webhook] Trial activated via payment.captured for",
        userId,
      );
    }
  }

  return ok();
});

function ok() {
  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}
