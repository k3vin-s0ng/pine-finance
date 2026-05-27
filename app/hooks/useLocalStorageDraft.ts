import { useState, useEffect, useCallback, useRef } from "react";

const DRAFT_PREFIX = "pine_assessment_draft_";
const COMPOSER_PREFIX = "pine_assessment_composer_";
const DEBOUNCE_MS = 1000;

export type DraftResponses = Record<string, string>;
export type DraftComposerValues = Record<string, unknown>;

interface UseDraftReturn {
  responses: DraftResponses;
  setResponses: (updater: (prev: DraftResponses) => DraftResponses) => void;
  composerValues: DraftComposerValues;
  setComposerValues: (updater: (prev: DraftComposerValues) => DraftComposerValues) => void;
  clearDraft: () => void;
  lastSaved: Date | null;
  hadRestoredDraft: boolean;
}

/**
 * Persists assessment task responses AND structured composer values to
 * localStorage, keyed by assessmentId.
 *
 * Why two keys: `responses` holds the serialized string the server expects on
 * submit; `composerValues` holds the structured per-section state the UI
 * actually renders from. Persisting only one of them is what caused candidates
 * who reloaded the page to see blank composer fields even though their answer
 * was technically "saved" to localStorage.
 *
 * - Restores both on first mount (sets hadRestoredDraft=true if either has content)
 * - Debounces writes by DEBOUNCE_MS to avoid excessive I/O
 * - Exposes clearDraft() to call on successful submission
 */
export function useLocalStorageDraft(assessmentId: string): UseDraftReturn {
  const responsesKey = `${DRAFT_PREFIX}${assessmentId}`;
  const composerKey = `${COMPOSER_PREFIX}${assessmentId}`;

  const [responses, setResponsesState] = useState<DraftResponses>(() => {
    try {
      const raw = localStorage.getItem(responsesKey);
      if (raw) return JSON.parse(raw) as DraftResponses;
    } catch {
      // ignore parse errors
    }
    return {};
  });

  const [composerValues, setComposerValuesState] = useState<DraftComposerValues>(() => {
    try {
      const raw = localStorage.getItem(composerKey);
      if (raw) return JSON.parse(raw) as DraftComposerValues;
    } catch {
      // ignore parse errors
    }
    return {};
  });

  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [hadRestoredDraft] = useState(() => {
    try {
      const raw = localStorage.getItem(responsesKey);
      if (raw) {
        const parsed = JSON.parse(raw) as DraftResponses;
        if (Object.values(parsed).some(v => typeof v === "string" && v.trim().length > 0)) {
          return true;
        }
      }
      const composerRaw = localStorage.getItem(composerKey);
      if (composerRaw) {
        const parsed = JSON.parse(composerRaw) as DraftComposerValues;
        if (Object.keys(parsed).length > 0) return true;
      }
    } catch {
      // ignore
    }
    return false;
  });

  const responsesDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  const composerDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (responsesDebounce.current) clearTimeout(responsesDebounce.current);
    responsesDebounce.current = setTimeout(() => {
      try {
        localStorage.setItem(responsesKey, JSON.stringify(responses));
        setLastSaved(new Date());
      } catch {
        // storage quota exceeded or private browsing — silently ignore
      }
    }, DEBOUNCE_MS);

    return () => {
      if (responsesDebounce.current) clearTimeout(responsesDebounce.current);
    };
  }, [responses, responsesKey]);

  useEffect(() => {
    if (composerDebounce.current) clearTimeout(composerDebounce.current);
    composerDebounce.current = setTimeout(() => {
      try {
        localStorage.setItem(composerKey, JSON.stringify(composerValues));
        setLastSaved(new Date());
      } catch {
        // ignore
      }
    }, DEBOUNCE_MS);

    return () => {
      if (composerDebounce.current) clearTimeout(composerDebounce.current);
    };
  }, [composerValues, composerKey]);

  const setResponses = useCallback(
    (updater: (prev: DraftResponses) => DraftResponses) => {
      setResponsesState(prev => updater(prev));
    },
    []
  );

  const setComposerValues = useCallback(
    (updater: (prev: DraftComposerValues) => DraftComposerValues) => {
      setComposerValuesState(prev => updater(prev));
    },
    []
  );

  const clearDraft = useCallback(() => {
    try {
      localStorage.removeItem(responsesKey);
      localStorage.removeItem(composerKey);
    } catch {
      // ignore
    }
    setLastSaved(null);
  }, [responsesKey, composerKey]);

  return {
    responses,
    setResponses,
    composerValues,
    setComposerValues,
    clearDraft,
    lastSaved,
    hadRestoredDraft,
  };
}
