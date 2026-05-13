import React, { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import {
  ChevronDown, ChevronUp, MessageSquare, FileText, Clock,
  CheckCircle2, Loader2, Bot, User, History, Trophy, Calendar,
  AlignLeft, Timer, Search, BarChart2, Lightbulb
} from "lucide-react";
import { Streamdown } from "streamdown";

// ─── Section Parser ───────────────────────────────────────────────────────────

type SectionDef = { key: string; label: string; header: string; Icon: React.ComponentType<any>; color: string };

const MEMO_SECTIONS: SectionDef[] = [
  { key: "findings",   label: "Key Findings",       header: "**Key Findings**",       Icon: Search,    color: "#c9a84c" },
  { key: "analysis",  label: "Numerical Analysis",  header: "**Numerical Analysis**", Icon: BarChart2,  color: "#6b8cba" },
  { key: "conclusion",label: "Conclusion",           header: "**Conclusion**",         Icon: Lightbulb, color: "#7ec89a" },
];

const VARIANCE_SECTIONS: SectionDef[] = [
  { key: "driver",          label: "Driver Identification", header: "**Driver Identification**", Icon: BarChart2,  color: "#c9a84c" },
  { key: "quantification",  label: "Quantification",        header: "**Quantification**",        Icon: Search,    color: "#6b8cba" },
  { key: "recommendation",  label: "Recommendation",        header: "**Recommendation**",        Icon: Lightbulb, color: "#7ec89a" },
];

const THESIS_SECTIONS: SectionDef[] = [
  { key: "thesis",          label: "Thesis Statement",   header: "**Thesis Statement**",   Icon: Lightbulb, color: "#c9a84c" },
  { key: "evidence",        label: "Supporting Evidence",header: "**Supporting Evidence**",Icon: Search,    color: "#6b8cba" },
  { key: "counterargument", label: "Counterargument",    header: "**Counterargument**",    Icon: BarChart2,  color: "#e07070" },
  { key: "recommendation",  label: "Recommendation",     header: "**Recommendation**",     Icon: Lightbulb, color: "#7ec89a" },
];

const EXTRACTION_SECTIONS: SectionDef[] = [
  { key: "extraction", label: "Data Extraction", header: "**Data Extraction**", Icon: BarChart2, color: "#c9a84c" },
];

const RECONCILIATION_SECTIONS: SectionDef[] = [
  { key: "table",   label: "Reconciliation Table", header: "**Reconciliation Table**", Icon: BarChart2,  color: "#c9a84c" },
  { key: "summary", label: "Summary",              header: "**Summary**",              Icon: Lightbulb, color: "#7ec89a" },
];

const FLAGS_SECTIONS: SectionDef[] = [
  { key: "flags", label: "Flags", header: "**Flag 1", Icon: Search, color: "#e07070" },
];

function detectSections(raw: string): SectionDef[] | null {
  if (raw.includes("**Key Findings**")) return MEMO_SECTIONS;
  if (raw.includes("**Driver Identification**")) return VARIANCE_SECTIONS;
  if (raw.includes("**Thesis Statement**")) return THESIS_SECTIONS;
  if (raw.includes("**Data Extraction**")) return EXTRACTION_SECTIONS;
  if (raw.includes("**Reconciliation Table**")) return RECONCILIATION_SECTIONS;
  if (/\*\*Flag \d/.test(raw)) return FLAGS_SECTIONS;
  return null;
}

function parseSectionsFromDefs(raw: string, defs: SectionDef[]): Record<string, string> {
  const result: Record<string, string> = {};
  // For flags, treat the whole content as one block
  if (defs === FLAGS_SECTIONS) {
    result["flags"] = raw;
    return result;
  }
  for (let i = 0; i < defs.length; i++) {
    const { key, header } = defs[i];
    const start = raw.indexOf(header);
    if (start === -1) { result[key] = ""; continue; }
    const contentStart = start + header.length;
    let end = raw.length;
    for (let j = i + 1; j < defs.length; j++) {
      const nextIdx = raw.indexOf(defs[j].header, contentStart);
      if (nextIdx !== -1 && nextIdx < end) end = nextIdx;
    }
    result[key] = raw.slice(contentStart, end).trim();
  }
  return result;
}

function wordCount(text: string): number {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}

// ─── Types ────────────────────────────────────────────────────────────────────

type AiMessage = { role: "user" | "assistant" | "system"; content: string; timestamp?: string };
type TaskStat = { wordCount: number; timeSeconds: number; isEstimated?: boolean };

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(seconds: number): string {
  if (seconds <= 0) return "—";
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

// ─── Mini Stats Bar ───────────────────────────────────────────────────────────

function TaskStatsBar({ stat }: { stat: TaskStat }) {
  return (
    <div className="flex items-center gap-4 px-4 py-2.5 bg-[#0d0d0d] border-x border-t border-[#1a1a1a] rounded-t-xl">
      <div className="flex items-center gap-1.5">
        <AlignLeft className="w-3 h-3 text-[#c9a84c]" />
        <span className="text-[#c9a84c] text-[11px] font-bold tabular-nums">
          {stat.wordCount.toLocaleString()}
        </span>
        <span className="text-[#444] text-[10px] uppercase tracking-widest">words</span>
      </div>
      <div className="w-px h-3 bg-[#222]" />
      <div className="flex items-center gap-1.5">
        <Timer className="w-3 h-3 text-[#6b8cba]" />
        <span className="text-[#6b8cba] text-[11px] font-bold tabular-nums">
          {formatTime(stat.timeSeconds)}
        </span>
        <span className="text-[#444] text-[10px] uppercase tracking-widest">{stat.isEstimated === false ? "time" : "est. time"}</span>
      </div>
      {stat.wordCount > 0 && stat.timeSeconds > 0 && (
        <>
          <div className="w-px h-3 bg-[#222]" />
          <div className="flex items-center gap-1.5">
            <span className="text-[#555] text-[10px] tabular-nums">
              ~{Math.round((stat.wordCount / Math.max(stat.timeSeconds / 60, 0.1)))} wpm
            </span>
          </div>
        </>
      )}
    </div>
  );
}

// ─── Task Response Card ───────────────────────────────────────────────────────

function TaskResponseCard({
  taskKey,
  response,
  stat,
}: {
  taskKey: string;
  response: string;
  stat?: TaskStat;
}) {
  const [expanded, setExpanded] = useState(false);
  const [activeSection, setActiveSection] = useState<string>("");
  const label = taskKey
    .replace(/([A-Z])/g, " $1")
    .replace(/^task\s*/i, "Task ")
    .trim();

  const sectionDefs = response ? detectSections(response) : null;
  const sections = sectionDefs && response ? parseSectionsFromDefs(response, sectionDefs) : null;

  // Initialize activeSection to first key when sectionDefs are detected
  useEffect(() => {
    if (sectionDefs && sectionDefs.length > 0 && !activeSection) {
      setActiveSection(sectionDefs[0].key);
    }
  }, [sectionDefs, activeSection]);

  // Collapsed preview text — first non-empty section's opening line
  const previewText = (() => {
    if (!response) return "";
    if (sections && sectionDefs) {
      const first = sectionDefs.find(s => sections[s.key]?.trim());
      if (first) return sections[first.key].replace(/[#*`_~\[\]]/g, "").slice(0, 200);
    }
    return response.replace(/[#*`_~\[\]]/g, "").slice(0, 200);
  })();

  return (
    <div className="rounded-xl overflow-hidden">
      {/* Stats bar */}
      {stat && <TaskStatsBar stat={stat} />}

      {/* Card header */}
      <button
        className={`w-full flex items-center justify-between p-4 bg-[#0a0a0a] hover:bg-[#0f0f0f] transition-colors text-left border border-[#1a1a1a] ${
          stat ? "border-t-0 rounded-t-none" : ""
        } ${expanded ? "rounded-b-none" : "rounded-xl"}`}
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-[#c9a84c]/10 flex items-center justify-center flex-shrink-0">
            <FileText className="w-3.5 h-3.5 text-[#c9a84c]" />
          </div>
          <span className="text-white font-semibold text-sm uppercase tracking-wider">{label}</span>
          {sections && sectionDefs && (
            <div className="flex items-center gap-1 ml-1">
              {sectionDefs.map((s: SectionDef) => (
                <span
                  key={s.key}
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ background: sections[s.key]?.trim() ? s.color : "#2a2a2a" }}
                />
              ))}
            </div>
          )}
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-[#555]" /> : <ChevronDown className="w-4 h-4 text-[#555]" />}
      </button>

      {/* Collapsed preview */}
      {!expanded && previewText.length > 0 && (
        <div className="px-4 pb-3 bg-[#0a0a0a] border-x border-b border-[#1a1a1a] rounded-b-xl">
          <p className="text-[#666] text-xs leading-relaxed line-clamp-2">
            {previewText}{previewText.length >= 200 ? "…" : ""}
          </p>
        </div>
      )}

      {/* Expanded */}
      {expanded && (
        <div className="bg-[#070707] border-x border-b border-[#1a1a1a] rounded-b-xl">
          {response ? (
            sections ? (
              // ── Structured 3-section view ──────────────────────────────────
              <div>
                {/* Section tab strip */}
                <div className="flex border-b border-[#1a1a1a]">
                  {sectionDefs!.map((s: SectionDef) => {
                    const filled = (sections![s.key] ?? "").trim().length > 0;
                    const active = activeSection === s.key;
                    return (
                      <button
                        key={s.key}
                        onClick={() => setActiveSection(s.key)}
                        className="flex items-center gap-1.5 px-4 py-2.5 text-[10px] font-bold uppercase tracking-widest transition-colors border-b-2 -mb-px"
                        style={{
                          borderBottomColor: active ? s.color : "transparent",
                          color: active ? s.color : filled ? "#666" : "#333",
                          background: active ? `${s.color}08` : "transparent",
                        }}
                      >
                        <s.Icon className="w-3 h-3" />
                        <span>{s.label}</span>
                        {filled && (
                          <span
                            className="ml-1 text-[9px] tabular-nums"
                            style={{ color: active ? s.color : "#444", fontFamily: "var(--font-mono, monospace)" }}
                          >
                            {wordCount(sections[s.key])}w
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Active section content */}
                {sectionDefs!.map((s: SectionDef) => {
                  if (s.key !== activeSection) return null;
                  const content = sections![s.key] ?? "";
                  return (
                    <div key={s.key} className="p-5">
                      {/* Section label */}
                      <div className="flex items-center gap-2 mb-3">
                        <s.Icon className="w-3.5 h-3.5" style={{ color: s.color }} />
                        <span
                          className="text-[10px] font-black uppercase tracking-widest"
                          style={{ color: s.color }}
                        >
                          {s.label}
                        </span>
                        <div className="flex-1 h-px" style={{ background: `${s.color}20` }} />
                        <span
                          className="text-[9px] tabular-nums"
                          style={{ color: "#444", fontFamily: "var(--font-mono, monospace)" }}
                        >
                          {wordCount(content)} words
                        </span>
                      </div>

                      {content ? (
                        <div className="prose prose-invert prose-sm max-w-none
                          prose-headings:text-white prose-headings:font-bold prose-headings:uppercase prose-headings:tracking-wide
                          prose-p:text-[#ccc] prose-p:leading-relaxed
                          prose-li:text-[#ccc]
                          prose-strong:text-white
                          prose-code:text-[#c9a84c] prose-code:bg-[#1a1a1a] prose-code:px-1 prose-code:rounded
                          prose-pre:bg-[#111] prose-pre:border prose-pre:border-[#222]
                          prose-blockquote:border-l-[#c9a84c] prose-blockquote:text-[#888]
                          prose-a:text-[#c9a84c]
                          prose-hr:border-[#1a1a1a]">
                          <Streamdown>{content}</Streamdown>
                        </div>
                      ) : (
                        <span className="text-[#333] text-xs italic">This section was left blank.</span>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              // ── Legacy / unstructured fallback ─────────────────────────────
              <div className="p-5">
                <div className="prose prose-invert prose-sm max-w-none
                  prose-headings:text-white prose-headings:font-bold prose-headings:uppercase prose-headings:tracking-wide
                  prose-p:text-[#ccc] prose-p:leading-relaxed
                  prose-li:text-[#ccc]
                  prose-strong:text-white
                  prose-code:text-[#c9a84c] prose-code:bg-[#1a1a1a] prose-code:px-1 prose-code:rounded
                  prose-pre:bg-[#111] prose-pre:border prose-pre:border-[#222]
                  prose-blockquote:border-l-[#c9a84c] prose-blockquote:text-[#888]
                  prose-a:text-[#c9a84c]
                  prose-hr:border-[#1a1a1a]">
                  <Streamdown>{response}</Streamdown>
                </div>
              </div>
            )
          ) : (
            <div className="p-5">
              <span className="text-[#444] text-xs italic">No response recorded</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── AI Chat Log ─────────────────────────────────────────────────────────────

function AiChatLog({ messages }: { messages: AiMessage[] }) {
  const [expanded, setExpanded] = useState(false);
  const visible = messages.filter((m) => m.role !== "system");
  const shown = expanded ? visible : visible.slice(0, 3);

  if (visible.length === 0) {
    return (
      <div className="p-4 bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl text-center text-[#444] text-xs">
        No AI interactions recorded for this assessment.
      </div>
    );
  }

  return (
    <div className="border border-[#1a1a1a] rounded-xl overflow-hidden">
      <div className="flex items-center justify-between p-4 bg-[#0a0a0a] border-b border-[#1a1a1a]">
        <div className="flex items-center gap-3">
          <div className="w-7 h-7 rounded-lg bg-[#6b8cba]/10 flex items-center justify-center">
            <MessageSquare className="w-3.5 h-3.5 text-[#6b8cba]" />
          </div>
          <span className="text-white font-semibold text-sm uppercase tracking-wider">AI Interaction Log</span>
          <span className="text-[#555] text-xs">({visible.length} messages)</span>
        </div>
      </div>

      <div className="divide-y divide-[#111] bg-[#070707]">
        {shown.map((msg, i) => (
          <div key={i} className={`flex gap-3 p-4 ${msg.role === "assistant" ? "bg-[#0a0a0a]" : ""}`}>
            <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
              msg.role === "user" ? "bg-[#c9a84c]/15" : "bg-[#6b8cba]/15"
            }`}>
              {msg.role === "user"
                ? <User className="w-3 h-3 text-[#c9a84c]" />
                : <Bot className="w-3 h-3 text-[#6b8cba]" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1.5">
                <span className={`text-[10px] font-bold uppercase tracking-widest ${
                  msg.role === "user" ? "text-[#c9a84c]" : "text-[#6b8cba]"
                }`}>
                  {msg.role === "user" ? "Candidate" : "AI Assistant"}
                </span>
                {msg.timestamp && (
                  <span className="text-[#444] text-[9px]">{new Date(msg.timestamp).toLocaleTimeString()}</span>
                )}
              </div>
              <div className="prose prose-invert prose-xs max-w-none
                prose-p:text-[#bbb] prose-p:leading-relaxed prose-p:my-1
                prose-li:text-[#bbb] prose-li:my-0
                prose-ul:my-1 prose-ol:my-1
                prose-strong:text-white
                prose-headings:text-white prose-headings:text-sm prose-headings:my-1
                prose-code:text-[#c9a84c] prose-code:bg-[#1a1a1a] prose-code:px-1 prose-code:rounded prose-code:text-[11px]
                prose-pre:bg-[#111] prose-pre:border prose-pre:border-[#222] prose-pre:my-2
                prose-blockquote:border-l-[#6b8cba] prose-blockquote:text-[#888] prose-blockquote:my-1
                prose-a:text-[#c9a84c]">
                <Streamdown>{msg.content}</Streamdown>
              </div>
            </div>
          </div>
        ))}
      </div>

      {visible.length > 3 && (
        <div className="p-3 bg-[#0a0a0a] border-t border-[#1a1a1a] text-center">
          <button onClick={() => setExpanded(!expanded)} className="text-[#c9a84c] text-xs hover:underline">
            {expanded ? "Show less" : `Show all ${visible.length} messages`}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Exam Detail Panel ────────────────────────────────────────────────────────

function ExamDetailPanel({ assessmentId }: { assessmentId: number }) {
  const { data, isLoading, error } = trpc.scoring.examResponses.useQuery({ assessmentId });

  const taskResponses = (data?.submission?.taskResponses ?? {}) as Record<string, string>;
  const aiInteractions = (data?.submission?.aiInteractions ?? []) as AiMessage[];
  const taskStats = (data?.taskStats ?? {}) as Record<string, TaskStat>;
  const taskKeys = Object.keys(taskResponses);
  const completionMins = data?.submission?.completionTimeSeconds
    ? Math.round(data.submission.completionTimeSeconds / 60)
    : null;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 text-[#c9a84c] animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-[#0a0a0a] border border-red-900/30 rounded-xl text-red-400 text-sm">
        Failed to load exam responses. You may not have permission to view this assessment.
      </div>
    );
  }

  if (!data?.submission) {
    return (
      <div className="p-6 bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl text-center">
        <CheckCircle2 className="w-8 h-8 text-[#333] mx-auto mb-3" />
        <p className="text-[#666] text-sm">No submission found for this assessment.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Meta row */}
      <div className="flex flex-wrap gap-4 px-1">
        {data.campaign?.roleTemplate && (
          <div className="text-[10px] text-[#555] uppercase tracking-widest">
            Role: <span className="text-[#888]">{data.campaign.roleTemplate}</span>
          </div>
        )}
        {data.assessment?.submittedAt && (
          <div className="text-[10px] text-[#555] uppercase tracking-widest">
            Submitted: <span className="text-[#888]">{new Date(data.assessment.submittedAt).toLocaleDateString()}</span>
          </div>
        )}
        {data.submission.wordCount && (
          <div className="text-[10px] text-[#555] uppercase tracking-widest">
            Total words: <span className="text-[#888]">{data.submission.wordCount.toLocaleString()}</span>
          </div>
        )}
        {completionMins && (
          <div className="text-[10px] text-[#555] uppercase tracking-widest flex items-center gap-1">
            <Clock className="w-3 h-3" />
            <span className="text-[#888]">Total time: {completionMins}m</span>
          </div>
        )}
      </div>

      {/* Task responses with stats bars */}
      {taskKeys.length > 0 ? (
        <div className="space-y-4">
          <h4 className="text-[#555] text-[10px] uppercase tracking-widest px-1">
            Task Responses ({taskKeys.length})
          </h4>
          {taskKeys.map((key) => (
            <TaskResponseCard
              key={key}
              taskKey={key}
              response={taskResponses[key]}
              stat={taskStats[key]}
            />
          ))}
        </div>
      ) : (
        <div className="p-4 bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl text-[#444] text-xs text-center">
          No task responses recorded.
        </div>
      )}

      {/* AI interaction log */}
      <div>
        <h4 className="text-[#555] text-[10px] uppercase tracking-widest px-1 mb-3">
          AI Interactions ({aiInteractions.filter(m => m.role !== "system").length})
        </h4>
        <AiChatLog messages={aiInteractions} />
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface ExamResponseHistoryProps {
  assessmentId: number;
  candidateId?: number;
}

export function ExamResponseHistory({ assessmentId, candidateId }: ExamResponseHistoryProps) {
  const [open, setOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<number>(assessmentId);

  const { data: history, isLoading: historyLoading } = trpc.scoring.examHistory.useQuery(
    { candidateId },
    { enabled: open }
  );

  const hasHistory = history && history.length > 1;

  return (
    <div className="mt-6">
      {/* Toggle header */}
      <button
        className="w-full flex items-center justify-between p-5 bg-[#0a0a0a] border border-[#1a1a1a] rounded-xl hover:border-[#c9a84c]/20 transition-all"
        onClick={() => setOpen(!open)}
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#c9a84c]/10 flex items-center justify-center">
            <History className="w-4 h-4 text-[#c9a84c]" />
          </div>
          <div className="text-left">
            <div className="text-white font-bold text-sm uppercase tracking-widest">Exam Responses & History</div>
            <div className="text-[#555] text-xs mt-0.5">Full task answers, AI interaction log, and past exams</div>
          </div>
        </div>
        {open ? <ChevronUp className="w-5 h-5 text-[#555]" /> : <ChevronDown className="w-5 h-5 text-[#555]" />}
      </button>

      {open && (
        <div className="mt-3 space-y-4">
          {historyLoading && (
            <div className="flex items-center gap-2 text-[#555] text-xs px-1">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading exam history…
            </div>
          )}

          {/* Exam history switcher */}
          {hasHistory && (
            <div>
              <h4 className="text-[#555] text-[10px] uppercase tracking-widest px-1 mb-3">
                Exam History ({history.length} exams)
              </h4>
              <div className="grid gap-2">
                {history.map((item) => {
                  const isSelected = selectedId === item.assessment.id;
                  const overallScore = item.score?.overallScore;
                  const submittedAt = item.assessment.submittedAt
                    ? new Date(item.assessment.submittedAt).toLocaleDateString()
                    : "—";
                  return (
                    <button
                      key={item.assessment.id}
                      onClick={() => setSelectedId(item.assessment.id)}
                      className={`flex items-center justify-between p-3.5 rounded-xl border text-left transition-all ${
                        isSelected
                          ? "border-[#c9a84c]/40 bg-[#c9a84c]/5"
                          : "border-[#1a1a1a] bg-[#0a0a0a] hover:border-[#333]"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
                          isSelected ? "bg-[#c9a84c]/20" : "bg-[#1a1a1a]"
                        }`}>
                          <FileText className={`w-3 h-3 ${isSelected ? "text-[#c9a84c]" : "text-[#555]"}`} />
                        </div>
                        <div>
                          <div className={`text-xs font-bold uppercase tracking-wider ${
                            isSelected ? "text-[#c9a84c]" : "text-[#888]"
                          }`}>
                            {item.campaign.roleTemplate}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5">
                            <Calendar className="w-2.5 h-2.5 text-[#444]" />
                            <span className="text-[#555] text-[10px]">{submittedAt}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {item.assessment.id === assessmentId && (
                          <span className="text-[9px] text-[#555] uppercase tracking-widest bg-[#1a1a1a] px-2 py-0.5 rounded-full">
                            Current
                          </span>
                        )}
                        {overallScore != null && (
                          <div className="flex items-center gap-1">
                            <Trophy className="w-3 h-3 text-[#c9a84c]" />
                            <span className={`text-sm font-black ${isSelected ? "text-[#c9a84c]" : "text-[#666]"}`}>
                              {Math.round(overallScore)}
                            </span>
                          </div>
                        )}
                        {item.assessment.status === "submitted" && !item.score && (
                          <span className="text-[9px] text-[#888] uppercase tracking-widest bg-[#1a1a1a] px-2 py-0.5 rounded-full">
                            Pending Score
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {hasHistory && (
            <div className="border-t border-[#1a1a1a] pt-4">
              <h4 className="text-[#555] text-[10px] uppercase tracking-widest px-1 mb-3">
                Responses for Selected Exam
              </h4>
            </div>
          )}

          <ExamDetailPanel assessmentId={selectedId} />
        </div>
      )}
    </div>
  );
}