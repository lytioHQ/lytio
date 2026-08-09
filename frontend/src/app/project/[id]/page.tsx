"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { TOKEN_KEY, apiFetch } from "@/lib/apiFetch";
import { useAuth } from "@/lib/AuthContext";

interface ProjectData {
  id: number; title: string; industry: string; language: string;
  original_filename: string | null; saved_filename: string | null;
  status: string; created_at: string | null; updated_at: string | null; latest_summary: string | null;
}

const API = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

interface TimelineItem { id: number; created_at: string | null; business_health_score: number | null; summary: string | null; }

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  draft: { label: "Draft", color: "bg-slate-100 text-slate-600" },
  ready: { label: "Ready", color: "bg-blue-100 text-blue-700" },
  completed: { label: "Completed", color: "bg-emerald-100 text-emerald-700" },
  archived: { label: "Archived", color: "bg-slate-100 text-slate-400" },
};

function formatDate(d: string | null): string {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("zh-CN", { year: "numeric", month: "short", day: "numeric" });
}

export default function ProjectDashboard() {
  const { id } = useParams<{ id: string }>();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
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
    return <main className="flex min-h-screen items-center justify-center bg-slate-50"><p className="text-sm text-slate-400">Loading...</p></main>;
  }
  if (!project) return null;

  const status = STATUS_LABELS[project.status] || STATUS_LABELS.draft;
  const hasFile = !!project.original_filename;

  return (
    <main className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-xs text-slate-400 hover:text-slate-600">&larr; Workspace</Link>
            <div>
              <h1 className="text-lg font-bold text-slate-900">{project.title}</h1>
              <div className="flex items-center gap-3 mt-0.5">
                <span className="text-xs text-slate-400 capitalize">{project.industry}</span>
                <span className="text-xs text-slate-300">&middot;</span>
                <span className="text-xs text-slate-400">{project.language === "zh" ? "中文" : project.language === "ja" ? "日本語" : project.language === "de" ? "Deutsch" : "English"}</span>
                <span className="text-xs text-slate-300">&middot;</span>
                <span className="text-xs text-slate-400">Created {formatDate(project.created_at)}</span>
                <span className="text-xs text-slate-300">&middot;</span>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${status.color}`}>{status.label}</span>
                <span className="text-xs text-slate-300">&middot;</span>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                  &#x1f512; Secure
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {project.status === "completed" && (
              <Link
                href={`/project/${id}/executive`}
                className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 shadow-sm"
              >
                Executive Report
              </Link>
            )}
            <Link
              href={`/project/${id}/analysis`}
              className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 shadow-sm"
            >
              {hasFile ? "Continue Analysis" : "Start Analysis"}
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl space-y-8 px-6 py-10">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <SummaryCard label="Business Health" value={project.status === "completed" ? "\u2713" : hasFile ? "--" : "\u2014"} sub={project.status === "completed" ? "Analysis ready" : hasFile ? "Run analysis" : "No data"} />
          <SummaryCard label="Findings" value={project.status === "completed" ? "\u2713" : "\u2014"} sub={project.status === "completed" ? "Available" : "Pending analysis"} />
          <SummaryCard label="Risks" value={project.status === "completed" ? "\u2713" : "\u2014"} sub={project.status === "completed" ? "Available" : "Pending analysis"} />
          <SummaryCard label="Recommendations" value={project.status === "completed" ? "\u2713" : "\u2014"} sub={project.status === "completed" ? "Available" : "Pending analysis"} />
        </div>

        {/* Latest Report */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-900">Latest Analysis</h3>
          <div className="mt-4 rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-8 text-center">
            <p className="text-sm text-slate-400">{project.status === "completed" && project.latest_summary ? project.latest_summary.slice(0, 200) + "..." : hasFile ? "No analysis generated yet." : "Upload a dataset to begin analysis."}</p>
            <p className="mt-1 text-xs text-slate-300">{hasFile ? "Click Continue Analysis to generate your first report." : "Use Start Analysis to upload your Excel file."}</p>
            <Link href={`/project/${id}/analysis`} className="mt-4 inline-flex text-xs font-medium text-slate-600 hover:text-slate-900">
              {hasFile ? "Continue Analysis \u2192" : "Start Analysis \u2192"}
            </Link>
          </div>
        </div>

        {/* Next Actions */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-900">Recommended Next Steps</h3>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            {[
              { title: "Upload Dataset", desc: "Add your Excel file to begin" },
              { title: "Run AI Analysis", desc: "Generate business insights" },
              { title: "Review Report", desc: "Explore findings and risks" },
            ].map((item, i) => (
              <div key={i} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-sm font-medium text-slate-700">{item.title}</p>
                <p className="mt-1 text-xs text-slate-400">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>


        {/* Business Timeline */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-900">Business Timeline</h3>
          {timeline.length === 0 ? (
            <div className="mt-4 rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-8 text-center">
              <p className="text-sm text-slate-400">No analysis yet.</p>
              <p className="mt-1 text-xs text-slate-300">Run your first analysis to build the timeline.</p>
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              {timeline.map((item) => {
                const score = item.business_health_score;
                const color = score != null
                  ? score >= 90 ? "border-l-emerald-500 bg-emerald-50/30"
                  : score >= 75 ? "border-l-blue-500 bg-blue-50/30"
                  : score >= 60 ? "border-l-amber-500 bg-amber-50/30"
                  : "border-l-red-500 bg-red-50/30"
                  : "border-l-slate-300 bg-slate-50/50";
                const dateStr = item.created_at
                  ? new Date(item.created_at).toLocaleDateString("zh-CN", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })
                  : "";
                return (
                  <div key={item.id} className={`rounded-xl border border-slate-200 border-l-4 ${color} p-4`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {score != null && <span className="text-lg font-bold text-slate-800 tabular-nums">{score}</span>}
                        <span className="text-xs text-slate-400">{dateStr}</span>
                      </div>
                      <Link href={`/project/${id}/report/${item.id}`} className="text-xs font-medium text-slate-600 hover:text-slate-900">View Report &rarr;</Link>
                    </div>
                    {item.summary && <p className="mt-2 text-xs text-slate-500 line-clamp-2">{item.summary}</p>}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Dataset */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-900">Current Dataset</h3>
          {hasFile ? (
            <div className="mt-4 flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/50 p-4">
              <div>
                <p className="text-sm font-medium text-slate-700">{project.original_filename}</p>
                <p className="mt-0.5 text-xs text-slate-400">Uploaded &middot; Ready for analysis</p>
              </div>
              <label className="cursor-pointer rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50">
                {uploading ? "Uploading..." : "Replace Dataset"}
                <input type="file" accept=".xlsx,.xls" onChange={handleReplaceFile} className="hidden" disabled={uploading} />
              </label>
            </div>
          ) : (
            <div className="mt-4 rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-8 text-center">
              <p className="text-sm text-slate-400">No dataset uploaded yet.</p>
              <label className="mt-4 inline-flex cursor-pointer rounded-lg bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800">
                {uploading ? "Uploading..." : "Upload Dataset"}
                <input type="file" accept=".xlsx,.xls" onChange={handleReplaceFile} className="hidden" disabled={uploading} />
              </label>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

function SummaryCard({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{label}</p>
      <p className="mt-2 text-2xl font-bold text-slate-900 tabular-nums">{value}</p>
      <p className="mt-1 text-xs text-slate-400">{sub}</p>
    </div>
  );
}