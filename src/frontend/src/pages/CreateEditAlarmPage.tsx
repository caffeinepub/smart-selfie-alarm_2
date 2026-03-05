import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { ArrowLeft, Brain, Camera, Clock, Loader2 } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { SoundSelector } from "../components/SoundSelector";
import { Day, VerificationMode } from "../context/AlarmContext";
import { useAuthContext } from "../context/AuthContext";
import { useAlarms } from "../hooks/useAlarms";
import { storage } from "../lib/firebase";

const DAY_ORDER: Day[] = [
  Day.monday,
  Day.tuesday,
  Day.wednesday,
  Day.thursday,
  Day.friday,
  Day.saturday,
  Day.sunday,
];

const DAY_LABELS: Record<Day, string> = {
  [Day.monday]: "Mon",
  [Day.tuesday]: "Tue",
  [Day.wednesday]: "Wed",
  [Day.thursday]: "Thu",
  [Day.friday]: "Fri",
  [Day.saturday]: "Sat",
  [Day.sunday]: "Sun",
};

export default function CreateEditAlarmPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { alarms, addAlarm, updateAlarm } = useAlarms();
  const { user } = useAuthContext();
  const isEdit = !!id;

  // timeValue is a string in "HH:MM" 24-hour format
  const [timeValue, setTimeValue] = useState("07:00");
  const [selectedDays, setSelectedDays] = useState<Day[]>([]);
  const [everyDay, setEveryDay] = useState(false);
  const [verificationMode, setVerificationMode] = useState<VerificationMode>(
    VerificationMode.selfie,
  );
  const [sound, setSound] = useState("default");
  const [customSoundUrl, setCustomSoundUrl] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isEdit && id) {
      const alarm = alarms.find((a) => a.id === id);
      if (alarm) {
        const totalMins = Number(alarm.time);
        const h = Math.floor(totalMins / 60);
        const m = totalMins % 60;
        setTimeValue(
          `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`,
        );
        setSelectedDays(alarm.repeatDays);
        setEveryDay(alarm.repeatDays.length === 7);
        setVerificationMode(alarm.verificationMode);
        setSound(alarm.sound);
        if (alarm.soundUrl) {
          setCustomSoundUrl(alarm.soundUrl);
        }
      }
    }
  }, [isEdit, id, alarms]);

  const toggleDay = (day: Day) => {
    // If everyDay is on, clicking a day unchecks everyDay and deselects that day
    if (everyDay) {
      setEveryDay(false);
      setSelectedDays(DAY_ORDER.filter((d) => d !== day));
      return;
    }
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day],
    );
  };

  const handleEveryDayToggle = (checked: boolean) => {
    setEveryDay(checked);
    setSelectedDays(checked ? [...DAY_ORDER] : []);
  };

  const getMinutesSinceMidnight = (): bigint => {
    const [hStr, mStr] = timeValue.split(":");
    const h = Number.parseInt(hStr ?? "0", 10);
    const m = Number.parseInt(mStr ?? "0", 10);
    return BigInt(h * 60 + m);
  };

  const handleSoundUpload = async (file: File): Promise<void> => {
    if (!user) throw new Error("You must be signed in to upload");
    const timestamp = Date.now();
    const storageRef = ref(
      storage,
      `alarm-sounds/${user.uid}/${timestamp}-${file.name}`,
    );
    await uploadBytes(storageRef, file);
    const downloadUrl = await getDownloadURL(storageRef);
    setCustomSoundUrl(downloadUrl);
  };

  const handleSave = async () => {
    if (!timeValue) {
      toast.error("Please set a time for the alarm");
      return;
    }
    setSaving(true);
    try {
      const time = getMinutesSinceMidnight();
      const finalSoundUrl = sound === "custom" ? customSoundUrl : undefined;

      if (isEdit && id) {
        const alarm = alarms.find((a) => a.id === id);
        if (alarm) {
          await updateAlarm(
            alarm.id,
            time,
            selectedDays,
            verificationMode,
            sound,
            alarm.enabled,
            finalSoundUrl,
          );
          toast.success("Alarm updated!");
        } else {
          toast.error("Alarm not found");
        }
      } else {
        await addAlarm(
          time,
          selectedDays,
          verificationMode,
          sound,
          finalSoundUrl,
        );
        toast.success("Alarm created!");
      }
      navigate("/dashboard");
    } catch (err) {
      console.error(err);
      const message =
        err instanceof Error ? err.message : "Failed to save alarm";
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-full" style={{ backgroundColor: "#0a0a0f" }}>
      {/* Header */}
      <div
        className="sticky top-0 z-10 px-4 py-4 flex items-center gap-3"
        style={{
          backgroundColor: "rgba(10, 10, 15, 0.9)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid rgba(255,255,255,0.05)",
        }}
      >
        <Button
          variant="ghost"
          size="icon"
          className="w-9 h-9 rounded-xl hover:bg-white/10"
          onClick={() => navigate(-1)}
          data-ocid="alarm_form.cancel_button"
        >
          <ArrowLeft className="w-5 h-5 text-white" />
        </Button>
        <h1 className="text-lg font-bold text-white">
          {isEdit ? "Edit Alarm" : "New Alarm"}
        </h1>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="p-4 pb-28 space-y-5"
      >
        {/* Time picker */}
        <div className="glass-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-4 h-4" style={{ color: "#7c3aed" }} />
            <h2 className="font-semibold text-white">Time (24-hour)</h2>
          </div>

          {/* Native time input for direct entry */}
          <div className="flex flex-col items-center gap-4">
            <input
              type="time"
              value={timeValue}
              onChange={(e) => setTimeValue(e.target.value)}
              data-ocid="alarm_form.time_input"
              className="w-full rounded-2xl text-center text-4xl font-bold font-mono tracking-widest px-4 py-4 outline-none cursor-pointer"
              style={{
                background: "rgba(124,58,237,0.12)",
                border: "1px solid rgba(124,58,237,0.3)",
                color: "#f8fafc",
                colorScheme: "dark",
                WebkitAppearance: "none",
                minHeight: "80px",
              }}
            />
            <p className="text-xs" style={{ color: "#64748b" }}>
              Tap the time to edit hours and minutes directly
            </p>
          </div>
        </div>

        {/* Repeat days */}
        <div className="glass-card p-5">
          <h2 className="font-semibold text-white mb-4">Repeat</h2>

          {/* Every Day toggle */}
          <div
            className="flex items-center justify-between px-3 py-2.5 rounded-xl mb-3"
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.06)",
            }}
          >
            <div>
              <p className="text-sm font-semibold text-white">Every Day</p>
              <p className="text-xs" style={{ color: "#64748b" }}>
                Mon – Sun
              </p>
            </div>
            <Switch
              checked={everyDay}
              onCheckedChange={handleEveryDayToggle}
              data-ocid="alarm_form.everyday_switch"
            />
          </div>

          <div className="grid grid-cols-7 gap-1">
            {DAY_ORDER.map((day) => (
              <button
                key={day}
                type="button"
                className={cn(
                  "h-9 rounded-lg text-[10px] font-semibold transition-all",
                )}
                style={
                  selectedDays.includes(day)
                    ? {
                        background: "linear-gradient(135deg, #7c3aed, #6366f1)",
                        color: "white",
                        boxShadow: "0 0 10px rgba(124,58,237,0.3)",
                      }
                    : {
                        background: "rgba(255,255,255,0.04)",
                        color: "#64748b",
                        border: "1px solid rgba(255,255,255,0.06)",
                      }
                }
                onClick={() => toggleDay(day)}
                data-ocid="alarm_form.day_toggle"
              >
                {DAY_LABELS[day]}
              </button>
            ))}
          </div>
          <p className="text-xs mt-2" style={{ color: "#475569" }}>
            {selectedDays.length === 0
              ? "One-time alarm (no repeat)"
              : selectedDays.length === 7
                ? "Repeats every day"
                : `Repeats every ${selectedDays.length} day${selectedDays.length > 1 ? "s" : ""}`}
          </p>
        </div>

        {/* Verification mode */}
        <div className="glass-card p-5">
          <h2 className="font-semibold text-white mb-4">
            Wake-Up Verification
          </h2>
          <div className="grid grid-cols-2 gap-3">
            {[
              {
                mode: VerificationMode.mathPuzzle,
                label: "Live Face Tasks",
                desc: "Open mouth, smile, head turn",
                icon: Brain,
              },
              {
                mode: VerificationMode.selfie,
                label: "Selfie",
                desc: "Take a quick photo",
                icon: Camera,
              },
            ].map(({ mode, label, desc, icon: Icon }) => (
              <button
                key={mode}
                type="button"
                className="p-4 rounded-2xl text-left transition-all"
                style={
                  verificationMode === mode
                    ? {
                        background:
                          "linear-gradient(135deg, rgba(124,58,237,0.3), rgba(99,102,241,0.2))",
                        border: "1px solid rgba(124,58,237,0.4)",
                        boxShadow: "0 0 16px rgba(124,58,237,0.15)",
                      }
                    : {
                        background: "rgba(255,255,255,0.04)",
                        border: "1px solid rgba(255,255,255,0.06)",
                      }
                }
                onClick={() => setVerificationMode(mode)}
                data-ocid="alarm_form.mode_select"
              >
                <Icon
                  className="w-5 h-5 mb-2"
                  style={{
                    color: verificationMode === mode ? "#a78bfa" : "#64748b",
                  }}
                />
                <p
                  className="font-semibold text-sm"
                  style={{
                    color: verificationMode === mode ? "white" : "#94a3b8",
                  }}
                >
                  {label}
                </p>
                <p className="text-xs mt-0.5" style={{ color: "#475569" }}>
                  {desc}
                </p>
              </button>
            ))}
          </div>
        </div>

        {/* Sound selector */}
        <div className="glass-card p-5">
          <SoundSelector
            value={sound}
            onChange={setSound}
            customSoundUrl={customSoundUrl}
            onCustomSoundUpload={handleSoundUpload}
          />
        </div>

        {/* Save button */}
        <Button
          className="w-full h-12 rounded-2xl font-semibold btn-neon"
          onClick={handleSave}
          disabled={saving}
          data-ocid="alarm_form.save_button"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
          {saving ? "Saving..." : isEdit ? "Update Alarm" : "Save Alarm"}
        </Button>

        <Button
          variant="ghost"
          className="w-full h-11 rounded-2xl text-slate-400 hover:text-white hover:bg-white/5"
          onClick={() => navigate(-1)}
          data-ocid="alarm_form.cancel_button"
        >
          Cancel
        </Button>
      </motion.div>
    </div>
  );
}
