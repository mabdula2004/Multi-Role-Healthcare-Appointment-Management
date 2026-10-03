# Live backend QA — 2026-10-03

- Project: Healthcare Appointment System (`rjiejqtrffdutrmcvaxg`).
- Applied the repository schema and reference seed, plus an RLS/index optimization follow-up.
- 17/17 tables have RLS; protected roles and function/table grants verified.
- 14 backend test groups passed against live Supabase Auth, REST and RPC.
- 7 real Chromium booking checks passed: session gate, RPC confirmation, reload persistence, tablet/mobile layout, cancellation, occupied-slot recovery and no runtime errors.
- 12 presentation regression tests passed across desktop/tablet/mobile. These use read-only clinician fixtures and do not substitute for the live tests.
- Production build and Git diff checks passed.
- A transactional RLS/booking/cancellation smoke test passed after query-policy optimization.
- All synthetic test accounts, schedules, appointments and health records were removed. Eight reference specialties remain. No real patient data was used.

The live directory is currently empty because no real doctor has been onboarded and verified. A doctor profile and published availability are required to offer live appointments. Other patient, clinician and administrator workspaces still include demonstration content; this delivery connects and verifies the booking journey rather than claiming those separate modules are complete.

The Auth advisor reports [leaked-password protection disabled](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection). This is a project-level Auth configuration notice, not an RLS leak. The only performance notice remaining is [unused indexes](https://supabase.com/docs/guides/database/database-linter?lint=0005_unused_index), expected for newly created indexes in an empty project.

Credentials and tokens are excluded from the QA files. The screenshot shows synthetic QA UI state only.
