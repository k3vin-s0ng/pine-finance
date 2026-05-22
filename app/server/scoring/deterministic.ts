import { EXPECTED_TASK_ANSWERS, type ExpectedTaskAnswers } from "./expectedAnswers";
import { parseNumericalInput, withinTolerance } from "./numericalParser";
import {
  computeBehavioralScores,
  type BehavioralSummaryEvidence,
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
  band: "rushed" | "good" | "optimal" | "tight" | "expired";
};

export type DeterministicScores = {
  accuracy: number | null;
  accuracyEvidence: AccuracyEvidence | null;
  efficiency: number;
  efficiencyEvidence: EfficiencyEvidence;
  behavioralEvidence: BehavioralSummaryEvidence | null;
  judgment: number | null;
  judgmentEvidence: JudgmentEvidence | null;
  verification: number | null;
  verificationEvidence: VerificationEvidence | null;
  toolFluency: number | null;
  toolFluencyEvidence: ToolFluencyEvidence | null;
};

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
): { score: number; evidence: EfficiencyEvidence } {
  const ratio = completionTimeSeconds / timeLimitSeconds;

  let score: number;
  let band: EfficiencyEvidence["band"];

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
    score = Math.round(55 + 20 * fraction);
    band = "rushed";
  }

  return {
    score,
    evidence: {
      completionTimeSeconds,
      timeLimitSeconds,
      timeRatio: ratio,
      band,
    },
  };
}

// ─── Orchestrator ────────────────────────────────────────────────────────────

export function computeDeterministicScores(params: {
  roleTemplate: string;
  tasks: StructuredTaskResponse[];
  completionTimeSeconds: number;
  timeLimitSeconds: number;
  behaviorEvents?: BehaviorScoringEvent[];
}): DeterministicScores {
  const { roleTemplate, tasks, completionTimeSeconds, timeLimitSeconds, behaviorEvents = [] } = params;

  const accuracy = computeAccuracyScore(roleTemplate, tasks);
  const efficiency = computeEfficiency(completionTimeSeconds, timeLimitSeconds);
  const behavioral = computeBehavioralScores(behaviorEvents);

  return {
    accuracy: accuracy.score,
    accuracyEvidence: accuracy.evidence,
    efficiency: efficiency.score,
    efficiencyEvidence: efficiency.evidence,
    behavioralEvidence: behavioral.summary,
    judgment: behavioral.judgment,
    judgmentEvidence: behavioral.judgmentEvidence,
    verification: behavioral.verification,
    verificationEvidence: behavioral.verificationEvidence,
    toolFluency: behavioral.toolFluency,
    toolFluencyEvidence: behavioral.toolFluencyEvidence,
  };
}
