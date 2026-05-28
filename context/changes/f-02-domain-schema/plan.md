# F-02 Domain Schema — Implementation Plan

## Overview

Replace the T3 scaffold `posts` table with the two BrainDump domain tables (`entries`, `categories`). Remove all demo scaffolding that imports from `posts` so typecheck stays green. Then push the schema to Turso.

## Current State Analysis

The scaffold has one table (`brain-dump_post`) and a demo post router wired into the T3 home page. Three things reference `posts` from `schema.ts`:

- `src/server/api/routers/post.ts` — imports `{ posts }` directly; will break on deletion
- `src/server/api/root.ts` — registers `postRouter`
- `src/app/page.tsx` — calls `api.post.hello` and renders `<LatestPost>` from `_components/post.tsx`
- `src/app/_components/post.tsx` — queries `api.post.getLatest`

`drizzle.config.ts` is already correct (`tablesFilter: ["brain-dump_*"]`, `authToken` wired). No migrations to run — we use `db:push` throughout the prototype phase.

## Desired End State

`src/server/db/schema.ts` exports `entries` and `categories` (no `posts`). All demo scaffolding removed. `npm run typecheck` and `npm run check` pass. Turso DB contains `brain-dump_entry` and `brain-dump_category` tables. `npm run db:studio` shows both tables with the correct columns.

### Key Discoveries

- `drizzle.config.ts` already has `authToken: env.TURSO_AUTH_TOKEN` and the correct `tablesFilter` — no changes needed
- `createTable` uses the `brain-dump_` prefix — tables land as `brain-dump_entry`, `brain-dump_category`
- `userId` in both tables stores `session.user.email` (text) — no FK to a users table at MVP scale
- `categoryId` in `entries` is nullable — entries start as unassigned until AI classifies them (FR-004 guardrail)
- `page.tsx` must compile after `_components/post.tsx` is deleted; a minimal placeholder is enough for now (F-01 Phase 2 will replace it with the real login-aware home shell)

## What We're NOT Doing

- No users table — userId is plain text (session email) per the roadmap decision
- No migration files — `db:push` is the protocol for the prototype phase
- No domain tRPC routers (`entries.*`, `categories.*`) — those belong to S-01
- No changes to `drizzle.config.ts` — already correct
- No changes to `src/server/db/index.ts` — already correct

## Implementation Approach

Two phases: (1) schema + cleanup in one commit so typecheck never breaks mid-change; (2) db:push as a separate manual-gate step (requires the live `.env` with Turso credentials).

---

## Phase 1: Schema + Demo Cleanup

### Overview

Delete `posts` from `schema.ts`, add `categories` and `entries`. Remove the four demo files/references that imported from `posts`. Replace `page.tsx` with a minimal placeholder that compiles cleanly.

### Changes Required

#### 1. Replace schema tables

**File**: `src/server/db/schema.ts`

**Intent**: Remove the `posts` table export and add `categories` and `entries` in its place. The `name_idx` index on posts is also deleted.

**Contract**:

```typescript
import { sql } from "drizzle-orm";
import { index, sqliteTableCreator } from "drizzle-orm/sqlite-core";

export const createTable = sqliteTableCreator((name) => `brain-dump_${name}`);

export const categories = createTable(
  "category",
  (d) => ({
    id: d.integer({ mode: "number" }).primaryKey({ autoIncrement: true }),
    userId: d.text().notNull(),
    name: d.text({ length: 100 }).notNull(),
    createdAt: d.integer({ mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
  }),
  (t) => [index("category_user_idx").on(t.userId)],
);

export const entries = createTable(
  "entry",
  (d) => ({
    id: d.integer({ mode: "number" }).primaryKey({ autoIncrement: true }),
    userId: d.text().notNull(),
    content: d.text().notNull(),
    categoryId: d.integer({ mode: "number" }).references(() => categories.id),
    createdAt: d.integer({ mode: "timestamp" }).default(sql`(unixepoch())`).notNull(),
    updatedAt: d.integer({ mode: "timestamp" }).$onUpdate(() => new Date()),
  }),
  (t) => [
    index("entry_user_idx").on(t.userId),
    index("entry_category_idx").on(t.categoryId),
  ],
);
```

The snippet is load-bearing here because the column types, nullable FK, and index names are the interface contract that Phase 2 (db:push) depends on.

#### 2. Delete post router

**File**: `src/server/api/routers/post.ts`

**Intent**: Delete the file entirely. It imports `{ posts }` which no longer exists; keeping it as a stub would leave dead code.

#### 3. Remove postRouter from appRouter

**File**: `src/server/api/root.ts`

**Intent**: Remove the `postRouter` import and the `post: postRouter` key from `createTRPCRouter({…})`. Leave the file otherwise unchanged — `createCallerFactory` and the type export are still needed.

#### 4. Replace home page with minimal placeholder

**File**: `src/app/page.tsx`

**Intent**: Replace the T3 demo content (which calls `api.post.hello`, prefetches `api.post.getLatest`, and renders `<LatestPost>`) with a minimal page that compiles cleanly. F-01 Phase 2 will implement the real login-aware home shell.

**Contract**: No imports from `~/trpc/server`, no `<HydrateClient>`, no `<LatestPost>`. A bare RSC returning a centered "BrainDump" heading is sufficient.

#### 5. Delete LatestPost component

**File**: `src/app/_components/post.tsx`

**Intent**: Delete the file entirely. It queries `api.post.getLatest` via the React hook and will be unreachable once `page.tsx` no longer imports it.

### Success Criteria

#### Automated Verification

- `npm run typecheck` passes with no errors
- `npm run check` passes with no errors
- `src/server/db/schema.ts` exports `entries` and `categories` (no `posts`)
- `src/server/api/routers/post.ts` does not exist
- `src/app/_components/post.tsx` does not exist

#### Manual Verification

- `npm run dev` starts without errors on the console

---

## Phase 2: DB Push

### Overview

Push the new schema to the live Turso database. Requires the `.env` file to have valid `DATABASE_URL` and `TURSO_AUTH_TOKEN`.

### Changes Required

#### 1. Push schema

**Intent**: Run `npm run db:push` to apply the new schema to Turso. Drizzle will detect that `brain-dump_post` needs to be dropped and `brain-dump_category` + `brain-dump_entry` need to be created. Confirm the destructive drop when prompted (the posts table is scaffold data only).

### Success Criteria

#### Automated Verification

- `npm run db:push` exits with code 0

#### Manual Verification

- `npm run db:studio` shows `brain-dump_category` and `brain-dump_entry` tables with the correct columns
- `brain-dump_post` table is gone

---

## References

- Roadmap: `context/foundation/roadmap.md` § F-02
- Drizzle multi-project schema: `src/server/db/schema.ts` (existing `createTable` pattern)
- DB client: `src/server/db/index.ts` (unchanged)

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles. See `references/progress-format.md`.

### Phase 1: Schema + Demo Cleanup

#### Automated

- [x] 1.1 `npm run typecheck` passes
- [x] 1.2 `npm run check` passes
- [x] 1.3 `schema.ts` exports `entries` and `categories`, no `posts`
- [x] 1.4 `src/server/api/routers/post.ts` deleted
- [x] 1.5 `src/app/_components/post.tsx` deleted

#### Manual

- [ ] 1.6 `npm run dev` starts without console errors

### Phase 2: DB Push

#### Automated

- [ ] 2.1 `npm run db:push` exits 0

#### Manual

- [ ] 2.2 Drizzle Studio shows `brain-dump_category` and `brain-dump_entry`
- [ ] 2.3 `brain-dump_post` table is gone
