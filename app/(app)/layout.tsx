export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppProvider } from "@/context/AppContext";
import AppSidebar from "@/components/AppSidebar";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  return (
    <AppProvider>
      <div className="flex h-screen overflow-hidden t-bg">
        <AppSidebar user={user} />
        <main className="ml-[220px] flex-1 h-screen overflow-y-auto flex flex-col">
          {children}
        </main>
      </div>
    </AppProvider>
  );
}
