import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlarmClock,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  MailCheck,
  RefreshCw,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { SiGoogle } from "react-icons/si";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { isInWebView } from "../lib/webview";

const EMAIL_REGEX = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;

function validateEmail(email: string): string | null {
  if (!email.trim()) return "Email is required. / ईमेल आवश्यक है।";
  if (!EMAIL_REGEX.test(email.trim()))
    return "Please enter a valid email address. / मान्य ईमेल दर्ज करें।";
  return null;
}

function getFirebaseErrorMessage(code: string): string {
  switch (code) {
    case "auth/user-not-found":
      return "No account found with this email. / इस ईमेल से कोई खाता नहीं मिला।";
    case "auth/wrong-password":
      return "Incorrect password. Please try again. / गलत पासवर्ड।";
    case "auth/email-already-in-use":
      return "This email is already registered. / यह ईमेल पहले से रजिस्टर है।";
    case "auth/weak-password":
      return "Password must be at least 6 characters. / पासवर्ड कम से कम 6 अक्षर का हो।";
    case "auth/invalid-email":
      return "Please enter a valid email address. / मान्य ईमेल दर्ज करें।";
    case "auth/invalid-credential":
      return "Invalid email or password. / ईमेल या पासवर्ड गलत है।";
    case "auth/too-many-requests":
      return "Too many attempts. Please wait a few minutes. / कुछ मिनट बाद कोशिश करें।";
    case "auth/popup-closed-by-user":
      return "Login canceled. / लॉगिन रद्द किया।";
    case "auth/popup-blocked":
      return "Pop-up was blocked. Please allow pop-ups for this site. / पॉप-अप ब्लॉक है।";
    case "auth/cancelled-popup-request":
      return "Please try again. / दोबारा कोशिश करें।";
    case "auth/network-request-failed":
      return "Check your internet connection. / इंटरनेट जांचें।";
    case "auth/webview-popup-blocked":
      return "Sign-in couldn't open. Please try on a browser. / ब्राउज़र में खोलें।";
    case "auth/operation-not-allowed":
      return "This sign-in method is not enabled. / यह साइन-इन तरीका उपलब्ध नहीं।";
    case "auth/internal-error":
      return "An internal error occurred. Please try again. / आंतरिक त्रुटि।";
    case "auth/email-not-verified":
      return "";
    default:
      return `Sign-in failed (${code || "unknown error"}). / साइन-इन विफल।`;
  }
}

type AuthScreen =
  | "main"
  | "verification_sent"
  | "unverified_email"
  | "email_in_use"
  | "forgot_password"
  | "forgot_password_sent"
  | "webview_confirm";

export default function AuthPage() {
  const navigate = useNavigate();
  const {
    login,
    signup,
    signInWithGoogle,
    resendVerificationEmail,
    sendPasswordReset,
  } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [screen, setScreen] = useState<AuthScreen>("main");
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetLoading, setResetLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const emailErr = validateEmail(email);
    if (emailErr) {
      setError(emailErr);
      return;
    }
    setLoading(true);
    try {
      if (mode === "login") {
        await login(email, password);
        navigate("/home");
      } else {
        await signup(email, password);
        setScreen("verification_sent");
      }
    } catch (err: unknown) {
      const code = (err as { code?: string }).code ?? "";
      if (code === "auth/email-not-verified") {
        setScreen("unverified_email");
      } else if (code === "auth/email-already-in-use") {
        setScreen("email_in_use");
      } else {
        setError(getFirebaseErrorMessage(code));
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    if (isInWebView()) {
      setScreen("webview_confirm");
      return;
    }
    await doGoogleSignIn();
  };

  const doGoogleSignIn = async () => {
    setError("");
    setGoogleLoading(true);
    try {
      await signInWithGoogle();
      navigate("/home");
    } catch (err: unknown) {
      const code = (err as { code?: string }).code ?? "";
      setError(getFirebaseErrorMessage(code));
      setScreen("main");
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleResend = async () => {
    setResendLoading(true);
    setResendSuccess(false);
    try {
      await resendVerificationEmail();
      setResendSuccess(true);
    } catch {
      setError("Please sign in again to resend. / फिर से साइन इन करें।");
      setScreen("main");
    } finally {
      setResendLoading(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    const emailErr = validateEmail(resetEmail);
    if (emailErr) {
      setError(emailErr);
      return;
    }
    setResetLoading(true);
    setError("");
    try {
      await sendPasswordReset(resetEmail);
      setScreen("forgot_password_sent");
    } catch (err: unknown) {
      const code = (err as { code?: string }).code ?? "";
      setError(getFirebaseErrorMessage(code));
    } finally {
      setResetLoading(false);
    }
  };

  const backToMain = () => {
    setScreen("main");
    setError("");
    setResendSuccess(false);
  };

  // ── Webview confirm screen ─────────────────────────────────────────────
  if (screen === "webview_confirm") {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center px-6 gap-6"
        style={{ backgroundColor: "#080810" }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col items-center gap-5 text-center max-w-sm w-full"
        >
          <div
            className="w-20 h-20 rounded-[24px] flex items-center justify-center"
            style={{
              background: "linear-gradient(145deg, #8b5cf6, #4f46e5)",
              boxShadow: "0 8px 32px rgba(109,40,217,0.5)",
            }}
          >
            <AlarmClock className="w-10 h-10 text-white" strokeWidth={1.5} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white mb-2">
              Open browser to sign in?
            </h2>
            <p className="text-sm leading-relaxed" style={{ color: "#94a3b8" }}>
              We will open your browser to complete sign-in. Continue?
            </p>
            <p className="text-xs mt-1" style={{ color: "#475569" }}>
              ब्राउज़र में खुलेगा। जारी रखें?
            </p>
          </div>
          <div className="flex flex-col gap-3 w-full">
            <Button
              className="w-full h-12 rounded-2xl font-bold text-white border-0"
              style={{
                background: "linear-gradient(135deg, #7c3aed, #4f46e5)",
                boxShadow: "0 4px 24px rgba(109,40,217,0.4)",
              }}
              onClick={doGoogleSignIn}
              disabled={googleLoading}
              data-ocid="auth.webview_confirm_button"
            >
              {googleLoading ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              Continue / जारी रखें
            </Button>
            <Button
              variant="ghost"
              className="w-full h-11 rounded-2xl font-medium text-slate-400"
              onClick={backToMain}
              data-ocid="auth.cancel_button"
            >
              Cancel / रद्द करें
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  // ── Verification sent screen ────────────────────────────────────────────
  if (screen === "verification_sent") {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center px-6 gap-6"
        style={{ backgroundColor: "#080810" }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col items-center gap-5 text-center max-w-sm"
        >
          <div
            className="w-20 h-20 rounded-[24px] flex items-center justify-center"
            style={{
              background: "linear-gradient(145deg, #8b5cf6, #4f46e5)",
              boxShadow: "0 8px 32px rgba(109,40,217,0.5)",
            }}
          >
            <MailCheck className="w-10 h-10 text-white" strokeWidth={1.5} />
          </div>
          <div>
            <h2
              className="text-2xl font-bold text-white mb-2"
              style={{ letterSpacing: "-0.03em" }}
            >
              Check your inbox
            </h2>
            <p className="text-sm leading-relaxed" style={{ color: "#94a3b8" }}>
              Verification code sent to{" "}
              <span className="text-violet-400 font-medium">{email}</span>.
              Enter the code to activate your account.
            </p>
            <p className="text-xs mt-1.5" style={{ color: "#6d5fa0" }}>
              {email} पर कोड भेजा गया। कोड दर्ज करें।
            </p>
            <p
              className="text-xs mt-3 leading-relaxed"
              style={{ color: "#475569" }}
            >
              Didn't receive it? Check your spam folder. The link expires in 24
              hours.
            </p>
          </div>
          <Button
            className="w-full h-12 rounded-2xl font-bold text-white border-0"
            style={{
              background: "linear-gradient(135deg, #7c3aed, #4f46e5)",
              boxShadow: "0 4px 24px rgba(109,40,217,0.4)",
            }}
            onClick={() => {
              setScreen("main");
              setMode("login");
              setPassword("");
            }}
            data-ocid="auth.submit_button"
          >
            Go to Sign In
          </Button>
        </motion.div>
      </div>
    );
  }

  // ── Unverified email screen ─────────────────────────────────────────────
  if (screen === "unverified_email") {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center px-6 gap-6"
        style={{ backgroundColor: "#080810" }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col items-center gap-5 text-center max-w-sm"
        >
          <div
            className="w-20 h-20 rounded-[24px] flex items-center justify-center"
            style={{
              background: "linear-gradient(145deg, #f59e0b, #d97706)",
              boxShadow: "0 8px 32px rgba(245,158,11,0.4)",
            }}
          >
            <MailCheck className="w-10 h-10 text-white" strokeWidth={1.5} />
          </div>
          <div>
            <h2
              className="text-2xl font-bold text-white mb-2"
              style={{ letterSpacing: "-0.03em" }}
            >
              Verify your email first
            </h2>
            <p className="text-sm leading-relaxed" style={{ color: "#94a3b8" }}>
              Please verify your email first. Resend verification?
            </p>
            <p className="text-xs mt-1" style={{ color: "#6d5fa0" }}>
              पहले ईमेल वेरिफाई करें। रीसेंड करें?
            </p>
          </div>
          {error && (
            <div
              className="w-full flex items-start gap-2.5 px-4 py-3 rounded-2xl text-sm"
              style={{
                background: "rgba(239,68,68,0.08)",
                border: "1px solid rgba(239,68,68,0.2)",
                color: "#fca5a5",
              }}
              data-ocid="auth.error_state"
            >
              <span className="mt-0.5 flex-shrink-0">⚠</span>
              {error}
            </div>
          )}
          {resendSuccess && (
            <div
              className="w-full flex items-start gap-2.5 px-4 py-3 rounded-2xl text-sm"
              style={{
                background: "rgba(34,197,94,0.08)",
                border: "1px solid rgba(34,197,94,0.2)",
                color: "#86efac",
              }}
              data-ocid="auth.success_state"
            >
              <span className="mt-0.5 flex-shrink-0">✓</span>
              Verification resent. / वेरिफिकेशन रीसेंड किया।
            </div>
          )}
          <div className="flex flex-col gap-3 w-full">
            <Button
              className="w-full h-12 rounded-2xl font-semibold text-white border-0 flex items-center justify-center gap-2"
              style={{
                background: "rgba(255,255,255,0.07)",
                boxShadow: "0 0 0 1px rgba(255,255,255,0.1)",
              }}
              onClick={handleResend}
              disabled={resendLoading}
              data-ocid="auth.secondary_button"
            >
              {resendLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              {resendLoading ? "Sending…" : "Resend verification email"}
            </Button>
            <Button
              className="w-full h-12 rounded-2xl font-bold text-white border-0"
              style={{
                background: "linear-gradient(135deg, #7c3aed, #4f46e5)",
                boxShadow: "0 4px 24px rgba(109,40,217,0.4)",
              }}
              onClick={backToMain}
              data-ocid="auth.submit_button"
            >
              Back to Sign In
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  // ── Email already in use screen ─────────────────────────────────────────
  if (screen === "email_in_use") {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center px-6 gap-6"
        style={{ backgroundColor: "#080810" }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col items-center gap-5 text-center max-w-sm w-full"
        >
          <div
            className="w-20 h-20 rounded-[24px] flex items-center justify-center"
            style={{
              background: "linear-gradient(145deg, #6366f1, #4f46e5)",
              boxShadow: "0 8px 32px rgba(99,102,241,0.4)",
            }}
          >
            <MailCheck className="w-10 h-10 text-white" strokeWidth={1.5} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white mb-2">
              Email already registered
            </h2>
            <p className="text-sm leading-relaxed" style={{ color: "#94a3b8" }}>
              This email is already registered. If it's your email, Sign In or
              Reset password. Resend verification?
            </p>
            <p className="text-xs mt-1" style={{ color: "#6d5fa0" }}>
              यह ईमेल पहले से रजिस्टर है।
            </p>
          </div>
          <div className="flex flex-col gap-3 w-full">
            <Button
              className="w-full h-12 rounded-2xl font-bold text-white border-0"
              style={{
                background: "linear-gradient(135deg, #7c3aed, #4f46e5)",
                boxShadow: "0 4px 24px rgba(109,40,217,0.4)",
              }}
              onClick={() => {
                setScreen("main");
                setMode("login");
                setError("");
              }}
              data-ocid="auth.signin_button"
            >
              Sign In
            </Button>
            <Button
              className="w-full h-11 rounded-2xl font-medium text-white border-0 flex items-center justify-center gap-2"
              style={{
                background: "rgba(255,255,255,0.07)",
                boxShadow: "0 0 0 1px rgba(255,255,255,0.1)",
              }}
              onClick={() => {
                setResetEmail(email);
                setScreen("forgot_password");
                setError("");
              }}
              data-ocid="auth.reset_button"
            >
              <KeyRound className="w-4 h-4" />
              Reset Password
            </Button>
            <Button
              className="w-full h-11 rounded-2xl font-medium text-white border-0 flex items-center justify-center gap-2"
              style={{
                background: "rgba(255,255,255,0.05)",
                boxShadow: "0 0 0 1px rgba(255,255,255,0.08)",
              }}
              onClick={backToMain}
              data-ocid="auth.cancel_button"
            >
              Use Different Email
            </Button>
          </div>
        </motion.div>
      </div>
    );
  }

  // ── Forgot password screens ─────────────────────────────────────────────
  if (screen === "forgot_password_sent") {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center px-6 gap-6"
        style={{ backgroundColor: "#080810" }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="flex flex-col items-center gap-5 text-center max-w-sm"
        >
          <div
            className="w-20 h-20 rounded-[24px] flex items-center justify-center"
            style={{
              background: "linear-gradient(145deg, #10b981, #059669)",
              boxShadow: "0 8px 32px rgba(16,185,129,0.4)",
            }}
          >
            <MailCheck className="w-10 h-10 text-white" strokeWidth={1.5} />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">
              Reset email sent
            </h2>
            <p className="text-sm leading-relaxed" style={{ color: "#94a3b8" }}>
              Password reset email sent. Check your inbox.
            </p>
            <p className="text-xs mt-1" style={{ color: "#6d5fa0" }}>
              रीसेट लिंक भेजा गया। इनबॉक्स चेक करें।
            </p>
          </div>
          <Button
            className="w-full h-12 rounded-2xl font-bold text-white border-0"
            style={{
              background: "linear-gradient(135deg, #7c3aed, #4f46e5)",
              boxShadow: "0 4px 24px rgba(109,40,217,0.4)",
            }}
            onClick={backToMain}
            data-ocid="auth.submit_button"
          >
            Back to Sign In
          </Button>
        </motion.div>
      </div>
    );
  }

  if (screen === "forgot_password") {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center px-6 gap-6"
        style={{ backgroundColor: "#080810" }}
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex flex-col gap-5 max-w-sm w-full"
        >
          <div className="text-center">
            <div
              className="w-16 h-16 rounded-[20px] flex items-center justify-center mx-auto mb-4"
              style={{
                background: "linear-gradient(145deg, #7c3aed, #4f46e5)",
                boxShadow: "0 6px 24px rgba(109,40,217,0.4)",
              }}
            >
              <KeyRound className="w-8 h-8 text-white" strokeWidth={1.5} />
            </div>
            <h2 className="text-2xl font-bold text-white mb-1">
              Reset Password
            </h2>
            <p className="text-sm" style={{ color: "#64748b" }}>
              Enter your email to receive a reset link. / रीसेट लिंक के लिए ईमेल दर्ज
              करें।
            </p>
          </div>
          <form onSubmit={handlePasswordReset} className="flex flex-col gap-4">
            <Input
              type="email"
              inputMode="email"
              placeholder="you@example.com"
              value={resetEmail}
              onChange={(e) => setResetEmail(e.target.value)}
              required
              autoComplete="email"
              className="w-full h-12 rounded-2xl text-sm text-white placeholder:text-slate-600 border-0 px-4"
              style={{
                background: "rgba(255,255,255,0.06)",
                boxShadow:
                  "0 0 0 1px rgba(255,255,255,0.08), inset 0 2px 4px rgba(0,0,0,0.3)",
                fontSize: "16px",
              }}
              data-ocid="auth.reset_input"
            />
            {error && (
              <div
                className="flex items-start gap-2.5 px-4 py-3 rounded-2xl text-sm"
                style={{
                  background: "rgba(239,68,68,0.08)",
                  border: "1px solid rgba(239,68,68,0.2)",
                  color: "#fca5a5",
                }}
                data-ocid="auth.error_state"
              >
                <span className="mt-0.5 flex-shrink-0">⚠</span>
                {error}
              </div>
            )}
            <Button
              type="submit"
              className="w-full h-12 rounded-2xl font-bold text-white border-0"
              style={{
                background: "linear-gradient(135deg, #7c3aed, #4f46e5)",
                boxShadow: "0 4px 24px rgba(109,40,217,0.4)",
              }}
              disabled={resetLoading}
              data-ocid="auth.reset_submit_button"
            >
              {resetLoading ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : null}
              {resetLoading ? "Sending…" : "Send Reset Link"}
            </Button>
          </form>
          <button
            type="button"
            className="text-sm text-center min-h-[44px]"
            style={{ color: "#475569" }}
            onClick={backToMain}
            data-ocid="auth.back_link"
          >
            ← Back to Sign In
          </button>
        </motion.div>
      </div>
    );
  }

  // ── Main auth form ──────────────────────────────────────────────────────
  return (
    <div
      className="min-h-screen flex flex-col overflow-hidden"
      style={{ backgroundColor: "#080810" }}
    >
      {/* Hero top-half */}
      <div
        className="relative flex flex-col items-center justify-end pb-10 pt-16 flex-shrink-0"
        style={{ minHeight: "42vh" }}
      >
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 90% 80% at 50% 20%, rgba(109,40,217,0.28) 0%, rgba(99,102,241,0.10) 45%, transparent 70%)",
          }}
        />
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.03]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.6) 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />
        <motion.div
          initial={{ opacity: 0, scale: 0.75, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="relative z-10 flex flex-col items-center gap-5"
        >
          <div className="relative">
            <div
              className="absolute inset-0 rounded-[28px] opacity-40 blur-xl"
              style={{
                background: "linear-gradient(135deg, #7c3aed, #6366f1)",
                transform: "scale(1.3)",
              }}
            />
            <div
              className="relative w-20 h-20 rounded-[24px] flex items-center justify-center"
              style={{
                background:
                  "linear-gradient(145deg, #8b5cf6 0%, #6d28d9 50%, #4f46e5 100%)",
                boxShadow:
                  "0 0 0 1px rgba(139,92,246,0.3), 0 8px 32px rgba(109,40,217,0.5), inset 0 1px 0 rgba(255,255,255,0.15)",
              }}
            >
              <AlarmClock className="w-10 h-10 text-white" strokeWidth={1.5} />
            </div>
          </div>
          <div className="text-center">
            <h1
              className="font-display font-bold tracking-tight leading-none"
              style={{
                fontSize: "clamp(28px, 7vw, 38px)",
                background:
                  "linear-gradient(160deg, #ffffff 0%, #c4b5fd 55%, #a78bfa 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                letterSpacing: "-0.03em",
              }}
            >
              Smart Selfie Alarm
            </h1>
            <p
              className="text-sm font-medium mt-1.5 tracking-widest uppercase"
              style={{ color: "#7c6fcd", letterSpacing: "0.18em" }}
            >
              AI Wake-Up Verification
            </p>
          </div>
        </motion.div>
      </div>

      {/* Form card */}
      <motion.div
        initial={{ opacity: 0, y: 32 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
        className="flex-1 flex flex-col"
        style={{
          background:
            "linear-gradient(180deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.025) 100%)",
          borderTop: "1px solid rgba(255,255,255,0.09)",
          borderRadius: "28px 28px 0 0",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
        }}
      >
        <div className="px-6 pt-7 pb-8 w-full max-w-md mx-auto flex flex-col gap-5 flex-1">
          {/* Mode toggle */}
          <div
            className="flex p-1 rounded-2xl"
            style={{ background: "rgba(255,255,255,0.06)" }}
          >
            {(["login", "signup"] as const).map((m) => (
              <button
                key={m}
                type="button"
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 min-h-[44px]"
                style={
                  mode === m
                    ? {
                        background: "linear-gradient(135deg, #7c3aed, #6366f1)",
                        color: "#ffffff",
                        boxShadow:
                          "0 2px 12px rgba(109,40,217,0.4), inset 0 1px 0 rgba(255,255,255,0.1)",
                      }
                    : { color: "#64748b" }
                }
                onClick={() => {
                  setMode(m);
                  setError("");
                }}
                data-ocid="auth.tab"
              >
                {m === "login" ? "Sign In" : "Create Account"}
              </button>
            ))}
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="auth-email"
                className="text-xs font-semibold uppercase tracking-wider"
                style={{ color: "#94a3b8", letterSpacing: "0.1em" }}
              >
                Email
              </label>
              <Input
                id="auth-email"
                type="email"
                inputMode="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full h-12 rounded-2xl text-sm text-white placeholder:text-slate-600 border-0 px-4"
                style={{
                  background: "rgba(255,255,255,0.06)",
                  boxShadow:
                    "0 0 0 1px rgba(255,255,255,0.08), inset 0 2px 4px rgba(0,0,0,0.3)",
                  fontSize: "16px",
                  outline: "none",
                }}
                data-ocid="auth.input"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="auth-password"
                className="text-xs font-semibold uppercase tracking-wider"
                style={{ color: "#94a3b8", letterSpacing: "0.1em" }}
              >
                Password
              </label>
              <div className="relative">
                <Input
                  id="auth-password"
                  type={showPassword ? "text" : "password"}
                  placeholder={
                    mode === "signup" ? "Min. 6 characters" : "••••••••"
                  }
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete={
                    mode === "login" ? "current-password" : "new-password"
                  }
                  className="w-full h-12 rounded-2xl text-sm text-white placeholder:text-slate-600 border-0 pl-4 pr-12"
                  style={{
                    background: "rgba(255,255,255,0.06)",
                    boxShadow:
                      "0 0 0 1px rgba(255,255,255,0.08), inset 0 2px 4px rgba(0,0,0,0.3)",
                    fontSize: "16px",
                    outline: "none",
                  }}
                  data-ocid="auth.input"
                />
                <button
                  type="button"
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center rounded-lg transition-colors hover:bg-white/10"
                  onClick={() => setShowPassword((v) => !v)}
                  tabIndex={-1}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" style={{ color: "#475569" }} />
                  ) : (
                    <Eye className="w-4 h-4" style={{ color: "#475569" }} />
                  )}
                </button>
              </div>
              {/* Forgot password link — only on login */}
              <AnimatePresence>
                {mode === "login" && (
                  <motion.button
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    type="button"
                    className="text-xs text-right mt-0.5 min-h-[28px]"
                    style={{ color: "#7c6fcd" }}
                    onClick={() => {
                      setResetEmail(email);
                      setScreen("forgot_password");
                      setError("");
                    }}
                    data-ocid="auth.forgot_password_link"
                  >
                    Forgot password? / पासवर्ड भूल गए?
                  </motion.button>
                )}
              </AnimatePresence>
            </div>

            {mode === "signup" && (
              <p className="text-xs" style={{ color: "#475569" }}>
                After signing up, we'll send a verification link to your email.
                You must confirm it before you can sign in.
              </p>
            )}

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-start gap-2.5 px-4 py-3 rounded-2xl text-sm"
                style={{
                  background: "rgba(239,68,68,0.08)",
                  border: "1px solid rgba(239,68,68,0.2)",
                  color: "#fca5a5",
                }}
                data-ocid="auth.error_state"
              >
                <span className="mt-0.5 flex-shrink-0">⚠</span>
                {error}
              </motion.div>
            )}

            <Button
              type="submit"
              className="w-full rounded-2xl font-bold text-base text-white border-0 mt-1 min-h-[52px]"
              style={{
                height: "52px",
                background:
                  "linear-gradient(135deg, #7c3aed 0%, #6d28d9 50%, #4f46e5 100%)",
                boxShadow:
                  "0 4px 24px rgba(109,40,217,0.45), 0 1px 0 rgba(255,255,255,0.12) inset",
                fontSize: "15px",
                letterSpacing: "-0.01em",
              }}
              disabled={loading}
              data-ocid="auth.submit_button"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
              ) : null}
              {loading
                ? mode === "login"
                  ? "Signing in…"
                  : "Creating account…"
                : mode === "login"
                  ? "Sign In"
                  : "Create Account"}
            </Button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div
              className="flex-1 h-px"
              style={{ background: "rgba(255,255,255,0.07)" }}
            />
            <span
              className="text-xs font-medium"
              style={{ color: "#334155", letterSpacing: "0.05em" }}
            >
              or
            </span>
            <div
              className="flex-1 h-px"
              style={{ background: "rgba(255,255,255,0.07)" }}
            />
          </div>

          {/* Google sign-in */}
          <button
            type="button"
            className="w-full flex items-center justify-center gap-3 h-12 rounded-2xl font-semibold text-sm transition-all active:scale-[0.98] min-h-[48px]"
            style={{
              background: "rgba(255,255,255,0.93)",
              color: "#1e1e2e",
              boxShadow:
                "0 2px 8px rgba(0,0,0,0.3), 0 1px 0 rgba(255,255,255,0.6) inset",
              border: "none",
              fontSize: "14px",
              letterSpacing: "-0.01em",
            }}
            onClick={handleGoogle}
            disabled={googleLoading}
            data-ocid="auth.google_button"
          >
            {googleLoading ? (
              <Loader2
                className="w-4 h-4 animate-spin"
                style={{ color: "#6d28d9" }}
              />
            ) : (
              <SiGoogle className="w-4 h-4" style={{ color: "#ea4335" }} />
            )}
            {googleLoading ? "Connecting…" : "Continue with Google"}
          </button>

          {/* Footer */}
          <p
            className="text-center text-xs mt-auto pt-2"
            style={{ color: "#1e293b" }}
          >
            © {new Date().getFullYear()}. Built with ♥ using{" "}
            <a
              href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(typeof window !== "undefined" ? window.location.hostname : "")}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "#5b21b6" }}
            >
              caffeine.ai
            </a>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
