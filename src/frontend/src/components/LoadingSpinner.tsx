import { cn } from "@/lib/utils";

interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
  fullScreen?: boolean;
}

export function LoadingSpinner({
  size = "md",
  className,
  fullScreen = false,
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: "w-4 h-4 border-2",
    md: "w-8 h-8 border-2",
    lg: "w-12 h-12 border-3",
  };

  const spinner = (
    <div
      className={cn(
        "rounded-full border-transparent animate-spin",
        sizeClasses[size],
        "border-t-neon-violet border-r-neon-indigo",
        className,
      )}
      style={{
        borderTopColor: "#7c3aed",
        borderRightColor: "#6366f1",
      }}
    />
  );

  if (fullScreen) {
    return (
      <div
        className="fixed inset-0 flex items-center justify-center z-50"
        style={{ backgroundColor: "#0a0a0f" }}
        data-ocid="app.loading_state"
      >
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div
              className="w-16 h-16 rounded-full border-2 border-transparent animate-spin"
              style={{
                borderTopColor: "#7c3aed",
                borderRightColor: "#6366f1",
              }}
            />
            <div
              className="absolute inset-2 rounded-full"
              style={{
                background:
                  "radial-gradient(circle, rgba(124,58,237,0.15) 0%, transparent 70%)",
              }}
            />
          </div>
          <p className="text-sm font-medium" style={{ color: "#94a3b8" }}>
            Loading Smart Selfie Alarm...
          </p>
        </div>
      </div>
    );
  }

  return spinner;
}

export function PageSkeleton() {
  return (
    <div className="w-full space-y-4 p-4">
      <div className="shimmer h-32 rounded-2xl" />
      <div className="grid grid-cols-3 gap-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="shimmer h-20 rounded-xl" />
        ))}
      </div>
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="shimmer h-24 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
