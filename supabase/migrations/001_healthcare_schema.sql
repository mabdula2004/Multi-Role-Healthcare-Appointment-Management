create extension if not exists pgcrypto;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'patient' check (role in ('patient','doctor','admin')),
  full_name text not null default '',
  phone text,
  date_of_birth date,
  gender text,
  city text,
  avatar_url text,
  emergency_contact jsonb not null default '{}'::jsonb,
  status text not null default 'active' check (status in ('active','pending','suspended')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.specialties (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text unique not null,
  description text not null default '',
  icon text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.doctor_profiles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  professional_title text,
  bio text not null default '',
  qualification text,
  license_number text unique,
  years_experience integer not null default 0 check (years_experience >= 0),
  consultation_fee integer not null default 0 check (consultation_fee >= 0),
  clinic_name text,
  clinic_address text,
  city text,
  languages text[] not null default '{}',
  consultation_modes text[] not null default array['In-person']::text[],
  verification_status text not null default 'pending' check (verification_status in ('pending','verified','rejected')),
  average_rating numeric(3,2) not null default 0,
  review_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.doctor_specialties (
  doctor_id uuid not null references public.doctor_profiles(user_id) on delete cascade,
  specialty_id uuid not null references public.specialties(id) on delete cascade,
  is_primary boolean not null default false,
  primary key (doctor_id, specialty_id)
);

create table public.doctor_availability (
  id uuid primary key default gen_random_uuid(),
  doctor_id uuid not null references public.doctor_profiles(user_id) on delete cascade,
  day_of_week smallint not null check (day_of_week between 0 and 6),
  start_time time not null,
  end_time time not null,
  slot_minutes integer not null default 30 check (slot_minutes between 10 and 180),
  consultation_mode text not null check (consultation_mode in ('In-person','Video')),
  active boolean not null default true,
  check (end_time > start_time)
);

create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.profiles(id) on delete restrict,
  doctor_id uuid not null references public.doctor_profiles(user_id) on delete restrict,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  consultation_mode text not null check (consultation_mode in ('In-person','Video')),
  reason text not null,
  status text not null default 'requested' check (status in ('requested','confirmed','checked_in','completed','cancelled','no_show')),
  fee_amount integer not null check (fee_amount >= 0),
  clinic_name text,
  meeting_url text,
  patient_note text,
  doctor_note text,
  cancellation_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

create table public.medical_records (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.profiles(id) on delete cascade,
  doctor_id uuid references public.doctor_profiles(user_id) on delete set null,
  appointment_id uuid references public.appointments(id) on delete set null,
  record_type text not null check (record_type in ('consultation','diagnosis','procedure','document','other')),
  title text not null,
  summary text,
  document_url text,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table public.prescriptions (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.profiles(id) on delete cascade,
  doctor_id uuid not null references public.doctor_profiles(user_id) on delete restrict,
  appointment_id uuid references public.appointments(id) on delete set null,
  medication text not null,
  dose text not null,
  frequency text not null,
  duration text,
  instructions text,
  refills integer not null default 0 check (refills >= 0),
  status text not null default 'active' check (status in ('draft','active','completed','cancelled')),
  prescribed_at timestamptz not null default now(),
  expires_at timestamptz
);

create table public.lab_results (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.profiles(id) on delete cascade,
  reviewing_doctor_id uuid references public.doctor_profiles(user_id) on delete set null,
  test_name text not null,
  laboratory_name text,
  result_payload jsonb not null default '{}'::jsonb,
  document_url text,
  status text not null default 'new' check (status in ('new','reviewed','archived')),
  collected_at timestamptz,
  resulted_at timestamptz not null default now(),
  reviewed_at timestamptz
);

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.profiles(id) on delete cascade,
  doctor_id uuid not null references public.doctor_profiles(user_id) on delete cascade,
  appointment_id uuid references public.appointments(id) on delete set null,
  created_at timestamptz not null default now(),
  unique(patient_id, doctor_id, appointment_id)
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (length(body) between 1 and 5000),
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.insurance_profiles (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.profiles(id) on delete cascade,
  provider_name text not null,
  policy_number_masked text not null,
  coverage_payload jsonb not null default '{}'::jsonb,
  valid_until date,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.profiles(id) on delete restrict,
  doctor_id uuid references public.doctor_profiles(user_id) on delete set null,
  appointment_id uuid references public.appointments(id) on delete set null,
  amount integer not null check (amount >= 0),
  currency text not null default 'PKR',
  status text not null default 'pending' check (status in ('pending','paid','refunded','void')),
  due_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references public.profiles(id) on delete cascade,
  doctor_id uuid not null references public.doctor_profiles(user_id) on delete cascade,
  appointment_id uuid unique not null references public.appointments(id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  body text,
  status text not null default 'published' check (status in ('published','flagged','hidden')),
  created_at timestamptz not null default now()
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null,
  title text not null,
  body text not null,
  link text,
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.support_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  subject text not null,
  body text not null,
  priority text not null default 'normal' check (priority in ('low','normal','high','urgent')),
  status text not null default 'open' check (status in ('open','in_progress','resolved','closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.audit_events (
  id bigint generated always as identity primary key,
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index appointments_patient_start_idx on public.appointments(patient_id, starts_at desc);
create index appointments_doctor_start_idx on public.appointments(doctor_id, starts_at desc);
create index messages_conversation_created_idx on public.messages(conversation_id, created_at);
create index records_patient_occurred_idx on public.medical_records(patient_id, occurred_at desc);
create index prescriptions_patient_status_idx on public.prescriptions(patient_id, status);
create index notifications_user_created_idx on public.notifications(user_id, created_at desc);

create or replace function public.current_app_role() returns text
language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles(id, role, full_name)
  values(new.id, 'patient', coalesce(new.raw_user_meta_data->>'full_name',''));
  return new;
end; $$;

create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.specialties enable row level security;
alter table public.doctor_profiles enable row level security;
alter table public.doctor_specialties enable row level security;
alter table public.doctor_availability enable row level security;
alter table public.appointments enable row level security;
alter table public.medical_records enable row level security;
alter table public.prescriptions enable row level security;
alter table public.lab_results enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.insurance_profiles enable row level security;
alter table public.invoices enable row level security;
alter table public.reviews enable row level security;
alter table public.notifications enable row level security;
alter table public.support_requests enable row level security;
alter table public.audit_events enable row level security;

create policy "public specialties read" on public.specialties for select using (active=true);
create policy "verified doctors public read" on public.doctor_profiles for select using (verification_status='verified' or user_id=auth.uid() or public.current_app_role()='admin');
create policy "doctor specialties public read" on public.doctor_specialties for select using (true);
create policy "doctor availability public read" on public.doctor_availability for select using (active=true);
create policy "profile own or care admin read" on public.profiles for select using (id=auth.uid() or public.current_app_role()='admin');
create policy "profile own update" on public.profiles for update using (id=auth.uid()) with check (id=auth.uid());

create policy "appointments participant read" on public.appointments for select using (patient_id=auth.uid() or doctor_id=auth.uid() or public.current_app_role()='admin');
create policy "appointments patient insert" on public.appointments for insert with check (patient_id=auth.uid() and public.current_app_role()='patient');
create policy "appointments participant update" on public.appointments for update using (patient_id=auth.uid() or doctor_id=auth.uid() or public.current_app_role()='admin');

create policy "records patient doctor admin read" on public.medical_records for select using (patient_id=auth.uid() or doctor_id=auth.uid() or public.current_app_role()='admin');
create policy "records doctor admin insert" on public.medical_records for insert with check (doctor_id=auth.uid() or public.current_app_role()='admin');
create policy "prescriptions patient doctor admin read" on public.prescriptions for select using (patient_id=auth.uid() or doctor_id=auth.uid() or public.current_app_role()='admin');
create policy "prescriptions doctor insert" on public.prescriptions for insert with check (doctor_id=auth.uid() and public.current_app_role()='doctor');
create policy "labs patient doctor admin read" on public.lab_results for select using (patient_id=auth.uid() or reviewing_doctor_id=auth.uid() or public.current_app_role()='admin');

create policy "conversations participants read" on public.conversations for select using (patient_id=auth.uid() or doctor_id=auth.uid() or public.current_app_role()='admin');
create policy "conversations patient doctor insert" on public.conversations for insert with check (patient_id=auth.uid() or doctor_id=auth.uid());
create policy "messages participants read" on public.messages for select using (exists(select 1 from public.conversations c where c.id=conversation_id and (c.patient_id=auth.uid() or c.doctor_id=auth.uid() or public.current_app_role()='admin')));
create policy "messages participants insert" on public.messages for insert with check (sender_id=auth.uid() and exists(select 1 from public.conversations c where c.id=conversation_id and (c.patient_id=auth.uid() or c.doctor_id=auth.uid())));

create policy "insurance owner admin read" on public.insurance_profiles for select using (patient_id=auth.uid() or public.current_app_role()='admin');
create policy "insurance owner write" on public.insurance_profiles for all using (patient_id=auth.uid()) with check (patient_id=auth.uid());
create policy "invoice participant read" on public.invoices for select using (patient_id=auth.uid() or doctor_id=auth.uid() or public.current_app_role()='admin');
create policy "reviews public read" on public.reviews for select using (status='published' or patient_id=auth.uid() or public.current_app_role()='admin');
create policy "reviews patient insert" on public.reviews for insert with check (patient_id=auth.uid());
create policy "notifications own read" on public.notifications for select using (user_id=auth.uid());
create policy "notifications own update" on public.notifications for update using (user_id=auth.uid());
create policy "support own admin read" on public.support_requests for select using (user_id=auth.uid() or public.current_app_role()='admin');
create policy "support own insert" on public.support_requests for insert with check (user_id=auth.uid() or user_id is null);
create policy "audit admin read" on public.audit_events for select using (public.current_app_role()='admin');

create policy "doctor own profile update" on public.doctor_profiles for update using (user_id=auth.uid()) with check (user_id=auth.uid());
create policy "doctor own availability write" on public.doctor_availability for all using (doctor_id=auth.uid()) with check (doctor_id=auth.uid());

create or replace function public.book_appointment(
  p_doctor_id uuid,
  p_starts_at timestamptz,
  p_consultation_mode text,
  p_reason text,
  p_patient_note text default null
) returns uuid
language plpgsql security definer set search_path=public as $$
declare
  v_patient uuid := auth.uid();
  v_fee integer;
  v_id uuid;
  v_duration interval := interval '30 minutes';
begin
  if v_patient is null then raise exception 'Authentication required'; end if;
  if public.current_app_role() <> 'patient' then raise exception 'Patient role required'; end if;
  if p_starts_at <= now() then raise exception 'Appointment must be in the future'; end if;
  if p_consultation_mode not in ('In-person','Video') then raise exception 'Unsupported consultation mode'; end if;
  select consultation_fee into v_fee from public.doctor_profiles where user_id=p_doctor_id and verification_status='verified';
  if v_fee is null then raise exception 'Doctor is unavailable'; end if;
  if exists(select 1 from public.appointments where doctor_id=p_doctor_id and status in ('requested','confirmed','checked_in') and tstzrange(starts_at,ends_at,'[)') && tstzrange(p_starts_at,p_starts_at+v_duration,'[)')) then raise exception 'Selected slot is no longer available'; end if;
  insert into public.appointments(patient_id,doctor_id,starts_at,ends_at,consultation_mode,reason,fee_amount,patient_note,status)
  values(v_patient,p_doctor_id,p_starts_at,p_starts_at+v_duration,p_consultation_mode,p_reason,v_fee,p_patient_note,'confirmed') returning id into v_id;
  insert into public.notifications(user_id,kind,title,body,link) values(v_patient,'appointment','Appointment confirmed','Your appointment has been confirmed.','/patient/appointments');
  return v_id;
end; $$;

grant execute on function public.book_appointment(uuid,timestamptz,text,text,text) to authenticated;

-- Appended to 001 before first deployment; all changes commit atomically.
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to anon, authenticated;
create extension if not exists btree_gist with schema extensions;

create or replace function private.current_app_role() returns text
language sql stable security definer set search_path='' as $$
  select role from public.profiles where id=auth.uid() and status='active';
$$;
create or replace function public.current_app_role() returns text
language sql stable security invoker set search_path='' as $$ select private.current_app_role(); $$;

create or replace function private.handle_new_user() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  insert into public.profiles(id,role,full_name)
  values(new.id,'patient',coalesce(new.raw_user_meta_data->>'full_name',''));
  return new;
end; $$;
drop trigger on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function private.handle_new_user();
drop function public.handle_new_user();

-- Column grants protect role/status/verification and immutable identifiers.
revoke all on all tables in schema public from anon,authenticated;
grant select on public.specialties,public.doctor_profiles,public.doctor_specialties,public.doctor_availability,public.reviews to anon,authenticated;
grant select on public.profiles,public.appointments,public.medical_records,public.prescriptions,public.lab_results,public.conversations,public.messages,public.insurance_profiles,public.invoices,public.notifications,public.support_requests,public.audit_events to authenticated;
grant update(full_name,phone,date_of_birth,gender,city,avatar_url,emergency_contact) on public.profiles to authenticated;
grant update(professional_title,bio,qualification,license_number,years_experience,consultation_fee,clinic_name,clinic_address,city,languages,consultation_modes) on public.doctor_profiles to authenticated;
grant insert,update,delete on public.doctor_availability to authenticated;
grant insert on public.medical_records,public.prescriptions,public.conversations,public.messages,public.reviews,public.support_requests to authenticated;
grant insert,update,delete on public.insurance_profiles to authenticated;
grant update(read_at) on public.notifications to authenticated;

drop policy "appointments patient insert" on public.appointments;
drop policy "appointments participant update" on public.appointments;
drop policy "doctor availability public read" on public.doctor_availability;
create policy "doctor availability public read" on public.doctor_availability for select to anon,authenticated using (active and exists(select 1 from public.doctor_profiles d where d.user_id=doctor_id and d.verification_status='verified'));
drop policy "doctor specialties public read" on public.doctor_specialties;
create policy "doctor specialties public read" on public.doctor_specialties for select to anon,authenticated using (exists(select 1 from public.doctor_profiles d where d.user_id=doctor_id and d.verification_status='verified'));
drop policy "doctor own availability write" on public.doctor_availability;
create policy "doctor own availability write" on public.doctor_availability for all to authenticated using (doctor_id=auth.uid() and public.current_app_role()='doctor') with check (doctor_id=auth.uid() and public.current_app_role()='doctor');
drop policy "records doctor admin insert" on public.medical_records;
create policy "records doctor admin insert" on public.medical_records for insert to authenticated with check (public.current_app_role()='admin' or (doctor_id=auth.uid() and public.current_app_role()='doctor' and exists(select 1 from public.appointments a where a.patient_id=medical_records.patient_id and a.doctor_id=auth.uid() and a.id=medical_records.appointment_id)));
drop policy "prescriptions doctor insert" on public.prescriptions;
create policy "prescriptions doctor insert" on public.prescriptions for insert to authenticated with check (doctor_id=auth.uid() and public.current_app_role()='doctor' and exists(select 1 from public.appointments a where a.patient_id=prescriptions.patient_id and a.doctor_id=auth.uid() and a.id=prescriptions.appointment_id));
drop policy "conversations patient doctor insert" on public.conversations;
create policy "conversations patient doctor insert" on public.conversations for insert to authenticated with check (exists(select 1 from public.appointments a where a.id=conversations.appointment_id and a.patient_id=conversations.patient_id and a.doctor_id=conversations.doctor_id and (a.patient_id=auth.uid() or a.doctor_id=auth.uid())));
drop policy "reviews patient insert" on public.reviews;
create policy "reviews patient insert" on public.reviews for insert to authenticated with check (patient_id=auth.uid() and status='published' and exists(select 1 from public.appointments a where a.id=reviews.appointment_id and a.patient_id=auth.uid() and a.doctor_id=reviews.doctor_id and a.status='completed'));
-- An owner may mark a notification read, never rewrite its owner or content.
drop policy "notifications own update" on public.notifications;
create policy "notifications own update" on public.notifications for update to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());

alter table public.appointments add constraint appointments_doctor_no_overlap exclude using gist (doctor_id with =, tstzrange(starts_at,ends_at,'[)') with &&) where (status in ('requested','confirmed','checked_in'));
alter table public.appointments add constraint appointment_reason_length check(char_length(btrim(reason)) between 3 and 1000);

create or replace function private.book_appointment(p_doctor_id uuid,p_starts_at timestamptz,p_consultation_mode text,p_reason text,p_patient_note text default null) returns uuid
language plpgsql security definer set search_path='' as $$
declare
  v_patient uuid:=auth.uid(); v_doctor public.doctor_profiles; v_id uuid;
  v_local timestamp; v_minutes integer; v_end timestamptz;
begin
  if v_patient is null then raise exception 'Authentication required'; end if;
  if private.current_app_role() is distinct from 'patient' then raise exception 'Active patient role required'; end if;
  if p_starts_at is null or not isfinite(p_starts_at) or p_starts_at<=now() then raise exception 'Appointment must be in the future'; end if;
  if p_reason is null or char_length(btrim(p_reason)) not between 3 and 1000 then raise exception 'Reason must contain 3 to 1000 characters'; end if;
  if char_length(coalesce(p_patient_note,''))>2000 then raise exception 'Patient note is too long'; end if;
  if p_consultation_mode is null or p_consultation_mode not in ('In-person','Video') then raise exception 'Unsupported consultation mode'; end if;
  select d.* into v_doctor from public.doctor_profiles d join public.profiles p on p.id=d.user_id where d.user_id=p_doctor_id and d.verification_status='verified' and p.role='doctor' and p.status='active' for update of d;
  if not found then raise exception 'Doctor is unavailable'; end if;
  if not(p_consultation_mode=any(v_doctor.consultation_modes)) then raise exception 'Doctor does not support this consultation mode'; end if;
  v_local:=p_starts_at at time zone 'Asia/Karachi';
  select a.slot_minutes into v_minutes from public.doctor_availability a
    where a.doctor_id=p_doctor_id and a.active and a.consultation_mode=p_consultation_mode
    and a.day_of_week=extract(dow from v_local) and v_local::time>=a.start_time
    and (v_local+make_interval(mins=>a.slot_minutes))::date=v_local::date
    and (v_local+make_interval(mins=>a.slot_minutes))::time<=a.end_time
    and mod(extract(epoch from(v_local::time-a.start_time))::numeric,(a.slot_minutes*60)::numeric)=0
    order by a.slot_minutes limit 1;
  if v_minutes is null then raise exception 'Selected time is outside doctor availability'; end if;
  v_end:=p_starts_at+make_interval(mins=>v_minutes);
  if exists(select 1 from public.appointments where doctor_id=p_doctor_id and status in ('requested','confirmed','checked_in') and tstzrange(starts_at,ends_at,'[)') && tstzrange(p_starts_at,v_end,'[)')) then raise exception 'Selected slot is no longer available'; end if;
  insert into public.appointments(patient_id,doctor_id,starts_at,ends_at,consultation_mode,reason,fee_amount,patient_note,status,clinic_name)
  values(v_patient,p_doctor_id,p_starts_at,v_end,p_consultation_mode,btrim(p_reason),v_doctor.consultation_fee,p_patient_note,'confirmed',v_doctor.clinic_name) returning id into v_id;
  insert into public.notifications(user_id,kind,title,body,link) values(v_patient,'appointment','Appointment confirmed','Your appointment has been confirmed.','/patient/appointments');
  return v_id;
exception when exclusion_violation then raise exception 'Selected slot is no longer available';
end; $$;
create or replace function public.book_appointment(p_doctor_id uuid,p_starts_at timestamptz,p_consultation_mode text,p_reason text,p_patient_note text default null) returns uuid
language sql security invoker set search_path='' as $$ select private.book_appointment(p_doctor_id,p_starts_at,p_consultation_mode,p_reason,p_patient_note); $$;

create function private.cancel_appointment(p_appointment_id uuid) returns uuid
language plpgsql security definer set search_path='' as $$
declare v_id uuid;
begin
 if auth.uid() is null or private.current_app_role() is distinct from 'patient' then raise exception 'Active patient authentication required'; end if;
 update public.appointments set status='cancelled',updated_at=now() where id=p_appointment_id and patient_id=auth.uid() and starts_at>now() and status in ('requested','confirmed') returning id into v_id;
 if v_id is null then raise exception 'Appointment cannot be cancelled'; end if;
 return v_id;
end; $$;
create function public.cancel_appointment(p_appointment_id uuid) returns uuid language sql security invoker set search_path='' as $$ select private.cancel_appointment(p_appointment_id); $$;

-- Only approved professional directory fields; no private patient/profile data.
create function private.list_verified_doctors() returns jsonb
language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object('id',d.user_id,'name',p.full_name,'gender',p.gender,'image',p.avatar_url,'clinic',d.clinic_name,'location',d.city,'rating',d.average_rating,'reviews',d.review_count,'experience',d.years_experience,'fee',d.consultation_fee,'mode',d.consultation_modes,'languages',d.languages,'about',d.bio,'specialty',coalesce((select s.name from public.doctor_specialties ds join public.specialties s on s.id=ds.specialty_id where ds.doctor_id=d.user_id and s.active order by ds.is_primary desc,s.name limit 1),'General Medicine')) order by p.full_name),'[]'::jsonb)
 from public.doctor_profiles d join public.profiles p on p.id=d.user_id where d.verification_status='verified' and p.role='doctor' and p.status='active';
$$;
create function public.list_verified_doctors() returns jsonb language sql stable security invoker set search_path='' as $$ select private.list_verified_doctors(); $$;

-- Only occupied times are exposed, never appointment IDs/patient IDs/reasons.
create function private.get_available_slots(p_doctor_id uuid,p_date date,p_consultation_mode text) returns table(starts_at timestamptz,ends_at timestamptz)
language sql stable security definer set search_path='' as $$
 select distinct s.slot, s.slot+make_interval(mins=>a.slot_minutes)
 from public.doctor_availability a join public.doctor_profiles d on d.user_id=a.doctor_id join public.profiles p on p.id=d.user_id
 cross join lateral generate_series((p_date+a.start_time) at time zone 'Asia/Karachi',((p_date+a.end_time) at time zone 'Asia/Karachi')-make_interval(mins=>a.slot_minutes),make_interval(mins=>a.slot_minutes)) s(slot)
 where a.doctor_id=p_doctor_id and a.day_of_week=extract(dow from p_date) and a.active and a.consultation_mode=p_consultation_mode and d.verification_status='verified' and p.role='doctor' and p.status='active' and p_consultation_mode=any(d.consultation_modes)
 and p_date between (now() at time zone 'Asia/Karachi')::date and (now() at time zone 'Asia/Karachi')::date+180 and s.slot>now()
 and not exists(select 1 from public.appointments x where x.doctor_id=p_doctor_id and x.status in ('requested','confirmed','checked_in') and tstzrange(x.starts_at,x.ends_at,'[)') && tstzrange(s.slot,s.slot+make_interval(mins=>a.slot_minutes),'[)')) order by 1;
$$;
create function public.get_available_slots(p_doctor_id uuid,p_date date,p_consultation_mode text) returns table(starts_at timestamptz,ends_at timestamptz) language sql stable security invoker set search_path='' as $$ select * from private.get_available_slots(p_doctor_id,p_date,p_consultation_mode); $$;

revoke execute on all functions in schema public from public,anon,authenticated;
revoke execute on all functions in schema private from public,anon,authenticated;
grant execute on function public.current_app_role(),private.current_app_role(),public.list_verified_doctors(),private.list_verified_doctors(),public.get_available_slots(uuid,date,text),private.get_available_slots(uuid,date,text) to anon,authenticated;
grant execute on function public.book_appointment(uuid,timestamptz,text,text,text),private.book_appointment(uuid,timestamptz,text,text,text),public.cancel_appointment(uuid),private.cancel_appointment(uuid) to authenticated;
