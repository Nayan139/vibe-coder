"use client";

import { useState } from "react";

interface EnvVar {
  key: string;
  value: string;
}

interface EnvEditorProps {
  content: string;
  onChange?: (updated: string) => void;
}

export function EnvEditor({ content, onChange }: EnvEditorProps) {
  const [vars, setVars] = useState<EnvVar[]>(() =>
    content
      .split("\n")
      .filter((line) => line.trim() && !line.startsWith("#"))
      .map((line) => {
        const eqIdx = line.indexOf("=");
        if (eqIdx === -1) return { key: line.trim(), value: "" };
        return {
          key: line.slice(0, eqIdx).trim(),
          value: line.slice(eqIdx + 1).trim(),
        };
      })
  );

  function updateVar(index: number, newValue: string) {
    const updated = vars.map((v, i) => (i === index ? { ...v, value: newValue } : v));
    setVars(updated);
    onChange?.(updated.map((v) => `${v.key}=${v.value}`).join("\n"));
  }

  const isSensitive = (key: string) =>
    /secret|key|token|password|pass|pwd/i.test(key);

  return (
    <div className="space-y-2">
      {vars.map((v, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="font-mono text-sm text-gray-700 w-48 shrink-0 truncate" title={v.key}>
            {v.key}
          </span>
          <span className="text-gray-400 shrink-0">=</span>
          <input
            type={isSensitive(v.key) ? "password" : "text"}
            value={v.value}
            onChange={(e) => updateVar(i, e.target.value)}
            placeholder="Enter value…"
            className="flex-1 border rounded px-3 py-1 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-yellow-400"
          />
        </div>
      ))}
      {vars.length === 0 && (
        <p className="text-sm text-gray-400">No environment variables found.</p>
      )}
    </div>
  );
}
