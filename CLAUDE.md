# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Critical: pending fixes before first feature

The scaffold ran as `.bootstrap-scaffold` internally. Three references need renaming before any schema migration:

- `package.json` → `"name": ".bootstrap-scaffold"` should be `"brain-dump"`
- `src/server/db/schema.ts` → `createTable` prefix is `.bootstrap-scaffold_${name}` — change to `brain-dump_${name}`
- `drizzle.config.ts` → `tablesFilter: [".bootstrap-scaffold_*"]` — change to `["brain-dump_*"]`

Auth (FR-001) is in the PRD but **not in the scaffold** — `next-auth` is not installed. Wire it before implementing any protected route or `protectedProcedure`.

**Hard stop:** Skills must not write to `context/archive/`. Archived changes are immutable; if a resolved target path starts with `context/archive/`, abort with: "This change is archived. Open a new change with `/10x-new` instead."

## Commands

```
npm run dev          # Next.js dev server (Turbo mode), localhost:3000
npm run build        # production build
npm run typecheck    # tsc --noEmit
npm run check        # Biome lint + format check (read-only)
npm run check:write  # Biome auto-fix (safe transforms)
npm run db:push      # push schema to DB without migrations (proto/dev)
npm run db:generate  # generate migration SQL from schema diff
npm run db:migrate   # run pending migrations
npm run db:studio    # Drizzle Studio GUI at localhost:4983
```

No test runner is configured. `npm run typecheck && npm run check` is the CI-equivalent gate.

## Architecture

**Stack**: Next.js 15 App Router · tRPC v11 · Drizzle ORM · SQLite (libsql) · Tailwind v4 · Biome

### Data layer

`src/server/db/schema.ts` — all Drizzle table definitions. Tables are namespaced via `sqliteTableCreator` (multi-project schema pattern). `src/server/db/index.ts` — the singleton db client, imported as `db` in tRPC context.

`DATABASE_URL` must be a libsql-compatible URL (`file:./db.sqlite` for local, a Turso URL for prod). Defined in `src/env.js` — add new env vars there AND in `runtimeEnv`, not in `process.env` directly.

### API layer (tRPC)

`src/server/api/trpc.ts` — context shape (`db` + `headers`), procedure definitions. Currently only `publicProcedure`. Add `protectedProcedure` here (with session guard) once NextAuth is wired.

`src/server/api/routers/` — one file per domain. Register each router in `src/server/api/root.ts` under `appRouter`.

### tRPC usage in components

Two distinct import paths — do not mix them:

- **Server Components (RSC)**: `import { api, HydrateClient } from "~/trpc/server"` — call procedures directly (`await api.router.proc(input)`). Prefetch with `void api.router.proc.prefetch()` then wrap the tree in `<HydrateClient>`.
- **Client Components**: `import { api } from "~/trpc/react"` — use React Query hooks (`api.router.proc.useQuery()`, `.useMutation()`).

### Path alias

`~` resolves to `src/` (configured in `tsconfig.json`). Always use `~/` imports within `src/`, never relative `../../`.

<!-- BEGIN @przeprogramowani/10x-cli -->

## 10xDevs AI Toolkit - Module 2, Lesson 2

Turn one roadmap item into the first implementation cycle with the **change planning chain**:

```
/10x-roadmap -> /10x-new -> /10x-plan -> /10x-plan-review -> /10x-implement
```

`/10x-new`, `/10x-plan`, `/10x-plan-review`, and `/10x-implement` are the lesson focus. `/10x-frame` and `/10x-research` are not required rituals here; they are escalation paths introduced in the next lesson.

### Task Router - Where to start

| Skill | Use it when |
| --- | --- |
| **Change setup (lesson focus)** | |
| `/10x-new <change-id>` | You selected a roadmap item and need a stable change folder. Creates `context/changes/<change-id>/change.md` so planning, implementation, progress, commits, and later review all share one identity. Use AFTER roadmap selection, BEFORE `/10x-plan`. |
| **Planning (lesson focus)** | |
| `/10x-plan <change-id>` | You have a change folder and need a reviewable implementation plan. Reads roadmap context, foundation docs, codebase evidence, and any existing change notes; writes `plan.md` and `plan-brief.md` with phases, file contracts, success criteria, and `## Progress`. |
| **Plan readiness (lesson focus)** | |
| `/10x-plan-review <change-id>` | You have `plan.md` and need a light pre-code readiness check. Use it to catch missing end state, weak contracts, malformed progress, scope drift, or blind spots before code changes begin. |
| **Implementation (lesson focus)** | |
| `/10x-implement <change-id> phase <n>` | You have an approved plan and want to execute one phase with verification, manual gate, commit ritual, and SHA write-back to `## Progress`. |
| **Lifecycle closure** | |
| `/10x-archive <change-id>` | A change is merged or intentionally closed. Move it out of active `context/changes/` into archive state. |

### How the chain hands off

- `/10x-new` creates the durable change identity.
- `/10x-plan` turns that identity into an implementation contract.
- `/10x-plan-review` checks the plan before the agent mutates code.
- `/10x-implement` executes one planned phase, verifies, asks for manual confirmation when needed, commits, and records progress.

### Lesson boundaries

- Plan is the default router after roadmap selection. Start with `/10x-plan` unless the problem is unclear or external evidence is blocking.
- Do not run `/10x-frame + /10x-research` as ceremony for every change.
- Do not turn this lesson into a full end-to-end product build. A checkpoint with a planned and partially or fully implemented stream is valid.
- Code review of the implemented diff belongs to Lesson 3 via `/10x-impl-review`.
- Lifecycle closure via `/10x-archive` after a change is merged or intentionally closed.

### Paths used by this lesson

- `context/foundation/roadmap.md` - upstream roadmap
- `context/changes/<change-id>/change.md` - change identity
- `context/changes/<change-id>/plan.md` - implementation contract
- `context/changes/<change-id>/plan-brief.md` - compressed handoff
- `context/foundation/lessons.md` - recurring rules and pitfalls
- `docs/reference/contract-surfaces.md` - load-bearing names registry

Skills must not write to `context/archive/`. Archived changes are immutable; if a resolved target path starts with `context/archive/`, abort with: "This change is archived. Open a new change with `/10x-new` instead."

<!-- END @przeprogramowani/10x-cli -->
