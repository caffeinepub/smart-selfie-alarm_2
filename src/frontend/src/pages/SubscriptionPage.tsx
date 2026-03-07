import { Button } from "@/components/ui/button";
import {
  Check,
  Crown,
  ExternalLink,
  Loader2,
  Lock,
  ShieldCheck,
  Star,
} from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthContext } from "../context/AuthContext";
import { useSubscriptionContext } from "../context/SubscriptionContext";
import {
  PLAN_DURATION_DAYS,
  PLAN_PRICE_PAISE,
  type PlanType,
  RAZORPAY_KEY_ID,
  RAZORPAY_PLAN_IDS,
  activateSubscription,
  getUserSubscription,
  isSubscriptionActive,
  markTrialUsed,
} from "../lib/subscriptionService";

// Razorpay global type
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

// ─── Plan definitions ────────────────────────────────────────────────────────

interface PlanDef {
  id: PlanType;
  name: string;
  price: string;
  period: string;
  savingsBadge?: string;
  bestValue?: boolean;
  features: string[];
  accent: string;
  gradFrom: string;
  gradTo: string;
}

const PLANS: PlanDef[] = [
  {
    id: "monthly",
    name: "Monthly",
    price: "₹29",
    period: "/ month",
    features: [
      "All alarm features",
      "Selfie & live verification",
      "Alarm sound library",
      "Auto-renews monthly",
    ],
    accent: "#6366f1",
    gradFrom: "#6366f1",
    gradTo: "#4f46e5",
  },
  {
    id: "halfYearly",
    name: "Half Yearly",
    price: "₹149",
    period: "/ 6 months",
    savingsBadge: "Save 14%",
    features: [
      "All alarm features",
      "Selfie & live verification",
      "Alarm sound library",
      "Auto-renews every 6 months",
    ],
    accent: "#8b5cf6",
    gradFrom: "#8b5cf6",
    gradTo: "#7c3aed",
  },
  {
    id: "yearly",
    name: "Yearly",
    price: "₹279",
    period: "/ year",
    savingsBadge: "Save 20%",
    bestValue: true,
    features: [
      "All alarm features",
      "Selfie & live verification",
      "Alarm sound library",
      "Priority support",
      "Auto-renews yearly",
    ],
    accent: "#f59e0b",
    gradFrom: "#f59e0b",
    gradTo: "#d97706",
  },
];

// ─── Component ───────────────────────────────────────────────────────────────

export default function SubscriptionPage() {
  const navigate = useNavigate();
  const { user } = useAuthContext();
  const { isActive, trialUsed, refetch } = useSubscriptionContext();

  const [selected, setSelected] = useState<PlanType>("yearly");
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState("");

  const selectedPlan = PLANS.find((p) => p.id === selected)!;

  // ── Razorpay subscription checkout ──────────────────────────────────────

  const handleStartTrial = async () => {
    if (!user) return;
    setPayError("");
    setPaying(true);

    const loaded = await loadRazorpayScript();
    if (!loaded) {
      setPayError(
        "Failed to load payment gateway. Please check your connection.",
      );
      setPaying(false);
      return;
    }

    // Mark trial as used immediately so the user can't tap twice
    await markTrialUsed(user.id);

    const planId = RAZORPAY_PLAN_IDS[selected];
    const amountPaise = PLAN_PRICE_PAISE[selected] ?? 2900;

    const options: Record<string, unknown> = {
      key: RAZORPAY_KEY_ID,
      // When plan_id is passed Razorpay creates the subscription internally
      // and handles the 7-day trial period set in the Razorpay dashboard plan.
      plan_id: planId,
      name: "Smart Selfie Alarm",
      description: `${selectedPlan.name} Plan — 7-day free trial`,
      prefill: {
        email: user.email ?? "",
      },
      notes: {
        user_id: user.id,
        plan_type: selected,
        plan_id: planId,
        user_email: user.email ?? "",
      },
      theme: { color: selectedPlan.accent },
      recurring: true,
      modal: {
        ondismiss: () => {
          setPaying(false);
        },
      },
      handler: async (response: Record<string, string>) => {
        try {
          const paymentId =
            response.razorpay_payment_id ??
            response.razorpay_subscription_id ??
            "";
          const subscriptionId = response.razorpay_subscription_id ?? "";

          console.log("[SubscriptionPage] Razorpay success", {
            paymentId,
            subscriptionId,
            plan: selected,
          });

          await activateSubscription({
            uid: user.id,
            planType: selected,
            paymentId,
            amountRupees: amountPaise / 100,
            subscriptionId: subscriptionId || undefined,
          });

          // Poll for DB confirmation (Supabase replication lag)
          let activated = false;
          for (let i = 0; i < 6; i++) {
            await refetch();
            const fresh = await getUserSubscription(user.id);
            if (fresh && isSubscriptionActive(fresh)) {
              activated = true;
              break;
            }
            await new Promise((r) => setTimeout(r, 700));
          }

          if (!activated) {
            console.warn(
              "[SubscriptionPage] Context still not active after retries — navigating anyway",
            );
          }

          navigate("/home");
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          console.error("[SubscriptionPage] Activation error:", msg);
          setPayError(
            `Payment recorded but activation failed: ${msg}. Please contact support.`,
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
        setPayError(`Payment failed: ${detail || "Unknown error"}.`);
        setPaying(false);
      });
      rzp.open();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[SubscriptionPage] Razorpay open error:", msg);
      setPayError(`Could not open payment: ${msg}. Please try again.`);
      setPaying(false);
    }
  };

  // ── Plan label helpers ───────────────────────────────────────────────────

  const durationLabel = {
    monthly: "1 month",
    halfYearly: "6 months",
    yearly: "1 year",
  }[selected];

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div
      className="min-h-full pb-28 overflow-y-auto"
      style={{ backgroundColor: "#080810" }}
      data-ocid="subscription.page"
    >
      {/* Ambient background */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% -10%, rgba(124,58,237,0.18) 0%, transparent 55%)",
          zIndex: 0,
        }}
      />

      <div className="relative z-10">
        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="p-6 pt-10 text-center">
          {/* Crown */}
          <div
            className="w-16 h-16 rounded-[22px] flex items-center justify-center mx-auto mb-4"
            style={{
              background: "linear-gradient(135deg, #f59e0b, #d97706)",
              boxShadow: "0 8px 32px rgba(245,158,11,0.38)",
            }}
          >
            <Crown className="w-8 h-8 text-white" />
          </div>

          {/* Trial badge */}
          <div className="flex items-center justify-center gap-2 mb-3">
            <span
              className="text-xs font-bold px-4 py-1.5 rounded-full"
              style={{
                background: "rgba(245,158,11,0.12)",
                border: "1px solid rgba(245,158,11,0.30)",
                color: "#fbbf24",
                letterSpacing: "0.07em",
              }}
            >
              {trialUsed ? "TRIAL USED" : "7 DAY FREE TRIAL"}
            </span>
            {trialUsed && (
              <span
                className="text-[10px] font-semibold px-2.5 py-1 rounded-full"
                style={{
                  background: "rgba(239,68,68,0.10)",
                  border: "1px solid rgba(239,68,68,0.25)",
                  color: "#f87171",
                }}
              >
                Only once per account
              </span>
            )}
          </div>

          <h1
            className="text-2xl font-bold text-white mb-1.5"
            style={{ letterSpacing: "-0.03em" }}
          >
            Unlock Premium
          </h1>
          <p className="text-sm" style={{ color: "#64748b" }}>
            {trialUsed
              ? "Select a plan to continue using Smart Selfie Alarm"
              : "Start your 7-day free trial — no charge for 7 days"}
          </p>
        </div>

        {/* ── Plan cards ─────────────────────────────────────────────────── */}
        <div className="px-4 space-y-3">
          {PLANS.map((plan, idx) => {
            const isSel = selected === plan.id;
            return (
              <motion.button
                key={plan.id}
                type="button"
                className="w-full text-left rounded-[22px] overflow-hidden"
                style={{
                  background: isSel
                    ? `linear-gradient(135deg, ${plan.gradFrom}1a 0%, ${plan.gradTo}0f 100%)`
                    : plan.bestValue
                      ? "rgba(245,158,11,0.04)"
                      : "rgba(255,255,255,0.03)",
                  border: isSel
                    ? `2px solid ${plan.accent}55`
                    : plan.bestValue
                      ? "1.5px solid rgba(245,158,11,0.22)"
                      : "1px solid rgba(255,255,255,0.07)",
                  boxShadow: isSel ? `0 4px 24px ${plan.accent}18` : "none",
                  transition: "all 0.18s",
                }}
                onClick={() => setSelected(plan.id)}
                whileTap={{ scale: 0.982 }}
                data-ocid={`subscription.plan.card.${idx + 1}`}
              >
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    {/* Left side */}
                    <div className="flex items-start gap-3">
                      {/* Radio dot */}
                      <div
                        className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                        style={{
                          background: isSel
                            ? plan.accent
                            : "rgba(255,255,255,0.07)",
                          border: isSel
                            ? `2px solid ${plan.accent}`
                            : "2px solid rgba(255,255,255,0.14)",
                          boxShadow: isSel
                            ? `0 0 8px ${plan.accent}45`
                            : "none",
                          transition: "all 0.18s",
                        }}
                      >
                        {isSel && (
                          <div className="w-2 h-2 rounded-full bg-white" />
                        )}
                      </div>

                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-white text-base leading-tight">
                            {plan.name}
                          </span>
                          {plan.bestValue && (
                            <span
                              className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                              style={{
                                background: "rgba(245,158,11,0.18)",
                                color: "#fbbf24",
                                border: "1px solid rgba(245,158,11,0.40)",
                              }}
                            >
                              Best Value
                            </span>
                          )}
                          {plan.savingsBadge && (
                            <span
                              className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                              style={{
                                background: `${plan.accent}18`,
                                color: plan.accent,
                                border: `1px solid ${plan.accent}35`,
                              }}
                            >
                              {plan.savingsBadge}
                            </span>
                          )}
                        </div>
                        <p
                          className="text-xs mt-0.5"
                          style={{ color: "#475569" }}
                        >
                          {plan.period.replace("/ ", "")}
                        </p>
                      </div>
                    </div>

                    {/* Price */}
                    <div className="flex flex-col items-end flex-shrink-0">
                      <div className="flex items-baseline gap-0.5">
                        <span
                          className="text-2xl font-bold"
                          style={{ color: isSel ? plan.accent : "#e2e8f0" }}
                        >
                          {plan.price}
                        </span>
                        <span
                          className="text-xs ml-0.5"
                          style={{ color: "#475569" }}
                        >
                          {plan.period}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Feature list — shown when selected */}
                  {isSel && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="mt-4 space-y-1.5 overflow-hidden"
                    >
                      {plan.features.map((f) => (
                        <div key={f} className="flex items-center gap-2">
                          <Check
                            className="w-3.5 h-3.5 flex-shrink-0"
                            style={{ color: plan.accent }}
                          />
                          <span
                            className="text-xs"
                            style={{ color: "#94a3b8" }}
                          >
                            {f}
                          </span>
                        </div>
                      ))}
                    </motion.div>
                  )}
                </div>
              </motion.button>
            );
          })}

          {/* Note */}
          <p
            className="text-xs text-center pt-0.5"
            style={{ color: "#475569" }}
          >
            Subscriptions renew automatically. Cancel anytime.
          </p>

          {/* ── CTA card ───────────────────────────────────────────────── */}
          <div
            className="rounded-[22px] p-4 space-y-3"
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.07)",
            }}
          >
            {/* Trial summary strip */}
            {!trialUsed ? (
              <div
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl"
                style={{
                  background: "rgba(245,158,11,0.07)",
                  border: "1px solid rgba(245,158,11,0.18)",
                }}
              >
                <Star
                  className="w-4 h-4 flex-shrink-0"
                  style={{ color: "#fbbf24" }}
                />
                <p className="text-xs" style={{ color: "#fbbf24" }}>
                  <span className="font-semibold">Free for 7 days</span>
                  <span style={{ color: "#92400e" }}>
                    , then {selectedPlan.price}
                    {selectedPlan.period} for {durationLabel}
                  </span>
                </p>
              </div>
            ) : (
              <div
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl"
                style={{
                  background: "rgba(99,102,241,0.07)",
                  border: "1px solid rgba(99,102,241,0.18)",
                }}
              >
                <ShieldCheck
                  className="w-4 h-4 flex-shrink-0"
                  style={{ color: "#818cf8" }}
                />
                <p className="text-xs" style={{ color: "#818cf8" }}>
                  <span className="font-semibold">
                    Select a plan to continue
                  </span>
                  <span style={{ color: "#475569" }}>
                    {" "}
                    — {selectedPlan.price}
                    {selectedPlan.period} for {durationLabel}
                  </span>
                </p>
              </div>
            )}

            {/* Error */}
            {payError && (
              <div
                className="flex items-start gap-2 px-3 py-2.5 rounded-xl text-xs"
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

            {/* Main CTA */}
            <Button
              className="w-full rounded-2xl font-bold text-white border-0"
              style={{
                height: "52px",
                background: paying
                  ? "rgba(255,255,255,0.06)"
                  : `linear-gradient(135deg, ${selectedPlan.gradFrom}, ${selectedPlan.gradTo})`,
                boxShadow: paying
                  ? "none"
                  : `0 4px 20px ${selectedPlan.accent}30`,
                fontSize: "15px",
                letterSpacing: "-0.01em",
              }}
              onClick={handleStartTrial}
              disabled={paying}
              data-ocid="subscription.start_trial_button"
            >
              {paying ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Opening payment…
                </>
              ) : trialUsed ? (
                <>
                  <Lock className="w-4 h-4 mr-2" />
                  Subscribe — {selectedPlan.price}
                  {selectedPlan.period}
                </>
              ) : (
                "Start Free Trial"
              )}
            </Button>

            {/* Backup link */}
            <div className="flex items-center justify-center gap-1.5">
              <span className="text-xs" style={{ color: "#334155" }}>
                Having trouble?
              </span>
              <a
                href="https://rzp.io/rzp/kcd3loz"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs font-medium hover:opacity-80 transition-opacity"
                style={{ color: "#6366f1" }}
                data-ocid="subscription.backup_link"
              >
                Subscribe directly
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>

          {/* Back link for already-subscribed users */}
          {isActive && (
            <button
              type="button"
              className="w-full text-sm py-3 min-h-[44px]"
              style={{ color: "#475569" }}
              onClick={() => navigate("/home")}
              data-ocid="subscription.back_link"
            >
              ← Back to App
            </button>
          )}

          {/* Legal links */}
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 pb-6">
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
    </div>
  );
}
