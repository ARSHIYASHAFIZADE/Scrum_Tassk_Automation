"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useApp } from "@/context/AppContext";

const DEFAULT_TEMPLATE = `🛠 Daily Scrum Task Template
Date: [YYYY-MM-DD]

Project/Company: [Company Name]

Sprint Week: [Week Number]

1. Summary of Progress (Yesterday)
   Accomplishments: * [Key achievement 1]
   [Key achievement 2]
   PRs/Commits Merged: [Link or ID]
   Status: ✅ Completed / ⚠️ In Progress

2. Today's Objectives (Focus)
   Primary Task: [High Priority Task Name]
   Sub-task A: [Specific action]
   Sub-task B: [Specific action]
   Secondary Task: [Medium Priority Task Name]
   Estimated Completion: [Time/End of Day]

3. Blockers & Impediments
   Technical Blockers: [e.g., API downtime, environment issues]
   Dependencies: [Waiting on X person / Y department]
   Risk Level: 🟢 Low / 🟡 Medium / 🔴 High

4. AI-Generated Insights (From Audio)
   This section is auto-populated by the transcription tool.
   Key Discussion Points: [Automatic summary of audio]
   Decisions Made: [Summary of choices made during the call]
   Action Items: [Specific tasks identified by AI]

5. Resources & Documentation
   Audio Recording: [Link to Supabase Storage MP4/MP3]
   Reference Docs: [Links to Jira, GitHub, or internal Wiki]`;

const ACCENT_COLORS = [
  "#d97706", "#c2410c", "#b45309", "#15803d",
  "#0369a1", "#7c3aed", "#be185d", "#374151",
];

type Step = 1 | 2 | 3;

export default function OnboardingPage() {
  const supabase = createClient();
  const router = useRouter();
  const { refreshCompanies } = useApp();

  const [step, setStep] = useState<Step>(1);
  const [companyName, setCompanyName] = useState("");
  const [companyColor, setCompanyColor] = useState(ACCENT_COLORS[0]);
  const [templateContent, setTemplateContent] = useState(DEFAULT_TEMPLATE);
  const [createdCompanyId, setCreatedCompanyId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const inputCls = `w-full t-input border t-border t-text text-sm rounded-lg px-3 py-2.5
                    focus:outline-none focus:border-[var(--t-accent)] transition-colors
                    placeholder:text-[var(--t-faint)]`;

  async function handleCreateCompany(e: React.FormEvent) {
    e.preventDefault();
    if (!companyName.trim()) { setError("Company name is required"); return; }
    setLoading(true); setError("");
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }
    const { data, error: dbError } = await supabase
      .from("companies")
      .insert({ user_id: user.id, name: companyName.trim(), color: companyColor })
      .select().single();
    if (dbError) { setError(dbError.message); setLoading(false); return; }
    setCreatedCompanyId(data.id);
    setLoading(false); setStep(2);
  }

  async function handleSaveTemplate(e: React.FormEvent) {
    e.preventDefault();
    if (!templateContent.trim()) { setError("Template cannot be empty"); return; }
    setLoading(true); setError("");
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push("/login"); return; }
    const { error: dbError } = await supabase.from("templates").insert({
      company_id: createdCompanyId,
      user_id: user.id,
      name: "Daily Scrum",
      content: templateContent.trim(),
      is_default: true,
    });
    if (dbError) { setError(dbError.message); setLoading(false); return; }
    setLoading(false); setStep(3);
  }

  async function handleFinish() {
    setLoading(true);
    await supabase.auth.updateUser({ data: { onboarding_complete: true } });
    await refreshCompanies();
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="min-h-[calc(100vh-56px)] t-bg flex items-start justify-center px-4 py-12">
      <div className="w-full max-w-2xl">
        {/* Progress bar */}
        <div className="flex items-center gap-1.5 mb-8">
          {([1, 2, 3] as Step[]).map((s) => (
            <div
              key={s}
              className="h-1 flex-1 rounded-full transition-colors duration-300"
              style={{ backgroundColor: step >= s ? "var(--t-accent)" : "var(--t-border)" }}
            />
          ))}
        </div>

        <div className="t-card border t-border rounded-2xl p-8 t-shadow">

          {/* Step 1: Company */}
          {step === 1 && (
            <div>
              <p className="font-mono text-xs t-faint mb-1 uppercase tracking-wide">Step 1 of 3</p>
              <h2 className="text-xl font-bold t-text mb-1">Create your company profile</h2>
              <p className="text-sm t-muted mb-6">
                You can create multiple companies — each gets its own calendar, templates, and sessions.
              </p>

              <form onSubmit={handleCreateCompany} className="space-y-5">
                <div>
                  <label className="block text-xs font-medium t-muted mb-1.5">Company / Project name</label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    required
                    className={inputCls}
                    placeholder="e.g. Coolriots"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium t-muted mb-2">Accent color</label>
                  <div className="flex gap-2 flex-wrap">
                    {ACCENT_COLORS.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setCompanyColor(color)}
                        className={`w-7 h-7 rounded-full transition-all ${
                          companyColor === color
                            ? "ring-2 ring-offset-2 ring-[var(--t-accent)]"
                            : "opacity-60 hover:opacity-100"
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                    <input
                      type="color"
                      value={companyColor}
                      onChange={(e) => setCompanyColor(e.target.value)}
                      className="w-7 h-7 rounded-full t-input border t-border cursor-pointer p-0"
                      title="Custom color"
                    />
                  </div>
                </div>

                {/* Preview */}
                <div
                  className="border-l-[3px] pl-3 py-1 t-input rounded-r-lg"
                  style={{ borderLeftColor: companyColor }}
                >
                  <p className="text-sm t-muted">
                    Preview:{" "}
                    <span className="font-semibold" style={{ color: companyColor }}>
                      {companyName || "Your Company"}
                    </span>
                  </p>
                </div>

                {error && <p className="text-xs t-error">{error}</p>}

                <button
                  type="submit"
                  disabled={loading}
                  className="text-sm font-semibold t-accent px-6 py-2.5 rounded-lg
                             hover:opacity-90 disabled:opacity-40 transition-all"
                >
                  {loading ? "Saving..." : "Continue →"}
                </button>
              </form>
            </div>
          )}

          {/* Step 2: Template */}
          {step === 2 && (
            <div>
              <p className="font-mono text-xs t-faint mb-1 uppercase tracking-wide">Step 2 of 3</p>
              <h2 className="text-xl font-bold t-text mb-1">Set up your SCRUM template</h2>
              <p className="text-sm t-muted mb-6">
                The AI will fill this template from your transcript. You can edit it anytime in Settings.
              </p>

              <form onSubmit={handleSaveTemplate} className="space-y-4">
                <textarea
                  value={templateContent}
                  onChange={(e) => setTemplateContent(e.target.value)}
                  rows={18}
                  className={`${inputCls} resize-none font-mono text-xs leading-relaxed`}
                />

                {error && <p className="text-xs t-error">{error}</p>}

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    className="text-sm t-muted border t-border px-5 py-2.5 rounded-lg hover:t-text transition-colors"
                  >
                    ← Back
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="text-sm font-semibold t-accent px-6 py-2.5 rounded-lg
                               hover:opacity-90 disabled:opacity-40 transition-all"
                  >
                    {loading ? "Saving..." : "Continue →"}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Step 3: Guide */}
          {step === 3 && (
            <div>
              <p className="font-mono text-xs t-faint mb-1 uppercase tracking-wide">Step 3 of 3</p>
              <h2 className="text-xl font-bold t-text mb-1">You&apos;re all set!</h2>
              <p className="text-sm t-muted mb-6">Here&apos;s how Ashxcribe works:</p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                {[
                  {
                    num: "01",
                    title: "Record",
                    desc: "Click the mic and speak your daily standup. Audio saves automatically.",
                  },
                  {
                    num: "02",
                    title: "Generate",
                    desc: "Click Generate — AI fills your SCRUM template from the transcript.",
                  },
                  {
                    num: "03",
                    title: "Export",
                    desc: "Download as PDF, DOCX, or re-download audio anytime from Calendar.",
                  },
                ].map((card) => (
                  <div key={card.num} className="t-input border t-border rounded-xl p-4">
                    <div className="font-mono text-xs t-faint mb-1">{card.num}</div>
                    <div className="text-sm font-semibold t-accent-text mb-2">{card.title}</div>
                    <p className="text-xs t-muted leading-relaxed">{card.desc}</p>
                  </div>
                ))}
              </div>

              <div className="t-warn-bg border border-[var(--t-warning)]/30 rounded-xl px-4 py-3 mb-6">
                <p className="text-sm t-warning">
                  <span className="font-semibold">Tip:</span> Use the <span className="t-text font-medium">?</span> button
                  in the navbar anytime to reopen this guide.
                </p>
              </div>

              <button
                onClick={handleFinish}
                disabled={loading}
                className="text-sm font-semibold t-accent px-8 py-3 rounded-lg
                           hover:opacity-90 disabled:opacity-40 transition-all"
              >
                {loading ? "Loading..." : "Go to Dashboard →"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
