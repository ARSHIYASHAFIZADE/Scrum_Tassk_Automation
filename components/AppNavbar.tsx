"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import CompanySelector from "@/components/CompanySelector";
import GuidePanel from "@/components/GuidePanel";
import ThemeSwitcher from "@/components/ThemeSwitcher";
import type { User } from "@supabase/supabase-js";

const NAV_LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/calendar",  label: "Calendar"  },
  { href: "/settings",  label: "Settings"  },
];

export default function AppNavbar({ user }: { user: User }) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-40 h-14 t-card border-b t-border backdrop-blur-sm">
      <div className="h-full max-w-7xl mx-auto px-4 flex items-center gap-4">
        {/* Brand */}
        <Link
          href="/dashboard"
          className="text-sm font-bold t-text hover:t-accent-text transition-colors shrink-0 tracking-tight"
        >
          Ashxcribe
        </Link>

        <div className="w-px h-5 t-border border-l shrink-0" />

        {/* Company Selector */}
        <CompanySelector />

        {/* Nav Links */}
        <nav className="hidden md:flex items-center gap-1 ml-1">
          {NAV_LINKS.map((link) => {
            const active = pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`text-xs px-3 py-1.5 rounded-lg transition-colors
                  ${active
                    ? "t-accent font-medium"
                    : "t-muted hover:t-text hover:t-hover"
                  }`}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex-1" />

        {/* Right side */}
        <div className="flex items-center gap-2">
          <span className="hidden sm:block font-mono text-[10px] t-faint max-w-[120px] truncate">
            {user.email}
          </span>

          <ThemeSwitcher />
          <GuidePanel />

          <button
            onClick={handleLogout}
            className="text-xs t-muted hover:t-text border t-border hover:t-accent-border
                       px-3 py-1.5 rounded-lg transition-colors"
          >
            Logout
          </button>
        </div>
      </div>
    </header>
  );
}
