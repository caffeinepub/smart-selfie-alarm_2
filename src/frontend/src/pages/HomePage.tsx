import { Button } from "@/components/ui/button";
import { AlarmClock, Bell, Clock, Plus } from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
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
    let diff = alarmMinutes - currentMinutes;
    if (diff < 0) diff += 24 * 60;

    if (alarm.repeatDays.length > 0) {
      for (let i = 0; i < 7; i++) {
        const checkDay = (currentDay + i) % 7;
        const dayEnum = DAY_ORDER[checkDay];
        if (alarm.repeatDays.includes(dayEnum)) {
          const totalDiff = i * 24 * 60 + (i === 0 ? diff : alarmMinutes);
          if (totalDiff < minDiff) {
            minDiff = totalDiff;
            nearest = alarm;
          }
          break;
        }
      }
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
  const display = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;

  return { alarm: nearest, display };
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export default function HomePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { alarms } = useAlarms();

  const displayName =
    user?.displayName ?? user?.email?.split("@")[0] ?? "there";
  const nextAlarm = getNextAlarm(alarms);

  const [liveTime, setLiveTime] = useState(() =>
    new Date().toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }),
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setLiveTime(
        new Date().toLocaleTimeString("en-GB", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: false,
        }),
      );
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      className="min-h-full"
      style={{ backgroundColor: "#0a0a0f" }}
      data-ocid="home.page"
    >
      {/* Background radial glow */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 70% 50% at 50% 0%, rgba(124,58,237,0.14) 0%, transparent 70%)",
        }}
      />

      <div className="relative z-10 px-4 pt-10 pb-24 max-w-lg mx-auto space-y-6">
        {/* App identity */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex items-center gap-3"
        >
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{
              background: "linear-gradient(135deg, #7c3aed, #6366f1)",
              boxShadow: "0 0 20px rgba(124,58,237,0.4)",
            }}
          >
            <AlarmClock className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="font-bold text-white leading-tight">
              Smart Selfie Alarm
            </p>
            <p className="text-xs" style={{ color: "#7c3aed" }}>
              AI-powered wake-up
            </p>
          </div>
        </motion.div>

        {/* Greeting */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.05 }}
        >
          <p className="text-sm font-medium" style={{ color: "#94a3b8" }}>
            {getGreeting()},
          </p>
          <h1 className="text-3xl font-bold text-white mt-0.5">
            {displayName} 👋
          </h1>
        </motion.div>

        {/* Live clock card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.45, delay: 0.1 }}
          className="rounded-3xl p-6 relative overflow-hidden"
          style={{
            background:
              "linear-gradient(135deg, rgba(124,58,237,0.2) 0%, rgba(99,102,241,0.12) 100%)",
            border: "1px solid rgba(124,58,237,0.25)",
            boxShadow: "0 8px 32px rgba(124,58,237,0.15)",
          }}
        >
          {/* Decorative glow ring */}
          <div
            className="absolute -right-10 -top-10 w-40 h-40 rounded-full opacity-20 pointer-events-none"
            style={{
              background:
                "radial-gradient(circle, rgba(124,58,237,0.8) 0%, transparent 70%)",
            }}
          />
          <p
            className="text-xs font-semibold uppercase tracking-wider mb-2"
            style={{ color: "#a78bfa" }}
          >
            Current Time
          </p>
          <div className="flex items-center gap-3">
            <Clock
              className="w-5 h-5 flex-shrink-0"
              style={{ color: "#a78bfa" }}
            />
            <span
              className="font-mono text-5xl font-bold tracking-widest"
              style={{
                color: "#f8fafc",
                textShadow: "0 0 20px rgba(167,139,250,0.7)",
              }}
              data-ocid="home.live_clock"
            >
              {liveTime}
            </span>
          </div>
        </motion.div>

        {/* Next alarm card */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
          className="glass-card p-5"
        >
          <div className="flex items-center gap-2 mb-3">
            <Bell className="w-4 h-4" style={{ color: "#a78bfa" }} />
            <p
              className="text-xs font-semibold uppercase tracking-wider"
              style={{ color: "#a78bfa" }}
            >
              Next Alarm
            </p>
          </div>
          {nextAlarm ? (
            <div className="flex items-center justify-between">
              <p className="text-3xl font-bold text-white font-mono tracking-tight">
                {nextAlarm.display}
              </p>
              <div
                className="px-2.5 py-1 rounded-lg text-xs font-medium"
                style={{
                  background: "rgba(124,58,237,0.15)",
                  color: "#c4b5fd",
                  border: "1px solid rgba(124,58,237,0.2)",
                }}
              >
                {nextAlarm.alarm.repeatDays.length > 0
                  ? nextAlarm.alarm.repeatDays
                      .map(
                        (d) =>
                          d.slice(0, 3).charAt(0).toUpperCase() + d.slice(1, 3),
                      )
                      .join(", ")
                  : "Tomorrow"}
              </div>
            </div>
          ) : (
            <div>
              <p className="text-xl font-semibold text-white">No alarms set</p>
              <p className="text-sm mt-0.5" style={{ color: "#64748b" }}>
                Create your first alarm below
              </p>
            </div>
          )}
        </motion.div>

        {/* Create Alarm CTA */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
        >
          <Button
            className="w-full h-14 rounded-2xl font-semibold text-base btn-neon gap-2"
            onClick={() => navigate("/alarm/new")}
            data-ocid="home.primary_button"
          >
            <Plus className="w-5 h-5" />
            Create Alarm
          </Button>
        </motion.div>

        {/* Quick links */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.25 }}
          className="grid grid-cols-2 gap-3"
        >
          <button
            type="button"
            className="glass-card p-4 text-left transition-all hover:opacity-80"
            onClick={() => navigate("/dashboard")}
            data-ocid="home.dashboard_button"
          >
            <p className="text-sm font-semibold text-white">Dashboard</p>
            <p className="text-xs mt-0.5" style={{ color: "#64748b" }}>
              View all alarms & stats
            </p>
          </button>
          <button
            type="button"
            className="glass-card p-4 text-left transition-all hover:opacity-80"
            onClick={() => navigate("/settings")}
            data-ocid="home.settings_button"
          >
            <p className="text-sm font-semibold text-white">Settings</p>
            <p className="text-xs mt-0.5" style={{ color: "#64748b" }}>
              Manage your account
            </p>
          </button>
        </motion.div>
      </div>
    </div>
  );
}
