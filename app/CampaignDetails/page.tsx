import { useState } from "react";
import { useParams, Link } from "wouter";
import DashboardShell from "@/components/DashboardShell";
import { Button } from "@/app/components/ui/button";
import { Badge } from "@/app/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/app/components/ui/dialog";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  Users, ChevronRight, Clock, Eye, UserPlus, Zap, CheckCircle,
  Loader2, AlertCircle, Timer, BarChart3, Copy
} from "lucide-react";
import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer, Tooltip } from "recharts";

// ─── Score Bar ────────────────────────────────────────────────────────────────
function ScoreBar({ score, max = 100 }: { score: number; max?: number }) {
  const pct = (score / max) * 100;
  const color = pct >= 80 ? "#c9a84c" : pct >= 60 ? "#888" : "#555";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-[#1a1a1a] rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-xs font-bold text-white w-8 text-right">{Math.round(score)}</span>
    </div>
  );
}

// ─── Status Badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
    invited: { label: "Invited", color: "border-blue-500/30 text-blue-400 bg-blue-500/10", icon: <Timer className="w-3 h-3" /> },
    in_progress: { label: "In Progress", color: "border-yellow-500/30 text-yellow-400 bg-yellow-500/10", icon: <Loader2 className="w-3 h-3 animate-spin" /> },
    submitted: { label: "Awaiting Score", color: "border-orange-500/30 text-orange-400 bg-orange-500/10", icon: <AlertCircle className="w-3 h-3" /> },
    scored: { label: "Scored", color: "border-[#c9a84c]/30 text-[#c9a84c] bg-[#c9a84c]/10", icon: <CheckCircle className="w-3 h-3" /> },
  };
  const c = config[status] ?? config.invited;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md border text-[10px] font-bold tracking-wider uppercase ${c.color}`}>
      {c.icon}{c.label}
    </span>
  );
}

// ─── Candidate Compare Modal ──────────────────────────────────────────────────
function CandidateCompareModal({
  candidates, open, onClose,
}: {
  candidates: Array<{ name: string; score: any }>;
  open: boolean;
  onClose: () => void;
}) {
  if (!open) return null;
  const dims = ["accuracy", "efficiency", "judgment", "verification", "communication", "toolFluency"] as const;
  const dimLabels: Record<string, string> = {
    accuracy: "Accuracy", efficiency: "Efficiency", judgment: "Judgment",
    verification: "Verification", communication: "Communication", toolFluency: "Tool Fluency",
  };
  const radarData = dims.map(d => ({
    dim: dimLabels[d],
    ...Object.fromEntries(candidates.map(c => [c.name, c.score?.[d] ?? 0])),
  }));
  const COLORS = ["#c9a84c", "#888", "#4c8fc9", "#c94c4c"];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div className="bg-[#0d0d0d] border border-[#c9a84c]/30 rounded-xl max-w-5xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-[#1a1a1a]">
          <h2 className="text-white font-bold text-sm uppercase tracking-widest">Side-by-Side Comparison</h2>
          <button onClick={onClose} className="text-[#555] hover:text-white text-xl leading-none">×</button>
        </div>
        <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Radar Chart */}
          <div>
            <p className="text-[#555] text-xs uppercase tracking-widest mb-4">Dimension Radar</p>
            <ResponsiveContainer width="100%" height={280}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="#1a1a1a" />
                <PolarAngleAxis dataKey="dim" tick={{ fill: "#555", fontSize: 10 }} />
                {candidates.map((c, i) => (
                  <Radar key={c.name} name={c.name} dataKey={c.name}
                    stroke={COLORS[i]} fill={COLORS[i]} fillOpacity={0.1} />
                ))}
                <Tooltip contentStyle={{ background: "#0d0d0d", border: "1px solid #1a1a1a", borderRadius: 6 }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
          {/* Score Table */}
          <div>
            <p className="text-[#555] text-xs uppercase tracking-widest mb-4">Score Breakdown</p>
            <div className="grid gap-2" style={{ gridTemplateColumns: `140px repeat(${candidates.length}, 1fr)` }}>
              <div />
              {candidates.map(c => (
                <div key={c.name} className="text-center">
                  <div className="w-8 h-8 rounded-full bg-[#c9a84c]/20 flex items-center justify-center mx-auto mb-1">
                    <span className="text-[#c9a84c] font-bold text-xs">{c.name[0]}</span>
                  </div>
                  <div className="text-white font-semibold text-xs truncate">{c.name}</div>
                  <div className="text-2xl font-black text-[#c9a84c] mt-1">{Math.round(c.score?.overallScore ?? 0)}</div>
                </div>
              ))}
              {dims.map(dim => (
                <>
                  <div key={`label-${dim}`} className="flex items-center text-[#555] text-[10px] font-bold uppercase tracking-wider py-2 border-t border-[#111]">
                    {dimLabels[dim]}
                  </div>
                  {candidates.map(c => (
                    <div key={`${c.name}-${dim}`} className="py-2 border-t border-[#111]">
                      <ScoreBar score={c.score?.[dim] ?? 0} />
                    </div>
                  ))}
                </>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Invite Modal ─────────────────────────────────────────────────────────────
function InviteCandidateModal({ campaignId, open, onClose, lastInviteResult }: {
  campaignId: number; open: boolean; onClose: () => void;
  lastInviteResult: { assessmentUrl?: string; token?: string } | null;
}) {
  const [email, setEmail] = useState("");
  const [result, setResult] = useState<{ assessmentUrl: string; token: string } | null>(null);
  const utils = trpc.useUtils();
  const invite = trpc.assessments.create.useMutation({
    onSuccess: (data) => {
      toast.success(`Invitation sent to ${email}`);
      setResult({ assessmentUrl: data.assessmentUrl, token: data.token });
      utils.campaigns.getCandidatesWithStatus.invalidate({ campaignId });
      setEmail("");
    },
    onError: (e) => toast.error(e.message),
  });

  const handleClose = () => {
    setResult(null);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-[#0d0d0d] border border-[#c9a84c]/30 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-white">Invite Candidate</DialogTitle>
          <DialogDescription className="text-sm text-[#888] mt-1">An email with the assessment link will be sent automatically.</DialogDescription>
        </DialogHeader>
        {result ? (
          <div className="space-y-4 mt-2">
            <div className="bg-[#0a0a0a] border border-[#c9a84c]/20 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle className="w-4 h-4 text-[#c9a84c]" />
                <span className="text-[#c9a84c] text-sm font-bold">Invitation Sent</span>
              </div>
              <p className="text-[#888] text-xs mb-3">Candidate will receive an email. Share this link as a backup:</p>
              <div className="bg-[#111] rounded p-2 flex items-center gap-2">
                <code className="text-[#c9a84c] text-xs flex-1 break-all">{result.assessmentUrl}</code>
                <button
                  onClick={() => { navigator.clipboard.writeText(result.assessmentUrl); toast.success("Link copied!"); }}
                  className="text-[#555] hover:text-white flex-shrink-0"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            <Button onClick={handleClose} className="w-full bg-[#1a1a1a] hover:bg-[#222] text-white font-bold text-sm">
              Done
            </Button>
          </div>
        ) : (
          <div className="space-y-4 mt-2">
            <div>
              <Label className="text-[#aaa] text-xs mb-1 block tracking-wider uppercase">Candidate Email</Label>
              <Input
                placeholder="candidate@firm.com"
                type="email"
                className="bg-[#111] border-[#333] text-white placeholder:text-[#555]"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === "Enter" && email && invite.mutate({ campaignId, candidateEmail: email, origin: window.location.origin })}
              />
            </div>
            <Button
              className="w-full bg-[#c9a84c] hover:bg-[#b8943e] text-black font-bold text-sm tracking-widest uppercase py-3"
              onClick={() => invite.mutate({ campaignId, candidateEmail: email, origin: window.location.origin })}
              disabled={!email || invite.isPending}
            >
              {invite.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Sending...</> : "Send Invitation →"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function CampaignDetail() {
  const { id } = useParams<{ id: string }>();
  const campaignId = parseInt(id ?? "0");
  const [selectedCandidates, setSelectedCandidates] = useState<number[]>([]);
  const [compareOpen, setCompareOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [scoringIds, setScoringIds] = useState<Set<number>>(new Set());

  const { data: campaign } = trpc.campaigns.get.useQuery({ id: campaignId });
  const { data: candidates, isLoading, refetch } = trpc.campaigns.getCandidatesWithStatus.useQuery({ campaignId });

  const utils = trpc.useUtils();

  const updateCampaign = trpc.campaigns.update.useMutation({
    onSuccess: () => {
      utils.campaigns.get.invalidate({ id: campaignId });
      toast.success("Campaign settings updated");
    },
    onError: (e) => toast.error(e.message),
  });

  const scoreSubmission = trpc.scoring.scoreSubmission.useMutation({
    onSuccess: (data, variables) => {
      toast.success(`Scoring complete — ${Math.round(data.overallScore)}/100`);
      setScoringIds(prev => { const s = new Set(prev); s.delete(variables.submissionId); return s; });
      utils.campaigns.getCandidatesWithStatus.invalidate({ campaignId });
    },
    onError: (e, variables) => {
      toast.error(`Scoring failed: ${e.message}`);
      setScoringIds(prev => { const s = new Set(prev); s.delete(variables.submissionId); return s; });
    },
  });

  const handleScore = (submissionId: number) => {
    setScoringIds(prev => new Set(prev).add(submissionId));
    scoreSubmission.mutate({ submissionId });
  };

  const toggleSelect = (assessmentId: number) => {
    setSelectedCandidates(prev =>
      prev.includes(assessmentId) ? prev.filter(x => x !== assessmentId) : prev.length < 4 ? [...prev, assessmentId] : prev
    );
  };

  const compareData = (candidates ?? [])
    .filter(c => selectedCandidates.includes(c.assessment.id) && c.score)
    .map(c => ({
      name: c.candidate?.name ?? c.assessment.invitedEmail ?? "Candidate",
      score: c.score,
    }));

  const dims = ["accuracy", "efficiency", "judgment", "verification", "communication", "toolFluency"] as const;
  const dimLabels: Record<string, string> = {
    accuracy: "Accuracy", efficiency: "Efficiency", judgment: "Judgment",
    verification: "Verification", communication: "Communication", toolFluency: "Tool Fluency",
  };

  const submittedCount = (candidates ?? []).filter(c => c.assessment.status === "submitted").length;
  const scoredCount = (candidates ?? []).filter(c => c.assessment.status === "scored").length;

  return (
    <DashboardShell title={campaign?.title ?? "Campaign"}>
      {/* Breadcrumb + Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Link href="/dashboard/recruiter">
              <span className="text-[#555] text-xs hover:text-[#aaa] cursor-pointer">Campaigns</span>
            </Link>
            <ChevronRight className="w-3 h-3 text-[#333]" />
            <span className="text-[#aaa] text-xs">{campaign?.title}</span>
          </div>
          <h1 className="text-2xl font-black text-white uppercase tracking-tight">{campaign?.title}</h1>
          <div className="flex items-center gap-3 mt-2 text-[#555] text-xs">
            <span className="text-[#c9a84c] font-semibold">{campaign?.roleTemplate}</span>
            <span>·</span>
            <Clock className="w-3 h-3" />
            <span>{campaign?.timeLimitMinutes} min</span>
            <span>·</span>
            <span>{candidates?.length ?? 0} candidates</span>
            <span>·</span>
            <button
              type="button"
              onClick={() => campaign && updateCampaign.mutate({ id: campaign.id, autoScore: !campaign.autoScore })}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                campaign?.autoScore ? 'bg-[#c9a84c]' : 'bg-[#333]'
              }`}
              title={campaign?.autoScore ? 'Auto-Score ON — click to disable' : 'Auto-Score OFF — click to enable'}
            >
              <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                campaign?.autoScore ? 'translate-x-5' : 'translate-x-1'
              }`} />
            </button>
            <span className={`text-[10px] font-bold tracking-widest uppercase ${
              campaign?.autoScore ? 'text-green-400' : 'text-[#555]'
            }`}>Auto-Score {campaign?.autoScore ? 'ON' : 'OFF'}</span>
            {submittedCount > 0 && (
              <>
                <span>·</span>
                <span className="text-orange-400">{submittedCount} awaiting score</span>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {selectedCandidates.length >= 2 && (
            <Button
              onClick={() => setCompareOpen(true)}
              variant="outline"
              className="border-[#333] text-[#888] hover:text-white hover:border-[#555] font-bold text-xs tracking-widest uppercase"
            >
              <BarChart3 className="w-3.5 h-3.5 mr-1.5" />
              Compare {selectedCandidates.length}
            </Button>
          )}
          <Button
            onClick={() => setInviteOpen(true)}
            className="bg-[#c9a84c] hover:bg-[#b8943e] text-black font-bold text-xs tracking-widest uppercase"
          >
            <UserPlus className="w-3.5 h-3.5 mr-1.5" />
            Invite Candidate
          </Button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {[
          { label: "Total Invited", value: candidates?.length ?? 0, color: "text-white" },
          { label: "In Progress", value: (candidates ?? []).filter(c => c.assessment.status === "in_progress").length, color: "text-yellow-400" },
          { label: "Awaiting Score", value: submittedCount, color: "text-orange-400" },
          { label: "Scored", value: scoredCount, color: "text-[#c9a84c]" },
        ].map(stat => (
          <div key={stat.label} className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl p-4">
            <div className={`text-2xl font-black ${stat.color}`}>{stat.value}</div>
            <div className="text-[#555] text-xs uppercase tracking-wider mt-1">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Candidates Table */}
      <div className="bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1a1a1a]">
          <h2 className="text-white font-bold text-sm uppercase tracking-widest flex items-center gap-2">
            <Users className="w-4 h-4 text-[#c9a84c]" />
            Candidates ({candidates?.length ?? 0})
          </h2>
          <span className="text-[#555] text-xs">Select scored candidates to compare</span>
        </div>

        {isLoading ? (
          <div className="p-12 text-center">
            <Loader2 className="w-6 h-6 text-[#c9a84c] animate-spin mx-auto mb-3" />
            <p className="text-[#555] text-sm">Loading candidates...</p>
          </div>
        ) : !candidates?.length ? (
          <div className="p-12 text-center">
            <Users className="w-10 h-10 text-[#333] mx-auto mb-3" />
            <p className="text-[#555] text-sm mb-4">No candidates invited yet.</p>
            <Button
              onClick={() => setInviteOpen(true)}
              className="bg-[#c9a84c] hover:bg-[#b8943e] text-black font-bold text-xs tracking-widest uppercase"
            >
              <UserPlus className="w-3.5 h-3.5 mr-1.5" />
              Invite First Candidate
            </Button>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="hidden lg:grid px-6 py-2 text-[#555] text-[10px] font-bold tracking-widest uppercase border-b border-[#111]"
              style={{ gridTemplateColumns: "32px 1fr 120px 80px 80px 80px 80px 80px 80px 120px" }}>
              <div />
              <div>Candidate</div>
              <div>Status</div>
              <div className="text-center">Overall</div>
              {dims.slice(0, 4).map(d => <div key={d} className="text-center">{dimLabels[d].slice(0, 5)}</div>)}
              <div className="text-center">Actions</div>
            </div>

            {candidates.map((row) => {
              const isSelected = selectedCandidates.includes(row.assessment.id);
              const isScoring = row.submission && scoringIds.has(row.submission.id);
              const canScore = row.assessment.status === "submitted" && row.submission && !isScoring;
              const displayName = row.candidate?.name ?? row.assessment.invitedEmail ?? "Invited Candidate";
              const displayEmail = row.candidate?.email ?? row.assessment.invitedEmail ?? "";

              return (
                <div
                  key={row.assessment.id}
                  className={`grid px-6 py-4 items-center border-b border-[#0d0d0d] hover:bg-[#0d0d0d] transition-colors ${isSelected ? "bg-[#c9a84c]/5" : ""}`}
                  style={{ gridTemplateColumns: "32px 1fr 120px 80px 80px 80px 80px 80px 80px 120px" }}
                >
                  {/* Checkbox */}
                  <div
                    className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 cursor-pointer ${
                      row.score ? (isSelected ? "bg-[#c9a84c] border-[#c9a84c]" : "border-[#333] hover:border-[#c9a84c]") : "border-[#222] opacity-30 cursor-not-allowed"
                    }`}
                    onClick={() => row.score && toggleSelect(row.assessment.id)}
                  >
                    {isSelected && <svg className="w-2.5 h-2.5 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                  </div>

                  {/* Candidate Info */}
                  <div>
                    <div className="text-white text-sm font-semibold">{displayName}</div>
                    <div className="text-[#555] text-xs">{displayEmail}</div>
                  </div>

                  {/* Status */}
                  <div><StatusBadge status={row.assessment.status} /></div>

                  {/* Overall Score */}
                  <div className="text-center">
                    {row.score ? (
                      <span className={`text-lg font-black ${(row.score.overallScore ?? 0) >= 80 ? "text-[#c9a84c]" : "text-white"}`}>
                        {Math.round(row.score.overallScore ?? 0)}
                      </span>
                    ) : <span className="text-[#333]">—</span>}
                  </div>

                  {/* Dimension Scores */}
                  {dims.slice(0, 4).map(d => (
                    <div key={d} className="text-center text-sm text-[#888]">
                      {row.score ? Math.round((row.score as any)[d] ?? 0) : <span className="text-[#333]">—</span>}
                    </div>
                  ))}

                  {/* Actions */}
                  <div className="flex items-center justify-center gap-1">
                    {canScore && (
                      <Button
                        size="sm"
                        onClick={() => handleScore(row.submission!.id)}
                        className="bg-[#c9a84c] hover:bg-[#b8943e] text-black font-bold text-[10px] tracking-widest uppercase px-2 py-1 h-7"
                      >
                        <Zap className="w-3 h-3 mr-1" />
                        Score
                      </Button>
                    )}
                    {isScoring && (
                      <div className="flex items-center gap-1 text-[#c9a84c] text-xs">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        <span>Scoring...</span>
                      </div>
                    )}
                    {row.score && (
                      <Link href={`/report/${row.assessment.id}`}>
                        <Button variant="ghost" size="sm" className="text-[#888] hover:text-[#c9a84c] p-1 h-7 w-7">
                          <Eye className="w-4 h-4" />
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>

      {/* Modals */}
      <CandidateCompareModal
        candidates={compareData}
        open={compareOpen}
        onClose={() => setCompareOpen(false)}
      />
      <InviteCandidateModal
        campaignId={campaignId}
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        lastInviteResult={null}
      />
    </DashboardShell>
  );
}