"use client";

import { useMemo, type ElementType, type ReactNode } from "react";
import { AlertTriangle, Bot, Brain, Calculator, CheckCircle, Info, Loader2, Shield } from "lucide-react";
import type { Score } from "@/app/lib/schema";
import { Alert, AlertDescription, AlertTitle } from "@/app/components/ui/alert";
import { Badge } from "@/app/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { deriveBehaviorEventSummary, formatBehaviorSeconds } from "@/app/components/behaviorEventSummary";
import { trpc } from "@/app/lib/trpc";

type EvidenceRecord = Record<string, unknown>;

function asRecord(value: unknown): EvidenceRecord | null {
  return value != null && typeof value === "object" && !Array.isArray(value) ? value as EvidenceRecord : null;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function stringValue(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function numberValue(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function formatValue(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number") return Number.isInteger(value) ? `${value}` : value.toFixed(2);
  if (typeof value === "boolean") return value ? "yes" : "no";
  if (value == null) return "none";
  return JSON.stringify(value);
}

function formatPercent(value: number | null) {
  return value == null ? "none" : `${Math.round(value * 100)}%`;
}

function formatScore(value: unknown) {
  const score = numberValue(value);
  return score == null ? "none" : Number.isInteger(score) ? `${score}` : score.toFixed(1);
}

function titleize(value: string) {
  return value
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/_/g, " ")
    .replace(/\b\w/g, char => char.toUpperCase());
}

function EmptyEvidence({ label = "No evidence recorded." }: { label?: string }) {
  return (
    <div className="rounded-lg border border-dashed border-[#d9e7db] bg-[#f8fbf8] p-3 text-sm text-[#6f8274]">
      {label}
    </div>
  );
}

function Metric({ label, value, detail }: { label: string; value: string | number; detail?: string }) {
  return (
    <div className="rounded-lg border border-[#d9e7db] bg-[#f8fbf8] p-3">
      <div className="flex items-baseline justify-between gap-3">
        <div className="text-[10px] font-bold uppercase tracking-widest text-[#6f8274]">{label}</div>
        <div className="shrink-0 text-lg font-black leading-none text-slate-950">{value}</div>
      </div>
      {detail ? <p className="mt-1 text-xs leading-snug text-[#52665a]">{detail}</p> : null}
    </div>
  );
}

function EvidenceSection({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: ElementType;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-[#d9e7db] bg-white p-4">
      <div className="mb-3 flex items-start gap-2.5">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#168a4a]/10">
          <Icon className="h-3.5 w-3.5 text-[#168a4a]" />
        </div>
        <div>
          <h3 className="text-sm font-bold uppercase tracking-widest text-slate-950">{title}</h3>
          <p className="mt-0.5 text-xs leading-snug text-[#52665a]">{description}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

function KeyValueGrid({ record, omit = [] }: { record: EvidenceRecord | null; omit?: string[] }) {
  if (!record) return <EmptyEvidence />;
  const entries = Object.entries(record).filter(([key, value]) => !omit.includes(key) && value != null);
  if (entries.length === 0) return <EmptyEvidence />;

  return (
    <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
      {entries.map(([key, value]) => (
        <Metric key={key} label={titleize(key)} value={formatValue(value)} />
      ))}
    </div>
  );
}

function SignalList({ value }: { value: unknown }) {
  const signals = asArray(value).map(signal => stringValue(signal)).filter((signal): signal is string => signal != null);
  if (signals.length === 0) return <EmptyEvidence label="No signals recorded." />;

  return (
    <ul className="space-y-1.5">
      {signals.map(signal => (
        <li key={signal} className="flex gap-2 text-sm leading-snug text-[#2e4637]">
          <CheckCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#168a4a]" />
          <span>{signal}</span>
        </li>
      ))}
    </ul>
  );
}

function BehavioralDimension({ label, evidence }: { label: string; evidence: unknown }) {
  const record = asRecord(evidence);
  if (!record) {
    return (
      <div className="rounded-lg border border-[#d9e7db] bg-[#f8fbf8] p-3">
        <div className="text-xs font-bold uppercase tracking-widest text-slate-950">{label}</div>
        <div className="mt-1 text-sm text-[#6f8274]">No evidence recorded.</div>
      </div>
    );
  }

  const band = stringValue(record.band);
  return (
    <div className="rounded-lg border border-[#d9e7db] bg-[#f8fbf8] p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="text-xs font-bold uppercase tracking-widest text-slate-950">{label}</div>
        {band ? <Badge variant="outline" className="border-[#d9e7db] text-[#52665a]">{band}</Badge> : null}
      </div>
      <div className="mt-2">
        <SignalList value={record.signals} />
      </div>
    </div>
  );
}

function AccuracyChecks({ value }: { value: unknown }) {
  const evidence = asRecord(value);
  if (!evidence) return <EmptyEvidence />;

  const checks = asArray(evidence.checks).map(asRecord).filter((check): check is EvidenceRecord => check != null);
  return (
    <div className="space-y-3">
      <KeyValueGrid record={evidence} omit={["checks"]} />
      {checks.length > 0 ? (
        <div className="overflow-hidden rounded-lg border border-[#d9e7db]">
          <div className="grid grid-cols-[1fr_1fr_80px] gap-3 bg-[#eef7ef] px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-[#6f8274]">
            <div>Check</div>
            <div>Candidate Value</div>
            <div>Result</div>
          </div>
          <div className="divide-y divide-[#d9e7db]">
            {checks.slice(0, 8).map((check, index) => (
              <div key={`${formatValue(check.taskId)}-${formatValue(check.field)}-${index}`} className="grid grid-cols-[1fr_1fr_72px] gap-3 px-4 py-2 text-sm">
                <div className="min-w-0">
                  <div className="font-semibold text-slate-950">{formatValue(check.field)}</div>
                  <div className="text-xs text-[#6f8274]">Expected {formatValue(check.expectedValue)} {formatValue(check.unit)}</div>
                </div>
                <div className="text-[#2e4637]">{formatValue(check.candidateValue)}</div>
                <div className={check.matches === true ? "font-bold text-[#168a4a]" : "font-bold text-[#9a4d4d]"}>
                  {check.matches === true ? "Match" : "Review"}
                </div>
              </div>
            ))}
          </div>
          {checks.length > 8 ? (
            <div className="bg-[#f8fbf8] px-4 py-2 text-xs text-[#6f8274]">
              {checks.length - 8} additional checks not shown.
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

const SCORE_DIMENSIONS = [
  "overallScore",
  "accuracy",
  "efficiency",
  "judgment",
  "verification",
  "communication",
  "toolFluency",
] as const;

function IntegrityAdjustments({ value }: { value: unknown }) {
  const gate = asRecord(value);
  if (!gate) return null;

  const before = asRecord(gate.before);
  const after = asRecord(gate.after);
  const multipliers = asRecord(gate.multipliers);
  const caps = asRecord(gate.caps);
  const attemptedTaskCount = numberValue(gate.attemptedTaskCount);
  const definedTaskCount = numberValue(gate.definedTaskCount);
  const completenessRatio = numberValue(gate.completenessRatio);
  const aiPasteShare = numberValue(gate.aiPasteShare);

  if (!before || !after) return null;

  return (
    <div className="space-y-3 rounded-lg border border-[#d9e7db] bg-[#f8fbf8] p-3">
      <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-4">
        <Metric
          label="Completeness"
          value={formatPercent(completenessRatio)}
          detail={
            attemptedTaskCount != null && definedTaskCount != null
              ? `${attemptedTaskCount} of ${definedTaskCount} substantive tasks.`
              : "Substantive task ratio."
          }
        />
        <Metric
          label="Overall multiplier"
          value={formatValue(multipliers?.overall)}
          detail="Final score multiplier applied after dimension gates."
        />
        <Metric
          label="AI-paste share"
          value={formatPercent(aiPasteShare)}
          detail="Share of response text attributed to AI paste."
        />
        <Metric
          label="Process caps"
          value={[
            `J ${formatScore(caps?.judgment)}`,
            `V ${formatScore(caps?.verification)}`,
            `T ${formatScore(caps?.toolFluency)}`,
          ].join(" / ")}
          detail="Judgment / verification / tool-fluency caps."
        />
      </div>

      <div className="overflow-hidden rounded-lg border border-[#d9e7db] bg-white">
        <div className="grid grid-cols-[1fr_80px_80px] gap-3 bg-[#eef7ef] px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-[#6f8274]">
          <div>Dimension</div>
          <div>Before</div>
          <div>After</div>
        </div>
        <div className="divide-y divide-[#d9e7db]">
          {SCORE_DIMENSIONS.map(dimension => (
            <div key={dimension} className="grid grid-cols-[1fr_80px_80px] gap-3 px-4 py-2 text-sm">
              <div className="font-semibold text-slate-950">{titleize(dimension)}</div>
              <div className="tabular-nums text-[#52665a]">{formatScore(before[dimension])}</div>
              <div className="tabular-nums font-bold text-slate-950">{formatScore(after[dimension])}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function LlmJudgment({ score }: { score: Score }) {
  const strengths = asArray(score.strengths).map(stringValue).filter((item): item is string => item != null);
  const improvements = asArray(score.improvements).map(stringValue).filter((item): item is string => item != null);

  if (!score.recruiterSummary && strengths.length === 0 && improvements.length === 0) {
    return <EmptyEvidence />;
  }

  return (
    <div className="space-y-3">
      {score.recruiterSummary ? (
        <div className="rounded-lg border border-[#d9e7db] bg-[#f8fbf8] p-3">
          <div className="text-[10px] font-bold uppercase tracking-widest text-[#6f8274]">Recruiter Summary</div>
          <p className="mt-1 text-sm leading-snug text-[#2e4637]">{score.recruiterSummary}</p>
        </div>
      ) : null}
      <div className="flex gap-2 rounded-lg border border-[#d9e7db] bg-[#f8fbf8] p-3 text-xs leading-snug text-[#52665a]">
        <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#168a4a]" />
        <span>Per-dimension model rationales are shown once in Dimension Breakdown above.</span>
      </div>
      {(strengths.length > 0 || improvements.length > 0) && (
        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-lg border border-[#d9e7db] bg-[#f8fbf8] p-3">
            <div className="text-[10px] font-bold uppercase tracking-widest text-[#6f8274]">Strengths</div>
            <SignalList value={strengths} />
          </div>
          <div className="rounded-lg border border-[#d9e7db] bg-[#f8fbf8] p-3">
            <div className="text-[10px] font-bold uppercase tracking-widest text-[#6f8274]">Improvements</div>
            <SignalList value={improvements} />
          </div>
        </div>
      )}
    </div>
  );
}

export function EvidencePanel({ score, assessmentId }: { score: Score; assessmentId: number }) {
  const behaviorQuery = trpc.scoring.getBehaviorEvents.useQuery({ assessmentId });
  const behaviorSummary = useMemo(
    () => deriveBehaviorEventSummary(behaviorQuery.data ?? []),
    [behaviorQuery.data],
  );
  const scoreEvidence = score.scoreEvidence;
  const behavioral = scoreEvidence?.behavioral;
  const aiPasteRatio = behaviorSummary.pasteCount > 0
    ? Math.round((behaviorSummary.pasteSources.ai / behaviorSummary.pasteCount) * 100)
    : 0;

  return (
    <Card className="rounded-xl border-[#168a4a]/20 bg-white shadow-none">
      <CardHeader className="px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="text-sm font-bold uppercase tracking-widest text-slate-950">
              Evidence Panel
            </CardTitle>
            <p className="mt-1 text-xs text-[#52665a]">
              Explainable scoring inputs separated by deterministic checks, behavior signals, telemetry, and LLM judgment.
            </p>
          </div>
          <Badge variant="outline" className="border-[#d9e7db] text-[#52665a]">
            Recruiter only
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 px-4 pb-4">
        <EvidenceSection
          icon={Shield}
          title="Behavioral Signals"
          description="Persisted process evidence behind judgment, verification, and tool-fluency scoring."
        >
          {behavioral ? (
            <div className="space-y-3">
              <KeyValueGrid record={asRecord(behavioral.summary)} />
              <div className="grid gap-2 lg:grid-cols-3">
                <BehavioralDimension label="Judgment" evidence={behavioral.judgment} />
                <BehavioralDimension label="Verification" evidence={behavioral.verification} />
                <BehavioralDimension label="Tool Fluency" evidence={behavioral.toolFluency} />
              </div>
            </div>
          ) : (
            <EmptyEvidence />
          )}
        </EvidenceSection>

        <EvidenceSection
          icon={Bot}
          title="AI-Interaction Analysis"
          description="AI-reliance and source-use signals derived from the same behavior events as the telemetry summary."
        >
          {behaviorQuery.isLoading ? (
            <div className="flex items-center gap-2 rounded-lg border border-[#d9e7db] bg-[#f8fbf8] p-3 text-sm text-[#52665a]">
              <Loader2 className="h-4 w-4 animate-spin text-[#168a4a]" />
              Loading AI-interaction evidence...
            </div>
          ) : behaviorQuery.error ? (
            <Alert variant={behaviorQuery.error.data?.code === "FORBIDDEN" ? "destructive" : "default"} className="border-[#d9e7db] bg-[#f8fbf8]">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Unable to load AI-interaction evidence</AlertTitle>
              <AlertDescription>{behaviorQuery.error.message}</AlertDescription>
            </Alert>
          ) : behaviorSummary.eventCount === 0 ? (
            <EmptyEvidence label="No behavior events were recorded for AI-interaction analysis." />
          ) : (
            <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-4">
              <Metric label="AI prompts" value={behaviorSummary.promptsSent} detail="Prompt submissions sent during the session." />
              <Metric label="AI paste ratio" value={`${aiPasteRatio}%`} detail={`${behaviorSummary.pasteSources.ai} of ${behaviorSummary.pasteCount} paste events came from AI.`} />
              <Metric
                label="Post-AI edit lag"
                value={behaviorSummary.averageEditLag == null ? "none" : formatBehaviorSeconds(behaviorSummary.averageEditLag)}
                detail={`${behaviorSummary.postAiEditCount} edits had timing after an AI reply.`}
              />
              <Metric
                label="Citation split"
                value={behaviorSummary.citationCount}
                detail={`AI ${behaviorSummary.citationSources.ai} / source ${behaviorSummary.citationSources.source_material}`}
              />
            </div>
          )}
        </EvidenceSection>

        <EvidenceSection
          icon={Calculator}
          title="Deterministic Checks"
          description="Auditable non-LLM checks persisted by the scoring pipeline."
        >
          <div className="space-y-3">
            <div>
              <div className="mb-2 text-xs font-bold uppercase tracking-widest text-[#6f8274]">Accuracy Checks</div>
              <AccuracyChecks value={scoreEvidence?.accuracyChecks} />
            </div>
            <div>
              <div className="mb-2 text-xs font-bold uppercase tracking-widest text-[#6f8274]">Efficiency Band</div>
              <KeyValueGrid record={asRecord(scoreEvidence?.efficiencyBand)} />
            </div>
            {asRecord(scoreEvidence?.integrityGate) ? (
              <div>
                <div className="mb-2 text-xs font-bold uppercase tracking-widest text-[#6f8274]">Integrity Adjustments</div>
                <IntegrityAdjustments value={scoreEvidence?.integrityGate} />
              </div>
            ) : null}
          </div>
        </EvidenceSection>

        <EvidenceSection
          icon={Brain}
          title="LLM Judgment"
          description="Model-generated rationales and recruiter-facing interpretation stored with the score."
        >
          <LlmJudgment score={score} />
        </EvidenceSection>
      </CardContent>
    </Card>
  );
}
