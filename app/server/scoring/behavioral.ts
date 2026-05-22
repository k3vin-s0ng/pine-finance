import type { BehaviorEvent } from "@/app/lib/schema";

export type BehaviorScoringEvent = Pick<
  BehaviorEvent,
  "id" | "taskId" | "eventType" | "eventData" | "clientTimestamp"
>;

export type BehavioralSummaryEvidence = {
  totalEvents: number;
  taskCount: number;
  taskSwitchCount: number;
  materialViewCount: number;
  uniqueMaterialsViewed: number;
  totalMaterialViewSeconds: number;
  aiPromptCount: number;
  avgPromptLength: number;
  earlyAiPromptCount: number;
  responseEditCount: number;
  positiveEditEvents: number;
  totalPositiveEditChars: number;
  pasteCount: number;
  externalPasteCount: number;
  sourcePasteCount: number;
  aiPasteCount: number;
  largePasteCount: number;
  largestPasteChars: number;
};

export type BehavioralBand = "weak" | "mixed" | "solid" | "strong";

export type BehavioralDimensionEvidence = {
  band: BehavioralBand;
  signals: string[];
  summary: BehavioralSummaryEvidence;
};

export type JudgmentEvidence = BehavioralDimensionEvidence;
export type VerificationEvidence = BehavioralDimensionEvidence;
export type ToolFluencyEvidence = BehavioralDimensionEvidence;

export type BehavioralScores = {
  summary: BehavioralSummaryEvidence | null;
  judgment: number | null;
  judgmentEvidence: JudgmentEvidence | null;
  verification: number | null;
  verificationEvidence: VerificationEvidence | null;
  toolFluency: number | null;
  toolFluencyEvidence: ToolFluencyEvidence | null;
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function numberFrom(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function bandFor(score: number): BehavioralBand {
  if (score >= 85) return "strong";
  if (score >= 70) return "solid";
  if (score >= 55) return "mixed";
  return "weak";
}

export function summarizeBehaviorEvents(events: BehaviorScoringEvent[]): BehavioralSummaryEvidence | null {
  if (!events.length) return null;

  const taskIds = new Set<string>();
  const materialKeys = new Set<string>();
  let taskSwitchCount = 0;
  let materialViewCount = 0;
  let totalMaterialViewSeconds = 0;
  let aiPromptCount = 0;
  let promptLengthTotal = 0;
  let earlyAiPromptCount = 0;
  let responseEditCount = 0;
  let positiveEditEvents = 0;
  let totalPositiveEditChars = 0;
  let pasteCount = 0;
  let externalPasteCount = 0;
  let sourcePasteCount = 0;
  let aiPasteCount = 0;
  let largePasteCount = 0;
  let largestPasteChars = 0;

  for (const event of events) {
    if (event.taskId) taskIds.add(event.taskId);
    const data = asRecord(event.eventData);

    if (event.eventType === "task_switch") {
      taskSwitchCount += 1;
      if (typeof data.fromTaskId === "string") taskIds.add(data.fromTaskId);
      if (typeof data.toTaskId === "string") taskIds.add(data.toTaskId);
    }

    if (event.eventType === "material_view") {
      materialViewCount += 1;
      if (typeof data.materialKey === "string") materialKeys.add(data.materialKey);
      totalMaterialViewSeconds += numberFrom(data.durationSeconds);
    }

    if (event.eventType === "ai_prompt_sent") {
      aiPromptCount += 1;
      promptLengthTotal += numberFrom(data.promptLength);
      if (numberFrom(data.secondsSinceTaskStart) <= 45) earlyAiPromptCount += 1;
    }

    if (event.eventType === "response_edit") {
      responseEditCount += 1;
      const delta = numberFrom(data.netDeltaChars);
      if (delta > 0) {
        positiveEditEvents += 1;
        totalPositiveEditChars += delta;
      }
    }

    if (event.eventType === "paste") {
      pasteCount += 1;
      const source = data.source;
      const clipboardLength = numberFrom(data.clipboardLength);
      largestPasteChars = Math.max(largestPasteChars, clipboardLength);
      if (clipboardLength >= 800) largePasteCount += 1;
      if (source === "source_material") sourcePasteCount += 1;
      else if (source === "ai") aiPasteCount += 1;
      else externalPasteCount += 1;
    }
  }

  return {
    totalEvents: events.length,
    taskCount: taskIds.size,
    taskSwitchCount,
    materialViewCount,
    uniqueMaterialsViewed: materialKeys.size,
    totalMaterialViewSeconds,
    aiPromptCount,
    avgPromptLength: aiPromptCount > 0 ? Math.round(promptLengthTotal / aiPromptCount) : 0,
    earlyAiPromptCount,
    responseEditCount,
    positiveEditEvents,
    totalPositiveEditChars,
    pasteCount,
    externalPasteCount,
    sourcePasteCount,
    aiPasteCount,
    largePasteCount,
    largestPasteChars,
  };
}

export function computeJudgment(summary: BehavioralSummaryEvidence | null): {
  score: number | null;
  evidence: JudgmentEvidence | null;
} {
  if (!summary) return { score: null, evidence: null };

  const signals: string[] = [];
  let score = 58;

  if (summary.taskCount >= 2) {
    score += 8;
    signals.push("worked across multiple tasks before submission");
  }
  if (summary.materialViewCount >= 2 || summary.totalMaterialViewSeconds >= 90) {
    score += 12;
    signals.push("consulted source materials instead of relying only on AI");
  }
  if (summary.positiveEditEvents >= 3 && summary.totalPositiveEditChars >= 250) {
    score += 10;
    signals.push("showed iterative candidate-owned composition");
  }

  const promptsPerTask = summary.aiPromptCount / Math.max(summary.taskCount, 1);
  if (promptsPerTask > 5) {
    score -= 15;
    signals.push("heavy AI prompting relative to task coverage");
  } else if (summary.aiPromptCount > 0 && promptsPerTask <= 3) {
    score += 8;
    signals.push("AI use stayed within a bounded assistance pattern");
  }

  if (summary.earlyAiPromptCount >= Math.max(2, summary.aiPromptCount) && summary.materialViewCount === 0) {
    score -= 10;
    signals.push("opened with AI before inspecting source materials");
  }
  if (summary.aiPasteCount + summary.externalPasteCount >= 2 || summary.largePasteCount > 0) {
    score -= 12;
    signals.push("paste pattern raises ownership and review concerns");
  }

  const finalScore = clampScore(score);
  return {
    score: finalScore,
    evidence: {
      band: bandFor(finalScore),
      signals,
      summary,
    },
  };
}

export function computeVerification(summary: BehavioralSummaryEvidence | null): {
  score: number | null;
  evidence: VerificationEvidence | null;
} {
  if (!summary) return { score: null, evidence: null };

  const signals: string[] = [];
  let score = 48;

  if (summary.uniqueMaterialsViewed >= 2) {
    score += 18;
    signals.push("cross-checked more than one source material");
  } else if (summary.materialViewCount > 0) {
    score += 10;
    signals.push("consulted at least one source material");
  }

  if (summary.totalMaterialViewSeconds >= 180) {
    score += 16;
    signals.push("spent meaningful time reviewing source materials");
  } else if (summary.totalMaterialViewSeconds >= 60) {
    score += 8;
    signals.push("spent some time reviewing source materials");
  }

  if (summary.sourcePasteCount > 0) {
    score += 8;
    signals.push("moved source-backed material into the response");
  }
  if (summary.responseEditCount >= 3) {
    score += 8;
    signals.push("revised the response after source or AI interactions");
  }
  if (summary.aiPromptCount > 0 && summary.materialViewCount === 0) {
    score -= 18;
    signals.push("AI interaction had no matching source-material review");
  }
  if (summary.externalPasteCount > summary.sourcePasteCount && summary.externalPasteCount > 0) {
    score -= 8;
    signals.push("external paste activity outweighed source-backed paste activity");
  }

  const finalScore = clampScore(score);
  return {
    score: finalScore,
    evidence: {
      band: bandFor(finalScore),
      signals,
      summary,
    },
  };
}

export function computeToolFluency(summary: BehavioralSummaryEvidence | null): {
  score: number | null;
  evidence: ToolFluencyEvidence | null;
} {
  if (!summary) return { score: null, evidence: null };

  const signals: string[] = [];
  let score = 50;

  if (summary.aiPromptCount === 0) {
    signals.push("no AI prompts were captured");
  } else if (summary.aiPromptCount <= 8) {
    score += 18;
    signals.push("AI prompts were iterative without being excessive");
  } else {
    score += 6;
    signals.push("AI prompts were frequent enough to suggest dependency risk");
  }

  if (summary.avgPromptLength >= 40 && summary.avgPromptLength <= 400) {
    score += 12;
    signals.push("prompt length suggests specific, bounded requests");
  } else if (summary.aiPromptCount > 0 && summary.avgPromptLength < 20) {
    score -= 8;
    signals.push("prompts were very short and likely underspecified");
  }

  if (summary.responseEditCount >= summary.aiPromptCount && summary.responseEditCount > 0) {
    score += 10;
    signals.push("candidate edited responses alongside AI use");
  }
  if (summary.taskSwitchCount > 0) {
    score += 6;
    signals.push("moved between tasks while maintaining traceable context");
  }
  if (summary.aiPasteCount > 0 || summary.largePasteCount > 0) {
    score -= 14;
    signals.push("copied AI or large pasted content into the work surface");
  }

  const finalScore = clampScore(score);
  return {
    score: finalScore,
    evidence: {
      band: bandFor(finalScore),
      signals,
      summary,
    },
  };
}

export function computeBehavioralScores(events: BehaviorScoringEvent[]): BehavioralScores {
  const sorted = [...events].sort((a, b) => {
    if (a.clientTimestamp !== b.clientTimestamp) return a.clientTimestamp - b.clientTimestamp;
    return (a.id ?? 0) - (b.id ?? 0);
  });
  const summary = summarizeBehaviorEvents(sorted);
  const judgment = computeJudgment(summary);
  const verification = computeVerification(summary);
  const toolFluency = computeToolFluency(summary);

  return {
    summary,
    judgment: judgment.score,
    judgmentEvidence: judgment.evidence,
    verification: verification.score,
    verificationEvidence: verification.evidence,
    toolFluency: toolFluency.score,
    toolFluencyEvidence: toolFluency.evidence,
  };
}
