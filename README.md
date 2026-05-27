# Pine

Finance AI-fluency assessment platform. Recruiters create campaigns under one of four role templates — **IB Analyst**, **PE Associate**, **Hedge Fund Research Analyst**, **Management Consultant** — invite candidates to a timed 3-task simulation with Pine AI as a constrained research assistant, and review reports scored on six dimensions (accuracy, efficiency, judgment, verification, communication, tool fluency).

## Where to read

- [`AGENTS.md`](./AGENTS.md) — stack, project map, hard rules. **Read this first before editing.**
- [`PLAN.md`](./PLAN.md) — strategic context: what shipped, what's still open for v1.
- [`TODO.md`](./TODO.md) — the next concrete task list.
- [`app/README.md`](./app/README.md) — environment variables, OAuth setup, storage configuration.

## Quick start

```bash
npm install
npm run dev          # Next 16 dev server on http://localhost:3000
npm run build        # production build (required gate for server / import / next.config changes)
npx tsx scripts/verify-scoring.ts   # scoring pipeline smoke test
```

See `app/README.md` for the full `.env.local` template (MongoDB, Google OAuth, OpenRouter LLM, S3-compatible object storage, optional Resend email).

## Stack

Next.js 16.2.6 App Router · React 19.2 · TypeScript 5 · tRPC 11 · MongoDB · Tailwind v4 · shadcn/ui · `jose` JWT auth · Google OAuth · OpenRouter LLM (`google/gemini-2.5-flash` default) · S3-compatible object storage (Cloudflare R2 in prod) · Resend email.
