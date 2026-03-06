import { initializeApp } from "firebase/app";
import {
  GoogleAuthProvider,
  browserLocalPersistence,
  getAuth,
  setPersistence,
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyBqBWyEUOiS0E_DnLqfttLrmKD5u6ENE-8",
  authDomain: "smart-selfie-alarm.firebaseapp.com",
  projectId: "smart-selfie-alarm",
  storageBucket: "smart-selfie-alarm.firebasestorage.app",
  messagingSenderId: "580224426784",
  appId: "1:580224426784:web:b844b1c4e0ed1973f6ed45",
  measurementId: "G-G9TL90EY6Z",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

// Use localStorage (not sessionStorage) for persistence.
// This avoids the "missing initial state" error in webviews where
// sessionStorage is blocked or sandboxed.
setPersistence(auth, browserLocalPersistence).catch(() => {
  // Non-fatal: if persistence cannot be set, auth still works for the session.
});

export const db = getFirestore(app);
export const storage = getStorage(app);

export const googleProvider = new GoogleAuthProvider();
googleProvider.addScope("email");
googleProvider.addScope("profile");
// Force account selection each time to prevent stale session issues.
googleProvider.setCustomParameters({
  prompt: "select_account",
  // Disable the FedCM / identity credential picker that triggers sessionStorage
  // usage on some Chrome versions — falls back to the standard OAuth popup.
  include_granted_scopes: "true",
});

export default app;
