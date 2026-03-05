# Smart Selfie Alarm

## Current State

- Full-stack alarm clock app with Firebase auth, Firestore storage
- Frontend uses React + Tailwind + TypeScript, react-router-dom for routing
- Face detection uses `@mediapipe/tasks-vision` FaceLandmarker loaded via CDN at runtime
- `faceDetection.ts` — core detection utils (EAR, mouth, eyebrow, nose offset calculations)
- `useFaceDetection.ts` — live verification hook: 4 tasks (raise_eyebrows → smile → turn_head → open_mouth), 750ms interval, landmark smoothing
- `useSelfieVerification.ts` — selfie hook: auto-captures when face + eyes open (EAR > 0.22)
- `VerificationPage.tsx` — renders SelfieVerificationView or LiveVerificationView based on alarm mode
- `AlarmTriggerPage.tsx` — plays alarm sound on mount; navigation to /verify preserves sound playing via module-level state in alarmSounds.ts
- Layout.tsx uses `h-screen overflow-hidden` + `overflow-y-auto pb-20` for the main area
- All pages use `min-h-full` to allow scrolling but some fixed-height containers may cut off content

## Requested Changes (Diff)

### Add
- MediaPipe FaceMesh (`@mediapipe/face_mesh` package) as primary detection model, loaded from CDN
- New `src/lib/faceMesh.ts` — wraps `@mediapipe/face_mesh` (Camera utils or manual video frame loop), exposes landmark array (468 points), calculates:
  - EAR for both eyes (eyes open check, blink)
  - Mouth aspect ratio (MAR) for open mouth
  - Eyebrow-to-eye vertical distance ratio for eyebrow raise
  - Nose-to-face-center offset fraction for head turn
  - Face center X position for selfie centering check
- Sequential live verification tasks: raise_eyebrows → smile → turn_head_right → open_mouth
- Selfie verification checks: face detected + eyes open (EAR > threshold) + face centered (nose X within 20–80% of frame width)
- "Face verified. Take selfie." message shown when all selfie conditions met
- Detection runs every 500–700ms using setInterval (not rAF)
- Alarm continues playing during verification (sound not stopped until onComplete fires)
- Instruction text above camera ("Raise your eyebrows", "Now smile", etc.)
- Error messages: "Look at the camera" (no face), per-task hints ("Try raising your eyebrows")
- Bottom padding (min 80px) on all scrollable pages
- Safe area support: `env(safe-area-inset-bottom)` on scrollable containers

### Modify
- `faceDetection.ts` → replaced with `faceMesh.ts` using `@mediapipe/face_mesh` from CDN (not `@mediapipe/tasks-vision`)
- `useFaceDetection.ts` → rewritten to use new faceMesh utility, task order: raise_eyebrows → smile → turn_head → open_mouth, detection at 600ms interval, move to next task immediately on detection (stability window reduced to 300ms)
- `useSelfieVerification.ts` → rewritten: checks face + eyes open + face centered; shows "Face verified. Take selfie." message; allows manual capture or auto-capture
- `VerificationPage.tsx` → updated messaging, selfie view shows verification status and "Take selfie" button
- `Layout.tsx` → main area: change from `overflow-y-auto` to proper scroll container, ensure `pb-20 md:pb-0` is applied; remove any `h-screen overflow-hidden` that traps content
- All page containers → `min-h-full` with `pb-24` for safe area bottom spacing
- `CreateEditAlarmPage.tsx` → add bottom padding, ensure form scrolls fully
- `SettingsPage.tsx` → add bottom padding
- All camera verification views → flexible layout so instruction text + buttons stay visible on small screens (no fixed heights that cut off)

### Remove
- Direct dependency on `@mediapipe/tasks-vision` for face landmarking (replaced by `@mediapipe/face_mesh`)
- The complex selfie-at-end-of-live-tasks flow in `useFaceDetection` (live tasks now end at open_mouth → call onComplete directly)
- The `detectForImage` static-image selfie verification (replaced with simpler approach using a single video frame check)

## Implementation Plan

1. Add `@mediapipe/face_mesh` to frontend package.json dependencies
2. Create `src/lib/faceMesh.ts`:
   - Load FaceMesh via CDN script tag injection (or import from package)
   - Initialize with `maxNumFaces: 1`, `refineLandmarks: true`, `minDetectionConfidence: 0.7`, `minTrackingConfidence: 0.7`
   - Expose `initFaceMesh()`, `closeFaceMesh()`, `detectFaceMesh(videoElement)` returning 468 landmarks
   - Implement all landmark calculation functions (EAR, MAR, eyebrow dist, nose offset, face center)
3. Rewrite `useFaceDetection.ts`:
   - Use `faceMesh.ts` instead of faceDetection.ts
   - Task list: raise_eyebrows → smile → turn_head → open_mouth
   - Detection at 600ms, advance immediately when task condition met (300ms stability)
   - Thresholds: eyebrow ratio 1.15x baseline, smile width 1.1x baseline, head turn fraction 0.14, mouth height 1.35x baseline
   - Clear error messages per state
4. Rewrite `useSelfieVerification.ts`:
   - Use `faceMesh.ts`
   - Show "Face verified. Take selfie." when face + eyes open + centered
   - Allow manual capture via button
   - Final check: 1 face, eyes open
5. Update `VerificationPage.tsx`:
   - Selfie view: show "Face verified. Take selfie." status message
   - Instruction text above camera viewport
   - Flexible layout (flex-col, no fixed heights)
6. Fix `Layout.tsx` mobile scroll:
   - main: `flex-1 overflow-y-auto min-h-0` 
   - Remove `overflow-hidden` from outer container or ensure main can scroll independently
7. Fix all page containers:
   - Replace any `h-screen` or fixed heights with min-h-full
   - Add `pb-24` or `pb-[env(safe-area-inset-bottom,96px)]` to scroll containers
8. Fix camera verification screens:
   - Flexible layout so text and buttons don't get cut on small screens
   - Instruction panel above camera, task panel overlaid at bottom
9. Validate: typecheck, lint, build
