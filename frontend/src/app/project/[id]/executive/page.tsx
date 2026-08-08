"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { TOKEN_KEY, useAuth } from "@/lib/AuthContext";
import BusinessValue from "@/components/business/BusinessValue";
import BusinessHealthCard from "@/components/business/BusinessHealthCard";
import ExecutiveSummaryCard from "@/components/business/ExecutiveSummaryCard";
import MetricGrid from "@/components/business/MetricGrid";
import InsightList from "@/components/business/InsightList";
import RiskList from "@/components/business/RiskList";
import RecommendationList from "@/components/business/RecommendationList";

interface ExecutiveReportData {
  title: string;
  generated_at: string | null;
  project_name: string;
  business_health: { score: number; level: string; summary: string } | null;
  executive_summary: { content: string } | null;
  key_metrics: { name: string; value: string; trend: string }[];
  top_insights: { title: string; description: string; confidence: string }[];
  top_risks: { title: string; description: string; severity: string }[];
  top_recommendations: { title: string; description: string; priority: string; expected_impact?: { business_health_change: string; risk_change: string; expected_result: string; confidence: string } | null }[];
  is_legacy: boolean;
}

const API = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

export default function ExecutiveReportPage() {
  const { id } = useParams<{ id: string }>();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [report, setReport] = useState<ExecutiveReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const token = typeof window !== "undefined" ? localStorage.getItem(TOKEN_KEY) : null;

  useEffect(() => { if (!authLoading && !user) router.push("/login"); }, [authLoading, user, router]);

  useEffect(() => {
    if (!token || !id) return;
    fetch(API + "/api/projects/" + id + "/executive", { headers: { Authorization: "Bearer " + token } })
      .then((r) => { if (!r.ok) throw new Error("Failed"); return r.json(); })
      .then((data) => setReport(data))
      .catch(() => setError("Unable to load executive report. Run an analysis first."))
      .finally(() => setLoading(false));
  }, [token, id]);

  if (authLoading || loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-white">
        <p className="text-sm text-slate-400">Loading report&hellip;</p>
      </main>
    );
  }

  if (error || !report) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-white">
        <p className="text-sm text-slate-500">{error || "Report not found"}</p>
        <Link href={`/project/${id}`} className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50">
          &larr; Back to Dashboard
        </Link>
      </main>
    );
  }

  const generatedDate = report.generated_at
    ? new Date(report.generated_at).toLocaleDateString("zh-CN", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })
    : "";

  return (
    <main className="min-h-screen bg-slate-50 print:bg-white">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white print:border-none">
        <div className="mx-auto max-w-4xl px-6 py-6">
          <Link href={`/project/${id}`} className="text-xs text-slate-400 hover:text-slate-600">&larr; Dashboard</Link>
          <h1 className="mt-3 text-xl font-bold tracking-tight text-slate-900">{report.title}</h1>
          <div className="mt-1 flex items-center gap-4">
            <span className="text-xs text-slate-400">{report.project_name}</span>
            {generatedDate && (
              <>
                <span className="text-slate-300">&middot;</span>
                <span className="text-xs text-slate-400">Generated {generatedDate}</span>
              </>
            )}
            {report.is_legacy && (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-700">Legacy Format</span>
            )}
          </div>
        </div>
      </header>

      {/* Report Body */}
      <article className="mx-auto max-w-4xl px-6 py-10">
        <div className="space-y-8">
          {/* Business Health */}
          {report.business_health && <BusinessHealthCard data={report.business_health} />}

          {/* Business Value */}
          {report.business_health && (
            <BusinessValue
              currentHealth={report.business_health.score}
              currentHealthLevel={report.business_health.level}
              recommendations={report.top_recommendations}
              risks={report.top_risks}
              hasImpact={report.top_recommendations.some((r) => r.expected_impact)}
            />
          )}

          {/* Executive Summary */}
          {report.executive_summary && <ExecutiveSummaryCard content={report.executive_summary.content} />}

          {/* Key Metrics */}
          <MetricGrid metrics={report.key_metrics} />

          {/* Key Insights */}
          <InsightList insights={report.top_insights} />

          {/* Risks */}
          <RiskList risks={report.top_risks} />

          {/* Recommendations */}
          <RecommendationList recs={report.top_recommendations} />
        </div>

        {/* Footer */}
        <footer className="mt-16 border-t border-slate-100 pt-6">
          <div className="flex flex-col items-center gap-1">
            <p className="text-xs text-slate-300">ExcelPilot Executive Report</p>
            <p className="text-[10px] text-slate-300">AI Analysis Completed &middot; Data Size: {report.key_metrics.length} metrics &middot; Report Generated {generatedDate}</p>
          </div>
        </footer>
      </article>
    </main>
  );
}