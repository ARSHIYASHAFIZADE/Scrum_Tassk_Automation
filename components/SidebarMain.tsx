"use client";

import { useSidebar } from "@/context/SidebarContext";

export default function SidebarMain({ children }: { children: React.ReactNode }) {
  const { collapsed } = useSidebar();

  return (
    <main
      className="flex-1 h-screen overflow-y-auto flex flex-col transition-[margin] duration-200"
      style={{ marginLeft: collapsed ? 64 : 220 }}
    >
      {children}
    </main>
  );
}
