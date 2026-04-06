import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generatePDF, generateDOCX } from "@/lib/export";

const ALLOWED_FORMATS = ["pdf", "docx", "audio"] as const;
type ExportFormat = typeof ALLOWED_FORMATS[number];

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { sessionId, format } = await req.json();

    if (!ALLOWED_FORMATS.includes(format as ExportFormat)) {
      return NextResponse.json({ error: "Invalid format" }, { status: 400 });
    }

    const { data: session } = await supabase
      .from("scrum_sessions")
      .select("*, companies(name)")
      .eq("id", sessionId)
      .eq("user_id", user.id)
      .single();

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    const companyName = (session.companies as { name: string } | null)?.name ?? undefined;
    const safeDate = String(session.date).replace(/[^0-9-]/g, "");

    if (format === "audio") {
      if (session.audio_filename) {
        const { data } = await supabase.storage
          .from("audio")
          .createSignedUrl(session.audio_filename, 300);
        return NextResponse.json({ url: data?.signedUrl }, {
          headers: { "Cache-Control": "no-store" },
        });
      }
      if (session.audio_url) {
        return NextResponse.json({ url: session.audio_url }, {
          headers: { "Cache-Control": "no-store" },
        });
      }
      return NextResponse.json({ error: "No audio file for this session" }, { status: 404 });
    }

    const content = session.generated_document ?? session.transcript ?? "No content available.";

    if (format === "pdf") {
      const buffer = await generatePDF(content, session.date, companyName);
      return new Response(buffer.buffer as ArrayBuffer, {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="scrum-${safeDate}.pdf"`,
        },
      });
    }

    if (format === "docx") {
      const buffer = await generateDOCX(content, session.date, companyName);
      return new Response(buffer.buffer as ArrayBuffer, {
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "Content-Disposition": `attachment; filename="scrum-${safeDate}.docx"`,
        },
      });
    }

    return NextResponse.json({ error: "Unknown format" }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
