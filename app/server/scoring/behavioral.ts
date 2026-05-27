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
  pastedChars: number;
  externalPastedChars: number;
  sourcePastedChars: number;
  aiPastedChars: number;
  largePasteCount: number;
  largestPasteChars: number;
  citationCount: number;
  sourceCitationCount: number;
  aiCitationCount: number;
  aiResponseCompleteCount: number;
  responseEditWithAiLagCount: number;
  avgSecsSinceAIResponse: number;
  totalResponseChars: number;
  totalResponseWords: number;
  pasteShare: number;
  aiPasteShare: number;
  typedCharsEstimate: number;
  aiPastedTaskCount: number;
};

export type BehavioralResponseProfile = {
  totalResponseChars: number;
  totalResponseWords: number;
  totalPastedChars: number;
  totalAiPastedChars: number;
  largestPasteChars: number;
  pasteShare: number;
  aiPasteShare: number;
  typedCharsEstimate: number;
  aiPastedTaskCount: number;
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

export function summarizeBehaviorEvents(
  events: BehaviorScoringEvent[],
  responseProfile?: BehavioralResponseProfile,
): BehavioralSummaryEvidence | null {
  if (!events.length && !responseProfile) return null;

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
  let pastedChars = 0;
  let externalPastedChars = 0;
  let sourcePastedChars = 0;
  let aiPastedChars = 0;
  let largePasteCount = 0;
  let largestPasteChars = 0;
  let citationCount = 0;
  let sourceCitationCount = 0;
  let aiCitationCount = 0;
  let aiResponseCompleteCount = 0;
  let responseEditWithAiLagCount = 0;
  let totalSecsSinceAIResponse = 0;

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
      const secsSinceAIResponse = numberFrom(data.secsSinceAIResponse);
      if (secsSinceAIResponse > 0) {
        responseEditWithAiLagCount += 1;
        totalSecsSinceAIResponse += secsSinceAIResponse;
      }
      if (delta > 0) {
        positiveEditEvents += 1;
        totalPositiveEditChars += delta;
      }
    }

    if (event.eventType === "paste") {
      pasteCount += 1;
      const source = data.source;
      const clipboardLength = numberFrom(data.clipboardLength);
      pastedChars += clipboardLength;
      largestPasteChars = Math.max(largestPasteChars, clipboardLength);
      if (clipboardLength >= 800) largePasteCount += 1;
      if (source === "source_material") {
        sourcePasteCount += 1;
        sourcePastedChars += clipboardLength;
      } else if (source === "ai") {
        aiPasteCount += 1;
        aiPastedChars += clipboardLength;
      } else {
        externalPasteCount += 1;
        externalPastedChars += clipboardLength;
      }
    }

    if (event.eventType === "citation_added") {
      citationCount += 1;
      if (data.source === "source_material") sourceCitationCount += 1;
      else if (data.source === "ai") aiCitationCount += 1;
    }

    if (event.eventType === "ai_response_complete") {
      aiResponseCompleteCount += 1;
    }
  }

  const totalResponseChars = responseProfile?.totalResponseChars ?? 0;
  const totalResponseWords = responseProfile?.totalResponseWords ?? 0;
  const totalPastedChars = responseProfile?.totalPastedChars ?? pastedChars;
  const totalAiPastedChars = responseProfile?.totalAiPastedChars ?? aiPastedChars;
  const pasteShare = responseProfile?.pasteShare ?? (totalResponseChars > 0 ? totalPastedChars / totalResponseChars : 0);
  const aiPasteShare = responseProfile?.aiPasteShare ?? (totalResponseChars > 0 ? totalAiPastedChars / totalResponseChars : 0);

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
    pastedChars,
    externalPastedChars,
    sourcePastedChars,
    aiPastedChars,
    largePasteCount,
    largestPasteChars: Math.max(largestPasteChars, responseProfile?.largestPasteChars ?? 0),
    citationCount,
    sourceCitationCount,
    aiCitationCount,
    aiResponseCompleteCount,
    responseEditWithAiLagCount,
    avgSecsSinceAIResponse:
      responseEditWithAiLagCount > 0 ? Math.round(totalSecsSinceAIResponse / responseEditWithAiLagCount) : 0,
    totalResponseChars,
    totalResponseWords,
    pasteShare: Math.round(pasteShare * 1000) / 1000,
    aiPasteShare: Math.round(aiPasteShare * 1000) / 1000,
    typedCharsEstimate: responseProfile?.typedCharsEstimate ?? Math.max(0, totalResponseChars - totalPastedChars),
    aiPastedTaskCount: responseProfile?.aiPastedTaskCount ?? 0,
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
  if (summary.aiPasteShare >= 0.25 || summary.aiPastedTaskCount > 0) {
    const penalty = summary.aiPasteShare >= 0.5 || summary.aiPastedTaskCount > 0 ? 38 : 24;
    score -= penalty;
    signals.push("AI-paste pattern raises serious ownership and judgment concerns");
  }
  if (summary.externalPasteCount >= 2 || summary.externalPastedChars >= 800) {
    score -= 12;
    signals.push("external paste activity raises ownership concerns");
  }
  if (summary.pasteShare >= 0.7 && summary.typedCharsEstimate < 500) {
    score -= 18;
    signals.push("final response appears mostly pasted rather than candidate-composed");
  } else if (summary.largePasteCount > 0) {
    score -= 8;
    signals.push("large paste event should have been reviewed and transformed");
  }
  if (summary.citationCount > 0 && summary.responseEditWithAiLagCount > 0) {
    score += 6;
    signals.push("used citations and post-AI edits to retain candidate judgment");
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
  if (summary.sourceCitationCount > 0) {
    score += 12;
    signals.push("cited source material in the final response");
  }
  if (summary.citationCount > 0 && summary.aiCitationCount === summary.citationCount) {
    score -= 8;
    signals.push("citations relied on AI rather than source material");
  }
  if (summary.responseEditCount >= 3) {
    score += 8;
    signals.push("revised the response after source or AI interactions");
  }
  if (summary.responseEditWithAiLagCount > 0 && summary.avgSecsSinceAIResponse >= 10) {
    score += 8;
    signals.push("edited after AI responses instead of immediately accepting them");
  }
  if (summary.aiPromptCount > 0 && summary.materialViewCount === 0) {
    score -= 18;
    signals.push("AI interaction had no matching source-material review");
  }
  if (summary.aiPasteShare >= 0.25 || summary.aiPastedTaskCount > 0) {
    const penalty = summary.aiPasteShare >= 0.5 || summary.aiPastedTaskCount > 0 ? 35 : 22;
    score -= penalty;
    signals.push("AI-pasted deliverable text was not independently verified");
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
  if (summary.responseEditWithAiLagCount > 0) {
    score += 6;
    signals.push("showed post-AI revision behavior");
  }
  if (summary.sourceCitationCount > 0) {
    score += 6;
    signals.push("used citation tooling to anchor claims");
  }
  if (summary.taskSwitchCount > 0) {
    score += 6;
    signals.push("moved between tasks while maintaining traceable context");
  }
  if (summary.aiPasteShare >= 0.25 || summary.aiPastedTaskCount > 0) {
    const penalty = summary.aiPasteShare >= 0.5 || summary.aiPastedTaskCount > 0 ? 28 : 16;
    score -= penalty;
    signals.push("copied AI output into the work surface instead of transforming it");
  } else if (summary.largePasteCount > 0) {
    score -= 10;
    signals.push("large pasted content required stronger transformation");
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

export function computeBehavioralScores(
  events: BehaviorScoringEvent[],
  responseProfile?: BehavioralResponseProfile,
): BehavioralScores {
  const sorted = [...events].sort((a, b) => {
    if (a.clientTimestamp !== b.clientTimestamp) return a.clientTimestamp - b.clientTimestamp;
    return (a.id ?? 0) - (b.id ?? 0);
  });
  const summary = summarizeBehaviorEvents(sorted, responseProfile);
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
