import type {
  CompletenessEvidence,
  DeterministicScores,
  ResponseRelianceEvidence,
} from "./deterministic";

export type ScoreDimension =
  | "accuracy"
  | "efficiency"
  | "judgment"
  | "verification"
  | "communication"
  | "toolFluency";

export type DimensionScoreSet = Record<ScoreDimension, number | null> & {
  overallScore: number | null;
};

export type BlendWeights = {
  llm: number;
  deterministic: number;
};

export type DimensionBlendEvidence = {
  llmScore: number | null;
  deterministicScore: number | null;
  llmWeight: number;
  deterministicWeight: number;
  blendedScore: number | null;
  fallbackToLlm: boolean;
};

export type BlendEvidence = {
  dimensions: Record<ScoreDimension, DimensionBlendEvidence>;
  overallWeights: Record<ScoreDimension, number>;
};

export type IntegrityGateEvidence = {
  before: DimensionScoreSet;
  after: DimensionScoreSet;
  completenessRatio: number;
  aiPasteShare: number;
  attemptedTaskCount: number;
  definedTaskCount: number;
  multipliers: {
    overall: number;
    accuracy: number;
    communication: number;
  };
  caps: {
    judgment: number | null;
    verification: number | null;
    toolFluency: number | null;
  };
};

export const OVERALL_SCORE_WEIGHTS: Record<ScoreDimension, number> = {
  accuracy: 0.25,
  efficiency: 0.15,
  judgment: 0.2,
  verification: 0.15,
  communication: 0.15,
  toolFluency: 0.1,
};

/**
 * v1 Manus blend calibration. Communication remains fully LLM-scored because
 * deterministic process traces cannot judge final prose quality.
 */
export const BLEND_WEIGHTS: Record<ScoreDimension, BlendWeights> = {
  accuracy: { llm: 0.35, deterministic: 0.65 },
  efficiency: { llm: 0.25, deterministic: 0.75 },
  judgment: { llm: 0.5, deterministic: 0.5 },
  verification: { llm: 0.45, deterministic: 0.55 },
  communication: { llm: 1, deterministic: 0 },
  toolFluency: { llm: 0.45, deterministic: 0.55 },
};

const DIMENSIONS: ScoreDimension[] = [
  "accuracy",
  "efficiency",
  "judgment",
  "verification",
  "communication",
  "toolFluency",
];

function clampScore(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function scaleScore(value: number | null, multiplier: number) {
  return value === null ? null : clampScore(value * multiplier);
}

function capScore(value: number | null, cap: number | null) {
  if (value === null || cap === null) return value;
  return Math.min(value, cap);
}

function blendDimension(params: {
  llmScore: number | null;
  deterministicScore: number | null;
  weights: BlendWeights;
}): DimensionBlendEvidence {
  const { llmScore, deterministicScore, weights } = params;
  const fallbackToLlm = deterministicScore === null || weights.deterministic === 0;

  if (llmScore === null) {
    return {
      llmScore,
      deterministicScore,
      llmWeight: fallbackToLlm ? 1 : weights.llm,
      deterministicWeight: fallbackToLlm ? 0 : weights.deterministic,
      blendedScore: deterministicScore,
      fallbackToLlm,
    };
  }

  if (fallbackToLlm) {
    return {
      llmScore,
      deterministicScore,
      llmWeight: 1,
      deterministicWeight: 0,
      blendedScore: llmScore,
      fallbackToLlm,
    };
  }

  return {
    llmScore,
    deterministicScore,
    llmWeight: weights.llm,
    deterministicWeight: weights.deterministic,
    blendedScore: clampScore(llmScore * weights.llm + deterministicScore * weights.deterministic),
    fallbackToLlm,
  };
}

export function computeOverallScore(scores: Record<ScoreDimension, number | null>) {
  let total = 0;
  let weightTotal = 0;

  for (const dimension of DIMENSIONS) {
    const score = scores[dimension];
    if (score === null) continue;
    const weight = OVERALL_SCORE_WEIGHTS[dimension];
    total += score * weight;
    weightTotal += weight;
  }

  return weightTotal > 0 ? Math.round((total / weightTotal) * 10) / 10 : null;
}

export function blendScores(
  llmScores: DimensionScoreSet,
  deterministicScores: DeterministicScores,
): { scores: DimensionScoreSet; evidence: BlendEvidence } {
  const dimensions = {} as Record<ScoreDimension, DimensionBlendEvidence>;
  const blendedDimensions = {} as Record<ScoreDimension, number | null>;

  for (const dimension of DIMENSIONS) {
    const blended = blendDimension({
      llmScore: llmScores[dimension],
      deterministicScore: dimension === "communication" ? null : deterministicScores[dimension],
      weights: BLEND_WEIGHTS[dimension],
    });
    dimensions[dimension] = blended;
    blendedDimensions[dimension] = blended.blendedScore;
  }

  return {
    scores: {
      ...blendedDimensions,
      overallScore: computeOverallScore(blendedDimensions),
    },
    evidence: {
      dimensions,
      overallWeights: OVERALL_SCORE_WEIGHTS,
    },
  };
}

export function applyIntegrityGates(
  scores: DimensionScoreSet,
  completeness: CompletenessEvidence,
  responseReliance: ResponseRelianceEvidence,
): { scores: DimensionScoreSet; evidence: IntegrityGateEvidence } {
  const severeAiPaste = responseReliance.aiPastedTaskCount > 0 || responseReliance.aiPasteShare >= 0.5;
  const moderateAiPaste = responseReliance.aiPasteShare >= 0.25;
  const caps = {
    judgment: severeAiPaste ? 45 : moderateAiPaste ? 65 : null,
    verification: severeAiPaste ? 45 : moderateAiPaste ? 65 : null,
    toolFluency: severeAiPaste ? 55 : moderateAiPaste ? 70 : null,
  };

  const gatedDimensions: Record<ScoreDimension, number | null> = {
    accuracy: scaleScore(scores.accuracy, completeness.accuracyMultiplier),
    efficiency: scores.efficiency,
    judgment: capScore(scores.judgment, caps.judgment),
    verification: capScore(scores.verification, caps.verification),
    communication: scaleScore(scores.communication, completeness.communicationMultiplier),
    toolFluency: capScore(scores.toolFluency, caps.toolFluency),
  };
  const dimensionOverall = computeOverallScore(gatedDimensions);
  const gatedOverall = scaleScore(dimensionOverall, completeness.overallMultiplier);
  const gatedScores = {
    ...gatedDimensions,
    overallScore: gatedOverall,
  };

  return {
    scores: gatedScores,
    evidence: {
      before: scores,
      after: gatedScores,
      completenessRatio: completeness.completenessRatio,
      aiPasteShare: responseReliance.aiPasteShare,
      attemptedTaskCount: completeness.attemptedTaskCount,
      definedTaskCount: completeness.definedTaskCount,
      multipliers: {
        overall: completeness.overallMultiplier,
        accuracy: completeness.accuracyMultiplier,
        communication: completeness.communicationMultiplier,
      },
      caps,
    },
  };
}
