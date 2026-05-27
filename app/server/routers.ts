import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { COOKIE_NAME } from "@/app/shared/const";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { invokeLLM } from "./_core/llm";
import { storageDelete, storagePut } from "./storage";
import {
  upsertUser, getUserByOpenId, updateUserRole,
  createCampaign, getCampaignsByRecruiter, getCampaignById, updateCampaign, deleteCampaignAndRelatedData, getCampaignDeletionStorageKeys,
  deleteAssessmentAndRelatedData, getAssessmentDeletionStorageKeys,
  createAssessment, getAssessmentsByCampaign, getAssessmentById, getAssessmentWithCampaign, getAssessmentsByCandidate, updateAssessmentStatus,
  createSubmission, getSubmissionByAssessment,
  createScore, getScoreByAssessment, getScoresByCampaign,
  createPdfReport, getPdfReportByAssessment,
  createDemoRequest,
  getCandidatesFullStatus,
  getAssessmentByToken,
  linkAssessmentToCandidate,
  getAssessmentsByEmail,
  getAllCandidatesForRecruiter,
  getAllReportsForRecruiter,
  getCandidateScoreSummary,
  getAssessmentHistoryForCandidate,
  getAssessmentSubmissionDetail,
  bulkInsertBehaviorEvents,
  getBehaviorEventsByAssessment,
  getSubmissionById,
  getUserById,
} from "@/app/lib/db";
import { notifyOwner } from "./_core/notification";
import { sendCandidateInviteEmail, sendDemoConfirmationEmail, sendDemoNotificationEmail, sendScoreReadyEmail } from "./email";
import { computeBenchmarkPercentile } from "./benchmarkData";
import {
  extractSourceMaterials,
  formatSourceMaterialsForPrompt,
} from "./materials";
import {
  analyzeSubmissionIntegrity,
  applyIntegrityGates,
  blendScores,
  computeDeterministicScores,
  type CompletenessEvidence,
  type DimensionScoreSet,
  type ResponseRelianceEvidence,
  type StructuredTaskResponse,
} from "./scoring";
import type { ScoreEvidence, SourceMaterial } from "@/app/lib/schema";

// ─── Role guard helpers ───────────────────────────────────────────────────────
const recruiterProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "recruiter" && ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Recruiter access required" });
  }
  return next({ ctx });
});

type PineChatTaskContext = {
  title?: string;
  prompt?: string;
};

export function getPineChatRoleBoundary(roleTemplate: string) {
  switch (roleTemplate) {
    case "IB Analyst":
      return "Role boundary: be comfortable with IB concepts, valuation methods, transaction framing, and source triangulation. Stay strict: do not write pitch-book-ready language or supply completed valuation outputs.";
    case "PE Associate":
      return "Role boundary: emphasize investment judgment, diligence framing, LBO mechanics, and risk checks. Stay strict: do not write the investment memo, deal recommendation, or final IRR answer.";
    case "Hedge Fund Research Analyst":
      return "Role boundary: emphasize thesis testing, variant perception, catalyst framing, and valuation cross-checks. Stay strict: do not hand over a final long/short thesis, price target, or fully computed return.";
    case "Management Consultant":
      return "Role boundary: explain regulatory frameworks, CAMELS methodology, bank M&A deal mechanics, and tradeoffs. Ask clarifying questions and point out verification opportunities. Stay strict: do not write the candidate's memo, risk ranking, or final recommendation.";
    default:
      return "Role boundary: adapt to the stated finance role, but stay strict about research-assistant behavior and candidate-owned work product.";
  }
}

export function buildPineChatSystemPrompt(params: {
  roleTemplate: string;
  taskContext?: PineChatTaskContext;
  activeMaterialLabel?: string;
  sourceMaterialsBlock?: string;
}) {
  const taskContext = params.taskContext;
  const taskBlock =
    taskContext?.title || taskContext?.prompt
      ? [
          "=== CURRENT TASK ===",
          taskContext.title ? `Title: ${taskContext.title}` : null,
          taskContext.prompt ? `Prompt: ${taskContext.prompt}` : null,
        ].filter(Boolean).join("\n")
      : "";
  const activeMaterialNote = params.activeMaterialLabel
    ? `Active material note: the candidate is currently viewing "${params.activeMaterialLabel}". Prioritize that material when it is relevant, but still cross-check other provided sources.`
    : "";

  return `You are Pine AI, a strict research assistant inside a timed finance assessment for the role: ${params.roleTemplate}.

Your job is to help the candidate reason, verify, and structure their own work. You are not the candidate and you must not complete the assessment for them.

${getPineChatRoleBoundary(params.roleTemplate)}

Non-negotiable rules:
- Never produce a final or submittable deliverable. If asked for a finished memo, thesis, executive summary, model answer, final table, or final response, briefly refuse and offer an outline, checklist, critique rubric, or targeted questions instead.
- Never fill in numerical answers for the candidate. Do not hand over computed final values, valuation outputs, percentages, IRRs, price targets, deal sizes, bridge totals, or completed table cells. Give the formula, identify the figures from the sources, show the setup and units, and let the candidate compute.
- You may verify math the candidate already provides. If their number is wrong, explain the correction path without replacing their work with a final answer.
- Keep continuous prose to about three sentences maximum. Prefer concise bullets, formulas, and pointed checks.
- Ask a clarifying question when the candidate's request is ambiguous or underspecified.
- Point out verification opportunities, source cross-checks, and assumptions the candidate should test.
- Use the provided source materials directly. Cite figures by material label and page marker when available. If the material is missing or unclear, say what to verify rather than inventing facts.
- Stay role-aware and concise; do not become a general tutor or generic writing assistant.

${activeMaterialNote}

${taskBlock}

${params.sourceMaterialsBlock ?? ""}`.trim();
}

// ─── Scoring helper ───────────────────────────────────────────────────────────
async function generateScoreWithLLM(params: {
  roleTemplate: string;
  taskResponses: Record<string, string>;
  aiInteractions: Array<{ role: string; content: string }>;
  completionTimeSeconds: number;
  timeLimitSeconds: number;
  integrityEvidence: {
    completeness: CompletenessEvidence;
    responseReliance: ResponseRelianceEvidence;
  };
}) {
  const { roleTemplate, taskResponses, aiInteractions, completionTimeSeconds, timeLimitSeconds, integrityEvidence } = params;

  const taskSummary = Object.entries(taskResponses)
    .map(([k, v]) => `Task ${k}: ${v?.substring(0, 800) ?? "(empty)"}`)
    .join("\n\n");

  const aiLog = aiInteractions
    .slice(0, 20)
    .map((m) => `[${m.role}]: ${m.content?.substring(0, 400)}`)
    .join("\n");

  const timeRatio = completionTimeSeconds / timeLimitSeconds;
  const timeUseNote =
    timeRatio < 0.3
      ? "used a very small share of the time limit; if work is incomplete, treat this as likely abandonment rather than efficiency"
      : timeRatio > 0.95
        ? "used nearly all available time"
        : "used a moderate share of the time limit";
  const incompleteTasks = integrityEvidence.completeness.tasks
    .filter((task) => !task.substantive)
    .map((task) => `${task.taskId}: ${task.reason} (${task.wordCount} words, ~${task.typedWordEstimate} typed words)`);
  const aiPastedTasks = integrityEvidence.completeness.tasks
    .filter((task) => task.aiPasted)
    .map((task) => `${task.taskId}: assistant similarity ${Math.round(task.assistantSimilarity * 100)}%, AI-pasted chars ${task.aiPastedChars}`);
  const integrityBlock = [
    `Completeness: ${integrityEvidence.completeness.attemptedTaskCount}/${integrityEvidence.completeness.definedTaskCount} substantive tasks (${Math.round(integrityEvidence.completeness.completenessRatio * 100)}%).`,
    incompleteTasks.length ? `Incomplete/non-substantive tasks:\n${incompleteTasks.join("\n")}` : "All defined tasks appear substantively attempted.",
    aiPastedTasks.length ? `Likely AI-pasted deliverables:\n${aiPastedTasks.join("\n")}` : "No task was flagged as a likely verbatim AI-pasted deliverable.",
    `Paste/reliance: ${Math.round(integrityEvidence.responseReliance.aiPasteShare * 100)}% AI-paste share, ${Math.round(integrityEvidence.responseReliance.pasteShare * 100)}% total-paste share, ~${integrityEvidence.responseReliance.typedCharsEstimate} typed chars.`,
  ].join("\n");

  const systemPrompt = `You are an expert finance talent evaluator scoring a candidate's AI fluency assessment for the role: ${roleTemplate}.

Evaluate the candidate on exactly these 6 dimensions, each scored 0-100:
1. Accuracy – Was the financial content correct and precise?
2. Efficiency – Was time used productively to complete quality work? Do not reward raw speed by itself. Candidate ${timeUseNote}, using ${Math.round(completionTimeSeconds / 60)} of ${Math.round(timeLimitSeconds / 60)} minutes.
3. Judgment – Did the candidate use AI appropriately rather than blindly accepting outputs?
4. Verification – Did the candidate check claims, validate sources, and catch errors?
5. Communication – Was the final output professional, clear, and client-ready?
6. Tool Fluency – Did the candidate structure prompts well and iterate effectively?

Integrity rules:
- Heavily penalize empty, near-empty, or non-substantive tasks. Do not infer quality for missing work.
- If a task is flagged as likely copied from the assistant, do not credit the pasted text as the candidate's accuracy or communication.
- A fast submission with incomplete work indicates abandonment, not strong efficiency.
- Pasted AI output as the deliverable is a major judgment and verification failure unless the response shows clear candidate transformation and source-backed checking.

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
${aiLog}

SCORING INTEGRITY SIGNALS:
${integrityBlock}`;

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

type LLMScoreResult = Awaited<ReturnType<typeof generateScoreWithLLM>>;

const TASK_RESPONSE_TYPES: Record<string, Record<string, StructuredTaskResponse["responseType"]>> = {
  "IB Analyst": { t1: "extraction", t2: "memo", t3: "flags" },
  "PE Associate": { t1: "thesis", t2: "flags", t3: "memo" },
  "Hedge Fund Research Analyst": { t1: "thesis", t2: "extraction", t3: "flags" },
  "Management Consultant": { t1: "flags", t2: "memo", t3: "memo" },
};

function getDefinedTaskIds(roleTemplate: string, taskResponses: Record<string, string>) {
  const taskIds = Object.keys(TASK_RESPONSE_TYPES[roleTemplate] ?? {});
  return taskIds.length > 0 ? taskIds : Object.keys(taskResponses);
}

function parseMarkdownTableRows(raw: string) {
  const tableLines = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.startsWith("|") && line.endsWith("|"));

  if (tableLines.length < 2) return [];

  const headers = tableLines[0]
    .split("|")
    .slice(1, -1)
    .map((header) => header.trim().toLowerCase());

  return tableLines.slice(1).flatMap((line) => {
    const cells = line.split("|").slice(1, -1).map((cell) => cell.trim());
    if (cells.every((cell) => /^:?-{2,}:?$/.test(cell))) return [];
    const row: Record<string, string> = {};
    headers.forEach((header, index) => {
      row[header] = cells[index] ?? "";
    });
    return [row];
  });
}

function buildStructuredTaskResponses(
  roleTemplate: string,
  taskResponses: Record<string, string>,
  structuredValues?: Record<string, unknown>,
): StructuredTaskResponse[] {
  const typeByTask = TASK_RESPONSE_TYPES[roleTemplate] ?? {};

  // Prefer persisted structured values when present (avoids lossy markdown re-parse)
  if (structuredValues && Object.keys(structuredValues).length > 0) {
    return Object.entries(structuredValues).map(([taskId, value]) => {
      const responseType = typeByTask[taskId] ?? "memo";
      return { taskId, responseType, value: (value as Record<string, unknown>) ?? {} };
    });
  }

  // Legacy fallback: reconstruct from serialized markdown strings
  return Object.entries(taskResponses).map(([taskId, raw]) => {
    const responseType = typeByTask[taskId] ?? "memo";
    const tableRows = parseMarkdownTableRows(raw ?? "");
    const value: Record<string, unknown> = { rawText: raw ?? "" };

    if (responseType === "extraction") {
      value.rows = tableRows.map((row) => ({
        metric: row.metric ?? row.label ?? "",
        value: row.value ?? "",
        source: row.source ?? "",
      }));
    }

    if (responseType === "reconciliation") {
      value.entries = tableRows.map((row) => ({
        account: row.account ?? "",
        stated: row.stated ?? "",
        corrected: row.corrected ?? "",
        reason: row.reason ?? "",
      }));
    }

    return { taskId, responseType, value };
  });
}

async function buildBlendedScore(params: {
  assessmentId: number;
  roleTemplate: string;
  taskResponses: Record<string, string>;
  taskResponsesStructured?: Record<string, unknown>;
  aiInteractions: Array<{ role: string; content: string }>;
  llmScore: LLMScoreResult;
  completionTimeSeconds: number;
  timeLimitSeconds: number;
}) {
  const behaviorEvents = await getBehaviorEventsByAssessment(params.assessmentId);
  const definedTaskIds = getDefinedTaskIds(params.roleTemplate, params.taskResponses);
  const deterministic = computeDeterministicScores({
    roleTemplate: params.roleTemplate,
    tasks: buildStructuredTaskResponses(params.roleTemplate, params.taskResponses, params.taskResponsesStructured),
    taskResponses: params.taskResponses,
    definedTaskIds,
    aiInteractions: params.aiInteractions,
    completionTimeSeconds: params.completionTimeSeconds,
    timeLimitSeconds: params.timeLimitSeconds,
    behaviorEvents,
  });
  const blended = blendScores(params.llmScore as DimensionScoreSet, deterministic);
  const gated = applyIntegrityGates(
    blended.scores,
    deterministic.completenessEvidence,
    deterministic.responseRelianceEvidence,
  );
  const scoreEvidence: ScoreEvidence = {
    accuracyChecks: deterministic.accuracyEvidence,
    efficiencyBand: deterministic.efficiencyEvidence,
    completeness: deterministic.completenessEvidence,
    responseReliance: deterministic.responseRelianceEvidence,
    behavioral: {
      summary: deterministic.behavioralEvidence,
      judgment: deterministic.judgmentEvidence,
      verification: deterministic.verificationEvidence,
      toolFluency: deterministic.toolFluencyEvidence,
    },
    blend: blended.evidence,
    integrityGate: gated.evidence,
  };

  return {
    ...params.llmScore,
    ...gated.scores,
    overallScore: gated.scores.overallScore ?? params.llmScore.overallScore,
    scoreEvidence,
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
  body { font-family: 'Helvetica Neue', Arial, sans-serif; background: #fff; color: #e8e0d0; padding: 40px; }
  .header { border-bottom: 2px solid #168a4a; padding-bottom: 24px; margin-bottom: 32px; }
  .logo { font-size: 28px; font-weight: 900; letter-spacing: 4px; color: #168a4a; text-transform: uppercase; }
  .subtitle { font-size: 12px; letter-spacing: 2px; color: #3f5847; margin-top: 4px; }
  h1 { font-size: 22px; font-weight: 700; color: #fff; margin: 16px 0 4px; }
  .meta { font-size: 13px; color: #3f5847; margin-bottom: 8px; }
  .overall-box { background: linear-gradient(135deg, #d9e7db, #eef7ef); border: 1px solid #168a4a; border-radius: 8px; padding: 24px; margin: 24px 0; display: flex; align-items: center; gap: 32px; }
  .overall-score { font-size: 64px; font-weight: 900; color: #168a4a; line-height: 1; }
  .overall-label { font-size: 13px; color: #3f5847; letter-spacing: 2px; text-transform: uppercase; }
  .percentile { font-size: 18px; color: #e8e0d0; margin-top: 8px; }
  .section-title { font-size: 14px; font-weight: 700; letter-spacing: 3px; text-transform: uppercase; color: #168a4a; margin: 28px 0 16px; border-left: 3px solid #168a4a; padding-left: 12px; }
  .dimension { margin-bottom: 20px; padding: 16px; background: #eef7ef; border-radius: 6px; border-left: 3px solid #9db8a4; }
  .dim-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
  .dim-name { font-size: 14px; font-weight: 700; color: #e8e0d0; }
  .dim-score { font-size: 22px; font-weight: 900; color: #168a4a; }
  .progress-bar { height: 6px; background: #cfe0d2; border-radius: 3px; margin-bottom: 10px; }
  .progress-fill { height: 100%; background: linear-gradient(90deg, #0f5f34, #168a4a); border-radius: 3px; }
  .dim-rationale { font-size: 12px; color: #2e4637; line-height: 1.6; }
  .summary-box { background: #eef7ef; border: 1px solid #9db8a4; border-radius: 8px; padding: 20px; margin: 16px 0; }
  .summary-text { font-size: 13px; color: #2a4134; line-height: 1.8; }
  .list-item { font-size: 12px; color: #344d3d; margin: 6px 0; padding-left: 16px; position: relative; }
  .list-item::before { content: "▸"; position: absolute; left: 0; color: #168a4a; }
  .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
  .col-box { background: #eef7ef; border-radius: 6px; padding: 16px; }
  .col-title { font-size: 12px; font-weight: 700; letter-spacing: 2px; text-transform: uppercase; color: #3f5847; margin-bottom: 12px; }
  .benchmark-row { display: flex; align-items: center; gap: 12px; margin: 8px 0; }
  .bench-label { font-size: 11px; color: #3f5847; width: 100px; }
  .bench-bar { flex: 1; height: 8px; background: #cfe0d2; border-radius: 4px; overflow: hidden; }
  .bench-fill-candidate { height: 100%; background: #168a4a; border-radius: 4px; }
  .bench-fill-peer { height: 100%; background: #8fa095; border-radius: 4px; }
  .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #cfe0d2; font-size: 11px; color: #6f8274; text-align: center; }
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
    <div style="font-size:11px;color:#52665a;margin-top:4px;">out of 100</div>
  </div>
  <div style="flex:1;">
    <div class="percentile">Top <strong style="color:#168a4a">${100 - peerBenchmark}%</strong> of ${roleTemplate} candidates</div>
    <div style="font-size:12px;color:#52665a;margin-top:4px;">Benchmark Percentile: ${peerBenchmark}th</div>
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
    <div style="font-size:11px;color:#168a4a;width:32px;text-align:right">${Math.round(d.score ?? 0)}</div>
    <div style="font-size:11px;color:#6f8274;width:60px;text-align:right">Peer: ~65</div>
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
        role: z.enum(["recruiter", "candidate"]),
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
        const emailResults = await Promise.allSettled([
          sendDemoConfirmationEmail({
            toEmail: input.email,
            name: input.name,
            company: input.company,
            segment: input.segment,
          }),
          sendDemoNotificationEmail(input),
        ]);
        for (const r of emailResults) {
          if (r.status === "rejected") {
            console.error("[demo.request] email send rejected:", r.reason);
          } else if (!r.value.success) {
            console.error("[demo.request] email send failed:", r.value.error);
          }
        }
        notifyOwner({
          title: "New Demo Request",
          content: `${input.name} from ${input.company ?? "unknown"} (${input.email}) requested a demo. Segment: ${input.segment ?? "N/A"}`,
        }).catch(err => console.error("[demo.request] owner notification failed:", err));
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
        roleTemplate: z.enum(["IB Analyst", "PE Associate", "Hedge Fund Research Analyst", "Management Consultant"]),
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
      .mutation(async ({ ctx, input }) => {
        const campaign = await getCampaignById(input.id);
        if (!campaign) throw new TRPCError({ code: "NOT_FOUND" });
        if (ctx.user.role !== "admin" && campaign.recruiterId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        const storageKeys = await getCampaignDeletionStorageKeys(input.id);
        await Promise.all(storageKeys.map((key) => storageDelete(key)));
        await deleteCampaignAndRelatedData(input.id);
        return { success: true };
      }),
    deleteCandidate: recruiterProcedure
      .input(z.object({ assessmentId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const assessment = await getAssessmentById(input.assessmentId);
        if (!assessment) throw new TRPCError({ code: "NOT_FOUND" });
        const campaign = await getCampaignById(assessment.campaignId);
        if (!campaign) throw new TRPCError({ code: "NOT_FOUND" });
        if (ctx.user.role !== "admin" && campaign.recruiterId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN" });
        }
        const storageKeys = await getAssessmentDeletionStorageKeys(input.assessmentId);
        await Promise.all(storageKeys.map((key) => storageDelete(key)));
        await deleteAssessmentAndRelatedData(input.assessmentId);
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
        taskResponsesStructured: z.record(z.string(), z.unknown()).optional(),
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
          taskResponsesStructured: input.taskResponsesStructured,
          aiInteractions: input.aiInteractions,
          wordCount,
          completionTimeSeconds: input.completionTimeSeconds,
        });
        await updateAssessmentStatus(input.assessmentId, "submitted", { submittedAt: new Date() });
        // Auto-score if campaign has autoScore enabled (non-blocking — runs in background)
        if (campaign.autoScore) {
          setImmediate(async () => {
            try {
              const sub = await getSubmissionByAssessment(input.assessmentId);
              if (!sub) return;
              const taskResponses = (sub.taskResponses as Record<string, string>) ?? {};
              const aiInteractions = (sub.aiInteractions as Array<{ role: string; content: string }>) ?? [];
              const behaviorEvents = await getBehaviorEventsByAssessment(input.assessmentId);
              const integrityEvidence = analyzeSubmissionIntegrity({
                taskResponses,
                definedTaskIds: getDefinedTaskIds(campaign.roleTemplate, taskResponses),
                aiInteractions,
                behaviorEvents,
              });
              const llmScore = await generateScoreWithLLM({
                roleTemplate: campaign.roleTemplate,
                taskResponses,
                aiInteractions,
                completionTimeSeconds: sub.completionTimeSeconds ?? 3600,
                timeLimitSeconds: assessment.timeLimitMinutes * 60,
                integrityEvidence,
              });
              const blendedScore = await buildBlendedScore({
                assessmentId: input.assessmentId,
                roleTemplate: campaign.roleTemplate,
                taskResponses,
                taskResponsesStructured: (sub.taskResponsesStructured as Record<string, unknown>) ?? undefined,
                aiInteractions,
                llmScore,
                completionTimeSeconds: sub.completionTimeSeconds ?? 3600,
                timeLimitSeconds: assessment.timeLimitMinutes * 60,
              });
              const overallScore = blendedScore.overallScore ?? llmScore.overallScore;
              const benchmarkPercentile = computeBenchmarkPercentile(overallScore, campaign.roleTemplate);
              await createScore({
                submissionId,
                assessmentId: input.assessmentId,
                ...blendedScore,
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
                      overallScore,
                      benchmarkPercentile,
                      reportUrl,
                    }).catch(err => console.error("[AutoScore] Score-ready email failed:", err));
                  }
                }
              }
              console.log(`[AutoScore] Assessment ${input.assessmentId} scored successfully (${overallScore}/100)`);
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
        const behaviorEvents = await getBehaviorEventsByAssessment(sub.assessmentId);
        const integrityEvidence = analyzeSubmissionIntegrity({
          taskResponses,
          definedTaskIds: getDefinedTaskIds(campaign.roleTemplate, taskResponses),
          aiInteractions,
          behaviorEvents,
        });

        const llmScore = await generateScoreWithLLM({
          roleTemplate: campaign.roleTemplate,
          taskResponses,
          aiInteractions,
          completionTimeSeconds: sub.completionTimeSeconds ?? 3600,
          timeLimitSeconds: assessment.timeLimitMinutes * 60,
          integrityEvidence,
        });
        const blendedScore = await buildBlendedScore({
          assessmentId: sub.assessmentId,
          roleTemplate: campaign.roleTemplate,
          taskResponses,
          taskResponsesStructured: (sub.taskResponsesStructured as Record<string, unknown>) ?? undefined,
          aiInteractions,
          llmScore,
          completionTimeSeconds: sub.completionTimeSeconds ?? 3600,
          timeLimitSeconds: assessment.timeLimitMinutes * 60,
        });

        // Compute benchmark percentile using real cohort distribution
        const overallScore = blendedScore.overallScore ?? llmScore.overallScore;
        const benchmarkPercentile = computeBenchmarkPercentile(overallScore, campaign.roleTemplate);

        const scoreId = await createScore({
          submissionId: input.submissionId,
          assessmentId: sub.assessmentId,
          ...blendedScore,
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
                overallScore,
                benchmarkPercentile,
                reportUrl,
              }).catch(err => console.error("[Email] Score ready email failed:", err));
            }
          }
        }
        return { scoreId, ...blendedScore, benchmarkPercentile };
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
    getBehaviorEvents: recruiterProcedure
      .input(z.object({ assessmentId: z.number() }))
      .query(async ({ ctx, input }) => {
        const assessmentWithCampaign = await getAssessmentWithCampaign(input.assessmentId);
        if (!assessmentWithCampaign?.assessment || !assessmentWithCampaign.campaign) {
          throw new TRPCError({ code: "NOT_FOUND" });
        }
        if (
          ctx.user.role !== "admin" &&
          assessmentWithCampaign.campaign.recruiterId !== ctx.user.id
        ) {
          throw new TRPCError({ code: "FORBIDDEN", message: "You do not own this assessment" });
        }
        return getBehaviorEventsByAssessment(input.assessmentId);
      }),
    // Exam history: list of all past exams for a candidate (candidate sees own, recruiter sees any)
    examHistory: protectedProcedure
      .input(z.object({ candidateId: z.number().optional() }))
      .query(async ({ ctx, input }) => {
        const isRecruiterOrAdmin = ctx.user.role === "recruiter" || ctx.user.role === "admin";
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
        const isRecruiterOrAdmin = ctx.user.role === "recruiter" || ctx.user.role === "admin";
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
        roleTemplate: z.string().optional(),
        taskContext: z.object({
          title: z.string().optional(),
          prompt: z.string().optional(),
        }).optional(),
        activeMaterialLabel: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const assessment = await getAssessmentById(input.assessmentId);
        if (!assessment) throw new TRPCError({ code: "NOT_FOUND", message: "Assessment not found." });

        const campaign = await getCampaignById(assessment.campaignId);
        if (!campaign) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "This assessment's campaign was deleted; please ask your recruiter for a fresh invite.",
          });
        }

        const sourceMaterials = (campaign.sourceMaterials as SourceMaterial[] | null | undefined) ?? [];
        let sourceMaterialsBlock = "";
        try {
          const extractedMaterials = await extractSourceMaterials(sourceMaterials);
          sourceMaterialsBlock = formatSourceMaterialsForPrompt(extractedMaterials);
        } catch (error) {
          console.error("[Chat] Source material extraction failed:", error);
        }
        const systemPrompt = buildPineChatSystemPrompt({
          roleTemplate: campaign.roleTemplate ?? input.roleTemplate ?? "Assessment",
          taskContext: input.taskContext,
          activeMaterialLabel: input.activeMaterialLabel,
          sourceMaterialsBlock,
        });

        const response = await invokeLLM({
          messages: [
            { role: "system", content: systemPrompt },
            ...input.messages.map(m => ({
              role: m.role === "assistant" ? "assistant" as const : "user" as const,
              content: m.content,
            })),
          ],
        });

        const rawContent = response.choices[0]?.message?.content;
        const content = typeof rawContent === "string" ? rawContent : "";

        return { content };
      }),
  }),

});

export type AppRouter = typeof appRouter;
