alter table public.sessions
add column if not exists invitee_display_name text;
