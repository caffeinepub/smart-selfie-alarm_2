import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface Alarm {
    id: bigint;
    repeatDays: Array<Day>;
    verificationMode: VerificationMode;
    time: Time;
    enabled: boolean;
    sound: string;
}
export type Time = bigint;
export interface UserStats {
    totalSuccesses: bigint;
    lastSuccessDate: Time;
    currentStreak: bigint;
    totalAlarmsTriggered: bigint;
}
export enum Day {
    tuesday = "tuesday",
    wednesday = "wednesday",
    saturday = "saturday",
    thursday = "thursday",
    sunday = "sunday",
    friday = "friday",
    monday = "monday"
}
export enum VerificationMode {
    mathPuzzle = "mathPuzzle",
    selfie = "selfie",
    voicePrompt = "voicePrompt"
}
export interface backendInterface {
    createAlarm(time: Time, repeatDays: Array<Day>, verificationMode: VerificationMode, sound: string): Promise<bigint>;
    deleteAlarm(alarmId: bigint): Promise<void>;
    getAlarms(): Promise<Array<Alarm>>;
    getStats(): Promise<UserStats | null>;
    updateAlarm(alarmId: bigint, time: Time, repeatDays: Array<Day>, verificationMode: VerificationMode, sound: string, enabled: boolean): Promise<void>;
}
