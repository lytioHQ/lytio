"use client";

import { t, UILanguage } from "@/lib/i18n";

interface Props {
  lang?: UILanguage;
}

export default function BetaBanner({ lang = "en" }: Props) {
  return (
    <div className="border-b border-warning/20 bg-warning/5 px-4 py-3 text-center md:px-6">
      <p className="text-sm leading-relaxed text-ink">
        <span className="inline-flex items-center rounded-full bg-warning/10 px-2.5 py-0.5 font-semibold text-warning">
          {t(lang, "beta.badge")}
        </span>
        <span className="mx-2 text-secondary">&middot;</span>
        <span>
          {t(lang, "beta.version")}: <span className="font-semibold">{t(lang, "header.version")}</span>
        </span>
        <span className="mx-2 text-secondary">&middot;</span>
        <span>{t(lang, "beta.message")}</span>
      </p>
    </div>
  );
}