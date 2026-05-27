import { EXPECTED_TASK_ANSWERS, type ExpectedTaskAnswers } from "./expectedAnswers";
import { parseNumericalInput, withinTolerance } from "./numericalParser";
import {
  computeBehavioralScores,
  type BehavioralSummaryEvidence,
  type BehavioralResponseProfile,
  type BehaviorScoringEvent,
  type JudgmentEvidence,
  type ToolFluencyEvidence,
  type VerificationEvidence,
} from "./behavioral";

// ─── Types ────────────────────────────────────────────────────────────────────

export type StructuredTaskResponse = {
  taskId: string;
  responseType: "memo" | "variance" | "thesis" | "flags" | "extraction" | "reconciliation";
  value: Record<string, unknown>;
};

export type AccuracyCheck = {
  taskId: string;
  field: string;
  expectedValue: number;
  unit: string;
  candidateValue: string;
  parsedValue: number | null;
  matches: boolean;
  relativeError: number | null;
};

export type AccuracyEvidence = {
  totalChecks: number;
  matchCount: number;
  matchRate: number;
  checks: AccuracyCheck[];
};

export type EfficiencyEvidence = {
  completionTimeSeconds: number;
  timeLimitSeconds: number;
  timeRatio: number;
  completenessRatio: number;
  abandoned: boolean;
  band: "abandoned" | "rushed" | "good" | "optimal" | "tight" | "expired";
};

export type AiInteractionForScoring = {
  role: string;
  content: string;
};

export type TaskCompletenessEvidence = {
  taskId: string;
  wordCount: number;
  typedWordEstimate: number;
  responseChars: number;
  pastedChars: number;
  aiPastedChars: number;
  assistantSimilarity: number;
  substantive: boolean;
  aiPasted: boolean;
  reason: string;
};

export type CompletenessEvidence = {
  definedTaskCount: number;
  attemptedTaskCount: number;
  completenessRatio: number;
  taskWordThreshold: number;
  typedWordThreshold: number;
  tasks: TaskCompletenessEvidence[];
  overallMultiplier: number;
  accuracyMultiplier: number;
  communicationMultiplier: number;
};

export type ResponseRelianceEvidence = BehavioralResponseProfile;

export type DeterministicScores = {
  accuracy: number | null;
  accuracyEvidence: AccuracyEvidence | null;
  efficiency: number;
  efficiencyEvidence: EfficiencyEvidence;
  completenessEvidence: CompletenessEvidence;
  responseRelianceEvidence: ResponseRelianceEvidence;
  behavioralEvidence: BehavioralSummaryEvidence | null;
  judgment: number | null;
  judgmentEvidence: JudgmentEvidence | null;
  verification: number | null;
  verificationEvidence: VerificationEvidence | null;
  toolFluency: number | null;
  toolFluencyEvidence: ToolFluencyEvidence | null;
};

const SUBSTANTIVE_WORD_THRESHOLD = 15;
const SUBSTANTIVE_TYPED_WORD_THRESHOLD = 12;

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function countWords(value: string) {
  return value.trim().split(/\s+/).filter(Boolean).length;
}

function normalizeForComparison(value: string) {
  return value
    .toLowerCase()
    .replace(/[`*_#>\-[\]().,;:!?$%]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function wordSetSimilarity(candidate: string, assistant: string) {
  const candidateWords = new Set(candidate.split(" ").filter((word) => word.length > 3));
  if (candidateWords.size === 0) return 0;
  const assistantWords = new Set(assistant.split(" ").filter((word) => word.length > 3));
  let overlap = 0;
  for (const word of candidateWords) {
    if (assistantWords.has(word)) overlap += 1;
  }
  return overlap / candidateWords.size;
}

function assistantSimilarity(response: string, assistantMessages: string[]) {
  const normalizedResponse = normalizeForComparison(response);
  if (normalizedResponse.length < 120) return 0;

  let best = 0;
  for (const message of assistantMessages) {
    const normalizedAssistant = normalizeForComparison(message);
    if (normalizedAssistant.length < 120) continue;

    if (normalizedAssistant.includes(normalizedResponse)) {
      best = Math.max(best, 1);
      continue;
    }
    if (normalizedResponse.includes(normalizedAssistant)) {
      best = Math.max(best, Math.min(1, normalizedAssistant.length / normalizedResponse.length));
      continue;
    }

    best = Math.max(best, wordSetSimilarity(normalizedResponse, normalizedAssistant));
  }

  return Math.round(best * 1000) / 1000;
}

function getEventRecord(event: BehaviorScoringEvent) {
  return event.eventData && typeof event.eventData === "object" && !Array.isArray(event.eventData)
    ? (event.eventData as Record<string, unknown>)
    : {};
}

function eventNumber(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function getPasteStatsByTask(behaviorEvents: BehaviorScoringEvent[]) {
  const stats = new Map<string, { pastedChars: number; aiPastedChars: number; largestPasteChars: number }>();
  let totalPastedChars = 0;
  let totalAiPastedChars = 0;
  let largestPasteChars = 0;

  for (const event of behaviorEvents) {
    if (event.eventType !== "paste") continue;
    const taskId = event.taskId ?? "";
    const data = getEventRecord(event);
    const clipboardLength = eventNumber(data.clipboardLength);
    const source = data.source;
    totalPastedChars += clipboardLength;
    largestPasteChars = Math.max(largestPasteChars, clipboardLength);
    const taskStats = stats.get(taskId) ?? { pastedChars: 0, aiPastedChars: 0, largestPasteChars: 0 };
    taskStats.pastedChars += clipboardLength;
    taskStats.largestPasteChars = Math.max(taskStats.largestPasteChars, clipboardLength);
    if (source === "ai") {
      taskStats.aiPastedChars += clipboardLength;
      totalAiPastedChars += clipboardLength;
    }
    stats.set(taskId, taskStats);
  }

  return { stats, totalPastedChars, totalAiPastedChars, largestPasteChars };
}

function completenessMultiplier(ratio: number) {
  if (ratio >= 1) return 1;
  if (ratio >= 0.67) return 0.6;
  if (ratio >= 0.34) return 0.35;
  if (ratio > 0) return 0.2;
  return 0.1;
}

export function analyzeSubmissionIntegrity(params: {
  taskResponses: Record<string, string>;
  definedTaskIds: string[];
  aiInteractions?: AiInteractionForScoring[];
  behaviorEvents?: BehaviorScoringEvent[];
}): { completeness: CompletenessEvidence; responseReliance: ResponseRelianceEvidence } {
  const { taskResponses, definedTaskIds, aiInteractions = [], behaviorEvents = [] } = params;
  const taskIds = definedTaskIds.length > 0 ? definedTaskIds : Object.keys(taskResponses);
  const assistantMessages = aiInteractions
    .filter((message) => message.role === "assistant")
    .map((message) => message.content ?? "");
  const pasteStats = getPasteStatsByTask(behaviorEvents);
  let attemptedTaskCount = 0;
  let totalResponseChars = 0;
  let totalResponseWords = 0;
  let typedCharsEstimate = 0;
  let aiPastedTaskCount = 0;

  const tasks = taskIds.map((taskId) => {
    const response = taskResponses[taskId] ?? "";
    const responseChars = response.length;
    const wordCount = countWords(response);
    const taskPasteStats = pasteStats.stats.get(taskId) ?? { pastedChars: 0, aiPastedChars: 0, largestPasteChars: 0 };
    const similarity = assistantSimilarity(response, assistantMessages);
    const aiPasted =
      taskPasteStats.aiPastedChars >= Math.max(120, responseChars * 0.35) ||
      similarity >= 0.82;
    const taskTypedChars = Math.max(0, responseChars - taskPasteStats.pastedChars);
    const typedWordEstimate =
      responseChars > 0 ? Math.floor(wordCount * (taskTypedChars / responseChars)) : 0;
    const substantive =
      wordCount >= SUBSTANTIVE_WORD_THRESHOLD &&
      typedWordEstimate >= SUBSTANTIVE_TYPED_WORD_THRESHOLD &&
      !aiPasted;
    let reason = "substantive candidate-authored response";

    if (!response.trim()) reason = "empty response";
    else if (aiPasted) reason = "response appears largely AI-pasted";
    else if (wordCount < SUBSTANTIVE_WORD_THRESHOLD) reason = "too short to evaluate";
    else if (typedWordEstimate < SUBSTANTIVE_TYPED_WORD_THRESHOLD) reason = "insufficient candidate-authored text after paste adjustment";

    if (substantive) attemptedTaskCount += 1;
    if (aiPasted) aiPastedTaskCount += 1;
    totalResponseChars += responseChars;
    totalResponseWords += wordCount;
    typedCharsEstimate += taskTypedChars;

    return {
      taskId,
      wordCount,
      typedWordEstimate,
      responseChars,
      pastedChars: taskPasteStats.pastedChars,
      aiPastedChars: taskPasteStats.aiPastedChars,
      assistantSimilarity: similarity,
      substantive,
      aiPasted,
      reason,
    };
  });

  const definedTaskCount = Math.max(taskIds.length, 1);
  const completenessRatio = attemptedTaskCount / definedTaskCount;
  const totalPastedChars = pasteStats.totalPastedChars;
  const totalAiPastedChars = Math.max(
    pasteStats.totalAiPastedChars,
    tasks.filter((task) => task.aiPasted).reduce((sum, task) => sum + task.responseChars, 0),
  );
  const pasteShare = totalResponseChars > 0 ? totalPastedChars / totalResponseChars : 0;
  const aiPasteShare = totalResponseChars > 0 ? totalAiPastedChars / totalResponseChars : 0;
  const baseMultiplier = completenessMultiplier(completenessRatio);
  const aiPasteCap = aiPastedTaskCount > 0 || aiPasteShare >= 0.35 ? 0.55 : 1;

  return {
    completeness: {
      definedTaskCount,
      attemptedTaskCount,
      completenessRatio: Math.round(completenessRatio * 1000) / 1000,
      taskWordThreshold: SUBSTANTIVE_WORD_THRESHOLD,
      typedWordThreshold: SUBSTANTIVE_TYPED_WORD_THRESHOLD,
      tasks,
      overallMultiplier: Math.min(baseMultiplier, aiPasteCap),
      accuracyMultiplier: Math.min(baseMultiplier, aiPasteCap),
      communicationMultiplier: Math.min(baseMultiplier, aiPasteCap),
    },
    responseReliance: {
      totalResponseChars,
      totalResponseWords,
      totalPastedChars,
      totalAiPastedChars,
      largestPasteChars: pasteStats.largestPasteChars,
      pasteShare: Math.round(pasteShare * 1000) / 1000,
      aiPasteShare: Math.round(aiPasteShare * 1000) / 1000,
      typedCharsEstimate,
      aiPastedTaskCount,
    },
  };
}

// ─── Accuracy ────────────────────────────────────────────────────────────────

export function checkTaskAccuracy(
  task: StructuredTaskResponse,
  expected: ExpectedTaskAnswers,
): AccuracyCheck[] {
  const checks: AccuracyCheck[] = [];

  if (expected.numerical && task.value?.numericalAnswers) {
    const numericalAnswers = task.value.numericalAnswers as Record<string, string>;
    for (const [key, expectedAnswer] of Object.entries(expected.numerical)) {
      const candidateRaw = numericalAnswers[key] ?? "";
      const parsed = parseNumericalInput(candidateRaw, expectedAnswer);
      const result = withinTolerance(parsed, expectedAnswer);
      checks.push({
        taskId: task.taskId,
        field: key,
        expectedValue: expectedAnswer.value,
        unit: expectedAnswer.unit,
        candidateValue: candidateRaw,
        parsedValue: parsed.value,
        matches: result.matches,
        relativeError: result.relativeError,
      });
    }
  }

  if (expected.extractionRows && task.responseType === "extraction" && Array.isArray(task.value?.rows)) {
    const rows = task.value.rows as Array<{ metric?: string; value?: string }>;
    for (const expectedRow of expected.extractionRows) {
      const expectedAnswer = {
        value: expectedRow.expectedValue,
        unit: expectedRow.unit,
        tolerancePct: expectedRow.tolerancePct,
      };
      const needle = expectedRow.metricLabel.toLowerCase().trim();
      const matchedRow = rows.find(
        (r) =>
          typeof r.metric === "string" &&
          (r.metric.toLowerCase().trim().includes(needle) ||
            needle.includes(r.metric.toLowerCase().trim())),
      );
      const candidateRaw = matchedRow?.value ?? "";
      const parsed = parseNumericalInput(candidateRaw, expectedAnswer);
      const result = withinTolerance(parsed, expectedAnswer);
      checks.push({
        taskId: task.taskId,
        field: expectedRow.metricLabel,
        expectedValue: expectedRow.expectedValue,
        unit: expectedRow.unit,
        candidateValue: candidateRaw,
        parsedValue: parsed.value,
        matches: result.matches,
        relativeError: result.relativeError,
      });
    }
  }

  if (
    expected.reconciliationEntries &&
    task.responseType === "reconciliation" &&
    Array.isArray(task.value?.entries)
  ) {
    const entries = task.value.entries as Array<{ account?: string; corrected?: string }>;
    for (const expectedEntry of expected.reconciliationEntries) {
      const expectedAnswer = {
        value: expectedEntry.expectedCorrected,
        unit: expectedEntry.unit,
        tolerancePct: expectedEntry.tolerancePct,
      };
      const needle = expectedEntry.accountLabel.toLowerCase().trim();
      const matchedEntry = entries.find(
        (e) =>
          typeof e.account === "string" &&
          (e.account.toLowerCase().trim().includes(needle) ||
            needle.includes(e.account.toLowerCase().trim())),
      );
      const candidateRaw = matchedEntry?.corrected ?? "";
      const parsed = parseNumericalInput(candidateRaw, expectedAnswer);
      const result = withinTolerance(parsed, expectedAnswer);
      checks.push({
        taskId: task.taskId,
        field: expectedEntry.accountLabel,
        expectedValue: expectedEntry.expectedCorrected,
        unit: expectedEntry.unit,
        candidateValue: candidateRaw,
        parsedValue: parsed.value,
        matches: result.matches,
        relativeError: result.relativeError,
      });
    }
  }

  return checks;
}

export function computeAccuracyScore(
  roleTemplate: string,
  tasks: StructuredTaskResponse[],
): { score: number | null; evidence: AccuracyEvidence | null } {
  const roleExpected = EXPECTED_TASK_ANSWERS[roleTemplate] ?? {};
  const allChecks: AccuracyCheck[] = [];

  for (const task of tasks) {
    const expected = roleExpected[task.taskId];
    if (!expected) continue;
    allChecks.push(...checkTaskAccuracy(task, expected));
  }

  if (allChecks.length === 0) {
    return { score: null, evidence: null };
  }

  const matchCount = allChecks.filter((c) => c.matches).length;
  return {
    score: Math.round((matchCount / allChecks.length) * 100),
    evidence: {
      totalChecks: allChecks.length,
      matchCount,
      matchRate: matchCount / allChecks.length,
      checks: allChecks,
    },
  };
}

// ─── Efficiency ──────────────────────────────────────────────────────────────

/**
 * Time-usage scoring with peak in the 60–90% band (v1 Manus calibration).
 */
export function computeEfficiency(
  completionTimeSeconds: number,
  timeLimitSeconds: number,
  completenessRatio = 1,
): { score: number; evidence: EfficiencyEvidence } {
  const ratio = completionTimeSeconds / timeLimitSeconds;

  let score: number;
  let band: EfficiencyEvidence["band"];
  let abandoned = false;

  if (ratio > 1.0) {
    score = 50;
    band = "expired";
  } else if (ratio >= 0.9) {
    const fraction = (ratio - 0.9) / 0.1;
    score = Math.round(95 - 10 * fraction);
    band = "tight";
  } else if (ratio >= 0.6) {
    score = 100;
    band = "optimal";
  } else if (ratio >= 0.3) {
    const fraction = (ratio - 0.3) / 0.3;
    score = Math.round(75 + 20 * fraction);
    band = "good";
  } else {
    const fraction = ratio / 0.3;
    score = Math.round(10 + 45 * fraction);
    band = "rushed";
  }

  if (completenessRatio < 0.67 && ratio < 0.3) {
    abandoned = true;
    band = "abandoned";
    score = Math.min(score, Math.round(35 * completenessRatio));
  } else if (completenessRatio < 1) {
    score = Math.min(score, Math.round(score * (0.35 + 0.65 * completenessRatio)));
  }

  return {
    score: clampScore(score),
    evidence: {
      completionTimeSeconds,
      timeLimitSeconds,
      timeRatio: ratio,
      completenessRatio: Math.round(completenessRatio * 1000) / 1000,
      abandoned,
      band,
    },
  };
}

// ─── Orchestrator ────────────────────────────────────────────────────────────

export function computeDeterministicScores(params: {
  roleTemplate: string;
  tasks: StructuredTaskResponse[];
  taskResponses?: Record<string, string>;
  definedTaskIds?: string[];
  aiInteractions?: AiInteractionForScoring[];
  completionTimeSeconds: number;
  timeLimitSeconds: number;
  behaviorEvents?: BehaviorScoringEvent[];
}): DeterministicScores {
  const {
    roleTemplate,
    tasks,
    taskResponses = {},
    definedTaskIds = tasks.map((task) => task.taskId),
    aiInteractions = [],
    completionTimeSeconds,
    timeLimitSeconds,
    behaviorEvents = [],
  } = params;

  const accuracy = computeAccuracyScore(roleTemplate, tasks);
  const integrity = analyzeSubmissionIntegrity({
    taskResponses,
    definedTaskIds,
    aiInteractions,
    behaviorEvents,
  });
  const efficiency = computeEfficiency(
    completionTimeSeconds,
    timeLimitSeconds,
    integrity.completeness.completenessRatio,
  );
  const behavioral = computeBehavioralScores(behaviorEvents, integrity.responseReliance);

  return {
    accuracy: accuracy.score,
    accuracyEvidence: accuracy.evidence,
    efficiency: efficiency.score,
    efficiencyEvidence: efficiency.evidence,
    completenessEvidence: integrity.completeness,
    responseRelianceEvidence: integrity.responseReliance,
    behavioralEvidence: behavioral.summary,
    judgment: behavioral.judgment,
    judgmentEvidence: behavioral.judgmentEvidence,
    verification: behavioral.verification,
    verificationEvidence: behavioral.verificationEvidence,
    toolFluency: behavioral.toolFluency,
    toolFluencyEvidence: behavioral.toolFluencyEvidence,
  };
}
