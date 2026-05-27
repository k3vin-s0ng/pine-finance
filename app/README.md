# Pine — Next.js App Router build

This folder is the deployable Next.js App Router build of the Pine finance AI-fluency assessment platform. It contains the pages, components, hooks, auth/session helpers, tRPC route handlers, upload/storage routes, MongoDB data access, scoring pipeline, and TypeScript entity types.

For stack, project map, and hard rules see `../AGENTS.md`. For strategic context see `../PLAN.md`; for the next concrete task see `../TODO.md`.

## Database

MongoDB through the official `mongodb` driver, Vercel + Atlas friendly. The whole data layer lives in `app/lib/db.ts`. The app uses numeric `id` fields (not `_id`) for compatibility with the existing tRPC routes; `app/lib/db.ts` maintains those via a `counters` collection. No migration command is required — indexes are created at runtime on first DB connection.

Collections in use: `users`, `campaigns`, `assessments`, `submissions`, `scores`, `pdfReports`, `demoRequests`, `teams`, `behaviorEvents`, plus `counters`.

## Install

```bash
npm install
```

Dependencies are pinned in `../package.json`; the lockfile is the source of truth.

## Environment

Required:

```bash
MONGODB_URI=mongodb+srv://USER:PASSWORD@CLUSTER.mongodb.net
MONGODB_DB=pine_finance              # or MONGODB_DATABASE; defaults to pine_finance
JWT_SECRET=replace_me                # session cookie signing

# Google OAuth (single client; use the same value for both)
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_oauth_client_id
GOOGLE_CLIENT_ID=your_google_oauth_client_id
GOOGLE_CLIENT_SECRET=your_google_oauth_client_secret

# LLM (OpenAI-compatible endpoint; OpenRouter by default)
OPENAI_API_KEY=your_openrouter_key
OPENAI_API_URL=https://openrouter.ai/api/v1        # optional; this is the default
OPENAI_MODEL=google/gemini-2.5-flash               # optional; this is the default

# S3-compatible object storage for source-material PDFs (Cloudflare R2 in prod)
S3_BUCKET=pine-source-materials
S3_REGION=auto
S3_ACCESS_KEY_ID=your_r2_access_key
S3_SECRET_ACCESS_KEY=your_r2_secret_key
S3_ENDPOINT=https://<account>.r2.cloudflarestorage.com   # required for R2; omit for AWS S3

# App URL (used in invite links + OAuth callback)
APP_URL=http://localhost:3000
```

Optional:

```bash
OWNER_OPEN_ID=                                    # auto-promotes this Google openId to admin
RESEND_API_KEY=                                   # transactional email (candidate invites)
RESEND_FROM="Pine Finance <noreply@pinefinance.org>"
BUILT_IN_FORGE_API_URL=                           # only for Forge-backed extras (maps, image gen, voice)
BUILT_IN_FORGE_API_KEY=
NEXT_PUBLIC_FRONTEND_FORGE_API_URL=               # only for the in-browser Map component
NEXT_PUBLIC_FRONTEND_FORGE_API_KEY=
```

## Google OAuth

Create an OAuth 2.0 Client ID in Google Cloud Console:

- Application type: Web application
- Authorized JavaScript origins:
  - `http://localhost:3000`
  - `https://your-vercel-domain.vercel.app`
- Authorized redirect URIs:
  - `http://localhost:3000/api/oauth/callback`
  - `https://your-vercel-domain.vercel.app/api/oauth/callback`

Use the client ID for both `NEXT_PUBLIC_GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_ID`. Use the client secret for `GOOGLE_CLIENT_SECRET`.

## Object storage

Source-material PDFs and generated artifacts are uploaded to an S3-compatible bucket via `app/server/storage.ts`. They are served back to the browser through `app/manus-storage/[...key]/route.ts`, which 307-redirects to a short-lived signed URL. The client never holds a raw bucket URL.

For Cloudflare R2 in prod, point `S3_ENDPOINT` at the R2 account endpoint and use `S3_REGION=auto`. For AWS S3, omit `S3_ENDPOINT` and set a real region.

## Path alias

Imports like `@/app/components/...` resolve via `tsconfig.json`:

```json
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./*"]
    }
  }
}
```
