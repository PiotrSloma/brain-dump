# Auth Scaffold (F-01) — Plan Brief

> Full plan: `context/changes/f-01-auth/plan.md`

## What & Why

Wire Auth.js v5 (Credentials provider, email + password) into the T3 scaffold so the BrainDump app is accessible only to the single authenticated user. The PRD requires email+password auth (FR-001/FR-002) even for a single-user tool — entries are private and session-gated security is the minimum standard. Every subsequent slice (S-01 through S-04) depends on auth being in place.

## Starting Point

No auth library is installed. The tRPC context contains only `{ db, headers }`, all procedures are `publicProcedure`, no middleware.ts exists, and the app currently shows the T3 demo page to anyone without restriction.

## Desired End State

Visiting any route without a session redirects to `/login`. Submitting valid credentials redirects to `/` where the user's email is shown. Wrong credentials show an inline error. The tRPC layer exposes `protectedProcedure` with `ctx.userId: string` guaranteed. The T3 demo code is gone and the repo is a clean baseline for S-01.

## Key Decisions Made

| Decision | Choice | Why |
|---|---|---|
| Credential storage | Env vars (ADMIN_EMAIL + ADMIN_PASSWORD_HASH) | No DB users table needed for single user; trivially rotatable via Vercel env update |
| Auth library | Auth.js v5 (next-auth@beta) | T3-native path; works with App Router without adapters |
| Password security | bcryptjs hash (rounds=12) | Pure JS (no native bindings), correct security for a stored secret |
| Session provider in layout | Skipped | Not needed — login form uses `signIn` via fetch; Server Components call `auth()` directly |
| Post-login redirect | Always `/` | One protected route in MVP; callbackUrl complexity adds nothing |
| Demo content | Removed in Phase 3 | Leaves a clean baseline; post router and component serve no purpose going forward |

## Scope

**In scope:**
- `next-auth@beta` + `bcryptjs` installation
- `src/auth.ts` — Credentials provider config
- `src/app/api/auth/[...nextauth]/route.ts` — Auth.js HTTP handler
- `middleware.ts` — redirect unauthenticated → `/login`
- `src/app/login/page.tsx` — email+password form with inline error
- `src/server/api/trpc.ts` — session in context + `protectedProcedure`
- `src/env.js` — AUTH_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD_HASH
- Demo removal: `post.ts` router, `post.tsx` component, demo home page

**Out of scope:**
- Users DB table (env vars are sufficient for single user)
- OAuth providers
- Public registration
- Password reset / account management
- Role-based access control
- SessionProvider in layout.tsx

## Architecture / Approach

Auth.js v5 reads session from signed JWT cookies set by the `/api/auth` route handler. Middleware reads the cookie on every request and redirects to `/login` if absent. The tRPC context calls `auth()` (a server-side session read) on each request and exposes `session` + `userId` to all procedures. `protectedProcedure` throws `UNAUTHORIZED` if `session.user` is absent. No database read is required for authentication — credentials are compared against env vars using bcrypt.

## Phases at a Glance

| Phase | What it delivers | Key risk |
|---|---|---|
| 1. Core Auth Engine | Auth.js installed, env vars, `src/auth.ts`, `/api/auth` route | `next-auth@beta` API changes; verify against current docs |
| 2. Login Page + Shell | `/login` form with error state, `/` bare shell | Client-side `signIn` error handling; test wrong-credentials path |
| 3. Route Protection + tRPC | middleware.ts locks all routes, protectedProcedure, demo removal | Middleware matcher must allow `/api/auth/*` and `/_next/*` to pass through |

**Prerequisites:** `.env` with generated AUTH_SECRET and bcrypt-hashed password; local `npm install` succeeds  
**Estimated effort:** ~1 session (2-3 hours) across 3 phases

## Open Risks & Assumptions

- `next-auth@beta` is Auth.js v5; verify the package tag still resolves to v5.x before installing (could have moved to `next-auth@latest`)
- NEXTAUTH_URL must be set in Vercel Production scope after first deploy; preview deploys don't need it for Credentials-only auth but will fail if OAuth is ever added
- `auth()` called inside `createTRPCContext` reads from Next.js's global request context — works in Route Handlers and RSC, but not in edge middleware (middleware.ts runs the `auth` export directly, not via `auth()`)

## Success Criteria (Summary)

- Incognito window to `/` redirects to `/login`
- Correct credentials log in and show "Zalogowany jako {email}" at `/`
- Wrong credentials show inline error, no redirect
- `npm run typecheck && npm run check` pass clean
