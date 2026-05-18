import { Collection, Db, MongoClient, ObjectId, type Filter } from "mongodb";
import type {
  AiEvent,
  AiUsageEvent,
  Assessment,
  BehaviorEvent,
  Campaign,
  DemoRequest,
  EvaluationScore,
  FeedbackItem,
  InsertAiEvent,
  InsertAiUsageEvent,
  InsertAssessment,
  InsertBehaviorEvent,
  InsertCampaign,
  InsertDemoRequest,
  InsertEvaluationScore,
  InsertFeedbackItem,
  InsertIntelligenceReport,
  InsertPdfReport,
  InsertPolicyEvent,
  InsertScore,
  InsertScoringWeight,
  InsertSubmission,
  InsertTeam,
  InsertUser,
  IntelligenceReport,
  OutcomeMetric,
  PdfReport,
  Playbook,
  PolicyEvent,
  Score,
  ScoringWeight,
  Submission,
  Team,
  User,
} from "@/app/lib/schema";
import { ENV } from "@/app/server/_core/env";

type MongoRecord<T> = T & { _id?: ObjectId };
type CollectionName =
  | "users"
  | "campaigns"
  | "assessments"
  | "submissions"
  | "scores"
  | "pdfReports"
  | "aiUsageEvents"
  | "demoRequests"
  | "teams"
  | "workflows"
  | "aiEvents"
  | "workflowInstances"
  | "outcomeMetrics"
  | "evaluationScores"
  | "policyEvents"
  | "feedbackItems"
  | "playbooks"
  | "intelligenceReports"
  | "scoringWeights"
  | "behaviorEvents";

declare global {
  var __pineMongoClient: MongoClient | undefined;
  var __pineMongoDb: Db | undefined;
  var __pineMongoIndexesReady: Promise<void> | undefined;
}

function mongoUri() {
  return process.env.MONGODB_URI ?? "";
}

function mongoDbName() {
  return process.env.MONGODB_DB ?? process.env.MONGODB_DATABASE ?? "pine_finance";
}

export async function getDb(): Promise<Db | null> {
  const uri = mongoUri();
  if (!uri) return null;

  if (!globalThis.__pineMongoClient) {
    globalThis.__pineMongoClient = new MongoClient(uri);
  }

  if (!globalThis.__pineMongoDb) {
    await globalThis.__pineMongoClient.connect();
    globalThis.__pineMongoDb = globalThis.__pineMongoClient.db(mongoDbName());
  }

  if (!globalThis.__pineMongoIndexesReady) {
    globalThis.__pineMongoIndexesReady = ensureIndexes(globalThis.__pineMongoDb);
  }
  await globalThis.__pineMongoIndexesReady;

  return globalThis.__pineMongoDb;
}

async function ensureIndexes(db: Db) {
  await Promise.all([
    db.collection("counters").createIndex({ _id: 1 }, { unique: true }),
    db.collection("users").createIndex({ id: 1 }, { unique: true }),
    db.collection("users").createIndex({ openId: 1 }, { unique: true }),
    db.collection("campaigns").createIndex({ id: 1 }, { unique: true }),
    db.collection("campaigns").createIndex({ recruiterId: 1, createdAt: -1 }),
    db.collection("assessments").createIndex({ id: 1 }, { unique: true }),
    db.collection("assessments").createIndex({ campaignId: 1, createdAt: -1 }),
    db.collection("assessments").createIndex({ candidateId: 1, createdAt: -1 }),
    db.collection("assessments").createIndex({ inviteToken: 1 }),
    db.collection("assessments").createIndex({ invitedEmail: 1 }),
    db.collection("submissions").createIndex({ id: 1 }, { unique: true }),
    db.collection("submissions").createIndex({ assessmentId: 1 }),
    db.collection("scores").createIndex({ id: 1 }, { unique: true }),
    db.collection("scores").createIndex({ assessmentId: 1 }),
    db.collection("scores").createIndex({ submissionId: 1 }),
    db.collection("pdfReports").createIndex({ id: 1 }, { unique: true }),
    db.collection("pdfReports").createIndex({ assessmentId: 1 }),
    db.collection("aiEvents").createIndex({ id: 1 }, { unique: true }),
    db.collection("aiEvents").createIndex({ eventId: 1 }, { unique: true }),
    db.collection("aiEvents").createIndex({ teamId: 1, timestamp: -1 }),
    db.collection("aiEvents").createIndex({ userId: 1, timestamp: -1 }),
    db.collection("policyEvents").createIndex({ id: 1 }, { unique: true }),
    db.collection("policyEvents").createIndex({ teamId: 1, timestamp: -1 }),
    db.collection("intelligenceReports").createIndex({ id: 1 }, { unique: true }),
    db.collection("feedbackItems").createIndex({ userId: 1, createdAt: -1 }),
  ]);
}

async function col<T>(name: CollectionName): Promise<Collection<MongoRecord<T>> | null> {
  const db = await getDb();
  return db ? db.collection<MongoRecord<T>>(name) : null;
}

function stripId<T>(doc: MongoRecord<T> | null | undefined): T | undefined {
  if (!doc) return undefined;
  const { _id, ...rest } = doc as MongoRecord<T>;
  return rest as T;
}

function stripMany<T>(docs: MongoRecord<T>[]): T[] {
  return docs.map((doc) => stripId<T>(doc)!).filter(Boolean);
}

async function nextId(name: CollectionName) {
  const db = await getDb();
  if (!db) throw new Error("DB unavailable");
  const result = await db.collection<{ _id: string; seq: number }>("counters").findOneAndUpdate(
    { _id: name },
    { $inc: { seq: 1 } },
    { upsert: true, returnDocument: "after" },
  );
  return Number(result?.seq ?? 1);
}

async function insertWithId<T extends { id: number }>(
  name: CollectionName,
  data: Omit<T, "id"> | Partial<T>,
  dateFields: Partial<T> = {},
) {
  const collection = await col<T>(name);
  if (!collection) throw new Error("DB unavailable");
  const now = new Date();
  const id = await nextId(name);
  const doc = {
    ...dateFields,
    ...data,
    id,
    createdAt: (data as { createdAt?: Date }).createdAt ?? now,
    updatedAt: (data as { updatedAt?: Date }).updatedAt ?? now,
  } as unknown as T;
  await collection.insertOne(doc as any);
  return id;
}

function rangeFilter(field: string, from?: Date, to?: Date) {
  const query: Record<string, unknown> = {};
  if (from || to) query[field] = { ...(from ? { $gte: from } : {}), ...(to ? { $lte: to } : {}) };
  return query;
}

function toNumber(value: unknown) {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
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

function avg(values: unknown[]) {
  const nums = values.map(toNumber).filter((n) => Number.isFinite(n));
  return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0;
}

export async function getUserById(id: number) {
  const users = await col<User>("users");
  return stripId<User>(await users?.findOne({ id } as Filter<MongoRecord<User>>));
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const users = await col<User>("users");
  if (!users) return;

  const existing = await users.findOne({ openId: user.openId });
  const now = new Date();
  const role = user.role ?? (user.openId === ENV.ownerOpenId ? "admin" : undefined);

  if (!existing) {
    const id = await nextId("users");
    await users.insertOne({
      id,
      openId: user.openId,
      name: user.name ?? null,
      email: user.email ?? null,
      loginMethod: user.loginMethod ?? null,
      role: role ?? "user",
      onboardingCompleted: user.onboardingCompleted ?? false,
      organization: user.organization ?? null,
      createdAt: now,
      updatedAt: now,
      lastSignedIn: user.lastSignedIn ?? now,
      financeRole: user.financeRole ?? "analyst",
      teamId: user.teamId ?? null,
    });
    return;
  }

  await users.updateOne(
    { openId: user.openId },
    {
      $set: {
        ...(user.name !== undefined ? { name: user.name } : {}),
        ...(user.email !== undefined ? { email: user.email } : {}),
        ...(user.loginMethod !== undefined ? { loginMethod: user.loginMethod } : {}),
        ...(role ? { role } : {}),
        ...(user.organization !== undefined ? { organization: user.organization } : {}),
        ...(user.onboardingCompleted !== undefined ? { onboardingCompleted: user.onboardingCompleted } : {}),
        ...(user.financeRole !== undefined ? { financeRole: user.financeRole } : {}),
        ...(user.teamId !== undefined ? { teamId: user.teamId } : {}),
        lastSignedIn: user.lastSignedIn ?? now,
        updatedAt: now,
      },
    },
  );
}

export async function getUserByOpenId(openId: string) {
  const users = await col<User>("users");
  return stripId<User>(await users?.findOne({ openId } as Filter<MongoRecord<User>>));
}

export async function updateUserRole(userId: number, role: "recruiter" | "candidate" | "manager", organization?: string) {
  const users = await col<User>("users");
  await users?.updateOne({ id: userId }, { $set: { role, onboardingCompleted: true, organization: organization ?? null, updatedAt: new Date() } });
}

export async function createCampaign(data: InsertCampaign): Promise<number> {
  return insertWithId<Campaign>("campaigns", Object.assign({ status: "active", timeLimitMinutes: 60, autoScore: true }, data));
}

export async function getCampaignsByRecruiter(recruiterId: number): Promise<Campaign[]> {
  const campaigns = await col<Campaign>("campaigns");
  return stripMany(await campaigns?.find({ recruiterId }).sort({ createdAt: -1 }).toArray() ?? []);
}

export async function getCampaignById(id: number): Promise<Campaign | undefined> {
  const campaigns = await col<Campaign>("campaigns");
  return stripId<Campaign>(await campaigns?.findOne({ id }));
}

export async function updateCampaign(id: number, data: Partial<InsertCampaign>) {
  const campaigns = await col<Campaign>("campaigns");
  await campaigns?.updateOne({ id }, { $set: { ...data, updatedAt: new Date() } });
}

export async function deleteCampaign(id: number) {
  const campaigns = await col<Campaign>("campaigns");
  await campaigns?.deleteOne({ id });
}

export async function createAssessment(data: InsertAssessment): Promise<number> {
  return insertWithId<Assessment>("assessments", Object.assign({ status: "invited", timeLimitMinutes: 60 }, data));
}

export async function getAssessmentById(id: number): Promise<Assessment | undefined> {
  const assessments = await col<Assessment>("assessments");
  return stripId<Assessment>(await assessments?.findOne({ id }));
}

export async function getAssessmentsByCampaign(campaignId: number) {
  const assessments = stripMany(await (await col<Assessment>("assessments"))?.find({ campaignId }).sort({ createdAt: -1 }).toArray() ?? []);
  return Promise.all(assessments.map(async (assessment) => ({
    assessment,
    candidate: assessment.candidateId ? (await getUserById(assessment.candidateId)) ?? null : null,
  })));
}

export async function getAssessmentWithCampaign(id: number) {
  const assessment = await getAssessmentById(id);
  if (!assessment) return undefined;
  return { assessment, campaign: await getCampaignById(assessment.campaignId) ?? null };
}

export async function getAssessmentsByCandidate(candidateId: number) {
  const assessments = stripMany(await (await col<Assessment>("assessments"))?.find({ candidateId }).sort({ createdAt: -1 }).toArray() ?? []);
  return Promise.all(assessments.map(async (assessment) => ({
    assessment,
    campaign: await getCampaignById(assessment.campaignId) ?? null,
  })));
}

export async function updateAssessmentStatus(id: number, status: Assessment["status"], extra?: Partial<InsertAssessment>) {
  const assessments = await col<Assessment>("assessments");
  await assessments?.updateOne({ id }, { $set: { status, ...extra, updatedAt: new Date() } });
}

export async function getAssessmentByToken(token: string): Promise<Assessment | undefined> {
  const assessments = await col<Assessment>("assessments");
  return stripId<Assessment>(await assessments?.findOne({ inviteToken: token }));
}

export async function linkAssessmentToCandidate(assessmentId: number, candidateId: number): Promise<void> {
  const assessments = await col<Assessment>("assessments");
  await assessments?.updateOne({ id: assessmentId }, { $set: { candidateId, updatedAt: new Date() } });
}

export async function getAssessmentsByEmail(email: string) {
  const assessments = stripMany(await (await col<Assessment>("assessments"))?.find({ invitedEmail: email }).sort({ createdAt: -1 }).toArray() ?? []);
  return Promise.all(assessments.map(async (assessment) => ({
    assessment,
    campaign: await getCampaignById(assessment.campaignId) ?? null,
  })));
}

export async function createSubmission(data: InsertSubmission): Promise<number> {
  return insertWithId<Submission>("submissions", data);
}

export async function getSubmissionById(id: number): Promise<Submission | undefined> {
  const submissions = await col<Submission>("submissions");
  return stripId<Submission>(await submissions?.findOne({ id }));
}

export async function getSubmissionByAssessment(assessmentId: number): Promise<Submission | undefined> {
  const submissions = await col<Submission>("submissions");
  return stripId<Submission>(await submissions?.findOne({ assessmentId }));
}

export async function createScore(data: InsertScore): Promise<number> {
  return insertWithId<Score>("scores", data);
}

export async function getScoreBySubmission(submissionId: number): Promise<Score | undefined> {
  const scores = await col<Score>("scores");
  return stripId<Score>(await scores?.findOne({ submissionId }));
}

export async function getScoreByAssessment(assessmentId: number): Promise<Score | undefined> {
  const scores = await col<Score>("scores");
  return stripId<Score>(await scores?.findOne({ assessmentId }));
}

export async function getCandidatesFullStatus(campaignId: number) {
  const rows = await getAssessmentsByCampaign(campaignId);
  return Promise.all(rows.map(async (row) => ({
    ...row,
    submission: await getSubmissionByAssessment(row.assessment.id) ?? null,
    score: await getScoreByAssessment(row.assessment.id) ?? null,
  })));
}

export async function getScoresByCampaign(campaignId: number) {
  const assessments = stripMany(await (await col<Assessment>("assessments"))?.find({ campaignId }).toArray() ?? []);
  const rows = await Promise.all(assessments.map(async (assessment) => {
    const score = await getScoreByAssessment(assessment.id);
    if (!score) return null;
    return {
      score,
      assessment,
      candidate: assessment.candidateId ? await getUserById(assessment.candidateId) ?? null : null,
    };
  }));
  return rows.filter(Boolean).sort((a, b) => toNumber(b!.score.overallScore) - toNumber(a!.score.overallScore));
}

export async function createPdfReport(data: InsertPdfReport): Promise<number> {
  const pdfReports = await col<PdfReport>("pdfReports");
  if (!pdfReports) throw new Error("DB unavailable");
  const id = await nextId("pdfReports");
  await pdfReports.insertOne({ ...data, id, generatedAt: new Date() });
  return id;
}

export async function getPdfReportByAssessment(assessmentId: number): Promise<PdfReport | undefined> {
  const pdfReports = await col<PdfReport>("pdfReports");
  return stripId<PdfReport>(await pdfReports?.findOne({ assessmentId }));
}

export async function logAiUsageEvent(data: InsertAiUsageEvent): Promise<void> {
  await insertWithId<AiUsageEvent>("aiUsageEvents", data);
}

export async function getAiUsageByUser(userId: number, limit = 100): Promise<AiUsageEvent[]> {
  const events = await col<AiUsageEvent>("aiUsageEvents");
  return stripMany(await events?.find({ userId }).sort({ createdAt: -1 }).limit(limit).toArray() ?? []);
}

export async function getTeamAiUsageStats() {
  const events = stripMany(await (await col<AiUsageEvent>("aiUsageEvents"))?.find().toArray() ?? []);
  const grouped = countBy(events, (e) => e.userId);
  return Promise.all(grouped.map(async ({ value, count }) => {
    const userEvents = events.filter((e) => String(e.userId) === value);
    const user = await getUserById(Number(value));
    return {
      userId: Number(value),
      userName: user?.name ?? null,
      eventCount: count,
      avgQuality: avg(userEvents.map((e) => e.qualityScore)),
      totalDuration: userEvents.reduce((sum, e) => sum + toNumber(e.durationMs), 0),
    };
  }));
}

export async function createDemoRequest(data: InsertDemoRequest): Promise<void> {
  await insertWithId<DemoRequest>("demoRequests", data);
}

export async function getAllCandidatesForRecruiter(recruiterId: number) {
  const recruiterCampaigns = await getCampaignsByRecruiter(recruiterId);
  const campaignIds = new Set(recruiterCampaigns.map((c) => c.id));
  const assessments = stripMany(await (await col<Assessment>("assessments"))?.find({ campaignId: { $in: [...campaignIds] } }).sort({ createdAt: -1 }).toArray() ?? []);
  return Promise.all(assessments.map(async (assessment) => ({
    assessment,
    campaign: recruiterCampaigns.find((c) => c.id === assessment.campaignId) ?? null,
    score: await getScoreByAssessment(assessment.id) ?? null,
    candidate: assessment.candidateId ? await getUserById(assessment.candidateId) ?? null : null,
  })));
}

export async function getAllReportsForRecruiter(recruiterId: number) {
  const recruiterCampaigns = await getCampaignsByRecruiter(recruiterId);
  const campaignIds = new Set(recruiterCampaigns.map((c) => c.id));
  const assessments = stripMany(await (await col<Assessment>("assessments"))?.find({ campaignId: { $in: [...campaignIds] } }).toArray() ?? []);
  const assessmentById = new Map(assessments.map((a) => [a.id, a]));
  const reports = stripMany(await (await col<PdfReport>("pdfReports"))?.find({ assessmentId: { $in: assessments.map((a) => a.id) } }).sort({ generatedAt: -1 }).toArray() ?? []);
  return reports.map((report) => {
    const assessment = assessmentById.get(report.assessmentId) ?? null;
    return {
      report,
      assessment,
      campaign: assessment ? recruiterCampaigns.find((c) => c.id === assessment.campaignId) ?? null : null,
    };
  });
}

export async function getTeamMembers() {
  const users = await col<User>("users");
  return stripMany(await users?.find({ role: { $in: ["candidate", "recruiter", "manager"] } }).sort({ lastSignedIn: -1 }).toArray() ?? []);
}

export async function getCandidateScoreSummary(candidateId: number) {
  const rows = await getAssessmentsByCandidate(candidateId);
  return Promise.all(rows.map(async (row) => ({
    ...row,
    score: await getScoreByAssessment(row.assessment.id) ?? null,
    pdf: await getPdfReportByAssessment(row.assessment.id) ?? null,
  })));
}

export async function getAllCandidatesForManager() {
  const assessments = stripMany(await (await col<Assessment>("assessments"))?.find().sort({ createdAt: -1 }).toArray() ?? []);
  return Promise.all(assessments.map(async (assessment) => ({
    assessment,
    campaign: await getCampaignById(assessment.campaignId) ?? null,
    score: await getScoreByAssessment(assessment.id) ?? null,
    candidate: assessment.candidateId ? await getUserById(assessment.candidateId) ?? null : null,
  })));
}

export async function getAllTeams() {
  const teams = await col<Team>("teams");
  return stripMany(await teams?.find().sort({ name: 1 }).toArray() ?? []);
}

export async function getTeamById(id: number) {
  const teams = await col<Team>("teams");
  return stripId<Team>(await teams?.findOne({ id }));
}

export async function createTeam(data: InsertTeam) {
  await insertWithId<Team>("teams", Object.assign({ department: "other" }, data));
}

export async function getUsersByTeam(teamId: number) {
  const users = await col<User>("users");
  return stripMany(await users?.find({ teamId }).toArray() ?? []);
}

export async function getAllUsers() {
  const users = await col<User>("users");
  return stripMany(await users?.find().sort({ name: 1 }).toArray() ?? []);
}

export async function updateUserFinanceRole(userId: number, financeRole: User["financeRole"], teamId?: number) {
  const users = await col<User>("users");
  await users?.updateOne({ id: userId }, { $set: { financeRole, ...(teamId !== undefined ? { teamId } : {}), updatedAt: new Date() } });
}

export async function logAiEvent(data: InsertAiEvent) {
  const event = Object.assign({
    workflowType: "other",
    toolName: "internal_llm",
    sourceApplication: "other",
    actionType: "prompted",
    durationSeconds: 0,
    complexityScore: 5,
    outputAccepted: false,
    outputEdited: false,
    humanApprovalRequired: false,
    humanApprovalGiven: false,
    policyStatus: "compliant",
    timestamp: new Date(),
  }, data);
  await insertWithId<AiEvent>("aiEvents", event);
}

export async function getAiEvents(filters?: {
  userId?: number;
  teamId?: number;
  workflowType?: string;
  from?: Date;
  to?: Date;
  limit?: number;
}) {
  const query: Filter<MongoRecord<AiEvent>> = {
    ...(filters?.userId ? { userId: filters.userId } : {}),
    ...(filters?.teamId ? { teamId: filters.teamId } : {}),
    ...(filters?.workflowType ? { workflowType: filters.workflowType } : {}),
    ...rangeFilter("timestamp", filters?.from, filters?.to),
  };
  const events = await col<AiEvent>("aiEvents");
  return stripMany(await events?.find(query).sort({ timestamp: -1 }).limit(filters?.limit ?? 200).toArray() ?? []);
}

export async function getAiEventStats(from: Date, to: Date) {
  const events = await getAiEvents({ from, to, limit: 100_000 });
  const workflowBreakdown = countBy(events, (e) => e.workflowType).map(({ value, count }) => ({ workflowType: value, count }));
  const toolBreakdown = countBy(events, (e) => e.toolName).map(({ value, count }) => ({ toolName: value, count }));
  return {
    totalEvents: events.length,
    activeUsers: new Set(events.map((e) => e.userId)).size,
    violations: events.filter((e) => e.policyStatus === "violation").length,
    workflowBreakdown,
    toolBreakdown,
  };
}

export async function getOutcomeMetrics(filters?: { teamId?: number; userId?: number; workflowType?: string; from?: Date; to?: Date }) {
  const metrics = await col<OutcomeMetric>("outcomeMetrics");
  return stripMany(await metrics?.find({
    ...(filters?.teamId ? { teamId: filters.teamId } : {}),
    ...(filters?.userId ? { userId: filters.userId } : {}),
    ...(filters?.workflowType ? { workflowType: filters.workflowType } : {}),
    ...rangeFilter("periodStart", filters?.from),
    ...rangeFilter("periodEnd", undefined, filters?.to),
  }).sort({ periodEnd: -1 }).toArray() ?? []);
}

export async function getScoringWeights() {
  const weights = await col<ScoringWeight>("scoringWeights");
  let result = stripId<ScoringWeight>(await weights?.findOne({ id: 1 }));
  if (!result && weights) {
    result = {
      id: 1,
      adoptionWeight: 15,
      efficiencyWeight: 20,
      qualityWeight: 20,
      judgmentWeight: 20,
      governanceWeight: 15,
      businessImpactWeight: 10,
      updatedAt: new Date(),
    };
    await weights.insertOne(result);
  }
  return result;
}

export async function updateScoringWeights(weights: InsertScoringWeight) {
  const collection = await col<ScoringWeight>("scoringWeights");
  await collection?.updateOne({ id: 1 }, { $set: { ...weights, updatedAt: new Date() } }, { upsert: true });
}

export async function upsertEvaluationScore(data: InsertEvaluationScore) {
  await insertWithId<EvaluationScore>("evaluationScores", data);
}

export async function getEvaluationScores(filters?: { userId?: number; teamId?: number; from?: Date; to?: Date }) {
  const scores = await col<EvaluationScore>("evaluationScores");
  return stripMany(await scores?.find({
    ...(filters?.userId ? { userId: filters.userId } : {}),
    ...(filters?.teamId ? { teamId: filters.teamId } : {}),
    ...rangeFilter("periodStart", filters?.from),
    ...rangeFilter("periodEnd", undefined, filters?.to),
  }).sort({ periodEnd: -1 }).toArray() ?? []);
}

export async function logPolicyEvent(data: InsertPolicyEvent) {
  const event = Object.assign({
    type: "policy_breach",
    severity: "medium",
    resolved: false,
    notifiedComplianceLead: false,
    timestamp: new Date(),
  }, data);
  await insertWithId<PolicyEvent>("policyEvents", event);
}

export async function getPolicyEvents(filters?: { teamId?: number; resolved?: boolean; severity?: string; from?: Date; to?: Date; limit?: number; skip?: number }) {
  const events = await col<PolicyEvent>("policyEvents");
  return stripMany(await events?.find({
    ...(filters?.teamId ? { teamId: filters.teamId } : {}),
    ...(filters?.resolved !== undefined ? { resolved: filters.resolved } : {}),
    ...(filters?.severity ? { severity: filters.severity } : {}),
    ...rangeFilter("timestamp", filters?.from, filters?.to),
  } as Filter<MongoRecord<PolicyEvent>>).sort({ timestamp: -1 }).skip(filters?.skip ?? 0).limit(filters?.limit ?? 200).toArray() ?? []);
}

export async function countPolicyEvents(filters?: { teamId?: number; resolved?: boolean; severity?: string; from?: Date; to?: Date }) {
  const events = await col<PolicyEvent>("policyEvents");
  return events?.countDocuments({
    ...(filters?.teamId ? { teamId: filters.teamId } : {}),
    ...(filters?.resolved !== undefined ? { resolved: filters.resolved } : {}),
    ...(filters?.severity ? { severity: filters.severity } : {}),
    ...rangeFilter("timestamp", filters?.from, filters?.to),
  } as Filter<MongoRecord<PolicyEvent>>) ?? 0;
}

export async function resolvePolicyEvent(id: number, resolvedById: number) {
  const events = await col<PolicyEvent>("policyEvents");
  await events?.updateOne({ id }, { $set: { resolved: true, resolvedAt: new Date(), resolvedById, updatedAt: new Date() } });
}

export async function updatePolicyEventStatus(id: number, resolved: boolean, resolvedById: number) {
  const events = await col<PolicyEvent>("policyEvents");
  await events?.updateOne({ id }, { $set: { resolved, resolvedAt: resolved ? new Date() : null, resolvedById, updatedAt: new Date() } });
}

export async function getFeedbackItems(filters?: { userId?: number; teamId?: number }) {
  const items = await col<FeedbackItem>("feedbackItems");
  return stripMany(await items?.find({
    ...(filters?.userId ? { userId: filters.userId } : {}),
    ...(filters?.teamId ? { teamId: filters.teamId } : {}),
  }).sort({ createdAt: -1 }).toArray() ?? []);
}

export async function createFeedbackItem(data: InsertFeedbackItem) {
  await insertWithId<FeedbackItem>("feedbackItems", Object.assign({ type: "nudge", isRead: false }, data));
}

export async function markFeedbackRead(id: number) {
  const items = await col<FeedbackItem>("feedbackItems");
  await items?.updateOne({ id }, { $set: { isRead: true, updatedAt: new Date() } });
}

export async function updateFeedbackNarrative(id: number, llmNarrative: string) {
  const items = await col<FeedbackItem>("feedbackItems");
  await items?.updateOne({ id }, { $set: { llmNarrative, updatedAt: new Date() } });
}

export async function getAllPlaybooks() {
  const playbooks = await col<Playbook>("playbooks");
  return stripMany(await playbooks?.find().sort({ workflowType: 1 }).toArray() ?? []);
}

export async function getPlaybooksByWorkflow(workflowType: string) {
  const playbooks = await col<Playbook>("playbooks");
  return stripMany(await playbooks?.find({ workflowType }).toArray() ?? []);
}

export async function createIntelligenceReport(data: InsertIntelligenceReport) {
  return insertWithId<IntelligenceReport>("intelligenceReports", Object.assign({ status: "draft" }, data));
}

export async function getIntelligenceReports(filters?: { type?: string; targetId?: number; targetType?: string; limit?: number }) {
  const reports = await col<IntelligenceReport>("intelligenceReports");
  return stripMany(await reports?.find({
    ...(filters?.targetId ? { targetId: filters.targetId } : {}),
    ...(filters?.targetType ? { targetType: filters.targetType } : {}),
    ...(filters?.type ? { type: filters.type } : {}),
  } as Filter<MongoRecord<IntelligenceReport>>).sort({ createdAt: -1 }).limit(filters?.limit ?? 100).toArray() ?? []);
}

export async function getIntelligenceReportById(id: number) {
  const reports = await col<IntelligenceReport>("intelligenceReports");
  return stripId<IntelligenceReport>(await reports?.findOne({ id }));
}

export async function updateIntelligenceReport(id: number, data: Partial<InsertIntelligenceReport>) {
  const reports = await col<IntelligenceReport>("intelligenceReports");
  await reports?.updateOne({ id }, { $set: { ...data, updatedAt: new Date() } });
}

export async function getWorkflowInstances(filters?: { teamId?: number; userId?: number }) {
  const instances = await col<unknown>("workflowInstances");
  return stripMany(await instances?.find({
    ...(filters?.teamId ? { teamId: filters.teamId } : {}),
    ...(filters?.userId ? { userId: filters.userId } : {}),
  }).sort({ startedAt: -1 }).limit(500).toArray() ?? []);
}

export async function getAssessmentHistoryForCandidate(candidateId: number) {
  const assessments = stripMany(await (await col<Assessment>("assessments"))?.find({
    candidateId,
    status: { $in: ["submitted", "scored"] },
  }).sort({ createdAt: -1 }).toArray() ?? []);
  const rows = await Promise.all(assessments.map(async (assessment) => {
    const submission = await getSubmissionByAssessment(assessment.id) ?? null;
    const campaign = await getCampaignById(assessment.campaignId);
    if (!campaign) return null;
    return {
      assessment,
      campaign,
      submission,
      score: submission ? await getScoreByAssessment(assessment.id) ?? null : null,
    };
  }));
  return rows.filter((row): row is NonNullable<typeof row> => row !== null);
}

export async function getAssessmentSubmissionDetail(assessmentId: number, requestingUserId: number, bypassOwnership = false) {
  const assessment = await getAssessmentById(assessmentId);
  if (!assessment) return null;
  if (!bypassOwnership && assessment.candidateId !== requestingUserId) return null;
  const submission = await getSubmissionByAssessment(assessmentId) ?? null;
  return {
    assessment,
    campaign: await getCampaignById(assessment.campaignId) ?? null,
    submission,
    score: submission ? await getScoreByAssessment(assessmentId) ?? null : null,
  };
}

export async function bulkInsertBehaviorEvents(events: InsertBehaviorEvent[]): Promise<void> {
  if (!events.length) return;
  const collection = await col<BehaviorEvent>("behaviorEvents");
  if (!collection) return;
  const now = new Date();
  const docs = await Promise.all(events.map(async (event) => ({
    ...event,
    id: await nextId("behaviorEvents"),
    createdAt: now,
    updatedAt: now,
  })));
  await collection.insertMany(docs);
}

export async function getFinanceDashboardData(from: Date, to: Date) {
  const [events, users, metrics, scores, openViolations] = await Promise.all([
    getAiEvents({ from, to, limit: 100_000 }),
    getAllUsers(),
    getOutcomeMetrics({ from, to }),
    getEvaluationScores({ from, to }),
    countPolicyEvents({ resolved: false }),
  ]);
  const weeklyActiveUsers = new Set((await getAiEvents({ from: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), to, limit: 100_000 })).map((e) => e.userId)).size;
  const workflowPenetration = countBy(events, (e) => e.workflowType).map(({ value, count }) => ({
    workflowType: value,
    count,
    uniqueUsers: new Set(events.filter((e) => e.workflowType === value).map((e) => e.userId)).size,
  }));
  const workflowEfficiency = countBy(metrics, (m) => m.workflowType).map(({ value }) => {
    const rows = metrics.filter((m) => m.workflowType === value);
    return { workflowType: value, avgHoursSaved: avg(rows.map((m) => m.hoursSaved)), avgTouchless: avg(rows.map((m) => m.touchlessRate)) };
  }).sort((a, b) => b.avgHoursSaved - a.avgHoursSaved);
  const hoursSaved = metrics.reduce((sum, m) => sum + toNumber(m.hoursSaved), 0);
  const avgCycleTime = avg(metrics.map((m) => m.avgCycleTimeSeconds));
  const avgBaseline = avg(metrics.map((m) => m.baselineCycleTimeSeconds));
  const violations = events.filter((e) => e.policyStatus === "violation").length;
  return {
    weeklyActiveUsers,
    totalUsers: users.length,
    events,
    workflowPenetration,
    workflowEfficiency,
    hoursSaved,
    touchlessRate: avg(metrics.map((m) => m.touchlessRate)),
    errorRate: avg(metrics.map((m) => m.errorRate)),
    cycleTimeImprovement: avgBaseline > 0 ? ((avgBaseline - avgCycleTime) / avgBaseline) * 100 : 0,
    governanceScore: events.length > 0 ? Math.round(((events.length - violations) / events.length) * 100) : 100,
    compositeScore: avg(scores.map((s) => s.compositeScore)),
    openViolations,
  };
}
