"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { apiFetch } from "@/lib/apiFetch";

export type JobStatus = "queued" | "running" | "completed" | "failed";

export interface AnalysisJob {
  job_id: number;
  status: JobStatus;
  analysis_type: string;
  analysis_direction: string;
  error_code: string | null;
  error_message: string | null;
  result_run_id: number | null;
  pipeline_stage: string | null;
}

export type AnalysisJobHookError = "network" | "create" | "conflict";

const API = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";
const POLL_INTERVAL_MS = 2000;

export function useAnalysisJob(
  projectId: number | null,
  direction: string | null,
  initialJobId?: number | null,
) {
  const [job, setJob] = useState<AnalysisJob | null>(null);
  const [loading, setLoading] = useState<boolean>(!!initialJobId);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<AnalysisJobHookError | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancelledRef = useRef(false);

  const stop = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const fetchJob = useCallback(
    async (jobId: number) => {
      const r = await apiFetch(`${API}/api/projects/${projectId}/analysis/${jobId}`);
      const data = await r.json().catch(() => null);
      if (!r.ok) throw new Error(data?.detail || "Failed to load analysis status");
      return data as AnalysisJob;
    },
    [projectId],
  );

  const schedule = useCallback(
    (jobId: number) => {
      stop();
      timerRef.current = setTimeout(async () => {
        try {
          const data = await fetchJob(jobId);
          if (cancelledRef.current) return;
          setError(null);
          setJob(data);
          if (data.status === "queued" || data.status === "running") schedule(jobId);
        } catch {
          if (cancelledRef.current) return;
          setError("network");
          schedule(jobId);
        }
      }, POLL_INTERVAL_MS);
    },
    [fetchJob, stop],
  );

  // Resume from a persisted job id (e.g. after refresh).
  useEffect(() => {
    if (!projectId || !initialJobId) return;
    cancelledRef.current = false;
    setLoading(true);
    (async () => {
      try {
        const data = await fetchJob(initialJobId);
        if (cancelledRef.current) return;
        setError(null);
        setJob(data);
        if (data.status === "queued" || data.status === "running") schedule(initialJobId);
      } catch {
        if (!cancelledRef.current) setError("network");
      } finally {
        if (!cancelledRef.current) setLoading(false);
      }
    })();
    return () => {
      cancelledRef.current = true;
      stop();
    };
  }, [projectId, initialJobId, fetchJob, schedule, stop]);

  // Always stop polling on unmount.
  useEffect(
    () => () => {
      cancelledRef.current = true;
      stop();
    },
    [stop],
  );

  const create = useCallback(
    async (idempotencyKey?: string) => {
      if (!projectId || !direction) return null;
      setCreating(true);
      setError(null);
      try {
        const key = idempotencyKey || `${projectId}:${direction}`;
        const r = await apiFetch(`${API}/api/projects/${projectId}/analysis`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ analysis_direction: direction, idempotency_key: key }),
        });
        const data = await r.json().catch(() => null);
        if (!r.ok) {
          setError(r.status === 409 ? "conflict" : "create");
          return null;
        }
        setJob(data);
        if (data.status === "queued" || data.status === "running") schedule(data.job_id);
        return data as AnalysisJob;
      } catch {
        setError("create");
        return null;
      } finally {
        setCreating(false);
      }
    },
    [projectId, direction, schedule],
  );

  return { job, loading, creating, error, create };
}