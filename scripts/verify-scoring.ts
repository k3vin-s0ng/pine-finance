/**
 * Smoke check for deterministic scoring modules.
 * Run: npx tsx scripts/verify-scoring.ts
 */

import {
  applyIntegrityGates,
  parseNumericalInput,
  withinTolerance,
  blendScores,
  computeBehavioralScores,
  computeEfficiency,
  computeDeterministicScores,
  type DimensionScoreSet,
  type ExpectedNumericalAnswer,
} from "../app/server/scoring";

function assert(label: string, ok: boolean) {
  const status = ok ? "PASS" : "FAIL";
  console.log(`${status}  ${label}`);
  if (!ok) process.exitCode = 1;
}

const revM: ExpectedNumericalAnswer = { value: 4759, unit: "$M", tolerancePct: 0.005 };

// 1. Currency + millions
const p1 = parseNumericalInput("$4,759M", revM);
assert("parse $4,759M → 4759 ($M)", p1.value === 4759);

// 2. Percent with prose
const roe: ExpectedNumericalAnswer = { value: 18.4, unit: "%", tolerancePct: 0.05 };
const p2 = parseNumericalInput("approximately 18.4%", roe);
assert("parse prose percent → 18.4", p2.value === 18.4);

// 3. Parenthetical negative (Corporate & Other style)
const p3 = parseNumericalInput("(124)", { value: -124, unit: "$M" });
assert("parse (124) → -124 ($M)", p3.value === -124);

// 4. Tolerance match / miss
const tolOk = withinTolerance({ value: 2107, hasNumber: true }, { value: 2107, unit: "$M", tolerancePct: 0.005 });
const tolBad = withinTolerance({ value: 2000, hasNumber: true }, { value: 2107, unit: "$M", tolerancePct: 0.005 });
assert("withinTolerance exact match", tolOk.matches === true);
assert("withinTolerance miss", tolBad.matches === false);

// 5. Efficiency optimal band (75% of limit)
const eff = computeEfficiency(2700, 3600);
assert("efficiency 75% → optimal score 100", eff.score === 100 && eff.evidence.band === "optimal");

// 6. End-to-end accuracy on IB Analyst t1 extraction
const det = computeDeterministicScores({
  roleTemplate: "IB Analyst",
  tasks: [
    {
      taskId: "t1",
      responseType: "extraction",
      value: {
        rows: [
          { metric: "Total Revenue", value: "$4,759M" },
          { metric: "Capital Markets", value: "2107" },
          { metric: "ROE", value: "18.4%" },
        ],
      },
    },
  ],
  completionTimeSeconds: 2700,
  timeLimitSeconds: 3600,
});

assert(
  "IB t1 extraction accuracy > 0 with checks",
  det.accuracy !== null &&
    det.accuracy > 0 &&
    (det.accuracyEvidence?.totalChecks ?? 0) >= 3,
);

assert("Management Consultant has no accuracy keys → null accuracy only", (() => {
  const consultant = computeDeterministicScores({
    roleTemplate: "Management Consultant",
    tasks: [{ taskId: "t1", responseType: "flags", value: { driver: "x" } }],
    taskResponses: {
      t1: "The response identifies regulatory approval risk, deteriorating credit quality, and BSA remediation as deal-specific concerns.",
    },
    completionTimeSeconds: 1000,
    timeLimitSeconds: 3600,
  });
  return consultant.accuracy === null && consultant.efficiency > 0;
})());

// 8. Behavioral events produce non-null process scores.
const behavioral = computeBehavioralScores([
  {
    id: 1,
    taskId: "t1",
    eventType: "material_view",
    eventData: { materialKey: "10K", durationSeconds: 95 },
    clientTimestamp: 1000,
  },
  {
    id: 2,
    taskId: "t1",
    eventType: "ai_prompt_sent",
    eventData: { promptLength: 84, secondsSinceTaskStart: 120 },
    clientTimestamp: 2000,
  },
  {
    id: 3,
    taskId: "t1",
    eventType: "response_edit",
    eventData: { netDeltaChars: 350, totalLength: 350 },
    clientTimestamp: 3000,
  },
]);
assert(
  "behavioral telemetry → non-null judgment/verification/tool scores",
  behavioral.judgment !== null && behavioral.verification !== null && behavioral.toolFluency !== null,
);

const selfAuthoredLongResponse = "Candidate-authored analysis with source-backed reasoning. ".repeat(40);
const trivialPasteBaseline = computeBehavioralScores(
  [
    {
      id: 4,
      taskId: "t1",
      eventType: "response_edit",
      eventData: { netDeltaChars: selfAuthoredLongResponse.length, totalLength: selfAuthoredLongResponse.length },
      clientTimestamp: 4000,
    },
  ],
  {
    totalResponseChars: selfAuthoredLongResponse.length,
    totalResponseWords: selfAuthoredLongResponse.trim().split(/\s+/).length,
    totalPastedChars: 0,
    totalAiPastedChars: 0,
    largestPasteChars: 0,
    pasteShare: 0,
    aiPasteShare: 0,
    typedCharsEstimate: selfAuthoredLongResponse.length,
    aiPastedTaskCount: 0,
  },
);
const trivialAiPaste = computeBehavioralScores(
  [
    {
      id: 4,
      taskId: "t1",
      eventType: "response_edit",
      eventData: { netDeltaChars: selfAuthoredLongResponse.length, totalLength: selfAuthoredLongResponse.length },
      clientTimestamp: 4000,
    },
    {
      id: 5,
      taskId: "t1",
      eventType: "paste",
      eventData: { source: "ai", clipboardLength: 8 },
      clientTimestamp: 4500,
    },
  ],
  {
    totalResponseChars: selfAuthoredLongResponse.length,
    totalResponseWords: selfAuthoredLongResponse.trim().split(/\s+/).length,
    totalPastedChars: 8,
    totalAiPastedChars: 8,
    largestPasteChars: 8,
    pasteShare: 8 / selfAuthoredLongResponse.length,
    aiPasteShare: 8 / selfAuthoredLongResponse.length,
    typedCharsEstimate: selfAuthoredLongResponse.length - 8,
    aiPastedTaskCount: 0,
  },
);
assert(
  "trivial AI paste does not lower behavioral scores below baseline",
  (trivialAiPaste.judgment ?? 0) >= (trivialPasteBaseline.judgment ?? 0) &&
    (trivialAiPaste.verification ?? 0) >= (trivialPasteBaseline.verification ?? 0) &&
    (trivialAiPaste.toolFluency ?? 0) >= (trivialPasteBaseline.toolFluency ?? 0),
);

// 9. Blend uses deterministic scores when present and falls back to LLM when absent.
const llmScores: DimensionScoreSet = {
  accuracy: 60,
  efficiency: 60,
  judgment: 60,
  verification: 60,
  communication: 88,
  toolFluency: 60,
  overallScore: 64.2,
};
const blended = blendScores(llmScores, {
  accuracy: 100,
  accuracyEvidence: null,
  efficiency: 80,
  efficiencyEvidence: {
    completionTimeSeconds: 2700,
    timeLimitSeconds: 3600,
    timeRatio: 0.75,
    completenessRatio: 1,
    abandoned: false,
    band: "optimal",
  },
  completenessEvidence: {
    definedTaskCount: 1,
    attemptedTaskCount: 1,
    completenessRatio: 1,
    taskWordThreshold: 15,
    typedWordThreshold: 12,
    tasks: [],
    overallMultiplier: 1,
    accuracyMultiplier: 1,
    communicationMultiplier: 1,
  },
  responseRelianceEvidence: {
    totalResponseChars: 0,
    totalResponseWords: 0,
    totalPastedChars: 0,
    totalAiPastedChars: 0,
    largestPasteChars: 0,
    pasteShare: 0,
    aiPasteShare: 0,
    typedCharsEstimate: 0,
    aiPastedTaskCount: 0,
  },
  behavioralEvidence: null,
  judgment: null,
  judgmentEvidence: null,
  verification: 70,
  verificationEvidence: null,
  toolFluency: 90,
  toolFluencyEvidence: null,
});
assert("blend accuracy uses 65% deterministic weight", blended.scores.accuracy === 86);
assert("blend null judgment falls back to LLM", blended.scores.judgment === 60);
assert("blend communication remains 100% LLM", blended.scores.communication === 88);

const generousLlmScores: DimensionScoreSet = {
  accuracy: 82,
  efficiency: 82,
  judgment: 82,
  verification: 82,
  communication: 82,
  toolFluency: 82,
  overallScore: 82,
};

const emptySubmission = computeDeterministicScores({
  roleTemplate: "Management Consultant",
  tasks: [],
  taskResponses: { t1: "", t2: "", t3: "" },
  definedTaskIds: ["t1", "t2", "t3"],
  completionTimeSeconds: 420,
  timeLimitSeconds: 3600,
});
const emptyBlended = blendScores(generousLlmScores, emptySubmission);
const emptyGated = applyIntegrityGates(
  emptyBlended.scores,
  emptySubmission.completenessEvidence,
  emptySubmission.responseRelianceEvidence,
);
assert(
  "empty/incomplete submission is gated low",
  (emptyGated.scores.overallScore ?? 100) < 30 &&
    emptySubmission.completenessEvidence.attemptedTaskCount === 0,
);
assert(
  "fast-but-incomplete run scores low efficiency",
  emptySubmission.efficiency <= 10 && emptySubmission.efficiencyEvidence.band === "abandoned",
);

const aiAnswer =
  "The highest priority issue is regulatory approval risk from the CAMELS downgrade, followed by deteriorating CRE credit quality and unresolved BSA AML matters. Vantage should renegotiate price protections because these issues could delay approval and reduce post close value. The board should require validated remediation plans, credit marks, and a closing condition tied to examiner feedback before proceeding.";
const badConsultantResponses = {
  t1: "The top three risks are the CAMELS 3 downgrade, the NPL ratio at 3.8 percent, and CRE concentration at 312 percent of capital. These matter because regulators may delay approval and Vantage may inherit credit losses.",
  t2: aiAnswer,
  t3: "",
};
const badConsultant = computeDeterministicScores({
  roleTemplate: "Management Consultant",
  tasks: [],
  taskResponses: badConsultantResponses,
  definedTaskIds: ["t1", "t2", "t3"],
  aiInteractions: [{ role: "assistant", content: aiAnswer }],
  behaviorEvents: [
    {
      id: 10,
      taskId: "t2",
      eventType: "paste",
      eventData: { source: "ai", clipboardLength: aiAnswer.length },
      clientTimestamp: 1000,
    },
  ],
  completionTimeSeconds: 396,
  timeLimitSeconds: 3600,
});
const badBlended = blendScores(generousLlmScores, badConsultant);
const badGated = applyIntegrityGates(
  badBlended.scores,
  badConsultant.completenessEvidence,
  badConsultant.responseRelianceEvidence,
);
console.log(`INFO  simulated bad Management Consultant score → ${badGated.scores.overallScore}/100`);
assert(
  "bad Management Consultant calibration remains 6/100",
  badGated.scores.overallScore === 6,
);
assert(
  "verbatim AI paste tanks judgment + verification",
  (badGated.scores.judgment ?? 100) <= 45 &&
    (badGated.scores.verification ?? 100) <= 45 &&
    badConsultant.responseRelianceEvidence.aiPastedTaskCount >= 1,
);
assert(
  "1 substantive + 1 AI paste + 1 empty at 11% time lands below passing",
  (badGated.scores.overallScore ?? 100) < 50,
);

const goodResponses = {
  t1: "First, the CAMELS composite downgrade to 3 is the highest priority because it can slow or condition bank merger approval. Second, credit risk is material because NPLs rose to 3.8 percent and CRE concentration reached 312 percent of capital. Third, unresolved BSA AML MRAs create execution risk because remediation capacity and examiner validation are not yet proven.",
  t2: "Recommendation: proceed only with renegotiated protections. Cornerstone has strategic value, but the board should not accept the current economics without credit marks, a funded BSA remediation plan, and a closing condition tied to no new supervisory objections. The issues are manageable but directly affect approval timing and post close earnings.",
  t3: "Vantage should add a purchase price adjustment tied to updated credit marks and a holdback for BSA AML remediation costs. The credit mark protects tangible book value if construction and non owner occupied CRE losses migrate. The remediation holdback funds staffing, SAR backlog cleanup, and validation work. The key open question is whether regulators have indicated approval conditions after the latest OCC exam.",
};
const goodConsultant = computeDeterministicScores({
  roleTemplate: "Management Consultant",
  tasks: [],
  taskResponses: goodResponses,
  definedTaskIds: ["t1", "t2", "t3"],
  aiInteractions: [{ role: "assistant", content: "Use an outline and verify every figure against the OCC summary and financials." }],
  behaviorEvents: [
    {
      id: 20,
      taskId: "t1",
      eventType: "material_view",
      eventData: { materialKey: "OCC_EXAM", durationSeconds: 160 },
      clientTimestamp: 1000,
    },
    {
      id: 21,
      taskId: "t2",
      eventType: "material_view",
      eventData: { materialKey: "FINANCIALS", durationSeconds: 180 },
      clientTimestamp: 2000,
    },
    {
      id: 22,
      taskId: "t2",
      eventType: "citation_added",
      eventData: { source: "source_material" },
      clientTimestamp: 3000,
    },
    {
      id: 23,
      taskId: "t3",
      eventType: "response_edit",
      eventData: { netDeltaChars: 900, totalLength: 900, secsSinceAIResponse: 45 },
      clientTimestamp: 4000,
    },
  ],
  completionTimeSeconds: 2700,
  timeLimitSeconds: 3600,
});
const goodBlended = blendScores(
  {
    accuracy: 86,
    efficiency: 82,
    judgment: 86,
    verification: 86,
    communication: 86,
    toolFluency: 84,
    overallScore: 85,
  },
  goodConsultant,
);
const goodGated = applyIntegrityGates(
  goodBlended.scores,
  goodConsultant.completenessEvidence,
  goodConsultant.responseRelianceEvidence,
);
assert(
  "complete self-authored submission still scores well",
  goodConsultant.completenessEvidence.completenessRatio === 1 &&
    (goodGated.scores.overallScore ?? 0) >= 70,
);

console.log(process.exitCode === 1 ? "\nSome checks failed." : "\nAll checks passed.");
