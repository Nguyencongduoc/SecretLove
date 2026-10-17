# Private chunk audio — additive migration 008

The user approved same-origin <=1 MiB chunks. No Vercel project creation/deployment/remote settings changes are approved. The proposed project is secretlove-preview, owner-only Vercel Authentication, exact HTTPS origin pending; use the existing isolated Supabase test project.

Migration `supabase/migrations/202610150008_private_audio_ingests.sql` adds two private RLS tables, a browser-denied private staging bucket and service-only ingests/cleanup gateways. It widens the cleanup bucket CHECK by adding/validating its successor before dropping the old CHECK; no rows/objects are deleted during migration application. DELETE bodies run only for authorized cancellation/attachment, expiry or maintenance. Applied 001–007 are unchanged. New v3 workers handle staging; legacy claims/acknowledgements stay restricted to their buckets.

The byte cap remains 16 MiB/360 seconds. Each raw chunk is <=1 MiB. The existing 60 MiB creator budget reserves raw plus final candidate bytes (2x declared bytes) during ingest; queued staging counts too. This can temporarily limit simultaneous full-size uploads without lowering the individual file cap. At most sixteen immutable parts/one active ingest per letter; 15-minute expiry, 90-second commit lease, bounded part rate (120/min), original mutation/upload rates unchanged. Server verifies part/file SHA-256 manifest, actual codec/duration/tag stripping and parent owner/draft/version before ready attachment. Raw parts are never delivered by content/media routes. Cancel/expiry/delete enqueue generated parts and any candidate; successful finalization queues only raw parts, preserving ready music/customization. Cleanup remains best effort, with late bytes reconciled by bounded orphan sweeps.

## Manual application

1. Open the existing isolated test project's SQL Editor; confirm it is not production.
2. Copy the **entire** migration 008, including begin/commit, into a new query. Run once after 001–007. Do not reset/replay prior migrations.
3. On any error, stop and report a redacted message; do not remove checks or grant browser access.
4. Run these read-only queries. Expect two RLS-enabled tables; a private staging bucket with 1048576 and application/octet-stream; every protection column true. Keep private schema unexposed in Data API. Global Storage file limit still >=16 MiB for sanitized final tracks.
5. Confirm successful application/checks in chat. Do not paste secret values. Only then can the changed live Studio/cleanup paths and browser regression suite work against this schema.

```sql
select tablename,rowsecurity from pg_tables
 where schemaname='private' and tablename in ('audio_ingests','audio_ingest_parts');
select id,public,file_size_limit,allowed_mime_types from storage.buckets
 where id='letter-audio-staging';
select not has_table_privilege('anon','private.audio_ingests','SELECT,INSERT,UPDATE,DELETE') as anon_denied,
 not has_table_privilege('authenticated','private.audio_ingests','SELECT,INSERT,UPDATE,DELETE') as authenticated_denied,
 not has_schema_privilege('authenticated','private','USAGE') as private_schema_denied;
select p.proname,
 not has_function_privilege('anon',p.oid,'EXECUTE') as anon_denied,
 not has_function_privilege('authenticated',p.oid,'EXECUTE') as browser_denied,
 has_function_privilege('service_role',p.oid,'EXECUTE') as service_allowed,
 not p.prosecdef as invoker_security,
 'search_path=""'=any(p.proconfig) as fixed_search_path
from pg_proc p join pg_namespace n on n.oid=p.pronamespace
where n.nspname='public' and (p.proname like 'sl_ingest_%'
 or p.proname in ('sl_cleanup_claim_v3','sl_cleanup_complete_v3','sl_staging_scan_state','sl_staging_orphan'));
select exists(select 1 from pg_policies where schemaname='storage' and tablename='objects'
 and policyname='sl_block_browser_audio_staging' and permissive='RESTRICTIVE') as browser_staging_denial_present;
```

No remote SQL or bulk fixture cleanup is performed by the agent. Reuse of existing verified synthetic accounts for tests does not authorize deletion of the historical cohort. Do not roll back to a worker that cannot handle staging; old workers can safely leave staging pending, but new v3 cleanup is required to drain it.
