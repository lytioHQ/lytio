"use client";

import { useEffect, useState } from "react";
import { t, UILanguage, SUPPORTED_UI_LANGS } from "@/lib/i18n";

type FeedbackType = "bug" | "feature" | "suggestion";

const FEEDBACK_TYPES: FeedbackType[] = ["bug", "feature", "suggestion"];

export default function FeedbackWidget() {
  const [lang, setLang] = useState<UILanguage>("zh");
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<FeedbackType | null>(null);
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("excelpilot_ui_lang");
      if (raw && (SUPPORTED_UI_LANGS as readonly string[]).includes(raw)) setLang(raw as UILanguage);
    } catch {
      /* ignore */
    }
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
        className="fixed bottom-5 right-5 z-40 rounded-full bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white shadow-lg transition-colors hover:bg-slate-800"
      >
        {T("feedback.button")}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30" onClick={reset} aria-hidden />
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            {submitted ? (
              <div className="space-y-4 text-center">
                <h3 className="text-sm font-semibold text-slate-900">{T("feedback.thanks")}</h3>
                <button
                  type="button"
                  onClick={reset}
                  className="rounded-lg bg-slate-900 px-5 py-2 text-xs font-semibold text-white hover:bg-slate-800"
                >
                  {T("feedback.cancel")}
                </button>
              </div>
            ) : !type ? (
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">{T("feedback.title")}</h3>
                  <p className="mt-0.5 text-xs text-slate-400">{T("feedback.subtitle")}</p>
                </div>
                <div className="space-y-2">
                  {FEEDBACK_TYPES.map((fb) => (
                    <button
                      key={fb}
                      type="button"
                      onClick={() => selectType(fb)}
                      className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-left transition-colors hover:border-slate-400 hover:bg-slate-50"
                    >
                      <span>
                        <span className="block text-sm font-medium text-slate-800">{T(`feedback.${fb}`)}</span>
                        <span className="block text-xs text-slate-400">{T(`feedback.${fb}Desc`)}</span>
                      </span>
                      <span className="text-slate-300">&rarr;</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900">{T(`feedback.${type}`)}</h3>
                    <p className="mt-0.5 text-xs text-slate-400">{T("feedback.subtitle")}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setType(null)}
                    className="text-xs font-medium text-slate-400 hover:text-slate-600"
                  >
                    &larr; {T("feedback.back")}
                  </button>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">{T("feedback.titleLabel")}</label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-400"
                    placeholder={T("feedback.titlePlaceholder")}
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">{T("feedback.descLabel")}</label>
                  <textarea
                    value={desc}
                    onChange={(e) => setDesc(e.target.value)}
                    rows={4}
                    className="w-full resize-none rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-400"
                    placeholder={T("feedback.descPlaceholder")}
                  />
                </div>

                <p className="text-[11px] text-slate-400">{T("feedback.hint")}</p>

                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={reset}
                    className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50"
                  >
                    {T("feedback.cancel")}
                  </button>
                  <button
                    type="button"
                    onClick={submit}
                    disabled={!title.trim()}
                    className="rounded-lg bg-slate-900 px-5 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
                  >
                    {T("feedback.submit")}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}