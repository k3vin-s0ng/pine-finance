"use client";

import type { ElementType } from "react";
import { useMemo } from "react";
import { AlertTriangle, BookOpen, Clipboard, FileText, Loader2, MessageSquare, Pencil, Quote } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/app/components/ui/alert";
import { Badge } from "@/app/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/components/ui/card";
import { deriveBehaviorEventSummary, formatBehaviorSeconds } from "@/app/components/behaviorEventSummary";
import { trpc } from "@/app/lib/trpc";

function StatCard({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: ElementType;
  label: string;
  value: string | number;
  detail: string;
}) {
  return (
    <Card className="rounded-xl border-[#d9e7db] bg-white py-3 shadow-none">
      <CardContent className="px-3">
        <div className="flex items-start gap-2.5">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#168a4a]/10">
            <Icon className="h-3.5 w-3.5 text-[#168a4a]" />
          </div>
          <div className="min-w-0">
            <div className="text-xl font-black leading-none text-slate-950">{value}</div>
            <div className="mt-1 text-[10px] font-bold uppercase tracking-widest text-[#6f8274]">{label}</div>
            <p className="mt-1 text-xs leading-snug text-[#52665a]">{detail}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function CandidateBehaviorTab({ assessmentId }: { assessmentId: number }) {
  const query = trpc.scoring.getBehaviorEvents.useQuery({ assessmentId });

  const summary = useMemo(() => {
    return deriveBehaviorEventSummary(query.data ?? []);
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
    : `${summary.postAiEditCount} edits after AI responses, averaging ${formatBehaviorSeconds(summary.averageEditLag)} later.`;

  return (
    <Card className="rounded-xl border-[#168a4a]/20 bg-white shadow-none">
      <CardHeader className="px-4 py-3">
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
      <CardContent className="grid gap-3 px-4 pb-4 md:grid-cols-2 lg:grid-cols-4">
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
          value={formatBehaviorSeconds(summary.materialSeconds)}
          detail="Total tracked time in source-material views."
        />
        <StatCard
          icon={Quote}
          label="Citations"
          value={summary.citationCount}
          detail={`AI ${summary.citationSources.ai} / source ${summary.citationSources.source_material}`}
        />
        <div className="md:col-span-2 lg:col-span-4">
          <div className="flex items-start gap-2.5 rounded-lg border border-[#d9e7db] bg-[#f8fbf8] p-3">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#6b8cba]/10">
              <Pencil className="h-3.5 w-3.5 text-[#6b8cba]" />
            </div>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-[#6f8274]">
                Post-AI edit behavior
              </div>
              <p className="mt-1 text-sm leading-snug text-[#2e4637]">{editDetail}</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
