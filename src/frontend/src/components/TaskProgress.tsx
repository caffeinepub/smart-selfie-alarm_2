import { cn } from "@/lib/utils";
import { CheckCircle2 } from "lucide-react";
import {
  TASK_ICONS,
  TASK_LABELS,
  TASK_LIST,
  type VerificationTask,
} from "../hooks/useFaceDetection";

interface TaskProgressProps {
  taskIndex: number;
  currentTask: VerificationTask;
}

export function TaskProgress({ taskIndex }: TaskProgressProps) {
  return (
    <div className="w-full">
      {/* Step dots */}
      <div className="flex items-center justify-center gap-3 mb-4">
        {TASK_LIST.map((task, i) => (
          <div key={task} className="flex flex-col items-center gap-1">
            <div
              className={cn(
                "transition-all duration-300 rounded-full flex items-center justify-center",
                i < taskIndex
                  ? "w-8 h-8"
                  : i === taskIndex
                    ? "w-10 h-10"
                    : "w-8 h-8",
              )}
              style={{
                background:
                  i < taskIndex
                    ? "#10b981"
                    : i === taskIndex
                      ? "linear-gradient(135deg, #7c3aed, #6366f1)"
                      : "rgba(255,255,255,0.1)",
                boxShadow:
                  i === taskIndex
                    ? "0 0 16px rgba(124, 58, 237, 0.7)"
                    : i < taskIndex
                      ? "0 0 8px rgba(16, 185, 129, 0.4)"
                      : "none",
              }}
            >
              {i < taskIndex ? (
                <CheckCircle2 className="w-4 h-4 text-white" />
              ) : (
                <span className="text-sm">{TASK_ICONS[task]}</span>
              )}
            </div>
          </div>
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
    </div>
  );
}
