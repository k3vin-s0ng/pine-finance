---
name: open-pr-on-complete
description: >-
  At task completion, commit, push, and open a GitHub pull request for pine-1.
  Use when the user includes the trigger line `open-pr-on-complete` or `/open-pr`
  in their message, invokes this skill, or asks to open a PR when the task is done.
---

# Open PR on complete (pine-1)

Opt-in workflow for this repo. Only run the PR steps when the user armed it for this chat.

## Arm the workflow

The user must do **one** of:

- Include **`open-pr-on-complete`** anywhere in their prompt, or
- Include **`/open-pr`** anywhere in their prompt, or
- Explicitly invoke this skill (e.g. `@open-pr-on-complete`).

If none of these appear, do **not** commit, push, or open a PR unless they ask separately.

## When the main task is done

After code changes are finished and accepted:

1. **Check for changes**
   - `git status` and `git diff` — if nothing to commit, say so and stop (no empty PR).

2. **Branch**
   - If on `main` or `master`, create a descriptive branch: `agent/<short-topic>` (e.g. `agent/fix-login-redirect`).
   - If already on a feature branch, use it.

3. **Commit** (only when there are real changes)
   - Stage relevant files; never commit `.env*`, credentials, or secrets.
   - One concise commit message focused on **why** (1–2 sentences), matching recent repo style.

4. **Push**
   - `git push -u origin HEAD` (needs network).

5. **Open PR**
   - Prefer **`gh pr create`** when `gh` is available and authenticated.
   - Base branch: **`main`** unless the user specified otherwise.
   - Title: short summary of the change.
   - Body: Summary (1–3 bullets) + Test plan checklist.
   - Return the PR URL to the user.

6. **If `gh` is missing**
   - Push the branch, then tell the user to open a PR on GitHub from the pushed branch, and give them the compare URL pattern:
     `https://github.com/k3vin-s0ng/pine/compare/main...<branch>?expand=1`

## Safety

- Do not force-push `main`/`master`.
- Do not amend commits unless the user explicitly asked and the commit was not pushed.
- Do not skip git hooks unless the user explicitly asked.

## Example user message

```text
Fix the campaign list loading spinner. open-pr-on-complete
```

After fixing the spinner, run the full commit → push → PR flow above.
