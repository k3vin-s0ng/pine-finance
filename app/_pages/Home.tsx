"use client";

import { useEffect, useState } from "react";
import { Link } from "@/app/lib/wouter";
import { Button } from "@/app/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/app/components/ui/dialog";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/ui/select";
import { Textarea } from "@/app/components/ui/textarea";
import { toast } from "sonner";
import { trpc } from "@/app/lib/trpc";
import { getLoginUrl } from "@/app/lib/const";
import { useAuth } from "@/app/_core/hooks/useAuth";
import {
  ArrowRight, CheckCircle, BarChart3, Shield, Zap, Users, Target, TrendingUp,
  ChevronRight, Star, Building2, Briefcase, Calculator, BookOpen
} from "lucide-react";

function useLoginHref() {
  const [href, setHref] = useState("/");

  useEffect(() => {
    setHref(getLoginUrl());
  }, []);

  return href;
}

// ─── Demo Request Modal ───────────────────────────────────────────────────────
function DemoModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [form, setForm] = useState({ name: "", email: "", company: "", role: "", segment: "", message: "" });
  const requestDemo = trpc.demo.request.useMutation({
    onSuccess: () => {
      toast.success("Demo request received! We'll be in touch within 24 hours.");
      onClose();
    },
    onError: () => toast.error("Something went wrong. Please try again."),
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-[#fff] border border-[#168a4a]/30 max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-slate-950">Request a Demo</DialogTitle>
          <p className="text-sm text-[#3f5847] mt-1">See Pine Finance in action with a personalized walkthrough.</p>
        </DialogHeader>
        <div className="space-y-4 mt-2">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-[#2e4637] text-xs mb-1 block">Full Name</Label>
              <Input placeholder="Jane Smith" className="bg-[#eef7ef] border-[#9db8a4] text-slate-950 placeholder:text-[#6f8274]" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <Label className="text-[#2e4637] text-xs mb-1 block">Work Email</Label>
              <Input placeholder="jane@firm.com" className="bg-[#eef7ef] border-[#9db8a4] text-slate-950 placeholder:text-[#6f8274]" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-[#2e4637] text-xs mb-1 block">Company</Label>
              <Input placeholder="Goldman Sachs" className="bg-[#eef7ef] border-[#9db8a4] text-slate-950 placeholder:text-[#6f8274]" value={form.company} onChange={e => setForm(f => ({ ...f, company: e.target.value }))} />
            </div>
            <div>
              <Label className="text-[#2e4637] text-xs mb-1 block">Your Role</Label>
              <Input placeholder="Head of Recruiting" className="bg-[#eef7ef] border-[#9db8a4] text-slate-950 placeholder:text-[#6f8274]" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} />
            </div>
          </div>
          <div>
            <Label className="text-[#2e4637] text-xs mb-1 block">Firm Type</Label>
            <Select onValueChange={v => setForm(f => ({ ...f, segment: v }))}>
              <SelectTrigger className="bg-[#eef7ef] border-[#9db8a4] text-slate-950">
                <SelectValue placeholder="Select segment" />
              </SelectTrigger>
              <SelectContent className="bg-[#eef7ef] border-[#9db8a4]">
                {["Investment Banks", "PE", "Hedge Funds", "FP&A", "Accounting"].map(s => (
                  <SelectItem key={s} value={s} className="text-slate-950 hover:bg-[#cfe0d2]">{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-[#2e4637] text-xs mb-1 block">Message (optional)</Label>
            <Textarea placeholder="Tell us about your hiring process..." className="bg-[#eef7ef] border-[#9db8a4] text-slate-950 placeholder:text-[#6f8274] resize-none" rows={3} value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))} />
          </div>
          <Button
            className="w-full bg-[#168a4a] hover:bg-[#11743d] text-white font-bold py-3"
            onClick={() => requestDemo.mutate(form)}
            disabled={!form.name || !form.email || requestDemo.isPending}
          >
            {requestDemo.isPending ? "Sending..." : "Request Demo"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Navigation ───────────────────────────────────────────────────────────────
function Nav({ onDemo }: { onDemo: () => void }) {
  const { isAuthenticated, user } = useAuth();
  const loginHref = useLoginHref();

  const getDashboardPath = () => {
    if (user?.role === "recruiter" || user?.role === "admin") return "/dashboard/recruiter";
    if (user?.role === "candidate") return "/dashboard/candidate";
    return "/onboarding";
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-[#168a4a]/10 bg-[#f8fbf8]/90 backdrop-blur-md">
      <div className="container flex items-center justify-between h-16">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-sm bg-[#168a4a] flex items-center justify-center">
            <span className="text-white font-black text-xs">P</span>
          </div>
          <span className="font-bold text-slate-950 tracking-widest text-sm uppercase">Pine Finance</span>
        </Link>
        <div className="hidden md:flex items-center gap-8 text-xs font-medium tracking-widest uppercase text-[#52665a]">
          <a href="#product" className="hover:text-[#168a4a] transition-colors">Product</a>
          <a href="#segments" className="hover:text-[#168a4a] transition-colors">Solutions</a>
          <a href="#pricing" className="hover:text-[#168a4a] transition-colors">Pricing</a>
          <a href="#how-it-works" className="hover:text-[#168a4a] transition-colors">How It Works</a>
        </div>
        <div className="flex items-center gap-3">
          {isAuthenticated ? (
            <Link href={getDashboardPath()}>
              <Button className="bg-[#168a4a] hover:bg-[#11743d] text-white font-bold text-xs tracking-widest uppercase px-5">
                Dashboard
              </Button>
            </Link>
          ) : (
            <>
              <a href={loginHref}>
                <Button variant="ghost" className="text-[#3f5847] hover:text-slate-950 text-xs tracking-widest uppercase">Sign In</Button>
              </a>
              <Button onClick={onDemo} className="bg-[#168a4a] hover:bg-[#11743d] text-white font-bold text-xs tracking-widest uppercase px-5">
                Request Demo
              </Button>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}

// ─── Hero ─────────────────────────────────────────────────────────────────────
function Hero({ onDemo }: { onDemo: () => void }) {
  const loginHref = useLoginHref();

  return (
    <section className="relative min-h-screen flex items-center overflow-hidden bg-[#f8fbf8]">
      {/* Atmospheric background */}
      <div className="absolute inset-0">
        {/* Radial glow from right */}
        <div className="absolute top-1/4 right-0 w-[600px] h-[600px] rounded-full opacity-20"
          style={{ background: "radial-gradient(circle, #168a4a 0%, #0f5f34 30%, transparent 70%)" }} />
        {/* Light rays */}
        <div className="absolute top-0 right-1/4 w-px h-full opacity-5"
          style={{ background: "linear-gradient(180deg, transparent, #168a4a, transparent)" }} />
        <div className="absolute top-0 right-1/3 w-px h-full opacity-3"
          style={{ background: "linear-gradient(180deg, transparent, #168a4a, transparent)" }} />
        {/* Subtle grid */}
        <div className="absolute inset-0 opacity-[0.02]"
          style={{ backgroundImage: "linear-gradient(#168a4a 1px, transparent 1px), linear-gradient(90deg, #168a4a 1px, transparent 1px)", backgroundSize: "80px 80px" }} />
        {/* Vignette */}
        <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse at 30% 50%, transparent 30%, rgba(248,251,248,0.8) 100%)" }} />
      </div>

      <div className="container relative z-10 pt-24 pb-16">
        <div className="max-w-4xl">
          {/* Eyebrow */}
          <div className="flex items-center gap-3 mb-8">
            <div className="h-px w-12 bg-[#168a4a]" />
            <span className="text-[#168a4a] text-xs font-bold tracking-[0.3em] uppercase">The AI Fluency Standard for Finance</span>
          </div>

          {/* Headline */}
          <h1 className="text-6xl md:text-8xl font-black leading-[0.9] tracking-tight mb-8 uppercase bg-gradient-to-b from-slate-950 via-slate-950 to-[#168a4a] bg-clip-text text-transparent">
            <span className="block">Identify Who</span>
            <span className="block">Actually Uses</span>
            <span className="block">AI Well.</span>
          </h1>

          <p className="text-[#3f5847] text-lg md:text-xl max-w-xl leading-relaxed mb-10 font-light">
            Finance-specific AI fluency assessments for investment banks, private equity, hedge funds, and FP&A teams. Stop guessing who can use AI well. Start measuring with realistic hiring workflows.
          </p>

          <div className="flex flex-col sm:flex-row gap-4">
            <Button
              onClick={onDemo}
              className="bg-[#168a4a] hover:bg-[#11743d] text-white font-bold text-sm tracking-widest uppercase px-8 py-6 group"
            >
              Request Demo
              <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Button>
            <a href={loginHref}>
              <Button variant="outline" className="border-[#9db8a4] text-[#2e4637] hover:border-[#168a4a]/50 hover:text-slate-950 text-sm tracking-widest uppercase px-8 py-6 bg-transparent">
                Sign In to Platform
              </Button>
            </a>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-8 mt-16 pt-16 border-t border-[#d9e7db]">
            {[
              { value: "6", label: "Scoring Dimensions", sub: "Accuracy to Tool Fluency" },
              { value: "4", label: "Role Templates", sub: "IB, PE, HF, FP&A" },
              { value: "3×", label: "Better Signal", sub: "vs. traditional interviews" },
            ].map((stat) => (
              <div key={stat.value}>
                <div className="text-3xl md:text-4xl font-black text-gold-gradient">{stat.value}</div>
                <div className="text-slate-950 text-sm font-semibold mt-1">{stat.label}</div>
                <div className="text-[#6f8274] text-xs mt-0.5">{stat.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Problem Statement ────────────────────────────────────────────────────────
function Problem() {
  return (
    <section className="py-32 bg-[#f8fbf8] relative overflow-hidden">
      <div className="absolute inset-0 opacity-[0.015]"
        style={{ backgroundImage: "radial-gradient(circle, #168a4a 1px, transparent 1px)", backgroundSize: "40px 40px" }} />
      <div className="container relative z-10">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div>
            <div className="flex items-center gap-3 mb-6">
              <div className="h-px w-8 bg-[#168a4a]" />
              <span className="text-[#168a4a] text-xs font-bold tracking-[0.3em] uppercase">The Problem</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-black leading-tight uppercase mb-6">
              <span className="text-slate-950">Finance Firms</span><br />
              <span className="text-chiaroscuro">Can't Measure</span><br />
              <span className="text-gold-gradient">AI Skill.</span>
            </h2>
            <p className="text-[#52665a] text-base leading-relaxed mb-6">
              Financial institutions increasingly expect junior and mid-level talent to be fluent in AI tools — yet most firms still have no reliable way to measure AI skill in a job-relevant setting.
            </p>
            <p className="text-[#52665a] text-base leading-relaxed">
              Existing recruiting processes test technical knowledge and finance knowledge, but they rarely test whether a candidate can effectively use AI to complete real tasks under realistic constraints.
            </p>
          </div>
          <div className="space-y-4">
            {[
              {
                icon: Target,
                title: "Can't distinguish real AI users",
                desc: "Firms cannot tell who merely talks about AI vs. who can use it to produce better work faster.",
              },
              {
                icon: BarChart3,
                title: "No meaningful benchmarks",
                desc: "Hiring teams cannot compare AI fluency across candidates using consistent, role-specific scoring.",
              },
              {
                icon: TrendingUp,
                title: "Interviews miss applied skill",
                desc: "Candidates can talk about AI fluency without proving they can use it under realistic finance constraints.",
              },
            ].map((item) => (
              <div key={item.title} className="flex gap-4 p-5 bg-[#fff] border border-[#d9e7db] rounded-lg hover:border-[#168a4a]/20 transition-colors group">
                <div className="w-10 h-10 rounded-lg bg-[#168a4a]/10 flex items-center justify-center flex-shrink-0 group-hover:bg-[#168a4a]/20 transition-colors">
                  <item.icon className="w-5 h-5 text-[#168a4a]" />
                </div>
                <div>
                  <div className="text-slate-950 font-semibold text-sm mb-1">{item.title}</div>
                  <div className="text-[#52665a] text-sm leading-relaxed">{item.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Product Overview ─────────────────────────────────────────────────────────
function Product() {
  return (
    <section id="product" className="py-32 bg-[#f8fbf8] relative">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#168a4a]/20 to-transparent" />
      <div className="container">
        <div className="text-center mb-20">
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="h-px w-8 bg-[#168a4a]" />
            <span className="text-[#168a4a] text-xs font-bold tracking-[0.3em] uppercase">The Platform</span>
            <div className="h-px w-8 bg-[#168a4a]" />
          </div>
          <h2 className="text-4xl md:text-5xl font-black uppercase mb-4">
            <span className="text-slate-950">Hiring Assessments.</span><br />
            <span className="text-gold-gradient">Sharper Signal.</span>
          </h2>
          <p className="text-[#52665a] max-w-xl mx-auto">Pine Finance helps hiring teams evaluate AI fluency with role-specific finance tasks, embedded AI assistance, structured scoring, and recruiter-ready reports.</p>
        </div>

        <div className="max-w-4xl mx-auto">
          <div className="relative p-8 bg-[#fff] border border-[#168a4a]/30 rounded-xl overflow-hidden glow-gold">
            <div className="absolute top-0 right-0 w-48 h-48 opacity-5"
              style={{ background: "radial-gradient(circle, #168a4a, transparent)" }} />
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-lg bg-[#168a4a] flex items-center justify-center">
                  <Briefcase className="w-5 h-5 text-white" />
                </div>
                <span className="text-[#168a4a] text-xs font-bold tracking-widest uppercase">Hiring Product</span>
              </div>
              <h3 className="text-2xl font-black text-slate-950 uppercase mb-3">AI Fluency Interviews</h3>
              <p className="text-[#52665a] text-sm leading-relaxed mb-6">
                Structured assessments that evaluate how candidates use AI in realistic finance scenarios — model support, document analysis, reconciliation, and research synthesis.
              </p>
              <div className="space-y-2.5">
                {[
                  "Timed, browser-based assessment environment",
                  "Embedded AI workspace with approved tools",
                  "Role-specific task templates (IB, PE, HF, FP&A)",
                  "6-dimension automated scoring with LLM rationale",
                  "Benchmark reports vs. peer cohorts",
                  "PDF score reports stored and exportable",
                ].map(f => (
                  <div key={f} className="flex items-center gap-2.5 text-sm text-[#2e4637]">
                    <CheckCircle className="w-4 h-4 text-[#168a4a] flex-shrink-0" />
                    {f}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Scoring Dimensions ───────────────────────────────────────────────────────
function ScoringDimensions() {
  const dimensions = [
    { name: "Accuracy", icon: Target, desc: "Was the financial content correct and precise? Validates formulas, metrics, and factual claims.", score: 92 },
    { name: "Efficiency", icon: Zap, desc: "How quickly and cleanly was the task completed relative to the time limit?", score: 78 },
    { name: "Judgment", icon: Shield, desc: "Did the candidate use AI appropriately rather than blindly accepting outputs?", score: 85 },
    { name: "Verification", icon: CheckCircle, desc: "Did the candidate check claims, validate sources, and catch errors?", score: 71 },
    { name: "Communication", icon: BookOpen, desc: "Was the final output professional, clear, and client-ready?", score: 88 },
    { name: "Tool Fluency", icon: BarChart3, desc: "Did the candidate structure prompts well and iterate effectively?", score: 82 },
  ];

  return (
    <section className="py-32 bg-[#f8fbf8] relative">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#168a4a]/20 to-transparent" />
      <div className="container">
        <div className="text-center mb-20">
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="h-px w-8 bg-[#168a4a]" />
            <span className="text-[#168a4a] text-xs font-bold tracking-[0.3em] uppercase">Scoring Engine</span>
            <div className="h-px w-8 bg-[#168a4a]" />
          </div>
          <h2 className="text-4xl md:text-5xl font-black uppercase mb-4">
            <span className="text-slate-950">Six Dimensions.</span><br />
            <span className="text-gold-gradient">Complete Picture.</span>
          </h2>
          <p className="text-[#52665a] max-w-xl mx-auto text-sm">Every score is generated by an LLM evaluator with written rationale — decomposable, auditable, and tied to observable actions.</p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {dimensions.map((dim, i) => (
            <div key={dim.name} className="p-6 bg-[#fff] border border-[#d9e7db] rounded-xl hover:border-[#168a4a]/25 transition-all group">
              <div className="flex items-start justify-between mb-4">
                <div className="w-9 h-9 rounded-lg bg-[#168a4a]/10 flex items-center justify-center group-hover:bg-[#168a4a]/20 transition-colors">
                  <dim.icon className="w-4 h-4 text-[#168a4a]" />
                </div>
                <span className="text-2xl font-black text-gold-gradient">{dim.score}</span>
              </div>
              <h3 className="text-slate-950 font-bold text-sm uppercase tracking-wider mb-2">{dim.name}</h3>
              <p className="text-[#6f8274] text-xs leading-relaxed">{dim.desc}</p>
              <div className="mt-4 h-1 bg-[#d9e7db] rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-[#0f5f34] to-[#168a4a] rounded-full transition-all duration-1000"
                  style={{ width: `${dim.score}%` }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── ICP Segments ─────────────────────────────────────────────────────────────
function Segments() {
  const segments = [
    {
      icon: Building2,
      name: "Investment Banks",
      buyer: "COO, Head of Analyst Program",
      useCase: "Pre-hire AI fluency screening for large analyst classes",
      why: "Large analyst classes, standardized recruiting, repetitive high-volume workflows",
    },
    {
      icon: Briefcase,
      name: "PE",
      buyer: "Talent Lead, Operating Partner, COO",
      useCase: "Associate/analyst assessment for research and portfolio work",
      why: "Small teams, high value-per-hire, strong interest in productivity",
    },
    {
      icon: TrendingUp,
      name: "Hedge Funds",
      buyer: "COO, Chief of Staff, PM, Talent Lead",
      useCase: "Research and ops workflow assessment",
      why: "High premium on research speed and accuracy, interest in AI leverage",
    },
    {
      icon: Calculator,
      name: "FP&A",
      buyer: "VP Finance, CFO Office, FP&A Lead",
      useCase: "Analyst assessment for planning and reporting workflows",
      why: "Recurring planning cycles and high need for accurate, AI-assisted analysis",
    },
    {
      icon: BookOpen,
      name: "Accounting",
      buyer: "Controller, Finance Transformation Lead",
      useCase: "Assessment for close, reconciliation, and reporting roles",
      why: "Clear workflows where candidates can demonstrate accuracy and verification discipline",
    },
  ];

  return (
    <section id="segments" className="py-32 bg-[#f8fbf8] relative">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#168a4a]/20 to-transparent" />
      <div className="container">
        <div className="text-center mb-20">
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="h-px w-8 bg-[#168a4a]" />
            <span className="text-[#168a4a] text-xs font-bold tracking-[0.3em] uppercase">Solutions</span>
            <div className="h-px w-8 bg-[#168a4a]" />
          </div>
          <h2 className="text-4xl md:text-5xl font-black uppercase mb-4">
            <span className="text-slate-950">Built for</span><br />
            <span className="text-gold-gradient">Finance Teams.</span>
          </h2>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
          {segments.slice(0, 3).map((seg) => (
            <div key={seg.name} className="p-6 bg-[#fff] border border-[#d9e7db] rounded-xl hover:border-[#168a4a]/30 transition-all group">
              <div className="w-10 h-10 rounded-lg bg-[#168a4a]/10 flex items-center justify-center mb-4 group-hover:bg-[#168a4a]/20 transition-colors">
                <seg.icon className="w-5 h-5 text-[#168a4a]" />
              </div>
              <h3 className="text-slate-950 font-bold text-base uppercase tracking-wider mb-1">{seg.name}</h3>
              <p className="text-[#168a4a] text-xs mb-3">{seg.buyer}</p>
              <p className="text-[#52665a] text-xs leading-relaxed mb-3">{seg.why}</p>
              <div className="pt-3 border-t border-[#d9e7db]">
                <p className="text-[#6f8274] text-xs">{seg.useCase}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          {segments.slice(3).map((seg) => (
            <div key={seg.name} className="p-6 bg-[#fff] border border-[#d9e7db] rounded-xl hover:border-[#168a4a]/30 transition-all group">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-[#168a4a]/10 flex items-center justify-center flex-shrink-0 group-hover:bg-[#168a4a]/20 transition-colors">
                  <seg.icon className="w-5 h-5 text-[#168a4a]" />
                </div>
                <div>
                  <h3 className="text-slate-950 font-bold text-base uppercase tracking-wider mb-1">{seg.name}</h3>
                  <p className="text-[#168a4a] text-xs mb-2">{seg.buyer}</p>
                  <p className="text-[#52665a] text-xs leading-relaxed">{seg.why}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── How It Works ─────────────────────────────────────────────────────────────
function HowItWorks() {
  const steps = [
    {
      num: "01",
      title: "Create Campaign",
      desc: "Recruiters create an assessment campaign, select a role template (IB Analyst, FP&A Analyst, PE Associate, or Hedge Fund Research Analyst), and set time limits.",
    },
    {
      num: "02",
      title: "Candidate Completes Assessment",
      desc: "Candidates receive a timed, browser-based assessment with source materials (mock 10-K, earnings release, spreadsheet) and an embedded AI workspace to complete realistic finance tasks.",
    },
    {
      num: "03",
      title: "AI Scores Automatically",
      desc: "Pine Finance's LLM scoring engine evaluates submissions across 6 dimensions with written rationale, benchmark comparisons, and a recruiter-facing summary — all stored as a PDF report.",
    },
    {
      num: "04",
      title: "Compare & Decide",
      desc: "Recruiters view ranked candidate lists, compare side-by-side, download PDF reports, and make data-driven hiring decisions with confidence.",
    },
  ];

  return (
    <section id="how-it-works" className="py-32 bg-[#f8fbf8] relative">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#168a4a]/20 to-transparent" />
      <div className="container">
        <div className="text-center mb-20">
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="h-px w-8 bg-[#168a4a]" />
            <span className="text-[#168a4a] text-xs font-bold tracking-[0.3em] uppercase">How It Works</span>
            <div className="h-px w-8 bg-[#168a4a]" />
          </div>
          <h2 className="text-4xl md:text-5xl font-black uppercase mb-4">
            <span className="text-slate-950">From Invite</span><br />
            <span className="text-gold-gradient">to Insight.</span>
          </h2>
        </div>

        <div className="relative">
          <div className="hidden lg:block absolute top-8 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#168a4a]/20 to-transparent" />
          <div className="grid lg:grid-cols-4 gap-6">
            {steps.map((step, i) => (
              <div key={step.num} className="relative">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-14 h-14 rounded-xl bg-[#fff] border border-[#168a4a]/40 flex items-center justify-center flex-shrink-0 relative z-10">
                    <span className="text-[#168a4a] font-black text-sm">{step.num}</span>
                  </div>
                  {i < steps.length - 1 && (
                    <ChevronRight className="w-4 h-4 text-[#9db8a4] hidden lg:block" />
                  )}
                </div>
                <h3 className="text-slate-950 font-bold text-sm uppercase tracking-wider mb-2">{step.title}</h3>
                <p className="text-[#52665a] text-xs leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Pricing ──────────────────────────────────────────────────────────────────
function Pricing({ onDemo }: { onDemo: () => void }) {
  const plans = [
    {
      name: "Starter",
      price: "$49",
      unit: "per candidate",
      desc: "For boutique firms running focused hiring campaigns.",
      features: [
        "All 4 role templates",
        "Automated LLM scoring",
        "PDF score reports",
        "Recruiter dashboard",
        "Candidate comparison",
        "Email support",
      ],
      cta: "Get Started",
      highlight: false,
    },
    {
      name: "Growth",
      price: "$2,400",
      unit: "per year",
      desc: "For firms running structured analyst or associate programs.",
      features: [
        "Up to 100 candidates/year",
        "Everything in Starter",
        "Custom role templates",
        "Benchmark reports",
        "Priority support",
        "ATS integration (coming soon)",
      ],
      cta: "Request Demo",
      highlight: true,
    },
    {
      name: "Enterprise",
      price: "Custom",
      unit: "annual contract",
      desc: "For large institutions running high-volume assessment programs.",
      features: [
        "Unlimited candidates",
        "Custom assessment design",
        "Advanced benchmarking",
        "SSO and admin controls",
        "Custom integrations",
        "Dedicated success manager",
      ],
      cta: "Contact Sales",
      highlight: false,
    },
  ];

  return (
    <section id="pricing" className="py-32 bg-[#f8fbf8] relative">
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#168a4a]/20 to-transparent" />
      <div className="container">
        <div className="text-center mb-20">
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="h-px w-8 bg-[#168a4a]" />
            <span className="text-[#168a4a] text-xs font-bold tracking-[0.3em] uppercase">Pricing</span>
            <div className="h-px w-8 bg-[#168a4a]" />
          </div>
          <h2 className="text-4xl md:text-5xl font-black uppercase mb-4">
            <span className="text-slate-950">Simple,</span><br />
            <span className="text-gold-gradient">Transparent Pricing.</span>
          </h2>
          <p className="text-[#52665a] max-w-md mx-auto text-sm">Start with per-candidate pricing or commit to an annual plan for better economics.</p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {plans.map((plan) => (
            <div key={plan.name}
              className={`relative p-8 rounded-xl border transition-all ${plan.highlight
                ? "bg-[#fff] border-[#168a4a]/50 glow-gold"
                : "bg-[#fff] border-[#d9e7db] hover:border-[#9db8a4]"
              }`}>
              {plan.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-[#168a4a] text-white text-xs font-bold px-4 py-1 rounded-full tracking-widest uppercase">Most Popular</span>
                </div>
              )}
              <div className="mb-6">
                <h3 className="text-[#3f5847] text-xs font-bold tracking-widest uppercase mb-2">{plan.name}</h3>
                <div className="flex items-baseline gap-1">
                  <span className={`text-4xl font-black ${plan.highlight ? "text-gold-gradient" : "text-slate-950"}`}>{plan.price}</span>
                  <span className="text-[#6f8274] text-sm">/{plan.unit}</span>
                </div>
                <p className="text-[#52665a] text-xs mt-2 leading-relaxed">{plan.desc}</p>
              </div>
              <div className="space-y-2.5 mb-8">
                {plan.features.map(f => (
                  <div key={f} className="flex items-center gap-2.5 text-sm text-[#2e4637]">
                    <CheckCircle className={`w-4 h-4 flex-shrink-0 ${plan.highlight ? "text-[#168a4a]" : "text-[#8fa095]"}`} />
                    {f}
                  </div>
                ))}
              </div>
              <Button
                onClick={onDemo}
                className={`w-full font-bold text-xs tracking-widest uppercase py-5 ${plan.highlight
                  ? "bg-[#168a4a] hover:bg-[#11743d] text-white"
                  : "bg-[#eef7ef] hover:bg-[#d9e7db] text-slate-950 border border-[#9db8a4]"
                }`}
              >
                {plan.cta}
              </Button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── CTA ──────────────────────────────────────────────────────────────────────
function CTA({ onDemo }: { onDemo: () => void }) {
  const loginHref = useLoginHref();

  return (
    <section className="py-32 bg-[#f8fbf8] relative overflow-hidden">
      <div className="absolute inset-0">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] opacity-10 rounded-full"
          style={{ background: "radial-gradient(ellipse, #168a4a, transparent 70%)" }} />
      </div>
      <div className="container relative z-10 text-center">
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="h-px w-8 bg-[#168a4a]" />
          <span className="text-[#168a4a] text-xs font-bold tracking-[0.3em] uppercase">Get Started</span>
          <div className="h-px w-8 bg-[#168a4a]" />
        </div>
        <h2 className="text-5xl md:text-7xl font-black uppercase mb-6">
          <span className="text-chiaroscuro">Ready to Measure</span><br />
          <span className="text-gold-gradient">AI Fluency?</span>
        </h2>
        <p className="text-[#52665a] max-w-lg mx-auto mb-10 text-base">
          Join the firms that have moved from guessing to knowing. Start with a design-partner pilot — fully customized for your role and hiring process.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button
            onClick={onDemo}
            className="bg-[#168a4a] hover:bg-[#11743d] text-white font-bold text-sm tracking-widest uppercase px-10 py-6 group"
          >
            Request Demo
            <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Button>
          <a href={loginHref}>
            <Button variant="outline" className="border-[#9db8a4] text-[#2e4637] hover:border-[#168a4a]/50 hover:text-slate-950 text-sm tracking-widest uppercase px-10 py-6 bg-transparent">
              Sign In
            </Button>
          </a>
        </div>
      </div>
    </section>
  );
}

// ─── Footer ───────────────────────────────────────────────────────────────────
function Footer() {
  return (
    <footer className="border-t border-[#eef7ef] bg-[#f8fbf8] py-12">
      <div className="container">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-sm bg-[#168a4a] flex items-center justify-center">
              <span className="text-white font-black text-xs">P</span>
            </div>
            <span className="font-bold text-slate-950 tracking-widest text-sm uppercase">Pine Finance</span>
          </div>
          <p className="text-[#8fa095] text-xs">© 2025 Pine Finance. The AI Fluency Standard for Finance.</p>
          <div className="flex gap-6 text-xs text-[#8fa095]">
            <a href="#" className="hover:text-[#168a4a] transition-colors">Privacy</a>
            <a href="#" className="hover:text-[#168a4a] transition-colors">Terms</a>
            <a href="#" className="hover:text-[#168a4a] transition-colors">Security</a>
          </div>
        </div>
      </div>
    </footer>
  );
}

// ─── Main Export ──────────────────────────────────────────────────────────────
export default function Home() {
  const [demoOpen, setDemoOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#f8fbf8]">
      <Nav onDemo={() => setDemoOpen(true)} />
      <Hero onDemo={() => setDemoOpen(true)} />
      <Problem />
      <Product />
      <ScoringDimensions />
      <Segments />
      <HowItWorks />
      <Pricing onDemo={() => setDemoOpen(true)} />
      <CTA onDemo={() => setDemoOpen(true)} />
      <Footer />
      <DemoModal open={demoOpen} onClose={() => setDemoOpen(false)} />
    </div>
  );
}
