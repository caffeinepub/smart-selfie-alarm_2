import { useEffect, useState } from "react";

interface ConfettiPiece {
  id: number;
  x: number;
  color: string;
  duration: number;
  delay: number;
  size: number;
  shape: "circle" | "rect";
}

const CONFETTI_COLORS = [
  "#7c3aed",
  "#6366f1",
  "#a78bfa",
  "#10b981",
  "#f59e0b",
  "#ec4899",
  "#22d3ee",
  "#34d399",
];

export function SuccessAnimation({ show }: { show: boolean }) {
  const [pieces, setPieces] = useState<ConfettiPiece[]>([]);

  useEffect(() => {
    if (show) {
      const newPieces: ConfettiPiece[] = Array.from({ length: 70 }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        color:
          CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
        duration: 2 + Math.random() * 2.5,
        delay: Math.random() * 0.8,
        size: 5 + Math.random() * 9,
        shape: Math.random() > 0.5 ? "circle" : "rect",
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
      aria-live="polite"
      aria-label="Verification success"
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
            borderRadius: piece.shape === "circle" ? "50%" : "2px",
            animation: `confetti-fall ${piece.duration}s ease-in ${piece.delay}s forwards`,
            boxShadow: `0 0 6px ${piece.color}`,
          }}
        />
      ))}

      {/* Background dim */}
      <div
        className="absolute inset-0"
        style={{ background: "rgba(5,5,8,0.7)" }}
      />

      {/* Success center overlay */}
      <div className="absolute inset-0 flex items-center justify-center px-6">
        <div className="success-pulse flex flex-col items-center gap-5 text-center">
          {/* Green checkmark circle */}
          <div
            className="w-28 h-28 rounded-full flex items-center justify-center"
            style={{
              background: "linear-gradient(135deg, #10b981, #059669)",
              boxShadow:
                "0 0 50px rgba(16, 185, 129, 0.7), 0 0 0 12px rgba(16,185,129,0.15)",
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
              className="text-3xl font-bold mb-2"
              style={{
                background: "linear-gradient(135deg, #ffffff 0%, #a7f3d0 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                letterSpacing: "-0.02em",
              }}
            >
              🎉 Congratulations!
            </p>
            <p className="text-base font-medium" style={{ color: "#94a3b8" }}>
              Alarm dismissed successfully. Keep it up 👍
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
