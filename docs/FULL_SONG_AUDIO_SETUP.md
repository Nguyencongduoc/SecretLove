# Full-song audio limits — migration 004

The user requested support for a complete song around five minutes. The supplied local file is 5,432,686 bytes (5.18 MiB), approximately 331.42 seconds (5:31), with variable bitrate. The previous 3 MiB/180-second caps reject it. Current product limits are **16 MiB (16,777,216 bytes), 360 seconds (6 minutes), one private MP3 per letter**. Six minutes accommodates the supplied example; 16 MiB also accommodates a five-minute high-bitrate MP3. File tags/artwork still count toward input size and are removed from stored output. No transcoding or public/external music.

## Apply manually to the isolated project

1. Confirm migrations 001, 002 and 003 were already applied. **Do not edit or replay them.**
2. In Supabase **Storage Settings**, ensure the project's Global file size limit is at least 16,777,216 bytes (choose at least 17 MB if the UI uses decimal MB). This project-level ceiling is separate from the bucket limit. [Supabase file limits](https://supabase.com/docs/guides/storage/uploads/file-limits).
3. Open **SQL Editor → New query**. Paste the entire `supabase/migrations/202610140004_full_song_audio.sql`, including BEGIN/COMMIT. Run once.
4. If a precondition/lock error occurs, the transaction rolls back. Stop and review it; do not remove privacy checks, run a reset or repeat individual statements.
5. Run the following read-only checks; do not print credentials or media/content rows:

```sql
select id,public,file_size_limit,allowed_mime_types
from storage.buckets where id in ('letter-media','letter-assets');

select conname,convalidated,pg_get_constraintdef(oid) as definition
from pg_constraint where conrelid='public.letter_assets'::regclass
and conname in ('sl_audio_bytes_v2','sl_audio_duration_v2',
               'letter_assets_byte_size_check','letter_assets_duration_seconds_check');

select relrowsecurity from pg_class where oid='public.letter_assets'::regclass;
select policyname,permissive,roles,cmd from pg_policies
where (schemaname='public' and tablename='letter_assets')
   or (schemaname='storage' and policyname='sl_block_browser_assets');

select has_function_privilege('anon','public.sl_recipient_audio(text,text,uuid)','execute') as anon_execute,
 has_function_privilege('authenticated','public.sl_audio_reserve(uuid,uuid,text,uuid,integer,double precision)','execute') as browser_execute,
 has_function_privilege('service_role','public.sl_audio_reserve(uuid,uuid,text,uuid,integer,double precision)','execute') as service_execute;
```

Expected: both buckets private; photo bucket unchanged at 3,145,728/WebP; audio bucket 16,777,216/audio-mpeg; only the two new named limits present and validated, bytes <=16,777,216 and duration <=360; asset RLS true; owner SELECT and restrictive Storage browser denial intact; privileges false/false/true.

6. Keep `.env.local`. No new credentials are required. If `MAX_AUDIO_UPLOAD_BYTES` is explicitly present with the old value, change only that optional setting manually to `16777216` or remove it to use the default. A deliberately lower setting still wins. The inspected local environment does not currently set this override.
7. Restart the updated Next.js server before allowing larger uploads. Old application builds still cap audio delivery at 3 MiB. Existing tracks/configurations remain valid. Save the draft, upload, wait for success, Enable, Save music settings, preview and publish. Recipients still unlock and explicitly choose Play.

## SQL review and compatibility

Migration 004 adds and validates wider CHECK constraints before removing only the two superseded metadata CHECK definitions. It updates only the private audio bucket's size setting. These `DROP CONSTRAINT` operations are necessary to replace the old limits; they do **not** drop tables, delete media, truncate data or reset the database. No letter/asset/body/config/cleanup rows or Storage bytes are removed/backfilled. Existing metadata satisfies the wider bounds. RPCs, RLS, grants, MIME policy, publication/version/session rules and the photo bucket are unchanged. A five-second lock timeout avoids waiting indefinitely. Apply once; a repeated application deliberately fails its migration-003 precondition.

Quota remains **60 MiB per creator**, including pending/ready and queued audio, with 100 queued-audio jobs and the existing upload/mutation/read limits. A larger per-track cap does not grant unlimited storage. A maximum-size track consumes 16 MiB of the same quota.

## Resource and deployment gates

Server framing, real MP3 decode, tag stripping and sanitized reinspection remain required. Keep two concurrent inspections, batches of 32 discarded PCM frames, eight-second inspection budget and four bounded audio downloads per process. Full downloads now buffer at most 16 MiB each (64 MiB across four downloads before response/copy overhead); upload/form copies and decoder allocations add memory. Next's bounded proxy buffer is set to 17 MiB to avoid truncating valid 16 MiB multipart uploads; the upload route still caps the raw body at 16 MiB +64 KiB and the file at 16 MiB. JSON/photo routes retain their original smaller limits. This raises a per-request memory budget, not an authorization or general file cap. [Next.js proxy buffer configuration](https://nextjs.org/docs/pages/api-reference/config/next-config-js/proxyClientMaxBodySize). Range requests still fetch a bounded whole private object before slicing, increasing repeated-seek egress. Deployed memory, latency and outage testing remain release gates.

**The current upload proxy cannot provide 16 MiB uploads through Vercel Functions.** Vercel documents a 4.5 MB request/response body ceiling; raising a Next.js or Storage cap does not remove it. [Vercel Function limits](https://vercel.com/docs/functions/limitations). This change supports the current local Node server and compatible Node hosting. Before Vercel deployment, design a separately approved bounded chunk/resumable upload with server-side owner/version reservation, private staging, authoritative decode/finalize and cleanup; assess audio delivery/streaming too. Never solve this with a public bucket or unauthorized recipient URLs. Supabase recommends resumable upload for larger files; reliability improvements require a separate transport design. [Supabase standard uploads](https://supabase.com/docs/guides/storage/uploads/standard-uploads).

## Current evidence

- Local PostgreSQL migration chain through 004 and existing-data preservation PASS. New 16 MiB/360-second bounds and rejection above either cap PASS; existing RLS/access/cleanup tests PASS.
- Local validation/decode of a generated five-minute MP3 above both old caps PASS.
- Actual supplied VBR file validates through the existing full server normalization pipeline locally; it is not uploaded, copied into the repository or retained as a test fixture.
- Local suite with the opt-in sample test: **39 PASS, 0 FAIL, 0 skipped**. Without `SECRETLOVE_AUDIO_TEST_FILE`, that optional local-file test intentionally skips; the portable tests remain runnable without the creator's Downloads directory.
- User confirmed manual migration 004 and its verification succeeded. Automated read-only schema/anonymous metadata/private 16 MiB bucket checks **PASS**.
- Final typecheck/lint/production build **PASS**. Client secret scan **PASS**, 61 assets. Full browser suite **16 PASS, 0 FAIL, 0 skipped**, desktop/360px. The music scenario uploads a generated five-minute ~4.57 MiB MP3 through the real editor, confirms matching ready metadata, downloads identical bytes through the owner proxy, explicitly previews, saves/reloads settings, publishes/unlocks and plays through scene changes with controls. Anonymous/cross-creator/cross-letter/disabled/closed access denial, authorized HEAD/ranges, cleanup/removal/replacement, error recovery and legacy silent flows pass. No fake authorization success; the supplied song is never uploaded. Positive actual upload at the full 16 MiB byte boundary is NOT TESTED; that boundary is exercised locally as metadata and remotely as over-cap rejection.
- Initial browser run: **14 PASS/2 FAIL**, because Next's 10 MiB default proxy truncated the oversized multipart test into a 400 instead of 413. Configure bounded 17 MiB proxy buffer, rebuild and rerun with unchanged file/body/authorization assertions: **16 PASS/0 FAIL**; oversized upload returns 413. No current failures in executed checks.
- `.env.local` and applied migrations 001–003 have no write operations in this change and match final-window hashes. Initial whole-task hash baseline was lost to browser output cleanup; no whole-task independent hash audit claim. New migration 004 was user-applied and not edited afterward. Synthetic accounts retained for operator cleanup: 52 total, 6 added this change.
- Physical-device audibility, complete codec matrix, positive 16 MiB boundary transport, deployed memory/latency/egress and Vercel large-file transport **NOT TESTED**. No deployment.
