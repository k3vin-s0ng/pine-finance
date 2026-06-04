import { z } from "zod";
import { getCampaignById, updateCampaign } from "@/app/lib/db";
import type {
  AssessmentResponseType,
  ExpectedTaskAnswers,
  GeneratedAssessment,
  GeneratedTask,
  RoleTemplate,
  SourceMaterial,
} from "@/app/lib/schema";
import { invokeLLM } from "@/app/server/_core/llm";
import { ASSESSMENT_GEN_MODEL } from "@/app/server/models";
import {
  extractSourceMaterials,
  formatSourceMaterialsForPrompt,
  type ExtractedSourceMaterial,
} from "@/app/server/materials";
import {
  GROUNDED_EXTRACTION_EXEMPLAR,
  ROLE_EXEMPLAR_TASKS,
  ROLE_PROFILES,
} from "./generationProfiles";

const ASSESSMENT_VERSION = 1;

const RESPONSE_TYPES = ["memo", "variance", "thesis", "extraction", "flags"] as const;
const FREE_RESPONSE_TYPES = new Set<AssessmentResponseType>(["memo", "variance", "thesis"]);
const DETERMINISTIC_TYPES = new Set<AssessmentResponseType>(["extraction"]);
const ROLE_TEMPLATES = ["IB Analyst", "PE Associate", "Hedge Fund Research Analyst", "Management Consultant"] as const;

const expectedAnswerUnitSchema = z.enum(["$", "$M", "$B", "%", "x", "0/1"]);
const expectedExtractionRowSchema = z.object({
  metricLabel: z.string().min(1),
  expectedValue: z.number(),
  unit: expectedAnswerUnitSchema,
  tolerancePct: z.number().positive().optional(),
  sourceQuote: z.string().min(1).optional(),
}).strict();

const expectedTaskAnswersSchema = z.object({
  extractionRows: z.array(expectedExtractionRowSchema).optional(),
}).strict();

const dataPointSchema = z.object({
  label: z.string().min(1),
  value: z.string().min(1),
  delta: z.number().optional(),
}).strict();

const rawGeneratedTaskSchema = z.object({
  id: z.string().optional(),
  responseType: z.enum(RESPONSE_TYPES),
  title: z.string().min(1),
  imperative: z.string().min(1),
  context: z.string().min(1),
  deliverable: z.string().min(1),
  prompt: z.string().min(1),
  aiSuggestions: z.array(z.string().min(1)).min(3).max(6),
  dataPoints: z.array(dataPointSchema).optional(),
  answerKey: expectedTaskAnswersSchema.nullable().optional(),
  answerKeyStatus: z.enum(["unverified", "verified"]).optional(),
}).strict();

const rawGeneratedAssessmentSchema = z.object({
  version: z.number().int().positive().optional(),
  status: z.enum(["draft", "generated", "reviewed"]).optional(),
  generatedModel: z.string().optional(),
  roleTemplateHint: z.enum(ROLE_TEMPLATES),
  aiBoundary: z.string().min(1),
  tasks: z.array(rawGeneratedTaskSchema).min(3).max(3),
}).strict();

const generatedTaskSchema: z.ZodType<GeneratedTask> = rawGeneratedTaskSchema
  .extend({
    id: z.string().min(1),
    answerKey: expectedTaskAnswersSchema.optional(),
    answerKeyStatus: z.literal("unverified"),
  })
  .strict();

const generatedAssessmentSchema: z.ZodType<GeneratedAssessment> = z.object({
  version: z.number().int().positive(),
  status: z.literal("generated"),
  generatedModel: z.string().min(1),
  roleTemplateHint: z.enum(ROLE_TEMPLATES),
  aiBoundary: z.string().min(1),
  generationDiagnostics: z.object({
    droppedUngroundedAnswerKeys: z.number().int().nonnegative(),
  }).strict(),
  tasks: z.array(generatedTaskSchema).min(3).max(3),
}).strict();



type GenerationMessage = {
  role: "system" | "user";
  content: string;
};

export type GeneratedAssessmentNormalizationResult = {
  generatedAssessment: GeneratedAssessment;
  droppedUngroundedAnswerKeys: number;
};

function hasExtractedText(materials: ExtractedSourceMaterial[]) {
  return materials.some((material) => material.pages.some((page) => page.text.trim().length > 0));
}

function normalizeGroundingText(text: string) {
  return text
    .toLowerCase()
    .replace(/[“”]/g, "\"")
    .replace(/[‘’]/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

export function isSourceQuoteGrounded(sourceQuote: string | undefined, sourceText: string) {
  if (!sourceQuote) return false;
  const normalizedQuote = normalizeGroundingText(sourceQuote);
  if (normalizedQuote.length < 8) return false;

  const normalizedSource = normalizeGroundingText(sourceText);
  if (normalizedSource.includes(normalizedQuote)) return true;

  const quoteTokens = normalizedQuote.split(" ").filter((token) => token.length > 2);
  if (quoteTokens.length < 4) return false;
  const sourceTokens = new Set(normalizedSource.split(" ").filter((token) => token.length > 2));
  const matchedCount = quoteTokens.filter((token) => sourceTokens.has(token)).length;
  return matchedCount / quoteTokens.length >= 0.85;
}

function canonicalDigits(value: number) {
  const valueText = Number.isInteger(value)
    ? String(value)
    : value.toFixed(6).replace(/0+$/, "").replace(/\.$/, "");
  return valueText.replace(/\D/g, "");
}

export function isValueInQuote(expectedValue: number, sourceQuote: string) {
  const valueDigits = canonicalDigits(expectedValue);
  if (!valueDigits) return false;
  const quoteDigits = sourceQuote.replace(/\D/g, "");
  return quoteDigits.includes(valueDigits);
}

function answerKeyHasChecks(answerKey: ExpectedTaskAnswers) {
  return (answerKey.extractionRows?.length ?? 0) > 0;
}

function countExtractionRows(answerKey: ExpectedTaskAnswers | null | undefined) {
  return answerKey?.extractionRows?.length ?? 0;
}

function filterGroundedAnswerKey(
  answerKey: ExpectedTaskAnswers | null | undefined,
  sourceText: string,
  responseType: AssessmentResponseType,
): { answerKey?: ExpectedTaskAnswers; droppedCount: number } {
  if (!answerKey) return { droppedCount: 0 };
  if (responseType !== "extraction") {
    return { droppedCount: countExtractionRows(answerKey) };
  }

  let droppedCount = 0;

  const extractionRows = (answerKey.extractionRows ?? []).filter((row) => {
    const grounded =
      isSourceQuoteGrounded(row.sourceQuote, sourceText) &&
      isValueInQuote(row.expectedValue, row.sourceQuote ?? "");
    if (!grounded) droppedCount += 1;
    return grounded;
  });

  const groundedAnswerKey: ExpectedTaskAnswers = {
    ...(extractionRows.length > 0 ? { extractionRows } : {}),
  };

  return answerKeyHasChecks(groundedAnswerKey)
    ? { answerKey: groundedAnswerKey, droppedCount }
    : { droppedCount };
}

function assertTypeMix(tasks: GeneratedTask[]) {
  const hasDeterministic = tasks.some(
    (task) =>
      DETERMINISTIC_TYPES.has(task.responseType) &&
      (task.answerKey?.extractionRows?.length ?? 0) > 0,
  );
  const hasFreeResponse = tasks.some((task) => FREE_RESPONSE_TYPES.has(task.responseType));
  if (!hasDeterministic || !hasFreeResponse) {
    throw new Error("Generated assessment must include one keyed extraction task and one free-response task.");
  }
}

function parseJsonContent(content: string): unknown {
  const trimmed = content.trim();
  const fencedMatch = /^```(?:json)?\s*([\s\S]*?)\s*```$/i.exec(trimmed);
  return JSON.parse(fencedMatch?.[1] ?? trimmed) as unknown;
}

function messageContentToString(content: Awaited<ReturnType<typeof invokeLLM>>["choices"][number]["message"]["content"]) {
  if (typeof content === "string") return content;
  return content.map((part) => (part.type === "text" ? part.text : "")).join("\n");
}

function formatBulletList(items: string[]) {
  return items.map((item) => `- ${item}`).join("\n");
}

function formatGroundedExtractionExemplar() {
  return [
    "=== GROUNDED EXTRACTION EXEMPLAR ===",
    "Source snippet:",
    GROUNDED_EXTRACTION_EXEMPLAR.sourceSnippet,
    "",
    "Correct answerKey.extractionRows:",
    JSON.stringify(GROUNDED_EXTRACTION_EXEMPLAR.extractionRows, null, 2),
    "",
    "Why this is correct: each sourceQuote is copied from the snippet and contains the exact digits used by expectedValue.",
  ].join("\n");
}

export function normalizeGeneratedAssessmentOutput(params: {
  rawOutput: unknown;
  sourceText: string;
  model: string;
}): GeneratedAssessmentNormalizationResult {
  const parsed = rawGeneratedAssessmentSchema.parse(params.rawOutput);
  let droppedUngroundedAnswerKeys = 0;

  const tasks = parsed.tasks.map((task, index) => {
    const grounded = filterGroundedAnswerKey(task.answerKey, params.sourceText, task.responseType);
    droppedUngroundedAnswerKeys += grounded.droppedCount;
    const generatedTask = {
      id: `t${index + 1}`,
      responseType: task.responseType,
      title: task.title,
      imperative: task.imperative,
      context: task.context,
      deliverable: task.deliverable,
      prompt: task.prompt,
      aiSuggestions: task.aiSuggestions,
      dataPoints: task.dataPoints ?? [],
      answerKeyStatus: "unverified" as const,
      ...(grounded.answerKey ? { answerKey: grounded.answerKey } : {}),
    };
    return generatedTaskSchema.parse(generatedTask);
  });

  assertTypeMix(tasks);

  const generatedAssessment = generatedAssessmentSchema.parse({
    version: ASSESSMENT_VERSION,
    status: "generated",
    generatedModel: params.model,
    roleTemplateHint: parsed.roleTemplateHint,
    aiBoundary: parsed.aiBoundary,
    generationDiagnostics: { droppedUngroundedAnswerKeys },
    tasks,
  });

  return { generatedAssessment, droppedUngroundedAnswerKeys };
}

function buildSystemPrompt() {
  return `You are an expert finance assessment author for Pine.

Read messy, inconsistent source documents and produce a standardized 60-minute finance assessment.

Rules:
- Produce exactly 3 tasks grounded uniquely in the provided materials.
- Allowed response types: memo, variance, thesis, flags, extraction.
- Include at least one extraction task carrying the deterministic answer key.
- Collectively include at least one free-response response type: memo, variance, or thesis.
- You may use flags where useful, but flags alone do not satisfy the free-response requirement.
- Every task must fill the full AssessmentTask shape: id, responseType, title, imperative, context, deliverable, prompt, aiSuggestions, dataPoints.
- Deterministic checks must only be expressed as answerKey.extractionRows on extraction tasks. Do not emit numerical or reconciliationEntries keys.
- Every extraction row sourceQuote must be copied verbatim from the provided source text and must contain the exact figure used for expectedValue.
- Use units only from: $, $M, $B, %, x, 0/1.
- Set answerKey to null for non-extraction tasks or extraction tasks with no grounded extraction rows.
- Set answerKeyStatus to "unverified" for every task.
- Emit an aiBoundary explaining what Pine AI may explain and what it must not complete for this material.
- Pick roleTemplateHint as the closest of the four supported roles.
- Return valid JSON only.

Response-type selection guide:
- extraction: use when the source has tabular or numeric facts candidates can pull into a table; this is the only generated type that may carry answerKey.extractionRows.
- memo: use when the candidate should synthesize analysis into a client-, board-, or committee-ready written recommendation.
- thesis: use when the candidate should take and defend a clear investment position with supporting evidence and risks.
- variance: use when the source supports driver decomposition, bridge logic, or explaining movement between periods.
- flags: use when the candidate should identify and prioritize risks, anomalies, diligence issues, or red flags.

${formatGroundedExtractionExemplar()}`;
}

function buildUserPrompt(params: {
  campaignTitle: string;
  roleTemplate: RoleTemplate;
  sourceText: string;
}) {
  const roleProfile = ROLE_PROFILES[params.roleTemplate];
  const exemplarTask = ROLE_EXEMPLAR_TASKS[params.roleTemplate];

  return `Campaign: ${params.campaignTitle}
Role template currently selected by recruiter: ${params.roleTemplate}

=== ROLE PROFILE ===
Emphasized response types: ${roleProfile.emphasizedTypes.join(", ")}

Characteristic task archetypes:
${formatBulletList(roleProfile.archetypes)}

What good looks like:
${roleProfile.whatGoodLooksLike}

Gold-standard exemplar task for format, voice, and depth:
${JSON.stringify(exemplarTask, null, 2)}

Use the role profile and exemplar to match rigor and framing, but create new tasks grounded only in the uploaded material below.

Use the source materials below. If a material says it was truncated, only ground answer keys in text that is visible here.

${params.sourceText}`;
}

async function invokeGeneratedAssessment(messages: GenerationMessage[], model: string) {
  const response = await invokeLLM({
    model,
    messages,
    max_tokens: 8192,
    response_format: { type: "json_object" },
  });

  const content = response.choices[0]?.message?.content;
  if (content == null) {
    throw new Error("Assessment generation returned no content.");
  }
  return parseJsonContent(messageContentToString(content));
}

export async function generateAssessmentFromSourceText(params: {
  campaignTitle: string;
  roleTemplate: RoleTemplate;
  sourceText: string;
  model?: string;
}): Promise<GeneratedAssessmentNormalizationResult> {
  const model = params.model ?? ASSESSMENT_GEN_MODEL;
  const baseMessages: GenerationMessage[] = [
    { role: "system", content: buildSystemPrompt() },
    {
      role: "user",
      content: buildUserPrompt({
        campaignTitle: params.campaignTitle,
        roleTemplate: params.roleTemplate,
        sourceText: params.sourceText,
      }),
    },
  ];

  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const messages =
      attempt === 0
        ? baseMessages
        : [
            ...baseMessages,
            {
              role: "user" as const,
              content: `The previous generation failed validation: ${lastError instanceof Error ? lastError.message : String(lastError)}. Return valid JSON only, matching the schema exactly. Use only memo, variance, thesis, flags, or extraction. Ensure there is one keyed extraction task plus one memo/variance/thesis task. Every extraction row sourceQuote must be copied from the source text and contain the exact figure used for expectedValue.`,
            },
          ];
    try {
      const rawOutput = await invokeGeneratedAssessment(messages, model);
      return normalizeGeneratedAssessmentOutput({
        rawOutput,
        sourceText: params.sourceText,
        model,
      });
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Assessment generation failed validation.");
}

export function formatExtractedMaterialsForGeneration(materials: ExtractedSourceMaterial[]) {
  return formatSourceMaterialsForPrompt(materials);
}

export async function generateAssessmentForCampaign(campaignId: number): Promise<GeneratedAssessment> {
  const campaign = await getCampaignById(campaignId);
  if (!campaign) {
    throw new Error(`Campaign ${campaignId} not found.`);
  }

  const sourceMaterials = (campaign.sourceMaterials as SourceMaterial[] | null | undefined) ?? [];
  if (sourceMaterials.length === 0) {
    throw new Error("Campaign has no uploaded source materials.");
  }

  const extractedMaterials = await extractSourceMaterials(sourceMaterials);
  if (!hasExtractedText(extractedMaterials)) {
    const errors = extractedMaterials
      .map((material) => `${material.label}: ${material.extractionError ?? "no extractable text"}`)
      .join("; ");
    throw new Error(`No extractable source material text found. ${errors}`);
  }

  const sourceText = formatExtractedMaterialsForGeneration(extractedMaterials);
  const { generatedAssessment } = await generateAssessmentFromSourceText({
    campaignTitle: campaign.title,
    roleTemplate: campaign.roleTemplate,
    sourceText,
    model: ASSESSMENT_GEN_MODEL,
  });

  await updateCampaign(campaignId, { generatedAssessment });
  return generatedAssessment;
}
