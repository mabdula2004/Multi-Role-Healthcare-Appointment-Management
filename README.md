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

## How the application runs

Medora is **one React + Vite application**, not three separate projects. A single frontend talks to a single Supabase backend, and the authenticated user's role determines which workspace is shown.

```text
Public website
     |
     v
Authentication
     |
     +----------------+----------------+----------------+
     |                |                |
     v                v                v
 Patient Portal    Doctor Portal     Admin Portal
     \                |                /
      \_______________|_______________/
                      |
                      v
                  Supabase
          Auth + PostgreSQL + RLS
```

You run the project once:

```bash
npm install
npm run dev
```

Typical routes:

| Area | Example route | Purpose |
| --- | --- | --- |
| Public website | `/` | Marketing, discovery and healthcare information |
| Doctor directory | `/doctors` | Search and compare clinicians |
| Authentication | `/login` | Sign in or open a safe demo workspace |
| Patient portal | `/patient` | Patient care and appointment workspace |
| Doctor portal | `/doctor` | Clinical workflow workspace |
| Admin portal | `/admin` | Platform operations workspace |

The three role portals are different views of the **same application**. They do not need three terminals, three React servers or three separate databases.

## Roles and responsibilities

### Patient

The patient experience covers the complete journey from finding a clinician to managing follow-up care.

Patients can:

- Search doctors by name, specialty or city.
- Filter by specialty, gender, consultation mode, fee, rating and availability.
- Open doctor profiles and review experience, clinic, languages, consultation modes and fee.
- Book an appointment through a guided four-step flow.
- Choose in-person or video consultation.
- Select an available date and time slot.
- Add a reason for the visit and an optional note.
- View upcoming and historical appointments.
- Reschedule or cancel eligible appointments.
- Leave a review after a completed visit.
- View the care team / saved doctors.
- Use secure patient-doctor messaging.
- View medical records and uploaded documents.
- View prescriptions and medication instructions.
- View lab results.
- View invoices and billing status.
- Manage insurance information.
- View notifications and reminders.
- Update profile and emergency-contact information.
- Manage notification/accessibility preferences.
- Use account-security and session controls.

The live booking backend verifies the current clinician fee and slot availability on the server. It also prevents overlapping or duplicate bookings.

### Doctor

The doctor portal is the clinical workspace.

Doctors can:

- View dashboard metrics and upcoming consultations.
- Review today's and future appointments.
- Accept or decline appointment requests.
- Access relevant patient information.
- Manage weekly availability and consultation modes.
- Add or update appointment/consultation status.
- Write consultation notes and clinical records.
- Create and manage prescriptions.
- Review and add lab-result information.
- Use secure patient messaging.
- Review invoice-derived consultation earnings.
- Maintain a public doctor profile.
- Manage specialties and consultation settings.
- Update workspace preferences.

Clinical access is restricted by backend authorization and Row Level Security rather than relying only on hidden frontend pages.

### Admin

The admin portal is the platform-control workspace.

Admins can:

- View operational dashboard metrics.
- Manage patient and clinician accounts.
- Review and verify doctor profiles.
- Change allowed user/account status.
- Manage platform-wide appointments.
- Create and edit specialties.
- Moderate patient reviews.
- Manage invoice/payment status records.
- Review operational analytics.
- Handle support requests.
- Review audit activity.
- Invite clinicians/admin users through trusted backend operations.

Admin capabilities are protected by server-side checks and are not available through public registration.

## End-to-end workflow

A normal care journey looks like this:

```text
Patient searches for a doctor
        |
        v
Patient opens clinician profile
        |
        v
Patient chooses consultation type + live slot
        |
        v
Server validates availability + fee
        |
        v
Appointment is created
        |
        v
Doctor sees the appointment
        |
        v
Doctor completes consultation
        |
        +--> consultation note
        +--> medical record
        +--> prescription
        +--> lab result / follow-up
        |
        v
Patient sees updated care information
        |
        v
Admin oversees platform operations and support
```

## Synthetic / dummy preview mode

The portfolio includes a clearly labeled **synthetic demo mode** so the product can be explored without putting real patient information into the database.

Demo mode lets a reviewer safely test representative interactions such as:

- Patient booking, rescheduling, cancellation and review states.
- Patient messages, records, prescriptions, labs, insurance, profile and settings.
- Doctor appointment requests, availability, consultation notes and prescription workflows.
- Admin add/search/manage/export interactions.
- Responsive Patient, Doctor and Admin dashboards.

Synthetic preview data is explicitly marked as demo data. Browser-only demo booking data does not create a real health record.

Authenticated routes, by contrast, are wired to the Supabase backend for the supported live workflows.

## Backend and security model

Medora uses one Supabase project for all three roles:

- **Supabase Auth** for authentication and session handling.
- **PostgreSQL** for application data.
- **Row Level Security (RLS)** to enforce role-aware data access.
- **RPC functions** for sensitive workflows such as appointment booking.
- **Private Storage** for medical documents.
- **Audit events** for sensitive administrative activity.

Simplified access model:

```text
Patient
  -> own patient data and permitted care records

Doctor
  -> relevant clinical/patient data for authorized workflows

Admin
  -> controlled administrative operations

Public user
  -> public clinician/specialty information only
```

The frontend does not grant access merely by hiding buttons. The database policies and privileged backend functions enforce the important boundaries.

## What is intentionally not claimed

This portfolio project demonstrates healthcare workflow architecture, but it does **not** claim production medical compliance certification.

Also:

- No real card-payment gateway is connected. Billing/invoice status is modeled and managed in the application.
- No third-party live video-call provider is integrated. Video appointments store the consultation type / meeting workflow only.
- Synthetic demo data must be used for portfolio testing; real protected health information should not be entered.

## Backend architecture
`supabase/migrations/001_healthcare_schema.sql` models the three-role system with profiles, doctor profiles, specialties, availability, appointments, medical records, prescriptions, lab results, conversations/messages, insurance, invoices, reviews, notifications, support requests and audit events.

RLS policies separate patient-owned data, doctor clinical access and administrative visibility. `book_appointment(...)` validates the authenticated patient, verified doctor, future time, consultation type, fee and slot collision on the server before creating an appointment.

> The **Healthcare Appointment System** Supabase project (`rjiejqtrffdutrmcvaxg`) is connected across the full authenticated product. Patient, doctor and admin workspaces read and write live Supabase data for appointments, records, prescriptions, lab results, messaging, insurance, invoices, notifications, profile/preferences, clinician availability, doctor verification, specialties, review moderation, support and audit activity.
>
> Public registration always creates a patient. Doctor/admin roles and doctor verification are controlled by trusted backend operations. Unauthenticated "Open demo" routes intentionally use synthetic UI fixtures so the portfolio can be reviewed without exposing real health information. Never use real medical information for portfolio testing.

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

The follow-up migrations add optimized RLS/indexes, the complete three-role portal backend, private medical-document storage, patient rescheduling and completed-visit reviews, first-admin bootstrap controls, and public support intake. The eight specialties are reference data. The database intentionally contains no real patient information; preview content should remain synthetic.

- `qa/backend-report.json`: live Auth/REST/RPC checks, including concurrent bookings, invalid inputs, price tampering and isolation across patient and clinician accounts.
- `qa/frontend-report.json`: a Chromium run against the real Supabase backend, including guided booking, reload persistence, cancellation, responsive layouts and conflicting-slot recovery.
- `tests/healthcare.spec.js`: presentation regression tests with read-only directory fixtures. These do not claim to test live booking.
- `tests/backend-qa.mjs` / `tests/live-booking-qa.mjs`: live suites accept a disposable fixture configuration on stdin (`tag`, `password`, `ids`); credentials must never be committed. `npm run test:backend` and `npm run test:booking` start these suites. The browser suite starts its own Vite server unless `QA_BASE_URL` is supplied; `QA_BROWSER_EXECUTABLE` may select an installed Chromium executable.

No service-role key is used in the browser or committed. Confirmations display the actual database UUID, not a static confirmation code. All dates and slots use Asia/Karachi explicitly. An empty directory, session failure, RPC error or slot conflict never produces a successful booking screen.


## Full portal backend status

Authenticated routes use the live backend rather than the static portfolio fixtures:

- Patient: dashboard, booking/rescheduling/cancellation, care team, messages, records/document upload, prescriptions, labs, billing, insurance, notifications, profile, preferences and password/session controls.
- Doctor: dashboard, appointment status workflow, patient list, availability, consultation records, prescriptions, lab results, messages, invoice-derived earnings, public profile and specialties.
- Admin: dashboard, role/account controls, doctor verification, appointment operations, specialties, review moderation, invoice status, analytics, support queue, audit activity and secure clinician/admin invitations.
- Storage: private `medical-documents` bucket with signed document access.
- Security: RLS on all exposed application tables, restricted grants, server-side privileged RPCs and a verified secure invite Edge Function.

External card charging and live video-call infrastructure are intentionally not claimed. Billing stores invoice/payment state only, and video appointments store scheduling/meeting metadata without integrating a paid third-party telehealth provider.
