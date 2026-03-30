"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { useApp } from "@/context/AppContext";
import type { Company, Template } from "@/lib/types";

const ACCENT_COLORS = [
  "#d97706", "#c2410c", "#b45309", "#15803d",
  "#0369a1", "#7c3aed", "#be185d", "#374151",
];

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

export default function SettingsPage() {
  const supabase = createClient();
  const { companies, activeCompany, setActiveCompany, templates, refreshCompanies } = useApp();

  const [newCompanyName, setNewCompanyName] = useState("");
  const [newCompanyColor, setNewCompanyColor] = useState(ACCENT_COLORS[0]);
  const [companyLoading, setCompanyLoading] = useState(false);
  const [companyError, setCompanyError] = useState("");
  const [companySuccess, setCompanySuccess] = useState("");
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("");

  const [newTemplateName, setNewTemplateName] = useState("Daily Scrum");
  const [newTemplateContent, setNewTemplateContent] = useState(DEFAULT_TEMPLATE);
  const [templateLoading, setTemplateLoading] = useState(false);
  const [templateError, setTemplateError] = useState("");
  const [templateSuccess, setTemplateSuccess] = useState("");
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);

  const [confirmDelete, setConfirmDelete] = useState<{ type: "company" | "template"; id: string } | null>(null);

  useEffect(() => {
    if (editingCompany) {
      setEditName(editingCompany.name);
      setEditColor(editingCompany.color);
    }
  }, [editingCompany]);

  async function handleAddCompany(e: React.FormEvent) {
    e.preventDefault();
    if (!newCompanyName.trim()) return;
    setCompanyLoading(true);
    setCompanyError("");
    setCompanySuccess("");
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from("companies").insert({
      user_id: user.id,
      name: newCompanyName.trim(),
      color: newCompanyColor,
    });
    if (error) { setCompanyError(error.message); }
    else {
      setCompanySuccess("Company created.");
      setNewCompanyName("");
      await refreshCompanies();
    }
    setCompanyLoading(false);
  }

  async function handleUpdateCompany(e: React.FormEvent) {
    e.preventDefault();
    if (!editingCompany || !editName.trim()) return;
    setCompanyLoading(true);
    const { error } = await supabase
      .from("companies")
      .update({ name: editName.trim(), color: editColor })
      .eq("id", editingCompany.id);
    if (error) { setCompanyError(error.message); }
    else { setEditingCompany(null); await refreshCompanies(); }
    setCompanyLoading(false);
  }

  async function handleDeleteCompany(id: string) {
    await supabase.from("companies").delete().eq("id", id);
    setConfirmDelete(null);
    await refreshCompanies();
  }

  async function handleAddTemplate(e: React.FormEvent) {
    e.preventDefault();
    if (!newTemplateContent.trim() || !activeCompany) return;
    setTemplateLoading(true);
    setTemplateError("");
    setTemplateSuccess("");
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from("templates").insert({
      company_id: activeCompany.id,
      user_id: user.id,
      name: newTemplateName.trim() || "Daily Scrum",
      content: newTemplateContent.trim(),
      is_default: templates.length === 0,
    });
    if (error) { setTemplateError(error.message); }
    else {
      setTemplateSuccess("Template saved.");
      setNewTemplateName("Daily Scrum");
      setNewTemplateContent(DEFAULT_TEMPLATE);
      if (activeCompany) setActiveCompany({ ...activeCompany });
    }
    setTemplateLoading(false);
  }

  async function handleUpdateTemplate(e: React.FormEvent) {
    e.preventDefault();
    if (!editingTemplate) return;
    setTemplateLoading(true);
    const { error } = await supabase
      .from("templates")
      .update({ name: editingTemplate.name, content: editingTemplate.content })
      .eq("id", editingTemplate.id);
    if (error) { setTemplateError(error.message); }
    else {
      setEditingTemplate(null);
      if (activeCompany) setActiveCompany({ ...activeCompany });
    }
    setTemplateLoading(false);
  }

  async function handleSetDefault(templateId: string) {
    if (!activeCompany) return;
    await supabase.from("templates").update({ is_default: false }).eq("company_id", activeCompany.id);
    await supabase.from("templates").update({ is_default: true }).eq("id", templateId);
    if (activeCompany) setActiveCompany({ ...activeCompany });
  }

  async function handleDeleteTemplate(id: string) {
    await supabase.from("templates").delete().eq("id", id);
    setConfirmDelete(null);
    if (activeCompany) setActiveCompany({ ...activeCompany });
  }

  const inputCls = `w-full t-input border t-border t-text text-sm rounded-lg px-3 py-2.5
                    focus:outline-none focus:border-[var(--t-accent)] transition-colors`;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
      <div>
        <h1 className="text-xl font-bold t-text">Settings</h1>
        <p className="text-sm t-muted mt-1">Manage your companies and SCRUM templates</p>
      </div>

      {/* ── Companies ── */}
      <section className="t-card border t-border rounded-2xl overflow-hidden t-shadow">
        <div className="px-6 py-4 border-b t-border">
          <h2 className="font-semibold t-text">Company Profiles</h2>
          <p className="text-xs t-muted mt-0.5">
            Each company has its own templates, sessions, and accent color.
            Switch between them using the navbar selector.
          </p>
        </div>

        {/* Existing companies */}
        {companies.length > 0 && (
          <div className="t-divide divide-y">
            {companies.map((company) => (
              <div key={company.id}>
                {editingCompany?.id === company.id ? (
                  <form onSubmit={handleUpdateCompany} className="px-6 py-4 flex flex-wrap gap-4 items-end">
                    <div className="flex-1 min-w-[160px]">
                      <label className="block text-xs t-muted mb-1.5">Name</label>
                      <input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className={inputCls}
                      />
                    </div>
                    <div>
                      <label className="block text-xs t-muted mb-1.5">Color</label>
                      <div className="flex gap-1.5">
                        {ACCENT_COLORS.map((c) => (
                          <button key={c} type="button" onClick={() => setEditColor(c)}
                            className={`w-6 h-6 rounded-full transition-all ${editColor === c ? "ring-2 ring-offset-2 ring-[var(--t-accent)]" : "opacity-60 hover:opacity-100"}`}
                            style={{ backgroundColor: c }} />
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button type="submit" disabled={companyLoading}
                        className="text-xs font-medium t-accent px-4 py-2 rounded-lg hover:opacity-90">
                        Save
                      </button>
                      <button type="button" onClick={() => setEditingCompany(null)}
                        className="text-xs t-muted border t-border px-4 py-2 rounded-lg hover:t-text">
                        Cancel
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="px-6 py-3.5 flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: company.color }} />
                    <span className="text-sm t-text flex-1 font-medium">{company.name}</span>
                    {activeCompany?.id === company.id && (
                      <span className="font-mono text-[10px] t-accent px-2 py-0.5 rounded-full">active</span>
                    )}
                    <div className="flex gap-1">
                      <button onClick={() => setEditingCompany(company)}
                        className="text-xs t-faint hover:t-text px-2 py-1 rounded transition-colors">
                        Edit
                      </button>
                      <button onClick={() => setConfirmDelete({ type: "company", id: company.id })}
                        className="text-xs t-faint hover:t-error px-2 py-1 rounded transition-colors">
                        Delete
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Add company form */}
        <form onSubmit={handleAddCompany} className="px-6 py-5 border-t t-border">
          <p className="text-xs font-medium t-muted mb-3 uppercase tracking-wide">Add company</p>
          <div className="flex flex-wrap gap-3 items-end">
            <div className="flex-1 min-w-[180px]">
              <input
                type="text"
                value={newCompanyName}
                onChange={(e) => setNewCompanyName(e.target.value)}
                placeholder="Company name"
                className={inputCls}
              />
            </div>
            <div>
              <div className="flex gap-1.5">
                {ACCENT_COLORS.map((c) => (
                  <button key={c} type="button" onClick={() => setNewCompanyColor(c)}
                    className={`w-6 h-6 rounded-full transition-all ${newCompanyColor === c ? "ring-2 ring-offset-2 ring-[var(--t-accent)]" : "opacity-50 hover:opacity-100"}`}
                    style={{ backgroundColor: c }} />
                ))}
              </div>
            </div>
            <button type="submit" disabled={companyLoading || !newCompanyName.trim()}
              className="text-sm font-medium t-accent px-4 py-2.5 rounded-lg hover:opacity-90 disabled:opacity-30 transition-all">
              {companyLoading ? "Adding..." : "Add"}
            </button>
          </div>
          {companyError && <p className="text-xs t-error mt-2">{companyError}</p>}
          {companySuccess && <p className="text-xs t-success mt-2">✓ {companySuccess}</p>}
        </form>
      </section>

      {/* ── Templates ── */}
      <section className="t-card border t-border rounded-2xl overflow-hidden t-shadow">
        <div className="px-6 py-4 border-b t-border">
          <h2 className="font-semibold t-text">Templates</h2>
          <p className="text-xs t-muted mt-0.5">
            For:{" "}
            <span className="t-accent-text font-medium">
              {activeCompany?.name ?? "select a company in the navbar"}
            </span>
          </p>
        </div>

        {!activeCompany && (
          <div className="px-6 py-4">
            <p className="text-sm t-warning">Select a company from the navbar to manage templates.</p>
          </div>
        )}

        {activeCompany && (
          <>
            {templates.length > 0 && (
              <div className="t-divide divide-y">
                {templates.map((template) => (
                  <div key={template.id}>
                    {editingTemplate?.id === template.id ? (
                      <form onSubmit={handleUpdateTemplate} className="p-6 space-y-3">
                        <input
                          value={editingTemplate.name}
                          onChange={(e) => setEditingTemplate({ ...editingTemplate, name: e.target.value })}
                          className={inputCls}
                        />
                        <textarea
                          value={editingTemplate.content}
                          onChange={(e) => setEditingTemplate({ ...editingTemplate, content: e.target.value })}
                          rows={15}
                          className={`${inputCls} resize-none font-mono text-xs leading-relaxed`}
                        />
                        <div className="flex gap-2">
                          <button type="submit" disabled={templateLoading}
                            className="text-sm font-medium t-accent px-4 py-2 rounded-lg hover:opacity-90">
                            Save
                          </button>
                          <button type="button" onClick={() => setEditingTemplate(null)}
                            className="text-sm t-muted border t-border px-4 py-2 rounded-lg hover:t-text">
                            Cancel
                          </button>
                        </div>
                      </form>
                    ) : (
                      <div className="px-6 py-4">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="text-sm font-medium t-text flex-1">{template.name}</span>
                          {template.is_default && (
                            <span className="font-mono text-[10px] t-accent px-2 py-0.5 rounded-full">default</span>
                          )}
                          <div className="flex gap-1">
                            {!template.is_default && (
                              <button onClick={() => handleSetDefault(template.id)}
                                className="text-xs t-faint hover:t-accent-text px-2 py-1 rounded transition-colors">
                                Set default
                              </button>
                            )}
                            <button onClick={() => setEditingTemplate(template)}
                              className="text-xs t-faint hover:t-text px-2 py-1 rounded transition-colors">
                              Edit
                            </button>
                            <button onClick={() => setConfirmDelete({ type: "template", id: template.id })}
                              className="text-xs t-faint hover:t-error px-2 py-1 rounded transition-colors">
                              Delete
                            </button>
                          </div>
                        </div>
                        <pre className="font-mono text-[10px] t-faint whitespace-pre-wrap leading-relaxed line-clamp-3 overflow-hidden">
                          {template.content.slice(0, 150)}...
                        </pre>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Add template */}
            <form onSubmit={handleAddTemplate} className="px-6 py-5 border-t t-border space-y-4">
              <p className="text-xs font-medium t-muted uppercase tracking-wide">Add template</p>
              <div>
                <label className="block text-xs t-muted mb-1.5">Template name</label>
                <input
                  type="text"
                  value={newTemplateName}
                  onChange={(e) => setNewTemplateName(e.target.value)}
                  className={inputCls}
                />
              </div>
              <div>
                <label className="block text-xs t-muted mb-1.5">Content</label>
                <textarea
                  value={newTemplateContent}
                  onChange={(e) => setNewTemplateContent(e.target.value)}
                  rows={16}
                  className={`${inputCls} resize-none font-mono text-xs leading-relaxed`}
                />
              </div>
              {templateError && <p className="text-xs t-error">{templateError}</p>}
              {templateSuccess && <p className="text-xs t-success">✓ {templateSuccess}</p>}
              <button type="submit" disabled={templateLoading || !newTemplateContent.trim()}
                className="text-sm font-medium t-accent px-5 py-2.5 rounded-lg hover:opacity-90 disabled:opacity-30 transition-all">
                {templateLoading ? "Saving..." : "Save template"}
              </button>
            </form>
          </>
        )}
      </section>

      {/* ── Confirm Delete Modal ── */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="t-card border t-border rounded-2xl p-6 max-w-sm w-full mx-4 t-shadow">
            <h3 className="font-semibold t-text mb-1">Confirm delete</h3>
            <div className="border-t t-border my-3" />
            <p className="text-sm t-muted mb-6">
              This cannot be undone. All associated{" "}
              {confirmDelete.type === "company" ? "templates and sessions" : "data"}{" "}
              will be permanently deleted.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() =>
                  confirmDelete.type === "company"
                    ? handleDeleteCompany(confirmDelete.id)
                    : handleDeleteTemplate(confirmDelete.id)
                }
                className="text-sm font-medium px-4 py-2 rounded-lg bg-[var(--t-error)] text-white hover:opacity-90"
              >
                Delete
              </button>
              <button
                onClick={() => setConfirmDelete(null)}
                className="text-sm t-muted border t-border px-4 py-2 rounded-lg hover:t-text"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
