# Ibtechar SmartCare V3_01 — Implementation Checklist

Developed by **Seif Khlif**.

## Database activation

Run the SQL files in the exact order documented in `README.md`. Back up an existing SmartCare database before the V3_01 migration. The migration is intentionally non-destructive for customized user permission rows.

## Required environment variables

Copy `.env.example` to `.env.local`, then replace every placeholder. Never commit `.env.local`, the Supabase secret key, or the OpenAI key.

## Role acceptance tests

1. **CEO / Admin**: can access every assigned or unassigned project, all financial values, User Management and Interface & Access Management.
2. **Project Manager**: can control assigned projects, budgets, Trackable Items, KPIs and risks; cannot administer unrelated projects.
3. **Finance**: can access protected financial workflows for assigned projects.
4. **Staff**: sees only assigned projects/assets, never asset/project financial values, can submit Purchase Requests and respond to assigned Trackable Items.
5. **Technician**: sees only assigned projects/assets and maintenance information, never financial values, can update assigned maintenance and Trackable Items.
6. **Viewer**: receives read-only project-scoped operational access.

## End-to-end workflow tests

- Create a user with a position and at least one project; confirm the invitation sets a password through `/auth/callback` and `/auth/reset-password`.
- Create a KPI, assign it to a person or team and select a separate reviewer.
- Accept, defer with a mandatory reason, and complete a task; verify the creator receives a linked notification.
- Open an asset; confirm scheduled, overdue and historic maintenance appear.
- Receive an Asset purchase order; confirm the asset is created and project financial totals recalculate.
- Sign in as Staff and Technician; verify asset cost, current value, depreciation and budget amounts are absent from both UI and API responses.
- Upload a Trackable Item attachment and confirm the private Storage path is recorded.

## Quality verification

```bash
npm install --cache /tmp/smartcare-npm-cache
npm run lint
npm run build
```

The delivered V3_01 source passed a production Next.js build and TypeScript validation. ESLint reports no errors; non-blocking hook and legacy unused-variable warnings are listed by the command for future cleanup.
