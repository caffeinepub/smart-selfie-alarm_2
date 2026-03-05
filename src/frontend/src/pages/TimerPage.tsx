import { Button } from "@/components/ui/button";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { playAlarmSound, stopAlarmSound } from "../lib/alarmSounds";

function padNum(n: number, len = 2) {
  return String(n).padStart(len, "0");
}

function formatTime(totalSeconds: number) {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${padNum(h)}:${padNum(m)}:${padNum(s)}`;
}

type TimerState = "idle" | "running" | "paused" | "finished";

export default function TimerPage() {
  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(5);
  const [seconds, setSeconds] = useState(0);
  const [timerState, setTimerState] = useState<TimerState>("idle");
  const [remaining, setRemaining] = useState(0);
  const [totalDuration, setTotalDuration] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const remainingRef = useRef(0);

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      stopAlarmSound();
    };
  }, []);

  const totalConfiguredSeconds = hours * 3600 + minutes * 60 + seconds;

  const handleStart = () => {
    const total = timerState === "paused" ? remaining : totalConfiguredSeconds;
    if (total <= 0) return;

    if (timerState === "idle") {
      setTotalDuration(total);
      setRemaining(total);
      remainingRef.current = total;
    } else {
      remainingRef.current = remaining;
    }

    setTimerState("running");

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    intervalRef.current = setInterval(() => {
      remainingRef.current -= 1;
      setRemaining(remainingRef.current);
      if (remainingRef.current <= 0) {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        setTimerState("finished");
        playAlarmSound("default", 0.7, true);
      }
    }, 1000);
  };

  const handlePause = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setTimerState("paused");
  };

  const handleReset = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    stopAlarmSound();
    setTimerState("idle");
    setRemaining(0);
    setTotalDuration(0);
    remainingRef.current = 0;
  };

  const handleStopSound = () => {
    stopAlarmSound();
    setTimerState("idle");
    setRemaining(0);
    setTotalDuration(0);
    remainingRef.current = 0;
  };

  const displaySeconds =
    timerState === "idle" ? totalConfiguredSeconds : remaining;
  const progress =
    totalDuration > 0 ? Math.max(0, Math.min(1, remaining / totalDuration)) : 0;

  // SVG ring params
  const size = 260;
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset =
    circumference * (1 - (timerState === "idle" ? 1 : progress));

  const clampNum = (val: number, min: number, max: number) =>
    Math.max(min, Math.min(max, val));

  return (
    <div
      className="min-h-full flex flex-col pb-24"
      style={{ backgroundColor: "#0a0a0f" }}
      data-ocid="timer.page"
    >
      {/* Header */}
      <div className="px-6 pt-8 pb-4">
        <h1 className="text-2xl font-bold text-white">Timer</h1>
        <p className="text-sm mt-0.5" style={{ color: "#64748b" }}>
          Set a countdown timer
        </p>
      </div>

      <div className="flex-1 flex flex-col items-center px-4 pb-8 gap-8">
        {/* Circular countdown ring */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="relative flex items-center justify-center"
          style={{ width: size, height: size }}
        >
          {/* Background ring */}
          <svg
            width={size}
            height={size}
            className="absolute top-0 left-0"
            style={{ transform: "rotate(-90deg)" }}
            aria-hidden="true"
          >
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke="rgba(255,255,255,0.05)"
              strokeWidth={strokeWidth}
            />
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke="url(#timerGradient)"
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              style={{ transition: "stroke-dashoffset 0.9s linear" }}
            />
            <defs>
              <linearGradient
                id="timerGradient"
                x1="0%"
                y1="0%"
                x2="100%"
                y2="100%"
              >
                <stop offset="0%" stopColor="#7c3aed" />
                <stop offset="100%" stopColor="#6366f1" />
              </linearGradient>
            </defs>
          </svg>

          {/* Center content */}
          <div className="relative z-10 flex flex-col items-center gap-1">
            <AnimatePresence mode="wait">
              {timerState === "finished" ? (
                <motion.div
                  key="finished"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-center"
                >
                  <p
                    className="text-2xl font-bold"
                    style={{ color: "#a78bfa" }}
                  >
                    Time&apos;s Up!
                  </p>
                  <p className="text-xs mt-1" style={{ color: "#64748b" }}>
                    🔔 Alarm ringing
                  </p>
                </motion.div>
              ) : (
                <motion.p
                  key="time"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-5xl font-bold font-mono tracking-tight"
                  style={{
                    background: "linear-gradient(135deg, #f8fafc, #a78bfa)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  }}
                >
                  {formatTime(displaySeconds)}
                </motion.p>
              )}
            </AnimatePresence>

            {timerState === "running" && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center gap-1.5"
              >
                <div
                  className="w-1.5 h-1.5 rounded-full"
                  style={{
                    background: "#22d07a",
                    boxShadow: "0 0 6px #22d07a",
                  }}
                />
                <span
                  className="text-xs font-medium"
                  style={{ color: "#22d07a" }}
                >
                  Running
                </span>
              </motion.div>
            )}
            {timerState === "paused" && (
              <span
                className="text-xs font-medium"
                style={{ color: "#f59e0b" }}
              >
                Paused
              </span>
            )}
          </div>
        </motion.div>

        {/* Input section — only when idle */}
        <AnimatePresence>
          {timerState === "idle" && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3 }}
              className="glass-card p-5 w-full max-w-sm"
            >
              <p
                className="text-xs font-semibold text-center mb-4"
                style={{ color: "#64748b" }}
              >
                Set duration
              </p>
              <div className="flex items-end justify-center gap-3">
                {/* Hours */}
                <div className="flex flex-col items-center gap-1.5">
                  <button
                    type="button"
                    className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-lg font-bold transition-all active:scale-95"
                    style={{ background: "rgba(124,58,237,0.15)" }}
                    onClick={() => setHours((h) => clampNum(h + 1, 0, 23))}
                  >
                    ▲
                  </button>
                  <input
                    type="number"
                    min={0}
                    max={23}
                    value={hours}
                    onChange={(e) =>
                      setHours(clampNum(Number(e.target.value), 0, 23))
                    }
                    className="w-16 text-center text-3xl font-bold font-mono rounded-xl py-2 outline-none"
                    style={{
                      background: "rgba(124,58,237,0.1)",
                      border: "1px solid rgba(124,58,237,0.25)",
                      color: "#f8fafc",
                      colorScheme: "dark",
                    }}
                    data-ocid="timer.hours_input"
                  />
                  <span
                    className="text-xs font-medium"
                    style={{ color: "#475569" }}
                  >
                    HRS
                  </span>
                  <button
                    type="button"
                    className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-lg font-bold transition-all active:scale-95"
                    style={{ background: "rgba(124,58,237,0.15)" }}
                    onClick={() => setHours((h) => clampNum(h - 1, 0, 23))}
                  >
                    ▼
                  </button>
                </div>

                <span
                  className="text-3xl font-bold mb-8"
                  style={{ color: "#334155" }}
                >
                  :
                </span>

                {/* Minutes */}
                <div className="flex flex-col items-center gap-1.5">
                  <button
                    type="button"
                    className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-lg font-bold transition-all active:scale-95"
                    style={{ background: "rgba(124,58,237,0.15)" }}
                    onClick={() => setMinutes((m) => clampNum(m + 1, 0, 59))}
                  >
                    ▲
                  </button>
                  <input
                    type="number"
                    min={0}
                    max={59}
                    value={minutes}
                    onChange={(e) =>
                      setMinutes(clampNum(Number(e.target.value), 0, 59))
                    }
                    className="w-16 text-center text-3xl font-bold font-mono rounded-xl py-2 outline-none"
                    style={{
                      background: "rgba(124,58,237,0.1)",
                      border: "1px solid rgba(124,58,237,0.25)",
                      color: "#f8fafc",
                      colorScheme: "dark",
                    }}
                    data-ocid="timer.minutes_input"
                  />
                  <span
                    className="text-xs font-medium"
                    style={{ color: "#475569" }}
                  >
                    MIN
                  </span>
                  <button
                    type="button"
                    className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-lg font-bold transition-all active:scale-95"
                    style={{ background: "rgba(124,58,237,0.15)" }}
                    onClick={() => setMinutes((m) => clampNum(m - 1, 0, 59))}
                  >
                    ▼
                  </button>
                </div>

                <span
                  className="text-3xl font-bold mb-8"
                  style={{ color: "#334155" }}
                >
                  :
                </span>

                {/* Seconds */}
                <div className="flex flex-col items-center gap-1.5">
                  <button
                    type="button"
                    className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-lg font-bold transition-all active:scale-95"
                    style={{ background: "rgba(124,58,237,0.15)" }}
                    onClick={() => setSeconds((s) => clampNum(s + 1, 0, 59))}
                  >
                    ▲
                  </button>
                  <input
                    type="number"
                    min={0}
                    max={59}
                    value={seconds}
                    onChange={(e) =>
                      setSeconds(clampNum(Number(e.target.value), 0, 59))
                    }
                    className="w-16 text-center text-3xl font-bold font-mono rounded-xl py-2 outline-none"
                    style={{
                      background: "rgba(124,58,237,0.1)",
                      border: "1px solid rgba(124,58,237,0.25)",
                      color: "#f8fafc",
                      colorScheme: "dark",
                    }}
                    data-ocid="timer.seconds_input"
                  />
                  <span
                    className="text-xs font-medium"
                    style={{ color: "#475569" }}
                  >
                    SEC
                  </span>
                  <button
                    type="button"
                    className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-lg font-bold transition-all active:scale-95"
                    style={{ background: "rgba(124,58,237,0.15)" }}
                    onClick={() => setSeconds((s) => clampNum(s - 1, 0, 59))}
                  >
                    ▼
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Controls */}
        <div className="flex gap-3 w-full max-w-sm">
          {timerState === "idle" && (
            <Button
              className="flex-1 h-12 rounded-2xl font-semibold btn-neon"
              onClick={handleStart}
              disabled={totalConfiguredSeconds === 0}
              data-ocid="timer.start_button"
            >
              Start
            </Button>
          )}

          {timerState === "running" && (
            <>
              <Button
                className="flex-1 h-12 rounded-2xl font-semibold"
                style={{
                  background: "rgba(245,158,11,0.15)",
                  border: "1px solid rgba(245,158,11,0.3)",
                  color: "#f59e0b",
                }}
                onClick={handlePause}
                data-ocid="timer.pause_button"
              >
                Pause
              </Button>
              <Button
                className="flex-1 h-12 rounded-2xl font-semibold"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  color: "#94a3b8",
                }}
                onClick={handleReset}
                data-ocid="timer.reset_button"
              >
                Reset
              </Button>
            </>
          )}

          {timerState === "paused" && (
            <>
              <Button
                className="flex-1 h-12 rounded-2xl font-semibold btn-neon"
                onClick={handleStart}
                data-ocid="timer.start_button"
              >
                Resume
              </Button>
              <Button
                className="flex-1 h-12 rounded-2xl font-semibold"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  color: "#94a3b8",
                }}
                onClick={handleReset}
                data-ocid="timer.reset_button"
              >
                Reset
              </Button>
            </>
          )}

          {timerState === "finished" && (
            <>
              <Button
                className="flex-1 h-12 rounded-2xl font-semibold"
                style={{
                  background: "rgba(239,68,68,0.15)",
                  border: "1px solid rgba(239,68,68,0.3)",
                  color: "#ef4444",
                }}
                onClick={handleStopSound}
                data-ocid="timer.stop_sound_button"
              >
                🔕 Stop Sound
              </Button>
              <Button
                className="flex-1 h-12 rounded-2xl font-semibold"
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  color: "#94a3b8",
                }}
                onClick={handleReset}
                data-ocid="timer.reset_button"
              >
                Reset
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
