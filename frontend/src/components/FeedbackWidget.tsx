"use client";

import { useEffect, useState } from "react";
import { isUILanguage, resolveInitialUiLang, t, UILanguage } from "@/lib/i18n";
import { Button } from "@/components/ui";

type FeedbackType = "bug" | "feature" | "suggestion";

const FEEDBACK_TYPES: FeedbackType[] = ["bug", "feature", "suggestion"];

const inputClasses =
  "w-full rounded-control border border-border bg-surface px-3.5 py-2.5 text-sm text-ink placeholder:text-secondary focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/40";

export default function FeedbackWidget() {
  const [lang, setLang] = useState<UILanguage>(() => resolveInitialUiLang());
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<FeedbackType | null>(null);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [submitted, setSubmitted] = useState(false);

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
    setTitle(T(`feedback.${fb}`));
    setDesc("");
    setSubmitted(false);
  }

  function reset() {
    setOpen(false);
    setType(null);
    setTitle("");
    setDesc("");
    setSubmitted(false);
  }

  function submit() {
    if (!type || !title.trim()) return;
    const recipient = "feedback@lytio.co";
    const subject = `[${T(`feedback.${type}`)}] ${title.trim()}`;
    const body = [
      `Category: ${T(`feedback.${type}`)}`,
      `Page: ${window.location.href}`,
      `Browser: ${navigator.userAgent}`,
      "",
      desc.trim(),
    ].join("\n");
    const url = `mailto:${recipient}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = url;
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
                        <span className="block text-[15px] font-medium text-ink">{T(`feedback.${fb}`)}</span>
                        <span className="mt-0.5 block text-sm text-secondary">{T(`feedback.${fb}Desc`)}</span>
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
                    <h3 className="text-h3 text-ink">{T(`feedback.${type}`)}</h3>
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
                  <label className="mb-1.5 block text-sm font-medium text-ink">{T("feedback.titleLabel")}</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className={inputClasses}
                    placeholder={T("feedback.titlePlaceholder")}
                  />
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
                  <Button onClick={submit} disabled={!title.trim()}>{T("feedback.submit")}</Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}