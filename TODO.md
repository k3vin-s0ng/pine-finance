# TODO

## Regression debt (re-port from Manus, adapt to this stack) — done

- [x] Port deterministic accuracy scoring (`app/server/scoring/deterministic.ts`, `numericalParser.ts`) and wire it into live grading via `buildBlendedScore` in `app/server/routers.ts`.
- [x] Port behavioral scoring (`app/server/scoring/behavioral.ts`) on top of real client telemetry: `citation_added` (with `source: "ai" | "source_material"`), `ai_response_complete`, `response_edit` (with `secsSinceAIResponse`), `paste`, `task_switch`, `material_view`, `ai_prompt_sent`. Events are persisted via `logBehavior` and read by `computeDeterministicScores`.
  - **Known limitation (do not implement without confirmation):** `expectedAnswers.ts` defines numerical keys for IB Analyst t2/t3 and PE Associate, but the `memo`/`thesis` composers have no keyed `NumericalAnswersBlock` fields (those were dropped in the original migration). Numerical accuracy for those tasks scores nothing until the composers are rebuilt in `app/components/ResponseComposers.tsx`. HF Research Analyst and Management Consultant intentionally have no keyed numerical answers — their tasks are qualitative.
- [x] Port score blending (`app/server/scoring/blend.ts`): communication stays 100% LLM, every other dimension blends LLM with deterministic. Null on either side falls back to the other.
- [x] Port expected-answer definitions (`app/server/scoring/expectedAnswers.ts`) for current role templates: IB Analyst (t1 extraction keys), PE Associate (t1 thesis keys), HF Research Analyst (empty), Management Consultant (empty).
- [x] Restore in-test Pine AI constraints in `chat.send`: no final deliverables, no filling numbers for candidates, concise guidance, role-aware boundaries (`getPineChatRoleBoundary`).
- [x] Inject uploaded source-material/PDF text into Pine AI chat context (`extractSourceMaterials` + `formatSourceMaterialsForPrompt`).
- [x] Rebuild `CandidateBehaviorTab` with aggregate behavioral telemetry, gated to recruiter/admin viewers.
- [x] Rebuild `PdfMaterialViewer` for in-assessment PDF rendering against current source-material storage.

## Scoring & defensibility — done

- [x] Replace single-path `generateScoreWithLLM` with a blended deterministic + behavioral + LLM pipeline.
- [x] Process-trace timeline in every score report (`ProcessTraceTimeline.tsx`) showing candidate edits, paste/type events, task changes, and AI interactions.
- [x] Evidence panel in every score report (`EvidencePanel.tsx`) separating behavioral signals, AI-interaction analysis, deterministic checks, and LLM judgment.
- [x] Persist structured scoring evidence (`ScoreEvidence` on `scores`) so reports can be regenerated or audited without reparsing prose rationales.

## Workspace realism

- [ ] Add a real spreadsheet component (Univer, Luckysheet, or Handsontable) for at least one task per role template.
- [ ] Preload spreadsheet tasks with intentional errors, missing rows, or broken formulas for candidates to fix.
- [ ] Persist spreadsheet cell/formula state with the candidate submission.
- [ ] Add a grader-visible scratchpad/notes panel that is saved but excluded from scored task responses.
- [ ] Generate campaign task questions from uploaded source material when materials exist.
- [ ] Generate Pine AI auto-prompt suggestions from uploaded source material when materials exist.

## AI behavior

- [ ] Add configurable AI difficulty per role template.
- [ ] Make AI difficulty affect chat prompt constraints, assistant capability, and allowed specificity.
- [ ] Surface the chosen AI difficulty in campaign configuration and report metadata.

## Operational gaps

- [ ] Block (or warn on) campaign deletion when assessments exist, instead of silently orphaning them.
- [ ] Surface "campaign was deleted" on `getReport` and submission-replay surfaces too, the same way `AssessmentInterface` and `chat.send` already do.
- [ ] Add a "Send test invite to myself" button on the recruiter campaign detail view to make end-to-end smoke checks easier.
- [ ] Decide what to do with any `roleTemplate: "FP&A Analyst"` rows that exist in non-dev DBs (migration script vs. legacy-template badge); the current UI silently downgrades them to IB Analyst tasks via the fallback path.

## Infra / hygiene

- [ ] Decide on test tooling for this Next.js/tRPC/MongoDB stack.
- [ ] Add focused tests for deterministic scoring, numerical parsing, score blending, and chat prompt/material injection.
- [ ] Add a verification checklist for migrations from the Manus reference repo so stack-specific adaptations are reviewed explicitly.
- [ ] Replace the duplicated cohort distribution / dimension benchmark for Management Consultant (currently a copy of HF Research Analyst) with role-calibrated numbers once we have real data.
