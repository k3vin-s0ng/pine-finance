/**
 * Smoke check for deterministic scoring modules.
 * Run: npx tsx scripts/verify-scoring.ts
 */

import {
  parseNumericalInput,
  withinTolerance,
  computeEfficiency,
  computeDeterministicScores,
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

assert("FP&A has no accuracy keys → null accuracy only", (() => {
  const fpa = computeDeterministicScores({
    roleTemplate: "FP&A Analyst",
    tasks: [{ taskId: "t1", responseType: "variance", value: { driver: "x" } }],
    completionTimeSeconds: 1000,
    timeLimitSeconds: 3600,
  });
  return fpa.accuracy === null && fpa.efficiency > 0;
})());

console.log(process.exitCode === 1 ? "\nSome checks failed." : "\nAll checks passed.");
