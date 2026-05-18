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

```bash
MONGODB_URI=mongodb+srv://USER:PASSWORD@CLUSTER.mongodb.net
MONGODB_DB=pine_finance
JWT_SECRET=replace_me
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_oauth_client_id
GOOGLE_CLIENT_ID=your_google_oauth_client_id
GOOGLE_CLIENT_SECRET=your_google_oauth_client_secret
OWNER_OPEN_ID=optional_owner_open_id
APP_URL=http://localhost:3000
OPENAI_API_KEY=optional_for_llm_scoring
SMTP_HOST=optional
SMTP_PORT=587
SMTP_USER=optional
SMTP_PASS=optional
SMTP_FROM="Pine Finance <noreply@example.com>"
BUILT_IN_FORGE_API_URL=optional_storage_url
BUILT_IN_FORGE_API_KEY=optional_storage_key
NEXT_PUBLIC_FRONTEND_FORGE_API_URL=optional_maps_url
NEXT_PUBLIC_FRONTEND_FORGE_API_KEY=optional_maps_key
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
