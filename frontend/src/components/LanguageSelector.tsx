"use client";

import { useEffect, useRef, useState } from "react";
import { LANG_LABELS, SUPPORTED_UI_LANGS, UILanguage } from "@/lib/i18n";

interface Props {
  lang: UILanguage;
  onChange: (lang: UILanguage) => void;
}

export default function LanguageSelector({ lang, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleOutside(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors"
      >
        <span>{LANG_LABELS[lang]}</span>
        <svg className="h-3 w-3 text-slate-400" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
          <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.06l3.71-3.83a.75.75 0 111.08 1.04l-4.25 4.39a.75.75 0 01-1.08 0L5.21 8.27a.75.75 0 01.02-1.06z" clipRule="evenodd" />
        </svg>
      </button>

      {open && (
        <ul
          role="listbox"
          aria-label="UI language"
          className="absolute right-0 z-50 mt-1.5 w-36 overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg"
        >
          {SUPPORTED_UI_LANGS.map((code) => (
            <li key={code} role="option" aria-selected={code === lang}>
              <button
                type="button"
                onClick={() => { onChange(code); setOpen(false); }}
                className={`flex w-full items-center justify-between px-3.5 py-2 text-left text-xs transition-colors ${
                  code === lang ? "font-semibold text-slate-900" : "font-normal text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <span>{LANG_LABELS[code]}</span>
                {code === lang && (
                  <svg className="h-3.5 w-3.5 text-emerald-600" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                    <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}