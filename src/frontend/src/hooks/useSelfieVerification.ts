import { useCallback, useEffect, useRef, useState } from "react";
import {
  type Landmark,
  averageLandmarks,
  calculateAvgEAR,
  calculateFaceSize,
  calculateFaceWidthPx,
  closeFaceMesh,
  initFaceMesh,
  isFaceCentered,
  sendVideoFrame,
} from "../lib/faceMesh";

const EAR_EYES_OPEN_THRESHOLD = 0.22;
const EAR_SELFIE_CHECK_THRESHOLD = 0.2;
const MIN_FACE_WIDTH_PX = 120;
const MIN_FACE_SIZE = 0.13;
const DETECTION_INTERVAL_MS = 600;
const LANDMARK_HISTORY_SIZE = 4;

/** How long canTakeSelfie must hold before auto-capture (ms) */
const AUTO_CAPTURE_STABLE_MS = 500;

export type SelfieError =
  | "camera_denied"
  | "init_failed"
  | "no_face"
  | "multiple_faces"
  | "face_too_small"
  | "eyes_closed"
  | "not_centered"
  | "selfie_failed"
  | null;

export interface UseSelfieVerificationReturn {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  isDetecting: boolean;
  faceDetected: boolean;
  eyesOpen: boolean;
  faceCentered: boolean;
  canTakeSelfie: boolean;
  verifiedMessage: string | null;
  error: SelfieError;
  captureState: "idle" | "capturing" | "success";
  startDetection: () => Promise<void>;
  stopDetection: () => void;
  takeSelfie: () => Promise<void>;
}

export function useSelfieVerification(
  onComplete: () => void,
): UseSelfieVerificationReturn {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const detectionIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null,
  );
  const isCompleteRef = useRef(false);
  const isRunningRef = useRef(false);
  const landmarkHistoryRef = useRef<Landmark[][]>([]);
  const autoCaptureFiredRef = useRef(false);
  const canTakeSelfieStableSinceRef = useRef<number | null>(null);

  // Use a ref to hold the latest takeSelfie to avoid circular dep in startDetection
  const takeSelfieRef = useRef<() => Promise<void>>(() => Promise.resolve());

  const [isDetecting, setIsDetecting] = useState(false);
  const [faceDetected, setFaceDetected] = useState(false);
  const [eyesOpen, setEyesOpen] = useState(false);
  const [faceCentered, setFaceCentered] = useState(false);
  const [error, setError] = useState<SelfieError>(null);
  const [captureState, setCaptureState] = useState<
    "idle" | "capturing" | "success"
  >("idle");

  const canTakeSelfie =
    faceDetected && eyesOpen && faceCentered && error === null;
  const verifiedMessage = canTakeSelfie ? "Face verified. Take selfie." : null;

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

  const takeSelfie = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) return;
    setCaptureState("capturing");

    // Stop live detection during capture
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
      detectionIntervalRef.current = null;
    }
    isRunningRef.current = false;

    // Wait a brief moment for the next video frame to settle
    await new Promise((r) => setTimeout(r, 80));

    // Run one final face check directly from video
    const landmarks = await sendVideoFrame(videoRef.current);

    if (!landmarks || landmarks.length === 0) {
      setError("selfie_failed");
      setCaptureState("idle");
      // Re-enable detection after failure
      isRunningRef.current = true;
      return;
    }

    // Check EAR on the captured frame
    const ear = calculateAvgEAR(landmarks);
    if (ear < EAR_SELFIE_CHECK_THRESHOLD) {
      setError("selfie_failed");
      setCaptureState("idle");
      isRunningRef.current = true;
      return;
    }

    // Success!
    isCompleteRef.current = true;
    setCaptureState("success");
    stopDetection();
    onComplete();
  }, [onComplete, stopDetection]);

  // Keep ref in sync
  takeSelfieRef.current = takeSelfie;

  const startDetection = useCallback(async () => {
    setError(null);
    isCompleteRef.current = false;
    isRunningRef.current = false;
    autoCaptureFiredRef.current = false;
    canTakeSelfieStableSinceRef.current = null;
    setFaceDetected(false);
    setEyesOpen(false);
    setFaceCentered(false);
    landmarkHistoryRef.current = [];
    setCaptureState("idle");

    // Acquire front camera — lightweight resolution for mobile
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
      } catch {
        if (attempt < 2) await new Promise((r) => setTimeout(r, 500));
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
        /* ignore */
      }
    }

    await new Promise<void>((resolve) => {
      const v = videoRef.current;
      if (!v || v.readyState >= 2) {
        resolve();
        return;
      }
      v.onloadeddata = () => resolve();
    });

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
        setFaceDetected(false);
        setEyesOpen(false);
        setFaceCentered(false);
        setError("no_face");
        canTakeSelfieStableSinceRef.current = null;
        return;
      }

      // Face size checks
      const videoWidth = videoRef.current?.videoWidth ?? 0;
      if (videoWidth > 0) {
        const faceWidthPx = calculateFaceWidthPx(landmarks, videoWidth);
        if (faceWidthPx < MIN_FACE_WIDTH_PX) {
          setFaceDetected(false);
          setEyesOpen(false);
          setFaceCentered(false);
          setError("face_too_small");
          canTakeSelfieStableSinceRef.current = null;
          return;
        }
      }

      const faceSize = calculateFaceSize(landmarks);
      if (faceSize < MIN_FACE_SIZE) {
        setFaceDetected(false);
        setEyesOpen(false);
        setFaceCentered(false);
        setError("face_too_small");
        canTakeSelfieStableSinceRef.current = null;
        return;
      }

      // Add to history for smoothing
      const history = landmarkHistoryRef.current;
      history.push(landmarks);
      if (history.length > LANDMARK_HISTORY_SIZE) history.shift();
      const smoothed =
        history.length >= 2 ? averageLandmarks(history) : landmarks;

      const ear = calculateAvgEAR(smoothed);
      const isEyesOpen = ear > EAR_EYES_OPEN_THRESHOLD;
      const isCentered = isFaceCentered(smoothed);

      setError(null);
      setFaceDetected(true);
      setEyesOpen(isEyesOpen);
      setFaceCentered(isCentered);

      const readyToCapture = isEyesOpen && isCentered;

      if (readyToCapture) {
        const now = Date.now();
        if (canTakeSelfieStableSinceRef.current === null) {
          canTakeSelfieStableSinceRef.current = now;
        }
        const heldFor = now - canTakeSelfieStableSinceRef.current;

        // Auto-capture after stable for AUTO_CAPTURE_STABLE_MS
        if (
          heldFor >= AUTO_CAPTURE_STABLE_MS &&
          !autoCaptureFiredRef.current &&
          !isCompleteRef.current
        ) {
          autoCaptureFiredRef.current = true;
          takeSelfieRef.current();
        }
      } else {
        canTakeSelfieStableSinceRef.current = null;
      }
    };

    detectionIntervalRef.current = setInterval(() => {
      if (!isRunningRef.current) return;
      runDetection();
    }, DETECTION_INTERVAL_MS);
  }, []);

  useEffect(() => {
    return () => {
      stopDetection();
    };
  }, [stopDetection]);

  return {
    videoRef,
    canvasRef,
    isDetecting,
    faceDetected,
    eyesOpen,
    faceCentered,
    canTakeSelfie,
    verifiedMessage,
    error,
    captureState,
    startDetection,
    stopDetection,
    takeSelfie,
  };
}
