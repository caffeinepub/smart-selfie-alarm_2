import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";
import { AlarmClock, Eye, EyeOff, Loader2, MailCheck } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { useAuthContext } from "../context/AuthContext";

const EMAIL_REGEX = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;

function validateEmail(email: string): string | null {
  if (!email.trim()) return "Email is required.";
  if (!EMAIL_REGEX.test(email.trim()))
    return "Please enter a valid email address.";
  return null;
}

function validatePassword(password: string): string | null {
  if (!password) return "Password is required.";
  if (password.length < 6) return "Password must be at least 6 characters.";
  return null;
}

/**
 * Map error codes to human-readable messages (bilingual: EN + हिंदी).
 */
function getAuthErrorMessage(code: string): string {
  switch (code) {
    case "auth/wrong-password":
      return "Incorrect password. Please try again. / पासवर्ड गलत है।";
    case "auth/user-not-found":
      return "No account found with this email. / इस ईमेल पर कोई अकाउंट नहीं है।";
    case "auth/email-in-use":
      return "This email is already registered. Please sign in. / यह ईमेल पहले से पंजीकृत है।";
    case "auth/email-not-verified":
      return "Please verify your email before signing in. / साइन इन से पहले ईमेल वेरीफाई करें।";
    case "auth/invalid-otp":
      return "Invalid or expired code. Please try again. / कोड गलत है या समय समाप्त हो गया।";
    case "auth/too-many-requests":
      return "Too many attempts. Please wait a few minutes. / कुछ मिनट बाद कोशिश करें।";
    case "auth/otp-send-failed":
      return "Failed to send code. Please try again. / कोड भेजने में विफल।";
    case "auth/otp-verify-failed":
      return "Verification failed. Please try again. / वेरिफिकेशन विफल।";
    case "auth/signup-failed":
      return "Sign up failed. Please try again. / साइन अप विफल।";
    case "auth/signin-failed":
      return "Sign in failed. Please try again. / साइन इन विफल।";
    default:
      return "Something went wrong. Please try again. / कुछ गलत हुआ।";
  }
}

type AuthScreen = "auth" | "otp";
type AuthTab = "signin" | "signup";

export default function AuthPage() {
  const { sendOtp, verifyOtp, signUpWithPassword, signInWithPassword } =
    useAuthContext();

  const [screen, setScreen] = useState<AuthScreen>("auth");
  const [activeTab, setActiveTab] = useState<AuthTab>("signin");

  // Form fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [otp, setOtp] = useState("");

  // Loading states
  const [submitLoading, setSubmitLoading] = useState(false);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);

  // Error display
  const [error, setError] = useState("");

  // ── Sign In handler ─────────────────────────────────────────────────────
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const emailErr = validateEmail(email);
    if (emailErr) {
      setError(emailErr);
      return;
    }
    const passErr = validatePassword(password);
    if (passErr) {
      setError(passErr);
      return;
    }

    setSubmitLoading(true);
    try {
      await signInWithPassword(email.trim(), password);
      // onAuthStateChange fires SIGNED_IN — routing handled by App.tsx
    } catch (err: unknown) {
      const code = (err as { code?: string }).code ?? "";
      // If email not verified, switch to OTP verification flow
      if (code === "auth/email-not-verified") {
        setError("");
        try {
          await sendOtp(email.trim());
          setScreen("otp");
          setOtp("");
        } catch {
          setError(getAuthErrorMessage(code));
        }
      } else {
        setError(getAuthErrorMessage(code));
      }
    } finally {
      setSubmitLoading(false);
    }
  };

  // ── Sign Up handler ─────────────────────────────────────────────────────
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const emailErr = validateEmail(email);
    if (emailErr) {
      setError(emailErr);
      return;
    }
    const passErr = validatePassword(password);
    if (passErr) {
      setError(passErr);
      return;
    }

    setSubmitLoading(true);
    try {
      const { needsOtp } = await signUpWithPassword(email.trim(), password);
      if (needsOtp) {
        setScreen("otp");
        setOtp("");
      }
      // If needsOtp is false, onAuthStateChange fires and App.tsx routes
    } catch (err: unknown) {
      const code = (err as { code?: string }).code ?? "";
      setError(getAuthErrorMessage(code));
    } finally {
      setSubmitLoading(false);
    }
  };

  // ── OTP Verify handler ──────────────────────────────────────────────────
  const handleVerifyOtp = async () => {
    if (otp.length < 6) {
      setError("Please enter the full 6-digit code. / 6 अंकों का कोड दर्ज करें।");
      return;
    }
    setError("");
    setVerifyLoading(true);
    try {
      await verifyOtp(email.trim(), otp);
      // onAuthStateChange fires SIGNED_IN — routing handled by App.tsx
    } catch (err: unknown) {
      const code = (err as { code?: string }).code ?? "";
      setError(getAuthErrorMessage(code));
      setOtp("");
    } finally {
      setVerifyLoading(false);
    }
  };

  // ── OTP Resend handler ──────────────────────────────────────────────────
  const handleResend = async () => {
    setError("");
    setResendLoading(true);
    try {
      await sendOtp(email.trim());
      setOtp("");
    } catch (err: unknown) {
      const code = (err as { code?: string }).code ?? "";
      setError(getAuthErrorMessage(code));
    } finally {
      setResendLoading(false);
    }
  };

  const backToAuth = () => {
    setScreen("auth");
    setError("");
    setOtp("");
  };

  const switchTab = (tab: AuthTab) => {
    setActiveTab(tab);
    setError("");
    setPassword("");
  };

  // ─── Shared page shell ───────────────────────────────────────────────────
  return (
    <div
      className="min-h-screen flex flex-col overflow-hidden"
      style={{ backgroundColor: "#080810" }}
    >
      {/* Hero top-half */}
      <div
        className="relative flex flex-col items-center justify-end pb-10 pt-16 flex-shrink-0"
        style={{ minHeight: "40vh" }}
      >
        {/* Ambient glow */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 90% 80% at 50% 20%, rgba(109,40,217,0.28) 0%, rgba(99,102,241,0.10) 45%, transparent 70%)",
          }}
        />
        {/* Grid overlay */}
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
              className="font-bold tracking-tight leading-none"
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

      {/* Form card (frosted glass) */}
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
          <AnimatePresence mode="wait">
            {/* ── Auth screen (Sign In / Sign Up tabs) ─────────────────────── */}
            {screen === "auth" ? (
              <motion.div
                key="auth-screen"
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }}
                transition={{ duration: 0.25 }}
                className="flex flex-col gap-5 flex-1"
              >
                {/* ── Tab switcher ─────────────────────────────────────────── */}
                <div
                  className="flex rounded-2xl p-1"
                  style={{ background: "rgba(255,255,255,0.05)" }}
                >
                  <button
                    type="button"
                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200"
                    style={{
                      background:
                        activeTab === "signin"
                          ? "linear-gradient(135deg, #7c3aed, #6d28d9)"
                          : "transparent",
                      color: activeTab === "signin" ? "#fff" : "#64748b",
                      boxShadow:
                        activeTab === "signin"
                          ? "0 2px 12px rgba(109,40,217,0.35)"
                          : "none",
                    }}
                    onClick={() => switchTab("signin")}
                    data-ocid="auth.tab"
                  >
                    Sign In
                  </button>
                  <button
                    type="button"
                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200"
                    style={{
                      background:
                        activeTab === "signup"
                          ? "linear-gradient(135deg, #7c3aed, #6d28d9)"
                          : "transparent",
                      color: activeTab === "signup" ? "#fff" : "#64748b",
                      boxShadow:
                        activeTab === "signup"
                          ? "0 2px 12px rgba(109,40,217,0.35)"
                          : "none",
                    }}
                    onClick={() => switchTab("signup")}
                    data-ocid="auth.tab"
                  >
                    Sign Up
                  </button>
                </div>

                {/* ── Sign In form ──────────────────────────────────────────── */}
                <AnimatePresence mode="wait">
                  {activeTab === "signin" ? (
                    <motion.form
                      key="signin-form"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.2 }}
                      onSubmit={handleSignIn}
                      className="flex flex-col gap-4"
                    >
                      <div>
                        <p
                          className="text-sm mb-4"
                          style={{ color: "#64748b" }}
                        >
                          Enter your email and password to continue.
                        </p>
                      </div>

                      {/* Email field */}
                      <div className="flex flex-col gap-1.5">
                        <label
                          htmlFor="signin-email"
                          className="text-xs font-semibold uppercase tracking-wider"
                          style={{ color: "#94a3b8", letterSpacing: "0.1em" }}
                        >
                          Email Address
                        </label>
                        <Input
                          id="signin-email"
                          type="email"
                          inputMode="email"
                          placeholder="you@example.com"
                          value={email}
                          onChange={(e) => {
                            setEmail(e.target.value);
                            setError("");
                          }}
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
                          data-ocid="auth.email_input"
                        />
                      </div>

                      {/* Password field */}
                      <div className="flex flex-col gap-1.5">
                        <label
                          htmlFor="signin-password"
                          className="text-xs font-semibold uppercase tracking-wider"
                          style={{ color: "#94a3b8", letterSpacing: "0.1em" }}
                        >
                          Password
                        </label>
                        <div className="relative">
                          <Input
                            id="signin-password"
                            type={showPassword ? "text" : "password"}
                            placeholder="Your password"
                            value={password}
                            onChange={(e) => {
                              setPassword(e.target.value);
                              setError("");
                            }}
                            required
                            autoComplete="current-password"
                            className="w-full h-12 rounded-2xl text-sm text-white placeholder:text-slate-600 border-0 px-4 pr-12"
                            style={{
                              background: "rgba(255,255,255,0.06)",
                              boxShadow:
                                "0 0 0 1px rgba(255,255,255,0.08), inset 0 2px 4px rgba(0,0,0,0.3)",
                              fontSize: "16px",
                              outline: "none",
                            }}
                            data-ocid="auth.password_input"
                          />
                          <button
                            type="button"
                            className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1"
                            style={{ color: "#64748b" }}
                            onClick={() => setShowPassword((v) => !v)}
                            tabIndex={-1}
                          >
                            {showPassword ? (
                              <EyeOff className="w-4 h-4" />
                            ) : (
                              <Eye className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Error */}
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
                        disabled={submitLoading}
                        data-ocid="auth.submit_button"
                      >
                        {submitLoading ? (
                          <Loader2 className="w-5 h-5 animate-spin mr-2" />
                        ) : null}
                        {submitLoading ? "Signing in…" : "Sign In"}
                      </Button>

                      <p
                        className="text-center text-xs"
                        style={{ color: "#334155" }}
                      >
                        Don't have an account?{" "}
                        <button
                          type="button"
                          className="font-medium hover:opacity-80 transition-opacity"
                          style={{ color: "#a78bfa" }}
                          onClick={() => switchTab("signup")}
                        >
                          Sign up
                        </button>
                      </p>
                    </motion.form>
                  ) : (
                    /* ── Sign Up form ──────────────────────────────────────── */
                    <motion.form
                      key="signup-form"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.2 }}
                      onSubmit={handleSignUp}
                      className="flex flex-col gap-4"
                    >
                      <div>
                        <p
                          className="text-sm mb-4"
                          style={{ color: "#64748b" }}
                        >
                          Create your account. We'll send a verification code.
                        </p>
                      </div>

                      {/* Email field */}
                      <div className="flex flex-col gap-1.5">
                        <label
                          htmlFor="signup-email"
                          className="text-xs font-semibold uppercase tracking-wider"
                          style={{ color: "#94a3b8", letterSpacing: "0.1em" }}
                        >
                          Email Address
                        </label>
                        <Input
                          id="signup-email"
                          type="email"
                          inputMode="email"
                          placeholder="you@example.com"
                          value={email}
                          onChange={(e) => {
                            setEmail(e.target.value);
                            setError("");
                          }}
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
                          data-ocid="auth.email_input"
                        />
                      </div>

                      {/* Password field */}
                      <div className="flex flex-col gap-1.5">
                        <label
                          htmlFor="signup-password"
                          className="text-xs font-semibold uppercase tracking-wider"
                          style={{ color: "#94a3b8", letterSpacing: "0.1em" }}
                        >
                          Password
                        </label>
                        <div className="relative">
                          <Input
                            id="signup-password"
                            type={showPassword ? "text" : "password"}
                            placeholder="Min. 6 characters"
                            value={password}
                            onChange={(e) => {
                              setPassword(e.target.value);
                              setError("");
                            }}
                            required
                            autoComplete="new-password"
                            minLength={6}
                            className="w-full h-12 rounded-2xl text-sm text-white placeholder:text-slate-600 border-0 px-4 pr-12"
                            style={{
                              background: "rgba(255,255,255,0.06)",
                              boxShadow:
                                "0 0 0 1px rgba(255,255,255,0.08), inset 0 2px 4px rgba(0,0,0,0.3)",
                              fontSize: "16px",
                              outline: "none",
                            }}
                            data-ocid="auth.password_input"
                          />
                          <button
                            type="button"
                            className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1"
                            style={{ color: "#64748b" }}
                            onClick={() => setShowPassword((v) => !v)}
                            tabIndex={-1}
                          >
                            {showPassword ? (
                              <EyeOff className="w-4 h-4" />
                            ) : (
                              <Eye className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                        <p className="text-xs" style={{ color: "#475569" }}>
                          At least 6 characters
                        </p>
                      </div>

                      {/* Error */}
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
                        disabled={submitLoading}
                        data-ocid="auth.submit_button"
                      >
                        {submitLoading ? (
                          <Loader2 className="w-5 h-5 animate-spin mr-2" />
                        ) : null}
                        {submitLoading ? "Creating account…" : "Create Account"}
                      </Button>

                      <p
                        className="text-center text-xs"
                        style={{ color: "#334155" }}
                      >
                        Already have an account?{" "}
                        <button
                          type="button"
                          className="font-medium hover:opacity-80 transition-opacity"
                          style={{ color: "#a78bfa" }}
                          onClick={() => switchTab("signin")}
                        >
                          Sign in
                        </button>
                      </p>
                    </motion.form>
                  )}
                </AnimatePresence>

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
              </motion.div>
            ) : (
              /* ── OTP screen ──────────────────────────────────────────────── */
              <motion.div
                key="otp-screen"
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 16 }}
                transition={{ duration: 0.25 }}
                className="flex flex-col gap-5 flex-1"
              >
                {/* Heading */}
                <div className="flex flex-col items-center text-center gap-3 mb-1">
                  <div
                    className="w-14 h-14 rounded-[18px] flex items-center justify-center"
                    style={{
                      background: "linear-gradient(145deg, #8b5cf6, #4f46e5)",
                      boxShadow: "0 6px 24px rgba(109,40,217,0.45)",
                    }}
                  >
                    <MailCheck
                      className="w-7 h-7 text-white"
                      strokeWidth={1.5}
                    />
                  </div>
                  <div>
                    <h2
                      className="text-xl font-bold text-white mb-1"
                      style={{ letterSpacing: "-0.02em" }}
                    >
                      Check your inbox
                    </h2>
                    <p className="text-sm" style={{ color: "#94a3b8" }}>
                      We sent a 6-digit verification code to{" "}
                      <span className="text-violet-400 font-medium">
                        {email}
                      </span>
                    </p>
                    <p className="text-xs mt-1" style={{ color: "#475569" }}>
                      {email} पर 6 अंकों का कोड भेजा गया।
                    </p>
                  </div>
                </div>

                {/* OTP input */}
                <div
                  className="flex flex-col items-center gap-4"
                  data-ocid="auth.otp_input"
                >
                  <InputOTP
                    maxLength={6}
                    value={otp}
                    onChange={(value) => {
                      setOtp(value);
                      setError("");
                    }}
                    containerClassName="gap-3"
                  >
                    <InputOTPGroup className="gap-3">
                      {[0, 1, 2, 3, 4, 5].map((i) => (
                        <InputOTPSlot
                          key={i}
                          index={i}
                          className="w-11 h-14 text-lg font-bold text-white rounded-xl border-0"
                          style={{
                            background: "rgba(255,255,255,0.07)",
                            boxShadow: otp[i]
                              ? "0 0 0 2px rgba(139,92,246,0.7), inset 0 2px 4px rgba(0,0,0,0.3)"
                              : "0 0 0 1px rgba(255,255,255,0.1), inset 0 2px 4px rgba(0,0,0,0.3)",
                          }}
                        />
                      ))}
                    </InputOTPGroup>
                  </InputOTP>
                </div>

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

                {/* Verify button */}
                <Button
                  type="button"
                  className="w-full rounded-2xl font-bold text-base text-white border-0 min-h-[52px]"
                  style={{
                    height: "52px",
                    background:
                      "linear-gradient(135deg, #7c3aed 0%, #6d28d9 50%, #4f46e5 100%)",
                    boxShadow:
                      "0 4px 24px rgba(109,40,217,0.45), 0 1px 0 rgba(255,255,255,0.12) inset",
                    fontSize: "15px",
                    letterSpacing: "-0.01em",
                    opacity: otp.length < 6 ? 0.65 : 1,
                  }}
                  onClick={handleVerifyOtp}
                  disabled={verifyLoading || otp.length < 6}
                  data-ocid="auth.verify_button"
                >
                  {verifyLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  ) : null}
                  {verifyLoading ? "Verifying…" : "Verify Code"}
                </Button>

                {/* Resend + Back row */}
                <div className="flex items-center justify-between mt-1">
                  <button
                    type="button"
                    className="text-sm min-h-[44px] px-2"
                    style={{ color: "#475569" }}
                    onClick={backToAuth}
                    data-ocid="auth.back_link"
                  >
                    ← Back
                  </button>

                  <button
                    type="button"
                    className="flex items-center gap-1.5 text-sm font-medium min-h-[44px] px-2 rounded-xl transition-all hover:opacity-80 disabled:opacity-50"
                    style={{ color: "#a78bfa" }}
                    onClick={handleResend}
                    disabled={resendLoading}
                    data-ocid="auth.resend_button"
                  >
                    {resendLoading ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : null}
                    {resendLoading ? "Sending…" : "Resend code"}
                  </button>
                </div>

                <p className="text-center text-xs" style={{ color: "#334155" }}>
                  Didn't receive it? Check your spam folder.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
