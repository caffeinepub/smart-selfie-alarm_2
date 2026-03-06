/**
 * FaceGuide — Apple FaceID-style face framing overlay.
 *
 * States:
 *  "idle"    → dashed grey ring + scanning line
 *  "looking" → amber/yellow — face detected but condition not met
 *  "hold"    → blue with progress — task is valid, timing window active
 *  "success" → green — task/step complete
 *  "error"   → red — multiple faces or invalid frame
 */
import { AnimatePresence, motion } from "motion/react";

export type FaceGuideState = "idle" | "looking" | "hold" | "success" | "error";

interface FaceGuideProps {
  state: FaceGuideState;
  /** 0–1 progress value, shown as arc when in "hold" state */
  progress?: number;
  label?: string;
}

const STATE_COLORS: Record<
  FaceGuideState,
  { stroke: string; glow: string; scanline: string }
> = {
  idle: {
    stroke: "rgba(255,255,255,0.25)",
    glow: "transparent",
    scanline: "rgba(255,255,255,0.3)",
  },
  looking: {
    stroke: "rgba(251,191,36,0.75)",
    glow: "rgba(251,191,36,0.15)",
    scanline: "rgba(251,191,36,0.5)",
  },
  hold: {
    stroke: "rgba(139,92,246,0.9)",
    glow: "rgba(109,40,217,0.20)",
    scanline: "rgba(139,92,246,0.6)",
  },
  success: {
    stroke: "rgba(34,208,122,0.95)",
    glow: "rgba(34,208,122,0.22)",
    scanline: "rgba(34,208,122,0.6)",
  },
  error: {
    stroke: "rgba(255,77,106,0.9)",
    glow: "rgba(255,77,106,0.18)",
    scanline: "rgba(255,77,106,0.4)",
  },
};

// Convert 0-1 progress to SVG arc path
function describeArc(
  cx: number,
  cy: number,
  r: number,
  progress: number,
): string {
  if (progress <= 0) return "";
  const clampedProgress = progress >= 1 ? 0.9999 : progress;
  const startAngle = -Math.PI / 2;
  const endAngle = startAngle + clampedProgress * 2 * Math.PI;
  const x1 = cx + r * Math.cos(startAngle);
  const y1 = cy + r * Math.sin(startAngle);
  const x2 = cx + r * Math.cos(endAngle);
  const y2 = cy + r * Math.sin(endAngle);
  const largeArc = clampedProgress > 0.5 ? 1 : 0;
  return `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`;
}

// Corner bracket path helper — draws one L-shaped bracket
function cornerBracket(
  x: number,
  y: number,
  dirX: 1 | -1,
  dirY: 1 | -1,
  size = 20,
  padding = 8,
): string {
  const ax = x + dirX * padding;
  const ay = y + dirY * padding;
  return `M ${ax + dirX * size} ${ay} L ${ax} ${ay} L ${ax} ${ay + dirY * size}`;
}

export function FaceGuide({ state, progress = 0, label }: FaceGuideProps) {
  const colors = STATE_COLORS[state];

  // Oval dimensions
  const W = 280;
  const H = 340;
  const cx = W / 2;
  const cy = H / 2;
  const rx = cx - 4;
  const ry = cy - 4;

  // (perimeter unused — dashed ring uses strokeDasharray directly)

  return (
    <div
      className="absolute inset-0 flex items-center justify-center pointer-events-none"
      style={{ zIndex: 10 }}
    >
      <div
        className="relative flex items-center justify-center"
        style={{ width: W, height: H }}
      >
        {/* ── Ambient fill glow behind the oval ── */}
        <div
          className="absolute inset-0 rounded-full transition-colors duration-500"
          style={{
            background: colors.glow,
            borderRadius: "50%",
            filter: "blur(20px)",
            transform: "scale(0.85)",
          }}
        />

        <svg
          width={W}
          height={H}
          viewBox={`0 0 ${W} ${H}`}
          style={{ position: "absolute", top: 0, left: 0, overflow: "visible" }}
          aria-hidden="true"
          role="presentation"
        >
          {/* ── Base oval ring — dashed in idle, solid otherwise ── */}
          <ellipse
            cx={cx}
            cy={cy}
            rx={rx}
            ry={ry}
            fill="none"
            stroke={colors.stroke}
            strokeWidth={state === "idle" ? 1.5 : 2}
            strokeDasharray={state === "idle" ? "6 5" : "none"}
            style={{ transition: "stroke 0.35s ease, stroke-width 0.35s ease" }}
          />

          {/* ── Progress arc overlay for "hold" state ── */}
          {state === "hold" && progress > 0 && (
            <path
              d={describeArc(cx, cy, (rx + ry) / 2, progress)}
              fill="none"
              stroke="rgba(139,92,246,1)"
              strokeWidth={3}
              strokeLinecap="round"
              style={{ filter: "drop-shadow(0 0 6px rgba(139,92,246,0.7))" }}
            />
          )}

          {/* ── Corner brackets — the FaceID signature ── */}
          {(["tl", "tr", "bl", "br"] as const).map((corner) => {
            const isRight = corner.endsWith("r");
            const isBottom = corner.startsWith("b");
            const bx = isRight ? W : 0;
            const by = isBottom ? H : 0;
            const dx: 1 | -1 = isRight ? -1 : 1;
            const dy: 1 | -1 = isBottom ? -1 : 1;
            return (
              <path
                key={corner}
                d={cornerBracket(bx, by, dx, dy, 22, 10)}
                fill="none"
                stroke={colors.stroke}
                strokeWidth={state === "idle" ? 2 : 2.5}
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{
                  transition: "stroke 0.35s ease",
                  filter:
                    state !== "idle"
                      ? `drop-shadow(0 0 4px ${colors.stroke})`
                      : "none",
                }}
              />
            );
          })}
        </svg>

        {/* ── Scanning line — only when idle or looking ── */}
        <AnimatePresence>
          {(state === "idle" || state === "looking") && (
            <motion.div
              key="scanline"
              initial={{ top: "12%" }}
              animate={{ top: ["12%", "80%", "12%"] }}
              transition={{
                duration: 2.8,
                ease: "easeInOut",
                repeat: Number.POSITIVE_INFINITY,
                repeatType: "loop",
              }}
              exit={{ opacity: 0 }}
              style={{
                position: "absolute",
                left: "10%",
                right: "10%",
                height: "1px",
                background: `linear-gradient(90deg, transparent 0%, ${colors.scanline} 30%, ${colors.scanline} 70%, transparent 100%)`,
                borderRadius: "1px",
                filter: `blur(0.5px) drop-shadow(0 0 3px ${colors.scanline})`,
              }}
            />
          )}
        </AnimatePresence>

        {/* ── Success checkmark pulse ── */}
        <AnimatePresence>
          {state === "success" && (
            <motion.div
              key="check"
              initial={{ scale: 0.4, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 1.2, opacity: 0 }}
              transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              className="absolute flex items-center justify-center"
              style={{
                width: 52,
                height: 52,
                borderRadius: "50%",
                background:
                  "linear-gradient(135deg, rgba(34,208,122,0.2), rgba(16,185,129,0.1))",
                border: "2px solid rgba(34,208,122,0.5)",
              }}
            >
              <svg
                width={24}
                height={24}
                viewBox="0 0 24 24"
                fill="none"
                stroke="rgba(34,208,122,1)"
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
                role="presentation"
              >
                <path d="M5 13l4 4L19 7" />
              </svg>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Status label below oval ── */}
      <AnimatePresence mode="wait">
        {label && (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2 }}
            className="absolute font-medium text-sm text-center px-4 py-1.5 rounded-full"
            style={{
              bottom: "-52px",
              left: "50%",
              transform: "translateX(-50%)",
              whiteSpace: "nowrap",
              background: "rgba(0,0,0,0.5)",
              backdropFilter: "blur(8px)",
              color:
                state === "success"
                  ? "rgba(34,208,122,1)"
                  : state === "error"
                    ? "rgba(255,77,106,1)"
                    : state === "hold"
                      ? "rgba(139,92,246,1)"
                      : state === "looking"
                        ? "rgba(251,191,36,1)"
                        : "rgba(255,255,255,0.7)",
              border: `1px solid ${colors.stroke}`,
            }}
          >
            {label}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
