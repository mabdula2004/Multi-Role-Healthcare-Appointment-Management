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

> The repository runs in portfolio/demo mode until a dedicated Supabase project is connected. Never enter real medical information into the demo.

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
