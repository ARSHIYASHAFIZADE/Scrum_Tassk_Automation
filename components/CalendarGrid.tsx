"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  getDay, isToday, addMonths, subMonths,
} from "date-fns";
import { useApp } from "@/context/AppContext";
import ExportMenu from "@/components/ExportMenu";

export interface SessionSummary {
  id: string;
  date: string;
  company_id: string;
  generated_document: string | null;
  transcript: string | null;
  audio_filename: string | null;
  audio_url: string | null;
  created_at: string;
}

interface CalendarGridProps {
  sessions: SessionSummary[];
  month: string;
  companyId?: string;
  companyColor?: string;
  onMonthChange?: (month: string) => void;
}

const DOW_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// ─── Session Card (shown inside the day modal) ────────────────────────────
function SessionCard({
  session,
  companyColor,
  onDelete,
}: {
  session: SessionSummary;
  companyColor?: string;
  onDelete?: (id: string) => void;
}) {
  const router = useRouter();
  const { templates, activeCompany } = useApp();
  const [generating, setGenerating] = useState(false);
  const [docGenerated, setDocGenerated] = useState(false);
  const [genError, setGenError] = useState("");
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const hasAudio = !!(session.audio_filename || session.audio_url);
  const hasDoc = !!session.generated_document || docGenerated;
  const preview = session.transcript
    ? session.transcript.slice(0, 100) + (session.transcript.length > 100 ? "..." : "")
    : "No transcript";
  const time = format(new Date(session.created_at), "h:mm a");

  async function handleGenerate() {
    if (!session.transcript?.trim() || !activeCompany) return;
    const defaultTemplate = templates.find((t) => t.is_default) ?? templates[0];
    if (!defaultTemplate) { setGenError("No template available"); return; }

    setGenerating(true);
    setGenError("");
    try {
      const res = await fetch("/api/generate-scrum", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcript: session.transcript.trim(),
          templateId: defaultTemplate.id,
          companyId: activeCompany.id,
          date: session.date,
          sessionId: session.id,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Generation failed");
      }
      setDocGenerated(true);
    } catch (err) {
      setGenError(err instanceof Error ? err.message : "Generation failed");
    }
    setGenerating(false);
  }

  return (
    <div
      className="border t-border rounded-xl p-4 transition-colors"
      style={{ borderLeftColor: companyColor ?? "var(--t-accent)", borderLeftWidth: "3px" }}
    >
      {/* Time + status */}
      <div className="flex items-center gap-2 mb-2">
        <span className="font-mono text-xs t-text font-medium">{time}</span>
        {hasAudio && (
          <span className="font-mono text-[10px] t-accent-text px-1.5 py-0.5 rounded border border-[var(--t-accent)]/30">
            AUDIO
          </span>
        )}
        {hasDoc && (
          <span className="font-mono text-[10px] t-success px-1.5 py-0.5 rounded border border-[var(--t-success)]/30">
            DOC
          </span>
        )}
      </div>

      {/* Transcript preview */}
      <p className="text-xs t-muted leading-relaxed mb-3">{preview}</p>

      {genError && <p className="text-xs t-error mb-2">{genError}</p>}

      {/* Actions */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => router.push(`/session/${session.id}`)}
          className="text-xs font-medium t-muted hover:t-text border t-border hover:t-accent-border
                     px-3 py-1.5 rounded-lg transition-colors"
        >
          Open
        </button>

        {!hasDoc && session.transcript?.trim() && (
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="text-xs font-medium t-accent px-3 py-1.5 rounded-lg
                       hover:opacity-90 disabled:opacity-40 transition-all"
          >
            {generating ? "Generating..." : "Generate Doc"}
          </button>
        )}

        <ExportMenu
          sessionId={session.id}
          hasAudio={hasAudio}
          hasDocument={hasDoc || !!(session.transcript?.trim())}
        />

        {/* Delete */}
        {!confirmingDelete ? (
          <button
            onClick={() => setConfirmingDelete(true)}
            className="text-xs t-faint hover:t-error px-2 py-1.5 rounded-lg transition-colors ml-auto"
          >
            Delete
          </button>
        ) : (
          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={async () => {
                setDeleting(true);
                const supabase = (await import("@/lib/supabase/client")).createClient();
                await supabase.from("scrum_sessions").delete().eq("id", session.id);
                if (session.audio_filename) {
                  await supabase.storage.from("audio").remove([session.audio_filename]);
                }
                setDeleting(false);
                onDelete?.(session.id);
              }}
              disabled={deleting}
              className="text-xs font-medium px-3 py-1.5 rounded-lg bg-[var(--t-error)] text-white hover:opacity-90 disabled:opacity-40"
            >
              {deleting ? "..." : "Confirm"}
            </button>
            <button
              onClick={() => setConfirmingDelete(false)}
              className="text-xs t-muted hover:t-text px-2 py-1.5 rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Calendar Grid ────────────────────────────────────────────────────────
export default function CalendarGrid({ sessions, month, companyId, companyColor, onMonthChange }: CalendarGridProps) {
  const router = useRouter();
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [deletedIds, setDeletedIds] = useState<Set<string>>(new Set());

  const liveSessions = sessions.filter((s) => !deletedIds.has(s.id));

  const monthDate = new Date(month + "-01");
  const days = eachDayOfInterval({
    start: startOfMonth(monthDate),
    end: endOfMonth(monthDate),
  });
  const firstDow = (getDay(days[0]) + 6) % 7;

  const sessionMap = new Map<string, SessionSummary[]>();
  for (const s of liveSessions) {
    const existing = sessionMap.get(s.date) ?? [];
    existing.push(s);
    sessionMap.set(s.date, existing);
  }

  const selectedSessions = selectedDay ? (sessionMap.get(selectedDay) ?? []) : [];

  function navigate(dir: 1 | -1) {
    const next = dir === 1 ? addMonths(monthDate, 1) : subMonths(monthDate, 1);
    const nextMonth = format(next, "yyyy-MM");
    if (onMonthChange) {
      onMonthChange(nextMonth);
    } else {
      const params = new URLSearchParams();
      params.set("month", nextMonth);
      if (companyId) params.set("company", companyId);
      router.push(`/calendar?${params.toString()}`);
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="font-mono text-xs t-faint uppercase tracking-widest mb-0.5">Calendar</p>
          <h2 className="text-xl font-bold t-text">{format(monthDate, "MMMM yyyy")}</h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate(-1)}
            className="text-sm t-muted hover:t-text border t-border hover:t-accent-border
                       px-3 py-1.5 rounded-lg transition-colors"
          >
            ← Prev
          </button>
          <button
            onClick={() => navigate(1)}
            className="text-sm t-muted hover:t-text border t-border hover:t-accent-border
                       px-3 py-1.5 rounded-lg transition-colors"
          >
            Next →
          </button>
        </div>
      </div>

      {/* DOW headers */}
      <div className="grid grid-cols-7 mb-1">
        {DOW_LABELS.map((d) => (
          <div key={d} className="text-center py-2">
            <span className="font-mono text-[10px] t-faint uppercase tracking-wider">{d}</span>
          </div>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-7 border t-border rounded-xl overflow-hidden">
        {Array.from({ length: firstDow }).map((_, i) => (
          <div key={`e-${i}`} className="t-input min-h-[72px] border-b border-r t-border" />
        ))}

        {days.map((day, idx) => {
          const dateStr = format(day, "yyyy-MM-dd");
          const daySessions = sessionMap.get(dateStr) ?? [];
          const today   = isToday(day);
          const isLast  = idx === days.length - 1;

          return (
            <div
              key={dateStr}
              onClick={() => {
                if (daySessions.length === 1) {
                  router.push(`/session/${daySessions[0].id}`);
                } else if (daySessions.length > 1) {
                  setSelectedDay(dateStr);
                }
              }}
              className={`min-h-[72px] p-2 border-b border-r t-border transition-colors
                ${daySessions.length > 0 ? "cursor-pointer hover:t-hover" : ""}
                ${today ? "t-warn-bg" : ""}
                ${isLast ? "border-b-0" : ""}
              `}
            >
              <span className="flex items-center gap-1.5">
                <span
                  className="font-mono text-xs"
                  style={{ color: today ? "var(--t-warning)" : "var(--t-faint)" }}
                >
                  {format(day, "d")}
                </span>
                {daySessions.length > 0 && (
                  <span
                    className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ backgroundColor: companyColor ?? "var(--t-accent)" }}
                  />
                )}
                {daySessions.length > 1 && (
                  <span className="font-mono text-[9px] t-muted leading-none">{daySessions.length}</span>
                )}
              </span>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-5 mt-4">
        <div className="flex items-center gap-2">
          <div
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: companyColor ?? "var(--t-accent)" }}
          />
          <span className="font-mono text-[10px] t-muted">Session</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-sm t-warn-bg border t-border" />
          <span className="font-mono text-[10px] t-muted">Today</span>
        </div>
        <span className="font-mono text-[10px] t-faint ml-auto">
          {liveSessions.length} session{liveSessions.length !== 1 ? "s" : ""} this month
        </span>
      </div>

      {/* ── Day Sessions Modal ── */}
      {selectedDay && selectedSessions.length > 0 && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          onClick={() => setSelectedDay(null)}
        >
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

          <div
            className="relative z-10 t-card border t-border rounded-xl p-5 w-full max-w-lg max-h-[80vh] overflow-y-auto mx-4 t-shadow"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-bold t-text">
                  {format(new Date(selectedDay + "T00:00:00"), "MMMM d, yyyy")}
                </h3>
                <p className="font-mono text-[10px] t-faint mt-0.5">
                  {selectedSessions.length} session{selectedSessions.length !== 1 ? "s" : ""}
                </p>
              </div>
              <button
                onClick={() => setSelectedDay(null)}
                className="text-xs t-muted hover:t-text border t-border px-3 py-1.5 rounded-lg transition-colors"
              >
                Close
              </button>
            </div>

            <div className="space-y-3">
              {selectedSessions.map((s) => (
                <SessionCard
                  key={s.id}
                  session={s}
                  companyColor={companyColor}
                  onDelete={(id) => {
                    setDeletedIds((prev) => new Set(prev).add(id));
                    // Close modal if this was the last session for the day
                    const remaining = selectedSessions.filter((ss) => ss.id !== id);
                    if (remaining.length === 0) setSelectedDay(null);
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
