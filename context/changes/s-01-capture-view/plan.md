# S-01 Capture + Instant View — Implementation Plan

## Overview

Deliver the first user-facing feature: a capture textarea at the top of the home page and a live list of entries below it. Pressing Enter saves an entry immediately (optimistic UI — entry appears before the server responds). No AI classification yet; all entries show "nieprzypisana" placeholder.

FRs delivered: FR-003 (Enter = submit, Shift+Enter = new line), FR-004 (always saved), FR-006 (partial — flat list without grouping).

## Current State Analysis

F-01 (auth) and F-02 (schema) are complete. The app:
- Has `entries` and `categories` tables in Turso
- Has `protectedProcedure` in `src/server/api/trpc.ts`
- Has an empty `appRouter` in `src/server/api/root.ts` (no domain routers yet)
- Has `TRPCReactProvider` wrapping `layout.tsx` — Client Components can use `api.x.y.useQuery()` immediately
- Has a `@ts-expect-error` in `src/trpc/server.ts` suppressing a structural type quirk on the empty router; adding procedures to `appRouter` resolves it
- Home page (`src/app/page.tsx`) shows a bare "Zalogowano jako {email}" shell from F-01 Phase 2

## Desired End State

Home page shows a textarea at the top. Typing and pressing Enter:
1. Clears the textarea immediately
2. Adds the entry at the top of the list (optimistic, before server responds)
3. Persists to Turso via `entries.create` mutation
4. On error: restores the textarea text, removes the optimistic entry, shows inline error

Each entry in the list shows: full content, gray "nieprzypisana" chip, hybrid timestamp ("dziś o 18:21" / "wczoraj o 10:43" / "27.05.2026 o 22:14").
Empty state shows a short prompt. List shows last 50 entries, `createdAt DESC`.

`npm run typecheck` and `npm run check` pass. `@ts-expect-error` removed from `src/trpc/server.ts`.

### Key Discoveries

- `src/trpc/react.tsx:25` — `api = createTRPCReact<AppRouter>()` is the client-side handle; `api.useUtils()` provides `setData` / `cancel` / `invalidate` for optimistic update
- `src/trpc/server.ts:28` — `@ts-expect-error` on `createHydrationHelpers` will self-resolve when `appRouter` is non-empty; must be removed after Phase 1 lands
- `src/app/layout.tsx:25` — `TRPCReactProvider` already wraps the app; no changes to layout needed
- `src/server/db/schema.ts` — `entries.categoryId` is nullable; `entries.createdAt` is `integer({ mode: "timestamp" })` — Drizzle returns it as `Date` in query results
- `src/server/api/trpc.ts:116` — `ctx.userId` is typed `string` (non-nullable) inside `protectedProcedure` — safe to use directly in `.values()`

## What We're NOT Doing

- No AI classification — category is always null (displayed as "nieprzypisana"); S-02 handles this
- No category grouping in the view — flat list sorted by time; S-02 adds grouping
- No pagination or infinite scroll — hard limit of 50 entries; S-03 revisits this
- No edit or archive — S-03 scope
- No `date-fns` or external date library — timestamp formatted with a small inline utility
- No changes to `layout.tsx`, `globals.css`, or auth flow

## Implementation Approach

Two phases ordered so typecheck never breaks between them.

**Phase 1** creates the backend: `entries.ts` router with `list` and `create`, wires it into `root.ts`, removes the now-obsolete `@ts-expect-error` from `src/trpc/server.ts`. At the end of Phase 1 typecheck must pass and the pragma is gone.

**Phase 2** creates the UI: `CaptureFeed` Client Component (textarea + optimistic list), updates `page.tsx` to RSC shell with prefetch + `HydrateClient`. Manual test verifies the full flow end-to-end on the dev server.

## Critical Implementation Details

**Optimistic update ID collision:** Use `id: -Date.now()` for the temp entry. The `entries.id` column is `autoIncrement` (positive integers), so negative IDs never collide. On `onSettled`, `invalidate()` replaces the temp entry with the real one from the server.

**Textarea `onKeyDown` guard:** `e.key === "Enter" && !e.shiftKey && !isPending` — the `isPending` guard prevents double-submit while the mutation is in-flight.

**`entries.list` query input:** No input parameter — query relies solely on `ctx.userId`. React Query cache key is `[["entries", "list"], { type: "query" }]`. `setData(undefined, updater)` matches this key correctly (pass `undefined` as input when the procedure takes no input).

---

## Phase 1: Entries tRPC Router

### Overview

Create `src/server/api/routers/entries.ts` with `list` and `create` procedures. Register in `root.ts`. Remove the `@ts-expect-error` pragma from `src/trpc/server.ts` (it self-resolves once `appRouter` is non-empty). After this phase the app has a working backend with no frontend changes.

### Changes Required

#### 1. Create entries router

**File**: `src/server/api/routers/entries.ts`

**Intent**: Define two protectedProcedures — `list` returns the last 50 entries for the authenticated user; `create` inserts a new entry and returns the created row.

**Contract**:

- `list`: no input; queries `entries` table filtered by `eq(entries.userId, ctx.userId)`, ordered `desc(entries.createdAt)`, limit 50. Returns the row array.
- `create`: input `z.object({ content: z.string().min(1).max(2000) })`; inserts `{ userId: ctx.userId, content: input.content.trim() }` (categoryId defaults to null); returns the inserted row via `.returning()`.
- Import `{ entries }` from `~/server/db/schema`; import `{ desc, eq }` from `drizzle-orm`.
- Export as `export const entriesRouter = createTRPCRouter({ list, create })`.

#### 2. Register entries router in appRouter

**File**: `src/server/api/root.ts`

**Intent**: Add `entries: entriesRouter` to the `createTRPCRouter({})` call so the procedure appears in `AppRouter`.

**Contract**: Import `entriesRouter` from `~/server/api/routers/entries`. Add `entries: entriesRouter` as the single key in the router object.

#### 3. Remove @ts-expect-error from trpc/server.ts

**File**: `src/trpc/server.ts`

**Intent**: The `@ts-expect-error` pragma added in F-01 Phase 3 suppressed a structural type quirk caused by an empty router. Once `appRouter` has procedures, TypeScript resolves the type correctly and the pragma becomes invalid (TS2578 unused). Remove it.

**Contract**: Delete the `// @ts-expect-error — empty router…` comment line immediately before the `caller,` argument. The `export const { trpc: api, HydrateClient }` line must compile cleanly.

### Success Criteria

#### Automated Verification

- `npm run typecheck` passes with no errors
- `npm run check` passes with no errors
- `src/server/api/routers/entries.ts` exists and exports `entriesRouter`
- `src/trpc/server.ts` contains no `@ts-expect-error`

---

## Phase 2: Capture + Feed UI

### Overview

Replace the bare home shell from F-01 Phase 2 with the real capture UI. `page.tsx` becomes a thin RSC that prefetches the entry list (so the first render is hydrated, not loading). `CaptureFeed` is a Client Component that owns the textarea, the optimistic mutation, and the entry list render.

### Changes Required

#### 1. Create CaptureFeed client component

**File**: `src/app/_components/capture-feed.tsx`

**Intent**: The single interactive component for S-01. Renders a textarea at the top and the entry list below. Handles Enter-to-submit with optimistic UI and inline error recovery.

**Contract**:

- `"use client"` directive.
- Uses `api.entries.list.useQuery()` from `~/trpc/react` to read the list.
- Uses `api.entries.create.useMutation()` with:
  - `onMutate`: cancel in-flight list query (`utils.entries.list.cancel()`), snapshot previous data, prepend optimistic entry with `id: -Date.now()` to cache via `setData`, return `{ previous }` for rollback.
  - `onError`: restore previous cache from context, restore textarea content from `variables.content`, set inline error string.
  - `onSettled`: `utils.entries.list.invalidate()` to sync with server truth.
- `textarea` with `onKeyDown`: fires mutation on `Enter` without `Shift`, no-ops on `Shift+Enter`. Disabled while `isPending`.
- Each entry row: content text, gray "nieprzypisana" chip, timestamp from `formatTimestamp(entry.createdAt)`.
- Empty state: "Brak wpisów. Napisz coś…" gray text shown when list is empty.
- `formatTimestamp(date: Date): string` — inline utility returning "dziś o HH:MM", "wczoraj o HH:MM", or "DD.MM.YYYY o HH:MM" for older dates. Uses `pl-PL` locale via `Intl.DateTimeFormat`.

#### 2. Update home page to RSC shell

**File**: `src/app/page.tsx`

**Intent**: Replace the "Zalogowano jako" placeholder with the real capture shell. Keep the RSC auth check, add server-side prefetch of the entry list so the first render is pre-hydrated, then render `<CaptureFeed>` inside `<HydrateClient>`.

**Contract**: Import `{ api, HydrateClient }` from `~/trpc/server`. Call `void api.entries.list.prefetch()` before rendering (fire-and-forget in RSC). Wrap `<CaptureFeed />` in `<HydrateClient>`. Remove the "Zalogowano jako" content. Keep the `auth()` + `redirect("/login")` guard.

### Success Criteria

#### Automated Verification

- `npm run typecheck` passes with no errors
- `npm run check` passes with no errors
- `src/app/_components/capture-feed.tsx` exists

#### Manual Verification

- `npm run dev` starts without console errors
- Home page shows textarea + empty state "Brak wpisów. Napisz coś…"
- Typing text and pressing Enter: textarea clears immediately, entry appears at top of list instantly (before server)
- Pressing Shift+Enter inserts a newline in the textarea (does not submit)
- Entry shows content, "nieprzypisana" chip, timestamp "dziś o HH:MM"
- After page refresh: entry still present (persisted to Turso)
- Network throttle (Slow 3G): optimistic entry visible immediately; list syncs after server responds
- Simulated error (disconnect network): textarea restores with original text, inline error shown

---

## References

- Roadmap: `context/foundation/roadmap.md` § S-01
- PRD: `context/foundation/prd.md` § FR-003, FR-004, FR-006
- tRPC client: `src/trpc/react.tsx`
- tRPC server hydration: `src/trpc/server.ts`
- Schema: `src/server/db/schema.ts`

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Entries tRPC Router

#### Automated

- [x] 1.1 `npm run typecheck` passes — 762d836
- [x] 1.2 `npm run check` passes — 762d836
- [x] 1.3 `src/server/api/routers/entries.ts` exists and exports `entriesRouter` — 762d836
- [x] 1.4 `src/trpc/server.ts` contains no `@ts-expect-error` — 762d836

### Phase 2: Capture + Feed UI

#### Automated

- [x] 2.1 `npm run typecheck` passes
- [x] 2.2 `npm run check` passes
- [x] 2.3 `src/app/_components/capture-feed.tsx` exists

#### Manual

- [x] 2.4 `npm run dev` starts without console errors
- [x] 2.5 Home page shows textarea + empty state
- [x] 2.6 Enter submits, entry appears instantly (optimistic)
- [x] 2.7 Shift+Enter inserts newline, does not submit
- [x] 2.8 Entry shows content, "nieprzypisana" chip, timestamp
- [x] 2.9 After page refresh entry is still present (persisted)
- [x] 2.10 Simulated error: textarea restores text, inline error shown
