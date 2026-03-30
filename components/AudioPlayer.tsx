"use client";

import { useRef, useState, useEffect, useCallback } from "react";

function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function AudioPlayer({ src }: { src: string }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [dragging, setDragging] = useState(false);

  // Force-discover duration for webm files that don't report it
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const tryResolveDuration = () => {
      if (audio.duration && isFinite(audio.duration) && audio.duration > 0) {
        setDuration(audio.duration);
        return;
      }
      // Trick: seek to a huge number, browser resolves actual duration
      audio.currentTime = 1e10;
      audio.addEventListener("timeupdate", function resolve() {
        audio.removeEventListener("timeupdate", resolve);
        if (isFinite(audio.duration) && audio.duration > 0) {
          setDuration(audio.duration);
        }
        audio.currentTime = 0;
      });
    };

    const updateDuration = () => {
      if (audio.duration && isFinite(audio.duration) && audio.duration > 0) {
        setDuration(audio.duration);
      }
    };

    const onTime = () => {
      if (!dragging) setProgress(audio.currentTime);
      updateDuration();
    };

    const onEnded = () => { setPlaying(false); setProgress(audio.duration || 0); };

    audio.addEventListener("loadedmetadata", tryResolveDuration);
    audio.addEventListener("durationchange", updateDuration);
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("ended", onEnded);

    // If already loaded (cached)
    if (audio.readyState >= 1) tryResolveDuration();

    return () => {
      audio.removeEventListener("loadedmetadata", tryResolveDuration);
      audio.removeEventListener("durationchange", updateDuration);
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("ended", onEnded);
    };
  }, [dragging]);

  function toggle() {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) { audio.pause(); setPlaying(false); }
    else         { audio.play();  setPlaying(true);  }
  }

  // Seek to position from a mouse/pointer event on the track
  const seekFromEvent = useCallback((clientX: number) => {
    const audio = audioRef.current;
    const track = trackRef.current;
    if (!audio || !track || !duration) return;
    const rect = track.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    const time = ratio * duration;
    audio.currentTime = time;
    setProgress(time);
  }, [duration]);

  // Click to seek
  function handleTrackClick(e: React.MouseEvent<HTMLDivElement>) {
    seekFromEvent(e.clientX);
  }

  // Drag to scrub
  function handleDragStart(e: React.MouseEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragging(true);
    seekFromEvent(e.clientX);

    function onMove(ev: MouseEvent) {
      seekFromEvent(ev.clientX);
    }
    function onUp() {
      setDragging(false);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  // Skip forward/back with keyboard
  function handleKeyDown(e: React.KeyboardEvent) {
    const audio = audioRef.current;
    if (!audio || !duration) return;
    if (e.key === "ArrowRight") {
      audio.currentTime = Math.min(duration, audio.currentTime + 5);
      setProgress(audio.currentTime);
    } else if (e.key === "ArrowLeft") {
      audio.currentTime = Math.max(0, audio.currentTime - 5);
      setProgress(audio.currentTime);
    } else if (e.key === " ") {
      e.preventDefault();
      toggle();
    }
  }

  const pct = duration > 0 ? (progress / duration) * 100 : 0;

  return (
    <div
      className="t-card border t-border rounded-xl p-4 focus:outline-none"
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
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
        ref={trackRef}
        className={`t-input rounded-full relative cursor-pointer transition-all ${dragging ? "h-2" : "h-1.5 hover:h-2"}`}
        onClick={handleTrackClick}
        onMouseDown={handleDragStart}
      >
        <div
          className="h-full rounded-full transition-none"
          style={{ width: `${pct}%`, backgroundColor: "var(--t-accent)" }}
        />
        <div
          className="absolute top-1/2 w-3 h-3 rounded-full -translate-y-1/2"
          style={{
            left: `${pct}%`,
            transform: `translateX(-50%) translateY(-50%)`,
            backgroundColor: "var(--t-accent)",
            boxShadow: dragging ? "0 0 0 4px var(--t-selection)" : "none",
          }}
        />
      </div>

      <audio ref={audioRef} src={src} preload="auto" />
    </div>
  );
}
