"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { apiFetch } from "@/lib/apiFetch";
import { useAuth } from "@/lib/AuthContext";
import { t } from "@/lib/i18n";
import { useUiLang } from "@/lib/useUiLang";
import { Card } from "@/components/ui";
import { buttonBaseClasses, buttonVariantClasses } from "@/components/ui/Button";
import {
  VERIFICATION_PURPOSES,
  VERIFICATION_PURPOSE_ICONS,

  type VerificationPurpose,
} from "@/lib/verificationPurposes";
import { useVerificationJob } from "@/lib/useVerificationJob";

const API = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";
const PRIMARY = `${buttonBaseClasses} ${buttonVariantClasses.primary}`;
const SECONDARY = `${buttonBaseClasses} ${buttonVariantClasses.secondary}`;

interface ProjectData {
  id: number;
  title: string;
  status: string;
  original_filename: string | null;
  saved_filename: string | null;
}

interface TimelineItem {
  id: number;
  created_at: string | null;
  business_health_score: number | null;
  summary: string | null;
  analysis_type: string | null;
  analysis_direction: string | null;
  parent_run_id: number | null;
  dataset_version: string | null;
  purpose: string | null;
}

interface RunMeta {
  recommendationCount: number;
  metricCount: number;
}

interface UploadedFile {
  original_filename: string;
  saved_filename: string;
}

function parseRunMeta(resultJson: string | null): RunMeta {
  if (!resultJson) return { recommendationCount: 0, metricCount: 0 };
  try {
    const data = JSON.parse(resultJson);
    return {
      recommendationCount: Array.isArray(data.recommendations) ? data.recommendations.length : 0,
      metricCount: Array.isArray(data.metrics) ? data.metrics.length : 0,
    };
  } catch {
    return { recommendationCount: 0, metricCount: 0 };
  }
}

export default function VerifyPage() {
  const { id } = useParams<{ id: string }>();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { uiLang } = useUiLang();
  const T = (key: string, params?: Record<string, string | number>) => t(uiLang, key, params);

  const projectId = Number(id);
  const [project, setProject] = useState<ProjectData | null>(null);
  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [runMeta, setRunMeta] = useState<Record<number, RunMeta>>({});
  const [purpose, setPurpose] = useState<VerificationPurpose | null>(null);
  const [parentRunId, setParentRunId] = useState<number | null>(null);
  const [newFile, setNewFile] = useState<UploadedFile | null>(null);
  const [uploading, setUploading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);

  const jobIdParam = searchParams.get("job_id");
  const initialJobId = jobIdParam && Number.isFinite(Number(jobIdParam)) ? Number(jobIdParam) : null;
  const jobFlow = useVerificationJob(
    Number.isFinite(projectId) && projectId > 0 ? projectId : null,
    initialJobId,
  );

  useEffect(() => { if (!authLoading && !user) router.push("/login"); }, [authLoading, user, router]);

  useEffect(() => {
    if (!projectId || !Number.isFinite(projectId)) return;
    apiFetch(`${API}/api/projects/${projectId}`)
      .then(async (r) => {
        if (r.status === 404) { router.push("/"); return null; }
        if (!r.ok) throw new Error("Project fetch failed");
        return r.json();
      })
      .then((p) => { if (p) setProject(p); })
      .catch(() => setLoadError(true));

    apiFetch(`${API}/api/projects/${projectId}/timeline`)
      .then(async (r) => { if (!r.ok) return []; return r.json(); })
      .then((data: TimelineItem[]) => setTimeline(data || []))
      .catch(() => setTimeline([]));
  }, [projectId, router]);

  const candidates = useMemo(
    () => timeline.filter((item) => item.analysis_type === "health_scan" || item.analysis_type === "deep_analysis"),
    [timeline],
  );

  // M2.14.4: default to the most recent full analysis as comparison baseline.
  useEffect(() => {
    if (candidates.length > 0 && parentRunId === null) {
      setParentRunId(candidates[0].id);
    }
  }, [candidates, parentRunId]);

  // Load recommendation/metric counts for candidate runs.
  useEffect(() => {
    if (candidates.length === 0) return;
    let cancelled = false;
    Promise.all(
      candidates.map((c) =>
        apiFetch(`${API}/api/analysis-runs/${c.id}`)
          .then(async (r) => (r.ok ? r.json() : null))
          .catch(() => null),
      ),
    ).then((results) => {
      if (cancelled) return;
      const map: Record<number, RunMeta> = {};
      results.forEach((data, idx) => {
        const c = candidates[idx];
        if (data && c) map[c.id] = parseRunMeta(data.result_json);
      });
      setRunMeta(map);
    });
    return () => { cancelled = true; };
  }, [candidates]);

  useEffect(() => {
    const job = jobFlow.job;
    if (job?.status === "completed" && job.result_run_id) {
      router.push(`/project/${projectId}/verification/${job.result_run_id}`);
    }
  }, [jobFlow.job, projectId, router]);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setPageError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const r = await apiFetch(`${API}/api/upload`, { method: "POST", body: fd });
      if (!r.ok) throw new Error("Upload failed");
      const up = await r.json();
      setNewFile({ original_filename: up.original_filename, saved_filename: up.saved_filename });
    } catch {
      setPageError(T("verify.uploadError"));
    } finally {
      setUploading(false);
    }
  }

  async function startVerification() {
    if (!newFile) return;
    setPageError(null);
    const effectivePurpose = purpose ?? "general_verification";
    const created = await jobFlow.create({
      parent_run_id: parentRunId,
      purpose: effectivePurpose,
      saved_filename: newFile.saved_filename,
      original_filename: newFile.original_filename,
      idempotency_key: `verify:${projectId}:${parentRunId ?? "auto"}:${effectivePurpose}:${newFile.saved_filename}`,
    });
    if (created?.job_id) {
      router.replace(`/project/${projectId}/verify?job_id=${created.job_id}`, { scroll: false });
    }
  }

  if (authLoading) {
    return <main className="flex min-h-screen items-center justify-center bg-canvas"><p className="text-sm text-secondary">{T("home.loading")}</p></main>;
  }
  if (loadError) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-canvas px-4">
        <Card className="w-full max-w-md p-8 text-center">
          <p className="text-lg font-semibold text-ink">{T("proj.loadError")}</p>
          <div className="mt-6 flex justify-center gap-3">
            <Link href={`/project/${projectId}`} className={SECONDARY}>{T("verify.backProject")}</Link>
            <button type="button" onClick={() => window.location.reload()} className={PRIMARY}>{T("proj.retry")}</button>
          </div>
        </Card>
      </main>
    );
  }
  if (!project) return null;

  const job = jobFlow.job;
  const failedJob = job?.status === "failed";
  const hookError = jobFlow.error;
  const resuming = !!initialJobId && !job;

  return (
    <main className="min-h-screen bg-canvas">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto max-w-3xl px-4 py-6 md:px-6">
          <Link href={`/project/${projectId}`} className="text-sm text-secondary transition-colors hover:text-ink">{T("verify.backProject")}</Link>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-ink md:text-3xl">{T("verify.title")}</h1>
          <p className="mt-2 text-sm leading-relaxed text-secondary">{T("verify.subtitle")}</p>
        </div>
      </header>

      <div className="mx-auto max-w-3xl space-y-6 px-4 py-10 md:px-6">
        {/* Polling / running state */}
        {(job || jobFlow.creating) && !failedJob && job?.status !== "completed" && (
          <VerificationProgress
            status={job?.status === "running" ? "running" : "queued"}
            creating={jobFlow.creating}
            T={T}
            onCancel={() => router.push(`/project/${projectId}`)}
          />
        )}

        {failedJob && (
          <Card>
            <p className="text-lg font-semibold text-danger">{T("verify.jobFailed")}</p>
            <p className="mt-2 text-sm leading-relaxed text-secondary">
              {job?.error_code === "invalid_parent" ? T("verify.errorInvalidParent") : T("verify.jobFailedDesc")}
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <Link href={`/project/${projectId}`} className={SECONDARY}>{T("verify.backProject")}</Link>
              <button type="button" onClick={() => window.location.reload()} className={PRIMARY}>{T("verify.retry")}</button>
            </div>
          </Card>
        )}

        {hookError && !job && (
          <Card>
            <p className="text-lg font-semibold text-danger">{T("verify.jobFailed")}</p>
            <p className="mt-2 text-sm leading-relaxed text-secondary">
              {hookError === "no_parent" ? T("verify.errorInvalidParent") : hookError === "conflict" ? T("verify.errorConflict") : T("verify.jobFailedDesc")}
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <Link href={`/project/${projectId}`} className={SECONDARY}>{T("verify.backProject")}</Link>
              <button type="button" onClick={() => window.location.reload()} className={PRIMARY}>{T("verify.retry")}</button>
            </div>
          </Card>
        )}

        {resuming && !hookError && (
          <Card className="p-8 text-center">
            <p className="text-sm text-secondary">{T("home.loading")}</p>
          </Card>
        )}

        {!job && !jobFlow.creating && !initialJobId && (
          <>
            {/* Step 1: upload next-period data (never blocked by purpose) */}
            <Card>
              <h2 className="text-h3 text-ink">{T("verify.uploadNewTitle")}</h2>
              <p className="mt-1 text-sm leading-relaxed text-secondary">{T("verify.uploadNewDesc")}</p>
              {newFile ? (
                <div className="mt-4 rounded-control border border-border bg-muted p-4">
                  <p className="text-[15px] font-medium text-ink">{newFile.original_filename}</p>
                  <p className="mt-1 text-sm text-secondary">{T("verify.newDataReady")}</p>
                </div>
              ) : (
                <label className="mt-4 inline-flex h-11 cursor-pointer items-center justify-center rounded-control bg-ink px-5 text-sm font-medium text-white transition-colors hover:bg-ink-hover">
                  {uploading ? T("verify.uploading") : T("verify.uploadNewCta")}
                  <input type="file" accept=".xlsx,.xls" onChange={handleUpload} className="hidden" disabled={uploading} />
                </label>
              )}
            </Card>

            {/* Optional focus areas */}
            <PurposeSelector
              selected={purpose}
              onSelect={setPurpose}
              T={T}
            />

            {/* Baseline selection (defaults to the latest full analysis) */}
            <ParentRunSelector
              candidates={candidates}
              runMeta={runMeta}
              selected={parentRunId}
              onSelect={setParentRunId}
              T={T}
            />

            {newFile && (
              <Card variant="highlighted">
                <h2 className="text-h3 text-ink">{T("verify.confirmTitle")}</h2>
                <p className="mt-1 text-sm leading-relaxed text-secondary">{T("verify.confirmDesc")}</p>
                <div className="mt-4 space-y-2 text-sm text-ink">
                  <p>{T("verify.confirmPurpose", { purpose: purpose ? T(`verify.purpose.${purpose}`) : T("verify.purpose.general_verification") })}</p>
                  <p>{T("verify.confirmNewData", { name: newFile.original_filename })}</p>
                </div>
                {pageError && <p className="mt-3 text-sm text-danger">{pageError}</p>}
                <div className="mt-6 flex flex-wrap justify-end gap-3">
                  <button type="button" onClick={() => { setNewFile(null); setPageError(null); }} className={SECONDARY}>{T("verify.changeData")}</button>
                  <button type="button" onClick={startVerification} className={PRIMARY}>{T("verify.startVerification")}</button>
                </div>
              </Card>
            )}
          </>
        )}
      </div>
    </main>
  );
}

function PurposeSelector({ selected, onSelect, T }: {
  selected: VerificationPurpose | null;
  onSelect: (p: VerificationPurpose | null) => void;
  T: (key: string, params?: Record<string, string | number>) => string;
}) {
  return (
    <Card>
      <h2 className="text-h3 text-ink">{T("verify.purposeTitle")}</h2>
      <p className="mt-1 text-sm leading-relaxed text-secondary">{T("verify.purposeDesc")}</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {VERIFICATION_PURPOSES.filter((p) => p !== "general_verification").map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => onSelect(p)}
            className={`flex items-start gap-3 rounded-card border p-4 text-left transition-colors ${selected === p ? "border-accent bg-accent-soft" : "border-border bg-surface hover:border-accent/40 hover:bg-canvas"}`}
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-control bg-canvas text-sm font-bold text-secondary">{VERIFICATION_PURPOSE_ICONS[p]}</span>
            <span>
              <span className="block text-sm font-semibold text-ink">{T(`verify.purpose.${p}`)}</span>
              <span className="mt-0.5 block text-caption leading-relaxed text-secondary">{T(`verify.purpose.${p}.desc`)}</span>
            </span>
          </button>
        ))}
        <button
          type="button"
          onClick={() => onSelect(null)}
          className={`flex items-start gap-3 rounded-card border p-4 text-left transition-colors ${selected === null ? "border-accent bg-accent-soft" : "border-border bg-surface hover:border-accent/40 hover:bg-canvas"}`}
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-control bg-canvas text-sm font-bold text-secondary">◎</span>
          <span>
            <span className="block text-sm font-semibold text-ink">{T("verify.purpose.general_verification")}</span>
            <span className="mt-0.5 block text-caption leading-relaxed text-secondary">{T("verify.purpose.general_verification.desc")}</span>
          </span>
        </button>
      </div>
    </Card>
  );
}

function ParentRunSelector({ candidates, runMeta, selected, onSelect, T }: {
  candidates: TimelineItem[];
  runMeta: Record<number, RunMeta>;
  selected: number | null;
  onSelect: (id: number) => void;
  T: (key: string, params?: Record<string, string | number>) => string;
}) {
  if (candidates.length === 0) {
    return (
      <Card>
        <h2 className="text-h3 text-ink">{T("verify.selectParentTitle")}</h2>
        <p className="mt-1 text-sm leading-relaxed text-secondary">{T("verify.noParent")}</p>
      </Card>
    );
  }
  return (
    <Card>
      <h2 className="text-h3 text-ink">{T("verify.selectParentTitle")}</h2>
      <p className="mt-1 text-sm leading-relaxed text-secondary">{T("verify.selectParentDesc")}</p>
      <div className="mt-4 space-y-3">
        {candidates.map((item) => {
          const meta = runMeta[item.id];
          const active = selected === item.id;
          const label = item.analysis_type === "health_scan" ? T("verify.runType.health_scan") : T(`analysis.dir.${item.analysis_direction ?? "growth_opportunity"}`);
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelect(item.id)}
              className={`flex w-full items-start justify-between gap-4 rounded-card border p-4 text-left transition-colors ${active ? "border-accent bg-accent-soft" : "border-border bg-surface hover:border-accent/40 hover:bg-canvas"}`}
            >
              <div className="min-w-0">
                <p className="text-sm font-semibold text-ink">{label}</p>
                <p className="mt-1 text-caption text-secondary">
                  {item.created_at ? new Date(item.created_at).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }) : ""}
                  {item.business_health_score != null ? ` · ${item.business_health_score}` : ""}
                  {item.dataset_version ? ` · ${item.dataset_version}` : ""}
                </p>
                {item.summary && <p className="mt-1 line-clamp-2 text-sm text-secondary">{item.summary}</p>}
              </div>
              <div className="shrink-0 text-right">
                <span className="text-caption font-medium text-secondary">
                  {meta ? T("verify.runMeta", { rec: meta.recommendationCount, metric: meta.metricCount }) : "..."}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </Card>
  );
}

function VerificationProgress({ status, creating, T, onCancel }: {
  status: "queued" | "running";
  creating: boolean;
  T: (key: string, params?: Record<string, string | number>) => string;
  onCancel: () => void;
}) {
  const steps = [T("verify.job.fileRead"), T("verify.job.parentFound"), T("verify.job.compare"), T("verify.job.recommendationCheck"), T("verify.job.nextActions")];
  const showQueued = status === "queued" || creating;
  return (
    <Card className="p-6 md:p-8">
      <div className="flex items-center gap-4">
        <span aria-hidden className="h-8 w-8 shrink-0 animate-spin rounded-full border-2 border-accent/30 border-t-accent" />
        <div>
          <p className="text-base font-semibold text-ink">{showQueued ? T("verify.jobQueued") : T("verify.jobRunning")}</p>
          <p className="mt-1 text-sm text-secondary">{T("verify.jobRunningDesc")}</p>
        </div>
      </div>
      <div className="mt-6 space-y-3 border-t border-border pt-6">
        {steps.map((step, i) => (
          <div key={step} className="flex items-center gap-3">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-secondary">
              {i === 0 ? <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-accent/30 border-t-accent" /> : i + 1}
            </span>
            <p className={i === 0 ? "text-[15px] font-medium text-ink" : "text-[15px] text-secondary"}>{step}</p>
          </div>
        ))}
      </div>
      <p className="mt-6 text-sm text-secondary">{T("verify.jobTakesTime")}</p>
      <button type="button" onClick={onCancel} className={`${SECONDARY} mt-4`}>{T("verify.backProject")}</button>
    </Card>
  );
}
