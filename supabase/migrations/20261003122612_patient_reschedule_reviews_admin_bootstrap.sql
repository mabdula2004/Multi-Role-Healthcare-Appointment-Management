
create or replace function private.reschedule_appointment(
  p_appointment_id uuid,
  p_starts_at timestamptz,
  p_consultation_mode text
) returns uuid
language plpgsql security definer set search_path='' as $$
declare
  v public.appointments;
  v_doctor public.doctor_profiles;
  v_local timestamp;
  v_minutes integer;
  v_end timestamptz;
begin
  if auth.uid() is null or private.current_app_role() is distinct from 'patient' then
    raise exception 'Active patient authentication required';
  end if;

  select * into v
  from public.appointments
  where id=p_appointment_id
    and patient_id=auth.uid()
    and starts_at>now()
    and status in ('requested','confirmed')
  for update;
  if not found then raise exception 'Appointment cannot be rescheduled'; end if;

  if p_starts_at is null or not isfinite(p_starts_at) or p_starts_at<=now() then
    raise exception 'Appointment must be in the future';
  end if;
  if p_consultation_mode is null or p_consultation_mode not in ('In-person','Video') then
    raise exception 'Unsupported consultation mode';
  end if;

  select d.* into v_doctor
  from public.doctor_profiles d
  join public.profiles p on p.id=d.user_id
  where d.user_id=v.doctor_id
    and d.verification_status='verified'
    and d.accepting_patients
    and p.role='doctor'
    and p.status='active';
  if not found then raise exception 'Doctor is unavailable'; end if;
  if not(p_consultation_mode=any(v_doctor.consultation_modes)) then
    raise exception 'Doctor does not support this consultation mode';
  end if;

  v_local:=p_starts_at at time zone 'Asia/Karachi';
  select a.slot_minutes into v_minutes
  from public.doctor_availability a
  where a.doctor_id=v.doctor_id
    and a.active
    and a.consultation_mode=p_consultation_mode
    and a.day_of_week=extract(dow from v_local)
    and v_local::time>=a.start_time
    and (v_local+make_interval(mins=>a.slot_minutes))::date=v_local::date
    and (v_local+make_interval(mins=>a.slot_minutes))::time<=a.end_time
    and mod(extract(epoch from(v_local::time-a.start_time))::numeric,(a.slot_minutes*60)::numeric)=0
  order by a.slot_minutes limit 1;
  if v_minutes is null then raise exception 'Selected time is outside doctor availability'; end if;

  v_end:=p_starts_at+make_interval(mins=>v_minutes);
  if exists(
    select 1 from public.appointments x
    where x.id<>p_appointment_id
      and x.doctor_id=v.doctor_id
      and x.status in ('requested','confirmed','checked_in')
      and tstzrange(x.starts_at,x.ends_at,'[)') && tstzrange(p_starts_at,v_end,'[)')
  ) then raise exception 'Selected slot is no longer available'; end if;

  update public.appointments
  set starts_at=p_starts_at,
      ends_at=v_end,
      consultation_mode=p_consultation_mode,
      fee_amount=v_doctor.consultation_fee,
      clinic_name=v_doctor.clinic_name,
      status='confirmed'
  where id=p_appointment_id;

  update public.invoices
  set amount=v_doctor.consultation_fee,
      due_at=p_starts_at
  where appointment_id=p_appointment_id and status='pending';

  insert into public.notifications(user_id,kind,title,body,link)
  values(auth.uid(),'appointment','Appointment rescheduled','Your appointment has been rescheduled.','/patient/appointments');

  insert into public.notifications(user_id,kind,title,body,link)
  values(v.doctor_id,'appointment','Appointment rescheduled','A patient rescheduled an appointment.','/doctor/appointments');

  return p_appointment_id;
exception when exclusion_violation then
  raise exception 'Selected slot is no longer available';
end; $$;

create or replace function public.reschedule_appointment(
  p_appointment_id uuid,
  p_starts_at timestamptz,
  p_consultation_mode text
) returns uuid
language sql set search_path='' as $$
  select private.reschedule_appointment(p_appointment_id,p_starts_at,p_consultation_mode);
$$;
revoke all on function public.reschedule_appointment(uuid,timestamptz,text) from public;
grant execute on function public.reschedule_appointment(uuid,timestamptz,text) to authenticated;

create or replace function private.submit_review(
  p_appointment_id uuid,
  p_rating smallint,
  p_body text default null
) returns uuid
language plpgsql security definer set search_path='' as $$
declare v public.appointments; v_id uuid;
begin
  if auth.uid() is null or private.current_app_role() is distinct from 'patient' then
    raise exception 'Active patient authentication required';
  end if;
  if p_rating not between 1 and 5 then raise exception 'Rating must be from 1 to 5'; end if;
  if char_length(coalesce(p_body,''))>2000 then raise exception 'Review is too long'; end if;
  select * into v from public.appointments
  where id=p_appointment_id and patient_id=auth.uid() and status='completed';
  if not found then raise exception 'Only completed appointments can be reviewed'; end if;

  insert into public.reviews(patient_id,doctor_id,appointment_id,rating,body,status)
  values(auth.uid(),v.doctor_id,v.id,p_rating,nullif(btrim(p_body),''),'published')
  on conflict(appointment_id) do update
    set rating=excluded.rating,body=excluded.body,status='published'
  returning id into v_id;

  insert into public.notifications(user_id,kind,title,body,link)
  values(v.doctor_id,'review','New patient review','A patient reviewed a completed appointment.','/doctor/profile');

  return v_id;
end; $$;

create or replace function public.submit_review(
  p_appointment_id uuid,
  p_rating smallint,
  p_body text default null
) returns uuid
language sql set search_path='' as $$
  select private.submit_review(p_appointment_id,p_rating,p_body);
$$;
revoke all on function public.submit_review(uuid,smallint,text) from public;
grant execute on function public.submit_review(uuid,smallint,text) to authenticated;

create or replace function private.bootstrap_first_admin(p_user_id uuid) returns uuid
language plpgsql security definer set search_path='' as $$
begin
  if current_user not in ('postgres','service_role') then
    raise exception 'Service role required';
  end if;
  if exists(select 1 from public.profiles where role='admin' and status='active') then
    raise exception 'An active admin already exists';
  end if;
  update public.profiles set role='admin',status='active' where id=p_user_id;
  if not found then raise exception 'Profile not found'; end if;
  insert into public.audit_events(actor_id,action,entity_type,entity_id,metadata)
  values(null,'initial_admin_bootstrapped','profile',p_user_id::text,'{}'::jsonb);
  return p_user_id;
end; $$;
revoke all on function private.bootstrap_first_admin(uuid) from public,anon,authenticated;
grant execute on function private.bootstrap_first_admin(uuid) to service_role;

notify pgrst,'reload schema';
