-- Approved same-origin chunk transport. Forward-only; no existing-data deletion/backfill.
-- Runtime DELETE bodies perform authorized cancellation/expiry/attachment cleanup only.
begin;
set local lock_timeout='5s';
alter table private.media_cleanup_jobs add constraint sl_cleanup_buckets_v3
  check(bucket_id in ('letter-media','letter-assets','letter-audio-staging')) not valid;
alter table private.media_cleanup_jobs validate constraint sl_cleanup_buckets_v3;
alter table private.media_cleanup_jobs drop constraint media_cleanup_jobs_bucket_id_check;
create table private.audio_ingests (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete restrict,
  letter_id uuid not null unique references public.letters(id) on delete cascade,
  asset_id uuid not null unique default gen_random_uuid(),
  byte_size integer not null check(byte_size between 1 and 16777216),
  file_digest bytea not null check(octet_length(file_digest)=32),
  reserved_version bigint not null check(reserved_version>0),
  status text not null default 'collecting' check(status in ('collecting','finalizing')),
  lease_token uuid, lease_until timestamptz,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now()+interval '15 minutes')
);
create table private.audio_ingest_parts (
  ingest_id uuid not null references private.audio_ingests(id) on delete cascade,
  part_index integer not null check(part_index between 0 and 15),
  object_path text not null unique,
  byte_size integer not null check(byte_size between 1 and 1048576),
  digest bytea check(digest is null or octet_length(digest)=32),
  ready boolean not null default false,
  primary key(ingest_id,part_index), check(not ready or digest is not null)
);
alter table private.audio_ingests enable row level security;
alter table private.audio_ingest_parts enable row level security;
revoke all on private.audio_ingests,private.audio_ingest_parts from public,anon,authenticated;
grant all on private.audio_ingests,private.audio_ingest_parts to service_role;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
 values('letter-audio-staging','letter-audio-staging',false,1048576,array['application/octet-stream']) on conflict(id) do nothing;
do $$ begin
 if not exists(select 1 from storage.buckets where id='letter-audio-staging' and public=false
  and file_size_limit=1048576 and allowed_mime_types=array['application/octet-stream']) then raise exception 'Incompatible staging bucket'; end if;
end $$;
create policy sl_block_browser_audio_staging on storage.objects as restrictive for all to anon,authenticated
 using(bucket_id<>'letter-audio-staging') with check(bucket_id<>'letter-audio-staging');

create function private.sl_ingest_lock(a uuid,lid uuid,iid uuid)
returns private.audio_ingests language plpgsql security invoker set search_path='' as $$
declare i private.audio_ingests; l public.letters;
begin
 select * into l from public.letters where id=lid and owner_id=a and deleted_at is null for update;
 if not found then raise exception 'NOT_FOUND'; end if;
 select * into i from private.audio_ingests where id=iid and letter_id=lid and owner_id=a for update;
 if not found then raise exception 'NOT_FOUND'; end if;
 if l.status<>'draft' then raise exception 'LETTER_PUBLISHED'; end if;
 if l.version<>i.reserved_version then raise exception 'VERSION_CONFLICT'; end if;
 if i.expires_at<=clock_timestamp() then raise exception 'UPLOAD_EXPIRED'; end if;
 return i;
end $$;

create function private.sl_ingest_deleted()
returns trigger language plpgsql security invoker set search_path='' as $$
begin
 insert into private.media_cleanup_jobs(bucket_id,object_path,letter_id,byte_size)
 select 'letter-audio-staging',object_path,old.letter_id,byte_size from private.audio_ingest_parts where ingest_id=old.id
 on conflict(object_path) do nothing;
 if not exists(select 1 from public.letter_assets where id=old.asset_id and letter_id=old.letter_id and status='ready') then
  insert into private.media_cleanup_jobs(bucket_id,object_path,letter_id,byte_size)
   values('letter-assets',old.owner_id::text||'/'||old.letter_id::text||'/'||old.asset_id::text||'.mp3',old.letter_id,old.byte_size)
   on conflict(object_path) do nothing;
 end if;
 return old;
end $$;
create trigger sl_ingest_deleted before delete on private.audio_ingests for each row execute function private.sl_ingest_deleted();
create function private.sl_ingest_letter_lifecycle()
returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if new.deleted_at is not null then delete from private.audio_ingests where letter_id=new.id;
 elsif new.status='published' and exists(select 1 from private.audio_ingests where letter_id=new.id) then raise exception 'UPLOAD_PENDING'; end if;
 return new;
end $$;
create trigger sl_ingest_letter_lifecycle before update of status,deleted_at on public.letters
 for each row execute function private.sl_ingest_letter_lifecycle();

create function public.sl_ingest_begin(a uuid,lid uuid,expected text,size_input integer,digest_input text)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare l public.letters; i private.audio_ingests; total bigint; jobs bigint; parts integer;
begin
 if size_input is null or size_input not between 1 and 16777216 or digest_input is null or digest_input!~'^[0-9a-f]{64}$' then raise exception 'INVALID_AUDIO'; end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(a::text,0));
 l:=private.lock_letter(a,lid,expected);
 if exists(select 1 from public.letter_assets where letter_id=lid) then raise exception 'AUDIO_LIMIT'; end if;
 if exists(select 1 from private.audio_ingests where letter_id=lid) then raise exception 'UPLOAD_PENDING'; end if;
 parts:=(size_input+1048575)/1048576;
 select (select coalesce(sum(p.byte_size),0) from public.letter_assets p join public.letters x on x.id=p.letter_id where x.owner_id=a)
  +(select coalesce(sum(byte_size),0) from private.media_cleanup_jobs where bucket_id in ('letter-assets','letter-audio-staging') and split_part(object_path,'/',1)=a::text)
  +(select coalesce(sum(byte_size::bigint*2),0) from private.audio_ingests where owner_id=a) into total;
 select count(*) into jobs from private.media_cleanup_jobs where bucket_id in ('letter-assets','letter-audio-staging') and split_part(object_path,'/',1)=a::text;
 jobs:=jobs+(select coalesce(sum((byte_size+1048575)/1048576+1),0) from private.audio_ingests where owner_id=a);
 if total+size_input::bigint*2>62914560 or jobs+parts+1>100 then raise exception 'ASSET_QUOTA'; end if;
 update public.letters set version=version+1,updated_at=now() where id=lid returning * into l;
 insert into private.audio_ingests(owner_id,letter_id,byte_size,file_digest,reserved_version)
 values(a,lid,size_input,decode(digest_input,'hex'),l.version) returning * into i;
 insert into private.audio_ingest_parts(ingest_id,part_index,object_path,byte_size)
 select i.id,n,a::text||'/'||lid::text||'/'||gen_random_uuid()::text||'.part',least(1048576,size_input-n*1048576)
 from generate_series(0,parts-1) n;
 return jsonb_build_object('id',i.id,'assetId',i.asset_id,'partCount',parts,'expiresAt',i.expires_at);
end $$;

create function public.sl_ingest_part(a uuid,lid uuid,iid uuid,index_input integer,size_input integer,digest_input text,mark_ready boolean default false)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare i private.audio_ingests; p private.audio_ingest_parts;
begin
 i:=private.sl_ingest_lock(a,lid,iid);
 if i.status<>'collecting' then raise exception 'UPLOAD_PENDING'; end if;
 if digest_input is null or digest_input!~'^[0-9a-f]{64}$' then raise exception 'INVALID_AUDIO'; end if;
 select * into p from private.audio_ingest_parts where ingest_id=iid and part_index=index_input for update;
 if not found then raise exception 'NOT_FOUND'; end if;
 if size_input is distinct from p.byte_size or (p.digest is not null and p.digest<>decode(digest_input,'hex')) then raise exception 'INVALID_AUDIO'; end if;
 if mark_ready and p.digest is null then raise exception 'INVALID_AUDIO'; end if;
 update private.audio_ingest_parts set digest=decode(digest_input,'hex'),ready=ready or mark_ready where ingest_id=iid and part_index=index_input;
 return jsonb_build_object('path',p.object_path,'ready',p.ready);
end $$;

create function public.sl_ingest_commit_begin(a uuid,lid uuid,iid uuid)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare i private.audio_ingests; lease uuid:=gen_random_uuid(); parts jsonb;
begin
 i:=private.sl_ingest_lock(a,lid,iid);
 if i.status='finalizing' and i.lease_until>clock_timestamp() then raise exception 'UPLOAD_PENDING'; end if;
 if exists(select 1 from private.audio_ingest_parts where ingest_id=iid and not ready) then raise exception 'UPLOAD_PENDING'; end if;
 update private.audio_ingests set status='finalizing',lease_token=lease,lease_until=clock_timestamp()+interval '90 seconds' where id=iid;
 select jsonb_agg(jsonb_build_object('path',object_path,'size',byte_size,'digest',encode(digest,'hex')) order by part_index)
 into parts from private.audio_ingest_parts where ingest_id=iid;
 return jsonb_build_object('lease',lease,'assetId',i.asset_id,'size',i.byte_size,'digest',encode(i.file_digest,'hex'),'parts',parts);
end $$;
create function public.sl_ingest_commit_finish(a uuid,lid uuid,iid uuid,lease_input uuid,size_input integer,duration_input double precision)
returns void language plpgsql security invoker set search_path='' as $$
declare i private.audio_ingests;
begin
 i:=private.sl_ingest_lock(a,lid,iid);
 if i.status<>'finalizing' or i.lease_token is distinct from lease_input or i.lease_until<=clock_timestamp() then raise exception 'UPLOAD_PENDING'; end if;
 if size_input is null or size_input not between 1 and i.byte_size then raise exception 'INVALID_AUDIO'; end if;
 insert into public.letter_assets(id,letter_id,object_path,byte_size,duration_seconds,status)
 values(i.asset_id,lid,a::text||'/'||lid::text||'/'||i.asset_id::text||'.mp3',size_input,duration_input,'ready');
 update public.letters set presentation_config=coalesce(presentation_config,'{"schemaVersion":1}'::jsonb)||
  jsonb_build_object('schemaVersion',1,'music',jsonb_build_object('enabled',false,'assetId',i.asset_id,'defaultVolume',coalesce(presentation_config->'music'->'defaultVolume','0.35'::jsonb),'loop',coalesce(presentation_config->'music'->'loop','false'::jsonb),'startPolicy','manual')),
  version=version+1,updated_at=now() where id=lid;
 delete from private.audio_ingests where id=iid;
end $$;
create function public.sl_ingest_release(a uuid,lid uuid,iid uuid,lease_input uuid)
returns void language plpgsql security invoker set search_path='' as $$
begin
 perform 1 from public.letters where id=lid and owner_id=a for update;
 if not found then raise exception 'NOT_FOUND'; end if;
 update private.audio_ingests set status='collecting',lease_token=null,lease_until=null
 where id=iid and letter_id=lid and owner_id=a and lease_token=lease_input;
end $$;
create function public.sl_ingest_cancel(a uuid,lid uuid,iid uuid)
returns void language plpgsql security invoker set search_path='' as $$
begin
 perform 1 from public.letters where id=lid and owner_id=a and deleted_at is null for update;
 if not found then raise exception 'NOT_FOUND'; end if;
 delete from private.audio_ingests where id=iid and owner_id=a and letter_id=lid;
 if found then update public.letters set version=version+1,updated_at=now() where id=lid; end if;
end $$;
create function public.sl_ingest_flags(a uuid,lid uuid)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare result jsonb;
begin
 if not exists(select 1 from public.letters where id=lid and owner_id=a and deleted_at is null) then raise exception 'NOT_FOUND'; end if;
 select jsonb_build_object('id',id,'status',status,'expiresAt',expires_at) into result from private.audio_ingests where letter_id=lid and owner_id=a;
 return result;
end $$;
create function public.sl_ingest_stale()
returns integer language plpgsql security invoker set search_path='' as $$
declare lid uuid; total integer:=0;
begin
 for lid in select letter_id from private.audio_ingests where expires_at<clock_timestamp() and (lease_until is null or lease_until<clock_timestamp()) limit 20 loop
  perform 1 from public.letters where id=lid for update;
  delete from private.audio_ingests where letter_id=lid and expires_at<clock_timestamp() and (lease_until is null or lease_until<clock_timestamp());
  if found then update public.letters set version=version+1,updated_at=now() where id=lid; total:=total+1; end if;
 end loop;
 return total;
end $$;

-- Legacy buffered uploads may not compete for a staged letter or bypass staged-byte budgets.
create or replace function public.sl_audio_reserve(a uuid,lid uuid,expected text,aid uuid,size_input integer,duration_input double precision)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare l public.letters; path text; v bigint;
begin
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(a::text,0));
 l:=private.lock_letter(a,lid,expected);
 if exists(select 1 from public.letter_assets where letter_id=lid) then raise exception 'AUDIO_LIMIT'; end if;
 if exists(select 1 from private.audio_ingests where letter_id=lid) then raise exception 'UPLOAD_PENDING'; end if;
 if (select coalesce(sum(p.byte_size),0) from public.letter_assets p join public.letters x on x.id=p.letter_id where x.owner_id=a)
  +(select coalesce(sum(byte_size),0) from private.media_cleanup_jobs where bucket_id in ('letter-assets','letter-audio-staging') and split_part(object_path,'/',1)=a::text)
  +(select coalesce(sum(byte_size::bigint*2),0) from private.audio_ingests where owner_id=a)+size_input>62914560
  or (select count(*) from private.media_cleanup_jobs where bucket_id in ('letter-assets','letter-audio-staging') and split_part(object_path,'/',1)=a::text)
  +(select coalesce(sum((byte_size+1048575)/1048576+1),0) from private.audio_ingests where owner_id=a)>=100 then raise exception 'ASSET_QUOTA'; end if;
 path:=a::text||'/'||lid::text||'/'||aid::text||'.mp3';
 insert into public.letter_assets(id,letter_id,object_path,byte_size,duration_seconds) values(aid,lid,path,size_input,duration_input);
 update public.letters set version=version+1,updated_at=now() where id=lid returning version into v;
 return jsonb_build_object('path',path,'reservedVersion',v::text);
end $$;

-- Old v2 workers must never claim staging jobs. New v3 claims/acks bind bucket/path/lease.
create or replace function public.sl_cleanup_claim_v2()
returns jsonb language plpgsql security invoker set search_path='' as $$
declare result jsonb;
begin
 with picked as(select id from private.media_cleanup_jobs where bucket_id in ('letter-media','letter-assets') and available_at<=now() and (lease_until is null or lease_until<now()) order by available_at limit 20 for update skip locked),
 claimed as(update private.media_cleanup_jobs j set lease_until=now()+interval '5 minutes',lease_token=gen_random_uuid() from picked where j.id=picked.id returning j.*)
 select coalesce(jsonb_agg(jsonb_build_object('id',id,'bucket',bucket_id,'path',object_path,'leaseToken',lease_token)),'[]'::jsonb) into result from claimed; return result;
end $$;
create function public.sl_cleanup_claim_v3()
returns jsonb language plpgsql security invoker set search_path='' as $$
declare result jsonb;
begin
 with picked as(select id from private.media_cleanup_jobs where available_at<=now() and (lease_until is null or lease_until<now()) order by available_at limit 20 for update skip locked),
 claimed as(update private.media_cleanup_jobs j set lease_until=now()+interval '5 minutes',lease_token=gen_random_uuid() from picked where j.id=picked.id returning j.*)
 select coalesce(jsonb_agg(jsonb_build_object('id',id,'bucket',bucket_id,'path',object_path,'leaseToken',lease_token)),'[]'::jsonb) into result from claimed; return result;
end $$;
create function public.sl_cleanup_complete_v3(jid uuid,bucket_input text,path_input text,token uuid,succeeded boolean)
returns void language plpgsql security invoker set search_path='' as $$
begin
 if succeeded then delete from private.media_cleanup_jobs where id=jid and bucket_id=bucket_input and object_path=path_input and lease_token=token and lease_until>now();
 else update private.media_cleanup_jobs set attempts=attempts+1,lease_token=null,lease_until=null,last_error_code='STORAGE_DELETE_FAILED',available_at=now()+make_interval(secs=>least(86400,60*power(2,least(attempts,10))::integer)) where id=jid and bucket_id=bucket_input and object_path=path_input and lease_token=token and lease_until>now(); end if;
 delete from public.letters l where l.deleted_at is not null and l.deleted_at<now()-interval '1 hour' and not exists(select 1 from private.media_cleanup_jobs j where j.letter_id=l.id);
end $$;
-- Guard old acknowledgements even if a caller presents a v3 staging lease.
create or replace function public.sl_cleanup_complete_v2(jid uuid,bucket_input text,path_input text,token uuid,succeeded boolean)
returns void language plpgsql security invoker set search_path='' as $$
begin
 if bucket_input not in ('letter-media','letter-assets') then return; end if;
 perform public.sl_cleanup_complete_v3(jid,bucket_input,path_input,token,succeeded);
end $$;
create function public.sl_staging_scan_state(new_cursor jsonb default null,write_state boolean default false)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare value jsonb;
begin
 if write_state then insert into private.maintenance_state(operation,cursor,last_success_at) values('staging_scan_v1',new_cursor,case when new_cursor is null then now() else null end)
 on conflict(operation) do update set cursor=excluded.cursor,updated_at=now(),last_success_at=coalesce(excluded.last_success_at,private.maintenance_state.last_success_at); end if;
 select cursor into value from private.maintenance_state where operation='staging_scan_v1'; return value;
end $$;
create function public.sl_staging_orphan(path_input text)
returns void language plpgsql security invoker set search_path='' as $$
begin
 if path_input !~ '^[0-9a-f-]{36}/[0-9a-f-]{36}/[0-9a-f-]{36}\.part$' then return; end if;
 if not exists(select 1 from private.audio_ingest_parts where object_path=path_input) then
 insert into private.media_cleanup_jobs(bucket_id,object_path,letter_id,byte_size) values('letter-audio-staging',path_input,split_part(path_input,'/',2)::uuid,1048576) on conflict(object_path) do nothing; end if;
end $$;
do $$ declare f record; begin
 for f in select p.oid::regprocedure as signature from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid=p.pronamespace
 where n.nspname in ('private','public') and p.proname like 'sl\_%' escape '\' loop
 execute format('revoke all on function %s from public,anon,authenticated',f.signature);
 execute format('grant execute on function %s to service_role',f.signature);
 end loop;
end $$;
commit;
