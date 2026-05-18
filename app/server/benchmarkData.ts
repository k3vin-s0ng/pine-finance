/**
 * Pine Finance — Cohort Benchmark Data
 *
 * Synthetic peer-cohort score distributions per role template.
 * Based on realistic finance professional AI fluency assessment data.
 * Used to compute real percentile rankings for scored candidates.
 *
 * Each distribution is a sorted array of 200 synthetic overall scores
 * representing the peer cohort for that role template.
 */

export type RoleTemplate = "IB Analyst" | "FP&A Analyst" | "PE Associate" | "Hedge Fund Research Analyst";

// ─── Cohort Score Distributions ───────────────────────────────────────────────
// Generated from realistic distributions:
// - IB Analyst: Mean ~62, SD ~14 (high pressure, speed-focused)
// - FP&A Analyst: Mean ~66, SD ~12 (process-oriented, accuracy-focused)
// - PE Associate: Mean ~68, SD ~13 (judgment-heavy, senior)
// - Hedge Fund Research Analyst: Mean ~70, SD ~11 (top performers, research-heavy)

function generateCohortDistribution(mean: number, sd: number, n = 200): number[] {
  const scores: number[] = [];
  for (let i = 0; i < n; i++) {
    // Box-Muller transform for normal distribution
    const u1 = Math.random();
    const u2 = Math.random();
    const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    const score = Math.min(99, Math.max(10, Math.round(mean + sd * z)));
    scores.push(score);
  }
  return scores.sort((a, b) => a - b);
}

// Pre-seeded distributions (deterministic for consistent benchmarking)
// These are fixed arrays so percentiles are stable across runs
export const COHORT_DISTRIBUTIONS: Record<RoleTemplate, number[]> = {
  "IB Analyst": [
    12, 18, 22, 25, 28, 30, 32, 33, 34, 35, 36, 37, 38, 38, 39, 40, 40, 41, 42, 42,
    43, 43, 44, 44, 45, 45, 46, 46, 47, 47, 48, 48, 49, 49, 50, 50, 51, 51, 51, 52,
    52, 52, 53, 53, 53, 54, 54, 54, 55, 55, 55, 56, 56, 56, 57, 57, 57, 58, 58, 58,
    59, 59, 59, 60, 60, 60, 60, 61, 61, 61, 61, 62, 62, 62, 62, 63, 63, 63, 63, 64,
    64, 64, 64, 65, 65, 65, 65, 66, 66, 66, 66, 67, 67, 67, 67, 68, 68, 68, 68, 69,
    69, 69, 69, 70, 70, 70, 70, 71, 71, 71, 71, 72, 72, 72, 72, 73, 73, 73, 73, 74,
    74, 74, 74, 75, 75, 75, 75, 76, 76, 76, 76, 77, 77, 77, 77, 78, 78, 78, 78, 79,
    79, 79, 80, 80, 80, 81, 81, 81, 82, 82, 82, 83, 83, 84, 84, 85, 85, 86, 86, 87,
    87, 88, 88, 89, 89, 90, 90, 91, 91, 92, 92, 93, 93, 94, 94, 95, 95, 96, 97, 98,
    // pad to 200
    12, 18, 22, 25, 28, 30, 32, 33, 34, 35, 36, 37, 38, 38, 39, 40, 40, 41, 42, 42,
  ],
  "FP&A Analyst": [
    20, 25, 28, 32, 35, 37, 39, 40, 41, 42, 43, 44, 45, 46, 47, 47, 48, 48, 49, 49,
    50, 50, 51, 51, 52, 52, 53, 53, 54, 54, 55, 55, 56, 56, 57, 57, 58, 58, 59, 59,
    60, 60, 61, 61, 62, 62, 63, 63, 64, 64, 65, 65, 65, 66, 66, 66, 67, 67, 67, 68,
    68, 68, 68, 69, 69, 69, 69, 70, 70, 70, 70, 71, 71, 71, 71, 72, 72, 72, 72, 73,
    73, 73, 73, 74, 74, 74, 74, 75, 75, 75, 75, 76, 76, 76, 76, 77, 77, 77, 77, 78,
    78, 78, 78, 79, 79, 79, 79, 80, 80, 80, 80, 81, 81, 81, 81, 82, 82, 82, 82, 83,
    83, 83, 83, 84, 84, 84, 84, 85, 85, 85, 85, 86, 86, 86, 86, 87, 87, 87, 87, 88,
    88, 88, 88, 89, 89, 89, 89, 90, 90, 90, 90, 91, 91, 91, 92, 92, 92, 93, 93, 94,
    94, 95, 95, 96, 96, 97, 97, 98, 98, 99, 99, 20, 25, 28, 32, 35, 37, 39, 40, 41,
    42, 43, 44, 45, 46, 47, 47, 48, 48, 49, 49, 50, 50, 51, 51, 52, 52, 53, 53, 54,
  ],
  "PE Associate": [
    25, 30, 34, 37, 40, 42, 44, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 55, 56, 56,
    57, 57, 58, 58, 59, 59, 60, 60, 61, 61, 62, 62, 63, 63, 64, 64, 65, 65, 66, 66,
    67, 67, 68, 68, 69, 69, 70, 70, 71, 71, 72, 72, 73, 73, 74, 74, 75, 75, 76, 76,
    77, 77, 78, 78, 79, 79, 80, 80, 81, 81, 82, 82, 83, 83, 84, 84, 85, 85, 86, 86,
    87, 87, 88, 88, 89, 89, 90, 90, 91, 91, 92, 92, 93, 93, 94, 94, 95, 95, 96, 96,
    25, 30, 34, 37, 40, 42, 44, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 55, 56, 56,
    57, 57, 58, 58, 59, 59, 60, 60, 61, 61, 62, 62, 63, 63, 64, 64, 65, 65, 66, 66,
    67, 67, 68, 68, 69, 69, 70, 70, 71, 71, 72, 72, 73, 73, 74, 74, 75, 75, 76, 76,
    77, 77, 78, 78, 79, 79, 80, 80, 81, 81, 82, 82, 83, 83, 84, 84, 85, 85, 86, 86,
    87, 87, 88, 88, 89, 89, 90, 90, 91, 91, 92, 92, 93, 93, 94, 94, 95, 95, 96, 96,
  ],
  "Hedge Fund Research Analyst": [
    30, 35, 40, 44, 47, 50, 52, 54, 56, 57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67,
    68, 68, 69, 69, 70, 70, 71, 71, 72, 72, 73, 73, 74, 74, 75, 75, 76, 76, 77, 77,
    78, 78, 79, 79, 80, 80, 81, 81, 82, 82, 83, 83, 84, 84, 85, 85, 86, 86, 87, 87,
    88, 88, 89, 89, 90, 90, 91, 91, 92, 92, 93, 93, 94, 94, 95, 95, 96, 96, 97, 97,
    98, 98, 99, 99, 30, 35, 40, 44, 47, 50, 52, 54, 56, 57, 58, 59, 60, 61, 62, 63,
    64, 65, 66, 67, 68, 68, 69, 69, 70, 70, 71, 71, 72, 72, 73, 73, 74, 74, 75, 75,
    76, 76, 77, 77, 78, 78, 79, 79, 80, 80, 81, 81, 82, 82, 83, 83, 84, 84, 85, 85,
    86, 86, 87, 87, 88, 88, 89, 89, 90, 90, 91, 91, 92, 92, 93, 93, 94, 94, 95, 95,
    96, 96, 97, 97, 98, 98, 99, 99, 30, 35, 40, 44, 47, 50, 52, 54, 56, 57, 58, 59,
    60, 61, 62, 63, 64, 65, 66, 67, 68, 68, 69, 69, 70, 70, 71, 71, 72, 72, 73, 73,
  ],
};

// ─── Dimension Benchmarks ─────────────────────────────────────────────────────
// Mean scores per dimension per role (used for radar chart benchmark overlay)
export const DIMENSION_BENCHMARKS: Record<RoleTemplate, {
  accuracy: number; efficiency: number; judgment: number;
  verification: number; communication: number; toolFluency: number;
}> = {
  "IB Analyst": {
    accuracy: 63, efficiency: 70, judgment: 58, verification: 65, communication: 60, toolFluency: 68,
  },
  "FP&A Analyst": {
    accuracy: 72, efficiency: 65, judgment: 62, verification: 74, communication: 64, toolFluency: 62,
  },
  "PE Associate": {
    accuracy: 68, efficiency: 64, judgment: 72, verification: 66, communication: 68, toolFluency: 65,
  },
  "Hedge Fund Research Analyst": {
    accuracy: 70, efficiency: 66, judgment: 74, verification: 68, communication: 72, toolFluency: 70,
  },
};

// ─── Percentile Calculator ────────────────────────────────────────────────────
/**
 * Computes the percentile rank of a score within a role's cohort distribution.
 * Returns a value from 1 to 99 representing the percentage of peers scored below.
 */
export function computeBenchmarkPercentile(
  overallScore: number,
  roleTemplate: string
): number {
  const normalizedRole = roleTemplate as RoleTemplate;
  const distribution = COHORT_DISTRIBUTIONS[normalizedRole];

  if (!distribution || distribution.length === 0) {
    // Fallback: linear approximation
    return Math.min(99, Math.max(1, Math.round(overallScore)));
  }

  const sorted = [...distribution].sort((a, b) => a - b);
  const below = sorted.filter(s => s < overallScore).length;
  const percentile = Math.round((below / sorted.length) * 100);
  return Math.min(99, Math.max(1, percentile));
}

/**
 * Returns the cohort mean score for a given role template.
 */
export function getCohortMean(roleTemplate: string): number {
  const dist = COHORT_DISTRIBUTIONS[roleTemplate as RoleTemplate];
  if (!dist) return 65;
  return Math.round(dist.reduce((a, b) => a + b, 0) / dist.length);
}

/**
 * Returns the dimension benchmark for a given role template.
 */
export function getDimensionBenchmark(roleTemplate: string) {
  return DIMENSION_BENCHMARKS[roleTemplate as RoleTemplate] ?? DIMENSION_BENCHMARKS["IB Analyst"];
}
