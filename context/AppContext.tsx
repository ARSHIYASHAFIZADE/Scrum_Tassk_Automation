"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useCallback,
  useRef,
  type ReactNode,
} from "react";
import { createClient } from "@/lib/supabase/client";
import type { Company, Template, AppContextType } from "@/lib/types";

const ACTIVE_COMPANY_KEY = "ashxcribe-active-company";

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const supabaseRef = useRef(createClient());
  const supabase = supabaseRef.current;
  const [companies, setCompanies] = useState<Company[]>([]);
  const [activeCompany, setActiveCompany] = useState<Company | null>(null);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const fetchedRef = useRef(false);

  const refreshCompanies = useCallback(async () => {
    const { data } = await supabase
      .from("companies")
      .select("*")
      .order("created_at");
    if (data) {
      setCompanies(data);
      setActiveCompany((prev) => {
        if (prev) return prev;
        const savedId = localStorage.getItem(ACTIVE_COMPANY_KEY);
        if (savedId) {
          const saved = data.find((c) => c.id === savedId);
          if (saved) return saved;
        }
        return data.length > 0 ? data[0] : null;
      });
    }
    setLoading(false);
  }, [supabase]);

  const handleSetActiveCompany = useCallback((company: Company) => {
    setActiveCompany(company);
    localStorage.setItem(ACTIVE_COMPANY_KEY, company.id);
  }, []);

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
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    refreshCompanies();
  }, [refreshCompanies]);

  // Memoize context value to prevent unnecessary re-renders of consumers
  const value = useMemo<AppContextType>(
    () => ({
      companies,
      activeCompany,
      setActiveCompany: handleSetActiveCompany,
      templates,
      refreshCompanies,
      loading,
    }),
    [companies, activeCompany, handleSetActiveCompany, templates, refreshCompanies, loading]
  );

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
