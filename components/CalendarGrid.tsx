"use client";

import { useRouter } from "next/navigation";
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  getDay, isToday, isSameMonth, addMonths, subMonths,
} from "date-fns";
import { useApp } from "@/context/AppContext";

interface SessionSummary {
  id: string;
  date: string;
  company_id: string;
  generated_document: string | null;
}

interface CalendarGridProps {
  sessions: SessionSummary[];
  month: string;
}

const DOW_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export default function CalendarGrid({ sessions, month }: CalendarGridProps) {
  const router = useRouter();
  const { activeCompany } = useApp();

  const monthDate = new Date(month + "-01");
  const days = eachDayOfInterval({
    start: startOfMonth(monthDate),
    end: endOfMonth(monthDate),
  });
  const firstDow = (getDay(days[0]) + 6) % 7;

  const sessionMap = new Map<string, SessionSummary>();
  for (const s of sessions) sessionMap.set(s.date, s);

  function navigate(dir: 1 | -1) {
    const next = dir === 1 ? addMonths(monthDate, 1) : subMonths(monthDate, 1);
    const params = new URLSearchParams();
    params.set("month", format(next, "yyyy-MM"));
    if (activeCompany) params.set("company", activeCompany.id);
    router.push(`/calendar?${params.toString()}`);
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
          const session = sessionMap.get(dateStr);
          const today   = isToday(day);
          const isLast  = idx === days.length - 1;

          return (
            <div
              key={dateStr}
              onClick={() => session && router.push(`/session/${session.id}`)}
              className={`min-h-[72px] p-2 border-b border-r t-border transition-colors
                ${session ? "cursor-pointer hover:t-hover" : ""}
                ${today ? "t-warn-bg" : ""}
                ${isLast ? "border-b-0" : ""}
              `}
            >
              <span
                className="font-mono text-xs block mb-1"
                style={{ color: today ? "var(--t-warning)" : "var(--t-faint)" }}
              >
                {format(day, "d")}
              </span>
              {session && (
                <div className="flex flex-col gap-1">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: activeCompany?.color ?? "var(--t-accent)" }}
                  />
                  {session.generated_document && (
                    <span className="font-mono text-[9px] t-success">✓ doc</span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-5 mt-4">
        <div className="flex items-center gap-2">
          <div
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: activeCompany?.color ?? "var(--t-accent)" }}
          />
          <span className="font-mono text-[10px] t-muted">Session</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-sm t-warn-bg border t-border" />
          <span className="font-mono text-[10px] t-muted">Today</span>
        </div>
        <span className="font-mono text-[10px] t-faint ml-auto">
          {sessions.length} session{sessions.length !== 1 ? "s" : ""} this month
        </span>
      </div>
    </div>
  );
}
