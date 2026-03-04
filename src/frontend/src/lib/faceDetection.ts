// Face detection utilities using MediaPipe Face Mesh landmark indices
// Left eye: [362, 385, 387, 263, 373, 380]
// Right eye: [33, 160, 158, 133, 153, 144]
// Nose tip: 1
// Left mouth corner: 61
// Right mouth corner: 291
// Face center X: average of cheeks (234, 454)

export const LANDMARK_INDICES = {
  leftEye: [362, 385, 387, 263, 373, 380] as const,
  rightEye: [33, 160, 158, 133, 153, 144] as const,
  noseTip: 1,
  leftMouthCorner: 61,
  rightMouthCorner: 291,
  leftCheek: 234,
  rightCheek: 454,
} as const;

export interface Landmark {
  x: number;
  y: number;
  z?: number;
}

/**
 * Calculate Eye Aspect Ratio (EAR) for blink detection.
 * EAR = (||p2-p6|| + ||p3-p5||) / (2 * ||p1-p4||)
 */
export function calculateEAR(
  landmarks: Landmark[],
  eyeIndices: readonly number[],
): number {
  if (eyeIndices.length < 6) return 0;

  const p1 = landmarks[eyeIndices[0]];
  const p2 = landmarks[eyeIndices[1]];
  const p3 = landmarks[eyeIndices[2]];
  const p4 = landmarks[eyeIndices[3]];
  const p5 = landmarks[eyeIndices[4]];
  const p6 = landmarks[eyeIndices[5]];

  if (!p1 || !p2 || !p3 || !p4 || !p5 || !p6) return 0;

  const dist = (a: Landmark, b: Landmark) =>
    Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);

  const vertical1 = dist(p2, p6);
  const vertical2 = dist(p3, p5);
  const horizontal = dist(p1, p4);

  if (horizontal === 0) return 0;
  return (vertical1 + vertical2) / (2.0 * horizontal);
}

/**
 * Detect blink: EAR below threshold
 */
export function detectBlink(landmarks: Landmark[]): boolean {
  const leftEAR = calculateEAR(landmarks, LANDMARK_INDICES.leftEye);
  const rightEAR = calculateEAR(landmarks, LANDMARK_INDICES.rightEye);
  const avgEAR = (leftEAR + rightEAR) / 2;
  return avgEAR < 0.25 && avgEAR > 0;
}

/**
 * Detect head turn right: nose X > face center + threshold
 */
export function detectHeadTurnRight(landmarks: Landmark[]): boolean {
  const nose = landmarks[LANDMARK_INDICES.noseTip];
  const leftCheek = landmarks[LANDMARK_INDICES.leftCheek];
  const rightCheek = landmarks[LANDMARK_INDICES.rightCheek];

  if (!nose || !leftCheek || !rightCheek) return false;

  const faceCenter = (leftCheek.x + rightCheek.x) / 2;
  const faceWidth = Math.abs(rightCheek.x - leftCheek.x);
  const threshold = faceWidth * 0.12;

  return nose.x > faceCenter + threshold;
}

/**
 * Detect head turn left: nose X < face center - threshold
 */
export function detectHeadTurnLeft(landmarks: Landmark[]): boolean {
  const nose = landmarks[LANDMARK_INDICES.noseTip];
  const leftCheek = landmarks[LANDMARK_INDICES.leftCheek];
  const rightCheek = landmarks[LANDMARK_INDICES.rightCheek];

  if (!nose || !leftCheek || !rightCheek) return false;

  const faceCenter = (leftCheek.x + rightCheek.x) / 2;
  const faceWidth = Math.abs(rightCheek.x - leftCheek.x);
  const threshold = faceWidth * 0.12;

  return nose.x < faceCenter - threshold;
}

/**
 * Detect smile: mouth corners Y spread relative to face height
 */
export function detectSmile(landmarks: Landmark[]): boolean {
  const leftCorner = landmarks[LANDMARK_INDICES.leftMouthCorner];
  const rightCorner = landmarks[LANDMARK_INDICES.rightMouthCorner];
  const leftCheek = landmarks[LANDMARK_INDICES.leftCheek];
  const rightCheek = landmarks[LANDMARK_INDICES.rightCheek];

  if (!leftCorner || !rightCorner || !leftCheek || !rightCheek) return false;

  const mouthWidth = Math.abs(rightCorner.x - leftCorner.x);
  const faceWidth = Math.abs(rightCheek.x - leftCheek.x);

  if (faceWidth === 0) return false;
  const ratio = mouthWidth / faceWidth;
  return ratio > 0.45;
}

/**
 * Detect eyes open: average EAR > threshold
 */
export function detectEyesOpen(landmarks: Landmark[]): boolean {
  const leftEAR = calculateEAR(landmarks, LANDMARK_INDICES.leftEye);
  const rightEAR = calculateEAR(landmarks, LANDMARK_INDICES.rightEye);
  const avgEAR = (leftEAR + rightEAR) / 2;
  return avgEAR > 0.3;
}

export type FaceMeshResultsCallback = (results: {
  multiFaceLandmarks?: Landmark[][];
}) => void;

let faceMeshInstance: {
  send: (options: { image: HTMLVideoElement }) => Promise<void>;
  close: () => void;
} | null = null;

/**
 * Initialize FaceMesh from @mediapipe/face_mesh
 * Uses dynamic import to avoid SSR issues
 */
export async function initFaceMesh(
  onResults: FaceMeshResultsCallback,
): Promise<{
  send: (options: { image: HTMLVideoElement }) => Promise<void>;
  close: () => void;
}> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const FaceMeshModule = await import("@mediapipe/face_mesh" as any);
    const FaceMesh = FaceMeshModule.FaceMesh;

    const faceMesh = new FaceMesh({
      locateFile: (file: string) =>
        `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
    });

    faceMesh.setOptions({
      maxNumFaces: 2,
      refineLandmarks: false,
      minDetectionConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });

    faceMesh.onResults(onResults);
    await faceMesh.initialize();

    faceMeshInstance = faceMesh;
    return faceMesh;
  } catch (err) {
    console.error("Failed to initialize FaceMesh:", err);
    throw err;
  }
}

export function closeFaceMesh(): void {
  if (faceMeshInstance) {
    try {
      faceMeshInstance.close();
    } catch {
      // ignore
    }
    faceMeshInstance = null;
  }
}
