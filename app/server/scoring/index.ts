export {
  parseNumericalInput,
  withinTolerance,
  type ParseResult,
} from "./numericalParser";

export {
  EXPECTED_TASK_ANSWERS,
  type ExpectedNumericalAnswer,
  type ExpectedExtractionRow,
  type ExpectedReconciliationEntry,
  type ExpectedTaskAnswers,
} from "./expectedAnswers";

export {
  checkTaskAccuracy,
  computeAccuracyScore,
  computeDeterministicScores,
  computeEfficiency,
  type AccuracyCheck,
  type AccuracyEvidence,
  type DeterministicScores,
  type EfficiencyEvidence,
  type StructuredTaskResponse,
} from "./deterministic";
