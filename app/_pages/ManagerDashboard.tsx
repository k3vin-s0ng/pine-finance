"use client";

import DashboardShell from "@/app/components/DashboardShell";
import { trpc } from "@/app/lib/trpc";
import { useAuth } from "@/app/_core/hooks/useAuth";
import { BarChart3, TrendingUp, Users, Zap, Target, ArrowUp } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid, Legend
} from "recharts";

const MOCK_TEAM_DATA = [
  { name: "Alice Chen", role: "IB Analyst", aiScore: 88, promptsPerDay: 24, efficiency: 92, trend: "+5" },
  { name: "James Park", role: "PE Associate", aiScore: 76, promptsPerDay: 18, efficiency: 78, trend: "+2" },
  { name: "Sarah Kim", role: "FP&A Analyst", aiScore: 82, promptsPerDay: 31, efficiency: 85, trend: "+8" },
  { name: "Michael Torres", role: "IB Analyst", aiScore: 71, promptsPerDay: 12, efficiency: 69, trend: "-1" },
  { name: "Emma Wilson", role: "HF Research", aiScore: 94, promptsPerDay: 42, efficiency: 96, trend: "+11" },
];

const MOCK_USAGE_TREND = [
  { week: "W1", prompts: 120, efficiency: 68 },
  { week: "W2", prompts: 145, efficiency: 72 },
  { week: "W3", prompts: 178, efficiency: 76 },
  { week: "W4", prompts: 201, efficiency: 81 },
  { week: "W5", prompts: 234, efficiency: 84 },
  { week: "W6", prompts: 267, efficiency: 87 },
];

const MOCK_DIM_DATA = [
  { dim: "Accuracy", score: 84 },
  { dim: "Efficiency", score: 79 },
  { dim: "Judgment", score: 76 },
  { dim: "Verification", score: 71 },
  { dim: "Communication", score: 88 },
  { dim: "Tool Fluency", score: 82 },
];

const CUSTOM_TOOLTIP_STYLE = {
  contentStyle: { background: "#0d0d0d", border: "1px solid #1a1a1a", borderRadius: "8px", color: "#fff" },
  labelStyle: { color: "#c9a84c" },
};

export default function ManagerDashboard() {
  const { user } = useAuth();
  const { data: usageData } = trpc.analytics.teamStats.useQuery();

  const teamAvgScore = Math.round(MOCK_TEAM_DATA.reduce((s, m) => s + m.aiScore, 0) / MOCK_TEAM_DATA.length);
  const topPerformer = MOCK_TEAM_DATA.reduce((a, b) => a.aiScore > b.aiScore ? a : b);

  return (
    <DashboardShell title="Team Manager Dashboard">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Team Size", value: MOCK_TEAM_DATA.length, icon: Users, color: "text-[#c9a84c]" },
          { label: "Avg AI Score", value: teamAvgScore, icon: Target, color: "text-green-400" },
          { label: "Top Performer", value: topPerformer.name.split(" ")[0], icon: Zap, color: "text-yellow-400", isText: true },
          { label: "Avg Daily Prompts", value: Math.round(MOCK_TEAM_DATA.reduce((s, m) => s + m.promptsPerDay, 0) / MOCK_TEAM_DATA.length), icon: BarChart3, color: "text-blue-400" },
        ].map(stat => (
          <div key={stat.label} className="p-5 bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[#555] text-[10px] font-bold tracking-widest uppercase">{stat.label}</span>
              <stat.icon className={`w-4 h-4 ${stat.color}`} />
            </div>
            <div className={`font-black text-white ${stat.isText ? "text-xl" : "text-3xl"}`}>{stat.value}</div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        {/* Usage trend */}
        <div className="p-6 bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl">
          <h3 className="text-white font-bold text-sm uppercase tracking-widest mb-5">AI Usage Trend (6 Weeks)</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={MOCK_USAGE_TREND}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" />
              <XAxis dataKey="week" tick={{ fill: "#555", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#555", fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip {...CUSTOM_TOOLTIP_STYLE} />
              <Legend wrapperStyle={{ color: "#888", fontSize: 11 }} />
              <Line type="monotone" dataKey="prompts" stroke="#c9a84c" strokeWidth={2} dot={false} name="Prompts/Week" />
              <Line type="monotone" dataKey="efficiency" stroke="#888" strokeWidth={2} dot={false} name="Efficiency Score" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Dimension breakdown */}
        <div className="p-6 bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl">
          <h3 className="text-white font-bold text-sm uppercase tracking-widest mb-5">Team Avg by Dimension</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={MOCK_DIM_DATA} layout="vertical" barSize={14}>
              <XAxis type="number" domain={[0, 100]} tick={{ fill: "#555", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="dim" tick={{ fill: "#888", fontSize: 11 }} axisLine={false} tickLine={false} width={90} />
              <Tooltip {...CUSTOM_TOOLTIP_STYLE} />
              <Bar dataKey="score" fill="#c9a84c" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Team members table */}
      <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-[#1a1a1a]">
          <h2 className="text-white font-bold text-sm uppercase tracking-widest">Team Members — AI Fluency Scores</h2>
        </div>
        <div className="divide-y divide-[#111]">
          {MOCK_TEAM_DATA.sort((a, b) => b.aiScore - a.aiScore).map((member, i) => (
            <div key={member.name} className="px-6 py-4 flex items-center gap-4 hover:bg-[#0d0d0d] transition-colors">
              <div className="w-6 text-[#555] text-xs font-bold text-center">{i + 1}</div>
              <div className="w-9 h-9 rounded-full bg-[#c9a84c]/10 flex items-center justify-center flex-shrink-0">
                <span className="text-[#c9a84c] text-sm font-bold">{member.name[0]}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-white font-semibold text-sm">{member.name}</div>
                <div className="text-[#555] text-xs">{member.role}</div>
              </div>
              <div className="text-center w-20">
                <div className={`text-xl font-black ${member.aiScore >= 85 ? "text-gold-gradient" : "text-white"}`}>{member.aiScore}</div>
                <div className="text-[#555] text-[10px]">AI Score</div>
              </div>
              <div className="text-center w-20">
                <div className="text-white font-semibold text-sm">{member.promptsPerDay}</div>
                <div className="text-[#555] text-[10px]">Prompts/Day</div>
              </div>
              <div className="text-center w-20">
                <div className="text-white font-semibold text-sm">{member.efficiency}%</div>
                <div className="text-[#555] text-[10px]">Efficiency</div>
              </div>
              <div className={`text-xs font-bold w-12 text-right ${member.trend.startsWith("+") ? "text-green-400" : "text-red-400"}`}>
                {member.trend}
              </div>
            </div>
          ))}
        </div>
      </div>
    </DashboardShell>
  );
}
