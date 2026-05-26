"use client";

import type { ElementType } from "react";
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
import { Alert, AlertDescription, AlertTitle } from "@/app/components/ui/alert";
import { Badge } from "@/app/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { trpc } from "@/app/lib/trpc";

type EventData = Record<string, unknown>;
type BehaviorEvent = {
  id: number;
  taskId?: string | null;
  eventType: string;
  eventData?: unknown;
  clientTimestamp: number;
};
type TimelineRow = {
  event: BehaviorEvent;
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

function eventDetail(event: BehaviorEvent) {
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
    case "citation_added": {
      return `cited ${friendlySource(stringField(data, "source"))}`;
    }
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

function transitionLabel(event: BehaviorEvent) {
  if (event.eventType !== "task_switch") return null;
  const data = asEventData(event.eventData);
  const fromTask = stringField(data, "fromTaskId");
  const toTask = stringField(data, "toTaskId") ?? event.taskId ?? undefined;
  return `${taskLabel(fromTask)} -> ${taskLabel(toTask)}`;
}

function timelineTaskId(event: BehaviorEvent) {
  if (event.eventType !== "task_switch") return event.taskId;
  return stringField(asEventData(event.eventData), "toTaskId") ?? event.taskId;
}

export function ProcessTraceTimeline({ assessmentId }: { assessmentId: number }) {
  const query = trpc.scoring.getBehaviorEvents.useQuery({ assessmentId });

  const events = useMemo(
    () =>
      [...(query.data ?? [])].sort((a, b) => {
        if (a.clientTimestamp !== b.clientTimestamp) return a.clientTimestamp - b.clientTimestamp;
        return a.id - b.id;
      }),
    [query.data],
  );
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

  if (query.isLoading) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-[#d9e7db] bg-white p-5 text-sm text-[#52665a]">
        <Loader2 className="h-4 w-4 animate-spin text-[#168a4a]" />
        Loading process trace...
      </div>
    );
  }

  if (query.error) {
    const forbidden = query.error.data?.code === "FORBIDDEN";
    return (
      <Alert variant={forbidden ? "destructive" : "default"} className="border-[#d9e7db] bg-white">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>{forbidden ? "Process trace unavailable" : "Unable to load process trace"}</AlertTitle>
        <AlertDescription>
          {forbidden ? "This assessment is outside your recruiter account." : query.error.message}
        </AlertDescription>
      </Alert>
    );
  }

  if (events.length === 0) {
    return (
      <Alert className="border-[#d9e7db] bg-white">
        <FileText className="h-4 w-4 text-[#6f8274]" />
        <AlertTitle>No process trace</AlertTitle>
        <AlertDescription>
          No chronological behavior events were recorded for this assessment.
        </AlertDescription>
      </Alert>
    );
  }

  const firstTimestamp = events[0].clientTimestamp;

  return (
    <Card className="rounded-xl border-[#d9e7db] bg-white shadow-none">
      <CardHeader className="px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="text-sm font-bold uppercase tracking-widest text-slate-950">
              Process Trace
            </CardTitle>
            <p className="mt-1 text-xs text-[#52665a]">
              Chronological session events. Aggregate behavior metrics are shown separately above.
            </p>
          </div>
          <Badge variant="outline" className="border-[#d9e7db] text-[#52665a]">
            {events.length} events
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="px-6">
        <div className="space-y-1">
          {timelineRows.map(({ event, taskId: eventTask, startsSection, sectionLabel }) => {
            const meta = EVENT_META[event.eventType] ?? { label: event.eventType, icon: FileText, tone: "text-[#6f8274] bg-[#6f8274]/10" };
            const Icon = meta.icon;

            return (
              <div key={event.id}>
                {startsSection && (
                  <div className="flex items-center gap-2 pb-2 pt-4 first:pt-0">
                    <div className="h-px flex-1 bg-[#d9e7db]" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-[#6f8274]">
                      {sectionLabel}
                    </span>
                    <div className="h-px flex-1 bg-[#d9e7db]" />
                  </div>
                )}
                <div className="grid grid-cols-[56px_24px_1fr] gap-3 py-3">
                  <div className="pt-1 text-right font-mono text-[11px] text-[#6f8274]">
                    {formatRelative(event.clientTimestamp - firstTimestamp)}
                  </div>
                  <div className="relative flex justify-center">
                    <div className="absolute bottom-[-12px] top-7 w-px bg-[#d9e7db]" />
                    <div className={`relative z-10 flex h-7 w-7 items-center justify-center rounded-full ${meta.tone}`}>
                      <Icon className="h-3.5 w-3.5" />
                    </div>
                  </div>
                  <div className="min-w-0 rounded-lg border border-[#d9e7db] bg-[#f8fbf8] px-4 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="text-xs font-bold uppercase tracking-widest text-slate-950">
                        {meta.label}
                      </div>
                      <div className="text-[10px] text-[#6f8274]">{taskLabel(eventTask)}</div>
                    </div>
                    <p className="mt-1 text-sm leading-relaxed text-[#2e4637]">{eventDetail(event)}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
