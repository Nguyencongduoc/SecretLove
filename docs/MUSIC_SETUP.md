# Background music setup

This guide describes the original migration 003 and its historical 3 MiB/180-second bounds. For the user's subsequently authorized full-song **16 MiB/360-second** limits, apply migration 004 separately using [FULL_SONG_AUDIO_SETUP.md](FULL_SONG_AUDIO_SETUP.md). Existing projects must not replay 003. The schema checker now expects the post-004 audio bucket cap.

Apply only `supabase/migrations/202610140003_background_music.sql`, once, after migrations 001 and 002, in the isolated Supabase test project. Keep existing environment settings. No additional credentials or processing service are required.

1. Open the isolated project's Supabase Dashboard → SQL Editor → New query.
2. Paste the **entire** migration 003, including BEGIN/COMMIT, and run it once. Do not replay migrations 001/002. Do not run a reset.
3. If it errors, the transaction rolls back; review the error before retrying. An existing incompatible audio bucket deliberately aborts instead of altering its privacy settings.
4. Run these read-only checks:

```sql
select column_name from information_schema.columns where table_schema='public' and table_name='letters' and column_name='presentation_config';
select relname,relrowsecurity from pg_class where oid='public.letter_assets'::regclass;
select id,public,file_size_limit,allowed_mime_types from storage.buckets where id in ('letter-media','letter-assets');
select policyname,permissive,roles,cmd from pg_policies where (schemaname='public' and tablename='letter_assets') or (schemaname='storage' and policyname='sl_block_browser_assets');
select has_function_privilege('anon','public.sl_recipient_audio(text,text,uuid)','execute') as anon_execute,
 has_function_privilege('authenticated','public.sl_audio_reserve(uuid,uuid,text,uuid,integer,double precision)','execute') as browser_execute,
 has_function_privilege('service_role','public.sl_cleanup_claim_v2()','execute') as service_execute;
```

Expected: one config column; RLS true; both buckets public=false; photo bucket unchanged (WebP, 3145728), audio bucket audio/mpeg, 3145728; owner SELECT and restrictive Storage denial policies; function privileges false/false/true. Do not paste credentials or protected rows into chat.

Review: no top-level DELETE, DROP, TRUNCATE, reset or existing-content backfill. New schema, constraints, private bucket, RLS and gateway replacements are additive. DELETE statements occur inside authorized runtime detach/failure/cleanup/deletion function bodies. Existing cleanup rows receive the legacy photo-bucket default; path uniqueness is retained for compatibility (generated `.webp`/`.mp3` paths are disjoint). Legacy claim **and** acknowledgement are photo-only; v2 binds bucket/path/lease. Migrations 001/002 are untouched.

Deploy the updated server/worker before enabling uploads; avoid rolling back to a pre-music worker. Restart local Next.js after migration if necessary. Default audio input/output limit is 3 MiB and duration is 180 seconds. Optional server-only `MAX_AUDIO_UPLOAD_BYTES` may lower the byte limit (1024–3145728); it cannot raise the database/bucket hard cap. Multipart allowance is 64 KiB beyond that limit. Total reserved/ready plus queued audio bytes are limited to 60 MiB per creator, with 100 queued-audio-job cap. Existing mutation and upload rate limits apply. Full audio downloads are bounded at 3 MiB; Range delivery slices a bounded Storage download, which can increase egress under repeated seeks.

Only MP3 is supported. Server-only `mpg123-decoder` performs actual bounded batch decoding after strict Layer III frame checks; file tags are removed and output framing reinspected. No transcoding or original file retention. Two concurrent inspections per server process and an eight-second inspection budget; deployed resource/performance checks remain release gates. Creators must acknowledge usage rights; this does not verify licensing. No external music URLs.
