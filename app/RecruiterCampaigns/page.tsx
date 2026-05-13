import { useState } from "react";
import { Link } from "wouter";
import DashboardShell from "@/components/DashboardShell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { Target, Search, Plus, ArrowRight, Clock } from "lucide-react";
import SourceMaterialUploader, { type SourceMaterial } from "@/components/SourceMaterialUploader";

const ROLE_TEMPLATES = ["IB Analyst", "FP&A Analyst", "PE Associate", "Hedge Fund Research Analyst"];
const STATUS_COLORS: Record<string, string> = {
  draft: "bg-[#1a1a1a] text-[#888] border-[#222]",
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
            <h1 className="text-2xl font-black text-white tracking-tight uppercase">Campaigns</h1>
            <p className="text-[#555] text-sm mt-1">All your assessment campaigns in one place.</p>
          </div>
          <Button
            onClick={() => setShowCreate(true)}
            className="bg-[#c9a84c] hover:bg-[#b8963e] text-black font-bold text-sm"
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
            <div key={label} className="bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl p-4 text-center">
              <div className="text-[#555] text-xs uppercase tracking-widest mb-1">{label}</div>
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
            placeholder="Search campaigns..."
            className="pl-9 bg-[#0d0d0d] border-[#1a1a1a] text-white placeholder:text-[#444] focus:border-[#c9a84c]/50"
          />
        </div>

        {/* Campaign list */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-24 bg-[#0d0d0d] border border-[#1a1a1a] rounded-xl animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 border border-dashed border-[#1a1a1a] rounded-xl">
            <Target className="w-10 h-10 text-[#333] mx-auto mb-4" />
            <div className="text-[#555] font-bold">{search ? "No campaigns match your search" : "No campaigns yet"}</div>
            <div className="text-[#333] text-sm mt-1 mb-4">Create your first campaign to start assessing candidates.</div>
            {!search && (
              <Button onClick={() => setShowCreate(true)} className="bg-[#c9a84c] hover:bg-[#b8963e] text-black font-bold text-sm">
                <Plus className="w-4 h-4 mr-1.5" /> New Campaign
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(campaign => {
              const mats = (campaign.sourceMaterials as SourceMaterial[] | null) ?? [];
              return (
                <div key={campaign.id} className="bg-[#0d0d0d] border border-[#1a1a1a] hover:border-[#c9a84c]/30 rounded-xl p-5 transition-colors">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="w-10 h-10 rounded-lg bg-[#1a1a1a] flex items-center justify-center flex-shrink-0">
                        <Target className="w-5 h-5 text-[#c9a84c]" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-white font-bold truncate">{campaign.title}</div>
                        <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                          <span className="text-[#555] text-xs">{campaign.roleTemplate}</span>
                          <span className="flex items-center gap-1 text-[#444] text-xs">
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
                            <span className="text-[10px] font-bold tracking-widest uppercase text-[#c9a84c]">
                              {mats.length} Custom Doc{mats.length > 1 ? "s" : ""}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <Link href={`/dashboard/recruiter/campaigns/${campaign.id}`}>
                      <Button size="sm" className="bg-[#c9a84c] hover:bg-[#b8963e] text-black font-bold text-xs flex-shrink-0">
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
        <DialogContent className="bg-[#0d0d0d] border-[#1a1a1a] text-white max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white font-black uppercase tracking-tight">
              {step === 1 ? "New Campaign" : "Attach Source Materials"}
            </DialogTitle>
            <DialogDescription className="text-[#555]">
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
                className={`h-1 flex-1 rounded-full transition-colors ${s <= step ? "bg-[#c9a84c]" : "bg-[#222]"}`}
              />
            ))}
          </div>

          {step === 1 && (
            <div className="space-y-4 pt-2">
              <div className="space-y-1.5">
                <Label className="text-[#888] text-xs uppercase tracking-widest">Campaign Title</Label>
                <Input
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  placeholder="e.g. Summer 2025 IB Analyst"
                  className="bg-[#111] border-[#222] text-white placeholder:text-[#444]"
                  onKeyDown={e => e.key === "Enter" && handleCreate()}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[#888] text-xs uppercase tracking-widest">Role Template</Label>
                <Select value={roleTemplate} onValueChange={setRoleTemplate}>
                  <SelectTrigger className="bg-[#111] border-[#222] text-white">
                    <SelectValue placeholder="Select role..." />
                  </SelectTrigger>
                  <SelectContent className="bg-[#111] border-[#222]">
                    {ROLE_TEMPLATES.map(r => (
                      <SelectItem key={r} value={r} className="text-white hover:bg-[#1a1a1a]">{r}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[#888] text-xs uppercase tracking-widest">Time Limit (minutes)</Label>
                <Select value={timeLimit} onValueChange={setTimeLimit}>
                  <SelectTrigger className="bg-[#111] border-[#222] text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#111] border-[#222]">
                    {["30", "45", "60", "90", "120"].map(t => (
                      <SelectItem key={t} value={t} className="text-white hover:bg-[#1a1a1a]">{t} minutes</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-[#111] border border-[#222]">
                <div>
                  <p className="text-sm font-semibold text-white">Auto-Score on Submission</p>
                  <p className="text-xs text-[#555] mt-0.5">AI scoring fires automatically when candidate submits</p>
                </div>
                <button
                  type="button"
                  onClick={() => setAutoScore(a => !a)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    autoScore ? "bg-[#c9a84c]" : "bg-[#333]"
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
                className="w-full bg-[#c9a84c] hover:bg-[#b8963e] text-black font-black uppercase tracking-wider"
              >
                {createCampaign.isPending ? "Creating…" : "Create Campaign →"}
              </Button>
            </div>
          )}

          {step === 2 && createdCampaignId !== null && (
            <div className="space-y-4 mt-2">
              <div className="p-3 rounded-lg bg-[#0a1a0a] border border-green-500/20">
                <p className="text-xs text-green-400 font-semibold">
                  ✓ Campaign "{createdTitle}" created. Optionally attach source materials below.
                </p>
              </div>
              <div>
                <Label className="text-[#aaa] text-xs mb-2 block tracking-wider uppercase">Source Materials</Label>
                <SourceMaterialUploader
                  campaignId={createdCampaignId}
                  materials={liveMaterials}
                  onChanged={handleMaterialsChanged}
                />
                <p className="text-[10px] text-[#444] mt-2">
                  If no files are uploaded, candidates will see the default Acme Financial case study.
                </p>
              </div>
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={handleFinish}
                  className="flex-1 border-[#333] text-[#888] hover:text-white bg-transparent"
                >
                  {liveMaterials.length === 0 ? "Skip & Finish" : "Done"}
                </Button>
                <Button
                  onClick={handleFinish}
                  className="flex-1 bg-[#c9a84c] hover:bg-[#b8963e] text-black font-black uppercase tracking-wider"
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