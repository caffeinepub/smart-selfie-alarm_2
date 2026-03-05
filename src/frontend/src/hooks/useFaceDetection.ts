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
  closeFaceLandmarker,
  detectForVideo,
  initFaceLandmarker,
} from "../lib/faceDetection";

export type VerificationTask = "open_mouth" | "raise_eyebrows" | "smile";

export const TASK_LIST: VerificationTask[] = [
  "raise_eyebrows",
  "smile",
  "open_mouth",
];

export const TASK_LABELS: Record<VerificationTask, string> = {
  raise_eyebrows: "Raise your eyebrows",
  smile: "Give a small smile",
  open_mouth: "Open your mouth",
};

export const TASK_ICONS: Record<VerificationTask, string> = {
  raise_eyebrows: "🤨",
  smile: "😊",
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

// Detection interval: 750ms for fast, stable detection
const DETECTION_INTERVAL_MS = 750;

// Stability windows (ms) before a task is considered complete
// Kept short so tasks advance quickly after detection
const SMILE_STABILITY_MS = 300;
const EYEBROW_STABILITY_MS = 300;
const MOUTH_STABILITY_MS = 300;

// Minimum face size (inter-ocular / image width) — normalized
const MIN_FACE_SIZE = 0.13;

// Minimum face pixel width — reject if face appears too small on screen
const MIN_FACE_WIDTH_PX = 120;

// Minimum landmark count for a valid high-confidence frame
const MIN_LANDMARK_COUNT = 400;

// Landmark history: keep last 5 frames for smoothing
const LANDMARK_HISTORY_SIZE = 5;

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
  const isDetectingLockRef = useRef(false); // prevent overlapping detection calls
  const taskIndexRef = useRef(0);

  // Landmark smoothing buffer
  const landmarkHistoryRef = useRef<Landmark[][]>([]);

  // Baseline measurements (captured on first valid frame)
  const baselineCapturedRef = useRef(false);
  const baselineMouthWidthRef = useRef<number>(0);
  const baselineMouthHeightRef = useRef<number>(0);
  const baselineEyebrowDistRef = useRef<number>(0);

  // Stability tracking: when did the current task first become valid?
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
  // selfieCapturing kept in interface for compat but always false now
  const [selfieCapturing] = useState(false);
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
    closeFaceLandmarker();
    setIsDetecting(false);
  }, []);

  const advanceTask = useCallback((nextIndex: number) => {
    if (isCompleteRef.current) return;
    taskIndexRef.current = nextIndex;
    setTaskIndex(nextIndex);
    // Reset stability for the new task
    taskValidSinceRef.current = null;
    setStabilityProgress(0);
    if (nextIndex < TASK_LIST.length) {
      setCurrentTask(TASK_LIST[nextIndex]);
    }
  }, []);

  // After all tasks complete, call onComplete immediately — no selfie step
  const completeVerification = useCallback(() => {
    if (isCompleteRef.current) return;
    isCompleteRef.current = true;
    setIsComplete(true);
    stopDetection();
    onComplete();
  }, [onComplete, stopDetection]);

  const checkCurrentTask = useCallback(
    (smoothedLandmarks: Landmark[], _count: number) => {
      const taskIdx = taskIndexRef.current;
      if (taskIdx >= TASK_LIST.length) {
        // All tasks done — complete verification immediately
        completeVerification();
        return;
      }

      const task = TASK_LIST[taskIdx];
      const now = Date.now();
      let taskValid = false;

      switch (task) {
        case "open_mouth": {
          const mouthHeight = calculateMouthHeight(smoothedLandmarks);
          const baseline = baselineMouthHeightRef.current;
          taskValid =
            baseline > 0 ? mouthHeight > baseline * 1.35 : mouthHeight > 0.055;
          break;
        }

        case "raise_eyebrows": {
          const dist = calculateEyebrowEyeDistance(smoothedLandmarks);
          const baseline = baselineEyebrowDistRef.current;
          taskValid = baseline > 0 ? dist > baseline * 1.15 : dist > 0.035;
          break;
        }

        case "smile": {
          const mouthWidth = calculateMouthWidth(smoothedLandmarks);
          const baseline = baselineMouthWidthRef.current;
          // 1.08x — detects even a small natural smile
          taskValid =
            baseline > 0 ? mouthWidth > baseline * 1.08 : mouthWidth > 0.042;
          break;
        }
      }

      // Stability window for all tasks
      const stabilityWindowMs: Record<VerificationTask, number> = {
        open_mouth: MOUTH_STABILITY_MS,
        raise_eyebrows: EYEBROW_STABILITY_MS,
        smile: SMILE_STABILITY_MS,
      };
      const requiredMs = stabilityWindowMs[task];

      if (taskValid) {
        if (taskValidSinceRef.current === null) {
          taskValidSinceRef.current = now;
        }
        const heldFor = now - taskValidSinceRef.current;
        const progress = Math.min(heldFor / requiredMs, 1);
        setStabilityProgress(progress);

        if (heldFor >= requiredMs) {
          taskValidSinceRef.current = null;
          setStabilityProgress(0);
          advanceTask(taskIdx + 1);
        }
      } else {
        // Task no longer valid — reset stability
        if (taskValidSinceRef.current !== null) {
          taskValidSinceRef.current = null;
          setStabilityProgress(0);
        }
      }
    },
    [advanceTask, completeVerification],
  );

  const startDetection = useCallback(async () => {
    setError(null);
    taskIndexRef.current = 0;
    isCompleteRef.current = false;
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

    // Get camera stream — front camera required, with retry
    let stream: MediaStream | null = null;
    let lastError: unknown = null;

    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "user",
            width: { ideal: 640 },
            height: { ideal: 480 },
            frameRate: { ideal: 24 },
          },
          audio: false,
        });
        break;
      } catch (err) {
        lastError = err;
        if (attempt < 2) {
          await new Promise((r) => setTimeout(r, 500));
        }
      }
    }

    if (!stream) {
      console.error("Camera failed after 3 attempts:", lastError);
      setError("camera_denied");
      return;
    }

    streamRef.current = stream;
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      try {
        await videoRef.current.play();
      } catch {
        // ignore autoplay restriction
      }
    }

    // Wait for video to be ready
    await new Promise<void>((resolve) => {
      const v = videoRef.current;
      if (!v) {
        resolve();
        return;
      }
      if (v.readyState >= 2) {
        resolve();
        return;
      }
      v.onloadeddata = () => resolve();
    });

    // Initialize Face Landmarker
    try {
      await initFaceLandmarker();
    } catch {
      setError("init_failed");
      return;
    }

    setIsDetecting(true);

    const runDetection = () => {
      if (!videoRef.current || isCompleteRef.current) return;
      if (videoRef.current.readyState < 2) return;
      if (isDetectingLockRef.current) return; // prevent overlapping calls

      isDetectingLockRef.current = true;
      const timestamp = performance.now();
      const result = detectForVideo(videoRef.current, timestamp);
      isDetectingLockRef.current = false;
      if (!result) return;

      const faces = result.faceLandmarks ?? [];
      const count = faces.length;
      setFaceCount(count);

      if (count === 0) {
        setError("no_face");
        taskValidSinceRef.current = null;
        setStabilityProgress(0);
        return;
      }
      if (count > 1) {
        setError("multiple_faces");
        taskValidSinceRef.current = null;
        setStabilityProgress(0);
        return;
      }

      setError(null);
      const rawLandmarks = faces[0] as Landmark[];

      // Reject low-quality frames
      if (rawLandmarks.length < MIN_LANDMARK_COUNT) {
        return;
      }

      // Face size check — normalized (inter-ocular fraction)
      const faceSize = calculateFaceSize(rawLandmarks);
      if (faceSize < MIN_FACE_SIZE) {
        setError("face_too_far");
        taskValidSinceRef.current = null;
        setStabilityProgress(0);
        return;
      }

      // Face pixel width check
      const videoWidth = videoRef.current?.videoWidth ?? 0;
      const faceWidthPx = calculateFaceWidthPx(rawLandmarks, videoWidth);
      if (videoWidth > 0 && faceWidthPx < MIN_FACE_WIDTH_PX) {
        setError("face_too_far");
        taskValidSinceRef.current = null;
        setStabilityProgress(0);
        return;
      }

      // Add to landmark history buffer for smoothing
      const history = landmarkHistoryRef.current;
      history.push(rawLandmarks);
      if (history.length > LANDMARK_HISTORY_SIZE) {
        history.shift();
      }

      // Use averaged landmarks for all calculations
      const smoothedLandmarks =
        history.length >= 2 ? averageLandmarks(history) : rawLandmarks;

      // Capture baseline measurements on first valid frame
      if (!baselineCapturedRef.current) {
        baselineMouthWidthRef.current = calculateMouthWidth(smoothedLandmarks);
        baselineMouthHeightRef.current =
          calculateMouthHeight(smoothedLandmarks);
        baselineEyebrowDistRef.current =
          calculateEyebrowEyeDistance(smoothedLandmarks);
        baselineCapturedRef.current = true;
      }

      // Draw landmarks on canvas (mirrored display)
      if (canvasRef.current && videoRef.current) {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          canvas.width = videoRef.current.videoWidth;
          canvas.height = videoRef.current.videoHeight;
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.fillStyle = "rgba(124, 58, 237, 0.5)";
          for (const lm of smoothedLandmarks) {
            ctx.beginPath();
            ctx.arc(
              lm.x * canvas.width,
              lm.y * canvas.height,
              1.5,
              0,
              Math.PI * 2,
            );
            ctx.fill();
          }
        }
      }

      checkCurrentTask(smoothedLandmarks, count);
    };

    detectionIntervalRef.current = setInterval(
      runDetection,
      DETECTION_INTERVAL_MS,
    );
  }, [checkCurrentTask]);

  useEffect(() => {
    return () => {
      stopDetection();
    };
  }, [stopDetection]);

  // calculateAvgEAR is used by useSelfieVerification — suppress linter for now
  void calculateAvgEAR;

  return {
    videoRef,
    canvasRef,
    currentTask,
    taskIndex,
    isDetecting,
    isComplete,
    error,
    selfieCapturing,
    startDetection,
    stopDetection,
    faceCount,
    stabilityProgress,
  };
}
