-- WildHacks dashboard schema.
--
-- Conventions:
--   * Timestamps are bigint milliseconds since epoch, matching the app's `number` timestamps.
--   * IDs are text so that pre-created records (keyed by email before first login) and
--     CSV-provided project IDs keep working.
--   * Server actions use the secret (service role) key and bypass RLS. RLS policies below are
--     defense in depth and cover the few reads the browser does directly (events, config).

create or replace function public.now_ms() returns bigint
language sql stable as $$ select (extract(epoch from now()) * 1000)::bigint $$;

-- ---------------------------------------------------------------------------
-- Users
-- ---------------------------------------------------------------------------
create table public.users (
  id text primary key,
  role text not null check (role in ('Participant', 'Admin', 'Judge', 'Judge/Mentor')),

  first_name text,
  last_name text,
  email text not null,
  dietary_restrictions text[] not null default '{}',
  other_dietary_restrictions text,
  tshirt_size text,

  -- participant
  age text,
  phone text,
  country text,
  school text,
  level_of_study text,
  field_of_study text,
  github_username text,
  gender text,
  race text,
  mlh_code_of_conduct boolean,
  mlh_privacy_policy boolean,
  mlh_marketing boolean,

  -- judge / judge & mentor
  affiliated_company text,
  modality text,
  other_modality text,
  mentoring_timeslot text,
  onboarded boolean,

  created_at bigint not null default public.now_ms(),
  updated_at bigint not null default public.now_ms()
);

create index users_email_idx on public.users (email);
create index users_role_idx on public.users (role);

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.users where id = (select auth.uid())::text and role = 'Admin')
$$;

-- ---------------------------------------------------------------------------
-- WildHacks config, secrets, team matching settings (single-row tables)
-- ---------------------------------------------------------------------------
create table public.wildhacks_config (
  id text primary key default 'config' check (id = 'config'),
  max_team_size integer not null default 4,
  max_participants integer not null default 0,
  registration_deadline bigint not null default 0,
  start_time bigint not null default 0,
  submission_deadline bigint not null default 0,
  end_time bigint not null default 0,
  crowd_favorite_opt_in_started boolean not null default false,
  crowd_favorite_opt_in_open boolean not null default false,
  crowd_favorite_voting_started boolean not null default false,
  crowd_favorite_voting_open boolean not null default false,
  results_released boolean not null default false,
  results_released_dev boolean not null default false,
  team_matching_mode text not null default 'dev' check (team_matching_mode in ('dev', 'prod')),
  active_matching_run_id text,
  updated_at bigint not null default public.now_ms()
);

create table public.wildhacks_secrets (
  id text primary key default 'secrets' check (id = 'secrets'),
  crowd_favorite_password text not null default ''
);

create table public.team_matching_settings (
  id text primary key default 'team_matching_settings' check (id = 'team_matching_settings'),
  default_team_size integer not null default 4,
  enforce_mutual_requirement boolean not null default true,
  enforce_tech_member boolean not null default true,
  where_to_meet text not null default '',
  weight_role_diversity double precision not null default 0.25,
  weight_work_style double precision not null default 0.2,
  weight_skills_complementarity double precision not null default 0.25,
  weight_experience_mix double precision not null default 0.15,
  weight_gender_preference double precision not null default 0.075,
  weight_proximity double precision not null default 0.075,
  weight_size_preference double precision not null default 0.05,
  updated_at bigint not null default 0
);

-- ---------------------------------------------------------------------------
-- Schedule events and check-ins
-- ---------------------------------------------------------------------------
create table public.events (
  id text primary key default gen_random_uuid()::text,
  category text not null,
  title text not null,
  body text not null default '',
  start_time bigint not null,
  end_time bigint not null,
  location text not null default '',
  created_at bigint not null default public.now_ms(),
  updated_at bigint not null default public.now_ms()
);

create index events_start_time_idx on public.events (start_time);

-- id is `${event_id}_${user_id}`; the primary key makes duplicate scans fail atomically.
-- event_id is not a foreign key because the main WildHacks check-in uses a virtual event ID.
create table public.event_check_ins (
  id text primary key,
  event_id text not null,
  user_id text not null references public.users (id) on delete cascade on update cascade,
  checked_in_at bigint not null,
  checked_in_by text not null,
  scan_payload jsonb not null,
  created_at bigint not null default public.now_ms(),
  updated_at bigint not null default public.now_ms()
);

create index event_check_ins_event_checked_in_at_idx on public.event_check_ins (event_id, checked_in_at desc);

-- ---------------------------------------------------------------------------
-- Judging (each judging round is a `judging_round` value)
-- ---------------------------------------------------------------------------
create table public.projects (
  judging_round text not null check (judging_round in ('Round 1', 'Round 2')),
  id text not null,
  name text not null,
  track text not null,
  devpost_url text not null default '',
  primary key (judging_round, id)
);

create table public.judging_assignments (
  id text primary key default gen_random_uuid()::text,
  judging_round text not null check (judging_round in ('Round 1', 'Round 2')),
  judge_id text not null,
  project_id text not null,
  "order" integer not null,
  room_id text,
  judging_form jsonb,
  foreign key (judging_round, project_id) references public.projects (judging_round, id) on delete cascade
);

create index judging_assignments_judge_round_order_idx
  on public.judging_assignments (judge_id, judging_round, "order");

-- Replace all projects and assignments for one round in a single transaction.
create or replace function public.replace_judging_round(p_round text, p_projects jsonb, p_assignments jsonb)
returns void
language plpgsql security definer set search_path = public as $$
begin
  delete from public.judging_assignments where judging_round = p_round;
  delete from public.projects where judging_round = p_round;

  insert into public.projects (judging_round, id, name, track, devpost_url)
  select p_round, p.id, p.name, p.track, p.devpost_url
  from jsonb_to_recordset(p_projects) as p (id text, name text, track text, devpost_url text);

  insert into public.judging_assignments (judging_round, judge_id, project_id, "order", room_id, judging_form)
  select p_round, a.judge_id, a.project_id, a."order", a.room_id, null
  from jsonb_to_recordset(p_assignments) as a (judge_id text, project_id text, "order" integer, room_id text);
end;
$$;

revoke execute on function public.replace_judging_round(text, jsonb, jsonb) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Crowd favorite
-- ---------------------------------------------------------------------------
create table public.crowd_favorites (
  id text primary key default gen_random_uuid()::text,
  project_name text not null,
  devpost_url text not null,
  team_members jsonb not null default '[]',
  team_member_ids text[] not null default '{}',
  created_at bigint not null default public.now_ms(),
  updated_at bigint not null default public.now_ms()
);

create index crowd_favorites_team_member_ids_idx on public.crowd_favorites using gin (team_member_ids);

-- One vote per user: the primary key on user_id.
create table public.crowd_favorite_votes (
  user_id text primary key references public.users (id) on delete cascade on update cascade,
  crowd_favorite_id text not null references public.crowd_favorites (id) on delete cascade,
  created_at bigint not null default public.now_ms()
);

create index crowd_favorite_votes_crowd_favorite_id_idx on public.crowd_favorite_votes (crowd_favorite_id);

-- ---------------------------------------------------------------------------
-- Resumes (metadata; files live in the `resumes` storage bucket)
-- ---------------------------------------------------------------------------
create table public.resumes (
  id text primary key references public.users (id) on delete cascade on update cascade,
  file_name text not null,
  storage_path text not null,
  created_at bigint not null default public.now_ms(),
  updated_at bigint not null default public.now_ms()
);

-- ---------------------------------------------------------------------------
-- Team matching (dev tables and `_prod` mirror tables, same shape)
-- ---------------------------------------------------------------------------
create table public.team_matching_intake (
  user_id text primary key references public.users (id) on delete cascade on update cascade,
  experience_level text not null,
  preferred_roles text[] not null default '{}',
  skills jsonb not null default '{}',
  additional_notes text not null default '',
  preferred_team_size integer not null,
  work_style text not null,
  required_teammates text[] not null default '{}',
  consent boolean not null default false,
  gender_preference text,
  where_staying text,
  created_at bigint not null default public.now_ms()
);
create table public.team_matching_intake_prod (like public.team_matching_intake including all);
alter table public.team_matching_intake_prod
  add foreign key (user_id) references public.users (id) on delete cascade on update cascade;

create table public.team_matching_runs (
  id text primary key default gen_random_uuid()::text,
  run_at bigint not null,
  run_by text not null,
  name text,
  is_top boolean not null default false,
  fingerprint text,
  status text not null check (status in ('draft', 'published')),
  settings_snapshot jsonb not null,
  warnings jsonb not null default '[]',
  stats jsonb not null
);
create index team_matching_runs_is_top_run_at_idx on public.team_matching_runs (is_top, run_at desc);
create table public.team_matching_runs_prod (like public.team_matching_runs including all);

create table public.team_matching_teams (
  id text primary key default gen_random_uuid()::text,
  run_id text not null references public.team_matching_runs (id) on delete cascade,
  members jsonb not null,
  score double precision not null,
  match_reasons jsonb not null default '[]',
  where_to_meet text not null default '',
  notes jsonb not null default '[]'
);
create index team_matching_teams_run_id_idx on public.team_matching_teams (run_id);
create table public.team_matching_teams_prod (like public.team_matching_teams including all);
alter table public.team_matching_teams_prod
  add foreign key (run_id) references public.team_matching_runs_prod (id) on delete cascade;

-- id is `${run_id}_alt${formation_index}`.
create table public.team_matching_formations (
  id text primary key,
  run_id text not null references public.team_matching_runs (id) on delete cascade,
  formation_index integer not null check (formation_index in (1, 2)),
  teams jsonb not null,
  fingerprint text not null
);
create table public.team_matching_formations_prod (like public.team_matching_formations including all);
alter table public.team_matching_formations_prod
  add foreign key (run_id) references public.team_matching_runs_prod (id) on delete cascade;

-- ---------------------------------------------------------------------------
-- Row level security
-- ---------------------------------------------------------------------------
alter table public.users enable row level security;
alter table public.wildhacks_config enable row level security;
alter table public.wildhacks_secrets enable row level security;
alter table public.team_matching_settings enable row level security;
alter table public.events enable row level security;
alter table public.event_check_ins enable row level security;
alter table public.projects enable row level security;
alter table public.judging_assignments enable row level security;
alter table public.crowd_favorites enable row level security;
alter table public.crowd_favorite_votes enable row level security;
alter table public.resumes enable row level security;
alter table public.team_matching_intake enable row level security;
alter table public.team_matching_intake_prod enable row level security;
alter table public.team_matching_runs enable row level security;
alter table public.team_matching_runs_prod enable row level security;
alter table public.team_matching_teams enable row level security;
alter table public.team_matching_teams_prod enable row level security;
alter table public.team_matching_formations enable row level security;
alter table public.team_matching_formations_prod enable row level security;

-- Users: read own row or any row as admin. All writes go through server actions.
create policy "users read own or admin" on public.users
  for select to authenticated
  using (id = (select auth.uid())::text or (select public.is_admin()));

create policy "events read" on public.events for select to authenticated using (true);
create policy "events admin write" on public.events for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

create policy "config read" on public.wildhacks_config for select to authenticated using (true);
create policy "config admin write" on public.wildhacks_config for update to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

create policy "secrets admin" on public.wildhacks_secrets for all to authenticated
  using ((select public.is_admin())) with check ((select public.is_admin()));

create policy "projects read" on public.projects for select to authenticated using (true);
create policy "crowd favorites read" on public.crowd_favorites for select to authenticated using (true);
create policy "crowd favorite votes read" on public.crowd_favorite_votes for select to authenticated using (true);

-- Realtime: the schedule page and team-matching gate subscribe to these tables.
alter publication supabase_realtime add table public.events, public.wildhacks_config;

-- ---------------------------------------------------------------------------
-- Storage: private resumes bucket, server-only writes
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('resumes', 'resumes', false, 5242880, array['application/pdf'])
on conflict (id) do nothing;

create policy "resumes read authenticated" on storage.objects for select to authenticated
  using (bucket_id = 'resumes');
