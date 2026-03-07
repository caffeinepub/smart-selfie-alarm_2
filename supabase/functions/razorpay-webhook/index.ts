/**
 * Supabase Edge Function: razorpay-webhook
 *
 * Deploy URL: https://ozorrmrvvhmtpoeelewb.supabase.co/functions/v1/razorpay-webhook
 *
 * Configure in Razorpay Dashboard → Webhooks:
 *   URL:    https://ozorrmrvvhmtpoeelewb.supabase.co/functions/v1/razorpay-webhook
 *   Events: subscription.activated, subscription.charged, payment.captured
 *   Secret: <set RAZORPAY_WEBHOOK_SECRET in Supabase Edge Function secrets>
 *
 * Required Supabase secrets (set via: supabase secrets set KEY=value):
 *   RAZORPAY_WEBHOOK_SECRET   — from Razorpay Dashboard → Webhooks → Secret
 *   SUPABASE_SERVICE_ROLE_KEY — service role key (bypasses RLS)
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = "https://ozorrmrvvhmtpoeelewb.supabase.co";

// ─── Plan catalogue (mirrors frontend) ───────────────────────────────────────

const PLAN_DURATION_DAYS: Record<string, number> = {
  monthly: 30,
  halfYearly: 183,
  "6months": 183,
  sixmonths: 183,
  yearly: 365,
  annual: 365,
};

/** Map Razorpay plan_id → internal plan type */
const PLAN_ID_MAP: Record<string, string> = {
  plan_SONFVYmbADMnZR: "monthly",
  plan_SONGMogC09Y1HQ: "halfYearly",
  plan_SONGrpyyySiGEc: "yearly",
};

function normalisePlan(raw: string): string {
  if (PLAN_ID_MAP[raw]) return PLAN_ID_MAP[raw];
  const r = raw.toLowerCase().replace(/[-_\s]/g, "");
  if (r === "monthly") return "monthly";
  if (r === "halfyearly" || r === "6months" || r === "sixmonths") return "halfYearly";
  if (r === "yearly" || r === "annual") return "yearly";
  return "monthly"; // safe fallback
}

// ─── HMAC signature verification ─────────────────────────────────────────────

async function verifySignature(
  body: string,
  signature: string,
  secret: string,
): Promise<boolean> {
  try {
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      enc.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );
    const sigBuffer = await crypto.subtle.sign("HMAC", key, enc.encode(body));
    const expected = Array.from(new Uint8Array(sigBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    // Constant-time comparison
    if (expected.length !== signature.length) return false;
    let diff = 0;
    for (let i = 0; i < expected.length; i++) {
      diff |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
    }
    return diff === 0;
  } catch {
    return false;
  }
}

// ─── Main handler ─────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type, X-Razorpay-Signature",
      },
    });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
    });
  }

  const bodyText = await req.text();
  let payload: Record<string, unknown>;

  try {
    payload = JSON.parse(bodyText);
  } catch {
    console.error("[razorpay-webhook] Invalid JSON");
    return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400 });
  }

  // Verify signature when secret is configured
  const webhookSecret = Deno.env.get("RAZORPAY_WEBHOOK_SECRET");
  if (webhookSecret) {
    const sig = req.headers.get("x-razorpay-signature") ?? "";
    if (!sig) {
      console.error("[razorpay-webhook] Missing signature header");
      return new Response(JSON.stringify({ error: "Missing signature" }), { status: 401 });
    }
    const valid = await verifySignature(bodyText, sig, webhookSecret);
    if (!valid) {
      console.error("[razorpay-webhook] Signature mismatch");
      return new Response(JSON.stringify({ error: "Invalid signature" }), { status: 401 });
    }
  } else {
    console.warn("[razorpay-webhook] RAZORPAY_WEBHOOK_SECRET not set — skipping verification");
  }

  const event = String(payload.event ?? "");
  console.log("[razorpay-webhook] Event:", event);

  const handledEvents = [
    "subscription.activated",
    "subscription.charged",
    "payment.captured",
  ];

  if (handledEvents.includes(event)) {
    try {
      await handlePremiumActivation(payload, event);
    } catch (err) {
      console.error("[razorpay-webhook] handlePremiumActivation error:", err);
      // Always return 200 so Razorpay does not keep retrying
      return new Response(
        JSON.stringify({ received: true, error: String(err) }),
        { status: 200 },
      );
    }
  } else {
    console.log("[razorpay-webhook] Ignoring event:", event);
  }

  return new Response(JSON.stringify({ received: true }), { status: 200 });
});

// ─── Activation logic ─────────────────────────────────────────────────────────

async function handlePremiumActivation(
  payload: Record<string, unknown>,
  event: string,
) {
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!serviceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY secret not configured");
  }

  const supabase = createClient(SUPABASE_URL, serviceRoleKey, {
    auth: { persistSession: false },
  });

  // Extract relevant entities
  const inner = payload.payload as Record<string, unknown> | undefined;

  let userId = "";
  let paymentId = "";
  let amountPaise = 0;
  let planType = "monthly";
  let subscriptionId = "";

  if (event === "subscription.activated" || event === "subscription.charged") {
    // Shape: { payload: { subscription: { entity: {...} }, payment: { entity: {...} } } }
    const subEntity = (
      (inner?.subscription as Record<string, unknown>)?.entity as Record<string, unknown>
    ) ?? {};
    const payEntity = (
      (inner?.payment as Record<string, unknown>)?.entity as Record<string, unknown>
    ) ?? {};

    subscriptionId = String(subEntity.id ?? "");
    const notes = (subEntity.notes ?? payEntity.notes ?? {}) as Record<string, string>;
    userId = notes.user_id ?? notes.userId ?? "";
    const notePlan = notes.plan_type ?? notes.planType ?? "";
    const notePlanId = notes.plan_id ?? notes.planId ?? "";
    const rzpPlanId = String(subEntity.plan_id ?? "");

    // Resolve plan: notes → plan_id map → fallback
    if (notePlan) {
      planType = normalisePlan(notePlan);
    } else if (notePlanId) {
      planType = normalisePlan(notePlanId);
    } else if (rzpPlanId) {
      planType = normalisePlan(rzpPlanId);
    }

    paymentId = String(payEntity.id ?? "");
    amountPaise = Number(payEntity.amount ?? 0);
  } else if (event === "payment.captured") {
    // Shape: { payload: { payment: { entity: {...} } } }
    const payEntity = (
      (inner?.payment as Record<string, unknown>)?.entity as Record<string, unknown>
    ) ?? {};

    paymentId = String(payEntity.id ?? "");
    amountPaise = Number(payEntity.amount ?? 0);
    const notes = (payEntity.notes ?? {}) as Record<string, string>;
    userId = notes.user_id ?? notes.userId ?? "";
    const notePlan = notes.plan_type ?? notes.planType ?? "";
    const notePlanId = notes.plan_id ?? notes.planId ?? "";
    if (notePlan) {
      planType = normalisePlan(notePlan);
    } else if (notePlanId) {
      planType = normalisePlan(notePlanId);
    }
  }

  if (!userId) {
    throw new Error(
      `[razorpay-webhook] Cannot determine user_id from event ${event}. ` +
        "Ensure notes.user_id is set in Razorpay checkout.",
    );
  }

  const now = new Date();
  const durationDays = PLAN_DURATION_DAYS[planType] ?? 30;
  const expiresAt = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);

  console.log("[razorpay-webhook] Activating premium", {
    userId,
    planType,
    paymentId,
    amountPaise,
    subscriptionId,
    expiresAt: expiresAt.toISOString(),
  });

  // 1. Try activate_premium stored function
  const { error: rpcError } = await supabase.rpc("activate_premium", {
    p_user_id: userId,
    p_payment_amount: amountPaise / 100,
    p_payment_id: paymentId,
    p_plan_type: planType,
    p_expires_at: expiresAt.toISOString(),
  });

  if (rpcError) {
    console.warn("[razorpay-webhook] RPC failed, using direct upsert:", rpcError.message);

    // 2. Fallback direct upsert
    const row: Record<string, unknown> = {
      id: userId,
      is_premium: true,
      plan_type: planType,
      subscription_status: "active",
      subscription_start_date: now.toISOString(),
      subscription_expiry_date: expiresAt.toISOString(),
      premium_expires_at: expiresAt.toISOString(),
      auto_renew: true,
      trial_used: true,
      last_payment_amount: amountPaise / 100,
      last_payment_date: now.toISOString(),
      last_payment_txn_id: paymentId,
      razorpay_payment_id: paymentId,
    };
    if (subscriptionId) row.razorpay_subscription_id = subscriptionId;

    const { error: upsertError } = await supabase
      .from("users")
      .upsert(row, { onConflict: "id" });

    if (upsertError) {
      throw new Error(
        `Supabase upsert failed: ${upsertError.message} (code: ${upsertError.code})`,
      );
    }
  } else if (subscriptionId || paymentId) {
    // RPC succeeded; store extra IDs
    const extra: Record<string, unknown> = { trial_used: true };
    if (subscriptionId) extra.razorpay_subscription_id = subscriptionId;
    if (paymentId) extra.razorpay_payment_id = paymentId;
    await supabase.from("users").update(extra).eq("id", userId);
  }

  console.log("[razorpay-webhook] Premium activated for", userId, {
    plan: planType,
    expires: expiresAt.toISOString(),
  });
}
