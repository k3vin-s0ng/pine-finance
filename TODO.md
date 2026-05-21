# TODO

## Regression debt (re-port from Manus, adapt to this stack)

- [x] Port deterministic accuracy scoring; reference Manus `server/scoring/deterministic.ts` and `server/scoring/numericalParser.ts`, adapt to `app/lib/db.ts` and tRPC. (Chunk 1: `app/server/scoring/` modules + smoke script; not wired to live grade yet.)
- [ ] Port behavioral scoring inputs; reference Manus `server/scoring/behavioral.ts`, using existing `behaviorEvents` captured by `assessment.logBehavior`.
- [ ] Port score blending; reference Manus `server/scoring/blend.ts`, combining deterministic, behavioral, and LLM scores.
- [x] Port expected-answer definitions; reference Manus `server/scoring/expectedAnswers.ts`, mapping them to current role templates and task IDs. (Chunk 1: `app/server/scoring/expectedAnswers.ts` for t1–t3; FP&A/HF empty where prompts differ.)
- [ ] Restore in-test Pine AI constraints in `chat.send`: no final deliverables, no filling numbers for candidates, concise guidance, and role-aware boundaries.
- [ ] Inject uploaded source material/PDF text into Pine AI chat context instead of only claiming materials are available.
- [ ] Rebuild report behavior telemetry display; reference Manus `CandidateBehaviorTab.tsx`, using current `behaviorEvents`.
- [ ] Rebuild in-assessment PDF/material viewing; reference Manus `PdfMaterialViewer.tsx`, adapting to current source-material storage shape.

## Scoring & defensibility

- [ ] Replace single-path `generateScoreWithLLM` grading with a scoring pipeline that runs deterministic, behavioral, and LLM scoring.
- [ ] Add a process-trace timeline to every score report showing candidate edits, paste/type events, task changes, and AI interactions.
- [ ] Add an evidence panel to score reports with separate sections for behavioral signals, AI-interaction analysis, deterministic checks, and LLM judgment.
- [ ] Store enough structured scoring evidence to regenerate or audit score reports without reparsing prose rationales.

## Workspace realism

- [ ] Add a real spreadsheet component such as Univer, Luckysheet, or HandsOnTable for at least one task per role template.
- [ ] Preload spreadsheet tasks with intentional errors, missing rows, or broken formulas for candidates to fix.
- [ ] Persist spreadsheet cell/formula state with the candidate submission.
- [ ] Add a grader-visible scratchpad/notes panel that is saved but excluded from scored task responses.
- [ ] Generate campaign task questions from uploaded source material when materials exist.
- [ ] Generate Pine AI auto-prompt suggestions from uploaded source material when materials exist.

## AI behavior

- [ ] Add configurable AI difficulty per role template.
- [ ] Make AI difficulty affect chat prompt constraints, assistant capability, and allowed specificity.
- [ ] Surface the chosen AI difficulty in campaign configuration and report metadata.

## Infra / hygiene

- [ ] Decide on test tooling for this Next.js/tRPC/MongoDB stack.
- [ ] Add focused tests for deterministic scoring, numerical parsing, score blending, and chat prompt/material injection.
- [ ] Add a verification checklist for migrations from the Manus reference repo so stack-specific adaptations are reviewed explicitly.
