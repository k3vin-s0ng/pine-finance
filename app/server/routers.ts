import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { COOKIE_NAME } from "@/app/shared/const";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { invokeLLM } from "./_core/llm";
import { storagePut } from "./storage";
import {
  upsertUser, getUserByOpenId, updateUserRole,
  createCampaign, getCampaignsByRecruiter, getCampaignById, updateCampaign, deleteCampaign,
  createAssessment, getAssessmentsByCampaign, getAssessmentById, getAssessmentWithCampaign, getAssessmentsByCandidate, updateAssessmentStatus,
  createSubmission, getSubmissionByAssessment,
  createScore, getScoreBySubmission, getScoreByAssessment, getScoresByCampaign,
  createPdfReport, getPdfReportByAssessment,
  logAiUsageEvent, getAiUsageByUser, getTeamAiUsageStats,
  createDemoRequest,
  getCandidatesFullStatus,
  getAssessmentByToken,
  linkAssessmentToCandidate,
  getAssessmentsByEmail,
  getAllCandidatesForRecruiter,
  getAllReportsForRecruiter,
  getTeamMembers,
  getCandidateScoreSummary,
  getAllCandidatesForManager,
  getAssessmentHistoryForCandidate,
  getAssessmentSubmissionDetail,
  bulkInsertBehaviorEvents,
  getSubmissionById,
  getUserById,
} from "@/app/lib/db";
import { notifyOwner } from "./_core/notification";
import { sendCandidateInviteEmail, sendScoreReadyEmail } from "./email";
import { computeBenchmarkPercentile, getDimensionBenchmark } from "./benchmarkData";

// Intelligence sub-routers
import { dashboardRouter } from "./routers/dashboard";
import { aiEventsRouter } from "./routers/aiEventsIntelligence";
import { governanceRouter } from "./routers/governance";
import { reportsRouter } from "./routers/reports";
import { feedbackRouter } from "./routers/feedback";
import { scoringRouter as intelligenceScoringRouter } from "./routers/scoring";
import { teamsRouter } from "./routers/teams";

// ─── Role guard helpers ───────────────────────────────────────────────────────
const recruiterProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "recruiter" && ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Recruiter access required" });
  }
  return next({ ctx });
});

const managerProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "manager" && ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Manager access required" });
  }
  return next({ ctx });
});

// Recruiter OR manager can view company-wide analytics
const recruiterOrManagerProcedure = protectedProcedure.use(({ ctx, next }) => {
  const allowed = ["recruiter", "manager", "admin"];
  if (!allowed.includes(ctx.user.role)) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Recruiter or manager access required" });
  }
  return next({ ctx });
});

// ─── Scoring helper ───────────────────────────────────────────────────────────
async function generateScoreWithLLM(params: {
  roleTemplate: string;
  taskResponses: Record<string, string>;
  aiInteractions: Array<{ role: string; content: string }>;
  completionTimeSeconds: number;
  timeLimitSeconds: number;
}) {
  const { roleTemplate, taskResponses, aiInteractions, completionTimeSeconds, timeLimitSeconds } = params;

  const taskSummary = Object.entries(taskResponses)
    .map(([k, v]) => `Task ${k}: ${v?.substring(0, 800) ?? "(empty)"}`)
    .join("\n\n");

  const aiLog = aiInteractions
    .slice(0, 20)
    .map((m) => `[${m.role}]: ${m.content?.substring(0, 400)}`)
    .join("\n");

  const timeRatio = completionTimeSeconds / timeLimitSeconds;
  const timeNote = timeRatio < 0.5 ? "completed very quickly" : timeRatio > 0.95 ? "used nearly all time" : "completed at a reasonable pace";

  const systemPrompt = `You are an expert finance talent evaluator scoring a candidate's AI fluency assessment for the role: ${roleTemplate}.

Evaluate the candidate on exactly these 6 dimensions, each scored 0-100:
1. Accuracy – Was the financial content correct and precise?
2. Efficiency – How quickly and cleanly was the task completed? (Candidate ${timeNote}, using ${Math.round(completionTimeSeconds / 60)} of ${Math.round(timeLimitSeconds / 60)} minutes)
3. Judgment – Did the candidate use AI appropriately rather than blindly accepting outputs?
4. Verification – Did the candidate check claims, validate sources, and catch errors?
5. Communication – Was the final output professional, clear, and client-ready?
6. Tool Fluency – Did the candidate structure prompts well and iterate effectively?

For each dimension, provide:
- A score (integer 0-100)
- A 2-3 sentence rationale explaining the score with specific evidence from the submission

Also provide:
- An overall score (weighted average: Accuracy 25%, Efficiency 15%, Judgment 20%, Verification 15%, Communication 15%, Tool Fluency 10%)
- A recruiter-facing summary (3-4 sentences, professional tone, highlights key strengths and areas for development)
- Top 3 strengths (brief phrases)
- Top 3 areas for improvement (brief phrases)`;

  const userPrompt = `CANDIDATE SUBMISSION:
Role Template: ${roleTemplate}

TASK RESPONSES:
${taskSummary}

AI INTERACTION LOG (${aiInteractions.length} total interactions):
${aiLog}`;

  const response = await invokeLLM({
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "assessment_score",
        strict: true,
        schema: {
          type: "object",
          properties: {
            accuracy: { type: "integer" },
            efficiency: { type: "integer" },
            judgment: { type: "integer" },
            verification: { type: "integer" },
            communication: { type: "integer" },
            toolFluency: { type: "integer" },
            overallScore: { type: "number" },
            accuracyRationale: { type: "string" },
            efficiencyRationale: { type: "string" },
            judgmentRationale: { type: "string" },
            verificationRationale: { type: "string" },
            communicationRationale: { type: "string" },
            toolFluencyRationale: { type: "string" },
            recruiterSummary: { type: "string" },
            strengths: { type: "array", items: { type: "string" } },
            improvements: { type: "array", items: { type: "string" } },
          },
          required: [
            "accuracy", "efficiency", "judgment", "verification", "communication", "toolFluency",
            "overallScore", "accuracyRationale", "efficiencyRationale", "judgmentRationale",
            "verificationRationale", "communicationRationale", "toolFluencyRationale",
            "recruiterSummary", "strengths", "improvements"
          ],
          additionalProperties: false,
        },
      },
    },
  });

  const rawContent = response.choices[0]?.message?.content;
  const content = typeof rawContent === "string" ? rawContent : null;
  if (!content) throw new Error("LLM returned empty response");
  return JSON.parse(content) as {
    accuracy: number; efficiency: number; judgment: number;
    verification: number; communication: number; toolFluency: number;
    overallScore: number;
    accuracyRationale: string; efficiencyRationale: string; judgmentRationale: string;
    verificationRationale: string; communicationRationale: string; toolFluencyRationale: string;
    recruiterSummary: string; strengths: string[]; improvements: string[];
  };
}

// ─── PDF generation helper ────────────────────────────────────────────────────
async function generatePdfReport(params: {
  candidateName: string;
  roleTemplate: string;
  score: {
    accuracy: number | null; efficiency: number | null; judgment: number | null;
    verification: number | null; communication: number | null; toolFluency: number | null;
    overallScore: number | null; benchmarkPercentile: number | null;
    accuracyRationale: string | null; efficiencyRationale: string | null;
    judgmentRationale: string | null; verificationRationale: string | null;
    communicationRationale: string | null; toolFluencyRationale: string | null;
    recruiterSummary: string | null; strengths: unknown; improvements: unknown;
  };
  assessmentId: number;
}): Promise<{ key: string; url: string }> {
  const { candidateName, roleTemplate, score, assessmentId } = params;
  const strengths = Array.isArray(score.strengths) ? score.strengths : [];
  const improvements = Array.isArray(score.improvements) ? score.improvements : [];

  const dimensions = [
    { name: "Accuracy", score: score.accuracy, rationale: score.accuracyRationale },
    { name: "Efficiency", score: score.efficiency, rationale: score.efficiencyRationale },
    { name: "Judgment", score: score.judgment, rationale: score.judgmentRationale },
    { name: "Verification", score: score.verification, rationale: score.verificationRationale },
    { name: "Communication", score: score.communication, rationale: score.communicationRationale },
    { name: "Tool Fluency", score: score.toolFluency, rationale: score.toolFluencyRationale },
  ];

  const scoreBar = (s: number | null) => {
    const pct = s ?? 0;
    const filled = Math.round(pct / 5);
    return "█".repeat(filled) + "░".repeat(20 - filled) + ` ${pct}/100`;
  };

  const peerBenchmark = score.benchmarkPercentile ?? 50;

  const htmlContent = `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Helvetica Neue', Arial, sans-serif; background: #0a0a0a; color: #e8e0d0; padding: 40px; }
  .header { border-bottom: 2px solid #c9a84c; padding-bottom: 24px; margin-bottom: 32px; }
  .logo { font-size: 28px; font-weight: 900; letter-spacing: 4px; color: #c9a84c; text-transform: uppercase; }
  .subtitle { font-size: 12px; letter-spacing: 2px; color: #888; margin-top: 4px; }
  h1 { font-size: 22px; font-weight: 700; color: #fff; margin: 16px 0 4px; }
  .meta { font-size: 13px; color: #888; margin-bottom: 8px; }
  .overall-box { background: linear-gradient(135deg, #1a1a1a, #111); border: 1px solid #c9a84c; border-radius: 8px; padding: 24px; margin: 24px 0; display: flex; align-items: center; gap: 32px; }
  .overall-score { font-size: 64px; font-weight: 900; color: #c9a84c; line-height: 1; }
  .overall-label { font-size: 13px; color: #888; letter-spacing: 2px; text-transform: uppercase; }
  .percentile { font-size: 18px; color: #e8e0d0; margin-top: 8px; }
  .section-title { font-size: 14px; font-weight: 700; letter-spacing: 3px; text-transform: uppercase; color: #c9a84c; margin: 28px 0 16px; border-left: 3px solid #c9a84c; padding-left: 12px; }
  .dimension { margin-bottom: 20px; padding: 16px; background: #111; border-radius: 6px; border-left: 3px solid #333; }
  .dim-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
  .dim-name { font-size: 14px; font-weight: 700; color: #e8e0d0; }
  .dim-score { font-size: 22px; font-weight: 900; color: #c9a84c; }
  .progress-bar { height: 6px; background: #222; border-radius: 3px; margin-bottom: 10px; }
  .progress-fill { height: 100%; background: linear-gradient(90deg, #8b6914, #c9a84c); border-radius: 3px; }
  .dim-rationale { font-size: 12px; color: #aaa; line-height: 1.6; }
  .summary-box { background: #111; border: 1px solid #333; border-radius: 8px; padding: 20px; margin: 16px 0; }
  .summary-text { font-size: 13px; color: #ccc; line-height: 1.8; }
  .list-item { font-size: 12px; color: #bbb; margin: 6px 0; padding-left: 16px; position: relative; }
  .list-item::before { content: "▸"; position: absolute; left: 0; color: #c9a84c; }
  .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
  .col-box { background: #111; border-radius: 6px; padding: 16px; }
  .col-title { font-size: 12px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; color: #888; margin-bottom: 12px; }
  .benchmark-row { display: flex; align-items: center; gap: 12px; margin: 8px 0; }
  .bench-label { font-size: 11px; color: #888; width: 100px; }
  .bench-bar { flex: 1; height: 8px; background: #222; border-radius: 4px; overflow: hidden; }
  .bench-fill-candidate { height: 100%; background: #c9a84c; border-radius: 4px; }
  .bench-fill-peer { height: 100%; background: #444; border-radius: 4px; }
  .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #222; font-size: 11px; color: #555; text-align: center; }
</style>
</head>
<body>
<div class="header">
  <div class="logo">Pine Finance</div>
  <div class="subtitle">AI Fluency Assessment Report — Confidential</div>
</div>

<h1>${candidateName}</h1>
<div class="meta">Role Template: ${roleTemplate} &nbsp;|&nbsp; Assessment ID: #${assessmentId} &nbsp;|&nbsp; Generated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</div>

<div class="overall-box">
  <div>
    <div class="overall-label">Overall Score</div>
    <div class="overall-score">${Math.round(score.overallScore ?? 0)}</div>
    <div style="font-size:11px;color:#666;margin-top:4px;">out of 100</div>
  </div>
  <div style="flex:1;">
    <div class="percentile">Top <strong style="color:#c9a84c">${100 - peerBenchmark}%</strong> of ${roleTemplate} candidates</div>
    <div style="font-size:12px;color:#666;margin-top:4px;">Benchmark Percentile: ${peerBenchmark}th</div>
    <div style="margin-top:12px;">
      <div class="progress-bar"><div class="progress-fill" style="width:${score.overallScore ?? 0}%"></div></div>
    </div>
  </div>
</div>

<div class="section-title">Recruiter Summary</div>
<div class="summary-box">
  <div class="summary-text">${score.recruiterSummary ?? "No summary available."}</div>
</div>

<div class="two-col" style="margin:20px 0;">
  <div class="col-box">
    <div class="col-title">Key Strengths</div>
    ${strengths.map((s: string) => `<div class="list-item">${s}</div>`).join('')}
  </div>
  <div class="col-box">
    <div class="col-title">Areas for Development</div>
    ${improvements.map((i: string) => `<div class="list-item">${i}</div>`).join('')}
  </div>
</div>

<div class="section-title">Dimension Breakdown</div>
${dimensions.map(d => `
<div class="dimension">
  <div class="dim-header">
    <div class="dim-name">${d.name}</div>
    <div class="dim-score">${Math.round(d.score ?? 0)}</div>
  </div>
  <div class="progress-bar"><div class="progress-fill" style="width:${d.score ?? 0}%"></div></div>
  <div class="dim-rationale">${d.rationale ?? ""}</div>
</div>`).join('')}

<div class="section-title">Benchmark Comparison</div>
<div class="summary-box">
  ${dimensions.map(d => `
  <div class="benchmark-row">
    <div class="bench-label">${d.name}</div>
    <div class="bench-bar"><div class="bench-fill-candidate" style="width:${d.score ?? 0}%"></div></div>
    <div style="font-size:11px;color:#c9a84c;width:32px;text-align:right">${Math.round(d.score ?? 0)}</div>
    <div style="font-size:11px;color:#555;width:60px;text-align:right">Peer: ~65</div>
  </div>`).join('')}
</div>

<div class="footer">
  Pine Finance · AI Fluency Assessment Platform · Confidential — For Recruiter Use Only<br>
  This report was generated using Pine Finance's proprietary AI scoring engine. Scores reflect performance on standardized finance workflow tasks.
</div>
</body>
</html>`;

  const key = `pdf-reports/assessment-${assessmentId}-${Date.now()}.html`;
  const { url } = await storagePut(key, Buffer.from(htmlContent, "utf-8"), "text/html");
  return { key, url };
}

// ─── App Router ───────────────────────────────────────────────────────────────
export const appRouter = router({
  system: systemRouter,

  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      ctx.responseHeaders.append(
        "Set-Cookie",
        `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`,
      );
      return { success: true } as const;
    }),
    completeOnboarding: protectedProcedure
      .input(z.object({
        role: z.enum(["recruiter", "candidate", "manager"]),
        organization: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await updateUserRole(ctx.user.id, input.role, input.organization);
        return { success: true };
      }),
  }),

  // ─── Demo Requests ──────────────────────────────────────────────────────────
  demo: router({
    request: publicProcedure
      .input(z.object({
        name: z.string().min(1),
        email: z.string().email(),
        company: z.string().optional(),
        role: z.string().optional(),
        segment: z.string().optional(),
        message: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        await createDemoRequest(input);
        await notifyOwner({
          title: "New Demo Request",
          content: `${input.name} from ${input.company ?? "unknown"} (${input.email}) requested a demo. Segment: ${input.segment ?? "N/A"}`,
        });
        return { success: true };
      }),
  }),

  // ─── Campaigns ──────────────────────────────────────────────────────────────
  campaigns: router({
    list: recruiterProcedure.query(async ({ ctx }) => {
      return getCampaignsByRecruiter(ctx.user.id);
    }),
    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return getCampaignById(input.id);
      }),
    create: recruiterProcedure
      .input(z.object({
        title: z.string().min(1),
        roleTemplate: z.enum(["IB Analyst", "FP&A Analyst", "PE Associate", "Hedge Fund Research Analyst"]),
        description: z.string().optional(),
        timeLimitMinutes: z.number().min(15).max(180).default(60),
        autoScore: z.boolean().default(true),
      }))
      .mutation(async ({ ctx, input }) => {
        const id = await createCampaign({ ...input, recruiterId: ctx.user.id, status: "active" });
        return { id };
      }),
    update: recruiterProcedure
      .input(z.object({
        id: z.number(),
        title: z.string().optional(),
        status: z.enum(["draft", "active", "closed"]).optional(),
        description: z.string().optional(),
        autoScore: z.boolean().optional(),
      }))
      .mutation(async ({ input }) => {
        const { id, ...data } = input;
        await updateCampaign(id, data);
        return { success: true };
      }),
    delete: recruiterProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await deleteCampaign(input.id);
        return { success: true };
      }),
    getCandidatesWithScores: recruiterProcedure
      .input(z.object({ campaignId: z.number() }))
      .query(async ({ input }) => {
        return getScoresByCampaign(input.campaignId);
      }),
    getCandidatesWithStatus: recruiterProcedure
      .input(z.object({ campaignId: z.number() }))
      .query(async ({ input }) => {
        return getCandidatesFullStatus(input.campaignId);
      }),
    getAssessments: recruiterProcedure
      .input(z.object({ campaignId: z.number() }))
      .query(async ({ input }) => {
        return getAssessmentsByCampaign(input.campaignId);
      }),
    addSourceMaterial: recruiterProcedure
      .input(z.object({
        campaignId: z.number(),
        label: z.string().min(1),
        fileKey: z.string().min(1),
        url: z.string().min(1),
        mimeType: z.string().min(1),
        sizeBytes: z.number().int().positive(),
      }))
      .mutation(async ({ input }) => {
        const { campaignId, ...material } = input;
        const campaign = await getCampaignById(campaignId);
        if (!campaign) throw new TRPCError({ code: "NOT_FOUND" });
        const existing = (campaign.sourceMaterials as Array<{ label: string; fileKey: string; url: string; mimeType: string; sizeBytes: number }>) ?? [];
        const updated = [...existing, material];
        await updateCampaign(campaignId, { sourceMaterials: updated });
        return { success: true, sourceMaterials: updated };
      }),
    removeSourceMaterial: recruiterProcedure
      .input(z.object({
        campaignId: z.number(),
        fileKey: z.string().min(1),
      }))
      .mutation(async ({ input }) => {
        const campaign = await getCampaignById(input.campaignId);
        if (!campaign) throw new TRPCError({ code: "NOT_FOUND" });
        const existing = (campaign.sourceMaterials as Array<{ label: string; fileKey: string; url: string; mimeType: string; sizeBytes: number }>) ?? [];
        const updated = existing.filter(m => m.fileKey !== input.fileKey);
        await updateCampaign(input.campaignId, { sourceMaterials: updated });
        return { success: true, sourceMaterials: updated };
      }),
  }),

  // ─── Assessments ────────────────────────────────────────────────────────────
  assessments: router({
    myAssessments: protectedProcedure.query(async ({ ctx }) => {
      // Get assessments by candidateId (already linked)
      const byId = await getAssessmentsByCandidate(ctx.user.id);
      // Also get assessments by email (invited but not yet linked)
      const byEmail = ctx.user.email ? await getAssessmentsByEmail(ctx.user.email) : [];
      // Link any unlinked email-based assessments to this user
      for (const row of byEmail) {
        if (row.assessment.candidateId === 0 || row.assessment.candidateId === null) {
          await linkAssessmentToCandidate(row.assessment.id, ctx.user.id);
        }
      }
      // Return merged list (re-fetch after linking)
      const refreshed = await getAssessmentsByCandidate(ctx.user.id);
      return refreshed;
    }),
    claimByToken: protectedProcedure
      .input(z.object({ token: z.string(), assessmentId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const assessment = await getAssessmentByToken(input.token);
        if (!assessment) throw new TRPCError({ code: "NOT_FOUND", message: "Invalid invite token" });
        if (assessment.id !== input.assessmentId) throw new TRPCError({ code: "FORBIDDEN" });
        // Link this assessment to the current user
        await linkAssessmentToCandidate(assessment.id, ctx.user.id);
        return { success: true, assessmentId: assessment.id };
      }),
    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return getAssessmentWithCampaign(input.id);
      }),
    create: recruiterProcedure
      .input(z.object({
        campaignId: z.number(),
        candidateEmail: z.string().email(),
        origin: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const campaign = await getCampaignById(input.campaignId);
        if (!campaign) throw new TRPCError({ code: "NOT_FOUND" });
        const token = Math.random().toString(36).substring(2) + Date.now().toString(36);
        const id = await createAssessment({
          campaignId: input.campaignId,
          candidateId: 0,
          status: "invited",
          timeLimitMinutes: campaign.timeLimitMinutes,
          inviteToken: token,
          invitedEmail: input.candidateEmail,
        });
        // Build the assessment URL — candidate will claim it on login
        const baseUrl = input.origin ?? "https://pinefinai-w9akzopy.manus.space";
        const assessmentUrl = `${baseUrl}/assessment/${id}?token=${token}`;
        // Send invite email (non-blocking)
        const recruiter = ctx.user;
        sendCandidateInviteEmail({
          toEmail: input.candidateEmail,
          campaignTitle: campaign.title,
          roleTemplate: campaign.roleTemplate,
          timeLimitMinutes: campaign.timeLimitMinutes,
          assessmentUrl,
          recruiterName: recruiter.name ?? undefined,
        }).then(result => {
          if (result.previewUrl) {
            console.log(`[Email] Preview: ${result.previewUrl}`);
          }
        }).catch(err => console.error("[Email] Invite send error:", err));
        // Notify owner
        notifyOwner({
          title: "New Candidate Invited",
          content: `${input.candidateEmail} invited to "${campaign.title}" (${campaign.roleTemplate})`,
        }).catch(() => {});
        return { id, token, assessmentUrl };
      }),
    start: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await updateAssessmentStatus(input.id, "in_progress", { startedAt: new Date() });
        return { success: true };
      }),
    submit: protectedProcedure
      .input(z.object({
        assessmentId: z.number(),
        taskResponses: z.record(z.string(), z.string()),
        aiInteractions: z.array(z.object({
          role: z.string(),
          content: z.string(),
          taskKey: z.string().optional(),
          timestamp: z.number().optional(),
        })),
        completionTimeSeconds: z.number(),
      }))
        .mutation(async ({ ctx, input }) => {
        const assessment = await getAssessmentById(input.assessmentId);
        if (!assessment) throw new TRPCError({ code: "NOT_FOUND" });
        const campaign = await getCampaignById(assessment.campaignId);
        if (!campaign) throw new TRPCError({ code: "NOT_FOUND" });
        const wordCount = Object.values(input.taskResponses).join(" ").split(/\s+/).length;
        const submissionId = await createSubmission({
          assessmentId: input.assessmentId,
          taskResponses: input.taskResponses,
          aiInteractions: input.aiInteractions,
          wordCount,
          completionTimeSeconds: input.completionTimeSeconds,
        });
        await updateAssessmentStatus(input.assessmentId, "submitted", { submittedAt: new Date() });
        // Log AI usage events
        for (const interaction of input.aiInteractions.filter(i => i.role === "user")) {
          await logAiUsageEvent({
            userId: ctx.user.id,
            eventType: "prompt",
            workflow: "assessment",
            promptLength: interaction.content.length,
          });
        }
        // Auto-score if campaign has autoScore enabled (non-blocking — runs in background)
        if (campaign.autoScore) {
          setImmediate(async () => {
            try {
              const sub = await getSubmissionByAssessment(input.assessmentId);
              if (!sub) return;
              const taskResponses = (sub.taskResponses as Record<string, string>) ?? {};
              const aiInteractions = (sub.aiInteractions as Array<{ role: string; content: string }>) ?? [];
              const llmScore = await generateScoreWithLLM({
                roleTemplate: campaign.roleTemplate,
                taskResponses,
                aiInteractions,
                completionTimeSeconds: sub.completionTimeSeconds ?? 3600,
                timeLimitSeconds: assessment.timeLimitMinutes * 60,
              });
              const benchmarkPercentile = computeBenchmarkPercentile(llmScore.overallScore, campaign.roleTemplate);
              await createScore({
                submissionId,
                assessmentId: input.assessmentId,
                ...llmScore,
                benchmarkPercentile,
              });
              await updateAssessmentStatus(input.assessmentId, "scored");
              // PDF + score-ready email
              {
                const candidate = await getUserById(assessment.candidateId);
                const candidateName = candidate?.name ?? "Candidate";
                const candidateEmail = candidate?.email ?? assessment.invitedEmail;
                const scoreRecord = await getScoreByAssessment(input.assessmentId);
                if (scoreRecord) {
                  try {
                    const { key, url } = await generatePdfReport({
                      candidateName,
                      roleTemplate: campaign.roleTemplate,
                      score: scoreRecord,
                      assessmentId: input.assessmentId,
                    });
                    await createPdfReport({
                      submissionId,
                      assessmentId: input.assessmentId,
                      storageKey: key,
                      url,
                    });
                  } catch (e) {
                    console.error("[AutoScore] PDF generation failed:", e);
                  }
                  if (candidateEmail) {
                    const appBase = process.env.APP_URL ?? "";
                    const reportUrl = appBase ? `${appBase}/report/${input.assessmentId}` : `/report/${input.assessmentId}`;
                    sendScoreReadyEmail({
                      toEmail: candidateEmail,
                      candidateName,
                      campaignTitle: campaign.title,
                      overallScore: llmScore.overallScore,
                      benchmarkPercentile,
                      reportUrl,
                    }).catch(err => console.error("[AutoScore] Score-ready email failed:", err));
                  }
                }
              }
              console.log(`[AutoScore] Assessment ${input.assessmentId} scored successfully (${llmScore.overallScore}/100)`);
            } catch (err) {
              console.error(`[AutoScore] Failed to score assessment ${input.assessmentId}:`, err);
            }
          });
        }
        return { submissionId, autoScoring: campaign.autoScore };
      }),
    logBehavior: protectedProcedure
      .input(z.object({
        assessmentId: z.number(),
        events: z.array(z.object({
          eventType: z.string().max(32),
          taskId: z.string().max(50).optional(),
          eventData: z.unknown().optional(),
          clientTimestamp: z.number(),
        })),
      }))
      .mutation(async ({ ctx, input }) => {
        // Validate the assessment belongs to the current candidate
        const assessment = await getAssessmentById(input.assessmentId);
        if (!assessment) throw new TRPCError({ code: "NOT_FOUND" });
        if (assessment.candidateId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN" });
        await bulkInsertBehaviorEvents(
          input.events.map(e => ({
            assessmentId: input.assessmentId,
            taskId: e.taskId ?? null,
            eventType: e.eventType,
            eventData: e.eventData ?? null,
            clientTimestamp: e.clientTimestamp,
          }))
        );
        return { inserted: input.events.length };
      }),
  }),
  // ─── Scoringg ────────────────────────────────────────────────────────────────
  scoring: router({
    scoreSubmission: protectedProcedure
      .input(z.object({ submissionId: z.number() }))
      .mutation(async ({ input }) => {
        const sub = await getSubmissionById(input.submissionId);

        if (!sub) throw new TRPCError({ code: "NOT_FOUND" });

        const assessment = await getAssessmentById(sub.assessmentId);
        if (!assessment) throw new TRPCError({ code: "NOT_FOUND" });

        const campaign = await getCampaignById(assessment.campaignId);
        if (!campaign) throw new TRPCError({ code: "NOT_FOUND" });

        const taskResponses = (sub.taskResponses as Record<string, string>) ?? {};
        const aiInteractions = (sub.aiInteractions as Array<{ role: string; content: string }>) ?? [];

        const llmScore = await generateScoreWithLLM({
          roleTemplate: campaign.roleTemplate,
          taskResponses,
          aiInteractions,
          completionTimeSeconds: sub.completionTimeSeconds ?? 3600,
          timeLimitSeconds: assessment.timeLimitMinutes * 60,
        });

        // Compute benchmark percentile using real cohort distribution
        const benchmarkPercentile = computeBenchmarkPercentile(llmScore.overallScore, campaign.roleTemplate);

        const scoreId = await createScore({
          submissionId: input.submissionId,
          assessmentId: sub.assessmentId,
          ...llmScore,
          benchmarkPercentile,
        });

          await updateAssessmentStatus(sub.assessmentId, "scored");
        // Generate and store PDF + send score-ready email
        {
          const candidate = await getUserById(assessment.candidateId);
          const candidateName = candidate?.name ?? "Candidate";
          const candidateEmail = candidate?.email ?? assessment.invitedEmail;
          const scoreRecord = await getScoreByAssessment(sub.assessmentId);
          if (scoreRecord) {
            try {
              const { key, url } = await generatePdfReport({
                candidateName,
                roleTemplate: campaign.roleTemplate,
                score: scoreRecord,
                assessmentId: sub.assessmentId,
              });
              await createPdfReport({
                submissionId: input.submissionId,
                assessmentId: sub.assessmentId,
                storageKey: key,
                url,
              });
            } catch (e) {
              console.error("PDF generation failed:", e);
            }
            // Send score-ready email to candidate (non-blocking)
            if (candidateEmail) {
              // Use APP_URL env if set, otherwise fall back to the deployed domain pattern
              const appBase = process.env.APP_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "";
              const reportUrl = appBase ? `${appBase}/report/${sub.assessmentId}` : `/report/${sub.assessmentId}`;
              sendScoreReadyEmail({
                toEmail: candidateEmail,
                candidateName,
                campaignTitle: campaign.title,
                overallScore: llmScore.overallScore,
                benchmarkPercentile,
                reportUrl,
              }).catch(err => console.error("[Email] Score ready email failed:", err));
            }
          }
        }
        return { scoreId, ...llmScore, benchmarkPercentile };
      }),

    getScore: protectedProcedure
      .input(z.object({ assessmentId: z.number() }))
      .query(async ({ input }) => {
        return getScoreByAssessment(input.assessmentId);
      }),

    generatePdf: protectedProcedure
      .input(z.object({ assessmentId: z.number() }))
      .mutation(async ({ input }) => {
        const existing = await getPdfReportByAssessment(input.assessmentId);
        if (existing?.url) return { pdfUrl: existing.url };
        const score = await getScoreByAssessment(input.assessmentId);
        const assessmentWithCampaign = await getAssessmentWithCampaign(input.assessmentId);
        if (!score || !assessmentWithCampaign) throw new TRPCError({ code: "NOT_FOUND" });
        const { key, url } = await generatePdfReport({
          candidateName: "Candidate",
          roleTemplate: assessmentWithCampaign.campaign?.roleTemplate ?? "Assessment",
          score,
          assessmentId: input.assessmentId,
        });
        await createPdfReport({ assessmentId: input.assessmentId, submissionId: 0, storageKey: key, url });
        return { pdfUrl: url };
      }),
    getBenchmark: publicProcedure
      .input(z.object({ roleTemplate: z.string() }))
      .query(async ({ input }) => {
        const { getDimensionBenchmark, getCohortMean } = await import("./benchmarkData");
        return {
          dimensions: getDimensionBenchmark(input.roleTemplate),
          cohortMean: getCohortMean(input.roleTemplate),
        };
      }),
    // Exam history: list of all past exams for a candidate (candidate sees own, recruiter sees any)
    examHistory: protectedProcedure
      .input(z.object({ candidateId: z.number().optional() }))
      .query(async ({ ctx, input }) => {
        const isRecruiterOrAdmin = ctx.user.role === "recruiter" || ctx.user.role === "admin" || ctx.user.role === "manager";
        // Candidates can only see their own history
        const targetId = isRecruiterOrAdmin && input.candidateId
          ? input.candidateId
          : ctx.user.id;
        if (!isRecruiterOrAdmin && input.candidateId && input.candidateId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN", message: "You can only view your own exam history" });
        }
        return getAssessmentHistoryForCandidate(targetId);
      }),

    // Full submission detail: task responses + AI chat log + score rationale + per-task stats
    examResponses: protectedProcedure
      .input(z.object({ assessmentId: z.number() }))
      .query(async ({ ctx, input }) => {
        const isRecruiterOrAdmin = ctx.user.role === "recruiter" || ctx.user.role === "admin" || ctx.user.role === "manager";
        const detail = await getAssessmentSubmissionDetail(
          input.assessmentId,
          ctx.user.id,
          isRecruiterOrAdmin
        );
        if (!detail) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Assessment not found or access denied" });
        }
        // Compute per-task stats: word count + real or estimated time
        const taskResponses = (detail.submission?.taskResponses ?? {}) as Record<string, string>;
        const totalSeconds = detail.submission?.completionTimeSeconds ?? 0;
        const taskKeys = Object.keys(taskResponses);
        const rawInteractions = (detail.submission?.aiInteractions ?? []) as Array<{
          role: string; content: string; taskKey?: string; timestamp?: number;
        }>;

        // Check if this submission has real timestamps (new format)
        const hasTimestamps = rawInteractions.some(m => m.timestamp != null);

        // Per-task word counts
        const taskWordCounts: Record<string, number> = {};
        let totalWords = 0;
        for (const key of taskKeys) {
          const wc = (taskResponses[key] ?? "").split(/\s+/).filter(Boolean).length;
          taskWordCounts[key] = wc;
          totalWords += wc;
        }

        const taskStats: Record<string, { wordCount: number; timeSeconds: number; isEstimated: boolean }> = {};

        if (hasTimestamps) {
          // Real per-task timing: span from first to last message per taskKey
          const taskTimestamps: Record<string, { first: number; last: number }> = {};
          for (const msg of rawInteractions) {
            if (!msg.taskKey || msg.timestamp == null) continue;
            const entry = taskTimestamps[msg.taskKey];
            if (!entry) {
              taskTimestamps[msg.taskKey] = { first: msg.timestamp, last: msg.timestamp };
            } else {
              if (msg.timestamp < entry.first) entry.first = msg.timestamp;
              if (msg.timestamp > entry.last) entry.last = msg.timestamp;
            }
          }
          for (const key of taskKeys) {
            const span = taskTimestamps[key];
            const timeSeconds = span ? Math.round((span.last - span.first) / 1000) : 0;
            taskStats[key] = { wordCount: taskWordCounts[key], timeSeconds, isEstimated: false };
          }
        } else {
          // Legacy fallback: proportional estimate by word count
          for (const key of taskKeys) {
            const timeSeconds = totalWords > 0 && totalSeconds > 0
              ? Math.round((taskWordCounts[key] / totalWords) * totalSeconds)
              : taskKeys.length > 0 && totalSeconds > 0
              ? Math.round(totalSeconds / taskKeys.length)
              : 0;
            taskStats[key] = { wordCount: taskWordCounts[key], timeSeconds, isEstimated: true };
          }
        }

        return { ...detail, taskStats };
      }),

    getReport: protectedProcedure
      .input(z.object({ assessmentId: z.number() }))
      .query(async ({ input }) => {
        const score = await getScoreByAssessment(input.assessmentId);
        const pdf = await getPdfReportByAssessment(input.assessmentId);
        const assessmentWithCampaign = await getAssessmentWithCampaign(input.assessmentId);
        const assessment = assessmentWithCampaign?.assessment;
        const campaign = assessmentWithCampaign?.campaign;
        const submission = await getSubmissionByAssessment(input.assessmentId);
        // Get candidate info
        const candidate = assessment?.candidateId ? await getUserById(assessment.candidateId) ?? null : null;
        return { score, pdf, assessment, campaign, submission, candidate };
      }),
  }),

  // ─── AI Usage Analytics ─────────────────────────────────────────────────────
  analytics: router({
    myUsage: protectedProcedure.query(async ({ ctx }) => {
      return getAiUsageByUser(ctx.user.id);
    }),
    teamStats: managerProcedure.query(async () => {
      return getTeamAiUsageStats();
    }),
    logEvent: protectedProcedure
      .input(z.object({
        eventType: z.string(),
        workflow: z.string().optional(),
        tool: z.string().optional(),
        promptLength: z.number().optional(),
        responseLength: z.number().optional(),
        durationMs: z.number().optional(),
        qualityScore: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        await logAiUsageEvent({ userId: ctx.user.id, ...input });
        return { success: true };
      }),
    teamMembers: managerProcedure.query(async () => {
      return getTeamMembers();
    }),
    allCandidates: managerProcedure.query(async () => {
      return getAllCandidatesForManager();
    }),
  }),
  // ─── Recruiter-wide views ───────────────────────────────────────────────────────────────────
  recruiter: router({
    allCandidates: recruiterProcedure.query(async ({ ctx }) => {
      return getAllCandidatesForRecruiter(ctx.user.id);
    }),
    allReports: recruiterProcedure.query(async ({ ctx }) => {
      return getAllReportsForRecruiter(ctx.user.id);
    }),
    myCandidateScores: protectedProcedure.query(async ({ ctx }) => {
      return getCandidateScoreSummary(ctx.user.id);
    }),
  }),

  // ─── Assessment AI Chat ──────────────────────────────────────────────────────
  chat: router({
    send: protectedProcedure
      .input(z.object({
        assessmentId: z.number(),
        messages: z.array(z.object({ role: z.string(), content: z.string() })),
        roleTemplate: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        const systemPrompt = `You are an AI assistant helping a finance professional complete a timed assessment task for the role: ${input.roleTemplate}.

You have access to the source materials provided in the assessment. Help the candidate analyze financial data, extract metrics, draft memos, and complete finance workflow tasks.

Important guidelines:
- Provide accurate financial analysis and calculations
- Help structure responses professionally
- Point out when verification or cross-checking is important
- Do not complete the entire task for the candidate — guide and assist
- Keep responses focused and concise`;

        const response = await invokeLLM({
          messages: [
            { role: "system", content: systemPrompt },
            ...input.messages.map(m => ({ role: m.role as "user" | "assistant", content: m.content })),
          ],
        });

        const rawContent = response.choices[0]?.message?.content;
        const content = typeof rawContent === "string" ? rawContent : "";

        // Log the interaction
        const lastUserMsg = input.messages.filter(m => m.role === "user").pop();
        await logAiUsageEvent({
          userId: ctx.user.id,
          eventType: "prompt",
          workflow: "assessment",
          tool: "pine-ai",
          promptLength: lastUserMsg?.content.length ?? 0,
          responseLength: content.length,
        });

        return { content };
      }),
  }),

  // ─── Intelligence Platform ──────────────────────────────────────────────────
  intelligence: router({
    dashboard: dashboardRouter,
    aiEvents: aiEventsRouter,
    governance: governanceRouter,
    reports: reportsRouter,
    feedback: feedbackRouter,
    scoring: intelligenceScoringRouter,
    teams: teamsRouter,
  }),
});

export type AppRouter = typeof appRouter;
