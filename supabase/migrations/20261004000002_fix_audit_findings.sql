-- Fixes from the post-migration audit.

-- 1. Single-row records. `supabase db push` never runs seed.sql, so create them here.
--    The placeholder values pass the Settings form validation; admins change them later.
insert into public.wildhacks_config (
  id, max_participants, max_team_size, registration_deadline, start_time, submission_deadline, end_time
)
values (
  'config',
  500,
  4,
  ((extract(epoch from now() + interval '14 days')) * 1000)::bigint,
  ((extract(epoch from now() + interval '21 days')) * 1000)::bigint,
  ((extract(epoch from now() + interval '22 days')) * 1000)::bigint,
  ((extract(epoch from now() + interval '22 days 4 hours')) * 1000)::bigint
)
on conflict (id) do nothing;

-- A random placeholder, so no publicly known password exists; admins set the real one in Settings.
insert into public.wildhacks_secrets (id, crowd_favorite_password)
values ('secrets', md5(random()::text))
on conflict (id) do nothing;

insert into public.team_matching_settings (id) values ('team_matching_settings') on conflict (id) do nothing;

-- 2. Keep check-ins, crowd favorite votes, and team matching intake when a user is deleted,
--    as the previous database did. Only the resume row still cascades (the app removes its file).
alter table public.event_check_ins drop constraint event_check_ins_user_id_fkey;
alter table public.crowd_favorite_votes drop constraint crowd_favorite_votes_user_id_fkey;
alter table public.team_matching_intake drop constraint team_matching_intake_user_id_fkey;
alter table public.team_matching_intake_prod drop constraint team_matching_intake_prod_user_id_fkey;

-- 3. Store emails in lowercase. Supabase Auth emails are lowercase, so pre-created rows typed
--    with capital letters would otherwise never match at login.
create or replace function public.users_lowercase_email() returns trigger
language plpgsql set search_path = public as $$
begin
  new.email := lower(new.email);
  return new;
end;
$$;

create trigger users_lowercase_email
before insert or update of email on public.users
for each row execute function public.users_lowercase_email();

update public.users set email = lower(email) where email <> lower(email);

-- 4. Publish a team matching run and make it the active run in one transaction.
create or replace function public.publish_matching_run(p_run_id text, p_mode text)
returns text
language plpgsql security definer set search_path = public as $$
declare
  v_status text;
begin
  if p_mode = 'prod' then
    select status into v_status from public.team_matching_runs_prod where id = p_run_id for update;
  else
    select status into v_status from public.team_matching_runs where id = p_run_id for update;
  end if;

  if not found then
    return 'not_found';
  end if;
  if v_status <> 'draft' then
    return 'not_draft';
  end if;

  if p_mode = 'prod' then
    update public.team_matching_runs_prod set status = 'published' where id = p_run_id;
  else
    update public.team_matching_runs set status = 'published' where id = p_run_id;
  end if;

  update public.wildhacks_config set active_matching_run_id = p_run_id where id = 'config';
  if not found then
    raise exception 'WildHacks configuration not found';
  end if;

  return 'published';
end;
$$;

revoke execute on function public.publish_matching_run(text, text) from public, anon, authenticated;
