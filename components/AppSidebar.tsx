"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import CompanySelector from "@/components/CompanySelector";
import GuidePanel from "@/components/GuidePanel";
import ThemeSwitcher from "@/components/ThemeSwitcher";
import { useApp } from "@/context/AppContext";
import type { User } from "@supabase/supabase-js";

const NAV_LINKS = [
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
        <rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
      </svg>
    ),
  },
  {
    href: "/calendar",
    label: "Calendar",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    ),
  },
  {
    href: "/settings",
    label: "Settings",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    ),
  },
];

export default function AppSidebar({ user }: { user: User }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const { companies } = useApp();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="fixed left-0 top-0 h-screen w-[220px] t-card border-r t-border flex flex-col z-40 select-none">

      {/* Brand */}
      <div className="px-5 pt-5 pb-4 border-b t-border">
        <Link href="/dashboard" className="block">
          <span className="text-base font-bold t-text tracking-tight">Ashxcribe</span>
          <span className="block font-mono text-[10px] t-faint mt-0.5">SCRUM Platform</span>
        </Link>
      </div>

      {/* Company selector */}
      <div className="px-4 py-3 border-b t-border">
        <p className="font-mono text-[9px] t-faint uppercase tracking-widest mb-2">Workspace</p>
        <CompanySelector />
        {companies.length === 0 && (
          <Link href="/settings" className="block font-mono text-[10px] t-accent-text mt-2 hover:underline">
            + Add company
          </Link>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
        <p className="font-mono text-[9px] t-faint uppercase tracking-widest px-2 pb-2">Menu</p>
        {NAV_LINKS.map((link) => {
          const active = pathname.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors w-full
                ${active
                  ? "t-accent font-medium"
                  : "t-muted hover:t-text hover:t-hover"
                }`}
            >
              <span className="shrink-0 opacity-80">{link.icon}</span>
              {link.label}
            </Link>
          );
        })}
      </nav>

      {/* Bottom section */}
      <div className="border-t t-border px-4 py-4 space-y-3">
        <div className="flex items-center gap-2">
          <ThemeSwitcher />
          <GuidePanel />
        </div>

        <div className="flex items-center justify-between">
          <span className="font-mono text-[10px] t-faint truncate max-w-[120px]">
            {user.email}
          </span>
          <button
            onClick={handleLogout}
            className="font-mono text-[10px] t-muted hover:t-error transition-colors"
          >
            Logout
          </button>
        </div>
      </div>
    </aside>
  );
}
