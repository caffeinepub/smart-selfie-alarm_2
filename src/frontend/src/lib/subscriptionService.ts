import { supabase } from "./supabase";

export type PlanType = "monthly" | "halfYearly" | "yearly" | "free";
export type SubscriptionStatus = "active" | "trial" | "expired" | "canceled";

export interface UserSubscription {
  id: string;
  email: string;
  planType: PlanType;
  subscriptionStatus: SubscriptionStatus;
  subscriptionStartDate: Date | null;
  premiumExpiresAt: Date | null;
  autoRenew: boolean;
  isPremium: boolean;
  trialUsed: boolean;
  razorpaySubscriptionId: string | null;
  razorpayPaymentId: string | null;
  lastPaymentAmount: number | null;
}

function rowToSubscription(row: Record<string, unknown>): UserSubscription {
  // Support both is_premium (canonical) and legacy premium
  const isPremium =
    row.is_premium != null ? Boolean(row.is_premium) : Boolean(row.premium);

  // Support premium_expires_at (new) and subscription_expiry_date (legacy)
  const premiumExpiresAt =
    row.premium_expires_at != null
      ? new Date(String(row.premium_expires_at))
      : row.subscription_expiry_date != null
        ? new Date(String(row.subscription_expiry_date))
        : null;

  return {
    id: String(row.id ?? ""),
    email: String(row.email ?? ""),
    planType: (row.plan_type ?? "free") as PlanType,
    subscriptionStatus: (row.subscription_status ??
      "expired") as SubscriptionStatus,
    subscriptionStartDate: row.subscription_start_date
      ? new Date(String(row.subscription_start_date))
      : null,
    premiumExpiresAt,
    autoRenew: Boolean(row.auto_renew),
    isPremium,
    trialUsed: Boolean(row.trial_used),
    razorpaySubscriptionId:
      row.razorpay_subscription_id != null
        ? String(row.razorpay_subscription_id)
        : null,
    razorpayPaymentId:
      row.razorpay_payment_id != null ? String(row.razorpay_payment_id) : null,
    lastPaymentAmount:
      row.last_payment_amount != null ? Number(row.last_payment_amount) : null,
  };
}

/** Fetch the current user's subscription row */
export async function getUserSubscription(
  uid: string,
): Promise<UserSubscription | null> {
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("id", uid)
    .maybeSingle();

  if (error) throw new Error(`getUserSubscription failed: ${error.message}`);
  if (!data) return null;
  return rowToSubscription(data as Record<string, unknown>);
}

/**
 * Ensure a row exists for the user (called after login).
 * Does NOT grant premium — just creates a bare row with trial_used=false.
 * The DB trigger also does this but we add a safety net here.
 */
export async function ensureUserRow(uid: string, email: string): Promise<void> {
  const { error } = await supabase.from("users").upsert(
    {
      id: uid,
      email,
      is_premium: false,
      subscription_status: "expired",
      trial_used: false,
      auto_renew: false,
    },
    { onConflict: "id", ignoreDuplicates: true },
  );
  if (error) {
    console.error("[subscriptionService] ensureUserRow failed:", error.message);
  }
}

/** Whether the subscription is currently active (premium flag + expiry in future) */
export function isSubscriptionActive(sub: UserSubscription | null): boolean {
  if (!sub) return false;
  if (!sub.isPremium) return false;
  if (sub.subscriptionStatus === "canceled") return false;

  const now = new Date();
  const expiry = sub.premiumExpiresAt;
  if (!expiry) return false;

  // 48-hour grace period
  const gracePeriodMs = 48 * 60 * 60 * 1000;
  return now.getTime() <= expiry.getTime() + gracePeriodMs;
}

// ─── Plan catalogue ───────────────────────────────────────────────────────────

export const RAZORPAY_KEY_ID = "rzp_live_SNnU8ftzmAC4jA";

// Pre-created plan IDs in Razorpay dashboard
export const RAZORPAY_PLAN_IDS: Record<string, string> = {
  monthly: "plan_SONFVYmbADMnZR",
  halfYearly: "plan_SONGMogC09Y1HQ",
  yearly: "plan_SONGrpyyySiGEc",
};

// Prices in paise (1 INR = 100 paise)
export const PLAN_PRICE_PAISE: Record<string, number> = {
  monthly: 2900, // ₹29
  halfYearly: 14900, // ₹149
  yearly: 27900, // ₹279
};

// Duration in days for each plan
export const PLAN_DURATION_DAYS: Record<string, number> = {
  monthly: 30,
  halfYearly: 183,
  yearly: 365,
};

// ─── Activation ──────────────────────────────────────────────────────────────

/**
 * Called client-side after Razorpay payment succeeds.
 * Tries the activate_premium RPC first; falls back to a direct upsert.
 */
export async function activateSubscription(opts: {
  uid: string;
  planType: PlanType;
  paymentId: string;
  amountRupees: number;
  subscriptionId?: string;
}): Promise<void> {
  const { uid, planType, paymentId, amountRupees, subscriptionId } = opts;

  const now = new Date();
  const durationDays = PLAN_DURATION_DAYS[planType] ?? 30;
  const expiryDate = new Date(
    now.getTime() + durationDays * 24 * 60 * 60 * 1000,
  );

  console.log("[activateSubscription] Activating", {
    uid,
    planType,
    paymentId,
    amountRupees,
    expiryDate: expiryDate.toISOString(),
  });

  // 1. Try the Supabase RPC (activate_premium stored function)
  const { error: rpcError } = await supabase.rpc("activate_premium", {
    p_user_id: uid,
    p_payment_amount: amountRupees,
    p_payment_id: paymentId,
    p_plan_type: planType,
    p_expires_at: expiryDate.toISOString(),
  });

  if (rpcError) {
    console.warn(
      "[activateSubscription] RPC failed, falling back to direct upsert:",
      rpcError.message,
    );

    // 2. Fallback: direct upsert to users table
    const payload: Record<string, unknown> = {
      id: uid,
      is_premium: true,
      plan_type: planType,
      subscription_status: "active",
      subscription_start_date: now.toISOString(),
      subscription_expiry_date: expiryDate.toISOString(),
      premium_expires_at: expiryDate.toISOString(),
      auto_renew: true,
      last_payment_amount: amountRupees,
      last_payment_date: now.toISOString(),
      last_payment_txn_id: paymentId,
      razorpay_payment_id: paymentId,
      trial_used: true,
    };
    if (subscriptionId) {
      payload.razorpay_subscription_id = subscriptionId;
    }

    const { error: upsertError } = await supabase
      .from("users")
      .upsert(payload, { onConflict: "id" });

    if (upsertError) {
      throw new Error(
        `Activation failed: ${upsertError.message} (code: ${upsertError.code})`,
      );
    }
  } else {
    // RPC succeeded; also store subscription_id and payment_id if provided
    if (subscriptionId || paymentId) {
      const extra: Record<string, unknown> = { trial_used: true };
      if (subscriptionId) extra.razorpay_subscription_id = subscriptionId;
      if (paymentId) extra.razorpay_payment_id = paymentId;
      await supabase.from("users").update(extra).eq("id", uid);
    }
  }

  console.log("[activateSubscription] Done — premium activated for", uid);
}

/**
 * Mark trial_used = true before opening Razorpay checkout.
 * Called immediately when user taps "Start Free Trial".
 */
export async function markTrialUsed(uid: string): Promise<void> {
  const { error } = await supabase
    .from("users")
    .update({ trial_used: true })
    .eq("id", uid);
  if (error) {
    console.error("[markTrialUsed] Failed:", error.message);
  }
}
