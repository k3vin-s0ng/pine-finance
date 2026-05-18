import { z } from "zod";
import { createTeam, getAllTeams, getAllUsers, getUsersByTeam, updateUserFinanceRole } from "@/app/lib/db";
import { protectedProcedure, router } from "../_core/trpc";

export const teamsRouter = router({
  list: protectedProcedure.query(async () => {
    return getAllTeams();
  }),

  members: protectedProcedure
    .input(z.object({ teamId: z.number() }))
    .query(async ({ input }) => {
      return getUsersByTeam(input.teamId);
    }),

  allUsers: protectedProcedure.query(async () => {
    return getAllUsers();
  }),

  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1),
        department: z.enum(["ap", "ar", "fpa", "close", "reporting", "other"]),
        managerId: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin" && ctx.user.financeRole !== "admin") {
        throw new Error("Only admins can create teams");
      }
      await createTeam(input);
      return { success: true };
    }),

  updateUserRole: protectedProcedure
    .input(
      z.object({
        userId: z.number(),
        financeRole: z.enum(["analyst", "manager", "executive", "compliance_lead", "admin"]),
        teamId: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (ctx.user.role !== "admin" && ctx.user.financeRole !== "admin") {
        throw new Error("Only admins can update roles");
      }
      await updateUserFinanceRole(input.userId, input.financeRole, input.teamId);
      return { success: true };
    }),
});
