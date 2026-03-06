import { Button } from "@/components/ui/button";
import {
  AlarmClock,
  Bell,
  Brain,
  CalendarDays,
  Eye,
  Plus,
  Smartphone,
} from "lucide-react";
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
  if (h < 5) return "Late night";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

// Split seconds off for separate rendering
function splitTime(raw: string) {
  const parts = raw.split(":");
  return {
    hhmm: `${parts[0]}:${parts[1]}`,
    ss: parts[2] ?? "00",
  };
}

export default function HomePage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { alarms } = useAlarms();

  const displayName =
    (user?.user_metadata?.display_name as string | undefined) ??
    (user?.user_metadata?.full_name as string | undefined) ??
    user?.email?.split("@")[0] ??
    "there";
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

  const { hhmm, ss } = splitTime(liveTime);

  return (
    <div
      className="min-h-full"
      style={{ backgroundColor: "#080810" }}
      data-ocid="home.page"
    >
      {/* Deep ambient glow fixed behind everything */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse 80% 55% at 50% -5%, rgba(109,40,217,0.18) 0%, transparent 65%)",
        }}
      />

      <div className="relative z-10 flex flex-col max-w-lg mx-auto px-5 pt-8 pb-28">
        {/* ── Top bar ─────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex items-center justify-between mb-8"
        >
          <div className="flex items-center gap-2.5">
            <div
              className="w-9 h-9 rounded-[12px] flex items-center justify-center flex-shrink-0"
              style={{
                background: "linear-gradient(145deg, #8b5cf6, #4f46e5)",
                boxShadow: "0 0 18px rgba(109,40,217,0.45)",
              }}
            >
              <AlarmClock
                className="w-4.5 h-4.5 text-white"
                style={{ width: 18, height: 18 }}
              />
            </div>
            <div>
              <p
                className="text-[11px] font-semibold uppercase tracking-widest"
                style={{ color: "#7c6fcd", letterSpacing: "0.15em" }}
              >
                Smart Selfie Alarm
              </p>
            </div>
          </div>
          <p className="text-sm font-medium" style={{ color: "#475569" }}>
            {getGreeting()},{" "}
            <span style={{ color: "#c4b5fd" }}>{displayName}</span>
          </p>
        </motion.div>

        {/* ── Hero clock — the dominant feature ───── */}
        <motion.div
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.55, delay: 0.06, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col items-center relative mb-8"
          style={{ paddingTop: "8px", paddingBottom: "8px" }}
        >
          {/* Ambient light behind the digits */}
          <div
            className="absolute pointer-events-none"
            style={{
              width: "280px",
              height: "120px",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              background:
                "radial-gradient(ellipse 100% 100% at 50% 50%, rgba(109,40,217,0.22) 0%, transparent 70%)",
              filter: "blur(24px)",
            }}
          />

          {/* HH:MM in full display-font glory */}
          <div
            className="relative font-display font-bold leading-none tracking-tighter select-none"
            style={{
              fontSize: "clamp(80px, 22vw, 112px)",
              background:
                "linear-gradient(175deg, #ffffff 30%, #c4b5fd 70%, #7c3aed 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              letterSpacing: "-0.04em",
              filter: "drop-shadow(0 0 24px rgba(139,92,246,0.5))",
            }}
            data-ocid="home.live_clock"
          >
            {hhmm}
          </div>

          {/* Seconds — smaller, muted */}
          <div
            className="font-mono font-semibold mt-1 tabular-nums"
            style={{
              fontSize: "22px",
              color: "#4f3a7a",
              letterSpacing: "0.1em",
            }}
          >
            :{ss}
          </div>

          {/* Date line */}
          <p
            className="text-xs font-medium mt-2 tracking-wide"
            style={{ color: "#334155" }}
          >
            {new Date().toLocaleDateString("en-GB", {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          </p>
        </motion.div>

        {/* ── Next Alarm card ─────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.18 }}
          className="rounded-[22px] overflow-hidden mb-4"
          style={{
            background: nextAlarm
              ? "linear-gradient(135deg, rgba(109,40,217,0.22) 0%, rgba(79,70,229,0.14) 100%)"
              : "rgba(255,255,255,0.04)",
            border: nextAlarm
              ? "1px solid rgba(139,92,246,0.28)"
              : "1px solid rgba(255,255,255,0.07)",
            boxShadow: nextAlarm ? "0 4px 24px rgba(109,40,217,0.12)" : "none",
          }}
        >
          <div className="px-5 py-4">
            <div className="flex items-center gap-2 mb-3">
              <div
                className="w-6 h-6 rounded-lg flex items-center justify-center"
                style={{ background: "rgba(139,92,246,0.2)" }}
              >
                <Bell className="w-3.5 h-3.5" style={{ color: "#a78bfa" }} />
              </div>
              <p
                className="text-[11px] font-semibold uppercase tracking-widest"
                style={{ color: "#7c6fcd", letterSpacing: "0.14em" }}
              >
                Next Alarm
              </p>
            </div>

            {nextAlarm ? (
              <div className="flex items-end justify-between gap-3">
                <div>
                  <p
                    className="font-display font-bold leading-none"
                    style={{
                      fontSize: "42px",
                      color: "#f1f5f9",
                      letterSpacing: "-0.03em",
                    }}
                  >
                    {nextAlarm.display}
                  </p>
                  <p
                    className="text-xs mt-1.5 font-medium"
                    style={{ color: "#7c6fcd" }}
                  >
                    {nextAlarm.alarm.verificationMode === "selfie"
                      ? "📸 Selfie verification"
                      : "👁 Live face tasks"}
                  </p>
                </div>
                <div
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold flex-shrink-0"
                  style={{
                    background: "rgba(139,92,246,0.18)",
                    color: "#c4b5fd",
                    border: "1px solid rgba(139,92,246,0.25)",
                  }}
                >
                  {nextAlarm.alarm.repeatDays.length > 0
                    ? nextAlarm.alarm.repeatDays
                        .map(
                          (d) =>
                            d.slice(0, 3).charAt(0).toUpperCase() +
                            d.slice(1, 3),
                        )
                        .join(" · ")
                    : "One-time"}
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div>
                  <p
                    className="font-semibold text-lg"
                    style={{ color: "#475569" }}
                  >
                    No alarms set
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: "#334155" }}>
                    Tap the button below to get started
                  </p>
                </div>
                <div
                  className="w-10 h-10 rounded-2xl flex items-center justify-center"
                  style={{ background: "rgba(255,255,255,0.04)" }}
                >
                  <Bell className="w-5 h-5" style={{ color: "#334155" }} />
                </div>
              </div>
            )}
          </div>
        </motion.div>

        {/* ── Primary CTA ──────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.24 }}
          className="mb-4"
        >
          <Button
            className="w-full rounded-[18px] font-bold text-white border-0 gap-2.5"
            style={{
              height: "56px",
              fontSize: "16px",
              background:
                "linear-gradient(135deg, #7c3aed 0%, #6d28d9 50%, #4f46e5 100%)",
              boxShadow:
                "0 4px 20px rgba(109,40,217,0.4), 0 1px 0 rgba(255,255,255,0.1) inset",
              letterSpacing: "-0.01em",
            }}
            onClick={() => navigate("/alarm/new")}
            data-ocid="home.primary_button"
          >
            <Plus className="w-5 h-5" strokeWidth={2.5} />
            Create Alarm
          </Button>
        </motion.div>

        {/* ── Quick links ──────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          className="grid grid-cols-2 gap-3 mb-8"
        >
          {[
            {
              label: "Alarms",
              sub: "View & manage",
              to: "/dashboard",
              ocid: "home.dashboard_button",
            },
            {
              label: "Settings",
              sub: "Account & sound",
              to: "/settings",
              ocid: "home.settings_button",
            },
          ].map(({ label, sub, to, ocid }) => (
            <button
              key={to}
              type="button"
              className="rounded-[18px] p-4 text-left transition-all active:scale-[0.97]"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.07)",
              }}
              onClick={() => navigate(to)}
              data-ocid={ocid}
            >
              <p className="text-sm font-bold text-white">{label}</p>
              <p
                className="text-xs mt-0.5 font-medium"
                style={{ color: "#475569" }}
              >
                {sub}
              </p>
            </button>
          ))}
        </motion.div>

        {/* ── Key Features ─────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.36 }}
          className="mb-8"
        >
          <p
            className="text-xs font-bold uppercase tracking-widest mb-4 px-1"
            style={{ color: "#475569" }}
          >
            Key Features
          </p>
          <div className="space-y-2.5">
            {[
              {
                icon: Eye,
                label: "Selfie Verification Alarm",
                desc: "Stop the alarm only after a verified selfie",
                color: "#7c3aed",
              },
              {
                icon: Brain,
                label: "Live Face Detection",
                desc: "Smart detection ensures you are truly awake",
                color: "#6366f1",
              },
              {
                icon: CalendarDays,
                label: "Multiple Alarm Scheduling",
                desc: "Set alarms for different days and routines",
                color: "#f59e0b",
              },
              {
                icon: Smartphone,
                label: "Mobile Friendly Interface",
                desc: "Smooth experience on smartphones",
                color: "#10b981",
              },
            ].map(({ icon: Icon, label, desc, color }) => (
              <div
                key={label}
                className="flex items-center gap-3 rounded-[16px] px-4 py-3"
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: `${color}22` }}
                >
                  <Icon className="w-4 h-4" style={{ color }} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{label}</p>
                  <p className="text-xs mt-0.5" style={{ color: "#64748b" }}>
                    {desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* ── Subscription Plans ───────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.42 }}
          className="mb-4"
        >
          <p
            className="text-xs font-bold uppercase tracking-widest mb-4 px-1"
            style={{ color: "#475569" }}
          >
            Subscription Plans
          </p>
          <div className="space-y-2.5">
            {[
              {
                name: "7 Day Trial",
                price: "₹1",
                period: "one-time",
                highlight: false,
                badge: "",
              },
              {
                name: "Monthly Plan",
                price: "₹29",
                period: "per month",
                highlight: true,
                badge: "",
              },
              {
                name: "6 Month Plan",
                price: "₹150",
                period: "6 months",
                highlight: false,
                badge: "≈14% OFF",
              },
              {
                name: "Yearly Plan",
                price: "₹280",
                period: "per year",
                highlight: false,
                badge: "Best Value",
              },
            ].map(({ name, price, period, highlight, badge }) => (
              <div
                key={name}
                className="flex items-center justify-between rounded-[16px] px-4 py-3"
                style={{
                  background: highlight
                    ? "linear-gradient(135deg, rgba(124,58,237,0.2), rgba(99,102,241,0.1))"
                    : "rgba(255,255,255,0.03)",
                  border: highlight
                    ? "1px solid rgba(124,58,237,0.28)"
                    : "1px solid rgba(255,255,255,0.06)",
                }}
              >
                <div>
                  <p
                    className="text-sm font-semibold"
                    style={{ color: highlight ? "#f1f5f9" : "#cbd5e1" }}
                  >
                    {name}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: "#64748b" }}>
                    {period}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {badge && (
                    <span
                      className="px-2 py-0.5 rounded-full text-xs font-bold"
                      style={{
                        background: "rgba(16,185,129,0.15)",
                        color: "#10b981",
                        border: "1px solid rgba(16,185,129,0.2)",
                      }}
                    >
                      {badge}
                    </span>
                  )}
                  <p
                    className="text-base font-bold"
                    style={{ color: highlight ? "#a78bfa" : "#e2e8f0" }}
                  >
                    {price}
                  </p>
                </div>
              </div>
            ))}
          </div>
          <button
            type="button"
            className="w-full mt-3 py-3 rounded-[16px] text-sm font-semibold transition-all active:scale-[0.98]"
            style={{
              background:
                "linear-gradient(135deg, rgba(124,58,237,0.25), rgba(99,102,241,0.15))",
              border: "1px solid rgba(124,58,237,0.2)",
              color: "#c4b5fd",
            }}
            onClick={() => navigate("/subscription")}
            data-ocid="home.subscription_button"
          >
            View Plans
          </button>
        </motion.div>

        {/* ── Legal footer links ───────────────────── */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.5 }}
          className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 pt-2"
        >
          {[
            { label: "Privacy Policy", to: "/privacy" },
            { label: "Terms & Conditions", to: "/terms" },
            { label: "Refund Policy", to: "/refund" },
          ].map(({ label, to }) => (
            <button
              key={to}
              type="button"
              className="text-xs transition-colors hover:opacity-80"
              style={{ color: "#475569" }}
              onClick={() => navigate(to)}
            >
              {label}
            </button>
          ))}
        </motion.div>
      </div>
    </div>
  );
}
