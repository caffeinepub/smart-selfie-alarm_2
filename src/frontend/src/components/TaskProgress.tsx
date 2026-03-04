import { cn } from "@/lib/utils";
import {
  TASK_ICONS,
  TASK_LABELS,
  TASK_LIST,
  type VerificationTask,
} from "../hooks/useFaceDetection";

interface TaskProgressProps {
  taskIndex: number;
  currentTask: VerificationTask;
  eyesOpenDuration?: number;
}

export function TaskProgress({
  taskIndex,
  currentTask,
  eyesOpenDuration = 0,
}: TaskProgressProps) {
  return (
    <div className="w-full">
      {/* Step dots */}
      <div className="flex items-center justify-center gap-2 mb-4">
        {TASK_LIST.map((task, i) => (
          <div
            key={task}
            className={cn(
              "transition-all duration-300 rounded-full",
              i < taskIndex
                ? "w-3 h-3"
                : i === taskIndex
                  ? "w-5 h-5"
                  : "w-3 h-3",
            )}
            style={{
              background:
                i < taskIndex
                  ? "#10b981"
                  : i === taskIndex
                    ? "linear-gradient(135deg, #7c3aed, #6366f1)"
                    : "rgba(255,255,255,0.15)",
              boxShadow:
                i === taskIndex
                  ? "0 0 12px rgba(124, 58, 237, 0.6)"
                  : i < taskIndex
                    ? "0 0 8px rgba(16, 185, 129, 0.4)"
                    : "none",
            }}
          />
        ))}
      </div>

      {/* Progress bar */}
      <div
        className="w-full h-1.5 rounded-full mb-4 overflow-hidden"
        style={{ background: "rgba(255,255,255,0.08)" }}
      >
        <div
          className="h-full rounded-full transition-all duration-500 ease-out"
          style={{
            width: `${(taskIndex / TASK_LIST.length) * 100}%`,
            background: "linear-gradient(90deg, #7c3aed, #6366f1)",
            boxShadow: "0 0 8px rgba(124, 58, 237, 0.4)",
          }}
        />
      </div>

      {/* Current task card */}
      <div
        className="glass-card p-5 text-center"
        style={{ borderColor: "rgba(124, 58, 237, 0.3)" }}
      >
        <div className="text-4xl mb-2">{TASK_ICONS[currentTask]}</div>
        <p className="text-lg font-semibold text-white mb-1">
          {TASK_LABELS[currentTask]}
        </p>
        <p className="text-sm" style={{ color: "#94a3b8" }}>
          Step {taskIndex + 1} of {TASK_LIST.length}
        </p>

        {/* Eyes open timer */}
        {currentTask === "eyes_open" && eyesOpenDuration > 0 && (
          <div className="mt-3">
            <div
              className="w-full h-2 rounded-full overflow-hidden"
              style={{ background: "rgba(255,255,255,0.08)" }}
            >
              <div
                className="h-full rounded-full transition-all duration-200"
                style={{
                  width: `${(eyesOpenDuration / 2) * 100}%`,
                  background: "linear-gradient(90deg, #10b981, #34d399)",
                  boxShadow: "0 0 8px rgba(16, 185, 129, 0.4)",
                }}
              />
            </div>
            <p className="text-xs mt-1" style={{ color: "#10b981" }}>
              {eyesOpenDuration.toFixed(1)}s / 2s
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
