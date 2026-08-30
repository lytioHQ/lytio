"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { TOKEN_KEY, apiFetch } from "@/lib/apiFetch";
import { useAuth } from "@/lib/AuthContext";
import { t } from "@/lib/i18n";
import { useUiLang } from "@/lib/useUiLang";
import { isAnalysisDirection, type AnalysisDirection } from "@/lib/analysisDirections";
import { useAnalysisJob, type AnalysisJob, type AnalysisJobHookError } from "@/lib/useAnalysisJob";
import { Button, Card, SectionTitle } from "@/components/ui";
import { buttonBaseClasses, buttonVariantClasses } from "@/components/ui/Button";

const API = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";
const PRIMARY_LINK = `${buttonBaseClasses} ${buttonVariantClasses.primary}`;

interface ProjectData {
  id: number;
  title: string;
  original_filename: string | null;
  saved_filename: string | null;
  status: string;
}

const STAGES = [
  "analysis.stage.preparing",
  "analysis.stage.health",
  "analysis.stage.findings",
  "analysis.stage.risks",
  "analysis.stage.recommendations",
] as const;

function jobErrorKey(job: AnalysisJob | null): string | null {
  if (!job || job.status !== "failed") return null;
  switch (job.error_code) {
    case "provider_timeout":
      return "analysis.error.provider_timeout";
    case "interrupted":
      return "analysis.error.interrupted";
    case "invalid_data":
      return "analysis.error.invalid_data";
    case "missing_file":
      return "analysis.error.missing_file";
    case "SCHEMA_CONFIRM_REQUIRED":
      return "analysis.error.SCHEMA_CONFIRM_REQUIRED";
    case "AI_OUTPUT_INCOMPLETE":
      return "analysis.error.AI_OUTPUT_INCOMPLETE";
    case "provider_error":
      return "analysis.error.provider_error";
    case "runner_exception":
      return "analysis.error.runner_exception";
    case "unreadable_file":
    case "unsupported_file":
    case "empty_workbook":
      return "analysis.error.empty_workbook";
    case "missing_file":
      return "analysis.error.missing_file";
    case "DATA_SERIALIZATION_ERROR":
      return "analysis.error.dataError";
    default:
      return "analysis.error.unknown";
  }
}

function hookErrorKey(error: AnalysisJobHookError | null): string | null {
  if (error === "conflict") return "analysis.error.alreadyDone";
  if (error === "network") return "analysis.error.poll";
  return null;
}

export default function AnalysisPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const { uiLang } = useUiLang();
  const T = (key: string, params?: Record<string, string | number>) => t(uiLang, key, params);

  const projectId = Number(id);
  const rawDirection = searchParams.get("direction");
  const direction: AnalysisDirection | null = rawDirection && isAnalysisDirection(rawDirection) ? rawDirection : null;
  const analysisDirection = direction ?? "overview";
  const jobIdParam = searchParams.get("job_id");
  const initialJobId = jobIdParam && Number.isFinite(Number(jobIdParam)) ? Number(jobIdParam) : null;

  const [project, setProject] = useState<ProjectData | null>(null);
  const [projectLoading, setProjectLoading] = useState(true);
  const [projectError, setProjectError] = useState(false);
  const createdRef = useRef(false);
  const syncedJobIdRef = useRef<string | null>(null);

  const token = typeof window !== "undefined" ? localStorage.getItem(TOKEN_KEY) : null;
  const jobFlow = useAnalysisJob(
    Number.isFinite(projectId) && projectId > 0 ? projectId : null,
    analysisDirection,
    initialJobId,
  );

  useEffect(() => {
    if (!authLoading && !user) router.push("/login");
  }, [authLoading, user, router]);

  useEffect(() => {
    if (!token || !id) return;
    apiFetch(API + "/api/projects/" + id, { headers: { Authorization: "Bearer " + token } })
      .then(async (r) => {
        if (r.status === 404) {
          router.push("/");
          return;
        }
        if (!r.ok) throw new Error("Project fetch failed");
        const p: ProjectData = await r.json();
        setProject(p);
      })
      .catch(() => setProjectError(true))
      .finally(() => setProjectLoading(false));
  }, [token, id, router]);

  // Create one job after the project is loaded, unless we are resuming a job id.
  useEffect(() => {
    if (createdRef.current) return;
    if (projectError || !project) return;
    if (jobIdParam) return;
    if (!project.saved_filename) return;
    if (direction === null && project.status === "completed") return;
    createdRef.current = true;
    void jobFlow.create();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project, projectError, jobIdParam, direction]);

  // Persist the job id in the URL so refresh resumes the same job.
  useEffect(() => {
    const jobId = jobFlow.job?.job_id;
    if (!jobId) return;
    const key = String(jobId);
    if (syncedJobIdRef.current === key) return;
    syncedJobIdRef.current = key;
    const params = new URLSearchParams();
    if (direction) params.set("direction", direction);
    params.set("job_id", key);
    router.replace(`/project/${id}/analysis?${params.toString()}`, { scroll: false });
  }, [jobFlow.job, direction, id, router]);

  const job = jobFlow.job;
  const jobStatus = job?.status;
  const failedJob = jobStatus === "failed";
  const completedJob = jobStatus === "completed";
  const hookError = jobFlow.error;
  const errorKey = failedJob ? jobErrorKey(job) : hookErrorKey(hookError);

  function retryStatus() {
    window.location.reload();
  }

  function retry() {
    void jobFlow.create(`${projectId}:${analysisDirection}:${Date.now()}`);
  }

  if (authLoading || projectLoading || jobFlow.loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-canvas px-4">
        <p className="text-sm text-secondary">{T("projAnalysis.loading")}</p>
      </main>
    );
  }

  if (projectError) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-canvas px-4">
        <Card className="w-full max-w-md p-8 text-center">
          <p className="text-lg font-semibold text-ink">{T("projAnalysis.loadError")}</p>
          <div className="mt-6 flex justify-center gap-3">
            <Button variant="secondary" onClick={() => router.push("/project/" + id)}>{T("projAnalysis.backProject")}</Button>
            <Button onClick={retryStatus}>{T("proj.retry")}</Button>
          </div>
        </Card>
      </main>
    );
  }

  if (project && !project.saved_filename) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-canvas px-4">
        <Card className="w-full max-w-md p-8 text-center">
          <p className="text-lg font-semibold text-ink">{T("projAnalysis.noFile")}</p>
          <p className="mt-2 text-sm leading-relaxed text-secondary">{T("projAnalysis.noFileDesc")}</p>
          <div className="mt-6 flex justify-center">
            <Button variant="secondary" onClick={() => router.push("/project/" + id)}>{T("projAnalysis.backProject")}</Button>
          </div>
        </Card>
      </main>
    );
  }

  // Completed Health Scan guard when no explicit job id is being resumed.
  if (project && project.status === "completed" && direction === null && !jobIdParam) {
    return (
      <main className="min-h-screen bg-canvas">
        <div className="mx-auto max-w-2xl px-4 py-16 md:py-24">
          <Card className="p-10 text-center">
            <span aria-hidden className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success-soft text-3xl text-success">{"\u2713"}</span>
            <h1 className="mt-6 text-h1 text-ink">{T("projAnalysis.alreadyComplete")}</h1>
            <p className="mx-auto mt-2 max-w-[480px] text-body leading-relaxed text-secondary">{T("projAnalysis.alreadyCompleteDesc")}</p>
            <div className="mt-8 flex justify-center">
              <Link href={`/project/${id}/executive`} className={`${PRIMARY_LINK} px-8`}>
                {T("projAnalysis.viewFullReport")}
              </Link>
            </div>
          </Card>
        </div>
      </main>
    );
  }

  if (hookError === "network" && !job) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-canvas px-4">
        <Card className="w-full max-w-md p-8 text-center">
          <p className="text-lg font-semibold text-danger">{T("analysis.error.poll")}</p>
          <p className="mt-2 text-sm leading-relaxed text-secondary">{T("projAnalysis.failedDesc")}</p>
          <div className="mt-6 flex justify-center gap-3">
            <Button variant="secondary" onClick={() => router.push("/project/" + id)}>{T("projAnalysis.backProject")}</Button>
            <Button onClick={retryStatus}>{T("proj.retry")}</Button>
          </div>
        </Card>
      </main>
    );
  }

  if (failedJob || hookError === "create") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-canvas px-4">
        <Card className="w-full max-w-md p-8 text-center">
          <p className="text-lg font-semibold text-danger">{T("projAnalysis.failed")}</p>
          <p className="mt-2 text-sm leading-relaxed text-secondary">{T(errorKey || "analysis.error.unknown")}</p>
          <div className="mt-6 flex justify-center gap-3">
            <Button variant="secondary" onClick={() => router.push("/project/" + id)}>{T("projAnalysis.backProject")}</Button>
            <Button onClick={retry}>{T("projAnalysis.retry")}</Button>
          </div>
        </Card>
      </main>
    );
  }

  if (hookError === "conflict") {
    return (
      <main className="min-h-screen bg-canvas">
        <div className="mx-auto max-w-2xl px-4 py-16 md:py-24">
          <Card className="p-10 text-center">
            <span aria-hidden className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success-soft text-3xl text-success">{"\u2713"}</span>
            <h1 className="mt-6 text-h1 text-ink">{T("analysis.error.alreadyDone")}</h1>
            <div className="mt-8 flex justify-center gap-3">
              <Button variant="secondary" onClick={() => router.push("/project/" + id)}>{T("projAnalysis.backProject")}</Button>
              <Link href={`/project/${id}/executive`} className={`${PRIMARY_LINK} px-8`}>
                {T("projAnalysis.viewFullReport")}
              </Link>
            </div>
          </Card>
        </div>
      </main>
    );
  }

  if (completedJob) {
    return (
      <main className="min-h-screen bg-canvas">
        <div className="mx-auto max-w-2xl px-4 py-16 md:py-24">
          <Card className="p-10 text-center">
            <span aria-hidden className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-success-soft text-3xl text-success">{"\u2713"}</span>
            <h1 className="mt-6 text-h1 text-ink">{T("projAnalysis.complete")}</h1>
            <p className="mx-auto mt-2 max-w-[480px] text-body leading-relaxed text-secondary">{T("projAnalysis.completeDesc")}</p>
            <div className="mt-8 flex justify-center">
              <Link href={`/project/${id}/executive`} className={`${PRIMARY_LINK} px-8`}>
                {T("projAnalysis.viewFullReport")}
              </Link>
            </div>
          </Card>
        </div>
      </main>
    );
  }

  const showQueued = jobStatus === "queued" || (jobFlow.creating && !job);
  const aiSteps = [
    T("analysis.job.metricsDetect"),
    T("analysis.job.healthEval"),
    T("analysis.job.findings"),
    T("analysis.job.recommendationsGen"),
  ];
  return (
    <main className="min-h-screen bg-canvas">
      <div className="mx-auto max-w-2xl px-4 py-12 md:py-16">
        <SectionTitle
          title={project ? project.title : T("projAnalysis.title")}
          description={direction ? T(`analysis.dir.${direction}`) : project?.original_filename || T("projAnalysis.title")}
        />
        <Card className="p-6 md:p-8">
          <div className="flex items-center gap-4">
            <span aria-hidden className="h-8 w-8 shrink-0 animate-spin rounded-full border-2 border-accent/30 border-t-accent" />
            <div>
              <p className="text-base font-semibold text-ink">{showQueued ? T("analysis.job.queued") : T("analysis.job.analyzingTitle")}</p>
              <p className="mt-1 text-sm text-secondary">{T("analysis.job.analyzing")}</p>
            </div>
          </div>
          <div className="mt-6 space-y-3 border-t border-border pt-6">
            <div className="flex items-center gap-3">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-success-soft text-sm font-semibold text-success">{"\u2713"}</span>
              <p className="text-[15px] text-ink">{T("analysis.job.fileRead")}</p>
            </div>
            {aiSteps.map((step, i) => (
              <div key={step} className="flex items-center gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-secondary">
                  {i === 0 ? <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-accent/30 border-t-accent" /> : "○"}
                </span>
                <p className={i === 0 ? "text-[15px] font-medium text-ink" : "text-[15px] text-secondary"}>{step}</p>
              </div>
            ))}
          </div>
          <p className="mt-6 text-sm text-secondary">{T("analysis.job.takesTime")}</p>
        </Card>
      </div>
    </main>
  );
}