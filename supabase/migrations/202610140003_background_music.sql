-- NEW additive music migration. No existing rows or storage bytes are deleted by applying it.
-- DELETE statements below are function bodies invoked only by authorized application operations.
begin;
alter table public.letters add column presentation_config jsonb
  check(presentation_config is null or (jsonb_typeof(presentation_config)='object' and presentation_config->>'schemaVersion'='1' and octet_length(presentation_config::text)<=16384));
create or replace view public.creator_letters with (security_invoker=true) as
 select id,owner_id,title,recipient_display_name,body_doc,template_id,status,version::text as version,created_at,updated_at,published_at,deleted_at,presentation_config from public.letters;
create table public.letter_assets (
 id uuid primary key,letter_id uuid not null references public.letters(id) on delete cascade,
 kind text not null default 'audio' check(kind='audio'),
 status text not null default 'pending' check(status in ('pending','ready')),
 object_path text not null unique,byte_size integer not null check(byte_size between 1 and 3145728),
 mime_type text not null default 'audio/mpeg' check(mime_type='audio/mpeg'),
 duration_seconds double precision not null check(duration_seconds>0 and duration_seconds<=180),
 created_at timestamptz not null default now(),unique(letter_id,kind)
);
alter table public.letter_assets enable row level security;
revoke all on public.letter_assets from public,anon,authenticated;
grant select on public.letter_assets to authenticated;
grant all on public.letter_assets to service_role;
create policy sl_owner_assets on public.letter_assets for select to authenticated using(exists(select 1 from public.letters l where l.id=letter_id and l.owner_id=(select auth.uid()) and l.deleted_at is null));
alter table private.media_cleanup_jobs add column bucket_id text not null default 'letter-media' check(bucket_id in ('letter-media','letter-assets'));
alter table private.media_cleanup_jobs add column byte_size integer not null default 0 check(byte_size>=0);
-- Retain legacy path uniqueness/conflict targets; extensions are disjoint across these two buckets.
create unique index cleanup_bucket_path on private.media_cleanup_jobs(bucket_id,object_path);
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('letter-assets','letter-assets',false,3145728,array['audio/mpeg']) on conflict(id) do nothing;
do $$ begin
 if not exists(select 1 from storage.buckets where id='letter-assets' and public=false and file_size_limit=3145728 and allowed_mime_types=array['audio/mpeg']) then raise exception 'Existing letter-assets bucket incompatible; review manually'; end if;
end $$;
create policy sl_block_browser_assets on storage.objects as restrictive for all to anon,authenticated using(bucket_id<>'letter-assets') with check(bucket_id<>'letter-assets');

create function public.sl_audio_reserve(a uuid,lid uuid,expected text,aid uuid,size_input integer,duration_input double precision)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare l public.letters; path text; v bigint;
begin
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(a::text,0));
 l:=private.lock_letter(a,lid,expected);
 if exists(select 1 from public.letter_assets where letter_id=lid) then raise exception 'AUDIO_LIMIT'; end if;
 if (select coalesce(sum(p.byte_size),0) from public.letter_assets p join public.letters x on x.id=p.letter_id where x.owner_id=a)+
    (select coalesce(sum(byte_size),0) from private.media_cleanup_jobs where bucket_id='letter-assets' and split_part(object_path,'/',1)=a::text)+size_input>62914560
    or (select count(*) from private.media_cleanup_jobs where bucket_id='letter-assets' and split_part(object_path,'/',1)=a::text)>=100 then raise exception 'ASSET_QUOTA'; end if;
 path:=a::text||'/'||lid::text||'/'||aid::text||'.mp3';
 insert into public.letter_assets(id,letter_id,object_path,byte_size,duration_seconds) values(aid,lid,path,size_input,duration_input);
 update public.letters set version=version+1,updated_at=now() where id=lid returning version into v;
 return jsonb_build_object('path',path,'reservedVersion',v::text);
end $$;
create function public.sl_audio_fail(a uuid,lid uuid,aid uuid)
returns void language plpgsql security invoker set search_path='' as $$
declare path text; size_value integer;
begin
 perform 1 from public.letters where id=lid and owner_id=a for update;
 if not found then raise exception 'NOT_FOUND'; end if;
 if exists(select 1 from public.letter_assets where id=aid and letter_id=lid and status='ready') then return; end if;
 path:=a::text||'/'||lid::text||'/'||aid::text||'.mp3';
 select byte_size into size_value from public.letter_assets where id=aid and letter_id=lid;
 insert into private.media_cleanup_jobs(bucket_id,object_path,letter_id,byte_size) values('letter-assets',path,lid,coalesce(size_value,0)) on conflict(object_path) do nothing;
 delete from public.letter_assets where id=aid and letter_id=lid and status='pending';
 if found then update public.letters set version=version+1,updated_at=now() where id=lid; end if;
end $$;
create function public.sl_audio_finalize(a uuid,lid uuid,aid uuid,reserved text)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare l public.letters; asset public.letter_assets;
begin
 select * into l from public.letters where id=lid and owner_id=a for update;
 if not found then raise exception 'NOT_FOUND'; end if;
 select * into asset from public.letter_assets where id=aid and letter_id=lid;
 if asset.status='ready' then return jsonb_build_object('conflict',true); end if;
 if asset.id is null or l.deleted_at is not null or l.status<>'draft' or l.version::text<>reserved then
   perform public.sl_audio_fail(a,lid,aid); return jsonb_build_object('conflict',true);
 end if;
 update public.letter_assets set status='ready' where id=aid;
 update public.letters set presentation_config=jsonb_build_object('schemaVersion',1,'music',jsonb_build_object('enabled',false,'assetId',aid,'defaultVolume',coalesce(l.presentation_config->'music'->'defaultVolume','0.35'::jsonb),'loop',coalesce(l.presentation_config->'music'->'loop','false'::jsonb),'startPolicy','manual')),version=version+1,updated_at=now() where id=lid;
 return jsonb_build_object('conflict',false);
end $$;
create function public.sl_music_settings(a uuid,lid uuid,expected text,music_input jsonb)
returns void language plpgsql security invoker set search_path='' as $$
declare l public.letters;
begin
 l:=private.lock_letter(a,lid,expected);
 if jsonb_typeof(music_input)<>'object' or (music_input-'enabled'-'assetId'-'defaultVolume'-'loop'-'startPolicy')<>'{}'::jsonb
   or jsonb_typeof(music_input->'enabled') is distinct from 'boolean' or jsonb_typeof(music_input->'loop') is distinct from 'boolean'
   or jsonb_typeof(music_input->'defaultVolume') is distinct from 'number' or (music_input->>'defaultVolume')::numeric not between 0 and 1
   or music_input->>'startPolicy' is distinct from 'manual'
   or not (music_input ? 'assetId') then raise exception 'INVALID_MUSIC'; end if;
 if music_input->>'assetId' is not null and not exists(select 1 from public.letter_assets where letter_id=lid and id::text=music_input->>'assetId' and status='ready' and kind='audio') then raise exception 'INVALID_MUSIC'; end if;
 if (music_input->>'enabled')::boolean and music_input->>'assetId' is null then raise exception 'INVALID_MUSIC'; end if;
 -- Attachment changes only via upload/finalize and explicit removal, never arbitrary config reset.
 if music_input->>'assetId' is distinct from l.presentation_config->'music'->>'assetId' then raise exception 'INVALID_MUSIC'; end if;
 update public.letters set presentation_config=jsonb_build_object('schemaVersion',1,'music',music_input),version=version+1,updated_at=now() where id=lid;
end $$;
create function public.sl_music_remove(a uuid,lid uuid,expected text)
returns void language plpgsql security invoker set search_path='' as $$
declare l public.letters;
begin
 l:=private.lock_letter(a,lid,expected);
 insert into private.media_cleanup_jobs(bucket_id,object_path,letter_id,byte_size) select 'letter-assets',object_path,lid,byte_size from public.letter_assets where letter_id=lid on conflict(object_path) do nothing;
 delete from public.letter_assets where letter_id=lid;
 update public.letters set presentation_config=jsonb_build_object('schemaVersion',1,'music',jsonb_build_object('enabled',false,'assetId',null,'defaultVolume',coalesce(l.presentation_config->'music'->'defaultVolume','0.35'::jsonb),'loop',coalesce(l.presentation_config->'music'->'loop','false'::jsonb),'startPolicy','manual')),version=version+1,updated_at=now() where id=lid;
end $$;
create function public.sl_owner_audio(a uuid,lid uuid,aid uuid)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare result jsonb;
begin
 select jsonb_build_object('path',p.object_path,'size',p.byte_size) into result from public.letter_assets p join public.letters l on l.id=p.letter_id where p.id=aid and p.letter_id=lid and l.owner_id=a and l.deleted_at is null and p.status='ready';
 if result is null then raise exception 'NOT_FOUND'; end if; return result;
end $$;
create function public.sl_recipient_audio(share_digest text,session_digest text,aid uuid)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare l public.letters; result jsonb;
begin
 l:=private.recipient_letter(share_digest,session_digest);
 if l.presentation_config->>'schemaVersion' is distinct from '1' or l.presentation_config->'music'->>'enabled' is distinct from 'true' or l.presentation_config->'music'->>'assetId' is distinct from aid::text then raise exception 'NOT_FOUND'; end if;
 select jsonb_build_object('path',object_path,'size',byte_size) into result from public.letter_assets where id=aid and letter_id=l.id and status='ready' and kind='audio';
 if result is null then raise exception 'NOT_FOUND'; end if; return result;
end $$;
create function public.sl_cleanup_claim_v2()
returns jsonb language plpgsql security invoker set search_path='' as $$
declare result jsonb;
begin
 with picked as(select id from private.media_cleanup_jobs where available_at<=now() and (lease_until is null or lease_until<now()) order by available_at limit 20 for update skip locked),
 claimed as(update private.media_cleanup_jobs j set lease_until=now()+interval '5 minutes',lease_token=gen_random_uuid() from picked where j.id=picked.id returning j.*)
 select coalesce(jsonb_agg(jsonb_build_object('id',id,'bucket',bucket_id,'path',object_path,'leaseToken',lease_token)),'[]'::jsonb) into result from claimed;
 return result;
end $$;
create function public.sl_cleanup_complete_v2(jid uuid,bucket_input text,path_input text,token uuid,succeeded boolean)
returns void language plpgsql security invoker set search_path='' as $$
begin
 if succeeded then delete from private.media_cleanup_jobs where id=jid and bucket_id=bucket_input and object_path=path_input and lease_token=token and lease_until>now();
 else update private.media_cleanup_jobs set attempts=attempts+1,lease_token=null,lease_until=null,last_error_code='STORAGE_DELETE_FAILED',available_at=now()+make_interval(secs=>least(86400,60*power(2,least(attempts,10))::integer)) where id=jid and bucket_id=bucket_input and object_path=path_input and lease_token=token and lease_until>now(); end if;
 delete from public.letters l where l.deleted_at is not null and l.deleted_at<now()-interval '1 hour' and not exists(select 1 from private.media_cleanup_jobs j where j.letter_id=l.id);
end $$;
create function public.sl_audio_scan_state(new_cursor jsonb default null,write_state boolean default false)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare value jsonb;
begin
 if write_state then insert into private.maintenance_state(operation,cursor,last_success_at) values('audio_scan_v1',new_cursor,case when new_cursor is null then now() else null end) on conflict(operation) do update set cursor=excluded.cursor,updated_at=now(),last_success_at=coalesce(excluded.last_success_at,private.maintenance_state.last_success_at); end if;
 select cursor into value from private.maintenance_state where operation='audio_scan_v1'; return value;
end $$;
create function public.sl_audio_orphan(path_input text)
returns void language plpgsql security invoker set search_path='' as $$
begin
 if path_input !~ '^[0-9a-f-]{36}/[0-9a-f-]{36}/[0-9a-f-]{36}\.mp3$' then return; end if;
 if not exists(select 1 from public.letter_assets where object_path=path_input) then insert into private.media_cleanup_jobs(bucket_id,object_path,letter_id) values('letter-assets',path_input,split_part(path_input,'/',2)::uuid) on conflict(object_path) do nothing; end if;
end $$;

create or replace function public.sl_delete_letter(a uuid, lid uuid, expected text)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare l public.letters;
begin
  select * into l from public.letters where id = lid and owner_id = a for update;
  if not found then raise exception 'NOT_FOUND'; end if;
  if l.deleted_at is null then
    if l.version::text <> expected then raise exception 'VERSION_CONFLICT'; end if;
    insert into private.media_cleanup_jobs(object_path,letter_id) select object_path,lid from public.letter_photos where letter_id = lid on conflict(object_path) do nothing;
    insert into private.media_cleanup_jobs(bucket_id,object_path,letter_id,byte_size) select 'letter-assets',object_path,lid,byte_size from public.letter_assets where letter_id=lid on conflict(object_path) do nothing;
    delete from public.letter_assets where letter_id=lid;
    update public.letters set presentation_config=null where id=lid;
    delete from public.letter_photos where letter_id = lid;
    delete from private.letter_gates where letter_id = lid;
    delete from private.letter_shares where letter_id = lid;
    delete from private.recipient_sessions where letter_id = lid;
    update public.letters set deleted_at = now(),title = 'Deleted letter', recipient_display_name = null, body_doc = '{"type":"doc","content":[{"type":"paragraph"}]}',status = 'draft',published_at = null,version = version+1,access_version = access_version+1,updated_at = now() where id = lid;
  end if;
  return jsonb_build_object('deleted',true,'mediaCleanup',case when exists(select 1 from private.media_cleanup_jobs where letter_id = lid) then 'pending' else 'not_required' end);
end $$;
create or replace function public.sl_publish(a uuid, lid uuid, expected text, token_input text, digest_input text)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare l public.letters; token text;
begin
  l := private.lock_letter(a,lid,expected,false);
  if l.status = 'published' then
    select share_token into token from private.letter_shares where letter_id=lid and active;
    if token is null then raise exception 'NOT_FOUND'; end if;
    return jsonb_build_object('shareToken',token);
  end if;
  if l.recipient_display_name is null or not exists(select 1 from private.letter_gates where letter_id=lid)
    or not exists(select 1 from jsonb_path_query(l.body_doc,'$.**.text') t(value) where btrim(value #>> '{}') <> '')
    then raise exception 'PUBLISH_INCOMPLETE'; end if;
  if exists(select 1 from public.letter_photos where letter_id=lid and status='pending') then raise exception 'UPLOAD_PENDING'; end if;
  if exists(select 1 from public.letter_assets where letter_id=lid and status='pending') then raise exception 'UPLOAD_PENDING'; end if;
  if l.presentation_config->'music'->>'assetId' is not null and not exists(select 1 from public.letter_assets where letter_id=lid and status='ready' and id::text=l.presentation_config->'music'->>'assetId') then raise exception 'INVALID_MUSIC'; end if;
  if token_input !~ '^[A-Za-z0-9_-]{43}$' or octet_length(decode(digest_input,'base64')) <> 32 then raise exception 'INVALID_TOKEN'; end if;
  insert into private.letter_shares(letter_id,share_token,token_digest,active)
    values(lid,token_input,decode(digest_input,'base64'),true)
    on conflict(letter_id) do update set share_token=excluded.share_token,token_digest=excluded.token_digest,active=true,created_at=now();
  update public.letters set status='published',published_at=now(),version=version+1,access_version=access_version+1,updated_at=now() where id=lid;
  return jsonb_build_object('shareToken',token_input);
end $$;
create or replace function public.sl_recipient_content(share_digest text, session_digest text)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare l public.letters; expiry timestamptz; photos jsonb;
begin
  l := private.recipient_letter(share_digest,session_digest);
  select expires_at into expiry from private.recipient_sessions where token_digest=decode(session_digest,'base64') and letter_id=l.id;
  select coalesce(jsonb_agg(jsonb_build_object('id',id,'altText',alt_text) order by created_at,id),'[]'::jsonb) into photos
    from public.letter_photos where letter_id=l.id and status='ready';
  return jsonb_build_object('letterId',l.id,'expiresAt',expiry,'recipientDisplayName',l.recipient_display_name,
    'bodyDoc',l.body_doc,'templateId',l.template_id,'photos',photos,'presentationConfig',l.presentation_config);
end $$;
create or replace function public.sl_cleanup_claim()
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare result jsonb;
begin
  with picked as (select id from private.media_cleanup_jobs where bucket_id='letter-media' and available_at <= now() and (lease_until is null or lease_until < now()) order by available_at limit 20 for update skip locked),
  claimed as (update private.media_cleanup_jobs j set lease_until = now()+interval '5 minutes',lease_token = gen_random_uuid() from picked where j.id = picked.id returning j.id,j.object_path,j.lease_token)
  select coalesce(jsonb_agg(jsonb_build_object('id',id,'path',object_path,'leaseToken',lease_token)),'[]'::jsonb) into result from claimed;
  return result;
end $$;
create or replace function public.sl_cleanup_complete(jid uuid, token uuid, succeeded boolean)
returns void language plpgsql security invoker set search_path = '' as $$
begin
  if succeeded then delete from private.media_cleanup_jobs where id = jid and lease_token = token and bucket_id='letter-media';
  else update private.media_cleanup_jobs set attempts = attempts+1,lease_token = null,lease_until = null,last_error_code = 'STORAGE_DELETE_FAILED',available_at = now()+make_interval(secs => least(86400,60*power(2,least(attempts,10))::integer)) where id = jid and lease_token = token and bucket_id='letter-media'; end if;
  delete from public.letters l where l.deleted_at is not null and l.deleted_at < now()-interval '1 hour' and not exists(select 1 from private.media_cleanup_jobs j where j.letter_id = l.id);
end $$;
create or replace function public.sl_cleanup_stale()
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
  for lid in select distinct letter_id from public.letter_assets where status='pending' and created_at<now()-interval '1 hour' limit 20 loop
    perform 1 from public.letters where id=lid for update;
    insert into private.media_cleanup_jobs(bucket_id,object_path,letter_id,byte_size) select 'letter-assets',object_path,letter_id,byte_size from public.letter_assets where letter_id=lid and status='pending' and created_at<now()-interval '1 hour' on conflict(object_path) do nothing;
    delete from public.letter_assets where letter_id=lid and status='pending' and created_at<now()-interval '1 hour';
    get diagnostics count_value=row_count;
    if count_value>0 then update public.letters set version=version+1,updated_at=now() where id=lid; end if;
    total:=total+count_value;
  end loop;
  delete from private.rate_limit_buckets where expires_at < now();
  delete from private.recipient_sessions where expires_at < now()-interval '24 hours';
  return total;
end $$;
do $$ declare f record; begin
  for f in select p.oid::regprocedure as signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname like 'sl\_%' escape '\' loop
    execute format('revoke all on function %s from public,anon,authenticated',f.signature);
    execute format('grant execute on function %s to service_role',f.signature);
  end loop;
end $$;
commit;
