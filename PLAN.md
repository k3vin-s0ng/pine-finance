# PLAN

## Where We Are

Pine is a finance AI-fluency assessment platform. The repo was migrated from the original Manus Vite/Express/Drizzle/Postgres build into this Next.js 16/tRPC/MongoDB app, and the v1 wedge — a pre-hire assessment workflow where recruiters create campaigns, candidates complete finance tasks with Pine AI, and recruiters review scored reports — is now functional end-to-end across four role templates: **IB Analyst**, **PE Associate**, **Hedge Fund Research Analyst**, and **Management Consultant**.

## Migration Status

The Manus-era regression debt that blocked defensible scoring is closed:

- **Deterministic + behavioral + LLM scoring pipeline** restored at `app/server/scoring/**` (`deterministic.ts`, `behavioral.ts`, `blend.ts`, `numericalParser.ts`, `expectedAnswers.ts`), with a `scripts/verify-scoring.ts` smoke. Live grading runs all three paths and blends them via `buildBlendedScore` in `app/server/routers.ts`; structured `scoreEvidence` is persisted on every score.
- **In-test Pine AI constraints** are enforced server-side in `chat.send`: role-aware boundaries refuse final deliverables and candidate-owned answers, and recruiter-uploaded source-material text is extracted (via `pdf-parse` in `app/server/materials.ts`) and injected into the system prompt.
- **CandidateBehaviorTab**, **ProcessTraceTimeline**, **EvidencePanel**, and **PdfMaterialViewer** are rebuilt and wired into `ScoreReport` / `AssessmentInterface`. The behavior tab and process trace render only for recruiter/admin viewers; candidates never see them.
- **S3-compatible object storage** (Cloudflare R2 in prod) replaces the prior Forge presigning path. Uploads go through `app/server/storage.ts`; downloads are served via the `/manus-storage/[...key]` signed-URL redirect proxy.
- **Management Consultant** role template ships with its own four embedded source materials (OCC examination, financials, compliance overview, loan tape), three senior-analyst tasks, role-aware AI boundary, and benchmark/cohort entries.

Other carry-overs that survived the original migration are still present: source-material upload, structured response composers, client telemetry capture through `BehaviorStrip`/`onPushBehaviorEvent`, paste/type/AI behavior events, dashboards, and the 6-dimension LLM grader (now blended rather than sole).

What is _not_ here, that Manus had: a real test suite. `package.json` has no test tooling; build + scoring smoke + targeted lint are the current gates.

## v1 Definition of Done

Done:

- Scoring blends deterministic, behavioral, and LLM signals.
- The score report carries a process-trace timeline of candidate edits, paste/type events, task changes, and AI interactions, plus an evidence panel separating behavioral signals, AI-interaction analysis, deterministic checks, and LLM judgment.
- Structured scoring evidence is persisted so reports can be regenerated or audited without reparsing prose rationales.
- Uploaded PDF source materials render in the assessment for the candidate and feed the AI's system prompt.

Still open for v1:

- **Workspace realism.** Add a real spreadsheet component (Univer / Luckysheet / Handsontable) for at least one task per role template, preload it with intentional errors / broken formulas, persist cell + formula state with the submission, and add a grader-visible scratchpad/notes panel that is saved but excluded from scoring. Generate task questions and AI auto-prompt suggestions from uploaded source material when materials exist.
- **Configurable AI difficulty per role template.** Today, AI capability and refusal strictness are uniform across templates; we want it tunable so e.g. an IB-Analyst assistant can be more capable while a Management Consultant assistant can be more constrained, with the chosen difficulty surfaced in campaign config and report metadata.
- **Test tooling.** Pick a runner for the Next/tRPC/MongoDB stack and add focused tests for deterministic scoring, numerical parsing, score blending, and chat prompt/material injection. Add a verification checklist for any future Manus-reference re-ports so stack-specific adaptations are reviewed explicitly.

## Sequencing

Workspace realism and AI-difficulty configuration are independent and can proceed in parallel. Within workspace realism, the spreadsheet surface is the largest piece and should land first because the scratchpad and source-material-driven prompt/question generation slot in on top of it. AI-difficulty work is small but cross-cutting — it touches campaign config, chat system prompt assembly, and report metadata simultaneously, so it should land as a single coordinated change rather than in pieces. Test tooling is hygiene-tier and should land after at least one of the two product workstreams to anchor a non-trivial first test target.
