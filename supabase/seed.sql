-- Default single-row records. Update the values from the dashboard settings page.
insert into public.wildhacks_config (id) values ('config') on conflict (id) do nothing;
insert into public.wildhacks_secrets (id) values ('secrets') on conflict (id) do nothing;
insert into public.team_matching_settings (id) values ('team_matching_settings') on conflict (id) do nothing;
