import { z } from "zod";
import {
  countPolicyEvents,
  getAiEvents,
  getPolicyEvents,
  resolvePolicyEvent,
  updatePolicyEventStatus,
} from "@/app/lib/db";
import { protectedProcedure, router } from "../_core/trpc";

export const governanceRouter = router({
  list: protectedProcedure
    .input(
      z.object({
        from: z.date().optional(),
        to: z.date().optional(),
        status: z.enum(["open", "investigating", "resolved", "dismissed"]).optional(),
        severity: z.enum(["low", "medium", "high", "critical"]).optional(),
        teamId: z.number().optional(),
        page: z.number().default(1),
        pageSize: z.number().max(100).default(15),
      }),
    )
    .query(async ({ input }) => {
      const from = input.from ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const to = input.to ?? new Date();
      const resolved =
        input.status === "resolved" || input.status === "dismissed"
          ? true
          : input.status === "open"
            ? false
            : undefined;
      const skip = (input.page - 1) * input.pageSize;
      const filters = { from, to, teamId: input.teamId, severity: input.severity, resolved };
      const [events, total] = await Promise.all([
        getPolicyEvents({ ...filters, limit: input.pageSize, skip }),
        countPolicyEvents(filters),
      ]);
      const mapped = events.map((event) => ({
        ...event,
        status: event.resolved ? "resolved" : "open",
        detectedAt: event.timestamp,
        description: event.description,
      }));
      return { events: mapped, total, totalPages: Math.ceil(total / input.pageSize) };
    }),

  summary: protectedProcedure
    .input(z.object({ from: z.date().optional(), to: z.date().optional() }))
    .query(async ({ input }) => {
      const from = input.from ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const to = input.to ?? new Date();
      const [open, resolved] = await Promise.all([
        countPolicyEvents({ from, to, resolved: false }),
        countPolicyEvents({ from, to, resolved: true }),
      ]);
      return [
        { status: "open", count: open },
        { status: "investigating", count: 0 },
        { status: "resolved", count: resolved },
      ];
    }),

  updateStatus: protectedProcedure
    .input(z.object({ id: z.number(), status: z.enum(["open", "investigating", "resolved", "dismissed"]) }))
    .mutation(async ({ ctx, input }) => {
      const isPrivileged =
        ctx.user.role === "admin" ||
        (ctx.user as any).financeRole === "compliance_lead" ||
        (ctx.user as any).financeRole === "manager";
      if (!isPrivileged) throw new Error("Insufficient permissions");
      await updatePolicyEventStatus(input.id, input.status === "resolved" || input.status === "dismissed", ctx.user.id);
      return { success: true };
    }),

  resolve: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ ctx, input }) => {
    const isPrivileged =
      ctx.user.role === "admin" ||
      (ctx.user as any).financeRole === "compliance_lead" ||
      (ctx.user as any).financeRole === "manager";
    if (!isPrivileged) throw new Error("Insufficient permissions to resolve policy events");
    await resolvePolicyEvent(input.id, ctx.user.id);
    return { success: true };
  }),

  auditTrail: protectedProcedure
    .input(
      z.object({
        teamId: z.number().optional(),
        from: z.date().optional(),
        to: z.date().optional(),
        limit: z.number().max(200).default(50),
      }),
    )
    .query(async ({ input }) => {
      return getAiEvents({
        teamId: input.teamId,
        from: input.from ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        to: input.to ?? new Date(),
        limit: input.limit,
      });
    }),
});
