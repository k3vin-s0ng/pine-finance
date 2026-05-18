"use client";

import { Link } from "@/app/lib/wouter";
import DashboardShell from "@/app/components/DashboardShell";
import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import { trpc } from "@/app/lib/trpc";
import { FileText, ArrowRight, Download, Trophy, Clock, TrendingUp } from "lucide-react";

const DIMENSION_LABELS: Record<string, string> = {
  accuracy: "Accuracy",
  efficiency: "Efficiency",
  judgment: "Judgment",
  verification: "Verification",
  communication: "Communication",
  toolFluency: "Tool Fluency",
};

function ScoreRing({ score, size = 56 }: { score: number; size?: number }) {
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const pct = Math.min(100, Math.max(0, score)) / 100;
  const color = score >= 80 ? "#c9a84c" : score >= 60 ? "#f59e0b" : "#ef4444";
  return (
    <svg width={size} height={size} className="rotate-[-90deg]">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#1a1a1a" strokeWidth={6} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={color} strokeWidth={6}
        strokeDasharray={circ}
        strokeDashoffset={circ * (1 - pct)}
        strokeLinecap="round"
      />
      <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central"
        className="rotate-90" style={{ transform: `rotate(90deg) translate(0, 0)`, transformOrigin: "center", fill: color, fontSize: size * 0.22, fontWeight: 900 }}>
      </text>
    </svg>
  );
}

export default function CandidateReports() {
  const { data: items, isLoading } = trpc.recruiter.myCandidateScores.useQuery();

  const scored = items?.filter(i => i.score) ?? [];
  const pending = items?.filter(i => !i.score) ?? [];

  const avgScore = scored.length > 0
    ? Math.round(scored.reduce((s, i) => s + (i.score?.overallScore ?? 0), 0) / scored.length)
    : null;

  const bestScore = scored.length > 0
    ? Math.max(...scored.map(i => i.score?.overallScore ?? 0))
    : null;

  return (
    <DashboardShell>
      <div className="p-6 md:p-8 space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight uppercase">My Reports</h1>
          <p className="text-[#555] text-sm mt-1">Your AI fluency assessment results and score breakdowns.</p>
        </div>

        {/* Summary cards */}
        {scored.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-5">
              <div className="flex items-center gap-2 mb-2">
                <Trophy className="w-4 h-4 text-[#c9a84c]" />
                <span className="text-[#555] text-xs uppercase tracking-widest">Best Score</span>
              </div>
              <div className="text-3xl font-black text-[#c9a84c]">{Math.round(bestScore ?? 0)}</div>
              <div className="text-[#444] text-xs mt-1">out of 100</div>
            </div>
            <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-5">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-[#c9a84c]" />
                <span className="text-[#555] text-xs uppercase tracking-widest">Average Score</span>
              </div>
              <div className="text-3xl font-black text-white">{avgScore ?? "—"}</div>
              <div className="text-[#444] text-xs mt-1">across {scored.length} assessment{scored.length !== 1 ? "s" : ""}</div>
            </div>
            <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-5">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="w-4 h-4 text-[#c9a84c]" />
                <span className="text-[#555] text-xs uppercase tracking-widest">Reports Ready</span>
              </div>
              <div className="text-3xl font-black text-white">{scored.length}</div>
              <div className="text-[#444] text-xs mt-1">{pending.length} pending scoring</div>
            </div>
          </div>
        )}

        {/* Loading */}
        {isLoading && (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl animate-pulse" />
            ))}
          </div>
        )}

        {/* Scored reports */}
        {!isLoading && scored.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-xs font-bold text-[#555] uppercase tracking-widest">Scored Reports</h2>
            {scored.map(({ assessment, campaign, score, pdf }) => (
              <div key={assessment.id} className="bg-[#0d0d0d] border border-[#1a1a1a] hover:border-[#c9a84c]/30 rounded-xl p-5 transition-colors">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4 min-w-0">
                    {/* Score ring */}
                    <div className="relative flex-shrink-0">
                      <ScoreRing score={score?.overallScore ?? 0} size={56} />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-sm font-black" style={{ color: (score?.overallScore ?? 0) >= 80 ? "#c9a84c" : (score?.overallScore ?? 0) >= 60 ? "#f59e0b" : "#ef4444" }}>
                          {Math.round(score?.overallScore ?? 0)}
                        </span>
                      </div>
                    </div>
                    <div className="min-w-0">
                      <div className="text-white font-bold truncate">{campaign?.title ?? "Assessment"}</div>
                      <div className="text-[#555] text-xs mt-0.5">{campaign?.roleTemplate}</div>
                      <div className="flex items-center gap-3 mt-2">
                        {score?.benchmarkPercentile != null && (
                          <span className="text-[#c9a84c] text-xs font-bold">
                            Top {100 - Math.round(score.benchmarkPercentile)}% of cohort
                          </span>
                        )}
                        <span className="text-[#444] text-xs">
                          {assessment.submittedAt ? new Date(assessment.submittedAt).toLocaleDateString() : ""}
                        </span>
                      </div>
                      {/* Dimension mini-bars */}
                      {score && (
                        <div className="flex gap-2 mt-3 flex-wrap">
                          {Object.entries(DIMENSION_LABELS).map(([key, label]) => {
                            const val = Math.round((score as any)[key] ?? 0);
                            return (
                              <div key={key} className="flex items-center gap-1.5">
                                <div className="w-12 h-1 bg-[#1a1a1a] rounded-full overflow-hidden">
                                  <div className="h-full bg-[#c9a84c] rounded-full" style={{ width: `${val}%` }} />
                                </div>
                                <span className="text-[#444] text-[10px]">{label.split(" ")[0]}</span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {pdf?.url && (
                      <a href={pdf.url} target="_blank" rel="noopener noreferrer">
                        <Button size="sm" variant="outline" className="border-[#1a1a1a] text-[#888] hover:text-white hover:border-[#333] text-xs">
                          <Download className="w-3 h-3 mr-1" /> PDF
                        </Button>
                      </a>
                    )}
                    <Link href={`/report/${assessment.id}`}>
                      <Button size="sm" className="bg-[#c9a84c] hover:bg-[#b8963e] text-black font-bold text-xs">
                        View Report <ArrowRight className="w-3 h-3 ml-1" />
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pending assessments */}
        {!isLoading && pending.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-xs font-bold text-[#555] uppercase tracking-widest">Pending / In Progress</h2>
            {pending.map(({ assessment, campaign }) => (
              <div key={assessment.id} className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-5">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-14 h-14 rounded-full border-2 border-[#1a1a1a] flex items-center justify-center flex-shrink-0">
                      <Clock className="w-5 h-5 text-[#444]" />
                    </div>
                    <div>
                      <div className="text-white font-bold">{campaign?.title ?? "Assessment"}</div>
                      <div className="text-[#555] text-xs mt-0.5">{campaign?.roleTemplate}</div>
                      <Badge className="mt-2 text-[10px] px-2 py-0.5 bg-[#1a1a1a] text-[#888] border-0 capitalize">
                        {assessment.status.replace("_", " ")}
                      </Badge>
                    </div>
                  </div>
                  {(assessment.status === "invited" || assessment.status === "in_progress") && (
                    <Link href={`/assessment/${assessment.id}`}>
                      <Button size="sm" variant="outline" className="border-[#333] text-[#888] hover:text-white text-xs">
                        {assessment.status === "invited" ? "Start" : "Continue"} <ArrowRight className="w-3 h-3 ml-1" />
                      </Button>
                    </Link>
                  )}
                  {assessment.status === "submitted" && (
                    <span className="text-[#555] text-xs">Awaiting scoring</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!isLoading && (!items || items.length === 0) && (
          <div className="text-center py-20 border border-dashed border-[#1a1a1a] rounded-xl">
            <FileText className="w-10 h-10 text-[#333] mx-auto mb-4" />
            <div className="text-[#555] font-bold">No assessments yet</div>
            <div className="text-[#333] text-sm mt-1">You'll see your reports here once you've been invited to an assessment.</div>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
