"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { createClient } from "@/lib/supabase/client";
import type { Company, Template, AppContextType } from "@/lib/types";

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const supabase = createClient();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [activeCompany, setActiveCompany] = useState<Company | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);

  const refreshCompanies = useCallback(async () => {
    const { data } = await supabase
      .from("companies")
      .select("*")
      .order("created_at");
    if (data) {
      setCompanies(data);
      setActiveCompany((prev) => {
        if (prev) return prev;
        return data.length > 0 ? data[0] : null;
      });
    }
  }, [supabase]);

  useEffect(() => {
    if (!activeCompany) return;
    supabase
      .from("templates")
      .select("*")
      .eq("company_id", activeCompany.id)
      .order("created_at")
      .then(({ data }) => {
        if (data) setTemplates(data);
      });
  }, [activeCompany, supabase]);

  useEffect(() => {
    refreshCompanies();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <AppContext.Provider
      value={{
        companies,
        activeCompany,
        setActiveCompany,
        templates,
        refreshCompanies,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
