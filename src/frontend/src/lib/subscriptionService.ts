import { Timestamp, doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { db } from "./firebase";

export type PlanType = "trial" | "monthly" | "halfYearly" | "free";
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

/** Create a 7-day trial subscription for a new verified user */
export async function createTrialSubscription(
  uid: string,
  email: string,
): Promise<UserSubscription> {
  const now = new Date();
  const expiryDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // +7 days

  const subscription: UserSubscription = {
    email,
    planType: "trial",
    subscriptionStatus: "trial",
    subscriptionStartDate: now,
    subscriptionExpiryDate: expiryDate,
    autoRenew: false,
    razorpaySubscriptionId: null,
    lastPayment: null,
  };

  await setDoc(doc(db, "users", uid), {
    email,
    planType: "trial",
    subscriptionStatus: "trial",
    subscriptionStartDate: Timestamp.fromDate(now),
    subscriptionExpiryDate: Timestamp.fromDate(expiryDate),
    autoRenew: false,
    razorpaySubscriptionId: null,
    lastPayment: null,
  });

  return subscription;
}

/** Fetch the subscription document for a user */
export async function getUserSubscription(
  uid: string,
): Promise<UserSubscription | null> {
  const snap = await getDoc(doc(db, "users", uid));
  if (!snap.exists()) return null;
  const data = snap.data();
  return {
    email: data.email as string,
    planType: data.planType as PlanType,
    subscriptionStatus: data.subscriptionStatus as SubscriptionStatus,
    subscriptionStartDate:
      data.subscriptionStartDate instanceof Timestamp
        ? data.subscriptionStartDate.toDate()
        : new Date(data.subscriptionStartDate as string),
    subscriptionExpiryDate:
      data.subscriptionExpiryDate instanceof Timestamp
        ? data.subscriptionExpiryDate.toDate()
        : new Date(data.subscriptionExpiryDate as string),
    autoRenew: data.autoRenew as boolean,
    razorpaySubscriptionId: (data.razorpaySubscriptionId as string) ?? null,
    lastPayment: data.lastPayment
      ? {
          amount: (data.lastPayment as { amount: number }).amount,
          date:
            (data.lastPayment as { date: Timestamp | null }).date instanceof
            Timestamp
              ? (data.lastPayment as { date: Timestamp }).date.toDate()
              : null,
          txnId: (data.lastPayment as { txnId: string | null }).txnId ?? null,
        }
      : null,
  };
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

/**
 * Placeholder: update subscription after Razorpay payment success webhook.
 * Call this from the webhook handler when Razorpay provides keys.
 */
export async function activateSubscription(
  uid: string,
  planType: PlanType,
  durationDays: number,
  razorpaySubscriptionId: string,
  paymentAmount: number,
  txnId: string,
): Promise<void> {
  const now = new Date();
  const expiryDate = new Date(
    now.getTime() + durationDays * 24 * 60 * 60 * 1000,
  );
  await updateDoc(doc(db, "users", uid), {
    planType,
    subscriptionStatus: "active",
    subscriptionStartDate: Timestamp.fromDate(now),
    subscriptionExpiryDate: Timestamp.fromDate(expiryDate),
    autoRenew: true,
    razorpaySubscriptionId,
    lastPayment: {
      amount: paymentAmount,
      date: Timestamp.fromDate(now),
      txnId,
    },
  });
}
