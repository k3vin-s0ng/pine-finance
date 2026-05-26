"use client";

import React, { useState } from "react";
import { Textarea } from "@/app/components/ui/textarea";
import { Button } from "@/app/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/ui/select";
import { X, Plus } from "lucide-react";

// ─── Shared Types ─────────────────────────────────────────────────────────────

export type ComposerProps = {
  value: any;
  onChange: (value: any) => void;
  onPaste?: (e: React.ClipboardEvent<any>) => void;
};

// ─── Shared Helpers ───────────────────────────────────────────────────────────

function wordCount(text?: string | null) {
  const trimmed = (text ?? "").trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}

const LABEL = "text-[#6f8274] text-[10px] font-bold tracking-widest uppercase mb-1 select-none";
const SECTION_BASE =
  "rounded border border-[#d9e7db] bg-[#fff] transition-all duration-150";
const ACTIVE_BORDER = "border-l-2 border-l-[#168a4a]";
const INACTIVE_BORDER = "border-l-2 border-l-transparent";

interface SectionProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  onPaste?: (e: React.ClipboardEvent<any>) => void;
  active: boolean;
  onActivate: () => void;
  placeholder?: string;
  minRows?: number;
  maxRows?: number;
}

function Section({
  label,
  value,
  onChange,
  onPaste,
  active,
  onActivate,
  placeholder,
  minRows = 4,
}: SectionProps) {
  const wc = wordCount(value ?? "");
  return (
    <div
      className={`${SECTION_BASE} ${active ? ACTIVE_BORDER : INACTIVE_BORDER}`}
      onClick={onActivate}
    >
      <div className="flex items-center justify-between px-3 pt-2.5 pb-1">
        <span className={LABEL}>{label}</span>
        {wc > 0 && (
          <span className="text-[10px] text-[#8fa095] tabular-nums">{wc} words</span>
        )}
      </div>
      {active ? (
        <Textarea
          autoFocus
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onPaste={onPaste}
          placeholder={placeholder ?? `Write your ${label.toLowerCase()} here…`}
          className="border-0 bg-transparent text-[13px] text-slate-900 resize-none focus-visible:ring-0 focus-visible:ring-offset-0 px-3 pb-3"
          style={{ minHeight: `${minRows * 22}px` }}
        />
      ) : (
        <p className="px-3 pb-2.5 text-[12px] text-[#8fa095] truncate">
          {(value ?? "").trim() ? (value ?? "").trim().slice(0, 80) + ((value ?? "").trim().length > 80 ? "…" : "") : (
            <span className="italic">{placeholder ?? `Write your ${label.toLowerCase()} here…`}</span>
          )}
        </p>
      )}
    </div>
  );
}

// ─── 1. MemoComposer ──────────────────────────────────────────────────────────

export type MemoValue = { keyFindings: string; numericalAnalysis: string; conclusion: string };

export function MemoComposer({ value, onChange, onPaste }: ComposerProps) {
  const v: MemoValue = value ?? { keyFindings: "", numericalAnalysis: "", conclusion: "" };
  const [active, setActive] = useState<keyof MemoValue>("keyFindings");

  const set = (k: keyof MemoValue) => (text: string) => onChange({ ...v, [k]: text });

  return (
    <div className="flex flex-col gap-2">
      <Section label="Key Findings" value={v.keyFindings} onChange={set("keyFindings")} onPaste={onPaste}
        active={active === "keyFindings"} onActivate={() => setActive("keyFindings")}
        placeholder="State your 2–3 most important findings from the source materials. Lead with the most significant insight." />
      <Section label="Numerical Analysis" value={v.numericalAnalysis} onChange={set("numericalAnalysis")} onPaste={onPaste}
        active={active === "numericalAnalysis"} onActivate={() => setActive("numericalAnalysis")}
        placeholder="Show your calculations and data-driven reasoning. Reference specific figures." />
      <Section label="Conclusion" value={v.conclusion} onChange={set("conclusion")} onPaste={onPaste}
        active={active === "conclusion"} onActivate={() => setActive("conclusion")}
        placeholder="Synthesize your findings into a clear, actionable conclusion. What is your recommendation?" />
    </div>
  );
}

// ─── 2. VarianceComposer ──────────────────────────────────────────────────────

export type VarianceValue = { driver: string; quantification: string; recommendation: string };

export function VarianceComposer({ value, onChange, onPaste }: ComposerProps) {
  const v: VarianceValue = value ?? { driver: "", quantification: "", recommendation: "" };
  const [active, setActive] = useState<keyof VarianceValue>("driver");

  const set = (k: keyof VarianceValue) => (text: string) => onChange({ ...v, [k]: text });

  return (
    <div className="flex flex-col gap-2">
      <Section label="Driver Identification" value={v.driver} onChange={set("driver")} onPaste={onPaste}
        active={active === "driver"} onActivate={() => setActive("driver")}
        placeholder="Identify the primary drivers of the variance. What caused the deviation from plan?" />
      <Section label="Quantification" value={v.quantification} onChange={set("quantification")} onPaste={onPaste}
        active={active === "quantification"} onActivate={() => setActive("quantification")}
        placeholder="Quantify each driver in dollar and percentage terms. Show the math." />
      <Section label="Recommendation" value={v.recommendation} onChange={set("recommendation")} onPaste={onPaste}
        active={active === "recommendation"} onActivate={() => setActive("recommendation")}
        placeholder="What action should management take? Is this variance structural or one-time?" />
    </div>
  );
}

// ─── 3. ThesisComposer ────────────────────────────────────────────────────────

export type ThesisValue = { thesis: string; evidence: string; counterargument: string; recommendation: string };

export function ThesisComposer({ value, onChange, onPaste }: ComposerProps) {
  const v: ThesisValue = value ?? { thesis: "", evidence: "", counterargument: "", recommendation: "" };
  const [active, setActive] = useState<keyof ThesisValue>("thesis");

  const set = (k: keyof ThesisValue) => (text: string) => onChange({ ...v, [k]: text });

  return (
    <div className="flex flex-col gap-2">
      <Section label="Thesis Statement" value={v.thesis} onChange={set("thesis")} onPaste={onPaste}
        active={active === "thesis"} onActivate={() => setActive("thesis")}
        placeholder="State your investment thesis in one clear sentence. Long or short — take a position."
        minRows={2} />
      <Section label="Supporting Evidence" value={v.evidence} onChange={set("evidence")} onPaste={onPaste}
        active={active === "evidence"} onActivate={() => setActive("evidence")}
        placeholder="Provide 3 specific catalysts with expected timing and magnitude. Reference figures." />
      <Section label="Counterargument" value={v.counterargument} onChange={set("counterargument")} onPaste={onPaste}
        active={active === "counterargument"} onActivate={() => setActive("counterargument")}
        placeholder="Challenge your own thesis. What would make you wrong? The strongest investors steelman the bear case." />
      <Section label="Recommendation" value={v.recommendation} onChange={set("recommendation")} onPaste={onPaste}
        active={active === "recommendation"} onActivate={() => setActive("recommendation")}
        placeholder="State your 12-month price target, implied return, and position sizing rationale." />
    </div>
  );
}

// ─── 4. ExtractionComposer ────────────────────────────────────────────────────

export type ExtractionRow = { metric: string; value: string; source: string };
export type ExtractionValue = { rows: ExtractionRow[] };

const EMPTY_ROW = (): ExtractionRow => ({ metric: "", value: "", source: "" });
const DEFAULT_EXTRACTION: ExtractionValue = {
  rows: [EMPTY_ROW(), EMPTY_ROW(), EMPTY_ROW(), EMPTY_ROW(), EMPTY_ROW()],
};

export function ExtractionComposer({ value, onChange, onPaste }: ComposerProps) {
  const v: ExtractionValue = value ?? DEFAULT_EXTRACTION;
  const rows = Array.isArray(v.rows) ? v.rows : DEFAULT_EXTRACTION.rows;

  const updateRow = (i: number, field: keyof ExtractionRow, text: string) => {
    const nextRows = rows.map((r, idx) =>
      idx === i ? { ...r, [field]: text } : r
    );

    onChange({ ...v, rows: nextRows });
  };

  const addRow = () => {
    onChange({ ...v, rows: [...rows, EMPTY_ROW()] });
  };

  const deleteRow = (i: number) => {
    if (rows.length <= 1) return;

    onChange({
      ...v,
      rows: rows.filter((_, idx) => idx !== i),
    });
  };

  return (
    <div className={`${SECTION_BASE} border-l-2 border-l-[#168a4a]`}>
      <div className="flex items-center gap-1 px-3 pt-2.5 pb-1 border-b border-[#d9e7db]">
        <span className={`${LABEL} flex-[35]`}>Metric</span>
        <span className={`${LABEL} flex-[30]`}>Value</span>
        <span className={`${LABEL} flex-[30]`}>Source Citation</span>
        <span className="w-5" />
      </div>

      {rows.map((row, i) => (
        <div
          key={i}
          className="flex items-center gap-1 px-3 py-1 border-b border-[#eef7ef] last:border-0"
        >
          <input
            className="flex-[35] bg-transparent text-[12px] text-slate-800 placeholder:text-[#9db8a4] outline-none border-b border-transparent focus:border-[#168a4a]/40 transition-colors py-0.5"
            placeholder="e.g. Net Revenue"
            value={row.metric}
            onChange={(e) => updateRow(i, "metric", e.target.value)}
            onPaste={onPaste as any}
          />
          <input
            className="flex-[30] bg-transparent text-[12px] text-slate-800 placeholder:text-[#9db8a4] outline-none border-b border-transparent focus:border-[#168a4a]/40 transition-colors py-0.5 font-mono tabular-nums"
            placeholder="$4,759M"
            value={row.value}
            onChange={(e) => updateRow(i, "value", e.target.value)}
            onPaste={onPaste as any}
          />
          <input
            className="flex-[30] bg-transparent text-[12px] text-slate-800 placeholder:text-[#9db8a4] outline-none border-b border-transparent focus:border-[#168a4a]/40 transition-colors py-0.5"
            placeholder="e.g. 10-K Item 7"
            value={row.source}
            onChange={(e) => updateRow(i, "source", e.target.value)}
            onPaste={onPaste as any}
          />
          <button
            onClick={() => deleteRow(i)}
            className="w-5 h-5 flex items-center justify-center text-[#9db8a4] hover:text-[#168a4a]/60 transition-colors flex-shrink-0"
          >
            <X size={11} />
          </button>
        </div>
      ))}

      <div className="px-3 py-2">
        <button
          onClick={addRow}
          className="flex items-center gap-1.5 text-[11px] text-[#8fa095] hover:text-[#168a4a]/70 transition-colors"
        >
          <Plus size={11} />
          Add Row
        </button>
      </div>
    </div>
  );
}

// ─── 5. ReconciliationComposer ────────────────────────────────────────────────

export type ReconciliationEntry = { account: string; stated: string; corrected: string; reason: string };
export type ReconciliationValue = { entries: ReconciliationEntry[]; summary: string };

const DEFAULT_ENTRIES: ReconciliationEntry[] = [
  { account: "Cash & equivalents", stated: "$8,200M", corrected: "", reason: "" },
  { account: "Trading securities", stated: "$14,350M", corrected: "", reason: "" },
  { account: "Net loans & leases", stated: "$198,400M", corrected: "", reason: "" },
  { account: "Goodwill & intangibles", stated: "$3,120M", corrected: "", reason: "" },
];

export function ReconciliationComposer({ value, onChange, onPaste }: ComposerProps) {
  const v: ReconciliationValue = value ?? { entries: DEFAULT_ENTRIES, summary: "" };
  const [activeSection, setActiveSection] = useState<"table" | "summary">("table");

  const updateEntry = (i: number, field: keyof ReconciliationEntry, text: string) => {
    const entries = v.entries.map((e, idx) => (idx === i ? { ...e, [field]: text } : e));
    onChange({ ...v, entries });
  };

  return (
    <div className="flex flex-col gap-2">
      {/* Table editor */}
      <div
        className={`${SECTION_BASE} ${activeSection === "table" ? ACTIVE_BORDER : INACTIVE_BORDER}`}
        onClick={() => setActiveSection("table")}
      >
        <div className="flex items-center gap-1 px-3 pt-2.5 pb-1 border-b border-[#d9e7db]">
          <span className={`${LABEL} flex-[28]`}>Account</span>
          <span className={`${LABEL} flex-[22]`}>Stated Balance</span>
          <span className={`${LABEL} flex-[22]`}>Corrected Balance</span>
          <span className={`${LABEL} flex-[28]`}>Adjustment Reason</span>
        </div>
        {(v.entries ?? []).map((entry, i) => (
          <div key={i} className="flex items-center gap-1 px-3 py-1.5 border-b border-[#eef7ef] last:border-0">
            <span className="flex-[28] text-[12px] text-[#52665a] truncate pr-1">{entry.account}</span>
            <span className="flex-[22] text-[12px] text-[#6f8274] font-mono tabular-nums">{entry.stated}</span>
            <input
              className="flex-[22] bg-transparent text-[12px] text-slate-800 placeholder:text-[#9db8a4] outline-none border-b border-transparent focus:border-[#168a4a]/40 transition-colors py-0.5 font-mono tabular-nums"
              placeholder="Enter corrected…"
              value={entry.corrected}
              onChange={(e) => updateEntry(i, "corrected", e.target.value)}
              onPaste={onPaste as any}
            />
            <input
              className="flex-[28] bg-transparent text-[12px] text-slate-800 placeholder:text-[#9db8a4] outline-none border-b border-transparent focus:border-[#168a4a]/40 transition-colors py-0.5"
              placeholder="Reason for adjustment…"
              value={entry.reason}
              onChange={(e) => updateEntry(i, "reason", e.target.value)}
              onPaste={onPaste as any}
            />
          </div>
        ))}
      </div>

      {/* Summary textarea */}
      <Section
        label="Reconciliation Summary"
        value={v.summary}
        onChange={(text) => onChange({ ...v, summary: text })}
        onPaste={onPaste}
        active={activeSection === "summary"}
        onActivate={() => setActiveSection("summary")}
        placeholder="Explain the overall reconciliation: what discrepancies did you find, what caused them, and what is the corrected net position?"
      />
    </div>
  );
}

// ─── 6. FlagsComposer ────────────────────────────────────────────────────────

export type FlagEntry = { location: string; issue: string; severity: string; recommendation: string };
export type FlagsValue = { flags: FlagEntry[] };

const EMPTY_FLAG = (): FlagEntry => ({ location: "", issue: "", severity: "", recommendation: "" });

const SEVERITY_COLORS: Record<string, string> = {
  Critical: "text-[#168a4a]",
  High: "text-[#168a4a]/70",
  Medium: "text-[#168a4a]/50",
  Low: "text-[#168a4a]/30",
};

export function FlagsComposer({ value, onChange, onPaste }: ComposerProps) {
  const v: FlagsValue = value ?? { flags: [EMPTY_FLAG()] };
  const flags = Array.isArray(v.flags) ? v.flags : [EMPTY_FLAG()];

  const updateFlag = (i: number, field: keyof FlagEntry, text: string) => {
    const nextFlags = flags.map((f, idx) =>
      idx === i ? { ...f, [field]: text } : f
    );

    onChange({ ...v, flags: nextFlags });
  };

  const addFlag = () => {
    onChange({ ...v, flags: [...flags, EMPTY_FLAG()] });
  };

  const deleteFlag = (i: number) => {
    if (flags.length <= 1) return;

    onChange({
      ...v,
      flags: flags.filter((_, idx) => idx !== i),
    });
  };

  return (
    <div className="flex flex-col gap-2">
      {flags.map((flag, i) => (
        <div
          key={i}
          className={`${SECTION_BASE} border-l-2 border-l-[#168a4a]/40 relative`}
        >
          {flags.length > 1 && (
            <button
              onClick={() => deleteFlag(i)}
              className="absolute top-2 right-2 w-5 h-5 flex items-center justify-center text-[#9db8a4] hover:text-[#168a4a]/60 transition-colors z-10"
            >
              <X size={11} />
            </button>
          )}

          <div className="px-3 pt-2.5 pb-1">
            <span className={`${LABEL} text-[#168a4a]/60`}>Flag {i + 1}</span>
          </div>

          <div className="flex items-center gap-3 px-3 pb-2">
            <div className="flex-1">
              <p className={`${LABEL} mb-1`}>Location</p>
              <input
                className="w-full bg-transparent text-[12px] text-slate-800 placeholder:text-[#9db8a4] outline-none border-b border-[#d9e7db] focus:border-[#168a4a]/40 transition-colors py-0.5"
                placeholder="e.g. Item 7, Page 12"
                value={flag.location}
                onChange={(e) => updateFlag(i, "location", e.target.value)}
                onPaste={onPaste as any}
              />
            </div>

            <div className="w-36">
              <p className={`${LABEL} mb-1`}>Severity</p>
              <Select
                value={flag.severity}
                onValueChange={(value) => updateFlag(i, "severity", value)}
              >
                <SelectTrigger
                  className={`h-7 text-[12px] bg-transparent border-[#d9e7db] ${
                    flag.severity
                      ? SEVERITY_COLORS[flag.severity] ?? ""
                      : "text-[#9db8a4]"
                  }`}
                >
                  <SelectValue placeholder="Select…" />
                </SelectTrigger>
                <SelectContent className="bg-[#fff] border-[#d9e7db]">
                  {["Critical", "High", "Medium", "Low"].map((s) => (
                    <SelectItem
                      key={s}
                      value={s}
                      className={`text-[12px] ${SEVERITY_COLORS[s]}`}
                    >
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="px-3 pb-2">
            <p className={`${LABEL} mb-1`}>Issue</p>
            <Textarea
              value={flag.issue}
              onChange={(e) => updateFlag(i, "issue", e.target.value)}
              onPaste={onPaste}
              placeholder="Describe the specific issue, discrepancy, or risk you identified. Be precise."
              className="border border-[#d9e7db] bg-[#f8fbf8] text-[12px] text-slate-800 resize-none focus-visible:ring-0 focus-visible:ring-offset-0"
              rows={3}
            />
          </div>

          <div className="px-3 pb-3">
            <p className={`${LABEL} mb-1`}>Recommendation</p>
            <Textarea
              value={flag.recommendation}
              onChange={(e) => updateFlag(i, "recommendation", e.target.value)}
              onPaste={onPaste}
              placeholder="How should this flag be addressed or mitigated?"
              className="border border-[#d9e7db] bg-[#f8fbf8] text-[12px] text-slate-800 resize-none focus-visible:ring-0 focus-visible:ring-offset-0"
              rows={2}
            />
          </div>
        </div>
      ))}

      <button
        onClick={addFlag}
        className="flex items-center gap-1.5 text-[11px] text-[#8fa095] hover:text-[#168a4a]/70 transition-colors px-1 py-1"
      >
        <Plus size={11} />
        Add Flag
      </button>
    </div>
  );
}