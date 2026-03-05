import {
  type DocumentData,
  type QueryDocumentSnapshot,
  Timestamp,
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import type { Day, VerificationMode } from "../backend.d";
import { db } from "./firebase";

export interface FirestoreAlarm {
  id: string;
  userId: string;
  time: bigint; // minutes since midnight
  repeatDays: Day[];
  verificationMode: VerificationMode;
  sound: string;
  soundUrl?: string;
  enabled: boolean;
  createdAt: Date;
}

function docToAlarm(
  docSnap: QueryDocumentSnapshot<DocumentData>,
): FirestoreAlarm {
  const data = docSnap.data();
  return {
    id: docSnap.id,
    userId: data.userId as string,
    time: BigInt(data.time as number),
    repeatDays: (data.repeatDays as string[]).map((d) => d as Day),
    verificationMode: data.verificationMode as VerificationMode,
    sound: data.sound as string,
    ...(data.soundUrl ? { soundUrl: data.soundUrl as string } : {}),
    enabled: data.enabled as boolean,
    createdAt:
      data.createdAt instanceof Timestamp
        ? data.createdAt.toDate()
        : new Date(data.createdAt as string),
  };
}

export async function fetchAlarmsForUser(
  userId: string,
): Promise<FirestoreAlarm[]> {
  const q = query(collection(db, "alarms"), where("userId", "==", userId));
  const snapshot = await getDocs(q);
  const results = snapshot.docs.map(docToAlarm);
  // Sort by time ascending
  results.sort((a, b) => Number(a.time) - Number(b.time));
  return results;
}

export async function createAlarmInFirestore(
  userId: string,
  time: bigint,
  repeatDays: Day[],
  verificationMode: VerificationMode,
  sound: string,
  soundUrl?: string,
): Promise<FirestoreAlarm> {
  const docRef = await addDoc(collection(db, "alarms"), {
    userId,
    time: Number(time),
    repeatDays: repeatDays as string[],
    verificationMode: verificationMode as string,
    sound,
    ...(soundUrl ? { soundUrl } : {}),
    enabled: true,
    createdAt: new Date(),
  });
  return {
    id: docRef.id,
    userId,
    time,
    repeatDays,
    verificationMode,
    sound,
    ...(soundUrl ? { soundUrl } : {}),
    enabled: true,
    createdAt: new Date(),
  };
}

export async function updateAlarmInFirestore(
  alarmDocId: string,
  time: bigint,
  repeatDays: Day[],
  verificationMode: VerificationMode,
  sound: string,
  enabled: boolean,
  soundUrl?: string,
): Promise<void> {
  const docRef = doc(db, "alarms", alarmDocId);
  await updateDoc(docRef, {
    time: Number(time),
    repeatDays: repeatDays as string[],
    verificationMode: verificationMode as string,
    sound,
    enabled,
    ...(soundUrl ? { soundUrl } : {}),
  });
}

export async function deleteAlarmFromFirestore(
  alarmDocId: string,
): Promise<void> {
  const docRef = doc(db, "alarms", alarmDocId);
  await deleteDoc(docRef);
}

export async function toggleAlarmInFirestore(
  alarmDocId: string,
  enabled: boolean,
): Promise<void> {
  const docRef = doc(db, "alarms", alarmDocId);
  await updateDoc(docRef, { enabled });
}
