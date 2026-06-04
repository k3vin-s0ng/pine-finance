/**
 * Smoke check for generated-assessment normalization and grounding.
 * Run: npm run verify-generation
 */

import type { GeneratedAssessment } from "../app/lib/schema";
import {
  isValueInQuote,
  isSourceQuoteGrounded,
  normalizeGeneratedAssessmentOutput,
} from "../app/server/generation/generateAssessment";
import {
  GROUNDED_EXTRACTION_EXEMPLAR,
  ROLE_EXEMPLAR_TASKS,
  ROLE_PROFILES,
  isGeneratedResponseType,
} from "../app/server/generation/generationProfiles";

function assert(label: string, ok: boolean) {
  const status = ok ? "PASS" : "FAIL";
  console.log(`${status}  ${label}`);
  if (!ok) process.exitCode = 1;
}

const sampleSourceText = `=== SOURCE MATERIALS ===

--- Cornerstone Bank Financials (text/plain, 2 KB) ---
Cornerstone Community Bank reported FY2024 total assets of $6,200 million and gross loans of $4,600 million.
Net income declined from $38 million in FY2023 to $29 million in FY2024.
The NPL ratio rose to 3.8% of loans, compared with a peer average of 1.9%.
Commercial real estate concentration reached 312% of total risk-based capital, above the 300% supervisory guideline.
The bank has 3 open BSA/AML Matters Requiring Attention related to staffing, SAR timeliness, and customer due diligence.

--- Loan Tape (text/plain, 1 KB) ---
Construction loan L-1042 has a $24.0 million balance and is 90+ days past due.
Construction loan L-1119 has an $18.5 million balance and is 60 days past due.`;

const rawOutput = {
  version: 1,
  status: "generated",
  roleTemplateHint: "Management Consultant",
  aiBoundary:
    "Pine AI may explain CAMELS, CRE concentration, BSA/AML remediation, and deal-risk framing. It must not write the final memo, ranking, or recommendation.",
  tasks: [
    {
      id: "risk-extract",
      responseType: "extraction",
      title: "Risk Metric Extraction",
      imperative: "Extract the core credit and regulatory metrics that affect approval risk.",
      context: "Cornerstone's supervisory and financial data show several potential approval and valuation issues.",
      deliverable: "Complete a concise source-backed metric table.",
      prompt: "Extract the key risk metrics from the source materials and cite the source for each value.",
      aiSuggestions: [
        "Which metrics are most relevant to bank merger approval?",
        "How should I treat CRE concentration?",
        "What is the right unit for NPL ratio?",
      ],
      dataPoints: [
        { label: "NPL", value: "3.8%", delta: -1 },
        { label: "CRE", value: "312%", delta: -1 },
      ],
      answerKeyStatus: "unverified",
      answerKey: {
        extractionRows: [
          {
            metricLabel: "NPL ratio",
            expectedValue: 3.8,
            unit: "%",
            tolerancePct: 0.02,
            sourceQuote: "The NPL ratio rose to 3.8% of loans, compared with a peer average of 1.9%.",
          },
          {
            metricLabel: "CRE concentration",
            expectedValue: 312,
            unit: "%",
            tolerancePct: 0.02,
            sourceQuote:
              "Commercial real estate concentration reached 312% of total risk-based capital, above the 300% supervisory guideline.",
          },
          {
            metricLabel: "Ungrounded metric",
            expectedValue: 999,
            unit: "$M",
            sourceQuote: "This quote does not exist in the supplied source materials.",
          },
          {
            metricLabel: "Hallucinated value on real quote",
            expectedValue: 999,
            unit: "$M",
            sourceQuote: "Net income declined from $38 million in FY2023 to $29 million in FY2024.",
          },
        ],
      },
    },
    {
      id: "board-memo",
      responseType: "memo",
      title: "Board Risk Memo",
      imperative: "Draft a board-ready risk memo that leads with a recommendation.",
      context: "Vantage needs to understand approval and post-close value risk before approving deal terms.",
      deliverable: "A concise memo with recommendation, evidence, and next steps.",
      prompt: "Write the risk findings memo for the board using the source metrics and supervisory facts.",
      aiSuggestions: [
        "How should I write this for directors?",
        "How do BSA/AML MRAs affect merger timing?",
        "What is a concise recommendation frame?",
      ],
      dataPoints: [{ label: "BSA MRAs", value: "3", delta: -1 }],
      answerKeyStatus: "unverified",
      answerKey: null,
    },
    {
      id: "loan-flags",
      responseType: "flags",
      title: "Past-Due Loan Flags",
      imperative: "Identify the largest construction credits that indicate migration risk.",
      context: "The loan tape includes construction loans with meaningful balances and delinquency.",
      deliverable: "A ranked list of credit-risk flags with recommendations.",
      prompt: "Flag the past-due construction loans and explain how they support the NPL trend.",
      aiSuggestions: [
        "How should I rank past-due loans?",
        "What matters about 90+ days past due?",
        "How do construction loans affect credit marks?",
      ],
      dataPoints: [{ label: "L-1042", value: "$24.0M", delta: -1 }],
      answerKeyStatus: "unverified",
      answerKey: null,
    },
  ],
};

const result = normalizeGeneratedAssessmentOutput({
  rawOutput,
  sourceText: sampleSourceText,
  model: "anthropic/claude-opus-4.8",
});
const assessment = result.generatedAssessment;

function collectExtractionRows(generatedAssessment: GeneratedAssessment) {
  return generatedAssessment.tasks.flatMap((task) => task.answerKey?.extractionRows ?? []);
}

const responseTypes = new Set(assessment.tasks.map((task) => task.responseType));
const extractionRows = collectExtractionRows(assessment);
const extractionTasks = assessment.tasks.filter((task) => task.responseType === "extraction");
const profileRoles = Object.keys(ROLE_PROFILES);
const exemplarRoles = Object.keys(ROLE_EXEMPLAR_TASKS);

assert("role profiles cover all four supported roles", profileRoles.length === 4 && exemplarRoles.length === 4);
assert(
  "role profiles use only generated response types",
  Object.values(ROLE_PROFILES).every((profile) =>
    profile.emphasizedTypes.length > 0 &&
    profile.emphasizedTypes.every((responseType) => isGeneratedResponseType(responseType)),
  ),
);
assert(
  "role profiles have distinct framing",
  new Set(Object.values(ROLE_PROFILES).map((profile) => profile.emphasizedTypes.join(","))).size > 1,
);
assert(
  "role exemplars use allowed generated response types",
  Object.values(ROLE_EXEMPLAR_TASKS).every((task) => isGeneratedResponseType(task.responseType)),
);
assert(
  "grounded extraction exemplar is quote- and value-grounded",
  GROUNDED_EXTRACTION_EXEMPLAR.extractionRows.every((row) =>
    isSourceQuoteGrounded(row.sourceQuote, GROUNDED_EXTRACTION_EXEMPLAR.sourceSnippet) &&
    isValueInQuote(row.expectedValue, row.sourceQuote ?? ""),
  ),
);
assert("generated assessment schema validates", assessment.status === "generated" && assessment.tasks.length === 3);
assert(
  "type-mix rule holds",
  responseTypes.has("extraction") &&
    (responseTypes.has("memo") || responseTypes.has("variance") || responseTypes.has("thesis")),
);
assert("generator emits no reconciliation tasks", !responseTypes.has("reconciliation"));
assert(
  "answer keys are extraction-rows-only",
  assessment.tasks.every((task) =>
    !task.answerKey || (!task.answerKey.numerical && !task.answerKey.reconciliationEntries),
  ),
);
assert(
  "extraction task carries the deterministic key",
  extractionTasks.some((task) => (task.answerKey?.extractionRows?.length ?? 0) > 0),
);
assert(
  "all tasks are assigned t1..tn and unverified",
  assessment.tasks.every((task, index) => task.id === `t${index + 1}` && task.answerKeyStatus === "unverified"),
);
assert("ungrounded and value-mismatched checks are dropped", result.droppedUngroundedAnswerKeys === 2);
assert(
  "all surviving extraction rows are quote- and value-grounded",
  extractionRows.length > 0 &&
    extractionRows.every((row) =>
      isSourceQuoteGrounded(row.sourceQuote, sampleSourceText) &&
      isValueInQuote(row.expectedValue, row.sourceQuote ?? ""),
    ),
);

console.log(process.exitCode === 1 ? "\nSome checks failed." : "\nAll checks passed.");
