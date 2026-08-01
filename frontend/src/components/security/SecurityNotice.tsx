"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "excelpilot_security_notice_dismissed";
const API = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";

interface AIPolicy {
  data_usage: string;
  retention: string;
  deletion: string;
  privacy: string;
  encryption: string;
}

export default function SecurityNotice() {
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
          <h3 className="text-sm font-semibold text-emerald-800">Your Data is Protected</h3>
          <p className="mt-1 text-xs text-emerald-700">
            ExcelPilot takes security and privacy seriously. Here is how we protect your data:
          </p>
          <ul className="mt-3 space-y-1.5">
            <li className="flex items-center gap-2 text-xs text-emerald-700">
              <span className="text-emerald-500">&#x2713;</span>
              {policy?.encryption || "Files stored securely, accessed only through authenticated APIs"}
            </li>
            <li className="flex items-center gap-2 text-xs text-emerald-700">
              <span className="text-emerald-500">&#x2713;</span>
              {policy?.privacy || "All projects are private to their owner"}
            </li>
            <li className="flex items-center gap-2 text-xs text-emerald-700">
              <span className="text-emerald-500">&#x2713;</span>
              {policy?.data_usage || "Uploaded data is NEVER used for model training"}
            </li>
            <li className="flex items-center gap-2 text-xs text-emerald-700">
              <span className="text-emerald-500">&#x2713;</span>
              {policy?.deletion || "Delete projects anytime - all data is removed permanently"}
            </li>
          </ul>
          <button
            onClick={dismiss}
            className="mt-4 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}