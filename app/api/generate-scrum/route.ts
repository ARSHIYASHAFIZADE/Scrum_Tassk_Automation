import { NextRequest, NextResponse } from "next/server";
import Groq from "groq-sdk";
import { createClient } from "@/lib/supabase/server";

const MAX_TRANSCRIPT_LENGTH = 50_000;

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { transcript, templateId, companyId, date, sessionId } = await req.json();

    if (!transcript?.trim()) {
      return NextResponse.json({ error: "Transcript is required" }, { status: 400 });
    }
    if (transcript.length > MAX_TRANSCRIPT_LENGTH) {
      return NextResponse.json({ error: "Transcript is too long" }, { status: 400 });
    }

    const { data: template } = await supabase
      .from("templates")
      .select("content, name")
      .eq("id", templateId)
      .eq("user_id", user.id)
      .single();

    if (!template) {
      return NextResponse.json({ error: "Template not found" }, { status: 404 });
    }

    const { data: company } = await supabase
      .from("companies")
      .select("name")
      .eq("id", companyId)
      .eq("user_id", user.id)
      .single();

    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

    const systemPrompt = `You are a professional SCRUM document assistant. Given a speech transcript from a developer's daily standup meeting and a SCRUM template, fill ALL placeholder fields shown in [square brackets] with relevant content extracted from the transcript.

Rules:
- Use date "${date}" for the Date field
- Use "${company?.name ?? "Unknown Company"}" for the Project/Company field
- If information for a field is not mentioned in the transcript, use "[Not mentioned]" as the value
- Preserve all template formatting, emojis, and structure exactly
- Do NOT add explanations or commentary — return ONLY the filled template text
- For the "AI-Generated Insights" section, create a comprehensive summary from the transcript`;

    const chat = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      temperature: 0.2,
      max_tokens: 2048,
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: `TEMPLATE:\n${template.content}\n\nTRANSCRIPT:\n${transcript}`,
        },
      ],
    });

    const document = chat.choices[0].message.content ?? "";

    if (sessionId) {
      await supabase
        .from("scrum_sessions")
        .update({ generated_document: document })
        .eq("id", sessionId)
        .eq("user_id", user.id);
    }

    return NextResponse.json({ document }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
