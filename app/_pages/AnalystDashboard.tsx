"use client";

import { useAuth } from "@/app/_core/hooks/useAuth";
import { trpc } from "@/app/lib/trpc";
import {
  Activity,
  BarChart3,
  BookOpen,
  CheckCircle,
  Lightbulb,
  TrendingDown,
  TrendingUp,
  User,
} from "lucide-react";
import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import DashboardShell from "../components/DashboardShell";
import KpiCard from "../components/KpiCard";
import { Badge } from "../components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Progress } from "../components/ui/progress";

const workflowLabels: Record<string, string> = {
  ap_invoice_coding: "AP Invoice Coding",
  ap_exception_handling: "AP Exceptions",
  ar_collections: "AR Collections",
  close_reconciliation: "Close Recon",
  close_checklist: "Close Checklist",
  fpa_variance_commentary: "FP&A Variance",
  fpa_forecast: "FP&A Forecast",
  reporting_management_pack: "Mgmt Pack",
  other: "Other",
};

export default function AnalystDashboard() {
  const { user } = useAuth();
  const [from] = useState(() => new Date(Date.now() - 30 * 86400000));
  const [to] = useState(() => new Date());

  const { data, isLoading } = trpc.intelligence.dashboard.analyst.useQuery({ from, to });

  const usageData = useMemo(() => {
    if (!data?.usageByWorkflow) return [];
    return data.usageByWorkflow.map((w) => ({
      name: workflowLabels[w.workflowType] ?? w.workflowType,
      sessions: Number(w.count),
      accepted: Number(w.accepted),
      edited: Number(w.edited),
    }));
  }, [data]);

  const benchmarkData = useMemo(() => {
    if (!data?.usageByWorkflow || !data?.peerBenchmark) return [];
    const myMap: Record<string, number> = {};
    for (const w of data.usageByWorkflow) myMap[w.workflowType] = Number(w.count);
    const peerMap: Record<string, number> = {};
    for (const p of data.peerBenchmark) peerMap[p.workflowType] = p.avgCount;

    const allTypes = new Set([...Object.keys(myMap), ...Object.keys(peerMap)]);
    return Array.from(allTypes).map((type) => ({
      name: workflowLabels[type] ?? type,
      me: myMap[type] ?? 0,
      peers: Math.round(peerMap[type] ?? 0),
    }));
  }, [data]);

  // Identify underused workflows (peer avg > 2x personal usage)
  const underusedWorkflows = useMemo(() => {
    if (!data?.usageByWorkflow || !data?.peerBenchmark) return [];
    const myMap: Record<string, number> = {};
    for (const w of data.usageByWorkflow) myMap[w.workflowType] = Number(w.count);
    return data.peerBenchmark
      .filter((p) => p.avgCount > 2 && (myMap[p.workflowType] ?? 0) < p.avgCount * 0.5)
      .map((p) => workflowLabels[p.workflowType] ?? p.workflowType)
      .slice(0, 3);
  }, [data]);

  // Generate coaching suggestions (max 3)
  const coachingSuggestions = useMemo(() => {
    const suggestions: { type: "opportunity" | "strength" | "caution"; text: string }[] = [];
    const vb = data?.verificationBehavior;
    if (!vb) return suggestions;

    if (vb.blindAcceptanceRate > 60) {
      suggestions.push({
        type: "caution",
        text: `Your blind acceptance rate is ${vb.blindAcceptanceRate}%. Review AI outputs before accepting to reduce risk of undetected errors.`,
      });
    }
    if (underusedWorkflows.length > 0) {
      suggestions.push({
        type: "opportunity",
        text: `Try using AI for ${underusedWorkflows[0]} — your peers are seeing strong time savings in this workflow.`,
      });
    }
    if (vb.verificationRate > 75) {
      suggestions.push({
        type: "strength",
        text: `Your verification rate of ${vb.verificationRate}% is above the team average. This is a genuine strength — consider sharing your review process.`,
      });
    }
    if (suggestions.length < 3 && underusedWorkflows.length > 1) {
      suggestions.push({
        type: "opportunity",
        text: `${underusedWorkflows[1]} is another workflow where AI assistance could save you time this month.`,
      });
    }
    return suggestions.slice(0, 3);
  }, [data, underusedWorkflows]);

  const scores = data?.scores;
  const vb = data?.verificationBehavior;

  if (isLoading) {
    return (
      <DashboardShell title="Analyst Dashboard">
        <div className="flex items-center justify-center h-64">
          <Activity className="text-primary animate-pulse" size={32} />
        </div>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell
      title="Analyst Dashboard"
      subtitle={`Personal AI usage analytics — ${user?.name}`}
    >
      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <KpiCard
          title="Total AI Sessions"
          value={vb?.total ?? 0}
          description="this period"
          icon={<Activity size={16} />}
          color="teal"
        />
        <KpiCard
          title="Verification Rate"
          value={vb?.verificationRate ?? 0}
          unit="%"
          description="outputs reviewed before accepting"
          icon={<CheckCircle size={16} />}
          color={vb && vb.verificationRate >= 60 ? "green" : "amber"}
        />
        <KpiCard
          title="Blind Acceptance Rate"
          value={vb?.blindAcceptanceRate ?? 0}
          unit="%"
          description="accepted without review"
          icon={<TrendingDown size={16} />}
          color={vb && vb.blindAcceptanceRate > 60 ? "red" : "green"}
        />
        <KpiCard
          title="Composite Score"
          value={scores ? Math.round(Number(scores.compositeScore)) : "—"}
          unit={scores ? "/100" : ""}
          description="weighted across 5 pillars"
          icon={<BarChart3 size={16} />}
          color="teal"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        {/* Personal usage by workflow */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
              <BarChart3 size={16} className="text-primary" />
              My AI Usage by Workflow
            </CardTitle>
          </CardHeader>
          <CardContent>
            {usageData.length === 0 ? (
              <EmptyState />
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={usageData} margin={{ top: 0, right: 0, left: -20, bottom: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.26 0.018 255)" />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 10, fill: "oklch(0.60 0.012 255)" }}
                    angle={-35}
                    textAnchor="end"
                    interval={0}
                  />
                  <YAxis tick={{ fontSize: 10, fill: "oklch(0.60 0.012 255)" }} />
                  <Tooltip
                    contentStyle={{ background: "oklch(0.16 0.018 255)", border: "1px solid oklch(0.26 0.018 255)", borderRadius: "6px", fontSize: "11px" }}
                    labelStyle={{ color: "oklch(0.94 0.008 255)" }}
                  />
                  <Bar dataKey="sessions" name="Sessions" fill="#22d3ee" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="accepted" name="Accepted" fill="#34d399" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="edited" name="Edited" fill="#fbbf24" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Peer benchmark */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
              <User size={16} className="text-primary" />
              vs. Team Peers
            </CardTitle>
          </CardHeader>
          <CardContent>
            {benchmarkData.length === 0 ? (
              <EmptyState />
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={benchmarkData} margin={{ top: 0, right: 0, left: -20, bottom: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.26 0.018 255)" />
                  <XAxis
                    dataKey="name"
                    tick={{ fontSize: 10, fill: "oklch(0.60 0.012 255)" }}
                    angle={-35}
                    textAnchor="end"
                    interval={0}
                  />
                  <YAxis tick={{ fontSize: 10, fill: "oklch(0.60 0.012 255)" }} />
                  <Tooltip
                    contentStyle={{ background: "oklch(0.16 0.018 255)", border: "1px solid oklch(0.26 0.018 255)", borderRadius: "6px", fontSize: "11px" }}
                    labelStyle={{ color: "oklch(0.94 0.008 255)" }}
                  />
                  <Legend wrapperStyle={{ fontSize: "10px" }} />
                  <Bar dataKey="me" name="Me" fill="#22d3ee" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="peers" name="Peer Avg" fill="#a78bfa" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Score breakdown + coaching */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Score pillars */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
              <TrendingUp size={16} className="text-primary" />
              Score Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!scores ? (
              <EmptyState />
            ) : (
              <div className="space-y-3">
                {[
                  { label: "Adoption", value: Number(scores.adoptionScore), color: "bg-cyan-500" },
                  { label: "Efficiency", value: Number(scores.efficiencyScore), color: "bg-emerald-500" },
                  { label: "Quality", value: Number(scores.qualityScore), color: "bg-amber-500" },
                  { label: "Judgment", value: Number(scores.judgmentScore), color: "bg-purple-500" },
                  { label: "Governance", value: Number(scores.governanceScore), color: "bg-blue-500" },
                  { label: "Business Impact", value: Number(scores.businessImpactScore), color: "bg-pink-500" },
                ].map((pillar) => (
                  <div key={pillar.label}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-muted-foreground">{pillar.label}</span>
                      <span className="font-medium text-foreground">{Math.round(pillar.value)}</span>
                    </div>
                    <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full ${pillar.color} rounded-full transition-all`}
                        style={{ width: `${Math.min(pillar.value, 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
                <div className="mt-4 pt-3 border-t border-border flex justify-between items-center">
                  <span className="text-xs text-muted-foreground">Composite Score</span>
                  <span className="text-lg font-bold text-cyan-400">{Math.round(Number(scores.compositeScore))}/100</span>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  Scores do not include raw prompt volume. Only effective, outcome-linked usage is measured.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Coaching suggestions (max 3) */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Lightbulb size={16} className="text-primary" />
              Coaching Suggestions
            </CardTitle>
          </CardHeader>
          <CardContent>
            {coachingSuggestions.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-40 gap-2 text-emerald-400">
                <CheckCircle size={20} />
                <p className="text-xs text-muted-foreground text-center">
                  No coaching suggestions at this time. Keep up the great work!
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {coachingSuggestions.map((s, i) => (
                  <div
                    key={i}
                    className={`p-3 rounded-lg border text-xs leading-relaxed ${
                      s.type === "strength"
                        ? "bg-emerald-950/40 border-emerald-900/50 text-emerald-300"
                        : s.type === "caution"
                        ? "bg-amber-950/40 border-amber-900/50 text-amber-300"
                        : "bg-cyan-950/40 border-cyan-900/50 text-cyan-300"
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      <span className="shrink-0 mt-0.5">
                        {s.type === "strength" ? "✓" : s.type === "caution" ? "⚠" : "→"}
                      </span>
                      <span>{s.text}</span>
                    </div>
                  </div>
                ))}
                {underusedWorkflows.length > 0 && (
                  <div className="mt-2 p-2 bg-muted/20 rounded-md">
                    <p className="text-[10px] text-muted-foreground">
                      <span className="font-medium text-foreground">Underused workflows:</span>{" "}
                      {underusedWorkflows.join(", ")}
                    </p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
}

function EmptyState() {
  return (
    <div className="flex items-center justify-center h-40 text-muted-foreground text-xs">
      No data available for this period
    </div>
  );
}
