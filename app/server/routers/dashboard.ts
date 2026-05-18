import { z } from "zod";
import {
  getAiEvents,
  getEvaluationScores,
  getFinanceDashboardData,
  getOutcomeMetrics,
  getPolicyEvents,
  getUserById,
  getUsersByTeam,
} from "@/app/lib/db";
import { protectedProcedure, router } from "../_core/trpc";

function weekAgo() {
  return new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
}

function monthAgo() {
  return new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
}

function countBy<T>(rows: T[], key: (row: T) => string | number | null | undefined) {
  const map = new Map<string, number>();
  for (const row of rows) {
    const value = key(row);
    if (value === undefined || value === null || value === "") continue;
    const k = String(value);
    map.set(k, (map.get(k) ?? 0) + 1);
  }
  return Array.from(map.entries()).map(([value, count]) => ({ value, count }));
}

function num(value: unknown) {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function avg(values: unknown[]) {
  const nums = values.map(num);
  return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0;
}

export const dashboardRouter = router({
  executive: protectedProcedure
    .input(z.object({ from: z.date().optional(), to: z.date().optional() }))
    .query(async ({ input }) => {
      const from = input.from ?? monthAgo();
      const to = input.to ?? new Date();
      const data = await getFinanceDashboardData(from, to);

      return {
        kpis: {
          weeklyActiveUsers: data.weeklyActiveUsers,
          totalUsers: data.totalUsers,
          adoptionRate: data.totalUsers > 0 ? Math.round((data.weeklyActiveUsers / data.totalUsers) * 100) : 0,
          hoursSaved: Math.round(data.hoursSaved * 10) / 10,
          touchlessRate: Math.round(data.touchlessRate * 10) / 10,
          errorRate: Math.round(data.errorRate * 10) / 10,
          cycleTimeImprovement: Math.round(data.cycleTimeImprovement * 10) / 10,
          governanceScore: data.governanceScore,
          compositeScore: Math.round(data.compositeScore * 10) / 10,
          openViolations: data.openViolations,
        },
        workflowPenetration: data.workflowPenetration,
        workflowEfficiency: data.workflowEfficiency,
        period: { from, to },
      };
    }),

  manager: protectedProcedure
    .input(z.object({ teamId: z.number(), from: z.date().optional(), to: z.date().optional() }))
    .query(async ({ input }) => {
      const from = input.from ?? monthAgo();
      const to = input.to ?? new Date();
      const [teamMembers, events, weekEvents, teamMetrics, policyEvents, teamScores] = await Promise.all([
        getUsersByTeam(input.teamId),
        getAiEvents({ teamId: input.teamId, from, to, limit: 100_000 }),
        getAiEvents({ teamId: input.teamId, from: weekAgo(), to, limit: 100_000 }),
        getOutcomeMetrics({ teamId: input.teamId, from, to }),
        getPolicyEvents({ teamId: input.teamId, resolved: false, limit: 100_000 }),
        getEvaluationScores({ teamId: input.teamId, from, to }),
      ]);

      const memberCount = teamMembers.length;
      const activeThisWeek = new Set(weekEvents.map((event) => event.userId)).size;
      const sessionsPerUser = countBy(events, (event) => event.userId).map(({ value, count }) => ({
        userId: Number(value),
        sessions: count,
        workflows: new Set(events.filter((event) => String(event.userId) === value).map((event) => event.workflowType)).size,
      }));
      const workflowPenetration = countBy(events, (event) => event.workflowType).map(({ value, count }) => {
        const workflowEvents = events.filter((event) => event.workflowType === value);
        return {
          workflowType: value,
          count,
          users: new Set(workflowEvents.map((event) => event.userId)).size,
          accepted: workflowEvents.filter((event) => event.outputAccepted).length,
          edited: workflowEvents.filter((event) => event.outputEdited).length,
        };
      });
      const governanceAlerts = countBy(policyEvents, (event) => event.severity).map(({ value, count }) => ({ severity: value, count }));

      return {
        teamId: input.teamId,
        memberCount,
        activeThisWeek,
        adoptionRate: memberCount > 0 ? Math.round((activeThisWeek / memberCount) * 100) : 0,
        sessionsPerUser,
        workflowPenetration,
        teamMetrics,
        governanceAlerts,
        scores: teamScores[0] ?? null,
        period: { from, to },
      };
    }),

  analyst: protectedProcedure
    .input(z.object({ userId: z.number().optional(), from: z.date().optional(), to: z.date().optional() }))
    .query(async ({ ctx, input }) => {
      const targetUserId = input.userId ?? ctx.user.id;
      const from = input.from ?? monthAgo();
      const to = input.to ?? new Date();
      const events = await getAiEvents({ userId: targetUserId, from, to, limit: 100_000 });
      const user = await getUserById(targetUserId);

      const usageByWorkflow = countBy(events, (event) => event.workflowType).map(({ value, count }) => {
        const workflowEvents = events.filter((event) => event.workflowType === value);
        return {
          workflowType: value,
          count,
          accepted: workflowEvents.filter((event) => event.outputAccepted).length,
          edited: workflowEvents.filter((event) => event.outputEdited).length,
          avgDuration: avg(workflowEvents.map((event) => event.durationSeconds)),
        };
      });

      let peerBenchmark: { workflowType: string; avgCount: number }[] = [];
      if (user?.teamId) {
        const teamEvents = await getAiEvents({ teamId: user.teamId, from, to, limit: 100_000 });
        peerBenchmark = countBy(teamEvents, (event) => event.workflowType).map(({ value }) => {
          const workflowEvents = teamEvents.filter((event) => event.workflowType === value);
          return {
            workflowType: value,
            avgCount: workflowEvents.length / Math.max(new Set(workflowEvents.map((event) => event.userId)).size, 1),
          };
        });
      }

      const total = events.length;
      const accepted = events.filter((event) => event.outputAccepted).length;
      const edited = events.filter((event) => event.outputEdited).length;
      const escalated = events.filter((event) => event.actionType === "escalated").length;
      const personalScores = await getEvaluationScores({ userId: targetUserId, from, to });

      return {
        userId: targetUserId,
        usageByWorkflow,
        peerBenchmark,
        verificationBehavior: {
          total,
          accepted,
          edited,
          escalated,
          verificationRate: total > 0 ? Math.round(((edited + escalated) / total) * 100) : 0,
          blindAcceptanceRate: total > 0 ? Math.round((accepted / total) * 100) : 0,
        },
        scores: personalScores[0] ?? null,
        period: { from, to },
      };
    }),
});
