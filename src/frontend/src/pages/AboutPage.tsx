import {
  AlarmClock,
  Brain,
  Cpu,
  Eye,
  Flame,
  Lock,
  Scan,
  Shield,
} from "lucide-react";
import { motion } from "motion/react";

const features = [
  {
    icon: Scan,
    title: "Face Detection",
    desc: "Advanced AI face mesh technology detects your facial landmarks in real-time to verify you're truly awake.",
    color: "#7c3aed",
    bg: "rgba(124,58,237,0.12)",
  },
  {
    icon: Flame,
    title: "Wake-Up Streaks",
    desc: "Build consistent morning habits with streak tracking. See your consecutive days of successful wake-ups.",
    color: "#f59e0b",
    bg: "rgba(245,158,11,0.12)",
  },
  {
    icon: Brain,
    title: "Smart Verification",
    desc: "Multi-step face tasks including eye blinks, head turns, smiles, and more to guarantee wakefulness.",
    color: "#6366f1",
    bg: "rgba(99,102,241,0.12)",
  },
  {
    icon: Shield,
    title: "Privacy First",
    desc: "All face detection runs entirely on your device. No images or biometric data are ever stored or transmitted.",
    color: "#10b981",
    bg: "rgba(16,185,129,0.12)",
  },
];

const techStack = [
  { label: "AI Engine", value: "MediaPipe Face Mesh", icon: Eye },
  { label: "Backend", value: "ICP / Motoko", icon: Cpu },
  { label: "Auth", value: "Firebase Authentication", icon: Lock },
  { label: "Frontend", value: "React + TypeScript", icon: Brain },
];

export default function AboutPage() {
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
          {/* Version badge */}
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
            AI-Powered Wake-Up Verification
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
            Smart Selfie Alarm is an AI powered alarm system designed to ensure
            that users truly wake up by completing face verification tasks. The
            app uses modern AI technology to detect facial actions and prevent
            users from dismissing alarms without waking up.
          </p>
          <p
            className="text-sm leading-relaxed mt-3"
            style={{ color: "#94a3b8" }}
          >
            Say goodbye to hitting snooze and going back to sleep. Our
            multi-step face verification ensures you&apos;re genuinely alert —
            blinking, smiling, turning your head — before your alarm can be
            dismissed.
          </p>
        </motion.div>

        {/* Features */}
        <div>
          <h2 className="text-lg font-bold text-white mb-3">Features</h2>
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

        {/* Developer info */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.5 }}
          className="glass-card p-5"
        >
          <h2 className="text-lg font-bold text-white mb-3">Developer</h2>
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
                href="mailto:smartselfiealarm123@gmail.com"
                className="text-xs"
                style={{ color: "#7c3aed" }}
              >
                smartselfiealarm123@gmail.com
              </a>
            </div>
          </div>
        </motion.div>

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
