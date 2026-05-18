"use client";

import DashboardShell from "@/app/components/DashboardShell";
import { trpc } from "@/app/lib/trpc";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis } from "recharts";
import { TrendingUp, Users, Trophy, Zap } from "lucide-react";

const GOLD = "#c9a84c";
const DIMENSIONS = ["Accuracy", "Efficiency", "Judgment", "Verification", "Communication", "Tool Fluency"];
const DIM_KEYS = ["accuracy", "efficiency", "judgment", "verification", "communication", "toolFluency"];

export default function ManagerTeamAnalytics() {
  const { data: teamStats, isLoading: statsLoading } = trpc.analytics.teamStats.useQuery();
  const { data: allCandidates, isLoading: candLoading } = trpc.analytics.allCandidates.useQuery();

  const isLoading = statsLoading || candLoading;

  // Build dimension averages from all scored candidates
  const scoredCandidates = (allCandidates ?? []).filter(c => c.score);
  const dimAverages = DIM_KEYS.map((key, i) => {
    const avg = scoredCandidates.length > 0
      ? Math.round(scoredCandidates.reduce((s, c) => s + ((c.score as any)?.[key] ?? 0), 0) / scoredCandidates.length)
      : 0;
    return { dimension: DIMENSIONS[i], value: avg };
  });

  // Score distribution buckets
  const buckets = [
    { range: "0–20", count: 0 }, { range: "21–40", count: 0 },
    { range: "41–60", count: 0 }, { range: "61–80", count: 0 }, { range: "81–100", count: 0 },
  ];
  scoredCandidates.forEach(({ score }) => {
    const s = score?.overallScore ?? 0;
    if (s <= 20) buckets[0].count++;
    else if (s <= 40) buckets[1].count++;
    else if (s <= 60) buckets[2].count++;
    else if (s <= 80) buckets[3].count++;
    else buckets[4].count++;
  });

  const avgOverall = scoredCandidates.length > 0
    ? Math.round(scoredCandidates.reduce((s, c) => s + (c.score?.overallScore ?? 0), 0) / scoredCandidates.length)
    : 0;

  const topPerformer = scoredCandidates.length > 0
    ? scoredCandidates.reduce((best, c) => (c.score?.overallScore ?? 0) > (best.score?.overallScore ?? 0) ? c : best)
    : null;

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload?.length) {
      return (
        <div className="bg-[#111] border border-[#222] rounded-lg px-3 py-2 text-xs">
          <div className="text-[#888]">{label}</div>
          <div className="text-[#c9a84c] font-bold">{payload[0].value}</div>
        </div>
      );
    }
    return null;
  };

  return (
    <DashboardShell>
      <div className="p-6 md:p-8 space-y-8">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight uppercase">Team Analytics</h1>
          <p className="text-[#555] text-sm mt-1">Aggregate performance intelligence across all assessments.</p>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Avg Score", value: avgOverall || "—", icon: Trophy, gold: true },
            { label: "Candidates Scored", value: scoredCandidates.length, icon: Users, gold: false },
            { label: "Top Score", value: topPerformer ? Math.round(topPerformer.score?.overallScore ?? 0) : "—", icon: TrendingUp, gold: false },
            { label: "AI Events", value: (teamStats ?? []).reduce((s: number, r: any) => s + (r.eventCount ?? 0), 0), icon: Zap, gold: false },
          ].map(({ label, value, icon: Icon, gold }) => (
            <div key={label} className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-5">
              <div className="flex items-center gap-2 mb-2">
                <Icon className="w-4 h-4 text-[#c9a84c]" />
                <span className="text-[#555] text-xs uppercase tracking-widest">{label}</span>
              </div>
              <div className={`text-3xl font-black ${gold ? "text-[#c9a84c]" : "text-white"}`}>{value}</div>
            </div>
          ))}
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[1, 2].map(i => <div key={i} className="h-64 bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl animate-pulse" />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Score distribution */}
            <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-6">
              <h3 className="text-white font-bold text-sm uppercase tracking-widest mb-6">Score Distribution</h3>
              {scoredCandidates.length === 0 ? (
                <div className="flex items-center justify-center h-40 text-[#444] text-sm">No scored candidates yet</div>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={buckets} barSize={28}>
                    <XAxis dataKey="range" tick={{ fill: "#555", fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: "#555", fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="count" fill={GOLD} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Dimension radar */}
            <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-6">
              <h3 className="text-white font-bold text-sm uppercase tracking-widest mb-6">Average by Dimension</h3>
              {scoredCandidates.length === 0 ? (
                <div className="flex items-center justify-center h-40 text-[#444] text-sm">No scored candidates yet</div>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <RadarChart data={dimAverages}>
                    <PolarGrid stroke="#1a1a1a" />
                    <PolarAngleAxis dataKey="dimension" tick={{ fill: "#555", fontSize: 10 }} />
                    <PolarRadiusAxis domain={[0, 100]} tick={{ fill: "#333", fontSize: 9 }} />
                    <Radar dataKey="value" stroke={GOLD} fill={GOLD} fillOpacity={0.15} strokeWidth={2} />
                  </RadarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        )}

        {/* Dimension bar chart */}
        {!isLoading && scoredCandidates.length > 0 && (
          <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-6">
            <h3 className="text-white font-bold text-sm uppercase tracking-widest mb-6">Average Dimension Scores</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={dimAverages} barSize={32}>
                <XAxis dataKey="dimension" tick={{ fill: "#555", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fill: "#555", fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" fill={GOLD} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Top performers table */}
        {!isLoading && scoredCandidates.length > 0 && (
          <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-[#1a1a1a]">
              <h3 className="text-white font-bold text-sm uppercase tracking-widest">Top Performers</h3>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#111]">
                  <th className="text-left text-[#555] text-xs uppercase tracking-widest font-bold px-6 py-3">Candidate</th>
                  <th className="text-left text-[#555] text-xs uppercase tracking-widest font-bold px-6 py-3 hidden md:table-cell">Campaign</th>
                  <th className="text-right text-[#555] text-xs uppercase tracking-widest font-bold px-6 py-3">Score</th>
                  <th className="text-right text-[#555] text-xs uppercase tracking-widest font-bold px-6 py-3 hidden sm:table-cell">Percentile</th>
                </tr>
              </thead>
              <tbody>
                {[...scoredCandidates]
                  .sort((a, b) => (b.score?.overallScore ?? 0) - (a.score?.overallScore ?? 0))
                  .slice(0, 10)
                  .map(({ assessment, campaign, score, candidate }) => (
                    <tr key={assessment.id} className="border-b border-[#111] hover:bg-[#111] transition-colors">
                      <td className="px-6 py-3">
                        <div className="text-white font-medium">{candidate?.name ?? "Pending"}</div>
                        <div className="text-[#555] text-xs">{candidate?.email ?? assessment.invitedEmail ?? "—"}</div>
                      </td>
                      <td className="px-6 py-3 hidden md:table-cell text-[#666] text-xs">{campaign?.title ?? "—"}</td>
                      <td className="px-6 py-3 text-right">
                        <span className={`text-lg font-black ${(score?.overallScore ?? 0) >= 80 ? "text-[#c9a84c]" : (score?.overallScore ?? 0) >= 60 ? "text-yellow-500" : "text-red-400"}`}>
                          {Math.round(score?.overallScore ?? 0)}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-right hidden sm:table-cell text-[#888] text-sm">
                        {score?.benchmarkPercentile != null ? `${Math.round(score.benchmarkPercentile)}th` : "—"}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </DashboardShell>
  );
}
