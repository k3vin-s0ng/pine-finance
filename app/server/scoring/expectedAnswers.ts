// Server-side answer key store. Never import from the client.

export type ExpectedNumericalAnswer = {
  value: number;
  unit: "$" | "$M" | "$B" | "%" | "x" | "0/1";
  tolerancePct?: number;
};

export type ExpectedExtractionRow = {
  metricLabel: string;
  expectedValue: number;
  unit: ExpectedNumericalAnswer["unit"];
  tolerancePct?: number;
};

export type ExpectedReconciliationEntry = {
  accountLabel: string;
  expectedCorrected: number;
  unit: ExpectedNumericalAnswer["unit"];
  tolerancePct?: number;
};

export type ExpectedTaskAnswers = {
  /** For memo/variance/thesis/flags once NumericalAnswersBlock is added to composers */
  numerical?: Record<string, ExpectedNumericalAnswer>;
  extractionRows?: ExpectedExtractionRow[];
  reconciliationEntries?: ExpectedReconciliationEntry[];
};

/**
 * Expected answers keyed by [roleTemplate][taskId] (t1–t3 per AssessmentInterface.tsx).
 *
 * Tasks without entries have null deterministic accuracy for that task.
 * v1 calibration values ported from Manus where task prompts align; empty where they do not.
 */
export const EXPECTED_TASK_ANSWERS: Record<string, Record<string, ExpectedTaskAnswers>> = {
  "IB Analyst": {
    t1: {
      extractionRows: [
        { metricLabel: "Total Revenue", expectedValue: 4759, unit: "$M", tolerancePct: 0.005 },
        { metricLabel: "Capital Markets", expectedValue: 2107, unit: "$M", tolerancePct: 0.005 },
        { metricLabel: "Investment Banking", expectedValue: 1842, unit: "$M", tolerancePct: 0.005 },
        { metricLabel: "Asset Management", expectedValue: 934, unit: "$M", tolerancePct: 0.005 },
        { metricLabel: "Net Income", expectedValue: 892, unit: "$M", tolerancePct: 0.005 },
        { metricLabel: "ROE", expectedValue: 18.4, unit: "%", tolerancePct: 0.05 },
        { metricLabel: "YoY", expectedValue: 13.2, unit: "%", tolerancePct: 0.05 },
      ],
    },
    t2: {
      numerical: {
        revised_wacc: { value: 10.5, unit: "%", tolerancePct: 0.15 },
        revised_terminal_growth: { value: 2.0, unit: "%", tolerancePct: 0.25 },
        revised_fair_value: { value: 175, unit: "$", tolerancePct: 0.15 },
        fair_value_low: { value: 150, unit: "$", tolerancePct: 0.2 },
        fair_value_high: { value: 200, unit: "$", tolerancePct: 0.15 },
      },
    },
    t3: {
      numerical: {
        implied_book_value_multiple: { value: 1.8, unit: "x", tolerancePct: 0.12 },
        implied_deal_size: { value: 56, unit: "$B", tolerancePct: 0.15 },
        control_premium_used: { value: 20, unit: "%", tolerancePct: 0.01 },
      },
    },
  },

  // Variance/memo tasks; no NumericalAnswersBlock in pine-1 composers yet — no keys defined.
  "FP&A Analyst": {},

  // Thesis/flags/memo only; numerical keys reserved for future composer block.
  "PE Associate": {
    t1: {
      numerical: {
        purchase_multiple: { value: 11.5, unit: "x", tolerancePct: 0.15 },
        exit_multiple_assumption: { value: 10.0, unit: "x", tolerancePct: 0.2 },
        target_irr: { value: 22, unit: "%", tolerancePct: 0.15 },
        leverage_at_entry: { value: 6.5, unit: "x", tolerancePct: 0.15 },
      },
    },
  },

  // No Manus answer keys; tasks are thesis/extraction/flags without keyed numerical fields yet.
  "Hedge Fund Research Analyst": {},
};
