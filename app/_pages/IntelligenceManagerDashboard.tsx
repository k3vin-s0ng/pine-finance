"use client";

import { trpc } from "@/app/lib/trpc";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  CheckCircle,
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
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../components/ui/table";

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

export default function ManagerDashboard() {
  const [from] = useState(() => new Date(Date.now() - 30 * 86400000));
  const [to] = useState(() => new Date());

  const { data: teams } = trpc.intelligence.teams.list.useQuery();
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);

  const teamId = selectedTeamId ?? teams?.[0]?.id ?? 0;

  const { data, isLoading } = trpc.intelligence.dashboard.manager.useQuery(
    { teamId, from, to },
    { enabled: teamId > 0 }
  );

  const workflowData = useMemo(() => {
    if (!data?.workflowPenetration) return [];
    return data.workflowPenetration.map((w) => ({
      name: workflowLabels[w.workflowType] ?? w.workflowType,
      sessions: Number(w.count),
      accepted: Number(w.accepted),
      edited: Number(w.edited),
      users: Number(w.users),
    }));
  }, [data]);

  const scoreData = useMemo(() => {
    if (!data?.scores) return [];
    const s = data.scores;
    return [
      { subject: "Adoption", score: Number(s.adoptionScore) },
      { subject: "Efficiency", score: Number(s.efficiencyScore) },
      { subject: "Quality", score: Number(s.qualityScore) },
      { subject: "Judgment", score: Number(s.judgmentScore) },
      { subject: "Governance", score: Number(s.governanceScore) },
      { subject: "Impact", score: Number(s.businessImpactScore) },
    ];
  }, [data]);

  if (isLoading || !teams) {
    return (
      <DashboardShell title="Manager Dashboard">
        <div className="flex items-center justify-center h-64">
          <Activity className="text-primary animate-pulse" size={32} />
        </div>
      </DashboardShell>
    );
  }

  const openAlerts = data?.governanceAlerts?.reduce((sum, a) => sum + Number(a.count), 0) ?? 0;
  const metrics = data?.teamMetrics?.[0];

  return (
    <DashboardShell
      title="Manager Dashboard"
      subtitle="Team AI adoption, efficiency, and governance"
      actions={
        <Select
          value={String(teamId)}
          onValueChange={(v) => setSelectedTeamId(Number(v))}
        >
          <SelectTrigger className="w-44 text-xs h-8">
            <SelectValue placeholder="Select team" />
          </SelectTrigger>
          <SelectContent>
            {teams.map((t) => (
              <SelectItem key={t.id} value={String(t.id)}>
                {t.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      }
    >
      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-6">
        <KpiCard
          title="Team Members"
          value={data?.memberCount ?? 0}
          icon={<Users size={16} />}
          color="teal"
        />
        <KpiCard
          title="Active This Week"
          value={data?.activeThisWeek ?? 0}
          description={`${data?.adoptionRate ?? 0}% adoption`}
          icon={<Activity size={16} />}
          color="green"
        />
        <KpiCard
          title="Hours Saved"
          value={metrics ? Math.round(Number(metrics.hoursSaved) * 10) / 10 : 0}
          unit="hrs"
          icon={<Clock size={16} />}
          color="amber"
        />
        <KpiCard
          title="Touchless Rate"
          value={metrics ? Math.round(Number(metrics.touchlessRate) * 10) / 10 : 0}
          unit="%"
          icon={<Zap size={16} />}
          color="teal"
        />
        <KpiCard
          title="Open Governance Alerts"
          value={openAlerts}
          icon={<AlertTriangle size={16} />}
          color={openAlerts === 0 ? "green" : "red"}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {/* Workflow penetration */}
        <div className="lg:col-span-2">
          <Card className="bg-card border-border h-full">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                <BarChart3 size={16} className="text-primary" />
                Workflow Usage Breakdown
              </CardTitle>
            </CardHeader>
            <CardContent>
              {workflowData.length === 0 ? (
                <EmptyState />
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
                    <Bar dataKey="sessions" name="Total Sessions" fill="#22d3ee" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="accepted" name="Accepted" fill="#34d399" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="edited" name="Edited" fill="#fbbf24" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Score radar */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
              <TrendingUp size={16} className="text-primary" />
              Team Score Profile
            </CardTitle>
          </CardHeader>
          <CardContent>
            {scoreData.length === 0 ? (
              <EmptyState />
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <RadarChart data={scoreData}>
                  <PolarGrid stroke="oklch(0.26 0.018 255)" />
                  <PolarAngleAxis dataKey="subject" tick={{ fontSize: 10, fill: "oklch(0.60 0.012 255)" }} />
                  <Radar
                    name="Score"
                    dataKey="score"
                    stroke="#22d3ee"
                    fill="#22d3ee"
                    fillOpacity={0.2}
                  />
                  <Tooltip
                    contentStyle={{ background: "oklch(0.16 0.018 255)", border: "1px solid oklch(0.26 0.018 255)", borderRadius: "6px", fontSize: "11px" }}
                  />
                </RadarChart>
              </ResponsiveContainer>
            )}
            {data?.scores && (
              <div className="mt-2 text-center">
                <span className="text-2xl font-bold text-cyan-400">{Math.round(Number(data.scores.compositeScore))}</span>
                <span className="text-xs text-muted-foreground ml-1">/100 composite</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Sessions per user table */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Users size={16} className="text-primary" />
              Sessions by Team Member
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!data?.sessionsPerUser || data.sessionsPerUser.length === 0 ? (
              <EmptyState />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="border-border">
                    <TableHead className="text-xs text-muted-foreground">User ID</TableHead>
                    <TableHead className="text-xs text-muted-foreground text-right">Sessions</TableHead>
                    <TableHead className="text-xs text-muted-foreground text-right">Workflows</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.sessionsPerUser.slice(0, 8).map((row) => (
                    <TableRow key={row.userId} className="border-border">
                      <TableCell className="text-xs text-foreground">User #{row.userId}</TableCell>
                      <TableCell className="text-xs text-right text-cyan-400 font-medium">{Number(row.sessions)}</TableCell>
                      <TableCell className="text-xs text-right text-muted-foreground">{Number(row.workflows)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Governance alerts */}
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Shield size={16} className="text-primary" />
              Governance Alerts
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!data?.governanceAlerts || data.governanceAlerts.length === 0 ? (
              <div className="flex items-center gap-2 py-6 justify-center text-emerald-400">
                <CheckCircle size={16} />
                <span className="text-xs">No open governance alerts</span>
              </div>
            ) : (
              <div className="space-y-2">
                {data.governanceAlerts.map((alert) => (
                  <div
                    key={alert.severity}
                    className="flex items-center justify-between p-2 bg-muted/30 rounded-md"
                  >
                    <div className="flex items-center gap-2">
                      <AlertTriangle
                        size={14}
                        className={
                          alert.severity === "critical" || alert.severity === "high"
                            ? "text-red-400"
                            : "text-amber-400"
                        }
                      />
                      <span className="text-xs text-foreground capitalize">{alert.severity} severity</span>
                    </div>
                    <Badge
                      variant="outline"
                      className={
                        alert.severity === "critical" || alert.severity === "high"
                          ? "border-red-800 text-red-400 text-[10px]"
                          : "border-amber-800 text-amber-400 text-[10px]"
                      }
                    >
                      {Number(alert.count)} open
                    </Badge>
                  </div>
                ))}
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
