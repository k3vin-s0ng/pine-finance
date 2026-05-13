import { Link } from "wouter";
import DashboardShell from "@/components/DashboardShell";
import { Button } from "@/app/components/ui/button";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { FileText, Clock, CheckCircle, Circle, ArrowRight, BarChart3, Award } from "lucide-react";

function AssessmentStatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; className: string; icon: React.ElementType }> = {
    invited: { label: "Invited", className: "bg-blue-500/10 text-blue-400 border-blue-500/20", icon: Circle },
    in_progress: { label: "In Progress", className: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20", icon: Clock },
    submitted: { label: "Submitted", className: "bg-purple-500/10 text-purple-400 border-purple-500/20", icon: CheckCircle },
    scored: { label: "Scored", className: "bg-green-500/10 text-green-400 border-green-500/20", icon: Award },
  };
  const c = config[status] ?? config.invited;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-widest uppercase border ${c.className}`}>
      <c.icon className="w-2.5 h-2.5" />
      {c.label}
    </span>
  );
}

export default function CandidateDashboard() {
  const { user } = useAuth();
  const { data: assessments, isLoading } = trpc.assessments.myAssessments.useQuery();

  const scored = assessments?.filter(a => a.assessment.status === "scored") ?? [];
  const pending = assessments?.filter(a => ["invited", "in_progress"].includes(a.assessment.status)) ?? [];

  return (
    <DashboardShell title="My Assessments">
      {/* Welcome */}
      <div className="mb-8 p-6 bg-[#0a0a0a] border border-[#c9a84c]/20 rounded-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 opacity-5"
          style={{ background: "radial-gradient(circle, #c9a84c, transparent)" }} />
        <div className="relative z-10">
          <h2 className="text-xl font-black text-white uppercase tracking-tight mb-1">
            Welcome back, {user?.name?.split(" ")[0] ?? "Candidate"}
          </h2>
          <p className="text-[#666] text-sm">Complete your assessments to showcase your AI fluency in finance workflows.</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        {[
          { label: "Total Assessments", value: assessments?.length ?? 0, icon: FileText },
          { label: "Pending", value: pending.length, icon: Clock },
          { label: "Completed", value: scored.length, icon: Award },
        ].map(stat => (
          <div key={stat.label} className="p-5 bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[#555] text-[10px] font-bold tracking-widest uppercase">{stat.label}</span>
              <stat.icon className="w-4 h-4 text-[#c9a84c]" />
            </div>
            <div className="text-3xl font-black text-white">{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Assessments list */}
      <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-[#1a1a1a]">
          <h2 className="text-white font-bold text-sm uppercase tracking-widest">Your Assessments</h2>
        </div>

        {isLoading ? (
          <div className="p-12 text-center text-[#555] text-sm">Loading...</div>
        ) : !assessments?.length ? (
          <div className="p-12 text-center">
            <FileText className="w-10 h-10 text-[#333] mx-auto mb-3" />
            <p className="text-[#555] text-sm">No assessments assigned yet. Check back when you receive an invite.</p>
          </div>
        ) : (
          <div className="divide-y divide-[#111]">
            {assessments.map(({ assessment, campaign }) => (
              <div key={assessment.id} className="px-6 py-4 hover:bg-[#0d0d0d] transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-[#c9a84c]/10 flex items-center justify-center flex-shrink-0">
                      <FileText className="w-5 h-5 text-[#c9a84c]" />
                    </div>
                    <div>
                      <div className="flex items-center gap-3 mb-1">
                        <span className="text-white font-semibold text-sm">{campaign?.title ?? "Assessment"}</span>
                        <AssessmentStatusBadge status={assessment.status} />
                      </div>
                      <div className="flex items-center gap-3 text-[#555] text-xs">
                        <span className="text-[#c9a84c]/70">{campaign?.roleTemplate}</span>
                        <span>·</span>
                        <Clock className="w-3 h-3" />
                        <span>{assessment.timeLimitMinutes} min</span>
                      </div>
                    </div>
                  </div>
                  <div>
                    {assessment.status === "scored" ? (
                      <Link href={`/report/${assessment.id}`}>
                        <Button variant="ghost" size="sm" className="text-[#c9a84c] hover:text-[#c9a84c] hover:bg-[#c9a84c]/10 text-xs font-bold tracking-widest uppercase">
                          View Report <ArrowRight className="w-3 h-3 ml-1" />
                        </Button>
                      </Link>
                    ) : assessment.status === "invited" ? (
                      <Link href={`/assessment/${assessment.id}`}>
                        <Button className="bg-[#c9a84c] hover:bg-[#b8943e] text-black font-bold text-xs tracking-widest uppercase px-4 py-2">
                          Start Assessment
                        </Button>
                      </Link>
                    ) : assessment.status === "in_progress" ? (
                      <Link href={`/assessment/${assessment.id}`}>
                        <Button className="bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 border border-yellow-500/30 font-bold text-xs tracking-widest uppercase px-4 py-2">
                          Continue
                        </Button>
                      </Link>
                    ) : (
                      <span className="text-[#555] text-xs">Processing...</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardShell>
  );
}