import { supabase } from "./supabase";

// ─── Types ───────────────────────────────────────────────────────────────────

export type PlanType = "trial" | "monthly" | "free";
export type SubscriptionStatus = "active" | "expired" | "free";

export interface SubscriptionRow {
  id: string;
  user_id: string;
  plan: PlanType; // NEW: was plan_type
  status: SubscriptionStatus;
  trial_start: string | null; // NEW: was start_date
  trial_end: string | null; // NEW: was part of end_date
  expires_at: string | null; // NEW: was end_date
  trial_used: boolean;
  razorpay_subscription_id: string | null;
  razorpay_payment_id: string | null;
  created_at: string | null;
}

// ─── Constants ───────────────────────────────────────────────────────────────

export const RAZORPAY_KEY_ID = "rzp_live_SNnU8ftzmAC4jA";

// Post-trial monthly autopay plan
export const RAZORPAY_MONTHLY_PLAN_ID = "plan_SONFVYmbADMnZR";

const SUPABASE_URL = "https://ozorrmrvvhmtpoeelewb.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im96b3JybXJ2dmhtdHBvZWVsZXdiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3OTY3ODksImV4cCI6MjA4ODM3Mjc4OX0.t6mhVisTuS12QUD8M9b5DrLtlzcIhaILkaTSvoGuF_s";

// Edge Function URL for creating Razorpay subscriptions
const EDGE_FUNCTION_URL = `${SUPABASE_URL}/functions/v1/create-subscription`;

// ─── DB helpers ──────────────────────────────────────────────────────────────

/**
 * Fetch the most recent subscription row for a user.
 * Returns null if no row exists.
 */
export async function getUserSubscription(
  uid: string,
): Promise<SubscriptionRow | null> {
  const { data, error } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("user_id", uid)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("[getUserSubscription] Error:", error.message);
    return null;
  }
  return (data as SubscriptionRow) ?? null;
}

/**
 * Ensure a bare subscriptions row exists for the user.
 * Called after login. Does NOT grant access.
 */
export async function ensureSubscriptionRow(uid: string): Promise<void> {
  // Only insert if no row exists yet
  const existing = await getUserSubscription(uid);
  if (existing) return;

  const { error } = await supabase.from("subscriptions").insert({
    user_id: uid,
    plan: "free",
    status: "free",
    trial_used: false,
  });

  if (error && error.code !== "23505") {
    // 23505 = unique violation, safe to ignore
    console.error("[ensureSubscriptionRow] Failed:", error.message);
  }
}

/**
 * Check whether the subscription grants full access.
 * Allow access if trial_end > now() OR expires_at > now() (with 48-hour grace).
 */
export function isSubscriptionActive(sub: SubscriptionRow | null): boolean {
  if (!sub) return false;
  const now = new Date();

  // Trial window: active if trial_end is in the future
  if (sub.trial_end) {
    const trialEnd = new Date(sub.trial_end);
    if (now <= trialEnd) return true;
  }

  // Paid subscription window: active if expires_at is in the future (with grace)
  if (sub.expires_at) {
    const expiresAt = new Date(sub.expires_at);
    const grace = 48 * 60 * 60 * 1000; // 48-hour grace period
    if (now.getTime() <= expiresAt.getTime() + grace) return true;
  }

  return false;
}

// ─── Razorpay Subscription creation ──────────────────────────────────────────

/**
 * Call the create-subscription Supabase Edge Function.
 * Returns the Razorpay subscription_id (e.g. "sub_XXXXXXXXXX").
 * The edge function creates a Razorpay subscription with:
 *   - ₹1 charged immediately (trial auth payment)
 *   - 7-day trial period
 *   - ₹29/month auto-billing after trial
 */
export async function createRazorpaySubscription(
  userId: string,
  userEmail: string,
): Promise<string> {
  const res = await fetch(EDGE_FUNCTION_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      apikey: SUPABASE_ANON_KEY,
    },
    body: JSON.stringify({
      user_id: userId,
      user_email: userEmail,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`create-subscription failed (${res.status}): ${body}`);
  }

  const json = await res.json();
  const subscriptionId =
    json?.subscription_id ?? json?.id ?? json?.subscriptionId;

  if (!subscriptionId) {
    throw new Error(
      `create-subscription returned no subscription_id. Response: ${JSON.stringify(json)}`,
    );
  }

  console.log("[createRazorpaySubscription] subscription_id:", subscriptionId);
  return subscriptionId as string;
}

// ─── Activation ───────────────────────────────────────────────────────────────

/**
 * Optimistic local activation after checkout success.
 * The webhook is the real source of truth — this gives immediate UI feedback.
 * Uses new column names: plan, trial_start, trial_end, expires_at.
 */
export async function activateTrialLocally(
  uid: string,
  subscriptionId: string,
  paymentId?: string,
): Promise<void> {
  const now = new Date();
  const trialEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // +7 days

  console.log("[activateTrialLocally] Activating for", uid);

  // Upsert by user_id (one subscription row per user)
  const { error } = await supabase.from("subscriptions").upsert(
    {
      user_id: uid,
      plan: "trial",
      status: "active",
      trial_used: true,
      trial_start: now.toISOString(),
      trial_end: trialEnd.toISOString(),
      expires_at: trialEnd.toISOString(),
      razorpay_subscription_id: subscriptionId,
      razorpay_payment_id: paymentId ?? null,
    },
    { onConflict: "user_id" },
  );

  if (error) {
    throw new Error(`activateTrialLocally failed: ${error.message}`);
  }

  console.log(
    "[activateTrialLocally] Done — trial access granted until",
    trialEnd.toISOString(),
  );
}
