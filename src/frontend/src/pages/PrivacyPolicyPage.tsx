import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { motion } from "motion/react";
import { useNavigate } from "react-router-dom";

const sections = [
  {
    title: "Data Collection",
    content:
      "Smart Selfie Alarm collects only the minimum data required to provide the alarm and verification service. This includes your email address (for account creation), display name, and alarm settings (time, repeat days, verification mode). We do not collect or store biometric data of any kind.",
  },
  {
    title: "Camera & Face Detection",
    content:
      "All face detection and analysis in Smart Selfie Alarm runs entirely on your device using MediaPipe, a local machine-learning library. No camera frames, facial images, or biometric features are ever uploaded to our servers or any third-party service. Your face data never leaves your device.",
  },
  {
    title: "Account Data",
    content:
      "Account information (email, display name) is stored securely using Firebase Authentication. Alarm data (time, settings, preferences) is stored in Firestore, a secure cloud database. This data is private to your account and is never shared with third parties for advertising or profiling purposes.",
  },
  {
    title: "Third-Party Services (Firebase)",
    content:
      "We use Google Firebase for authentication and data storage. Firebase is subject to Google's privacy policy (policies.google.com/privacy). We use Firebase Analytics to understand aggregate app usage patterns. No personally identifying information is sent to analytics. You can opt out by disabling analytics in your browser.",
  },
  {
    title: "Data Security",
    content:
      "All data in transit is encrypted using TLS. Firestore access is restricted by security rules so that only you can read or modify your own alarm data. We regularly review our security practices and apply updates promptly.",
  },
  {
    title: "Data Deletion",
    content:
      "You can delete your account and all associated data at any time by contacting us at smartselfiealarm123@gmail.com. Upon request, we will permanently delete your account data from our systems within 30 days.",
  },
  {
    title: "Contact",
    content:
      "If you have any questions, concerns, or requests regarding your privacy, please contact us at smartselfiealarm123@gmail.com. We are committed to addressing your privacy concerns promptly.",
  },
];

export default function PrivacyPolicyPage() {
  const navigate = useNavigate();

  return (
    <div
      className="min-h-full"
      style={{ backgroundColor: "#0a0a0f" }}
      data-ocid="privacy.page"
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
          <h1 className="text-lg font-bold text-white">Privacy Policy</h1>
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
            Smart Selfie Alarm is committed to protecting your privacy. This
            policy describes what data we collect, how we use it, and your
            rights as a user. By using this app you agree to this policy.
          </p>
          <div
            className="mt-3 px-3 py-2 rounded-xl flex items-start gap-2"
            style={{
              background: "rgba(16,185,129,0.08)",
              border: "1px solid rgba(16,185,129,0.2)",
            }}
          >
            <span className="text-lg leading-none mt-0.5">🛡️</span>
            <p className="text-xs font-medium" style={{ color: "#10b981" }}>
              All face detection runs on-device. No biometric data is ever
              stored or transmitted.
            </p>
          </div>
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

        {/* Footer */}
        <div className="text-center pt-2 pb-4">
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
      </motion.div>
    </div>
  );
}
