-- Fixes from the second post-migration audit.

-- 1. The browser reads only events and wildhacks_config. Remove the read policies that let any
--    signed-in account read crowd favorite team emails, every vote, and all judging projects.
drop policy if exists "projects read" on public.projects;
drop policy if exists "crowd favorites read" on public.crowd_favorites;
drop policy if exists "crowd favorite votes read" on public.crowd_favorite_votes;

-- 2. A judge or mentor row that admins pre-created takes the person's auth id at first login.
--    Move their judging assignments with it in the same transaction.
create or replace function public.claim_judge_row(p_old_id text, p_new_id text, p_now bigint)
returns boolean
language plpgsql security definer set search_path = public as $$
begin
  update public.users
  set id = p_new_id, onboarded = false, created_at = p_now, updated_at = p_now
  where id = p_old_id and role in ('Judge', 'Judge/Mentor');
  if not found then
    return false;
  end if;

  update public.judging_assignments set judge_id = p_new_id where judge_id = p_old_id;
  return true;
end;
$$;

revoke execute on function public.claim_judge_row(text, text, bigint) from public, anon, authenticated;

-- 3. Register a participant. A lock makes the capacity check and the write one step, so parallel
--    registrations cannot pass max_participants. p_row holds users columns (validated by the app).
--    Returns 'registered', 'full', or 'role_conflict'.
create or replace function public.register_participant(p_row jsonb, p_precreated_id text, p_max_participants integer)
returns text
language plpgsql security definer set search_path = public as $$
declare
  v_id text := p_row ->> 'id';
  v_own_role text;
  v_precreated_role text;
  v_count bigint;
  v_columns text;
  v_updates text;
begin
  perform pg_advisory_xact_lock(hashtext('register_participant'));

  select role into v_own_role from public.users where id = v_id;
  if p_precreated_id is not null then
    select role into v_precreated_role from public.users where id = p_precreated_id;
  end if;

  -- Never turn an admin, judge, or mentor into a participant.
  if coalesce(v_own_role, 'Participant') <> 'Participant'
     or coalesce(v_precreated_role, 'Participant') <> 'Participant' then
    return 'role_conflict';
  end if;

  -- People who already hold a participant row (their own or a pre-created one) keep their place.
  if v_own_role is null and v_precreated_role is null then
    select count(*) into v_count from public.users where role = 'Participant';
    if v_count >= p_max_participants then
      return 'full';
    end if;
  end if;

  select string_agg(quote_ident(k), ', '),
         string_agg(format('%1$I = excluded.%1$I', k), ', ') filter (where k <> 'id')
  into v_columns, v_updates
  from jsonb_object_keys(p_row) as k;

  execute format(
    'insert into public.users (%1$s) select %1$s from jsonb_populate_record(null::public.users, $1) '
    'on conflict (id) do update set %2$s',
    v_columns, v_updates
  ) using p_row;

  if p_precreated_id is not null and p_precreated_id <> v_id then
    delete from public.users where id = p_precreated_id;
  end if;

  return 'registered';
end;
$$;

revoke execute on function public.register_participant(jsonb, text, integer) from public, anon, authenticated;

-- 4. Create a crowd favorite project only when no team member is already on another project.
--    The lock stops two parallel opt-ins from placing one person on two projects.
--    Returns the new project id, or null when a member is already taken.
create or replace function public.create_crowd_favorite(
  p_project_name text, p_devpost_url text, p_team_members jsonb, p_now bigint
)
returns text
language plpgsql security definer set search_path = public as $$
declare
  v_member_ids text[];
  v_id text;
begin
  perform pg_advisory_xact_lock(hashtext('create_crowd_favorite'));

  select array_agg(m ->> 'id') into v_member_ids from jsonb_array_elements(p_team_members) as m;

  if exists (select 1 from public.crowd_favorites where team_member_ids && v_member_ids) then
    return null;
  end if;

  insert into public.crowd_favorites (project_name, devpost_url, team_members, team_member_ids, created_at, updated_at)
  values (p_project_name, p_devpost_url, p_team_members, v_member_ids, p_now, p_now)
  returning id into v_id;

  return v_id;
end;
$$;

revoke execute on function public.create_crowd_favorite(text, text, jsonb, bigint) from public, anon, authenticated;

-- 5. Count crowd favorite votes from users who still exist. Votes are kept when a user is deleted,
--    but a deleted user's vote should not decide the winner.
create or replace function public.crowd_favorite_vote_counts()
returns table (crowd_favorite_id text, vote_count bigint)
language sql stable security definer set search_path = public as $$
  select v.crowd_favorite_id, count(*)
  from public.crowd_favorite_votes v
  join public.users u on u.id = v.user_id
  group by v.crowd_favorite_id
$$;

revoke execute on function public.crowd_favorite_vote_counts() from public, anon, authenticated;

-- 6. Save a team matching run with its teams and alternative formations in one transaction.
create or replace function public.insert_matching_run(p_mode text, p_run jsonb, p_teams jsonb, p_formations jsonb)
returns void
language plpgsql security definer set search_path = public as $$
begin
  if p_mode = 'prod' then
    insert into public.team_matching_runs_prod
    select (jsonb_populate_record(null::public.team_matching_runs_prod, p_run)).*;
    insert into public.team_matching_teams_prod
    select (jsonb_populate_recordset(null::public.team_matching_teams_prod, p_teams)).*;
    insert into public.team_matching_formations_prod
    select (jsonb_populate_recordset(null::public.team_matching_formations_prod, p_formations)).*;
  else
    insert into public.team_matching_runs
    select (jsonb_populate_record(null::public.team_matching_runs, p_run)).*;
    insert into public.team_matching_teams
    select (jsonb_populate_recordset(null::public.team_matching_teams, p_teams)).*;
    insert into public.team_matching_formations
    select (jsonb_populate_recordset(null::public.team_matching_formations, p_formations)).*;
  end if;
end;
$$;

revoke execute on function public.insert_matching_run(text, jsonb, jsonb, jsonb) from public, anon, authenticated;

-- 7. Keep the active run per mode, so publishing a dev run never replaces the prod value.
alter table public.wildhacks_config add column if not exists active_matching_run_id_dev text;

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
    update public.wildhacks_config set active_matching_run_id = p_run_id where id = 'config';
  else
    update public.team_matching_runs set status = 'published' where id = p_run_id;
    update public.wildhacks_config set active_matching_run_id_dev = p_run_id where id = 'config';
  end if;
  if not found then
    raise exception 'WildHacks configuration not found';
  end if;

  return 'published';
end;
$$;

revoke execute on function public.publish_matching_run(text, text) from public, anon, authenticated;

-- 8. Simple fixed-window rate limits for actions that can be used to guess passwords or emails.
create table if not exists public.rate_limits (
  key text primary key,
  window_start bigint not null,
  count integer not null
);

alter table public.rate_limits enable row level security;

-- Returns true when the call is within the limit, and records it.
create or replace function public.check_rate_limit(p_key text, p_limit integer, p_window_ms bigint)
returns boolean
language plpgsql security definer set search_path = public as $$
declare
  v_now bigint := public.now_ms();
  v_count integer;
begin
  insert into public.rate_limits as r (key, window_start, count)
  values (p_key, v_now, 1)
  on conflict (key) do update set
    count = case when r.window_start <= v_now - p_window_ms then 1 else r.count + 1 end,
    window_start = case when r.window_start <= v_now - p_window_ms then v_now else r.window_start end
  returning count into v_count;

  return v_count <= p_limit;
end;
$$;

revoke execute on function public.check_rate_limit(text, integer, bigint) from public, anon, authenticated;
