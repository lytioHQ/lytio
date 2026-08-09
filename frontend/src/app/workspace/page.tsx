"use client";

import { useEffect, useState } from "react";

import AnalysisReport from "@/components/AnalysisReport";
import ChatPanel from "@/components/ChatPanel";
import WorkspaceHeader from "@/components/workspace/WorkspaceHeader";
import SummaryCards from "@/components/workspace/SummaryCards";
import SectionCard from "@/components/workspace/SectionCard";
import ActionPlaceholderCard from "@/components/workspace/ActionPlaceholderCard";
import PipelineTimeline from "@/components/PipelineTimeline";
import { t } from "@/lib/i18n";
import { useAnalysisPipeline } from "@/lib/useAnalysisPipeline";
import { useAnalysisSession } from "@/lib/useAnalysisSession";
import BusinessInsightJourney, { JourneyPhase } from "@/components/BusinessInsightJourney";
import ContinueAnalysisPanel, { ContinueDirection } from "@/components/ContinueAnalysisPanel";
import AnalysisHistoryPanel from "@/components/AnalysisHistoryPanel";

const WORKSPACE_LABELS: Record<string, { title: string; subtitle: string }> = {
  zh: { title: "ExcelPilot", subtitle: "\u9500\u552e\u987e\u95ee\u5de5\u4f5c\u53f0" },
  en: { title: "ExcelPilot", subtitle: "Sales Consultant Workspace" },
  ja: { title: "ExcelPilot", subtitle: "\u58f2\u4e0a\u30b3\u30f3\u30b5\u30eb\u30bf\u30f3\u30c8\u30ef\u30fc\u30af\u30b9\u30da\u30fc\u30b9" },
  de: { title: "ExcelPilot", subtitle: "Vertriebsberater-Arbeitsbereich" },
};

export default function WorkspacePage() {
  const pipe = useAnalysisPipeline();
  const session = useAnalysisSession();
  const [activeDirection, setActiveDirection] = useState<ContinueDirection | null>(null);

  const T = (key: string, params?: Record<string, string | number>) => t(pipe.uiLang, key, params);

  useEffect(() => {
    if (pipe.analysis) {
      session.logInitial(T("history.initial"));
      session.logRecommended(T("history.recommended"));
    }
  }, [pipe.analysis, session.logInitial, session.logRecommended, pipe.uiLang]);
  const journeyPhase: JourneyPhase = !pipe.analysis
    ? pipe.validated || pipe.stage !== "idle"
      ? "ai-analysis"
      : "upload"
    : session.followUps.length === 0
      ? "business-insight"
      : "recommended-actions";

  function handleContinue(direction: ContinueDirection, label: string) {
    setActiveDirection(direction);
    session.addFollowUp(direction, label);
  }
  const ws = WORKSPACE_LABELS[pipe.uiLang] || WORKSPACE_LABELS.en;

  const summaryCards = [
    { label: T("report.kpi.rows"), value: pipe.validated ? `${pipe.validated.rows}` : "\u2014", sub: pipe.validated?.sheet },
    { label: T("report.kpi.findings"), value: pipe.analysis ? `${pipe.analysis.highlights.length}` : "\u2014" },
    { label: T("report.kpi.risks"), value: pipe.analysis ? `${pipe.analysis.warnings.length}` : "\u2014" },
    { label: T("report.kpi.suggestions"), value: pipe.analysis ? `${pipe.analysis.recommendations.length}` : "\u2014" },
  ];

  return (
    <main className="min-h-screen bg-slate-50">
      <WorkspaceHeader
        title={ws.title}
        subtitle={ws.subtitle}
        lang={pipe.uiLang}
        onLangChange={pipe.setUiLang}
        pluginLabel={T("nav.sales")}
        v1Label={"\u2190 " + T("chat.title")}
      />

      <div className="mx-auto max-w-5xl space-y-8 px-8 py-10">
        {/* Error */}
        {pipe.error && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-5 py-4">
            <p className="text-sm font-medium text-red-700">{pipe.error}</p>
          </div>
        )}

        {/* Upload */}
        {!pipe.validated && (
          <SectionCard title={T("step1.title")} subtitle={T("step1.desc")}>
            <div className="flex items-center gap-4">
              <input
                ref={pipe.fileInputRef}
                type="file" accept=".xlsx,.xls"
                onChange={(e) => pipe.setFile(e.target.files?.[0] || null)}
                className="hidden" id="ws-file"
              />
              <label htmlFor="ws-file" className="cursor-pointer rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50">
                {pipe.file ? pipe.file.name : T("step1.browse")}
              </label>
              <button
                onClick={pipe.handleUpload}
                disabled={!pipe.file || pipe.uploading}
                className="rounded-lg bg-slate-900 px-5 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {pipe.uploading ? T("step1.uploading") : T("step1.uploadBtn")}
              </button>
            </div>
            <p className="mt-3 text-[11px] text-slate-400">{T("step1.fileTypes")}</p>
          </SectionCard>
        )}

        {/* Pipeline Progress Timeline */}
        {pipe.stage !== "idle" && pipe.stage !== "done" && (
          <PipelineTimeline lang={pipe.uiLang} stage={pipe.stage} failed={pipe.failed} />
        )}

        {/* Analyze */}
        {pipe.ready && !pipe.analysis && (
          <div className="text-center">
            <button onClick={pipe.handleAnalyze} disabled={pipe.analyzing} className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-8 py-3.5 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 disabled:opacity-50">
              {pipe.analyzing ? (
                <><div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />{T("step3.analyzing")}</>
              ) : T("step3.analyze")}
            </button>
          </div>
        )}

        {/* Business Insight Journey + Report + Continue + History */}
        {pipe.analysis && (
          <div className="space-y-8">
            <BusinessInsightJourney lang={pipe.uiLang} phase={journeyPhase} />
            <SummaryCards cards={summaryCards} />
            <AnalysisReport
              plugin={pipe.analysis.plugin}
              sheet={pipe.analysis.sheet}
              summary={pipe.analysis.summary}
              highlights={pipe.analysis.highlights}
              warnings={pipe.analysis.warnings}
              recommendations={pipe.analysis.recommendations}
              metadata={pipe.analysis.metadata}
              lang={pipe.uiLang}
              t={(key, params) => t(pipe.uiLang, key, params)}
              result={pipe.resultData}
              isLegacy={pipe.isLegacy}
            />
            <ContinueAnalysisPanel lang={pipe.uiLang} active={activeDirection} onSelect={handleContinue} />
            <AnalysisHistoryPanel lang={pipe.uiLang} entries={session.history} />
          </div>
        )}

        {/* Recommended Analysis + Chat */}
        {pipe.analysis && pipe.chatContext && (
          <SectionCard title={T("recs.title")}>
            <ChatPanel
              lang={pipe.uiLang}
              reportLang={pipe.reportLang}
              t={(key, params) => t(pipe.uiLang, key, params)}
              apiUrl={pipe.apiUrl}
              plugin="sales"
              reportSummary={pipe.chatContext.reportSummary}
              reportHighlights={pipe.chatContext.reportHighlights}
              reportWarnings={pipe.chatContext.reportWarnings}
              headers={pipe.chatContext.headers}
              columnTypes={pipe.chatContext.columnTypes}
              rows={pipe.chatContext.rows}
              sheetName={pipe.chatContext.sheetName}
              initialQuestions={pipe.initialQuestions}
            />
          </SectionCard>
        )}

        {/* Recommended Actions — placeholder */}
        {pipe.analysis && (
          <SectionCard title={T("ws.actions")} subtitle={T("ws.actionsDesc")}>
            <div className="grid gap-3 sm:grid-cols-3">
              <ActionPlaceholderCard title={T("ws.optPortfolio")} desc={T("ws.optPortfolioDesc")} />
              <ActionPlaceholderCard title={T("ws.regionalStrat")} desc={T("ws.regionalStratDesc")} />
              <ActionPlaceholderCard title={T("ws.revForecast")} desc={T("ws.revForecastDesc")} />
            </div>
          </SectionCard>
        )}
      </div>
    </main>
  );
}