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
  createTrialSubscription,
  getUserSubscription,
  isSubscriptionActive,
} from "../lib/subscriptionService";
import { useAuthContext } from "./AuthContext";

interface SubscriptionContextType {
  subscription: UserSubscription | null;
  isActive: boolean;
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
      let sub = await getUserSubscription(user.id);
      // If no subscription exists, auto-create trial for new user
      if (!sub) {
        sub = await createTrialSubscription(user.id, user.email ?? "");
      }
      setSubscription(sub);
    } catch (err) {
      console.error("Failed to fetch subscription:", err);
      setSubscription(null);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchSubscription();
  }, [fetchSubscription]);

  const isActive = isSubscriptionActive(subscription);

  return (
    <SubscriptionContext.Provider
      value={{ subscription, isActive, loading, refetch: fetchSubscription }}
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
