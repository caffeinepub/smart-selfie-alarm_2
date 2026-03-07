import {
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import {
  type UserSubscription,
  ensureUserRow,
  getUserSubscription,
  isSubscriptionActive,
} from "../lib/subscriptionService";
import { useAuthContext } from "./AuthContext";

interface SubscriptionContextType {
  subscription: UserSubscription | null;
  isActive: boolean;
  trialUsed: boolean;
  loading: boolean;
  refetch: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextType | null>(null);

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const { user } = useAuthContext();
  const [subscription, setSubscription] = useState<UserSubscription | null>(
    null,
  );
  const [loading, setLoading] = useState(true);

  const fetchSubscription = useCallback(async () => {
    if (!user) {
      setSubscription(null);
      setLoading(false);
      return;
    }
    try {
      setLoading(true);

      // Ensure row exists (safety net on top of DB trigger)
      await ensureUserRow(user.id, user.email ?? "");

      const sub = await getUserSubscription(user.id);
      console.log("[SubscriptionContext] Subscription loaded:", {
        planType: sub?.planType,
        status: sub?.subscriptionStatus,
        isPremium: sub?.isPremium,
        trialUsed: sub?.trialUsed,
        expiresAt: sub?.premiumExpiresAt?.toISOString(),
        isActive: isSubscriptionActive(sub),
      });
      setSubscription(sub);
    } catch (err) {
      console.error("[SubscriptionContext] Failed to fetch subscription:", err);
      setSubscription(null);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  const isActive = isSubscriptionActive(subscription);
  const trialUsed = subscription?.trialUsed ?? false;

  return (
    <SubscriptionContext.Provider
      value={{
        subscription,
        isActive,
        trialUsed,
        loading,
        refetch: fetchSubscription,
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
}

export function useSubscriptionContext(): SubscriptionContextType {
  const ctx = useContext(SubscriptionContext);
  if (!ctx)
    throw new Error(
      "useSubscriptionContext must be used within SubscriptionProvider",
    );
  return ctx;
}
