"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { t } from "@/lib/i18n";
import { useUiLang } from "@/lib/useUiLang";
import { Card, SectionTitle } from "@/components/ui";

const PRIMARY_LINK =
  "inline-flex h-11 items-center justify-center rounded-control bg-ink px-5 text-sm font-medium text-white transition-colors hover:bg-[#3A3A3C]";

export default function AnalysisPage() {
  const { id } = useParams<{ id: string }>();
  const { uiLang } = useUiLang();
  const T = (key: string, params?: Record<string, string | number>) => t(uiLang, key, params);
  return (
    <main className="flex min-h-screen items-center justify-center bg-canvas px-4">
      <Card className="w-full max-w-md p-8">
        <SectionTitle title={T("projAnalysis.title")} />
        <div className="mt-6 flex justify-center">
          <Link href={`/project/${id}`} className={PRIMARY_LINK}>
            {T("nav.backDashboard")}
          </Link>
        </div>
      </Card>
    </main>
  );
}