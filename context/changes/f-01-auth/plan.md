# Auth Scaffold (F-01) Implementation Plan

## Overview

Wire Auth.js v5 (next-auth@beta) with a Credentials provider (email + password) into the T3 scaffold. No users table — single user's credentials live in env vars. After this change every app route requires authentication, tRPC exposes `protectedProcedure`, and the T3 demo content is removed leaving a clean baseline for S-01.

## Current State Analysis

- `next-auth` is not installed (`package.json` has no auth dependency)
- `src/server/api/trpc.ts` — context is `{ db, headers }`; only `publicProcedure` exists
- `src/trpc/server.ts` — context created from `next/headers()` only; no session
- No `middleware.ts`, no `src/app/api/auth/` route
- `src/env.js` — validates `DATABASE_URL`, `TURSO_AUTH_TOKEN`, `NODE_ENV` only
- `src/app/page.tsx` — T3 demo page referencing `post.hello` and `LatestPost`
- `src/server/api/routers/post.ts` — T3 demo router (hello/create/getLatest)

## Desired End State

- Navigating to any route while unauthenticated redirects to `/login`
- `/login` accepts email + password; successful auth redirects to `/`
- Wrong credentials show an inline error on the login page (no redirect)
- All domain tRPC procedures use `protectedProcedure`; unauthenticated calls get `TRPCError('UNAUTHORIZED')`
- `ctx.userId` (string, from `session.user.email`) is available in every protected procedure
- T3 demo code (post router, post component, demo page) is removed; `/` shows a bare "logged in as {email}" shell
- `npm run typecheck` and `npm run check` pass clean

### Key Discoveries

- `src/trpc/server.ts:15` — `createContext` is wrapped in React `cache()` — per-request, so calling `auth()` inside `createTRPCContext` gives the correct session per request without leaking across users
- `src/app/api/trpc/[trpc]/route.ts` — tRPC HTTP handler; `createTRPCContext` is called here from a Next.js Route Handler, so `auth()` from Auth.js v5 can read cookies via Next.js's request context
- Auth.js v5 does **not** need `SessionProvider` in `layout.tsx` when using Server Components and Server Actions; skip it
- `src/env.js` uses `@t3-oss/env-nextjs` with Zod — add new vars to `server:` and `runtimeEnv:` exactly as existing vars are structured

## What We're NOT Doing

- No `users` DB table — credentials are env vars only (adding a users table is F-02 scope if needed later)
- No OAuth providers (Google, GitHub, etc.)
- No public registration — single user, credentials seeded via env vars
- No `SessionProvider` in `layout.tsx` — not needed for this MVP (no `useSession()` calls)
- No role-based access control — it's "logged in / not logged in" only
- No email verification, password reset, or account management UI
- No test suite — `npm run typecheck && npm run check` is the CI gate

## Implementation Approach

Three phases, ordered so the app is never in an unrecoverable broken state:

1. **Core engine** — install deps, add env vars, create `src/auth.ts` (Credentials provider + bcrypt), create the Auth.js route handler. At the end of this phase auth works mechanically but no routes are protected.
2. **Login page + bare shell** — create the login page, replace the T3 demo home page with a bare shell that confirms auth works. At the end the user can log in and see their email.
3. **Route protection + tRPC** — add `middleware.ts` to redirect unauthenticated requests to `/login`, add `protectedProcedure` to tRPC, remove the demo router and component. At the end all routes are locked down and tRPC is ready for domain procedures.

## Critical Implementation Details

**Auth.js v5 Credentials `authorize` callback receives `unknown` typed credentials.** Parse with Zod inside `authorize` before accessing `.email` / `.password` — do not cast to `any`.

**Password hash must be pre-generated and stored in `ADMIN_PASSWORD_HASH`.** The implementer must run `node -e "const b = require('bcryptjs'); console.log(b.hashSync('YOUR_PASS', 12))"` locally to produce the hash, then put it in `.env` and Vercel env vars. The plan does not store the plaintext password anywhere.

**NEXTAUTH_URL trap on Vercel preview deploys** (documented in `context/foundation/infrastructure.md`). After deploying, add `NEXTAUTH_URL=https://<your-production-domain>` to Vercel **Production** scope. For Preview, either set it per-branch or accept that OAuth callbacks may fail on preview URLs (Credentials-only auth is unaffected since there is no redirect_uri check).

---

## Phase 1: Core Auth Engine

### Overview

Install `next-auth@beta` and `bcryptjs`, register the three new env vars, create `src/auth.ts` with the Credentials provider, and create the Auth.js route handler. No routes are protected yet.

### Changes Required

#### 1. Install dependencies

**File**: `package.json`

**Intent**: Add `next-auth@beta` (Auth.js v5), `bcryptjs` (pure-JS bcrypt — no native bindings needed on Vercel), and `@types/bcryptjs` as devDependency.

**Contract**: Run `npm install next-auth@beta bcryptjs` and `npm install -D @types/bcryptjs`. Verify `next-auth` appears in `dependencies` in `package.json`.

#### 2. Register env vars

**File**: `src/env.js`

**Intent**: Expose `AUTH_SECRET`, `ADMIN_EMAIL`, and `ADMIN_PASSWORD_HASH` to the app through the validated env schema so they're type-safe everywhere.

**Contract**: Add all three to the `server:` block (Zod string, all required). Add all three to `runtimeEnv:` mapped to `process.env.AUTH_SECRET`, etc. Follow the exact pattern of the existing `DATABASE_URL` entry.

#### 3. Add env vars to local .env

**File**: `.env`

**Intent**: Provide local dev values for the three new vars so `npm run dev` works.

**Contract**:
- `AUTH_SECRET` — generate with `openssl rand -base64 32`
- `ADMIN_EMAIL` — your login email
- `ADMIN_PASSWORD_HASH` — bcrypt hash of your password (rounds=12); generate with `node -e "const b = require('bcryptjs'); console.log(b.hashSync('YOUR_PASS', 12))"`

Do not commit `.env`.

#### 4. Create Auth.js config

**File**: `src/auth.ts`

**Intent**: Define the Auth.js v5 configuration — Credentials provider that validates email against `env.ADMIN_EMAIL` and password against `env.ADMIN_PASSWORD_HASH` using bcrypt, then export `{ handlers, auth, signIn, signOut }`.

**Contract**: The module exports four named exports from `NextAuth({...})`. The `authorize` callback: (a) parses credentials with Zod `z.object({ email: z.string().email(), password: z.string() })`; (b) compares `bcryptjs.compareSync(password, env.ADMIN_PASSWORD_HASH)` and checks `email === env.ADMIN_EMAIL`; (c) returns `{ id: env.ADMIN_EMAIL, email: env.ADMIN_EMAIL }` on success or `null` on failure. Session strategy: `"jwt"` (no DB adapter needed since there is no users table). Pages: `{ signIn: "/login" }`.

#### 5. Create Auth.js route handler

**File**: `src/app/api/auth/[...nextauth]/route.ts`

**Intent**: Mount the Auth.js HTTP handler at `/api/auth/*` so sign-in, sign-out, and CSRF token endpoints are available.

**Contract**: Import `handlers` from `~/auth`, re-export as `{ GET, POST }`. Standard Auth.js v5 App Router pattern — four lines maximum.

### Success Criteria

#### Automated Verification

- `npm install` completes without errors
- `npm run typecheck` passes with no new errors
- `npm run check` passes (Biome lint + format)
- `src/auth.ts` and `src/app/api/auth/[...nextauth]/route.ts` exist

#### Manual Verification

- `curl -s http://localhost:3000/api/auth/providers` returns JSON containing `credentials` provider
- `npm run dev` starts without errors

---

## Phase 2: Login Page + Home Shell

### Overview

Create the `/login` page with an email+password form that calls `signIn`. Replace the T3 demo `page.tsx` with a minimal server-rendered shell that shows the logged-in user's email (or redirects to login if somehow reached unauthenticated — the middleware in Phase 3 will enforce this, but it's good practice).

### Changes Required

#### 1. Create login page

**File**: `src/app/login/page.tsx`

**Intent**: Render a full-page login form. On submit, call Auth.js `signIn('credentials', ...)`. Show an inline error message when credentials are wrong. On success, redirect to `/`.

**Contract**: Client Component (`"use client"`). Use `useState` for the error string. On form submit: call `signIn('credentials', { email, password, redirect: false })` from `next-auth/react`, check the returned `error` field; if truthy, set error state. If no error, `router.push('/')`. The form has two `<input>` fields (email, password) and a submit button. Tailwind only — no component library. Mobile-first layout.

**Critical**: `next-auth/react`'s client-side `signIn` with `redirect: false` does **not** require `SessionProvider` in the root layout — it communicates via fetch to the `/api/auth` route. Do not add `SessionProvider` to `layout.tsx`.

#### 2. Replace home page

**File**: `src/app/page.tsx`

**Intent**: Replace the T3 demo home page with a bare shell that confirms auth works. Shows the authenticated user's email. This will be fully replaced again in S-01.

**Contract**: Server Component. Call `auth()` from `~/auth` to get the session. If `!session?.user`, redirect to `/login` (defensive; middleware should have already blocked unauthenticated access). Render a `<main>` with "BrainDump" heading and "Zalogowano jako {session.user.email}" text. Remove all imports of `LatestPost`, `api`, `HydrateClient` from the demo.

### Success Criteria

#### Automated Verification

- `npm run typecheck` passes
- `npm run check` passes
- `src/app/login/page.tsx` exists

#### Manual Verification

- Navigate to `http://localhost:3000/login` — login form renders
- Submit wrong credentials — inline error message appears (no redirect, no page reload)
- Submit correct credentials — redirect to `/` and see "Zalogowano jako {email}"
- Sign out via `http://localhost:3000/api/auth/signout` — works

---

## Phase 3: Route Protection + tRPC + Demo Cleanup

### Overview

Lock down all routes with `middleware.ts`, add `protectedProcedure` to tRPC, and remove the T3 demo router/component. After this phase the app is fully auth-gated and the tRPC surface is clean for domain procedures.

### Changes Required

#### 1. Create Next.js middleware

**File**: `middleware.ts` (project root, next to `src/`)

**Intent**: Redirect any unauthenticated request (except `/login` and `/api/auth/*`) to `/login`.

**Contract**: Export the `auth` function from `~/auth` as the default middleware. Export a `config` object with `matcher` that excludes `/login`, `/api/auth/(.*)`, `/_next/(.*)`, and `/favicon.ico`. Auth.js v5 middleware pattern: when the session is absent, Auth.js automatically redirects to the `pages.signIn` URL (`/login`) configured in `src/auth.ts`.

```typescript
export { auth as default } from "~/auth"

export const config = {
  matcher: ["/((?!login|api/auth|_next/static|_next/image|favicon.ico).*)"],
}
```

#### 2. Add session to tRPC context

**File**: `src/server/api/trpc.ts`

**Intent**: Pull the Auth.js session into the tRPC context so procedures can read `ctx.userId` and `ctx.session`.

**Contract**: Import `auth` from `~/auth`. Inside `createTRPCContext`, call `const session = await auth()` and add `session` and `userId: session?.user?.email ?? null` to the returned context object. The `headers` field stays as-is. The context type inferred by TypeScript will automatically include `session` and `userId`.

#### 3. Add protectedProcedure

**File**: `src/server/api/trpc.ts`

**Intent**: Export a `protectedProcedure` that throws `UNAUTHORIZED` when no session exists, ensuring domain procedures can never be called unauthenticated.

**Contract**: After `publicProcedure`, add:

```typescript
const enforceUserIsAuthed = t.middleware(({ ctx, next }) => {
  if (!ctx.session?.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" })
  }
  return next({ ctx: { ...ctx, userId: ctx.session.user.email! } })
})

export const protectedProcedure = t.procedure
  .use(timingMiddleware)
  .use(enforceUserIsAuthed)
```

`userId` is re-typed as `string` (non-nullable) inside `enforceUserIsAuthed`'s `next()` call so downstream procedures get a guaranteed string, not `string | null`.

#### 4. Remove post router

**File**: `src/server/api/root.ts`

**Intent**: Unregister the T3 demo `postRouter` so it no longer appears in `AppRouter`.

**Contract**: Remove the `post: postRouter` entry from the `appRouter` definition. Remove the `postRouter` import.

#### 5. Delete demo files

**Files**:
- `src/server/api/routers/post.ts` — delete
- `src/app/_components/post.tsx` — delete

**Intent**: Remove T3 demo code that is no longer referenced.

**Contract**: Both files can be deleted. `src/app/_components/` may become empty — leave the directory; S-01 will add components there.

### Success Criteria

#### Automated Verification

- `npm run typecheck` passes with no errors
- `npm run check` passes
- `middleware.ts` exists at project root

#### Manual Verification

- Open a private/incognito window and navigate to `http://localhost:3000` — redirected to `/login`
- Log in — redirected to `/` and see "Zalogowano jako {email}"
- Navigate directly to `http://localhost:3000/login` while logged in — Auth.js redirects back to `/` (or stays, depending on `callbackUrl` behavior — acceptable either way for MVP)
- Confirm `/api/auth/providers` still returns `{ credentials: {...} }` (unprotected by middleware matcher)
- Verify no TypeScript errors in `src/server/api/trpc.ts` after adding `protectedProcedure`

#### Env vars on Vercel (manual gate)

- Add `AUTH_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD_HASH` to Vercel **Production** and **Preview** scopes
- Add `NEXTAUTH_URL=https://<production-domain>` to **Production** scope
- Trigger a deploy and verify the production app requires login

---

## Testing Strategy

No test runner configured. The verification gate is:

```bash
npm run typecheck && npm run check
```

### Manual Testing Steps

1. `npm run dev` — app starts, no errors in terminal
2. Private window → `http://localhost:3000` → lands on `/login`
3. Wrong credentials → inline error, stays on `/login`
4. Correct credentials → lands on `/` with email shown
5. `/api/auth/signout` → signs out, back to `/login` on next navigation
6. `curl http://localhost:3000/api/auth/providers` → returns credentials JSON (unblocked by middleware)

## References

- Roadmap Foundation item: `context/foundation/roadmap.md` § F-01
- Infrastructure risk (NEXTAUTH_URL): `context/foundation/infrastructure.md` § Risk Register
- Auth.js v5 docs: https://authjs.dev/getting-started/installation
- T3 + Auth.js guide: https://create.t3.gg/en/usage/next-auth

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Core Auth Engine

#### Automated

- [ ] 1.1 `npm install` completes without errors
- [ ] 1.2 `npm run typecheck` passes with no new errors
- [ ] 1.3 `npm run check` passes
- [ ] 1.4 `src/auth.ts` and `src/app/api/auth/[...nextauth]/route.ts` exist

#### Manual

- [ ] 1.5 `curl -s http://localhost:3000/api/auth/providers` returns credentials JSON
- [ ] 1.6 `npm run dev` starts without errors

### Phase 2: Login Page + Home Shell

#### Automated

- [ ] 2.1 `npm run typecheck` passes
- [ ] 2.2 `npm run check` passes
- [ ] 2.3 `src/app/login/page.tsx` exists

#### Manual

- [ ] 2.4 Login form renders at `/login`
- [ ] 2.5 Wrong credentials show inline error (no redirect)
- [ ] 2.6 Correct credentials redirect to `/` with email shown

### Phase 3: Route Protection + tRPC + Demo Cleanup

#### Automated

- [ ] 3.1 `npm run typecheck` passes with no errors
- [ ] 3.2 `npm run check` passes
- [ ] 3.3 `middleware.ts` exists at project root

#### Manual

- [ ] 3.4 Incognito window to `/` redirects to `/login`
- [ ] 3.5 Login works end-to-end after middleware active
- [ ] 3.6 `/api/auth/providers` accessible without auth
- [ ] 3.7 Vercel env vars added (AUTH_SECRET, ADMIN_EMAIL, ADMIN_PASSWORD_HASH, NEXTAUTH_URL)
- [ ] 3.8 Production deploy works with auth
