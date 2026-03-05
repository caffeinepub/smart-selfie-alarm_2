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
import { Day, VerificationMode } from "../backend.d";
import {
  type FirestoreAlarm,
  createAlarmInFirestore,
  deleteAlarmFromFirestore,
  fetchAlarmsForUser,
  toggleAlarmInFirestore,
  updateAlarmInFirestore,
} from "../lib/alarmService";
import { useAuthContext } from "./AuthContext";

// Re-export for use in other files
export type Alarm = FirestoreAlarm;
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
    soundUrl?: string,
  ) => Promise<void>;
  updateAlarm: (
    id: string,
    time: bigint,
    repeatDays: Day[],
    verificationMode: VerificationMode,
    sound: string,
    enabled: boolean,
    soundUrl?: string,
  ) => Promise<void>;
  deleteAlarm: (id: string) => Promise<void>;
  toggleAlarm: (id: string, enabled: boolean) => Promise<void>;
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
  const { user } = useAuthContext();
  const navigate = useNavigate();
  const [alarms, setAlarms] = useState<Alarm[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeAlarm, setActiveAlarm] = useState<Alarm | null>(null);
  const [stats, setStats] = useState<AlarmContextType["stats"]>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const firedAlarmsRef = useRef<Set<string>>(new Set());
  const alarmTriggeredRef = useRef(false);

  const fetchAlarms = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      const fetched = await fetchAlarmsForUser(user.uid);
      setAlarms(fetched);
    } catch (err) {
      console.error("Failed to fetch alarms:", err);
      toast.error("Failed to load alarms. Check your connection.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchAlarms();
    } else {
      setAlarms([]);
      setStats(null);
    }
  }, [user, fetchAlarms]);

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
        if (timeDiff > 1 && timeDiff < 1439) continue;

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
        if (alarmTriggeredRef.current) continue; // prevent double-trigger

        firedAlarmsRef.current.add(alarmKey);
        alarmTriggeredRef.current = true;
        setActiveAlarm(alarm);
        navigate("/alarm-trigger");
        // Reset trigger lock after 65 seconds (next minute)
        setTimeout(() => {
          alarmTriggeredRef.current = false;
        }, 65000);
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
    soundUrl?: string,
  ) => {
    if (!user) throw new Error("You must be signed in to create an alarm");
    const newAlarm = await createAlarmInFirestore(
      user.uid,
      time,
      repeatDays,
      verificationMode,
      sound,
      soundUrl,
    );
    setAlarms((prev) =>
      [...prev, newAlarm].sort((a, b) => Number(a.time) - Number(b.time)),
    );
  };

  const updateAlarm = async (
    id: string,
    time: bigint,
    repeatDays: Day[],
    verificationMode: VerificationMode,
    sound: string,
    enabled: boolean,
    soundUrl?: string,
  ) => {
    await updateAlarmInFirestore(
      id,
      time,
      repeatDays,
      verificationMode,
      sound,
      enabled,
      soundUrl,
    );
    setAlarms((prev) =>
      prev
        .map((a) =>
          a.id === id
            ? {
                ...a,
                time,
                repeatDays,
                verificationMode,
                sound,
                enabled,
                ...(soundUrl ? { soundUrl } : {}),
              }
            : a,
        )
        .sort((a, b) => Number(a.time) - Number(b.time)),
    );
  };

  const deleteAlarm = async (id: string) => {
    await deleteAlarmFromFirestore(id);
    setAlarms((prev) => prev.filter((a) => a.id !== id));
  };

  const toggleAlarm = async (id: string, enabled: boolean) => {
    await toggleAlarmInFirestore(id, enabled);
    setAlarms((prev) => prev.map((a) => (a.id === id ? { ...a, enabled } : a)));
  };

  const dismissActiveAlarm = () => {
    setActiveAlarm(null);
  };

  const recordSuccess = async () => {
    // Update local stats optimistically
    setStats((prev) => ({
      totalSuccesses: (prev?.totalSuccesses ?? 0) + 1,
      currentStreak: (prev?.currentStreak ?? 0) + 1,
      totalAlarmsTriggered: (prev?.totalAlarmsTriggered ?? 0) + 1,
      lastSuccessDate: Date.now(),
    }));
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
