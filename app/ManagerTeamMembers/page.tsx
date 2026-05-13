import DashboardShell from "@/components/DashboardShell";
import { Badge } from "@/app/components/ui/badge";
import { trpc } from "@/lib/trpc";
import { Users, Shield, User, Briefcase } from "lucide-react";

const ROLE_ICONS: Record<string, React.ReactNode> = {
  admin: <Shield className="w-3.5 h-3.5 text-[#c9a84c]" />,
  recruiter: <Briefcase className="w-3.5 h-3.5 text-blue-400" />,
  candidate: <User className="w-3.5 h-3.5 text-green-400" />,
  manager: <Users className="w-3.5 h-3.5 text-purple-400" />,
};

const ROLE_COLORS: Record<string, string> = {
  admin: "bg-[#c9a84c]/10 text-[#c9a84c] border-[#c9a84c]/20",
  recruiter: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  candidate: "bg-green-500/10 text-green-400 border-green-500/20",
  manager: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  user: "bg-[#1a1a1a] text-[#888] border-[#222]",
};

function Avatar({ name }: { name?: string | null }) {
  const initials = name ? name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) : "?";
  return (
    <div className="w-9 h-9 rounded-full bg-[#1a1a1a] border border-[#222] flex items-center justify-center flex-shrink-0">
      <span className="text-[#888] text-xs font-bold">{initials}</span>
    </div>
  );
}

export default function ManagerTeamMembers() {
  const { data: members, isLoading } = trpc.analytics.teamMembers.useQuery();

  const byRole = {
    recruiter: (members ?? []).filter(m => m.role === "recruiter").length,
    candidate: (members ?? []).filter(m => m.role === "candidate").length,
    manager: (members ?? []).filter(m => m.role === "manager").length,
    admin: (members ?? []).filter(m => m.role === "admin").length,
  };

  return (
    <DashboardShell>
      <div className="p-6 md:p-8 space-y-8">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight uppercase">Team Members</h1>
          <p className="text-[#555] text-sm mt-1">All users who have signed in to Pine Finance.</p>
        </div>

        {/* Role breakdown */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Recruiters", count: byRole.recruiter, color: "text-blue-400" },
            { label: "Candidates", count: byRole.candidate, color: "text-green-400" },
            { label: "Managers", count: byRole.manager, color: "text-purple-400" },
            { label: "Admins", count: byRole.admin, color: "text-[#c9a84c]" },
          ].map(({ label, count, color }) => (
            <div key={label} className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-4 text-center">
              <div className="text-[#555] text-xs uppercase tracking-widest mb-1">{label}</div>
              <div className={`text-2xl font-black ${color}`}>{count}</div>
            </div>
          ))}
        </div>

        {/* Members list */}
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} className="h-16 bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl animate-pulse" />
            ))}
          </div>
        ) : !members || members.length === 0 ? (
          <div className="text-center py-20 border border-dashed border-[#1a1a1a] rounded-xl">
            <Users className="w-10 h-10 text-[#333] mx-auto mb-4" />
            <div className="text-[#555] font-bold">No team members yet</div>
          </div>
        ) : (
          <div className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#1a1a1a]">
                  <th className="text-left text-[#555] text-xs uppercase tracking-widest font-bold px-5 py-3">Member</th>
                  <th className="text-left text-[#555] text-xs uppercase tracking-widest font-bold px-5 py-3 hidden sm:table-cell">Role</th>
                  <th className="text-left text-[#555] text-xs uppercase tracking-widest font-bold px-5 py-3 hidden md:table-cell">Login Method</th>
                  <th className="text-right text-[#555] text-xs uppercase tracking-widest font-bold px-5 py-3">Last Active</th>
                </tr>
              </thead>
              <tbody>
                {members.map(member => (
                  <tr key={member.id} className="border-b border-[#111] hover:bg-[#111] transition-colors">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <Avatar name={member.name} />
                        <div>
                          <div className="text-white font-medium">{member.name ?? "Unknown"}</div>
                          <div className="text-[#555] text-xs">{member.email ?? "—"}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-4 hidden sm:table-cell">
                      <Badge className={`text-[10px] px-2 py-0.5 border capitalize flex items-center gap-1 w-fit ${ROLE_COLORS[member.role] ?? ROLE_COLORS.user}`}>
                        {ROLE_ICONS[member.role]}
                        {member.role}
                      </Badge>
                    </td>
                    <td className="px-5 py-4 hidden md:table-cell text-[#555] text-xs capitalize">
                      {member.loginMethod ?? "—"}
                    </td>
                    <td className="px-5 py-4 text-right text-[#555] text-xs">
                      {member.lastSignedIn
                        ? new Date(member.lastSignedIn).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                        : "—"}
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