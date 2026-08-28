"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { isUILanguage, resolveInitialUiLang, t, UILanguage } from "@/lib/i18n";
import { useAuth } from "@/lib/AuthContext";
import { Button } from "@/components/ui";

type FeedbackType = "page" | "data" | "feature" | "other";

const FEEDBACK_TYPES: FeedbackType[] = ["page", "data", "feature", "other"];

const STORAGE_KEY = "lytio.feedback.v1";

interface FeedbackRecord {
  id: string;
  type: FeedbackType;
  desc: string;
  created_at: string;
  page: string;
  project: string | null;
  user: string | null;
  status: "pending" | "processing" | "done";
}

const inputClasses =
  "w-full rounded-control border border-border bg-surface px-3.5 py-2.5 text-sm text-ink placeholder:text-secondary focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/40";

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
    // Storage may be unavailable (private mode); fail silently.
  }
}

export default function FeedbackWidget() {
  const [lang, setLang] = useState<UILanguage>(() => resolveInitialUiLang());
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<FeedbackType | null>(null);
  const [desc, setDesc] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const pathname = usePathname();
  const { user } = useAuth();

  useEffect(() => {
    // Keep the widget language in sync with <html lang>, which persistUiLang
    // updates on every language switch (homepage/workspace/settings selectors).
    const el = document.documentElement;
    const sync = () => {
      setLang((prev) => {
        const raw = el.lang;
        return isUILanguage(raw) && raw !== prev ? raw : prev;
      });
    };
    sync();
    const observer = new MutationObserver(sync);
    observer.observe(el, { attributes: true, attributeFilter: ["lang"] });
    return () => observer.disconnect();
  }, []);

  const T = (key: string) => t(lang, key);

  function selectType(fb: FeedbackType) {
    setType(fb);
    setDesc("");
    setSubmitted(false);
  }

  function reset() {
    setOpen(false);
    setType(null);
    setDesc("");
    setSubmitted(false);
  }

  function submit() {
    if (!type || !desc.trim()) return;
    const now = new Date();
    const record: FeedbackRecord = {
      id: `fb_${now.getTime()}_${Math.random().toString(36).slice(2, 8)}`,
      type,
      desc: desc.trim(),
      created_at: now.toISOString(),
      page: window.location.href,
      project: null,
      user: user ? user.email || user.name : null,
      status: "pending",
    };
    const m = pathname?.match(/^\/project\/([^/]+)/);
    if (m) record.project = m[1];
    const records = readRecords();
    records.unshift(record);
    writeRecords(records);
    setSubmitted(true);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-40 rounded-full bg-ink px-4 py-2.5 text-sm font-semibold text-white shadow-[0_4px_16px_rgba(0,0,0,0.15)] transition-colors hover:bg-ink-hover"
      >
        {T("feedback.button")}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30" onClick={reset} aria-hidden />
          <div className="relative w-full max-w-md rounded-card border border-border bg-surface p-6 shadow-[0_4px_16px_rgba(0,0,0,0.12)]">
            {submitted ? (
              <div className="space-y-4 text-center">
                <h3 className="text-h3 text-ink">{T("feedback.thanks")}</h3>
                <p className="text-sm text-secondary">{T("feedback.saved")}</p>
                <Button variant="secondary" onClick={reset}>{T("feedback.cancel")}</Button>
              </div>
            ) : !type ? (
              <div className="space-y-4">
                <div>
                  <h3 className="text-h3 text-ink">{T("feedback.title")}</h3>
                  <p className="mt-0.5 text-sm text-secondary">{T("feedback.subtitle")}</p>
                </div>
                <div className="space-y-2">
                  {FEEDBACK_TYPES.map((fb) => (
                    <button
                      key={fb}
                      type="button"
                      onClick={() => selectType(fb)}
                      className="flex w-full items-center justify-between rounded-control border border-border bg-surface px-4 py-3 text-left transition-colors hover:border-accent/40 hover:bg-canvas"
                    >
                      <span>
                        <span className="block text-[15px] font-medium text-ink">{T(`feedback.type.${fb}`)}</span>
                        <span className="mt-0.5 block text-sm text-secondary">{T(`feedback.type.${fb}Desc`)}</span>
                      </span>
                      <span className="text-secondary/50">&rarr;</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-h3 text-ink">{T(`feedback.type.${type}`)}</h3>
                    <p className="mt-0.5 text-sm text-secondary">{T("feedback.subtitle")}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setType(null)}
                    className="text-sm font-medium text-secondary hover:text-ink"
                  >
                    &larr; {T("feedback.back")}
                  </button>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-ink">{T("feedback.descLabel")}</label>
                  <textarea
                    value={desc}
                    onChange={(e) => setDesc(e.target.value)}
                    rows={4}
                    className={`${inputClasses} resize-none`}
                    placeholder={T("feedback.descPlaceholder")}
                  />
                </div>

                <p className="text-caption text-secondary">{T("feedback.hint")}</p>

                <div className="flex justify-end gap-3">
                  <Button variant="secondary" onClick={reset}>{T("feedback.cancel")}</Button>
                  <Button onClick={submit} disabled={!desc.trim()}>{T("feedback.submit")}</Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
