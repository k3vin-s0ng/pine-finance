import { z } from "zod";
import {
  getEvaluationScores,
  getOutcomeMetrics,
  getScoringWeights,
  updateScoringWeights,
  upsertEvaluationScore,
} from "@/app/lib/db";
import { computeScores, ScoringInput } from "../scoring_intelligence";
import { protectedProcedure, router } from "../_core/trpc";

export const scoringRouter = router({
  weights: protectedProcedure.query(async () => {
    return getScoringWeights();
  }),

  updateWeights: protectedProcedure
    .input(
      z.object({
        adoptionWeight: z.number().min(0).max(100),
        efficiencyWeight: z.number().min(0).max(100),
        qualityWeight: z.number().min(0).max(100),
        judgmentWeight: z.number().min(0).max(100),
        governanceWeight: z.number().min(0).max(100),
        businessImpactWeight: z.number().min(0).max(100),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin" && ctx.user.financeRole !== "admin") {
        throw new Error("Only admins can update scoring weights");
      }
      const total =
        input.adoptionWeight +
        input.efficiencyWeight +
        input.qualityWeight +
        input.judgmentWeight +
        input.governanceWeight +
        input.businessImpactWeight;
      if (Math.abs(total - 100) > 0.01) {
        throw new Error(`Weights must sum to 100 (got ${total})`);
      }
      await updateScoringWeights({
        adoptionWeight: String(input.adoptionWeight),
        efficiencyWeight: String(input.efficiencyWeight),
        qualityWeight: String(input.qualityWeight),
        judgmentWeight: String(input.judgmentWeight),
        governanceWeight: String(input.governanceWeight),
        businessImpactWeight: String(input.businessImpactWeight),
      });
      return { success: true };
    }),

  computeForUser: protectedProcedure
    .input(
      z.object({
        userId: z.number(),
        periodStart: z.date(),
        periodEnd: z.date(),
        scoringInput: z.object({
          weeklyActiveRate: z.number().min(0).max(1),
          workflowPenetrationRate: z.number().min(0).max(1),
          cycleTimeImprovement: z.number().min(0).max(1),
          throughputImprovement: z.number().min(0).max(1),
          touchlessRate: z.number().min(0).max(1),
          errorRateReduction: z.number().min(0).max(1),
          reworkRateReduction: z.number().min(0).max(1),
          exceptionPrecision: z.number().min(0).max(1),
          verificationRate: z.number().min(0).max(1),
          appropriateOverrideRate: z.number().min(0).max(1),
          escalationRate: z.number().min(0).max(1),
          approvedToolRate: z.number().min(0).max(1),
          auditTrailCompleteness: z.number().min(0).max(1),
          humanApprovalComplianceRate: z.number().min(0).max(1),
          hoursSavedPerFTE: z.number().min(0).max(1),
          costSavingsRate: z.number().min(0).max(1),
        }),
      })
    )
    .mutation(async ({ input }) => {
      const weights = await getScoringWeights();
      const w = {
        adoptionWeight: Number(weights?.adoptionWeight ?? 15),
        efficiencyWeight: Number(weights?.efficiencyWeight ?? 20),
        qualityWeight: Number(weights?.qualityWeight ?? 20),
        judgmentWeight: Number(weights?.judgmentWeight ?? 20),
        governanceWeight: Number(weights?.governanceWeight ?? 15),
        businessImpactWeight: Number(weights?.businessImpactWeight ?? 10),
      };
      const result = computeScores(input.scoringInput as ScoringInput, w);
      await upsertEvaluationScore({
        userId: input.userId,
        periodStart: input.periodStart,
        periodEnd: input.periodEnd,
        adoptionScore: String(result.adoptionScore),
        efficiencyScore: String(result.efficiencyScore),
        qualityScore: String(result.qualityScore),
        judgmentScore: String(result.judgmentScore),
        governanceScore: String(result.governanceScore),
        businessImpactScore: String(result.businessImpactScore),
        compositeScore: String(result.compositeScore),
      });
      return result;
    }),

  getScores: protectedProcedure
    .input(
      z.object({
        userId: z.number().optional(),
        teamId: z.number().optional(),
      })
    )
    .query(async ({ input }) => {
      return getEvaluationScores(input);
    }),

  getOutcomeMetrics: protectedProcedure
    .input(
      z.object({
        teamId: z.number().optional(),
        userId: z.number().optional(),
        workflowType: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      return getOutcomeMetrics(input);
    }),
});
