// Supabase Edge Function: razorpay-webhook
//
// Handles Razorpay payment events and updates the database when a subscription
// is activated, a payment is captured, or a subscription is cancelled.
//
// Events handled:
//   subscription.activated  → activate 7-day trial access
//   subscription.charged    → extend monthly access (user spec requirement)
//   subscription.cancelled  → mark subscription as cancelled
//   payment.captured        → belt-and-suspenders trial activation fallback
//   invoice.paid            → extend monthly access after each billing cycle
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
//   subscription.charged
//   subscription.cancelled
//   invoice.paid
//   payment.captured

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createHmac } from "node:crypto";

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
// Uses node:crypto createHmac (same as Razorpay Node.js SDK)
function verifySignature(
  body: string,
  signature: string,
  secret: string,
): boolean {
  try {
    const expected = createHmac("sha256", secret)
      .update(body)
      .digest("hex");
    return expected === signature;
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

  // ── 2. Mark trial used in user_trials table ───────────────────────────────
  try {
    const { error: trialErr } = await supabase
      .from("user_trials")
      .upsert(
        { user_id: userId, trial_used: true },
        { onConflict: "user_id" },
      );
    if (trialErr) {
      console.warn("[razorpay-webhook] user_trials upsert skipped:", trialErr.message);
    }
  } catch (trialUpdateErr) {
    console.warn("[razorpay-webhook] user_trials update threw:", String(trialUpdateErr));
  }

  // ── 3. Update users table (best-effort) ───────────────────────────────────
  // is_premium, plan_type, subscription_id, trial_end are in SUPABASE_SETUP.sql.
  // The subscriptions table is the source of truth.
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
      // code 42703 = column not found (SUPABASE_SETUP.sql not yet run — non-fatal)
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

  // Update users table (best-effort)
  try {
    const updatePayload: Record<string, unknown> = {
      is_premium: true,
      plan_type: "monthly",
    };
    if (subscriptionId) updatePayload.subscription_id = subscriptionId;
    await supabase.from("users").update(updatePayload).eq("id", userId);
  } catch (_) {
    // Non-fatal — users table columns may not exist yet
  }

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

Deno.serve(async (req) => {
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
    const valid = verifySignature(rawBody, sig, WEBHOOK_SECRET);
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
        "— cannot activate. Ensure frontend passes user_id when calling create-order.",
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
  // EVENT: subscription.charged
  // Fires each time Razorpay successfully charges the subscription (including
  // the ₹1 trial charge and each subsequent ₹29 monthly charge).
  // Updates users.is_premium = true and extends access.
  // ─────────────────────────────────────────────────────────────────────────
  if (eventName === "subscription.charged") {
    const subEntity = (
      event.payload?.subscription as Record<string, unknown>
    )?.entity as Record<string, unknown> | undefined;

    const paymentEntity = (
      event.payload?.payment as Record<string, unknown>
    )?.entity as Record<string, unknown> | undefined;

    if (!subEntity) {
      console.warn("[razorpay-webhook] subscription.charged: missing subscription entity");
      return ok({ skipped: "missing_entity" });
    }

    const subscriptionId = String(subEntity.id ?? "");
    const paymentId = String(paymentEntity?.id ?? "");
    let userId = extractUserId(subEntity.notes);

    // Fall back to DB lookup if notes don't carry user_id
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
        "[razorpay-webhook] subscription.charged: could not resolve user_id. sub:",
        subscriptionId,
      );
      return ok({ skipped: "missing_user_id" });
    }

    // Determine if this is the first charge (trial) or a recurring monthly charge
    // charge_at on sub entity 1 = first cycle = trial activation
    const paidCount = Number(subEntity.paid_count ?? 0);

    console.log(
      "[razorpay-webhook] subscription.charged — user:",
      userId,
      "paid_count:",
      paidCount,
    );

    try {
      if (paidCount <= 1) {
        // First charge: activate trial
        await activateTrial(supabase, userId, subscriptionId, paymentId);
      } else {
        // Subsequent charges: extend monthly access
        await extendMonthlyAccess(supabase, userId, subscriptionId, paymentId);
      }

      // Always ensure is_premium = true on users table
      try {
        await supabase
          .from("users")
          .update({ is_premium: true })
          .eq("id", userId);
      } catch (_) { /* non-fatal */ }

      return ok({ charged: true, user_id: userId, paid_count: paidCount });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[razorpay-webhook] subscription.charged error:", msg);
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

    // Check if already activated by subscription.activated or subscription.charged
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
