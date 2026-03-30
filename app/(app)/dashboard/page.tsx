"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { format } from "date-fns";
import { createClient } from "@/lib/supabase/client";
import { useApp } from "@/context/AppContext";
import MicButton from "@/components/MicButton";
import Waveform from "@/components/Waveform";
import type { ScrumSession, Template } from "@/lib/types";

// ─── Types ───────────────────────────────────────────────────────────────────
type Status = "idle" | "connecting" | "connected" | "stopping" | "saving" | "transcribing" | "error";

const STATUS_LABEL: Record<Status, string> = {
  idle: "IDLE",
  connecting: "CONNECTING",
  connected: "LIVE",
  stopping: "STOPPING",
  saving: "SAVING",
  transcribing: "TRANSCRIBING",
  error: "ERROR",
};

const STATUS_COLOR: Record<Status, string> = {
  idle:        "bg-[var(--t-border)]",
  connecting:  "bg-[var(--t-warning)]",
  connected:   "bg-[var(--t-success)]",
  stopping:    "bg-[var(--t-warning)]",
  saving:      "bg-[var(--t-accent)]",
  transcribing:"bg-[var(--t-accent)]",
  error:       "bg-[var(--t-error)]",
};

// ─── Declarations for Web Speech API ─────────────────────────────────────────
interface SpeechRecognitionEvent extends Event {
  resultIndex: number;
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}

interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition: new () => SpeechRecognitionInstance;
  }
}

export default function DashboardPage() {
  const supabase = createClient();
  const { activeCompany, templates } = useApp();

  // ── Transcription state ──
  const [status, setStatus] = useState<Status>("idle");
  const [transcript, setTranscript] = useState("");
  const [interim, setInterim] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  // ── Session state ──
  const [activeTemplateId, setActiveTemplateId] = useState<string>("");
  const [currentSession, setCurrentSession] = useState<ScrumSession | null>(null);
  const [generatedDoc, setGeneratedDoc] = useState("");
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState("");
  const [sessionSaved, setSessionSaved] = useState(false);

  // ── Refs ──
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  // Auto-select first template when templates load
  useEffect(() => {
    if (templates.length > 0 && !activeTemplateId) {
      const def = templates.find((t) => t.is_default) ?? templates[0];
      setActiveTemplateId(def.id);
    }
  }, [templates, activeTemplateId]);

  // Reset session state when company changes
  useEffect(() => {
    setCurrentSession(null);
    setGeneratedDoc("");
    setSessionSaved(false);
    setTranscript("");
    setInterim("");
  }, [activeCompany?.id]);

  // ── Speech Recognition ───────────────────────────────────────────────────
  const startRecognition = useCallback(() => {
    const SR =
      typeof window !== "undefined" &&
      (window.SpeechRecognition || window.webkitSpeechRecognition);
    if (!SR) {
      setErrorMsg("Browser speech recognition not supported. Use Chrome or Edge.");
      setStatus("error");
      return;
    }
    const recognition = new SR();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let final = "";
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          final += result[0].transcript + " ";
        } else {
          interim += result[0].transcript;
        }
      }
      if (final) setTranscript((prev) => prev + final);
      setInterim(interim);
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (event.error === "not-allowed") {
        setErrorMsg("Microphone access denied. Please allow microphone access.");
        setStatus("error");
      }
    };

    recognition.onend = () => {
      setInterim("");
    };

    recognition.start();
    recognitionRef.current = recognition;
  }, []);

  // ── Start Recording ───────────────────────────────────────────────────────
  const handleStart = useCallback(async () => {
    if (!activeCompany) {
      setErrorMsg("Select or create a company first.");
      setStatus("error");
      return;
    }
    setStatus("connecting");
    setErrorMsg("");
    setTranscript("");
    setInterim("");
    setCurrentSession(null);
    setGeneratedDoc("");
    setSessionSaved(false);
    audioChunksRef.current = [];

    try {
      // Get mic stream
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Set up MediaRecorder
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";
      const recorder = new MediaRecorder(stream, { mimeType });
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      recorder.start(1000);
      mediaRecorderRef.current = recorder;

      // Start Web Speech API for live transcription
      startRecognition();

      setStatus("connected");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to start recording";
      setErrorMsg(msg);
      setStatus("error");
    }
  }, [activeCompany, startRecognition]);

  // ── Stop Recording ───────────────────────────────────────────────────────
  const handleStop = useCallback(async () => {
    setStatus("stopping");

    // Stop speech recognition
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setInterim("");

    // Stop MediaRecorder and collect final chunk
    const audioBlob = await new Promise<Blob | null>((resolve) => {
      const recorder = mediaRecorderRef.current;
      if (!recorder || recorder.state === "inactive") {
        resolve(audioChunksRef.current.length > 0
          ? new Blob(audioChunksRef.current, { type: "audio/webm" })
          : null);
        return;
      }
      recorder.onstop = () => {
        resolve(audioChunksRef.current.length > 0
          ? new Blob(audioChunksRef.current, { type: "audio/webm" })
          : null);
      };
      recorder.stop();
    });
    mediaRecorderRef.current = null;

    // Stop mic stream tracks
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;

    setStatus("saving");

    // Transcribe with Groq Whisper if Web Speech gave us nothing
    let finalTranscript = transcript.trim();
    if (audioBlob && !finalTranscript) {
      setStatus("transcribing");
      try {
        const fd = new FormData();
        fd.append("audio", audioBlob, "recording.webm");
        const res = await fetch("/api/transcribe", { method: "POST", body: fd });
        if (res.ok) {
          const { transcript: t } = await res.json();
          if (t) {
            finalTranscript = t;
            setTranscript(t);
          }
        }
      } catch {
        // transcription failed, continue without it
      }
    }

    setStatus("saving");

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !activeCompany) throw new Error("Not authenticated");

      let audioUrl: string | null = null;
      let audioFilename: string | null = null;

      // Upload audio blob
      audioChunksRef.current = [];
      if (audioBlob) {
        const filename = `${user.id}/${activeCompany.id}/${Date.now()}.webm`;
        const { error: uploadError } = await supabase.storage
          .from("audio")
          .upload(filename, audioBlob, { contentType: "audio/webm" });

        if (!uploadError) {
          const { data: urlData } = await supabase.storage
            .from("audio")
            .createSignedUrl(filename, 60 * 60 * 24 * 7);
          audioUrl = urlData?.signedUrl ?? null;
          audioFilename = filename;
        }
      }

      // Save session
      const today = format(new Date(), "yyyy-MM-dd");
      const { data: session } = await supabase
        .from("scrum_sessions")
        .insert({
          user_id: user.id,
          company_id: activeCompany.id,
          template_id: activeTemplateId || null,
          date: today,
          transcript: finalTranscript,
          audio_url: audioUrl,
          audio_filename: audioFilename,
        })
        .select()
        .single();

      if (session) {
        setCurrentSession(session as ScrumSession);
        setSessionSaved(true);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to save session";
      setErrorMsg(msg);
    }

    setStatus("idle");
  }, [supabase, activeCompany, activeTemplateId, transcript]);

  // ── Generate SCRUM Doc ───────────────────────────────────────────────────
  const handleGenerate = useCallback(async () => {
    if (!transcript.trim()) {
      setGenerateError("No transcript to generate from.");
      return;
    }
    if (!activeTemplateId) {
      setGenerateError("Select a template first.");
      return;
    }
    setGenerating(true);
    setGenerateError("");

    try {
      const res = await fetch("/api/generate-scrum", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcript: transcript.trim(),
          templateId: activeTemplateId,
          companyId: activeCompany?.id,
          date: format(new Date(), "yyyy-MM-dd"),
          sessionId: currentSession?.id ?? null,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Generation failed");
      }

      const { document } = await res.json();
      setGeneratedDoc(document);

      // If session not yet saved, save it now
      if (!currentSession) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user && activeCompany) {
          const { data: session } = await supabase
            .from("scrum_sessions")
            .insert({
              user_id: user.id,
              company_id: activeCompany.id,
              template_id: activeTemplateId || null,
              date: format(new Date(), "yyyy-MM-dd"),
              transcript: transcript.trim(),
              generated_document: document,
            })
            .select()
            .single();
          if (session) setCurrentSession(session as ScrumSession);
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Generation failed";
      setGenerateError(msg);
    }
    setGenerating(false);
  }, [transcript, activeTemplateId, activeCompany, currentSession, supabase]);

  const isRecording = status === "connected";
  const isBusy = status === "connecting" || status === "stopping" || status === "saving" || status === "transcribing";

  const wordCount = transcript.trim()
    ? transcript.trim().split(/\s+/).length
    : 0;

  const activeTemplate = templates.find((t) => t.id === activeTemplateId) as Template | undefined;

  return (
    <div className="flex flex-col flex-1 h-full px-5 py-4 min-h-0">

      {/* ── Session context bar ── */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <span className="font-mono text-xs t-faint">
          {format(new Date(), "MMM d, yyyy")}
        </span>

        {activeCompany && (
          <span
            className="text-xs font-semibold px-2 py-0.5 rounded-full"
            style={{ backgroundColor: activeCompany.color + "22", color: activeCompany.color }}
          >
            {activeCompany.name}
          </span>
        )}

        {templates.length > 0 && (
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-xs t-muted">Template:</span>
            <select
              value={activeTemplateId}
              onChange={(e) => setActiveTemplateId(e.target.value)}
              className="t-input border t-border t-text text-xs rounded-lg
                         px-2 py-1 appearance-none focus:outline-none"
            >
              {templates.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
        )}

        {!activeCompany && (
          <span className="text-xs t-warning">
            No company yet.{" "}
            <a href="/settings" className="underline t-accent-text">Create one →</a>
          </span>
        )}
      </div>

      {/* ── Main panels ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1 min-h-0">

        {/* Left: Transcript */}
        <div className="t-card border t-border rounded-xl overflow-hidden t-shadow flex flex-col min-h-0">
          {/* Panel header */}
          <div className="flex items-center justify-between px-5 py-3 border-b t-border">
            <div className="flex items-center gap-3">
              <span className="text-sm font-semibold t-text">Transcript</span>
              <div className="flex items-center gap-1.5">
                <div
                  className={`w-6 h-1 rounded-full ${STATUS_COLOR[status]} ${
                    isRecording ? "animate-pulse" : ""
                  }`}
                />
                <span className="font-mono text-[10px] t-faint uppercase">
                  {STATUS_LABEL[status]}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-3">

              {wordCount > 0 && (
                <span className="font-mono text-[10px] t-faint">{wordCount} words</span>
              )}
              {transcript && (
                <button
                  onClick={() => { setTranscript(""); setInterim(""); }}
                  className="text-xs t-faint hover:t-error transition-colors"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Transcript text */}
          <div className="h-72 overflow-y-auto p-5">
            {errorMsg && (
              <div className="rounded-lg border border-[var(--t-error)]/30 t-error-bg px-3 py-2 mb-3">
                <p className="text-xs t-error">{errorMsg}</p>
              </div>
            )}
            {transcript || interim ? (
              <p className="text-sm t-text leading-relaxed whitespace-pre-wrap">
                {transcript}
                {interim && <span className="t-faint">{interim}</span>}
              </p>
            ) : (
              <div className="h-full flex flex-col items-center justify-center gap-2 text-center">
                <p className="text-xs t-faint">
                  {status === "idle"
                    ? "Click the mic button below to start recording your standup"
                    : status === "transcribing"
                    ? "Transcribing your audio with Whisper AI..."
                    : "Listening... speak your standup"}
                </p>
              </div>
            )}
          </div>

          {/* Mic controls */}
          <div className="border-t t-border px-5 py-4 flex items-center gap-4">
            <Waveform active={isRecording} />
            <div className="flex-1" />
            <div className="flex flex-col items-center gap-1">
              <MicButton
                status={isRecording ? "active" : isBusy ? "busy" : status === "error" ? "error" : "idle"}
                onClick={isRecording ? handleStop : handleStart}
              />
              <span className="font-mono text-[10px] t-faint">
                {isRecording ? "tap to stop" : isBusy ? STATUS_LABEL[status].toLowerCase() : "tap to record"}
              </span>
            </div>
          </div>
        </div>

        {/* Right: SCRUM Document */}
        <div className="t-card border t-border rounded-xl overflow-hidden t-shadow">
          {/* Panel header */}
          <div className="flex items-center justify-between px-5 py-3 border-b t-border">
            <span className="text-sm font-semibold t-text">SCRUM Document</span>
            {generatedDoc && currentSession && (
              <a
                href={`/session/${currentSession.id}`}
                className="text-xs t-accent-text hover:underline"
              >
                View session →
              </a>
            )}
          </div>

          {/* Document area */}
          <div className="h-72 overflow-y-auto p-5">
            {generatedDoc ? (
              <pre className="font-mono text-xs t-text leading-relaxed whitespace-pre-wrap">
                {generatedDoc}
              </pre>
            ) : (
              <div className="h-full flex flex-col items-center justify-center gap-4">
                <div className="text-center space-y-1">
                  <p className="text-sm t-muted">
                    {transcript
                      ? "Transcript ready — generate your document below"
                      : "Record your standup first, then generate the SCRUM document"}
                  </p>
                </div>
                {activeTemplate && (
                  <div className="border t-border t-input rounded-lg p-3 w-full max-h-28 overflow-hidden relative">
                    <p className="font-mono text-[10px] t-faint mb-1">Template preview</p>
                    <pre className="font-mono text-[10px] t-muted whitespace-pre-wrap leading-relaxed line-clamp-4">
                      {activeTemplate.content.slice(0, 180)}...
                    </pre>
                    <div
                      className="absolute bottom-0 left-0 right-0 h-8"
                      style={{ background: "linear-gradient(to top, var(--t-input), transparent)" }}
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Generate controls */}
          <div className="border-t t-border px-5 py-4 flex items-center gap-3 flex-wrap">
            {generateError && (
              <p className="text-xs t-error w-full">{generateError}</p>
            )}
            {sessionSaved && !generatedDoc && (
              <span className="text-xs t-success font-medium">✓ Session saved</span>
            )}

            <button
              onClick={handleGenerate}
              disabled={generating || !transcript.trim()}
              className="text-sm font-medium px-5 py-2 rounded-lg t-accent
                         hover:opacity-90 disabled:opacity-30 transition-all"
            >
              {generating ? "Generating..." : "Generate SCRUM Doc"}
            </button>

            {generatedDoc && (
              <button
                onClick={() => navigator.clipboard.writeText(generatedDoc)}
                className="text-xs t-muted hover:t-text border t-border hover:t-accent-border
                           px-4 py-2 rounded-lg transition-colors"
              >
                Copy
              </button>
            )}
          </div>
        </div>
      </div>

      {/* No company nudge */}
      {!activeCompany && (
        <div className="mt-5 t-warn-bg border border-[var(--t-warning)]/30 rounded-xl px-4 py-3">
          <p className="text-sm t-warning">
            No company profile yet. Go to{" "}
            <a href="/settings" className="underline t-accent-text">
              Settings
            </a>{" "}
            to create one, or run the{" "}
            <a href="/onboarding" className="underline t-accent-text">
              setup wizard
            </a>
            .
          </p>
        </div>
      )}
    </div>
  );
}
