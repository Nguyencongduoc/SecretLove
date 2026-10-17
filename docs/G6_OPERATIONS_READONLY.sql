-- READ ONLY. Run manually only in Supabase Production mdoaageegovutlxhhicz.
-- Verify the project reference in Dashboard first; SQL cannot infer it reliably.
-- Do not use historical test backend. This is NOT a migration or cleanup call.
-- Output contains aggregates/timestamps only: no paths, cursors, keys or user data.
begin read only;
set local statement_timeout = '10s';
set local lock_timeout = '2s';

with queue_by_bucket as (
  select bucket_id,
    count(*) as total_jobs,
    count(*) filter (where available_at <= now() and (lease_until is null or lease_until < now())) as due_jobs,
    count(*) filter (where lease_until > now()) as leased_jobs,
    count(*) filter (where attempts > 0) as retried_jobs,
    coalesce(max(attempts), 0) as max_attempts,
    coalesce(sum(byte_size), 0) as declared_queued_bytes,
    greatest(0, coalesce(floor(extract(epoch from (now() - min(created_at)))), 0)) as oldest_job_age_seconds,
    count(*) filter (where letter_id is null) as jobs_without_letter,
    count(*) filter (where letter_id is not null and letter_id not in (
      '7e132579-d0e2-41a7-8850-40ec74b074d7'::uuid,
      '296715a7-cf14-4668-94b1-f6fa86b70db5'::uuid
    )) as jobs_outside_qa_ab
  from private.media_cleanup_jobs
  group by bucket_id
), maintenance as (
  select operation, updated_at, last_success_at, (cursor is not null) as has_cursor
  from private.maintenance_state
  where operation in ('media_scan', 'audio_scan_v1', 'staging_scan_v1')
), backlog as (
  select
    (select count(*) from private.audio_ingests where expires_at < now()
      and (lease_until is null or lease_until < now())) as expired_ingests,
    (select count(*) from public.letter_photos where status = 'pending'
      and created_at < now() - interval '1 hour') as stale_pending_photos,
    (select count(*) from private.recipient_sessions
      where expires_at < now() - interval '24 hours') as prunable_recipient_sessions,
    (select count(*) from private.rate_limit_buckets where expires_at < now()) as expired_rate_buckets,
    (select count(*) from private.recovery_consumptions where expires_at < now()) as expired_recovery_records,
    (select count(*) from private.abuse_reports where purge_after < now()
      and coalesce(hold_until, purge_after) < now()) as due_report_prunes,
    (select count(*) from private.operator_audit where purge_after < now()
      and coalesce(hold_until, purge_after) < now()) as due_audit_prunes,
    (select count(*) from public.letters where deleted_at is not null) as tombstoned_letters,
    (select count(*) from public.letters l where l.deleted_at < now() - interval '1 hour'
      and not exists(select 1 from private.media_cleanup_jobs j where j.letter_id = l.id)) as potentially_prunable_letter_tombstones,
    (select count(*) from public.letter_photos p join public.letters l on l.id = p.letter_id
      where l.deleted_at is null and p.status = 'ready' and not exists(
        select 1 from storage.objects o where o.bucket_id = 'letter-media' and o.name = p.object_path
      )) as active_ready_photos_missing_object_metadata,
    (select count(*) from public.letter_assets a join public.letters l on l.id = a.letter_id
      where l.deleted_at is null and a.status = 'ready' and not exists(
        select 1 from storage.objects o where o.bucket_id = 'letter-assets' and o.name = a.object_path
      )) as active_ready_audio_missing_object_metadata
), bucket_totals as (
  select b.id, b.public as is_public, b.file_size_limit,
    count(o.id) as object_metadata_count,
    coalesce(sum(case when o.metadata->>'size' ~ '^[0-9]{1,15}$'
      then (o.metadata->>'size')::bigint else 0 end), 0) as declared_object_bytes
  from storage.buckets b
  left join storage.objects o on o.bucket_id = b.id
  where b.id in ('letter-media', 'letter-assets', 'letter-audio-staging')
  group by b.id, b.public, b.file_size_limit
), inventory as (
  select
    (select count(*) from auth.users) as auth_users,
    (select count(*) from private.operator_accounts where active) as active_operators,
    (select count(*) from private.creator_access where status = 'approved') as approved_creators,
    (select count(*) from public.letters where deleted_at is null) as active_letters,
    (select count(*) from public.letter_photos where status = 'ready') as ready_photos,
    (select count(*) from public.letter_assets where status = 'ready') as ready_audio_assets
)
select jsonb_build_object(
  'transaction_read_only', current_setting('transaction_read_only') = 'on',
  'queue_by_bucket', (select coalesce(jsonb_agg(to_jsonb(q) order by q.bucket_id), '[]'::jsonb) from queue_by_bucket q),
  'maintenance', (select coalesce(jsonb_agg(to_jsonb(m) order by m.operation), '[]'::jsonb) from maintenance m),
  'backlog', (select to_jsonb(b) from backlog b),
  'buckets', (select coalesce(jsonb_agg(to_jsonb(s) order by s.id), '[]'::jsonb) from bucket_totals s),
  'inventory', (select to_jsonb(i) from inventory i)
) as operations_snapshot;

commit;
