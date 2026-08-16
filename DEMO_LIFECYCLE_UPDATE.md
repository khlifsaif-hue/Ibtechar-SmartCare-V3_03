# SmartCare V3_03 — Demo Lifecycle Update

Scope is limited to:
Project → Budget → Purchase Request → Approval → Purchase Order → Receiving → Asset → AI Diagnosis → Work Order → Repair Completed → Asset History.

## Required Supabase migration
After uploading/deploying this code, apply:
`supabase/migrations/202608160001_demo_lifecycle_fixes.sql`

This migration only adds lifecycle fields/relationships. It does not delete existing data.

## Demo financial expectation
For Studio 5 with approved budget QAR 250,000 and one QAR 8,900 asset purchase:
- PR submitted: committed 8,900; spent 0; available 241,100.
- PR approved / PO created: committed 8,900; spent 0; available 241,100.
- PO approved: committed 8,900; spent 0; available 241,100.
- Equipment received: committed 0; spent 8,900; available 241,100.

## Receiving demo values
Manufacturer: Bambu Lab
Model: X1 Carbon
Condition: New
Location: STUDIO 5
Warranty: 12 months
