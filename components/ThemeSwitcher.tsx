"use client";

import { useState, useRef, useEffect } from "react";
import { useTheme, THEMES } from "@/context/ThemeContext";

export default function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const current = THEMES.find((t) => t.id === theme)!;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((p) => !p)}
        title="Switch theme"
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border t-border t-card
                   hover:t-hover transition-colors"
      >
        <span
          className="w-3 h-3 rounded-full border border-white/20"
          style={{ backgroundColor: current.preview }}
        />
        <span className="font-mono text-[10px] t-muted uppercase tracking-widest hidden sm:block">
          {current.label}
        </span>
      </button>

      {open && (
        <div className="absolute left-0 bottom-full mb-2 z-50 t-card border t-border rounded-xl
                        t-shadow p-2 min-w-[140px]">
          <p className="font-mono text-[9px] t-faint uppercase tracking-widest px-2 pb-2">Theme</p>
          {THEMES.map((t) => (
            <button
              key={t.id}
              onClick={() => { setTheme(t.id); setOpen(false); }}
              className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-left
                          transition-colors
                          ${theme === t.id ? "t-accent" : "t-text hover:t-hover"}`}
            >
              <span
                className="w-3 h-3 rounded-full border border-white/20 shrink-0"
                style={{ backgroundColor: t.preview }}
              />
              <span className="font-mono text-xs">{t.label}</span>
              {theme === t.id && (
                <span className="ml-auto font-mono text-[9px] opacity-70">✓</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
