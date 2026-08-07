"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ContinueDirection } from "@/components/ContinueAnalysisPanel";
import type { HistoryEntry, HistoryEntryType } from "@/components/AnalysisHistoryPanel";

const STORAGE_KEY = "excelpilot_analysis_history";

function nowTime(): string {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function uid(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function useAnalysisSession() {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [followUps, setFollowUps] = useState<{ id: string; direction: ContinueDirection; label: string }[]>([]);
  const initialLogged = useRef(false);
  const recommendedLogged = useRef(false);

  // Load session history once on mount.
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setHistory(parsed);
      }
    } catch {
      /* ignore */
    }
  }, []);

  // Persist history on change (session only, no backend).
  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    } catch {
      /* ignore */
    }
  }, [history]);

  const addEntry = useCallback((type: HistoryEntryType, title: string) => {
    const entry: HistoryEntry = { id: uid(), type, title, time: nowTime() };
    setHistory((prev) => [...prev, entry]);
  }, []);

  const logInitial = useCallback(
    (title: string) => {
      if (initialLogged.current) return;
      initialLogged.current = true;
      addEntry("initial", title);
    },
    [addEntry]
  );

  const logRecommended = useCallback(
    (title: string) => {
      if (recommendedLogged.current) return;
      recommendedLogged.current = true;
      addEntry("recommended", title);
    },
    [addEntry]
  );

  const addFollowUp = useCallback(
    (direction: ContinueDirection, label: string) => {
      setFollowUps((prev) => [...prev, { id: uid(), direction, label }]);
      addEntry("follow-up", label);
    },
    [addEntry]
  );

  return { history, followUps, logInitial, logRecommended, addFollowUp };
}