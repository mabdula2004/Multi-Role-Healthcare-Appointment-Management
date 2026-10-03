
create table if not exists public.user_preferences (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  appointment_reminders boolean not null default true,
  prescription_reminders boolean not null default true,
  lab_result_alerts boolean not null default true,
  message_alerts boolean not null default true,
  email_notifications boolean not null default true,
  sms_notifications boolean not null default false,
  text_size text not null default 'default' check (text_size in ('default','large')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_preferences enable row level security;

alter table public.medical_records add column if not exists status text not null default 'signed';
alter table public.support_requests add column if not exists resolution_note text;
alter table public.doctor_profiles add column if not exists accepting_patients boolean not null default true;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid='public.medical_records'::regclass
      and conname='medical_records_status_check'
  ) then
    alter table public.medical_records
      add constraint medical_records_status_check check (status in ('draft','signed'));
  end if;
end $$;

create unique index if not exists invoices_appointment_unique_idx
  on public.invoices(appointment_id) where appointment_id is not null;
create index if not exists appointments_status_start_idx on public.appointments(status,starts_at);
create index if not exists reviews_status_created_idx on public.reviews(status,created_at desc);
create index if not exists support_status_created_idx on public.support_requests(status,created_at desc);

insert into public.user_preferences(user_id)
select id from public.profiles
on conflict (user_id) do nothing;

create or replace function private.handle_new_user() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  insert into public.profiles(id,role,full_name)
  values(new.id,'patient',coalesce(new.raw_user_meta_data->>'full_name',''));
  insert into public.user_preferences(user_id) values(new.id) on conflict do nothing;
  return new;
end; $$;

create or replace function private.touch_updated_at() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  new.updated_at:=now();
  return new;
end; $$;

drop trigger if exists profiles_touch_updated_at on public.profiles;
create trigger profiles_touch_updated_at before update on public.profiles
for each row execute function private.touch_updated_at();
drop trigger if exists doctor_profiles_touch_updated_at on public.doctor_profiles;
create trigger doctor_profiles_touch_updated_at before update on public.doctor_profiles
for each row execute function private.touch_updated_at();
drop trigger if exists appointments_touch_updated_at on public.appointments;
create trigger appointments_touch_updated_at before update on public.appointments
for each row execute function private.touch_updated_at();
drop trigger if exists support_touch_updated_at on public.support_requests;
create trigger support_touch_updated_at before update on public.support_requests
for each row execute function private.touch_updated_at();
drop trigger if exists preferences_touch_updated_at on public.user_preferences;
create trigger preferences_touch_updated_at before update on public.user_preferences
for each row execute function private.touch_updated_at();

revoke all on public.user_preferences from anon,authenticated;
grant select,insert,update on public.user_preferences to authenticated;

grant insert on public.doctor_specialties to authenticated;
grant delete on public.doctor_specialties to authenticated;

grant update(record_type,title,summary,document_url,status,occurred_at) on public.medical_records to authenticated;
grant delete on public.medical_records to authenticated;

grant update(medication,dose,frequency,duration,instructions,refills,status,expires_at) on public.prescriptions to authenticated;
grant delete on public.prescriptions to authenticated;

grant insert on public.lab_results to authenticated;
grant update(test_name,laboratory_name,result_payload,document_url,status,collected_at,resulted_at,reviewed_at) on public.lab_results to authenticated;
grant delete on public.lab_results to authenticated;

grant update(read_at) on public.messages to authenticated;
grant update(rating,body) on public.reviews to authenticated;
grant delete on public.reviews to authenticated;

grant update(accepting_patients) on public.doctor_profiles to authenticated;

drop policy if exists "user preferences own read" on public.user_preferences;
create policy "user preferences own read" on public.user_preferences
for select to authenticated using (user_id=(select auth.uid()));
drop policy if exists "user preferences own insert" on public.user_preferences;
create policy "user preferences own insert" on public.user_preferences
for insert to authenticated with check (user_id=(select auth.uid()));
drop policy if exists "user preferences own update" on public.user_preferences;
create policy "user preferences own update" on public.user_preferences
for update to authenticated using (user_id=(select auth.uid())) with check (user_id=(select auth.uid()));

drop policy if exists "profile own or care admin read" on public.profiles;
create policy "profile own care doctor admin read" on public.profiles
for select to authenticated using (
  id=(select auth.uid())
  or (select public.current_app_role())='admin'
  or (
    role='patient'
    and (select public.current_app_role())='doctor'
    and exists (
      select 1 from public.appointments a
      where a.patient_id=profiles.id and a.doctor_id=(select auth.uid())
    )
  )
);

drop policy if exists "public specialties read" on public.specialties;
create policy "public specialties read" on public.specialties
for select to anon,authenticated using (active=true or (select public.current_app_role())='admin');

drop policy if exists "doctor specialties public read" on public.doctor_specialties;
create policy "doctor specialties public read" on public.doctor_specialties
for select to anon,authenticated using (
  doctor_id=(select auth.uid())
  or (select public.current_app_role())='admin'
  or exists(
    select 1 from public.doctor_profiles d
    where d.user_id=doctor_id and d.verification_status='verified'
  )
);
drop policy if exists "doctor specialties own insert" on public.doctor_specialties;
create policy "doctor specialties own insert" on public.doctor_specialties
for insert to authenticated with check (
  doctor_id=(select auth.uid()) and (select public.current_app_role())='doctor'
);
drop policy if exists "doctor specialties own delete" on public.doctor_specialties;
create policy "doctor specialties own delete" on public.doctor_specialties
for delete to authenticated using (
  doctor_id=(select auth.uid()) and (select public.current_app_role())='doctor'
);

drop policy if exists "doctor availability public read" on public.doctor_availability;
create policy "doctor availability public read" on public.doctor_availability
for select to anon,authenticated using (
  (select public.current_app_role())='admin'
  or (doctor_id=(select auth.uid()) and (select public.current_app_role())='doctor')
  or (
    active and exists(
      select 1 from public.doctor_profiles d
      join public.profiles p on p.id=d.user_id
      where d.user_id=doctor_id and d.verification_status='verified'
        and d.accepting_patients and p.role='doctor' and p.status='active'
    )
  )
);

drop policy if exists "records patient doctor admin read" on public.medical_records;
create policy "records patient doctor admin read" on public.medical_records
for select to authenticated using (
  (select public.current_app_role())='admin'
  or doctor_id=(select auth.uid())
  or (patient_id=(select auth.uid()) and status='signed')
);
drop policy if exists "records doctor admin insert" on public.medical_records;
create policy "records controlled insert" on public.medical_records
for insert to authenticated with check (
  (select public.current_app_role())='admin'
  or (
    doctor_id=(select auth.uid())
    and (select public.current_app_role())='doctor'
    and exists(
      select 1 from public.appointments a
      where a.id=medical_records.appointment_id
        and a.patient_id=medical_records.patient_id
        and a.doctor_id=(select auth.uid())
    )
  )
  or (
    patient_id=(select auth.uid())
    and (select public.current_app_role())='patient'
    and record_type='document'
    and doctor_id is null
    and appointment_id is null
    and status='signed'
  )
);
drop policy if exists "records controlled update" on public.medical_records;
create policy "records controlled update" on public.medical_records
for update to authenticated using (
  (select public.current_app_role())='admin'
  or (doctor_id=(select auth.uid()) and (select public.current_app_role())='doctor')
  or (patient_id=(select auth.uid()) and doctor_id is null and record_type='document')
) with check (
  (select public.current_app_role())='admin'
  or (doctor_id=(select auth.uid()) and (select public.current_app_role())='doctor')
  or (patient_id=(select auth.uid()) and doctor_id is null and record_type='document' and status='signed')
);
drop policy if exists "records controlled delete" on public.medical_records;
create policy "records controlled delete" on public.medical_records
for delete to authenticated using (
  (select public.current_app_role())='admin'
  or (doctor_id=(select auth.uid()) and (select public.current_app_role())='doctor' and status='draft')
  or (patient_id=(select auth.uid()) and doctor_id is null and record_type='document')
);

drop policy if exists "prescriptions controlled update" on public.prescriptions;
create policy "prescriptions controlled update" on public.prescriptions
for update to authenticated using (
  (select public.current_app_role())='admin'
  or (doctor_id=(select auth.uid()) and (select public.current_app_role())='doctor')
) with check (
  (select public.current_app_role())='admin'
  or (doctor_id=(select auth.uid()) and (select public.current_app_role())='doctor')
);
drop policy if exists "prescriptions controlled delete" on public.prescriptions;
create policy "prescriptions controlled delete" on public.prescriptions
for delete to authenticated using (
  (select public.current_app_role())='admin'
  or (doctor_id=(select auth.uid()) and (select public.current_app_role())='doctor' and status='draft')
);

drop policy if exists "labs doctor admin insert" on public.lab_results;
create policy "labs doctor admin insert" on public.lab_results
for insert to authenticated with check (
  (select public.current_app_role())='admin'
  or (
    reviewing_doctor_id=(select auth.uid())
    and (select public.current_app_role())='doctor'
    and exists(
      select 1 from public.appointments a
      where a.patient_id=lab_results.patient_id and a.doctor_id=(select auth.uid())
    )
  )
);
drop policy if exists "labs doctor admin update" on public.lab_results;
create policy "labs doctor admin update" on public.lab_results
for update to authenticated using (
  (select public.current_app_role())='admin'
  or (reviewing_doctor_id=(select auth.uid()) and (select public.current_app_role())='doctor')
) with check (
  (select public.current_app_role())='admin'
  or (reviewing_doctor_id=(select auth.uid()) and (select public.current_app_role())='doctor')
);
drop policy if exists "labs doctor admin delete" on public.lab_results;
create policy "labs doctor admin delete" on public.lab_results
for delete to authenticated using (
  (select public.current_app_role())='admin'
  or (reviewing_doctor_id=(select auth.uid()) and (select public.current_app_role())='doctor' and status='new')
);

drop policy if exists "messages participants update" on public.messages;
create policy "messages participants update" on public.messages
for update to authenticated using (
  exists(
    select 1 from public.conversations c
    where c.id=conversation_id
      and (c.patient_id=(select auth.uid()) or c.doctor_id=(select auth.uid()))
  )
) with check (
  exists(
    select 1 from public.conversations c
    where c.id=conversation_id
      and (c.patient_id=(select auth.uid()) or c.doctor_id=(select auth.uid()))
  )
);

drop policy if exists "reviews patient update" on public.reviews;
create policy "reviews patient update" on public.reviews
for update to authenticated using (
  patient_id=(select auth.uid()) and (select public.current_app_role())='patient'
) with check (
  patient_id=(select auth.uid()) and (select public.current_app_role())='patient'
);
drop policy if exists "reviews patient delete" on public.reviews;
create policy "reviews patient delete" on public.reviews
for delete to authenticated using (
  patient_id=(select auth.uid()) and (select public.current_app_role())='patient'
);

create or replace function private.write_audit(
  p_action text,p_entity_type text,p_entity_id text,p_metadata jsonb default '{}'::jsonb
) returns void language plpgsql security definer set search_path='' as $$
begin
  insert into public.audit_events(actor_id,action,entity_type,entity_id,metadata)
  values(auth.uid(),p_action,p_entity_type,p_entity_id,coalesce(p_metadata,'{}'::jsonb));
end; $$;

create or replace function private.patient_dashboard() returns jsonb
language sql stable security definer set search_path='' as $$
select jsonb_build_object(
  'next_appointment',(
    select to_jsonb(a) from public.appointments a
    where a.patient_id=auth.uid() and a.status in ('requested','confirmed','checked_in') and a.starts_at>now()
    order by a.starts_at limit 1
  ),
  'active_prescriptions',(select count(*) from public.prescriptions p where p.patient_id=auth.uid() and p.status='active'),
  'new_labs',(select count(*) from public.lab_results l where l.patient_id=auth.uid() and l.status='new'),
  'unread_messages',(
    select count(*) from public.messages m join public.conversations c on c.id=m.conversation_id
    where c.patient_id=auth.uid() and m.sender_id<>auth.uid() and m.read_at is null
  )
)
where private.current_app_role()='patient';
$$;

create or replace function public.patient_dashboard() returns jsonb
language sql stable set search_path='' as $$ select private.patient_dashboard(); $$;
revoke all on function public.patient_dashboard() from public;
grant execute on function public.patient_dashboard() to authenticated;

create or replace function private.doctor_dashboard() returns jsonb
language sql stable security definer set search_path='' as $$
select jsonb_build_object(
  'today',(
    select count(*) from public.appointments a
    where a.doctor_id=auth.uid()
      and (a.starts_at at time zone 'Asia/Karachi')::date=(now() at time zone 'Asia/Karachi')::date
      and a.status in ('requested','confirmed','checked_in')
  ),
  'upcoming',(
    select count(*) from public.appointments a
    where a.doctor_id=auth.uid() and a.starts_at>now()
      and a.status in ('requested','confirmed','checked_in')
  ),
  'patients',(select count(distinct a.patient_id) from public.appointments a where a.doctor_id=auth.uid()),
  'paid_revenue',(select coalesce(sum(i.amount),0) from public.invoices i where i.doctor_id=auth.uid() and i.status='paid')
)
where private.current_app_role()='doctor';
$$;

create or replace function public.doctor_dashboard() returns jsonb
language sql stable set search_path='' as $$ select private.doctor_dashboard(); $$;
revoke all on function public.doctor_dashboard() from public;
grant execute on function public.doctor_dashboard() to authenticated;

create or replace function private.admin_dashboard() returns jsonb
language sql stable security definer set search_path='' as $$
select jsonb_build_object(
  'patients',(select count(*) from public.profiles where role='patient' and status='active'),
  'verified_doctors',(select count(*) from public.doctor_profiles d join public.profiles p on p.id=d.user_id where p.role='doctor' and p.status='active' and d.verification_status='verified'),
  'appointments',(select count(*) from public.appointments),
  'paid_revenue',(select coalesce(sum(amount),0) from public.invoices where status='paid'),
  'pending_doctors',(select count(*) from public.doctor_profiles d join public.profiles p on p.id=d.user_id where p.role='doctor' and d.verification_status='pending'),
  'open_support',(select count(*) from public.support_requests where status in ('open','in_progress'))
)
where private.current_app_role()='admin';
$$;

create or replace function public.admin_dashboard() returns jsonb
language sql stable set search_path='' as $$ select private.admin_dashboard(); $$;
revoke all on function public.admin_dashboard() from public;
grant execute on function public.admin_dashboard() to authenticated;

create or replace function private.admin_list_users() returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare v jsonb;
begin
  if private.current_app_role() is distinct from 'admin' then raise exception 'Admin role required'; end if;
  select coalesce(jsonb_agg(jsonb_build_object(
    'id',p.id,'email',u.email,'role',p.role,'status',p.status,'full_name',p.full_name,
    'phone',p.phone,'city',p.city,'created_at',p.created_at,
    'doctor_verification',d.verification_status
  ) order by p.created_at desc),'[]'::jsonb)
  into v
  from public.profiles p
  left join auth.users u on u.id=p.id
  left join public.doctor_profiles d on d.user_id=p.id;
  return v;
end; $$;

create or replace function public.admin_list_users() returns jsonb
language sql stable set search_path='' as $$ select private.admin_list_users(); $$;
revoke all on function public.admin_list_users() from public;
grant execute on function public.admin_list_users() to authenticated;

create or replace function private.admin_update_user(
  p_user_id uuid,p_role text,p_status text
) returns uuid language plpgsql security definer set search_path='' as $$
declare v_old public.profiles;
begin
  if private.current_app_role() is distinct from 'admin' then raise exception 'Admin role required'; end if;
  if p_role not in ('patient','doctor','admin') then raise exception 'Invalid role'; end if;
  if p_status not in ('active','pending','suspended') then raise exception 'Invalid status'; end if;
  select * into v_old from public.profiles where id=p_user_id for update;
  if not found then raise exception 'User not found'; end if;
  if v_old.role='admin' and (p_role<>'admin' or p_status<>'active') and
     (select count(*) from public.profiles where role='admin' and status='active' and id<>p_user_id)=0
  then raise exception 'The last active admin cannot be disabled or demoted'; end if;
  update public.profiles set role=p_role,status=p_status where id=p_user_id;
  if p_role='doctor' then
    insert into public.doctor_profiles(user_id,verification_status)
    values(p_user_id,'pending') on conflict(user_id) do nothing;
  end if;
  perform private.write_audit('user_access_updated','profile',p_user_id::text,jsonb_build_object('role',p_role,'status',p_status));
  insert into public.notifications(user_id,kind,title,body,link)
  values(p_user_id,'account','Account access updated','Your Medora role or account status was updated.','/');
  return p_user_id;
end; $$;

create or replace function public.admin_update_user(p_user_id uuid,p_role text,p_status text) returns uuid
language sql set search_path='' as $$ select private.admin_update_user(p_user_id,p_role,p_status); $$;
revoke all on function public.admin_update_user(uuid,text,text) from public;
grant execute on function public.admin_update_user(uuid,text,text) to authenticated;

create or replace function private.admin_review_doctor(p_doctor_id uuid,p_status text) returns uuid
language plpgsql security definer set search_path='' as $$
begin
  if private.current_app_role() is distinct from 'admin' then raise exception 'Admin role required'; end if;
  if p_status not in ('pending','verified','rejected') then raise exception 'Invalid verification status'; end if;
  if not exists(select 1 from public.profiles where id=p_doctor_id and role='doctor') then raise exception 'Doctor account not found'; end if;
  update public.doctor_profiles set verification_status=p_status where user_id=p_doctor_id;
  if not found then raise exception 'Doctor profile not found'; end if;
  perform private.write_audit('doctor_verification_updated','doctor_profile',p_doctor_id::text,jsonb_build_object('verification_status',p_status));
  insert into public.notifications(user_id,kind,title,body,link)
  values(p_doctor_id,'verification','Doctor verification updated','Your clinician verification status is now '||p_status||'.','/doctor/profile');
  return p_doctor_id;
end; $$;

create or replace function public.admin_review_doctor(p_doctor_id uuid,p_status text) returns uuid
language sql set search_path='' as $$ select private.admin_review_doctor(p_doctor_id,p_status); $$;
revoke all on function public.admin_review_doctor(uuid,text) from public;
grant execute on function public.admin_review_doctor(uuid,text) to authenticated;

create or replace function private.admin_upsert_specialty(
  p_id uuid,p_slug text,p_name text,p_description text,p_icon text,p_active boolean
) returns uuid language plpgsql security definer set search_path='' as $$
declare v_id uuid;
begin
  if private.current_app_role() is distinct from 'admin' then raise exception 'Admin role required'; end if;
  if char_length(btrim(p_name))<2 or char_length(btrim(p_slug))<2 then raise exception 'Specialty name and slug are required'; end if;
  if p_id is null then
    insert into public.specialties(slug,name,description,icon,active)
    values(lower(btrim(p_slug)),btrim(p_name),coalesce(p_description,''),p_icon,coalesce(p_active,true))
    returning id into v_id;
  else
    update public.specialties set slug=lower(btrim(p_slug)),name=btrim(p_name),description=coalesce(p_description,''),icon=p_icon,active=coalesce(p_active,true)
    where id=p_id returning id into v_id;
    if v_id is null then raise exception 'Specialty not found'; end if;
  end if;
  perform private.write_audit('specialty_saved','specialty',v_id::text,jsonb_build_object('name',p_name,'active',p_active));
  return v_id;
end; $$;

create or replace function public.admin_upsert_specialty(
  p_id uuid,p_slug text,p_name text,p_description text,p_icon text,p_active boolean
) returns uuid language sql set search_path='' as $$
  select private.admin_upsert_specialty(p_id,p_slug,p_name,p_description,p_icon,p_active);
$$;
revoke all on function public.admin_upsert_specialty(uuid,text,text,text,text,boolean) from public;
grant execute on function public.admin_upsert_specialty(uuid,text,text,text,text,boolean) to authenticated;

create or replace function private.admin_moderate_review(p_review_id uuid,p_status text) returns uuid
language plpgsql security definer set search_path='' as $$
begin
  if private.current_app_role() is distinct from 'admin' then raise exception 'Admin role required'; end if;
  if p_status not in ('published','flagged','hidden') then raise exception 'Invalid review status'; end if;
  update public.reviews set status=p_status where id=p_review_id;
  if not found then raise exception 'Review not found'; end if;
  perform private.write_audit('review_moderated','review',p_review_id::text,jsonb_build_object('status',p_status));
  return p_review_id;
end; $$;

create or replace function public.admin_moderate_review(p_review_id uuid,p_status text) returns uuid
language sql set search_path='' as $$ select private.admin_moderate_review(p_review_id,p_status); $$;
revoke all on function public.admin_moderate_review(uuid,text) from public;
grant execute on function public.admin_moderate_review(uuid,text) to authenticated;

create or replace function private.admin_update_invoice(p_invoice_id uuid,p_status text) returns uuid
language plpgsql security definer set search_path='' as $$
begin
  if private.current_app_role() is distinct from 'admin' then raise exception 'Admin role required'; end if;
  if p_status not in ('pending','paid','refunded','void') then raise exception 'Invalid invoice status'; end if;
  update public.invoices
  set status=p_status,paid_at=case when p_status='paid' then coalesce(paid_at,now()) else null end
  where id=p_invoice_id;
  if not found then raise exception 'Invoice not found'; end if;
  perform private.write_audit('invoice_status_updated','invoice',p_invoice_id::text,jsonb_build_object('status',p_status));
  return p_invoice_id;
end; $$;

create or replace function public.admin_update_invoice(p_invoice_id uuid,p_status text) returns uuid
language sql set search_path='' as $$ select private.admin_update_invoice(p_invoice_id,p_status); $$;
revoke all on function public.admin_update_invoice(uuid,text) from public;
grant execute on function public.admin_update_invoice(uuid,text) to authenticated;

create or replace function private.admin_update_support(
  p_request_id uuid,p_status text,p_resolution_note text default null
) returns uuid language plpgsql security definer set search_path='' as $$
declare v_user uuid;
begin
  if private.current_app_role() is distinct from 'admin' then raise exception 'Admin role required'; end if;
  if p_status not in ('open','in_progress','resolved','closed') then raise exception 'Invalid support status'; end if;
  update public.support_requests
  set status=p_status,resolution_note=p_resolution_note
  where id=p_request_id returning user_id into v_user;
  if not found then raise exception 'Support request not found'; end if;
  perform private.write_audit('support_status_updated','support_request',p_request_id::text,jsonb_build_object('status',p_status));
  if v_user is not null then
    insert into public.notifications(user_id,kind,title,body,link)
    values(v_user,'support','Support request updated','Your support request is now '||replace(p_status,'_',' ')||'.','/');
  end if;
  return p_request_id;
end; $$;

create or replace function public.admin_update_support(
  p_request_id uuid,p_status text,p_resolution_note text default null
) returns uuid language sql set search_path='' as $$
  select private.admin_update_support(p_request_id,p_status,p_resolution_note);
$$;
revoke all on function public.admin_update_support(uuid,text,text) from public;
grant execute on function public.admin_update_support(uuid,text,text) to authenticated;

create or replace function private.doctor_update_appointment(
  p_appointment_id uuid,p_status text,p_doctor_note text default null
) returns uuid language plpgsql security definer set search_path='' as $$
declare v public.appointments;
begin
  if private.current_app_role() is distinct from 'doctor' then raise exception 'Doctor role required'; end if;
  if p_status not in ('confirmed','checked_in','completed','cancelled','no_show') then raise exception 'Invalid appointment status'; end if;
  select * into v from public.appointments where id=p_appointment_id and doctor_id=auth.uid() for update;
  if not found then raise exception 'Appointment not found'; end if;
  if v.status in ('completed','cancelled','no_show') then raise exception 'Appointment is already closed'; end if;
  update public.appointments set status=p_status,doctor_note=coalesce(p_doctor_note,doctor_note) where id=p_appointment_id;
  if p_status='cancelled' then update public.invoices set status='void',paid_at=null where appointment_id=p_appointment_id and status='pending'; end if;
  insert into public.notifications(user_id,kind,title,body,link)
  values(v.patient_id,'appointment','Appointment updated','Your appointment status is now '||replace(p_status,'_',' ')||'.','/patient/appointments');
  perform private.write_audit('appointment_status_updated','appointment',p_appointment_id::text,jsonb_build_object('status',p_status));
  return p_appointment_id;
end; $$;

create or replace function public.doctor_update_appointment(
  p_appointment_id uuid,p_status text,p_doctor_note text default null
) returns uuid language sql set search_path='' as $$
  select private.doctor_update_appointment(p_appointment_id,p_status,p_doctor_note);
$$;
revoke all on function public.doctor_update_appointment(uuid,text,text) from public;
grant execute on function public.doctor_update_appointment(uuid,text,text) to authenticated;

create or replace function private.admin_update_appointment(
  p_appointment_id uuid,p_status text
) returns uuid language plpgsql security definer set search_path='' as $$
declare v public.appointments;
begin
  if private.current_app_role() is distinct from 'admin' then raise exception 'Admin role required'; end if;
  if p_status not in ('requested','confirmed','checked_in','completed','cancelled','no_show') then raise exception 'Invalid appointment status'; end if;
  select * into v from public.appointments where id=p_appointment_id for update;
  if not found then raise exception 'Appointment not found'; end if;
  update public.appointments set status=p_status where id=p_appointment_id;
  if p_status='cancelled' then update public.invoices set status='void',paid_at=null where appointment_id=p_appointment_id and status='pending'; end if;
  insert into public.notifications(user_id,kind,title,body,link)
  values(v.patient_id,'appointment','Appointment updated','An administrator changed your appointment status to '||replace(p_status,'_',' ')||'.','/patient/appointments');
  perform private.write_audit('appointment_admin_updated','appointment',p_appointment_id::text,jsonb_build_object('status',p_status));
  return p_appointment_id;
end; $$;

create or replace function public.admin_update_appointment(p_appointment_id uuid,p_status text) returns uuid
language sql set search_path='' as $$ select private.admin_update_appointment(p_appointment_id,p_status); $$;
revoke all on function public.admin_update_appointment(uuid,text) from public;
grant execute on function public.admin_update_appointment(uuid,text) to authenticated;

create or replace function private.start_conversation(p_appointment_id uuid) returns uuid
language plpgsql security definer set search_path='' as $$
declare v public.appointments; v_id uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required'; end if;
  select * into v from public.appointments where id=p_appointment_id and (patient_id=auth.uid() or doctor_id=auth.uid());
  if not found then raise exception 'Appointment not found'; end if;
  insert into public.conversations(patient_id,doctor_id,appointment_id)
  values(v.patient_id,v.doctor_id,v.id)
  on conflict(patient_id,doctor_id,appointment_id) do update set appointment_id=excluded.appointment_id
  returning id into v_id;
  return v_id;
end; $$;

create or replace function public.start_conversation(p_appointment_id uuid) returns uuid
language sql set search_path='' as $$ select private.start_conversation(p_appointment_id); $$;
revoke all on function public.start_conversation(uuid) from public;
grant execute on function public.start_conversation(uuid) to authenticated;

create or replace function private.book_appointment(
  p_doctor_id uuid,p_starts_at timestamptz,p_consultation_mode text,p_reason text,p_patient_note text default null
) returns uuid language plpgsql security definer set search_path='' as $$
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
  select d.* into v_doctor
  from public.doctor_profiles d join public.profiles p on p.id=d.user_id
  where d.user_id=p_doctor_id and d.verification_status='verified' and d.accepting_patients
    and p.role='doctor' and p.status='active'
  for update of d;
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
  values(v_patient,p_doctor_id,p_starts_at,v_end,p_consultation_mode,btrim(p_reason),v_doctor.consultation_fee,p_patient_note,'confirmed',v_doctor.clinic_name)
  returning id into v_id;
  insert into public.invoices(patient_id,doctor_id,appointment_id,amount,currency,status,due_at)
  values(v_patient,p_doctor_id,v_id,v_doctor.consultation_fee,'PKR','pending',p_starts_at)
  on conflict(appointment_id) do nothing;
  insert into public.conversations(patient_id,doctor_id,appointment_id)
  values(v_patient,p_doctor_id,v_id) on conflict(patient_id,doctor_id,appointment_id) do nothing;
  insert into public.notifications(user_id,kind,title,body,link)
  values(v_patient,'appointment','Appointment confirmed','Your appointment has been confirmed.','/patient/appointments');
  insert into public.notifications(user_id,kind,title,body,link)
  values(p_doctor_id,'appointment','New appointment','A patient booked a new appointment.','/doctor/appointments');
  return v_id;
exception when exclusion_violation then raise exception 'Selected slot is no longer available';
end; $$;

create or replace function private.cancel_appointment(p_appointment_id uuid) returns uuid
language plpgsql security definer set search_path='' as $$
declare v_id uuid; v_doctor uuid;
begin
  if auth.uid() is null or private.current_app_role() is distinct from 'patient' then raise exception 'Active patient authentication required'; end if;
  update public.appointments
  set status='cancelled',updated_at=now()
  where id=p_appointment_id and patient_id=auth.uid() and starts_at>now() and status in ('requested','confirmed')
  returning id,doctor_id into v_id,v_doctor;
  if v_id is null then raise exception 'Appointment cannot be cancelled'; end if;
  update public.invoices set status='void',paid_at=null where appointment_id=v_id and status='pending';
  insert into public.notifications(user_id,kind,title,body,link)
  values(v_doctor,'appointment','Appointment cancelled','A patient cancelled an appointment.','/doctor/appointments');
  return v_id;
end; $$;

create or replace function private.notify_new_message() returns trigger
language plpgsql security definer set search_path='' as $$
declare v public.conversations; v_recipient uuid;
begin
  select * into v from public.conversations where id=new.conversation_id;
  v_recipient:=case when new.sender_id=v.patient_id then v.doctor_id else v.patient_id end;
  insert into public.notifications(user_id,kind,title,body,link)
  values(v_recipient,'message','New secure message',left(new.body,160),case when v_recipient=v.patient_id then '/patient/messages' else '/doctor/messages' end);
  return new;
end; $$;
drop trigger if exists messages_notify_recipient on public.messages;
create trigger messages_notify_recipient after insert on public.messages
for each row execute function private.notify_new_message();

create or replace function private.refresh_doctor_rating() returns trigger
language plpgsql security definer set search_path='' as $$
declare v_doctor uuid;
begin
  v_doctor:=coalesce(new.doctor_id,old.doctor_id);
  update public.doctor_profiles d set
    average_rating=coalesce((select round(avg(r.rating)::numeric,2) from public.reviews r where r.doctor_id=v_doctor and r.status='published'),0),
    review_count=(select count(*) from public.reviews r where r.doctor_id=v_doctor and r.status='published')
  where d.user_id=v_doctor;
  return coalesce(new,old);
end; $$;
drop trigger if exists reviews_refresh_doctor_rating on public.reviews;
create trigger reviews_refresh_doctor_rating after insert or update or delete on public.reviews
for each row execute function private.refresh_doctor_rating();

create or replace function private.notify_patient_item() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  if tg_table_name='prescriptions' then
    insert into public.notifications(user_id,kind,title,body,link)
    values(new.patient_id,'prescription','Prescription updated','A clinician added or updated a prescription.','/patient/prescriptions');
  elsif tg_table_name='lab_results' then
    insert into public.notifications(user_id,kind,title,body,link)
    values(new.patient_id,'lab','Lab result available','A lab result was added to your record.','/patient/labs');
  end if;
  return new;
end; $$;
drop trigger if exists prescriptions_notify_patient on public.prescriptions;
create trigger prescriptions_notify_patient after insert on public.prescriptions
for each row execute function private.notify_patient_item();
drop trigger if exists labs_notify_patient on public.lab_results;
create trigger labs_notify_patient after insert on public.lab_results
for each row execute function private.notify_patient_item();

notify pgrst,'reload schema';
