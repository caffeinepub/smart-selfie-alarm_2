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
  // OTP flow (for email verification after signup or OTP-only login)
  sendOtp: (email: string) => Promise<void>;
  verifyOtp: (email: string, token: string) => Promise<void>;
  // Password flow
  signUpWithPassword: (
    email: string,
    password: string,
  ) => Promise<{ needsOtp: boolean }>;
  signInWithPassword: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

/**
 * Ensures a bare row exists in public.users (id + email only).
 * Also ensures a subscriptions row exists with plan="free", status="free", trial_used=false.
 * Uses NEW schema column names. Does NOT grant premium access.
 */
async function ensureUserRow(user: User): Promise<void> {
  // 1. Bare users row
  const { error: userError } = await supabase.from("users").upsert(
    {
      id: user.id,
      email: user.email ?? "",
    },
    { onConflict: "id", ignoreDuplicates: true },
  );
  if (userError) {
    console.error(
      "[AuthContext] ensureUserRow (users) failed:",
      userError.message,
    );
  }

  // 2. Bare subscriptions row — only if none exists
  const { data: existing } = await supabase
    .from("subscriptions")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!existing) {
    const { error: subError } = await supabase.from("subscriptions").insert({
      user_id: user.id,
      plan: "free", // NEW: was plan_type
      status: "free",
      trial_used: false,
    });
    if (subError && subError.code !== "23505") {
      console.error(
        "[AuthContext] ensureUserRow (subscriptions) failed:",
        subError.message,
      );
    } else {
      console.log("[AuthContext] subscriptions row created for", user.id);
    }
  }
}

/**
 * Map error messages to typed auth error codes.
 */
function classifyAuthError(
  message: string,
  fallback: string,
): Error & { code: string } {
  const msg = message.toLowerCase();
  const e = new Error(message) as Error & { code: string };

  if (
    msg.includes("already registered") ||
    msg.includes("already exists") ||
    msg.includes("user already")
  ) {
    e.code = "auth/email-in-use";
  } else if (
    msg.includes("rate limit") ||
    msg.includes("too many") ||
    msg.includes("email rate limit")
  ) {
    e.code = "auth/too-many-requests";
  } else if (
    msg.includes("invalid login") ||
    msg.includes("invalid credentials") ||
    msg.includes("wrong password")
  ) {
    e.code = "auth/wrong-password";
  } else if (
    msg.includes("email not confirmed") ||
    msg.includes("email_not_confirmed")
  ) {
    e.code = "auth/email-not-verified";
  } else if (
    msg.includes("user not found") ||
    msg.includes("no user") ||
    msg.includes("invalid email")
  ) {
    e.code = "auth/user-not-found";
  } else if (
    msg.includes("invalid") ||
    msg.includes("expired") ||
    msg.includes("token")
  ) {
    e.code = "auth/invalid-otp";
  } else {
    e.code = fallback;
  }

  return e;
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

  /**
   * Send a one-time password (OTP) to an email.
   * Used for email verification after signup and OTP-only login.
   */
  const sendOtp = async (email: string) => {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: true },
    });
    if (error) {
      throw classifyAuthError(error.message, "auth/otp-send-failed");
    }
  };

  /**
   * Verify a 6-digit OTP sent to the user's email.
   */
  const verifyOtp = async (email: string, token: string) => {
    const { error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: "email",
    });
    if (error) {
      throw classifyAuthError(error.message, "auth/otp-verify-failed");
    }
  };

  /**
   * Sign up with email + password.
   * Returns { needsOtp: true } if email verification is required.
   * Returns { needsOtp: false } if account is already confirmed.
   */
  const signUpWithPassword = async (
    email: string,
    password: string,
  ): Promise<{ needsOtp: boolean }> => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: undefined,
      },
    });

    if (error) {
      throw classifyAuthError(error.message, "auth/signup-failed");
    }

    // If email_confirmed_at is null, the user needs to verify their email
    const needsOtp = !data.user?.email_confirmed_at;
    return { needsOtp };
  };

  /**
   * Sign in with email + password.
   * Throws typed errors for wrong password, unverified email, etc.
   */
  const signInWithPassword = async (
    email: string,
    password: string,
  ): Promise<void> => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw classifyAuthError(error.message, "auth/signin-failed");
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
        signUpWithPassword,
        signInWithPassword,
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
