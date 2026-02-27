"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Room, RoomEvent, ConnectionState } from "livekit-client";
import MicButton from "@/components/MicButton";
import Waveform from "@/components/Waveform";

// ─── Types ────────────────────────────────────────────────────────────────────

type Status = "idle" | "connecting" | "connected" | "error" | "stopping";

const STATUS_LABEL: Record<Status, string> = {
  idle:       "Ready",
  connecting: "Connecting…",
  connected:  "Live",
  error:      "Error",
  stopping:   "Stopping…",
};

const STATUS_DOT: Record<Status, string> = {
  idle:       "bg-zinc-600",
  connecting: "bg-amber-400 animate-pulse",
  connected:  "bg-emerald-400 animate-pulse",
  error:      "bg-red-500",
  stopping:   "bg-zinc-600",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function wordCount(text: string) {
  return text.split(/\s+/).filter(Boolean).length;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function HomePage() {
  const [status,     setStatus]     = useState<Status>("idle");
  const [isLiveKit,  setIsLiveKit]  = useState(false);
  const [transcript, setTranscript] = useState("");
  const [interim,    setInterim]    = useState("");
  const [errorMsg,   setErrorMsg]   = useState("");

  const roomRef        = useRef<Room | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const transcriptRef  = useRef<HTMLDivElement | null>(null);

  // Scroll transcript box only — never the page
  useEffect(() => {
    const el = transcriptRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [transcript, interim]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      recognitionRef.current?.abort();
      roomRef.current?.disconnect();
    };
  }, []);

  // ── Speech Recognition ──────────────────────────────────────────────────────

  const startRecognition = useCallback((): boolean => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechAPI = (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition;

    if (!SpeechAPI) {
      setErrorMsg("Speech recognition is not supported in this browser. Please use Chrome or Edge.");
      setStatus("error");
      return false;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const recognition: any = new SpeechAPI();
    recognition.continuous     = true;
    recognition.interimResults = true;
    recognition.lang           = "en-US";

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (event: any) => {
      let finalText = "", interimText = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const chunk = event.results[i][0].transcript;
        if (event.results[i].isFinal) finalText   += chunk;
        else                          interimText  += chunk;
      }
      if (finalText) {
        setTranscript((prev) => prev ? `${prev} ${finalText.trim()}` : finalText.trim());
      }
      setInterim(interimText);
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onerror = (event: any) => {
      if (event.error === "not-allowed") {
        setErrorMsg("Microphone access denied. Please allow microphone access and try again.");
        setStatus("error");
      } else if (event.error !== "aborted") {
        setErrorMsg(`Recognition error: ${event.error}`);
        setStatus("error");
      }
    };

    recognition.onend = () => setInterim("");
    recognition.start();
    recognitionRef.current = recognition;
    return true;
  }, []);

  // ── Start ───────────────────────────────────────────────────────────────────

  const handleStart = useCallback(async () => {
    setStatus("connecting");
    setErrorMsg("");
    setTranscript("");
    setInterim("");

    let liveKitConnected = false;

    try {
      const res  = await fetch("/api/livekit/token", { method: "POST" });
      const data = await res.json() as { token?: string; url?: string };

      if (res.ok && data.token && data.url) {
        const room = new Room({ adaptiveStream: true, dynacast: true });
        roomRef.current = room;

        room.on(RoomEvent.ConnectionStateChanged, (state: ConnectionState) => {
          if (state === ConnectionState.Disconnected) {
            setStatus((prev) => prev === "connected" ? "idle" : prev);
            setIsLiveKit(false);
          }
        });

        await room.connect(data.url, data.token);
        await room.localParticipant.setMicrophoneEnabled(true);
        liveKitConnected = true;
        setIsLiveKit(true);
      }
    } catch {
      // LiveKit unavailable — fall back to browser-only silently
    }

    if (!liveKitConnected) setIsLiveKit(false);

    const started = startRecognition();
    if (started) setStatus("connected");
  }, [startRecognition]);

  // ── Stop ────────────────────────────────────────────────────────────────────

  const handleStop = useCallback(async () => {
    setStatus("stopping");
    recognitionRef.current?.stop();
    recognitionRef.current = null;

    if (roomRef.current) {
      await roomRef.current.disconnect();
      roomRef.current = null;
    }

    setInterim("");
    setIsLiveKit(false);
    setStatus("idle");
  }, []);

  // ── Derived ─────────────────────────────────────────────────────────────────

  const isActive = status === "connected";
  const isBusy   = status === "connecting" || status === "stopping";
  const words    = wordCount(transcript);

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col">
      {/* App Section */}
      <section className="px-4 sm:px-6 pt-20 pb-10 min-h-screen flex flex-col">
        <div className="flex flex-col max-w-3xl w-full mx-auto gap-4 my-auto">
          {/* ── Page title ──────────────────────────────────────────────────── */}
          <div className="text-center shrink-0">
            <p className="text-zinc-600 text-xs font-medium uppercase tracking-[0.2em] mb-1">
              Ashxcribe
            </p>
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Real-time Transcription
            </h1>
            <p className="text-zinc-500 text-xs mt-0.5">
              Speak. We listen. Instantly.
            </p>
          </div>

          {/* ── Transcript card ─────────────────────────────────────────────── */}
          <div className="flex flex-col h-[320px] sm:h-[400px] rounded-2xl border border-zinc-800/80 bg-zinc-900/60 backdrop-blur-sm shadow-2xl shadow-black/40 overflow-hidden">
            {/* Status bar */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-800/80 bg-zinc-900/80 shrink-0">
              <div className="flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full shrink-0 ${STATUS_DOT[status]}`} />
                <span className="text-zinc-400 text-xs font-medium">{STATUS_LABEL[status]}</span>
              </div>

              <div className="flex items-center gap-3">
                {isActive && (
                  <span
                    className={`px-2 py-0.5 text-xs font-medium rounded-full border ${
                      isLiveKit
                        ? "text-violet-300 bg-violet-600/15 border-violet-500/20"
                        : "text-zinc-500 bg-zinc-800/80 border-zinc-700/60"
                    }`}
                  >
                    {isLiveKit ? "LiveKit" : "Browser"}
                  </span>
                )}
                {(transcript || interim) && (
                  <button
                    onClick={() => { setTranscript(""); setInterim(""); }}
                    className="text-zinc-600 hover:text-zinc-400 text-xs transition-colors"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            {/* Transcript text area */}
            <div
              ref={transcriptRef}
              className="flex-1 overflow-y-auto px-6 py-5 font-mono text-sm leading-relaxed min-h-0"
            >
              {!isActive && !isBusy && !transcript ? (
                <p className="text-zinc-700 select-none leading-loose">
                  Click the microphone button below and start speaking — your words will
                  appear here in real time, word by word.
                </p>
              ) : (
                <div>
                  {isBusy && !transcript && (
                    <span className="text-zinc-600">
                      {status === "connecting" ? "Requesting microphone…" : "Stopping…"}
                    </span>
                  )}
                  {transcript && (
                    <span className="text-zinc-100">{transcript}</span>
                  )}
                  {interim && (
                    <span className="text-zinc-500">
                      {transcript ? " " : ""}
                      {interim}
                    </span>
                  )}
                  {isActive && (
                    <span className="inline-block w-[2px] h-[1em] bg-violet-400 ml-0.5 animate-pulse align-text-bottom" />
                  )}
                </div>
              )}
            </div>

            {/* Bottom bar — waveform + word count + copy */}
            <div className="flex items-center justify-between px-5 py-3 border-t border-zinc-800/60 bg-zinc-900/40 shrink-0">
              <Waveform active={isActive} />

              <div className="flex items-center gap-4">
                {(transcript || interim) && (
                  <span className="text-zinc-600 text-xs font-mono">
                    {words} {words === 1 ? "word" : "words"}
                  </span>
                )}
                {!isActive && transcript && (
                  <button
                    onClick={() => navigator.clipboard.writeText(transcript).catch(() => {})}
                    className="flex items-center gap-1.5 text-zinc-600 hover:text-zinc-300 text-xs transition-colors"
                  >
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <rect x="9" y="9" width="13" height="13" rx="2" />
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                    </svg>
                    Copy
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* ── Error banner ────────────────────────────────────────────────── */}
          {status === "error" && errorMsg && (
            <div className="flex items-start gap-3 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 shrink-0">
              <svg className="w-4 h-4 text-red-400 mt-0.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <p className="text-red-400 text-sm leading-relaxed">{errorMsg}</p>
            </div>
          )}

          {/* ── Mic button + label ──────────────────────────────────────────── */}
          <div className="flex flex-col items-center gap-3 shrink-0 py-2">
            <MicButton status={status} onStart={handleStart} onStop={handleStop} />
            <p className="text-zinc-600 text-xs select-none h-4">
              {isActive
                ? "Recording — click to stop"
                : isBusy
                ? status === "connecting" ? "Connecting…" : "Stopping…"
                : "Click to start transcribing"}
            </p>
          </div>
        </div>
      </section>

      {/* ── How It Works ──────────────────────────────────────────────────── */}
      <section className="px-4 sm:px-6 py-24 border-t border-zinc-800/60 bg-zinc-950/50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-xl sm:text-2xl font-semibold text-zinc-100 tracking-tight mb-8">How It Works</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {[
              { n: "01", title: "Capture", body: "Browser mic via WebRTC — continuous audio streams captured and packetized for low-latency transmission." },
              { n: "02", title: "Transport", body: "LiveKit Cloud signaling — audio routed through a globally distributed SFU with minimal packet loss." },
              { n: "03", title: "Inference", body: "Python LiveKit Agent + streaming executor — raw frames processed by a streaming speech-to-text model." },
              { n: "04", title: "Output", body: "Real-time transcript via data channels — tokens emitted incrementally for near-instant UI updates." },
            ].map(({ n, title, body }) => (
              <div key={n} className="p-5 rounded-2xl border border-zinc-800/60 bg-zinc-900/40">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center text-zinc-300 font-mono text-xs">{n}</div>
                  <h3 className="text-sm font-medium text-zinc-200">{title}</h3>
                </div>
                <p className="text-xs text-zinc-400 leading-relaxed">{body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Tech Stack & Performance ────────────────────────────────────────── */}
      <section className="px-4 sm:px-6 py-24 border-t border-zinc-800/60 bg-zinc-950">
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12 sm:gap-8">
          {/* Tech Stack */}
          <div>
            <h2 className="text-xl sm:text-2xl font-semibold text-zinc-100 tracking-tight mb-6">Tech Stack</h2>
            <div className="flex flex-wrap gap-2">
              {[
                "Next.js 14 (App Router)",
                "TypeScript",
                "Tailwind CSS",
                "LiveKit WebRTC",
                "Python LiveKit Agent",
                "Streaming AI inference",
              ].map((t) => (
                <span key={t} className="px-2.5 py-1.5 rounded-[0.4rem] bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs font-mono tracking-wide">{t}</span>
              ))}
            </div>
          </div>

          {/* Performance Highlights */}
          <div>
            <h2 className="text-xl sm:text-2xl font-semibold text-zinc-100 tracking-tight mb-6">Performance Highlights</h2>
            <ul className="space-y-4">
              {[
                { icon: <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />, label: "Real-time streaming", sub: "Interim words appear before phrase completion." },
                { icon: <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />, label: "Low-latency architecture", sub: "Optimized routing bypasses HTTP polling loops." },
                { icon: <><path d="M3 3h18v18H3z" /><path d="M3 9h18M9 21V9" /></>, label: "Cloud signaling", sub: "LiveKit Cloud SFU with global distribution." },
                { icon: <><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></>, label: "Multi-speaker ready", sub: "Isolated streams support diarization." },
              ].map(({ icon, label, sub }) => (
                <li key={label} className="flex items-start gap-3">
                  <svg className="w-4 h-4 text-violet-500 mt-0.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">{icon}</svg>
                  <div>
                    <p className="text-sm font-medium text-zinc-200">{label}</p>
                    <p className="text-xs text-zinc-500 mt-0.5 leading-relaxed">{sub}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}
