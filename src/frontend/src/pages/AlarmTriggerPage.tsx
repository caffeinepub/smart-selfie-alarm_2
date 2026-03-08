import { Button } from "@/components/ui/button";
import { AlarmClock, Eye, Moon } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAlarms } from "../hooks/useAlarms";
import {
  playAlarmSound,
  playAlarmSoundFromUrl,
  stopAlarmSound,
} from "../lib/alarmSounds";

function getAlarmVolume(): number {
  try {
    return Number(localStorage.getItem("alarmVolume") ?? "80") / 100;
  } catch {
    return 0.8;
  }
}

function isSnoozeEnabled(): boolean {
  try {
    return localStorage.getItem("snoozeEnabled") === "true";
  } catch {
    return false;
  }
}

function useCurrentTime() {
  const [time, setTime] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return time;
}

export default function AlarmTriggerPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isTestMode = searchParams.get("test") === "true";

  const { activeAlarm, dismissActiveAlarm } = useAlarms();
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  const now = useCurrentTime();
  const [snoozed, setSnoozed] = useState(false);
  const snoozeEnabled = isSnoozeEnabled();

  // In test mode the alarm sound starts after a 5-second delay
  const [testCountdown, setTestCountdown] = useState(isTestMode ? 5 : 0);
  const [testStarted, setTestStarted] = useState(!isTestMode);

  const timeStr = now.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  const stopSound = () => {
    stopAlarmSound();
    if (audioElementRef.current) {
      audioElementRef.current.pause();
      audioElementRef.current = null;
    }
  };

  // Test mode: 5-second countdown before playing the alarm
  useEffect(() => {
    if (!isTestMode) return;
    if (testCountdown <= 0) {
      setTestStarted(true);
      return;
    }
    const t = setTimeout(() => setTestCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [isTestMode, testCountdown]);

  // Play alarm sound once test starts (or immediately for real alarms)
  const soundIdRef = useRef(activeAlarm?.sound ?? "default");
  const soundUrlRef = useRef(activeAlarm?.soundUrl);

  useEffect(() => {
    if (!testStarted) return;
    const volume = getAlarmVolume();
    const soundId = soundIdRef.current;
    const soundUrl = soundUrlRef.current;

    if (soundUrl) {
      audioElementRef.current = playAlarmSoundFromUrl(soundUrl, volume);
    } else {
      playAlarmSound(soundId, volume, true);
    }

    // No cleanup here — sound must persist across navigation to /verify
    return () => {};
  }, [testStarted]);

  // If no active alarm and not in test mode, go back to dashboard
  useEffect(() => {
    if (!isTestMode && !activeAlarm) {
      navigate("/dashboard", { replace: true });
    }
  }, [activeAlarm, isTestMode, navigate]);

  const handleVerify = () => {
    if (isTestMode) {
      navigate("/verify?test=true");
    } else {
      navigate("/verify");
    }
  };

  const handleSnooze = () => {
    stopSound();
    setSnoozed(true);
    if (!isTestMode) {
      dismissActiveAlarm();
    }

    // Store snooze end time for potential re-trigger logic
    const snoozeUntil = Date.now() + 5 * 60 * 1000;
    try {
      localStorage.setItem("snoozeUntil", String(snoozeUntil));
    } catch {
      // ignore
    }

    navigate("/home");
  };

  const handleCancelTest = () => {
    stopSound();
    navigate("/home");
  };

  return (
    <div
      className="fixed inset-0 flex flex-col items-center justify-center overflow-hidden"
      style={{ backgroundColor: "#0a0a0f" }}
      data-ocid="trigger.page"
    >
      {/* Background radial glow */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 70% 70% at 50% 50%, rgba(124,58,237,0.08) 0%, transparent 70%)",
        }}
      />

      {/* Expanding rings */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div
          className="ring-expand absolute rounded-full"
          style={{
            width: "280px",
            height: "280px",
            border: "2px solid rgba(124,58,237,0.4)",
          }}
        />
        <div
          className="ring-expand-2 absolute rounded-full"
          style={{
            width: "280px",
            height: "280px",
            border: "1.5px solid rgba(99,102,241,0.3)",
          }}
        />
        <div
          className="ring-expand-3 absolute rounded-full"
          style={{
            width: "280px",
            height: "280px",
            border: "1px solid rgba(124,58,237,0.2)",
          }}
        />
      </div>

      {/* Pulsing center */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="flex flex-col items-center gap-8 relative z-10"
      >
        {/* Alarm icon */}
        <div className="relative">
          <div
            className="pulse-neon w-32 h-32 rounded-full flex items-center justify-center"
            style={{
              background: "linear-gradient(135deg, #7c3aed, #6366f1)",
            }}
          >
            <AlarmClock className="w-16 h-16 text-white" />
          </div>
        </div>

        {/* Wake up text */}
        <div className="text-center">
          {isTestMode && !testStarted ? (
            <>
              <p
                className="text-sm font-semibold uppercase tracking-widest mb-2"
                style={{ color: "#94a3b8" }}
              >
                Test Alarm Starting In
              </p>
              <p
                className="text-7xl font-bold tracking-tight font-display"
                style={{
                  background: "linear-gradient(135deg, #e2e8f0, #a78bfa)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                {testCountdown}
              </p>
              <p className="text-sm mt-2" style={{ color: "#64748b" }}>
                Get ready to take a selfie
              </p>
            </>
          ) : (
            <>
              <p
                className="text-sm font-semibold uppercase tracking-widest mb-2"
                style={{ color: "#94a3b8" }}
              >
                {isTestMode ? "Test Alarm" : "Time to Wake Up!"}
              </p>
              <p
                className="text-7xl font-bold tracking-tight font-display"
                style={{
                  background: "linear-gradient(135deg, #e2e8f0, #a78bfa)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                {timeStr}
              </p>
              <p className="text-sm mt-2" style={{ color: "#64748b" }}>
                {isTestMode
                  ? "Take a selfie to stop the alarm"
                  : activeAlarm
                    ? `${activeAlarm.sound} · Verification required`
                    : "Verification required"}
              </p>
            </>
          )}
        </div>

        {/* Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="flex flex-col items-center gap-3 w-full px-8"
        >
          {testStarted && (
            <Button
              className="btn-neon h-14 w-full text-base font-semibold rounded-2xl gap-2"
              style={{
                boxShadow: "0 0 30px rgba(124,58,237,0.5)",
              }}
              onClick={handleVerify}
              data-ocid="trigger.verify_button"
            >
              <Eye className="w-5 h-5" />
              {isTestMode ? "Take Selfie to Stop" : "Verify I'm Awake"}
            </Button>
          )}

          {!isTestMode && snoozeEnabled && !snoozed && (
            <Button
              variant="outline"
              className="h-11 w-full rounded-2xl font-medium gap-2 border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white"
              onClick={handleSnooze}
              data-ocid="trigger.snooze_button"
            >
              <Moon className="w-4 h-4" />
              Snooze 5 minutes
            </Button>
          )}

          {isTestMode && (
            <button
              type="button"
              className="text-sm font-medium mt-1"
              style={{ color: "#475569" }}
              onClick={handleCancelTest}
              data-ocid="trigger.cancel_test_button"
            >
              Cancel test
            </button>
          )}
        </motion.div>

        <p
          className="text-xs text-center max-w-xs"
          style={{ color: "#334155" }}
        >
          {isTestMode
            ? "This is a test — nothing will be saved"
            : "Complete the face verification to dismiss the alarm"}
        </p>
      </motion.div>
    </div>
  );
}
