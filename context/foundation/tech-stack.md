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

## Why this stack

Solo developer building a personal ADHD capture tool in 2 weeks after hours with a TypeScript-first preference, auth and AI classification in scope, and Vercel as the deployment target. T3 (Next.js + NextAuth + Drizzle + tRPC + Tailwind) wins on three load-bearing factors: auth is built-in via NextAuth matching FR-001 email+password requirement; Drizzle handles the entries database; tRPC enforces type safety across the AI-call layer (FR-005) without extra plumbing. Verified bootstrapper confidence means scaffolding is battle-tested end-to-end. The tRPC tradeoff — it binds client to backend TypeScript — is actually a benefit for a solo developer building both sides. Self-check flagged conventions and can_judge_agent as not-yet-true; CLAUDE.md will carry explicit T3 stack conventions as compensation so the AI agent has a reliable reference. CI runs on GitHub Actions with auto-deploy on merge to Vercel, which is T3's natural deployment target.
