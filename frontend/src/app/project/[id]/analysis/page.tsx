"use client";

import { useParams } from "next/navigation";
import Link from "next/link";

export default function AnalysisPage() {
  const { id } = useParams<{ id: string }>();
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50">
      <div className="text-center">
        <p className="text-sm text-slate-500">Analysis workspace</p>
        <Link href={`/project/${id}`} className="mt-4 inline-block text-xs text-slate-400 hover:text-slate-600">
          &larr; Back to Dashboard
        </Link>
      </div>
    </main>
  );
}