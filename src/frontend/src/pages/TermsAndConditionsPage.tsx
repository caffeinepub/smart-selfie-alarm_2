import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { motion } from "motion/react";
import { useNavigate } from "react-router-dom";

const sections = [
  {
    title: "Service Description",
    content:
      "Smart Selfie Alarm is a productivity mobile application designed to help users wake up using verification challenges such as selfie verification.",
  },
  {
    title: "User Responsibility",
    content:
      "Users are responsible for maintaining the confidentiality of their account credentials and ensuring that the information provided during registration is accurate.",
  },
  {
    title: "Subscriptions",
    content:
      "The application may offer subscription plans that renew automatically unless cancelled by the user.",
  },
  {
    title: "Prohibited Use",
    content:
      "Users must not misuse the application, attempt to bypass verification systems, or interfere with the service functionality.",
  },
  {
    title: "Modification of Service",
    content:
      "We reserve the right to update or modify features of the application at any time to improve the service.",
  },
  {
    title: "Contact",
    content:
      "For any questions regarding these terms contact support@smartselfiealarm.com",
  },
];

export default function TermsAndConditionsPage() {
  const navigate = useNavigate();

  return (
    <div
      className="min-h-full"
      style={{ backgroundColor: "#0a0a0f" }}
      data-ocid="terms.page"
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
          <h1 className="text-lg font-bold text-white">Terms & Conditions</h1>
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
            By using Smart Selfie Alarm you agree to the following terms.
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
            { label: "Refund Policy", path: "/refund" },
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
