"use client";

import { Calculator } from "lucide-react";
import type { Score } from "@/app/lib/schema";

type EvidenceRecord = Record<string, unknown>;

function asRecord(value: unknown): EvidenceRecord | null {
  return value != null && typeof value === "object" && !Array.isArray(value) ? value as EvidenceRecord : null;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function numberValue(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function formatValue(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number") return Number.isInteger(value) ? `${value}` : value.toFixed(2);
  if (typeof value === "boolean") return value ? "yes" : "no";
  if (value == null) return "none";
  return JSON.stringify(value);
}

function formatScore(value: unknown) {
  const score = numberValue(value);
  return score == null ? "none" : Number.isInteger(score) ? `${score}` : score.toFixed(1);
}

function titleize(value: string) {
  return value
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/_/g, " ")
    .replace(/\b\w/g, char => char.toUpperCase());
}

function EmptyEvidence({ label = "No evidence recorded." }: { label?: string }) {
  return (
    <div className="break-words rounded-lg border border-dashed border-[#d9e7db] bg-[#f8fbf8] p-3 text-sm text-[#6f8274]">
      {label}
    </div>
  );
}

function Metric({ label, value, detail }: { label: string; value: string | number; detail?: string }) {
  return (
    <div className="min-w-0 rounded-lg border border-[#d9e7db] bg-[#f8fbf8] p-3">
      <div className="flex min-w-0 flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <div className="min-w-0 break-words text-[10px] font-bold uppercase tracking-widest text-[#6f8274]">{label}</div>
        <div className="min-w-0 max-w-full break-words text-right text-base font-black leading-tight text-slate-950 [overflow-wrap:anywhere] sm:text-lg">{value}</div>
      </div>
      {detail ? <p className="mt-1 break-words text-xs leading-snug text-[#52665a] [overflow-wrap:anywhere]">{detail}</p> : null}
    </div>
  );
}

function KeyValueGrid({ record, omit = [] }: { record: EvidenceRecord | null; omit?: string[] }) {
  if (!record) return <EmptyEvidence />;
  const entries = Object.entries(record).filter(([key, value]) => !omit.includes(key) && value != null);
  if (entries.length === 0) return <EmptyEvidence />;

  return (
    <div className="grid min-w-0 gap-2 md:grid-cols-2 xl:grid-cols-3">
      {entries.map(([key, value]) => (
        <Metric key={key} label={titleize(key)} value={formatValue(value)} />
      ))}
    </div>
  );
}

function AccuracyChecks({ value }: { value: unknown }) {
  const evidence = asRecord(value);
  if (!evidence) return <EmptyEvidence />;

  const checks = asArray(evidence.checks).map(asRecord).filter((check): check is EvidenceRecord => check != null);
  return (
    <div className="space-y-3">
      <KeyValueGrid record={evidence} omit={["checks"]} />
      {checks.length > 0 ? (
        <div className="overflow-hidden rounded-lg border border-[#d9e7db]">
          <div className="grid grid-cols-[1fr_1fr_80px] gap-3 bg-[#eef7ef] px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-[#6f8274]">
            <div>Check</div>
            <div>Candidate Value</div>
            <div>Result</div>
          </div>
          <div className="divide-y divide-[#d9e7db]">
            {checks.slice(0, 8).map((check, index) => (
              <div key={`${formatValue(check.taskId)}-${formatValue(check.field)}-${index}`} className="grid min-w-0 grid-cols-[minmax(0,1fr)_minmax(0,1fr)_72px] gap-3 px-4 py-2 text-sm">
                <div className="min-w-0">
                  <div className="break-words font-semibold text-slate-950 [overflow-wrap:anywhere]">{formatValue(check.field)}</div>
                  <div className="break-words text-xs text-[#6f8274] [overflow-wrap:anywhere]">Expected {formatValue(check.expectedValue)} {formatValue(check.unit)}</div>
                </div>
                <div className="min-w-0 break-words text-[#2e4637] [overflow-wrap:anywhere]">{formatValue(check.candidateValue)}</div>
                <div className={check.matches === true ? "font-bold text-[#168a4a]" : "font-bold text-[#9a4d4d]"}>
                  {check.matches === true ? "Match" : "Review"}
                </div>
              </div>
            ))}
          </div>
          {checks.length > 8 ? (
            <div className="bg-[#f8fbf8] px-4 py-2 text-xs text-[#6f8274]">
              {checks.length - 8} additional checks not shown.
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

const SCORE_DIMENSIONS = [
  "overallScore",
  "accuracy",
  "efficiency",
  "judgment",
  "verification",
  "communication",
  "toolFluency",
] as const;

function IntegrityAdjustments({ value }: { value: unknown }) {
  const gate = asRecord(value);
  if (!gate) return null;

  const before = asRecord(gate.before);
  const after = asRecord(gate.after);
  const multipliers = asRecord(gate.multipliers);
  const caps = asRecord(gate.caps);

  if (!before || !after) return null;

  return (
    <div className="space-y-3 rounded-lg border border-[#d9e7db] bg-[#f8fbf8] p-3">
      <div className="grid min-w-0 gap-2 md:grid-cols-2">
        <Metric
          label="Overall multiplier"
          value={formatValue(multipliers?.overall)}
          detail="Final score multiplier applied after dimension gates."
        />
        <Metric
          label="Process caps"
          value={[
            `J ${formatScore(caps?.judgment)}`,
            `V ${formatScore(caps?.verification)}`,
            `T ${formatScore(caps?.toolFluency)}`,
          ].join(" / ")}
          detail="Judgment / verification / tool-fluency caps."
        />
      </div>

      <div className="overflow-hidden rounded-lg border border-[#d9e7db] bg-white">
        <div className="grid grid-cols-[1fr_80px_80px] gap-3 bg-[#eef7ef] px-4 py-2 text-[10px] font-bold uppercase tracking-widest text-[#6f8274]">
          <div>Dimension</div>
          <div>Before</div>
          <div>After</div>
        </div>
        <div className="divide-y divide-[#d9e7db]">
          {SCORE_DIMENSIONS.map(dimension => (
            <div key={dimension} className="grid min-w-0 grid-cols-[minmax(0,1fr)_80px_80px] gap-3 px-4 py-2 text-sm">
              <div className="min-w-0 break-words font-semibold text-slate-950">{titleize(dimension)}</div>
              <div className="tabular-nums text-[#52665a]">{formatScore(before[dimension])}</div>
              <div className="tabular-nums font-bold text-slate-950">{formatScore(after[dimension])}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function EvidencePanel({ score }: { score: Score }) {
  const scoreEvidence = score.scoreEvidence;

  return (
    <div className="space-y-4">
      <div className="mb-3 flex items-start gap-2.5">
        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#168a4a]/10">
          <Calculator className="h-3.5 w-3.5 text-[#168a4a]" />
        </div>
        <div>
          <h3 className="text-sm font-bold uppercase tracking-widest text-slate-950">Deterministic Checks</h3>
          <p className="mt-0.5 text-xs leading-snug text-[#52665a]">
            Auditable non-LLM checks and score gates persisted by the scoring pipeline.
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <div className="mb-2 text-xs font-bold uppercase tracking-widest text-[#6f8274]">Accuracy Checks</div>
          <AccuracyChecks value={scoreEvidence?.accuracyChecks} />
        </div>
        <div>
          <div className="mb-2 text-xs font-bold uppercase tracking-widest text-[#6f8274]">Efficiency Band</div>
          <KeyValueGrid record={asRecord(scoreEvidence?.efficiencyBand)} />
        </div>
        {asRecord(scoreEvidence?.integrityGate) ? (
          <div>
            <div className="mb-2 text-xs font-bold uppercase tracking-widest text-[#6f8274]">Integrity Adjustments</div>
            <IntegrityAdjustments value={scoreEvidence?.integrityGate} />
          </div>
        ) : null}
      </div>
    </div>
  );
}
