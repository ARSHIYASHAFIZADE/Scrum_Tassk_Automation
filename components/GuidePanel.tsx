"use client";

import { useState } from "react";

const GUIDES = [
  {
    title: "Record",
    steps: [
      "Select your company and template at the top",
      "Click the mic button to start recording",
      "Speak your daily standup naturally",
      "Click stop when done — audio saves automatically",
    ],
  },
  {
    title: "Generate",
    steps: [
      "After recording, your transcript appears on the left",
      "Click Generate SCRUM Doc",
      "AI fills your template from the transcript",
      "Review the generated document on the right",
    ],
  },
  {
    title: "Export",
    steps: [
      "Go to the session via Calendar",
      "Click PDF, DOCX, or Audio to export",
      "File downloads instantly to your device",
    ],
  },
  {
    title: "Calendar",
    steps: [
      "Navigate to Calendar in the top nav",
      "Days with sessions show a colored dot",
      "Click any dot to view that session",
      "Each company has its own calendar view",
    ],
  },
  {
    title: "Companies",
    steps: [
      "Go to Settings to add company profiles",
      "Each company has its own color and templates",
      "Switch companies using the selector in the navbar",
      "All sessions, calendar, and exports are per-company",
    ],
  },
];

export default function GuidePanel() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-xs t-muted hover:t-text transition-colors border t-border
                   hover:t-accent-border w-7 h-7 rounded-lg flex items-center justify-center"
        title="Help & Guide"
      >
        ?
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />
          <div
            className="relative w-80 h-full t-card border-l t-border overflow-y-auto"
            style={{ animation: "slide-in-right 0.22s ease" }}
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <span className="font-semibold t-text text-sm">How to use Ashxcribe</span>
                <button
                  onClick={() => setOpen(false)}
                  className="t-faint hover:t-text text-base transition-colors"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-6">
                {GUIDES.map((guide, gi) => (
                  <div key={guide.title}>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="w-5 h-5 rounded-full t-accent flex items-center justify-center
                                       font-mono text-[10px] font-bold shrink-0">
                        {gi + 1}
                      </span>
                      <span className="font-semibold text-sm t-text">{guide.title}</span>
                    </div>
                    <ul className="space-y-1.5 pl-7">
                      {guide.steps.map((step, i) => (
                        <li key={i} className="text-xs t-muted leading-relaxed flex gap-2">
                          <span className="t-faint shrink-0">–</span>
                          <span>{step}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>

              <div className="mt-8 pt-4 border-t t-border">
                <p className="font-mono text-[10px] t-faint">
                  Powered by Groq · Llama 3.3 70B · LiveKit
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
