# Medora — Healthcare Appointment System

A client-style multi-role healthcare platform built with React + Vite and designed for a Supabase backend. Medora covers the full patient journey, doctor clinical workflow and administrative operations rather than presenting a single dashboard mockup.

## Product scope

### Public experience
Home, doctor discovery, filters, specialty directory, doctor profiles, how-it-works, about, contact, FAQ, login, registration and password recovery.

### Patient portal
Overview, four-step appointment booking, appointment management, care team, secure messages, medical records, prescriptions, lab results, billing, insurance, notifications, profile, settings and security/session management.

### Doctor portal
Clinical dashboard, daily schedule, appointment requests, patient list, availability management, consultation notes, prescriptions, records, secure messages, earnings, public profile and settings.

### Admin portal
Operations dashboard, doctor verification/management, patient management, appointment operations, specialty management, review moderation, payments, analytics, support, user access states and audit activity.

## Stack
React 18 · Vite · React Router · Supabase · PostgreSQL · Row Level Security · Playwright · Lucide React · responsive CSS design system

## Backend architecture
`supabase/migrations/001_healthcare_schema.sql` models the three-role system with profiles, doctor profiles, specialties, availability, appointments, medical records, prescriptions, lab results, conversations/messages, insurance, invoices, reviews, notifications, support requests and audit events.

RLS policies separate patient-owned data, doctor clinical access and administrative visibility. `book_appointment(...)` validates the authenticated patient, verified doctor, future time, consultation type, fee and slot collision on the server before creating an appointment.

> The booking journey is connected to the existing **Healthcare Appointment System** Supabase project (`rjiejqtrffdutrmcvaxg`). It loads the approved clinician directory and real availability, authenticates patients, saves bookings through `book_appointment`, lists persisted appointments and cancels through `cancel_appointment`. Other patient/doctor/admin workspace sections still contain portfolio demonstration content.
>
> Public registration always creates a patient. Doctor/admin roles and doctor verification must be assigned through a trusted backend. Never use real medical information for portfolio testing.

## Local setup
```bash
npm install
cp .env.example .env
npm run dev
```

For Supabase mode, add only the public project URL and publishable key:
```env
VITE_SUPABASE_URL=...
VITE_SUPABASE_PUBLISHABLE_KEY=...
```

## Quality gate
```bash
npm run build
npm run test:e2e
```

GitHub Actions verifies production build, desktop/tablet/mobile overflow and navigation, doctor discovery, patient booking, all three role dashboards, and exports a 30+ second real-product showcase after tests pass.

## Design direction
Research reviewed current 2026 healthcare product work and patient-portal guidance. The resulting UI emphasizes calm visual hierarchy, predictable booking states, verified-clinician trust cues, explicit privacy/security surfaces, accessibility-minded responsive layouts and clear recovery/empty states rather than a generic admin template.

## Applied backend and QA

`001_healthcare_schema.sql` and `002_reference_seed.sql` were applied on 2026-10-03. The schema migration includes security corrections made before its first application: trusted patient-only signup, protected role/status/verification columns, restricted table/function grants, private privileged implementations, real schedule validation, database-owned pricing and an exclusion constraint against overlapping bookings. Public RPC wrappers run with caller privileges.

A follow-up `booking_rls_query_indexes` migration adds foreign-key indexes and caches row-independent RLS checks. The eight specialties are reference data. The seed intentionally creates no fake auth users or verified doctors. A real clinician must be approved and publish availability before the live directory can accept bookings. QA uses disposable synthetic accounts and schedules, then removes them.

- `qa/backend-report.json`: live Auth/REST/RPC checks, including concurrent bookings, invalid inputs, price tampering and isolation across patient and clinician accounts.
- `qa/frontend-report.json`: a Chromium run against the real Supabase backend, including guided booking, reload persistence, cancellation, responsive layouts and conflicting-slot recovery.
- `tests/healthcare.spec.js`: presentation regression tests with read-only directory fixtures. These do not claim to test live booking.
- `tests/backend-qa.mjs` / `tests/live-booking-qa.mjs`: live suites accept a disposable fixture configuration on stdin (`tag`, `password`, `ids`); credentials must never be committed. `npm run test:backend` and `npm run test:booking` start these suites. The browser suite starts its own Vite server unless `QA_BASE_URL` is supplied; `QA_BROWSER_EXECUTABLE` may select an installed Chromium executable.

No service-role key is used in the browser or committed. Confirmations display the actual database UUID, not a static confirmation code. All dates and slots use Asia/Karachi explicitly. An empty directory, session failure, RPC error or slot conflict never produces a successful booking screen.
