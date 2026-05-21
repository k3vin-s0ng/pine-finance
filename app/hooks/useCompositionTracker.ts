/**
 * Tracks typed vs pasted characters per assessment task.
 */
import { useRef, useState, useCallback, useEffect } from "react";

export type CompositionStats = {
  typedChars: number;
  pastedChars: number;
};

export function useCompositionTracker(
  currentTaskId: string,
  taskIds: string[]
): {
  stats: Record<string, CompositionStats>;
  textareaProps: {
    onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
    onPaste: (e: React.ClipboardEvent<Element>) => void;
  };
  getRatio: (taskId: string) => { typedPct: number; pastedPct: number; total: number };
  lastTypedAt: number;
} {
  const [stats, setStats] = useState<Record<string, CompositionStats>>(() => {
    const init: Record<string, CompositionStats> = {};
    for (const id of taskIds) init[id] = { typedChars: 0, pastedChars: 0 };
    return init;
  });

  const currentTaskIdRef = useRef(currentTaskId);
  useEffect(() => {
    currentTaskIdRef.current = currentTaskId;
  }, [currentTaskId]);

  const [lastTypedAt, setLastTypedAt] = useState(0);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (
      e.key.length === 1 &&
      !e.ctrlKey &&
      !e.metaKey &&
      !e.altKey
    ) {
      const id = currentTaskIdRef.current;
      setStats(prev => ({
        ...prev,
        [id]: { ...prev[id], typedChars: (prev[id]?.typedChars ?? 0) + 1 },
      }));
      setLastTypedAt(Date.now());
    }
  }, []);

  const handlePaste = useCallback((e: React.ClipboardEvent<Element>) => {
    const pasted = e.clipboardData?.getData("text") ?? "";
    if (!pasted) return;
    const id = currentTaskIdRef.current;
    setStats(prev => ({
      ...prev,
      [id]: { ...prev[id], pastedChars: (prev[id]?.pastedChars ?? 0) + pasted.length },
    }));
  }, []);

  const getRatio = useCallback(
    (taskId: string) => {
      const s = stats[taskId] ?? { typedChars: 0, pastedChars: 0 };
      const total = s.typedChars + s.pastedChars;
      if (total === 0) return { typedPct: 0, pastedPct: 0, total: 0 };
      return {
        typedPct: Math.round((s.typedChars / total) * 100),
        pastedPct: Math.round((s.pastedChars / total) * 100),
        total,
      };
    },
    [stats]
  );

  return {
    stats,
    textareaProps: { onKeyDown: handleKeyDown, onPaste: handlePaste },
    getRatio,
    lastTypedAt,
  };
}
