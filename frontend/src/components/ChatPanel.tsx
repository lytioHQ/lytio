"use client";

import { useEffect, useRef, useState } from "react";
import RecommendationCards from "@/components/RecommendationCards";
import { UILanguage, ReportLanguage, getReportLang } from "@/lib/i18n";

interface Message {
  role: "user" | "assistant";
  content: string;
}

interface Props {
  lang: UILanguage;
  reportLang: ReportLanguage;
  t: (key: string, params?: Record<string, string | number>) => string;
  apiUrl: string;
  plugin: string;
  reportSummary: string;
  reportHighlights: string[];
  reportWarnings: string[];
  headers: string[];
  columnTypes: Record<string, string>;
  rows: (string | number | boolean | null)[][];
  sheetName: string;
  initialQuestions: string[];
}

export default function ChatPanel({
  lang, reportLang, t, apiUrl,
  plugin, reportSummary, reportHighlights, reportWarnings,
  headers, columnTypes, rows, sheetName,
  initialQuestions,
}: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [questions, setQuestions] = useState<string[]>(initialQuestions);
  const [showInput, setShowInput] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendQuestion(text: string) {
    if (!text || sending) return;

    const userMsg: Message = { role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setSending(true);

    try {
      const effectiveReportLang = getReportLang(lang, reportLang);
      const r = await fetch(apiUrl + "/api/analysis/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plugin,
          report_language: effectiveReportLang,
          report_summary: reportSummary,
          report_highlights: reportHighlights,
          report_warnings: reportWarnings,
          headers,
          column_types: columnTypes,
          rows,
          sheet_name: sheetName,
          question: text,
          history: messages.map((m) => ({ role: m.role, content: m.content })),
        }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.detail || "Chat failed");
      const aiMsg: Message = { role: "assistant", content: j.answer };
      setMessages((prev) => [...prev, aiMsg]);
      // Update recommendations with fresh set from backend
      if (j.recommended_questions && j.recommended_questions.length > 0) {
        setQuestions(j.recommended_questions);
      }
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: t("chat.error") }]);
    } finally {
      setSending(false);
    }
  }

  function handleSend() {
    const text = input.trim();
    if (!text) return;
    setInput("");
    sendQuestion(text);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  if (!reportSummary && !reportHighlights.length) return null;
  const hasMessages = messages.length > 0;

  return (
    <div className="space-y-6">
      {/* Recommendation Cards — primary interaction */}
      {questions.length > 0 && (
        <RecommendationCards
          questions={questions}
          onSelect={sendQuestion}
          sending={sending}
          t={t}
        />
      )}

      {/* Chat history */}
      {hasMessages && (
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="max-h-96 overflow-y-auto px-6 py-4 space-y-4">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-xl px-4 py-3 text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "bg-slate-900 text-white"
                      : "bg-slate-100 text-slate-700"
                  }`}
                >
                  <p className="whitespace-pre-line">{msg.content}</p>
                </div>
              </div>
            ))}
            {sending && (
              <div className="flex justify-start">
                <div className="rounded-xl bg-slate-100 px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600" />
                    <span className="text-xs text-slate-400">{t("chat.thinking")}</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        </div>
      )}

      {/* Free-text input — demoted, collapsible */}
      <div className="border-t border-slate-100 pt-4">
        {!showInput && !hasMessages ? (
          <button
            onClick={() => setShowInput(true)}
            className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
          >
            {t("chat.advancedInput")}
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t("chat.inputPlaceholder")}
              disabled={sending}
              className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400 disabled:bg-slate-100"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || sending}
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm text-slate-500 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {t("chat.send")}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}