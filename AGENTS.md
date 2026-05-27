<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Stack

Next.js 16.2.6 App Router, React 19.2, TypeScript 5. tRPC 11, @tanstack/react-query 5, superjson, MongoDB official driver, Tailwind v4 via `@tailwindcss/postcss`, shadcn/ui, lucide-react, `jose` JWT auth, Google OAuth, and LLM calls through an OpenAI-compatible endpoint (default OpenRouter `google/gemini-2.5-flash`). S3-compatible object storage (Cloudflare R2 in prod) via `@aws-sdk/client-s3` for source-material PDFs and generated artifacts, served to the browser through the `/manus-storage/[...key]` signed-URL redirect proxy. Resend for transactional email. Path alias: `@/*` points at the repo root.

## Product Surface

Pine is a finance AI-fluency assessment platform. Recruiters create campaigns under one of four role templates — **IB Analyst**, **PE Associate**, **Hedge Fund Research Analyst**, **Management Consultant** — invite candidates, and review scored reports. Candidates complete a timed, 3-task simulation with Pine AI as a constrained research assistant and uploaded/embedded source materials. Scoring blends deterministic checks, behavioral telemetry, and a 6-dimension LLM grader.

## Project Map

- Thin route files live in `app/<route>/page.tsx`; page implementations live in `app/_pages/**`.
- Shared components live in `app/components/**`; hooks live in `app/hooks/**`.
- Generated shadcn/ui components live in `app/components/ui/**`.
- Auth session code lives in `app/auth/session.ts`; core server infra lives in `app/server/_core/**`.
- Single tRPC router: `app/server/routers.ts`. No sub-router folder is in use.
- Scoring pipeline lives in `app/server/scoring/**` (`deterministic.ts`, `behavioral.ts`, `blend.ts`, `numericalParser.ts`, `expectedAnswers.ts`). Verify with `npx tsx scripts/verify-scoring.ts`.
- Storage helpers live in `app/server/storage.ts`; the public proxy route is `app/manus-storage/[...key]/route.ts`. Server-side PDF text extraction is in `app/server/materials.ts` (via `pdf-parse`).
- Mongo access is centralized in `app/lib/db.ts`; schema types are in `app/lib/schema.ts`.
- Current Mongo collections: `users`, `campaigns`, `assessments`, `submissions`, `scores`, `pdfReports`, `demoRequests`, `teams`, `behaviorEvents`, plus `counters` for numeric IDs.

## Hard Rules

- Treat as vendored; do not edit unless explicitly asked: `app/server/_core/**`, `app/components/ui/**`, `app/manus-storage/**`, `app/components/ManusDialog.tsx`.
- MongoDB uses numeric `id` fields issued via the `counters` collection in `app/lib/db.ts`. Do not assume Mongo `_id` is the application ID.
- `app/lib/schema.ts` is hand-written TypeScript types only. It is not an ORM schema.
- `RoleTemplate` is a closed union of the four templates above; any code that branches on it must keep a safe fallback for unknown values, since old DB rows may use removed labels.
- All app data access belongs in `app/lib/db.ts`. Do not introduce an ORM.
- All LLM access must go through `invokeLLM` in `app/server/_core/llm.ts`.
- All object-storage access (uploads, signed URLs) goes through `app/server/storage.ts`; downloads are served via the `/manus-storage/[...key]` proxy, never by exposing raw S3 URLs to the client.
- Core tRPC exports are `publicProcedure`, `protectedProcedure`, and `adminProcedure`. `recruiterProcedure`, `managerProcedure`, and `recruiterOrManagerProcedure` are local helpers in `app/server/routers.ts`; role-gate new endpoints with the correct existing guard or add a deliberate shared guard.
- Every resource-scoped query/mutation (anything fetching by id) must have both a role guard and an ownership check (e.g. `campaign.recruiterId === ctx.user.id`, admin bypass), throwing `FORBIDDEN`. Bare `protectedProcedure` on a by-id read is a known landmine.
- Validate tRPC inputs with `zod`.

## How To Run / Verify

- Dev server: `npm run dev` (`next dev`).
- Production build: `npm run build` (`next build`). Required before claiming a server/import/`next.config`/dynamic-import change is safe; dev does not catch all production bundling failures here.
- Lint: `npm run lint` (`eslint`). The repo carries ~50+ pre-existing lint errors that `next build` ignores; do not use repo-wide lint as a gate. Lint only touched files: `npx eslint <changed files>` — new code should add no new errors.
- Typecheck: `npx tsc --noEmit` when types or server modules change.
- Scoring smoke: `npx tsx scripts/verify-scoring.ts` after any change under `app/server/scoring/**` or to expected answers.
- No test suite exists yet. Typecheck/build plus the scoring smoke are the safety net until test tooling is added.

## Conventions

- Follow the page-in-`_pages` plus thin-route-file pattern for new pages.
- Use tRPC routers/procedures for server actions and keep input validation close to the procedure.
- Use Tailwind v4 conventions and existing component patterns.
- Do not hand-edit generated shadcn components in `app/components/ui/**`; wrap or compose them elsewhere.
- Prefer local repo patterns over re-porting Manus code literally. The original Manus build used a different Vite/Express/Drizzle/Postgres stack.
