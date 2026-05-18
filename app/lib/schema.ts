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
  aiInteractions?: unknown;
  fileRefs?: unknown;
  wordCount?: number | null;
  completionTimeSeconds?: number | null;
};
export type InsertSubmission = Omit<Submission, "id" | "createdAt" | "updatedAt">;

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

export type AiUsageEvent = BaseRecord & {
  userId: number;
  eventType: string;
  workflow?: string | null;
  tool?: string | null;
  promptLength?: number | null;
  responseLength?: number | null;
  durationMs?: number | null;
  qualityScore?: number | null;
  metadata?: unknown;
};
export type InsertAiUsageEvent = Omit<AiUsageEvent, "id" | "createdAt" | "updatedAt">;

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

export type Workflow = BaseRecord & {
  name: string;
  type: string;
  description?: string | null;
  isHighRisk: boolean;
  requiresHumanApproval: boolean;
};

export type AiEvent = BaseRecord & {
  eventId: string;
  userId: number;
  teamId: number;
  workflowId?: number | null;
  workflowType: string;
  toolName: string;
  sourceApplication: string;
  actionType: "prompted" | "accepted" | "edited" | "rejected" | "escalated";
  durationSeconds: number;
  complexityScore: number;
  outputAccepted: boolean;
  outputEdited: boolean;
  humanApprovalRequired: boolean;
  humanApprovalGiven: boolean;
  policyStatus: "compliant" | "warning" | "violation";
  outputObjectId?: string | null;
  timestamp: Date;
};
export type InsertAiEvent = Omit<AiEvent, "id" | "createdAt" | "updatedAt">;

export type WorkflowInstance = BaseRecord & {
  workflowId: number;
  userId: number;
  teamId: number;
  aiEventId?: number | null;
  status: "in_progress" | "completed" | "reworked" | "escalated";
  startedAt: Date;
  completedAt?: Date | null;
  durationSeconds?: number | null;
  baselineDurationSeconds?: number | null;
  hadRework: boolean;
  hadException: boolean;
  touchless: boolean;
};

export type OutcomeMetric = BaseRecord & {
  teamId: number;
  userId?: number | null;
  workflowType: string;
  periodStart: Date;
  periodEnd: Date;
  avgCycleTimeSeconds?: number | null;
  baselineCycleTimeSeconds?: number | null;
  throughputCount: number;
  touchlessRate?: number | string | null;
  backlogReduction: number;
  errorRate?: number | string | null;
  reworkRate?: number | string | null;
  exceptionRate?: number | string | null;
  overrideRate?: number | string | null;
  hoursSaved?: number | string | null;
  costSaved?: number | string | null;
};

export type EvaluationScore = BaseRecord & {
  userId?: number | null;
  teamId?: number | null;
  periodStart: Date;
  periodEnd: Date;
  adoptionScore?: number | string | null;
  efficiencyScore?: number | string | null;
  qualityScore?: number | string | null;
  judgmentScore?: number | string | null;
  governanceScore?: number | string | null;
  businessImpactScore?: number | string | null;
  compositeScore?: number | string | null;
};
export type InsertEvaluationScore = Omit<EvaluationScore, "id" | "createdAt" | "updatedAt">;

export type PolicyEvent = BaseRecord & {
  aiEventId: number;
  userId: number;
  teamId: number;
  type: string;
  severity: "low" | "medium" | "high" | "critical";
  description?: string | null;
  resolved: boolean;
  resolvedAt?: Date | null;
  resolvedById?: number | null;
  notifiedComplianceLead: boolean;
  timestamp: Date;
};
export type InsertPolicyEvent = Omit<PolicyEvent, "id" | "createdAt" | "updatedAt">;

export type FeedbackItem = BaseRecord & {
  userId?: number | null;
  teamId?: number | null;
  type: "nudge" | "personal_summary" | "team_coaching" | "executive_loop";
  workflowType?: string | null;
  title: string;
  content: string;
  llmNarrative?: string | null;
  isRead: boolean;
};
export type InsertFeedbackItem = Omit<FeedbackItem, "id" | "createdAt" | "updatedAt" | "type" | "isRead"> &
  Partial<Pick<FeedbackItem, "type" | "isRead">>;

export type Playbook = BaseRecord & {
  title: string;
  workflowType: string;
  description?: string | null;
  whenToUse?: string | null;
  requiredInputs?: string | null;
  goodOutputCriteria?: string | null;
  mandatoryChecks?: string | null;
  failureModes?: string | null;
  benchmarkImprovement?: string | null;
};

export type IntelligenceReport = BaseRecord & {
  type: "monthly_manager" | "quarterly_executive" | "individual";
  targetId: number;
  targetType: "user" | "team";
  periodStart: Date;
  periodEnd: Date;
  title: string;
  content?: unknown;
  llmNarrative?: string | null;
  status: "draft" | "ready" | "sent";
  notificationSentAt?: Date | null;
};
export type InsertIntelligenceReport = Omit<IntelligenceReport, "id" | "createdAt" | "updatedAt">;

export type ScoringWeight = {
  id: number;
  adoptionWeight: number | string;
  efficiencyWeight: number | string;
  qualityWeight: number | string;
  judgmentWeight: number | string;
  governanceWeight: number | string;
  businessImpactWeight: number | string;
  updatedAt: Date;
};
export type InsertScoringWeight = Partial<Omit<ScoringWeight, "id" | "updatedAt">>;

export type BehaviorEvent = BaseRecord & {
  assessmentId: number;
  taskId?: string | null;
  eventType: string;
  eventData?: unknown;
  clientTimestamp: number;
};
export type InsertBehaviorEvent = Omit<BehaviorEvent, "id" | "createdAt" | "updatedAt">;
