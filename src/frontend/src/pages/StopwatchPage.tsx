import { Button } from "@/components/ui/button";
import { AnimatePresence, motion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";

interface LapEntry {
  lapNumber: number;
  lapTime: number; // ms for this lap split
  totalTime: number; // ms total at this lap
}

function formatMs(ms: number): string {
  const totalMs = Math.max(0, ms);
  const minutes = Math.floor(totalMs / 60000);
  const secs = Math.floor((totalMs % 60000) / 1000);
  const centisecs = Math.floor((totalMs % 1000) / 10);
  return `${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}:${String(centisecs).padStart(2, "0")}`;
}

export default function StopwatchPage() {
  const [isRunning, setIsRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [laps, setLaps] = useState<LapEntry[]>([]);
  const startTimeRef = useRef<number>(0);
  const accumulatedRef = useRef<number>(0);
  const rafRef = useRef<number | null>(null);
  const lastLapTotalRef = useRef<number>(0);

  const tick = useCallback(() => {
    const now = Date.now();
    const current = accumulatedRef.current + (now - startTimeRef.current);
    setElapsed(current);
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  const handleStart = useCallback(() => {
    startTimeRef.current = Date.now();
    setIsRunning(true);
    rafRef.current = requestAnimationFrame(tick);
  }, [tick]);

  const handlePause = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    accumulatedRef.current += Date.now() - startTimeRef.current;
    setIsRunning(false);
  }, []);

  const handleReset = useCallback(() => {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    accumulatedRef.current = 0;
    lastLapTotalRef.current = 0;
    setElapsed(0);
    setIsRunning(false);
    setLaps([]);
  }, []);

  const handleLap = useCallback(() => {
    if (!isRunning) return;
    const now = Date.now();
    const total = accumulatedRef.current + (now - startTimeRef.current);
    const lapTime = total - lastLapTotalRef.current;
    lastLapTotalRef.current = total;
    setLaps((prev) => [
      {
        lapNumber: prev.length + 1,
        lapTime,
        totalTime: total,
      },
      ...prev,
    ]);
  }, [isRunning]);

  useEffect(() => {
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  const hasStarted = elapsed > 0 || isRunning;

  return (
    <div
      className="min-h-full flex flex-col pb-24"
      style={{ backgroundColor: "#0a0a0f" }}
      data-ocid="stopwatch.page"
    >
      {/* Header */}
      <div className="px-6 pt-8 pb-4">
        <h1 className="text-2xl font-bold text-white">Stopwatch</h1>
        <p className="text-sm mt-0.5" style={{ color: "#64748b" }}>
          Track elapsed time and laps
        </p>
      </div>

      <div className="flex-1 flex flex-col items-center px-4 pb-8">
        {/* Time display */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex flex-col items-center justify-center py-10"
        >
          <div
            className="px-8 py-6 rounded-3xl"
            style={{
              background: "rgba(124,58,237,0.06)",
              border: "1px solid rgba(124,58,237,0.15)",
            }}
          >
            <p
              className="text-6xl font-bold font-mono tabular-nums tracking-tight"
              style={{
                background: "linear-gradient(135deg, #f8fafc, #a78bfa)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                minWidth: "280px",
                textAlign: "center",
              }}
            >
              {formatMs(elapsed)}
            </p>
            <p
              className="text-xs text-center mt-2"
              style={{ color: "#334155" }}
            >
              MM : SS : ms
            </p>
          </div>

          {isRunning && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-1.5 mt-3"
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
        </motion.div>

        {/* Controls */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex gap-3 w-full max-w-sm mb-6"
        >
          {!hasStarted && (
            <Button
              className="flex-1 h-12 rounded-2xl font-semibold btn-neon"
              onClick={handleStart}
              data-ocid="stopwatch.start_button"
            >
              Start
            </Button>
          )}

          {isRunning && (
            <>
              <Button
                className="flex-1 h-12 rounded-2xl font-semibold"
                style={{
                  background: "rgba(245,158,11,0.15)",
                  border: "1px solid rgba(245,158,11,0.3)",
                  color: "#f59e0b",
                }}
                onClick={handlePause}
                data-ocid="stopwatch.pause_button"
              >
                Pause
              </Button>
              <Button
                className="flex-1 h-12 rounded-2xl font-semibold"
                style={{
                  background: "rgba(99,102,241,0.15)",
                  border: "1px solid rgba(99,102,241,0.3)",
                  color: "#a78bfa",
                }}
                onClick={handleLap}
                data-ocid="stopwatch.lap_button"
              >
                Lap
              </Button>
            </>
          )}

          {hasStarted && !isRunning && (
            <>
              <Button
                className="flex-1 h-12 rounded-2xl font-semibold btn-neon"
                onClick={handleStart}
                data-ocid="stopwatch.start_button"
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
                data-ocid="stopwatch.reset_button"
              >
                Reset
              </Button>
            </>
          )}
        </motion.div>

        {/* Lap list */}
        <AnimatePresence>
          {laps.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="w-full max-w-sm"
              data-ocid="stopwatch.lap_list"
            >
              {/* Header */}
              <div className="flex items-center justify-between px-1 mb-2">
                <span
                  className="text-xs font-semibold uppercase tracking-widest"
                  style={{ color: "#64748b" }}
                >
                  Laps
                </span>
                <span className="text-xs" style={{ color: "#334155" }}>
                  {laps.length} recorded
                </span>
              </div>

              <div className="space-y-2">
                {laps.map((lap, idx) => {
                  const position = laps.length - idx;
                  return (
                    <motion.div
                      key={lap.lapNumber}
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.25 }}
                      className="glass-card-sm flex items-center justify-between px-4 py-3"
                      data-ocid={`stopwatch.item.${position}`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold"
                          style={{
                            background:
                              idx === 0
                                ? "linear-gradient(135deg, #7c3aed, #6366f1)"
                                : "rgba(255,255,255,0.06)",
                            color: idx === 0 ? "white" : "#64748b",
                          }}
                        >
                          {lap.lapNumber}
                        </div>
                        <div>
                          <p className="text-xs font-medium text-white font-mono">
                            {formatMs(lap.lapTime)}
                          </p>
                          <p className="text-xs" style={{ color: "#475569" }}>
                            Split
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p
                          className="text-xs font-medium font-mono"
                          style={{ color: "#94a3b8" }}
                        >
                          {formatMs(lap.totalTime)}
                        </p>
                        <p className="text-xs" style={{ color: "#334155" }}>
                          Total
                        </p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
