"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { TOKEN_KEY, apiFetch } from "@/lib/apiFetch";
import { useAuth } from "@/lib/AuthContext";
import { t } from "@/lib/i18n";
import { useUiLang } from "@/lib/useUiLang";
import { useAnalysisPipeline, type PipelineStage } from "@/lib/useAnalysisPipeline";
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

const STAGE_ORDER: Record<PipelineStage, number> = {
  idle: 0,
  uploading: 1,
  parsing: 1,
  detecting: 2,
  ready: 2,
  thinking: 3,
  generating: 4,
  done: 5,
};

const STEPS = [
  "projAnalysis.preparing",
  "projAnalysis.understanding",
  "projAnalysis.generating",
  "projAnalysis.recommendations",
] as const;

function stepStatus(stage: PipelineStage, index: number, complete: boolean): "done" | "active" | "pending" {
  if (complete) return "done";
  const order = STAGE_ORDER[stage] ?? 0;
  const threshold = index + 1;
  if (order > threshold) return "done";
  if (order === threshold) return "active";
  return "pending";
}

export default function AnalysisPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { uiLang } = useUiLang();
  const T = (key: string, params?: Record<string, string | number>) => t(uiLang, key, params);

  const projectId = Number(id);
  const [project, setProject] = useState<ProjectData | null>(null);
  const [projectLoading, setProjectLoading] = useState(true);
  const [projectError, setProjectError] = useState(false);
  const [saved, setSaved] = useState(false);
  const startedRef = useRef(false);
  const analyzeTriggeredRef = useRef(false);

  const token = typeof window !== "undefined" ? localStorage.getItem(TOKEN_KEY) : null;
  const pipe = useAnalysisPipeline({
    projectId: Number.isFinite(projectId) && projectId > 0 ? projectId : null,
    onComplete: () => setSaved(true),
  });

  useEffect(() => {
    if (!authLoading && !user) router.push("/login");
  }, [authLoading, user, router]);

  useEffect(() => {
    if (!token || !id) return;
    apiFetch(API + "/api/projects/" + id, { headers: { Authorization: "Bearer " + token } })
      .then(async (r) => {
        if (r.status === 404) { router.push("/"); return; }
        if (!r.ok) throw new Error("Project fetch failed");
        const p: ProjectData = await r.json();
        setProject(p);
      })
      .catch(() => setProjectError(true))
      .finally(() => setProjectLoading(false));
  }, [token, id, router]);

  // Auto-start the pipeline once the project is loaded and has a linked file.
  useEffect(() => {
    if (startedRef.current) return;
    if (projectError || !project) return;
    if (project.status === "completed") return;
    if (!project.saved_filename) return;
    startedRef.current = true;
    pipe.runSavedFile(project.saved_filename);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project, projectError]);

  // Auto-trigger analysis once extraction + semantic detection are ready.
  useEffect(() => {
    if (!startedRef.current || analyzeTriggeredRef.current) return;
    if (pipe.ready && !pipe.analysis && !pipe.analyzing) {
      analyzeTriggeredRef.current = true;
      pipe.handleAnalyze();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pipe.ready, pipe.analysis, pipe.analyzing]);

  const complete = saved && !!pipe.analysis;
  const failed = pipe.failed || (!!pipe.error && !pipe.analysis);

  function retry() {
    window.location.reload();
  }

  if (authLoading || projectLoading) {
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
            <Button onClick={retry}>{T("proj.retry")}</Button>
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

  if (project && project.status === "completed") {
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

  if (failed) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-canvas px-4">
        <Card className="w-full max-w-md p-8 text-center">
          <p className="text-lg font-semibold text-danger">{T("projAnalysis.failed")}</p>
          <p className="mt-2 text-sm leading-relaxed text-secondary">{T("projAnalysis.failedDesc")}</p>
          {pipe.error && (
            <p className="mt-3 rounded-control border border-danger/20 bg-danger/5 px-3 py-2 text-sm text-danger">{pipe.error}</p>
          )}
          <div className="mt-6 flex justify-center gap-3">
            <Button variant="secondary" onClick={() => router.push("/project/" + id)}>{T("projAnalysis.backProject")}</Button>
            <Button onClick={retry}>{T("projAnalysis.retry")}</Button>
          </div>
        </Card>
      </main>
    );
  }

  if (complete) {
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

  const stage = pipe.stage;
  return (
    <main className="min-h-screen bg-canvas">
      <div className="mx-auto max-w-2xl px-4 py-12 md:py-16">
        <SectionTitle
          title={project ? project.title : T("projAnalysis.title")}
          description={project?.original_filename || T("projAnalysis.title")}
        />
        <Card className="p-6 md:p-8">
          <div className="space-y-5">
            {STEPS.map((stepKey, i) => {
              const st = stepStatus(stage, i, complete);
              return (
                <div key={stepKey} className="flex items-center gap-4">
                  <span
                    aria-hidden
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
                      st === "done" ? "bg-success-soft text-success"
                      : st === "active" ? "bg-accent-soft text-accent"
                      : "bg-muted text-secondary"
                    }`}
                  >
                    {st === "done" ? "\u2713" : st === "active" ? (
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-accent/30 border-t-accent" />
                    ) : i + 1}
                  </span>
                  <p className={`text-[15px] ${st === "pending" ? "text-secondary" : "text-ink"}`}>{T(stepKey)}</p>
                </div>
              );
            })}
          </div>
          <p className="mt-5 text-sm text-secondary">{T("projAnalysis.takesTime")}</p>
          {pipe.error && (
            <p className="mt-5 rounded-control border border-danger/20 bg-danger/5 px-3 py-2 text-sm text-danger">{pipe.error}</p>
          )}
        </Card>
      </div>
    </main>
  );
}