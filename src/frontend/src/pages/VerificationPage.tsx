import { Button } from "@/components/ui/button";
import { AlertTriangle, Camera, Loader2, Users } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { SuccessAnimation } from "../components/SuccessAnimation";
import { TaskProgress } from "../components/TaskProgress";
import { useAlarms } from "../hooks/useAlarms";
import { useFaceDetection } from "../hooks/useFaceDetection";

function getCameraFacing(): "user" | "environment" {
  try {
    return (
      (localStorage.getItem("cameraFacing") as "user" | "environment") ?? "user"
    );
  } catch {
    return "user";
  }
}

export default function VerificationPage() {
  const navigate = useNavigate();
  const { dismissActiveAlarm, recordSuccess } = useAlarms();
  const [showSuccess, setShowSuccess] = useState(false);
  const [started, setStarted] = useState(false);

  const handleComplete = async () => {
    setShowSuccess(true);
    // Play a success beep
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
        osc.frequency.value = 523; // C5
        osc.type = "sine";
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1);
        osc.start();
        osc.stop(ctx.currentTime + 1);
      }
    } catch {
      // ignore
    }

    await recordSuccess();
    setTimeout(() => {
      navigate("/dashboard");
    }, 2500);
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
    eyesOpenDuration,
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

  const handleCancel = () => {
    stopDetection();
    dismissActiveAlarm();
    navigate("/dashboard");
  };

  return (
    <div
      className="fixed inset-0 flex flex-col overflow-hidden"
      style={{ backgroundColor: "#0a0a0f" }}
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
          style={{ transform: "scaleX(-1)" }} // Mirror front camera
          playsInline
          muted
        />
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full object-cover pointer-events-none"
          style={{ transform: "scaleX(-1)" }}
        />

        {/* Dark overlay for readability */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "linear-gradient(to bottom, rgba(10,10,15,0.7) 0%, rgba(10,10,15,0.1) 40%, rgba(10,10,15,0.1) 60%, rgba(10,10,15,0.8) 100%)",
          }}
        />

        {/* Face frame guide */}
        {isDetecting && faceCount === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div
              className="w-48 h-60 rounded-full"
              style={{
                border: "2px dashed rgba(245, 158, 11, 0.4)",
              }}
            />
          </div>
        )}

        {isDetecting && faceCount === 1 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div
              className="w-48 h-60 rounded-full"
              style={{
                border: "2px solid rgba(124, 58, 237, 0.5)",
                boxShadow: "0 0 20px rgba(124, 58, 237, 0.2)",
              }}
            />
          </div>
        )}
      </div>

      {/* UI Overlay */}
      <div className="absolute inset-0 flex flex-col pointer-events-none">
        {/* Top bar */}
        <div className="flex items-center justify-between p-4 pointer-events-auto">
          <Button
            variant="ghost"
            size="sm"
            className="rounded-xl text-xs"
            style={{
              background: "rgba(10,10,15,0.7)",
              backdropFilter: "blur(8px)",
              color: "#94a3b8",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
            onClick={handleCancel}
          >
            Cancel
          </Button>
          {isDetecting && (
            <div
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
              style={{
                background: "rgba(10,10,15,0.7)",
                backdropFilter: "blur(8px)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}
            >
              <div
                className="w-2 h-2 rounded-full animate-pulse"
                style={{ background: "#10b981" }}
              />
              <span
                className="text-xs font-medium"
                style={{ color: "#94a3b8" }}
              >
                Face Scan Active
              </span>
            </div>
          )}
        </div>

        {/* Alerts - no face / multiple faces */}
        {isDetecting && faceCount === 0 && (
          <div className="pointer-events-auto px-4 mt-auto mb-2">
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl"
              style={{
                background: "rgba(245, 158, 11, 0.15)",
                border: "1px solid rgba(245, 158, 11, 0.3)",
                backdropFilter: "blur(8px)",
              }}
              data-ocid="verify.error_state"
            >
              <AlertTriangle
                className="w-4 h-4 flex-shrink-0"
                style={{ color: "#f59e0b" }}
              />
              <p className="text-sm font-medium" style={{ color: "#fbbf24" }}>
                Position your face in the frame
              </p>
            </motion.div>
          </div>
        )}

        {isDetecting && faceCount > 1 && (
          <div className="pointer-events-auto px-4 mt-auto mb-2">
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-2xl"
              style={{
                background: "rgba(239, 68, 68, 0.15)",
                border: "1px solid rgba(239, 68, 68, 0.3)",
                backdropFilter: "blur(8px)",
              }}
              data-ocid="verify.error_state"
            >
              <Users
                className="w-4 h-4 flex-shrink-0"
                style={{ color: "#ef4444" }}
              />
              <p className="text-sm font-medium" style={{ color: "#fca5a5" }}>
                Only one face detected at a time
              </p>
            </motion.div>
          </div>
        )}

        {/* Bottom panel */}
        <div
          className="pointer-events-auto p-4 pb-8"
          style={{
            background:
              "linear-gradient(to top, rgba(10,10,15,0.95) 0%, rgba(10,10,15,0.8) 70%, transparent 100%)",
          }}
        >
          {/* Error: camera denied */}
          {error === "camera_denied" && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card p-5 text-center mb-4"
              style={{ borderColor: "rgba(239,68,68,0.2)" }}
              data-ocid="verify.error_state"
            >
              <Camera
                className="w-10 h-10 mx-auto mb-3"
                style={{ color: "#ef4444" }}
              />
              <p className="font-semibold text-white mb-1">
                Camera Access Denied
              </p>
              <p className="text-sm mb-3" style={{ color: "#94a3b8" }}>
                Please allow camera access in your browser settings to use face
                verification.
              </p>
              <p className="text-xs" style={{ color: "#64748b" }}>
                Settings → Privacy → Camera → Allow for this site
              </p>
            </motion.div>
          )}

          {error === "init_failed" && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card p-5 text-center mb-4"
              style={{ borderColor: "rgba(239,68,68,0.2)" }}
              data-ocid="verify.error_state"
            >
              <AlertTriangle
                className="w-10 h-10 mx-auto mb-3"
                style={{ color: "#f59e0b" }}
              />
              <p className="font-semibold text-white mb-1">
                Detection Unavailable
              </p>
              <p className="text-sm mb-3" style={{ color: "#94a3b8" }}>
                Face detection could not initialize. Check your internet
                connection.
              </p>
            </motion.div>
          )}

          {/* Not started: show start button */}
          {!started && !error && (
            <div className="text-center space-y-3">
              <p className="text-sm" style={{ color: "#94a3b8" }}>
                You&apos;ll be guided through 6 face tasks to prove you&apos;re
                awake
              </p>
              <Button
                className="w-full h-12 rounded-2xl font-semibold btn-neon gap-2"
                onClick={handleStart}
                data-ocid="verify.primary_button"
              >
                <Camera className="w-4 h-4" />
                Start Face Verification
              </Button>
            </div>
          )}

          {/* Loading / initializing */}
          {started && !isDetecting && !error && (
            <div
              className="flex flex-col items-center gap-2 py-4"
              data-ocid="verify.loading_state"
            >
              <Loader2
                className="w-6 h-6 animate-spin"
                style={{ color: "#7c3aed" }}
              />
              <p className="text-sm" style={{ color: "#94a3b8" }}>
                Initializing face detection...
              </p>
            </div>
          )}

          {/* Task progress */}
          {isDetecting && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <TaskProgress
                taskIndex={taskIndex}
                currentTask={currentTask}
                eyesOpenDuration={eyesOpenDuration}
              />
            </motion.div>
          )}
        </div>
      </div>

      {/* Success overlay */}
      <SuccessAnimation show={showSuccess} />
    </div>
  );
}
