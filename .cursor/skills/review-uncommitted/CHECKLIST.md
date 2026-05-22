# Pre-commit review checklist (pine-1)

Use while reviewing uncommitted diffs. Not every item applies to every change.

## Correctness

- [ ] Logic matches task intent; no obvious off-by-one / null / empty-array bugs
- [ ] tRPC inputs validated with `zod`; correct procedure guard (`protectedProcedure`, role helpers)
- [ ] Mongo uses numeric `id` from `counters`, not `_id` as app id
- [ ] LLM calls only via `invokeLLM` in `app/server/_core/llm.ts` (do not add parallel clients)

## Stack fit

- [ ] Next.js App Router + thin `app/<route>/page.tsx` + `app/_pages/**` pattern preserved
- [ ] Data access in `app/lib/db.ts`; types in `app/lib/schema.ts` (not ORM)
- [ ] Path alias `@/*` used consistently

## Security & data

- [ ] No secrets, `.env`, or tokens in diff
- [ ] Auth/session checks on server mutations
- [ ] No unsanitized user HTML where inappropriate

## Quality (fix only if broken or clearly wrong)

- [ ] TypeScript types accurate (no careless `any` on new code)
- [ ] Error paths handled where the surrounding code does
- [ ] No dead code or commented-out blocks left from Codex

## Out of scope for auto-fix

- [ ] Pre-existing lint debt in untouched files
- [ ] Cosmetic style unless it violates an obvious local convention
- [ ] Missing tests (no test suite yet — note in summary only)
