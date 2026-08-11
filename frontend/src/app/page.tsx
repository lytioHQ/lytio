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
import { Button, Card, SectionTitle } from "@/components/ui";
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

const inputClasses =
  "w-full rounded-control border border-border bg-surface px-3 py-2.5 text-sm text-ink placeholder:text-secondary focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/40";

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

  function openNewAnalysisModal() {
    setNewTitle("");
    setNewIndustry("sales");
    setNewLang("zh");
    setNewFile(null);
    setError("");
    setShowModal(true);
  }

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
        <header className="border-b border-border bg-surface">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
            <span className="text-base font-semibold tracking-tight text-ink">Lytio</span>
            <div className="flex items-center gap-5">
              <LanguageSelector lang={uiLang} onChange={handleUiLangChange} />
              <Link href="/login" className="text-sm text-secondary transition-colors hover:text-ink">{T("home.login")}</Link>
              <Link href="/register" className="inline-flex h-9 items-center rounded-control bg-ink px-4 text-sm font-medium text-white transition-colors hover:bg-[#3A3A3C]">{T("home.signup")}</Link>
            </div>
          </div>
        </header>
        <LandingPage lang={uiLang} />
      </>
    );
  }

  if (authLoading || loading) {
    return <main className="flex min-h-screen items-center justify-center bg-canvas"><p className="text-sm text-secondary">{T("home.loading")}</p></main>;
  }

  return (
    <main className="min-h-screen bg-canvas">
      <BetaBanner lang={uiLang} />
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-x-4 gap-y-3 px-6 py-5">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-ink">ExcelPilot</h1>
            <p className="mt-0.5 text-sm text-secondary">{T("home.subtitle")}</p>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 sm:gap-5">
            <LanguageSelector lang={uiLang} onChange={handleUiLangChange} />
            <Link href="/workspace" className="text-sm text-secondary transition-colors hover:text-ink">{T("home.workspaceV2")}</Link>
            {plan && (
              <span className={`hidden rounded-full px-2.5 py-1 text-caption font-semibold sm:inline ${
                plan.plan === "pro" ? "bg-ink text-white" : "bg-warning/10 text-warning"
              }`}>
                {plan.plan === "pro" ? T("home.planPro") : T("home.planTrial", { n: plan.remaining_days })}
              </span>
            )}
            <Link href="/settings" className="text-sm text-secondary transition-colors hover:text-ink">{T("home.settings")}</Link>
            {user && <span className="hidden text-sm font-medium text-ink sm:inline">{user.name}</span>}
            <button onClick={logout} className="text-sm text-secondary transition-colors hover:text-ink">{T("home.logout")}</button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-6 py-12 space-y-10">
        {/* Security Notice */}
        <SecurityNotice lang={uiLang} />

        {/* Welcome */}
        <SectionTitle
          title={user ? T("home.welcomeBackName", { name: user.name.split(" ")[0] }) : T("home.welcomeBack")}
          description={T("home.welcomeDesc")}
          action={<Button onClick={openNewAnalysisModal}>{T("home.newAnalysis")}</Button>}
        />

        {/* Projects */}
        {projects.length === 0 ? (
          <div className="rounded-card border border-dashed border-border bg-surface p-16 text-center">
            <p className="text-base font-medium text-ink">{T("home.emptyTitle")}</p>
            <p className="mt-2 text-sm text-secondary">{T("home.emptyDesc")}</p>
            <div className="mt-8 flex justify-center">
              <Button onClick={openNewAnalysisModal}>{T("home.newAnalysis")}</Button>
            </div>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((p) => (
              <Link key={p.id} href={`/project/${p.id}`} className="group block h-full">
                <Card variant="interactive" className="flex h-full flex-col">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-base font-semibold text-ink">{p.title}</h3>
                    <span className="shrink-0 rounded-full bg-canvas px-2.5 py-1 text-xs font-medium capitalize text-secondary">{p.industry}</span>
                  </div>
                  <p className="mt-2 truncate text-sm text-secondary">{p.original_filename || T("home.noFile")}</p>
                  <div className="mt-auto flex items-center justify-between pt-4">
                    <span className="text-caption text-secondary">{timeAgo(p.last_opened_at, uiLang)}</span>
                    <span className="text-sm font-medium text-accent">{T("home.continue")} →</span>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* New Analysis Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="w-full max-w-md space-y-5 rounded-card border border-border bg-surface p-6 shadow-[0_4px_16px_rgba(0,0,0,0.12)]">
            <h3 className="text-lg font-semibold text-ink">{T("home.modalTitle")}</h3>
            {error && <div className="rounded-control border border-danger/20 bg-danger/5 px-3 py-2 text-sm text-danger">{error}</div>}
            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink">{T("home.projectName")}</label>
              <input type="text" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} className={inputClasses} placeholder={T("home.projectNamePlaceholder")} />
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink">{T("home.industry")}</label>
              <select value={newIndustry} onChange={(e) => setNewIndustry(e.target.value)} className={inputClasses}>
                <option value="sales">{T("home.industrySales")}</option>
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink">{T("home.reportLanguage")}</label>
              <select value={newLang} onChange={(e) => setNewLang(e.target.value)} className={inputClasses}>
                <option value="zh">中文</option>
                <option value="en">English</option>
                <option value="ja">日本語</option>
                <option value="de">Deutsch</option>
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm font-medium text-ink">{T("home.excelFile")}</label>
              <input type="file" accept=".xlsx,.xls" onChange={(e) => setNewFile(e.target.files?.[0] || null)} className="w-full text-sm text-secondary file:mr-3 file:rounded-control file:border file:border-border file:bg-surface file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-ink hover:file:bg-canvas" />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="secondary" onClick={() => setShowModal(false)}>{T("home.cancel")}</Button>
              <Button onClick={handleCreate} disabled={creating || !newTitle.trim() || !newFile}>
                {creating ? T("home.creating") : T("home.createAnalysis")}
              </Button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}