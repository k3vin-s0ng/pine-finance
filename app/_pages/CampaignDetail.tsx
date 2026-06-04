"use client";

import { Fragment, useState } from "react";
import { useParams, Link } from "@/app/lib/wouter";
import DashboardShell from "@/app/components/DashboardShell";
import {
  DeleteCandidateAssessmentDialog,
  type DeleteCandidateAssessmentTarget,
} from "@/app/components/DeleteCandidateAssessmentDialog";
import GeneratedAssessmentReviewPanel from "@/app/components/GeneratedAssessmentReviewPanel";
import SourceMaterialUploader, { type SourceMaterial } from "@/app/components/SourceMaterialUploader";
import { Button } from "@/app/components/ui/button";
import { Badge } from "@/app/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/app/components/ui/dialog";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { trpc } from "@/app/lib/trpc";
import { toast } from "sonner";
import type { Score } from "@/app/lib/schema";
import {
  Users, ChevronRight, Clock, Eye, UserPlus, Zap, CheckCircle,
  Loader2, AlertCircle, Timer, BarChart3, Copy, Trash2, FileText
} from "lucide-react";
import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer, Tooltip } from "recharts";

// ─── Score Bar ────────────────────────────────────────────────────────────────
function ScoreBar({ score, max = 100 }: { score: number; max?: number }) {
  const pct = (score / max) * 100;
  const color = pct >= 80 ? "#168a4a" : pct >= 60 ? "#3f5847" : "#6f8274";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-[#d9e7db] rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
      <span className="text-xs font-bold text-slate-950 w-8 text-right">{Math.round(score)}</span>
    </div>
  );
}

// ─── Status Badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const config: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
    invited: { label: "Invited", color: "border-blue-500/30 text-blue-400 bg-blue-500/10", icon: <Timer className="w-3 h-3" /> },
    in_progress: { label: "In Progress", color: "border-yellow-500/30 text-yellow-400 bg-yellow-500/10", icon: <Loader2 className="w-3 h-3 animate-spin" /> },
    submitted: { label: "Awaiting Score", color: "border-orange-500/30 text-orange-400 bg-orange-500/10", icon: <AlertCircle className="w-3 h-3" /> },
    scored: { label: "Scored", color: "border-[#168a4a]/30 text-[#168a4a] bg-[#168a4a]/10", icon: <CheckCircle className="w-3 h-3" /> },
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
  candidates: Array<{ id: string; name: string; score: Score }>;
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
    ...Object.fromEntries(candidates.map(c => [c.id, c.score?.[d] ?? 0])),
  }));
  const COLORS = ["#168a4a", "#3f5847", "#4c8fc9", "#c94c4c"];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-green-950/40 p-4">
      <div className="bg-[#fff] border border-[#168a4a]/30 rounded-xl max-w-5xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-[#d9e7db]">
          <h2 className="text-slate-950 font-bold text-sm uppercase tracking-widest">Side-by-Side Comparison</h2>
          <button onClick={onClose} className="text-[#6f8274] hover:text-slate-950 text-xl leading-none">×</button>
        </div>
        <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Radar Chart */}
          <div>
            <p className="text-[#6f8274] text-xs uppercase tracking-widest mb-4">Dimension Radar</p>
            <ResponsiveContainer width="100%" height={280}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="#d9e7db" />
                <PolarAngleAxis dataKey="dim" tick={{ fill: "#6f8274", fontSize: 10 }} />
                {candidates.map((c, i) => (
                  <Radar key={c.id} name={c.name} dataKey={c.id}
                    stroke={COLORS[i]} fill={COLORS[i]} fillOpacity={0.1} />
                ))}
                <Tooltip contentStyle={{ background: "#fff", border: "1px solid #d9e7db", borderRadius: 6 }} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
          {/* Score Table */}
          <div>
            <p className="text-[#6f8274] text-xs uppercase tracking-widest mb-4">Score Breakdown</p>
            <div className="grid gap-2" style={{ gridTemplateColumns: `140px repeat(${candidates.length}, 1fr)` }}>
              <div />
              {candidates.map(c => (
                <div key={c.id} className="text-center">
                  <div className="w-8 h-8 rounded-full bg-[#168a4a]/20 flex items-center justify-center mx-auto mb-1">
                    <span className="text-[#168a4a] font-bold text-xs">{c.name[0]}</span>
                  </div>
                  <div className="text-slate-950 font-semibold text-xs truncate">{c.name}</div>
                  <div className="text-2xl font-black text-[#168a4a] mt-1">{Math.round(c.score?.overallScore ?? 0)}</div>
                </div>
              ))}
              {dims.map(dim => (
                <Fragment key={dim}>
                  <div key={`label-${dim}`} className="flex items-center text-[#6f8274] text-[10px] font-bold uppercase tracking-wider py-2 border-t border-[#eef7ef]">
                    {dimLabels[dim]}
                  </div>
                  {candidates.map(c => (
                    <div key={`${c.id}-${dim}`} className="py-2 border-t border-[#eef7ef]">
                      <ScoreBar score={c.score?.[dim] ?? 0} />
                    </div>
                  ))}
                </Fragment>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Invite Modal ─────────────────────────────────────────────────────────────
function InviteCandidateModal({ campaignId, open, onClose }: {
  campaignId: number; open: boolean; onClose: () => void;
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
      <DialogContent className="bg-[#fff] border border-[#168a4a]/30 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-slate-950">Invite Candidate</DialogTitle>
          <DialogDescription className="text-sm text-[#3f5847] mt-1">An email with the assessment link will be sent automatically.</DialogDescription>
        </DialogHeader>
        {result ? (
          <div className="space-y-4 mt-2">
            <div className="bg-[#fff] border border-[#168a4a]/20 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle className="w-4 h-4 text-[#168a4a]" />
                <span className="text-[#168a4a] text-sm font-bold">Invitation Sent</span>
              </div>
              <p className="text-[#3f5847] text-xs mb-3">Candidate will receive an email. Share this link as a backup:</p>
              <div className="bg-[#eef7ef] rounded p-2 flex items-center gap-2">
                <code className="text-[#168a4a] text-xs flex-1 break-all">{result.assessmentUrl}</code>
                <button
                  onClick={() => { navigator.clipboard.writeText(result.assessmentUrl); toast.success("Link copied!"); }}
                  className="text-[#6f8274] hover:text-slate-950 flex-shrink-0"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            <Button onClick={handleClose} className="w-full bg-[#d9e7db] hover:bg-[#cfe0d2] text-slate-950 font-bold text-sm">
              Done
            </Button>
          </div>
        ) : (
          <div className="space-y-4 mt-2">
            <div>
              <Label className="text-[#2e4637] text-xs mb-1 block tracking-wider uppercase">Candidate Email</Label>
              <Input
                placeholder="candidate@firm.com"
                type="email"
                className="bg-[#eef7ef] border-[#9db8a4] text-slate-950 placeholder:text-[#6f8274]"
                value={email}
                onChange={e => setEmail(e.target.value)}
                onKeyDown={e => e.key === "Enter" && email && invite.mutate({ campaignId, candidateEmail: email, origin: window.location.origin })}
              />
            </div>
            <Button
              className="w-full bg-[#168a4a] hover:bg-[#11743d] text-white font-bold text-sm tracking-widest uppercase py-3"
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
  const [candidateToDelete, setCandidateToDelete] = useState<DeleteCandidateAssessmentTarget | null>(null);

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
    .flatMap(c => {
      if (!selectedCandidates.includes(c.assessment.id) || !c.score) return [];
      return [{
        id: `assessment-${c.assessment.id}`,
        name: c.candidate?.name ?? c.assessment.invitedEmail ?? "Candidate",
        score: c.score,
      }];
    });

  const dims = ["accuracy", "efficiency", "judgment", "verification", "communication", "toolFluency"] as const;
  const dimLabels: Record<string, string> = {
    accuracy: "Accuracy", efficiency: "Efficiency", judgment: "Judgment",
    verification: "Verification", communication: "Communication", toolFluency: "Tool Fluency",
  };

  const submittedCount = (candidates ?? []).filter(c => c.assessment.status === "submitted").length;
  const scoredCount = (candidates ?? []).filter(c => c.assessment.status === "scored").length;
  const materials = (campaign?.sourceMaterials as SourceMaterial[] | null | undefined) ?? [];

  return (
    <DashboardShell title={campaign?.title ?? "Campaign"}>
      {/* Breadcrumb + Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Link href="/dashboard/recruiter">
              <span className="text-[#6f8274] text-xs hover:text-[#2e4637] cursor-pointer">Campaigns</span>
            </Link>
            <ChevronRight className="w-3 h-3 text-[#9db8a4]" />
            <span className="text-[#2e4637] text-xs">{campaign?.title}</span>
          </div>
          <h1 className="text-2xl font-black text-slate-950 uppercase tracking-tight">{campaign?.title}</h1>
          <div className="flex items-center gap-3 mt-2 text-[#6f8274] text-xs">
            <span className="text-[#168a4a] font-semibold">{campaign?.roleTemplate}</span>
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
                campaign?.autoScore ? 'bg-[#168a4a]' : 'bg-[#9db8a4]'
              }`}
              title={campaign?.autoScore ? 'Auto-Score ON — click to disable' : 'Auto-Score OFF — click to enable'}
            >
              <span className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                campaign?.autoScore ? 'translate-x-5' : 'translate-x-1'
              }`} />
            </button>
            <span className={`text-[10px] font-bold tracking-widest uppercase ${
              campaign?.autoScore ? 'text-green-400' : 'text-[#6f8274]'
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
              className="border-[#9db8a4] text-[#3f5847] hover:text-slate-950 hover:border-[#6f8274] font-bold text-xs tracking-widest uppercase"
            >
              <BarChart3 className="w-3.5 h-3.5 mr-1.5" />
              Compare {selectedCandidates.length}
            </Button>
          )}
          <Button
            onClick={() => setInviteOpen(true)}
            className="bg-[#168a4a] hover:bg-[#11743d] text-white font-bold text-xs tracking-widest uppercase"
          >
            <UserPlus className="w-3.5 h-3.5 mr-1.5" />
            Invite Candidate
          </Button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {[
          { label: "Total Invited", value: candidates?.length ?? 0, color: "text-slate-950" },
          { label: "In Progress", value: (candidates ?? []).filter(c => c.assessment.status === "in_progress").length, color: "text-yellow-400" },
          { label: "Awaiting Score", value: submittedCount, color: "text-orange-400" },
          { label: "Scored", value: scoredCount, color: "text-[#168a4a]" },
        ].map(stat => (
          <div key={stat.label} className="bg-[#fff] border border-[#d9e7db] rounded-xl p-4">
            <div className={`text-2xl font-black ${stat.color}`}>{stat.value}</div>
            <div className="text-[#6f8274] text-xs uppercase tracking-wider mt-1">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Source Materials */}
      <div className="bg-[#fff] border border-[#d9e7db] rounded-xl p-5 mb-8">
        <div className="flex items-center justify-between gap-4 mb-4">
          <div>
            <h2 className="text-slate-950 font-bold text-sm uppercase tracking-widest flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#168a4a]" />
              Source Materials
            </h2>
            <p className="text-[#6f8274] text-xs mt-1">Files attached to this campaign for candidate research.</p>
          </div>
          {materials.length > 0 && (
            <Badge className="bg-[#168a4a]/10 text-[#168a4a] border-[#168a4a]/20 text-[10px] font-bold tracking-widest uppercase">
              {materials.length} file{materials.length === 1 ? "" : "s"}
            </Badge>
          )}
        </div>
        <SourceMaterialUploader
          campaignId={campaign?.id ?? campaignId}
          materials={materials}
          readOnly
        />
      </div>

      <GeneratedAssessmentReviewPanel
        campaignId={campaign?.id ?? campaignId}
        hasSourceMaterials={materials.length > 0}
      />

      {/* Candidates Table */}
      <div className="bg-[#fff] border border-[#d9e7db] rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#d9e7db]">
          <h2 className="text-slate-950 font-bold text-sm uppercase tracking-widest flex items-center gap-2">
            <Users className="w-4 h-4 text-[#168a4a]" />
            Candidates ({candidates?.length ?? 0})
          </h2>
          <span className="text-[#6f8274] text-xs">Select scored candidates to compare</span>
        </div>

        {isLoading ? (
          <div className="p-12 text-center">
            <Loader2 className="w-6 h-6 text-[#168a4a] animate-spin mx-auto mb-3" />
            <p className="text-[#6f8274] text-sm">Loading candidates...</p>
          </div>
        ) : !candidates?.length ? (
          <div className="p-12 text-center">
            <Users className="w-10 h-10 text-[#9db8a4] mx-auto mb-3" />
            <p className="text-[#6f8274] text-sm mb-4">No candidates invited yet.</p>
            <Button
              onClick={() => setInviteOpen(true)}
              className="bg-[#168a4a] hover:bg-[#11743d] text-white font-bold text-xs tracking-widest uppercase"
            >
              <UserPlus className="w-3.5 h-3.5 mr-1.5" />
              Invite First Candidate
            </Button>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="hidden lg:grid px-6 py-2 text-[#6f8274] text-[10px] font-bold tracking-widest uppercase border-b border-[#eef7ef]"
              style={{ gridTemplateColumns: "32px 1fr 120px 80px 80px 80px 80px 80px 80px 144px" }}>
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
                  className={`grid px-6 py-4 items-center border-b border-[#fff] hover:bg-[#fff] transition-colors ${isSelected ? "bg-[#168a4a]/5" : ""}`}
                  style={{ gridTemplateColumns: "32px 1fr 120px 80px 80px 80px 80px 80px 80px 144px" }}
                >
                  {/* Checkbox */}
                  <div
                    className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 cursor-pointer ${
                      row.score ? (isSelected ? "bg-[#168a4a] border-[#168a4a]" : "border-[#9db8a4] hover:border-[#168a4a]") : "border-[#cfe0d2] opacity-30 cursor-not-allowed"
                    }`}
                    onClick={() => row.score && toggleSelect(row.assessment.id)}
                  >
                    {isSelected && <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                  </div>

                  {/* Candidate Info */}
                  <div>
                    <div className="text-slate-950 text-sm font-semibold">{displayName}</div>
                    <div className="text-[#6f8274] text-xs">{displayEmail}</div>
                  </div>

                  {/* Status */}
                  <div><StatusBadge status={row.assessment.status} /></div>

                  {/* Overall Score */}
                  <div className="text-center">
                    {row.score ? (
                      <span className={`text-lg font-black ${(row.score.overallScore ?? 0) >= 80 ? "text-[#168a4a]" : "text-slate-950"}`}>
                        {Math.round(row.score.overallScore ?? 0)}
                      </span>
                    ) : <span className="text-[#9db8a4]">—</span>}
                  </div>

                  {/* Dimension Scores */}
                  {dims.slice(0, 4).map(d => (
                    <div key={d} className="text-center text-sm text-[#3f5847]">
                      {row.score ? Math.round(row.score[d] ?? 0) : <span className="text-[#9db8a4]">—</span>}
                    </div>
                  ))}

                  {/* Actions */}
                  <div className="flex items-center justify-center gap-1">
                    {canScore && (
                      <Button
                        size="sm"
                        onClick={() => handleScore(row.submission!.id)}
                        className="bg-[#168a4a] hover:bg-[#11743d] text-white font-bold text-[10px] tracking-widest uppercase px-2 py-1 h-7"
                      >
                        <Zap className="w-3 h-3 mr-1" />
                        Score
                      </Button>
                    )}
                    {isScoring && (
                      <div className="flex items-center gap-1 text-[#168a4a] text-xs">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        <span>Scoring...</span>
                      </div>
                    )}
                    {row.score && (
                      <Link href={`/report/${row.assessment.id}`}>
                        <Button variant="ghost" size="sm" className="text-[#3f5847] hover:text-[#168a4a] p-1 h-7 w-7">
                          <Eye className="w-4 h-4" />
                        </Button>
                      </Link>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-[#6f8274] hover:text-red-500 p-1 h-7 w-7"
                      aria-label={`Delete ${displayName}`}
                      onClick={() => setCandidateToDelete({
                        assessmentId: row.assessment.id,
                        name: displayName,
                        email: displayEmail,
                        campaignTitle: campaign?.title ?? null,
                      })}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
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
      />
      <DeleteCandidateAssessmentDialog
        target={candidateToDelete}
        onOpenChange={(open) => {
          if (!open) setCandidateToDelete(null);
        }}
        onDeleted={async () => {
          if (candidateToDelete) {
            setSelectedCandidates(prev => prev.filter(id => id !== candidateToDelete.assessmentId));
          }
          await Promise.all([
            utils.campaigns.getCandidatesWithStatus.invalidate({ campaignId }),
            utils.campaigns.getCandidatesWithScores.invalidate({ campaignId }),
            utils.recruiter.allCandidates.invalidate(),
            utils.recruiter.allReports.invalidate(),
          ]);
          await refetch();
        }}
      />
    </DashboardShell>
  );
}
