import { z } from "zod";
import {
  createFeedbackItem,
  getAllPlaybooks,
  getFeedbackItems,
  getPlaybooksByWorkflow,
  markFeedbackRead,
  updateFeedbackNarrative,
} from "@/app/lib/db";
import { invokeLLM } from "../_core/llm";
import { protectedProcedure, router } from "../_core/trpc";

export const feedbackRouter = router({
  // List feedback items for a user or team
  list: protectedProcedure
    .input(
      z.object({
        userId: z.number().optional(),
        teamId: z.number().optional(),
        type: z.enum(["nudge", "personal_summary", "team_coaching", "executive_loop"]).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const userId = input.userId ?? ctx.user.id;
      return getFeedbackItems({ userId, teamId: input.teamId });
    }),

  // Mark a feedback item as read
  markRead: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await markFeedbackRead(input.id);
      return { success: true };
    }),

  // Create a nudge (in-product contextual recommendation)
  createNudge: protectedProcedure
    .input(
      z.object({
        userId: z.number(),
        workflowType: z.string(),
        title: z.string(),
        content: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      await createFeedbackItem({
        userId: input.userId,
        type: "nudge",
        workflowType: input.workflowType,
        title: input.title,
        content: input.content,
      });
      return { success: true };
    }),

  // Generate LLM narrative for an analyst
  generateAnalystNarrative: protectedProcedure
    .input(
      z.object({
        feedbackItemId: z.number(),
        userName: z.string(),
        workflowSummary: z.string(),
        underusedWorkflows: z.array(z.string()),
        verificationRate: z.number(),
        compositeScore: z.number(),
        peerScore: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      const prompt = `You are a finance AI enablement coach. Write a concise, encouraging personal feedback narrative (2 short paragraphs) for ${input.userName}.

Usage summary: ${input.workflowSummary}
Underused workflows vs peers: ${input.underusedWorkflows.join(", ") || "none"}
Verification rate: ${input.verificationRate}%
Personal score: ${input.compositeScore}/100
Peer average: ${input.peerScore}/100

Be specific, coaching-oriented, and constructive. Do not mention raw prompt counts. Limit to 2–3 actionable suggestions.`;

      let narrative = "";
      try {
        const response = await invokeLLM({
          messages: [
            {
              role: "system",
              content: "You are a supportive finance AI enablement coach.",
            },
            { role: "user", content: prompt },
          ],
        });
        narrative = String(response.choices?.[0]?.message?.content ?? "");
      } catch {
        narrative = "Narrative generation temporarily unavailable.";
      }

      await updateFeedbackNarrative(input.feedbackItemId, narrative);
      return { narrative };
    }),

  // Generate LLM narrative for a manager
  generateManagerNarrative: protectedProcedure
    .input(
      z.object({
        feedbackItemId: z.number(),
        teamName: z.string(),
        adoptionRate: z.number(),
        topWorkflows: z.array(z.string()),
        weakAreas: z.array(z.string()),
        governanceScore: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      const prompt = `You are a finance AI governance analyst. Write a concise team coaching narrative (2 short paragraphs) for the ${input.teamName} team.

Adoption rate: ${input.adoptionRate}%
Strong workflows: ${input.topWorkflows.join(", ")}
Areas needing improvement: ${input.weakAreas.join(", ") || "none identified"}
Governance score: ${input.governanceScore}/100

Write in a constructive, action-oriented tone for a team manager. Highlight what is working, what needs attention, and 2–3 specific coaching actions.`;

      let narrative = "";
      try {
        const response = await invokeLLM({
          messages: [
            {
              role: "system",
              content: "You are a finance AI governance analyst writing team coaching guidance.",
            },
            { role: "user", content: prompt },
          ],
        });
        narrative = String(response.choices?.[0]?.message?.content ?? "");
      } catch {
        narrative = "Narrative generation temporarily unavailable.";
      }

      await updateFeedbackNarrative(input.feedbackItemId, narrative);
      return { narrative };
    }),

  // Playbooks
  playbooks: protectedProcedure
    .input(z.object({ workflowType: z.string().optional() }))
    .query(async ({ input }) => {
      if (input.workflowType) {
        return getPlaybooksByWorkflow(input.workflowType);
      }
      return getAllPlaybooks();
    }),
});
