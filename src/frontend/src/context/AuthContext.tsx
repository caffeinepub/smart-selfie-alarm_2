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
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  updateDisplayName: (name: string) => Promise<void>;
  resendVerificationEmail: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

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

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setUser(s?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      const e = new Error(error.message) as Error & { code: string };
      e.code = mapSupabaseErrorCode(error.message);
      throw e;
    }
    // Check email confirmed
    if (data.user && !data.user.email_confirmed_at) {
      await supabase.auth.signOut();
      const e = new Error("auth/email-not-verified") as Error & {
        code: string;
      };
      e.code = "auth/email-not-verified";
      throw e;
    }
  };

  const signup = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: window.location.origin,
      },
    });
    if (error) {
      const e = new Error(error.message) as Error & { code: string };
      e.code = mapSupabaseErrorCode(error.message);
      throw e;
    }
    // Supabase sends verification email automatically; sign out pending users
    await supabase.auth.signOut();
  };

  const logout = async () => {
    await supabase.auth.signOut();
  };

  const signInWithGoogle = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin,
        queryParams: { prompt: "select_account" },
      },
    });
    if (error) {
      const e = new Error(error.message) as Error & { code: string };
      e.code = "auth/google-failed";
      throw e;
    }
    // signInWithOAuth triggers a redirect — no await needed beyond this point
  };

  const updateDisplayName = async (name: string) => {
    const { error } = await supabase.auth.updateUser({
      data: { full_name: name, display_name: name },
    });
    if (error) throw new Error(error.message);
    // Refresh user
    const { data } = await supabase.auth.getUser();
    setUser(data.user);
  };

  const resendVerificationEmail = async () => {
    if (!user?.email) throw new Error("Not signed in");
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: user.email,
    });
    if (error) throw new Error(error.message);
  };

  const sendPasswordReset = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) throw new Error(error.message);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        login,
        signup,
        logout,
        signInWithGoogle,
        updateDisplayName,
        resendVerificationEmail,
        sendPasswordReset,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

function mapSupabaseErrorCode(message: string): string {
  const msg = message.toLowerCase();
  if (
    msg.includes("invalid login credentials") ||
    msg.includes("invalid_credentials")
  )
    return "auth/invalid-credential";
  if (
    msg.includes("email not confirmed") ||
    msg.includes("email_not_confirmed")
  )
    return "auth/email-not-verified";
  if (
    msg.includes("user already registered") ||
    msg.includes("already been registered")
  )
    return "auth/email-already-in-use";
  if (msg.includes("password should be at least")) return "auth/weak-password";
  if (msg.includes("rate limit") || msg.includes("too many"))
    return "auth/too-many-requests";
  if (msg.includes("network") || msg.includes("fetch"))
    return "auth/network-request-failed";
  return "auth/unknown";
}

export function useAuthContext(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuthContext must be used within AuthProvider");
  return ctx;
}
