import { useState } from "react";
import { Link } from "wouter";
import DashboardShell from "@/components/DashboardShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { Users, Search, ArrowRight, Trophy, Mail } from "lucide-react";

const STATUS_COLORS: Record<string, string> = {
  invited: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  in_progress: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  submitted: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  scored: "bg-green-500/10 text-green-400 border-green-500/20",
};

export default function RecruiterCandidates() {
  const [search, setSearch] = useState("");
  const { data: candidates, isLoading } = trpc.recruiter.allCandidates.useQuery();

  const filtered = (candidates ?? []).filter(({ assessment, campaign, candidate }) => {
    const q = search.toLowerCase();
    if (!q) return true;
    return (
      candidate?.name?.toLowerCase().includes(q) ||
      candidate?.email?.toLowerCase().includes(q) ||
      assessment.invitedEmail?.toLowerCase().includes(q) ||
      campaign?.title?.toLowerCase().includes(q) ||
      campaign?.roleTemplate?.toLowerCase().includes(q)
    );
  });

  const totalScored = (candidates ?? []).filter(c => c.score).length;
  const avgScore = totalScored > 0
    ? Math.round((candidates ?? []).filter(c => c.score).reduce((s, c) => s + (c.score?.overallScore ?? 0), 0) / totalScored)
    : null;

  return (
    <DashboardShell>
      <div className="p-6 md:p-8 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight uppercase">All Candidates</h1>
            <p className="text-[#555] text-sm mt-1">Every candidate invited across all your campaigns.</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Total Invited", value: candidates?.length ?? 0, icon: Users },
            { label: "Scored", value: totalScored, icon: Trophy },
            { label: "Avg Score", value: avgScore != null ? `${avgScore}/100` : "—", icon: Trophy },
            { label: "Submitted", value: (candidates ?? []).filter(c => ["submitted", "scored"].includes(c.assessment.status)).length, icon: Mail },
          ].map(({ label, value, icon: Icon }) => (
            <div key={label} className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-4">
              <div className="flex items-center gap-2 mb-1">
                <Icon className="w-3.5 h-3.5 text-[#c9a84c]" />
                <span className="text-[#555] text-xs uppercase tracking-widest">{label}</span>
              </div>
              <div className="text-2xl font-black text-white">{value}</div>
            </div>
          ))}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#444]" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, email, campaign..."
            className="pl-9 bg-[#0d0d0d] border-[#1a1a1a] text-white placeholder:text-[#444] focus:border-[#c9a84c]/50"
          />
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-16 bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 border border-dashed border-[#1a1a1a] rounded-xl">
            <Users className="w-10 h-10 text-[#333] mx-auto mb-4" />
            <div className="text-[#555] font-bold">{search ? "No candidates match your search" : "No candidates yet"}</div>
            <div className="text-[#333] text-sm mt-1">Invite candidates from a campaign to see them here.</div>
          </div>
        ) : (
          <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#1a1a1a]">
                  <th className="text-left text-[#555] text-xs uppercase tracking-widest font-bold px-5 py-3">Candidate</th>
                  <th className="text-left text-[#555] text-xs uppercase tracking-widest font-bold px-5 py-3 hidden md:table-cell">Campaign</th>
                  <th className="text-left text-[#555] text-xs uppercase tracking-widest font-bold px-5 py-3 hidden sm:table-cell">Role</th>
                  <th className="text-left text-[#555] text-xs uppercase tracking-widest font-bold px-5 py-3">Status</th>
                  <th className="text-right text-[#555] text-xs uppercase tracking-widest font-bold px-5 py-3">Score</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {filtered.map(({ assessment, campaign, score, candidate }) => (
                  <tr key={assessment.id} className="border-b border-[#111] hover:bg-[#111] transition-colors">
                    <td className="px-5 py-4">
                      <div className="font-bold text-white">{candidate?.name ?? "Pending"}</div>
                      <div className="text-[#555] text-xs">{candidate?.email ?? assessment.invitedEmail ?? "—"}</div>
                    </td>
                    <td className="px-5 py-4 hidden md:table-cell">
                      <div className="text-[#888] text-sm truncate max-w-[180px]">{campaign?.title ?? "—"}</div>
                    </td>
                    <td className="px-5 py-4 hidden sm:table-cell">
                      <div className="text-[#666] text-xs">{campaign?.roleTemplate ?? "—"}</div>
                    </td>
                    <td className="px-5 py-4">
                      <Badge className={`text-[10px] px-2 py-0.5 border capitalize ${STATUS_COLORS[assessment.status] ?? "bg-[#1a1a1a] text-[#888] border-[#222]"}`}>
                        {assessment.status.replace("_", " ")}
                      </Badge>
                    </td>
                    <td className="px-5 py-4 text-right">
                      {score ? (
                        <span className={`text-lg font-black ${(score.overallScore ?? 0) >= 80 ? "text-[#c9a84c]" : (score.overallScore ?? 0) >= 60 ? "text-yellow-500" : "text-red-400"}`}>
                          {Math.round(score.overallScore ?? 0)}
                        </span>
                      ) : (
                        <span className="text-[#444] text-sm">—</span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-right">
                      {score && (
                        <Link href={`/report/${assessment.id}`}>
                          <Button size="sm" variant="ghost" className="text-[#c9a84c] hover:text-[#b8963e] text-xs h-7 px-2">
                            Report <ArrowRight className="w-3 h-3 ml-1" />
                          </Button>
                        </Link>
                      )}
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