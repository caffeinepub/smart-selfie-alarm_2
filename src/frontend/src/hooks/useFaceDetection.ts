import { useCallback, useEffect, useRef, useState } from "react";
import {
  type Landmark,
  closeFaceMesh,
  detectBlink,
  detectEyesOpen,
  detectHeadTurnLeft,
  detectHeadTurnRight,
  detectSmile,
  initFaceMesh,
} from "../lib/faceDetection";

export type VerificationTask =
  | "blink"
  | "turn_right"
  | "turn_left"
  | "smile"
  | "eyes_open"
  | "selfie";

export const TASK_LIST: VerificationTask[] = [
  "blink",
  "turn_right",
  "turn_left",
  "smile",
  "eyes_open",
  "selfie",
];

export const TASK_LABELS: Record<VerificationTask, string> = {
  blink: "Blink your eyes",
  turn_right: "Turn your head right",
  turn_left: "Turn your head left",
  smile: "Smile!",
  eyes_open: "Keep eyes open for 2 seconds",
  selfie: "Take a selfie",
};

export const TASK_ICONS: Record<VerificationTask, string> = {
  blink: "👁️",
  turn_right: "👉",
  turn_left: "👈",
  smile: "😊",
  eyes_open: "👀",
  selfie: "📸",
};

export type FaceDetectionError =
  | "camera_denied"
  | "no_face"
  | "multiple_faces"
  | "slow_device"
  | "init_failed"
  | null;

interface UseFaceDetectionReturn {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  currentTask: VerificationTask;
  taskIndex: number;
  isDetecting: boolean;
  isComplete: boolean;
  error: FaceDetectionError;
  selfieDataUrl: string | null;
  eyesOpenDuration: number;
  startDetection: () => Promise<void>;
  stopDetection: () => void;
  faceCount: number;
}

export function useFaceDetection(
  onComplete: () => void,
  cameraFacing: "user" | "environment" = "user",
): UseFaceDetectionReturn {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectionIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null,
  );
  const faceMeshRef = useRef<{
    send: (opts: { image: HTMLVideoElement }) => Promise<void>;
    close: () => void;
  } | null>(null);
  const currentLandmarksRef = useRef<Landmark[][] | null>(null);
  const eyesOpenStartRef = useRef<number | null>(null);
  const detectionStartTimeRef = useRef<number>(0);

  const [currentTask, setCurrentTask] = useState<VerificationTask>(
    TASK_LIST[0],
  );
  const [taskIndex, setTaskIndex] = useState(0);
  const [isDetecting, setIsDetecting] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [error, setError] = useState<FaceDetectionError>(null);
  const [selfieDataUrl, setSelfieDataUrl] = useState<string | null>(null);
  const [faceCount, setFaceCount] = useState(0);
  const [eyesOpenDuration, setEyesOpenDuration] = useState(0);
  const intervalMs = useRef(800);
  const taskIndexRef = useRef(0);
  const isCompleteRef = useRef(false);

  const stopDetection = useCallback(() => {
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
      detectionIntervalRef.current = null;
    }
    if (streamRef.current) {
      for (const t of streamRef.current.getTracks()) {
        t.stop();
      }
      streamRef.current = null;
    }
    closeFaceMesh();
    faceMeshRef.current = null;
    setIsDetecting(false);
  }, []);

  const advanceTask = useCallback(
    (nextIndex: number) => {
      if (isCompleteRef.current) return;
      if (nextIndex >= TASK_LIST.length) {
        isCompleteRef.current = true;
        setIsComplete(true);
        stopDetection();
        onComplete();
        return;
      }
      taskIndexRef.current = nextIndex;
      setTaskIndex(nextIndex);
      setCurrentTask(TASK_LIST[nextIndex]);
      eyesOpenStartRef.current = null;
      setEyesOpenDuration(0);
    },
    [onComplete, stopDetection],
  );

  const checkCurrentTask = useCallback(
    (landmarks: Landmark[], count: number) => {
      const task = TASK_LIST[taskIndexRef.current];
      if (!task) return;

      if (count === 0) return; // no face detected
      if (count > 1) return; // multiple faces

      switch (task) {
        case "blink":
          if (detectBlink(landmarks)) advanceTask(taskIndexRef.current + 1);
          break;
        case "turn_right":
          if (detectHeadTurnRight(landmarks))
            advanceTask(taskIndexRef.current + 1);
          break;
        case "turn_left":
          if (detectHeadTurnLeft(landmarks))
            advanceTask(taskIndexRef.current + 1);
          break;
        case "smile":
          if (detectSmile(landmarks)) advanceTask(taskIndexRef.current + 1);
          break;
        case "eyes_open": {
          const eyesOpen = detectEyesOpen(landmarks);
          if (eyesOpen) {
            if (!eyesOpenStartRef.current) {
              eyesOpenStartRef.current = Date.now();
            }
            const elapsed = (Date.now() - eyesOpenStartRef.current) / 1000;
            setEyesOpenDuration(Math.min(elapsed, 2));
            if (elapsed >= 2) {
              advanceTask(taskIndexRef.current + 1);
            }
          } else {
            eyesOpenStartRef.current = null;
            setEyesOpenDuration(0);
          }
          break;
        }
        case "selfie": {
          // Capture canvas frame as selfie
          if (canvasRef.current && videoRef.current) {
            const canvas = canvasRef.current;
            const ctx = canvas.getContext("2d");
            if (ctx) {
              canvas.width = videoRef.current.videoWidth;
              canvas.height = videoRef.current.videoHeight;
              ctx.drawImage(videoRef.current, 0, 0);
              const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
              setSelfieDataUrl(dataUrl);
              advanceTask(taskIndexRef.current + 1);
            }
          }
          break;
        }
      }
    },
    [advanceTask],
  );

  const startDetection = useCallback(async () => {
    setError(null);
    taskIndexRef.current = 0;
    isCompleteRef.current = false;
    setTaskIndex(0);
    setCurrentTask(TASK_LIST[0]);
    setIsComplete(false);
    eyesOpenStartRef.current = null;
    setEyesOpenDuration(0);

    // Get camera stream
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: cameraFacing, width: 640, height: 480 },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (err) {
      console.error("Camera error:", err);
      setError("camera_denied");
      return;
    }

    // Initialize FaceMesh
    try {
      const fm = await initFaceMesh((results) => {
        const faces = results.multiFaceLandmarks ?? [];
        currentLandmarksRef.current = faces;
        const count = faces.length;
        setFaceCount(count);

        if (count === 0) {
          // Don't set error, just show warning inline
        } else if (count > 1) {
          // Multiple faces warning
        } else if (faces[0]) {
          // Draw face mesh on canvas
          if (canvasRef.current && videoRef.current) {
            const canvas = canvasRef.current;
            const ctx = canvas.getContext("2d");
            if (ctx) {
              canvas.width = videoRef.current.videoWidth;
              canvas.height = videoRef.current.videoHeight;
              ctx.clearRect(0, 0, canvas.width, canvas.height);
              // Draw subtle dots for landmarks
              ctx.fillStyle = "rgba(124, 58, 237, 0.6)";
              for (const lm of faces[0]) {
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
          checkCurrentTask(faces[0], count);
        }
      });
      faceMeshRef.current = fm;
    } catch {
      setError("init_failed");
      return;
    }

    setIsDetecting(true);

    // Start detection interval
    const runDetection = async () => {
      if (!videoRef.current || !faceMeshRef.current || isCompleteRef.current)
        return;
      if (videoRef.current.readyState < 2) return;

      const start = Date.now();
      try {
        await faceMeshRef.current.send({ image: videoRef.current });
      } catch {
        // ignore send errors
      }
      const elapsed = Date.now() - start;

      // Slow device fallback
      if (elapsed > 1200 && intervalMs.current === 800) {
        intervalMs.current = 1500;
        if (detectionIntervalRef.current) {
          clearInterval(detectionIntervalRef.current);
          detectionIntervalRef.current = setInterval(runDetection, 1500);
        }
      }
      detectionStartTimeRef.current = start;
    };

    detectionIntervalRef.current = setInterval(
      runDetection,
      intervalMs.current,
    );
  }, [cameraFacing, checkCurrentTask]);

  // Cleanup on unmount
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
    selfieDataUrl,
    eyesOpenDuration,
    startDetection,
    stopDetection,
    faceCount,
  };
}
