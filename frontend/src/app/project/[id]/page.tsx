"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { TOKEN_KEY, apiFetch } from "@/lib/apiFetch";
import { useAuth } from "@/lib/AuthContext";
import { localeForLang, t, UILanguage } from "@/lib/i18n";
import { useUiLang } from "@/lib/useUiLang";
import { Button, Card, MetricCard } from "@/components/ui";

interface ProjectData {
  id: number; title: string; industry: string; language: string;
  original_filename: string | null; saved_filename: string | null;
  status: string; created_at: string | null; updated_at: string | null; latest_summary: string | null;
}

const API = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

interface TimelineItem { id: number; created_at: string | null; business_health_score: number | null; summary: string | null; }

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-canvas text-secondary",
  ready: "bg-accent/10 text-accent",
  completed: "bg-success/10 text-success",
  archived: "bg-canvas text-secondary/60",
};

const STATUS_KEYS: Record<string, string> = {
  draft: "proj.status.draft",
  ready: "proj.status.ready",
  completed: "proj.status.completed",
  archived: "proj.status.archived",
};

const PRIMARY_LINK =
  "inline-flex h-11 items-center justify-center rounded-control bg-ink px-5 text-sm font-medium text-white transition-colors hover:bg-[#3A3A3C]";
const SECONDARY_LINK =
  "inline-flex h-11 items-center justify-center rounded-control border border-border bg-surface px-5 text-sm font-medium text-ink transition-colors hover:bg-canvas";

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
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const token = typeof window !== "undefined" ? localStorage.getItem(TOKEN_KEY) : null;

  useEffect(() => { if (!authLoading && !user) router.push("/login"); }, [authLoading, user, router]);

  useEffect(() => {
    if (!token || !id) return;
    apiFetch(API + "/api/projects/" + id, { headers: { Authorization: "Bearer " + token } })
      .then((r) => (r.ok ? r.json() : null))
      .then((p) => { if (p) setProject(p); else router.push("/"); })
      .catch(() => router.push("/"))
      .finally(() => setLoading(false));
    apiFetch(API + "/api/projects/" + id + "/timeline", { headers: { Authorization: "Bearer " + token } })
      .then(r => r.json())
      .then((data: TimelineItem[]) => setTimeline(data || []))
      .catch(() => {});
  }, [token, id, router]);

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
  if (!project) return null;

  const statusKey = STATUS_KEYS[project.status] || STATUS_KEYS.draft;
  const statusColor = STATUS_COLORS[project.status] || STATUS_COLORS.draft;
  const hasFile = !!project.original_filename;

  return (
    <main className="min-h-screen bg-canvas">
      {/* Header */}
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-5xl flex-col gap-5 px-4 py-6 md:flex-row md:items-center md:justify-between md:px-8">
          <div className="min-w-0">
            <Link href="/" className="text-sm text-secondary transition-colors hover:text-ink">{T("nav.backWorkspace")}</Link>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-ink md:text-3xl">{project.title}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5">
              <span className="text-sm capitalize text-secondary">{project.industry}</span>
              <span className="text-border">&middot;</span>
              <span className="text-sm text-secondary">{project.language === "zh" ? "中文" : project.language === "ja" ? "日本語" : project.language === "de" ? "Deutsch" : "English"}</span>
              <span className="text-border">&middot;</span>
              <span className="text-sm text-secondary">{T("proj.created", { date: formatDate(project.created_at, uiLang) })}</span>
              <span className="text-border">&middot;</span>
              <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusColor}`}>{T(statusKey)}</span>
              <span className="text-border">&middot;</span>
              <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2.5 py-1 text-xs font-medium text-success">
                {T("proj.secure")}
              </span>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-3">
            {project.status === "completed" && (
              <Link href={`/project/${id}/executive`} className={SECONDARY_LINK}>
                {T("proj.executiveReport")}
              </Link>
            )}
            <Link href={`/project/${id}/analysis`} className={PRIMARY_LINK}>
              {hasFile ? T("proj.continueAnalysis") : T("proj.startAnalysis")}
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl space-y-8 px-4 py-10 md:px-8">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <MetricCard label={T("landing.diff.businessHealth")} value={project.status === "completed" ? "\u2713" : hasFile ? "--" : "\u2014"} description={project.status === "completed" ? T("proj.healthReady") : hasFile ? T("proj.healthRun") : T("proj.healthNoData")} />
          <MetricCard label={T("report.kpi.findings")} value={project.status === "completed" ? "\u2713" : "\u2014"} description={project.status === "completed" ? T("proj.available") : T("proj.pending")} />
          <MetricCard label={T("report.kpi.risks")} value={project.status === "completed" ? "\u2713" : "\u2014"} description={project.status === "completed" ? T("proj.available") : T("proj.pending")} />
          <MetricCard label={T("report.kpi.suggestions")} value={project.status === "completed" ? "\u2713" : "\u2014"} description={project.status === "completed" ? T("proj.available") : T("proj.pending")} />
        </div>

        {/* Latest Report */}
        <Card>
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div className="min-w-0">
              <h2 className="text-h3 text-ink">{T("proj.latestAnalysis")}</h2>
              <p className="mt-1.5 max-w-[640px] text-sm leading-relaxed text-secondary">
                {project.status === "completed" && project.latest_summary ? project.latest_summary.slice(0, 200) + "..." : hasFile ? T("proj.noAnalysisYet") : T("proj.uploadFirst")}
              </p>
              <p className="mt-1 text-caption text-secondary">{hasFile ? T("proj.clickContinue") : T("proj.useStart")}</p>
            </div>
            <Link href={`/project/${id}/analysis`} className={`${PRIMARY_LINK} shrink-0`}>
              {hasFile ? T("proj.continueAnalysis") : T("proj.startAnalysis")} →
            </Link>
          </div>
        </Card>

        {/* Next Actions */}
        <Card>
          <h2 className="text-h3 text-ink">{T("proj.nextSteps")}</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-3">
            {[
              { title: T("proj.step.upload"), desc: T("proj.step.uploadDesc") },
              { title: T("proj.step.run"), desc: T("proj.step.runDesc") },
              { title: T("proj.step.review"), desc: T("proj.step.reviewDesc") },
            ].map((item, i) => (
              <Card key={i} variant="subtle" className="p-5">
                <p className="text-[15px] font-medium text-ink">{item.title}</p>
                <p className="mt-1 text-sm leading-relaxed text-secondary">{item.desc}</p>
              </Card>
            ))}
          </div>
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
                  ? score >= 90 ? "border-l-success bg-success/5"
                  : score >= 75 ? "border-l-accent bg-accent/5"
                  : score >= 60 ? "border-l-warning bg-warning/5"
                  : "border-l-danger bg-danger/5"
                  : "border-l-border bg-canvas";
                const dateStr = item.created_at
                  ? new Date(item.created_at).toLocaleDateString(localeForLang(uiLang), { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
                  : "";
                return (
                  <div key={item.id} className={`rounded-card border border-border border-l-4 ${color} p-4`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {score != null && <span className="text-lg font-semibold text-ink tabular-nums">{score}</span>}
                        <span className="text-caption text-secondary">{dateStr}</span>
                      </div>
                      <Link href={`/project/${id}/report/${item.id}`} className="text-sm font-medium text-accent hover:underline">{T("proj.viewReport")}</Link>
                    </div>
                    {item.summary && <p className="mt-2 text-sm leading-relaxed text-secondary line-clamp-2">{item.summary}</p>}
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Dataset */}
        <Card>
          <h2 className="text-h3 text-ink">{T("proj.dataset")}</h2>
          {hasFile ? (
            <div className="mt-4 flex flex-col items-start justify-between gap-4 rounded-control border border-border bg-canvas p-4 sm:flex-row sm:items-center">
              <div className="min-w-0">
                <p className="truncate text-[15px] font-medium text-ink">{project.original_filename}</p>
                <p className="mt-0.5 text-caption text-secondary">{T("proj.uploadedReady")}</p>
              </div>
              <label className="inline-flex h-9 shrink-0 cursor-pointer items-center rounded-control border border-border bg-surface px-4 text-sm font-medium text-ink transition-colors hover:bg-canvas">
                {uploading ? T("proj.uploading") : T("proj.replaceDataset")}
                <input type="file" accept=".xlsx,.xls" onChange={handleReplaceFile} className="hidden" disabled={uploading} />
              </label>
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