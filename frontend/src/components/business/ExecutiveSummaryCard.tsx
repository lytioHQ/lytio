import { t, UILanguage } from "@/lib/i18n";

export default function ExecutiveSummaryCard({ content, lang }: { content: string; lang: UILanguage }) {
  const T = (key: string, params?: Record<string, string | number>) => t(lang, key, params);
  if (!content) return null;
  return (
    <div className="rounded-xl border-l-4 border-slate-900 bg-white p-6 shadow-sm">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-3">{T("report.execSummary")}</p>
      <p className="text-sm leading-relaxed text-slate-600 whitespace-pre-line">{content}</p>
    </div>
  );
}