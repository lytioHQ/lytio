"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { TOKEN_KEY, apiFetch } from "@/lib/apiFetch";
import { useAuth } from "@/lib/AuthContext";
import { t } from "@/lib/i18n";
import { useUiLang } from "@/lib/useUiLang";
import { Card } from "@/components/ui";

const API = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

const PRIMARY_LINK = "inline-flex h-11 items-center justify-center rounded-control bg-ink px-5 text-sm font-medium text-white transition-colors hover:bg-ink-hover";
const SECONDARY_LINK = "inline-flex h-11 items-center justify-center rounded-control border border-border bg-surface px-5 text-sm font-medium text-ink transition-colors hover:bg-canvas";

interface ProjectData {
  id: number;
  title: string;
  status: string;
  original_filename: string | null;
  saved_filename: string | null;
}

export default function VerifyPage() {
  const { id } = useParams<{ id: string }>();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { uiLang } = useUiLang();
  const T = (key: string, params?: Record<string, string | number>) => t(uiLang, key, params);

  const [project, setProject] = useState<ProjectData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploaded, setUploaded] = useState(false);
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
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [token, id, router]);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !token) return;
    setUploading(true);
    setError(false);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const r = await apiFetch(API + "/api/upload", { method: "POST", headers: { Authorization: "Bearer " + token }, body: fd });
      if (!r.ok) throw new Error("Upload failed");
      const up = await r.json();
      const linkRes = await apiFetch(API + "/api/projects/" + id + "/file", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
        body: JSON.stringify({ original_filename: up.original_filename, saved_filename: up.saved_filename }),
      });
      if (!linkRes.ok) throw new Error("File link failed");
      setUploaded(true);
      setProject((p) => p ? { ...p, status: "ready", original_filename: up.original_filename } : p);
    } catch {
      setError(true);
    } finally {
      setUploading(false);
    }
  }

  if (authLoading || loading) {
    return <main className="flex min-h-screen items-center justify-center bg-canvas"><p className="text-sm text-secondary">{T("home.loading")}</p></main>;
  }
  if (error && !uploaded) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-canvas px-4">
        <Card className="w-full max-w-md p-8 text-center">
          <p className="text-lg font-semibold text-ink">{T("proj.loadError")}</p>
          <div className="mt-6 flex justify-center gap-3">
            <Link href={`/project/${id}`} className={SECONDARY_LINK}>{T("verify.backProject")}</Link>
            <button type="button" onClick={() => window.location.reload()} className={PRIMARY_LINK}>{T("proj.retry")}</button>
          </div>
        </Card>
      </main>
    );
  }
  if (!project) return null;

  const completed = project.status === "completed";

  return (
    <main className="min-h-screen bg-canvas">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto max-w-3xl px-4 py-6 md:px-6">
          <Link href={`/project/${id}`} className="text-sm text-secondary transition-colors hover:text-ink">{T("verify.backProject")}</Link>
          <h1 className="mt-3 text-2xl font-semibold tracking-tight text-ink md:text-3xl">{T("verify.title")}</h1>
          <p className="mt-2 text-sm leading-relaxed text-secondary">{T("verify.subtitle")}</p>
        </div>
      </header>

      <div className="mx-auto max-w-3xl space-y-6 px-4 py-10 md:px-6">
        {uploaded ? (
          <Card variant="highlighted">
            <p className="text-lg font-semibold text-ink">{T("verify.uploaded")}</p>
            <p className="mt-2 text-sm leading-relaxed text-secondary">{T("verify.phaseNote")}</p>
            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <Link href={`/project/${id}`} className={SECONDARY_LINK}>{T("verify.backProject")}</Link>
              <Link href={`/project/${id}/analysis`} className={PRIMARY_LINK}>{T("verify.startAnalysis")}</Link>
            </div>
          </Card>
        ) : (
          <>
            {!completed && (
              <Card>
                <p className="text-body leading-relaxed text-secondary">{T("verify.needAnalysis")}</p>
                <div className="mt-6 flex justify-end">
                  <Link href={`/project/${id}/executive`} className={PRIMARY_LINK}>{T("verify.viewReport")}</Link>
                </div>
              </Card>
            )}

            <div className="grid gap-4 md:grid-cols-3">
              <Card variant="subtle" className="p-5">
                <p className="text-[15px] font-medium text-ink">{T("verify.step1Title")}</p>
                <p className="mt-1 text-sm leading-relaxed text-secondary">{T("verify.step1Desc")}</p>
              </Card>
              <Card variant="subtle" className="p-5">
                <p className="text-[15px] font-medium text-ink">{T("verify.step2Title")}</p>
                <p className="mt-1 text-sm leading-relaxed text-secondary">{T("verify.step2Desc")}</p>
              </Card>
              <Card variant="subtle" className="p-5">
                <p className="text-[15px] font-medium text-ink">{T("verify.step3Title")}</p>
                <p className="mt-1 text-sm leading-relaxed text-secondary">{T("verify.step3Desc")}</p>
              </Card>
            </div>

            {completed && (
              <Card>
                <h2 className="text-h3 text-ink">{T("verify.uploadCta")}</h2>
                <p className="mt-1 text-sm leading-relaxed text-secondary">{T("proj.verifyOptimizationDesc")}</p>
                <div className="mt-4">
                  <label className="inline-flex h-11 cursor-pointer items-center justify-center rounded-control bg-ink px-5 text-sm font-medium text-white transition-colors hover:bg-ink-hover">
                    {uploading ? T("verify.uploading") : T("verify.uploadCta")}
                    <input type="file" accept=".xlsx,.xls" onChange={handleUpload} className="hidden" disabled={uploading} />
                  </label>
                </div>
                <p className="mt-4 text-sm leading-relaxed text-secondary">{T("verify.phaseNote")}</p>
              </Card>
            )}
          </>
        )}
      </div>
    </main>
  );
}
