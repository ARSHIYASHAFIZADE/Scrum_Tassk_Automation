import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generatePDF, generateDOCX } from "@/lib/export";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { sessionId, format } = await req.json();

  const { data: session } = await supabase
    .from("scrum_sessions")
    .select("*, companies(name)")
    .eq("id", sessionId)
    .eq("user_id", user.id)
    .single();

  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  const companyName =
    (session.companies as { name: string } | null)?.name ?? undefined;

  if (format === "audio") {
    if (!session.audio_filename) {
      return NextResponse.json({ error: "No audio file for this session" }, { status: 404 });
    }
    const { data } = await supabase.storage
      .from("audio")
      .createSignedUrl(session.audio_filename, 300); // 5 min download link
    return NextResponse.json({ url: data?.signedUrl });
  }

  const content =
    session.generated_document ?? session.transcript ?? "No content available.";

  if (format === "pdf") {
    const buffer = await generatePDF(content, session.date, companyName);
    return new Response(buffer.buffer as ArrayBuffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="scrum-${session.date}.pdf"`,
      },
    });
  }

  if (format === "docx") {
    const buffer = await generateDOCX(content, session.date, companyName);
    return new Response(buffer.buffer as ArrayBuffer, {
      headers: {
        "Content-Type":
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "Content-Disposition": `attachment; filename="scrum-${session.date}.docx"`,
      },
    });
  }

  return NextResponse.json({ error: "Unknown format" }, { status: 400 });
}
