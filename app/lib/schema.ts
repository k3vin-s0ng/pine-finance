export type UserRole = "user" | "admin" | "recruiter" | "candidate" | "manager";
export type FinanceRole = "analyst" | "manager" | "executive" | "compliance_lead" | "admin";

export type BaseRecord = {
  id: number;
  createdAt: Date;
  updatedAt: Date;
};

export type User = BaseRecord & {
  openId: string;
  name?: string | null;
  email?: string | null;
  loginMethod?: string | null;
  role: UserRole;
  onboardingCompleted: boolean;
  organization?: string | null;
  lastSignedIn: Date;
  financeRole: FinanceRole;
  teamId?: number | null;
};
export type InsertUser = Partial<Omit<User, "id" | "createdAt" | "updatedAt">> & { openId: string };

export type RoleTemplate = "IB Analyst" | "FP&A Analyst" | "PE Associate" | "Hedge Fund Research Analyst";
export type SourceMaterial = { label: string; fileKey: string; url: string; mimeType: string; sizeBytes: number };

export type Campaign = BaseRecord & {
  recruiterId: number;
  title: string;
  roleTemplate: RoleTemplate;
  description?: string | null;
  status: "draft" | "active" | "closed";
  timeLimitMinutes: number;
  settings?: unknown;
  autoScore: boolean;
  sourceMaterials?: SourceMaterial[] | null;
};
export type InsertCampaign = Omit<Campaign, "id" | "createdAt" | "updatedAt" | "status" | "timeLimitMinutes" | "autoScore"> &
  Partial<Pick<Campaign, "status" | "timeLimitMinutes" | "autoScore">>;

export type Assessment = BaseRecord & {
  campaignId: number;
  candidateId: number;
  status: "invited" | "in_progress" | "submitted" | "scored";
  startedAt?: Date | null;
  submittedAt?: Date | null;
  timeLimitMinutes: number;
  inviteToken?: string | null;
  invitedEmail?: string | null;
};
export type InsertAssessment = Omit<Assessment, "id" | "createdAt" | "updatedAt" | "status" | "timeLimitMinutes"> &
  Partial<Pick<Assessment, "status" | "timeLimitMinutes">>;

export type Submission = BaseRecord & {
  assessmentId: number;
  taskResponses?: unknown;
  taskResponsesStructured?: unknown;
  aiInteractions?: unknown;
  fileRefs?: unknown;
  wordCount?: number | null;
  completionTimeSeconds?: number | null;
};
export type InsertSubmission = Omit<Submission, "id" | "createdAt" | "updatedAt">;

export type ScoreEvidence = {
  accuracyChecks?: unknown;
  efficiencyBand?: unknown;
  behavioral?: {
    summary?: unknown;
    judgment?: unknown;
    verification?: unknown;
    toolFluency?: unknown;
  };
  blend?: unknown;
};

export type Score = BaseRecord & {
  submissionId: number;
  assessmentId: number;
  accuracy: number | null;
  efficiency: number | null;
  judgment: number | null;
  verification: number | null;
  communication: number | null;
  toolFluency: number | null;
  overallScore: number | null;
  benchmarkPercentile: number | null;
  accuracyRationale: string | null;
  efficiencyRationale: string | null;
  judgmentRationale: string | null;
  verificationRationale: string | null;
  communicationRationale: string | null;
  toolFluencyRationale: string | null;
  recruiterSummary: string | null;
  strengths: unknown;
  improvements: unknown;
  scoreEvidence?: ScoreEvidence | null;
};
export type InsertScore = Omit<Score, "id" | "createdAt" | "updatedAt">;

export type PdfReport = {
  id: number;
  submissionId: number;
  assessmentId: number;
  storageKey?: string | null;
  url?: string | null;
  generatedAt: Date;
};
export type InsertPdfReport = Omit<PdfReport, "id" | "generatedAt">;

export type DemoRequest = BaseRecord & {
  name: string;
  email: string;
  company?: string | null;
  role?: string | null;
  segment?: string | null;
  message?: string | null;
};
export type InsertDemoRequest = Omit<DemoRequest, "id" | "createdAt" | "updatedAt">;

export type Team = BaseRecord & {
  name: string;
  department: "ap" | "ar" | "fpa" | "close" | "reporting" | "other";
  managerId?: number | null;
};
export type InsertTeam = Omit<Team, "id" | "createdAt" | "updatedAt" | "department"> & Partial<Pick<Team, "department">>;

export type BehaviorEvent = BaseRecord & {
  assessmentId: number;
  taskId?: string | null;
  eventType: string;
  eventData?: unknown;
  clientTimestamp: number;
};
export type InsertBehaviorEvent = Omit<BehaviorEvent, "id" | "createdAt" | "updatedAt">;
