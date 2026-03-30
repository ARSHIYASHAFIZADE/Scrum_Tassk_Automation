"use client";

import { useApp } from "@/context/AppContext";

export default function CompanySelector() {
  const { companies, activeCompany, setActiveCompany } = useApp();

  if (companies.length === 0) return null;

  return (
    <div className="relative">
      <select
        value={activeCompany?.id ?? ""}
        onChange={(e) => {
          const company = companies.find((c) => c.id === e.target.value);
          if (company) setActiveCompany(company);
        }}
        className="t-input border t-border t-text text-xs rounded-lg
                   pl-3 pr-7 py-1.5 appearance-none cursor-pointer
                   focus:outline-none focus:t-accent-border max-w-[160px] truncate"
        style={{
          borderLeftColor: activeCompany?.color ?? "var(--t-accent)",
          borderLeftWidth: 3,
        }}
      >
        {companies.map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </select>
      <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 t-faint text-[9px]">
        ▾
      </span>
    </div>
  );
}
