"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { t } from "@/lib/i18n";
import { useUiLang } from "@/lib/useUiLang";
import { Card, SectionTitle } from "@/components/ui";
import { buttonBaseClasses, buttonVariantClasses } from "@/components/ui/Button";

const PRIMARY_LINK = "${buttonBaseClasses} ${buttonVariantClasses.primary}";

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