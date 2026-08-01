"use client";

import { useEffect, useRef, useState } from "react";
import { UILanguage, ReportLanguage, SUPPORTED_UI_LANGS, SUPPORTED_REPORT_LANGS, getReportLang } from "@/lib/i18n";

interface UploadResult { original_filename: string; saved_filename: string; file_size: number; status: string; }
interface DataRow { row_index: number; values: (string | number | boolean | null)[]; }
interface SheetData { name: string; row_count: number; column_count: number; headers: string[]; rows: DataRow[]; }
interface ExtractResult { workbook: string; sheets: SheetData[]; }
interface ColumnInfo { name: string; type: string; }
interface SemanticSheet { sheet: string; row_count: number; column_count: number; columns: ColumnInfo[]; }
interface SemanticResult { workbook: string; tables: SemanticSheet[]; }
export interface AnalysisResult { plugin: string; sheet: string; summary: string; highlights: string[]; warnings: string[]; recommendations: string[]; metadata: Record<string, unknown>; recommended_questions?: string[]; result?: Record<string, unknown> | null; is_legacy?: boolean; }
export interface ChatContext { reportSummary: string; reportHighlights: string[]; reportWarnings: string[]; headers: string[]; columnTypes: Record<string, string>; rows: (string | number | boolean | null)[][]; sheetName: string; }

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

export function useAnalysisPipeline() {
  const [status, setStatus] = useState<"loading" | "running" | "offline">("loading");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
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
  const [uiLang, setUiLang] = useState<UILanguage>(() =>
    loadSetting<UILanguage>("excelpilot_ui_lang", "zh", (v) => (SUPPORTED_UI_LANGS as readonly string[]).includes(v) ? (v as UILanguage) : null)
  );
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

  function handleUiLangChange(lang: UILanguage) { setUiLang(lang); saveSetting("excelpilot_ui_lang", lang); }
  function handleReportLangChange(lang: ReportLanguage) { setReportLang(lang); saveSetting("excelpilot_report_lang", lang); }

  function reset() {
    setUploadResult(null); setError(null); setValidated(null);
    setAnalysis(null); setChatContext(null); setInitialQuestions([]); setResultData(null); setIsLegacy(false);
    setExtractData(null); setSemanticData(null);
  }

  async function handleUpload() {
    if (!file) return;
    setUploading(true); reset();
    const fd = new FormData(); fd.append("file", file);
    try {
      const r = await fetch(apiUrl + "/api/upload", { method: "POST", body: fd });
      const j = await r.json();
      if (!r.ok) { setError(j.detail || "Upload failed"); return; }
      setUploadResult(j); setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      await runPipeline(j.saved_filename);
    } catch { setError("Upload failed."); }
    finally { setUploading(false); }
  }

  async function runPipeline(filename: string) {
    setProcessing(true);
    try {
      const r2 = await fetch(apiUrl + "/api/workbook/extract", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ saved_filename: filename }),
      });
      const j2 = await r2.json(); if (!r2.ok) throw new Error(j2.detail); setExtractData(j2);

      const r3 = await fetch(apiUrl + "/api/workbook/semantic", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ saved_filename: filename }),
      });
      const j3 = await r3.json(); if (!r3.ok) throw new Error(j3.detail); setSemanticData(j3);

      const s = j2.sheets[0];
      setValidated({ sheet: s.name, rows: s.row_count, cols: s.column_count });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Processing failed");
    } finally { setProcessing(false); }
  }

  async function handleAnalyze() {
    if (!uploadResult || !semanticData || !extractData) return;
    const sheet = semanticData.tables[0];
    const xs = extractData.sheets[0];
    const columnTypes: Record<string, string> = {};
    sheet.columns.forEach((c: ColumnInfo) => { columnTypes[c.name] = c.type; });
    const effectiveReportLang = getReportLang(uiLang, reportLang);
    setAnalyzing(true); setError(null);
    try {
      const r = await fetch(apiUrl + "/api/analysis/sales", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          saved_filename: uploadResult.saved_filename, sheet_name: sheet.sheet,
          headers: xs.headers, column_types: columnTypes,
          rows: xs.rows.map((row: DataRow) => row.values),
          plugin: "sales", report_language: effectiveReportLang, ui_language: uiLang,
        }),
      });
      const j = await r.json();
      if (!r.ok) {
        const detail = Array.isArray(j.detail) ? j.detail.map((d: { msg: string }) => d.msg).join("; ") : (j.detail || "Analysis failed");
        throw new Error(detail);
      }
      setAnalysis(j);
      setInitialQuestions(j.recommended_questions || []);
      setResultData(j.result || null);
      setIsLegacy(j.is_legacy || false);
      setChatContext({
        reportSummary: j.summary, reportHighlights: j.highlights, reportWarnings: j.warnings,
        headers: xs.headers, columnTypes,
        rows: xs.rows.map((row: DataRow) => row.values), sheetName: sheet.sheet,
      });
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Analysis failed");
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
  };
}