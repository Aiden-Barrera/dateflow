alter table public.sessions
add column if not exists invitee_display_name text;
-- 20260406054524_add_invitee_display_name_to_sessions.sql
