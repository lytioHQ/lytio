"use client";

import { useState } from "react";
import { persistUiLang, resolveInitialUiLang, UILanguage } from "@/lib/i18n";

/**
 * Shared UI-language state for client pages (M2.3.2).
 * Mirrors the uiLang handling inside useAnalysisPipeline without touching it:
 * - initialize from localStorage -> browser -> IP cookie -> zh
 * - persist manual choices to localStorage + cookie + <html lang>
 */
export function useUiLang() {
  const [uiLang, setUiLang] = useState<UILanguage>(() => resolveInitialUiLang());

  function handleUiLangChange(lang: UILanguage) {
    setUiLang(lang);
    persistUiLang(lang);
  }

  return { uiLang, handleUiLangChange };
}