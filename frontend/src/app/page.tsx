"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { TOKEN_KEY, apiFetch } from "@/lib/apiFetch";
import { useAuth } from "@/lib/AuthContext";
import SecurityNotice from "@/components/security/SecurityNotice";
import LandingPage from "@/components/landing/LandingPage";
import BetaBanner from "@/components/BetaBanner";
import LanguageSelector from "@/components/LanguageSelector";
import { persistUiLang, resolveInitialUiLang, t, UILanguage } from "@/lib/i18n";

interface Project {
  id: number;
  title: string;
  industry: string;
  language: string;
  original_filename: string | null;
  status: string;
  created_at: string | null;
  updated_at: string | null;
  last_opened_at: string | null;
}

const API = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

function timeAgo(dateStr: string | null, lang: UILanguage): string {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return t(lang, "home.timeAgo.justNow");
  if (mins < 60) return t(lang, "home.timeAgo.minutes", { n: mins });
  const hours = Math.floor(mins / 60);
  if (hours < 24) return t(lang, "home.timeAgo.hours", { n: hours });
  const days = Math.floor(hours / 24);
  if (days < 7) return t(lang, "home.timeAgo.days", { n: days });
  return d.toLocaleDateString();
}

export default function WorkspacePage() {
  const { user, loading: authLoading, logout } = useAuth();
  const router = useRouter();
  const [uiLang, setUiLang] = useState<UILanguage>(() => resolveInitialUiLang());
  const T = (key: string, params?: Record<string, string | number>) => t(uiLang, key, params);

  function handleUiLangChange(lang: UILanguage) {
    setUiLang(lang);
    persistUiLang(lang);
  }
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newIndustry, setNewIndustry] = useState("sales");
  const [newLang, setNewLang] = useState("zh");
  const [newFile, setNewFile] = useState<File | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [plan, setPlan] = useState<{ plan: string; remaining_days: number } | null>(null);

  useEffect(() => { if (!authLoading && !user) {} /* show landing page */ }, [authLoading, user, router]);

  const token = typeof window !== "undefined" ? localStorage.getItem(TOKEN_KEY) : null;

  useEffect(() => {
    if (!token) return;
    apiFetch(API + "/api/projects", { headers: { Authorization: "Bearer " + token } })
      .then((r) => r.json())
      .then((data) => setProjects(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    if (!token) return;
    apiFetch(API + "/api/auth/me/plan", { headers: { Authorization: "Bearer " + token } })
      .then((r) => r.json())
      .then((data) => setPlan(data))
      .catch(() => {});
  }, [token]);

  async function handleCreate() {
    if (!newTitle.trim() || !newFile) return;
    setCreating(true); setError("");
    try {
      // 1. Create project
      const r1 = await fetch(API + "/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
        body: JSON.stringify({ title: newTitle, industry: newIndustry, language: newLang }),
      });
      if (!r1.ok) throw new Error(T("home.createProjectFailed"));
      const project = await r1.json();

      // 2. Upload file
      const fd = new FormData();
      fd.append("file", newFile);
      const r2 = await fetch(API + "/api/upload", {
        method: "POST",
        headers: { Authorization: "Bearer " + token },
        body: fd,
      });
      if (!r2.ok) throw new Error(T("home.uploadFailed"));
      const upload = await r2.json();

      // 3. Link file to project
      await fetch(API + "/api/projects/" + project.id + "/file", {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
        body: JSON.stringify({ original_filename: upload.original_filename, saved_filename: upload.saved_filename }),
      });

      setShowModal(false);
      router.push("/project/" + project.id);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : T("home.createFailed"));
    } finally {
      setCreating(false);
    }
  }

  // Show landing page for unauthenticated visitors
  if (!authLoading && !user) {
    return (
      <>
        <BetaBanner lang={uiLang} />
        <header className="border-b border-slate-100 bg-white">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-3">
            <span className="text-sm font-bold tracking-tight text-slate-900">Lytio</span>
            <div className="flex items-center gap-4">
              <LanguageSelector lang={uiLang} onChange={handleUiLangChange} />
              <Link href="/login" className="text-xs text-slate-500 hover:text-slate-700 transition-colors">{T("home.login")}</Link>
              <Link href="/register" className="rounded-lg bg-slate-900 px-4 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 transition-colors">{T("home.signup")}</Link>
            </div>
          </div>
        </header>
        <LandingPage lang={uiLang} />
      </>
    );
  }

  if (authLoading || loading) {
    return <main className="flex min-h-screen items-center justify-center bg-slate-50"><p className="text-sm text-slate-400">{T("home.loading")}</p></main>;
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <BetaBanner lang={uiLang} />
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-lg font-bold tracking-tight text-slate-900">ExcelPilot</h1>
            <p className="text-xs text-slate-400">{T("home.subtitle")}</p>
          </div>
          <div className="flex items-center gap-4">
            <LanguageSelector lang={uiLang} onChange={handleUiLangChange} />
            <Link href="/workspace" className="text-xs text-slate-400 hover:text-slate-600">{T("home.workspaceV2")}</Link>
            {plan && (
              <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${
                plan.plan === "pro" ? "bg-slate-900 text-white" : "bg-amber-100 text-amber-700"
              }`}>
                {plan.plan === "pro" ? T("home.planPro") : T("home.planTrial", { n: plan.remaining_days })}
              </span>
            )}
            <Link href="/settings" className="text-xs text-slate-400 hover:text-slate-600">{T("home.settings")}</Link>
            {user && <span className="text-xs font-medium text-slate-600">{user.name}</span>}
            <button onClick={logout} className="text-xs text-slate-400 hover:text-slate-600">{T("home.logout")}</button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-6 py-10 space-y-8">
        {/* Security Notice */}
        <SecurityNotice lang={uiLang} />

        {/* Welcome */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900">{user ? T("home.welcomeBackName", { name: user.name.split(" ")[0] }) : T("home.welcomeBack")}</h2>
            <p className="mt-1 text-sm text-slate-500">{T("home.welcomeDesc")}</p>
          </div>
          <button
            onClick={() => { setNewTitle(""); setNewIndustry("sales"); setNewLang("zh"); setNewFile(null); setError(""); setShowModal(true); }}
            className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 shadow-sm"
          >
            {T("home.newAnalysis")}
          </button>
        </div>

        {/* Projects */}
        {projects.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-16 text-center">
            <p className="text-sm font-medium text-slate-400">{T("home.emptyTitle")}</p>
            <p className="mt-1 text-xs text-slate-300">{T("home.emptyDesc")}</p>
            <button
              onClick={() => { setNewTitle(""); setNewIndustry("sales"); setNewLang("zh"); setNewFile(null); setError(""); setShowModal(true); }}
              className="mt-6 inline-flex rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800"
            >
              {T("home.newAnalysis")}
            </button>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((p) => (
              <Link
                key={p.id}
                href={`/project/${p.id}`}
                className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:border-slate-400 hover:shadow-md transition-all"
              >
                <div className="flex items-start justify-between">
                  <h3 className="text-sm font-semibold text-slate-900 group-hover:text-slate-700">{p.title}</h3>
                  <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500 capitalize">{p.industry}</span>
                </div>
                <p className="mt-2 text-xs text-slate-400 truncate">{p.original_filename || T("home.noFile")}</p>
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400">{timeAgo(p.last_opened_at, uiLang)}</span>
                  <span className="text-xs font-medium text-slate-600 group-hover:text-slate-900">{T("home.continue")}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* New Analysis Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl space-y-4">
            <h3 className="text-sm font-semibold text-slate-900">{T("home.modalTitle")}</h3>
            {error && <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</div>}
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">{T("home.projectName")}</label>
              <input type="text" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-400" placeholder={T("home.projectNamePlaceholder")} />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">{T("home.industry")}</label>
              <select value={newIndustry} onChange={(e) => setNewIndustry(e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-400">
                <option value="sales">{T("home.industrySales")}</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">{T("home.reportLanguage")}</label>
              <select value={newLang} onChange={(e) => setNewLang(e.target.value)} className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-400">
                <option value="zh">中文</option>
                <option value="en">English</option>
                <option value="ja">日本語</option>
                <option value="de">Deutsch</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">{T("home.excelFile")}</label>
              <input type="file" accept=".xlsx,.xls" onChange={(e) => setNewFile(e.target.files?.[0] || null)} className="w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border file:border-slate-200 file:bg-white file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-slate-600 hover:file:bg-slate-50" />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <button onClick={() => setShowModal(false)} className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50">{T("home.cancel")}</button>
              <button onClick={handleCreate} disabled={creating || !newTitle.trim() || !newFile} className="rounded-lg bg-slate-900 px-5 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50">
                {creating ? T("home.creating") : T("home.createAnalysis")}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}