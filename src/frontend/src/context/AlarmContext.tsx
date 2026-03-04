import {
  type ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import type { Alarm } from "../backend.d";
import { Day, VerificationMode } from "../backend.d";
import { useActor } from "../hooks/useActor";
import { useAuthContext } from "./AuthContext";

export type { Alarm };
export { Day, VerificationMode };

interface AlarmContextType {
  alarms: Alarm[];
  loading: boolean;
  activeAlarm: Alarm | null;
  stats: {
    totalSuccesses: number;
    currentStreak: number;
    totalAlarmsTriggered: number;
    lastSuccessDate: number;
  } | null;
  addAlarm: (
    time: bigint,
    repeatDays: Day[],
    verificationMode: VerificationMode,
    sound: string,
  ) => Promise<void>;
  updateAlarm: (
    id: bigint,
    time: bigint,
    repeatDays: Day[],
    verificationMode: VerificationMode,
    sound: string,
    enabled: boolean,
  ) => Promise<void>;
  deleteAlarm: (id: bigint) => Promise<void>;
  toggleAlarm: (id: bigint, enabled: boolean) => Promise<void>;
  dismissActiveAlarm: () => void;
  recordSuccess: () => Promise<void>;
  refetchAlarms: () => Promise<void>;
}

const AlarmContext = createContext<AlarmContextType | null>(null);

const DAY_MAP: Record<number, Day> = {
  0: Day.sunday,
  1: Day.monday,
  2: Day.tuesday,
  3: Day.wednesday,
  4: Day.thursday,
  5: Day.friday,
  6: Day.saturday,
};

export function AlarmProvider({ children }: { children: ReactNode }) {
  const { actor } = useActor();
  const { user } = useAuthContext();
  const navigate = useNavigate();
  const [alarms, setAlarms] = useState<Alarm[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeAlarm, setActiveAlarm] = useState<Alarm | null>(null);
  const [stats, setStats] = useState<AlarmContextType["stats"]>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const firedAlarmsRef = useRef<Set<string>>(new Set());

  const fetchAlarms = useCallback(async () => {
    if (!actor || !user) return;
    try {
      setLoading(true);
      const [fetchedAlarms, fetchedStats] = await Promise.all([
        actor.getAlarms(),
        actor.getStats(),
      ]);
      setAlarms(fetchedAlarms);
      if (fetchedStats) {
        setStats({
          totalSuccesses: Number(fetchedStats.totalSuccesses),
          currentStreak: Number(fetchedStats.currentStreak),
          totalAlarmsTriggered: Number(fetchedStats.totalAlarmsTriggered),
          lastSuccessDate: Number(fetchedStats.lastSuccessDate),
        });
      }
    } catch (err) {
      console.error("Failed to fetch alarms:", err);
      toast.error("Failed to load alarms");
    } finally {
      setLoading(false);
    }
  }, [actor, user]);

  useEffect(() => {
    if (actor && user) {
      fetchAlarms();
    }
  }, [actor, user, fetchAlarms]);

  // Alarm time checker — runs every 30 seconds
  useEffect(() => {
    if (!user) return;

    const checkAlarms = () => {
      const now = new Date();
      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      const currentDay = DAY_MAP[now.getDay()];
      const timeKey = `${now.getFullYear()}-${now.getMonth()}-${now.getDate()}-${now.getHours()}-${now.getMinutes()}`;

      for (const alarm of alarms) {
        if (!alarm.enabled) continue;
        const alarmMinutes = Number(alarm.time);

        // Check if alarm matches current time (within 1 min window)
        const timeDiff = Math.abs(currentMinutes - alarmMinutes);
        if (timeDiff > 1 && timeDiff < 1439) continue; // 1439 = 24h-1 for midnight wrap

        // Check day of week
        if (
          alarm.repeatDays.length > 0 &&
          !alarm.repeatDays.includes(currentDay)
        ) {
          continue;
        }

        // Don't fire same alarm twice in the same minute
        const alarmKey = `${alarm.id}-${timeKey}`;
        if (firedAlarmsRef.current.has(alarmKey)) continue;

        firedAlarmsRef.current.add(alarmKey);
        setActiveAlarm(alarm);
        navigate("/alarm-trigger");
        break;
      }
    };

    intervalRef.current = setInterval(checkAlarms, 30000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [alarms, user, navigate]);

  const addAlarm = async (
    time: bigint,
    repeatDays: Day[],
    verificationMode: VerificationMode,
    sound: string,
  ) => {
    if (!actor) throw new Error("Not connected");
    await actor.createAlarm(time, repeatDays, verificationMode, sound);
    await fetchAlarms();
  };

  const updateAlarm = async (
    id: bigint,
    time: bigint,
    repeatDays: Day[],
    verificationMode: VerificationMode,
    sound: string,
    enabled: boolean,
  ) => {
    if (!actor) throw new Error("Not connected");
    await actor.updateAlarm(
      id,
      time,
      repeatDays,
      verificationMode,
      sound,
      enabled,
    );
    await fetchAlarms();
  };

  const deleteAlarm = async (id: bigint) => {
    if (!actor) throw new Error("Not connected");
    await actor.deleteAlarm(id);
    setAlarms((prev) => prev.filter((a) => a.id !== id));
  };

  const toggleAlarm = async (id: bigint, enabled: boolean) => {
    const alarm = alarms.find((a) => a.id === id);
    if (!alarm || !actor) return;
    await actor.updateAlarm(
      id,
      alarm.time,
      alarm.repeatDays,
      alarm.verificationMode,
      alarm.sound,
      enabled,
    );
    setAlarms((prev) => prev.map((a) => (a.id === id ? { ...a, enabled } : a)));
  };

  const dismissActiveAlarm = () => {
    setActiveAlarm(null);
    if (audioIntervalRef.current) clearInterval(audioIntervalRef.current);
  };

  const recordSuccess = async () => {
    try {
      if (actor) {
        const updatedStats = await actor.getStats();
        if (updatedStats) {
          setStats({
            totalSuccesses: Number(updatedStats.totalSuccesses),
            currentStreak: Number(updatedStats.currentStreak),
            totalAlarmsTriggered: Number(updatedStats.totalAlarmsTriggered),
            lastSuccessDate: Number(updatedStats.lastSuccessDate),
          });
        }
      }
    } catch (err) {
      console.error("Failed to record success:", err);
    }
    dismissActiveAlarm();
  };

  return (
    <AlarmContext.Provider
      value={{
        alarms,
        loading,
        activeAlarm,
        stats,
        addAlarm,
        updateAlarm,
        deleteAlarm,
        toggleAlarm,
        dismissActiveAlarm,
        recordSuccess,
        refetchAlarms: fetchAlarms,
      }}
    >
      {children}
    </AlarmContext.Provider>
  );
}

export function useAlarmContext(): AlarmContextType {
  const ctx = useContext(AlarmContext);
  if (!ctx)
    throw new Error("useAlarmContext must be used within AlarmProvider");
  return ctx;
}
