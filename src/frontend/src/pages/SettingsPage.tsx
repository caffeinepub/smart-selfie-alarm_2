import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Brain,
  Camera,
  Loader2,
  LogOut,
  Music,
  Settings,
  User,
} from "lucide-react";
import { motion } from "motion/react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "../hooks/useAuth";

const SOUNDS = ["Radar", "Beacon", "Chime", "Bells", "Classic", "Digital"];

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
    };
  } catch {
    return {
      defaultSound: "Radar",
      defaultMode: "mathPuzzle" as const,
      cameraFacing: "user" as const,
    };
  }
}

export default function SettingsPage() {
  const { user, logout } = useAuth();
  const [settings, setSettings] = useState(loadSettings);
  const [saving, setSaving] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    const loaded = loadSettings();
    setSettings(loaded);
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      localStorage.setItem("defaultSound", settings.defaultSound);
      localStorage.setItem("defaultMode", settings.defaultMode);
      localStorage.setItem("cameraFacing", settings.cameraFacing);
      toast.success("Settings saved");
    } catch {
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
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

  const displayName = user?.displayName ?? user?.email?.split("@")[0] ?? "User";

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
        className="px-4 pb-8 space-y-4"
      >
        {/* Account section */}
        <div className="glass-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <User className="w-4 h-4" style={{ color: "#7c3aed" }} />
            <h2 className="font-semibold text-white">Account</h2>
          </div>
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
                {displayName.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-white truncate">{displayName}</p>
              <p className="text-xs truncate" style={{ color: "#64748b" }}>
                {user?.email}
              </p>
            </div>
          </div>
        </div>

        {/* Default sound */}
        <div className="glass-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Music className="w-4 h-4" style={{ color: "#7c3aed" }} />
            <h2 className="font-semibold text-white">Default Alarm Sound</h2>
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

        {/* Save button */}
        <Button
          className="w-full h-12 rounded-2xl font-semibold btn-neon"
          onClick={handleSave}
          disabled={saving}
          data-ocid="settings.save_button"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
          {saving ? "Saving..." : "Save Settings"}
        </Button>

        <Separator style={{ background: "rgba(255,255,255,0.06)" }} />

        {/* Logout */}
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
