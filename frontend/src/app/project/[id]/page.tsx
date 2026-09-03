"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { TOKEN_KEY, apiFetch } from "@/lib/apiFetch";
import { useAuth } from "@/lib/AuthContext";
import { localeForLang, t, UILanguage } from "@/lib/i18n";
import { useUiLang } from "@/lib/useUiLang";
import { Button, Card, MetricCard } from "@/components/ui";
import { buttonBaseClasses, buttonVariantClasses } from "@/components/ui/Button";
import { ANALYSIS_DIRECTIONS, analysisDirectionIcon } from "@/lib/analysisDirections";
import { schemaFieldMeta, type SchemaMapping } from "@/lib/schemaMapping";
import BusinessMemoryCard from "@/components/business/BusinessMemoryCard";
import SchemaConfirmationPanel from "@/components/schema/SchemaConfirmationPanel";

interface ProjectData {
  id: number; title: string; industry: string; language: string;
  original_filename: string | null; saved_filename: string | null;
  status: string; created_at: string | null; updated_at: string | null; latest_summary: string | null;
}

interface ReportPreview {
  business_health: { score: number; level: string; summary: string } | null;
  executive_summary: { content: string } | null;
  key_metrics: { name: string; value: string; trend: string }[];
  top_insights: { title: string; description: string; confidence: string }[];
  top_risks: { title: string; description: string; severity: string }[];
  top_recommendations: { title: string; description: string; priority: string }[];
}

const API = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

interface TimelineItem { id: number; created_at: string | null; business_health_score: number | null; summary: string | null; analysis_type: string | null; analysis_direction: string | null; parent_run_id: number | null; dataset_version: string | null; purpose: string | null; }

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-muted text-secondary",
  ready: "bg-accent-soft text-accent",
  completed: "bg-success-soft text-success",
  archived: "bg-muted text-secondary/60",
};

const STATUS_KEYS: Record<string, string> = {
  draft: "proj.status.draft",
  ready: "proj.status.ready",
  completed: "proj.status.completed",
  archived: "proj.status.archived",
};

const PRIMARY_LINK = `${buttonBaseClasses} ${buttonVariantClasses.primary}`;
const BACK_LINK =
  "inline-flex h-9 min-w-[220px] items-center justify-center gap-2 rounded-control bg-[#4B5563] px-5 text-sm font-medium text-white transition-colors duration-150 hover:bg-[#5E6B78] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent select-none";

function formatDate(d: string | null, lang: UILanguage): string {
  if (!d) return "-";
  return new Date(d).toLocaleDateString(localeForLang(lang), { year: "numeric", month: "short", day: "numeric" });
}

export default function ProjectDashboard() {
  const { id } = useParams<{ id: string }>();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { uiLang } = useUiLang();
  const T = (key: string, params?: Record<string, string | number>) => t(uiLang, key, params);
  const [project, setProject] = useState<ProjectData | null>(null);
  const [report, setReport] = useState<ReportPreview | null>(null);
  const [metricsData, setMetricsData] = useState<{
    computed_metrics: Array<{ metric_name: string; value: unknown; availability: string }>;
    health_score: { health_score: number; health_level: string } | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [schemaMapping, setSchemaMapping] = useState<SchemaMapping | null>(null);
  const schemaSummary = schemaMapping?.schema_understanding ?? null;
  const [loadError, setLoadError] = useState(false);
  const token = typeof window !== "undefined" ? localStorage.getItem(TOKEN_KEY) : null;

  useEffect(() => { if (!authLoading && !user) router.push("/login"); }, [authLoading, user, router]);

  useEffect(() => {
    if (!token || !id) return;
    apiFetch(API + "/api/projects/" + id, { headers: { Authorization: "Bearer " + token } })
      .then(async (r) => {
        if (r.status === 404) { router.push("/"); return; }
        if (!r.ok) throw new Error("Project fetch failed");
        const p = await r.json();
        setProject(p);
      })
      .catch(() => setLoadError(true))
      .finally(() => setLoading(false));
    apiFetch(API + "/api/projects/" + id + "/timeline", { headers: { Authorization: "Bearer " + token } })
      .then(r => r.json())
      .then((data: TimelineItem[]) => setTimeline(data || []))
      .catch(() => {});
    apiFetch(API + "/api/projects/" + id + "/schema-mapping", { headers: { Authorization: "Bearer " + token } })
      .then(async (r) => { if (!r.ok) return null; const d = await r.json(); return d.schema_mapping ?? null; })
      .then((m: SchemaMapping | null) => setSchemaMapping(m))
      .catch(() => setSchemaMapping(null));
  }, [token, id, router]);

  // Pull the latest executive report so the dashboard renders real conclusions.
  useEffect(() => {
    if (!token || !id) return;
    apiFetch(API + "/api/projects/" + id + "/executive", { headers: { Authorization: "Bearer " + token } })
      .then(async (r) => { if (!r.ok) return null; return r.json(); })
      .then((data: ReportPreview | null) => setReport(data))
      .catch(() => setReport(null));
    apiFetch(API + "/api/projects/" + id + "/metrics", { headers: { Authorization: "Bearer " + token } })
      .then(async (r) => { if (!r.ok) return null; return r.json(); })
      .then((data: { computed_metrics: Array<{ metric_name: string; value: unknown; availability: string }>; health_score: { health_score: number; health_level: string } | null } | null) => setMetricsData(data))
      .catch(() => setMetricsData(null));
  }, [token, id]);

  async function handleReplaceFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !token) return;
    setUploading(true);
    try {
      const fd = new FormData(); fd.append("file", file);
      const r = await apiFetch(API + "/api/upload", { method: "POST", headers: { Authorization: "Bearer " + token }, body: fd });
      if (!r.ok) throw new Error("Upload failed");
      const up = await r.json();
      await apiFetch(API + "/api/projects/" + id + "/file", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
        body: JSON.stringify({ original_filename: up.original_filename, saved_filename: up.saved_filename }),
      });
      setProject((p) => p ? { ...p, original_filename: up.original_filename, saved_filename: up.saved_filename, status: "ready" } : p);
    } catch { /* ignore */ }
    finally { setUploading(false); }
  }

  if (authLoading || loading) {
    return <main className="flex min-h-screen items-center justify-center bg-canvas"><p className="text-sm text-secondary">{T("home.loading")}</p></main>;
  }
  if (loadError) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-canvas px-4">
        <div className="w-full max-w-md rounded-card border border-border bg-surface p-8 text-center">
          <p className="text-base font-medium text-ink">{T("proj.loadError")}</p>
          <p className="mt-2 text-sm leading-relaxed text-secondary">{T("proj.loadErrorDesc")}</p>
          <div className="mt-6 flex justify-center gap-3">
            <Button variant="secondary" onClick={() => router.push("/")}>{T("nav.backWorkspace")}</Button>
            <Button onClick={() => window.location.reload()}>{T("proj.retry")}</Button>
          </div>
        </div>
      </main>
    );
  }
  if (!project) return null;

  const statusKey = STATUS_KEYS[project.status] || STATUS_KEYS.draft;
  const statusColor = STATUS_COLORS[project.status] || STATUS_COLORS.draft;
  const hasFile = !!project.original_filename;
  const completed = project.status === "completed";
  const insightCount = report?.top_insights?.length ?? 0;
  const riskCount = report?.top_risks?.length ?? 0;
  const recCount = report?.top_recommendations?.length ?? 0;
  const latestVerification = timeline.find((item) => item.analysis_type === "verification") ?? null;
  const healthFallback = metricsData?.health_score
    ? { score: metricsData.health_score.health_score, level: metricsData.health_score.health_level }
    : null;
  const healthScore = report?.business_health ?? healthFallback;
  const dateRangeMetric = metricsData?.computed_metrics?.find(
    (m) => m.metric_name === "date_range" && m.availability === "available",
  );
  const dateRangeValue = dateRangeMetric?.value && typeof dateRangeMetric.value === "object"
    ? (dateRangeMetric.value as { min?: string; max?: string })
    : null;
  const dataPeriod = dateRangeValue && (dateRangeValue.min || dateRangeValue.max)
    ? `${dateRangeValue.min || ""} ~ ${dateRangeValue.max || ""}`
    : "";
  const latestFullRun = timeline.find(
    (item) => item.analysis_type === "health_scan" || item.analysis_type === "deep_analysis",
  ) ?? null;

  return (
    <main className="min-h-screen bg-canvas">
      {/* Header */}
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-5xl flex-col gap-5 px-4 py-6 md:flex-row md:items-center md:justify-between md:px-8">
          <div className="min-w-0">
            <Link href="/" className={BACK_LINK}>{T("proj.backProjectList")}</Link>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-ink md:text-3xl">{project.title}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5">
              <span className="text-sm capitalize text-secondary">{project.industry}</span>
              <span className="text-border">&middot;</span>
              <span className="text-sm text-secondary">{T(`proj.language.${project.language}`)}</span>
              <span className="text-border">&middot;</span>
              <span className="text-sm text-secondary">{T("proj.created", { date: formatDate(project.created_at, uiLang) })}</span>
              <span className="text-border">&middot;</span>
              <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusColor}`}>{T(statusKey)}</span>
              <span className="text-border">&middot;</span>
              <span className="inline-flex items-center gap-1 rounded-full bg-success-soft px-2.5 py-1 text-xs font-medium text-success">
                {T("proj.secure")}
              </span>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            {completed ? (
              <Link href={`/project/${id}/executive`} className={PRIMARY_LINK}>
                {T("proj.viewFullReport")}
              </Link>
            ) : (
              <Link href={`/project/${id}/analysis`} className={PRIMARY_LINK}>
                {T("proj.startAnalysisExcel")}
              </Link>
            )}
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl space-y-8 px-4 py-10 md:px-8">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <MetricCard
            label={T("landing.diff.businessHealth")}
            value={healthScore ? healthScore.score : "\u2014"}
            description={healthScore ? healthScore.level : hasFile ? T("proj.pending") : T("proj.healthNoData")}
          />
          <MetricCard
            label={T("report.kpi.findings")}
            value={insightCount > 0 ? String(insightCount) : "\u2014"}
            description={insightCount > 0 ? T("proj.insightCount", { n: insightCount }) : T("proj.pending")}
          />
          <MetricCard
            label={T("report.kpi.risks")}
            value={riskCount > 0 ? String(riskCount) : "\u2014"}
            description={riskCount > 0 ? T("proj.riskCount", { n: riskCount }) : T("proj.pending")}
          />
          <MetricCard
            label={T("report.kpi.suggestions")}
            value={recCount > 0 ? String(recCount) : "\u2014"}
            description={recCount > 0 ? T("proj.suggestionCount", { n: recCount }) : T("proj.pending")}
          />
        </div>

        {/* Business Memory (M2.12.4) */}
        <BusinessMemoryCard projectId={id} lang={uiLang} />
        {/* Key Conclusions (real data) */}
        {report && (insightCount > 0 || riskCount > 0 || recCount > 0) && (
          <Card>
            <h2 className="text-h3 text-ink">{T("proj.conclusions")}</h2>
            <div className="mt-4 grid gap-6 md:grid-cols-3">
              <div>
                <p className="text-caption font-medium text-secondary">{T("report.kpi.findings")}</p>
                <ul className="mt-3 space-y-4">
                  {report.top_insights.slice(0, 3).map((item, i) => (
                    <li key={i} className="flex gap-3">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent-soft text-xs font-semibold text-accent">{i + 1}</span>
                      <div className="min-w-0">
                        <p className="text-[15px] font-medium leading-snug text-ink">{item.title}</p>
                        <p className="mt-0.5 line-clamp-2 text-sm leading-relaxed text-secondary">{item.description}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-caption font-medium text-secondary">{T("report.kpi.risks")}</p>
                <ul className="mt-3 space-y-4">
                  {report.top_risks.slice(0, 3).map((item, i) => (
                    <li key={i} className="flex gap-3">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-warning-soft text-xs font-semibold text-warning">{i + 1}</span>
                      <div className="min-w-0">
                        <p className="text-[15px] font-medium leading-snug text-ink">{item.title}</p>
                        <p className="mt-0.5 line-clamp-2 text-sm leading-relaxed text-secondary">{item.description}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-caption font-medium text-secondary">{T("proj.opportunities")}</p>
                <ul className="mt-3 space-y-4">
                  {report.top_recommendations.slice(0, 3).map((item, i) => (
                    <li key={i} className="flex gap-3">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-success-soft text-xs font-semibold text-success">{i + 1}</span>
                      <div className="min-w-0">
                        <p className="text-[15px] font-medium leading-snug text-ink">{item.title}</p>
                        <p className="mt-0.5 line-clamp-2 text-sm leading-relaxed text-secondary">{item.description}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Card>
        )}

        {/* Analysis Direction (M2.14.4: focused insight for completed projects) */}
        {hasFile && (
          <Card>
            <h2 className="text-h3 text-ink">{T(completed ? "analysis.focusTitle" : "analysis.selectDirection")}</h2>
            <p className="mt-1 text-sm text-secondary">{completed ? T("analysis.focusHint") : T("analysis.selectDirectionDesc")}</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {ANALYSIS_DIRECTIONS.map((d) => {
                const latestFullRun = timeline.find((item) => item.analysis_type === "health_scan" || item.analysis_type === "deep_analysis");
                const href = completed && latestFullRun
                  ? `/project/${id}/focused-insight?topic=${d}&parent_run_id=${latestFullRun.id}`
                  : `/project/${id}/analysis?direction=${d}`;
                return (
                  <Link key={d} href={href} className="block h-full">
                    <div className="flex h-full flex-col gap-2 rounded-card border border-border bg-surface p-4 transition-colors hover:border-accent/40 hover:bg-canvas">
                      <span className="flex h-8 w-8 items-center justify-center rounded-control bg-canvas text-sm font-bold text-secondary">{analysisDirectionIcon(d, uiLang)}</span>
                      <span className="text-sm font-semibold leading-snug text-ink">{T(`analysis.dir.${d}`)}</span>
                      <span className="text-caption leading-relaxed text-secondary">{completed ? T("analysis.focusCta") : T(`analysis.dir.${d}.desc`)}</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </Card>
        )}

        {/* Latest Report */}
        <Card>
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0">
              <h2 className="text-h3 text-ink">{T("proj.latestAnalysis")}</h2>
              <p className="mt-1.5 max-w-[640px] text-sm leading-relaxed text-secondary">
                {report?.executive_summary?.content
                  ? report.executive_summary.content.slice(0, 200) + "..."
                  : project.latest_summary
                    ? project.latest_summary.slice(0, 200) + "..."
                    : hasFile ? T("proj.noAnalysisYet") : T("proj.uploadFirst")}
              </p>
              <p className="mt-1 text-caption text-secondary">
                {completed ? T("proj.reportReady") : hasFile ? T("proj.uploadedReady") : T("proj.uploadFirst")}
              </p>
              {latestFullRun?.created_at && (
                <p className="mt-1 text-caption text-secondary">{T("proj.latestAnalysisAt", { date: formatDate(latestFullRun.created_at, uiLang) })}</p>
              )}
              {dataPeriod && (
                <p className="mt-1 text-caption text-secondary">{T("proj.dataPeriod", { period: dataPeriod })}</p>
              )}
            </div>
            {completed ? (
              <Link href={`/project/${id}/executive`} className={`${PRIMARY_LINK} shrink-0`}>
                {T("proj.viewFullReport")}
              </Link>
            ) : (
              <Link href={`/project/${id}/analysis`} className={`${PRIMARY_LINK} shrink-0`}>
                {T("proj.startAnalysisExcel")}
              </Link>
            )}
          </div>
        </Card>

        {/* Latest Verification */}
        {latestVerification && (
          <Card variant="highlighted">
            <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
              <div className="min-w-0">
                <h2 className="text-h3 text-ink">{T("proj.latestVerification")}</h2>
                <p className="mt-1.5 max-w-[640px] text-sm leading-relaxed text-secondary">
                  {latestVerification.summary || T("proj.latestVerificationDesc")}
                </p>
                <p className="mt-1 text-caption text-secondary">
                  {latestVerification.dataset_version ? `${latestVerification.dataset_version}` : ""}
                </p>
              </div>
              <Link href={`/project/${id}/verification/${latestVerification.id}`} className={`${PRIMARY_LINK} shrink-0`}>
                {T("proj.viewVerification")}
              </Link>
            </div>
          </Card>
        )}

        {/* Next Actions */}
        <Card>
          <h2 className="text-h3 text-ink">{T("proj.nextSteps")}</h2>
          {completed ? (
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <Link href={`/project/${id}/executive`} className="block h-full">
                <Card variant="interactive" className="h-full p-5">
                  <p className="text-[15px] font-medium text-ink">{T("proj.nextActionViewReport")}</p>
                  <p className="mt-1 text-sm leading-relaxed text-secondary">{T("proj.nextActionViewReportDesc")}</p>
                </Card>
              </Link>
              <Card variant="subtle" className="p-5">
                <p className="text-[15px] font-medium text-ink">{T("proj.nextActionExecute")}</p>
                <p className="mt-1 text-sm leading-relaxed text-secondary">{T("proj.nextActionExecuteDesc")}</p>
              </Card>
              <Link href={`/project/${id}/verify`} className="block h-full">
                <Card variant="interactive" className="h-full p-5">
                  <p className="text-[15px] font-medium text-ink">{T("proj.nextActionVerify")}</p>
                  <p className="mt-1 text-sm leading-relaxed text-secondary">{T("proj.nextActionVerifyDesc")}</p>
                </Card>
              </Link>
            </div>
          ) : (
            <div className="mt-4 grid gap-4 sm:grid-cols-3">
              <Card variant="subtle" className="p-5">
                <p className="text-[15px] font-medium text-ink">{T("proj.step.upload")}</p>
                <p className="mt-1 text-sm leading-relaxed text-secondary">{T("proj.step.uploadDesc")}</p>
              </Card>
              <Card variant="subtle" className="p-5">
                <p className="text-[15px] font-medium text-ink">{T("proj.startAnalysisExcel")}</p>
                <p className="mt-1 text-sm leading-relaxed text-secondary">{T("proj.step.runDesc")}</p>
              </Card>
              <Card variant="subtle" className="p-5">
                <p className="text-[15px] font-medium text-ink">{T("proj.step.review")}</p>
                <p className="mt-1 text-sm leading-relaxed text-secondary">{T("proj.step.reviewDesc")}</p>
              </Card>
            </div>
          )}
        </Card>

        {/* Business Timeline */}
        <Card>
          <h2 className="text-h3 text-ink">{T("landing.diff.timeline")}</h2>
          {timeline.length === 0 ? (
            <div className="mt-4 rounded-card border border-dashed border-border bg-canvas p-10 text-center">
              <p className="text-base font-medium text-secondary">{T("proj.timelineEmpty")}</p>
              <p className="mt-1 text-sm text-secondary">{T("proj.timelineEmptyDesc")}</p>
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              {timeline.map((item) => {
                const score = item.business_health_score;
                const color = score != null
                  ? score >= 90 ? "border-l-success bg-success-soft"
                  : score >= 75 ? "border-l-accent bg-accent-soft"
                  : score >= 60 ? "border-l-warning bg-warning-soft"
                  : "border-l-danger bg-danger-soft"
                  : "border-l-border bg-canvas";
                const dateStr = item.created_at
                  ? new Date(item.created_at).toLocaleDateString(localeForLang(uiLang), { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
                  : "";
                const isVerification = item.analysis_type === "verification";
                const typeLabel = isVerification
                  ? T("proj.timeline.verification")
                  : item.analysis_type === "focused_insight"
                    ? T("proj.timeline.focusedInsight")
                    : item.analysis_type === "health_scan"
                      ? T("proj.timeline.healthScan")
                      : T(`analysis.dir.${item.analysis_direction ?? "growth_opportunity"}`);
                const reportHref = isVerification
                  ? `/project/${id}/verification/${item.id}`
                  : `/project/${id}/report/${item.id}`;
                return (
                  <div key={item.id} className={`rounded-card border border-border border-l-4 ${color} p-4`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {score != null && <span className="text-lg font-semibold text-ink tabular-nums">{score}</span>}
                        <div>
                          <span className="text-caption font-medium text-secondary">{typeLabel}</span>
                          {item.dataset_version && <span className="ml-2 text-caption text-secondary">{item.dataset_version}</span>}
                        </div>
                        <span className="text-caption text-secondary">{dateStr}</span>
                      </div>
                      <Link href={reportHref} className="text-sm font-medium text-accent hover:underline">{isVerification ? T("proj.viewVerification") : T("proj.viewReport")}</Link>
                    </div>
                    {item.summary && <p className="mt-2 text-sm leading-relaxed text-secondary line-clamp-2">{item.summary}</p>}
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Dataset */}
        <Card id="dataset">
          <h2 className="text-h3 text-ink">{T("proj.dataset")}</h2>
          {hasFile ? (
            <div className="mt-4 rounded-control border border-border bg-muted p-4">
              <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
              <div className="min-w-0">
                  <p className="truncate text-[15px] font-medium text-ink">{project.original_filename}</p>
                  <p className="mt-0.5 text-caption text-secondary">{completed ? T("proj.datasetHint") : T("proj.uploadedReady")}</p>
                {schemaMapping && schemaMapping.mappings.length > 0 && (
                  <div className="mt-3">
                    <p className="text-caption font-medium text-secondary">{T("schema.fieldsRecognized")}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {schemaMapping.mappings
                        .filter((m) => m.availability === "available")
                        .map((m) => {
                          const meta = schemaFieldMeta(m.canonical_key);
                          return (
                            <span
                              key={m.canonical_key + ":" + (m.source_column ?? "")}
                              title={m.source_column ?? ""}
                              className="inline-flex items-center gap-1.5 rounded-full bg-success-soft px-2.5 py-1 text-xs font-medium text-success"
                            >
                              <span aria-hidden>{meta.icon}</span>
                              {T(meta.labelKey)}
                            </span>
                          );
                        })}
                      {schemaMapping.missing.slice(0, 6).map((key) => {
                        const meta = schemaFieldMeta(key);
                        return (
                          <span
                            key={key}
                            className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-secondary"
                          >
                            <span aria-hidden>{meta.icon}</span>
                            {T(meta.labelKey)} · {T("schema.field.unavailable")}
                          </span>
                        );
                      })}
                    </div>
                    <p className="mt-2 text-caption text-secondary">{T("schema.detectHint")}</p>
                  </div>
                )}
                {schemaSummary && (
                  <div className="mt-3 rounded-control border border-border bg-muted/40 p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-medium text-ink">{T("schema.understanding.title")}</p>
                      <span className="text-xs font-medium text-secondary">
                        {T("schema.understanding.qualityScore")}: {schemaSummary.quality_score}
                      </span>
                    </div>
                    <p className="mt-2 text-caption font-medium text-secondary">{T("schema.understanding.coreFields")}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {schemaSummary.core_fields.map((f) => {
                        const meta = schemaFieldMeta(f.canonical_key);
                        const ok = f.status === "recognized" && f.confidence_tier === "high";
                        return (
                          <span
                            key={f.canonical_key + ":" + f.source_column}
                            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${ok ? "bg-success-soft text-success" : "bg-warning-soft text-warning"}`}
                          >
                            <span aria-hidden>{meta.icon}</span>
                            {T(meta.labelKey)} · {ok ? T("schema.understanding.status.recognized") : T("schema.understanding.status.needs_review")}
                          </span>
                        );
                      })}
                    </div>
                    <p className="mt-3 text-caption font-medium text-secondary">{T("schema.understanding.riskFields")}</p>
                    {schemaSummary.risk_fields.length > 0 ? (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {schemaSummary.risk_fields.map((f) => (
                          <span key={f.canonical_key + ":" + f.source_column} className="inline-flex items-center rounded-full bg-warning-soft px-2.5 py-1 text-xs font-medium text-warning">
                            {schemaFieldMeta(f.canonical_key).labelKey ? T(schemaFieldMeta(f.canonical_key).labelKey) : f.canonical_key}
                            · {f.source_column}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-1 text-caption text-secondary">{T("schema.understanding.noRisk")}</p>
                    )}
                  </div>
                )}
                {schemaMapping && (
                  <div className="mt-3">
                    <SchemaConfirmationPanel
                      mapping={schemaMapping}
                      lang={uiLang}
                      projectId={id}
                      token={token}
                      onChanged={setSchemaMapping}
                    />
                  </div>
                )}
              </div>
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  {completed && (
                    <>
                      <Link href={`/project/${id}/verify`} className="inline-flex h-9 items-center justify-center rounded-control bg-ink px-4 text-sm font-medium text-white transition-colors hover:bg-ink-hover">
                        {T("proj.verifyOptimization")}
                      </Link>
                      <Link href={`/project/${id}/analysis`} className="inline-flex h-9 items-center justify-center rounded-control border border-border bg-surface px-4 text-sm font-medium text-ink transition-colors hover:bg-canvas">
                        {T("proj.reanalyzeData")}
                      </Link>
                    </>
                  )}
                  <label className="inline-flex h-9 cursor-pointer items-center rounded-control border border-border bg-surface px-4 text-sm font-medium text-ink transition-colors hover:bg-canvas">
                    {uploading ? T("proj.uploading") : T("proj.reuploadData")}
                    <input type="file" accept=".xlsx,.xls" onChange={handleReplaceFile} className="hidden" disabled={uploading} />
                  </label>
                </div>
              </div>
            </div>
          ) : (
            <div className="mt-4 rounded-card border border-dashed border-border bg-canvas p-10 text-center">
              <p className="text-base font-medium text-secondary">{T("proj.noDataset")}</p>
              <div className="mt-4 flex justify-center">
                <Button
                  onClick={() => document.getElementById("ws-file-input")?.click()}
                >
                  {uploading ? T("proj.uploading") : T("proj.step.upload")}
                </Button>
                <input id="ws-file-input" type="file" accept=".xlsx,.xls" onChange={handleReplaceFile} className="hidden" disabled={uploading} />
              </div>
            </div>
          )}
        </Card>
      </div>
    </main>
  );
}
