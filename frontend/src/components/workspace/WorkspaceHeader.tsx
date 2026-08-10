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
    <header className="border-b border-border bg-surface">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-6 md:px-8">
        <div className="min-w-0">
          <h1 className="text-[26px] font-semibold tracking-tight text-ink md:text-[28px]">{title}</h1>
          <p className="mt-1 text-[15px] leading-relaxed text-secondary md:text-base">{subtitle}</p>
        </div>
        <div className="flex shrink-0 items-center gap-4 md:gap-6">
          <span className="hidden text-sm text-secondary sm:inline">{pluginLabel}</span>
          <LanguageSelector lang={lang} onChange={onLangChange} />
          <Link
            href="/"
            className="inline-flex h-9 items-center rounded-control border border-border px-3.5 text-sm text-secondary transition-colors hover:bg-canvas hover:text-ink"
          >
            {v1Label}
          </Link>
        </div>
      </div>
    </header>
  );
}