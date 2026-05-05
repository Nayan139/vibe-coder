"use client";

import { useCallback, useEffect, useState } from "react";
import { Eye, EyeOff, Globe, Lock, Plus, Trash2 } from "lucide-react";

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
  /** Optional list of env keys detected from README — shown as one-click suggestions. */
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

  return (
    <div className="border rounded-xl bg-white shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b">
        <div className="flex items-center gap-2">
          <span className="text-base">🔐</span>
          <div>
            <h3 className="font-semibold text-sm text-gray-800">Environment Variables</h3>
            <p className="text-xs text-gray-400">Stored securely · never committed to git</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {vars.length > 0 && (
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
              {vars.length} variable{vars.length !== 1 ? "s" : ""}
            </span>
          )}
          <button
            onClick={() => {
              setAdding(true);
              setError("");
            }}
            className="flex items-center gap-1.5 text-xs bg-violet-600 text-white px-3 py-1.5 rounded-lg hover:bg-violet-700 transition-colors"
          >
            <Plus size={12} /> Add Variable
          </button>
        </div>
      </div>

      {/* README-detected suggestions */}
      {unusedSuggestions.length > 0 && (
        <div className="px-4 py-2.5 bg-amber-50 border-b border-amber-100">
          <p className="text-xs text-amber-700 font-medium mb-1.5">
            💡 README mentions these variables — click to add:
          </p>
          <div className="flex flex-wrap gap-1.5">
            {unusedSuggestions.map((k) => (
              <button
                key={k}
                onClick={() => prefillSuggestion(k)}
                className="font-mono text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded hover:bg-amber-200 transition-colors"
              >
                + {k}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Add new variable form */}
      {adding && (
        <div className="px-4 py-3 bg-blue-50 border-b border-blue-100">
          <p className="text-xs font-medium text-blue-700 mb-2">New Environment Variable</p>
          <div className="flex gap-2 items-start flex-wrap sm:flex-nowrap">
            {/* Key */}
            <div className="flex-1 min-w-[120px]">
              <label className="text-xs text-gray-500 mb-1 block">Key</label>
              <input
                value={newVar.key}
                onChange={(e) =>
                  setNewVar((p) => ({
                    ...p,
                    key: e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, ""),
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
                className="w-full font-mono text-sm border rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-violet-400"
                autoFocus
              />
            </div>
            {/* Value */}
            <div className="flex-1 min-w-[120px]">
              <label className="text-xs text-gray-500 mb-1 block">Value</label>
              <input
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
                className="w-full font-mono text-sm border rounded-lg px-3 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-violet-400"
              />
            </div>
            {/* Secret toggle */}
            <div className="shrink-0">
              <label className="text-xs text-gray-500 mb-1 block">Secret?</label>
              <button
                type="button"
                onClick={() => setNewVar((p) => ({ ...p, is_secret: !p.is_secret }))}
                className={`flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg border transition-all ${
                  newVar.is_secret
                    ? "bg-orange-50 border-orange-200 text-orange-600"
                    : "bg-gray-50 border-gray-200 text-gray-500"
                }`}
              >
                {newVar.is_secret ? <Lock size={12} /> : <Globe size={12} />}
                {newVar.is_secret ? "Secret" : "Public"}
              </button>
            </div>
          </div>
          {error && <p className="text-xs text-red-500 mt-1.5">{error}</p>}
          <div className="flex gap-2 mt-2">
            <button
              onClick={() => void saveVar()}
              disabled={saving}
              className="text-xs bg-violet-600 text-white px-4 py-1.5 rounded-lg hover:bg-violet-700 disabled:opacity-50 transition-colors"
            >
              {saving ? "Saving…" : "Save Variable"}
            </button>
            <button
              onClick={() => {
                setAdding(false);
                setError("");
                setNewVar({ key: "", value: "", is_secret: false });
              }}
              className="text-xs text-gray-500 hover:text-gray-700 px-3 py-1.5"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Variables list */}
      {loading ? (
        <div className="px-4 py-6 text-center text-sm text-gray-400">Loading…</div>
      ) : vars.length === 0 && !adding ? (
        <div className="px-4 py-8 text-center">
          <p className="text-2xl mb-2">🔑</p>
          <p className="text-sm text-gray-500 mb-1">No environment variables yet</p>
          <p className="text-xs text-gray-400">
            Add the API keys, database URLs, or tokens your project needs to run.
          </p>
        </div>
      ) : (
        <div className="divide-y">
          {vars.map((v) => (
            <div key={v.key} className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 group">
              {/* Secret/public badge */}
              <span className={`shrink-0 ${v.is_secret ? "text-orange-400" : "text-gray-300"}`}>
                {v.is_secret ? <Lock size={13} /> : <Globe size={13} />}
              </span>

              {/* Key */}
              <span className="font-mono text-sm text-gray-700 w-48 shrink-0 truncate">{v.key}</span>

              {/* Value */}
              <span
                className={`flex-1 font-mono text-sm truncate ${
                  v.is_secret && !revealedKeys.has(v.key) ? "text-gray-400 tracking-widest" : "text-gray-600"
                }`}
              >
                {v.is_secret && !revealedKeys.has(v.key) ? "••••••••" : v.value}
              </span>

              {/* Actions (visible on hover) */}
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                {v.is_secret && (
                  <button
                    onClick={() => toggleReveal(v.key)}
                    className="p-1.5 text-gray-400 hover:text-gray-600 rounded"
                    title={revealedKeys.has(v.key) ? "Hide" : "Reveal"}
                  >
                    {revealedKeys.has(v.key) ? <EyeOff size={13} /> : <Eye size={13} />}
                  </button>
                )}
                <button
                  onClick={() => void deleteVar(v.key)}
                  disabled={deletingKey === v.key}
                  className="p-1.5 text-gray-400 hover:text-red-500 rounded disabled:opacity-40"
                  title="Delete"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Footer note */}
      {vars.length > 0 && (
        <div className="px-4 py-2 bg-gray-50 border-t">
          <p className="text-xs text-gray-400">
            🔒 Injected as <code className="font-mono">.env</code> into the live preview at runtime — never pushed to your repository.
          </p>
        </div>
      )}
    </div>
  );
}
