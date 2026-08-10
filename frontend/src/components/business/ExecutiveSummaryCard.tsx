import { t, UILanguage } from "@/lib/i18n";
import Card from "@/components/ui/Card";

export default function ExecutiveSummaryCard({ content, lang }: { content: string; lang: UILanguage }) {
  const T = (key: string, params?: Record<string, string | number>) => t(lang, key, params);
  if (!content) return null;
  return (
    <Card>
      <p className="mb-3 text-h3 text-ink">{T("report.execSummary")}</p>
      <p className="max-w-[680px] whitespace-pre-line text-body leading-relaxed text-secondary">{content}</p>
    </Card>
  );
}