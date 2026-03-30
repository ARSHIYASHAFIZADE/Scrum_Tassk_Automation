import { redirect } from "next/navigation";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import CalendarGrid from "@/components/CalendarGrid";

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; company?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const params = await searchParams;
  const monthParam = params.month ?? format(new Date(), "yyyy-MM");
  const companyId = params.company;

  let monthStart: Date;
  try {
    monthStart = startOfMonth(new Date(monthParam + "-01"));
  } catch {
    monthStart = startOfMonth(new Date());
  }
  const monthEnd = endOfMonth(monthStart);

  let query = supabase
    .from("scrum_sessions")
    .select("id, date, company_id, generated_document")
    .eq("user_id", user.id)
    .gte("date", format(monthStart, "yyyy-MM-dd"))
    .lte("date", format(monthEnd, "yyyy-MM-dd"))
    .order("date");

  if (companyId) {
    query = query.eq("company_id", companyId);
  }

  const { data: sessions } = await query;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <CalendarGrid sessions={sessions ?? []} month={monthParam} />
    </div>
  );
}
