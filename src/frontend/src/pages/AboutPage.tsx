import {
  AlarmClock,
  Bell,
  Brain,
  CalendarDays,
  Cpu,
  Eye,
  Lock,
  Scan,
  Shield,
  Smartphone,
} from "lucide-react";
import { motion } from "motion/react";
import { useNavigate } from "react-router-dom";

const features = [
  {
    icon: Scan,
    title: "Selfie Verification Alarm",
    desc: "Stop the alarm only after taking a verified selfie. Ensures you are truly awake.",
    color: "#7c3aed",
    bg: "rgba(124,58,237,0.12)",
  },
  {
    icon: Eye,
    title: "Live Face Detection",
    desc: "Smart detection ensures the user is awake before dismissing the alarm.",
    color: "#6366f1",
    bg: "rgba(99,102,241,0.12)",
  },
  {
    icon: CalendarDays,
    title: "Multiple Alarm Scheduling",
    desc: "Set alarms for different days and routines with flexible repeat options.",
    color: "#f59e0b",
    bg: "rgba(245,158,11,0.12)",
  },
  {
    icon: Smartphone,
    title: "Clean Mobile Friendly Interface",
    desc: "Designed for a smooth experience on smartphones with a modern premium UI.",
    color: "#10b981",
    bg: "rgba(16,185,129,0.12)",
  },
  {
    icon: Brain,
    title: "Smart Productivity Tool",
    desc: "Helps build better morning habits and maintain a disciplined daily routine.",
    color: "#3b82f6",
    bg: "rgba(59,130,246,0.12)",
  },
  {
    icon: Shield,
    title: "Privacy First",
    desc: "All face detection runs entirely on your device. No biometric data is ever stored or transmitted.",
    color: "#ec4899",
    bg: "rgba(236,72,153,0.12)",
  },
];

const plans = [
  { name: "7 Day Trial", price: "₹1", period: "one-time", highlight: false },
  { name: "Monthly Plan", price: "₹29", period: "per month", highlight: true },
  {
    name: "6-Month Plan",
    price: "₹150",
    period: "6 months",
    badge: "≈14% OFF",
    highlight: false,
  },
  {
    name: "Yearly Plan",
    price: "₹280",
    period: "per year",
    badge: "Best Value",
    highlight: false,
  },
];

const techStack = [
  { label: "AI Engine", value: "MediaPipe Face Mesh", icon: Eye },
  { label: "Backend", value: "ICP / Motoko", icon: Cpu },
  { label: "Auth", value: "Firebase Authentication", icon: Lock },
  { label: "Frontend", value: "React + TypeScript", icon: Brain },
];

export default function AboutPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-full" style={{ backgroundColor: "#0a0a0f" }}>
      {/* Hero */}
      <div
        className="relative overflow-hidden px-6 pt-12 pb-10"
        style={{
          background:
            "linear-gradient(180deg, rgba(124,58,237,0.1) 0%, rgba(10,10,15,0) 100%)",
        }}
      >
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 70% 80% at 50% -10%, rgba(124,58,237,0.12) 0%, transparent 60%)",
          }}
        />
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative z-10 text-center"
        >
          <div className="flex justify-center mb-5">
            <div
              className="w-18 h-18 rounded-2xl flex items-center justify-center"
              style={{
                width: "72px",
                height: "72px",
                background: "linear-gradient(135deg, #7c3aed, #6366f1)",
                boxShadow: "0 0 32px rgba(124,58,237,0.4)",
              }}
            >
              <AlarmClock className="w-9 h-9 text-white" />
            </div>
          </div>
          <h1
            className="text-3xl font-bold mb-2"
            style={{
              background: "linear-gradient(135deg, #f8fafc, #a78bfa)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            Smart Selfie Alarm
          </h1>
          <div className="flex items-center justify-center mb-3">
            <span
              className="px-3 py-1 rounded-full text-xs font-bold"
              style={{
                background: "rgba(124,58,237,0.15)",
                border: "1px solid rgba(124,58,237,0.3)",
                color: "#a78bfa",
              }}
            >
              v1.0.0
            </span>
          </div>
          <p
            className="text-sm font-semibold uppercase tracking-widest mb-5"
            style={{ color: "#7c3aed" }}
          >
            Wake Up Smarter
          </p>
        </motion.div>
      </div>

      <div className="px-4 pb-8 space-y-5">
        {/* Description */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="glass-card p-5"
        >
          <p className="text-sm leading-relaxed" style={{ color: "#cbd5e1" }}>
            Smart Selfie Alarm is a productivity focused mobile application
            designed to help users wake up on time and build better morning
            habits.
          </p>
          <p
            className="text-sm leading-relaxed mt-3"
            style={{ color: "#94a3b8" }}
          >
            Our goal is to create a smarter alarm system that ensures users are
            truly awake instead of simply turning off the alarm and going back
            to sleep. By using selfie verification and smart face detection
            technology, the app requires users to complete a small verification
            challenge before the alarm stops.
          </p>
          <p
            className="text-sm leading-relaxed mt-3"
            style={{ color: "#94a3b8" }}
          >
            We aim to continuously improve the app by adding new features and
            providing a better experience for users who want to maintain a
            disciplined daily routine.
          </p>
        </motion.div>

        {/* Key Features */}
        <div>
          <h2 className="text-lg font-bold text-white mb-3">Key Features</h2>
          <div className="grid grid-cols-1 gap-3">
            {features.map(({ icon: Icon, title, desc, color, bg }, i) => (
              <motion.div
                key={title}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.35, delay: 0.15 + i * 0.07 }}
                className="glass-card-sm p-4 flex items-start gap-4"
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={{ background: bg }}
                >
                  <Icon className="w-5 h-5" style={{ color }} />
                </div>
                <div>
                  <p className="font-semibold text-white">{title}</p>
                  <p className="text-sm mt-0.5" style={{ color: "#94a3b8" }}>
                    {desc}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Subscription Plans */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.35 }}
        >
          <h2 className="text-lg font-bold text-white mb-3">
            Subscription Plans
          </h2>
          <div className="glass-card p-4 space-y-3">
            <p className="text-sm" style={{ color: "#94a3b8" }}>
              Users can start with a trial period and then choose a subscription
              plan for premium features.
            </p>
            {plans.map(({ name, price, period, badge, highlight }) => (
              <div
                key={name}
                className="flex items-center justify-between p-3 rounded-xl"
                style={{
                  background: highlight
                    ? "linear-gradient(135deg, rgba(124,58,237,0.2), rgba(99,102,241,0.12))"
                    : "rgba(255,255,255,0.04)",
                  border: highlight
                    ? "1px solid rgba(124,58,237,0.3)"
                    : "1px solid rgba(255,255,255,0.06)",
                }}
              >
                <div className="flex items-center gap-2">
                  <Bell
                    className="w-4 h-4 flex-shrink-0"
                    style={{ color: highlight ? "#a78bfa" : "#64748b" }}
                  />
                  <div>
                    <p
                      className="text-sm font-semibold"
                      style={{ color: highlight ? "#f1f5f9" : "#cbd5e1" }}
                    >
                      {name}
                    </p>
                    <p className="text-xs" style={{ color: "#64748b" }}>
                      {period}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {badge && (
                    <span
                      className="px-2 py-0.5 rounded-full text-xs font-bold"
                      style={{
                        background: "rgba(16,185,129,0.15)",
                        color: "#10b981",
                        border: "1px solid rgba(16,185,129,0.25)",
                      }}
                    >
                      {badge}
                    </span>
                  )}
                  <p
                    className="text-base font-bold"
                    style={{ color: highlight ? "#a78bfa" : "#e2e8f0" }}
                  >
                    {price}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Tech stack */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.4 }}
        >
          <h2 className="text-lg font-bold text-white mb-3">Technology</h2>
          <div className="glass-card p-4 grid grid-cols-2 gap-3">
            {techStack.map(({ label, value, icon: Icon }) => (
              <div
                key={label}
                className="p-3 rounded-xl"
                style={{ background: "rgba(255,255,255,0.03)" }}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <Icon className="w-3.5 h-3.5" style={{ color: "#7c3aed" }} />
                  <span
                    className="text-xs font-medium"
                    style={{ color: "#64748b" }}
                  >
                    {label}
                  </span>
                </div>
                <p className="text-sm font-semibold text-white">{value}</p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Contact */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.5 }}
          className="glass-card p-5"
        >
          <h2 className="text-lg font-bold text-white mb-3">Contact</h2>
          <div
            className="flex items-center gap-3 p-3 rounded-xl"
            style={{ background: "rgba(255,255,255,0.03)" }}
          >
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
              style={{
                background: "linear-gradient(135deg, #7c3aed, #6366f1)",
              }}
            >
              <span className="text-white font-bold text-sm">S</span>
            </div>
            <div>
              <p className="font-semibold text-white text-sm">
                Smart Selfie Alarm Team
              </p>
              <a
                href="mailto:smartselfiealarm@gmail.com"
                className="text-xs"
                style={{ color: "#7c3aed" }}
              >
                smartselfiealarm@gmail.com
              </a>
            </div>
          </div>
        </motion.div>

        {/* Legal links */}
        <div
          className="glass-card p-5 space-y-2"
          style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
        >
          <p
            className="text-xs font-semibold uppercase tracking-widest mb-3"
            style={{ color: "#475569" }}
          >
            Legal
          </p>
          {[
            { label: "Privacy Policy", path: "/privacy" },
            { label: "Terms & Conditions", path: "/terms" },
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

        {/* Footer attribution */}
        <div className="text-center pt-2">
          <p className="text-xs" style={{ color: "#334155" }}>
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
        </div>
      </div>
    </div>
  );
}
