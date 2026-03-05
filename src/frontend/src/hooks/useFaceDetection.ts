import { useCallback, useEffect, useRef, useState } from "react";
import {
  type Landmark,
  averageLandmarks,
  calculateAvgEAR,
  calculateEyebrowEyeDistance,
  calculateFaceSize,
  calculateFaceWidthPx,
  calculateMouthHeight,
  calculateMouthWidth,
  closeFaceMesh,
  getNoseOffsetFraction,
  initFaceMesh,
  sendVideoFrame,
} from "../lib/faceMesh";

export type VerificationTask =
  | "open_mouth"
  | "raise_eyebrows"
  | "smile"
  | "turn_head";

export const TASK_LIST: VerificationTask[] = [
  "raise_eyebrows",
  "smile",
  "turn_head",
  "open_mouth",
];

export const TASK_LABELS: Record<VerificationTask, string> = {
  raise_eyebrows: "Raise your eyebrows",
  smile: "Give a small smile",
  turn_head: "Turn head slightly right",
  open_mouth: "Open your mouth",
};

export const TASK_ICONS: Record<VerificationTask, string> = {
  raise_eyebrows: "🤨",
  smile: "😊",
  turn_head: "↔️",
  open_mouth: "😮",
};

export type FaceDetectionError =
  | "camera_denied"
  | "no_face"
  | "multiple_faces"
  | "face_too_far"
  | "selfie_failed"
  | "init_failed"
  | null;

// ─── Detection thresholds ────────────────────────────────────────────────────

/** Detection interval: 600ms — responsive yet not CPU-heavy */
const DETECTION_INTERVAL_MS = 600;

/** Head turn: nose must shift > 13% of face width from center */
const HEAD_TURN_FRACTION = 0.13;

/** Stability window per task (ms) before marking as complete */
const STABILITY_MS = 300;

/** Minimum face inter-ocular distance (normalized) */
const MIN_FACE_SIZE = 0.13;

/** Minimum face pixel width on screen */
const MIN_FACE_WIDTH_PX = 120;

/** Keep last 4 frames for landmark smoothing */
const LANDMARK_HISTORY_SIZE = 4;

// ─── Types ───────────────────────────────────────────────────────────────────

interface UseFaceDetectionReturn {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  currentTask: VerificationTask;
  taskIndex: number;
  isDetecting: boolean;
  isComplete: boolean;
  error: FaceDetectionError;
  selfieCapturing: boolean;
  startDetection: () => Promise<void>;
  stopDetection: () => void;
  faceCount: number;
  /** 0–1 progress of stability hold window for current task */
  stabilityProgress: number;
}

// suppress unused import warning
void calculateAvgEAR;

export function useFaceDetection(
  onComplete: () => void,
  _cameraFacing: "user" | "environment" = "user",
): UseFaceDetectionReturn {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectionIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null,
  );
  const isCompleteRef = useRef(false);
  const taskIndexRef = useRef(0);
  const isRunningRef = useRef(false);

  // Landmark smoothing buffer
  const landmarkHistoryRef = useRef<Landmark[][]>([]);

  // Baseline measurements (captured on first valid frame)
  const baselineCapturedRef = useRef(false);
  const baselineMouthWidthRef = useRef<number>(0);
  const baselineMouthHeightRef = useRef<number>(0);
  const baselineEyebrowDistRef = useRef<number>(0);

  // Stability tracking
  const taskValidSinceRef = useRef<number | null>(null);

  // State
  const [currentTask, setCurrentTask] = useState<VerificationTask>(
    TASK_LIST[0],
  );
  const [taskIndex, setTaskIndex] = useState(0);
  const [isDetecting, setIsDetecting] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [error, setError] = useState<FaceDetectionError>(null);
  const [faceCount, setFaceCount] = useState(0);
  const [stabilityProgress, setStabilityProgress] = useState(0);

  const stopDetection = useCallback(() => {
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
      detectionIntervalRef.current = null;
    }
    if (streamRef.current) {
      for (const t of streamRef.current.getTracks()) t.stop();
      streamRef.current = null;
    }
    isRunningRef.current = false;
    closeFaceMesh();
    setIsDetecting(false);
  }, []);

  const advanceTask = useCallback((nextIndex: number) => {
    if (isCompleteRef.current) return;
    taskIndexRef.current = nextIndex;
    setTaskIndex(nextIndex);
    taskValidSinceRef.current = null;
    setStabilityProgress(0);
    if (nextIndex < TASK_LIST.length) {
      setCurrentTask(TASK_LIST[nextIndex]);
    }
  }, []);

  const checkCurrentTask = useCallback(
    (smoothedLandmarks: Landmark[]) => {
      const taskIdx = taskIndexRef.current;

      // All tasks done — call onComplete immediately
      if (taskIdx >= TASK_LIST.length) {
        if (!isCompleteRef.current) {
          isCompleteRef.current = true;
          setIsComplete(true);
          stopDetection();
          onComplete();
        }
        return;
      }

      const task = TASK_LIST[taskIdx];
      const now = Date.now();
      let taskValid = false;

      switch (task) {
        case "raise_eyebrows": {
          const dist = calculateEyebrowEyeDistance(smoothedLandmarks);
          const baseline = baselineEyebrowDistRef.current;
          taskValid = baseline > 0 ? dist > baseline * 1.15 : dist > 0.035;
          break;
        }

        case "smile": {
          const mouthWidth = calculateMouthWidth(smoothedLandmarks);
          const baseline = baselineMouthWidthRef.current;
          taskValid =
            baseline > 0 ? mouthWidth > baseline * 1.1 : mouthWidth > 0.045;
          break;
        }

        case "turn_head": {
          const offset = Math.abs(getNoseOffsetFraction(smoothedLandmarks));
          taskValid = offset > HEAD_TURN_FRACTION;
          break;
        }

        case "open_mouth": {
          const mouthHeight = calculateMouthHeight(smoothedLandmarks);
          const baseline = baselineMouthHeightRef.current;
          taskValid =
            baseline > 0 ? mouthHeight > baseline * 1.35 : mouthHeight > 0.018;
          break;
        }
      }

      if (taskValid) {
        if (taskValidSinceRef.current === null) {
          taskValidSinceRef.current = now;
        }
        const heldFor = now - taskValidSinceRef.current;
        const progress = Math.min(heldFor / STABILITY_MS, 1);
        setStabilityProgress(progress);

        if (heldFor >= STABILITY_MS) {
          taskValidSinceRef.current = null;
          setStabilityProgress(0);
          advanceTask(taskIdx + 1);
        }
      } else {
        if (taskValidSinceRef.current !== null) {
          taskValidSinceRef.current = null;
          setStabilityProgress(0);
        }
      }
    },
    [advanceTask, stopDetection, onComplete],
  );

  const startDetection = useCallback(async () => {
    setError(null);
    taskIndexRef.current = 0;
    isCompleteRef.current = false;
    isRunningRef.current = false;
    setTaskIndex(0);
    setCurrentTask(TASK_LIST[0]);
    setIsComplete(false);
    setFaceCount(0);
    setStabilityProgress(0);
    landmarkHistoryRef.current = [];
    baselineCapturedRef.current = false;
    baselineMouthWidthRef.current = 0;
    baselineMouthHeightRef.current = 0;
    baselineEyebrowDistRef.current = 0;
    taskValidSinceRef.current = null;

    // Get front camera — lightweight resolution for mobile
    let stream: MediaStream | null = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "user",
            width: { ideal: 640 },
            height: { ideal: 480 },
          },
          audio: false,
        });
        break;
      } catch (err) {
        if (attempt < 2) await new Promise((r) => setTimeout(r, 500));
        else {
          console.error("Camera failed:", err);
          setError("camera_denied");
          return;
        }
      }
    }

    if (!stream) {
      setError("camera_denied");
      return;
    }

    streamRef.current = stream;
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      try {
        await videoRef.current.play();
      } catch {
        /* ignore autoplay restriction */
      }
    }

    // Wait for video to be ready
    await new Promise<void>((resolve) => {
      const v = videoRef.current;
      if (!v || v.readyState >= 2) {
        resolve();
        return;
      }
      v.onloadeddata = () => resolve();
    });

    // Initialize FaceMesh (loads WASM + model from CDN)
    try {
      await initFaceMesh();
    } catch {
      setError("init_failed");
      return;
    }

    setIsDetecting(true);
    isRunningRef.current = true;

    const runDetection = async () => {
      if (!videoRef.current || isCompleteRef.current || !isRunningRef.current)
        return;
      if (videoRef.current.readyState < 2) return;

      const landmarks = await sendVideoFrame(videoRef.current);

      if (!isRunningRef.current || isCompleteRef.current) return;

      if (!landmarks || landmarks.length === 0) {
        setFaceCount(0);
        setError("no_face");
        taskValidSinceRef.current = null;
        setStabilityProgress(0);
        return;
      }

      setFaceCount(1);

      // Face size check
      const faceSize = calculateFaceSize(landmarks);
      if (faceSize < MIN_FACE_SIZE) {
        setError("face_too_far");
        taskValidSinceRef.current = null;
        setStabilityProgress(0);
        return;
      }

      // Face pixel width check
      const videoWidth = videoRef.current?.videoWidth ?? 0;
      if (videoWidth > 0) {
        const faceWidthPx = calculateFaceWidthPx(landmarks, videoWidth);
        if (faceWidthPx < MIN_FACE_WIDTH_PX) {
          setError("face_too_far");
          taskValidSinceRef.current = null;
          setStabilityProgress(0);
          return;
        }
      }

      setError(null);

      // Add to landmark history for smoothing
      const history = landmarkHistoryRef.current;
      history.push(landmarks);
      if (history.length > LANDMARK_HISTORY_SIZE) history.shift();

      const smoothed =
        history.length >= 2 ? averageLandmarks(history) : landmarks;

      // Capture baseline on first valid frame
      if (!baselineCapturedRef.current) {
        baselineMouthWidthRef.current = calculateMouthWidth(smoothed);
        baselineMouthHeightRef.current = calculateMouthHeight(smoothed);
        baselineEyebrowDistRef.current = calculateEyebrowEyeDistance(smoothed);
        baselineCapturedRef.current = true;
      }

      checkCurrentTask(smoothed);
    };

    // Use setInterval — prevents overlapping detection calls
    detectionIntervalRef.current = setInterval(() => {
      // Wrap in a guard to prevent multiple simultaneous detections
      if (!isRunningRef.current) return;
      runDetection();
    }, DETECTION_INTERVAL_MS);
  }, [checkCurrentTask]);

  useEffect(() => {
    return () => {
      stopDetection();
    };
  }, [stopDetection]);

  return {
    videoRef,
    canvasRef,
    currentTask,
    taskIndex,
    isDetecting,
    isComplete,
    error,
    selfieCapturing: false, // no selfie step in live mode anymore
    startDetection,
    stopDetection,
    faceCount,
    stabilityProgress,
  };
}
