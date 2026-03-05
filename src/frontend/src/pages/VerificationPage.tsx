import { Button } from "@/components/ui/button";
import { AlertTriangle, Camera, Loader2 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { SuccessAnimation } from "../components/SuccessAnimation";
import { TaskProgress } from "../components/TaskProgress";
import { VerificationMode } from "../context/AlarmContext";
import { useAlarms } from "../hooks/useAlarms";
import {
  TASK_ICONS,
  TASK_LABELS,
  TASK_LIST,
  useFaceDetection,
} from "../hooks/useFaceDetection";
import { useSelfieVerification } from "../hooks/useSelfieVerification";
import { stopAlarmSound } from "../lib/alarmSounds";

function getCameraFacing(): "user" | "environment" {
  try {
    return (
      (localStorage.getItem("cameraFacing") as "user" | "environment") ?? "user"
    );
  } catch {
    return "user";
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Selfie Verification View
// ─────────────────────────────────────────────────────────────────────────────

interface SelfieVerificationViewProps {
  onComplete: () => void;
}

function SelfieVerificationView({ onComplete }: SelfieVerificationViewProps) {
  const {
    videoRef,
    canvasRef,
    isDetecting,
    faceDetected,
    eyesOpen,
    canTakeSelfie,
    error,
    captureState,
    startDetection,
    stopDetection,
    takeSelfie,
  } = useSelfieVerification(onComplete);

  const [started, setStarted] = useState(false);

  useEffect(() => {
    return () => {
      stopDetection();
    };
  }, [stopDetection]);

  const handleStart = async () => {
    setStarted(true);
    await startDetection();
  };

  return (
    <div
      className="fixed inset-0 flex flex-col overflow-hidden"
      style={{ backgroundColor: "#050508" }}
      data-ocid="selfie.page"
    >
      {/* Camera feed */}
      <div
        className="relative flex-1 overflow-hidden"
        data-ocid="selfie.camera_target"
      >
        <video
          ref={videoRef}
          className="absolute inset-0 w-full h-full object-cover"
          style={{ transform: "scaleX(-1)" }}
          playsInline
          muted
        />
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full object-cover pointer-events-none"
          style={{
            transform: "scaleX(-1)",
            display: captureState === "capturing" ? "block" : "none",
          }}
        />

        {/* Cinematic gradient overlays */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "linear-gradient(to bottom, rgba(5,5,8,0.75) 0%, rgba(5,5,8,0.0) 28%, rgba(5,5,8,0.0) 55%, rgba(5,5,8,0.9) 100%)",
          }}
        />
      </div>

      {/* ── UI Overlay ── */}
      <div className="absolute inset-0 flex flex-col pointer-events-none">
        {/* Top bar — no cancel button */}
        <div className="flex items-center justify-end px-4 pt-12 pb-4 pointer-events-auto">
          {/* Status pill — top right */}
          {isDetecting && (
            <div
              className="flex items-center gap-1.5 px-3 py-2 rounded-2xl text-xs font-medium"
              style={{
                background: "rgba(5,5,8,0.65)",
                backdropFilter: "blur(12px)",
                WebkitBackdropFilter: "blur(12px)",
                border: "1px solid rgba(255,255,255,0.08)",
                color: faceDetected && eyesOpen ? "#22d07a" : "#f59e0b",
              }}
              data-ocid="selfie.face_indicator"
            >
              <div
                className="w-1.5 h-1.5 rounded-full"
                style={{
                  background: faceDetected && eyesOpen ? "#22d07a" : "#f59e0b",
                  boxShadow: `0 0 6px ${faceDetected && eyesOpen ? "#22d07a" : "#f59e0b"}`,
                }}
              />
              {faceDetected && eyesOpen
                ? "Ready to take selfie"
                : faceDetected
                  ? "Open your eyes"
                  : "Look at the camera"}
            </div>
          )}

          {started && !isDetecting && !error && (
            <div
              className="flex items-center gap-1.5 px-3 py-2 rounded-2xl text-xs font-medium"
              style={{
                background: "rgba(5,5,8,0.65)",
                backdropFilter: "blur(12px)",
                WebkitBackdropFilter: "blur(12px)",
                border: "1px solid rgba(255,255,255,0.08)",
                color: "#94a3b8",
              }}
              data-ocid="selfie.loading_state"
            >
              <Loader2
                className="w-3 h-3 animate-spin"
                style={{ color: "#7c3aed" }}
              />
              Initializing…
            </div>
          )}
        </div>

        {/* Selfie Verification label */}
        {isDetecting && (
          <div className="px-6 pointer-events-none">
            <p
              className="text-xs font-semibold uppercase tracking-widest text-center"
              style={{ color: "rgba(139,92,246,0.8)", letterSpacing: "0.18em" }}
            >
              Selfie Verification
            </p>
          </div>
        )}

        {/* Bottom panel */}
        <div
          className="pointer-events-auto px-5 pb-10 mt-auto space-y-3"
          style={{
            paddingBottom: "env(safe-area-inset-bottom, 32px)",
          }}
        >
          {/* Camera denied */}
          {error === "camera_denied" && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl p-5 text-center mb-3"
              style={{
                background: "rgba(5,5,8,0.85)",
                border: "1px solid rgba(239,68,68,0.25)",
                backdropFilter: "blur(16px)",
              }}
              data-ocid="selfie.error_state"
            >
              <Camera
                className="w-9 h-9 mx-auto mb-2.5"
                style={{ color: "#ef4444" }}
              />
              <p className="font-bold text-white mb-1">Camera Access Denied</p>
              <p className="text-sm" style={{ color: "#94a3b8" }}>
                Allow camera access in your browser settings to continue.
              </p>
            </motion.div>
          )}

          {error === "init_failed" && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl p-5 text-center mb-3"
              style={{
                background: "rgba(5,5,8,0.85)",
                border: "1px solid rgba(245,158,11,0.25)",
                backdropFilter: "blur(16px)",
              }}
              data-ocid="selfie.error_state"
            >
              <AlertTriangle
                className="w-9 h-9 mx-auto mb-2.5"
                style={{ color: "#f59e0b" }}
              />
              <p className="font-bold text-white mb-1">Detection Unavailable</p>
              <p className="text-sm" style={{ color: "#94a3b8" }}>
                Check your internet connection and try again.
              </p>
            </motion.div>
          )}

          {/* Not yet started */}
          {!started && !error && (
            <div className="space-y-3">
              <div
                className="rounded-2xl p-4 text-center"
                style={{
                  background: "rgba(5,5,8,0.75)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  backdropFilter: "blur(16px)",
                }}
              >
                <p className="text-sm font-medium" style={{ color: "#94a3b8" }}>
                  Face the camera with your eyes open, then press Take Selfie
                </p>
              </div>
              <Button
                className="w-full rounded-2xl font-bold text-white border-0 gap-2"
                style={{
                  height: "52px",
                  background:
                    "linear-gradient(135deg, #7c3aed, #6d28d9, #4f46e5)",
                  boxShadow: "0 4px 20px rgba(109,40,217,0.4)",
                  fontSize: "15px",
                }}
                onClick={handleStart}
                data-ocid="selfie.primary_button"
              >
                <Camera className="w-4 h-4" />
                Open Camera
              </Button>
            </div>
          )}

          {/* Loading */}
          {started && !isDetecting && !error && (
            <div
              className="flex items-center justify-center gap-2 py-4"
              data-ocid="selfie.loading_state"
            >
              <Loader2
                className="w-5 h-5 animate-spin"
                style={{ color: "#7c3aed" }}
              />
              <p className="text-sm font-medium" style={{ color: "#64748b" }}>
                Loading face detection…
              </p>
            </div>
          )}

          {/* Capturing overlay */}
          {captureState === "capturing" && (
            <motion.div
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center justify-center gap-2 py-3"
              data-ocid="selfie.loading_state"
            >
              <Camera
                className="w-5 h-5 animate-pulse"
                style={{ color: "#7c3aed" }}
              />
              <p className="text-sm font-semibold" style={{ color: "#a78bfa" }}>
                Verifying selfie…
              </p>
            </motion.div>
          )}

          {/* Take Selfie button — enabled when face detected + eyes open */}
          {isDetecting && captureState === "idle" && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className="space-y-2"
            >
              {/* Instruction */}
              <AnimatePresence mode="wait">
                <motion.p
                  key={canTakeSelfie ? "ready" : "wait"}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-xs text-center font-medium"
                  style={{ color: canTakeSelfie ? "#22d07a" : "#64748b" }}
                >
                  {error === "no_face"
                    ? "Look at the camera"
                    : canTakeSelfie
                      ? "✓ Face and eyes detected — press Take Selfie"
                      : "Position your face with eyes open"}
                </motion.p>
              </AnimatePresence>

              {/* Take Selfie button */}
              <motion.button
                type="button"
                className="w-full rounded-[22px] font-bold text-sm flex items-center justify-center gap-2.5 transition-all"
                style={{
                  height: "56px",
                  background: canTakeSelfie
                    ? "linear-gradient(135deg, #22d07a, #059669)"
                    : "rgba(255,255,255,0.06)",
                  boxShadow: canTakeSelfie
                    ? "0 4px 20px rgba(34,208,122,0.35)"
                    : "none",
                  color: canTakeSelfie ? "#ffffff" : "#334155",
                  border: canTakeSelfie
                    ? "none"
                    : "1px solid rgba(255,255,255,0.08)",
                  cursor: canTakeSelfie ? "pointer" : "not-allowed",
                }}
                disabled={!canTakeSelfie}
                onClick={takeSelfie}
                whileTap={canTakeSelfie ? { scale: 0.97 } : undefined}
                data-ocid="selfie.take_selfie_button"
              >
                <div
                  className="w-6 h-6 rounded-full border-2 flex items-center justify-center"
                  style={{
                    borderColor: canTakeSelfie
                      ? "rgba(255,255,255,0.6)"
                      : "#334155",
                  }}
                >
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{
                      background: canTakeSelfie ? "white" : "#334155",
                    }}
                  />
                </div>
                Take Selfie
              </motion.button>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Live Verification View
// ─────────────────────────────────────────────────────────────────────────────

interface LiveVerificationViewProps {
  onComplete: () => void;
}

function LiveVerificationView({ onComplete }: LiveVerificationViewProps) {
  const [showSuccess, setShowSuccess] = useState(false);
  const [started, setStarted] = useState(false);

  const handleComplete = async () => {
    setShowSuccess(true);
    try {
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      if (AudioContextClass) {
        const ctx = new AudioContextClass();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = 523;
        osc.type = "sine";
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1);
        osc.start();
        osc.stop(ctx.currentTime + 1);
      }
    } catch {
      /* ignore */
    }
    onComplete();
  };

  const cameraFacing = getCameraFacing();
  const {
    videoRef,
    canvasRef,
    currentTask,
    taskIndex,
    isDetecting,
    error,
    faceCount,
    selfieCapturing,
    stabilityProgress,
    startDetection,
    stopDetection,
  } = useFaceDetection(handleComplete, cameraFacing);

  useEffect(() => {
    return () => {
      stopDetection();
    };
  }, [stopDetection]);

  const handleStart = async () => {
    setStarted(true);
    await startDetection();
  };

  const taskLabel = TASK_LABELS[currentTask];
  const taskIcon = TASK_ICONS[currentTask];
  const totalTasks = TASK_LIST.length;
  const completedTasks = taskIndex;

  // Hint text
  const hintText = (() => {
    if (error === "no_face" || faceCount === 0) return "Look at the camera";
    if (error === "multiple_faces") return "Only one face allowed";
    if (error === "face_too_far") return "Move closer to the camera";
    return null;
  })();

  return (
    <div
      className="fixed inset-0 flex flex-col overflow-hidden"
      style={{ backgroundColor: "#050508" }}
      data-ocid="verify.page"
    >
      {/* Camera feed */}
      <div
        className="relative flex-1 overflow-hidden"
        data-ocid="verify.camera_target"
      >
        <video
          ref={videoRef}
          className="absolute inset-0 w-full h-full object-cover"
          style={{ transform: "scaleX(-1)" }}
          playsInline
          muted
        />
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full object-cover pointer-events-none"
          style={{ transform: "scaleX(-1)" }}
        />

        {/* Cinematic gradients */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "linear-gradient(to bottom, rgba(5,5,8,0.75) 0%, rgba(5,5,8,0.0) 28%, rgba(5,5,8,0.0) 55%, rgba(5,5,8,0.92) 100%)",
          }}
        />
      </div>

      {/* ── UI Overlay ── */}
      <div className="absolute inset-0 flex flex-col pointer-events-none">
        {/* Top bar — no cancel button */}
        <div className="flex items-center justify-end px-4 pt-12 pb-3 pointer-events-auto">
          {/* Task progress dots */}
          {isDetecting && (
            <div
              className="flex items-center gap-2 px-3 py-2 rounded-2xl"
              style={{
                background: "rgba(5,5,8,0.65)",
                backdropFilter: "blur(12px)",
                WebkitBackdropFilter: "blur(12px)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              {TASK_LIST.map((task, i) => (
                <div
                  key={task}
                  className="rounded-full transition-all duration-300"
                  style={{
                    width: i === completedTasks ? "20px" : "8px",
                    height: "8px",
                    background:
                      i < completedTasks
                        ? "#22d07a"
                        : i === completedTasks
                          ? "linear-gradient(90deg, #7c3aed, #6366f1)"
                          : "rgba(255,255,255,0.15)",
                    boxShadow:
                      i === completedTasks
                        ? "0 0 8px rgba(124,58,237,0.6)"
                        : i < completedTasks
                          ? "0 0 5px rgba(34,208,122,0.4)"
                          : "none",
                  }}
                />
              ))}
              <span
                className="text-xs font-semibold ml-0.5"
                style={{ color: "#94a3b8" }}
              >
                {completedTasks}/{totalTasks}
              </span>
            </div>
          )}

          {!isDetecting && started && (
            <div
              className="flex items-center gap-1.5 px-3 py-2 rounded-2xl text-xs"
              style={{
                background: "rgba(5,5,8,0.65)",
                backdropFilter: "blur(12px)",
                border: "1px solid rgba(255,255,255,0.08)",
                color: "#94a3b8",
              }}
            >
              <Loader2
                className="w-3 h-3 animate-spin"
                style={{ color: "#7c3aed" }}
              />
              Loading…
            </div>
          )}
        </div>

        {/* Bottom panel */}
        <div
          className="pointer-events-auto px-5 mt-auto space-y-3"
          style={{ paddingBottom: "env(safe-area-inset-bottom, 32px)" }}
        >
          {/* Camera denied */}
          {error === "camera_denied" && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl p-5 text-center mb-3"
              style={{
                background: "rgba(5,5,8,0.85)",
                border: "1px solid rgba(239,68,68,0.25)",
                backdropFilter: "blur(16px)",
              }}
              data-ocid="verify.error_state"
            >
              <Camera
                className="w-9 h-9 mx-auto mb-2.5"
                style={{ color: "#ef4444" }}
              />
              <p className="font-bold text-white mb-1">Camera Access Denied</p>
              <p className="text-sm" style={{ color: "#94a3b8" }}>
                Allow camera access in your browser settings to continue.
              </p>
            </motion.div>
          )}

          {error === "init_failed" && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl p-5 text-center mb-3"
              style={{
                background: "rgba(5,5,8,0.85)",
                border: "1px solid rgba(245,158,11,0.25)",
                backdropFilter: "blur(16px)",
              }}
              data-ocid="verify.error_state"
            >
              <AlertTriangle
                className="w-9 h-9 mx-auto mb-2.5"
                style={{ color: "#f59e0b" }}
              />
              <p className="font-bold text-white mb-1">Detection Unavailable</p>
              <p className="text-sm" style={{ color: "#94a3b8" }}>
                Check your internet connection and try again.
              </p>
            </motion.div>
          )}

          {/* Not yet started */}
          {!started && !error && (
            <div className="space-y-3">
              <div
                className="rounded-2xl p-4"
                style={{
                  background: "rgba(5,5,8,0.75)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  backdropFilter: "blur(16px)",
                }}
              >
                <p
                  className="text-xs font-semibold text-center mb-2"
                  style={{ color: "#7c6fcd" }}
                >
                  Live Verification · {totalTasks} Steps
                </p>
                <div className="flex items-center justify-center gap-3">
                  {TASK_LIST.map((task) => (
                    <div
                      key={task}
                      className="flex flex-col items-center gap-1"
                    >
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center text-lg"
                        style={{ background: "rgba(255,255,255,0.06)" }}
                      >
                        {TASK_ICONS[task]}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <Button
                className="w-full rounded-2xl font-bold text-white border-0 gap-2"
                style={{
                  height: "52px",
                  background:
                    "linear-gradient(135deg, #7c3aed, #6d28d9, #4f46e5)",
                  boxShadow: "0 4px 20px rgba(109,40,217,0.4)",
                  fontSize: "15px",
                }}
                onClick={handleStart}
                data-ocid="verify.primary_button"
              >
                <Camera className="w-4 h-4" />
                Start Verification
              </Button>
            </div>
          )}

          {/* Loading */}
          {started && !isDetecting && !error && (
            <div
              className="flex items-center justify-center gap-2 py-4"
              data-ocid="verify.loading_state"
            >
              <Loader2
                className="w-5 h-5 animate-spin"
                style={{ color: "#7c3aed" }}
              />
              <p className="text-sm font-medium" style={{ color: "#64748b" }}>
                Loading face detection…
              </p>
            </div>
          )}

          {/* Selfie capturing overlay (kept for compatibility) */}
          {selfieCapturing && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center justify-center gap-2 py-3"
              data-ocid="verify.loading_state"
            >
              <Camera
                className="w-5 h-5 animate-pulse"
                style={{ color: "#7c3aed" }}
              />
              <p className="text-sm font-semibold" style={{ color: "#a78bfa" }}>
                Completing verification…
              </p>
            </motion.div>
          )}

          {/* Task instruction card */}
          {isDetecting && !selfieCapturing && (
            <motion.div
              key={currentTask}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="space-y-3 pb-2"
            >
              {/* Task card */}
              <div
                className="rounded-[22px] overflow-hidden"
                style={{
                  background: "rgba(5,5,8,0.78)",
                  border: "1px solid rgba(139,92,246,0.22)",
                  backdropFilter: "blur(20px)",
                  WebkitBackdropFilter: "blur(20px)",
                }}
              >
                {/* Task header row */}
                <div
                  className="px-4 py-3 flex items-center gap-3.5"
                  style={{
                    borderBottom: "1px solid rgba(255,255,255,0.05)",
                  }}
                >
                  <div
                    className="w-11 h-11 rounded-2xl flex items-center justify-center text-2xl flex-shrink-0"
                    style={{
                      background:
                        "linear-gradient(135deg, rgba(109,40,217,0.25), rgba(79,70,229,0.15))",
                      border: "1px solid rgba(139,92,246,0.25)",
                    }}
                  >
                    {taskIcon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-[10px] font-bold uppercase tracking-widest mb-0.5"
                      style={{ color: "#7c6fcd", letterSpacing: "0.15em" }}
                    >
                      Step {completedTasks + 1} of {totalTasks}
                    </p>
                    <p className="text-base font-bold text-white leading-tight">
                      {taskLabel}
                    </p>
                    {/* Hint text */}
                    {hintText && (
                      <p
                        className="text-xs mt-0.5"
                        style={{ color: "#94a3b8" }}
                      >
                        {hintText}
                      </p>
                    )}
                  </div>
                </div>

                {/* Stability progress bar */}
                <AnimatePresence>
                  {stabilityProgress > 0 && (
                    <motion.div
                      key="stability"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="px-4 py-3"
                    >
                      <div className="flex justify-between items-center mb-1.5">
                        <span
                          className="text-xs font-semibold"
                          style={{ color: "#22d07a" }}
                        >
                          Hold it…
                        </span>
                        <span
                          className="text-xs font-mono"
                          style={{ color: "#334155" }}
                        >
                          {Math.round(stabilityProgress * 100)}%
                        </span>
                      </div>
                      <div
                        className="h-1.5 rounded-full overflow-hidden"
                        style={{ background: "rgba(255,255,255,0.06)" }}
                      >
                        <motion.div
                          className="h-full rounded-full"
                          style={{
                            width: `${stabilityProgress * 100}%`,
                            background:
                              "linear-gradient(90deg, #7c3aed, #22d07a)",
                            boxShadow: "0 0 8px rgba(34,208,122,0.4)",
                          }}
                          transition={{ duration: 0.08 }}
                        />
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Task dot progress */}
              <TaskProgress taskIndex={taskIndex} currentTask={currentTask} />
            </motion.div>
          )}
        </div>
      </div>

      {/* Success overlay */}
      <SuccessAnimation show={showSuccess} />
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main VerificationPage
// ─────────────────────────────────────────────────────────────────────────────

export default function VerificationPage() {
  const navigate = useNavigate();
  const { activeAlarm, recordSuccess } = useAlarms();
  const [showSuccess, setShowSuccess] = useState(false);

  const handleComplete = async () => {
    // Stop alarm immediately on verification success
    stopAlarmSound();
    setShowSuccess(true);
    await recordSuccess();
    setTimeout(() => {
      navigate("/dashboard");
    }, 500);
  };

  // If no active alarm navigate back — but do NOT stop sound here,
  // this handles the case where alarm was already dismissed (e.g. snooze)
  useEffect(() => {
    if (!activeAlarm) {
      navigate("/dashboard", { replace: true });
    }
  }, [activeAlarm, navigate]);

  const isSelfieMode =
    activeAlarm?.verificationMode === VerificationMode.selfie;

  if (isSelfieMode) {
    return (
      <>
        <SelfieVerificationView onComplete={handleComplete} />
        <SuccessAnimation show={showSuccess} />
      </>
    );
  }

  return (
    <>
      <LiveVerificationView onComplete={handleComplete} />
      <SuccessAnimation show={showSuccess} />
    </>
  );
}
