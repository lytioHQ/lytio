"use client";

import { useEffect, useState } from "react";

import AnalysisReport from "@/components/AnalysisReport";
import ChatPanel from "@/components/ChatPanel";
import WorkspaceHeader from "@/components/workspace/WorkspaceHeader";
import SummaryCards from "@/components/workspace/SummaryCards";
import SectionCard from "@/components/workspace/SectionCard";
import ActionPlaceholderCard from "@/components/workspace/ActionPlaceholderCard";
import PipelineTimeline from "@/components/PipelineTimeline";
import { Button } from "@/components/ui";
import { t } from "@/lib/i18n";
import { useAnalysisPipeline } from "@/lib/useAnalysisPipeline";
import { useAnalysisSession } from "@/lib/useAnalysisSession";
import BusinessInsightJourney, { JourneyPhase } from "@/components/BusinessInsightJourney";
import ContinueAnalysisPanel, { ContinueDirection } from "@/components/ContinueAnalysisPanel";
import AnalysisHistoryPanel from "@/components/AnalysisHistoryPanel";

const WORKSPACE_LABELS: Record<string, { title: string; subtitle: string }> = {
  zh: { title: "Lytio", subtitle: "\u9500\u552e\u5206\u6790\u5de5\u4f5c\u53f0" },
  en: { title: "Lytio", subtitle: "Sales Analysis Workspace" },
  ja: { title: "Lytio", subtitle: "\u58f2\u4e0a\u5206\u6790\u30ef\u30fc\u30af\u30b9\u30da\u30fc\u30b9" },
  de: { title: "Lytio", subtitle: "Vertriebsanalyse-Arbeitsbereich" },
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
    <main className="min-h-screen bg-canvas">
      <WorkspaceHeader
        title={ws.title}
        subtitle={ws.subtitle}
        lang={pipe.uiLang}
        onLangChange={pipe.setUiLang}
        pluginLabel={T("nav.sales")}
        v1Label={"\u2190 " + T("chat.title")}
      />

      <div className="mx-auto max-w-5xl space-y-8 px-4 py-8 md:px-8 md:py-10">
        {/* Error */}
        {pipe.error && (
          <div className="rounded-control border border-danger/20 bg-danger/5 px-5 py-4">
            <p className="text-sm font-medium text-danger">{pipe.error}</p>
          </div>
        )}

        {/* Upload */}
        {!pipe.validated && (
          <SectionCard title={T("step1.title")} subtitle={T("step1.desc")}>
            <div className="rounded-card border border-border bg-muted px-6 py-12 text-center md:px-10">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-control bg-surface text-2xl shadow-[0_1px_2px_rgba(0,0,0,0.04)]" aria-hidden>
                &#x1F4CA;
              </div>
              <h3 className="mt-5 text-lg font-semibold text-ink">
                {pipe.file ? pipe.file.name : T("step1.dragHint")}
              </h3>
              <p className="mt-1.5 text-sm leading-relaxed text-secondary">{T("step1.fileTypes")}</p>
              <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <input
                  ref={pipe.fileInputRef}
                  type="file" accept=".xlsx,.xls"
                  onChange={(e) => pipe.setFile(e.target.files?.[0] || null)}
                  className="hidden" id="ws-file"
                />
                <label htmlFor="ws-file" className="inline-flex h-11 w-full cursor-pointer items-center justify-center rounded-control border border-border bg-surface px-5 text-sm font-medium text-ink transition-colors hover:bg-canvas sm:w-auto">
                  {T("step1.browse")}
                </label>
                <Button
                  onClick={pipe.handleUpload}
                  disabled={!pipe.file || pipe.uploading}
                  className="w-full sm:w-auto"
                >
                  {pipe.uploading ? T("step1.uploading") : T("step1.uploadBtn")}
                </Button>
              </div>
            </div>
          </SectionCard>
        )}

        {/* Pipeline Progress Timeline */}
        {pipe.stage !== "idle" && pipe.stage !== "done" && (
          <PipelineTimeline lang={pipe.uiLang} stage={pipe.stage} failed={pipe.failed} />
        )}

        {/* Analyze */}
        {pipe.ready && !pipe.analysis && (
          <div className="flex justify-center py-4">
            <Button onClick={pipe.handleAnalyze} disabled={pipe.analyzing} className="px-8">
              {pipe.analyzing ? (
                <><div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />{T("step3.analyzing")}</>
              ) : T("step3.analyze")}
            </Button>
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

        {/* Recommended Actions placeholder */}
        {pipe.analysis && (
          <SectionCard title={T("ws.actions")} subtitle={T("ws.actionsDesc")}>
            <div className="grid gap-4 sm:grid-cols-3">
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