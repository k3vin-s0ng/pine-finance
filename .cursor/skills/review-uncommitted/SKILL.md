---
name: review-uncommitted
description: >-
  Hands-on pre-commit review of local uncommitted git changes in pine-1 (especially
  Codex edits): triage like a PR review, fix real bugs and meaningful issues in-repo,
  explain rationale, skip nits. Use when the user says review-uncommitted, /review-local,
  @review-uncommitted, or asks to review/fix uncommitted changes before commit.
disable-model-invocation: true
---

# Review uncommitted changes (pine-1)

Pre-commit counterpart to PR review: inspect **local** diffs (staged + unstaged), then **apply targeted fixes** in the working tree — not just comments.

**Recommended model:** Claude **Opus 4.7 Extra High** (`claude-opus-4-7-thinking-xhigh`). Switch the chat model before invoking; skills cannot force the model.

**Do not commit or push** unless the user explicitly asks afterward (e.g. `@open-pr-on-complete`).

## When to run

Typical flow: Codex (or another agent) edits files → user opens Cursor on this repo → invokes this skill → accepts/rejects fixes → commits manually or arms PR skill.

## Scope of review

1. Read `AGENTS.md` (stack, hard rules, verify commands).
2. Gather the full local diff:
   - `git status`
   - `git diff` (unstaged)
   - `git diff --cached` (staged)
   - If the user names a base: `git diff <base>...` (e.g. `main`)
3. **Exclude** from review/fix unless the user asks:
   - `.cursor/.open-pr-armed`, other ephemeral session flags
   - `.env*`, secrets, credentials
   - Unrelated drive-by edits outside the stated task

## Review method (PR-style triage)

For each changed file/hunk, classify findings:

| Severity | Meaning | Action |
|----------|---------|--------|
| **Critical** | Bug, security issue, broken types, violates `AGENTS.md` hard rules, will fail build/lint in touched code | **Fix in place** |
| **Meaningful** | Clear correctness, maintainability, or stack mismatch (e.g. wrong tRPC guard, Mongo `id` vs `_id`) with low risk | **Fix in place** if confident |
| **Suggestion** | Style, naming, optional refactor | **Report only** — do not edit |
| **Nit** | Formatting, taste, “could be nicer” | **Skip** |

**Default posture:** skeptical but fair — like reviewing a teammate’s PR. Validate each issue against the actual diff and pine-1 patterns; do not invent problems.

**Hands-on bar:** Only edit what is **broken** or **meaningfully improvable** with a small, obvious diff. No drive-by refactors, no reformatting unrelated files, no new abstractions for one-off cases.

**Vendored / off-limits** (from `AGENTS.md`): do not edit `app/server/_core/**`, `app/components/ui/**`, `app/manus-storage/**`, `app/components/ManusDialog.tsx` unless the user explicitly overrides.

## Fix workflow

1. **Summarize** the change set in 2–4 sentences (what Codex was trying to do).
2. **List findings** by severity before editing (brief bullets).
3. **Apply fixes** for Critical and Meaningful items only.
4. **Verify** when feasible on touched scope:
   - `npm run build` if server/app/types changed
   - `npm run lint` if feasible (note pre-existing repo noise if unrelated)
   - `npx tsx scripts/verify-scoring.ts` if `app/server/scoring/**` changed
5. **Report** in the final message:

```markdown
## Review summary
<what changed and overall risk>

## Fixes applied
- **<file>** — <what you changed> — *Rationale:* <why>

## Deferred (not edited)
- **Suggestion:** ...
- **Nit:** ...

## Verify
- [what you ran and result]
```

If nothing warranted edits, say so clearly and list any deferred Suggestions.

## Constraints

- Match existing naming, imports, and patterns in surrounding files.
- Prefer extending existing functions over new helpers.
- Do not widen scope to “while we’re here” improvements.
- Do not commit, stage, or open a PR in this skill unless explicitly requested.

## Triggers

User may invoke via:

- `@review-uncommitted`
- `review-uncommitted` in the prompt
- `/review-local`

## Example

```text
/review-local
Codex just finished restoring Pine AI chat constraints. Review all uncommitted changes, fix real issues, explain what you changed.
```

## Checklist

See [CHECKLIST.md](CHECKLIST.md) for the full review checklist.
