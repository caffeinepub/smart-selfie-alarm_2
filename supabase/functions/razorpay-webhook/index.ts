// Supabase Edge Function: razorpay-webhook
//
// Handles Razorpay payment events and updates the database when a subscription
// is activated, a payment is captured, or a subscription is cancelled.
//
// Events handled:
//   subscription.activated  → activate 7-day trial access
//   subscription.cancelled  → mark subscription as cancelled
//   payment.captured        → belt-and-suspenders trial activation fallback
//   invoice.paid            → extend monthly access after each billing cycle
//
// Database updates on activation:
//   subscriptions table:
//     plan        = "trial"
//     status      = "active"
//     trial_start = now()
//     trial_end   = now() + 7 days
//     expires_at  = now() + 7 days
//     trial_used  = true
//     razorpay_subscription_id = <sub id>
//     razorpay_payment_id      = <payment id>
//
//   users table (best-effort — skipped gracefully if columns missing):
//     is_premium      = true
//     plan_type       = "monthly"
//     subscription_id = <razorpay subscription id>
//     trial_end       = now() + 7 days
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
// Events to subscribe in Razorpay Dashboard:
//   subscription.activated
//   subscription.cancelled
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

function ok(extra?: Record<string, unknown>) {
  return new Response(
    JSON.stringify({ received: true, ...extra }),
    {
      status: 200,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    },
  );
}

function errResponse(msg: string, status = 400) {
  return new Response(
    JSON.stringify({ error: msg }),
    {
      status,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    },
  );
}

// ── HMAC-SHA256 signature verification ────────────────────────────────────────
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
    const sigBytes = await crypto.subtle.sign("HMAC", key, encoder.encode(body));
    const computed = Array.from(new Uint8Array(sigBytes))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    return computed === signature;
  } catch {
    return false;
  }
}

// ── Extract user_id from a notes object ───────────────────────────────────────
function extractUserId(notes: unknown): string {
  if (!notes || typeof notes !== "object") return "";
  const n = notes as Record<string, unknown>;
  return String(n.user_id ?? "").trim();
}

// ── Activate trial in both tables ─────────────────────────────────────────────
//
// Updates:
//   subscriptions: plan/status/trial_start/trial_end/expires_at/trial_used/razorpay IDs
//   users:         is_premium / plan_type / subscription_id / trial_end
//
async function activateTrial(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  subscriptionId: string,
  paymentId: string,
): Promise<void> {
  const now = new Date();
  const trialEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // +7 days
  const trialEndIso = trialEnd.toISOString();
  const nowIso = now.toISOString();

  // ── 1. Update subscriptions table ─────────────────────────────────────────
  const { error: subErr } = await supabase
    .from("subscriptions")
    .upsert(
      {
        user_id: userId,
        plan: "trial",
        status: "active",
        trial_start: nowIso,
        trial_end: trialEndIso,
        expires_at: trialEndIso,
        trial_used: true,
        razorpay_subscription_id: subscriptionId,
        razorpay_payment_id: paymentId || null,
      },
      { onConflict: "user_id" },
    );

  if (subErr) {
    console.error("[razorpay-webhook] subscriptions upsert error:", subErr.message);
    throw new Error(`subscriptions update failed: ${subErr.message}`);
  }

  // ── 2. Update users table (best-effort) ───────────────────────────────────
  // is_premium, plan_type, subscription_id, trial_end columns are added by
  // SUPABASE_SETUP.sql. If they don't exist yet the update is skipped gracefully.
  // The subscriptions table is the source of truth — this is a denormalised cache.
  try {
    const { error: userErr } = await supabase
      .from("users")
      .update({
        is_premium: true,
        plan_type: "monthly",
        subscription_id: subscriptionId || null,
        trial_end: trialEndIso,
      })
      .eq("id", userId);

    if (userErr) {
      // column_not_found (code 42703) means SUPABASE_SETUP.sql not yet run.
      // Any other error is unexpected but still non-fatal here.
      console.warn(
        "[razorpay-webhook] users update skipped:",
        userErr.code,
        userErr.message,
      );
    }
  } catch (userUpdateErr) {
    console.warn(
      "[razorpay-webhook] users update threw:",
      String(userUpdateErr),
    );
  }

  console.log(
    "[razorpay-webhook] Trial activated — user:",
    userId,
    "trial_end:",
    trialEndIso,
    "sub:",
    subscriptionId,
  );
}

// ── Extend monthly access ──────────────────────────────────────────────────────
async function extendMonthlyAccess(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  subscriptionId: string,
  paymentId: string,
): Promise<void> {
  // Fetch current expires_at to extend from
  const { data: existing } = await supabase
    .from("subscriptions")
    .select("expires_at")
    .eq("user_id", userId)
    .maybeSingle();

  const now = new Date();
  const base = existing?.expires_at
    ? new Date(Math.max(now.getTime(), new Date(existing.expires_at).getTime()))
    : now;
  const newExpiry = new Date(base.getTime() + 30 * 24 * 60 * 60 * 1000);
  const newExpiryIso = newExpiry.toISOString();

  // Update subscriptions
  const { error: subErr } = await supabase
    .from("subscriptions")
    .upsert(
      {
        user_id: userId,
        plan: "monthly",
        status: "active",
        expires_at: newExpiryIso,
        razorpay_subscription_id: subscriptionId || undefined,
        razorpay_payment_id: paymentId || null,
      },
      { onConflict: "user_id" },
    );

  if (subErr) {
    console.error("[razorpay-webhook] extend subscriptions error:", subErr.message);
    throw new Error(`subscriptions extend failed: ${subErr.message}`);
  }

  // Update users table
  const updatePayload: Record<string, unknown> = {
    is_premium: true,
    plan_type: "monthly",
  };
  if (subscriptionId) updatePayload.subscription_id = subscriptionId;

  await supabase.from("users").update(updatePayload).eq("id", userId);

  console.log(
    "[razorpay-webhook] Monthly access extended — user:",
    userId,
    "expires_at:",
    newExpiryIso,
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main handler
// ─────────────────────────────────────────────────────────────────────────────

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

  // ── Secrets ──────────────────────────────────────────────────────────────
  const WEBHOOK_SECRET = Deno.env.get("RAZORPAY_WEBHOOK_SECRET");
  const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!SERVICE_ROLE_KEY) {
    console.error("[razorpay-webhook] Missing SUPABASE_SERVICE_ROLE_KEY");
    return errResponse("Server misconfiguration", 500);
  }

  // ── Read raw body ─────────────────────────────────────────────────────────
  const rawBody = await req.text();

  // ── Verify Razorpay signature ─────────────────────────────────────────────
  if (WEBHOOK_SECRET) {
    const sig = req.headers.get("x-razorpay-signature") ?? "";
    if (!sig) {
      console.warn("[razorpay-webhook] No x-razorpay-signature header");
    }
    const valid = await verifySignature(rawBody, sig, WEBHOOK_SECRET);
    if (!valid) {
      console.error("[razorpay-webhook] Signature mismatch — rejecting request");
      return errResponse("Invalid signature", 400);
    }
  } else {
    console.warn(
      "[razorpay-webhook] RAZORPAY_WEBHOOK_SECRET not set — skipping signature check",
    );
  }

  // ── Parse event ───────────────────────────────────────────────────────────
  let event: { event: string; payload: Record<string, unknown> };
  try {
    event = JSON.parse(rawBody);
  } catch {
    return errResponse("Invalid JSON body", 400);
  }

  const eventName: string = event.event ?? "";
  console.log("[razorpay-webhook] Received event:", eventName);

  // ── Supabase service-role client (bypasses RLS) ───────────────────────────
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  // ─────────────────────────────────────────────────────────────────────────
  // EVENT: subscription.activated
  // Fired when the user completes the UPI autopay mandate and the ₹1 addon
  // charge is authorised. This is the primary activation trigger.
  // ─────────────────────────────────────────────────────────────────────────
  if (eventName === "subscription.activated") {
    const subEntity = (
      event.payload?.subscription as Record<string, unknown>
    )?.entity as Record<string, unknown> | undefined;

    if (!subEntity) {
      console.warn("[razorpay-webhook] subscription.activated: missing subscription entity");
      return ok({ skipped: "missing_entity" });
    }

    const subscriptionId = String(subEntity.id ?? "");
    const userId = extractUserId(subEntity.notes);

    // Try to extract payment_id from the payment entity in the same event
    const paymentEntity = (
      event.payload?.payment as Record<string, unknown>
    )?.entity as Record<string, unknown> | undefined;
    const paymentId = String(paymentEntity?.id ?? "");

    if (!userId) {
      console.error(
        "[razorpay-webhook] subscription.activated: no user_id in notes. sub_id:",
        subscriptionId,
        "— cannot activate. Ensure frontend passes user_id when calling create-subscription.",
      );
      return ok({ skipped: "missing_user_id" });
    }

    try {
      await activateTrial(supabase, userId, subscriptionId, paymentId);
      return ok({ activated: true, user_id: userId, subscription_id: subscriptionId });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[razorpay-webhook] subscription.activated error:", msg);
      return errResponse(msg, 500);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // EVENT: payment.captured
  // Fires when the ₹1 addon charge is captured (may fire slightly before or
  // after subscription.activated). Used as a fallback activation path.
  // Only acts if the subscription is not already active.
  // ─────────────────────────────────────────────────────────────────────────
  if (eventName === "payment.captured") {
    const paymentEntity = (
      event.payload?.payment as Record<string, unknown>
    )?.entity as Record<string, unknown> | undefined;

    if (!paymentEntity) {
      console.warn("[razorpay-webhook] payment.captured: missing payment entity");
      return ok({ skipped: "missing_entity" });
    }

    const paymentId = String(paymentEntity.id ?? "");
    const subscriptionId = String(
      (paymentEntity as Record<string, unknown>).subscription_id ?? "",
    );
    const userId = extractUserId(paymentEntity.notes);

    // Only handle subscription-linked payments with a resolvable user
    if (!userId || !subscriptionId) {
      console.log(
        "[razorpay-webhook] payment.captured: skipping (no user_id or not a subscription payment). payment_id:",
        paymentId,
      );
      return ok({ skipped: "not_subscription_payment" });
    }

    // Check if already activated by subscription.activated handler
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
        "— skipping duplicate activation",
      );
      return ok({ skipped: "already_active" });
    }

    console.log(
      "[razorpay-webhook] payment.captured: activating trial (fallback path) — user:",
      userId,
      "payment:",
      paymentId,
      "sub:",
      subscriptionId,
    );

    try {
      await activateTrial(supabase, userId, subscriptionId, paymentId);
      return ok({ activated: true, user_id: userId, via: "payment_captured" });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[razorpay-webhook] payment.captured activation error:", msg);
      return errResponse(msg, 500);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // EVENT: invoice.paid
  // Fires for every recurring monthly charge after the trial ends.
  // Extends the user's access by 30 days.
  // ─────────────────────────────────────────────────────────────────────────
  if (eventName === "invoice.paid") {
    const invoiceEntity = (
      event.payload?.invoice as Record<string, unknown>
    )?.entity as Record<string, unknown> | undefined;

    if (!invoiceEntity) {
      console.warn("[razorpay-webhook] invoice.paid: missing invoice entity");
      return ok({ skipped: "missing_entity" });
    }

    const invoiceId = String(invoiceEntity.id ?? "");
    const subscriptionId = String(invoiceEntity.subscription_id ?? "");
    const paymentId = String(invoiceEntity.payment_id ?? "");

    // Resolve user_id: try notes first, then look up by razorpay_subscription_id
    let userId = extractUserId(invoiceEntity.notes);

    if (!userId && subscriptionId) {
      const { data } = await supabase
        .from("subscriptions")
        .select("user_id")
        .eq("razorpay_subscription_id", subscriptionId)
        .maybeSingle();
      userId = data?.user_id ?? "";
    }

    if (!userId) {
      console.warn(
        "[razorpay-webhook] invoice.paid: could not resolve user_id. invoice:",
        invoiceId,
      );
      return ok({ skipped: "missing_user_id" });
    }

    console.log(
      "[razorpay-webhook] invoice.paid: extending monthly access — user:",
      userId,
      "invoice:",
      invoiceId,
    );

    try {
      await extendMonthlyAccess(supabase, userId, subscriptionId, paymentId);
      return ok({ extended: true, user_id: userId });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[razorpay-webhook] invoice.paid extension error:", msg);
      return errResponse(msg, 500);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // EVENT: subscription.cancelled
  // Fires when the user or admin cancels the Razorpay subscription.
  // Marks the subscription row as cancelled and clears premium on users table.
  // ─────────────────────────────────────────────────────────────────────────
  if (eventName === "subscription.cancelled") {
    const subEntity = (
      event.payload?.subscription as Record<string, unknown>
    )?.entity as Record<string, unknown> | undefined;

    if (!subEntity) {
      console.warn("[razorpay-webhook] subscription.cancelled: missing subscription entity");
      return ok({ skipped: "missing_entity" });
    }

    const subscriptionId = String(subEntity.id ?? "");
    let userId = extractUserId(subEntity.notes);

    // Fall back to DB lookup if notes don't have user_id
    if (!userId && subscriptionId) {
      const { data } = await supabase
        .from("subscriptions")
        .select("user_id")
        .eq("razorpay_subscription_id", subscriptionId)
        .maybeSingle();
      userId = data?.user_id ?? "";
    }

    if (!userId) {
      console.warn(
        "[razorpay-webhook] subscription.cancelled: could not resolve user_id for sub:",
        subscriptionId,
      );
      return ok({ skipped: "missing_user_id" });
    }

    try {
      const { error: cancelErr } = await supabase
        .from("subscriptions")
        .update({ status: "cancelled" })
        .eq("user_id", userId);

      if (cancelErr) {
        throw new Error(cancelErr.message);
      }

      // Best-effort: clear premium flag on users table
      try {
        await supabase
          .from("users")
          .update({ is_premium: false, plan_type: "free" })
          .eq("id", userId);
      } catch (_) {
        // Ignore — users table columns may not exist yet
      }

      console.log(
        "[razorpay-webhook] Subscription cancelled — user:",
        userId,
        "sub:",
        subscriptionId,
      );
      return ok({ cancelled: true, user_id: userId });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[razorpay-webhook] subscription.cancelled error:", msg);
      return errResponse(msg, 500);
    }
  }

  // Unhandled event — acknowledge receipt without processing
  console.log("[razorpay-webhook] Unhandled event type:", eventName, "— acknowledged");
  return ok({ unhandled: eventName });
});
