-- Forward-only full-song limits: one MP3 <=16 MiB and <=360 seconds.
-- No letters, assets, object bytes or cleanup jobs are deleted or backfilled.
-- Replace only the two old size/duration CHECK constraints after validating
-- their wider successors. RLS, grants, RPCs, private bucket and quotas stay intact.
begin;
set local lock_timeout = '5s';

do $$ begin
  if not exists (
    select 1 from storage.buckets where id='letter-assets' and public=false
      and file_size_limit=3145728 and allowed_mime_types=array['audio/mpeg']
  ) then
    raise exception 'Expected private migration-003 audio bucket; review before applying migration 004';
  end if;
end $$;

alter table public.letter_assets add constraint sl_audio_bytes_v2
  check(byte_size between 1 and 16777216) not valid;
alter table public.letter_assets validate constraint sl_audio_bytes_v2;
alter table public.letter_assets add constraint sl_audio_duration_v2
  check(duration_seconds>0 and duration_seconds<=360) not valid;
alter table public.letter_assets validate constraint sl_audio_duration_v2;
alter table public.letter_assets drop constraint letter_assets_byte_size_check;
alter table public.letter_assets drop constraint letter_assets_duration_seconds_check;

update storage.buckets set file_size_limit=16777216
  where id='letter-assets' and public=false and allowed_mime_types=array['audio/mpeg'];

do $$ begin
  if not exists(select 1 from storage.buckets where id='letter-assets'
    and public=false and file_size_limit=16777216 and allowed_mime_types=array['audio/mpeg'])
    or not exists(select 1 from pg_catalog.pg_class where oid='public.letter_assets'::regclass and relrowsecurity)
  then raise exception 'Audio privacy/limit verification failed'; end if;
end $$;
commit;
