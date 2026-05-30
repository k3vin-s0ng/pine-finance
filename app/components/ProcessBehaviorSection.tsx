"use client";

import type { ElementType, ReactNode } from "react";
import { useMemo } from "react";
import {
  AlertTriangle,
  Bot,
  CheckCircle,
  Clipboard,
  Eye,
  FileText,
  Loader2,
  Pencil,
  Quote,
  Repeat2,
} from "lucide-react";
import type { BehaviorEvent, Score } from "@/app/lib/schema";
import { Alert, AlertDescription, AlertTitle } from "@/app/components/ui/alert";
import { Badge } from "@/app/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { deriveBehaviorEventSummary, formatBehaviorSeconds } from "@/app/components/behaviorEventSummary";
import { trpc } from "@/app/lib/trpc";

type EvidenceRecord = Record<string, unknown>;
type TimelineEvent = Pick<BehaviorEvent, "id" | "taskId" | "eventType" | "eventData" | "clientTimestamp">;
type EventData = Record<string, unknown>;

type TimelineRow = {
  event: TimelineEvent;
  taskId: string | null | undefined;
  startsSection: boolean;
  sectionLabel: string;
};

const EVENT_META: Record<string, { label: string; icon: ElementType; tone: string }> = {
  ai_prompt_sent: { label: "AI prompt", icon: Bot, tone: "text-[#6b8cba] bg-[#6b8cba]/10" },
  paste: { label: "Paste", icon: Clipboard, tone: "text-[#168a4a] bg-[#168a4a]/10" },
  material_view: { label: "Material view", icon: Eye, tone: "text-[#c4a35a] bg-[#c4a35a]/10" },
  task_switch: { label: "Task switch", icon: Repeat2, tone: "text-[#7a9e7e] bg-[#7a9e7e]/10" },
  response_edit: { label: "Response edit", icon: Pencil, tone: "text-[#b07a9e] bg-[#b07a9e]/10" },
  ai_response_complete: { label: "AI response", icon: CheckCircle, tone: "text-[#3f5847] bg-[#3f5847]/10" },
  citation_added: { label: "Citation", icon: Quote, tone: "text-[#8a6f28] bg-[#c4a35a]/10" },
};

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

function titleize(value: string) {
  return value
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/_/g, " ")
    .replace(/\b\w/g, char => char.toUpperCase());
}

function EmptyEvidence({ label = "No evidence recorded." }: { label?: string }) {
  return (
    <div className="break-words rounded-lg border border-dashed border-[#d9e7db] bg-[#f8fbf8] p-3 text-sm text-[#6f8274]">
      {label}
    </div>
  );
}

function Metric({ label, value, detail }: { label: string; value: string | number; detail?: string }) {
  return (
    <div className="min-w-0 rounded-lg border border-[#d9e7db] bg-[#f8fbf8] p-3">
      <div className="flex min-w-0 flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <div className="min-w-0 break-words text-[10px] font-bold uppercase tracking-widest text-[#6f8274]">{label}</div>
        <div className="min-w-0 max-w-full break-words text-right text-base font-black leading-tight text-slate-950 [overflow-wrap:anywhere] sm:text-lg">{value}</div>
      </div>
      {detail ? <p className="mt-1 break-words text-xs leading-snug text-[#52665a] [overflow-wrap:anywhere]">{detail}</p> : null}
    </div>
  );
}

function KeyValueGrid({ record }: { record: EvidenceRecord | null }) {
  if (!record) return <EmptyEvidence />;
  const entries = Object.entries(record).filter(([, value]) => value != null);
  if (entries.length === 0) return <EmptyEvidence />;

  return (
    <div className="grid min-w-0 gap-2 md:grid-cols-2 xl:grid-cols-3">
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
          <span className="min-w-0 break-words [overflow-wrap:anywhere]">{signal}</span>
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

function CollapsibleSection({
  title,
  description,
  defaultOpen,
  forceOpen,
  children,
}: {
  title: string;
  description: string;
  defaultOpen?: boolean;
  forceOpen?: boolean;
  children: ReactNode;
}) {
  const openProps = forceOpen || defaultOpen ? { open: true } : {};
  return (
    <details className="group rounded-xl border border-[#d9e7db] bg-white" {...openProps}>
      <summary className="flex cursor-pointer list-none items-start justify-between gap-4 px-4 py-3">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-widest text-slate-950">{title}</h3>
          <p className="mt-0.5 text-xs leading-snug text-[#52665a]">{description}</p>
        </div>
        <span className="mt-1 text-[10px] font-bold uppercase tracking-widest text-[#168a4a] group-open:hidden">Expand</span>
        <span className="mt-1 hidden text-[10px] font-bold uppercase tracking-widest text-[#6f8274] group-open:inline">Collapse</span>
      </summary>
      <div className="border-t border-[#eef7ef] px-4 pb-4 pt-4">
        {children}
      </div>
    </details>
  );
}

function asEventData(value: unknown): EventData {
  return value != null && typeof value === "object" && !Array.isArray(value) ? value as EventData : {};
}

function stringField(data: EventData, key: string) {
  const value = data[key];
  return typeof value === "string" ? value : undefined;
}

function numberField(data: EventData, key: string) {
  const value = data[key];
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function formatSeconds(totalSeconds: number) {
  if (totalSeconds < 60) return `${Math.round(totalSeconds)}s`;
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = Math.round(totalSeconds % 60);
  return seconds > 0 ? `${minutes}m ${seconds}s` : `${minutes}m`;
}

function formatRelative(ms: number) {
  return `+${formatSeconds(Math.max(0, Math.round(ms / 1000)))}`;
}

function friendlySource(source: string | undefined) {
  if (source === "ai") return "AI";
  if (source === "source_material") return "source material";
  return source ?? "external source";
}

function taskLabel(taskId: string | null | undefined) {
  return taskId ? `Task ${taskId}` : "Session";
}

function eventDetail(event: TimelineEvent) {
  const data = asEventData(event.eventData);
  switch (event.eventType) {
    case "paste": {
      const source = friendlySource(stringField(data, "source"));
      const length = numberField(data, "clipboardLength");
      return `pasted${length != null ? ` ~${Math.round(length)} chars` : ""} from ${source}`;
    }
    case "material_view": {
      const duration = numberField(data, "durationSeconds");
      return `viewed material${duration != null ? ` ${formatSeconds(duration)}` : ""}`;
    }
    case "response_edit": {
      const lag = numberField(data, "secsSinceAIResponse");
      const delta = numberField(data, "netDeltaChars");
      const deltaText = delta != null ? `, ${delta >= 0 ? "+" : ""}${Math.round(delta)} chars` : "";
      return `edited response${lag != null ? ` (${formatSeconds(lag)} after AI reply${deltaText})` : deltaText}`;
    }
    case "citation_added":
      return `cited ${friendlySource(stringField(data, "source"))}`;
    case "ai_prompt_sent": {
      const sinceStart = numberField(data, "secondsSinceTaskStart");
      const promptLength = numberField(data, "promptLength");
      const timing = sinceStart != null ? ` ${formatSeconds(sinceStart)} into task` : "";
      const length = promptLength != null ? `, ~${Math.round(promptLength)} chars` : "";
      return `sent AI prompt${timing}${length}`;
    }
    case "task_switch": {
      const fromTask = stringField(data, "fromTaskId");
      const toTask = stringField(data, "toTaskId") ?? event.taskId ?? undefined;
      return `switched from ${taskLabel(fromTask)} to ${taskLabel(toTask)}`;
    }
    case "ai_response_complete":
      return "AI response completed";
    default:
      return "recorded session activity";
  }
}

function transitionLabel(event: TimelineEvent) {
  if (event.eventType !== "task_switch") return null;
  const data = asEventData(event.eventData);
  const fromTask = stringField(data, "fromTaskId");
  const toTask = stringField(data, "toTaskId") ?? event.taskId ?? undefined;
  return `${taskLabel(fromTask)} -> ${taskLabel(toTask)}`;
}

function timelineTaskId(event: TimelineEvent) {
  if (event.eventType !== "task_switch") return event.taskId;
  return stringField(asEventData(event.eventData), "toTaskId") ?? event.taskId;
}

function ProcessTraceContent({ events }: { events: TimelineEvent[] }) {
  const timelineRows = useMemo<TimelineRow[]>(() => {
    return events.map((event, index) => {
      const eventTask = timelineTaskId(event);
      const previousTask = index > 0 ? timelineTaskId(events[index - 1]) : undefined;
      const startsSection = index === 0 || eventTask !== previousTask;
      return {
        event,
        taskId: eventTask,
        startsSection,
        sectionLabel: transitionLabel(event) ?? taskLabel(eventTask),
      };
    });
  }, [events]);

  if (events.length === 0) {
    return (
      <Alert className="border-[#d9e7db] bg-[#f8fbf8]">
        <FileText className="h-4 w-4 text-[#6f8274]" />
        <AlertTitle>No process trace</AlertTitle>
        <AlertDescription>No chronological behavior events were recorded for this assessment.</AlertDescription>
      </Alert>
    );
  }

  const firstTimestamp = events[0].clientTimestamp;

  return (
    <div className="max-h-96 overflow-y-auto pr-1">
      {timelineRows.map(({ event, taskId: eventTask, startsSection, sectionLabel }) => {
        const meta = EVENT_META[event.eventType] ?? { label: event.eventType, icon: FileText, tone: "text-[#6f8274] bg-[#6f8274]/10" };
        const Icon = meta.icon;

        return (
          <div key={event.id}>
            {startsSection && (
              <div className="mt-3 border-t border-[#d9e7db] pt-2 first:mt-0 first:border-t-0 first:pt-0">
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#6f8274]">
                  {sectionLabel}
                </span>
              </div>
            )}
            <div className="grid grid-cols-[46px_18px_1fr] items-start gap-2 py-1">
              <div className="pt-0.5 text-right font-mono text-[11px] text-[#6f8274]">
                {formatRelative(event.clientTimestamp - firstTimestamp)}
              </div>
              <div className={`mt-0.5 flex h-5 w-5 items-center justify-center rounded ${meta.tone}`}>
                <Icon className="h-3 w-3" />
              </div>
              <div className="min-w-0 text-sm leading-5 text-[#2e4637]">
                <span className="font-bold text-slate-950">{meta.label}</span>
                <span className="mx-1 text-[#9db8a4]">/</span>
                <span>{eventDetail(event)}</span>
                <span className="ml-2 whitespace-nowrap text-[10px] text-[#6f8274]">{taskLabel(eventTask)}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ProcessBehaviorContent({ score, events }: { score: Score; events: TimelineEvent[] }) {
  const scoreEvidence = score.scoreEvidence;
  const behavioral = scoreEvidence?.behavioral;
  const behavioralSummary = asRecord(behavioral?.summary);
  const integrityGate = asRecord(scoreEvidence?.integrityGate);
  const eventSummary = useMemo(() => deriveBehaviorEventSummary(events), [events]);

  const aiPasteShare =
    numberValue(integrityGate?.aiPasteShare) ??
    numberValue(behavioralSummary?.aiPasteShare);
  const completenessRatio = numberValue(integrityGate?.completenessRatio);

  return (
    <div className="space-y-4">
      <div className="grid min-w-0 gap-2 md:grid-cols-2 xl:grid-cols-5">
        <Metric label="AI prompts" value={eventSummary.promptsSent} />
        <Metric label="AI-paste share" value={formatPercent(aiPasteShare)} />
        <Metric label="Material time" value={formatBehaviorSeconds(eventSummary.materialSeconds)} />
        <Metric label="Citations" value={eventSummary.citationCount} />
        <Metric label="Completeness" value={formatPercent(completenessRatio)} />
      </div>

      {behavioral ? (
        <div className="grid gap-2 lg:grid-cols-3">
          <BehavioralDimension label="Judgment" evidence={behavioral.judgment} />
          <BehavioralDimension label="Verification" evidence={behavioral.verification} />
          <BehavioralDimension label="Tool Fluency" evidence={behavioral.toolFluency} />
        </div>
      ) : (
        <EmptyEvidence label="No interpreted behavioral evidence was recorded." />
      )}

      <details className="rounded-lg border border-[#d9e7db] bg-[#f8fbf8]">
        <summary className="cursor-pointer px-3 py-2 text-xs font-bold uppercase tracking-widest text-[#52665a]">
          Show raw signals
        </summary>
        <div className="border-t border-[#d9e7db] p-3">
          <KeyValueGrid record={behavioralSummary} />
        </div>
      </details>
    </div>
  );
}

export function ProcessBehaviorSection({
  assessmentId,
  score,
  deterministicChecks,
  responses,
  expandAll,
}: {
  assessmentId: number;
  score: Score;
  deterministicChecks: ReactNode;
  responses: ReactNode;
  expandAll?: boolean;
}) {
  const query = trpc.scoring.getBehaviorEvents.useQuery({ assessmentId });
  const events = useMemo(
    () =>
      [...(query.data ?? [])].sort((a, b) => {
        if (a.clientTimestamp !== b.clientTimestamp) return a.clientTimestamp - b.clientTimestamp;
        return a.id - b.id;
      }),
    [query.data],
  );

  const behaviorContent = query.isLoading ? (
    <div className="flex items-center gap-2 rounded-lg border border-[#d9e7db] bg-[#f8fbf8] p-3 text-sm text-[#52665a]">
      <Loader2 className="h-4 w-4 animate-spin text-[#168a4a]" />
      Loading behavior telemetry...
    </div>
  ) : query.error ? (
    <Alert variant={query.error.data?.code === "FORBIDDEN" ? "destructive" : "default"} className="border-[#d9e7db] bg-[#f8fbf8]">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>{query.error.data?.code === "FORBIDDEN" ? "Behavior telemetry unavailable" : "Unable to load behavior telemetry"}</AlertTitle>
      <AlertDescription>
        {query.error.data?.code === "FORBIDDEN" ? "This assessment is outside your recruiter account." : query.error.message}
      </AlertDescription>
    </Alert>
  ) : (
    <ProcessBehaviorContent score={score} events={events} />
  );

  const traceContent = query.isLoading ? (
    <div className="flex items-center gap-2 rounded-lg border border-[#d9e7db] bg-[#f8fbf8] p-3 text-sm text-[#52665a]">
      <Loader2 className="h-4 w-4 animate-spin text-[#168a4a]" />
      Loading process trace...
    </div>
  ) : query.error ? (
    <Alert variant={query.error.data?.code === "FORBIDDEN" ? "destructive" : "default"} className="border-[#d9e7db] bg-[#f8fbf8]">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>{query.error.data?.code === "FORBIDDEN" ? "Process trace unavailable" : "Unable to load process trace"}</AlertTitle>
      <AlertDescription>
        {query.error.data?.code === "FORBIDDEN" ? "This assessment is outside your recruiter account." : query.error.message}
      </AlertDescription>
    </Alert>
  ) : (
    <ProcessTraceContent events={events} />
  );

  return (
    <Card className="rounded-xl border-[#168a4a]/20 bg-white shadow-none">
      <CardHeader className="px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="text-sm font-bold uppercase tracking-widest text-slate-950">
              Evidence Drill-Down
            </CardTitle>
            <p className="mt-1 text-xs text-[#52665a]">
              Recruiter-only evidence for investigating scores. Core verdict and dimensions remain above.
            </p>
          </div>
          <Badge variant="outline" className="border-[#d9e7db] text-[#52665a]">
            Recruiter only
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3 px-4 pb-4">
        <CollapsibleSection
          title="Process & Behavior"
          description="Interpreted behavior signals and the only aggregate process metrics on this report."
          defaultOpen
          forceOpen={expandAll}
        >
          {behaviorContent}
        </CollapsibleSection>
        <CollapsibleSection
          title="Deterministic Checks"
          description="Auditable non-LLM checks and integrity gates persisted by the scoring pipeline."
          forceOpen={expandAll}
        >
          {deterministicChecks}
        </CollapsibleSection>
        <CollapsibleSection
          title="Process Trace"
          description="Chronological session events for audit review."
          forceOpen={expandAll}
        >
          {traceContent}
        </CollapsibleSection>
        <CollapsibleSection
          title="Responses"
          description="Candidate submitted responses and available response history."
          forceOpen={expandAll}
        >
          {responses}
        </CollapsibleSection>
      </CardContent>
    </Card>
  );
}
