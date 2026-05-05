"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Settings2, Save, Check } from "lucide-react";

interface RunCommandsCardProps {
  projectId?: string;
  initialInstall?: string;
  initialStart?: string;
  onSave?: (install: string, start: string) => void;
}

export function RunCommandsCard({
  projectId,
  initialInstall = "npm install",
  initialStart = "npm run dev",
  onSave,
}: RunCommandsCardProps) {
  const [install, setInstall] = useState(initialInstall);
  const [start, setStart] = useState(initialStart);
  const [saved, setSaved] = useState(true);
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      if (projectId) {
        const res = await fetch("/api/projects/update-commands", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ projectId, install, start }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          toast.error((data as { error?: string }).error ?? "Failed to save commands.");
          return;
        }
      }
      setSaved(true);
      onSave?.(install, start);
      toast.success("Run commands saved.");
    } catch {
      toast.error("Network error saving commands.");
    } finally {
      setSaving(false);
    }
  }

  function handleChange(setter: (v: string) => void, value: string) {
    setter(value);
    setSaved(false);
  }

  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-linear-to-r from-rose-500 to-amber-400" />
      <div className="p-5">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-700">
            <Settings2 className="h-4 w-4 text-rose-500" />
            Run Commands
          </h3>
          <span className="text-xs text-slate-400">AI-parsed from README · editable</span>
        </div>

        <div className="space-y-3">
          <div>
            <label htmlFor="run-install" className="mb-1.5 block text-xs font-medium text-slate-500">Install command</label>
            <input
              id="run-install"
              value={install}
              onChange={(e) => handleChange(setInstall, e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-sm text-slate-700 transition-colors focus:border-rose-300 focus:outline-none focus:ring-2 focus:ring-rose-400/20"
              placeholder="npm install"
            />
          </div>
          <div>
            <label htmlFor="run-start" className="mb-1.5 block text-xs font-medium text-slate-500">Start / Dev command</label>
            <input
              id="run-start"
              value={start}
              onChange={(e) => handleChange(setStart, e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-sm text-slate-700 transition-colors focus:border-rose-300 focus:outline-none focus:ring-2 focus:ring-rose-400/20"
              placeholder="npm run dev"
            />
          </div>
        </div>

        <div className="mt-4 flex items-center gap-3">
          {saved ? (
            <span className="flex items-center gap-1.5 text-xs text-emerald-600">
              <Check className="h-3.5 w-3.5" />
              Commands saved
            </span>
          ) : (
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={saving}
              className="flex cursor-pointer items-center gap-1.5 rounded-lg bg-linear-to-r from-rose-500 to-amber-400 px-4 py-2 text-sm font-medium text-white transition-all hover:opacity-90 hover:shadow-md hover:shadow-rose-200/60 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Save className="h-3.5 w-3.5" />
              {saving ? "Saving…" : "Save Commands"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
