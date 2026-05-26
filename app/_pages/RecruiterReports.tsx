"use client";

import { useState } from "react";
import { Link } from "@/app/lib/wouter";
import DashboardShell from "@/app/components/DashboardShell";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { trpc } from "@/app/lib/trpc";
import { FileText, Search, Download, ArrowRight, ExternalLink } from "lucide-react";

export default function RecruiterReports() {
  const [search, setSearch] = useState("");
  const { data: reports, isLoading } = trpc.recruiter.allReports.useQuery();

  const filtered = (reports ?? []).filter(({ report, assessment, campaign }) => {
    const q = search.toLowerCase();
    if (!q) return true;
    return (
      campaign?.title?.toLowerCase().includes(q) ||
      campaign?.roleTemplate?.toLowerCase().includes(q) ||
      String(assessment?.id).includes(q)
    );
  });

  return (
    <DashboardShell>
      <div className="p-6 md:p-8 space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-black text-slate-950 tracking-tight uppercase">Reports</h1>
          <p className="text-[#6f8274] text-sm mt-1">All generated PDF score reports across your campaigns.</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-[#fff] border border-[#d9e7db] rounded-xl p-5">
            <div className="text-[#6f8274] text-xs uppercase tracking-widest mb-1">Total Reports</div>
            <div className="text-3xl font-black text-slate-950">{reports?.length ?? 0}</div>
          </div>
          <div className="bg-[#fff] border border-[#d9e7db] rounded-xl p-5">
            <div className="text-[#6f8274] text-xs uppercase tracking-widest mb-1">This Month</div>
            <div className="text-3xl font-black text-[#168a4a]">
              {(reports ?? []).filter(r => {
                const d = new Date(r.report.generatedAt ?? 0);
                const now = new Date();
                return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
              }).length}
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8fa095]" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by campaign or role..."
            className="pl-9 bg-[#fff] border-[#d9e7db] text-slate-950 placeholder:text-[#8fa095] focus:border-[#168a4a]/50"
          />
        </div>

        {/* List */}
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-20 bg-[#fff] border border-[#d9e7db] rounded-xl animate-pulse" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 border border-dashed border-[#d9e7db] rounded-xl">
            <FileText className="w-10 h-10 text-[#9db8a4] mx-auto mb-4" />
            <div className="text-[#6f8274] font-bold">{search ? "No reports match your search" : "No reports generated yet"}</div>
            <div className="text-[#9db8a4] text-sm mt-1">Reports are generated after AI scoring is complete.</div>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map(({ report, assessment, campaign }) => (
              <div key={report.id} className="bg-[#fff] border border-[#d9e7db] hover:border-[#168a4a]/30 rounded-xl p-5 transition-colors">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-10 h-10 rounded-lg bg-[#d9e7db] flex items-center justify-center flex-shrink-0">
                      <FileText className="w-5 h-5 text-[#168a4a]" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-slate-950 font-bold truncate">
                        {campaign?.title ?? "Assessment"} — Report #{report.id}
                      </div>
                      <div className="text-[#6f8274] text-xs mt-0.5">
                        {campaign?.roleTemplate} · Assessment #{assessment?.id} ·{" "}
                        {report.generatedAt ? new Date(report.generatedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : ""}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {report.url && (
                      <a href={report.url} target="_blank" rel="noopener noreferrer">
                        <Button size="sm" variant="outline" className="border-[#d9e7db] text-[#3f5847] hover:text-slate-950 hover:border-[#9db8a4] text-xs">
                          <Download className="w-3 h-3 mr-1" /> PDF
                        </Button>
                      </a>
                    )}
                    <Link href={`/report/${assessment?.id}`}>
                      <Button size="sm" className="bg-[#168a4a] hover:bg-[#11743d] text-white font-bold text-xs">
                        View <ArrowRight className="w-3 h-3 ml-1" />
                      </Button>
                    </Link>
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
