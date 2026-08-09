"use client";
import Link from "next/link";
import LanguageSelector from "@/components/LanguageSelector";
import { UILanguage } from "@/lib/i18n";

interface Props {
  title: string;
  subtitle: string;
  lang: UILanguage;
  onLangChange: (lang: UILanguage) => void;
  pluginLabel: string;
  v1Label: string;
}

export default function WorkspaceHeader({ title, subtitle, lang, onLangChange, pluginLabel, v1Label }: Props) {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="flex items-center justify-between px-8 py-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">{title}</h1>
          <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>
        </div>
        <div className="flex items-center gap-6">
          <span className="text-xs text-slate-400">{pluginLabel}</span>
          <LanguageSelector lang={lang} onChange={onLangChange} />
          <Link
            href="/"
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition-colors"
          >
            {v1Label}
          </Link>
        </div>
      </div>
    </header>
  );
}