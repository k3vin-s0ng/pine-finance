# Pre-commit review checklist (projects/pine, main branch)

Use while reviewing uncommitted diffs. Not every item applies to every change.

## Completeness (this repo's #1 failure mode — agents stop mid-task)

- [ ] Feature is implemented end-to-end: producer + consumer + wiring all present
- [ ] No stubs, `TODO(...)`/`chunk-N` markers, or functions defined-but-never-called left in
- [ ] No empty `catch` blocks silently swallowing errors; degraded paths signal their state
- [ ] UI changes have matching server persistence (and vice versa) — not half a feature

## Correctness

- [ ] Logic matches task intent; no obvious off-by-one / null / empty-array bugs
- [ ] tRPC inputs validated with `zod`; correct procedure guard
- [ ] Mongo uses numeric `id` from `counters`, not `_id` as app id
- [ ] LLM calls only via `invokeLLM` in `app/server/_core/llm.ts` (no parallel clients)
- [ ] **Data contract holds:** code consuming events/fields/data confirms the producer emits them in that exact shape (no silent default/fallback masking missing inputs — see the behavioral-scores regression)

## Stack fit

- [ ] Next.js App Router + thin `app/<route>/page.tsx` + `app/_pages/**` pattern preserved
- [ ] Data access in `app/lib/db.ts`; types in `app/lib/schema.ts` (not ORM)
- [ ] Path alias `@/*` used consistently

## Security & data

- [ ] No secrets, `.env`, or tokens in diff
- [ ] **IDOR:** every resource-scoped query/mutation (fetch-by-id) has BOTH a role guard AND an ownership check (`resource.recruiterId === ctx.user.id`, admin bypass), throwing `FORBIDDEN` — never a bare `protectedProcedure` on a by-id read (cf. the `getReport` landmine)
- [ ] Client gating of a sensitive UI matches the server guard exactly (so it never mounts → never fires a FORBIDDEN query)
- [ ] No unsanitized user HTML where inappropriate

## Quality (fix only if broken or clearly wrong)

- [ ] TypeScript types accurate (no careless `any` on new code)
- [ ] Error paths handled where the surrounding code does
- [ ] No dead code or commented-out blocks left from the agent

## Verify gates (see SKILL.md for full rules)

- [ ] `npm run build` run if the diff touches deps/imports/`next.config`/server/dynamic-imports (dev does NOT catch prod build failures here — the pdfjs incident)
- [ ] Fresh-file lint only: `npx eslint <touched files>` — new code adds no new errors (repo-wide lint debt is out of scope)
- [ ] `npx tsc --noEmit` if types/server changed
- [ ] `npx tsx scripts/verify-scoring.ts` if `app/server/scoring/**` changed
- [ ] Environment-dependent behavior (Forge file/PDF rendering, live data, email) listed under "Manual verification required" — not assumed working from a green build

## Out of scope for auto-fix

- [ ] Pre-existing lint debt in untouched files
- [ ] Cosmetic style unless it violates an obvious local convention
- [ ] Missing tests (no test suite yet — note in summary only)
- [ ] Teammates' unrelated uncommitted work in the same working tree (no branches) — review only the stated task's hunks