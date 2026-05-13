import DashboardShell from "@/components/DashboardShell";
import { trpc } from "@/lib/trpc";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Zap, Clock, Star, TrendingUp } from "lucide-react";

const GOLD = "#c9a84c";

export default function ManagerAIUsage() {
  const { data: teamStats, isLoading } = trpc.analytics.teamStats.useQuery();

  const totalEvents = (teamStats ?? []).reduce((s: number, r: any) => s + (Number(r.eventCount) || 0), 0);
  const avgQuality = teamStats && teamStats.length > 0
    ? Math.round((teamStats as any[]).reduce((s, r) => s + (Number(r.avgQuality) || 0), 0) / teamStats.length * 10) / 10
    : null;
  const totalDuration = (teamStats ?? []).reduce((s: number, r: any) => s + (Number(r.totalDuration) || 0), 0);
  const totalDurationMin = Math.round(totalDuration / 60000);

  const chartData = (teamStats ?? []).map((r: any) => ({
    name: r.userName ? (r.userName as string).split(" ")[0] : `User ${r.userId}`,
    events: Number(r.eventCount) || 0,
    quality: Math.round((Number(r.avgQuality) || 0) * 10) / 10,
  })).slice(0, 12);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload?.length) {
      return (
        <div className="bg-[#111] border border-[#222] rounded-lg px-3 py-2 text-xs">
          <div className="text-[#888] mb-1">{label}</div>
          {payload.map((p: any) => (
            <div key={p.dataKey} className="text-[#c9a84c] font-bold">{p.name}: {p.value}</div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <DashboardShell>
      <div className="p-6 md:p-8 space-y-8">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight uppercase">AI Usage</h1>
          <p className="text-[#555] text-sm mt-1">How your team is using AI tools during assessments.</p>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Total AI Events", value: totalEvents, icon: Zap, gold: true },
            { label: "Avg Quality Score", value: avgQuality != null ? `${avgQuality}/10` : "—", icon: Star, gold: false },
            { label: "Total AI Time", value: `${totalDurationMin}m`, icon: Clock, gold: false },
            { label: "Active Users", value: (teamStats ?? []).length, icon: TrendingUp, gold: false },
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
          <div className="space-y-4">
            {[1, 2].map(i => <div key={i} className="h-64 bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl animate-pulse" />)}
          </div>
        ) : chartData.length === 0 ? (
          <div className="text-center py-20 border border-dashed border-[#1a1a1a] rounded-xl">
            <Zap className="w-10 h-10 text-[#333] mx-auto mb-4" />
            <div className="text-[#555] font-bold">No AI usage data yet</div>
            <div className="text-[#333] text-sm mt-1">Data appears here as candidates use the AI workspace during assessments.</div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* AI Events per user */}
            <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-6">
              <h3 className="text-white font-bold text-sm uppercase tracking-widest mb-6">AI Events per User</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={chartData} barSize={28}>
                  <XAxis dataKey="name" tick={{ fill: "#555", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "#555", fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="events" name="Events" fill={GOLD} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Quality score per user */}
            <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-6">
              <h3 className="text-white font-bold text-sm uppercase tracking-widest mb-6">Avg Quality Score per User</h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={chartData} barSize={28}>
                  <XAxis dataKey="name" tick={{ fill: "#555", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis domain={[0, 10]} tick={{ fill: "#555", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="quality" name="Quality" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Per-user table */}
        {!isLoading && chartData.length > 0 && (
          <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-[#1a1a1a]">
              <h3 className="text-white font-bold text-sm uppercase tracking-widest">Usage Breakdown</h3>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#111]">
                  <th className="text-left text-[#555] text-xs uppercase tracking-widest font-bold px-6 py-3">User</th>
                  <th className="text-right text-[#555] text-xs uppercase tracking-widest font-bold px-6 py-3">AI Events</th>
                  <th className="text-right text-[#555] text-xs uppercase tracking-widest font-bold px-6 py-3 hidden sm:table-cell">Avg Quality</th>
                  <th className="text-right text-[#555] text-xs uppercase tracking-widest font-bold px-6 py-3 hidden md:table-cell">Total Time</th>
                </tr>
              </thead>
              <tbody>
                {(teamStats as any[] ?? []).map((row: any) => (
                  <tr key={row.userId} className="border-b border-[#111] hover:bg-[#111] transition-colors">
                    <td className="px-6 py-3 text-white font-medium">
                      {row.userName ?? `User ${row.userId}`}
                    </td>
                    <td className="px-6 py-3 text-right text-[#c9a84c] font-bold">{Number(row.eventCount) || 0}</td>
                    <td className="px-6 py-3 text-right text-[#888] hidden sm:table-cell">
                      {row.avgQuality != null ? `${(Math.round(Number(row.avgQuality) * 10) / 10)}/10` : "—"}
                    </td>
                    <td className="px-6 py-3 text-right text-[#555] text-xs hidden md:table-cell">
                      {row.totalDuration ? `${Math.round(Number(row.totalDuration) / 60000)}m` : "—"}
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