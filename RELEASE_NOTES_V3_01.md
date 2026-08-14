# Ibtechar SmartCare V3_01

Developed by **Seif Khlif**.

## Highlights

- CEO and Admin platform-wide governance.
- Project-scoped Project Manager, Staff and Technician access.
- Financial data isolated in protected PostgreSQL tables; Staff and Technician roles cannot query asset or project financials.
- Unified Trackable Item system for Tasks, Activities, KPIs and Milestones.
- Individual or group ownership, reviewer workflow, shared/split targets, progress logs and attachments.
- Accept, defer with mandatory explanation, complete and automatic creator notification.
- Automated RAG status calculation and source-event endpoint for data-driven KPI updates.
- Dynamic project control panel, reusable drill-down drawer and cross-widget filters.
- Risks and Issues register.
- Asset maintenance view and role-safe operational reports.
- Correct financial creation for assets imported from Excel or generated from received purchase orders.

## Required migration order

1. `supabase/migrations/202608090001_smartcare_v1.sql` (new database only)
2. `supabase/seed.sql` (new database only)
3. `supabase/migrations/202608130001_smartcare_v3_01_project_control.sql`
4. `supabase/seed-v3_01.sql` (optional test data)

Back up production data before applying schema migrations.
