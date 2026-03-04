import { initializeApp } from "firebase/app";
import { GoogleAuthProvider, getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

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
export const db = getFirestore(app);
export const googleProvider = new GoogleAuthProvider();
export default app;
