"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Theme = "obsidian" | "paper" | "cream" | "midnight" | "dusk" | "sage";

export const THEMES: { id: Theme; label: string; preview: string }[] = [
  { id: "obsidian",  label: "Obsidian",  preview: "#171614" },
  { id: "midnight",  label: "Midnight",  preview: "#0d0f14" },
  { id: "dusk",      label: "Dusk",      preview: "#1a1014" },
  { id: "paper",     label: "Paper",     preview: "#f7f4ef" },
  { id: "cream",     label: "Cream",     preview: "#fef7e4" },
  { id: "sage",      label: "Sage",      preview: "#f0f4ef" },
];

interface ThemeContextType {
  theme: Theme;
  setTheme: (t: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | null>(null);
const STORAGE_KEY = "ashxcribe-theme";

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("sage");

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as Theme | null;
    if (saved && THEMES.find((t) => t.id === saved)) {
      setThemeState(saved);
      document.documentElement.setAttribute("data-theme", saved);
    }
  }, []);

  function setTheme(t: Theme) {
    setThemeState(t);
    localStorage.setItem(STORAGE_KEY, t);
    document.documentElement.setAttribute("data-theme", t);
  }

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}
