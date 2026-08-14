# Ibtechar SmartCare V3_02

Developed by Seif Khlif.

## Corrected in this release

- Disambiguated the two `risk_issues → profiles` relationships used by Supabase/PostgREST.
- Restored JSON error responses for the Risks API so the frontend never parses an empty response.
- Added a complete `/risks` module with project, severity, status and text filters.
- Added permission-aware risk creation, editing and deletion.
- Corrected the Risks & Issues navigation route and exact active-menu matching.
- Prevented Project Dashboard and Risks & Issues from appearing active at the same time.
- Added safe response parsing to the Tasks, Activities & KPIs dashboard.
- Updated the visible product version to V3_02.

## Existing Supabase projects

Run this migration once in the Supabase SQL Editor:

`supabase/migrations/202608140001_smartcare_v3_02_risks_route_fix.sql`

The migration only repairs the `project_risks` navigation record. It does not delete project data or reset customized permissions.

## Verification

- `npm run build` — passed
- TypeScript validation — passed
- `npm run lint` — passed with legacy non-blocking warnings only
