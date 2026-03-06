import type { Day, VerificationMode } from "../backend.d";
import { supabase } from "./supabase";

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

function rowToAlarm(row: Record<string, unknown>): FirestoreAlarm {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    time: BigInt(Number(row.time)),
    repeatDays: (row.repeat_days as string[]).map((d) => d as Day),
    verificationMode: row.verification_mode as VerificationMode,
    sound: String(row.sound),
    ...(row.sound_url ? { soundUrl: String(row.sound_url) } : {}),
    enabled: Boolean(row.enabled),
    createdAt: new Date(String(row.created_at)),
  };
}

export async function fetchAlarmsForUser(
  userId: string,
): Promise<FirestoreAlarm[]> {
  const { data, error } = await supabase
    .from("alarms")
    .select("*")
    .eq("user_id", userId)
    .order("time", { ascending: true });

  if (error) throw new Error(error.message);
  return (data ?? []).map(rowToAlarm);
}

export async function createAlarmInFirestore(
  userId: string,
  time: bigint,
  repeatDays: Day[],
  verificationMode: VerificationMode,
  sound: string,
  soundUrl?: string,
): Promise<FirestoreAlarm> {
  const { data, error } = await supabase
    .from("alarms")
    .insert([
      {
        user_id: userId,
        time: Number(time),
        repeat_days: repeatDays as string[],
        verification_mode: verificationMode as string,
        sound,
        sound_url: soundUrl ?? null,
        enabled: true,
        created_at: new Date().toISOString(),
      },
    ])
    .select()
    .single();

  if (error) throw new Error(error.message);
  return rowToAlarm(data);
}

export async function updateAlarmInFirestore(
  alarmId: string,
  time: bigint,
  repeatDays: Day[],
  verificationMode: VerificationMode,
  sound: string,
  enabled: boolean,
  soundUrl?: string,
): Promise<void> {
  const { error } = await supabase
    .from("alarms")
    .update({
      time: Number(time),
      repeat_days: repeatDays as string[],
      verification_mode: verificationMode as string,
      sound,
      enabled,
      sound_url: soundUrl ?? null,
    })
    .eq("id", alarmId);

  if (error) throw new Error(error.message);
}

export async function deleteAlarmFromFirestore(alarmId: string): Promise<void> {
  const { error } = await supabase.from("alarms").delete().eq("id", alarmId);
  if (error) throw new Error(error.message);
}

export async function toggleAlarmInFirestore(
  alarmId: string,
  enabled: boolean,
): Promise<void> {
  const { error } = await supabase
    .from("alarms")
    .update({ enabled })
    .eq("id", alarmId);

  if (error) throw new Error(error.message);
}
