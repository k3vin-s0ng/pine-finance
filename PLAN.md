# PLAN

## Where We Are

Pine is a finance AI-fluency assessment platform. The repo is mid-migration from the original Manus Vite/Express/Drizzle/Postgres build into this Next.js 16/tRPC/MongoDB app. The v1 wedge is a pre-hire assessment workflow: recruiters create campaigns, candidates complete finance tasks with Pine AI, and recruiters review scored reports.

The repo now treats `AGENTS.md`, `CLAUDE.md`, `PLAN.md`, and `TODO.md` as living operational memory. Agents should update them in the same change whenever implementation, strategy, sequencing, or task status changes enough to make the current text stale.

## Migration Status

Several v1 surfaces survived the migration: source-material upload, structured response composers, client telemetry capture through `BehaviorStrip`/`onPushBehaviorEvent`, paste/type/AI behavior events, 6-dimension LLM grading, dashboards, and the intelligence sub-router mount under `intelligence.*`.

Regression debt remains:

- Deterministic scoring was dropped. Manus had `server/scoring/deterministic.ts`, `behavioral.ts`, `blend.ts`, `numericalParser.ts`, and `expectedAnswers.ts`; this repo has no `app/server/scoring/` folder. Current assessment grading is a single `generateScoreWithLLM` call in `app/server/routers.ts`.
- In-test AI constraints were weakened. Manus constrained Pine AI against final deliverables, filling numbers, and long answers, and injected source-material/PDF text into chat context. Current `chat.send` uses a generic prompt and does not inject actual uploaded material content.
- `CandidateBehaviorTab.tsx` was dropped, so captured behavior telemetry is not displayed in reports.
- `PdfMaterialViewer.tsx` was dropped, so uploaded PDFs are not viewable inside the assessment.
- All tests were dropped. `package.json` has no test tooling.

## v1 Definition Of Done

v1 needs the regression debt cleared where it blocks defensible scoring and assessment behavior. It also needs workspace realism: at least one real spreadsheet task per role template, editable formulas/cells, intentionally flawed model data to fix, a grader-visible scratchpad/notes panel excluded from scoring, and material-driven task questions plus AI prompt suggestions for campaigns with uploaded materials.

The score report needs a process-trace timeline showing what the candidate did when, including each AI interaction. It also needs a structured evidence panel separating behavioral signals, AI-interaction analysis, deterministic checks, and LLM judgment. Role templates need configurable AI difficulty so, for example, an IB analyst assistant can be more capable while FP&A can be more constrained.

## Sequencing

First re-port deterministic scoring and the in-test AI constraints, adapting them to Next.js/tRPC/MongoDB instead of copying the Manus stack. These are prerequisites for credible process trace, evidence panel, and AI difficulty work: a deterministic-checks section is empty until the deterministic engine exists, and AI difficulty depends on real prompt constraints plus material-aware chat context.

After that, build the report process trace, evidence panel, and role-template AI difficulty controls. Workspace realism can proceed in parallel where independent: spreadsheet task surface, scratchpad, and material-driven question/prompt generation.
