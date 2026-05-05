"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";
import { MODEL_OPTIONS, type ModelOption } from "@/lib/models";

interface ModelSelectorProps {
  selected: ModelOption;
  onChange: (model: ModelOption) => void;
}

export function ModelSelector({ selected, onChange }: ModelSelectorProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const isGroq = selected.badge === "GROQ";

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 text-xs border rounded-lg px-2 py-1.5 bg-gray-50 hover:bg-gray-100 transition-colors"
      >
        <span
          className={`text-xs px-1.5 py-0.5 rounded font-bold ${
            isGroq ? "bg-orange-100 text-orange-600" : "bg-green-100 text-green-600"
          }`}
        >
          {selected.badge}
        </span>
        <span className="text-gray-700 hidden sm:inline">{selected.label}</span>
        <ChevronDown className="w-3 h-3 text-gray-400" />
      </button>

      {open && (
        <div className="absolute bottom-full mb-1 left-0 bg-white border rounded-xl shadow-lg z-50 w-64">
          <div className="px-3 py-2 text-xs text-gray-400 border-b uppercase tracking-wide">
            Choose Model
          </div>
          {MODEL_OPTIONS.map((opt) => (
            <button
              key={opt.model}
              type="button"
              onClick={() => {
                onChange(opt);
                setOpen(false);
              }}
              className={`w-full flex items-center justify-between px-3 py-2.5 text-sm hover:bg-gray-50 transition-colors ${
                opt.model === selected.model ? "bg-blue-50" : ""
              }`}
            >
              <div className="flex items-center gap-2">
                <span
                  className={`text-xs px-1.5 py-0.5 rounded font-bold ${
                    opt.badge === "GROQ"
                      ? "bg-orange-100 text-orange-600"
                      : "bg-green-100 text-green-600"
                  }`}
                >
                  {opt.badge}
                </span>
                <span>{opt.label}</span>
              </div>
              <span className="text-xs text-gray-400">{opt.note}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
