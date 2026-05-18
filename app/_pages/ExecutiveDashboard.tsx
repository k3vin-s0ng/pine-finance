"use client";

import { trpc } from "@/app/lib/trpc";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Clock,
  Shield,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";
import { useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import DashboardShell from "../components/DashboardShell";
import KpiCard from "../components/KpiCard";
import { Badge } from "../components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";

const CHART_COLORS = ["#22d3ee", "#34d399", "#fbbf24", "#a78bfa", "#f87171"];

const workflowLabels: Record<string, string> = {
  ap_invoice_coding: "AP Invoice Coding",
  ap_exception_handling: "AP Exceptions",
  ar_collections: "AR Collections",
  close_reconciliation: "Close Recon",
  close_checklist: "Close Checklist",
  fpa_variance_commentary: "FP&A Variance",
  fpa_forecast: "FP&A Forecast",
  fpa_budget: "FP&A Budget",
  reporting_management_pack: "Mgmt Pack",
  reporting_board_deck: "Board Deck",
  other: "Other",
};

export default function ExecutiveDashboard() {
  const [period, setPeriod] = useState("30");
  const [from] = useState(() => new Date(Date.now() - 30 * 86400000));
  const [to] = useState(() => new Date());

  const { data, isLoading } = trpc.intelligence.dashboard.executive.useQuery({ from, to });

  const workflowData = useMemo(() => {
    if (!data?.workflowPenetration) return [];
    return data.workflowPenetration.map((w) => ({
      name: workflowLabels[w.workflowType] ?? w.workflowType,
      sessions: Number(w.count),
      users: Number(w.uniqueUsers),
    }));
  }, [data]);

  const efficiencyData = useMemo(() => {
    if (!data?.workflowEfficiency) return [];
    return data.workflowEfficiency.slice(0, 6).map((w) => ({
      name: workflowLabels[w.workflowType] ?? w.workflowType,
      hoursSaved: Math.round(Number(w.avgHoursSaved) * 10) / 10,
      touchless: Math.round(Number(w.avgTouchless) * 10) / 10,
    }));
  }, [data]);

  if (isLoading) {
    return (
      <DashboardShell title="Executive Dashboard" subtitle="Organisation-wide AI performance">
        <div className="flex items-center justify-center h-64">
          <Activity className="text-primary animate-pulse" size={32} />
        </div>
      </DashboardShell>
    );
  }

  const kpis = data?.kpis;

  return (
    <DashboardShell
      title="Executive Dashboard"
      subtitle="Organisation-wide AI usage, efficiency, and governance"
      actions={
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-36 text-xs h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7">Last 7 days</SelectItem>
            <SelectItem value="30">Last 30 days</SelectItem>
            <SelectItem value="90">Last 90 days</SelectItem>
          </SelectContent>
        </Select>
      }
    >
      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <KpiCard
          title="Weekly Active AI Users"
          value={kpis?.weeklyActiveUsers ?? 0}
          description={`of ${kpis?.totalUsers ?? 0} total users`}
          icon={<Users size={16} />}
          color="teal"
        />
        <KpiCard
          title="Adoption Rate"
          value={kpis?.adoptionRate ?? 0}
          unit="%"
          description="weekly active / total"
          icon={<TrendingUp size={16} />}
          color="green"
        />
        <KpiCard
          title="Hours Saved"
          value={kpis?.hoursSaved ?? 0}
          unit="hrs"
          description="this period"
          icon={<Clock size={16} />}
          color="amber"
        />
        <KpiCard
          title="Touchless Rate"
          value={kpis?.touchlessRate ?? 0}
          unit="%"
          description="processed without edits"
          icon={<Zap size={16} />}
          color="teal"
        />
        <KpiCard
          title="Cycle Time Improvement"
          value={kpis?.cycleTimeImprovement ?? 0}
          unit="%"
          description="vs baseline"
          icon={<Activity size={16} />}
          color="green"
          trend={kpis?.cycleTimeImprovement}
        />
        <KpiCard
          title="Error Rate"
          value={kpis?.errorRate ?? 0}
          unit="%"
          description="AI-assisted outputs"
          icon={<AlertTriangle size={16} />}
          color="amber"
        />
        <KpiCard
          title="Governance Score"
          value={kpis?.governanceScore ?? 0}
          unit="/100"
          description="policy compliance"
          icon={<Shield size={16} />}
          color={kpis?.governanceScore && kpis.governanceScore >= 80 ? "green" : "red"}
        />
        <KpiCard
          title="Open Violations"
          value={kpis?.openViolations ?? 0}
          description="unresolved policy events"
          icon={<AlertTriangle size={16} />}
          color={kpis?.openViolations === 0 ? "green" : "red"}
        />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        {/* Workflow Penetration */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
              <BarChart3 size={16} className="text-primary" />
              Workflow Penetration
            </CardTitle>
          </CardHeader>
          <CardContent>
            {workflowData.length === 0 ? (
              <EmptyState message="No workflow data for this period" />
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={workflowData} margin={{ top: 0, right: 0, left: -20, bottom: 40 }}>
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
                  <Bar dataKey="users" name="Unique Users" fill="#34d399" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Efficiency by Workflow */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
              <TrendingUp size={16} className="text-primary" />
              Efficiency by Workflow
            </CardTitle>
          </CardHeader>
          <CardContent>
            {efficiencyData.length === 0 ? (
              <EmptyState message="No efficiency data available. Seed demo data to populate." />
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={efficiencyData} margin={{ top: 0, right: 0, left: -20, bottom: 40 }}>
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
                  <Bar dataKey="hoursSaved" name="Avg Hours Saved" fill="#fbbf24" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="touchless" name="Touchless %" fill="#a78bfa" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Governance summary */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Shield size={16} className="text-primary" />
            Governance Posture
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-muted/30 rounded-lg">
              <p className="text-2xl font-bold text-emerald-400">{kpis?.governanceScore ?? 0}</p>
              <p className="text-xs text-muted-foreground mt-1">Governance Score</p>
            </div>
            <div className="text-center p-3 bg-muted/30 rounded-lg">
              <p className="text-2xl font-bold text-red-400">{kpis?.openViolations ?? 0}</p>
              <p className="text-xs text-muted-foreground mt-1">Open Violations</p>
            </div>
            <div className="text-center p-3 bg-muted/30 rounded-lg">
              <p className="text-2xl font-bold text-cyan-400">{kpis?.compositeScore ?? 0}</p>
              <p className="text-xs text-muted-foreground mt-1">Avg Composite Score</p>
            </div>
            <div className="text-center p-3 bg-muted/30 rounded-lg">
              <p className="text-2xl font-bold text-amber-400">{kpis?.adoptionRate ?? 0}%</p>
              <p className="text-xs text-muted-foreground mt-1">Adoption Rate</p>
            </div>
          </div>
          <div className="mt-4 p-3 bg-muted/20 rounded-lg border border-border">
            <p className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">Note:</span> Scoring explicitly excludes raw prompt volume. Only effective, outcome-linked AI usage is rewarded across all five pillars: Adoption, Efficiency, Quality, Judgment, and Governance.
            </p>
          </div>
        </CardContent>
      </Card>
    </DashboardShell>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center h-40 text-muted-foreground text-xs">
      {message}
    </div>
  );
}
