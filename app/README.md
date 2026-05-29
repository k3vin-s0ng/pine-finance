# Pine Finance Next App Router Port

This folder is the portable Next.js App Router version of the Vite app. It includes the pages, components, hooks, auth/session helpers, tRPC route handlers, upload/storage routes, MongoDB data access, and TypeScript entity types needed to copy into another Next repository.

## Database Choice

This version uses MongoDB through the official `mongodb` driver. It is Vercel-friendly, works well with MongoDB Atlas, and keeps the whole data layer inside `app/lib/db.ts`. The app still uses numeric `id` fields for compatibility with the existing UI and tRPC routes; `app/lib/db.ts` maintains those via a `counters` collection.

## Install

Install these packages before running locally:

```bash
pnpm add next react react-dom mongodb @trpc/client @trpc/react-query @trpc/server @tanstack/react-query superjson zod jose cookie nodemailer nanoid lucide-react framer-motion recharts streamdown next-themes sonner class-variance-authority clsx tailwind-merge tailwindcss-animate tw-animate-css @hookform/resolvers react-hook-form date-fns embla-carousel-react input-otp react-day-picker react-resizable-panels vaul cmdk
pnpm add @radix-ui/react-accordion @radix-ui/react-alert-dialog @radix-ui/react-aspect-ratio @radix-ui/react-avatar @radix-ui/react-checkbox @radix-ui/react-collapsible @radix-ui/react-context-menu @radix-ui/react-dialog @radix-ui/react-dropdown-menu @radix-ui/react-hover-card @radix-ui/react-label @radix-ui/react-menubar @radix-ui/react-navigation-menu @radix-ui/react-popover @radix-ui/react-progress @radix-ui/react-radio-group @radix-ui/react-scroll-area @radix-ui/react-select @radix-ui/react-separator @radix-ui/react-slider @radix-ui/react-slot @radix-ui/react-switch @radix-ui/react-tabs @radix-ui/react-toggle @radix-ui/react-toggle-group @radix-ui/react-tooltip
pnpm add -D typescript @types/node @types/react @types/react-dom tailwindcss postcss autoprefixer
```

Use this alias in the target repo so imports like `@/app/components/...` resolve:

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

## Environment

Copy to `.env.local` (and set the same vars in Vercel). One per line, no spaces around `=`.
`NEXT_PUBLIC_*` are inlined at **build time** — set them before `next build`.

```bash
# Database
MONGODB_URI=mongodb+srv://USER:PASSWORD@CLUSTER.mongodb.net
MONGODB_DB=pine

# Auth (Google OAuth + session JWT)
JWT_SECRET=replace_me
GOOGLE_CLIENT_ID=your_google_oauth_client_id
GOOGLE_CLIENT_SECRET=your_google_oauth_client_secret
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_oauth_client_id   # same value; build-time

# LLM (OpenRouter, OpenAI-compatible)
OPENAI_API_KEY=sk-or-v1-...        # OpenRouter key; one key is used for all model calls.
OPENAI_API_URL=                    # optional; defaults to https://openrouter.ai/api/v1
OPENAI_MODEL=                      # optional fallback for generic invokeLLM calls.

# Assessment model routing is hardcoded in app/server/routers.ts:
# - Candidate Pine AI chat: google/gemini-3.5-flash
# - Assessment grading: anthropic/claude-opus-4.8

# Object storage (Cloudflare R2) — REQUIRED for PDF/material features
R2_BUCKET=pine-materials
R2_REGION=auto
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_ENDPOINT=                       # https://<account-id>.r2.cloudflarestorage.com

# Email (Resend)
RESEND_API_KEY=
RESEND_FROM="Pine Finance <noreply@your-verified-domain>"   # domain must be verified in Resend

# URLs
APP_URL=http://localhost:3000      # used for report links in emails
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# Optional
OWNER_OPEN_ID=
# Legacy (no longer used by the assessment flow; storage is Cloudflare R2 now):
# BUILT_IN_FORGE_API_URL / BUILT_IN_FORGE_API_KEY / NEXT_PUBLIC_FRONTEND_FORGE_*
```

## Database Setup

```bash
pnpm next dev
```

No migration command is required. The app creates indexes at runtime when the first DB connection is opened. In MongoDB Atlas, create the cluster/database yourself, add `MONGODB_URI` and `MONGODB_DB` to Vercel, and the collections will be created on first insert.

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
