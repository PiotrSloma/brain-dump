---
project: brain-dump
researched_at: 2026-05-25
recommended_platform: Vercel
runner_up: Netlify
context_type: mvp
tech_stack:
  language: TypeScript
  framework: Next.js 15 App Router
  runtime: Node.js (serverless)
  database: SQLite via libsql/Turso (remote)
---

## Recommendation

**Deploy on Vercel.**

Vercel is the natural host for a T3 stack (Next.js + tRPC + Drizzle) — the same company maintains both the framework and the platform, which means zero compatibility risk, first-class App Router support, and a documented T3 deployment path. The user is already familiar with it (Q3), it scores Pass on all five agent-friendly criteria, and the T3 scaffold already bakes in `VERCEL_URL` assumptions (`src/trpc/react.tsx:76`). At MVP scale (personal tool, sub-100k requests, single region) the Hobby tier costs $0; upgrading to Pro when revenue is added costs $20/month.

## Platform Comparison

| Platform | CLI-first | Managed/Serverless | Agent docs | Stable deploy API | MCP | Score |
|---|---|---|---|---|---|---|
| **Vercel** | Pass | Pass | Pass | Pass | Pass | **5/5** |
| Netlify | Pass | Pass | Pass | Pass | Pass | 5/5 |
| Cloudflare | Pass | Pass | Pass | Pass | Pass | 5/5 |
| Railway | Partial | Pass | Pass | Partial | Pass | 3P+2p |
| Render | Partial | Pass | Pass | Partial | Partial | 2P+3p |
| Fly.io | Partial | Partial | Partial | Partial | Partial | 0P+5p |

**Criterion notes:**

- **Vercel** — CLI: `vercel --prod`, `vercel rollback`, `vercel logs` all GA. Docs: `llms-full.txt` + GitHub MDX. MCP: official, GA, read-only at launch (write capabilities in progress). Fluid Compute (GA April 2025) reduces cold starts. Hobby plan: non-commercial only.
- **Netlify** — CLI: `netlify deploy --prod`, `netlify rollback`, `netlify logs` all GA. Docs: `docs.netlify.com/llms.txt`. MCP: official, GA (June 2025). ISR has documented edge-case bugs in opennextjs-netlify. Credit-based pricing (free = 300 credits/month). Official T3 deployment guide at create.t3.gg.
- **Cloudflare** — CLI: `wrangler deploy`, `wrangler rollback`, `wrangler tail` all GA. Multiple MCP servers GA. **Hard risk: Next.js 15.4+ has a confirmed unpatched instrumentation hook failure** (`opennextjs-cloudflare#971`) — must pin to 15.3.x. Dropped from shortlist due to forced version-pinning on current Next.js minor.
- **Railway** — No dedicated `railway rollback` CLI (dashboard only). Railpack builder in beta. Persistent VMs (no cold starts, no serverless constraints). Official MCP server (`@railway/mcp-server`) GA. Self-hosted sqld or Turso volume both work.
- **Render** — No `render rollback` CLI subcommand (API/dashboard only). MCP server GA but limited (can't trigger deploys, can't create free instances). Free tier spins down after 15 min — unusable for real traffic. Starter at $7/month.
- **Fly.io** — Requires Dockerfile + `output: standalone`; more operational overhead. No `llms.txt`. `fly mcp` is Experimental. No free tier for new accounts (removed 2024). Rollback requires manual image redeployment. LiteFS Cloud retired October 2024.

### Shortlisted Platforms

#### 1. Vercel (Recommended)

Wins on: native Next.js 15 support (same company), user familiarity (Q3), zero adapter risk, `llms-full.txt` for agent docs, Instant Rollback GA, and the T3 scaffold already targets Vercel. All five criteria Pass. Hobby plan covers personal-use MVP at zero cost. The two constraints — MCP currently read-only and Turso as a required external DB — are manageable: CLI fills the deploy gap, and Turso free tier (500 databases, 1 GB) covers MVP comfortably.

#### 2. Netlify

All five criteria Pass. User-familiar. Official T3 deployment guide. Netlify MCP launched earlier (June 2025) and is more feature-complete than Vercel's. Gap versus Vercel: ISR edge-case bugs in opennextjs-netlify are open and active, the credit-based pricing model is newer and less predictable under load than Vercel's request-count limits, and Vercel's co-location with Next.js gives a smaller risk surface for App Router compatibility.

#### 3. Railway

Railway scores slightly lower on two criteria (no CLI rollback, Railpack still beta) but compensates with persistent VMs — no cold starts, no serverless constraints, and a clear path to co-located sqld (self-hosted libsql) without Turso as a third vendor. If FR-005 AI classification ever needs background processing, Railway handles it natively. The MCP server is the most capable of the three (full deploy/log/env var management, not read-only). The $5/month Hobby plan includes enough compute for a personal MVP.

---

## Anti-Bias Cross-Check: Vercel

### Devil's Advocate — Weaknesses

1. **Hobby plan prohibits commercial use.** Free tier explicitly forbids revenue-generating projects. First paid feature (Stripe) triggers mandatory upgrade to $20/month Pro with no grace period.
2. **No persistent processes.** FR-005 (AI classification) will likely need async background processing. Vercel serverless cannot do this natively — requires Trigger.dev, Inngest, or similar as a third vendor.
3. **Two-vendor database dependency.** Vercel + Turso = two billing accounts, two SLAs, two failure points. Turso downtime = app downtime with no local fallback.
4. **Vercel MCP is read-only today.** Write operations (triggering deploys, rotating secrets) still require CLI. Write-capable MCP version has no public ETA.
5. **Hardcoded `VERCEL_URL` assumption in scaffold.** `src/trpc/react.tsx:76` assumes Vercel deployment. Future platform migration requires auditing these assumptions.

### Pre-Mortem — How This Could Fail

The BrainDump app launched on Vercel Hobby. Three months in, a Stripe subscription tier was added for a premium feature — immediately violating Hobby ToS and triggering an unplanned $20/month Pro upgrade. Meanwhile, FR-005 AI classification needed async processing: entries submitted but classification was blocking the API response. Adding Inngest as a third service consumed a weekend of unplanned integration work. The Turso embedded replica docs promised faster reads, but on Vercel's ephemeral serverless environment the `/tmp` replica file is destroyed between invocations — every DB read is a round-trip HTTP to Turso's remote primary. At ADHD-scale use (frequent small captures), the ~50ms latency was noticeable. Finally, the developer wanted the agent to autonomously deploy bug fixes. The Vercel MCP was still read-only: the agent could inspect logs but couldn't run `vercel --prod`. The "agent drives the full deploy loop" goal wasn't achievable without a write-capable MCP or manual CLI intervention.

### Unknown Unknowns

- **Turso embedded replicas are disabled on Vercel.** `/tmp` is per-invocation ephemeral. Plan for ~50ms round-trip DB latency on every request — embedded replica sync won't persist.
- **NextAuth preview-deploy OAuth callback trap.** Auth.js v5 auto-detects `VERCEL_URL` but OAuth redirect URIs must be whitelisted per deployment URL. Preview-URL auth will silently fail unless `NEXTAUTH_URL` is set per environment.
- **Fluid Compute cold starts still hit low-traffic apps.** For a personal tool with irregular traffic, invocations older than ~15 minutes still incur cold starts (800ms–2s). Not visible in benchmarks; very visible when returning to the app after a break.
- **`vercel.json` vs `next.config.ts` rewrite conflicts are silent.** Conflicting rules don't throw errors — they simply don't apply. If a `vercel.json` is ever added, rewrite/redirect precedence must be checked.
- **Function size limit is 50 MB compressed.** Rarely an issue for T3, but worth checking `vercel build` output as AI SDK packages are added (FR-005).

---

## Operational Story

- **Preview deploys**: Every Git branch push creates an immutable preview URL (`<hash>-<project>.vercel.app`). Preview URLs are public by default — protect with Vercel Authentication (one click in dashboard) or Cloudflare Access if content is sensitive. Fork PRs from external contributors do not get preview deploys on the Hobby plan.
- **Secrets**: Env vars live in Vercel's project settings (Settings → Environment Variables). Three scopes: Production, Preview, Development. `AUTH_SECRET` and `TURSO_AUTH_TOKEN` go here. Rotation: update in dashboard and run `vercel --prod` to pick up the new value (no zero-downtime rotation — function pool is replaced on next deploy). Local dev: `vercel env pull .env.local` syncs to local.
- **Rollback**: `vercel rollback` (CLI) or Deployments → Rollback button (dashboard). Instant — no redeployment, Vercel swaps routing to a prior immutable deployment. Typical time-to-revert: <10 seconds. Caveat: DB migrations (Drizzle) do not roll back automatically — schema changes are forward-only.
- **Approval**: An agent may run `vercel --prod` unattended once the CLI token is set in CI. Human approval required to: rotate `AUTH_SECRET` (auth invalidation risk), run `npm run db:migrate` on production (irreversible schema change), upgrade plan tier, add custom domain (DNS change). Hobby→Pro upgrade requires a manual billing action.
- **Logs**: `vercel logs <deployment-url> --follow` streams runtime logs. `vercel inspect <deployment-url> --logs` shows build + runtime logs for a specific deployment. For agent read-only log access: Vercel MCP server (GA) exposes log inspection without needing the CLI token.

---

## Risk Register

| Risk | Source | Likelihood | Impact | Mitigation |
|---|---|---|---|---|
| Hobby plan violation on first paid feature | Devil's advocate | M | M | Upgrade to Pro proactively when adding any Stripe integration; budget $20/month from that point |
| Turso latency (no embedded replica on serverless) | Unknown unknowns | H | L | Accept ~50ms DB round-trip as baseline; optimize queries, not the driver. Use Turso read replicas in same region as Vercel functions if latency becomes UX-blocking |
| FR-005 async classification blocked by serverless | Devil's advocate | H | M | Evaluate Trigger.dev or Inngest as job runner when implementing FR-005; add to stack before wiring AI classification |
| NextAuth preview-deploy OAuth callback failure | Unknown unknowns | H | M | Set `NEXTAUTH_URL` explicitly per Vercel environment scope when wiring auth; test with a preview URL before merging |
| Vercel MCP write capabilities absent | Devil's advocate | H | L | Use `vercel --prod` CLI in CI workflows for agent-triggered deploys; re-evaluate when write MCP releases |
| Cold starts for irregular personal-tool traffic | Unknown unknowns | H | L | Vercel Hobby is single-region; cold starts are 800ms–2s. Acceptable for personal MVP. Fluid Compute mitigates repeat invocations |
| Turso service downtime = full app downtime | Devil's advocate | L | H | Enable Turso's continuous backup; point `DATABASE_URL` at the nearest Turso edge region; no hot failover available on free tier |
| Drizzle migration doesn't roll back | Pre-mortem | L | H | Always run `db:generate` + review migration SQL before `db:migrate` on production; keep a pre-migration DB snapshot (Turso backup) |
| `vercel.json` / `next.config.ts` rewrite conflict | Unknown unknowns | L | L | Avoid creating `vercel.json` unless necessary; if added, audit rewrite/redirect precedence against `next.config.ts` |

---

## Getting Started

1. **Install the Vercel CLI**: `npm i -g vercel`
2. **Log in and link the project**: `vercel login` then `vercel link` from the project root. This creates `.vercel/project.json` (gitignore it).
3. **Add required environment variables**:
   ```
   vercel env add DATABASE_URL production
   vercel env add DATABASE_URL preview
   ```
   Use your Turso database URL (`libsql://...`) not the local `file:./db.sqlite`. Turso auth token:
   ```
   vercel env add TURSO_AUTH_TOKEN production
   vercel env add TURSO_AUTH_TOKEN preview
   ```
4. **Fix the T3 scaffold to use the remote DB driver**. In `src/server/db/index.ts`, ensure the client uses `@libsql/client` with `url: process.env.DATABASE_URL`. The scaffold's default `better-sqlite3` path won't work on Vercel's read-only filesystem.
5. **Deploy**: `vercel --prod` for production, or push to `main` to trigger auto-deploy if GitHub is connected (Settings → Git in the Vercel dashboard).

---

## Out of Scope

The following were not evaluated in this research:
- Docker image configuration
- CI/CD pipeline setup (GitHub Actions wiring)
- Production-scale architecture (multi-region, HA, DR)
- Turso database provisioning and schema push commands
