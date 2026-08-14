"use client";

import { useEffect, useRef, useState } from "react";
import { TOKEN_KEY } from "@/lib/apiFetch";
import { UILanguage, ReportLanguage, SUPPORTED_REPORT_LANGS, getReportLang, resolveInitialUiLang, persistUiLang } from "@/lib/i18n";

interface UploadResult { original_filename: string; saved_filename: string; file_size: number; status: string; }
interface DataRow { row_index: number; values: (string | number | boolean | null)[]; }
interface SheetData { name: string; row_count: number; column_count: number; headers: string[]; rows: DataRow[]; }
interface ExtractResult { workbook: string; sheets: SheetData[]; }
interface ColumnInfo { name: string; type: string; }
interface SemanticSheet { sheet: string; row_count: number; column_count: number; columns: ColumnInfo[]; }
interface SemanticResult { workbook: string; tables: SemanticSheet[]; }
export interface AnalysisResult { plugin: string; sheet: string; summary: string; highlights: string[]; warnings: string[]; recommendations: string[]; metadata: Record<string, unknown>; recommended_questions?: string[]; result?: Record<string, unknown> | null; is_legacy?: boolean; }
export interface ChatContext { reportSummary: string; reportHighlights: string[]; reportWarnings: string[]; headers: string[]; columnTypes: Record<string, string>; rows: (string | number | boolean | null)[][]; sheetName: string; }

export type PipelineStage =
  | "idle"
  | "uploading"
  | "parsing"
  | "detecting"
  | "ready"
  | "thinking"
  | "generating"
  | "done";

export interface PipelineOptions {
  projectId?: number | null;
  analysisDirection?: string | null;
  onComplete?: (result: AnalysisResult) => void;
}

function loadSetting<T>(key: string, fallback: T, validate: (v: string) => T | null): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (raw) { const parsed = validate(raw); if (parsed !== null) return parsed; }
  } catch { /* ignore */ }
  return fallback;
}

function saveSetting(key: string, value: string) {
  try { localStorage.setItem(key, value); } catch { /* ignore */ }
}

function authHeaders(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const token = window.localStorage.getItem(TOKEN_KEY);
  return token ? { Authorization: "Bearer " + token } : {};
}

export function useAnalysisPipeline(options?: PipelineOptions) {
  const { projectId, analysisDirection, onComplete } = options || {};
  const [status, setStatus] = useState<"loading" | "running" | "offline">("loading");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [stage, setStage] = useState<PipelineStage>("idle");
  const [failed, setFailed] = useState(false);
  const [saved, setSaved] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [validated, setValidated] = useState<{ sheet: string; rows: number; cols: number } | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [chatContext, setChatContext] = useState<ChatContext | null>(null);
  const [initialQuestions, setInitialQuestions] = useState<string[]>([]);
  const [resultData, setResultData] = useState<Record<string, unknown> | null>(null);
  const [isLegacy, setIsLegacy] = useState(false);
  const [extractData, setExtractData] = useState<ExtractResult | null>(null);
  const [semanticData, setSemanticData] = useState<SemanticResult | null>(null);
  const [activeIndustry, setActiveIndustry] = useState("sales");
  const [uiLang, setUiLang] = useState<UILanguage>(() => resolveInitialUiLang());
  const [reportLang, setReportLang] = useState<ReportLanguage>(() =>
    loadSetting<ReportLanguage>("excelpilot_report_lang", "follow", (v) => v === "follow" || (SUPPORTED_REPORT_LANGS as readonly string[]).includes(v) ? (v as ReportLanguage) : null)
  );

  const apiUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

  useEffect(() => {
    fetch(apiUrl + "/")
      .then((r) => r.json())
      .then(() => setStatus("running"))
      .catch(() => setStatus("offline"));
  }, [apiUrl]);

  function handleUiLangChange(lang: UILanguage) { setUiLang(lang); persistUiLang(lang); }
  function handleReportLangChange(lang: ReportLanguage) { setReportLang(lang); saveSetting("excelpilot_report_lang", lang); }

  function reset() {
    setUploadResult(null); setError(null); setValidated(null);
    setAnalysis(null); setChatContext(null); setInitialQuestions([]); setResultData(null); setIsLegacy(false);
    setExtractData(null); setSemanticData(null);
    setStage("idle");
    setFailed(false);
    setSaved(false);
  }

  async function handleUpload() {
    if (!file) return;
    setUploading(true); setFailed(false); reset();
    setStage("uploading");
    const fd = new FormData(); fd.append("file", file);
    try {
      const r = await fetch(apiUrl + "/api/upload", { method: "POST", headers: authHeaders(), body: fd });
      const j = await r.json();
      if (!r.ok) { setError(j.detail || "Upload failed"); setFailed(true); return; }
      setUploadResult(j); setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      await runPipeline(j.saved_filename);
    } catch { setError("Upload failed."); setFailed(true); }
    finally { setUploading(false); }
  }

  async function runPipeline(filename: string) {
    setProcessing(true);
    try {
      setStage("parsing");
      const r2 = await fetch(apiUrl + "/api/workbook/extract", {
        method: "POST", headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ saved_filename: filename }),
      });
      const j2 = await r2.json(); if (!r2.ok) throw new Error(j2.detail); setExtractData(j2);

      setStage("detecting");
      const r3 = await fetch(apiUrl + "/api/workbook/semantic", {
        method: "POST", headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({ saved_filename: filename }),
      });
      const j3 = await r3.json(); if (!r3.ok) throw new Error(j3.detail); setSemanticData(j3);

      const s = j2.sheets[0];
      setValidated({ sheet: s.name, rows: s.row_count, cols: s.column_count });
      setStage("ready");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Processing failed");
      setFailed(true);
    } finally { setProcessing(false); }
  }

  /** Start the pipeline from a server-side file (used by the project analysis page). */
  async function runSavedFile(filename: string) {
    reset();
    setUploadResult({ original_filename: "", saved_filename: filename, file_size: 0, status: "uploaded" });
    setStage("uploading");
    await runPipeline(filename);
  }

  async function handleAnalyze() {
    if (!uploadResult || !semanticData || !extractData) return;
    const sheet = semanticData.tables[0];
    const xs = extractData.sheets[0];
    const columnTypes: Record<string, string> = {};
    sheet.columns.forEach((c: ColumnInfo) => { columnTypes[c.name] = c.type; });
    const effectiveReportLang = getReportLang(uiLang, reportLang);
    setAnalyzing(true); setError(null); setFailed(false);
    setStage("thinking");
    try {
      const r = await fetch(apiUrl + "/api/analysis/sales", {
        method: "POST", headers: { "Content-Type": "application/json", ...authHeaders() },
        body: JSON.stringify({
          saved_filename: uploadResult.saved_filename, sheet_name: sheet.sheet,
          headers: xs.headers, column_types: columnTypes,
          rows: xs.rows.map((row: DataRow) => row.values),
          plugin: "sales", report_language: effectiveReportLang, ui_language: uiLang,
          project_id: projectId ?? undefined,
          analysis_direction: analysisDirection || "overview",
        }),
      });
      const j = await r.json();
      if (!r.ok) {
        const detail = Array.isArray(j.detail) ? j.detail.map((d: { msg: string }) => d.msg).join("; ") : (j.detail || "Analysis failed");
        setFailed(true);
        throw new Error(detail);
      }
      setStage("generating");
      setAnalysis(j);
      setInitialQuestions(j.recommended_questions || []);
      setResultData(j.result || null);
      setIsLegacy(j.is_legacy || false);
      setChatContext({
        reportSummary: j.summary, reportHighlights: j.highlights, reportWarnings: j.warnings,
        headers: xs.headers, columnTypes,
        rows: xs.rows.map((row: DataRow) => row.values), sheetName: sheet.sheet,
      });

      if (projectId) {
        // Persist the first analysis result as an AnalysisRun so the project
        // detail page, timeline and executive report can render it.
        let structuredResult = j.result && typeof j.result === "object" && Object.keys(j.result).length > 0
          ? j.result
          : {
              insights: (j.highlights || []).map((h: string) => ({ title: h, description: h })),
              risks: (j.warnings || []).map((w: string) => ({ title: w, description: w })),
              recommendations: (j.recommendations || []).map((item: string) => ({ title: item, description: item })),
              executive_summary: { content: j.summary || "" },
            };
        const effectiveDirection = analysisDirection || "overview";
        structuredResult = {
          ...structuredResult,
          analysis_direction: effectiveDirection,
          analysis_type: analysisDirection ? "deep_analysis" : "health_scan",
        };
        const saveRes = await fetch(apiUrl + "/api/projects/" + projectId + "/result", {
          method: "PATCH",
          headers: { "Content-Type": "application/json", ...authHeaders() },
          body: JSON.stringify({
            summary: j.summary || "",
            result_json: JSON.stringify(structuredResult),
            is_legacy: j.is_legacy || false,
          }),
        });
        if (!saveRes.ok) {
          const saveErr = await saveRes.json().catch(() => null);
          setFailed(true);
          throw new Error(saveErr?.detail || "Failed to save analysis result");
        }
        setSaved(true);
        onComplete?.(j);
      }
      setStage("done");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Analysis failed");
      setFailed(true);
    } finally { setAnalyzing(false); }
  }

  const ready = !!(validated && !processing && !uploading);

  return {
    status, fileInputRef, file, setFile, uploading, processing, analyzing,
    uploadResult, error, validated, analysis, chatContext, initialQuestions,
    extractData, semanticData, activeIndustry, setActiveIndustry,
    uiLang, setUiLang: handleUiLangChange,
    reportLang, setReportLang: handleReportLangChange,
    apiUrl, ready,
    resultData, isLegacy, handleUpload, handleAnalyze,
    runSavedFile, saved,
    stage, failed,
  };
}