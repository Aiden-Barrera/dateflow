alter table public.venues
add column if not exists photo_urls text[] not null default '{}';

update public.venues
set photo_urls = case
  when photo_url is null then '{}'
  else array[photo_url]
end
where coalesce(array_length(photo_urls, 1), 0) = 0;

alter table public.session_candidate_pool_items
add column if not exists photo_urls text[] not null default '{}';

update public.session_candidate_pool_items
set photo_urls = case
  when photo_url is null then '{}'
  else array[photo_url]
end
where coalesce(array_length(photo_urls, 1), 0) = 0;
-- 20260406050229_add_photo_urls_to_venues_and_candidate_pools.sql
