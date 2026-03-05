import { useCallback, useEffect, useRef, useState } from "react";
import {
  type Landmark,
  averageLandmarks,
  calculateAvgEAR,
  calculateFaceWidthPx,
  closeFaceLandmarker,
  detectForVideo,
  initFaceLandmarker,
} from "../lib/faceDetection";

const EAR_EYES_OPEN_THRESHOLD = 0.22;
const MIN_FACE_WIDTH_PX = 120;
const DETECTION_INTERVAL_MS = 750;
const LANDMARK_HISTORY_SIZE = 4;

export type SelfieError =
  | "camera_denied"
  | "init_failed"
  | "no_face"
  | "multiple_faces"
  | "face_too_small"
  | "eyes_closed"
  | "selfie_failed"
  | null;

export interface UseSelfieVerificationReturn {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  isDetecting: boolean;
  faceDetected: boolean;
  eyesOpen: boolean;
  canTakeSelfie: boolean;
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
  const landmarkHistoryRef = useRef<Landmark[][]>([]);
  const autoCaptureFiredRef = useRef(false);
  // Use a ref to hold latest takeSelfie to avoid circular dep in startDetection
  const takeSelfieRef = useRef<() => Promise<void>>(() => Promise.resolve());

  const [isDetecting, setIsDetecting] = useState(false);
  const [faceDetected, setFaceDetected] = useState(false);
  const [eyesOpen, setEyesOpen] = useState(false);
  const [error, setError] = useState<SelfieError>(null);
  const [captureState, setCaptureState] = useState<
    "idle" | "capturing" | "success"
  >("idle");

  const canTakeSelfie = faceDetected && eyesOpen && error === null;

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

  const takeSelfie = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current) return;

    // Mark complete and stop detection immediately — no post-capture loops
    isCompleteRef.current = true;
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
      detectionIntervalRef.current = null;
    }

    setCaptureState("success");

    // Capture the frame to canvas (visual feedback only)
    const canvas = canvasRef.current;
    const video = videoRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (ctx) ctx.drawImage(video, 0, 0);

    // Stop camera stream
    if (streamRef.current) {
      for (const t of streamRef.current.getTracks()) t.stop();
      streamRef.current = null;
    }

    // Dismiss alarm immediately
    onComplete();
  }, [onComplete]);

  // Keep ref in sync so runDetection can call it without stale closure
  takeSelfieRef.current = takeSelfie;

  const startDetection = useCallback(async () => {
    setError(null);
    isCompleteRef.current = false;
    autoCaptureFiredRef.current = false;
    setFaceDetected(false);
    setEyesOpen(false);
    landmarkHistoryRef.current = [];
    setCaptureState("idle");

    let stream: MediaStream | null = null;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "user",
            width: { ideal: 1280 },
            height: { ideal: 720 },
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
      await initFaceLandmarker();
    } catch {
      setError("init_failed");
      return;
    }

    setIsDetecting(true);

    const runDetection = () => {
      if (!videoRef.current || isCompleteRef.current) return;
      if (videoRef.current.readyState < 2) return;

      const timestamp = performance.now();
      const result = detectForVideo(videoRef.current, timestamp);
      if (!result) return;

      const faces = result.faceLandmarks ?? [];
      const count = faces.length;

      if (count === 0) {
        setFaceDetected(false);
        setEyesOpen(false);
        setError("no_face");
        return;
      }
      if (count > 1) {
        setFaceDetected(false);
        setEyesOpen(false);
        setError("multiple_faces");
        return;
      }

      const rawLandmarks = faces[0] as Landmark[];

      // Face size check
      const videoWidth = videoRef.current?.videoWidth ?? 0;
      const faceWidthPx = calculateFaceWidthPx(rawLandmarks, videoWidth);
      if (videoWidth > 0 && faceWidthPx < MIN_FACE_WIDTH_PX) {
        setFaceDetected(false);
        setEyesOpen(false);
        setError("face_too_small");
        return;
      }

      // Add to history
      const history = landmarkHistoryRef.current;
      history.push(rawLandmarks);
      if (history.length > LANDMARK_HISTORY_SIZE) history.shift();

      const smoothed =
        history.length >= 2 ? averageLandmarks(history) : rawLandmarks;

      const ear = calculateAvgEAR(smoothed);
      const isEyesOpen = ear > EAR_EYES_OPEN_THRESHOLD;

      setError(null);
      setFaceDetected(true);
      setEyesOpen(isEyesOpen);

      // No auto-capture — user must press Take Selfie button when ready
    };

    detectionIntervalRef.current = setInterval(
      runDetection,
      DETECTION_INTERVAL_MS,
    );
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
    canTakeSelfie,
    error,
    captureState,
    startDetection,
    stopDetection,
    takeSelfie,
  };
}
