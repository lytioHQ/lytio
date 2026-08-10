"use client";

import { useEffect, useRef, useState } from "react";
import RecommendationCards from "@/components/RecommendationCards";
import { Button } from "@/components/ui";
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
        <div className="overflow-hidden rounded-card border border-border bg-surface">
          <div className="max-h-96 space-y-4 overflow-y-auto px-4 py-5 md:px-6">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-control px-4 py-3 text-body leading-relaxed ${
                    msg.role === "user"
                      ? "bg-accent text-white"
                      : "border border-border bg-surface text-ink"
                  }`}
                >
                  <p className="whitespace-pre-line">{msg.content}</p>
                </div>
              </div>
            ))}
            {sending && (
              <div className="flex justify-start">
                <div className="rounded-control border border-border bg-surface px-4 py-3">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 animate-spin rounded-full border-2 border-border border-t-accent" />
                    <span className="text-caption text-secondary">{t("chat.thinking")}</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        </div>
      )}

      {/* Free-text input — demoted, collapsible */}
      <div className="border-t border-border pt-4">
        {!showInput && !hasMessages ? (
          <button
            onClick={() => setShowInput(true)}
            className="text-sm text-secondary transition-colors hover:text-ink"
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
              className="h-11 flex-1 rounded-control border border-border bg-canvas px-4 text-base text-ink placeholder:text-secondary focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/40 disabled:opacity-50"
            />
            <Button onClick={handleSend} disabled={!input.trim() || sending}>
              {t("chat.send")}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}