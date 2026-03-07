import type { Session, User } from "@supabase/supabase-js";
import {
  type ReactNode,
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";
import { supabase } from "../lib/supabase";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  sendOtp: (email: string) => Promise<void>;
  verifyOtp: (email: string, token: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

/**
 * Ensures a row exists in public.users for the given authenticated user.
 * Called on every SIGNED_IN event so OTP users are covered.
 * Uses upsert with ignoreDuplicates so it is safe to call repeatedly.
 */
async function ensureUserRow(user: User): Promise<void> {
  const now = new Date();
  const trialExpiry = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const { error } = await supabase.from("users").upsert(
    {
      id: user.id,
      email: user.email ?? "",
      is_premium: true, // trial users get premium access
      plan_type: "trial",
      subscription_status: "trial",
      subscription_start_date: now.toISOString(),
      subscription_expiry_date: trialExpiry.toISOString(),
      auto_renew: false,
    },
    { onConflict: "id", ignoreDuplicates: true },
  );
  if (error) {
    console.error(
      "[AuthContext] ensureUserRow failed:",
      error.message,
      error.code,
    );
  } else {
    console.log("[AuthContext] ensureUserRow: row ensured for", user.id);
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s);
      setUser(s?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes — auto-create user row on every SIGNED_IN
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      setLoading(false);
      // Ensure the public.users row exists for new and returning users
      if ((event === "SIGNED_IN" || event === "TOKEN_REFRESHED") && s?.user) {
        ensureUserRow(s.user);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const sendOtp = async (email: string) => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true },
    });
    if (error) {
      const e = new Error(error.message) as Error & { code: string };
      if (
        error.message.toLowerCase().includes("rate limit") ||
        error.message.toLowerCase().includes("too many")
      ) {
        e.code = "auth/too-many-requests";
      } else {
        e.code = "auth/otp-send-failed";
      }
      throw e;
    }
  };

  const verifyOtp = async (email: string, token: string) => {
    const { error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: "email",
    });
    if (error) {
      const e = new Error(error.message) as Error & { code: string };
      if (
        error.message.toLowerCase().includes("invalid") ||
        error.message.toLowerCase().includes("expired") ||
        error.message.toLowerCase().includes("token")
      ) {
        e.code = "auth/invalid-otp";
      } else if (
        error.message.toLowerCase().includes("rate limit") ||
        error.message.toLowerCase().includes("too many")
      ) {
        e.code = "auth/too-many-requests";
      } else {
        e.code = "auth/otp-verify-failed";
      }
      throw e;
    }
  };

  const logout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        sendOtp,
        verifyOtp,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuthContext must be used within AuthProvider");
  return ctx;
}
