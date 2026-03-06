/**
 * FaceGuide — Square face detection box overlay.
 *
 * States:
 *  "idle"    → dashed grey border
 *  "looking" → amber/yellow — face detected but condition not met
 *  "hold"    → purple with progress — task is valid, timing window active
 *  "success" → green — task/step complete
 *  "error"   → red — multiple faces or invalid frame
 */
import { AnimatePresence, motion } from "motion/react";

export type FaceGuideState = "idle" | "looking" | "hold" | "success" | "error";

interface FaceGuideProps {
  state: FaceGuideState;
  progress?: number;
  label?: string;
}

const STATE_COLORS: Record<
  FaceGuideState,
  { stroke: string; glow: string; scanline: string }
> = {
  idle: {
    stroke: "rgba(255,255,255,0.30)",
    glow: "transparent",
    scanline: "rgba(255,255,255,0.3)",
  },
  looking: {
    stroke: "rgba(251,191,36,0.80)",
    glow: "rgba(251,191,36,0.12)",
    scanline: "rgba(251,191,36,0.5)",
  },
  hold: {
    stroke: "rgba(139,92,246,0.95)",
    glow: "rgba(109,40,217,0.20)",
    scanline: "rgba(139,92,246,0.6)",
  },
  success: {
    stroke: "rgba(34,208,122,0.95)",
    glow: "rgba(34,208,122,0.22)",
    scanline: "rgba(34,208,122,0.6)",
  },
  error: {
    stroke: "rgba(255,77,106,0.95)",
    glow: "rgba(255,77,106,0.18)",
    scanline: "rgba(255,77,106,0.4)",
  },
};

export function FaceGuide({ state, progress = 0, label }: FaceGuideProps) {
  const colors = STATE_COLORS[state];

  // Square dimensions — 75% of typical mobile screen width capped at 300px
  const SIZE = 300;
  const CORNER = 28; // corner radius for the square

  const borderColor = colors.stroke;
  const isActive = state !== "idle";

  return (
    <div
      className="absolute inset-0 flex items-center justify-center pointer-events-none"
      style={{ zIndex: 10 }}
    >
      <div
        className="relative flex items-center justify-center"
        style={{ width: SIZE, height: SIZE }}
      >
        {/* Ambient fill glow */}
        <div
          className="absolute inset-0 transition-colors duration-500"
          style={{
            background: colors.glow,
            borderRadius: CORNER,
            filter: "blur(24px)",
            transform: "scale(0.9)",
          }}
        />

        {/* Main square border */}
        <div
          className="absolute inset-0 transition-all duration-400"
          style={{
            borderRadius: CORNER,
            border: `2.5px ${state === "idle" ? "dashed" : "solid"} ${borderColor}`,
            boxShadow: isActive
              ? `0 0 0 1px ${borderColor}40, inset 0 0 0 1px ${borderColor}20, 0 0 24px ${borderColor}30`
              : "none",
          }}
        />

        {/* Corner accent lines — thicker visible corners */}
        {(
          [
            { top: -2, left: -2, borderTop: true, borderLeft: true },
            { top: -2, right: -2, borderTop: true, borderRight: true },
            { bottom: -2, left: -2, borderBottom: true, borderLeft: true },
            { bottom: -2, right: -2, borderBottom: true, borderRight: true },
          ] as Array<{
            top?: number;
            bottom?: number;
            left?: number;
            right?: number;
            borderTop?: boolean;
            borderBottom?: boolean;
            borderLeft?: boolean;
            borderRight?: boolean;
          }>
        ).map((pos, i) => (
          <div
            // biome-ignore lint/suspicious/noArrayIndexKey: static corners
            key={i}
            className="absolute transition-all duration-400"
            style={{
              width: 32,
              height: 32,
              ...("top" in pos ? { top: pos.top } : {}),
              ...("bottom" in pos ? { bottom: pos.bottom } : {}),
              ...("left" in pos ? { left: pos.left } : {}),
              ...("right" in pos ? { right: pos.right } : {}),
              borderTop: pos.borderTop ? `3.5px solid ${borderColor}` : "none",
              borderBottom: pos.borderBottom
                ? `3.5px solid ${borderColor}`
                : "none",
              borderLeft: pos.borderLeft
                ? `3.5px solid ${borderColor}`
                : "none",
              borderRight: pos.borderRight
                ? `3.5px solid ${borderColor}`
                : "none",
              borderRadius:
                pos.borderTop && pos.borderLeft
                  ? `${CORNER}px 0 0 0`
                  : pos.borderTop && pos.borderRight
                    ? `0 ${CORNER}px 0 0`
                    : pos.borderBottom && pos.borderLeft
                      ? `0 0 0 ${CORNER}px`
                      : `0 0 ${CORNER}px 0`,
              filter: isActive ? `drop-shadow(0 0 4px ${borderColor})` : "none",
            }}
          />
        ))}

        {/* Progress fill — bottom-to-top fill for "hold" state */}
        {state === "hold" && progress > 0 && (
          <div
            className="absolute bottom-0 left-0 right-0 transition-all"
            style={{
              height: `${Math.min(progress * 100, 100)}%`,
              background: "rgba(139,92,246,0.08)",
              borderRadius: `0 0 ${CORNER}px ${CORNER}px`,
              borderTop: "1px solid rgba(139,92,246,0.2)",
            }}
          />
        )}

        {/* Scanning line — idle/looking */}
        <AnimatePresence>
          {(state === "idle" || state === "looking") && (
            <motion.div
              key="scanline"
              initial={{ top: "10%" }}
              animate={{ top: ["10%", "85%", "10%"] }}
              transition={{
                duration: 2.4,
                ease: "easeInOut",
                repeat: Number.POSITIVE_INFINITY,
                repeatType: "loop",
              }}
              exit={{ opacity: 0 }}
              style={{
                position: "absolute",
                left: "5%",
                right: "5%",
                height: "1.5px",
                background: `linear-gradient(90deg, transparent 0%, ${colors.scanline} 25%, ${colors.scanline} 75%, transparent 100%)`,
                filter: `blur(0.5px) drop-shadow(0 0 3px ${colors.scanline})`,
                borderRadius: "1px",
              }}
            />
          )}
        </AnimatePresence>

        {/* Success checkmark */}
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
                width: 60,
                height: 60,
                borderRadius: "50%",
                background:
                  "linear-gradient(135deg, rgba(34,208,122,0.22), rgba(16,185,129,0.12))",
                border: "2px solid rgba(34,208,122,0.6)",
              }}
            >
              <svg
                width={28}
                height={28}
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

        {/* Instruction inside box */}
        <div
          className="absolute bottom-4 left-2 right-2 text-center text-xs font-medium px-2 py-1 rounded-xl"
          style={{
            color: "rgba(255,255,255,0.75)",
            background: "rgba(0,0,0,0.35)",
            backdropFilter: "blur(6px)",
          }}
        >
          Fit your face inside the box
        </div>
      </div>

      {/* Status label below box */}
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
              background: "rgba(0,0,0,0.55)",
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
              border: `1px solid ${borderColor}`,
            }}
          >
            {label}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
