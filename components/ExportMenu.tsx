"use client";

import { useState } from "react";

type ExportFormat = "pdf" | "docx" | "audio";

const FORMATS: { key: ExportFormat; label: string; icon: string }[] = [
  { key: "pdf",   label: "PDF",   icon: "↓" },
  { key: "docx",  label: "DOCX",  icon: "↓" },
  { key: "audio", label: "Audio", icon: "↓" },
];

export default function ExportMenu({
  sessionId,
  hasAudio,
  hasDocument,
}: {
  sessionId: string;
  hasAudio: boolean;
  hasDocument: boolean;
}) {
  const [loading, setLoading] = useState<ExportFormat | null>(null);
  const [error, setError] = useState("");

  async function exportAs(format: ExportFormat) {
    setLoading(format);
    setError("");
    try {
      const res = await fetch("/api/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, format }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "Export failed");
      }

      if (format === "audio") {
        const { url } = await res.json();
        const a = document.createElement("a");
        a.href = url; a.target = "_blank";
        a.download = "standup-audio.webm";
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
      } else {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url; a.download = `scrum.${format}`;
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Export failed");
    }
    setLoading(null);
  }

  return (
    <div>
      {error && <p className="text-xs t-error mb-3">{error}</p>}
      <div className="flex flex-wrap gap-2">
        {FORMATS.map(({ key, label, icon }) => {
          const disabled =
            (key === "audio" && !hasAudio) ||
            ((key === "pdf" || key === "docx") && !hasDocument);

          return (
            <button
              key={key}
              onClick={() => exportAs(key)}
              disabled={disabled || loading !== null}
              className="text-sm t-muted hover:t-text border t-border hover:t-accent-border
                         px-4 py-2 rounded-lg transition-colors disabled:opacity-30
                         disabled:cursor-not-allowed"
              title={disabled ? `No ${label.toLowerCase()} available` : `Download as ${label}`}
            >
              {loading === key ? "..." : `${icon} ${label}`}
            </button>
          );
        })}
      </div>
    </div>
  );
}
