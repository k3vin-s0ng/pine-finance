"use client";

import {
  Activity,
  Calendar,
  Download,
  FileText,
  Loader2,
  Plus,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { useState } from "react";
import { trpc } from "@/app/lib/trpc";
import DashboardShell from "../components/DashboardShell";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Separator } from "../components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { toast } from "sonner";

const reportTypeLabels: Record<string, string> = {
  monthly_manager: "Monthly Manager Report",
  quarterly_executive: "Quarterly Executive Summary",
  individual: "Individual Evaluation",
};

const reportTypeColors: Record<string, string> = {
  monthly_manager: "text-purple-400 border-purple-800 bg-purple-950/40",
  quarterly_executive: "text-cyan-400 border-cyan-800 bg-cyan-950/40",
  individual: "text-emerald-400 border-emerald-800 bg-emerald-950/40",
};

export default function Reports() {
  const [tab, setTab] = useState("list");
  const [generating, setGenerating] = useState<string | null>(null);

  const { data: reports, isLoading, refetch } = trpc.intelligence.reports.list.useQuery({ limit: 20 });
  const { data: teams } = trpc.intelligence.teams.list.useQuery();

  const generateMonthly = trpc.intelligence.reports.generateMonthlyManager.useMutation({
    onSuccess: () => { toast.success("Monthly manager report generated"); refetch(); setGenerating(null); },
    onError: (e) => { toast.error(e.message); setGenerating(null); },
  });
  const generateQuarterly = trpc.intelligence.reports.generateQuarterlyExecutive.useMutation({
    onSuccess: () => { toast.success("Quarterly executive summary generated"); refetch(); setGenerating(null); },
    onError: (e) => { toast.error(e.message); setGenerating(null); },
  });
  const generateIndividual = trpc.intelligence.reports.generateIndividualEvaluation.useMutation({
    onSuccess: () => { toast.success("Individual evaluation generated"); refetch(); setGenerating(null); },
    onError: (e) => { toast.error(e.message); setGenerating(null); },
  });

  const [selectedTeamId, setSelectedTeamId] = useState<string>("");
  const [selectedMonth, setSelectedMonth] = useState<string>(
    new Date().toISOString().slice(0, 7)
  );

  const now = new Date();
  const quarterStart = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
  const quarterEnd = new Date(quarterStart.getFullYear(), quarterStart.getMonth() + 3, 0);

  return (
    <DashboardShell
      title="Evaluation Reports"
      subtitle="Monthly manager reports, quarterly executive summaries, and individual evaluations"
    >
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="bg-muted/30 mb-6">
          <TabsTrigger value="list" className="text-xs">Report Library</TabsTrigger>
          <TabsTrigger value="generate" className="text-xs">Generate Report</TabsTrigger>
        </TabsList>

        {/* Report library */}
        <TabsContent value="list">
          <Card className="bg-card border-border">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                <FileText size={16} className="text-primary" />
                Generated Reports
              </CardTitle>
              <Button size="sm" variant="outline" className="text-xs h-7 gap-1" onClick={() => refetch()}>
                <RefreshCw size={12} /> Refresh
              </Button>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center h-40">
                  <Activity className="text-primary animate-pulse" size={24} />
                </div>
              ) : !reports || reports.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-40 gap-3 text-muted-foreground">
                  <FileText size={24} className="opacity-40" />
                  <p className="text-xs">No reports generated yet. Use the Generate tab to create your first report.</p>
                  <Button size="sm" variant="outline" className="text-xs" onClick={() => setTab("generate")}>
                    <Plus size={12} className="mr-1" /> Generate Report
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {reports.map((report) => (
                    <ReportCard key={report.id} report={report} />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Generate */}
        <TabsContent value="generate">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Monthly Manager */}
            <Card className="bg-card border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Calendar size={16} className="text-purple-400" />
                  Monthly Manager Report
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs text-muted-foreground">
                  Generates a full team performance report with adoption metrics, efficiency gains, quality signals, and governance summary. Includes LLM-generated narrative.
                </p>
                <Select value={selectedTeamId} onValueChange={setSelectedTeamId}>
                  <SelectTrigger className="text-xs h-8">
                    <SelectValue placeholder="Select team" />
                  </SelectTrigger>
                  <SelectContent>
                    {teams?.map((t) => (
                      <SelectItem key={t.id} value={String(t.id)}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="w-full h-8 text-xs bg-input border border-border rounded-md px-3 text-foreground"
                />
                <Button
                  size="sm"
                  className="w-full text-xs gap-1"
                  disabled={!selectedTeamId || generating === "monthly"}
                  onClick={() => {
                    if (!selectedTeamId) return;
                    const [year, month] = selectedMonth.split("-").map(Number);
                    const periodStart = new Date(year, month - 1, 1);
                    const periodEnd = new Date(year, month, 0);
                    setGenerating("monthly");
                    generateMonthly.mutate({ teamId: Number(selectedTeamId), periodStart, periodEnd });
                  }}
                >
                  {generating === "monthly" ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                  Generate
                </Button>
              </CardContent>
            </Card>

            {/* Quarterly Executive */}
            <Card className="bg-card border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <FileText size={16} className="text-cyan-400" />
                  Quarterly Executive Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs text-muted-foreground">
                  Organisation-wide quarterly summary with strategic recommendations (max 3), ROI analysis, governance posture, and LLM-generated executive narrative.
                </p>
                <div className="p-2 bg-muted/20 rounded-md">
                  <p className="text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">Current quarter:</span>{" "}
                    {quarterStart.toLocaleDateString()} – {quarterEnd.toLocaleDateString()}
                  </p>
                </div>
                <Button
                  size="sm"
                  className="w-full text-xs gap-1"
                  disabled={generating === "quarterly"}
                  onClick={() => {
                    setGenerating("quarterly");
                    generateQuarterly.mutate({ periodStart: quarterStart, periodEnd: quarterEnd });
                  }}
                >
                  {generating === "quarterly" ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                  Generate
                </Button>
              </CardContent>
            </Card>

            {/* Individual Evaluation */}
            <Card className="bg-card border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <FileText size={16} className="text-emerald-400" />
                  Individual Evaluation
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs text-muted-foreground">
                  Personal AI usage evaluation with score breakdown, workflow analysis, verification behaviour, and personalised LLM coaching narrative.
                </p>
                <div className="p-2 bg-muted/20 rounded-md">
                  <p className="text-xs text-muted-foreground">
                    Generates for your own profile. Admins can generate for any user.
                  </p>
                </div>
                <Button
                  size="sm"
                  className="w-full text-xs gap-1"
                  disabled={generating === "individual"}
                  onClick={() => {
                    const [year, month] = selectedMonth.split("-").map(Number);
                    const periodStart = new Date(year, month - 1, 1);
                    const periodEnd = new Date(year, month, 0);
                    setGenerating("individual");
                    generateIndividual.mutate({ periodStart, periodEnd });
                  }}
                >
                  {generating === "individual" ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                  Generate My Evaluation
                </Button>
              </CardContent>
            </Card>
          </div>

          <div className="mt-4 p-3 bg-muted/20 rounded-lg border border-border">
            <p className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">LLM Narratives:</span> All reports include AI-generated plain-language summaries derived from your KPI data. Strategic recommendations are limited to 2–3 items. Scoring explicitly excludes raw prompt volume.
            </p>
          </div>
        </TabsContent>
      </Tabs>
    </DashboardShell>
  );
}

function ReportCard({ report }: { report: any }) {
  const [expanded, setExpanded] = useState(false);
  const narrative: string | null =
    report.llmNarrative ??
    (report.summary
      ? typeof report.summary === "string"
        ? report.summary
        : JSON.stringify(report.summary, null, 2)
      : null);

  return (
    <div className="bg-muted/20 rounded-lg border border-border overflow-hidden">
      {/* Header row */}
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <div className="flex items-center gap-2 min-w-0">
          <Badge
            variant="outline"
            className={`shrink-0 text-[10px] ${reportTypeColors[report.type] ?? ""}`}
          >
            {reportTypeLabels[report.type] ?? report.type}
          </Badge>
          <span className="text-[10px] text-muted-foreground shrink-0">
            {new Date(report.createdAt).toLocaleDateString()}
          </span>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="shrink-0 text-xs h-7 bg-transparent"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? "Collapse" : "View"}
        </Button>
      </div>

      {/* Title + period */}
      <div className="px-4 pb-3">
        <p className="text-sm font-semibold text-foreground leading-snug">
          {report.title}
        </p>
        <p className="text-[11px] text-muted-foreground mt-1">
          Period: {new Date(report.periodStart).toLocaleDateString()} –{" "}
          {new Date(report.periodEnd).toLocaleDateString()}
        </p>
      </div>

      {/* Expanded narrative */}
      {expanded && narrative && (
        <div className="border-t border-border px-4 py-4">
          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-widest mb-2">AI Narrative</p>
          <div className="text-xs text-foreground/80 leading-relaxed whitespace-pre-wrap break-words">
            {narrative}
          </div>
        </div>
      )}
      {expanded && !narrative && (
        <div className="border-t border-border px-4 py-4">
          <p className="text-xs text-muted-foreground italic">No narrative available for this report.</p>
        </div>
      )}
    </div>
  );
}
