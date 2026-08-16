# SmartCare Demo Follow-up Patch

This package is based on `Ibtechar-SmartCare-V3_03-Demo-Lifecycle-Fixed`.

Included changes only:
- Unknown/under-construction one-level module routes such as `/HR` now open the SmartCare "Module in development" screen instead of 404.
- Reports can filter assets by search, project, asset status, work-order state (Scheduled / In progress / Overdue), and location.
- Maintenance-history reports export to PDF, Excel, CSV, or HTML and intentionally exclude cost/depreciation/current-value fields.
- Asset Edit Status & Location now maps status colors automatically:
  - Operational = green
  - Awaiting commissioning = orange
  - Maintenance due = orange
  - Out of service = red
- Asset edit includes a Description field saved to the existing asset notes field.
- Purchase Order creation sends an in-app notification to active FINANCE users.
- Restores the `/api/notifications` route used by the existing notification bell.

Database note:
- No additional migration is required for this follow-up patch.
- The previous `202608160001_demo_lifecycle_fixes.sql` migration remains required for the lifecycle update.
