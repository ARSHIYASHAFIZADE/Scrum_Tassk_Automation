"use client";

import { useRef, useState, useEffect } from "react";

function formatTime(seconds: number): string {
  if (!isFinite(seconds)) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function AudioPlayer({ src }: { src: string }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onLoaded = () => setDuration(audio.duration);
    const onTime   = () => setProgress(audio.currentTime);
    const onEnded  = () => setPlaying(false);
    audio.addEventListener("loadedmetadata", onLoaded);
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("ended", onEnded);
    return () => {
      audio.removeEventListener("loadedmetadata", onLoaded);
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("ended", onEnded);
    };
  }, []);

  function toggle() {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) { audio.pause(); setPlaying(false); }
    else         { audio.play();  setPlaying(true);  }
  }

  function seek(e: React.MouseEvent<HTMLDivElement>) {
    const audio = audioRef.current;
    if (!audio || !duration) return;
    const rect = e.currentTarget.getBoundingClientRect();
    audio.currentTime = ((e.clientX - rect.left) / rect.width) * duration;
  }

  const pct = duration > 0 ? (progress / duration) * 100 : 0;

  return (
    <div className="t-card border t-border rounded-xl p-4">
      <div className="flex items-center gap-4 mb-3">
        <button
          onClick={toggle}
          className="t-text hover:t-accent-text text-base w-5 transition-colors"
          aria-label={playing ? "Pause" : "Play"}
        >
          {playing ? "■" : "▶"}
        </button>
        <span className="font-mono text-xs t-muted">
          {formatTime(progress)} / {formatTime(duration)}
        </span>
        <span className="font-mono text-[10px] t-faint uppercase tracking-widest ml-auto">
          AUDIO
        </span>
      </div>

      <div
        className="h-1 t-input rounded-full relative cursor-pointer hover:h-1.5 transition-all"
        onClick={seek}
      >
        <div
          className="h-full rounded-full transition-none"
          style={{ width: `${pct}%`, backgroundColor: "var(--t-accent)" }}
        />
        <div
          className="absolute top-1/2 w-2.5 h-2.5 rounded-full"
          style={{
            left: `${pct}%`,
            transform: "translate(-50%, -50%)",
            backgroundColor: "var(--t-accent)",
          }}
        />
      </div>

      <audio ref={audioRef} src={src} preload="metadata" />
    </div>
  );
}
