import { Button } from "@/components/ui/button";
import {
  CheckCircle2,
  Crown,
  ExternalLink,
  Loader2,
  Lock,
  ShieldCheck,
  Smartphone,
  Star,
  Zap,
} from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthContext } from "../context/AuthContext";
import { useSubscriptionContext } from "../context/SubscriptionContext";
import {
  RAZORPAY_KEY_ID,
  activateTrialLocally,
  createRazorpaySubscription,
  getUserSubscription,
  isSubscriptionActive,
} from "../lib/subscriptionService";

// ─── Razorpay global type ─────────────────────────────────────────────────────

interface RazorpayInstance {
  open(): void;
  on(event: string, handler: (data: unknown) => void): void;
}
interface RazorpayConstructor {
  new (options: Record<string, unknown>): RazorpayInstance;
}
declare global {
  interface Window {
    Razorpay: RazorpayConstructor;
  }
}

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (window.Razorpay) return resolve(true);
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

// ─── Features list ────────────────────────────────────────────────────────────

const FEATURES = [
  { icon: Zap, label: "All alarm features unlocked" },
  { icon: Smartphone, label: "Selfie & live face verification" },
  { icon: ShieldCheck, label: "Test Alarm to verify camera" },
  { icon: Star, label: "Alarm sound library" },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function SubscriptionPage() {
  const navigate = useNavigate();
  const { user } = useAuthContext();
  const { isActive, trialUsed, refetch } = useSubscriptionContext();

  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState("");
  const [step, setStep] = useState<
    | "idle"
    | "creating_subscription"
    | "opening_checkout"
    | "activating"
    | "done"
  >("idle");

  // ── ₹1 Trial subscription flow ────────────────────────────────────────────

  const handleTrialPayment = async () => {
    if (!user) return;
    setPayError("");
    setPaying(true);
    setStep("creating_subscription");

    // 0. Idempotency check: if the user already has an active or trial-active
    //    subscription, skip the edge function call and just navigate them in.
    try {
      const existing = await getUserSubscription(user.id);
      if (existing && isSubscriptionActive(existing)) {
        console.log("[SubscriptionPage] Already active — navigating to /home");
        setPaying(false);
        setStep("done");
        navigate("/home");
        return;
      }
    } catch {
      // Non-fatal — proceed with subscription creation
    }

    // 1. Load Razorpay SDK
    const loaded = await loadRazorpayScript();
    if (!loaded) {
      setPayError(
        "Payment gateway could not be loaded. Check your internet connection and try again.",
      );
      setPaying(false);
      setStep("idle");
      return;
    }

    // 2. Create Razorpay subscription via Edge Function → gets subscription_id
    let subscriptionId: string;
    try {
      subscriptionId = await createRazorpaySubscription(
        user.id,
        user.email ?? "",
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[SubscriptionPage] create-subscription failed:", msg);

      // Distinguish network errors from API errors for clearer user messages
      const isNetworkError =
        msg.toLowerCase().includes("failed to fetch") ||
        msg.toLowerCase().includes("network") ||
        msg.toLowerCase().includes("fetch");

      setPayError(
        isNetworkError
          ? "Could not connect to the server. Make sure the Edge Function is deployed and Razorpay secrets are set, then try again."
          : `Subscription creation failed: ${msg}. Please try again.`,
      );
      setPaying(false);
      setStep("idle");
      return;
    }

    setStep("opening_checkout");

    // 3. Open Razorpay checkout with subscription_id (NOT order_id, NOT plan_id)
    const options: Record<string, unknown> = {
      key: RAZORPAY_KEY_ID,
      subscription_id: subscriptionId, // ← Razorpay Subscriptions API
      name: "Smart Selfie Alarm",
      description: "₹1 Trial — 7 days full access, then ₹29/month",
      prefill: {
        email: user.email ?? "",
      },
      notes: {
        user_id: user.id,
      },
      theme: { color: "#7c3aed" },
      modal: {
        ondismiss: () => {
          setPaying(false);
          setStep("idle");
        },
      },
      handler: async (response: Record<string, string>) => {
        setStep("activating");
        try {
          const paymentId = response.razorpay_payment_id ?? "";
          const subId = response.razorpay_subscription_id ?? subscriptionId;

          console.log("[SubscriptionPage] Payment success:", {
            payment_id: paymentId,
            subscription_id: subId,
          });

          // 4. Optimistic local activation (webhook is the real source of truth)
          await activateTrialLocally(user.id, subId, paymentId);

          // 5. Poll context until active (handles replication lag)
          let activated = false;
          for (let i = 0; i < 8; i++) {
            await refetch();
            const fresh = await getUserSubscription(user.id);
            if (fresh && isSubscriptionActive(fresh)) {
              activated = true;
              break;
            }
            await new Promise((r) => setTimeout(r, 500));
          }

          if (!activated) {
            console.warn(
              "[SubscriptionPage] Subscription not yet reflected — navigating anyway",
            );
          }

          setStep("done");

          // 6. Navigate to app
          navigate("/home");
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          console.error("[SubscriptionPage] Activation error:", msg);
          setPayError(
            `Payment captured but activation failed: ${msg}. Please contact support — your access will be activated shortly.`,
          );
        } finally {
          setPaying(false);
        }
      },
    };

    try {
      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", (data: unknown) => {
        const resp = data as {
          error?: { description?: string; code?: string; reason?: string };
        };
        const detail = [
          resp.error?.description,
          resp.error?.reason,
          resp.error?.code,
        ]
          .filter(Boolean)
          .join(" — ");
        console.error("[SubscriptionPage] payment.failed:", resp.error);
        setPayError(
          `Payment failed: ${detail || "Unknown error"}. Please try again.`,
        );
        setPaying(false);
        setStep("idle");
      });
      rzp.open();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[SubscriptionPage] Razorpay open error:", msg);
      setPayError(`Could not open payment: ${msg}. Please try again.`);
      setPaying(false);
      setStep("idle");
    }
  };

  // ── CTA button label ──────────────────────────────────────────────────────

  const ctaLabel = () => {
    if (!paying)
      return trialUsed
        ? "Subscribe Now — ₹29/month"
        : "Start ₹1 Trial — 7 Days Free Access";
    switch (step) {
      case "creating_subscription":
        return "Creating subscription…";
      case "opening_checkout":
        return "Opening payment…";
      case "activating":
        return "Activating access…";
      default:
        return "Processing…";
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div
      className="min-h-full pb-28 overflow-y-auto"
      style={{ backgroundColor: "#080810" }}
      data-ocid="subscription.page"
    >
      {/* Ambient glow */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% -10%, rgba(124,58,237,0.20) 0%, transparent 55%)",
          zIndex: 0,
        }}
      />

      <div className="relative z-10 max-w-md mx-auto px-4">
        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="pt-10 pb-6 text-center">
          <div
            className="w-16 h-16 rounded-[22px] flex items-center justify-center mx-auto mb-4"
            style={{
              background: "linear-gradient(135deg, #7c3aed, #6d28d9)",
              boxShadow: "0 8px 32px rgba(124,58,237,0.38)",
            }}
          >
            <Crown className="w-8 h-8 text-white" />
          </div>

          <div className="flex items-center justify-center gap-2 mb-3">
            {!trialUsed ? (
              <span
                className="text-xs font-bold px-4 py-1.5 rounded-full"
                style={{
                  background: "rgba(124,58,237,0.12)",
                  border: "1px solid rgba(124,58,237,0.30)",
                  color: "#a78bfa",
                  letterSpacing: "0.07em",
                }}
              >
                ₹1 TRIAL — 7 DAYS ACCESS
              </span>
            ) : (
              <span
                className="text-xs font-bold px-4 py-1.5 rounded-full"
                style={{
                  background: "rgba(239,68,68,0.10)",
                  border: "1px solid rgba(239,68,68,0.25)",
                  color: "#f87171",
                  letterSpacing: "0.07em",
                }}
              >
                TRIAL USED
              </span>
            )}
          </div>

          <h1
            className="text-2xl font-bold text-white mb-1.5"
            style={{ letterSpacing: "-0.03em" }}
          >
            {trialUsed ? "Subscribe to Continue" : "Unlock Smart Selfie Alarm"}
          </h1>
          <p className="text-sm" style={{ color: "#64748b" }}>
            {trialUsed
              ? "Your trial has been used. Subscribe to keep access."
              : "Pay ₹1 to get 7 days of full access. Monthly autopay at ₹29 after."}
          </p>
        </div>

        {/* ── Features card ───────────────────────────────────────────────── */}
        <div
          className="rounded-[22px] p-5 mb-4"
          style={{
            background: "rgba(124,58,237,0.06)",
            border: "1px solid rgba(124,58,237,0.18)",
          }}
        >
          <p
            className="text-xs font-semibold uppercase tracking-widest mb-3"
            style={{ color: "#7c3aed" }}
          >
            What you get
          </p>
          <div className="space-y-2.5">
            {FEATURES.map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-3">
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: "rgba(124,58,237,0.15)" }}
                >
                  <Icon className="w-3.5 h-3.5" style={{ color: "#a78bfa" }} />
                </div>
                <span className="text-sm" style={{ color: "#cbd5e1" }}>
                  {label}
                </span>
                <CheckCircle2
                  className="w-4 h-4 ml-auto flex-shrink-0"
                  style={{ color: "#22c55e" }}
                />
              </div>
            ))}
          </div>
        </div>

        {/* ── Pricing strip ───────────────────────────────────────────────── */}
        {!trialUsed && (
          <motion.div
            className="rounded-[22px] p-4 mb-4"
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.07)",
            }}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-white">₹1 Today</p>
                <p className="text-xs mt-0.5" style={{ color: "#475569" }}>
                  7 days of full access
                </p>
              </div>
              <div
                className="text-right px-3 py-1.5 rounded-xl"
                style={{
                  background: "rgba(124,58,237,0.12)",
                  border: "1px solid rgba(124,58,237,0.25)",
                }}
              >
                <p className="text-lg font-bold" style={{ color: "#a78bfa" }}>
                  ₹1
                </p>
              </div>
            </div>
            <div
              className="mt-3 h-px"
              style={{ background: "rgba(255,255,255,0.05)" }}
            />
            <div className="flex items-center justify-between mt-3">
              <div>
                <p className="text-sm text-white">Then ₹29/month</p>
                <p className="text-xs mt-0.5" style={{ color: "#475569" }}>
                  Auto-renews monthly via UPI autopay
                </p>
              </div>
              <span
                className="text-xs px-2.5 py-1 rounded-full font-medium"
                style={{
                  background: "rgba(34,197,94,0.10)",
                  color: "#86efac",
                  border: "1px solid rgba(34,197,94,0.20)",
                }}
              >
                Cancel anytime
              </span>
            </div>
          </motion.div>
        )}

        {/* ── Error display ───────────────────────────────────────────────── */}
        {payError && (
          <div
            className="flex items-start gap-2 px-3 py-2.5 rounded-xl text-xs mb-3"
            style={{
              background: "rgba(239,68,68,0.08)",
              border: "1px solid rgba(239,68,68,0.20)",
              color: "#fca5a5",
            }}
            data-ocid="subscription.error_state"
          >
            <span className="flex-shrink-0 mt-0.5">⚠</span>
            <span>{payError}</span>
          </div>
        )}

        {/* ── CTA ─────────────────────────────────────────────────────────── */}
        <Button
          className="w-full rounded-2xl font-bold text-white border-0"
          style={{
            height: "56px",
            background: paying
              ? "rgba(255,255,255,0.06)"
              : "linear-gradient(135deg, #7c3aed, #6d28d9)",
            boxShadow: paying ? "none" : "0 4px 24px rgba(124,58,237,0.35)",
            fontSize: "16px",
            letterSpacing: "-0.01em",
          }}
          onClick={handleTrialPayment}
          disabled={paying}
          data-ocid="subscription.start_trial_button"
        >
          {paying ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
              {ctaLabel()}
            </>
          ) : trialUsed ? (
            <>
              <Lock className="w-4 h-4 mr-2" />
              Subscribe Now — ₹29/month
            </>
          ) : (
            "Start ₹1 Trial — 7 Days Free Access"
          )}
        </Button>

        {/* ── Step indicator while paying ─────────────────────────────────── */}
        {paying && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center justify-center gap-2 mt-3"
          >
            {(
              [
                "creating_subscription",
                "opening_checkout",
                "activating",
              ] as const
            ).map((s, i) => (
              <div key={s} className="flex items-center gap-1.5">
                <div
                  className="w-1.5 h-1.5 rounded-full"
                  style={{
                    background:
                      step === s
                        ? "#a78bfa"
                        : (
                              [
                                "creating_subscription",
                                "opening_checkout",
                                "activating",
                              ] as const
                            ).indexOf(
                              step as
                                | "creating_subscription"
                                | "opening_checkout"
                                | "activating",
                            ) > i
                          ? "#22c55e"
                          : "rgba(255,255,255,0.15)",
                    transition: "background 0.3s",
                  }}
                />
                <span
                  className="text-[10px]"
                  style={{
                    color: step === s ? "#a78bfa" : "#334155",
                  }}
                >
                  {s === "creating_subscription"
                    ? "Subscription"
                    : s === "opening_checkout"
                      ? "Payment"
                      : "Access"}
                </span>
                {i < 2 && (
                  <span style={{ color: "#1e293b", fontSize: "10px" }}>→</span>
                )}
              </div>
            ))}
          </motion.div>
        )}

        {/* ── Backup / direct link ────────────────────────────────────────── */}
        <div className="flex items-center justify-center gap-1.5 mt-4">
          <span className="text-xs" style={{ color: "#334155" }}>
            Having trouble?
          </span>
          <a
            href="https://rzp.io/rzp/kcd3loz"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs font-medium hover:opacity-80 transition-opacity"
            style={{ color: "#7c3aed" }}
            data-ocid="subscription.backup_link"
          >
            Subscribe directly
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>

        {/* ── Back link for already-subscribed ────────────────────────────── */}
        {isActive && (
          <button
            type="button"
            className="w-full text-sm py-3 mt-2 min-h-[44px]"
            style={{ color: "#475569" }}
            onClick={() => navigate("/home")}
            data-ocid="subscription.back_link"
          >
            ← Back to App
          </button>
        )}

        {/* ── Legal links ─────────────────────────────────────────────────── */}
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 py-8 mt-4">
          {[
            { label: "Privacy Policy", to: "/privacy" },
            { label: "Terms & Conditions", to: "/terms" },
            { label: "Refund Policy", to: "/refund" },
          ].map(({ label, to }) => (
            <button
              key={to}
              type="button"
              className="text-xs hover:opacity-80 transition-opacity"
              style={{ color: "#334155" }}
              onClick={() => navigate(to)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
