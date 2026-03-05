import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
  Bell,
  Brain,
  Camera,
  ChevronRight,
  Clock,
  FileText,
  Info,
  Loader2,
  LogOut,
  Mail,
  Music,
  Settings,
  Sun,
  User,
  Volume2,
} from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "../hooks/useAuth";

const SOUNDS = ["Radar", "Beacon", "Chime", "Bells", "Classic", "Digital"];

function applyTheme(theme: "light" | "dark") {
  document.documentElement.setAttribute("data-theme", theme);
  document.documentElement.style.colorScheme = theme;
}

function loadSettings() {
  try {
    return {
      defaultSound: localStorage.getItem("defaultSound") ?? "Radar",
      defaultMode: (localStorage.getItem("defaultMode") ?? "mathPuzzle") as
        | "mathPuzzle"
        | "selfie",
      cameraFacing: (localStorage.getItem("cameraFacing") ?? "user") as
        | "user"
        | "environment",
      alarmVolume: Number(localStorage.getItem("alarmVolume") ?? "80"),
      snoozeEnabled: localStorage.getItem("snoozeEnabled") === "true",
      theme: (localStorage.getItem("theme") ?? "dark") as "light" | "dark",
    };
  } catch {
    return {
      defaultSound: "Radar",
      defaultMode: "mathPuzzle" as const,
      cameraFacing: "user" as const,
      alarmVolume: 80,
      snoozeEnabled: false,
      theme: "dark" as const,
    };
  }
}

export default function SettingsPage() {
  const navigate = useNavigate();
  const { user, logout, updateDisplayName } = useAuth();
  const [settings, setSettings] = useState(loadSettings);
  const [saving, setSaving] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [displayName, setDisplayName] = useState(
    user?.displayName ?? user?.email?.split("@")[0] ?? "",
  );
  const [savingName, setSavingName] = useState(false);

  useEffect(() => {
    const loaded = loadSettings();
    setSettings(loaded);
  }, []);

  useEffect(() => {
    setDisplayName(user?.displayName ?? user?.email?.split("@")[0] ?? "");
  }, [user]);

  const handleSave = async () => {
    setSaving(true);
    try {
      localStorage.setItem("defaultSound", settings.defaultSound);
      localStorage.setItem("defaultMode", settings.defaultMode);
      localStorage.setItem("cameraFacing", settings.cameraFacing);
      localStorage.setItem("alarmVolume", String(settings.alarmVolume));
      localStorage.setItem(
        "snoozeEnabled",
        settings.snoozeEnabled ? "true" : "false",
      );
      localStorage.setItem("theme", settings.theme);
      applyTheme(settings.theme);
      toast.success("Settings saved");
    } catch {
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveName = async () => {
    if (!displayName.trim()) {
      toast.error("Display name cannot be empty");
      return;
    }
    setSavingName(true);
    try {
      await updateDisplayName(displayName.trim());
      toast.success("Display name updated");
    } catch {
      toast.error("Failed to update display name");
    } finally {
      setSavingName(false);
    }
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
    } catch {
      toast.error("Failed to sign out");
      setLoggingOut(false);
    }
  };

  const handleThemeChange = (isLight: boolean) => {
    const newTheme: "light" | "dark" = isLight ? "light" : "dark";
    setSettings((s) => ({ ...s, theme: newTheme }));
    // Apply immediately for preview
    applyTheme(newTheme);
    localStorage.setItem("theme", newTheme);
  };

  const currentDisplayName =
    user?.displayName ?? user?.email?.split("@")[0] ?? "User";

  return (
    <div className="min-h-full" style={{ backgroundColor: "#0a0a0f" }}>
      {/* Header */}
      <div className="p-6 pt-8">
        <div className="flex items-center gap-2 mb-1">
          <Settings className="w-5 h-5" style={{ color: "#7c3aed" }} />
          <h1 className="text-2xl font-bold text-white">Settings</h1>
        </div>
        <p className="text-sm" style={{ color: "#64748b" }}>
          Customize your alarm experience
        </p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35 }}
        className="px-4 pb-28 space-y-6"
      >
        {/* ── Section 1: Account ── */}
        <div>
          <p
            className="text-xs font-bold uppercase tracking-widest mb-2 px-1"
            style={{ color: "#475569" }}
          >
            Account
          </p>
          <div className="glass-card p-5 space-y-4">
            {/* Avatar + info */}
            <div
              className="flex items-center gap-3 p-3 rounded-xl"
              style={{ background: "rgba(255,255,255,0.03)" }}
            >
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0"
                style={{
                  background: "linear-gradient(135deg, #7c3aed, #6366f1)",
                }}
              >
                <span className="text-white font-bold text-sm">
                  {currentDisplayName.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-white truncate">
                  {currentDisplayName}
                </p>
                <p className="text-xs truncate" style={{ color: "#64748b" }}>
                  {user?.email}
                </p>
              </div>
            </div>

            {/* Display name edit */}
            <div className="space-y-2">
              <label
                htmlFor="display-name-input"
                className="text-sm font-medium flex items-center gap-1.5"
                style={{ color: "#e2e8f0" }}
              >
                <User className="w-3.5 h-3.5" style={{ color: "#7c3aed" }} />
                Display Name
              </label>
              <div className="flex gap-2">
                <Input
                  id="display-name-input"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Enter display name"
                  className="rounded-xl border-white/10 bg-white/5 text-white placeholder:text-slate-500 focus:border-violet-500 flex-1"
                  data-ocid="settings.name_input"
                />
                <Button
                  className="btn-neon rounded-xl px-4 shrink-0"
                  onClick={handleSaveName}
                  disabled={savingName}
                  data-ocid="settings.name_save_button"
                >
                  {savingName ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    "Save"
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* ── Section 2: Preferences ── */}
        <div>
          <p
            className="text-xs font-bold uppercase tracking-widest mb-2 px-1"
            style={{ color: "#475569" }}
          >
            Preferences
          </p>
          <div className="space-y-3">
            {/* Volume control */}
            <div className="glass-card p-5">
              <div className="flex items-center gap-2 mb-4">
                <Volume2 className="w-4 h-4" style={{ color: "#7c3aed" }} />
                <h2 className="font-semibold text-white">Alarm Volume</h2>
                <span
                  className="ml-auto text-sm font-bold"
                  style={{ color: "#a78bfa" }}
                >
                  {settings.alarmVolume}%
                </span>
              </div>
              <Slider
                min={0}
                max={100}
                step={5}
                value={[settings.alarmVolume]}
                onValueChange={([v]) =>
                  setSettings((s) => ({
                    ...s,
                    alarmVolume: v ?? s.alarmVolume,
                  }))
                }
                className="w-full"
                data-ocid="settings.volume_slider"
              />
              <div className="flex justify-between mt-1">
                <span className="text-xs" style={{ color: "#475569" }}>
                  Silent
                </span>
                <span className="text-xs" style={{ color: "#475569" }}>
                  Max
                </span>
              </div>
            </div>

            {/* Snooze toggle */}
            <div className="glass-card p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" style={{ color: "#7c3aed" }} />
                  <div>
                    <h2 className="font-semibold text-white">Snooze</h2>
                    <p className="text-xs mt-0.5" style={{ color: "#64748b" }}>
                      5 minutes, one-time per alarm
                    </p>
                  </div>
                </div>
                <Switch
                  checked={settings.snoozeEnabled}
                  onCheckedChange={(checked) =>
                    setSettings((s) => ({ ...s, snoozeEnabled: checked }))
                  }
                  data-ocid="settings.snooze_switch"
                />
              </div>
              {settings.snoozeEnabled && (
                <div
                  className="mt-3 px-3 py-2 rounded-xl text-xs"
                  style={{
                    background: "rgba(124,58,237,0.08)",
                    border: "1px solid rgba(124,58,237,0.15)",
                    color: "#a78bfa",
                  }}
                >
                  <Bell className="w-3.5 h-3.5 inline mr-1.5" />
                  Snooze button will appear on the alarm screen (one use per
                  trigger)
                </div>
              )}
            </div>

            {/* Default sound */}
            <div className="glass-card p-5">
              <div className="flex items-center gap-2 mb-4">
                <Music className="w-4 h-4" style={{ color: "#7c3aed" }} />
                <h2 className="font-semibold text-white">
                  Default Alarm Sound
                </h2>
              </div>
              <Select
                value={settings.defaultSound}
                onValueChange={(v) =>
                  setSettings((s) => ({ ...s, defaultSound: v }))
                }
              >
                <SelectTrigger
                  className="rounded-xl border-white/10 bg-white/5 text-white"
                  data-ocid="settings.sound_select"
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

            {/* Default verification mode */}
            <div className="glass-card p-5">
              <div className="flex items-center gap-2 mb-4">
                <Brain className="w-4 h-4" style={{ color: "#7c3aed" }} />
                <h2 className="font-semibold text-white">
                  Default Verification Mode
                </h2>
              </div>
              <Select
                value={settings.defaultMode}
                onValueChange={(v) =>
                  setSettings((s) => ({
                    ...s,
                    defaultMode: v as "mathPuzzle" | "selfie",
                  }))
                }
              >
                <SelectTrigger
                  className="rounded-xl border-white/10 bg-white/5 text-white"
                  data-ocid="settings.mode_select"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-white/10 bg-[#1a1a2e]">
                  <SelectItem value="mathPuzzle" className="text-white">
                    Live Face Tasks
                  </SelectItem>
                  <SelectItem value="selfie" className="text-white">
                    Selfie
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Camera facing */}
            <div className="glass-card p-5">
              <div className="flex items-center gap-2 mb-4">
                <Camera className="w-4 h-4" style={{ color: "#7c3aed" }} />
                <h2 className="font-semibold text-white">Camera Preference</h2>
              </div>
              <Select
                value={settings.cameraFacing}
                onValueChange={(v) =>
                  setSettings((s) => ({
                    ...s,
                    cameraFacing: v as "user" | "environment",
                  }))
                }
              >
                <SelectTrigger
                  className="rounded-xl border-white/10 bg-white/5 text-white"
                  data-ocid="settings.camera_select"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-white/10 bg-[#1a1a2e]">
                  <SelectItem value="user" className="text-white">
                    Front Camera
                  </SelectItem>
                  <SelectItem value="environment" className="text-white">
                    Back Camera
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Theme toggle */}
            <div className="glass-card p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sun className="w-4 h-4" style={{ color: "#7c3aed" }} />
                  <div>
                    <h2 className="font-semibold text-white">Light Mode</h2>
                    <p className="text-xs mt-0.5" style={{ color: "#64748b" }}>
                      {settings.theme === "light"
                        ? "Light theme active"
                        : "Dark theme active"}
                    </p>
                  </div>
                </div>
                <Switch
                  checked={settings.theme === "light"}
                  onCheckedChange={handleThemeChange}
                  data-ocid="settings.theme_switch"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Save preferences button */}
        <Button
          className="w-full h-12 rounded-2xl font-semibold btn-neon"
          onClick={handleSave}
          disabled={saving}
          data-ocid="settings.save_button"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
          {saving ? "Saving..." : "Save Settings"}
        </Button>

        {/* ── Section 3: App Information ── */}
        <div>
          <p
            className="text-xs font-bold uppercase tracking-widest mb-2 px-1"
            style={{ color: "#475569" }}
          >
            App Information
          </p>
          <div className="glass-card overflow-hidden">
            {[
              {
                label: "About",
                icon: Info,
                path: "/about",
                ocid: "settings.about_link",
              },
              {
                label: "Contact Us",
                icon: Mail,
                path: "/contact",
                ocid: "settings.contact_link",
              },
              {
                label: "Privacy Policy",
                icon: FileText,
                path: "/privacy",
                ocid: "settings.privacy_link",
              },
            ].map(({ label, icon: Icon, path, ocid }, i, arr) => (
              <button
                key={label}
                type="button"
                className="w-full flex items-center justify-between px-5 py-4 transition-all hover:bg-white/5 active:bg-white/10"
                style={{
                  borderBottom:
                    i < arr.length - 1
                      ? "1px solid rgba(255,255,255,0.05)"
                      : "none",
                }}
                onClick={() => navigate(path)}
                data-ocid={ocid}
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-4 h-4" style={{ color: "#7c3aed" }} />
                  <span className="text-sm font-medium text-white">
                    {label}
                  </span>
                </div>
                <ChevronRight
                  className="w-4 h-4"
                  style={{ color: "#334155" }}
                />
              </button>
            ))}
          </div>
        </div>

        <Separator style={{ background: "rgba(255,255,255,0.06)" }} />

        {/* Sign out */}
        <Button
          variant="outline"
          className="w-full h-11 rounded-2xl font-medium gap-2 border-red-500/20 bg-red-500/5 text-red-400 hover:bg-red-500/10 hover:text-red-300"
          onClick={handleLogout}
          disabled={loggingOut}
          data-ocid="settings.logout_button"
        >
          {loggingOut ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <LogOut className="w-4 h-4" />
          )}
          {loggingOut ? "Signing out..." : "Sign Out"}
        </Button>
      </motion.div>
    </div>
  );
}
