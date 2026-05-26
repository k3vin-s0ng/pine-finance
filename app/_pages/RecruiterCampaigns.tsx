"use client";

import { useState } from "react";
import { Link } from "@/app/lib/wouter";
import DashboardShell from "@/app/components/DashboardShell";
import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/app/components/ui/dialog";
import { Label } from "@/app/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/ui/select";
import { trpc } from "@/app/lib/trpc";
import { toast } from "sonner";
import { Target, Search, Plus, ArrowRight, Clock } from "lucide-react";
import SourceMaterialUploader, { type SourceMaterial } from "@/app/components/SourceMaterialUploader";

const ROLE_TEMPLATES = ["IB Analyst", "FP&A Analyst", "PE Associate", "Hedge Fund Research Analyst"];
const STATUS_COLORS: Record<string, string> = {
  draft: "bg-[#d9e7db] text-[#3f5847] border-[#cfe0d2]",
  active: "bg-green-500/10 text-green-400 border-green-500/20",
  closed: "bg-red-500/10 text-red-400 border-red-500/20",
};

export default function RecruiterCampaigns() {
  const [search, setSearch] = useState("");
  const [showCreate, setShowCreate] = useState(false);

  // Multi-step state
  const [step, setStep] = useState<1 | 2>(1);
  const [createdCampaignId, setCreatedCampaignId] = useState<number | null>(null);
  const [createdTitle, setCreatedTitle] = useState("");

  // Step 1 form fields
  const [title, setTitle] = useState("");
  const [roleTemplate, setRoleTemplate] = useState("");
  const [timeLimit, setTimeLimit] = useState("60");
  const [autoScore, setAutoScore] = useState(true);

  const utils = trpc.useUtils();
  const { data: campaigns, isLoading } = trpc.campaigns.list.useQuery();

  // Fetch the just-created campaign to keep materials list live
  const { data: createdCampaignData } = trpc.campaigns.get.useQuery(
    { id: createdCampaignId! },
    { enabled: createdCampaignId !== null && step === 2 }
  );

  const createCampaign = trpc.campaigns.create.useMutation({
    onSuccess: (data) => {
      setCreatedCampaignId(data.id);
      setCreatedTitle(title.trim());
      setStep(2);
      utils.campaigns.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  function resetDialog() {
    setStep(1);
    setCreatedCampaignId(null);
    setCreatedTitle("");
    setTitle(""); setRoleTemplate(""); setTimeLimit("60"); setAutoScore(true);
  }

  function handleClose() {
    setShowCreate(false);
    setTimeout(resetDialog, 300);
  }

  function handleFinish() {
    toast.success("Campaign created successfully!");
    handleClose();
  }

  const handleCreate = () => {
    if (!title.trim() || !roleTemplate) return toast.error("Please fill in all fields");
    createCampaign.mutate({
      title: title.trim(),
      roleTemplate: roleTemplate as "IB Analyst" | "FP&A Analyst" | "PE Associate" | "Hedge Fund Research Analyst",
      timeLimitMinutes: parseInt(timeLimit),
      autoScore,
    });
  };

  const handleMaterialsChanged = () => {
    if (createdCampaignId !== null) {
      utils.campaigns.get.invalidate({ id: createdCampaignId });
    }
  };

  const liveMaterials: SourceMaterial[] =
    (createdCampaignData?.sourceMaterials as SourceMaterial[] | null | undefined) ?? [];

  const filtered = (campaigns ?? []).filter(c => {
    const q = search.toLowerCase();
    return !q || c.title.toLowerCase().includes(q) || c.roleTemplate.toLowerCase().includes(q);
  });

  return (
    <DashboardShell>
      <div className="p-6 md:p-8 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black text-slate-950 tracking-tight uppercase">Campaigns</h1>
            <p className="text-[#6f8274] text-sm mt-1">All your assessment campaigns in one place.</p>
          </div>
          <Button
            onClick={() => setShowCreate(true)}
            className="bg-[#168a4a] hover:bg-[#11743d] text-white font-bold text-sm"
          >
            <Plus className="w-4 h-4 mr-1.5" /> New Campaign
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Total", value: campaigns?.length ?? 0 },
            { label: "Active", value: (campaigns ?? []).filter(c => c.status === "active").length },
            { label: "Closed", value: (campaigns ?? []).filter(c => c.status === "closed").length },
          ].map(({ label, value }) => (
            <div key={label} className="bg-[#fff] border border-[#d9e7db] rounded-xl p-4 text-center">
              <div className="text-[#6f8274] text-xs uppercase tracking-widest mb-1">{label}</div>
              <div className="text-2xl font-black text-slate-950">{value}</div>
            </div>
          ))}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8fa095]" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search campaigns..."
            className="pl-9 bg-[#fff] border-[#d9e7db] text-slate-950 placeholder:text-[#8fa095] focus:border-[#168a4a]/50"
          />
        </div>

        {/* Campaign list */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 bg-[#fff] border border-[#d9e7db] rounded-xl animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 border border-dashed border-[#d9e7db] rounded-xl">
            <Target className="w-10 h-10 text-[#9db8a4] mx-auto mb-4" />
            <div className="text-[#6f8274] font-bold">{search ? "No campaigns match your search" : "No campaigns yet"}</div>
            <div className="text-[#9db8a4] text-sm mt-1 mb-4">Create your first campaign to start assessing candidates.</div>
            {!search && (
              <Button onClick={() => setShowCreate(true)} className="bg-[#168a4a] hover:bg-[#11743d] text-white font-bold text-sm">
                <Plus className="w-4 h-4 mr-1.5" /> New Campaign
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(campaign => {
              const mats = (campaign.sourceMaterials as SourceMaterial[] | null) ?? [];
              return (
                <div key={campaign.id} className="bg-[#fff] border border-[#d9e7db] hover:border-[#168a4a]/30 rounded-xl p-5 transition-colors">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="w-10 h-10 rounded-lg bg-[#d9e7db] flex items-center justify-center flex-shrink-0">
                        <Target className="w-5 h-5 text-[#168a4a]" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-slate-950 font-bold truncate">{campaign.title}</div>
                        <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                          <span className="text-[#6f8274] text-xs">{campaign.roleTemplate}</span>
                          <span className="flex items-center gap-1 text-[#8fa095] text-xs">
                            <Clock className="w-3 h-3" /> {campaign.timeLimitMinutes}m
                          </span>
                          <Badge className={`text-[10px] px-2 py-0.5 border capitalize ${STATUS_COLORS[campaign.status] ?? ""}`}>
                            {campaign.status}
                          </Badge>
                          {campaign.autoScore && (
                            <span className="text-[10px] font-bold tracking-widest uppercase text-green-400">
                              Auto-Score
                            </span>
                          )}
                          {mats.length > 0 && (
                            <span className="text-[10px] font-bold tracking-widest uppercase text-[#168a4a]">
                              {mats.length} Custom Doc{mats.length > 1 ? "s" : ""}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <Link href={`/dashboard/recruiter/campaigns/${campaign.id}`}>
                      <Button size="sm" className="bg-[#168a4a] hover:bg-[#11743d] text-white font-bold text-xs flex-shrink-0">
                        View <ArrowRight className="w-3 h-3 ml-1" />
                      </Button>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Campaign Dialog — 2-step flow */}
      <Dialog open={showCreate} onOpenChange={(open) => { if (!open) handleClose(); }}>
        <DialogContent className="bg-[#fff] border-[#d9e7db] text-slate-950 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-slate-950 font-black uppercase tracking-tight">
              {step === 1 ? "New Campaign" : "Attach Source Materials"}
            </DialogTitle>
            <DialogDescription className="text-[#6f8274]">
              {step === 1
                ? "Set up a new assessment campaign for candidates."
                : "Optionally upload custom documents (10-K, earnings release, model) for this campaign."}
            </DialogDescription>
          </DialogHeader>

          {/* Step progress bar */}
          <div className="flex items-center gap-2 mb-1">
            {[1, 2].map(s => (
              <div
                key={s}
                className={`h-1 flex-1 rounded-full transition-colors ${s <= step ? "bg-[#168a4a]" : "bg-[#cfe0d2]"}`}
              />
            ))}
          </div>

          {step === 1 && (
            <div className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <Label className="text-[#3f5847] text-xs uppercase tracking-widest">Campaign Title</Label>
                <Input
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="e.g. Summer 2025 IB Analyst"
                  className="bg-[#eef7ef] border-[#cfe0d2] text-slate-950 placeholder:text-[#8fa095]"
                  onKeyDown={e => e.key === "Enter" && handleCreate()}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[#3f5847] text-xs uppercase tracking-widest">Role Template</Label>
                <Select value={roleTemplate} onValueChange={setRoleTemplate}>
                  <SelectTrigger className="bg-[#eef7ef] border-[#cfe0d2] text-slate-950">
                    <SelectValue placeholder="Select role..." />
                  </SelectTrigger>
                  <SelectContent className="bg-[#eef7ef] border-[#cfe0d2]">
                    {ROLE_TEMPLATES.map(r => (
                      <SelectItem key={r} value={r} className="text-slate-950 hover:bg-[#d9e7db]">{r}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[#3f5847] text-xs uppercase tracking-widest">Time Limit (minutes)</Label>
                <Select value={timeLimit} onValueChange={setTimeLimit}>
                  <SelectTrigger className="bg-[#eef7ef] border-[#cfe0d2] text-slate-950">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#eef7ef] border-[#cfe0d2]">
                    {["30", "45", "60", "90", "120"].map(t => (
                      <SelectItem key={t} value={t} className="text-slate-950 hover:bg-[#d9e7db]">{t} minutes</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-[#eef7ef] border border-[#cfe0d2]">
                <div>
                  <p className="text-sm font-semibold text-slate-950">Auto-Score on Submission</p>
                  <p className="text-xs text-[#6f8274] mt-0.5">AI scoring fires automatically when candidate submits</p>
                </div>
                <button
                  type="button"
                  onClick={() => setAutoScore(a => !a)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    autoScore ? "bg-[#168a4a]" : "bg-[#9db8a4]"
                  }`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    autoScore ? "translate-x-6" : "translate-x-1"
                  }`} />
                </button>
              </div>
              <Button
                onClick={handleCreate}
                disabled={createCampaign.isPending}
                className="w-full bg-[#168a4a] hover:bg-[#11743d] text-white font-black uppercase tracking-wider"
              >
                {createCampaign.isPending ? "Creating…" : "Create Campaign →"}
              </Button>
            </div>
          )}

          {step === 2 && createdCampaignId !== null && (
            <div className="space-y-4 mt-2">
              <div className="p-3 rounded-lg bg-[#eef7ef] border border-green-500/20">
                <p className="text-xs text-green-400 font-semibold">
                  ✓ Campaign "{createdTitle}" created. Optionally attach source materials below.
                </p>
              </div>
              <div>
                <Label className="text-[#2e4637] text-xs mb-2 block tracking-wider uppercase">Source Materials</Label>
                <SourceMaterialUploader
                  campaignId={createdCampaignId}
                  materials={liveMaterials}
                  onChanged={handleMaterialsChanged}
                />
                <p className="text-[10px] text-[#8fa095] mt-2">
                  If no files are uploaded, candidates will see the default Acme Financial case study.
                </p>
              </div>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={handleFinish}
                  className="flex-1 border-[#9db8a4] text-[#3f5847] hover:text-slate-950 bg-transparent"
                >
                  {liveMaterials.length === 0 ? "Skip & Finish" : "Done"}
                </Button>
                <Button
                  onClick={handleFinish}
                  className="flex-1 bg-[#168a4a] hover:bg-[#11743d] text-white font-black uppercase tracking-wider"
                >
                  Finish
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardShell>
  );
}
