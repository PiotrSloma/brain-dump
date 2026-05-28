# F-02 Domain Schema — Plan Brief

> Full plan: `context/changes/f-02-domain-schema/plan.md`

## What & Why

Replace the T3 scaffold `posts` table with the two BrainDump domain tables: `entries` (user thoughts) and `categories` (AI-assigned labels). This is the last Foundation item needed before S-01 (Capture + instant view) can be built — without domain tables there's nowhere to store entries.

## Starting Point

The scaffold has a single `brain-dump_post` table. Three demo files import from `posts` (`post.ts` router, `root.ts`, `page.tsx`/`post.tsx` component). `drizzle.config.ts` is already correct and needs no changes.

## Desired End State

`schema.ts` exports `entries` and `categories`. All four demo files/references removed. Typecheck passes. Turso DB has `brain-dump_entry` and `brain-dump_category` tables. S-01 can start immediately.

## Key Decisions Made

| Decision | Choice | Why |
|---|---|---|
| `userId` type | `text` (email string) | No users table needed at MVP — `session.user.email` is stable enough at single-user scale |
| `categoryId` in entries | Nullable FK to categories | Entries start unassigned; AI populates the field async — FR-004 guardrail |
| Demo cleanup scope | Full removal (router, root, page, component) | Deleting `posts` breaks typecheck in 4 places; stub-and-leave is worse than clean delete |
| page.tsx | Minimal placeholder | F-01 Phase 2 owns the real home shell; this phase just needs the file to compile |
| Migration vs push | `db:push` | Prototype phase; no migration file history needed yet |

## Scope

**In scope:**
- `src/server/db/schema.ts` — replace posts with entries + categories
- `src/server/api/routers/post.ts` — delete
- `src/server/api/root.ts` — remove postRouter
- `src/app/page.tsx` — minimal placeholder
- `src/app/_components/post.tsx` — delete
- `npm run db:push` — apply to Turso

**Out of scope:**
- Domain tRPC routers (`entries.*`, `categories.*`) — S-01
- Login page / home shell — F-01 Phase 2
- `drizzle.config.ts` — already correct, no change needed
- Any AI classification logic — S-02

## Architecture / Approach

Two-phase split: Phase 1 is a single commit (schema + cleanup) so typecheck never breaks mid-change. Phase 2 is the live db:push behind a manual gate (requires `.env` with valid Turso credentials).

Schema design: `categories` → `entries` (FK). Both tables carry `userId text` (stores email) for future multi-user without a users table. `categoryId` is nullable so entries can exist in the "unassigned" state.

## Phases at a Glance

| Phase | What it delivers | Key risk |
|---|---|---|
| 1. Schema + Demo Cleanup | schema.ts with domain tables; typecheck green; demo files removed | page.tsx must compile cleanly — minimal placeholder required |
| 2. DB Push | Turso has the new tables; old posts table dropped | Drizzle prompt confirms destructive drop — scaffold data only, safe to accept |

**Prerequisites:** `.env` with valid `DATABASE_URL` + `TURSO_AUTH_TOKEN` (already set from F-01)  
**Estimated effort:** ~1 session, 2 phases

## Open Risks & Assumptions

- `db:push` will prompt to confirm dropping `brain-dump_post` — this is expected; the table contains only scaffold data
- page.tsx placeholder must not import anything from the post router path — verify after edit

## Success Criteria (Summary)

- `npm run typecheck && npm run check` pass with no errors after Phase 1
- `npm run db:studio` shows `brain-dump_category` and `brain-dump_entry` after Phase 2
- S-01 can begin without any blockers from the data layer
