"use client";

import { useMemo } from "react";
import { AlertTriangle, BookOpen, Clipboard, FileText, Loader2, MessageSquare, Pencil, Quote } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/app/components/ui/alert";
import { Badge } from "@/app/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { trpc } from "@/app/lib/trpc";

type EventData = Record<string, unknown>;

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

function StatCard({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  detail: string;
}) {
  return (
    <Card className="rounded-xl border-[#d9e7db] bg-white py-5 shadow-none">
      <CardContent className="px-5">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#168a4a]/10">
            <Icon className="h-4 w-4 text-[#168a4a]" />
          </div>
          <div className="min-w-0">
            <div className="text-2xl font-black leading-none text-slate-950">{value}</div>
            <div className="mt-1 text-[10px] font-bold uppercase tracking-widest text-[#6f8274]">{label}</div>
            <p className="mt-2 text-xs leading-relaxed text-[#52665a]">{detail}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function CandidateBehaviorTab({ assessmentId }: { assessmentId: number }) {
  const query = trpc.scoring.getBehaviorEvents.useQuery({ assessmentId });

  const summary = useMemo(() => {
    const events = query.data ?? [];
    const pasteSources = { ai: 0, source_material: 0, external: 0 };
    const citationSources = { ai: 0, source_material: 0 };
    let promptsSent = 0;
    let materialSeconds = 0;
    let postAiEditCount = 0;
    let responseEditCount = 0;
    let totalSecsSinceAiResponse = 0;

    for (const event of events) {
      const data = asEventData(event.eventData);
      if (event.eventType === "paste") {
        const source = stringField(data, "source");
        if (source === "ai" || source === "source_material" || source === "external") {
          pasteSources[source] += 1;
        } else {
          pasteSources.external += 1;
        }
      }
      if (event.eventType === "ai_prompt_sent") {
        promptsSent += 1;
      }
      if (event.eventType === "material_view") {
        materialSeconds += numberField(data, "durationSeconds") ?? 0;
      }
      if (event.eventType === "citation_added") {
        const source = stringField(data, "source");
        if (source === "ai" || source === "source_material") {
          citationSources[source] += 1;
        }
      }
      if (event.eventType === "response_edit") {
        const seconds = numberField(data, "secsSinceAIResponse");
        responseEditCount += 1;
        if (seconds != null) {
          postAiEditCount += 1;
          totalSecsSinceAiResponse += seconds;
        }
      }
    }

    const pasteCount = pasteSources.ai + pasteSources.source_material + pasteSources.external;
    const citationCount = citationSources.ai + citationSources.source_material;
    const averageEditLag = postAiEditCount > 0 ? totalSecsSinceAiResponse / postAiEditCount : null;

    return {
      eventCount: events.length,
      pasteCount,
      pasteSources,
      promptsSent,
      materialSeconds,
      citationCount,
      citationSources,
      responseEditCount,
      postAiEditCount,
      averageEditLag,
    };
  }, [query.data]);

  if (query.isLoading) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-[#d9e7db] bg-white p-5 text-sm text-[#52665a]">
        <Loader2 className="h-4 w-4 animate-spin text-[#168a4a]" />
        Loading behavior telemetry...
      </div>
    );
  }

  if (query.error) {
    const forbidden = query.error.data?.code === "FORBIDDEN";
    return (
      <Alert variant={forbidden ? "destructive" : "default"} className="border-[#d9e7db] bg-white">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>{forbidden ? "Behavior telemetry unavailable" : "Unable to load behavior telemetry"}</AlertTitle>
        <AlertDescription>
          {forbidden ? "This assessment is outside your recruiter account." : query.error.message}
        </AlertDescription>
      </Alert>
    );
  }

  if (summary.eventCount === 0) {
    return (
      <Alert className="border-[#d9e7db] bg-white">
        <FileText className="h-4 w-4 text-[#6f8274]" />
        <AlertTitle>No behavior telemetry</AlertTitle>
        <AlertDescription>
          No client behavior events were recorded for this assessment.
        </AlertDescription>
      </Alert>
    );
  }

  const editDetail = summary.averageEditLag == null
    ? `${summary.responseEditCount} edits recorded; no post-AI timing data.`
    : `${summary.postAiEditCount} edits after AI responses, averaging ${formatSeconds(summary.averageEditLag)} later.`;

  return (
    <Card className="rounded-xl border-[#168a4a]/20 bg-white shadow-none">
      <CardHeader className="px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="text-sm font-bold uppercase tracking-widest text-slate-950">
              Behavior Telemetry
            </CardTitle>
            <p className="mt-1 text-xs text-[#52665a]">
              Recruiter-only process signals from the assessment session.
            </p>
          </div>
          <Badge variant="outline" className="border-[#d9e7db] text-[#52665a]">
            {summary.eventCount} events
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="grid gap-4 px-6 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Clipboard}
          label="Pastes"
          value={summary.pasteCount}
          detail={`AI ${summary.pasteSources.ai} / source ${summary.pasteSources.source_material} / external ${summary.pasteSources.external}`}
        />
        <StatCard
          icon={MessageSquare}
          label="AI prompts"
          value={summary.promptsSent}
          detail="Prompt submissions sent to Pine AI during the session."
        />
        <StatCard
          icon={BookOpen}
          label="Material time"
          value={formatSeconds(summary.materialSeconds)}
          detail="Total tracked time in source-material views."
        />
        <StatCard
          icon={Quote}
          label="Citations"
          value={summary.citationCount}
          detail={`AI ${summary.citationSources.ai} / source ${summary.citationSources.source_material}`}
        />
        <div className="md:col-span-2 lg:col-span-4">
          <div className="flex items-start gap-3 rounded-lg border border-[#d9e7db] bg-[#f8fbf8] p-4">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#6b8cba]/10">
              <Pencil className="h-4 w-4 text-[#6b8cba]" />
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-[#6f8274]">
                Post-AI edit behavior
              </div>
              <p className="mt-1 text-sm leading-relaxed text-[#2e4637]">{editDetail}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
