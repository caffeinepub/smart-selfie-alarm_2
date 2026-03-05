import { Music, Pause, Play, Upload } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  BUILT_IN_SOUNDS,
  previewAlarmSound,
  stopAlarmSound,
} from "../lib/alarmSounds";

interface SoundSelectorProps {
  value: string; // selected sound ID
  onChange: (soundId: string) => void;
  customSoundUrl?: string;
  onCustomSoundUpload?: (file: File) => Promise<void>;
}

function getPreviewVolume(): number {
  try {
    return Number(localStorage.getItem("alarmVolume") ?? "80") / 100;
  } catch {
    return 0.8;
  }
}

export function SoundSelector({
  value,
  onChange,
  customSoundUrl,
  onCustomSoundUpload,
}: SoundSelectorProps) {
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const previewTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const stopPreview = useCallback(() => {
    if (previewTimeoutRef.current) {
      clearTimeout(previewTimeoutRef.current);
      previewTimeoutRef.current = null;
    }
    stopAlarmSound();
    setPlayingId(null);
  }, []);

  const handlePlay = useCallback(
    (soundId: string) => {
      if (playingId === soundId) {
        stopPreview();
        return;
      }
      stopPreview();
      setPlayingId(soundId);
      previewAlarmSound(soundId, getPreviewVolume());
      // Auto-stop after 5 seconds
      previewTimeoutRef.current = setTimeout(() => {
        stopAlarmSound();
        setPlayingId(null);
      }, 5000);
    },
    [playingId, stopPreview],
  );

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setUploadError(null);

      // Validate file type
      const validTypes = ["audio/mpeg", "audio/wav", "audio/ogg"];
      if (!validTypes.includes(file.type)) {
        setUploadError("Invalid format. Use MP3, WAV, or OGG.");
        return;
      }

      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        setUploadError("File too large. Maximum size is 5MB.");
        return;
      }

      if (!onCustomSoundUpload) return;

      setUploading(true);
      try {
        await onCustomSoundUpload(file);
        setUploadedFileName(file.name);
        onChange("custom");
      } catch {
        setUploadError("Upload failed. Please try again.");
      } finally {
        setUploading(false);
        // Reset input so the same file can be re-uploaded
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    },
    [onChange, onCustomSoundUpload],
  );

  // Clean up preview on unmount
  useEffect(() => {
    return () => {
      stopPreview();
    };
  }, [stopPreview]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Music className="w-4 h-4" style={{ color: "#7c3aed" }} />
        <h2 className="font-semibold text-white">Alarm Sound</h2>
      </div>

      {/* Sound cards grid */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {BUILT_IN_SOUNDS.map((sound, idx) => {
          const isSelected = value === sound.id;
          const isPlaying = playingId === sound.id;

          return (
            <button
              key={sound.id}
              type="button"
              className="rounded-2xl p-3 transition-all cursor-pointer text-left w-full"
              style={
                isSelected
                  ? {
                      background:
                        "linear-gradient(135deg, rgba(124,58,237,0.25), rgba(99,102,241,0.15))",
                      border: "1px solid rgba(124,58,237,0.5)",
                      boxShadow: "0 0 12px rgba(124,58,237,0.12)",
                    }
                  : {
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.08)",
                    }
              }
              onClick={() => {
                stopPreview();
                onChange(sound.id);
              }}
              data-ocid={`sound_selector.card.${idx + 1}`}
            >
              <div className="flex items-start justify-between gap-1 mb-2">
                <div className="flex-1 min-w-0">
                  <p
                    className="text-xs font-semibold leading-tight truncate"
                    style={{ color: isSelected ? "#c4b5fd" : "#e2e8f0" }}
                  >
                    {sound.label}
                  </p>
                  <p
                    className="text-[10px] mt-0.5 leading-tight"
                    style={{ color: "#475569" }}
                  >
                    {sound.description}
                  </p>
                </div>
                {/* Play button */}
                <button
                  type="button"
                  className="flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center transition-all"
                  style={
                    isPlaying
                      ? {
                          background: "rgba(124,58,237,0.4)",
                          border: "1px solid rgba(124,58,237,0.6)",
                        }
                      : {
                          background: "rgba(255,255,255,0.06)",
                          border: "1px solid rgba(255,255,255,0.1)",
                        }
                  }
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePlay(sound.id);
                  }}
                  title={isPlaying ? "Stop preview" : "Preview sound"}
                  data-ocid={`sound_selector.play_button.${idx + 1}`}
                >
                  {isPlaying ? (
                    <Pause className="w-3 h-3" style={{ color: "#a78bfa" }} />
                  ) : (
                    <Play className="w-3 h-3" style={{ color: "#94a3b8" }} />
                  )}
                </button>
              </div>

              {/* Select indicator */}
              <button
                type="button"
                className="w-full text-[10px] font-semibold rounded-lg py-1 transition-all"
                style={
                  isSelected
                    ? {
                        background: "rgba(124,58,237,0.3)",
                        color: "#c4b5fd",
                        border: "1px solid rgba(124,58,237,0.4)",
                      }
                    : {
                        background: "rgba(255,255,255,0.04)",
                        color: "#64748b",
                        border: "1px solid rgba(255,255,255,0.06)",
                      }
                }
                onClick={(e) => {
                  e.stopPropagation();
                  stopPreview();
                  onChange(sound.id);
                }}
                data-ocid={`sound_selector.select_button.${idx + 1}`}
              >
                {isSelected ? "✓ Selected" : "Select"}
              </button>
            </button>
          );
        })}
      </div>

      {/* Custom sound upload */}
      {onCustomSoundUpload && (
        <div
          className="rounded-2xl p-4"
          style={{
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.07)",
          }}
        >
          <p className="text-xs font-semibold text-white mb-2">Custom Sound</p>

          {uploadedFileName || customSoundUrl ? (
            <div className="flex items-center gap-2 mb-3">
              <div
                className="flex-1 min-w-0 px-3 py-2 rounded-xl text-xs truncate"
                style={{
                  background: "rgba(124,58,237,0.1)",
                  border: "1px solid rgba(124,58,237,0.25)",
                  color: "#a78bfa",
                }}
              >
                {uploadedFileName ?? "Custom sound uploaded ✓"}
              </div>
            </div>
          ) : null}

          <input
            ref={fileInputRef}
            type="file"
            accept=".mp3,.wav,.ogg,audio/mpeg,audio/wav,audio/ogg"
            onChange={handleFileChange}
            className="hidden"
            id="custom-sound-upload"
          />

          <button
            type="button"
            className="w-full flex items-center justify-center gap-2 h-10 rounded-xl text-sm font-medium transition-all"
            style={
              uploading
                ? {
                    background: "rgba(124,58,237,0.1)",
                    border: "1px solid rgba(124,58,237,0.2)",
                    color: "#64748b",
                    cursor: "not-allowed",
                  }
                : {
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.1)",
                    color: "#94a3b8",
                    cursor: "pointer",
                  }
            }
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
            data-ocid="sound_selector.upload_button"
          >
            <Upload className="w-4 h-4" />
            {uploading ? "Uploading..." : "Upload Sound"}
          </button>

          <p className="text-[10px] mt-2" style={{ color: "#334155" }}>
            MP3, WAV, or OGG · Max 5MB
          </p>

          {uploadError && (
            <p
              className="text-xs mt-2"
              style={{ color: "#ef4444" }}
              data-ocid="sound_selector.error_state"
            >
              {uploadError}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
