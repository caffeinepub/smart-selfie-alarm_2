import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { Bell, Clock, Edit2, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { Alarm } from "../context/AlarmContext";
import { Day, VerificationMode } from "../context/AlarmContext";

interface AlarmCardProps {
  alarm: Alarm;
  index: number;
  onToggle: (id: string, enabled: boolean) => void;
  onDelete: (id: string) => void;
}

const DAY_LABELS: Record<Day, string> = {
  [Day.monday]: "Mo",
  [Day.tuesday]: "Tu",
  [Day.wednesday]: "We",
  [Day.thursday]: "Th",
  [Day.friday]: "Fr",
  [Day.saturday]: "Sa",
  [Day.sunday]: "Su",
};

const DAY_ORDER: Day[] = [
  Day.monday,
  Day.tuesday,
  Day.wednesday,
  Day.thursday,
  Day.friday,
  Day.saturday,
  Day.sunday,
];

const MODE_LABELS: Record<string, string> = {
  [VerificationMode.mathPuzzle]: "Live Face Tasks",
  [VerificationMode.selfie]: "Selfie",
  [VerificationMode.voicePrompt]: "Voice",
};

function formatTime(minutes: bigint): string {
  const mins = Number(minutes);
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function AlarmCard({
  alarm,
  index,
  onToggle,
  onDelete,
}: AlarmCardProps) {
  const navigate = useNavigate();
  const ocidIndex = index + 1;

  return (
    <div
      className={cn(
        "glass-card p-4 transition-all duration-200",
        !alarm.enabled && "opacity-60",
      )}
      style={{
        borderColor: alarm.enabled
          ? "rgba(124, 58, 237, 0.2)"
          : "rgba(255,255,255,0.06)",
      }}
      data-ocid={`alarm.item.${ocidIndex}`}
    >
      <div className="flex items-center justify-between">
        {/* Time + info */}
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{
              background: alarm.enabled
                ? "linear-gradient(135deg, rgba(124,58,237,0.3), rgba(99,102,241,0.2))"
                : "rgba(255,255,255,0.05)",
            }}
          >
            <Clock
              className="w-5 h-5"
              style={{ color: alarm.enabled ? "#a78bfa" : "#94a3b8" }}
            />
          </div>
          <div>
            <p
              className="text-xl font-bold tracking-tight"
              style={{ color: alarm.enabled ? "#f8fafc" : "#94a3b8" }}
            >
              {formatTime(alarm.time)}
            </p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs" style={{ color: "#64748b" }}>
                <Bell className="w-3 h-3 inline mr-0.5" />
                {alarm.sound}
              </span>
              <span
                className="text-xs px-1.5 py-0.5 rounded-md"
                style={{
                  background: "rgba(124,58,237,0.15)",
                  color: "#a78bfa",
                  border: "1px solid rgba(124,58,237,0.2)",
                }}
              >
                {MODE_LABELS[alarm.verificationMode] ?? alarm.verificationMode}
              </span>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          <Switch
            checked={alarm.enabled}
            onCheckedChange={(checked) => onToggle(alarm.id, checked)}
            data-ocid={`alarm.toggle.${ocidIndex}`}
            style={
              alarm.enabled
                ? ({
                    "--switch-bg": "#7c3aed",
                  } as React.CSSProperties)
                : {}
            }
          />
          <Button
            variant="ghost"
            size="icon"
            className="w-8 h-8 rounded-lg hover:bg-white/10"
            onClick={() => navigate(`/alarm/edit/${alarm.id}`)}
            data-ocid={`alarm.edit_button.${ocidIndex}`}
          >
            <Edit2 className="w-4 h-4" style={{ color: "#94a3b8" }} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="w-8 h-8 rounded-lg hover:bg-red-500/10"
            onClick={() => onDelete(alarm.id)}
            data-ocid={`alarm.delete_button.${ocidIndex}`}
          >
            <Trash2 className="w-4 h-4" style={{ color: "#ef4444" }} />
          </Button>
        </div>
      </div>

      {/* Repeat days */}
      {alarm.repeatDays.length > 0 && (
        <div className="flex items-center gap-1.5 mt-3">
          {DAY_ORDER.map((day) => (
            <span
              key={day}
              className="text-xs w-7 h-7 flex items-center justify-center rounded-lg font-medium transition-all"
              style={{
                background: alarm.repeatDays.includes(day)
                  ? "linear-gradient(135deg, rgba(124,58,237,0.4), rgba(99,102,241,0.3))"
                  : "rgba(255,255,255,0.04)",
                color: alarm.repeatDays.includes(day) ? "#c4b5fd" : "#475569",
                border: alarm.repeatDays.includes(day)
                  ? "1px solid rgba(124,58,237,0.3)"
                  : "1px solid rgba(255,255,255,0.04)",
              }}
            >
              {DAY_LABELS[day]}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
