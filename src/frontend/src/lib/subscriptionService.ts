import { supabase } from "./supabase";

export type PlanType = "trial" | "monthly" | "halfYearly" | "yearly" | "free";
export type SubscriptionStatus = "active" | "trial" | "expired" | "canceled";

export interface UserSubscription {
  email: string;
  planType: PlanType;
  subscriptionStatus: SubscriptionStatus;
  subscriptionStartDate: Date;
  subscriptionExpiryDate: Date;
  autoRenew: boolean;
  razorpaySubscriptionId: string | null;
  lastPayment: {
    amount: number;
    date: Date | null;
    txnId: string | null;
  } | null;
}

function rowToSubscription(row: Record<string, unknown>): UserSubscription {
  return {
    email: String(row.email),
    planType: row.plan_type as PlanType,
    subscriptionStatus: row.subscription_status as SubscriptionStatus,
    subscriptionStartDate: new Date(String(row.subscription_start_date)),
    subscriptionExpiryDate: new Date(String(row.subscription_expiry_date)),
    autoRenew: Boolean(row.auto_renew),
    razorpaySubscriptionId:
      row.razorpay_subscription_id != null
        ? String(row.razorpay_subscription_id)
        : null,
    lastPayment:
      row.last_payment_amount != null
        ? {
            amount: Number(row.last_payment_amount),
            date: row.last_payment_date
              ? new Date(String(row.last_payment_date))
              : null,
            txnId:
              row.last_payment_txn_id != null
                ? String(row.last_payment_txn_id)
                : null,
          }
        : null,
  };
}

/** Create a 7-day trial subscription for a new user */
export async function createTrialSubscription(
  uid: string,
  email: string,
): Promise<UserSubscription> {
  const now = new Date();
  const expiryDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const row = {
    id: uid,
    email,
    plan_type: "trial",
    subscription_status: "trial",
    subscription_start_date: now.toISOString(),
    subscription_expiry_date: expiryDate.toISOString(),
    auto_renew: false,
    razorpay_subscription_id: null,
    last_payment_amount: null,
    last_payment_date: null,
    last_payment_txn_id: null,
  };

  // upsert so re-login doesn't fail
  const { error } = await supabase.from("users").upsert([row], {
    onConflict: "id",
    ignoreDuplicates: true,
  });

  if (error) throw new Error(error.message);

  return {
    email,
    planType: "trial",
    subscriptionStatus: "trial",
    subscriptionStartDate: now,
    subscriptionExpiryDate: expiryDate,
    autoRenew: false,
    razorpaySubscriptionId: null,
    lastPayment: null,
  };
}

/** Fetch the subscription for a user */
export async function getUserSubscription(
  uid: string,
): Promise<UserSubscription | null> {
  const { data, error } = await supabase
    .from("users")
    .select("*")
    .eq("id", uid)
    .maybeSingle();

  if (error) throw new Error(error.message);
  if (!data) return null;
  return rowToSubscription(data);
}

/** Check if subscription is currently active (including trial) */
export function isSubscriptionActive(sub: UserSubscription | null): boolean {
  if (!sub) return false;
  const now = new Date();
  // Grace period: 48 hours after expiry
  const gracePeriodMs = 48 * 60 * 60 * 1000;
  const effectiveExpiry = new Date(
    sub.subscriptionExpiryDate.getTime() + gracePeriodMs,
  );
  if (sub.subscriptionStatus === "canceled") return false;
  if (now > effectiveExpiry) return false;
  return true;
}

const PLAN_DURATION: Record<string, number> = {
  trial: 7,
  monthly: 30,
  halfYearly: 183,
  yearly: 365,
};

/** Activate subscription after successful Razorpay payment */
export async function activateSubscription(
  uid: string,
  planType: PlanType,
  razorpayPaymentId: string,
  paymentAmount: number,
): Promise<void> {
  const now = new Date();
  const durationDays = PLAN_DURATION[planType] ?? 30;
  const expiryDate = new Date(
    now.getTime() + durationDays * 24 * 60 * 60 * 1000,
  );

  const { error } = await supabase
    .from("users")
    .update({
      plan_type: planType,
      subscription_status: planType === "trial" ? "trial" : "active",
      subscription_start_date: now.toISOString(),
      subscription_expiry_date: expiryDate.toISOString(),
      auto_renew: planType !== "trial",
      last_payment_amount: paymentAmount,
      last_payment_date: now.toISOString(),
      last_payment_txn_id: razorpayPaymentId,
    })
    .eq("id", uid);

  if (error) throw new Error(error.message);
}
