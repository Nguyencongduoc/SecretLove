-- Additive initial migration. Apply once to an isolated Supabase project.
-- No table drops, truncation, production reset, or seed users.
begin;
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to service_role;

create table public.letters (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete restrict,
  title text not null check (char_length(btrim(title)) between 1 and 120),
  recipient_display_name text check (recipient_display_name is null or char_length(btrim(recipient_display_name)) between 1 and 100),
  body_doc jsonb not null default '{"type":"doc","content":[{"type":"paragraph"}]}' check (jsonb_typeof(body_doc) = 'object' and body_doc->>'type' = 'doc' and octet_length(body_doc::text) <= 98304),
  template_id text not null default 'rose' check (template_id in ('rose','minimal')),
  status text not null default 'draft' check (status in ('draft','published')),
  version bigint not null default 1 check (version > 0),
  access_version bigint not null default 1 check (access_version > 0),
  published_at timestamptz,
  deleted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((status = 'published') = (published_at is not null))
);
create index letters_owner_recent on public.letters(owner_id, updated_at desc, id) where deleted_at is null;
create table public.letter_photos (
  id uuid primary key default gen_random_uuid(),
  letter_id uuid not null references public.letters(id) on delete cascade,
  slot smallint not null check (slot between 0 and 5),
  object_path text not null unique,
  status text not null default 'pending' check (status in ('pending','ready')),
  mime_type text not null default 'image/webp' check (mime_type = 'image/webp'),
  byte_size integer not null check (byte_size between 1 and 3145728),
  width integer not null check (width between 1 and 4096),
  height integer not null check (height between 1 and 4096),
  alt_text text not null default 'Photo memory' check (char_length(btrim(alt_text)) between 1 and 200),
  created_at timestamptz not null default now(),
  unique(letter_id, slot), check (width::bigint * height <= 16000000)
);
create index photos_letter_order on public.letter_photos(letter_id, created_at, id);
create table private.letter_gates (
  letter_id uuid primary key references public.letters(id) on delete cascade,
  identity_nonce bytea not null check (octet_length(identity_nonce) = 16),
  identity_digest bytea not null check (octet_length(identity_digest) = 32),
  hmac_key_version smallint not null default 1,
  passphrase_record jsonb,
  updated_at timestamptz not null default now()
);
-- Publication/session tables are future foundations only. No recipient RPC/API exists in Day 1.
create table private.letter_shares (
  letter_id uuid primary key references public.letters(id) on delete cascade,
  token_digest bytea not null unique check (octet_length(token_digest) = 32),
  share_token text not null check (share_token ~ '^[A-Za-z0-9_-]{43}$'),
  active boolean not null default false,
  created_at timestamptz not null default now()
);
create table private.recipient_sessions (
  id uuid primary key default gen_random_uuid(),
  letter_id uuid not null references public.letters(id) on delete cascade,
  token_digest bytea not null unique check (octet_length(token_digest) = 32),
  access_version bigint not null check (access_version > 0),
  created_at timestamptz not null default now(), expires_at timestamptz not null,
  revoked_at timestamptz, check (expires_at > created_at)
);
create index sessions_letter on private.recipient_sessions(letter_id);
create index sessions_expiry on private.recipient_sessions(expires_at);
create table private.rate_limit_buckets (
  scope text not null, key_digest bytea not null check (octet_length(key_digest) = 32),
  window_start timestamptz not null, attempts integer not null check (attempts > 0), expires_at timestamptz not null,
  primary key(scope,key_digest,window_start)
);
create index rate_expiry on private.rate_limit_buckets(expires_at);
create table private.media_cleanup_jobs (
  id uuid primary key default gen_random_uuid(), object_path text not null unique,
  letter_id uuid, attempts integer not null default 0 check (attempts >= 0),
  available_at timestamptz not null default now(), lease_until timestamptz, lease_token uuid,
  last_error_code text, created_at timestamptz not null default now()
);
create index cleanup_available on private.media_cleanup_jobs(available_at);
create table private.maintenance_state (
  operation text primary key, cursor jsonb check (octet_length(cursor::text) <= 65536),
  last_success_at timestamptz, updated_at timestamptz not null default now()
);

alter table public.letters enable row level security;
alter table public.letter_photos enable row level security;
alter table private.letter_gates enable row level security;
alter table private.letter_shares enable row level security;
alter table private.recipient_sessions enable row level security;
alter table private.rate_limit_buckets enable row level security;
alter table private.media_cleanup_jobs enable row level security;
alter table private.maintenance_state enable row level security;
revoke all on public.letters, public.letter_photos from public, anon, authenticated;
grant select on public.letters, public.letter_photos to authenticated;
grant all on public.letters, public.letter_photos to service_role;
revoke all on private.letter_gates, private.letter_shares, private.recipient_sessions, private.rate_limit_buckets, private.media_cleanup_jobs, private.maintenance_state from public, anon, authenticated;
grant all on private.letter_gates, private.letter_shares, private.recipient_sessions, private.rate_limit_buckets, private.media_cleanup_jobs, private.maintenance_state to service_role;
create policy sl_owner_letters on public.letters for select to authenticated using (owner_id = (select auth.uid()) and deleted_at is null);
create policy sl_owner_photos on public.letter_photos for select to authenticated using (exists (select 1 from public.letters l where l.id = letter_id and l.owner_id = (select auth.uid()) and l.deleted_at is null));

-- String versions avoid PostgREST/JS bigint precision loss; underlying RLS still applies.
create view public.creator_letters with (security_invoker = true) as
  select id, owner_id, title, recipient_display_name, body_doc, template_id, status,
    version::text as version, created_at, updated_at, published_at, deleted_at from public.letters;
revoke all on public.creator_letters from public, anon, authenticated;
grant select on public.creator_letters to authenticated, service_role;

create function private.lock_letter(a uuid, lid uuid, expected text, draft_only boolean default true)
returns public.letters language plpgsql security invoker set search_path = '' as $$
declare l public.letters;
begin
  select * into l from public.letters where id = lid and owner_id = a and deleted_at is null for update;
  if not found then raise exception 'NOT_FOUND'; end if;
  if l.version::text <> expected then raise exception 'VERSION_CONFLICT'; end if;
  if draft_only and l.status <> 'draft' then raise exception 'LETTER_PUBLISHED'; end if;
  return l;
end $$;

create function public.sl_create_letter(a uuid, title_input text)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare lid uuid;
begin
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(a::text, 0));
  if (select count(*) from public.letters where owner_id = a and deleted_at is null) >= 20 then raise exception 'LETTER_LIMIT'; end if;
  insert into public.letters(owner_id,title) values (a,title_input) returning id into lid;
  return jsonb_build_object('id',lid);
end $$;

create function public.sl_gate_flags(a uuid, lid uuid)
returns jsonb language plpgsql security invoker set search_path = '' as $$
begin
  if not exists (select 1 from public.letters where id = lid and owner_id = a and deleted_at is null) then raise exception 'NOT_FOUND'; end if;
  return jsonb_build_object('verificationConfigured',exists(select 1 from private.letter_gates where letter_id = lid),'passphraseRequired',exists(select 1 from private.letter_gates where letter_id = lid and passphrase_record is not null));
end $$;

create function public.sl_save_letter(a uuid, lid uuid, expected text, changes jsonb)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare l public.letters; v bigint; gate_changed boolean;
begin
  l := private.lock_letter(a,lid,expected);
  if changes ? 'passphraseRecord' and changes->'passphraseRecord' <> 'null'::jsonb and not (changes ? 'gate') and not exists (select 1 from private.letter_gates where letter_id = lid) then raise exception 'VERIFICATION_REQUIRED'; end if;
  if changes ? 'gate' then
    insert into private.letter_gates(letter_id,identity_nonce,identity_digest) values (lid,decode(changes->'gate'->>'nonce','base64'),decode(changes->'gate'->>'digest','base64'))
    on conflict(letter_id) do update set identity_nonce = excluded.identity_nonce, identity_digest = excluded.identity_digest, updated_at = now();
  end if;
  if changes ? 'passphraseRecord' then update private.letter_gates set passphrase_record = nullif(changes->'passphraseRecord','null'::jsonb),updated_at = now() where letter_id = lid; end if;
  gate_changed := changes ? 'gate' or changes ? 'passphraseRecord';
  update public.letters set
    title = case when changes ? 'title' then changes->>'title' else title end,
    recipient_display_name = case when changes ? 'recipientDisplayName' then changes->>'recipientDisplayName' else recipient_display_name end,
    body_doc = case when changes ? 'bodyDoc' then changes->'bodyDoc' else body_doc end,
    template_id = case when changes ? 'templateId' then changes->>'templateId' else template_id end,
    version = version + 1, access_version = access_version + case when gate_changed then 1 else 0 end, updated_at = now()
    where id = lid returning version into v;
  return jsonb_build_object('version',v::text);
end $$;

create function public.sl_delete_letter(a uuid, lid uuid, expected text)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare l public.letters;
begin
  select * into l from public.letters where id = lid and owner_id = a for update;
  if not found then raise exception 'NOT_FOUND'; end if;
  if l.deleted_at is null then
    if l.version::text <> expected then raise exception 'VERSION_CONFLICT'; end if;
    insert into private.media_cleanup_jobs(object_path,letter_id) select object_path,lid from public.letter_photos where letter_id = lid on conflict(object_path) do nothing;
    delete from public.letter_photos where letter_id = lid;
    delete from private.letter_gates where letter_id = lid;
    delete from private.letter_shares where letter_id = lid;
    delete from private.recipient_sessions where letter_id = lid;
    update public.letters set deleted_at = now(),title = 'Deleted letter', recipient_display_name = null, body_doc = '{"type":"doc","content":[{"type":"paragraph"}]}',status = 'draft',published_at = null,version = version+1,access_version = access_version+1,updated_at = now() where id = lid;
  end if;
  return jsonb_build_object('deleted',true,'mediaCleanup',case when exists(select 1 from private.media_cleanup_jobs where letter_id = lid) then 'pending' else 'not_required' end);
end $$;

create function public.sl_photo_reserve(a uuid, lid uuid, expected text, pid uuid, info jsonb)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare l public.letters; position smallint; path text; v bigint;
begin
  l := private.lock_letter(a,lid,expected);
  select s::smallint into position from generate_series(0,5) s where not exists (select 1 from public.letter_photos where letter_id = lid and slot = s) order by s limit 1;
  if position is null then raise exception 'PHOTO_LIMIT'; end if;
  path := a::text || '/' || lid::text || '/' || pid::text || '.webp';
  insert into public.letter_photos(id,letter_id,slot,object_path,byte_size,width,height,alt_text) values (pid,lid,position,path,(info->>'byteSize')::integer,(info->>'width')::integer,(info->>'height')::integer,info->>'altText');
  update public.letters set version = version+1,updated_at = now() where id = lid returning version into v;
  return jsonb_build_object('path',path,'reservedVersion',v::text);
end $$;

create function public.sl_photo_finalize(a uuid, lid uuid, pid uuid, reserved text)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare l public.letters; photo public.letter_photos; path text; v bigint;
begin
  select * into l from public.letters where id = lid and owner_id = a for update;
  if not found then raise exception 'NOT_FOUND'; end if;
  path := a::text || '/' || lid::text || '/' || pid::text || '.webp';
  select * into photo from public.letter_photos where id = pid and letter_id = lid and object_path = path;
  -- A retry must never enqueue an already committed photo for deletion.
  if photo.status = 'ready' then return jsonb_build_object('conflict',true); end if;
  if photo.id is null or l.deleted_at is not null or l.status <> 'draft' or l.version::text <> reserved then
    insert into private.media_cleanup_jobs(object_path,letter_id) values(path,lid) on conflict(object_path) do nothing;
    delete from public.letter_photos where id = pid and letter_id = lid and status = 'pending';
    if found then update public.letters set version = version+1,updated_at = now() where id = lid; end if;
    return jsonb_build_object('conflict',true);
  end if;
  update public.letter_photos set status = 'ready' where id = pid;
  update public.letters set version = version+1,updated_at = now() where id = lid returning version into v;
  return jsonb_build_object('conflict',false,'version',v::text);
end $$;

create function public.sl_photo_fail(a uuid, lid uuid, pid uuid)
returns void language plpgsql security invoker set search_path = '' as $$
begin
  perform 1 from public.letters where id = lid and owner_id = a for update;
  if not found then raise exception 'NOT_FOUND'; end if;
  -- Finalization may have succeeded before the server's response failed.
  if exists(select 1 from public.letter_photos where id = pid and letter_id = lid and status = 'ready') then return; end if;
  insert into private.media_cleanup_jobs(object_path,letter_id) values(a::text||'/'||lid::text||'/'||pid::text||'.webp',lid) on conflict(object_path) do nothing;
  delete from public.letter_photos where id = pid and letter_id = lid and status = 'pending';
  if found then update public.letters set version = version+1,updated_at = now() where id = lid; end if;
end $$;

create function public.sl_photo_change(a uuid, lid uuid, pid uuid, expected text, alt_input text default null)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare l public.letters; path text; v bigint;
begin
  l := private.lock_letter(a,lid,expected);
  select object_path into path from public.letter_photos where id = pid and letter_id = lid;
  if not found then raise exception 'NOT_FOUND'; end if;
  if alt_input is null then
    insert into private.media_cleanup_jobs(object_path,letter_id) values(path,lid) on conflict(object_path) do nothing;
    delete from public.letter_photos where id = pid and letter_id = lid;
  else update public.letter_photos set alt_text = alt_input where id = pid; end if;
  update public.letters set version = version+1,updated_at = now() where id = lid returning version into v;
  return jsonb_build_object('removed',alt_input is null,'version',v::text,'mediaCleanup',case when alt_input is null then 'pending' else 'not_required' end);
end $$;

create function public.sl_photo_path(a uuid, lid uuid, pid uuid)
returns text language plpgsql security invoker set search_path = '' as $$
declare path text;
begin
  select p.object_path into path from public.letter_photos p join public.letters l on l.id = p.letter_id where p.id = pid and l.id = lid and l.owner_id = a and l.deleted_at is null and p.status = 'ready';
  if not found then raise exception 'NOT_FOUND'; end if;
  return path;
end $$;

create function public.sl_rate_limit(scope_input text, digest_input text, limit_input integer, seconds_input integer)
returns boolean language plpgsql security invoker set search_path = '' as $$
declare window_time timestamptz; count_value integer;
begin
  if limit_input < 1 or seconds_input < 1 then raise exception 'INVALID_LIMIT'; end if;
  window_time := to_timestamp(floor(extract(epoch from clock_timestamp()) / seconds_input) * seconds_input);
  insert into private.rate_limit_buckets(scope,key_digest,window_start,attempts,expires_at) values (scope_input,decode(digest_input,'base64'),window_time,1,window_time + make_interval(secs => seconds_input) + interval '48 hours')
  on conflict(scope,key_digest,window_start) do update set attempts = least(private.rate_limit_buckets.attempts+1,limit_input+1) returning attempts into count_value;
  return count_value <= limit_input;
end $$;

create function public.sl_cleanup_stale()
returns integer language plpgsql security invoker set search_path = '' as $$
declare lid uuid; total integer := 0; count_value integer;
begin
  for lid in select distinct letter_id from public.letter_photos where status = 'pending' and created_at < now()-interval '1 hour' limit 20 loop
    perform 1 from public.letters where id = lid for update;
    insert into private.media_cleanup_jobs(object_path,letter_id) select object_path,letter_id from public.letter_photos where letter_id = lid and status = 'pending' and created_at < now()-interval '1 hour' on conflict(object_path) do nothing;
    delete from public.letter_photos where letter_id = lid and status = 'pending' and created_at < now()-interval '1 hour';
    get diagnostics count_value = row_count;
    if count_value > 0 then update public.letters set version = version+1,updated_at = now() where id = lid; end if;
    total := total + count_value;
  end loop;
  delete from private.rate_limit_buckets where expires_at < now();
  delete from private.recipient_sessions where expires_at < now()-interval '24 hours';
  return total;
end $$;

create function public.sl_cleanup_claim()
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare result jsonb;
begin
  with picked as (select id from private.media_cleanup_jobs where available_at <= now() and (lease_until is null or lease_until < now()) order by available_at limit 20 for update skip locked),
  claimed as (update private.media_cleanup_jobs j set lease_until = now()+interval '5 minutes',lease_token = gen_random_uuid() from picked where j.id = picked.id returning j.id,j.object_path,j.lease_token)
  select coalesce(jsonb_agg(jsonb_build_object('id',id,'path',object_path,'leaseToken',lease_token)),'[]'::jsonb) into result from claimed;
  return result;
end $$;

create function public.sl_cleanup_complete(jid uuid, token uuid, succeeded boolean)
returns void language plpgsql security invoker set search_path = '' as $$
begin
  if succeeded then delete from private.media_cleanup_jobs where id = jid and lease_token = token;
  else update private.media_cleanup_jobs set attempts = attempts+1,lease_token = null,lease_until = null,last_error_code = 'STORAGE_DELETE_FAILED',available_at = now()+make_interval(secs => least(86400,60*power(2,least(attempts,10))::integer)) where id = jid and lease_token = token; end if;
  delete from public.letters l where l.deleted_at is not null and l.deleted_at < now()-interval '1 hour' and not exists(select 1 from private.media_cleanup_jobs j where j.letter_id = l.id);
end $$;

create function public.sl_maintenance_state(new_cursor jsonb default null, write_state boolean default false)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare value jsonb;
begin
  if write_state then insert into private.maintenance_state(operation,cursor,last_success_at) values('media_scan',new_cursor,case when new_cursor is null then now() else null end)
    on conflict(operation) do update set cursor = excluded.cursor,updated_at = now(),last_success_at = coalesce(excluded.last_success_at,private.maintenance_state.last_success_at); end if;
  select cursor into value from private.maintenance_state where operation = 'media_scan'; return value;
end $$;

create function public.sl_enqueue_orphan(path_input text)
returns void language plpgsql security invoker set search_path = '' as $$
begin
  if path_input !~ '^[0-9a-f-]{36}/[0-9a-f-]{36}/[0-9a-f-]{36}\.webp$' then return; end if;
  if not exists(select 1 from public.letter_photos where object_path = path_input) then
    insert into private.media_cleanup_jobs(object_path,letter_id) values(path_input,split_part(path_input,'/',2)::uuid) on conflict(object_path) do nothing;
  end if;
end $$;

create function public.sl_cleanup_remaining() returns bigint language sql security invoker set search_path = '' as $$ select count(*) from private.media_cleanup_jobs $$;

-- Restrict only this application's functions, preserving unrelated project functions.
revoke all on function private.lock_letter(uuid,uuid,text,boolean) from public,anon,authenticated;
grant execute on function private.lock_letter(uuid,uuid,text,boolean) to service_role;
do $$ declare f record; begin
  for f in select p.oid::regprocedure as signature from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'public' and p.proname like 'sl\_%' escape '\' loop
    execute format('revoke all on function %s from public, anon, authenticated',f.signature);
    execute format('grant execute on function %s to service_role',f.signature);
  end loop;
end $$;
alter default privileges in schema private revoke execute on functions from public,anon,authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('letter-media','letter-media',false,3145728,array['image/webp']) on conflict(id) do nothing;
do $$ begin
  if not exists(select 1 from storage.buckets where id = 'letter-media' and public = false and file_size_limit = 3145728 and allowed_mime_types = array['image/webp']) then raise exception 'Existing letter-media bucket has incompatible settings; review manually'; end if;
end $$;
-- Restrictive policy also denies broad pre-existing policies for this bucket.
create policy sl_block_browser_media on storage.objects as restrictive for all to anon,authenticated using (bucket_id <> 'letter-media') with check (bucket_id <> 'letter-media');
commit;
