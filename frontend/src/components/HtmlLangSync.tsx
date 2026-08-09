"use client";

import { useEffect } from "react";
import { resolveInitialUiLang } from "@/lib/i18n";

/**
 * M2.3: keeps <html lang> in sync with the resolved UI language after hydration.
 * Server sets the initial lang from the IP-detect cookie; this effect applies the
 * full client resolution (localStorage -> navigator -> cookie -> zh) once mounted.
 */
export default function HtmlLangSync() {
  useEffect(() => {
    document.documentElement.lang = resolveInitialUiLang();
  }, []);
  return null;
}