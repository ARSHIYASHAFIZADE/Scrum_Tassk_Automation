import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppProvider } from "@/context/AppContext";
import { SidebarProvider } from "@/context/SidebarContext";
import AppSidebar from "@/components/AppSidebar";
import SidebarMain from "@/components/SidebarMain";

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
      <SidebarProvider>
        <div className="flex h-screen overflow-hidden t-bg">
          <AppSidebar user={user} />
          <SidebarMain>{children}</SidebarMain>
        </div>
      </SidebarProvider>
    </AppProvider>
  );
}
