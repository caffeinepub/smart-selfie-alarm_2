import {
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import {
  type SubscriptionRow,
  ensureSubscriptionRow,
  getUserSubscription,
  isSubscriptionActive,
} from "../lib/subscriptionService";
import { useAuthContext } from "./AuthContext";

interface SubscriptionContextType {
  subscription: SubscriptionRow | null;
  isActive: boolean;
  trialUsed: boolean;
  loading: boolean;
  refetch: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextType | null>(null);

export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const { user } = useAuthContext();
  const [subscription, setSubscription] = useState<SubscriptionRow | null>(
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

      // Safety net: ensure a bare row exists
      await ensureSubscriptionRow(user.id);

      const sub = await getUserSubscription(user.id);
      console.log("[SubscriptionContext] Loaded:", {
        plan: sub?.plan,
        status: sub?.status,
        trial_used: sub?.trial_used,
        trial_end: sub?.trial_end,
        expires_at: sub?.expires_at,
        isActive: isSubscriptionActive(sub),
      });
      setSubscription(sub);
    } catch (err) {
      console.error("[SubscriptionContext] Failed to fetch:", err);
      setSubscription(null);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  const isActive = isSubscriptionActive(subscription);
  const trialUsed = subscription?.trial_used ?? false;

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
