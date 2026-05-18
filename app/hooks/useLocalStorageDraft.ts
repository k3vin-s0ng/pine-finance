import { useState, useEffect, useCallback, useRef } from "react";

const DRAFT_PREFIX = "pine_assessment_draft_";
const DEBOUNCE_MS = 1000;

export type DraftResponses = Record<string, string>;

interface UseDraftReturn {
  responses: DraftResponses;
  setResponses: (updater: (prev: DraftResponses) => DraftResponses) => void;
  clearDraft: () => void;
  lastSaved: Date | null;
  hadRestoredDraft: boolean;
}

/**
 * Persists assessment task responses to localStorage, keyed by assessmentId.
 * - Restores existing draft on first mount (sets hadRestoredDraft=true if data found)
 * - Debounces writes by DEBOUNCE_MS to avoid excessive I/O
 * - Exposes clearDraft() to call on successful submission
 */
export function useLocalStorageDraft(assessmentId: string): UseDraftReturn {
  const storageKey = `${DRAFT_PREFIX}${assessmentId}`;

  // Initialise from localStorage synchronously so first render has the data
  const [responses, setResponsesState] = useState<DraftResponses>(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) return JSON.parse(raw) as DraftResponses;
    } catch {
      // ignore parse errors
    }
    return {};
  });

  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [hadRestoredDraft, setHadRestoredDraft] = useState(false);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFirstMount = useRef(true);

  // On first mount, flag if we restored a non-empty draft
  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      try {
        const raw = localStorage.getItem(storageKey);
        if (raw) {
          const parsed = JSON.parse(raw) as DraftResponses;
          const hasContent = Object.values(parsed).some(v => v.trim().length > 0);
          if (hasContent) setHadRestoredDraft(true);
        }
      } catch {
        // ignore
      }
    }
  }, [storageKey]);

  // Debounced write to localStorage whenever responses change
  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      try {
        localStorage.setItem(storageKey, JSON.stringify(responses));
        setLastSaved(new Date());
      } catch {
        // storage quota exceeded or private browsing — silently ignore
      }
    }, DEBOUNCE_MS);

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [responses, storageKey]);

  const setResponses = useCallback(
    (updater: (prev: DraftResponses) => DraftResponses) => {
      setResponsesState(prev => updater(prev));
    },
    []
  );

  const clearDraft = useCallback(() => {
    try {
      localStorage.removeItem(storageKey);
    } catch {
      // ignore
    }
    setLastSaved(null);
  }, [storageKey]);

  return { responses, setResponses, clearDraft, lastSaved, hadRestoredDraft };
}
