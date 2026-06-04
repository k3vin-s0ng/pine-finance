"use client";

import { useMemo, useState } from "react";
import { AlertCircle, CheckCircle, Loader2, RefreshCcw, Save, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription, AlertTitle } from "@/app/components/ui/alert";
import { Badge } from "@/app/components/ui/badge";
import { Button } from "@/app/components/ui/button";
import { Checkbox } from "@/app/components/ui/checkbox";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";
import { Textarea } from "@/app/components/ui/textarea";
import { trpc } from "@/app/lib/trpc";
import type {
  AssessmentDataPoint,
  AssessmentResponseType,
  ExpectedAnswerUnit,
  ExpectedExtractionRow,
  ExpectedNumericalAnswer,
  ExpectedReconciliationEntry,
  ExpectedTaskAnswers,
  GeneratedAssessment,
  GeneratedTask,
} from "@/app/lib/schema";

const ANSWER_UNITS: ExpectedAnswerUnit[] = ["$", "$M", "$B", "%", "x", "0/1"];

function cloneAnswerKey(answerKey: ExpectedTaskAnswers | undefined): ExpectedTaskAnswers | undefined {
  if (!answerKey) return undefined;
  return {
    ...(answerKey.numerical
      ? { numerical: Object.fromEntries(Object.entries(answerKey.numerical).map(([key, value]) => [key, { ...value }])) }
      : {}),
    ...(answerKey.extractionRows ? { extractionRows: answerKey.extractionRows.map((row) => ({ ...row })) } : {}),
    ...(answerKey.reconciliationEntries ? { reconciliationEntries: answerKey.reconciliationEntries.map((entry) => ({ ...entry })) } : {}),
  };
}

function cloneGeneratedAssessment(assessment: GeneratedAssessment): GeneratedAssessment {
  return {
    ...assessment,
    generationDiagnostics: assessment.generationDiagnostics ? { ...assessment.generationDiagnostics } : undefined,
    tasks: assessment.tasks.map((task) => ({
      ...task,
      aiSuggestions: [...task.aiSuggestions],
      dataPoints: task.dataPoints?.map((point) => ({ ...point })) ?? [],
      answerKey: cloneAnswerKey(task.answerKey),
    })),
  };
}

function formatResponseType(responseType: AssessmentResponseType) {
  return responseType.replace(/_/g, " ");
}

function parseNumberInput(value: string) {
  if (value.trim() === "") return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function isAnswerKeyEmpty(answerKey: ExpectedTaskAnswers | undefined) {
  return (
    !answerKey ||
    (
      Object.keys(answerKey.numerical ?? {}).length === 0 &&
      (answerKey.extractionRows?.length ?? 0) === 0 &&
      (answerKey.reconciliationEntries?.length ?? 0) === 0
    )
  );
}

function textInputClassName() {
  return "bg-[#eef7ef] border-[#9db8a4] text-slate-950 placeholder:text-[#6f8274]";
}

function fieldLabelClassName() {
  return "text-[#2e4637] text-[10px] font-bold tracking-widest uppercase";
}

function SourceQuoteTextarea({
  value,
  onChange,
}: {
  value: string | undefined;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-1">
      <Label className={fieldLabelClassName()}>Source Quote</Label>
      <Textarea
        rows={2}
        value={value ?? ""}
        onChange={(event) => onChange(event.target.value)}
        className={`${textInputClassName()} min-h-16 resize-y text-xs leading-relaxed`}
      />
    </div>
  );
}

function UnitSelect({
  value,
  onChange,
}: {
  value: ExpectedAnswerUnit;
  onChange: (value: ExpectedAnswerUnit) => void;
}) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value as ExpectedAnswerUnit)}
      className="h-9 rounded-md border border-[#9db8a4] bg-[#eef7ef] px-2 text-xs font-semibold text-slate-950 outline-none focus-visible:border-[#168a4a] focus-visible:ring-2 focus-visible:ring-[#168a4a]/20"
    >
      {ANSWER_UNITS.map((unit) => (
        <option key={unit} value={unit}>{unit}</option>
      ))}
    </select>
  );
}

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number | undefined;
  onChange: (value: number | undefined) => void;
}) {
  return (
    <div className="space-y-1">
      <Label className={fieldLabelClassName()}>{label}</Label>
      <Input
        type="number"
        value={value ?? ""}
        onChange={(event) => onChange(parseNumberInput(event.target.value))}
        className={textInputClassName()}
      />
    </div>
  );
}

type AnswerKeySectionProps = {
  task: GeneratedTask;
  taskIndex: number;
  updateTask: (taskIndex: number, updater: (task: GeneratedTask) => GeneratedTask) => void;
};

function updateTaskAnswerKey(
  task: GeneratedTask,
  updater: (answerKey: ExpectedTaskAnswers) => ExpectedTaskAnswers,
) {
  const current = cloneAnswerKey(task.answerKey) ?? {};
  const answerKey = updater(current);
  return {
    ...task,
    answerKey: isAnswerKeyEmpty(answerKey) ? undefined : answerKey,
  };
}

function AnswerKeySection({ task, taskIndex, updateTask }: AnswerKeySectionProps) {
  const numericalEntries = Object.entries(task.answerKey?.numerical ?? {});
  const extractionRows = task.answerKey?.extractionRows ?? [];
  const reconciliationEntries = task.answerKey?.reconciliationEntries ?? [];

  const updateNumericalEntry = (
    key: string,
    nextKey: string,
    patch: Partial<ExpectedNumericalAnswer>,
  ) => {
    updateTask(taskIndex, (currentTask) =>
      updateTaskAnswerKey(currentTask, (answerKey) => {
        const numerical = { ...(answerKey.numerical ?? {}) };
        const current = numerical[key] ?? { value: 0, unit: "$M" as const };
        delete numerical[key];
        numerical[nextKey || key] = { ...current, ...patch };
        return { ...answerKey, numerical };
      }),
    );
  };

  const updateExtractionRow = (rowIndex: number, patch: Partial<ExpectedExtractionRow>) => {
    updateTask(taskIndex, (currentTask) =>
      updateTaskAnswerKey(currentTask, (answerKey) => {
        const rows = [...(answerKey.extractionRows ?? [])];
        rows[rowIndex] = { ...rows[rowIndex], ...patch };
        return { ...answerKey, extractionRows: rows };
      }),
    );
  };

  const updateReconciliationEntry = (entryIndex: number, patch: Partial<ExpectedReconciliationEntry>) => {
    updateTask(taskIndex, (currentTask) =>
      updateTaskAnswerKey(currentTask, (answerKey) => {
        const entries = [...(answerKey.reconciliationEntries ?? [])];
        entries[entryIndex] = { ...entries[entryIndex], ...patch };
        return { ...answerKey, reconciliationEntries: entries };
      }),
    );
  };

  const removeExtractionRow = (rowIndex: number) => {
    updateTask(taskIndex, (currentTask) =>
      updateTaskAnswerKey(currentTask, (answerKey) => ({
        ...answerKey,
        extractionRows: (answerKey.extractionRows ?? []).filter((_, index) => index !== rowIndex),
      })),
    );
  };

  const removeReconciliationEntry = (entryIndex: number) => {
    updateTask(taskIndex, (currentTask) =>
      updateTaskAnswerKey(currentTask, (answerKey) => ({
        ...answerKey,
        reconciliationEntries: (answerKey.reconciliationEntries ?? []).filter((_, index) => index !== entryIndex),
      })),
    );
  };

  const removeNumericalEntry = (key: string) => {
    updateTask(taskIndex, (currentTask) =>
      updateTaskAnswerKey(currentTask, (answerKey) => {
        const numerical = { ...(answerKey.numerical ?? {}) };
        delete numerical[key];
        return { ...answerKey, numerical };
      }),
    );
  };

  if (isAnswerKeyEmpty(task.answerKey)) {
    return (
      <div className="rounded-lg border border-dashed border-[#cfe0d2] bg-[#f8fbf8] p-4 text-xs text-[#6f8274]">
        No deterministic answer keys were generated for this task.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {numericalEntries.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-xs font-black uppercase tracking-widest text-[#2e4637]">Numeric Checks</h4>
          {numericalEntries.map(([key, entry], entryIndex) => (
            <div key={`numerical-${entryIndex}`} className="rounded-lg border border-[#d9e7db] bg-white p-3">
              <div className="grid gap-3 md:grid-cols-[1.4fr_0.9fr_0.7fr_0.9fr_auto]">
                <div className="space-y-1">
                  <Label className={fieldLabelClassName()}>Metric Label</Label>
                  <Input
                    value={key}
                    onChange={(event) => updateNumericalEntry(key, event.target.value, {})}
                    className={textInputClassName()}
                  />
                </div>
                <NumberField
                  label="Expected"
                  value={entry.value}
                  onChange={(value) => updateNumericalEntry(key, key, { value: value ?? 0 })}
                />
                <div className="space-y-1">
                  <Label className={fieldLabelClassName()}>Unit</Label>
                  <UnitSelect value={entry.unit} onChange={(value) => updateNumericalEntry(key, key, { unit: value })} />
                </div>
                <NumberField
                  label="Tolerance"
                  value={entry.tolerancePct}
                  onChange={(value) => updateNumericalEntry(key, key, { tolerancePct: value })}
                />
                <Button
                  type="button"
                  variant="ghost"
                  className="mt-5 h-9 w-9 p-0 text-[#6f8274] hover:text-red-500"
                  onClick={() => removeNumericalEntry(key)}
                  aria-label={`Remove ${key}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <div className="mt-3">
                <SourceQuoteTextarea value={entry.sourceQuote} onChange={(value) => updateNumericalEntry(key, key, { sourceQuote: value })} />
              </div>
            </div>
          ))}
        </div>
      )}

      {extractionRows.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-xs font-black uppercase tracking-widest text-[#2e4637]">Extraction Rows</h4>
          {extractionRows.map((row, rowIndex) => (
            <div key={`${row.metricLabel}-${rowIndex}`} className="rounded-lg border border-[#d9e7db] bg-white p-3">
              <div className="grid gap-3 md:grid-cols-[1.4fr_0.9fr_0.7fr_0.9fr_auto]">
                <div className="space-y-1">
                  <Label className={fieldLabelClassName()}>Metric Label</Label>
                  <Input
                    value={row.metricLabel}
                    onChange={(event) => updateExtractionRow(rowIndex, { metricLabel: event.target.value })}
                    className={textInputClassName()}
                  />
                </div>
                <NumberField
                  label="Expected"
                  value={row.expectedValue}
                  onChange={(value) => updateExtractionRow(rowIndex, { expectedValue: value ?? 0 })}
                />
                <div className="space-y-1">
                  <Label className={fieldLabelClassName()}>Unit</Label>
                  <UnitSelect value={row.unit} onChange={(value) => updateExtractionRow(rowIndex, { unit: value })} />
                </div>
                <NumberField
                  label="Tolerance"
                  value={row.tolerancePct}
                  onChange={(value) => updateExtractionRow(rowIndex, { tolerancePct: value })}
                />
                <Button
                  type="button"
                  variant="ghost"
                  className="mt-5 h-9 w-9 p-0 text-[#6f8274] hover:text-red-500"
                  onClick={() => removeExtractionRow(rowIndex)}
                  aria-label={`Remove ${row.metricLabel}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <div className="mt-3">
                <SourceQuoteTextarea value={row.sourceQuote} onChange={(value) => updateExtractionRow(rowIndex, { sourceQuote: value })} />
              </div>
            </div>
          ))}
        </div>
      )}

      {reconciliationEntries.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-xs font-black uppercase tracking-widest text-[#2e4637]">Reconciliation Entries</h4>
          {reconciliationEntries.map((entry, entryIndex) => (
            <div key={`${entry.accountLabel}-${entryIndex}`} className="rounded-lg border border-[#d9e7db] bg-white p-3">
              <div className="grid gap-3 md:grid-cols-[1.4fr_0.9fr_0.7fr_0.9fr_auto]">
                <div className="space-y-1">
                  <Label className={fieldLabelClassName()}>Account / Metric</Label>
                  <Input
                    value={entry.accountLabel}
                    onChange={(event) => updateReconciliationEntry(entryIndex, { accountLabel: event.target.value })}
                    className={textInputClassName()}
                  />
                </div>
                <NumberField
                  label="Corrected"
                  value={entry.expectedCorrected}
                  onChange={(value) => updateReconciliationEntry(entryIndex, { expectedCorrected: value ?? 0 })}
                />
                <div className="space-y-1">
                  <Label className={fieldLabelClassName()}>Unit</Label>
                  <UnitSelect value={entry.unit} onChange={(value) => updateReconciliationEntry(entryIndex, { unit: value })} />
                </div>
                <NumberField
                  label="Tolerance"
                  value={entry.tolerancePct}
                  onChange={(value) => updateReconciliationEntry(entryIndex, { tolerancePct: value })}
                />
                <Button
                  type="button"
                  variant="ghost"
                  className="mt-5 h-9 w-9 p-0 text-[#6f8274] hover:text-red-500"
                  onClick={() => removeReconciliationEntry(entryIndex)}
                  aria-label={`Remove ${entry.accountLabel}`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <div className="mt-3">
                <SourceQuoteTextarea value={entry.sourceQuote} onChange={(value) => updateReconciliationEntry(entryIndex, { sourceQuote: value })} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TaskReviewCard({
  task,
  taskIndex,
  updateTask,
}: {
  task: GeneratedTask;
  taskIndex: number;
  updateTask: (taskIndex: number, updater: (task: GeneratedTask) => GeneratedTask) => void;
}) {
  const updateDataPoint = (pointIndex: number, patch: Partial<AssessmentDataPoint>) => {
    updateTask(taskIndex, (currentTask) => {
      const dataPoints = [...(currentTask.dataPoints ?? [])];
      dataPoints[pointIndex] = { ...dataPoints[pointIndex], ...patch };
      return { ...currentTask, dataPoints };
    });
  };

  return (
    <div className="rounded-xl border border-[#d9e7db] bg-[#fff] p-5">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Badge className="bg-[#168a4a]/10 text-[#168a4a] border-[#168a4a]/20 text-[10px] font-bold tracking-widest uppercase">
            {formatResponseType(task.responseType)}
          </Badge>
          <span className="text-xs font-bold uppercase tracking-widest text-[#6f8274]">{task.id}</span>
        </div>
        <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-[#cfe0d2] bg-[#eef7ef] px-3 py-2 text-xs font-bold uppercase tracking-widest text-[#2e4637]">
          <Checkbox
            checked={task.answerKeyStatus === "verified"}
            onCheckedChange={(checked) =>
              updateTask(taskIndex, (currentTask) => ({
                ...currentTask,
                answerKeyStatus: checked ? "verified" : "unverified",
              }))
            }
          />
          Verified
        </label>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1">
          <Label className={fieldLabelClassName()}>Title</Label>
          <Input
            value={task.title}
            onChange={(event) => updateTask(taskIndex, (currentTask) => ({ ...currentTask, title: event.target.value }))}
            className={textInputClassName()}
          />
        </div>
        <div className="space-y-1">
          <Label className={fieldLabelClassName()}>Imperative</Label>
          <Input
            value={task.imperative}
            onChange={(event) => updateTask(taskIndex, (currentTask) => ({ ...currentTask, imperative: event.target.value }))}
            className={textInputClassName()}
          />
        </div>
      </div>

      <div className="mt-4 grid gap-4">
        {(["context", "deliverable", "prompt"] as const).map((field) => (
          <div key={field} className="space-y-1">
            <Label className={fieldLabelClassName()}>{field}</Label>
            <Textarea
              rows={field === "prompt" ? 4 : 3}
              value={task[field]}
              onChange={(event) => updateTask(taskIndex, (currentTask) => ({ ...currentTask, [field]: event.target.value }))}
              className={`${textInputClassName()} resize-y text-sm leading-relaxed`}
            />
          </div>
        ))}
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <div>
          <div className="mb-2 flex items-center justify-between">
            <Label className={fieldLabelClassName()}>AI Suggestions</Label>
            <Button
              type="button"
              variant="ghost"
              className="h-7 px-2 text-[10px] font-bold uppercase tracking-widest text-[#168a4a]"
              onClick={() => updateTask(taskIndex, (currentTask) => ({ ...currentTask, aiSuggestions: [...currentTask.aiSuggestions, ""] }))}
            >
              Add
            </Button>
          </div>
          <div className="space-y-2">
            {task.aiSuggestions.map((suggestion, suggestionIndex) => (
              <Input
                key={`suggestion-${suggestionIndex}`}
                value={suggestion}
                onChange={(event) =>
                  updateTask(taskIndex, (currentTask) => ({
                    ...currentTask,
                    aiSuggestions: currentTask.aiSuggestions.map((item, index) =>
                      index === suggestionIndex ? event.target.value : item,
                    ),
                  }))
                }
                className={textInputClassName()}
              />
            ))}
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between">
            <Label className={fieldLabelClassName()}>Data Points</Label>
            <Button
              type="button"
              variant="ghost"
              className="h-7 px-2 text-[10px] font-bold uppercase tracking-widest text-[#168a4a]"
              onClick={() =>
                updateTask(taskIndex, (currentTask) => ({
                  ...currentTask,
                  dataPoints: [...(currentTask.dataPoints ?? []), { label: "", value: "" }],
                }))
              }
            >
              Add
            </Button>
          </div>
          <div className="space-y-2">
            {(task.dataPoints ?? []).map((point, pointIndex) => (
              <div key={`point-${pointIndex}`} className="grid grid-cols-[1fr_1fr_76px] gap-2">
                <Input
                  value={point.label}
                  placeholder="Label"
                  onChange={(event) => updateDataPoint(pointIndex, { label: event.target.value })}
                  className={textInputClassName()}
                />
                <Input
                  value={point.value}
                  placeholder="Value"
                  onChange={(event) => updateDataPoint(pointIndex, { value: event.target.value })}
                  className={textInputClassName()}
                />
                <Input
                  type="number"
                  value={point.delta ?? ""}
                  placeholder="Δ"
                  onChange={(event) => updateDataPoint(pointIndex, { delta: parseNumberInput(event.target.value) })}
                  className={textInputClassName()}
                />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-5 border-t border-[#eef7ef] pt-5">
        <AnswerKeySection task={task} taskIndex={taskIndex} updateTask={updateTask} />
      </div>
    </div>
  );
}

export default function GeneratedAssessmentReviewPanel({
  campaignId,
  hasSourceMaterials,
}: {
  campaignId: number;
  hasSourceMaterials: boolean;
}) {
  const utils = trpc.useUtils();
  const { data, isLoading, error } = trpc.campaign.getGeneratedAssessment.useQuery(
    { campaignId },
    { enabled: hasSourceMaterials && campaignId > 0 },
  );
  const [localDraft, setLocalDraft] = useState<GeneratedAssessment | null>(null);
  const queriedDraft = useMemo(() => data ? cloneGeneratedAssessment(data) : null, [data]);
  const draft = localDraft ?? queriedDraft;

  const isReviewed = draft?.status === "reviewed";
  const verifiedCount = useMemo(
    () => draft?.tasks.filter((task) => task.answerKeyStatus === "verified").length ?? 0,
    [draft],
  );

  const generate = trpc.campaign.generateAssessment.useMutation({
    onSuccess: (generatedAssessment) => {
      setLocalDraft(cloneGeneratedAssessment(generatedAssessment));
      utils.campaign.getGeneratedAssessment.invalidate({ campaignId });
      utils.campaigns.get.invalidate({ id: campaignId });
      toast.success("Generated assessment ready for review");
    },
    onError: (mutationError) => toast.error(mutationError.message),
  });

  const save = trpc.campaign.updateGeneratedAssessment.useMutation({
    onSuccess: (generatedAssessment) => {
      setLocalDraft(cloneGeneratedAssessment(generatedAssessment));
      utils.campaign.getGeneratedAssessment.invalidate({ campaignId });
      utils.campaigns.get.invalidate({ id: campaignId });
      toast.success(generatedAssessment.status === "reviewed" ? "Assessment reviewed and saved" : "Assessment draft saved");
    },
    onError: (mutationError) => toast.error(mutationError.message),
  });

  const updateTask = (taskIndex: number, updater: (task: GeneratedTask) => GeneratedTask) => {
    setLocalDraft((current) => {
      const base = current ?? draft;
      if (!base) return current;
      return {
        ...base,
        status: base.status === "reviewed" ? "generated" : base.status,
        tasks: base.tasks.map((task, index) => (index === taskIndex ? updater(task) : task)),
      };
    });
  };

  const handleGenerate = () => {
    if (draft?.tasks.length) {
      const confirmed = window.confirm("Regenerating will replace the current generated assessment and discard unsaved edits. Continue?");
      if (!confirmed) return;
    }
    generate.mutate({ campaignId });
  };

  if (!hasSourceMaterials) return null;

  return (
    <div className="mb-8 rounded-xl border border-[#d9e7db] bg-white p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-bold uppercase tracking-widest text-slate-950">
            <Sparkles className="h-4 w-4 text-[#168a4a]" />
            Generated Assessment Review
          </h2>
          <p className="mt-1 text-xs text-[#6f8274]">
            Generate tasks from uploaded materials, edit prompts and grounded keys, then verify before candidates use them.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {draft && (
            <Badge className={`${isReviewed ? "bg-[#168a4a]/10 text-[#168a4a] border-[#168a4a]/20" : "bg-orange-500/10 text-orange-600 border-orange-500/20"} text-[10px] font-bold uppercase tracking-widest`}>
              {isReviewed ? "Reviewed" : `${verifiedCount}/${draft.tasks.length} verified`}
            </Badge>
          )}
          <Button
            type="button"
            variant="outline"
            onClick={handleGenerate}
            disabled={generate.isPending}
            className="border-[#9db8a4] text-[#3f5847] hover:text-slate-950 hover:border-[#6f8274] font-bold text-xs tracking-widest uppercase"
          >
            {generate.isPending ? (
              <>
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                Generating...
              </>
            ) : draft ? (
              <>
                <RefreshCcw className="mr-1.5 h-3.5 w-3.5" />
                Regenerate
              </>
            ) : (
              <>
                <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                Generate assessment from materials
              </>
            )}
          </Button>
          {draft && (
            <Button
              type="button"
              onClick={() => save.mutate({ campaignId, generatedAssessment: draft })}
              disabled={save.isPending || generate.isPending}
              className="bg-[#168a4a] hover:bg-[#11743d] text-white font-bold text-xs tracking-widest uppercase"
            >
              {save.isPending ? (
                <>
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-1.5 h-3.5 w-3.5" />
                  Save Review
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {isLoading && (
        <div className="rounded-lg border border-[#d9e7db] bg-[#eef7ef] p-6 text-center">
          <Loader2 className="mx-auto mb-3 h-5 w-5 animate-spin text-[#168a4a]" />
          <p className="text-sm text-[#3f5847]">Loading generated assessment...</p>
        </div>
      )}

      {error && (
        <Alert className="mb-4 border-red-500/30 bg-red-500/5 text-red-700">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Unable to load generated assessment</AlertTitle>
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
      )}

      {!isLoading && !draft && (
        <div className="rounded-lg border border-dashed border-[#b7d2bd] bg-[#f8fbf8] p-6">
          <p className="text-sm font-semibold text-[#2e4637]">No generated assessment yet.</p>
          <p className="mt-1 text-xs text-[#6f8274]">
            Use the generate button to create a recruiter-reviewed draft from the uploaded source materials.
          </p>
        </div>
      )}

      {draft && (
        <div className="space-y-5">
          {draft.generationDiagnostics && draft.generationDiagnostics.droppedUngroundedAnswerKeys > 0 && (
            <Alert className="border-orange-500/30 bg-orange-500/5 text-orange-700">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Grounding checks applied</AlertTitle>
              <AlertDescription>
                {draft.generationDiagnostics.droppedUngroundedAnswerKeys} ungrounded answer-key check{draft.generationDiagnostics.droppedUngroundedAnswerKeys === 1 ? "" : "s"} were dropped during generation.
              </AlertDescription>
            </Alert>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-lg border border-[#d9e7db] bg-[#eef7ef] p-4">
              <div className="text-[10px] font-bold uppercase tracking-widest text-[#6f8274]">Role Hint</div>
              <div className="mt-1 text-sm font-bold text-slate-950">{draft.roleTemplateHint}</div>
              <div className="mt-3 text-[10px] font-bold uppercase tracking-widest text-[#6f8274]">Model</div>
              <div className="mt-1 break-all text-xs text-[#3f5847]">{draft.generatedModel ?? "Unknown"}</div>
            </div>
            <div className="rounded-lg border border-[#d9e7db] bg-[#eef7ef] p-4">
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-[#6f8274]">
                <CheckCircle className="h-3.5 w-3.5 text-[#168a4a]" />
                Pine AI Boundary
              </div>
              <Textarea
                rows={3}
                value={draft.aiBoundary ?? ""}
                onChange={(event) => {
                  const aiBoundary = event.target.value;
                  setLocalDraft((current) => {
                    const base = current ?? draft;
                    return base ? { ...base, aiBoundary } : current;
                  });
                }}
                className={`${textInputClassName()} mt-2 resize-y text-xs leading-relaxed`}
              />
            </div>
          </div>

          {draft.tasks.map((task, taskIndex) => (
            <TaskReviewCard
              key={task.id}
              task={task}
              taskIndex={taskIndex}
              updateTask={updateTask}
            />
          ))}
        </div>
      )}
    </div>
  );
}
