"use client";

import { useEffect, useState } from "react";
import { t, UILanguage } from "@/lib/i18n";

const STORAGE_KEY = "excelpilot_security_notice_dismissed";
const API = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

interface AIPolicy {
  data_usage: string;
  retention: string;
  deletion: string;
  privacy: string;
  encryption: string;
}

export default function SecurityNotice({ lang }: { lang: UILanguage }) {
  const T = (key: string, params?: Record<string, string | number>) => t(lang, key, params);
  const [visible, setVisible] = useState(false);
  const [policy, setPolicy] = useState<AIPolicy | null>(null);

  useEffect(() => {
    const dismissed = localStorage.getItem(STORAGE_KEY);
    if (dismissed) return;
    setVisible(true);
    fetch(API + "/api/config/ai-policy")
      .then((r) => r.json())
      .then((data) => setPolicy(data))
      .catch(() => {});
  }, []);

  function dismiss() {
    localStorage.setItem(STORAGE_KEY, "1");
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-6 shadow-sm">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 text-lg">&#x1f512;</span>
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-emerald-800">{T("security.title")}</h3>
          <p className="mt-1 text-xs text-emerald-700">
            {T("security.intro")}
          </p>
          <ul className="mt-3 space-y-1.5">
            <li className="flex items-center gap-2 text-xs text-emerald-700">
              <span className="text-emerald-500">&#x2713;</span>
              {policy?.encryption || T("security.encryptionFallback")}
            </li>
            <li className="flex items-center gap-2 text-xs text-emerald-700">
              <span className="text-emerald-500">&#x2713;</span>
              {policy?.privacy || T("security.privacyFallback")}
            </li>
            <li className="flex items-center gap-2 text-xs text-emerald-700">
              <span className="text-emerald-500">&#x2713;</span>
              {policy?.data_usage || T("security.dataUsageFallback")}
            </li>
            <li className="flex items-center gap-2 text-xs text-emerald-700">
              <span className="text-emerald-500">&#x2713;</span>
              {policy?.deletion || T("security.deletionFallback")}
            </li>
          </ul>
          <button
            onClick={dismiss}
            className="mt-4 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700"
          >
            {T("security.gotIt")}
          </button>
        </div>
      </div>
    </div>
  );
}