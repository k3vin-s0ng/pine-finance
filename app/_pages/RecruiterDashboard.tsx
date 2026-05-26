"use client";

import { useState } from "react";
import { Link } from "@/app/lib/wouter";
import DashboardShell from "@/app/components/DashboardShell";
import { Button } from "@/app/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/app/components/ui/dialog";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/ui/select";
import { Textarea } from "@/app/components/ui/textarea";
import { toast } from "sonner";
import { trpc } from "@/app/lib/trpc";
import { useAuth } from "@/app/_core/hooks/useAuth";
import SourceMaterialUploader from "@/app/components/SourceMaterialUploader";
import type { SourceMaterial } from "@/app/components/SourceMaterialUploader";
import {
  Plus, Target, Users, FileText, TrendingUp, ChevronRight,
  Clock, CheckCircle, Circle, XCircle, BarChart3, Trash2, Upload
} from "lucide-react";

const ROLE_TEMPLATES = ["IB Analyst", "FP&A Analyst", "PE Associate", "Hedge Fund Research Analyst"] as const;

function StatusBadge({ status }: { status: string }) {
  const config = {
    active: { label: "Active", className: "bg-green-500/10 text-green-400 border-green-500/20" },
    draft: { label: "Draft", className: "bg-[#9db8a4]/30 text-[#3f5847] border-[#9db8a4]" },
    closed: { label: "Closed", className: "bg-red-500/10 text-red-400 border-red-500/20" },
  }[status] ?? { label: status, className: "bg-[#9db8a4]/30 text-[#3f5847] border-[#9db8a4]" };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold tracking-widest uppercase border ${config.className}`}>
      {config.label}
    </span>
  );
}

function CreateCampaignModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const utils = trpc.useUtils();
  const [step, setStep] = useState<1 | 2>(1);
  const [createdCampaignId, setCreatedCampaignId] = useState<number | null>(null);

  // Fetch live campaign data so materials list updates immediately after each upload/remove
  const { data: createdCampaignData } = trpc.campaigns.get.useQuery(
    { id: createdCampaignId! },
    { enabled: createdCampaignId !== null && step === 2 }
  );
  const liveMaterials: SourceMaterial[] =
    (createdCampaignData?.sourceMaterials as SourceMaterial[] | null | undefined) ?? [];
  const [form, setForm] = useState({
    title: "",
    roleTemplate: "" as typeof ROLE_TEMPLATES[number] | "",
    description: "",
    timeLimitMinutes: 60,
    autoScore: true,
  });

  const create = trpc.campaigns.create.useMutation({
    onSuccess: (data) => {
      setCreatedCampaignId(data.id);
      setStep(2);
      utils.campaigns.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  function handleClose() {
    onClose();
    // Reset after animation
    setTimeout(() => {
      setStep(1);
      setCreatedCampaignId(null);
      setForm({ title: "", roleTemplate: "", description: "", timeLimitMinutes: 60, autoScore: true });
    }, 300);
  }

  function handleFinish() {
    toast.success("Campaign created successfully!");
    handleClose();
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-[#fff] border border-[#168a4a]/30 max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-slate-950">
            {step === 1 ? "New Assessment Campaign" : "Add Source Materials"}
          </DialogTitle>
          <p className="text-sm text-[#3f5847] mt-1">
            {step === 1
              ? "Configure a campaign to assess candidates for a specific role."
              : "Upload custom 10-Ks, earnings releases, or case materials. Candidates will see these during the exam."}
          </p>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center gap-2 mt-1">
          <div className={`h-1.5 flex-1 rounded-full transition-colors ${step >= 1 ? "bg-[#168a4a]" : "bg-[#cfe0d2]"}`} />
          <div className={`h-1.5 flex-1 rounded-full transition-colors ${step >= 2 ? "bg-[#168a4a]" : "bg-[#cfe0d2]"}`} />
        </div>

        {step === 1 && (
          <div className="space-y-4 mt-2">
            <div>
              <Label className="text-[#2e4637] text-xs mb-1 block tracking-wider uppercase">Campaign Title</Label>
              <Input
                placeholder="Summer 2025 IB Analyst Recruiting"
                className="bg-[#eef7ef] border-[#9db8a4] text-slate-950 placeholder:text-[#6f8274]"
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              />
            </div>
            <div>
              <Label className="text-[#2e4637] text-xs mb-1 block tracking-wider uppercase">Role Template</Label>
              <Select onValueChange={v => setForm(f => ({ ...f, roleTemplate: v as typeof ROLE_TEMPLATES[number] }))}>
                <SelectTrigger className="bg-[#eef7ef] border-[#9db8a4] text-slate-950">
                  <SelectValue placeholder="Select role template" />
                </SelectTrigger>
                <SelectContent className="bg-[#eef7ef] border-[#9db8a4]">
                  {ROLE_TEMPLATES.map(t => (
                    <SelectItem key={t} value={t} className="text-slate-950 hover:bg-[#cfe0d2]">{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-[#2e4637] text-xs mb-1 block tracking-wider uppercase">Time Limit (minutes)</Label>
              <Select defaultValue="60" onValueChange={v => setForm(f => ({ ...f, timeLimitMinutes: parseInt(v) }))}>
                <SelectTrigger className="bg-[#eef7ef] border-[#9db8a4] text-slate-950">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#eef7ef] border-[#9db8a4]">
                  {[30, 45, 60, 90, 120].map(t => (
                    <SelectItem key={t} value={String(t)} className="text-slate-950 hover:bg-[#cfe0d2]">{t} minutes</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-[#2e4637] text-xs mb-1 block tracking-wider uppercase">Description (optional)</Label>
              <Textarea
                placeholder="Additional context for this campaign..."
                className="bg-[#eef7ef] border-[#9db8a4] text-slate-950 placeholder:text-[#6f8274] resize-none"
                rows={3}
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              />
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-[#eef7ef] border border-[#9db8a4]">
              <div>
                <p className="text-sm font-semibold text-slate-950">Auto-Score on Submission</p>
                <p className="text-xs text-[#52665a] mt-0.5">AI scoring fires automatically when a candidate submits</p>
              </div>
              <button
                type="button"
                onClick={() => setForm(f => ({ ...f, autoScore: !f.autoScore }))}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  form.autoScore ? 'bg-[#168a4a]' : 'bg-[#9db8a4]'
                }`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  form.autoScore ? 'translate-x-6' : 'translate-x-1'
                }`} />
              </button>
            </div>
            <Button
              className="w-full bg-[#168a4a] hover:bg-[#11743d] text-white font-bold py-3 text-sm tracking-widest uppercase"
              onClick={() => form.roleTemplate && create.mutate({ ...form, roleTemplate: form.roleTemplate as typeof ROLE_TEMPLATES[number] })}
              disabled={!form.title || !form.roleTemplate || create.isPending}
            >
              {create.isPending ? "Creating..." : "Next: Add Source Materials →"}
            </Button>
          </div>
        )}

        {step === 2 && createdCampaignId !== null && (
          <div className="space-y-4 mt-2">
            <div className="p-3 rounded-lg bg-[#eef7ef] border border-green-500/20">
              <p className="text-xs text-green-400 font-semibold">
                ✓ Campaign "{form.title}" created. Optionally attach source materials below.
              </p>
            </div>
            <div>
              <Label className="text-[#2e4637] text-xs mb-2 block tracking-wider uppercase">Source Materials</Label>
              <SourceMaterialUploader
                campaignId={createdCampaignId}
                materials={liveMaterials}
                onChanged={() => utils.campaigns.get.invalidate({ id: createdCampaignId! })}
              />
              <p className="text-[10px] text-[#8fa095] mt-2">
                If no files are uploaded, candidates will see the default Acme Financial case study.
              </p>
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1 border-[#9db8a4] text-[#3f5847] hover:text-slate-950 hover:border-[#6f8274] bg-transparent"
                onClick={handleFinish}
              >
                Skip, finish later
              </Button>
              <Button
                className="flex-1 bg-[#168a4a] hover:bg-[#11743d] text-white font-bold text-sm tracking-widest uppercase"
                onClick={handleFinish}
              >
                Done
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default function RecruiterDashboard() {
  const [createOpen, setCreateOpen] = useState(false);
  const { data: campaigns, isLoading } = trpc.campaigns.list.useQuery();
  const utils = trpc.useUtils();

  const deleteCampaign = trpc.campaigns.delete.useMutation({
    onSuccess: () => {
      toast.success("Campaign deleted");
      utils.campaigns.list.invalidate();
    },
  });

  const updateStatus = trpc.campaigns.update.useMutation({
    onSuccess: () => utils.campaigns.list.invalidate(),
  });

  const activeCampaigns = campaigns?.filter(c => c.status === "active") ?? [];
  const totalCampaigns = campaigns?.length ?? 0;

  return (
    <DashboardShell title="Recruiter Dashboard">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Total Campaigns", value: totalCampaigns, icon: Target, color: "text-[#168a4a]" },
          { label: "Active Campaigns", value: activeCampaigns.length, icon: Circle, color: "text-green-400" },
          { label: "Role Templates", value: 4, icon: FileText, color: "text-blue-400" },
          { label: "Scoring Dimensions", value: 6, icon: BarChart3, color: "text-purple-400" },
        ].map(stat => (
          <div key={stat.label} className="p-5 bg-[#fff] border border-[#d9e7db] rounded-xl">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[#6f8274] text-[10px] font-bold tracking-widest uppercase">{stat.label}</span>
              <stat.icon className={`w-4 h-4 ${stat.color}`} />
            </div>
            <div className="text-3xl font-black text-slate-950">{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Campaigns */}
      <div className="bg-[#fff] border border-[#d9e7db] rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#d9e7db]">
          <h2 className="text-slate-950 font-bold text-sm uppercase tracking-widest">Assessment Campaigns</h2>
          <Button
            onClick={() => setCreateOpen(true)}
            className="bg-[#168a4a] hover:bg-[#11743d] text-white font-bold text-xs tracking-widest uppercase px-4 py-2"
          >
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            New Campaign
          </Button>
        </div>

        {isLoading ? (
          <div className="p-12 text-center text-[#6f8274] text-sm">Loading campaigns...</div>
        ) : campaigns?.length === 0 ? (
          <div className="p-12 text-center">
            <Target className="w-10 h-10 text-[#9db8a4] mx-auto mb-3" />
            <p className="text-[#6f8274] text-sm mb-4">No campaigns yet. Create your first assessment campaign.</p>
            <Button onClick={() => setCreateOpen(true)} className="bg-[#168a4a] hover:bg-[#11743d] text-white font-bold text-xs tracking-widest uppercase">
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              Create Campaign
            </Button>
          </div>
        ) : (
          <div className="divide-y divide-[#eef7ef]">
            {campaigns?.map((campaign) => {
              const materials = (campaign.sourceMaterials as SourceMaterial[] | null) ?? [];
              return (
                <div key={campaign.id} className="px-6 py-4 hover:bg-[#fff] transition-colors group">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div className="w-10 h-10 rounded-lg bg-[#168a4a]/10 flex items-center justify-center flex-shrink-0">
                        <Target className="w-5 h-5 text-[#168a4a]" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-3 mb-1">
                          <span className="text-slate-950 font-semibold text-sm truncate">{campaign.title}</span>
                          <StatusBadge status={campaign.status} />
                          {materials.length > 0 && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-widest uppercase border bg-blue-500/10 text-blue-400 border-blue-500/20">
                              <Upload className="w-2.5 h-2.5" />
                              {materials.length} file{materials.length !== 1 ? "s" : ""}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-[#6f8274] text-xs">
                          <span className="text-[#168a4a]/70">{campaign.roleTemplate}</span>
                          <span>·</span>
                          <Clock className="w-3 h-3" />
                          <span>{campaign.timeLimitMinutes} min</span>
                          <span>·</span>
                          <span>{new Date(campaign.createdAt).toLocaleDateString()}</span>
                          {campaign.autoScore && (
                            <>
                              <span>·</span>
                              <span className="text-green-400 text-[10px] font-bold tracking-widest uppercase">Auto-Score</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Link href={`/dashboard/recruiter/campaigns/${campaign.id}`}>
                        <Button variant="ghost" size="sm" className="text-[#3f5847] hover:text-slate-950 text-xs">
                          View <ChevronRight className="w-3 h-3 ml-1" />
                        </Button>
                      </Link>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-[#6f8274] hover:text-red-400 text-xs"
                        onClick={() => deleteCampaign.mutate({ id: campaign.id })}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <CreateCampaignModal open={createOpen} onClose={() => setCreateOpen(false)} />
    </DashboardShell>
  );
}
