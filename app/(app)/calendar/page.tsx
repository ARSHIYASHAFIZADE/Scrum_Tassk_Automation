"use client";

import { useEffect, useState, useRef } from "react";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { createClient } from "@/lib/supabase/client";
import { useApp } from "@/context/AppContext";
import CalendarGrid from "@/components/CalendarGrid";
import type { SessionSummary } from "@/components/CalendarGrid";

export default function CalendarPage() {
  const supabaseRef = useRef(createClient());
  const supabase = supabaseRef.current;
  const { activeCompany, loading } = useApp();

  const [month, setMonth] = useState(() => format(new Date(), "yyyy-MM"));
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (loading || !activeCompany) {
      setSessions([]);
      setFetching(false);
      return;
    }

    let cancelled = false;
    setFetching(true);

    const monthStart = startOfMonth(new Date(month + "-01"));
    const monthEnd = endOfMonth(monthStart);

    supabase
      .from("scrum_sessions")
      .select("id, date, company_id, generated_document, transcript, audio_filename, audio_url, created_at")
      .eq("company_id", activeCompany.id)
      .gte("date", format(monthStart, "yyyy-MM-dd"))
      .lte("date", format(monthEnd, "yyyy-MM-dd"))
      .order("created_at")
      .then(({ data }) => {
        if (!cancelled) {
          // Filter out empty sessions (no transcript and no document)
          const valid = (data ?? []).filter(
            (s) => (s.transcript && s.transcript.trim() !== "") || s.generated_document
          );
          setSessions(valid);
          setFetching(false);
        }
      });

    return () => { cancelled = true; };
  }, [activeCompany, month, loading, supabase]);

  return (
    <div className="flex-1 px-6 py-6">
      {!loading && !activeCompany ? (
        <div className="text-center py-16">
          <p className="text-sm t-muted">Select a company to view its calendar.</p>
        </div>
      ) : fetching ? (
        <div className="text-center py-16">
          <p className="text-sm t-faint">Loading sessions...</p>
        </div>
      ) : (
        <CalendarGrid
          sessions={sessions}
          month={month}
          companyId={activeCompany?.id}
          companyColor={activeCompany?.color}
          onMonthChange={setMonth}
        />
      )}
    </div>
  );
}
