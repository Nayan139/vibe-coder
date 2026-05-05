"use client";

import { useCallback, useEffect, useState } from "react";
import { Eye, EyeOff, Globe, Lock, Plus, Trash2, ShieldCheck, Key } from "lucide-react";

type EnvVar = {
  id: string;
  key: string;
  value: string;
  is_secret: boolean;
  updated_at: string;
};

type NewVar = { key: string; value: string; is_secret: boolean };

interface EnvVarsCardProps {
  projectId: string;
  suggestedKeys?: string[];
}

export function EnvVarsCard({ projectId, suggestedKeys = [] }: EnvVarsCardProps) {
  const [vars, setVars] = useState<EnvVar[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [newVar, setNewVar] = useState<NewVar>({ key: "", value: "", is_secret: false });
  const [saving, setSaving] = useState(false);
  const [deletingKey, setDeletingKey] = useState<string | null>(null);
  const [revealedKeys, setRevealedKeys] = useState<Set<string>>(new Set());
  const [error, setError] = useState("");

  const fetchVars = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/env-vars`);
      const json = (await res.json()) as { vars?: EnvVar[]; error?: string };
      setVars(json.vars ?? []);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    void fetchVars();
  }, [fetchVars]);

  async function saveVar() {
    const trimmedKey = newVar.key.trim();
    if (!trimmedKey) {
      setError("Key is required");
      return;
    }
    if (!/^[A-Za-z0-9_]+$/.test(trimmedKey)) {
      setError("Key can only contain letters, numbers, and underscores");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await fetch(`/api/projects/${projectId}/env-vars`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: trimmedKey.toUpperCase(),
          value: newVar.value,
          is_secret: newVar.is_secret,
        }),
      });
      setNewVar({ key: "", value: "", is_secret: false });
      setAdding(false);
      await fetchVars();
    } finally {
      setSaving(false);
    }
  }

  async function deleteVar(key: string) {
    setDeletingKey(key);
    try {
      await fetch(`/api/projects/${projectId}/env-vars`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key }),
      });
      await fetchVars();
    } finally {
      setDeletingKey(null);
    }
  }

  function toggleReveal(key: string) {
    setRevealedKeys((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  function prefillSuggestion(key: string) {
    setNewVar({ key, value: "", is_secret: true });
    setAdding(true);
    setError("");
  }

  const unusedSuggestions = suggestedKeys.filter((k) => !vars.find((v) => v.key === k.toUpperCase()));
  const showEmptyState = vars.length === 0 && adding === false;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="absolute top-0 left-0 right-0 h-0.5 bg-linear-to-r from-rose-500 to-amber-400" />

      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-linear-to-br from-rose-500 to-amber-400 shadow-sm shadow-rose-100">
            <Lock className="h-3.5 w-3.5 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-800">Environment Variables</h3>
            <p className="text-xs text-slate-400">Stored securely · never committed to git</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {vars.length > 0 && (
            <span className="rounded-full border border-rose-100 bg-rose-50 px-2 py-0.5 text-xs font-medium text-rose-600">
              {vars.length} var{vars.length === 1 ? "" : "s"}
            </span>
          )}
          <button
            type="button"
            onClick={() => {
              setAdding(true);
              setError("");
            }}
            className="flex cursor-pointer items-center gap-1.5 rounded-lg bg-linear-to-r from-rose-500 to-amber-400 px-3 py-1.5 text-xs font-medium text-white transition-all hover:opacity-90 hover:shadow-md hover:shadow-rose-200/50"
          >
            <Plus className="h-3 w-3" />
            Add Variable
          </button>
        </div>
      </div>

      {/* README-detected suggestions */}
      {unusedSuggestions.length > 0 && (
        <div className="border-b border-amber-100 bg-amber-50/70 px-5 py-3">
          <p className="mb-2 text-xs font-medium text-amber-700">
            README mentions these variables — click to add:
          </p>
          <div className="flex flex-wrap gap-1.5">
            {unusedSuggestions.map((k) => (
              <button
                type="button"
                key={k}
                onClick={() => prefillSuggestion(k)}
                className="cursor-pointer rounded-md border border-amber-200 bg-amber-100 px-2 py-0.5 font-mono text-xs text-amber-800 transition-colors hover:bg-amber-200"
              >
                + {k}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Add new variable form */}
      {adding && (
        <div className="border-b border-rose-100 bg-rose-50/40 px-5 py-4">
          <p className="mb-3 text-xs font-semibold text-rose-700">New Environment Variable</p>
          <div className="flex flex-wrap items-start gap-2 sm:flex-nowrap">
            <div className="min-w-28 flex-1">
              <label htmlFor="env-key" className="mb-1 block text-xs text-slate-500">Key</label>
              <input
                id="env-key"
                value={newVar.key}
                onChange={(e) =>
                  setNewVar((p) => ({
                    ...p,
                    key: e.target.value.toUpperCase().replaceAll(/[^A-Z0-9_]/g, ""),
                  }))
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter") void saveVar();
                  if (e.key === "Escape") {
                    setAdding(false);
                    setError("");
                  }
                }}
                placeholder="VITE_API_URL"
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-sm transition-colors focus:border-rose-300 focus:outline-none focus:ring-2 focus:ring-rose-400/20"
                autoFocus
              />
            </div>
            <div className="min-w-28 flex-1">
              <label htmlFor="env-value" className="mb-1 block text-xs text-slate-500">Value</label>
              <input
                id="env-value"
                type={newVar.is_secret ? "password" : "text"}
                value={newVar.value}
                onChange={(e) => setNewVar((p) => ({ ...p, value: e.target.value }))}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void saveVar();
                  if (e.key === "Escape") {
                    setAdding(false);
                    setError("");
                  }
                }}
                placeholder="your-value-here"
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-sm transition-colors focus:border-rose-300 focus:outline-none focus:ring-2 focus:ring-rose-400/20"
              />
            </div>
            <div className="shrink-0">
              <label className="mb-1 block text-xs text-slate-500">Secret?</label>
              <button
                type="button"
                onClick={() => setNewVar((p) => ({ ...p, is_secret: !p.is_secret }))}
                className={`flex cursor-pointer items-center gap-1.5 rounded-lg border px-3 py-2 text-xs transition-all ${
                  newVar.is_secret
                    ? "border-orange-200 bg-orange-50 text-orange-600"
                    : "border-slate-200 bg-slate-50 text-slate-500"
                }`}
              >
                {newVar.is_secret ? <Lock className="h-3 w-3" /> : <Globe className="h-3 w-3" />}
                {newVar.is_secret ? "Secret" : "Public"}
              </button>
            </div>
          </div>
          {error && <p className="mt-2 text-xs text-red-500">{error}</p>}
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => void saveVar()}
              disabled={saving}
              className="cursor-pointer rounded-lg bg-linear-to-r from-rose-500 to-amber-400 px-4 py-1.5 text-xs font-medium text-white transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save Variable"}
            </button>
            <button
              type="button"
              onClick={() => {
                setAdding(false);
                setError("");
                setNewVar({ key: "", value: "", is_secret: false });
              }}
              className="cursor-pointer px-3 py-1.5 text-xs text-slate-500 transition-colors hover:text-slate-700"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Variables list */}
      {loading ? (
        <div className="px-5 py-8 text-center text-sm text-slate-400">Loading…</div>
      ) : showEmptyState ? (
        <div className="px-5 py-10 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-linear-to-br from-rose-50 to-amber-50">
            <Key className="h-5 w-5 text-rose-400" />
          </div>
          <p className="mb-1 text-sm font-medium text-slate-700">No environment variables yet</p>
          <p className="text-xs text-slate-400">
            Add the API keys, database URLs, or tokens your project needs to run.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-slate-100">
          {vars.map((v) => (
            <div key={v.key} className="group flex items-center gap-3 px-5 py-3 transition-colors hover:bg-slate-50/60">
              <span className={`shrink-0 ${v.is_secret ? "text-orange-400" : "text-slate-300"}`}>
                {v.is_secret ? <Lock className="h-3.5 w-3.5" /> : <Globe className="h-3.5 w-3.5" />}
              </span>
              <span className="w-48 shrink-0 truncate font-mono text-sm text-slate-700">{v.key}</span>
              <span
                className={`flex-1 truncate font-mono text-sm ${
                  v.is_secret && !revealedKeys.has(v.key) ? "tracking-widest text-slate-300" : "text-slate-600"
                }`}
              >
                {v.is_secret && !revealedKeys.has(v.key) ? "••••••••" : v.value}
              </span>
              <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                {v.is_secret && (
                  <button
                    type="button"
                    onClick={() => toggleReveal(v.key)}
                    className="cursor-pointer rounded-md p-1.5 text-slate-400 transition-colors hover:text-slate-600"
                    title={revealedKeys.has(v.key) ? "Hide" : "Reveal"}
                  >
                    {revealedKeys.has(v.key) ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => void deleteVar(v.key)}
                  disabled={deletingKey === v.key}
                  className="cursor-pointer rounded-md p-1.5 text-slate-400 transition-colors hover:text-red-500 disabled:opacity-40"
                  title="Delete"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Footer */}
      {vars.length > 0 && (
        <div className="flex items-center gap-2 border-t border-slate-100 bg-slate-50/60 px-5 py-2.5">
          <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
          <p className="text-xs text-slate-400">
            Injected as <code className="font-mono">.env</code> into the live preview at runtime — never pushed to your repository.
          </p>
        </div>
      )}
    </div>
  );
}
