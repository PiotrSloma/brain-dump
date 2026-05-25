---
bootstrapped_at: 2026-05-25T10:05:03Z
starter_id: t3
starter_name: T3 Stack
project_name: brain-dump
language_family: js
package_manager: npm
cwd_strategy: subdir-then-move
bootstrapper_confidence: verified
phase_3_status: ok
audit_command: "npm audit --json"
---

## Hand-off

```yaml
---
starter_id: t3
package_manager: npm
project_name: brain-dump
hints:
  language_family: js
  team_size: solo
  deployment_target: vercel
  ci_provider: github-actions
  ci_default_flow: auto-deploy-on-merge
  bootstrapper_confidence: verified
  path_taken: custom
  quality_override: false
  self_check_answers:
    typed: true
    from_official_starter: true
    conventions: false
    docs_current: true
    can_judge_agent: false
  has_auth: true
  has_payments: false
  has_realtime: false
  has_ai: true
  has_background_jobs: false
---
```

**Why this stack**

Solo developer building a personal ADHD capture tool in 2 weeks after hours with a TypeScript-first preference, auth and AI classification in scope, and Vercel as the deployment target. T3 (Next.js + NextAuth + Drizzle + tRPC + Tailwind) wins on three load-bearing factors: auth is built-in via NextAuth matching FR-001 email+password requirement; Drizzle handles the entries database; tRPC enforces type safety across the AI-call layer (FR-005) without extra plumbing. Verified bootstrapper confidence means scaffolding is battle-tested end-to-end. The tRPC tradeoff — it binds client to backend TypeScript — is actually a benefit for a solo developer building both sides. Self-check flagged conventions and can_judge_agent as not-yet-true; CLAUDE.md will carry explicit T3 stack conventions as compensation so the AI agent has a reliable reference. CI runs on GitHub Actions with auto-deploy on merge to Vercel, which is T3's natural deployment target.

## Pre-scaffold verification

| Signal      | Value                                          | Severity | Notes                                      |
| ----------- | ---------------------------------------------- | -------- | ------------------------------------------ |
| npm package | create-t3-app v7.40.0 published 2025-11-05     | stale    | resolved from cmd_template; 6+ months old |
| GitHub repo | not run                                        | —        | docs_url is https://create.t3.gg (not a GitHub URL; no repo check available) |

## Scaffold log

**Resolved invocation**: `npx create-t3-app@latest .bootstrap-scaffold --CI --tailwind --trpc --drizzle --appRouter --biome --dbProvider sqlite`
**Strategy**: scaffold into a temp directory then move files up
**Exit code**: 0
**Files moved**: 16 (`.env`, `.env.example`, `.git`, `.gitignore`, `README.md`, `biome.jsonc`, `drizzle.config.ts`, `next-env.d.ts`, `next.config.js`, `node_modules`, `package-lock.json`, `package.json`, `postcss.config.js`, `public`, `src`, `tsconfig.json`)
**Conflicts (.scaffold siblings)**: none — cwd contained only `CLAUDE.md` and `context/` prior to scaffold; no files overlapped
**context/ handling**: no `context/` directory in scaffold; cwd `context/` (PRD, tech-stack hand-off, shape-notes) preserved verbatim
**.gitignore handling**: moved silently — no `.gitignore` existed in cwd prior to scaffold
**.bootstrap-scaffold cleanup**: deleted

## Post-scaffold audit

**Tool**: `npm audit --json`
**Summary**: 0 CRITICAL, 1 HIGH, 6 MODERATE, 0 LOW
**Direct vs transitive**: 1/0 HIGH/CRITICAL direct of 1/0 total; 2/0 MODERATE direct of 6/0 total

#### HIGH findings

**drizzle-orm** (direct)
- Advisory: GHSA-gpj5-g38j-94v9
- Title: Drizzle ORM has SQL injection via improperly escaped SQL identifiers
- CVSS: 7.5 (AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:N/A:N)
- CWE: CWE-89
- Affected range: `<0.45.2`
- Fix: upgrade to `drizzle-orm@0.45.2`

#### MODERATE findings

**drizzle-kit** (direct)
- Via: @esbuild-kit/esm-loader → @esbuild-kit/core-utils → esbuild
- Affected range: `0.9.1 - 0.9.54 || 0.12.9 - 1.0.0-beta.1-fd8bfcc`
- Fix: upgrade to `drizzle-kit@0.31.10` (major version bump)

**next** (direct)
- Via: postcss (XSS via unescaped `</style>` in CSS stringify output)
- Affected range: `9.3.4-canary.0 - 16.3.0-canary.5`
- Fix: next upgrade (fix available via newer next release)

**esbuild** (transitive — via drizzle-kit)
- Advisory: GHSA-67mh-4wv8-2f99
- Title: esbuild enables any website to send requests to the development server and read the response
- CVSS: 5.3 — dev-server only, not a production runtime concern
- Fix: upgrade drizzle-kit to resolve chain

**postcss** (transitive — via next)
- Advisory: GHSA-qx2v-qp2m-jg93
- Title: PostCSS XSS via unescaped `</style>` in CSS stringify output
- CVSS: 6.1
- Fix: upgrade next to pull in postcss ≥ 8.5.10

**@esbuild-kit/core-utils** (transitive — via drizzle-kit chain)
- Via: esbuild (deprecated; merged into tsx)
- Fix: resolved by drizzle-kit upgrade

**@esbuild-kit/esm-loader** (transitive — via drizzle-kit chain)
- Via: @esbuild-kit/core-utils
- Fix: resolved by drizzle-kit upgrade

## Hints recorded but not acted on

| Hint                    | Value                                                                                           |
| ----------------------- | ----------------------------------------------------------------------------------------------- |
| bootstrapper_confidence | verified                                                                                        |
| quality_override        | false                                                                                           |
| path_taken              | custom                                                                                          |
| self_check_answers      | typed: true, from_official_starter: true, conventions: false, docs_current: true, can_judge_agent: false |
| team_size               | solo                                                                                            |
| deployment_target       | vercel                                                                                          |
| ci_provider             | github-actions                                                                                  |
| ci_default_flow         | auto-deploy-on-merge                                                                            |
| has_auth                | true                                                                                            |
| has_payments            | false                                                                                           |
| has_realtime            | false                                                                                           |
| has_ai                  | true                                                                                            |
| has_background_jobs     | false                                                                                           |

Note: `self_check_answers.conventions: false` and `self_check_answers.can_judge_agent: false` were flagged during stack selection. A future M1L4 skill will use these to generate T3-specific conventions in `CLAUDE.md` / `AGENTS.md` as compensation. v1 surfaces but does not act.

## Next steps

Next: a future skill will set up agent context (CLAUDE.md, AGENTS.md). For now, your project is scaffolded and verified — happy hacking.

Useful manual steps in the meantime:
- The `.git/` directory was moved up from the scaffold — run `git log` to see the initial commit create-t3-app made, or `git reset HEAD~1 --soft` if you prefer to write your own first commit message.
- **Address the HIGH finding first**: `npm install drizzle-orm@0.45.2` — direct dependency, SQL injection risk.
- **Address MODERATE drizzle-kit**: `npm install drizzle-kit@0.31.10` — major bump, check for API changes before upgrading.
- The `esbuild` and `postcss` MODERATE findings are dev-server / CSS build tools; they do not affect the production runtime. Address after the direct findings.
- Review `.env` — it contains placeholder secrets (`AUTH_SECRET`, `DATABASE_URL`). Do not commit it; `.gitignore` already excludes it.
- `npm run db:push` to apply the Drizzle schema to your SQLite database before first `npm run dev`.
