# Particle heart — migration 006 and acceptance

The user approved this Day 2 extension on `feature/particle-heart-customization`, including an original procedural geometry source. Day 3 and deployment are not authorized. Migrations 001–005 are immutable.

## Apply manually to the isolated test project

1. Confirm migrations 001–005 have succeeded. Open **Supabase Dashboard → your isolated SecretLove project → SQL Editor → New query**.
2. Paste the entire contents of `supabase/migrations/202610140006_particle_heart.sql`. Run once, as one transaction. Do not replay earlier migrations or use database reset.
3. Wait for success. If there is an error, retain its non-sensitive message and stop; the transaction rolls back. Do not remove a constraint or permission to make it succeed.
4. Run the read-only queries below. They display definitions/flags only, never private phrases or credentials.

```sql
select conname, convalidated
from pg_constraint
where conrelid = 'public.letters'::regclass
  and conname = 'sl_heart_customization_check';
-- Exactly one row, convalidated = true.

select proname, prosecdef, proconfig,
  has_function_privilege('anon', p.oid, 'EXECUTE') as anon_execute,
  has_function_privilege('authenticated', p.oid, 'EXECUTE') as browser_execute,
  has_function_privilege('service_role', p.oid, 'EXECUTE') as server_execute
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where (n.nspname = 'public' and p.proname in
  ('sl_save_letter','sl_audio_finalize','sl_music_settings','sl_music_remove'))
  or (n.nspname = 'private' and p.proname = 'sl_heart_customization_valid');
-- Five rows: anon/browser false, server true; security invoker, empty search_path.

select private.sl_heart_customization_valid(
 '{"schemaVersion":1,"heart":{"style":"procedural-particle","color":"pink"},"textRings":{"enabled":true,"phrases":["Cảm ơn vì đã xuất hiện"],"rotationSpeed":"slow"}}'
 ::jsonb) as valid_example;
-- true.

select proname,
  position('coalesce(l.presentation_config' in pg_get_functiondef(p.oid)) > 0 as preserves_config
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public' and proname in
 ('sl_audio_finalize','sl_music_settings','sl_music_remove');
-- Three rows, preserves_config=true.

select reloptions from pg_class where oid='public.creator_letters'::regclass;
-- security_invoker=true retained.
select id, public, file_size_limit from storage.buckets
where id in ('letter-assets','letter-media');
-- Both private; audio cap remains 16777216. Photo cap unchanged.
```

Applying 006 has no top-level DELETE, DROP, TRUNCATE, reset, backfill, Storage or RLS mutation. It adds one validator/CHECK and replaces four existing service-only functions. The existing authorized music-removal function still deletes detached metadata/queues private byte cleanup **when explicitly invoked by the application**, not when the migration is applied. Owner/draft/version/gate and audio quota/race checks remain intact. Existing letters/config rows are preserved.

## Stored/wire configuration

PATCH `/api/letters/{id}` accepts `heartCustomization` alongside `expectedVersion`. Omission preserves it; explicit null resets only heart settings. Stored at `letters.presentation_config.heartCustomization`, under existing outer `schemaVersion:1`:

```json
{
  "schemaVersion": 1,
  "heart": { "style": "procedural-particle", "color": "pink" },
  "textRings": {
    "enabled": true,
    "phrases": ["Cảm ơn vì đã xuất hiện", "With love, always"],
    "rotationSpeed": "slow"
  }
}
```

Strict known keys, 4 KiB, <=5 phrases, 1–60 NFC-normalized Unicode code points each; pink/red/purple and slow/normal/fast only. No model/font/URL/shader/HTML options. Phrases are literal text. Empty array inherits three trusted default phrases; disabled rings render none. Missing/null/unsupported heart config resolves to defaults without writing data. No read-time backfill. Music mutations merge their own subset; heart Save/reset preserves music, scene copy and content. Existing letters gain the new renderer with default appearance.

## Current verification

The user manually applied 006 and confirmed verification. Final typecheck/lint/production build PASS; local suite 47 PASS and 1 optional external-MP3 SKIPPED; complete real-Supabase desktop/mobile browser suite 18 PASS, 0 FAIL, 0 skipped. This includes direct owner-preview refresh, custom phrases retained across music mutations, publication/unlock and private isolation. Client-secret scan and immutable-file audit PASS. See PARTICLE_HEART_TEST_REPORT.md for exact assertions, screenshots, performance and remaining physical/deployment/cleanup gates. No deployment or Day 3 work.
