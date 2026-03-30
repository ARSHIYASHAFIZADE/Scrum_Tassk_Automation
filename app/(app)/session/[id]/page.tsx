import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AudioPlayer from "@/components/AudioPlayer";
import ExportMenu from "@/components/ExportMenu";
import Link from "next/link";

export default async function SessionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { id } = await params;

  const { data: session } = await supabase
    .from("scrum_sessions")
    .select("*, companies(name, color)")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (!session) notFound();

  const company = session.companies as { name: string; color: string } | null;

  let audioUrl: string | null = session.audio_url;
  if (session.audio_filename) {
    const { data } = await supabase.storage
      .from("audio")
      .createSignedUrl(session.audio_filename, 3600);
    if (data?.signedUrl) audioUrl = data.signedUrl;
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-3">
          <Link
            href="/calendar"
            className="text-xs t-muted hover:t-accent-text transition-colors"
          >
            ← Calendar
          </Link>
          <span className="t-faint text-xs">/</span>
          <span className="text-xs t-faint">Session</span>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-xl font-bold t-text">{session.date}</h1>
          {company && (
            <span
              className="text-xs font-medium px-2 py-0.5 rounded-full"
              style={{ backgroundColor: company.color + "22", color: company.color }}
            >
              {company.name}
            </span>
          )}
        </div>
      </div>

      <div className="h-px t-border border-t mb-6" />

      <div className="space-y-6">
        {/* Audio player */}
        {audioUrl && (
          <div>
            <p className="text-xs font-medium t-muted mb-2 uppercase tracking-wide">
              Recording
            </p>
            <AudioPlayer src={audioUrl} />
          </div>
        )}

        {/* Document */}
        <div>
          <p className="text-xs font-medium t-muted mb-2 uppercase tracking-wide">
            {session.generated_document ? "SCRUM Document" : "Transcript"}
          </p>
          <div className="t-card border t-border rounded-xl p-5">
            <pre className="font-mono text-sm t-text leading-relaxed whitespace-pre-wrap overflow-x-auto">
              {session.generated_document ?? session.transcript ?? "No content available."}
            </pre>
          </div>
        </div>

        {/* Raw transcript (if different from doc) */}
        {session.generated_document && session.transcript && (
          <details className="group">
            <summary className="text-xs t-muted hover:t-text cursor-pointer transition-colors select-none">
              Raw transcript ▾
            </summary>
            <div className="t-input border t-border rounded-xl p-4 mt-2">
              <pre className="font-mono text-xs t-muted leading-relaxed whitespace-pre-wrap overflow-x-auto">
                {session.transcript}
              </pre>
            </div>
          </details>
        )}

        <div className="h-px t-border border-t" />

        {/* Export */}
        <div>
          <p className="text-xs font-medium t-muted mb-3 uppercase tracking-wide">Export</p>
          <ExportMenu
            sessionId={session.id}
            hasAudio={!!session.audio_filename}
            hasDocument={!!(session.generated_document ?? session.transcript)}
          />
        </div>
      </div>
    </div>
  );
}
