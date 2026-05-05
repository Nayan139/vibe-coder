"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Settings2, Save } from "lucide-react";

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
    <div className="border rounded-lg p-4 bg-white shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-sm flex items-center gap-2">
          <Settings2 className="w-4 h-4 text-violet-600" />
          Run Commands
        </h3>
        <span className="text-xs text-gray-400">AI-parsed from README · editable</span>
      </div>

      <div className="space-y-2">
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Install</label>
          <input
            value={install}
            onChange={(e) => handleChange(setInstall, e.target.value)}
            className="w-full font-mono text-sm border rounded px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-violet-400"
            placeholder="npm install"
          />
        </div>
        <div>
          <label className="text-xs text-gray-500 mb-1 block">Start / Dev</label>
          <input
            value={start}
            onChange={(e) => handleChange(setStart, e.target.value)}
            className="w-full font-mono text-sm border rounded px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-violet-400"
            placeholder="npm run dev"
          />
        </div>
      </div>

      {!saved && (
        <button
          onClick={handleSave}
          disabled={saving}
          className="mt-3 flex items-center gap-1.5 text-sm bg-violet-500 text-white px-3 py-1 rounded hover:bg-violet-600 disabled:opacity-50"
        >
          <Save className="w-3.5 h-3.5" />
          {saving ? "Saving…" : "Save Commands"}
        </button>
      )}
    </div>
  );
}
