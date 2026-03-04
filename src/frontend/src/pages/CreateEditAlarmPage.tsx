import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { ArrowLeft, Brain, Camera, Clock, Loader2, Music } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { Day, VerificationMode } from "../context/AlarmContext";
import { useAlarms } from "../hooks/useAlarms";

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

const SOUNDS = ["Radar", "Beacon", "Chime", "Bells", "Classic", "Digital"];

export default function CreateEditAlarmPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { alarms, addAlarm, updateAlarm } = useAlarms();
  const isEdit = !!id;

  const [hour, setHour] = useState(7);
  const [minute, setMinute] = useState(0);
  const [ampm, setAmpm] = useState<"AM" | "PM">("AM");
  const [selectedDays, setSelectedDays] = useState<Day[]>([]);
  const [verificationMode, setVerificationMode] = useState<VerificationMode>(
    VerificationMode.mathPuzzle,
  );
  const [sound, setSound] = useState("Radar");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (isEdit && id) {
      const alarm = alarms.find((a) => String(a.id) === id);
      if (alarm) {
        const totalMins = Number(alarm.time);
        const h24 = Math.floor(totalMins / 60);
        const m = totalMins % 60;
        const ispm = h24 >= 12;
        setHour(h24 === 0 ? 12 : h24 > 12 ? h24 - 12 : h24);
        setMinute(m);
        setAmpm(ispm ? "PM" : "AM");
        setSelectedDays(alarm.repeatDays);
        setVerificationMode(alarm.verificationMode);
        setSound(alarm.sound);
      }
    }
  }, [isEdit, id, alarms]);

  const toggleDay = (day: Day) => {
    setSelectedDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day],
    );
  };

  const getMinutesSinceMidnight = (): bigint => {
    let h24 = hour;
    if (ampm === "PM" && hour !== 12) h24 += 12;
    if (ampm === "AM" && hour === 12) h24 = 0;
    return BigInt(h24 * 60 + minute);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const time = getMinutesSinceMidnight();
      if (isEdit && id) {
        const alarm = alarms.find((a) => String(a.id) === id);
        if (alarm) {
          await updateAlarm(
            alarm.id,
            time,
            selectedDays,
            verificationMode,
            sound,
            alarm.enabled,
          );
          toast.success("Alarm updated!");
        }
      } else {
        await addAlarm(time, selectedDays, verificationMode, sound);
        toast.success("Alarm created!");
      }
      navigate("/dashboard");
    } catch (err) {
      console.error(err);
      toast.error("Failed to save alarm");
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
        className="p-4 space-y-5"
      >
        {/* Time picker */}
        <div className="glass-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-4 h-4" style={{ color: "#7c3aed" }} />
            <h2 className="font-semibold text-white">Time</h2>
          </div>
          <div className="flex items-center justify-center gap-3">
            {/* Hour */}
            <div className="flex flex-col items-center gap-1">
              <button
                type="button"
                className="w-10 h-10 rounded-xl flex items-center justify-center text-white hover:bg-white/10 transition-all text-lg font-bold"
                onClick={() => setHour((h) => (h === 12 ? 1 : h + 1))}
              >
                ▲
              </button>
              <div
                className="w-20 h-16 rounded-2xl flex items-center justify-center text-4xl font-bold text-white"
                style={{
                  background: "rgba(124,58,237,0.15)",
                  border: "1px solid rgba(124,58,237,0.2)",
                }}
              >
                {String(hour).padStart(2, "0")}
              </div>
              <button
                type="button"
                className="w-10 h-10 rounded-xl flex items-center justify-center text-white hover:bg-white/10 transition-all text-lg font-bold"
                onClick={() => setHour((h) => (h === 1 ? 12 : h - 1))}
              >
                ▼
              </button>
            </div>

            <span className="text-3xl font-bold text-white mb-1">:</span>

            {/* Minute */}
            <div className="flex flex-col items-center gap-1">
              <button
                type="button"
                className="w-10 h-10 rounded-xl flex items-center justify-center text-white hover:bg-white/10 transition-all text-lg font-bold"
                onClick={() => setMinute((m) => (m + 5) % 60)}
              >
                ▲
              </button>
              <div
                className="w-20 h-16 rounded-2xl flex items-center justify-center text-4xl font-bold text-white"
                style={{
                  background: "rgba(124,58,237,0.15)",
                  border: "1px solid rgba(124,58,237,0.2)",
                }}
              >
                {String(minute).padStart(2, "0")}
              </div>
              <button
                type="button"
                className="w-10 h-10 rounded-xl flex items-center justify-center text-white hover:bg-white/10 transition-all text-lg font-bold"
                onClick={() => setMinute((m) => (m - 5 + 60) % 60)}
              >
                ▼
              </button>
            </div>

            {/* AM/PM */}
            <div className="flex flex-col gap-2 ml-2">
              {(["AM", "PM"] as const).map((period) => (
                <button
                  key={period}
                  type="button"
                  className="w-14 h-8 rounded-xl text-sm font-semibold transition-all"
                  style={
                    ampm === period
                      ? {
                          background:
                            "linear-gradient(135deg, #7c3aed, #6366f1)",
                          color: "white",
                          boxShadow: "0 0 12px rgba(124,58,237,0.3)",
                        }
                      : {
                          background: "rgba(255,255,255,0.06)",
                          color: "#94a3b8",
                          border: "1px solid rgba(255,255,255,0.08)",
                        }
                  }
                  onClick={() => setAmpm(period)}
                  data-ocid="alarm_form.input"
                >
                  {period}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Repeat days */}
        <div className="glass-card p-5">
          <h2 className="font-semibold text-white mb-4">Repeat</h2>
          <div className="grid grid-cols-7 gap-1.5">
            {DAY_ORDER.map((day) => (
              <button
                key={day}
                type="button"
                className={cn(
                  "h-10 rounded-xl text-xs font-semibold transition-all",
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
                desc: "Blink, smile, turn head",
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

        {/* Sound */}
        <div className="glass-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Music className="w-4 h-4" style={{ color: "#7c3aed" }} />
            <h2 className="font-semibold text-white">Alarm Sound</h2>
          </div>
          <Select value={sound} onValueChange={setSound}>
            <SelectTrigger
              className="rounded-xl border-white/10 bg-white/5 text-white"
              data-ocid="alarm_form.sound_select"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-xl border-white/10 bg-[#1a1a2e]">
              {SOUNDS.map((s) => (
                <SelectItem key={s} value={s} className="text-white">
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
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
