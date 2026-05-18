import { nanoid } from "nanoid";
import { z } from "zod";
import { getAiEventStats, getAiEvents, logAiEvent } from "@/app/lib/db";
import { classifyWorkflow } from "../scoring_intelligence";
import { protectedProcedure, router } from "../_core/trpc";

export const aiEventsRouter = router({
  log: protectedProcedure
    .input(
      z.object({
        teamId: z.number(),
        workflowType: z
          .enum([
            "ap_invoice_coding",
            "ap_exception_handling",
            "ar_collections",
            "close_reconciliation",
            "close_checklist",
            "fpa_variance_commentary",
            "fpa_forecast",
            "fpa_budget",
            "reporting_management_pack",
            "reporting_board_deck",
            "other",
          ])
          .optional(),
        toolName: z.enum([
          "internal_llm",
          "copilot",
          "chatgpt",
          "gemini",
          "claude",
          "other_approved",
          "unapproved",
        ]),
        sourceApplication: z.enum([
          "excel",
          "erp",
          "ap_module",
          "close_tool",
          "fpa_platform",
          "browser",
          "email",
          "other",
        ]),
        actionType: z.enum(["prompted", "accepted", "edited", "rejected", "escalated"]),
        durationSeconds: z.number().min(0).default(0),
        complexityScore: z.number().min(1).max(10).default(5),
        outputAccepted: z.boolean().default(false),
        outputEdited: z.boolean().default(false),
        humanApprovalRequired: z.boolean().default(false),
        humanApprovalGiven: z.boolean().default(false),
        outputObjectId: z.string().optional(),
        userTag: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Auto-classify workflow if not provided
      const classifiedType = classifyWorkflow({
          sourceApplication: input.sourceApplication,
          toolName: input.toolName,
          outputObjectId: input.outputObjectId,
          userTag: input.userTag,
        });
      const workflowType = input.workflowType ?? (classifiedType as NonNullable<typeof input.workflowType>);

      // Determine policy status
      let policyStatus: "compliant" | "warning" | "violation" = "compliant";
      if (input.toolName === "unapproved") {
        policyStatus = "violation";
      } else if (input.humanApprovalRequired && !input.humanApprovalGiven) {
        policyStatus = "warning";
      }

      await logAiEvent({
        eventId: nanoid(),
        userId: ctx.user.id,
        teamId: input.teamId,
        workflowType: workflowType ?? "other",
        toolName: input.toolName,
        sourceApplication: input.sourceApplication,
        actionType: input.actionType,
        durationSeconds: input.durationSeconds,
        complexityScore: input.complexityScore,
        outputAccepted: input.outputAccepted,
        outputEdited: input.outputEdited,
        humanApprovalRequired: input.humanApprovalRequired,
        humanApprovalGiven: input.humanApprovalGiven,
        policyStatus,
        outputObjectId: input.outputObjectId,
        timestamp: new Date(),
      });

      return { success: true, workflowType, policyStatus };
    }),

  list: protectedProcedure
    .input(
      z.object({
        userId: z.number().optional(),
        teamId: z.number().optional(),
        workflowType: z.string().optional(),
        from: z.date().optional(),
        to: z.date().optional(),
        limit: z.number().max(500).default(100),
      })
    )
    .query(async ({ ctx, input }) => {
      // Non-admins can only see their own events unless they're a manager
      const isPrivileged =
        ctx.user.role === "admin" ||
        ctx.user.financeRole === "manager" ||
        ctx.user.financeRole === "executive" ||
        ctx.user.financeRole === "compliance_lead";

      const userId = isPrivileged ? input.userId : ctx.user.id;
      return getAiEvents({ ...input, userId });
    }),

  stats: protectedProcedure
    .input(
      z.object({
        from: z.date().optional(),
        to: z.date().optional(),
      })
    )
    .query(async ({ input }) => {
      const to = input.to ?? new Date();
      const from = input.from ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      return getAiEventStats(from, to);
    }),
});
