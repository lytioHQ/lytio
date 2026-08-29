"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { TOKEN_KEY, apiFetch } from "@/lib/apiFetch";
import { useAuth } from "@/lib/AuthContext";
import { t } from "@/lib/i18n";
import { useUiLang } from "@/lib/useUiLang";
import { Card } from "@/components/ui";
import { buttonBaseClasses, buttonVariantClasses } from "@/components/ui/Button";
import { isAnalysisDirection, type AnalysisDirection } from "@/lib/analysisDirections";
import { useFocusedInsightJob } from "@/lib/useFocusedInsightJob";

const API = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";
const PRIMARY = `${buttonBaseClasses} ${buttonVariantClasses.primary}`;
const SECONDARY = `${buttonBaseClasses} ${buttonVariantClasses.secondary}`;

interface TimelineItem {
  id: number;
  analysis_type: string | null;
}

/**
 * M2.14.4 focused-insight page: creates one small follow-up job from an
 * existing full analysis and redirects to the focused report when done.
 * No Excel re-read, no full analysis.
 */
export default function FocusedInsightPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const { uiLang } = useUiLang();
  const T = (key: string) => t(uiLang, key);

  const projectId = Number(id);
  const rawTopic = searchParams.get("topic");
  const topic: AnalysisDirection | null =
    rawTopic && isAnalysisDirection(rawTopic) ? rawTopic : null;
  const rawParent = searchParams.get("parent_run_id");
  const parentRunId =
    rawParent && Number.isFinite(Number(rawParent)) ? Number(rawParent) : null;
  const jobIdParam = searchParams.get("job_id");
  const initialJobId =
    jobIdParam && Number.isFinite(Number(jobIdParam)) ? Number(jobIdParam) : null;

  const [timeline, setTimeline] = useState<TimelineItem[]>([]);
  const [loadError, setLoadError] = useState(false);
  const createdRef = useRef(false);
  const token = typeof window !== "undefined" ? localStorage.getItem(TOKEN_KEY) : null;

  const jobFlow = useFocusedInsightJob(
    Number.isFinite(projectId) && projectId > 0 ? projectId : null,
    topic,
    parentRunId,
    initialJobId,
  );

  useEffect(() => {
    if (!authLoading && !user) router.push("/login");
  }, [authLoading, user, router]);

  useEffect(() => {
    if (!token || !projectId) return;
    apiFetch(`${API}/api/projects/${projectId}/timeline`)
      .then(async (r) => (r.ok ? r.json() : []))
      .then((data: TimelineItem[]) => setTimeline(data || []))
      .catch(() => setLoadError(true));
  }, [token, projectId]);

  // Resolve the latest full analysis as parent when the caller omitted it.
  useEffect(() => {
    if (createdRef.current) return;
    if (loadError || !timeline.length) return;
    if (!topic) return;
    let resolvedParent = parentRunId;
    if (!resolvedParent) {
      const full = timeline.find(
        (item) => item.analysis_type === "health_scan" || item.analysis_type === "deep_analysis",
      );
      resolvedParent = full ? full.id : null;
    }
    if (!resolvedParent) return;
    if (initialJobId) return;
    createdRef.current = true;
    void jobFlow.create();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeline, topic, parentRunId, initialJobId, loadError]);

  // Persist the job id in the URL so refresh resumes the same job.
  useEffect(() => {
    const jobId = jobFlow.job?.job_id;
    if (!jobId) return;
    const params = new URLSearchParams();
    if (topic) params.set("topic", topic);
    if (parentRunId) params.set("parent_run_id", String(parentRunId));
    params.set("job_id", String(jobId));
    router.replace(`/project/${id}/focused-insight?${params.toString()}`, { scroll: false });
  }, [jobFlow.job, topic, parentRunId, id, router]);

  // Redirect to the focused report when the job completes.
  useEffect(() => {
    if (jobFlow.job?.status === "completed" && jobFlow.job.result_run_id) {
      router.push(`/project/${id}/report/${jobFlow.job.result_run_id}`);
    }
  }, [jobFlow.job, id, router]);

  if (authLoading || jobFlow.loading) {
    return <main className="flex min-h-screen items-center justify-center bg-canvas"><p className="text-sm text-secondary">{T("home.loading")}</p></main>;
  }

  if (!topic) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-canvas px-4">
        <Card className="w-full max-w-md p-8 text-center">
          <p className="text-lg font-semibold text-ink">{T("focus.title")}</p>
          <p className="mt-2 text-sm leading-relaxed text-secondary">{T("focus.missingTopic")}</p>
          <div className="mt-6 flex justify-center">
            <Link href={`/project/${id}`} className={SECONDARY}>{T("focus.backProject")}</Link>
          </div>
        </Card>
      </main>
    );
  }

  const job = jobFlow.job;
  const failedJob = job?.status === "failed";
  const hookError = jobFlow.error;

  if (failedJob || hookError === "create") {
    return (
      <main className="flex min-h-screen items-center justify-center bg-canvas px-4">
        <Card className="w-full max-w-md p-8 text-center">
          <p className="text-lg font-semibold text-danger">{T("focus.failed")}</p>
          <p className="mt-2 text-sm leading-relaxed text-secondary">{T("focus.failedDesc")}</p>
          <div className="mt-6 flex justify-center gap-3">
            <Link href={`/project/${id}`} className={SECONDARY}>{T("focus.backProject")}</Link>
            <button type="button" onClick={() => window.location.reload()} className={PRIMARY}>{T("proj.retry")}</button>
          </div>
        </Card>
      </main>
    );
  }

  const queued = job?.status === "queued" || jobFlow.creating;
  return (
    <main className="min-h-screen bg-canvas">
      <div className="mx-auto max-w-2xl px-4 py-12 md:py-16">
        <Link href={`/project/${id}`} className="text-sm text-secondary transition-colors hover:text-ink">{T("focus.backProject")}</Link>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-ink md:text-3xl">{T(`focus.topic.${topic}`)}</h1>
        <p className="mt-2 text-sm leading-relaxed text-secondary">{T("focus.subtitle")}</p>

        <Card className="mt-6 p-6 md:p-8">
          <div className="flex items-center gap-4">
            <span aria-hidden className="h-8 w-8 shrink-0 animate-spin rounded-full border-2 border-accent/30 border-t-accent" />
            <div>
              <p className="text-base font-semibold text-ink">{queued ? T("focus.queued") : T("focus.running")}</p>
              <p className="mt-1 text-sm text-secondary">{T("focus.runningDesc")}</p>
            </div>
          </div>
          <div className="mt-6 space-y-3 border-t border-border pt-6">
            {[T("focus.step.context"), T("focus.step.deep"), T("focus.step.card")].map((step, i) => (
              <div key={step} className="flex items-center gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-secondary">
                  {i === 0 ? <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-accent/30 border-t-accent" /> : i + 1}
                </span>
                <p className={i === 0 ? "text-[15px] font-medium text-ink" : "text-[15px] text-secondary"}>{step}</p>
              </div>
            ))}
          </div>
          <p className="mt-6 text-sm text-secondary">{T("focus.fast")}</p>
        </Card>
      </div>
    </main>
  );
}
