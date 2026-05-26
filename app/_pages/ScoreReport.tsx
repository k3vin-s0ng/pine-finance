"use client";

import { useState } from "react";
import { useParams, Link } from "@/app/lib/wouter";
import { Button } from "@/app/components/ui/button";
import { trpc } from "@/app/lib/trpc";
import { useAuth } from "@/app/_core/hooks/useAuth";
import {
  Download, ArrowLeft, Target, Zap, Shield, CheckCircle,
  BookOpen, BarChart3, Award, TrendingUp, Loader2, FileText
} from "lucide-react";
import { ExamResponseHistory } from "@/app/components/ExamResponseHistory";
import { CandidateBehaviorTab } from "@/app/components/CandidateBehaviorTab";
import {
  RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, Tooltip, Cell, ReferenceLine
} from "recharts";

const DIMENSION_CONFIG = {
  accuracy: { label: "Accuracy", icon: Target, color: "#168a4a", desc: "Correctness of financial content, formulas, and factual claims" },
  efficiency: { label: "Efficiency", icon: Zap, color: "#3f5847", desc: "Task completion speed relative to time limit" },
  judgment: { label: "Judgment", icon: Shield, color: "#7a9e7e", desc: "Appropriate use of AI vs. independent reasoning" },
  verification: { label: "Verification", icon: CheckCircle, color: "#6b8cba", desc: "Cross-checking claims and catching errors" },
  communication: { label: "Communication", icon: BookOpen, color: "#b07a9e", desc: "Professionalism and clarity of written output" },
  toolFluency: { label: "Tool Fluency", icon: BarChart3, color: "#c4a35a", desc: "Prompt quality and iterative AI usage" },
};

type DimKey = keyof typeof DIMENSION_CONFIG;

function ScoreRing({ score, size = 120 }: { score: number; size?: number }) {
  const radius = (size - 20) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = Math.min(score / 100, 1);
  const offset = circumference * (1 - pct);
  const color = score >= 85 ? "#168a4a" : score >= 70 ? "#3f5847" : "#6f8274";

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#d9e7db" strokeWidth={8} />
        <circle
          cx={size / 2} cy={size / 2} r={radius} fill="none"
          stroke={color} strokeWidth={8}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 1s ease" }}
        />
      </svg>
      <div className="absolute text-center">
        <div className="text-2xl font-black text-slate-950 leading-none">{Math.round(score)}</div>
        <div className="text-[#6f8274] text-[9px] uppercase tracking-widest">Score</div>
      </div>
    </div>
  );
}

function DimensionCard({ dimKey, score, rationale }: { dimKey: DimKey; score: number; rationale: string }) {
  const config = DIMENSION_CONFIG[dimKey];
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="p-5 bg-[#fff] border border-[#d9e7db] rounded-xl hover:border-[#168a4a]/20 transition-all">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${config.color}15` }}>
            <config.icon className="w-4 h-4" style={{ color: config.color }} />
          </div>
          <div>
            <div className="text-slate-950 font-bold text-sm uppercase tracking-wider">{config.label}</div>
            <div className="text-[#6f8274] text-[10px]">{config.desc}</div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-black" style={{ color: config.color }}>{Math.round(score)}</div>
          <div className="text-[#6f8274] text-[10px]">/100</div>
        </div>
      </div>

      <div className="mb-3 h-2 bg-[#d9e7db] rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-1000"
          style={{ width: `${score}%`, background: `linear-gradient(90deg, ${config.color}80, ${config.color})` }} />
      </div>

      <div className={`text-[#3f5847] text-xs leading-relaxed ${expanded ? "" : "line-clamp-2"}`}>
        {rationale}
      </div>
      {rationale?.length > 120 && (
        <button onClick={() => setExpanded(!expanded)} className="text-[#168a4a] text-[10px] mt-1 hover:underline">
          {expanded ? "Show less" : "Read more"}
        </button>
      )}
    </div>
  );
}

const CUSTOM_TOOLTIP = {
  contentStyle: { background: "#fff", border: "1px solid #d9e7db", borderRadius: "8px", color: "#fff", fontSize: 11 },
  labelStyle: { color: "#168a4a" },
};

export default function ScoreReport() {
  const { id } = useParams<{ id: string }>();
  const assessmentId = parseInt(id ?? "0");
  const { user } = useAuth();

  const { data: report, isLoading } = trpc.scoring.getReport.useQuery({ assessmentId });
  // Fetch benchmark data unconditionally (before any early returns) to comply with React hooks rules
  const roleTemplate = report?.campaign?.roleTemplate ?? "IB Analyst";
  const { data: benchmarkData } = trpc.scoring.getBenchmark.useQuery({ roleTemplate });
  const generatePdf = trpc.scoring.generatePdf.useMutation({
    onSuccess: (data) => {
      if (data.pdfUrl) {
        window.open(data.pdfUrl, "_blank");
      }
    },
    onError: () => {},
  });
  const triggerScore = trpc.scoring.scoreSubmission.useMutation({
    onSuccess: () => {
      window.location.reload();
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#f8fbf8] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#168a4a] animate-spin" />
      </div>
    );
  }

  if (!report?.score) {
    return (
      <div className="min-h-screen bg-[#f8fbf8] flex items-center justify-center">
        <div className="text-center max-w-md">
          <FileText className="w-12 h-12 text-[#9db8a4] mx-auto mb-4" />
          <h2 className="text-slate-950 font-bold text-lg uppercase mb-2">Score Not Yet Available</h2>
          <p className="text-[#52665a] text-sm mb-6">This assessment is still being scored. Check back shortly.</p>
          {user?.role === "admin" && report?.submission && (
            <Button
              onClick={() => triggerScore.mutate({ submissionId: report.submission!.id })}
              disabled={triggerScore.isPending}
              className="bg-[#168a4a] hover:bg-[#11743d] text-white font-bold text-xs tracking-widest uppercase"
            >
              {triggerScore.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Score Now (Admin)
            </Button>
          )}
          <Link href="/dashboard/candidate">
            <Button variant="ghost" className="text-[#6f8274] hover:text-slate-950 text-xs mt-3">
              <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Back to Dashboard
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const score = report.score;
  const dims: DimKey[] = ["accuracy", "efficiency", "judgment", "verification", "communication", "toolFluency"];
  const benchmarkDims = benchmarkData?.dimensions as Record<string, number> | undefined;

  const radarData = dims.map(d => ({
    subject: DIMENSION_CONFIG[d].label,
    score: Math.round((score as any)[d] ?? 0),
    benchmark: benchmarkDims ? Math.round(benchmarkDims[d] ?? 72) : 72,
  }));

  const barData = dims.map(d => ({
    name: DIMENSION_CONFIG[d].label,
    score: Math.round((score as any)[d] ?? 0),
    benchmark: benchmarkDims ? Math.round(benchmarkDims[d] ?? 72) : 72,
    color: DIMENSION_CONFIG[d].color,
  }));

  const isRecruiter = user?.role === "recruiter" || user?.role === "admin";
  const backHref = isRecruiter ? `/dashboard/recruiter/campaigns/${report.assessment?.campaignId}` : "/dashboard/candidate";

  return (
    <div className="min-h-screen bg-[#f8fbf8]">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-[#f8fbf8]/90 backdrop-blur-sm border-b border-[#d9e7db] px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href={backHref}>
              <Button variant="ghost" size="sm" className="text-[#6f8274] hover:text-slate-950">
                <ArrowLeft className="w-4 h-4 mr-1" /> Back
              </Button>
            </Link>
            <div className="h-4 w-px bg-[#d9e7db]" />
            <div>
              <div className="text-slate-950 font-bold text-sm uppercase tracking-widest">Score Report</div>
              <div className="text-[#6f8274] text-xs">{report.campaign?.roleTemplate ?? "Assessment"}</div>
            </div>
          </div>
          <Button
            onClick={() => generatePdf.mutate({ assessmentId })}
            disabled={generatePdf.isPending}
            className="bg-[#168a4a] hover:bg-[#11743d] text-white font-bold text-xs tracking-widest uppercase"
          >
            {generatePdf.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <Download className="w-3.5 h-3.5 mr-1.5" />}
            Export PDF
          </Button>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-10">
        {/* Hero score */}
        <div className="mb-10 p-8 bg-[#fff] border border-[#168a4a]/20 rounded-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 opacity-5"
            style={{ background: "radial-gradient(circle, #168a4a, transparent)" }} />
          <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center gap-8">
            <ScoreRing score={score.overallScore ?? 0} size={140} />
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl font-black text-slate-950 uppercase tracking-tight">
                  {report.candidate?.name ?? "Candidate"}
                </h1>
                {score.benchmarkPercentile && (
                  <span className="bg-[#168a4a]/15 text-[#168a4a] border border-[#168a4a]/30 text-xs font-bold px-3 py-1 rounded-full tracking-widest uppercase">
                    {score.benchmarkPercentile}th Percentile
                  </span>
                )}
              </div>
              <div className="text-[#168a4a] text-sm font-bold uppercase tracking-widest mb-3">
                {report.campaign?.roleTemplate}
              </div>
              <p className="text-[#3f5847] text-sm leading-relaxed max-w-xl">
                {score.recruiterSummary ?? "Assessment complete. Review dimension scores and rationale below."}
              </p>
              <div className="flex gap-6 mt-4">
                <div>
                  <div className="text-[#6f8274] text-[10px] uppercase tracking-widest">Overall Score</div>
                  <div className="text-2xl font-black text-gold-gradient">{Math.round(score.overallScore ?? 0)}/100</div>
                </div>
                {score.benchmarkPercentile && (
                  <div>
                    <div className="text-[#6f8274] text-[10px] uppercase tracking-widest">Peer Percentile</div>
                    <div className="text-2xl font-black text-slate-950">{score.benchmarkPercentile}th</div>
                  </div>
                )}
                {report.submission?.completionTimeSeconds && (
                  <div>
                    <div className="text-[#6f8274] text-[10px] uppercase tracking-widest">Completion Time</div>
                    <div className="text-2xl font-black text-slate-950">
                      {Math.round(report.submission.completionTimeSeconds / 60)}m
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Charts row */}
        <div className="grid lg:grid-cols-2 gap-6 mb-8">
          {/* Radar chart */}
          <div className="p-6 bg-[#fff] border border-[#d9e7db] rounded-xl">
            <h3 className="text-slate-950 font-bold text-sm uppercase tracking-widest mb-5">Dimension Profile</h3>
            <ResponsiveContainer width="100%" height={260}>
              <RadarChart data={radarData}>
                <PolarGrid stroke="#d9e7db" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: "#52665a", fontSize: 10 }} />
                <Radar name="Score" dataKey="score" stroke="#168a4a" fill="#168a4a" fillOpacity={0.15} strokeWidth={2} />
                <Radar name="Benchmark" dataKey="benchmark" stroke="#8fa095" fill="#8fa095" fillOpacity={0.05} strokeWidth={1} strokeDasharray="4 4" />
                <Tooltip {...CUSTOM_TOOLTIP} />
              </RadarChart>
            </ResponsiveContainer>
            <div className="flex gap-4 justify-center mt-2">
              <div className="flex items-center gap-1.5 text-[10px] text-[#3f5847]">
                <div className="w-3 h-0.5 bg-[#168a4a]" /> Candidate
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-[#6f8274]">
                <div className="w-3 h-0.5 bg-[#8fa095] border-dashed" style={{ borderTop: "1px dashed #8fa095" }} /> Benchmark
              </div>
            </div>
          </div>

          {/* Bar chart */}
          <div className="p-6 bg-[#fff] border border-[#d9e7db] rounded-xl">
            <h3 className="text-slate-950 font-bold text-sm uppercase tracking-widest mb-5">vs. Peer Benchmark</h3>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={barData} barGap={4}>
                <XAxis dataKey="name" tick={{ fill: "#6f8274", fontSize: 9 }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fill: "#6f8274", fontSize: 10 }} axisLine={false} tickLine={false} />
                <Tooltip {...CUSTOM_TOOLTIP} />
                <ReferenceLine y={72} stroke="#9db8a4" strokeDasharray="4 4" label={{ value: "Avg", fill: "#6f8274", fontSize: 9 }} />
                <Bar dataKey="score" radius={[4, 4, 0, 0]} barSize={18}>
                  {barData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} fillOpacity={0.8} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Dimension cards */}
        <div className="mb-8">
          <h2 className="text-slate-950 font-bold text-sm uppercase tracking-widest mb-5">Dimension Breakdown</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {dims.map(d => (
              <DimensionCard
                key={d}
                dimKey={d}
                score={(score as any)[d] ?? 0}
                rationale={(score as any)[`${d}Rationale`] ?? ""}
              />
            ))}
          </div>
        </div>

        {/* Recruiter summary */}
        {isRecruiter && score.recruiterSummary && (
          <div className="p-6 bg-[#fff] border border-[#168a4a]/20 rounded-xl">
            <div className="flex items-center gap-2 mb-4">
              <Award className="w-4 h-4 text-[#168a4a]" />
              <h3 className="text-slate-950 font-bold text-sm uppercase tracking-widest">Recruiter Summary</h3>
            </div>
            <p className="text-[#2e4637] text-sm leading-relaxed">{score.recruiterSummary}</p>
          </div>
        )}

        {isRecruiter && (
          <div className="mt-8">
            <CandidateBehaviorTab assessmentId={assessmentId} />
          </div>
        )}

        {/* Exam Responses & History — visible to candidate (own) and recruiter/admin (any) */}
        <ExamResponseHistory
          assessmentId={assessmentId}
          candidateId={report.assessment?.candidateId ?? undefined}
        />
      </div>
    </div>
  );
}
