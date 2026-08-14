# Ibtechar SmartCare V3_01

Production-oriented Next.js 16 application for Ibtechar asset management, project budgets, procurement, maintenance, work orders, notifications, reports and AI-assisted equipment diagnostics.

Developed by **Seif Khlif**.

V3_01 adds CEO/Admin governance, project-scoped positions, protected financial tables, unified Tasks/Activities/KPIs/Milestones, team ownership, reviewer workflows, risk control and a reusable dynamic project dashboard.

## Architecture

- Next.js 16 / React 19 frontend and Route Handlers
- Supabase PostgreSQL as the only operational database
- Supabase Auth for Email + Password, invitations and password recovery
- PostgreSQL Row Level Security for roles, modules, projects and assets
- Supabase Storage for asset images, diagnostic images, manuals, reports and PO PDFs
- OpenAI Responses API for text + image technical diagnostics
- Vercel-ready deployment

SQLite, Netlify Identity and Netlify Blobs are not used by this version.

## 1. Requirements

- Node.js 22 or newer
- npm
- A Supabase project
- A Vercel account for production deployment
- An OpenAI API key for live AI diagnostics (optional for the safe fallback mode)

## 2. Configure Supabase

Use a fresh Supabase project for the canonical schema. If the project contains exploratory SmartCare tables created from earlier scripts, back up anything needed and recreate/reset them before applying this migration; `create table if not exists` cannot repair incompatible old column types.

In Supabase SQL Editor run, in order:

For a new Supabase project, run:

1. `supabase/migrations/202608090001_smartcare_v1.sql`
2. `supabase/seed.sql`
3. `supabase/migrations/202608130001_smartcare_v3_01_project_control.sql`
4. `supabase/seed-v3_01.sql` (optional demonstration data)

For an existing SmartCare v1 database, back it up and run only steps 3 and 4.

The V3_01 migration moves financial values into protected tables, adds unified project-control entities, indexes, triggers, RLS policies and the private attachment bucket. Staff and Technician roles cannot query protected financial tables.

In **Authentication → URL Configuration** set:

- Site URL: your production Vercel URL
- Redirect URLs: `http://localhost:3000/**` and `https://YOUR-VERCEL-DOMAIN/**`. This allows the secure callback URL `/auth/callback?next=/auth/reset-password` used by invitations and password recovery.

Create the first Auth user in **Authentication → Users**. Then run this in SQL Editor after replacing the email:

```sql
update public.profiles
set role_id = (select id from public.roles where name = 'CEO')
where lower(email) = lower('saif@ibtechar.com');
```

The Admin can invite later users from SmartCare User Management. Invitations and password recovery first open `/auth/callback`, then securely open `/auth/reset-password`, where the user sees **New password** and **Confirm password** fields.

If the first administrator can authenticate but SmartCare reports that the identity is not linked, run `supabase/repair-first-admin-profile.sql` once in the SQL Editor. It repairs only `saif@ibtechar.com` in the current project.

## 3. Environment variables

Copy `.env.example` to `.env.local` and replace every placeholder:

```bash
cp .env.example .env.local
```

Required:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `NEXT_PUBLIC_SITE_URL`
- `SUPABASE_SECRET_KEY` — server only; never prefix with `NEXT_PUBLIC_`
- `OPENAI_API_KEY` — server only

Never commit `.env.local`.

## 4. Run locally

```bash
npm install --cache /tmp/smartcare-npm-cache
npm run dev
```

Open `http://localhost:3000` and sign in with a real Supabase Auth account. Local user impersonation is intentionally disabled so RLS is tested exactly as it will run in production.

## 5. Verify

```bash
npm run lint
npm run build
```

Test at least two users with different roles and project assignments. Confirm that each user sees only permitted modules, projects, assets, work orders, tasks and notifications.

## 6. Deploy to Vercel

1. Push this project to GitHub.
2. In Vercel choose **Add New → Project** and import the repository.
3. Framework preset: Next.js. Build command: `npm run build`.
4. Add the five environment variables from `.env.local` in Vercel Project Settings.
5. Deploy.
6. Copy the production URL into `NEXT_PUBLIC_SITE_URL` and Supabase Auth URL Configuration, then redeploy once.

## Security notes

- The browser receives only the Supabase publishable key.
- `SUPABASE_SECRET_KEY` and `OPENAI_API_KEY` are used only in server Route Handlers.
- Authorization is enforced by RLS and server Route Handlers, not only by hiding frontend screens.
- CEO and Admin have global access. Project Manager, Staff and Technician access is limited to assigned projects.
- Financial values are stored separately in `project_financials` and `asset_financials`.
- Storage buckets are private; signed URLs are short-lived and project image access follows project permissions.
- User roles come from `public.profiles`, not editable Auth user metadata.
- Admin invitations, profile creation and deletion use the server-only Supabase Admin client.

## Important folders

- `app/` — UI, API routes and server integration
- `app/lib/supabase/` — browser/server/admin clients
- `supabase/migrations/` — canonical database schema and RLS
- `supabase/seed.sql` — reference data
- `public/templates/` — Excel upload templates
