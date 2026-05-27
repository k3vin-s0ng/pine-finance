<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Stack

Next.js 16.2.6 App Router, React 19.2, TypeScript 5. tRPC 11, @tanstack/react-query 5, superjson, MongoDB official driver, Tailwind v4 via `@tailwindcss/postcss`, shadcn/ui, lucide-react, `jose` JWT auth, Google OAuth, and Forge-backed LLM calls through `gemini-2.5-flash`. Path alias: `@/*` points at the repo root.

## Project Map

- Thin route files live in `app/<route>/page.tsx`; page implementations live in `app/_pages/**`.
- Shared components live in `app/components/**`; hooks live in `app/hooks/**`.
- Generated shadcn/ui components live in `app/components/ui/**`.
- Auth session code lives in `app/auth/session.ts`; core server infra lives in `app/server/_core/**`.
- Root tRPC router: `app/server/routers.ts`; sub-routers: `app/server/routers/*.ts`; intelligence platform is mounted under `intelligence.*`.
- Mongo access is centralized in `app/lib/db.ts`; schema types are in `app/lib/schema.ts`.
- Current Mongo collections: `users`, `campaigns`, `assessments`, `submissions`, `scores`, `pdfReports`, `aiUsageEvents`, `demoRequests`, `teams`, `workflows`, `aiEvents`, `workflowInstances`, `outcomeMetrics`, `evaluationScores`, `policyEvents`, `feedbackItems`, `playbooks`, `intelligenceReports`, `scoringWeights`, `behaviorEvents`, plus `counters` for numeric IDs.

## Hard Rules

- Treat as vendored; do not edit unless explicitly asked: `app/server/_core/**`, `app/components/ui/**`, `app/manus-storage/**`, `app/components/ManusDialog.tsx`.
- MongoDB uses numeric `id` fields issued via the `counters` collection in `app/lib/db.ts`. Do not assume Mongo `_id` is the application ID.
- `app/lib/schema.ts` is hand-written TypeScript types only. It is not an ORM schema.
- All app data access belongs in `app/lib/db.ts`. Do not introduce an ORM.
- All LLM access must go through `invokeLLM` in `app/server/_core/llm.ts`.
- Core tRPC exports are `publicProcedure`, `protectedProcedure`, and `adminProcedure`. The only role helper that currently exists is `recruiterProcedure` (a local helper in `app/server/routers.ts` that gates recruiter **and** admin). There is no `managerProcedure` or `recruiterOrManagerProcedure` — do not reference them. Role-gate new endpoints with `recruiterProcedure`/`adminProcedure`, or add a deliberate new shared guard if a new role tier is genuinely needed.
- Validate tRPC inputs with `zod`.

## How To Run / Verify

- Dev server: `npm run dev` (`next dev`).
- Production build: `npm run build` (`next build`).
- Lint: `npm run lint` (`eslint`).
- No test suite exists. Typecheck/build plus lint are the safety net until test tooling is added.

## Conventions

- Follow the page-in-`_pages` plus thin-route-file pattern for new pages.
- Use tRPC routers/procedures for server actions and keep input validation close to the procedure.
- Use Tailwind v4 conventions and existing component patterns.
- Do not hand-edit generated shadcn components in `app/components/ui/**`; wrap or compose them elsewhere.
- Prefer local repo patterns over re-porting Manus code literally. The original Manus build used a different Vite/Express/Drizzle/Postgres stack.
