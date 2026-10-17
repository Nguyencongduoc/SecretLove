-- Preparation only: not executed or a cleanup authorization.
-- Operator must verify Dashboard project mdoaageegovutlxhhicz separately.
-- Aggregates only; no paths, IDs, digests, tokens or contents returned.
-- No RPCs, row locks, DDL, DML, Storage calls or cleanup invocation.
begin transaction isolation level repeatable read read only;
set local statement_timeout = '10s';
set local lock_timeout = '2s';

select jsonb_build_object(
  'snapshot_at_utc', to_char(transaction_timestamp() at time zone 'UTC',
    'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
  'transaction_read_only', current_setting('transaction_read_only') = 'on',
  'uploads', jsonb_build_object(
    'pending_photos_total', (select count(*) from public.letter_photos where status = 'pending'),
    'pending_audio_total', (select count(*) from public.letter_assets where status = 'pending'),
    'stale_pending_audio', (select count(*) from public.letter_assets
      where status = 'pending' and created_at < now() - interval '1 hour'),
    'ingests_total', (select count(*) from private.audio_ingests),
    'unexpired_ingests', (select count(*) from private.audio_ingests where expires_at >= now()),
    'leased_ingests', (select count(*) from private.audio_ingests where lease_until >= now()),
    'finalizing_ingests', (select count(*) from private.audio_ingests where status = 'finalizing'),
    'ingest_parts_total', (select count(*) from private.audio_ingest_parts)
  ),
  'holds', jsonb_build_object(
    'held_letters', (select count(*) from private.letter_moderation where state = 'held'),
    'open_reports', (select count(*) from private.abuse_reports where status = 'open'),
    'reports_with_active_retention_hold', (select count(*) from private.abuse_reports where hold_until >= now()),
    'audits_with_active_retention_hold', (select count(*) from private.operator_audit where hold_until >= now())
  ),
  'queue_conflicts', jsonb_build_object(
    'jobs_referencing_photo_rows', (select count(*) from private.media_cleanup_jobs j
      where j.bucket_id = 'letter-media' and exists (
        select 1 from public.letter_photos p where p.object_path = j.object_path)),
    'jobs_referencing_audio_rows', (select count(*) from private.media_cleanup_jobs j
      where j.bucket_id = 'letter-assets' and exists (
        select 1 from public.letter_assets a where a.object_path = j.object_path)),
    'jobs_referencing_ingest_parts', (select count(*) from private.media_cleanup_jobs j
      where j.bucket_id = 'letter-audio-staging' and exists (
        select 1 from private.audio_ingest_parts p where p.object_path = j.object_path)),
    'jobs_missing_storage_metadata', (select count(*) from private.media_cleanup_jobs j
      where not exists (select 1 from storage.objects o
        where o.bucket_id = j.bucket_id and o.name = j.object_path))
  )
) as preflight_supplement;

commit;
