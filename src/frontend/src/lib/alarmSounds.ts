// alarmSounds.ts
// Synthesizes alarm sounds using Web Audio API — no MP3 files needed.

export interface AlarmSound {
  id: string;
  label: string;
  description: string;
}

export const BUILT_IN_SOUNDS: AlarmSound[] = [
  {
    id: "default",
    label: "Default Alarm",
    description: "Classic beep pattern",
  },
  {
    id: "morning-breeze",
    label: "Morning Breeze",
    description: "Soft rising tones",
  },
  {
    id: "digital-alarm",
    label: "Digital Alarm",
    description: "Electronic pulse",
  },
  { id: "soft-bell", label: "Soft Bell", description: "Gentle bell ring" },
  { id: "rise-and-shine", label: "Rise & Shine", description: "Upbeat melody" },
  { id: "future-alarm", label: "Future Alarm", description: "Sci-fi chirp" },
];

let activeAudioCtx: AudioContext | null = null;
let activeNodes: AudioNode[] = [];
let activeLoopInterval: ReturnType<typeof setInterval> | null = null;

function getAudioCtx(): AudioContext {
  if (!activeAudioCtx || activeAudioCtx.state === "closed") {
    const AC =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    activeAudioCtx = new AC();
  }
  return activeAudioCtx;
}

export function stopAlarmSound(): void {
  if (activeLoopInterval) {
    clearInterval(activeLoopInterval);
    activeLoopInterval = null;
  }
  for (const node of activeNodes) {
    try {
      (node as OscillatorNode).stop?.();
    } catch {
      /* ignore */
    }
  }
  activeNodes = [];
  if (activeAudioCtx) {
    try {
      activeAudioCtx.close();
    } catch {
      /* ignore */
    }
    activeAudioCtx = null;
  }
}

function playOnce(id: string, volume: number): void {
  const ctx = getAudioCtx();
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(volume * 0.5, ctx.currentTime);
  gain.connect(ctx.destination);

  const patterns: Record<string, () => void> = {
    default: () => {
      for (let i = 0; i < 3; i++) {
        const osc = ctx.createOscillator();
        osc.connect(gain);
        osc.frequency.value = 880;
        osc.type = "square";
        osc.start(ctx.currentTime + i * 0.3);
        osc.stop(ctx.currentTime + i * 0.3 + 0.2);
        activeNodes.push(osc);
      }
    },
    "morning-breeze": () => {
      const freqs = [523, 659, 784, 1047];
      freqs.forEach((f, i) => {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.connect(g);
        g.connect(ctx.destination);
        osc.type = "sine";
        osc.frequency.value = f;
        g.gain.setValueAtTime(0, ctx.currentTime + i * 0.2);
        g.gain.linearRampToValueAtTime(
          volume * 0.3,
          ctx.currentTime + i * 0.2 + 0.05,
        );
        g.gain.exponentialRampToValueAtTime(
          0.001,
          ctx.currentTime + i * 0.2 + 0.4,
        );
        osc.start(ctx.currentTime + i * 0.2);
        osc.stop(ctx.currentTime + i * 0.2 + 0.45);
        activeNodes.push(osc);
      });
    },
    "digital-alarm": () => {
      for (let i = 0; i < 4; i++) {
        const osc = ctx.createOscillator();
        osc.connect(gain);
        osc.frequency.value = i % 2 === 0 ? 1200 : 900;
        osc.type = "sawtooth";
        osc.start(ctx.currentTime + i * 0.2);
        osc.stop(ctx.currentTime + i * 0.2 + 0.15);
        activeNodes.push(osc);
      }
    },
    "soft-bell": () => {
      const freqs = [783.99, 1046.5, 1318.5];
      freqs.forEach((f, i) => {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.connect(g);
        g.connect(ctx.destination);
        osc.type = "sine";
        osc.frequency.value = f;
        g.gain.setValueAtTime(volume * 0.25, ctx.currentTime + i * 0.15);
        g.gain.exponentialRampToValueAtTime(
          0.001,
          ctx.currentTime + i * 0.15 + 1.0,
        );
        osc.start(ctx.currentTime + i * 0.15);
        osc.stop(ctx.currentTime + i * 0.15 + 1.1);
        activeNodes.push(osc);
      });
    },
    "rise-and-shine": () => {
      const freqs = [440, 494, 523, 587, 659, 698, 784];
      freqs.forEach((f, i) => {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.connect(g);
        g.connect(ctx.destination);
        osc.type = "triangle";
        osc.frequency.value = f;
        g.gain.setValueAtTime(volume * 0.2, ctx.currentTime + i * 0.12);
        g.gain.exponentialRampToValueAtTime(
          0.001,
          ctx.currentTime + i * 0.12 + 0.25,
        );
        osc.start(ctx.currentTime + i * 0.12);
        osc.stop(ctx.currentTime + i * 0.12 + 0.3);
        activeNodes.push(osc);
      });
    },
    "future-alarm": () => {
      const osc = ctx.createOscillator();
      osc.connect(gain);
      osc.type = "sine";
      osc.frequency.setValueAtTime(200, ctx.currentTime);
      osc.frequency.linearRampToValueAtTime(1400, ctx.currentTime + 0.3);
      osc.frequency.linearRampToValueAtTime(200, ctx.currentTime + 0.6);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.65);
      activeNodes.push(osc);
    },
  };

  const play = patterns[id] ?? patterns.default;
  play();
}

export function playAlarmSound(
  soundId: string,
  volume = 0.8,
  loop = false,
): void {
  stopAlarmSound();
  const clampedVol = Math.max(0, Math.min(1, volume));
  playOnce(soundId, clampedVol);
  if (loop) {
    // Loop with appropriate interval based on sound duration
    const intervals: Record<string, number> = {
      default: 1200,
      "morning-breeze": 2000,
      "digital-alarm": 1500,
      "soft-bell": 1800,
      "rise-and-shine": 1800,
      "future-alarm": 1200,
    };
    const interval = intervals[soundId] ?? 1500;
    activeLoopInterval = setInterval(() => {
      playOnce(soundId, clampedVol);
    }, interval);
  }
}

export function playAlarmSoundFromUrl(
  url: string,
  volume = 0.8,
): HTMLAudioElement | null {
  stopAlarmSound();
  try {
    const audio = new Audio(url);
    audio.volume = Math.max(0, Math.min(1, volume));
    audio.loop = true;
    audio.play().catch(() => {
      /* ignore */
    });
    return audio;
  } catch {
    return null;
  }
}

export function previewAlarmSound(soundId: string, volume = 0.8): void {
  playAlarmSound(soundId, volume, false);
}
