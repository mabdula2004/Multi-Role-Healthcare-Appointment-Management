-- Cover foreign keys used in joins, patient isolation and cascade cleanup.
create index audit_events_actor_idx on public.audit_events(actor_id);
create index conversations_appointment_idx on public.conversations(appointment_id);
create index conversations_doctor_idx on public.conversations(doctor_id);
create index doctor_availability_lookup_idx on public.doctor_availability(doctor_id,day_of_week,consultation_mode);
create index doctor_specialties_specialty_idx on public.doctor_specialties(specialty_id);
create index insurance_profiles_patient_idx on public.insurance_profiles(patient_id);
create index invoices_appointment_idx on public.invoices(appointment_id);
create index invoices_doctor_idx on public.invoices(doctor_id);
create index invoices_patient_idx on public.invoices(patient_id);
create index lab_results_patient_idx on public.lab_results(patient_id);
create index lab_results_doctor_idx on public.lab_results(reviewing_doctor_id);
create index medical_records_appointment_idx on public.medical_records(appointment_id);
create index medical_records_doctor_idx on public.medical_records(doctor_id);
create index messages_sender_idx on public.messages(sender_id);
create index prescriptions_appointment_idx on public.prescriptions(appointment_id);
create index prescriptions_doctor_idx on public.prescriptions(doctor_id);
create index reviews_doctor_idx on public.reviews(doctor_id);
create index reviews_patient_idx on public.reviews(patient_id);
create index support_requests_user_idx on public.support_requests(user_id);

-- Split write policies so SELECT has one policy per role/action.
drop policy "doctor own availability write" on public.doctor_availability;
alter policy "doctor availability public read" on public.doctor_availability using ((active and exists(select 1 from public.doctor_profiles d where d.user_id=doctor_id and d.verification_status='verified')) or (doctor_id=auth.uid() and public.current_app_role()='doctor'));
create policy "doctor availability insert" on public.doctor_availability for insert to authenticated with check(doctor_id=auth.uid() and public.current_app_role()='doctor');
create policy "doctor availability update" on public.doctor_availability for update to authenticated using(doctor_id=auth.uid() and public.current_app_role()='doctor') with check(doctor_id=auth.uid() and public.current_app_role()='doctor');
create policy "doctor availability delete" on public.doctor_availability for delete to authenticated using(doctor_id=auth.uid() and public.current_app_role()='doctor');
drop policy "insurance owner write" on public.insurance_profiles;
create policy "insurance owner insert" on public.insurance_profiles for insert to authenticated with check(patient_id=auth.uid());
create policy "insurance owner update" on public.insurance_profiles for update to authenticated using(patient_id=auth.uid()) with check(patient_id=auth.uid());
create policy "insurance owner delete" on public.insurance_profiles for delete to authenticated using(patient_id=auth.uid());

-- All helpers are row-independent. Cache their value once per statement.
do $policies$
declare r record; v_using text; v_check text; v_sql text;
begin
 for r in select * from pg_policies where schemaname='public' loop
  v_using:=replace(replace(r.qual,'auth.uid()','(select auth.uid())'),'current_app_role()','current_app_role()');
  v_check:=replace(r.with_check,'auth.uid()','(select auth.uid())');
  v_using:=replace(v_using,'public.current_app_role()','(select public.current_app_role())');
  v_using:=replace(v_using,'current_app_role()','current_app_role()');
  v_check:=replace(v_check,'public.current_app_role()','(select public.current_app_role())');
  v_sql:=format('alter policy %I on public.%I',r.policyname,r.tablename);
  if v_using is not null then v_sql:=v_sql||' using ('||v_using||')'; end if;
  if v_check is not null then v_sql:=v_sql||' with check ('||v_check||')'; end if;
  execute v_sql;
 end loop;
end $policies$;
