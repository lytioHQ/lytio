"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import LanguageSelector from "@/components/LanguageSelector";
import { Card } from "@/components/ui";
import { t, localeForLang } from "@/lib/i18n";
import { useUiLang } from "@/lib/useUiLang";

type FeedbackStatus = "pending" | "processing" | "done";
type FeedbackType = "page" | "data" | "feature" | "other";

interface FeedbackRecord {
  id: string;
  type: FeedbackType;
  desc: string;
  created_at: string;
  page: string;
  project: string | null;
  user: string | null;
  status: FeedbackStatus;
}

const STORAGE_KEY = "lytio.feedback.v1";

function readRecords(): FeedbackRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeRecords(records: FeedbackRecord[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch {
    // Storage may be unavailable; ignore.
  }
}

export default function FeedbackAdminPage() {
  const { uiLang, handleUiLangChange } = useUiLang();
  const T = (key: string, params?: Record<string, string | number>) => t(uiLang, key, params);
  const [records, setRecords] = useState<FeedbackRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setRecords(readRecords());
    setLoading(false);
  }, []);

  function changeStatus(id: string, status: FeedbackStatus) {
    const next = records.map((r) => (r.id === id ? { ...r, status } : r));
    setRecords(next);
    writeRecords(next);
  }

  function formatTime(iso: string): string {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleString(localeForLang(uiLang), {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    <main className="min-h-screen bg-canvas">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-5 md:px-6">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-sm text-secondary transition-colors hover:text-ink">
              {T("feedback.admin.back")}
            </Link>
            <h1 className="text-xl font-semibold tracking-tight text-ink md:text-2xl">{T("feedback.admin.title")}</h1>
          </div>
          <LanguageSelector lang={uiLang} onChange={handleUiLangChange} />
        </div>
      </header>

      <div className="mx-auto max-w-4xl space-y-6 px-4 py-10 md:px-6">
        <Card>
          <div className="border-b border-border px-5 py-4">
            <p className="text-base font-semibold text-ink">{T("feedback.admin.subtitle")}</p>
          </div>
          {loading ? (
            <p className="px-5 py-10 text-center text-sm text-secondary">{T("settings.loading")}</p>
          ) : records.length === 0 ? (
            <p className="px-5 py-12 text-center text-sm text-secondary">{T("feedback.admin.empty")}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] border-collapse text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-caption text-secondary">
                    <th className="px-5 py-3 font-medium">{T("feedback.admin.time")}</th>
                    <th className="px-3 py-3 font-medium">{T("feedback.admin.user")}</th>
                    <th className="px-3 py-3 font-medium">{T("feedback.admin.page")}</th>
                    <th className="px-3 py-3 font-medium">{T("feedback.admin.content")}</th>
                    <th className="px-5 py-3 font-medium">{T("feedback.admin.status")}</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((r) => (
                    <tr key={r.id} className="border-b border-border align-top last:border-none">
                      <td className="whitespace-nowrap px-5 py-4 text-secondary">{formatTime(r.created_at)}</td>
                      <td className="px-3 py-4">
                        <p className="font-medium text-ink">{T(`feedback.type.${r.type}`)}</p>
                        <p className="mt-0.5 max-w-[160px] truncate text-caption text-secondary">{r.user || "—"}</p>
                        {r.project && <p className="text-caption text-secondary/70">#{r.project}</p>}
                      </td>
                      <td className="max-w-[240px] px-3 py-4">
                        <p className="break-all text-caption leading-relaxed text-secondary">{r.page}</p>
                      </td>
                      <td className="max-w-[320px] px-3 py-4">
                        <p className="whitespace-pre-wrap leading-relaxed text-ink">{r.desc}</p>
                      </td>
                      <td className="px-5 py-4">
                        <select
                          value={r.status}
                          onChange={(e) => changeStatus(r.id, e.target.value as FeedbackStatus)}
                          className="w-full rounded-control border border-border bg-surface px-2.5 py-2 text-sm text-ink focus:border-accent focus:outline-none"
                        >
                          <option value="pending">{T("feedback.admin.status.pending")}</option>
                          <option value="processing">{T("feedback.admin.status.processing")}</option>
                          <option value="done">{T("feedback.admin.status.done")}</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="border-t border-border px-5 py-4">
            <p className="text-caption leading-relaxed text-secondary/70">{T("feedback.admin.note")}</p>
          </div>
        </Card>
      </div>
    </main>
  );
}
