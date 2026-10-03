
grant insert(subject,body,priority,user_id) on public.support_requests to anon;
alter table public.support_requests
  drop constraint if exists support_subject_length;
alter table public.support_requests
  add constraint support_subject_length check (char_length(btrim(subject)) between 3 and 160);
alter table public.support_requests
  drop constraint if exists support_body_length;
alter table public.support_requests
  add constraint support_body_length check (char_length(btrim(body)) between 3 and 5000);

drop policy if exists "support own insert" on public.support_requests;
create policy "support own insert" on public.support_requests
for insert to anon,authenticated with check (
  (select auth.uid()) is not null and user_id=(select auth.uid())
  or (select auth.uid()) is null and user_id is null
);
