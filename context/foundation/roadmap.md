---
project: BrainDump
created: 2026-05-25
main_goal: market-feedback
north_star: "S-01 + S-02 — Capture → AI category → View (US-01 end-to-end)"
top_blocker: decisions
blocker_detail: "OQ-2 (category stabilization) must be resolved before implementing FR-005"
investment_areas:
  backend: invest deeply
  data: go simple
  frontend: go simple
  infra: go simple
---

## At a glance

| ID   | Name                          | Type        | Status   | Depends on       |
|------|-------------------------------|-------------|----------|------------------|
| F-01 | Auth scaffold                 | Foundation  | ready    | —                |
| F-02 | Domain schema                 | Foundation  | ready    | —                |
| F-03 | Resolve OQ-2: category rules  | Foundation  | blocked  | human decision   |
| S-01 | Capture + instant view        | Slice       | blocked  | F-01, F-02       |
| S-02 | AI classification             | Slice       | blocked  | S-01, F-03       |
| S-03 | Entry management              | Slice       | proposed | S-01             |
| S-04 | Prefix routing + projects     | Slice       | proposed | S-02, OQ-3       |

**Critical path:** F-01 → F-02 → S-01 → F-03 decision → S-02

F-03 and F-02 can run in parallel (F-03 is a human decision, not code).
S-03 can be built in parallel with S-02 (both depend on S-01, not on each other).

---

## Baseline

```
Frontend:      present     — Next.js 15 App Router + Tailwind v4; no component library
Backend/API:   partial     — tRPC scaffold wired; only demo routers (post.*), no domain routers
Data:          partial     — Drizzle + libsql/Turso wired; single scaffold `posts` table (not domain tables)
Auth:          absent      — no next-auth or any auth provider installed
Deploy/infra:  present     — Vercel linked, GitHub connected, auto-deploy on main; no GitHub Actions CI
Observability: absent      — only console.log
```

The scaffold is live on Vercel (production) but contains only T3 demo content. Every slice below builds on this foundation.

---

## Foundations

Foundations are one-time setup tasks that deliver no direct user value but unblock slices.

### F-01 — Auth scaffold

**Status:** ready  
**Blocks:** S-01, S-02, S-03, S-04 (everything user-facing)

Install and wire next-auth v5 (Auth.js) with a Credentials provider (email + password). Wire `protectedProcedure` in `src/server/api/trpc.ts`. Add login page (`src/app/login/page.tsx`). Add Next.js middleware (`middleware.ts`) to redirect unauthenticated users to `/login` (FR-002).

Scope:
- `npm install next-auth@beta` (Auth.js v5 is the T3-compatible path)
- `AUTH_SECRET` env var (Vercel + local `.env`)
- Credentials provider: validate against a hardcoded user or a `users` DB table
- `protectedProcedure` checks `session.user`; all domain procedures use it
- `NEXTAUTH_URL` set per Vercel environment scope (known risk from infrastructure.md — preview OAuth callback trap)

No public registration. Single user (Piotr) — seed credentials directly.

---

### F-02 — Domain schema

**Status:** ready (can run in parallel with F-01)  
**Blocks:** S-01

Replace the scaffold `posts` table with the two domain tables. Run `npm run db:push` against Turso.

Tables:
- `entries` — id, userId (FK or plain text for now), content (text), categoryId (nullable FK), createdAt, updatedAt
- `categories` — id, userId (plain text for now), name (text), createdAt

The `userId` column future-proofs the schema for multi-user without requiring a `users` table in MVP (userId = session.user.email is sufficient at this scale).

After F-01 lands, verify: `src/server/db/schema.ts` exports `entries` and `categories`; `npm run typecheck` passes; Drizzle Studio shows both tables.

---

### F-03 — Resolve OQ-2: category stabilization rules

**Status:** blocked (human decision gate)  
**Blocks:** S-02 (AI classification prompt design)

Open Question 2 from the PRD: "Jak zapobiec chaotycznemu rozrastaniu się listy kategorii tworzonych dynamicznie przez AI?"

Decision required before implementing the AI prompt in S-02. Two options:

**Option A — Closed list with merge rule (recommended):** The AI prompt receives the full current category list and must choose from it or create a new one only when no existing category fits (≥70% semantic distance from all existing names). When AI creates a new category, it must propose a canonical name that merges or supersedes similar existing ones (e.g., "Zadania", "TODO", "Do zrobienia" → "Zadania"). This keeps the list stable.

**Option B — Free generation:** The AI freely names categories per entry. List grows unconstrained. A periodic merge/cleanup step (manual or automated) is scheduled later.

Owner: Piotr. Resolve before starting S-02.

---

## Slices

Slices are vertical, user-visible increments in dependency order. Each slice delivers something the user can actually use.

---

### S-01 — Capture + instant view ★ north star foundation

**Status:** blocked (waiting on F-01, F-02)  
**Depends on:** F-01, F-02  
**FRs delivered:** FR-003, FR-004, FR-006 (partial — view without AI grouping yet)  
**PRD mapping:** US-01 partial (capture + visibility, no category yet)

The first thing the user can actually use. Delivers:
1. Main page (`/`) with a capture textarea (FR-003: Enter = submit, Shift+Enter = new line)
2. tRPC mutation `entries.create` — saves entry to DB immediately (FR-004: always saved)
3. Optimistic UI: entry appears in the list without waiting for server round-trip
4. Entry list below the input, showing entries sorted by `createdAt DESC`
5. Category shown as "nieprzypisana" placeholder until AI runs

**Out of scope for S-01:** AI call (S-02), category grouping (S-02), edit/archive (S-03).

**What "done" looks like:** Open the app on mobile, type "pomysł na API_HUB", press Enter, see it appear instantly in the list with "nieprzypisana" label. No page reload.

---

### S-02 — AI classification ★ completes north star

**Status:** blocked (waiting on S-01, F-03)  
**Depends on:** S-01, F-03 (stabilization decision)  
**FRs delivered:** FR-005, FR-006 (full — grouped view by category)  
**PRD mapping:** US-01 complete

The hypothesis test. Delivers:
1. After `entries.create` saves the entry, trigger an AI classification call (synchronous in the same tRPC mutation, or async via a background step — see note)
2. AI receives: `{ content: entry.content, categories: ["Zadania", "Pomysły", ...] }` (list of existing categories for the user)
3. AI returns: `{ category: "Zadania" }` (existing name) or `{ category: "Nowa nazwa" }` (new category per F-03 rules)
4. Entry updated with categoryId (upsert category if new name); view re-renders with category label
5. FR-006: entry list grouped by category

**AI implementation note (risk from infrastructure.md):** Vercel serverless cannot run background jobs natively. For MVP, a **synchronous LLM call inside the tRPC mutation** is the simplest path — classify inline, return the entry with its category in one response. Latency is ~1–3s for a short prompt. The optimistic UI from S-01 ensures the entry is visible immediately; the category label updates when the mutation resolves. If latency becomes unacceptable, evaluate Trigger.dev as a background job runner (risk logged in infrastructure.md: FR-005 async classification). Do not add Trigger.dev prematurely.

**Prompt design** (to be refined in `/10x-plan` for this slice):
> "Classify the following text into one of these categories: [list]. If none fit, propose a new category name (short, in the same language as the text). Return only the category name, nothing else."

**Open Question 2 must be resolved (F-03) before this prompt is finalized.**

**What "done" looks like:** Type "muszę sprawdzić oferty hoteli na urlop", press Enter, entry appears immediately as "nieprzypisana", then within ~2s updates to "Prywatne" or "Podróże" (AI-assigned). Grouped view shows all entries under their categories.

---

### S-03 — Entry management (nice-to-have)

**Status:** proposed  
**Depends on:** S-01  
**FRs delivered:** FR-007 (edit), FR-008 (archive)  
**PRD mapping:** Secondary Success Criterion

Delivers:
1. Inline edit: click on an entry's text to edit it in-place, save with Enter or blur (FR-007)
2. Archive: swipe-left or kebab menu → "Archiwizuj" soft-deletes the entry (adds `archivedAt` timestamp); archived entries hidden from main view (FR-008)

**Note on FR-007 and OQ-1:** PRD Open Question 1 asks whether editing an entry should trigger re-classification. For MVP, the answer can be: yes, re-run AI classification on edit (same path as S-02). If F-03 is resolved as "closed list", re-classification is safe. OQ-1 doesn't block this slice — just decide inline during implementation.

**What "done" looks like:** Can edit the text of an existing entry and see it update. Can archive an entry and see it disappear from the main view.

---

### S-04 — Prefix routing + project management (nice-to-have)

**Status:** proposed  
**Depends on:** S-02 (AI must be working), OQ-3 (project vs category view unresolved)  
**FRs delivered:** FR-009 (prefix routing), FR-010 (project management)  
**PRD mapping:** US-02

Blocked by PRD OQ-3 ("how do project assignment and category coexist in the view?"). Do not start until OQ-3 is resolved and S-02 is stable.

If OQ-3 resolves to "separate tabs / filters": add a Projects tab, allow prefix-based routing, add a simple project management screen (name + keywords list).

Low priority — the PRD explicitly demoted this to nice-to-have. Ship only if S-01 + S-02 + S-03 are done before the deadline.

---

## Dependency graph

```
F-01 (auth scaffold) ─────────┐
                               ▼
F-02 (domain schema) ────→ S-01 (capture + view)
                               │
                      ┌────────┴──────────────┐
                      ▼                        ▼
F-03 (OQ-2 decision) → S-02 (AI classif.)   S-03 (edit/archive)
                               │
                               ▼
                         S-04 (prefix routing) ← OQ-3 unblocked
```

**Parallelism opportunities:**
- F-01 and F-02 can be implemented in parallel (independent layers)
- F-03 (human decision) can be made while F-01 + F-02 are being coded
- S-03 can be built in parallel with S-02 (both depend only on S-01)

---

## Open Questions (tracked)

| # | Question | Blocks | Owner | PRD ref |
|---|----------|--------|-------|---------|
| OQ-1 | Re-classify entry after edit? | S-03 (nice-to-have) | Piotr | OQ from prd.md |
| OQ-2 | Category stabilization rules | **F-03, S-02** (must-have) | Piotr | OQ from prd.md |
| OQ-3 | Project vs category in view | S-04 (nice-to-have) | Piotr | OQ from prd.md |
| OQ-4 | Measurable primary success criterion (<2s?) | Acceptance testing | Piotr | OQ from prd.md |

OQ-2 is the only open question blocking a must-have slice.

---

## Done

_Nothing archived yet. `/10x-archive` writes here when changes are completed._
