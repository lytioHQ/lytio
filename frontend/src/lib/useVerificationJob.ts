"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { apiFetch } from "@/lib/apiFetch";

export type JobStatus = "queued" | "running" | "completed" | "failed";

export interface VerificationJob {
  job_id: number;
  status: JobStatus;
  analysis_type: string;
  analysis_direction: string;
  purpose: string | null;
  error_code: string | null;
  error_message: string | null;
  result_run_id: number | null;
}

export type VerificationJobHookError = "network" | "create" | "conflict" | "no_parent";

const API = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";
const POLL_INTERVAL_MS = 2000;

export function useVerificationJob(projectId: number | null, initialJobId?: number | null) {
  const [job, setJob] = useState<VerificationJob | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<VerificationJobHookError | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancelledRef = useRef(false);

  const stop = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const fetchJob = useCallback(
    async (jobId: number): Promise<VerificationJob> => {
      const r = await apiFetch(`${API}/api/projects/${projectId}/analysis/${jobId}`);
      const data = await r.json().catch(() => null);
      if (!r.ok) throw new Error(data?.detail || "Failed to load verification status");
      return data as VerificationJob;
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
    (async () => {
      try {
        const data = await fetchJob(initialJobId);
        if (cancelledRef.current) return;
        setError(null);
        setJob(data);
        if (data.status === "queued" || data.status === "running") schedule(initialJobId);
      } catch {
        if (!cancelledRef.current) setError("network");
      }
    })();
    return () => {
      cancelledRef.current = true;
      stop();
    };
  }, [projectId, initialJobId, fetchJob, schedule, stop]);

  useEffect(
    () => () => {
      cancelledRef.current = true;
      stop();
    },
    [stop],
  );

  const create = useCallback(
    async (payload: {
      parent_run_id: number | null;
      purpose: string;
      saved_filename: string;
      original_filename?: string | null;
      idempotency_key?: string;
    }): Promise<VerificationJob | null> => {
      if (!projectId) return null;
      setCreating(true);
      setError(null);
      try {
        const r = await apiFetch(`${API}/api/projects/${projectId}/verification`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await r.json().catch(() => null);
        if (!r.ok) {
          if (r.status === 409) setError("conflict");
          else if (r.status === 400) setError("no_parent");
          else setError("create");
          return null;
        }
        setJob(data as VerificationJob);
        if (data.status === "queued" || data.status === "running") schedule(data.job_id);
        return data as VerificationJob;
      } catch {
        setError("create");
        return null;
      } finally {
        setCreating(false);
      }
    },
    [projectId, schedule],
  );

  return { job, creating, error, create };
}
