"use client";

import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { ChevronDown } from "lucide-react";
import { MODEL_OPTIONS, type ModelOption } from "@/lib/models";

interface ModelSelectorProps {
  readonly selected: ModelOption;
  readonly onChange: (model: ModelOption) => void;
}

function badgeClass(badge: string) {
  if (badge === "GROQ") return "bg-orange-100 text-orange-600";
  if (badge === "GEMINI") return "bg-blue-100 text-blue-600";
  return "bg-green-100 text-green-600";
}

export function ModelSelector({ selected, onChange }: ModelSelectorProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number; width: number }>({
    top: 0,
    left: 0,
    width: 256,
  });

  function updateMenuPosition() {
    const btn = buttonRef.current;
    if (!btn) return;
    const rect = btn.getBoundingClientRect();
    const menuWidth = 256;
    const left = Math.min(
      Math.max(8, rect.right - menuWidth),
      window.innerWidth - menuWidth - 8
    );
    const estimatedMenuHeight = 320;
    const openUp = rect.top > estimatedMenuHeight + 8;
    const top = openUp ? rect.top - estimatedMenuHeight - 6 : rect.bottom + 6;
    setMenuPos({ top: Math.max(8, top), left, width: menuWidth });
  }

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      const clickedButtonArea = ref.current?.contains(target) ?? false;
      const clickedMenu = menuRef.current?.contains(target) ?? false;
      if (!clickedButtonArea && !clickedMenu) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!open) return;
    updateMenuPosition();
    function handleReposition() {
      updateMenuPosition();
    }
    window.addEventListener("resize", handleReposition);
    window.addEventListener("scroll", handleReposition, true);
    return () => {
      window.removeEventListener("resize", handleReposition);
      window.removeEventListener("scroll", handleReposition, true);
    };
  }, [open]);

  return (
    <div className="relative w-full" ref={ref}>
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-9 w-full items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs transition-colors cursor-pointer hover:bg-slate-100"
      >
        <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${badgeClass(selected.badge)}`}>
          {selected.badge}
        </span>
        <ChevronDown className="w-3 h-3 text-slate-400" />
      </button>

      {open &&
        createPortal(
          <div
            ref={menuRef}
            className="fixed z-[100] rounded-xl border bg-white shadow-lg"
            style={{ top: menuPos.top, left: menuPos.left, width: menuPos.width }}
          >
            <div className="border-b px-3 py-2 text-xs uppercase tracking-wide text-slate-400">
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
                className={`w-full cursor-pointer px-3 py-2.5 text-sm transition-colors hover:bg-slate-50 ${
                  opt.model === selected.model ? "bg-rose-50" : ""
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`rounded px-1.5 py-0.5 text-xs font-bold ${badgeClass(opt.badge)}`}>
                      {opt.badge}
                    </span>
                    <span>{opt.label}</span>
                  </div>
                  <span className="text-xs text-slate-400">{opt.note}</span>
                </div>
              </button>
            ))}
          </div>,
          document.body
        )}
    </div>
  );
}
