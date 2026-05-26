"use client";

import { useMemo, type ElementType, type ReactNode } from "react";
import { AlertTriangle, Bot, Brain, Calculator, CheckCircle, Loader2, Shield } from "lucide-react";
import type { Score } from "@/app/lib/schema";
import { Alert, AlertDescription, AlertTitle } from "@/app/components/ui/alert";
import { Badge } from "@/app/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { deriveBehaviorEventSummary, formatBehaviorSeconds } from "@/app/components/behaviorEventSummary";
import { trpc } from "@/app/lib/trpc";

type EvidenceRecord = Record<string, unknown>;

const DIMENSION_RATIONALES: Array<{ key: keyof Score; label: string }> = [
  { key: "accuracyRationale", label: "Accuracy" },
  { key: "efficiencyRationale", label: "Efficiency" },
  { key: "judgmentRationale", label: "Judgment" },
  { key: "verificationRationale", label: "Verification" },
  { key: "communicationRationale", label: "Communication" },
  { key: "toolFluencyRationale", label: "Tool Fluency" },
];

function asRecord(value: unknown): EvidenceRecord | null {
  return value != null && typeof value === "object" && !Array.isArray(value) ? value as EvidenceRecord : null;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function stringValue(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function formatValue(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number") return Number.isInteger(value) ? `${value}` : value.toFixed(2);
  if (typeof value === "boolean") return value ? "yes" : "no";
  if (value == null) return "none";
  return JSON.stringify(value);
}

function titleize(value: string) {
  return value
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/_/g, " ")
    .replace(/\b\w/g, char => char.toUpperCase());
}

function EmptyEvidence({ label = "No evidence recorded." }: { label?: string }) {
  return (
    <div className="rounded-lg border border-dashed border-[#d9e7db] bg-[#f8fbf8] p-4 text-sm text-[#6f8274]">
      {label}
    </div>
  );
}

function Metric({ label, value, detail }: { label: string; value: string | number; detail?: string }) {
  return (
    <div className="rounded-lg border border-[#d9e7db] bg-[#f8fbf8] p-4">
      <div className="text-xl font-black leading-none text-slate-950">{value}</div>
      <div className="mt-1 text-[10px] font-bold uppercase tracking-widest text-[#6f8274]">{label}</div>
      {detail ? <p className="mt-2 text-xs leading-relaxed text-[#52665a]">{detail}</p> : null}
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
    <section className="rounded-xl border border-[#d9e7db] bg-white p-5">
      <div className="mb-4 flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#168a4a]/10">
          <Icon className="h-4 w-4 text-[#168a4a]" />
        </div>
        <div>
          <h3 className="text-sm font-bold uppercase tracking-widest text-slate-950">{title}</h3>
          <p className="mt-1 text-xs leading-relaxed text-[#52665a]">{description}</p>
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
    <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
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
    <ul className="space-y-2">
      {signals.map(signal => (
        <li key={signal} className="flex gap-2 text-sm leading-relaxed text-[#2e4637]">
          <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-[#168a4a]" />
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
      <div className="rounded-lg border border-[#d9e7db] bg-[#f8fbf8] p-4">
        <div className="text-xs font-bold uppercase tracking-widest text-slate-950">{label}</div>
        <div className="mt-2 text-sm text-[#6f8274]">No evidence recorded.</div>
      </div>
    );
  }

  const band = stringValue(record.band);
  return (
    <div className="rounded-lg border border-[#d9e7db] bg-[#f8fbf8] p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="text-xs font-bold uppercase tracking-widest text-slate-950">{label}</div>
        {band ? <Badge variant="outline" className="border-[#d9e7db] text-[#52665a]">{band}</Badge> : null}
      </div>
      <div className="mt-3">
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
    <div className="space-y-4">
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
              <div key={`${formatValue(check.taskId)}-${formatValue(check.field)}-${index}`} className="grid grid-cols-[1fr_1fr_80px] gap-3 px-4 py-3 text-sm">
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

function LlmJudgment({ score }: { score: Score }) {
  const rationales = DIMENSION_RATIONALES
    .map(({ key, label }) => ({ label, text: stringValue(score[key]) }))
    .filter((item): item is { label: string; text: string } => item.text != null);
  const strengths = asArray(score.strengths).map(stringValue).filter((item): item is string => item != null);
  const improvements = asArray(score.improvements).map(stringValue).filter((item): item is string => item != null);

  if (!score.recruiterSummary && rationales.length === 0 && strengths.length === 0 && improvements.length === 0) {
    return <EmptyEvidence />;
  }

  return (
    <div className="space-y-4">
      {score.recruiterSummary ? (
        <div className="rounded-lg border border-[#d9e7db] bg-[#f8fbf8] p-4">
          <div className="text-[10px] font-bold uppercase tracking-widest text-[#6f8274]">Recruiter Summary</div>
          <p className="mt-2 text-sm leading-relaxed text-[#2e4637]">{score.recruiterSummary}</p>
        </div>
      ) : null}
      <div className="grid gap-3 md:grid-cols-2">
        {rationales.map(({ label, text }) => (
          <div key={label} className="rounded-lg border border-[#d9e7db] bg-[#f8fbf8] p-4">
            <div className="text-[10px] font-bold uppercase tracking-widest text-[#6f8274]">{label}</div>
            <p className="mt-2 text-sm leading-relaxed text-[#2e4637]">{text}</p>
          </div>
        ))}
      </div>
      {(strengths.length > 0 || improvements.length > 0) && (
        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-lg border border-[#d9e7db] bg-[#f8fbf8] p-4">
            <div className="text-[10px] font-bold uppercase tracking-widest text-[#6f8274]">Strengths</div>
            <SignalList value={strengths} />
          </div>
          <div className="rounded-lg border border-[#d9e7db] bg-[#f8fbf8] p-4">
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
      <CardHeader className="px-6">
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
      <CardContent className="space-y-5 px-6">
        <EvidenceSection
          icon={Shield}
          title="Behavioral Signals"
          description="Persisted process evidence behind judgment, verification, and tool-fluency scoring."
        >
          {behavioral ? (
            <div className="space-y-4">
              <KeyValueGrid record={asRecord(behavioral.summary)} />
              <div className="grid gap-3 lg:grid-cols-3">
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
            <div className="flex items-center gap-2 rounded-lg border border-[#d9e7db] bg-[#f8fbf8] p-4 text-sm text-[#52665a]">
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
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
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
          <div className="space-y-4">
            <div>
              <div className="mb-2 text-xs font-bold uppercase tracking-widest text-[#6f8274]">Accuracy Checks</div>
              <AccuracyChecks value={scoreEvidence?.accuracyChecks} />
            </div>
            <div>
              <div className="mb-2 text-xs font-bold uppercase tracking-widest text-[#6f8274]">Efficiency Band</div>
              <KeyValueGrid record={asRecord(scoreEvidence?.efficiencyBand)} />
            </div>
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
