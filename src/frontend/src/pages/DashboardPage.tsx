import { Button } from "@/components/ui/button";
import { Bell, CheckCircle, Clock, Flame, Plus } from "lucide-react";
import { motion } from "motion/react";
import { useNavigate } from "react-router-dom";
import { AlarmCard } from "../components/AlarmCard";
import { PageSkeleton } from "../components/LoadingSpinner";
import { Day } from "../context/AlarmContext";
import type { Alarm } from "../context/AlarmContext";
import { useAlarms } from "../hooks/useAlarms";
import { useAuth } from "../hooks/useAuth";

const DAY_ORDER: Day[] = [
  Day.sunday,
  Day.monday,
  Day.tuesday,
  Day.wednesday,
  Day.thursday,
  Day.friday,
  Day.saturday,
];

function getNextAlarm(
  alarms: Alarm[],
): { alarm: Alarm; display: string } | null {
  const enabled = alarms.filter((a) => a.enabled);
  if (enabled.length === 0) return null;

  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const currentDay = now.getDay();

  let nearest: Alarm | null = null;
  let minDiff = Number.POSITIVE_INFINITY;

  for (const alarm of enabled) {
    const alarmMinutes = Number(alarm.time);

    // Calculate minutes until alarm fires today
    let diff = alarmMinutes - currentMinutes;
    if (diff < 0) diff += 24 * 60; // next day

    // Check if alarm fires on a day of week
    if (alarm.repeatDays.length > 0) {
      let found = false;
      for (let i = 0; i < 7; i++) {
        const checkDay = (currentDay + i) % 7;
        const dayEnum = DAY_ORDER[checkDay];
        if (alarm.repeatDays.includes(dayEnum)) {
          const totalDiff = i * 24 * 60 + (i === 0 ? diff : alarmMinutes);
          if (totalDiff < minDiff) {
            minDiff = totalDiff;
            nearest = alarm;
            found = true;
          }
          break;
        }
      }
      if (!found) continue;
    } else {
      if (diff < minDiff) {
        minDiff = diff;
        nearest = alarm;
      }
    }
  }

  if (!nearest) return null;

  const h = Math.floor(Number(nearest.time) / 60);
  const m = Number(nearest.time) % 60;
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  const display = `${h12}:${String(m).padStart(2, "0")} ${ampm}`;

  return { alarm: nearest, display };
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { alarms, loading, stats, toggleAlarm, deleteAlarm } = useAlarms();

  const nextAlarm = getNextAlarm(alarms);
  const displayName =
    user?.displayName ?? user?.email?.split("@")[0] ?? "there";
  const successRate =
    stats && stats.totalAlarmsTriggered > 0
      ? Math.round((stats.totalSuccesses / stats.totalAlarmsTriggered) * 100)
      : 0;

  return (
    <div
      className="min-h-full"
      style={{ backgroundColor: "#0a0a0f" }}
      data-ocid="dashboard.page"
    >
      {/* Header gradient */}
      <div
        className="h-56 relative overflow-hidden"
        style={{
          background:
            "linear-gradient(180deg, rgba(124,58,237,0.12) 0%, rgba(10,10,15,0) 100%)",
        }}
      >
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 80% 100% at 50% -20%, rgba(124,58,237,0.15) 0%, transparent 60%)",
          }}
        />
        <div className="relative z-10 p-6 pt-8">
          <p className="text-sm font-medium" style={{ color: "#94a3b8" }}>
            {getGreeting()},
          </p>
          <h1 className="text-2xl font-bold text-white mt-0.5">
            {displayName} 👋
          </h1>
        </div>
      </div>

      <div className="px-4 -mt-32 pb-8 space-y-5 relative z-10">
        {loading ? (
          <PageSkeleton />
        ) : (
          <>
            {/* Next alarm card */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <div
                className="rounded-3xl p-6 relative overflow-hidden"
                style={{
                  background:
                    "linear-gradient(135deg, rgba(124,58,237,0.35) 0%, rgba(99,102,241,0.25) 100%)",
                  border: "1px solid rgba(124,58,237,0.3)",
                  boxShadow: "0 8px 32px rgba(124,58,237,0.2)",
                }}
              >
                {/* Decorative ring */}
                <div
                  className="absolute -right-8 -top-8 w-32 h-32 rounded-full opacity-20"
                  style={{
                    background:
                      "radial-gradient(circle, rgba(124,58,237,0.6) 0%, transparent 70%)",
                  }}
                />
                <p
                  className="text-xs font-semibold uppercase tracking-wider mb-2"
                  style={{ color: "#c4b5fd" }}
                >
                  Next Alarm
                </p>
                {nextAlarm ? (
                  <>
                    <p className="text-5xl font-bold text-white tracking-tight font-display">
                      {nextAlarm.display}
                    </p>
                    <div className="flex items-center gap-2 mt-2">
                      <Clock
                        className="w-3.5 h-3.5"
                        style={{ color: "#a78bfa" }}
                      />
                      <p className="text-sm" style={{ color: "#c4b5fd" }}>
                        {nextAlarm.alarm.repeatDays.length > 0
                          ? nextAlarm.alarm.repeatDays
                              .map(
                                (d) =>
                                  d.slice(0, 3).charAt(0).toUpperCase() +
                                  d.slice(1, 3),
                              )
                              .join(", ")
                          : "Tomorrow"}
                      </p>
                    </div>
                  </>
                ) : (
                  <div>
                    <p className="text-2xl font-bold text-white">
                      No alarms set
                    </p>
                    <p className="text-sm mt-1" style={{ color: "#c4b5fd" }}>
                      Add an alarm to get started
                    </p>
                  </div>
                )}
              </div>
            </motion.div>

            {/* Stats row */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.1 }}
              className="grid grid-cols-3 gap-3"
            >
              {[
                {
                  icon: Flame,
                  value: stats?.currentStreak ?? 0,
                  label: "Day Streak",
                  color: "#f59e0b",
                  bg: "rgba(245,158,11,0.1)",
                },
                {
                  icon: Bell,
                  value: alarms.filter((a) => a.enabled).length,
                  label: "Active",
                  color: "#6366f1",
                  bg: "rgba(99,102,241,0.1)",
                },
                {
                  icon: CheckCircle,
                  value: `${successRate}%`,
                  label: "Success",
                  color: "#10b981",
                  bg: "rgba(16,185,129,0.1)",
                },
              ].map(({ icon: Icon, value, label, color, bg }) => (
                <div key={label} className="glass-card-sm p-3 text-center">
                  <div
                    className="w-8 h-8 rounded-xl flex items-center justify-center mx-auto mb-2"
                    style={{ background: bg }}
                  >
                    <Icon className="w-4 h-4" style={{ color }} />
                  </div>
                  <p className="text-xl font-bold text-white">{value}</p>
                  <p className="text-xs" style={{ color: "#64748b" }}>
                    {label}
                  </p>
                </div>
              ))}
            </motion.div>

            {/* Alarms list */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.2 }}
            >
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-bold text-white">My Alarms</h2>
                <Button
                  size="sm"
                  className="btn-neon h-8 px-3 text-xs gap-1.5"
                  onClick={() => navigate("/alarm/new")}
                  data-ocid="dashboard.add_button"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Alarm
                </Button>
              </div>

              {alarms.length === 0 ? (
                <div
                  className="glass-card p-8 text-center"
                  data-ocid="alarm.empty_state"
                >
                  <div
                    className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
                    style={{ background: "rgba(124,58,237,0.15)" }}
                  >
                    <Bell className="w-8 h-8" style={{ color: "#7c3aed" }} />
                  </div>
                  <p className="font-semibold text-white">No alarms yet</p>
                  <p className="text-sm mt-1 mb-4" style={{ color: "#64748b" }}>
                    Add your first alarm to get started
                  </p>
                  <Button
                    className="btn-neon"
                    onClick={() => navigate("/alarm/new")}
                    data-ocid="dashboard.add_button"
                  >
                    <Plus className="w-4 h-4 mr-1.5" />
                    Create Alarm
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {alarms.map((alarm, i) => (
                    <motion.div
                      key={String(alarm.id)}
                      initial={{ opacity: 0, x: -16 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.3, delay: i * 0.05 }}
                    >
                      <AlarmCard
                        alarm={alarm}
                        index={i}
                        onToggle={toggleAlarm}
                        onDelete={deleteAlarm}
                      />
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          </>
        )}
      </div>
    </div>
  );
}
