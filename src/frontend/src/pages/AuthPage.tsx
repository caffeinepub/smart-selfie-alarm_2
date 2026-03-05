import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlarmClock, Eye, EyeOff, Loader2 } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { SiGoogle } from "react-icons/si";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

function getFirebaseErrorMessage(code: string): string {
  switch (code) {
    case "auth/user-not-found":
      return "No account found with this email.";
    case "auth/wrong-password":
      return "Incorrect password. Please try again.";
    case "auth/email-already-in-use":
      return "An account with this email already exists.";
    case "auth/weak-password":
      return "Password must be at least 6 characters.";
    case "auth/invalid-email":
      return "Please enter a valid email address.";
    case "auth/invalid-credential":
      return "Invalid email or password.";
    case "auth/too-many-requests":
      return "Too many attempts. Please try again later.";
    case "auth/popup-closed-by-user":
      return "Sign-in was cancelled. Please try again.";
    case "auth/popup-blocked":
      return "Pop-up was blocked. Please allow pop-ups for this site.";
    case "auth/cancelled-popup-request":
      return "Another sign-in is in progress. Please wait.";
    case "auth/network-request-failed":
      return "Network error. Check your connection and try again.";
    case "auth/operation-not-allowed":
      return "Google sign-in is not enabled. Please contact support.";
    case "auth/internal-error":
      return "An internal error occurred. Please try again.";
    default:
      return `Sign-in failed (${code || "unknown error"}). Please try again.`;
  }
}

export default function AuthPage() {
  const navigate = useNavigate();
  const { login, signup, signInWithGoogle } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");
  const [mode, setMode] = useState<"login" | "signup">("login");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (mode === "login") {
        await login(email, password);
      } else {
        await signup(email, password);
      }
      navigate("/home");
    } catch (err: unknown) {
      const code = (err as { code?: string }).code ?? "";
      setError(getFirebaseErrorMessage(code));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setError("");
    setGoogleLoading(true);
    try {
      await signInWithGoogle();
      navigate("/home");
    } catch (err: unknown) {
      const code = (err as { code?: string }).code ?? "";
      setError(getFirebaseErrorMessage(code));
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <div
      className="min-h-screen flex flex-col overflow-hidden"
      style={{ backgroundColor: "#080810" }}
    >
      {/* ── Hero top-half: ambient atmosphere ─────────────────────────── */}
      <div
        className="relative flex flex-col items-center justify-end pb-10 pt-16 flex-shrink-0"
        style={{ minHeight: "42vh" }}
      >
        {/* Deep radial glow — the whole atmosphere */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 90% 80% at 50% 20%, rgba(109,40,217,0.28) 0%, rgba(99,102,241,0.10) 45%, transparent 70%)",
          }}
        />
        {/* Subtle grid / noise texture */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.03]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,.6) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.6) 1px, transparent 1px)",
            backgroundSize: "32px 32px",
          }}
        />

        {/* Brand mark */}
        <motion.div
          initial={{ opacity: 0, scale: 0.75, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          className="relative z-10 flex flex-col items-center gap-5"
        >
          {/* Icon ring */}
          <div className="relative">
            {/* Outer glow ring */}
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

          {/* App name — display font, large */}
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

      {/* ── Form card ─────────────────────────────────────────────────── */}
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
          {/* Mode toggle — pill switcher */}
          <div
            className="flex p-1 rounded-2xl"
            style={{ background: "rgba(255,255,255,0.06)" }}
          >
            {(["login", "signup"] as const).map((m) => (
              <button
                key={m}
                type="button"
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200"
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
            {/* Email field */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="auth-email"
                className="text-xs font-semibold uppercase tracking-wider"
                style={{ color: "#94a3b8", letterSpacing: "0.1em" }}
              >
                Email
              </label>
              <div className="relative">
                <Input
                  id="auth-email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className="w-full h-12 rounded-2xl text-sm text-white placeholder:text-slate-600 border-0 pr-4 pl-4"
                  style={{
                    background: "rgba(255,255,255,0.06)",
                    boxShadow:
                      "0 0 0 1px rgba(255,255,255,0.08), inset 0 2px 4px rgba(0,0,0,0.3)",
                    fontSize: "16px", // prevent iOS zoom
                    outline: "none",
                  }}
                  data-ocid="auth.input"
                />
              </div>
            </div>

            {/* Password field */}
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

            {/* Primary CTA */}
            <Button
              type="submit"
              className="w-full h-13 rounded-2xl font-bold text-base text-white border-0 mt-1"
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

          {/* Google sign-in — solid white button, standard pattern */}
          <button
            type="button"
            className="w-full flex items-center justify-center gap-3 h-12 rounded-2xl font-semibold text-sm transition-all active:scale-[0.98]"
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
