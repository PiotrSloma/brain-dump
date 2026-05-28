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

## 10xDevs AI Toolkit - Module 2, Lesson 3

Review AI-generated code before merge with the **implementation review chain**:

```
/10x-implement -> /10x-impl-review -> triage -> (/10x-lesson | fix | skip | disagree)
```

`/10x-impl-review` is the lesson focus. Review is a quality gate, not an instruction to fix every finding.

### Task Router - Where to start

| Skill | Use it when |
| --- | --- |
| **Code review (lesson focus)** | |
| `/10x-impl-review <change-id>` | You have implemented code and want a structured review before merge. The skill checks plan adherence, scope discipline, safety and quality, architecture, pattern consistency, and success criteria, then presents findings for triage. |
| **Recurring lesson outcome** | |
| `/10x-lesson` | A finding reveals a recurring project rule or agent failure pattern. Record it in `context/foundation/lessons.md` instead of treating it as a one-off note. |

### Triage discipline

- Severity says how bad the finding is. Impact says how much the decision matters now.
- Valid outcomes: fix now, fix differently, skip, accept as risk, record as recurring rule (`/10x-lesson`), disagree.
- Fix critical findings. Do not burn hours on low-impact observations just because the agent found them.
- Conscious skipping of low-impact findings is a valid review outcome, not negligence.
- If you disagree with a finding, record why. Wrong agent reasoning is also signal.

### Review boundaries

- This lesson reviews implemented code. It does not create the plan, execute new phases, or teach CI review.
- Testing strategy and quality gates are introduced in Module 3.
- Do not use `/10x-contract` as a triage outcome in this lesson.

### Paths used by this lesson

- `context/changes/<change-id>/plan.md` - expected implementation contract
- `context/changes/<change-id>/reviews/` - review output
- `context/foundation/lessons.md` - recurring lessons

Skills must not write to `context/archive/`. Archived changes are immutable; if a resolved target path starts with `context/archive/`, abort with: "This change is archived. Open a new change with `/10x-new` instead."

<!-- END @przeprogramowani/10x-cli -->
