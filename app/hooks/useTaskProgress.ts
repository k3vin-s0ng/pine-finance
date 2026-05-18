/**
 * useTaskProgress — tracks per-task elapsed time and word counts.
 *
 * Records when a candidate first visits each task (startedAt) and
 * accumulates active time by tracking task switches. On each tick (1s),
 * the elapsed time for the current task increments.
 */
import { useState, useEffect, useRef, useCallback } from "react";

export type TaskProgress = {
  /** Unix ms when the candidate first opened this task */
  startedAt: number | null;
  /** Total seconds spent on this task (accumulated across visits) */
  elapsedSeconds: number;
  /** Word count of the current response for this task */
  wordCount: number;
};

export function useTaskProgress(
  currentTaskIndex: number,
  taskIds: string[],
  responses: Record<string, string>
): {
  progress: Record<string, TaskProgress>;
  formatElapsed: (seconds: number) => string;
} {
  const [progress, setProgress] = useState<Record<string, TaskProgress>>(() => {
    const init: Record<string, TaskProgress> = {};
    for (const id of taskIds) {
      init[id] = { startedAt: null, elapsedSeconds: 0, wordCount: 0 };
    }
    return init;
  });

  const currentTaskIdRef = useRef<string | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // When the task changes, record start time for the new task and start ticking
  useEffect(() => {
    const newId = taskIds[currentTaskIndex] ?? null;
    if (!newId) return;

    // Mark start time if first visit
    setProgress(prev => {
      if (prev[newId]?.startedAt == null) {
        return {
          ...prev,
          [newId]: { ...prev[newId], startedAt: Date.now() },
        };
      }
      return prev;
    });

    currentTaskIdRef.current = newId;

    // Tick every second to increment elapsed time for the current task
    if (tickRef.current) clearInterval(tickRef.current);
    tickRef.current = setInterval(() => {
      setProgress(prev => {
        const id = currentTaskIdRef.current;
        if (!id || !prev[id]) return prev;
        return {
          ...prev,
          [id]: { ...prev[id], elapsedSeconds: prev[id].elapsedSeconds + 1 },
        };
      });
    }, 1000);

    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, [currentTaskIndex, taskIds.join(",")]);

  // Update word counts whenever responses change
  useEffect(() => {
    setProgress(prev => {
      const next = { ...prev };
      for (const id of taskIds) {
        const wc = (responses[id] ?? "").split(/\s+/).filter(Boolean).length;
        if (next[id] && next[id].wordCount !== wc) {
          next[id] = { ...next[id], wordCount: wc };
        }
      }
      return next;
    });
  }, [responses, taskIds.join(",")]);

  const formatElapsed = useCallback((seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return s === 0 ? `${m}m` : `${m}m ${s}s`;
  }, []);

  return { progress, formatElapsed };
}
