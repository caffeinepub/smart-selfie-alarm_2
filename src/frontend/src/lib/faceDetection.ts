// src/lib/faceDetection.ts
// Uses @mediapipe/tasks-vision FaceLandmarker (478-point model, same indices as face_mesh)

import {
  FaceLandmarker,
  type FaceLandmarkerResult,
  FilesetResolver,
} from "@mediapipe/tasks-vision";

export interface Landmark {
  x: number;
  y: number;
  z: number;
}

export type FaceLandmarkerResultCallback = (
  result: FaceLandmarkerResult,
  timestamp: number,
) => void;

// Eye landmark indices (same as MediaPipe face_mesh 478-pt model)
export const EYE_INDICES = {
  leftEye: [362, 385, 387, 263, 373, 380] as const,
  rightEye: [33, 160, 158, 133, 153, 144] as const,
  leftEyeOuter: 263,
  rightEyeOuter: 33,
} as const;

// Eyebrow landmark indices (upper brow arch landmarks)
export const EYEBROW_INDICES = {
  // Left eyebrow (landmark space) upper midpoint
  leftBrow: 336,
  // Right eyebrow upper midpoint
  rightBrow: 107,
  // Reference: pupil center approximations
  leftPupil: 468,
  rightPupil: 473,
  // Eye center fallbacks
  leftEyeCenter: 386,
  rightEyeCenter: 159,
} as const;

export const FACE_INDICES = {
  noseTip: 1,
  leftCheek: 234,
  rightCheek: 454,
  // Mouth corners
  leftMouthCorner: 61,
  rightMouthCorner: 291,
  // Additional mouth landmarks for better width
  leftMouthOuter: 76,
  rightMouthOuter: 306,
  chin: 152,
  forehead: 10,
} as const;

// Tongue tip landmark (approximately index 13 = lower lip inside, 14 = tongue area)
export const TONGUE_INDEX = 13;

const WASM_URL =
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm";
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";

let landmarkerInstance: FaceLandmarker | null = null;

export async function initFaceLandmarker(): Promise<FaceLandmarker> {
  if (landmarkerInstance) return landmarkerInstance;

  const filesetResolver = await FilesetResolver.forVisionTasks(WASM_URL);

  landmarkerInstance = await FaceLandmarker.createFromOptions(filesetResolver, {
    baseOptions: {
      modelAssetPath: MODEL_URL,
      delegate: "GPU",
    },
    outputFaceBlendshapes: true,
    runningMode: "VIDEO",
    numFaces: 2,
    // Raised confidence thresholds for more reliable detection
    minFaceDetectionConfidence: 0.65,
    minFacePresenceConfidence: 0.65,
    minTrackingConfidence: 0.65,
  });

  return landmarkerInstance;
}

export function closeFaceLandmarker(): void {
  if (landmarkerInstance) {
    try {
      landmarkerInstance.close();
    } catch {
      /* ignore */
    }
    landmarkerInstance = null;
  }
}

/**
 * Run detection on a video frame. Returns FaceLandmarkerResult.
 */
export function detectForVideo(
  video: HTMLVideoElement,
  timestamp: number,
): FaceLandmarkerResult | null {
  if (!landmarkerInstance) return null;
  try {
    return landmarkerInstance.detectForVideo(video, timestamp);
  } catch {
    return null;
  }
}

/**
 * Run detection on a canvas/image element for selfie verification.
 * Temporarily switches to IMAGE mode.
 */
export async function detectForImage(
  imageData: HTMLCanvasElement,
): Promise<FaceLandmarkerResult | null> {
  if (!landmarkerInstance) return null;
  try {
    // Switch to IMAGE mode for single image detection
    await landmarkerInstance.setOptions({ runningMode: "IMAGE" });
    const result = landmarkerInstance.detect(imageData);
    // Switch back to VIDEO mode
    await landmarkerInstance.setOptions({ runningMode: "VIDEO" });
    return result;
  } catch {
    return null;
  }
}

/**
 * Calculate Eye Aspect Ratio (EAR).
 * EAR = (||p2-p6|| + ||p3-p5||) / (2 * ||p1-p4||)
 */
export function calculateEAR(
  landmarks: Landmark[],
  eyeIndices: readonly number[],
): number {
  if (eyeIndices.length < 6) return 0;
  const [i1, i2, i3, i4, i5, i6] = eyeIndices;
  const p1 = landmarks[i1];
  const p2 = landmarks[i2];
  const p3 = landmarks[i3];
  const p4 = landmarks[i4];
  const p5 = landmarks[i5];
  const p6 = landmarks[i6];
  if (!p1 || !p2 || !p3 || !p4 || !p5 || !p6) return 0;

  const dist2D = (a: Landmark, b: Landmark) =>
    Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
  const v1 = dist2D(p2, p6);
  const v2 = dist2D(p3, p5);
  const h = dist2D(p1, p4);
  if (h === 0) return 0;
  return (v1 + v2) / (2 * h);
}

/**
 * Calculate average EAR for both eyes.
 */
export function calculateAvgEAR(landmarks: Landmark[]): number {
  const leftEAR = calculateEAR(landmarks, EYE_INDICES.leftEye);
  const rightEAR = calculateEAR(landmarks, EYE_INDICES.rightEye);
  return (leftEAR + rightEAR) / 2;
}

/**
 * Calculate yaw angle in degrees using nose tip relative to face center.
 * Positive = head turned right (in landmark space, not mirrored display).
 * Negative = head turned left.
 * Threshold: nose must shift > 15% of faceWidth from baseline center.
 */
export function calculateYaw(landmarks: Landmark[]): number {
  const nose = landmarks[FACE_INDICES.noseTip];
  const leftCheek = landmarks[FACE_INDICES.leftCheek];
  const rightCheek = landmarks[FACE_INDICES.rightCheek];
  if (!nose || !leftCheek || !rightCheek) return 0;

  const faceCenter = (leftCheek.x + rightCheek.x) / 2;
  const faceWidth = Math.abs(rightCheek.x - leftCheek.x);
  if (faceWidth === 0) return 0;

  // Normalize offset: -0.5 to +0.5 range → scale to approximate degrees
  // When fully turned ~45deg, ratio is about 0.25
  const normalizedOffset = (nose.x - faceCenter) / faceWidth;
  return normalizedOffset * 90; // scale to degrees
}

/**
 * Get raw nose offset as fraction of face width.
 * Returns value from -0.5 (fully left) to +0.5 (fully right).
 * Used for 15% threshold check.
 */
export function getNoseOffsetFraction(landmarks: Landmark[]): number {
  const nose = landmarks[FACE_INDICES.noseTip];
  const leftCheek = landmarks[FACE_INDICES.leftCheek];
  const rightCheek = landmarks[FACE_INDICES.rightCheek];
  if (!nose || !leftCheek || !rightCheek) return 0;

  const faceCenter = (leftCheek.x + rightCheek.x) / 2;
  const faceWidth = Math.abs(rightCheek.x - leftCheek.x);
  if (faceWidth === 0) return 0;

  return (nose.x - faceCenter) / faceWidth;
}

/**
 * Calculate face size as inter-ocular distance / image width.
 * Use outer eye corners (indices 33, 263).
 */
export function calculateFaceSize(landmarks: Landmark[]): number {
  const leftOuter = landmarks[EYE_INDICES.leftEyeOuter];
  const rightOuter = landmarks[EYE_INDICES.rightEyeOuter];
  if (!leftOuter || !rightOuter) return 0;
  return Math.abs(leftOuter.x - rightOuter.x); // normalized 0-1
}

/**
 * Calculate face width in pixels using cheek landmarks.
 * Used for absolute minimum distance check (face must be >= 120px wide).
 */
export function calculateFaceWidthPx(
  landmarks: Landmark[],
  imageWidth: number,
): number {
  const leftCheek = landmarks[FACE_INDICES.leftCheek];
  const rightCheek = landmarks[FACE_INDICES.rightCheek];
  if (!leftCheek || !rightCheek || imageWidth === 0) return 0;
  return Math.abs(rightCheek.x - leftCheek.x) * imageWidth;
}

/**
 * Calculate mouth width using outer mouth corners.
 * Returns normalized width (0-1 in image space).
 */
export function calculateMouthWidth(landmarks: Landmark[]): number {
  const leftCorner = landmarks[FACE_INDICES.leftMouthCorner];
  const rightCorner = landmarks[FACE_INDICES.rightMouthCorner];
  if (!leftCorner || !rightCorner) return 0;
  return Math.abs(rightCorner.x - leftCorner.x);
}

/**
 * Calculate eyebrow-to-eye distance (normalized).
 * Uses the vertical distance between the brow arch and the eye lid.
 */
export function calculateEyebrowEyeDistance(landmarks: Landmark[]): number {
  const leftBrow = landmarks[EYEBROW_INDICES.leftBrow];
  const rightBrow = landmarks[EYEBROW_INDICES.rightBrow];
  const leftEye = landmarks[EYEBROW_INDICES.leftEyeCenter];
  const rightEye = landmarks[EYEBROW_INDICES.rightEyeCenter];

  if (!leftBrow || !rightBrow || !leftEye || !rightEye) return 0;

  const leftDist = Math.abs(leftBrow.y - leftEye.y);
  const rightDist = Math.abs(rightBrow.y - rightEye.y);
  return (leftDist + rightDist) / 2;
}

/**
 * Detect smile using baseline comparison.
 * Returns true if current mouthWidth > baseline * 1.25.
 * If no baseline provided, falls back to ratio against inter-ocular distance.
 */
export function detectSmile(
  landmarks: Landmark[],
  baselineMouthWidth?: number,
): boolean {
  const mouthWidth = calculateMouthWidth(landmarks);
  if (mouthWidth === 0) return false;

  if (baselineMouthWidth !== undefined && baselineMouthWidth > 0) {
    // Baseline comparison: smile if mouth is 30% wider than neutral
    return mouthWidth > baselineMouthWidth * 1.3;
  }

  // Fallback: ratio against inter-ocular distance
  const leftOuter = landmarks[EYE_INDICES.leftEyeOuter];
  const rightOuter = landmarks[EYE_INDICES.rightEyeOuter];
  if (!leftOuter || !rightOuter) return false;
  const interOcular = Math.abs(rightOuter.x - leftOuter.x);
  if (interOcular === 0) return false;
  return mouthWidth / interOcular > 0.9;
}

/**
 * Calculate mouth height using vertical distance between upper and lower lip centers.
 * Landmark 13 = lower lip inner (top of inner lower lip)
 * Landmark 14 = upper lip inner bottom area
 * Using a simpler approach: landmark 0 (upper lip outer top) and 17 (lower lip outer bottom).
 */
export function calculateMouthHeight(landmarks: Landmark[]): number {
  // Use upper lip top center (index 0) and lower lip bottom center (index 17)
  const upperLip = landmarks[0];
  const lowerLip = landmarks[17];
  if (!upperLip || !lowerLip) return 0;
  return Math.abs(lowerLip.y - upperLip.y);
}

/**
 * Alias for calculateAvgEAR — returns the average eye aspect ratio.
 */
export function calculateEyesOpenRatio(landmarks: Landmark[]): number {
  return calculateAvgEAR(landmarks);
}

/**
 * Detect eyebrow raise using baseline comparison.
 * Returns true if current eyebrow-eye distance > baseline * 1.2.
 */
export function detectEyebrowRaise(
  landmarks: Landmark[],
  baselineEyebrowDist?: number,
): boolean {
  const dist = calculateEyebrowEyeDistance(landmarks);
  if (dist === 0) return false;

  if (baselineEyebrowDist !== undefined && baselineEyebrowDist > 0) {
    return dist > baselineEyebrowDist * 1.2;
  }

  // Fallback threshold: absolute distance > 0.04 (normalized)
  return dist > 0.04;
}

/**
 * Average an array of landmark frames into a single smoothed frame.
 * All frames must have the same number of landmarks.
 */
export function averageLandmarks(frames: Landmark[][]): Landmark[] {
  if (frames.length === 0) return [];
  const count = frames[0].length;
  const result: Landmark[] = [];

  for (let i = 0; i < count; i++) {
    let sx = 0;
    let sy = 0;
    let sz = 0;
    let valid = 0;
    for (const frame of frames) {
      const lm = frame[i];
      if (lm) {
        sx += lm.x;
        sy += lm.y;
        sz += lm.z;
        valid++;
      }
    }
    if (valid > 0) {
      result.push({ x: sx / valid, y: sy / valid, z: sz / valid });
    } else {
      result.push({ x: 0, y: 0, z: 0 });
    }
  }

  return result;
}

/**
 * Get face detection confidence from blendshapes or detection result.
 */
export function getFaceConfidence(result: FaceLandmarkerResult): number {
  // Use the face blendshape presence as proxy for confidence
  // faceLandmarks presence is the best indicator we have
  if (!result.faceLandmarks || result.faceLandmarks.length === 0) return 0;
  // FaceLandmarker doesn't expose detection confidence directly,
  // so we use whether landmarks were found as the primary indicator.
  // For selfie mode, check if we have full 478 landmarks
  const lms = result.faceLandmarks[0];
  if (!lms || lms.length < 400) return 0.5;
  return 0.9; // if we have full landmark set, confidence is high
}
