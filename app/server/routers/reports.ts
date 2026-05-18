import { z } from "zod";
import {
  createIntelligenceReport,
  getAiEvents,
  getIntelligenceReportById,
  getIntelligenceReports,
  getTeamById,
} from "@/app/lib/db";
import { invokeLLM } from "../_core/llm";
import { protectedProcedure, router } from "../_core/trpc";

function workflowCounts(events: Array<{ workflowType?: string | null }>) {
  const counts: Record<string, number> = {};
  for (const event of events) {
    if (event.workflowType) counts[event.workflowType] = (counts[event.workflowType] ?? 0) + 1;
  }
  return counts;
}

export const reportsRouter = router({
  list: protectedProcedure
    .input(
      z.object({
        type: z.enum(["monthly_manager", "quarterly_executive", "individual"]).optional(),
        targetId: z.number().optional(),
        targetType: z.enum(["user", "team"]).optional(),
        limit: z.number().max(100).default(20),
      }),
    )
    .query(async ({ input }) => getIntelligenceReports(input)),

  get: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ input }) => {
    return getIntelligenceReportById(input.id);
  }),

  generateMonthlyManager: protectedProcedure
    .input(z.object({ teamId: z.number(), periodStart: z.date(), periodEnd: z.date() }))
    .mutation(async ({ input }) => {
      const { teamId, periodStart, periodEnd } = input;
      const team = await getTeamById(teamId);
      const teamName = team?.name ?? `Team ${teamId}`;
      const events = await getAiEvents({ teamId, from: periodStart, to: periodEnd, limit: 100_000 });

      const totalUsers = new Set(events.map((event) => event.userId)).size;
      const hoursSaved = events.reduce((sum, event) => sum + Number(event.durationSeconds ?? 0) / 3600, 0);
      const touchless = events.filter((event) => event.outputAccepted && !event.outputEdited).length;
      const touchlessRate = events.length > 0 ? Math.round((touchless / events.length) * 100) : 0;
      const violations = events.filter((event) => event.policyStatus === "violation").length;
      const governanceScore = events.length > 0 ? Math.round(((events.length - violations) / events.length) * 100) : 100;
      const topWorkflows = Object.entries(workflowCounts(events))
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([type, count]) => ({ type, count }));

      const metrics = {
        adoptionRate: totalUsers,
        activeUsers: totalUsers,
        totalUsers,
        hoursSaved: Math.round(hoursSaved * 10) / 10,
        touchlessRate,
        errorRate: events.length > 0 ? Math.round((violations / events.length) * 100) : 0,
        cycleTimeImprovement: 0,
        openViolations: violations,
        governanceScore,
        topWorkflows,
      };

      const narrativePrompt = `You are a finance AI governance analyst. Write a concise 3-paragraph manager report narrative for the ${teamName} team covering ${periodStart.toLocaleDateString()} to ${periodEnd.toLocaleDateString()}.

Key metrics:
- Active AI users: ${metrics.activeUsers}
- Hours saved: ${metrics.hoursSaved} hours
- Touchless processing rate: ${metrics.touchlessRate}%
- Error/violation rate: ${metrics.errorRate}%
- Governance score: ${metrics.governanceScore}/100
- Open policy violations: ${metrics.openViolations}
- Top workflows: ${topWorkflows.map((w) => w.type.replace(/_/g, " ")).join(", ")}

Write in a professional, coaching-oriented tone. Focus on workflow outcomes, not raw usage volume. Highlight what is working well, where coaching is needed, and 2-3 concrete next steps.`;

      let llmNarrative = "";
      try {
        const llmResponse = await invokeLLM({
          messages: [
            { role: "system", content: "You are a senior finance AI governance analyst. Write clear, actionable, coaching-oriented reports for finance managers." },
            { role: "user", content: narrativePrompt },
          ],
        });
        llmNarrative = String(llmResponse.choices?.[0]?.message?.content ?? "");
      } catch {
        llmNarrative = "Narrative generation unavailable.";
      }

      await createIntelligenceReport({
        type: "monthly_manager",
        targetId: teamId,
        targetType: "team",
        periodStart,
        periodEnd,
        title: `${teamName} - Monthly AI Performance Report (${periodStart.toLocaleDateString("en-US", { month: "long", year: "numeric" })})`,
        content: { metrics, topWorkflows },
        llmNarrative,
        status: "ready",
      });

      return { success: true, llmNarrative };
    }),

  generateQuarterlyExecutive: protectedProcedure
    .input(z.object({ periodStart: z.date(), periodEnd: z.date() }))
    .mutation(async ({ input }) => {
      const { periodStart, periodEnd } = input;
      const events = await getAiEvents({ from: periodStart, to: periodEnd, limit: 100_000 });
      const totalUsers = new Set(events.map((event) => event.userId)).size;
      const hoursSaved = events.reduce((sum, event) => sum + Number(event.durationSeconds ?? 0) / 3600, 0);
      const touchless = events.filter((event) => event.outputAccepted && !event.outputEdited).length;
      const touchlessRate = events.length > 0 ? Math.round((touchless / events.length) * 100) : 0;
      const violations = events.filter((event) => event.policyStatus === "violation").length;
      const governanceScore = events.length > 0 ? Math.round(((events.length - violations) / events.length) * 100) : 100;
      const topWorkflows = Object.entries(workflowCounts(events))
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([type, count]) => ({ type, roi: count }));
      const recommendations: string[] = [];
      if (governanceScore < 80) recommendations.push("Strengthen governance controls and compliance training for high-risk workflows.");
      if (touchlessRate < 50) recommendations.push("Increase touchless processing adoption through targeted workflow enablement sessions.");
      if (totalUsers < 10) recommendations.push("Accelerate AI adoption by expanding rollout to remaining finance team members.");

      const narrativePrompt = `You are a CFO-level AI governance advisor. Write a concise quarterly executive summary (3 paragraphs) for the finance organization covering ${periodStart.toLocaleDateString()} to ${periodEnd.toLocaleDateString()}.

Metrics:
- Active AI users: ${totalUsers}
- Hours saved: ${Math.round(hoursSaved)} hours this quarter
- Touchless rate: ${touchlessRate}%
- Governance score: ${governanceScore}/100
- Open violations: ${violations}
- Top workflows: ${topWorkflows.slice(0, 3).map((w) => w.type.replace(/_/g, " ")).join(", ")}

Write for a CFO audience. Focus on ROI, risk posture, and strategic priorities. Limit to 2-3 strategic recommendations. Do not mention raw prompt volume.`;

      let llmNarrative = "";
      try {
        const llmResponse = await invokeLLM({
          messages: [
            { role: "system", content: "You are a senior finance AI governance advisor writing for C-suite executives." },
            { role: "user", content: narrativePrompt },
          ],
        });
        llmNarrative = String(llmResponse.choices?.[0]?.message?.content ?? "");
      } catch {
        llmNarrative = "Narrative generation unavailable.";
      }

      const quarter = Math.ceil((periodEnd.getMonth() + 1) / 3);
      await createIntelligenceReport({
        type: "quarterly_executive",
        targetId: 0,
        targetType: "team",
        periodStart,
        periodEnd,
        title: `Quarterly Executive AI Summary - Q${quarter} ${periodEnd.getFullYear()}`,
        content: {
          totalUsers,
          hoursSaved: Math.round(hoursSaved),
          touchlessRate,
          governanceScore,
          topWorkflows,
          recommendations: recommendations.slice(0, 3),
        },
        llmNarrative,
        status: "ready",
      });

      return { success: true, llmNarrative };
    }),

  generateIndividualEvaluation: protectedProcedure
    .input(z.object({ periodStart: z.date(), periodEnd: z.date(), userId: z.number().optional() }))
    .mutation(async ({ ctx, input }) => {
      const userId = input.userId ?? ctx.user.id;
      const { periodStart, periodEnd } = input;
      const events = await getAiEvents({ userId, from: periodStart, to: periodEnd, limit: 100_000 });
      const accepted = events.filter((event) => event.outputAccepted).length;
      const edited = events.filter((event) => event.outputEdited).length;
      const verificationRate = events.length > 0 ? Math.round(((accepted - edited) / Math.max(accepted, 1)) * 100) : 0;
      const blindAcceptanceRate = accepted > 0 ? Math.round(((accepted - edited) / accepted) * 100) : 0;
      const topWorkflows = Object.entries(workflowCounts(events))
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([type, count]) => ({ type, count }));
      const userName = ctx.user.name ?? `User ${userId}`;

      const narrativePrompt = `You are a finance AI enablement coach. Write a concise, encouraging 2-paragraph personal feedback summary for ${userName} covering ${periodStart.toLocaleDateString()} to ${periodEnd.toLocaleDateString()}.

Their metrics:
- Total AI sessions: ${events.length}
- Top workflows: ${topWorkflows.map((w) => w.type.replace(/_/g, " ")).join(", ") || "none"}
- Verification rate: ${verificationRate}%
- Blind acceptance rate: ${blindAcceptanceRate}%

Write in a coaching, development-oriented tone. Highlight 1-2 genuine strengths. Identify 1-2 specific areas for improvement. Suggest 2-3 concrete next steps. Do not mention raw prompt volume.`;

      let llmNarrative = "";
      try {
        const llmResponse = await invokeLLM({
          messages: [
            { role: "system", content: "You are a supportive finance AI enablement coach writing personalized development feedback." },
            { role: "user", content: narrativePrompt },
          ],
        });
        llmNarrative = String(llmResponse.choices?.[0]?.message?.content ?? "");
      } catch {
        llmNarrative = "Narrative generation unavailable.";
      }

      await createIntelligenceReport({
        type: "individual",
        targetId: userId,
        targetType: "user",
        periodStart,
        periodEnd,
        title: `${userName} - Individual AI Effectiveness Report`,
        content: { topWorkflows, verificationRate, blindAcceptanceRate },
        llmNarrative,
        status: "ready",
      });

      return { success: true, llmNarrative };
    }),
});
