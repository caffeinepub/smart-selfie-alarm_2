import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
      return "Pop-up was blocked by your browser. Please allow pop-ups for this site.";
    case "auth/cancelled-popup-request":
      return "Another sign-in is in progress. Please wait.";
    case "auth/network-request-failed":
      return "Network error. Please check your connection and try again.";
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
  const [activeTab, setActiveTab] = useState<"login" | "signup">("login");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (activeTab === "login") {
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
      className="min-h-screen flex items-center justify-center p-4 bg-mesh"
      style={{ backgroundColor: "#0a0a0f" }}
    >
      {/* Radial glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 60% 50% at 50% 0%, rgba(124,58,237,0.12) 0%, transparent 70%)",
        }}
      />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-md relative z-10"
      >
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div
              className="w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{
                background: "linear-gradient(135deg, #7c3aed, #6366f1)",
                boxShadow: "0 0 32px rgba(124, 58, 237, 0.5)",
              }}
            >
              <AlarmClock className="w-8 h-8 text-white" />
            </div>
          </div>
          <h1 className="text-2xl font-bold text-white">Smart Selfie Alarm</h1>
          <p className="text-sm mt-1" style={{ color: "#94a3b8" }}>
            AI-powered wake-up verification
          </p>
        </div>

        {/* Card */}
        <div
          className="glass-card p-6"
          style={{ borderColor: "rgba(124, 58, 237, 0.15)" }}
        >
          <Tabs
            value={activeTab}
            onValueChange={(v) => {
              setActiveTab(v as "login" | "signup");
              setError("");
            }}
          >
            <TabsList
              className="w-full mb-6 p-1 rounded-xl"
              style={{ background: "rgba(255,255,255,0.06)" }}
            >
              <TabsTrigger
                value="login"
                className="flex-1 rounded-lg text-sm font-medium data-[state=active]:text-white"
                style={{
                  color: "#94a3b8",
                }}
                data-ocid="auth.tab"
              >
                Sign In
              </TabsTrigger>
              <TabsTrigger
                value="signup"
                className="flex-1 rounded-lg text-sm font-medium data-[state=active]:text-white"
                style={{ color: "#94a3b8" }}
                data-ocid="auth.tab"
              >
                Create Account
              </TabsTrigger>
            </TabsList>

            <TabsContent value="login" className="mt-0">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label
                    htmlFor="login-email"
                    className="block text-sm font-medium mb-1.5"
                    style={{ color: "#e2e8f0" }}
                  >
                    Email
                  </label>
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    className="rounded-xl border-white/10 bg-white/5 text-white placeholder:text-slate-500 focus:border-violet-500 focus:ring-violet-500/20"
                    data-ocid="auth.input"
                  />
                </div>
                <div>
                  <label
                    htmlFor="login-password"
                    className="block text-sm font-medium mb-1.5"
                    style={{ color: "#e2e8f0" }}
                  >
                    Password
                  </label>
                  <div className="relative">
                    <Input
                      id="login-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      autoComplete="current-password"
                      className="rounded-xl border-white/10 bg-white/5 text-white placeholder:text-slate-500 pr-10 focus:border-violet-500"
                      data-ocid="auth.input"
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2"
                      onClick={() => setShowPassword(!showPassword)}
                      style={{ color: "#64748b" }}
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {error && (
                  <div
                    className="p-3 rounded-xl text-sm"
                    style={{
                      background: "rgba(239, 68, 68, 0.1)",
                      border: "1px solid rgba(239, 68, 68, 0.2)",
                      color: "#fca5a5",
                    }}
                    data-ocid="auth.error_state"
                  >
                    {error}
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full rounded-xl font-semibold btn-neon h-11"
                  disabled={loading}
                  data-ocid="auth.submit_button"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : null}
                  {loading ? "Signing in..." : "Sign In"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup" className="mt-0">
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label
                    htmlFor="signup-email"
                    className="block text-sm font-medium mb-1.5"
                    style={{ color: "#e2e8f0" }}
                  >
                    Email
                  </label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    className="rounded-xl border-white/10 bg-white/5 text-white placeholder:text-slate-500 focus:border-violet-500"
                    data-ocid="auth.input"
                  />
                </div>
                <div>
                  <label
                    htmlFor="signup-password"
                    className="block text-sm font-medium mb-1.5"
                    style={{ color: "#e2e8f0" }}
                  >
                    Password
                  </label>
                  <div className="relative">
                    <Input
                      id="signup-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Min. 6 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      autoComplete="new-password"
                      className="rounded-xl border-white/10 bg-white/5 text-white placeholder:text-slate-500 pr-10 focus:border-violet-500"
                      data-ocid="auth.input"
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2"
                      onClick={() => setShowPassword(!showPassword)}
                      style={{ color: "#64748b" }}
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {error && (
                  <div
                    className="p-3 rounded-xl text-sm"
                    style={{
                      background: "rgba(239, 68, 68, 0.1)",
                      border: "1px solid rgba(239, 68, 68, 0.2)",
                      color: "#fca5a5",
                    }}
                    data-ocid="auth.error_state"
                  >
                    {error}
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full rounded-xl font-semibold btn-neon h-11"
                  disabled={loading}
                  data-ocid="auth.submit_button"
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : null}
                  {loading ? "Creating account..." : "Create Account"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          {/* Divider */}
          <div className="flex items-center gap-3 my-5">
            <div
              className="flex-1 h-px"
              style={{ background: "rgba(255,255,255,0.08)" }}
            />
            <span className="text-xs" style={{ color: "#475569" }}>
              or continue with
            </span>
            <div
              className="flex-1 h-px"
              style={{ background: "rgba(255,255,255,0.08)" }}
            />
          </div>

          {/* Google sign in */}
          <Button
            variant="outline"
            className="w-full h-11 rounded-xl font-medium border-white/10 bg-white/5 text-white hover:bg-white/10 hover:text-white gap-2"
            onClick={handleGoogle}
            disabled={googleLoading}
            data-ocid="auth.google_button"
          >
            {googleLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <SiGoogle className="w-4 h-4" style={{ color: "#ea4335" }} />
            )}
            {googleLoading ? "Connecting..." : "Continue with Google"}
          </Button>
        </div>

        {/* Footer */}
        <p className="text-center text-xs mt-6" style={{ color: "#334155" }}>
          © {new Date().getFullYear()}. Built with love using{" "}
          <a
            href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(typeof window !== "undefined" ? window.location.hostname : "")}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "#7c3aed" }}
          >
            caffeine.ai
          </a>
        </p>
      </motion.div>
    </div>
  );
}
