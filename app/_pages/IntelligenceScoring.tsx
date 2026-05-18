"use client";

import { trpc } from "@/app/lib/trpc";
import { useAuth } from "@/app/_core/hooks/useAuth";
import {
  Activity,
  Award,
  BarChart2,
  BookOpen,
  CheckCircle,
  Info,
  RefreshCw,
  Shield,
  Sparkles,
  Target,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";
import { useState } from "react";
import DashboardShell from "../components/DashboardShell";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Progress } from "../components/ui/progress";
import { Separator } from "../components/ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "../components/ui/tooltip";
import { toast } from "sonner";

const PILLARS = [
  {
    key: "adoption",
    label: "Adoption",
    icon: Users,
    color: "text-cyan-400",
    bg: "bg-cyan-950/40 border-cyan-900/50",
    weight: 20,
    description:
      "Measures breadth of AI tool usage across finance workflows. Does NOT reward raw prompt volume — only workflow coverage and active session quality.",
  },
  {
    key: "efficiency",
    label: "Efficiency",
    icon: Zap,
    color: "text-amber-400",
    bg: "bg-amber-950/40 border-amber-900/50",
    weight: 25,
    description:
      "Cycle time reduction, throughput improvement, touchless processing rate, and backlog reduction. Measures real workflow outcomes.",
  },
  {
    key: "quality",
    label: "Quality",
    icon: CheckCircle,
    color: "text-emerald-400",
    bg: "bg-emerald-950/40 border-emerald-900/50",
    weight: 25,
    description:
      "Error rate, rework rate, exception handling, and output accuracy. Rewards careful, high-quality AI-assisted work.",
  },
  {
    key: "judgment",
    label: "Judgment",
    icon: Target,
    color: "text-purple-400",
    bg: "bg-purple-950/40 border-purple-900/50",
    weight: 15,
    description:
      "Verification behaviour, override rate, blind acceptance rate, and human escalation on complex cases. Rewards thoughtful AI oversight.",
  },
  {
    key: "governance",
    label: "Governance",
    icon: Shield,
    color: "text-rose-400",
    bg: "bg-rose-950/40 border-rose-900/50",
    weight: 15,
    description:
      "Audit-trail completeness, human approval rates on high-risk workflows, policy exception rate, and compliance with tool usage policies.",
  },
];

export default function Scoring() {
  const { user } = useAuth();
  const [from] = useState(() => new Date(Date.now() - 30 * 86400000));
  const [to] = useState(() => new Date());

  const { data: scoresData, isLoading, refetch } = trpc.intelligence.scoring.getScores.useQuery({
    userId: user?.id,
  });
  const myScore = scoresData?.[0];

  const { data: teamScores, isLoading: teamLoading } = trpc.intelligence.scoring.getScores.useQuery({});

  const { data: weightsData } = trpc.intelligence.scoring.weights.useQuery();
  const weights = weightsData ? [
    { pillar: "adoption", weight: Number(weightsData.adoptionWeight ?? 20) },
    { pillar: "efficiency", weight: Number(weightsData.efficiencyWeight ?? 25) },
    { pillar: "quality", weight: Number(weightsData.qualityWeight ?? 25) },
    { pillar: "judgment", weight: Number(weightsData.judgmentWeight ?? 15) },
    { pillar: "governance", weight: Number(weightsData.governanceWeight ?? 15) },
  ] : null;

  const displayScore = Number(myScore?.compositeScore ?? 0);

  return (
    <DashboardShell
      title="Scoring Framework"
      subtitle="5-pillar composite score — Adoption, Efficiency, Quality, Judgment, Governance. Raw prompt volume is never rewarded."
    >
      {/* Design principle callout */}
      <div className="mb-6 p-4 bg-amber-950/20 border border-amber-900/40 rounded-lg flex items-start gap-3">
        <Info size={16} className="text-amber-400 shrink-0 mt-0.5" />
        <div>
          <p className="text-xs font-medium text-amber-300 mb-1">Scoring Design Principle</p>
          <p className="text-xs text-muted-foreground">
            This framework explicitly <span className="text-foreground font-medium">does not reward raw prompt volume</span> in any way. High scores reflect meaningful workflow outcomes, responsible AI oversight, quality of work, and governance compliance — not the number of prompts submitted.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* My composite score */}
        <div className="lg:col-span-1 space-y-4">
          <Card className="bg-card border-border">
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Award size={16} className="text-primary" />
                My Composite Score
              </CardTitle>
              <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => refetch()}>
                <RefreshCw size={12} />
              </Button>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center h-24">
                  <Activity className="text-primary animate-pulse" size={20} />
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-center my-4">
                    <div className="relative w-28 h-28">
                      <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                        <circle cx="50" cy="50" r="40" fill="none" stroke="hsl(var(--muted))" strokeWidth="10" />
                        <circle
                          cx="50"
                          cy="50"
                          r="40"
                          fill="none"
                          stroke="hsl(var(--primary))"
                          strokeWidth="10"
                          strokeDasharray={`${(displayScore / 100) * 251.2} 251.2`}
                          strokeLinecap="round"
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-2xl font-bold text-foreground">{Math.round(displayScore)}</span>
                        <span className="text-[10px] text-muted-foreground">/ 100</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {PILLARS.map((p) => {
                      const score = (myScore as any)?.[`${p.key}Score`] ?? 0;
                      const Icon = p.icon;
                      return (
                        <div key={p.key}>
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-1.5">
                              <Icon size={11} className={p.color} />
                              <span className="text-[11px] text-muted-foreground">{p.label}</span>
                              <span className="text-[10px] text-muted-foreground/60">({p.weight}%)</span>
                            </div>
                            <span className="text-[11px] font-medium text-foreground">{Math.round(score)}</span>
                          </div>
                          <Progress value={score} className="h-1" />
                        </div>
                      );
                    })}
                  </div>

                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full mt-4 text-xs gap-1"
                    onClick={() => refetch()}
                  >
                    <RefreshCw size={12} />
                    Refresh Score
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Pillar details */}
        <div className="lg:col-span-2 space-y-3">
          <h3 className="text-sm font-semibold text-foreground">Pillar Definitions</h3>
          {PILLARS.map((p) => {
            const Icon = p.icon;
            const activeWeight = weights?.find((w: any) => w.pillar === p.key);
            const effectiveWeight = activeWeight?.weight ?? p.weight;
            return (
              <div key={p.key} className={`p-4 rounded-lg border ${p.bg}`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <Icon size={16} className={`${p.color} shrink-0 mt-0.5`} />
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-foreground">{p.label}</span>
                        <Badge variant="outline" className={`text-[10px] ${p.color} border-current`}>
                          {effectiveWeight}% weight
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed">{p.description}</p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Team leaderboard */}
          {teamScores && teamScores.length > 0 && (
            <div className="mt-4">
              <h3 className="text-sm font-semibold text-foreground mb-3">Team Benchmark</h3>
              <Card className="bg-card border-border">
                <CardContent className="pt-4">
                  <div className="space-y-3">
                    {teamScores.slice(0, 8).map((ts: any, i: number) => (
                      <div key={ts.userId ?? i} className="flex items-center gap-3">
                        <span className="text-[11px] text-muted-foreground w-4 shrink-0">{i + 1}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-foreground truncate">
                              {ts.userName ?? `User ${ts.userId}`}
                              {ts.userId === user?.id && (
                                <span className="ml-1 text-[10px] text-primary">(you)</span>
                              )}
                            </span>
                            <span className="text-xs font-medium text-foreground shrink-0 ml-2">
                              {Math.round(ts.compositeScore ?? 0)}
                            </span>
                          </div>
                          <Progress value={ts.compositeScore ?? 0} className="h-1" />
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </DashboardShell>
  );
}
