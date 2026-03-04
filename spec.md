# Smart Selfie Alarm

## Current State
New project. No existing code.

## Requested Changes (Diff)

### Add
- Full-stack Smart Selfie Alarm app with Motoko backend + React frontend
- Firebase Authentication (Email/Password + Google Sign-In) via Firebase SDK
- Firebase Firestore for storing alarms, stats, and user streaks
- MediaPipe Face Mesh face detection via @mediapipe/face_mesh
- 8 pages: Auth, Dashboard, Create/Edit Alarm, Alarm Trigger, Verification, Settings, About Us, Contact Us
- Alarm check interval (setInterval every 30s) to trigger alarms automatically
- Face verification tasks: blink, head turn right/left, smile, eyes open 2s, selfie
- Wake-up streak counter and alarm success statistics
- Camera error handling (permission denied, no face, multiple faces, slow device)
- Contact form using mailto to smartselfiealarm123@gmail.com

### Modify
N/A

### Remove
N/A

## Implementation Plan

### Backend (Motoko)
- User profile store: uid -> { streak, totalAlarms, successCount }
- Alarm store: uid -> [{ id, hour, minute, days[], verificationMode, sound, enabled }]
- CRUD operations: createAlarm, updateAlarm, deleteAlarm, getAlarms
- Stats operations: recordAlarmSuccess, getStats
- Streak logic: increment streak on daily success, reset on miss

### Frontend Libraries
- firebase (^10.x) for Auth + Firestore
- @mediapipe/face_mesh for face landmark detection
- react-router-dom for routing
- framer-motion for animations

### Pages
1. **Auth** — login/signup with email+password and Google, redirect to dashboard on success
2. **Dashboard** — next alarm, alarm list with toggle, streak, stats, add alarm CTA
3. **Create/Edit Alarm** — time picker, repeat days, verification mode, sound selector, save
4. **Alarm Trigger** — fullscreen pulsing animation, looping alarm sound, prompt to verify
5. **Verification** — webcam feed, face detection every 800ms, task progress, success animation
6. **Settings** — default sound, default mode, camera preference, account info
7. **About Us** — app description, feature highlights
8. **Contact Us** — contact form with mailto fallback, display email

### Custom Hooks
- `useAuth` — Firebase auth state, login/logout/signup/google
- `useAlarms` — Firestore alarm CRUD, alarm check interval
- `useFaceDetection` — MediaPipe setup, EAR blink, head turn, smile, selfie capture

### Context
- `AuthContext` — auth user, loading state
- `AlarmContext` — alarms array, active alarm, trigger state

### lib
- `firebase.ts` — Firebase app init with provided config
- `faceDetection.ts` — MediaPipe face mesh logic, EAR calculation, landmark helpers
