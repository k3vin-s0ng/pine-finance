/**
 * Scoring Engine — Finance AI Usage & Impact Dashboard
 *
 * Computes a weighted composite score across five pillars.
 * IMPORTANT: Raw prompt volume is explicitly excluded from all scoring calculations.
 * Only effective, outcome-linked usage is rewarded.
 */

export interface ScoringWeights {
  adoptionWeight: number;    // default 15%
  efficiencyWeight: number;  // default 20%
  qualityWeight: number;     // default 20%
  judgmentWeight: number;    // default 20%
  governanceWeight: number;  // default 15%
  businessImpactWeight: number; // default 10%
}

export interface ScoringInput {
  // Adoption — are they using AI on real workflows?
  weeklyActiveRate: number;       // 0–1: fraction of working days with AI usage
  workflowPenetrationRate: number; // 0–1: fraction of eligible tasks where AI was used

  // Efficiency — is it faster?
  cycleTimeImprovement: number;   // 0–1: (baseline - actual) / baseline
  throughputImprovement: number;  // 0–1: relative throughput gain
  touchlessRate: number;          // 0–1: fraction processed without human edits

  // Quality — is it accurate?
  errorRateReduction: number;     // 0–1: (baseline_errors - actual_errors) / baseline_errors
  reworkRateReduction: number;    // 0–1
  exceptionPrecision: number;     // 0–1: correct anomaly flags / total flags

  // Judgment — are they verifying and escalating appropriately?
  verificationRate: number;       // 0–1: fraction of AI outputs reviewed before acceptance
  appropriateOverrideRate: number; // 0–1: overrides that were correct (not blind acceptance)
  escalationRate: number;         // 0–1: high-risk tasks that were escalated as required

  // Governance — are they inside policy?
  approvedToolRate: number;       // 0–1: fraction of events using approved tools
  auditTrailCompleteness: number; // 0–1: fraction of events with full audit trail
  humanApprovalComplianceRate: number; // 0–1: high-risk tasks with required human approval

  // Business Impact — does the firm benefit?
  hoursSavedPerFTE: number;       // normalized 0–1 against a benchmark (e.g., 20h/month = 1.0)
  costSavingsRate: number;        // 0–1: normalized cost reduction
}

export interface ScoringResult {
  adoptionScore: number;
  efficiencyScore: number;
  qualityScore: number;
  judgmentScore: number;
  governanceScore: number;
  businessImpactScore: number;
  compositeScore: number;
  breakdown: Record<string, number>;
}

function clamp(val: number): number {
  return Math.max(0, Math.min(100, val));
}

export function computeScores(input: ScoringInput, weights: ScoringWeights): ScoringResult {
  // Adoption (0–100): workflow penetration weighted more than raw activity
  // Sub-weights sum to 100, inputs are 0-1, so result is 0-100 directly
  const adoptionScore = clamp(
    input.weeklyActiveRate * 40 + input.workflowPenetrationRate * 60
  );

  // Efficiency (0–100): cycle time improvement is the primary signal
  const efficiencyScore = clamp(
    input.cycleTimeImprovement * 50 +
    input.throughputImprovement * 30 +
    input.touchlessRate * 20
  );

  // Quality (0–100): error reduction and exception precision
  const qualityScore = clamp(
    input.errorRateReduction * 50 +
    input.reworkRateReduction * 30 +
    input.exceptionPrecision * 20
  );

  // Judgment (0–100): verification and escalation behavior — NOT volume
  const judgmentScore = clamp(
    input.verificationRate * 40 +
    input.appropriateOverrideRate * 40 +
    input.escalationRate * 20
  );

  // Governance (0–100): policy adherence and audit completeness
  const governanceScore = clamp(
    input.approvedToolRate * 40 +
    input.auditTrailCompleteness * 30 +
    input.humanApprovalComplianceRate * 30
  );

  // Business Impact (0–100): tangible financial benefit
  const businessImpactScore = clamp(
    input.hoursSavedPerFTE * 60 + input.costSavingsRate * 40
  );

  // Weighted composite — weights must sum to 100
  const totalWeight =
    weights.adoptionWeight +
    weights.efficiencyWeight +
    weights.qualityWeight +
    weights.judgmentWeight +
    weights.governanceWeight +
    weights.businessImpactWeight;

  const compositeScore = clamp(
    (adoptionScore * weights.adoptionWeight +
      efficiencyScore * weights.efficiencyWeight +
      qualityScore * weights.qualityWeight +
      judgmentScore * weights.judgmentWeight +
      governanceScore * weights.governanceWeight +
      businessImpactScore * weights.businessImpactWeight) /
      totalWeight
  );

  return {
    adoptionScore: Math.round(adoptionScore * 10) / 10,
    efficiencyScore: Math.round(efficiencyScore * 10) / 10,
    qualityScore: Math.round(qualityScore * 10) / 10,
    judgmentScore: Math.round(judgmentScore * 10) / 10,
    governanceScore: Math.round(governanceScore * 10) / 10,
    businessImpactScore: Math.round(businessImpactScore * 10) / 10,
    compositeScore: Math.round(compositeScore * 10) / 10,
    breakdown: {
      "Adoption (workflow penetration)": Math.round(input.workflowPenetrationRate * 100),
      "Efficiency (cycle time improvement %)": Math.round(input.cycleTimeImprovement * 100),
      "Quality (error rate reduction %)": Math.round(input.errorRateReduction * 100),
      "Judgment (verification rate %)": Math.round(input.verificationRate * 100),
      "Governance (approved tool rate %)": Math.round(input.approvedToolRate * 100),
      "Business Impact (hours saved)": Math.round(input.hoursSavedPerFTE * 100),
    },
  };
}

/**
 * Classify a workflow type from application context and metadata.
 * This is the v1 rule-based classifier — can be upgraded to ML later.
 */
export function classifyWorkflow(context: {
  sourceApplication: string;
  toolName: string;
  outputObjectId?: string;
  userTag?: string;
}): string {
  const { sourceApplication, outputObjectId, userTag } = context;

  if (userTag) return userTag;

  const obj = (outputObjectId ?? "").toLowerCase();

  if (sourceApplication === "ap_module") {
    if (obj.includes("exception")) return "ap_exception_handling";
    return "ap_invoice_coding";
  }
  if (sourceApplication === "erp") {
    if (obj.includes("recon") || obj.includes("reconcil")) return "close_reconciliation";
    if (obj.includes("close") || obj.includes("checklist")) return "close_checklist";
    if (obj.includes("ar") || obj.includes("collect")) return "ar_collections";
    return "ap_invoice_coding";
  }
  if (sourceApplication === "fpa_platform") {
    if (obj.includes("variance") || obj.includes("commentary")) return "fpa_variance_commentary";
    if (obj.includes("forecast")) return "fpa_forecast";
    if (obj.includes("budget")) return "fpa_budget";
    return "fpa_variance_commentary";
  }
  if (sourceApplication === "close_tool") {
    if (obj.includes("recon")) return "close_reconciliation";
    return "close_checklist";
  }
  if (sourceApplication === "excel" || sourceApplication === "browser") {
    if (obj.includes("board") || obj.includes("deck")) return "reporting_board_deck";
    if (obj.includes("report") || obj.includes("pack")) return "reporting_management_pack";
    if (obj.includes("variance")) return "fpa_variance_commentary";
  }

  return "other";
}
