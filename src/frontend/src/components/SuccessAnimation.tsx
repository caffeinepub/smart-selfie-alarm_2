import { useEffect, useState } from "react";

interface ConfettiPiece {
  id: number;
  x: number;
  color: string;
  duration: number;
  delay: number;
  size: number;
}

const CONFETTI_COLORS = [
  "#7c3aed",
  "#6366f1",
  "#a78bfa",
  "#10b981",
  "#f59e0b",
  "#ec4899",
];

export function SuccessAnimation({ show }: { show: boolean }) {
  const [pieces, setPieces] = useState<ConfettiPiece[]>([]);

  useEffect(() => {
    if (show) {
      const newPieces: ConfettiPiece[] = Array.from({ length: 60 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        color:
          CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
        duration: 2 + Math.random() * 2,
        delay: Math.random() * 1,
        size: 6 + Math.random() * 8,
      }));
      setPieces(newPieces);
    } else {
      setPieces([]);
    }
  }, [show]);

  if (!show) return null;

  return (
    <div
      className="fixed inset-0 pointer-events-none z-50 overflow-hidden"
      data-ocid="verify.success_state"
    >
      {/* Confetti */}
      {pieces.map((piece) => (
        <div
          key={piece.id}
          className="absolute"
          style={{
            left: `${piece.x}%`,
            top: "-20px",
            width: `${piece.size}px`,
            height: `${piece.size}px`,
            backgroundColor: piece.color,
            borderRadius: Math.random() > 0.5 ? "50%" : "2px",
            animation: `confetti-fall ${piece.duration}s ease-in ${piece.delay}s forwards`,
            boxShadow: `0 0 6px ${piece.color}`,
          }}
        />
      ))}

      {/* Success center overlay */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="success-pulse flex flex-col items-center gap-4 text-center">
          <div
            className="w-28 h-28 rounded-full flex items-center justify-center"
            style={{
              background: "linear-gradient(135deg, #10b981, #059669)",
              boxShadow: "0 0 40px rgba(16, 185, 129, 0.6)",
            }}
          >
            <svg
              className="w-14 h-14 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
              role="img"
              aria-label="Success checkmark"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <div>
            <p
              className="text-3xl font-bold"
              style={{
                background: "linear-gradient(135deg, #10b981, #34d399)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              You&apos;re Awake!
            </p>
            <p className="mt-1 text-sm" style={{ color: "#94a3b8" }}>
              Alarm dismissed successfully
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
