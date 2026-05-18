"use client";

import DashboardShell from "@/app/components/DashboardShell";
import { trpc } from "@/app/lib/trpc";
import { useAuth } from "@/app/_core/hooks/useAuth";
import { BarChart3, Zap, TrendingUp, Clock, Target, Users } from "lucide-react";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  BarChart, Bar, CartesianGrid, Cell, PieChart, Pie, Legend
} from "recharts";

const MOCK_DAILY = [
  { day: "Mon", prompts: 42, quality: 74 },
  { day: "Tue", prompts: 58, quality: 78 },
  { day: "Wed", prompts: 71, quality: 81 },
  { day: "Thu", prompts: 65, quality: 79 },
  { day: "Fri", prompts: 89, quality: 85 },
  { day: "Sat", prompts: 23, quality: 88 },
  { day: "Sun", prompts: 18, quality: 82 },
];

const MOCK_WORKFLOWS = [
  { name: "Financial Analysis", count: 312, color: "#c9a84c" },
  { name: "Report Drafting", count: 241, color: "#888" },
  { name: "Data Reconciliation", count: 178, color: "#7a9e7e" },
  { name: "Research Synthesis", count: 156, color: "#6b8cba" },
  { name: "Model Review", count: 98, color: "#b07a9e" },
];

const MOCK_TOOLS = [
  { name: "Pine AI", value: 45, color: "#c9a84c" },
  { name: "ChatGPT", value: 28, color: "#888" },
  { name: "Copilot", value: 18, color: "#555" },
  { name: "Other", value: 9, color: "#333" },
];

const CUSTOM_TOOLTIP = {
  contentStyle: { background: "#0d0d0d", border: "1px solid #1a1a1a", borderRadius: "8px", color: "#fff", fontSize: 11 },
  labelStyle: { color: "#c9a84c" },
};

export default function AIUsageDashboard() {
  const { user } = useAuth();
  const { data: myUsage } = trpc.analytics.myUsage.useQuery();

  const isManager = user?.role === "manager" || user?.role === "admin";

  const totalPrompts = myUsage?.length ?? 0;
  const avgQuality = myUsage?.length
    ? Math.round(myUsage.reduce((s, e) => s + (e.qualityScore ?? 70), 0) / myUsage.length)
    : 0;

  return (
    <DashboardShell title="AI Usage Intelligence">
      {/* Header */}
      <div className="mb-8 p-6 bg-[#0a0a0a] border border-[#c9a84c]/20 rounded-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 opacity-5"
          style={{ background: "radial-gradient(circle, #c9a84c, transparent)" }} />
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-4 h-4 text-[#c9a84c]" />
            <span className="text-[#c9a84c] text-xs font-bold tracking-widest uppercase">AI Usage Intelligence</span>
          </div>
          <h2 className="text-xl font-black text-white uppercase tracking-tight mb-1">
            {isManager ? "Team AI Adoption Analytics" : "My AI Usage"}
          </h2>
          <p className="text-[#666] text-sm">
            {isManager
              ? "Monitor how your team uses AI tools, identify top performers, and surface coaching opportunities."
              : "Track your personal AI usage patterns and efficiency over time."}
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Total Prompts", value: isManager ? "985" : totalPrompts || "—", icon: Zap, color: "text-[#c9a84c]" },
          { label: "Avg Quality Score", value: isManager ? "81" : avgQuality || "—", icon: Target, color: "text-green-400" },
          { label: "Active Days", value: isManager ? "22" : "—", icon: Clock, color: "text-blue-400" },
          { label: isManager ? "Team Members" : "Workflows Used", value: isManager ? "5" : "3", icon: Users, color: "text-purple-400" },
        ].map(stat => (
          <div key={stat.label} className="p-5 bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[#555] text-[10px] font-bold tracking-widest uppercase">{stat.label}</span>
              <stat.icon className={`w-4 h-4 ${stat.color}`} />
            </div>
            <div className="text-3xl font-black text-white">{stat.value}</div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        {/* Daily usage area chart */}
        <div className="p-6 bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl">
          <h3 className="text-white font-bold text-sm uppercase tracking-widest mb-5">Daily Prompt Volume (This Week)</h3>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={MOCK_DAILY}>
              <defs>
                <linearGradient id="goldGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#c9a84c" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#c9a84c" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1a1a1a" />
              <XAxis dataKey="day" tick={{ fill: "#555", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#555", fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip {...CUSTOM_TOOLTIP} />
              <Area type="monotone" dataKey="prompts" stroke="#c9a84c" strokeWidth={2} fill="url(#goldGrad)" name="Prompts" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Tool distribution pie */}
        <div className="p-6 bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl">
          <h3 className="text-white font-bold text-sm uppercase tracking-widest mb-5">AI Tool Distribution</h3>
          <div className="flex items-center gap-6">
            <ResponsiveContainer width={160} height={160}>
              <PieChart>
                <Pie data={MOCK_TOOLS} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value" strokeWidth={0}>
                  {MOCK_TOOLS.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip {...CUSTOM_TOOLTIP} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2.5">
              {MOCK_TOOLS.map(tool => (
                <div key={tool.name} className="flex items-center gap-2.5">
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: tool.color }} />
                  <span className="text-[#888] text-xs">{tool.name}</span>
                  <span className="text-white text-xs font-bold ml-auto">{tool.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Workflow breakdown */}
      <div className="p-6 bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl mb-6">
        <h3 className="text-white font-bold text-sm uppercase tracking-widest mb-5">Top AI Workflows</h3>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={MOCK_WORKFLOWS} layout="vertical" barSize={16}>
            <XAxis type="number" tick={{ fill: "#555", fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis type="category" dataKey="name" tick={{ fill: "#888", fontSize: 11 }} axisLine={false} tickLine={false} width={130} />
            <Tooltip {...CUSTOM_TOOLTIP} />
            <Bar dataKey="count" radius={[0, 4, 4, 0]}>
              {MOCK_WORKFLOWS.map((entry, i) => (
                <Cell key={i} fill={entry.color} fillOpacity={0.8} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Insights panel */}
      <div className="p-6 bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl">
        <div className="flex items-center gap-2 mb-5">
          <TrendingUp className="w-4 h-4 text-[#c9a84c]" />
          <h3 className="text-white font-bold text-sm uppercase tracking-widest">AI Insights</h3>
        </div>
        <div className="grid md:grid-cols-3 gap-4">
          {[
            {
              title: "Top Performer",
              value: "Emma Wilson",
              detail: "94 AI score, 42 prompts/day — highest efficiency on the team",
              color: "border-[#c9a84c]/30 bg-[#c9a84c]/5",
            },
            {
              title: "Coaching Opportunity",
              value: "Michael Torres",
              detail: "AI score 71, below team average. Recommend prompt engineering workshop.",
              color: "border-[#555]/30 bg-[#555]/5",
            },
            {
              title: "Trending Workflow",
              value: "Financial Analysis",
              detail: "+34% increase in AI-assisted financial analysis prompts this week.",
              color: "border-[#7a9e7e]/30 bg-[#7a9e7e]/5",
            },
          ].map(insight => (
            <div key={insight.title} className={`p-4 rounded-xl border ${insight.color}`}>
              <div className="text-[#888] text-[10px] font-bold tracking-widest uppercase mb-1">{insight.title}</div>
              <div className="text-white font-bold text-sm mb-2">{insight.value}</div>
              <div className="text-[#666] text-xs leading-relaxed">{insight.detail}</div>
            </div>
          ))}
        </div>
      </div>
    </DashboardShell>
  );
}
