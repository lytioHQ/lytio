"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { t } from "@/lib/i18n";
import { useUiLang } from "@/lib/useUiLang";

export default function AnalysisPage() {
  const { id } = useParams<{ id: string }>();
  const { uiLang } = useUiLang();
  const T = (key: string, params?: Record<string, string | number>) => t(uiLang, key, params);
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50">
      <div className="text-center">
        <p className="text-sm text-slate-500">{T("projAnalysis.title")}</p>
        <Link href={`/project/${id}`} className="mt-4 inline-block text-xs text-slate-400 hover:text-slate-600">
          {T("nav.backDashboard")}
        </Link>
      </div>
    </main>
  );
}