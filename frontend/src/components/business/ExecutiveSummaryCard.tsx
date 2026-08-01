export default function ExecutiveSummaryCard({ content }: { content: string }) {
  if (!content) return null;
  return (
    <div className="rounded-xl border-l-4 border-slate-900 bg-white p-6 shadow-sm">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-3">Executive Summary</p>
      <p className="text-sm leading-relaxed text-slate-600 whitespace-pre-line">{content}</p>
    </div>
  );
}