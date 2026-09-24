# Lectern

A team-aware AI explainer. See `lectern-software-plan.md` and
`lectern-implementation-roadmap.md` for the product plan and build phases.

## Structure

- `apps/` — marketing, workspace, org-console, superadmin (Next.js)
- `services/ai-modal` — Python AI service (Modal + FastAPI)
- `packages/` — shared UI, types, config, Supabase client (`@repo/*`)
