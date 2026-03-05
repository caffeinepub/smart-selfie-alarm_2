/**
 * faceDetection.ts
 * Backward-compatibility re-export shim.
 * All detection logic has moved to faceMesh.ts.
 */
export {
  type Landmark,
  averageLandmarks,
  calculateAvgEAR,
  calculateEyebrowEyeDistance,
  calculateFaceSize,
  calculateFaceWidthPx,
  calculateMouthHeight,
  calculateMouthWidth,
  closeFaceMesh as closeFaceLandmarker,
  getNoseOffsetFraction,
  initFaceMesh as initFaceLandmarker,
  isFaceCentered,
  sendVideoFrame as detectForVideo,
} from "./faceMesh";

// Stub for detectForImage — not used in new flow
export async function detectForImage(
  _canvas: HTMLCanvasElement,
): Promise<null> {
  return null;
}

// Stub for getFaceConfidence
export function getFaceConfidence(_result: unknown): number {
  return 0.9;
}

// calculateEyesOpenRatio alias
export { calculateAvgEAR as calculateEyesOpenRatio } from "./faceMesh";
