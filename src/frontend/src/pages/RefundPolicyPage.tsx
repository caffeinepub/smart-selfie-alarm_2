import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { motion } from "motion/react";
import { useNavigate } from "react-router-dom";

const sections = [
  {
    title: "Trial Period",
    content:
      "Users may receive a trial period before subscription charges apply.",
  },
  {
    title: "Cancellation",
    content:
      "Users can cancel their subscription at any time from the account settings. Once cancelled, the subscription will remain active until the end of the billing cycle.",
  },
  {
    title: "Refunds",
    content:
      "Payments once processed are generally non-refundable unless required by applicable laws.",
  },
  {
    title: "Technical Issues",
    content:
      "If a payment issue occurs due to a technical error, users may contact support for assistance.",
  },
  {
    title: "Contact",
    content: "For refund related queries contact support@smartselfiealarm.com",
  },
];

export default function RefundPolicyPage() {
  const navigate = useNavigate();

  return (
    <div
      className="min-h-full"
      style={{ backgroundColor: "#0a0a0f" }}
      data-ocid="refund.page"
    >
      {/* Header */}
      <div
        className="sticky top-0 z-10 px-4 py-4 flex items-center gap-3"
        style={{
          backgroundColor: "rgba(10, 10, 15, 0.9)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid rgba(255,255,255,0.05)",
        }}
      >
        <Button
          variant="ghost"
          size="icon"
          className="w-9 h-9 rounded-xl hover:bg-white/10"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="w-5 h-5 text-white" />
        </Button>
        <div>
          <h1 className="text-lg font-bold text-white">Refund Policy</h1>
          <p className="text-xs" style={{ color: "#64748b" }}>
            Last updated: January 2025
          </p>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="px-4 py-6 space-y-4"
      >
        {/* Intro */}
        <div className="glass-card p-5">
          <p className="text-sm leading-relaxed" style={{ color: "#cbd5e1" }}>
            Smart Selfie Alarm offers subscription-based services.
          </p>
        </div>

        {/* Sections */}
        {sections.map(({ title, content }, i) => (
          <motion.div
            key={title}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.05 * i }}
            className="glass-card p-5"
          >
            <h2 className="font-semibold text-white mb-2 text-base">{title}</h2>
            <p className="text-sm leading-relaxed" style={{ color: "#94a3b8" }}>
              {content}
            </p>
          </motion.div>
        ))}

        {/* Footer links */}
        <div
          className="glass-card p-5 space-y-2"
          style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
        >
          <p
            className="text-xs font-semibold uppercase tracking-widest mb-3"
            style={{ color: "#475569" }}
          >
            Also Read
          </p>
          {[
            { label: "Privacy Policy", path: "/privacy" },
            { label: "Terms & Conditions", path: "/terms" },
          ].map(({ label, path }) => (
            <button
              key={path}
              type="button"
              className="w-full text-left text-sm font-medium py-2 px-3 rounded-xl transition-all hover:bg-white/5"
              style={{ color: "#a78bfa" }}
              onClick={() => navigate(path)}
            >
              {label} →
            </button>
          ))}
        </div>

        {/* Footer */}
        <div className="text-center pt-2 pb-4">
          <p className="text-xs" style={{ color: "#334155" }}>
            © {new Date().getFullYear()}{" "}
            <a
              href={`https://caffeine.ai?utm_source=caffeine-footer&utm_medium=referral&utm_content=${encodeURIComponent(typeof window !== "undefined" ? window.location.hostname : "")}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "#7c3aed" }}
            >
              caffeine.ai
            </a>
          </p>
        </div>
      </motion.div>
    </div>
  );
}
