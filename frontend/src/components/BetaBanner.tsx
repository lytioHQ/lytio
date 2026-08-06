"use client";

import { t, UILanguage } from "@/lib/i18n";

interface Props {
  lang?: UILanguage;
}

export default function BetaBanner({ lang = "en" }: Props) {
  return (
    <div className="border-b border-amber-200 bg-amber-50 px-6 py-2.5 text-center">
      <p className="text-xs font-medium text-amber-700">
        <span className="rounded-full bg-amber-500/15 px-2 py-0.5 font-bold tracking-wide uppercase">
          {t(lang, "beta.badge")}
        </span>
        <span className="mx-2">&middot;</span>
        <span>
          {t(lang, "beta.version")}: <span className="font-semibold">{t(lang, "header.version")}</span>
        </span>
        <span className="mx-2">&middot;</span>
        <span>{t(lang, "beta.message")}</span>
      </p>
    </div>
  );
}