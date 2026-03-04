# Smart Selfie Alarm

## Current State

The app has Firebase Auth + a Motoko ICP backend. Firebase handles login (email/password + Google). The ICP backend (Motoko canister) stores alarms keyed by caller Principal. The `AlarmContext` exclusively uses `useActor()` (ICP actor) to fetch/save alarms via `actor.createAlarm()`, `actor.getAlarms()`, etc. `useActor` depends on `useInternetIdentity` which IS properly provided in `main.tsx`.

### Root causes of reported failures

1. **Google Sign-Up** — The Firebase `signInWithPopup` code is correctly wired in `AuthContext` and `AuthPage`. The most likely runtime cause is that the Firebase project's Google provider is not enabled in the Firebase console, OR a popup-blocked / misconfigured `authDomain`. The code itself is correct per the spec; the fix is to harden error messages and ensure we surface the exact Firebase error code.

2. **Alarm cannot be saved** — `AlarmContext.addAlarm` calls `actor.createAlarm(...)`. The `actor` comes from `useActor` which uses the ICP Internet Identity (not Firebase). Firebase-logged-in users have no ICP identity, so `actor` is an anonymous actor. Anonymous callers cannot own alarms in the canister (`shared ({ caller })` functions reject anon principals in practice or return empty results). Result: saves silently fail or throw. **Fix: replace Motoko/ICP alarm storage with Firestore** using `addDoc(collection(db, "alarms"), {...})` as the user requested.

3. **Time picker broken** — The current picker uses ▲/▼ buttons that increment by 1 hour and 5 minutes. While functional, there is no direct text entry. On mobile, touch targets are small and the interaction is cumbersome. **Fix: replace with native `<input type="time" />`** that reads/writes a single `HH:MM` string, plus keep the visual display in sync.

4. **UI buttons not responding** — Downstream effect of the actor being null/uninitialized: `handleSave` throws before reaching the canister, toast shows error, UI appears frozen. Once Firestore replaces the actor calls, buttons will work.

5. **Dashboard not functioning** — Same root cause: `alarms` array is always empty because `fetchAlarms` bails out when `actor` is null. After Firestore migration, alarms load correctly.

## Requested Changes (Diff)

### Add
- `src/frontend/src/lib/alarmService.ts` — Firestore CRUD helpers: `createAlarm`, `updateAlarm`, `deleteAlarm`, `getAlarms`
- Firestore alarm document schema: `{ userId, time, repeatDays, verificationMode, sound, enabled, createdAt }`

### Modify
- `lib/firebase.ts` — export `db` (already done), add Firestore import confirmation
- `context/AlarmContext.tsx` — swap `useActor` calls for Firestore service calls; gate on Firebase `user.uid` instead of `actor`
- `pages/CreateEditAlarmPage.tsx` — replace ▲/▼ spinner with native `<input type="time" />`; ensure Save button wires to `handleSave` with proper error handling
- `context/AuthContext.tsx` — improve `signInWithGoogle` error surface; add `auth/network-request-failed` to error map
- `pages/AuthPage.tsx` — add `auth/network-request-failed` to `getFirebaseErrorMessage`
- `components/AlarmCard.tsx` — ensure all button onClick handlers are defined
- `pages/DashboardPage.tsx` — live clock already present; ensure alarm list renders after Firestore fix

### Remove
- Dependency on `useActor` inside `AlarmContext` (remove import, remove actor-based fetch/save/delete calls)

## Implementation Plan

1. Create `src/frontend/src/lib/alarmService.ts` with Firestore CRUD using `addDoc`, `getDocs`, `updateDoc`, `deleteDoc`, `query`, `where`
2. Rewrite `AlarmContext` to use `alarmService` functions keyed on `user.uid` from Firebase auth
3. Replace the time picker in `CreateEditAlarmPage` with a native `<input type="time" />` that syncs hour/minute state; keep 24h display format
4. Harden `AuthPage` and `AuthContext` error handling with additional Firebase error codes
5. Validate typecheck passes and build succeeds
