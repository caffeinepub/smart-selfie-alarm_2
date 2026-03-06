import {
  type User,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
} from "firebase/auth";
import {
  type ReactNode,
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";
import { auth, googleProvider } from "../lib/firebase";

interface AuthContextType {
  user: User | null;
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
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const login = async (email: string, password: string) => {
    const credential = await signInWithEmailAndPassword(auth, email, password);
    if (!credential.user.emailVerified) {
      await signOut(auth);
      const err = new Error("auth/email-not-verified") as Error & {
        code: string;
      };
      err.code = "auth/email-not-verified";
      throw err;
    }
  };

  const signup = async (email: string, password: string) => {
    const credential = await createUserWithEmailAndPassword(
      auth,
      email,
      password,
    );
    await sendEmailVerification(credential.user);
    await signOut(auth);
  };

  const logout = async () => {
    await signOut(auth);
  };

  const signInWithGoogle = async () => {
    // Always use signInWithPopup — never signInWithRedirect.
    // signInWithRedirect requires sessionStorage for its "initial state" handshake,
    // which is blocked in Android WebView and Median.co wrapped apps, causing:
    //   "Unable to process request due to missing initial state (sessionStorage inaccessible)"
    //
    // signInWithPopup opens a Chrome Custom Tab (on Android) or Safari sheet (on iOS),
    // which has its own storage context and avoids the sessionStorage restriction entirely.
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      const code = (err as { code?: string }).code ?? "";
      // Normalize codes that can appear in webview environments into a single
      // user-friendly code that the UI already knows how to display.
      if (
        code === "auth/popup-blocked" ||
        code === "auth/operation-not-allowed" ||
        code === "auth/web-storage-unsupported" ||
        code === "auth/internal-error"
      ) {
        const e = new Error("auth/webview-popup-blocked") as Error & {
          code: string;
        };
        e.code = "auth/webview-popup-blocked";
        throw e;
      }
      // Ignore benign user-cancel codes — treat them as a no-op.
      if (
        code === "auth/popup-closed-by-user" ||
        code === "auth/cancelled-popup-request"
      ) {
        return;
      }
      throw err;
    }
  };

  const updateDisplayName = async (name: string) => {
    if (!auth.currentUser) throw new Error("Not signed in");
    await updateProfile(auth.currentUser, { displayName: name });
    setUser({ ...auth.currentUser });
  };

  const resendVerificationEmail = async () => {
    if (!auth.currentUser) throw new Error("Not signed in");
    await sendEmailVerification(auth.currentUser);
  };

  const sendPasswordReset = async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
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

export function useAuthContext(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuthContext must be used within AuthProvider");
  return ctx;
}
