import { Button } from "@/components/ui/button";
import { AlertTriangle, Camera, CheckCircle2, Loader2 } from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
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

// Per-task hint messages shown below the task card
const TASK_HINTS: Record<string, string> = {
  raise_eyebrows: "Try raising your eyebrows",
  smile: "Give a small natural smile",
  turn_head: "Turn your head slightly right",
  open_mouth: "Open your mouth wide",
};

// ─────────────────────────────────────────────────────────────────────────────
// Selfie Verification View
// ─────────────────────────────────────────────────────────────────────────────

interface SelfieVerificationViewProps {
  onComplete: () => void;
  onCancel: () => void;
}

function SelfieVerificationView({
  onComplete,
  onCancel,
}: SelfieVerificationViewProps) {
  const {
    videoRef,
    canvasRef,
    isDetecting,
    faceDetected,
    eyesOpen,
    faceCentered,
    canTakeSelfie,
    verifiedMessage,
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

  const handleCancel = () => {
    stopDetection();
    onCancel();
  };

  // Determine status indicator text and color
  const statusText = (() => {
    if (!isDetecting) return null;
    if (captureState === "capturing") return null;
    if (canTakeSelfie) return "Ready";
    if (faceDetected && eyesOpen && !faceCentered) return "Center face";
    if (faceDetected && !eyesOpen) return "Eyes closed";
    if (faceDetected) return "Almost…";
    return "Searching…";
  })();

  const statusColor = canTakeSelfie ? "#22d07a" : "#f59e0b";

  // Determine instruction message below camera
  const instructionText = (() => {
    if (!isDetecting || captureState !== "idle") return null;
    if (error === "no_face") return "Look at the camera";
    if (error === "face_too_small") return "Move closer to the camera";
    if (faceDetected && !faceCentered) return "Center your face in the frame";
    if (faceDetected && !eyesOpen) return "Eyes closed — open your eyes";
    if (canTakeSelfie && verifiedMessage) return null; // show verified message separately
    if (faceDetected) return "Almost there — eyes open & centered";
    return "Position your face with eyes open";
  })();

  return (
    <div
      className="fixed inset-0 flex flex-col"
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
        {/* Top bar */}
        <div className="flex items-center justify-between px-4 pt-12 pb-4 pointer-events-auto">
          <button
            type="button"
            className="flex items-center gap-1.5 px-3 py-2 rounded-2xl text-xs font-semibold transition-all active:scale-95"
            style={{
              background: "rgba(5,5,8,0.65)",
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
              color: "#94a3b8",
              border: "1px solid rgba(255,255,255,0.1)",
            }}
            onClick={handleCancel}
            data-ocid="selfie.cancel_button"
          >
            Cancel
          </button>

          {/* Status pill */}
          {isDetecting && statusText && (
            <div
              className="flex items-center gap-1.5 px-3 py-2 rounded-2xl text-xs font-medium"
              style={{
                background: "rgba(5,5,8,0.65)",
                backdropFilter: "blur(12px)",
                WebkitBackdropFilter: "blur(12px)",
                border: "1px solid rgba(255,255,255,0.08)",
                color: statusColor,
              }}
              data-ocid="selfie.face_indicator"
            >
              <div
                className="w-1.5 h-1.5 rounded-full"
                style={{
                  background: statusColor,
                  boxShadow: `0 0 6px ${statusColor}`,
                }}
              />
              {statusText}
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

        {/* Page subtitle */}
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
          className="pointer-events-auto px-5 mt-auto space-y-3"
          style={{
            paddingBottom: "max(env(safe-area-inset-bottom, 0px), 32px)",
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
                  Look at the camera with eyes open and face centered — the
                  selfie captures automatically
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

          {/* Main selfie UI */}
          {isDetecting && captureState === "idle" && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className="space-y-2.5"
            >
              {/* "Face verified" message — shown when all conditions met */}
              <AnimatePresence mode="wait">
                {canTakeSelfie && verifiedMessage ? (
                  <motion.div
                    key="verified"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl"
                    style={{
                      background: "rgba(34,208,122,0.12)",
                      border: "1px solid rgba(34,208,122,0.3)",
                    }}
                    data-ocid="selfie.success_state"
                  >
                    <CheckCircle2
                      className="w-4 h-4 flex-shrink-0"
                      style={{ color: "#22d07a" }}
                    />
                    <p
                      className="text-sm font-semibold"
                      style={{ color: "#22d07a" }}
                    >
                      {verifiedMessage}
                    </p>
                  </motion.div>
                ) : instructionText ? (
                  <motion.p
                    key="instruction"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="text-xs text-center font-medium"
                    style={{ color: "#64748b" }}
                  >
                    {instructionText}
                  </motion.p>
                ) : null}
              </AnimatePresence>

              {/* Manual shutter button — fallback for auto-capture */}
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
                data-ocid="selfie.primary_button"
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
  onCancel: () => void;
}

function LiveVerificationView({
  onComplete,
  onCancel,
}: LiveVerificationViewProps) {
  const [showSuccess, setShowSuccess] = useState(false);
  const [started, setStarted] = useState(false);
  const [lastCompletedTask, setLastCompletedTask] = useState<string | null>(
    null,
  );

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

  // Track task completion for "Done!" feedback
  const prevTaskIndexRef = useRef(0);
  useEffect(() => {
    if (taskIndex > prevTaskIndexRef.current && taskIndex > 0 && isDetecting) {
      const completedTask = TASK_LIST[taskIndex - 1];
      if (completedTask) {
        setLastCompletedTask(TASK_LABELS[completedTask]);
        setTimeout(() => setLastCompletedTask(null), 1500);
      }
    }
    prevTaskIndexRef.current = taskIndex;
  }, [taskIndex, isDetecting]);

  useEffect(() => {
    return () => {
      stopDetection();
    };
  }, [stopDetection]);

  const handleStart = async () => {
    setStarted(true);
    await startDetection();
  };

  const handleCancel = () => {
    stopDetection();
    onCancel();
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
    if (isDetecting && currentTask) return TASK_HINTS[currentTask] ?? null;
    return null;
  })();

  // Next task label for "Done!" feedback
  const nextTaskLabel =
    taskIndex < TASK_LIST.length ? TASK_LABELS[TASK_LIST[taskIndex]] : null;

  return (
    <div
      className="fixed inset-0 flex flex-col"
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

        {/* TOP floating instruction card — shown when detecting */}
        <AnimatePresence>
          {isDetecting && !selfieCapturing && completedTasks < totalTasks && (
            <motion.div
              key={`top-${currentTask}`}
              initial={{ opacity: 0, y: -16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
              className="absolute top-20 left-0 right-0 px-5 pointer-events-none"
            >
              <div
                className="rounded-2xl px-4 py-3 text-center mx-auto max-w-xs"
                style={{
                  background: "rgba(5,5,8,0.72)",
                  border: "1px solid rgba(139,92,246,0.3)",
                  backdropFilter: "blur(16px)",
                  WebkitBackdropFilter: "blur(16px)",
                }}
              >
                <span className="text-2xl mr-2">{taskIcon}</span>
                <span className="text-sm font-bold text-white">
                  {taskLabel}
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* "Done!" feedback overlay */}
        <AnimatePresence>
          {lastCompletedTask && (
            <motion.div
              key="done-feedback"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ duration: 0.2 }}
              className="absolute inset-0 flex items-center justify-center pointer-events-none"
            >
              <div
                className="flex flex-col items-center gap-2 px-6 py-4 rounded-3xl"
                style={{
                  background: "rgba(34,208,122,0.15)",
                  border: "1px solid rgba(34,208,122,0.4)",
                  backdropFilter: "blur(16px)",
                }}
              >
                <CheckCircle2
                  className="w-10 h-10"
                  style={{ color: "#22d07a" }}
                />
                <p className="text-base font-bold" style={{ color: "#22d07a" }}>
                  ✓ Done!
                </p>
                {nextTaskLabel && completedTasks < totalTasks && (
                  <p
                    className="text-xs text-center"
                    style={{ color: "#94a3b8" }}
                  >
                    Now: {nextTaskLabel}
                  </p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── UI Overlay ── */}
      <div className="absolute inset-0 flex flex-col pointer-events-none">
        {/* Top bar */}
        <div className="flex items-center justify-between px-4 pt-12 pb-3 pointer-events-auto">
          <button
            type="button"
            className="flex items-center gap-1.5 px-3 py-2 rounded-2xl text-xs font-semibold transition-all active:scale-95"
            style={{
              background: "rgba(5,5,8,0.65)",
              backdropFilter: "blur(12px)",
              WebkitBackdropFilter: "blur(12px)",
              color: "#94a3b8",
              border: "1px solid rgba(255,255,255,0.1)",
            }}
            onClick={handleCancel}
            data-ocid="verify.cancel_button"
          >
            Cancel
          </button>

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

        {/* Bottom panel — shrink-0 so it never squishes camera */}
        <div
          className="pointer-events-auto px-5 mt-auto space-y-3 shrink-0"
          style={{
            paddingBottom: "max(env(safe-area-inset-bottom, 0px), 28px)",
            maxHeight: "45vh",
            overflowY: "auto",
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

          {/* Selfie capturing overlay (unused in live mode, but keep for compat) */}
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
                Capturing verification selfie…
              </p>
            </motion.div>
          )}

          {/* Task instruction card — bottom */}
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
  const { activeAlarm, recordSuccess, dismissActiveAlarm } = useAlarms();
  const [showSuccess, setShowSuccess] = useState(false);

  const handleComplete = async () => {
    stopAlarmSound(); // Stop alarm when verified
    setShowSuccess(true);
    await recordSuccess();
    setTimeout(() => {
      navigate("/dashboard");
    }, 2500);
  };

  const handleCancel = () => {
    stopAlarmSound(); // Stop alarm when cancelled
    dismissActiveAlarm();
    navigate("/dashboard");
  };

  const isSelfieMode =
    activeAlarm?.verificationMode === VerificationMode.selfie;

  if (isSelfieMode) {
    return (
      <>
        <SelfieVerificationView
          onComplete={handleComplete}
          onCancel={handleCancel}
        />
        <SuccessAnimation show={showSuccess} />
      </>
    );
  }

  return (
    <LiveVerificationView onComplete={handleComplete} onCancel={handleCancel} />
  );
}
