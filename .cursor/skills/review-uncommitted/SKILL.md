---
name: review-uncommitted
description: >-
  Hands-on pre-commit review of local uncommitted git changes in projects/pine on main (especially
  Codex edits): triage like a PR review, fix real bugs and meaningful issues in-repo,
  explain rationale, skip nits. Use when the user says review-uncommitted, /review-local,
  @review-uncommitted, or asks to review/fix uncommitted changes before commit.
disable-model-invocation: true
---

# Review uncommitted changes (projects/pine, main branch)

Pre-commit counterpart to PR review: inspect **local** diffs (staged + unstaged), then **apply targeted fixes** in the working tree — not just comments.

**Recommended model:** Claude **Opus 4.7 Extra High** (`claude-opus-4-7-thinking-xhigh`). Switch the chat model before invoking; skills cannot force the model.

**Do not commit or push** unless the user explicitly asks afterward (e.g. `@open-pr-on-complete`). Fixes are applied to the working tree on `main` — recommend the user have a clean checkpoint commit *before* invoking, so review edits don't entangle with the agent's diff and can be reverted cleanly.

## When to run

Typical flow: Codex (or another agent) edits files → user opens Cursor on this repo → invokes this skill → accepts/rejects fixes → commits manually or arms PR skill.

## Scope of review

1. Read `AGENTS.md` (stack, hard rules, verify commands).
2. Gather the full local diff:
   - `git status`
   - `git diff` (unstaged)
   - `git diff --cached` (staged)
   - If the user names a base: `git diff <base>...` (e.g. `main`)
3. **Review only the hunks belonging to the stated task.** This repo is worked on `main` with **no branches** by multiple people (UI, templates, scoring). The working tree may contain teammates' unrelated in-progress work. If the diff appears to mix multiple unrelated changes, **say so and ask the user** which hunks are in scope before fixing anything — never "fix" code that belongs to someone else's in-progress work.
4. **Exclude** from review/fix unless the user asks:
   - `.cursor/.open-pr-armed`, other ephemeral session flags
   - `.env*`, secrets, credentials
   - Unrelated drive-by edits outside the stated task

## Review method (PR-style triage)

For each changed file/hunk, classify findings:

| Severity | Meaning | Action |
|----------|---------|--------|
| **Critical** | Bug, security issue, broken types, violates `AGENTS.md` hard rules, **incomplete/half-wired feature**, will fail build in touched code | **Fix in place** |
| **Meaningful** | Clear correctness, maintainability, stack mismatch (wrong tRPC guard, Mongo `id` vs `_id`), or a **broken data contract** (consumer reads data a producer doesn't emit) with low fix risk | **Fix in place** if confident |
| **Suggestion** | Style, naming, optional refactor | **Report only** — do not edit |
| **Nit** | Formatting, taste, "could be nicer" | **Skip** |

**Default posture:** skeptical but fair — like reviewing a teammate's PR. Validate each issue against the actual diff and projects/pine patterns; **do not invent problems.**

**Hands-on bar:** Only edit what is **broken** or **meaningfully improvable** with a small, obvious diff. No drive-by refactors, no reformatting unrelated files, no new abstractions for one-off cases.

### Project-specific checks (this repo's recurring failure modes — check these first)

- **Completeness / did the agent finish?** Agents here have stopped mid-task (out of credits). Verify the change implements the task **end-to-end**: producer + consumer + wiring all present. Flag stubs, `TODO(...)`/`chunk-N` markers, functions defined-but-never-called, empty `catch` blocks that swallow silently, and UI added with no server persistence (or vice versa). Treat genuine incompleteness as **Critical**.
- **Data contracts (catch "silently hollow" features).** When new code consumes events/fields/data produced elsewhere (e.g. behavioral scoring reading `behaviorEvents`, a UI reading a tRPC field), confirm the producer actually emits them **in the shape consumed**. A feature that compiles and lints but defaults/falls back because its inputs never arrive is a real bug — the behavioral-scores regression was exactly this. **Meaningful** (or Critical if it silently corrupts output).
- **IDOR / authorization.** Every resource-scoped query/mutation (anything fetching by `id`) must have **both** a role guard **and** an ownership check — e.g. `recruiterProcedure` + `resource.recruiterId === ctx.user.id` (admin bypass), throwing `FORBIDDEN`. A bare `protectedProcedure` on a by-id read is **Critical**. (Known landmine: `getReport` historically shipped ungated — do not copy that pattern; the `addSourceMaterial`/`getCampaignById` guards are the correct template.)

**Vendored / off-limits** (from `AGENTS.md`): do not edit `app/server/_core/**`, `app/components/ui/**`, `app/manus-storage/**`, `app/components/ManusDialog.tsx` unless the user explicitly overrides.

## Fix workflow

1. **Summarize** the change set in 2–4 sentences (what the agent was trying to do).
2. **List findings** by severity before editing (brief bullets).
3. **Apply fixes** for Critical and Meaningful items only.
4. **Verify** on touched scope (see gate rules below).
5. **Report** in the final message (format below).

### Verify gate rules (important — these encode real incidents)

- **`npm run build` — run it** whenever the diff touches **dependencies, imports, `next.config.*`, server modules, dynamic imports, or anything bundling-relevant.** Reason: `next dev` does NOT catch production build failures in this repo — a bundling break (pdfjs) once took down all of production while dev looked fine. Only skip for a small, isolated client/UI insertion with no new imports, and state that justification explicitly.
- **Lint — do NOT run repo-wide `npm run lint` as a gate.** There are ~67 pre-existing, non-blocking lint errors (including vendored files and newly-enabled React-compiler rules); `next build` ignores them. Instead lint **only the touched files**: `npx eslint <changed files>`. The pass condition is: *new code introduces no new errors.* Pre-existing errors in lines the diff didn't touch are out of scope.
- **`npx tsc --noEmit`** — run when types/server/app code changed.
- **`npx tsx scripts/verify-scoring.ts`** — run if `app/server/scoring/**` changed (and re-run after any fix that touches scoring).
- **Environment-dependent behavior you cannot verify here** (Forge-backed file/PDF rendering, live data, email sending) — do not claim it works because the build passed. List it under "Manual verification required."

## Report format

```markdown
## Review summary
<what changed and overall risk>

## Fixes applied
- **<file>** — <what you changed> — *Rationale:* <why>
  (or "None — diff is in good shape.")

## Deferred (not edited)
- **Suggestion:** ...
- **Nit:** ...

## Verify (what I ran)
- build / tsc / scoring smoke / fresh-file lint — results, with any skip justified

## Manual verification required (cannot check here)
- <environment-dependent gates: e.g. set Forge keys → upload a PDF → confirm the viewer renders;
  open a scored report as recruiter → confirm the behavior tab populates; open as candidate → confirm it's absent>
```

If nothing warranted edits, say so clearly and list any deferred Suggestions.

## Constraints

- Match existing naming, imports, and patterns in surrounding files.
- Prefer extending existing functions over new helpers.
- Do not widen scope to "while we're here" improvements.
- Do not commit, stage, or open a PR in this skill unless explicitly requested.

## Triggers

`@review-uncommitted` · `review-uncommitted` in the prompt · `/review-local`

## Example

```text
/review-local
Codex just finished restoring Pine AI chat constraints. Review all uncommitted changes, fix real issues, explain what you changed.
```

## Checklist

See [CHECKLIST.md](CHECKLIST.md) for the full review checklist.