import { Collection, Db, MongoClient, ObjectId, type Filter, type OptionalUnlessRequiredId } from "mongodb";
import type {
  Assessment,
  BehaviorEvent,
  Campaign,
  DemoRequest,
  InsertAssessment,
  InsertBehaviorEvent,
  InsertCampaign,
  InsertDemoRequest,
  InsertPdfReport,
  InsertScore,
  InsertSubmission,
  InsertTeam,
  InsertUser,
  PdfReport,
  Score,
  SourceMaterial,
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
  | "demoRequests"
  | "teams"
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
    db.collection("behaviorEvents").createIndex({ id: 1 }, { unique: true }),
    db.collection("behaviorEvents").createIndex({ assessmentId: 1, clientTimestamp: 1 }),
  ]);
}

async function col<T>(name: CollectionName): Promise<Collection<MongoRecord<T>> | null> {
  const db = await getDb();
  return db ? db.collection<MongoRecord<T>>(name) : null;
}

function stripId<T>(doc: MongoRecord<T> | null | undefined): T | undefined {
  if (!doc) return undefined;
  const { _id: _mongoId, ...rest } = doc as MongoRecord<T>;
  void _mongoId;
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
  await collection.insertOne(doc as OptionalUnlessRequiredId<MongoRecord<T>>);
  return id;
}

function toNumber(value: unknown) {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
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

export async function updateUserRole(userId: number, role: "recruiter" | "candidate", organization?: string) {
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

export async function getCampaignDeletionStorageKeys(id: number): Promise<string[]> {
  const campaign = await getCampaignById(id);
  if (!campaign) return [];
  const assessments = stripMany(await (await col<Assessment>("assessments"))?.find({ campaignId: id }).toArray() ?? []);
  const assessmentIds = assessments.map((assessment) => assessment.id);
  const pdfReports = stripMany(await (await col<PdfReport>("pdfReports"))?.find({ assessmentId: { $in: assessmentIds } }).toArray() ?? []);
  const sourceMaterials = (campaign.sourceMaterials as SourceMaterial[] | null | undefined) ?? [];
  return Array.from(new Set([
    ...sourceMaterials.map((material) => material.fileKey).filter(Boolean),
    ...pdfReports.map((report) => report.storageKey).filter((key): key is string => Boolean(key)),
  ]));
}

export async function deleteCampaignAndRelatedData(id: number) {
  const campaigns = await col<Campaign>("campaigns");
  const assessments = await col<Assessment>("assessments");
  const submissions = await col<Submission>("submissions");
  const scores = await col<Score>("scores");
  const pdfReports = await col<PdfReport>("pdfReports");
  const behaviorEvents = await col<BehaviorEvent>("behaviorEvents");
  if (!campaigns || !assessments || !submissions || !scores || !pdfReports || !behaviorEvents) {
    throw new Error("DB unavailable");
  }

  const assessmentIds = stripMany(await assessments.find({ campaignId: id }).toArray()).map((assessment) => assessment.id);
  await Promise.all([
    scores.deleteMany({ assessmentId: { $in: assessmentIds } }),
    submissions.deleteMany({ assessmentId: { $in: assessmentIds } }),
    pdfReports.deleteMany({ assessmentId: { $in: assessmentIds } }),
    behaviorEvents.deleteMany({ assessmentId: { $in: assessmentIds } }),
    assessments.deleteMany({ campaignId: id }),
    campaigns.deleteOne({ id }),
  ]);
}

export async function getAssessmentDeletionStorageKeys(assessmentId: number): Promise<string[]> {
  const pdfReports = stripMany(await (await col<PdfReport>("pdfReports"))?.find({ assessmentId }).toArray() ?? []);
  return Array.from(new Set(
    pdfReports.map((report) => report.storageKey).filter((key): key is string => Boolean(key)),
  ));
}

export async function deleteAssessmentAndRelatedData(assessmentId: number) {
  const assessments = await col<Assessment>("assessments");
  const submissions = await col<Submission>("submissions");
  const scores = await col<Score>("scores");
  const pdfReports = await col<PdfReport>("pdfReports");
  const behaviorEvents = await col<BehaviorEvent>("behaviorEvents");
  if (!assessments || !submissions || !scores || !pdfReports || !behaviorEvents) {
    throw new Error("DB unavailable");
  }

  await Promise.all([
    scores.deleteMany({ assessmentId }),
    submissions.deleteMany({ assessmentId }),
    pdfReports.deleteMany({ assessmentId }),
    behaviorEvents.deleteMany({ assessmentId }),
    assessments.deleteOne({ id: assessmentId }),
  ]);
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
  const rows = await Promise.all(assessments.map(async (assessment) => {
    const campaign = await getCampaignById(assessment.campaignId);
    return campaign ? { assessment, campaign } : null;
  }));
  return rows.filter((row): row is NonNullable<typeof row> => row !== null);
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
  const rows = await Promise.all(assessments.map(async (assessment) => {
    const campaign = await getCampaignById(assessment.campaignId);
    return campaign ? { assessment, campaign } : null;
  }));
  return rows.filter((row): row is NonNullable<typeof row> => row !== null);
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

export async function getCandidateScoreSummary(candidateId: number) {
  const rows = await getAssessmentsByCandidate(candidateId);
  return Promise.all(rows.map(async (row) => ({
    ...row,
    score: await getScoreByAssessment(row.assessment.id) ?? null,
    pdf: await getPdfReportByAssessment(row.assessment.id) ?? null,
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

export async function getBehaviorEventsByAssessment(assessmentId: number): Promise<BehaviorEvent[]> {
  const collection = await col<BehaviorEvent>("behaviorEvents");
  return stripMany(
    await collection?.find({ assessmentId }).sort({ clientTimestamp: 1, id: 1 }).toArray() ?? [],
  );
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
