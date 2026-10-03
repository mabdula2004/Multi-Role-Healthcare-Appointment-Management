
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values(
  'medical-documents','medical-documents',false,10485760,
  array['application/pdf','image/png','image/jpeg','image/webp']::text[]
)
on conflict(id) do update set
  public=false,
  file_size_limit=excluded.file_size_limit,
  allowed_mime_types=excluded.allowed_mime_types;

drop policy if exists "medical documents participant read" on storage.objects;
create policy "medical documents participant read" on storage.objects
for select to authenticated using (
  bucket_id='medical-documents'
  and (
    (storage.foldername(name))[1]=(select auth.uid())::text
    or (select public.current_app_role())='admin'
    or (
      (select public.current_app_role())='doctor'
      and exists(
        select 1 from public.appointments a
        where a.patient_id::text=(storage.foldername(name))[1]
          and a.doctor_id=(select auth.uid())
      )
    )
  )
);

drop policy if exists "medical documents participant insert" on storage.objects;
create policy "medical documents participant insert" on storage.objects
for insert to authenticated with check (
  bucket_id='medical-documents'
  and (
    (storage.foldername(name))[1]=(select auth.uid())::text
    or (select public.current_app_role())='admin'
    or (
      (select public.current_app_role())='doctor'
      and exists(
        select 1 from public.appointments a
        where a.patient_id::text=(storage.foldername(name))[1]
          and a.doctor_id=(select auth.uid())
      )
    )
  )
);

drop policy if exists "medical documents participant update" on storage.objects;
create policy "medical documents participant update" on storage.objects
for update to authenticated using (
  bucket_id='medical-documents'
  and (
    (storage.foldername(name))[1]=(select auth.uid())::text
    or (select public.current_app_role())='admin'
    or (
      (select public.current_app_role())='doctor'
      and exists(
        select 1 from public.appointments a
        where a.patient_id::text=(storage.foldername(name))[1]
          and a.doctor_id=(select auth.uid())
      )
    )
  )
) with check (
  bucket_id='medical-documents'
  and (
    (storage.foldername(name))[1]=(select auth.uid())::text
    or (select public.current_app_role())='admin'
    or (
      (select public.current_app_role())='doctor'
      and exists(
        select 1 from public.appointments a
        where a.patient_id::text=(storage.foldername(name))[1]
          and a.doctor_id=(select auth.uid())
      )
    )
  )
);

drop policy if exists "medical documents participant delete" on storage.objects;
create policy "medical documents participant delete" on storage.objects
for delete to authenticated using (
  bucket_id='medical-documents'
  and (
    (storage.foldername(name))[1]=(select auth.uid())::text
    or (select public.current_app_role())='admin'
    or (
      (select public.current_app_role())='doctor'
      and exists(
        select 1 from public.appointments a
        where a.patient_id::text=(storage.foldername(name))[1]
          and a.doctor_id=(select auth.uid())
      )
    )
  )
);
