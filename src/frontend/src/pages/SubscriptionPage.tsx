import { Button } from "@/components/ui/button";
import { Check, Crown, Loader2, Sparkles, Star, Zap } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthContext } from "../context/AuthContext";
import { useSubscriptionContext } from "../context/SubscriptionContext";
import {
  type PlanType,
  activateSubscription,
} from "../lib/subscriptionService";

// Razorpay Key ID (public — safe to expose in frontend)
const RAZORPAY_KEY_ID = "rzp_live_SNnU8ftzmAC4jA";

const MONTHLY_12 = 29 * 12; // 348
const HALF_YEARLY = 150;
const YEARLY = 280;
const HALF_YEARLY_DISCOUNT = Math.round(
  ((29 * 6 - HALF_YEARLY) / (29 * 6)) * 100,
); // ~14%
const YEARLY_DISCOUNT = Math.round(((MONTHLY_12 - YEARLY) / MONTHLY_12) * 100); // ~20%

interface Plan {
  id: PlanType;
  name: string;
  price: string;
  amountPaise: number; // Razorpay uses paise
  period: string;
  subtext: string;
  badge?: string;
  features: string[];
  accentColor: string;
  gradientFrom: string;
  gradientTo: string;
}

const PLANS: Plan[] = [
  {
    id: "trial",
    name: "Free Trial",
    price: "₹1",
    amountPaise: 100,
    period: "7 days",
    subtext: "Refundable verification hold",
    features: [
      "Full access for 7 days",
      "All verification modes",
      "Unlimited alarms",
      "₹1 verification hold (refundable)",
    ],
    accentColor: "#10b981",
    gradientFrom: "#10b981",
    gradientTo: "#059669",
  },
  {
    id: "monthly",
    name: "Monthly",
    price: "₹29",
    amountPaise: 2900,
    period: "/ month",
    subtext: "Cancel anytime",
    features: [
      "Unlimited alarms",
      "All verification modes",
      "Priority support",
      "Auto-renews monthly",
    ],
    accentColor: "#6366f1",
    gradientFrom: "#7c3aed",
    gradientTo: "#4f46e5",
  },
  {
    id: "halfYearly",
    name: "6 Months",
    price: "₹150",
    amountPaise: 15000,
    period: "/ 6 months",
    subtext: `Save ≈${HALF_YEARLY_DISCOUNT}% vs monthly`,
    badge: `≈${HALF_YEARLY_DISCOUNT}% OFF`,
    features: [
      "Everything in Monthly",
      "6 months full access",
      `Save ₹${29 * 6 - HALF_YEARLY} vs monthly`,
      "Great value plan",
    ],
    accentColor: "#3b82f6",
    gradientFrom: "#3b82f6",
    gradientTo: "#2563eb",
  },
  {
    id: "yearly",
    name: "Yearly",
    price: "₹280",
    amountPaise: 28000,
    period: "/ year",
    subtext: `Save ≈${YEARLY_DISCOUNT}% vs monthly`,
    badge: "Best Value",
    features: [
      "Everything in Monthly",
      "12 months full access",
      `Save ₹${MONTHLY_12 - YEARLY} vs monthly`,
      `Best value plan — ≈${YEARLY_DISCOUNT}% OFF`,
    ],
    accentColor: "#f59e0b",
    gradientFrom: "#f59e0b",
    gradientTo: "#d97706",
  },
];

// Declare Razorpay global (loaded via CDN script)
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
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

export default function SubscriptionPage() {
  const navigate = useNavigate();
  const { user } = useAuthContext();
  const { isActive, refetch } = useSubscriptionContext();
  const [selected, setSelected] = useState<PlanType>("yearly");
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState("");

  const selectedPlan = PLANS.find((p) => p.id === selected)!;

  const handlePay = async () => {
    if (!user) return;
    setPayError("");
    setPaying(true);

    const loaded = await loadRazorpayScript();
    if (!loaded) {
      setPayError(
        "Failed to load payment gateway. Check your connection. / भुगतान गेटवे लोड नहीं हुआ।",
      );
      setPaying(false);
      return;
    }

    const options = {
      key: RAZORPAY_KEY_ID,
      amount: selectedPlan.amountPaise,
      currency: "INR",
      name: "Smart Selfie Alarm",
      description: `${selectedPlan.name} Subscription`,
      prefill: {
        email: user.email ?? "",
      },
      theme: {
        color: "#7c3aed",
      },
      modal: {
        ondismiss: () => {
          setPaying(false);
        },
      },
      handler: async (response: Record<string, string>) => {
        try {
          await activateSubscription(
            user.id,
            selected,
            response.razorpay_payment_id ?? "",
            selectedPlan.amountPaise / 100,
          );
          await refetch();
          navigate("/home");
        } catch (_err) {
          setPayError(
            "Payment recorded but activation failed. Please contact support.",
          );
        } finally {
          setPaying(false);
        }
      },
    } as Record<string, unknown>;

    try {
      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", (data: unknown) => {
        const resp = data as { error?: { description?: string } };
        setPayError(
          `Payment failed: ${resp.error?.description ?? "Unknown error"}. / भुगतान विफल।`,
        );
        setPaying(false);
      });
      rzp.open();
    } catch (_err) {
      setPayError("Could not open payment. Please try again.");
      setPaying(false);
    }
  };

  return (
    <div
      className="min-h-full pb-28"
      style={{ backgroundColor: "#0a0a0f" }}
      data-ocid="subscription.page"
    >
      {/* Header */}
      <div className="relative overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 80% 100% at 50% -20%, rgba(124,58,237,0.18) 0%, transparent 60%)",
          }}
        />
        <div className="relative z-10 p-6 pt-10 text-center">
          <div
            className="w-14 h-14 rounded-[18px] flex items-center justify-center mx-auto mb-4"
            style={{
              background: "linear-gradient(135deg, #f59e0b, #d97706)",
              boxShadow: "0 6px 24px rgba(245,158,11,0.35)",
            }}
          >
            <Crown className="w-7 h-7 text-white" />
          </div>
          <h1
            className="text-2xl font-bold text-white mb-1"
            style={{ letterSpacing: "-0.03em" }}
          >
            Smart Selfie Alarm Premium
          </h1>
          <p className="text-sm" style={{ color: "#64748b" }}>
            Choose the plan that works for you
          </p>
        </div>
      </div>

      <div className="px-4 space-y-4">
        {/* Plan cards */}
        {PLANS.map((plan) => (
          <motion.button
            key={plan.id}
            type="button"
            className="w-full text-left rounded-[22px] overflow-hidden transition-all"
            style={{
              background:
                selected === plan.id
                  ? `linear-gradient(135deg, ${plan.gradientFrom}22 0%, ${plan.gradientTo}15 100%)`
                  : "rgba(255,255,255,0.04)",
              border:
                selected === plan.id
                  ? `1.5px solid ${plan.accentColor}55`
                  : "1px solid rgba(255,255,255,0.08)",
              boxShadow:
                selected === plan.id
                  ? `0 4px 20px ${plan.accentColor}25`
                  : "none",
            }}
            onClick={() => setSelected(plan.id)}
            whileTap={{ scale: 0.985 }}
            data-ocid="subscription.plan.card"
          >
            <div className="p-5">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex items-center gap-3">
                  <div
                    className="w-10 h-10 rounded-[14px] flex items-center justify-center flex-shrink-0"
                    style={{ background: `${plan.accentColor}20` }}
                  >
                    {plan.id === "trial" && (
                      <Sparkles
                        className="w-5 h-5"
                        style={{ color: plan.accentColor }}
                      />
                    )}
                    {plan.id === "monthly" && (
                      <Zap
                        className="w-5 h-5"
                        style={{ color: plan.accentColor }}
                      />
                    )}
                    {plan.id === "halfYearly" && (
                      <Crown
                        className="w-5 h-5"
                        style={{ color: plan.accentColor }}
                      />
                    )}
                    {plan.id === "yearly" && (
                      <Star
                        className="w-5 h-5"
                        style={{ color: plan.accentColor }}
                      />
                    )}
                  </div>
                  <div>
                    <p className="font-bold text-white text-base leading-tight">
                      {plan.name}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: "#64748b" }}>
                      {plan.subtext}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <div className="flex items-baseline gap-0.5">
                    <span className="text-2xl font-bold text-white">
                      {plan.price}
                    </span>
                    <span className="text-xs" style={{ color: "#64748b" }}>
                      {plan.period}
                    </span>
                  </div>
                  {plan.badge && (
                    <span
                      className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                      style={{
                        background: `${plan.accentColor}25`,
                        color: plan.accentColor,
                        border: `1px solid ${plan.accentColor}40`,
                      }}
                    >
                      {plan.badge}
                    </span>
                  )}
                </div>
              </div>

              {/* Feature list */}
              <div className="space-y-1.5">
                {plan.features.map((feat) => (
                  <div key={feat} className="flex items-center gap-2">
                    <Check
                      className="w-3.5 h-3.5 flex-shrink-0"
                      style={{ color: plan.accentColor }}
                    />
                    <span className="text-xs" style={{ color: "#94a3b8" }}>
                      {feat}
                    </span>
                  </div>
                ))}
              </div>

              {/* Selected indicator */}
              {selected === plan.id && (
                <div
                  className="mt-3 flex items-center gap-1.5 text-xs font-semibold"
                  style={{ color: plan.accentColor }}
                >
                  <div
                    className="w-4 h-4 rounded-full flex items-center justify-center"
                    style={{ background: plan.accentColor }}
                  >
                    <Check className="w-2.5 h-2.5 text-white" />
                  </div>
                  Selected
                </div>
              )}
            </div>
          </motion.button>
        ))}

        {/* Renewal note */}
        <p className="text-xs text-center" style={{ color: "#475569" }}>
          Subscriptions renew automatically. Cancel anytime.
        </p>

        {/* CTA */}
        <div
          className="rounded-[20px] p-4"
          style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.07)",
          }}
        >
          {payError && (
            <div
              className="mb-3 flex items-start gap-2 px-3 py-2.5 rounded-xl text-xs"
              style={{
                background: "rgba(239,68,68,0.08)",
                border: "1px solid rgba(239,68,68,0.2)",
                color: "#fca5a5",
              }}
              data-ocid="subscription.error_state"
            >
              <span className="flex-shrink-0 mt-0.5">⚠</span>
              {payError}
            </div>
          )}

          <Button
            className="w-full h-12 rounded-2xl font-bold text-white border-0"
            style={{
              background: `linear-gradient(135deg, ${selectedPlan.gradientFrom}, ${selectedPlan.gradientTo})`,
              boxShadow: `0 4px 20px ${selectedPlan.accentColor}35`,
              fontSize: "15px",
            }}
            onClick={handlePay}
            disabled={paying}
            data-ocid="subscription.subscribe_button"
          >
            {paying ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            {paying
              ? "Opening payment…"
              : `Get ${selectedPlan.name} — ${selectedPlan.price}`}
          </Button>

          <p className="text-xs text-center mt-3" style={{ color: "#334155" }}>
            Payment failed? Try again or contact support. / भुगतान विफल? पुनः
            प्रयास करें।
          </p>
        </div>

        {/* Allow already-subscribed users to skip back */}
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
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 pb-4">
          {[
            { label: "Privacy Policy", to: "/privacy" },
            { label: "Terms & Conditions", to: "/terms" },
            { label: "Refund Policy", to: "/refund" },
          ].map(({ label, to }) => (
            <button
              key={to}
              type="button"
              className="text-xs transition-colors hover:opacity-80"
              style={{ color: "#475569" }}
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
