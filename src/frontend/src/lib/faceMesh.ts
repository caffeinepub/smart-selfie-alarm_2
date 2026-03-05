/**
 * faceMesh.ts
 * MediaPipe FaceMesh detection engine using the @mediapipe/face_mesh package.
 * Loads WASM and model files from CDN, returns 468 normalized landmarks.
 *
 * Usage:
 *   await initFaceMesh()
 *   const landmarks = await sendVideoFrame(videoElement)
 *   closeFaceMesh()
 */

// Use CDN-loaded FaceMesh via dynamic import / script tag to avoid bundling WASM
// The package is installed but we use locateFile to point to CDN for the actual binaries.

export interface Landmark {
  x: number;
  y: number;
  z: number;
}

// CDN base for the face_mesh WASM and model files
const FACE_MESH_CDN =
  "https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.4.1633559619/";

// Singleton instance
let faceMeshInstance: import("@mediapipe/face_mesh").FaceMesh | null = null;
let initPromise: Promise<void> | null = null;
let pendingResolve: ((lm: Landmark[] | null) => void) | null = null;

/**
 * Initialize the FaceMesh instance (idempotent — safe to call multiple times).
 */
export async function initFaceMesh(): Promise<void> {
  if (faceMeshInstance) return;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const { FaceMesh } = await import("@mediapipe/face_mesh");

    const mesh = new FaceMesh({
      locateFile: (file: string) => `${FACE_MESH_CDN}${file}`,
    });

    await mesh.setOptions({
      maxNumFaces: 1,
      refineLandmarks: true,
      minDetectionConfidence: 0.65,
      minTrackingConfidence: 0.65,
    });

    // Wire up the results callback
    mesh.onResults((results) => {
      if (!pendingResolve) return;

      const lms = results.multiFaceLandmarks?.[0];
      if (!lms || lms.length === 0) {
        pendingResolve(null);
      } else {
        // Convert to our Landmark type
        pendingResolve(lms as Landmark[]);
      }
      pendingResolve = null;
    });

    faceMeshInstance = mesh;
  })();

  return initPromise;
}

/**
 * Close and release the FaceMesh instance.
 */
export function closeFaceMesh(): void {
  if (faceMeshInstance) {
    try {
      faceMeshInstance.close();
    } catch {
      /* ignore */
    }
    faceMeshInstance = null;
  }
  initPromise = null;
  pendingResolve = null;
}

/**
 * Send a video frame to FaceMesh and return the 468 landmarks (or null if no face).
 * Resolves in ~50–200ms on first frame, faster afterward.
 */
export async function sendVideoFrame(
  video: HTMLVideoElement,
): Promise<Landmark[] | null> {
  if (!faceMeshInstance) return null;
  if (video.readyState < 2) return null;

  return new Promise<Landmark[] | null>((resolve) => {
    // If there's a stale pending resolve, clear it
    if (pendingResolve) {
      pendingResolve(null);
    }
    pendingResolve = resolve;

    faceMeshInstance!.send({ image: video }).catch(() => {
      if (pendingResolve === resolve) {
        pendingResolve = null;
        resolve(null);
      }
    });
  });
}

// ──────────────────────────────────────────────────────────────────────────────
// Landmark calculation utilities (468-point FaceMesh indices)
// ──────────────────────────────────────────────────────────────────────────────

// Left eye:  [362, 385, 387, 263, 373, 380]
// Right eye: [33, 160, 158, 133, 153, 144]
// EAR = (|p2-p6| + |p3-p5|) / (2 * |p1-p4|)

function dist2D(a: Landmark, b: Landmark): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

function calculateEAR(lm: Landmark[], indices: number[]): number {
  const [i1, i2, i3, i4, i5, i6] = indices;
  const p1 = lm[i1 as number];
  const p2 = lm[i2 as number];
  const p3 = lm[i3 as number];
  const p4 = lm[i4 as number];
  const p5 = lm[i5 as number];
  const p6 = lm[i6 as number];
  if (!p1 || !p2 || !p3 || !p4 || !p5 || !p6) return 0;
  const h = dist2D(p1, p4);
  if (h === 0) return 0;
  return (dist2D(p2, p6) + dist2D(p3, p5)) / (2 * h);
}

/** Average Eye Aspect Ratio (both eyes) */
export function calculateAvgEAR(lm: Landmark[]): number {
  const left = calculateEAR(lm, [362, 385, 387, 263, 373, 380]);
  const right = calculateEAR(lm, [33, 160, 158, 133, 153, 144]);
  return (left + right) / 2;
}

/** Inner lip vertical gap — landmarks 13 (lower lip top) and 14 (upper lip bottom) */
export function calculateMouthHeight(lm: Landmark[]): number {
  const upper = lm[13];
  const lower = lm[14];
  if (!upper || !lower) return 0;
  return Math.abs(lower.y - upper.y);
}

/** Mouth corner width — landmarks 61 (left corner) and 291 (right corner) */
export function calculateMouthWidth(lm: Landmark[]): number {
  const left = lm[61];
  const right = lm[291];
  if (!left || !right) return 0;
  return Math.abs(right.x - left.x);
}

/** Average eyebrow-to-eye distance (both sides) */
export function calculateEyebrowEyeDistance(lm: Landmark[]): number {
  // Left brow: 336, left eye center: 386
  // Right brow: 107, right eye center: 159
  const leftBrow = lm[336];
  const leftEye = lm[386];
  const rightBrow = lm[107];
  const rightEye = lm[159];
  if (!leftBrow || !leftEye || !rightBrow || !rightEye) return 0;
  return (
    (Math.abs(leftBrow.y - leftEye.y) + Math.abs(rightBrow.y - rightEye.y)) / 2
  );
}

/**
 * Nose offset fraction relative to face center.
 * Returns ~0 when centered, positive when turned right, negative when left.
 * Range roughly -0.5 to +0.5.
 */
export function getNoseOffsetFraction(lm: Landmark[]): number {
  const nose = lm[1];
  const leftCheek = lm[234];
  const rightCheek = lm[454];
  if (!nose || !leftCheek || !rightCheek) return 0;
  const faceCenter = (leftCheek.x + rightCheek.x) / 2;
  const faceWidth = Math.abs(rightCheek.x - leftCheek.x);
  if (faceWidth === 0) return 0;
  return (nose.x - faceCenter) / faceWidth;
}

/** Inter-ocular distance (normalized 0-1) — outer eye corners 33 and 263 */
export function calculateFaceSize(lm: Landmark[]): number {
  const left = lm[263];
  const right = lm[33];
  if (!left || !right) return 0;
  return Math.abs(left.x - right.x);
}

/** Face width in pixels — uses cheek landmarks 234 and 454 */
export function calculateFaceWidthPx(
  lm: Landmark[],
  imageWidth: number,
): number {
  const leftCheek = lm[234];
  const rightCheek = lm[454];
  if (!leftCheek || !rightCheek || imageWidth === 0) return 0;
  return Math.abs(rightCheek.x - leftCheek.x) * imageWidth;
}

/** Returns true if nose X is between 0.25 and 0.75 (face roughly centered) */
export function isFaceCentered(lm: Landmark[]): boolean {
  const nose = lm[1];
  if (!nose) return false;
  return nose.x > 0.25 && nose.x < 0.75;
}

/** Average multiple landmark frames into one smoothed frame */
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
