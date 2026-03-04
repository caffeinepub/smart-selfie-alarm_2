import { Button } from "@/components/ui/button";
import { AlarmClock, Eye } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAlarms } from "../hooks/useAlarms";

function createBeepAudio(): (() => void) | null {
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioContextClass) return null;
    const audioCtx = new AudioContextClass();

    function playBeep() {
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      oscillator.frequency.value = 880;
      oscillator.type = "sine";
      gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(
        0.001,
        audioCtx.currentTime + 0.5,
      );
      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.5);
    }

    return playBeep;
  } catch {
    return null;
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
  const { activeAlarm } = useAlarms();
  const audioIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const playBeepRef = useRef<(() => void) | null>(null);
  const now = useCurrentTime();

  const timeStr = now.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  useEffect(() => {
    playBeepRef.current = createBeepAudio();

    // Start alarm sound loop
    const startBeeping = () => {
      if (playBeepRef.current) {
        playBeepRef.current();
      }
    };

    startBeeping();
    audioIntervalRef.current = setInterval(startBeeping, 1000);

    return () => {
      if (audioIntervalRef.current) clearInterval(audioIntervalRef.current);
    };
  }, []);

  // If no active alarm, go back to dashboard
  useEffect(() => {
    if (!activeAlarm) {
      navigate("/dashboard", { replace: true });
    }
  }, [activeAlarm, navigate]);

  const handleVerify = () => {
    if (audioIntervalRef.current) clearInterval(audioIntervalRef.current);
    navigate("/verify");
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
          <p
            className="text-sm font-semibold uppercase tracking-widest mb-2"
            style={{ color: "#94a3b8" }}
          >
            Time to Wake Up!
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
          {activeAlarm && (
            <p className="text-sm mt-2" style={{ color: "#64748b" }}>
              {activeAlarm.sound} · Verification required
            </p>
          )}
        </div>

        {/* Verify button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Button
            className="btn-neon h-14 px-10 text-base font-semibold rounded-2xl gap-2"
            style={{
              boxShadow: "0 0 30px rgba(124,58,237,0.5)",
            }}
            onClick={handleVerify}
            data-ocid="trigger.verify_button"
          >
            <Eye className="w-5 h-5" />
            Verify I&apos;m Awake
          </Button>
        </motion.div>

        <p
          className="text-xs text-center max-w-xs"
          style={{ color: "#334155" }}
        >
          Complete the face verification to dismiss the alarm
        </p>
      </motion.div>
    </div>
  );
}
