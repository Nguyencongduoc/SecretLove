-- G3 forward migration. NEW Production backend only, after 001–008.
-- No remote execution, user seed, backfill, credential, or data deletion on application.
-- DELETE/UPDATE in gateway bodies run only on explicit authorized calls.
begin;
set local lock_timeout='5s';
create table private.creator_access (
 user_id uuid primary key references auth.users(id) on delete cascade,
 status text not null check(status in ('approved','suspended')),
 version bigint not null default 1 check(version>0), approved_by uuid, updated_by uuid,
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table private.operator_accounts (
 user_id uuid primary key references auth.users(id) on delete restrict,
 active boolean not null default true, created_at timestamptz not null default now()
);
create table private.abuse_reports (
 id uuid primary key default gen_random_uuid(), letter_id uuid references public.letters(id) on delete set null,
 share_digest bytea not null check(octet_length(share_digest)=32),
 reason text not null check(reason in ('unwanted_contact','harassment','privacy','other')),
 description text not null default '' check(char_length(description)<=1000 and octet_length(description)<=4000),
 status text not null default 'open' check(status in ('open','resolved')),
 resolution text check(resolution in ('dismissed','action_taken','unresolved_target')),
 version bigint not null default 1 check(version>0), created_at timestamptz not null default now(), resolved_at timestamptz,
 purge_after timestamptz not null default(now()+interval '90 days'),
 hold_until timestamptz, hold_approved_by uuid,
 check(hold_until is null or (hold_approved_by is not null and hold_until<=purge_after+interval '90 days'))
);
create index sl_reports_queue on private.abuse_reports(status,created_at,id);
create index sl_reports_purge on private.abuse_reports(purge_after);
create table private.letter_moderation (
 letter_id uuid primary key references public.letters(id) on delete cascade,
 state text not null check(state in ('clear','held')), version bigint not null default 1 check(version>0),
 reason_code text not null check(reason_code in ('abuse','privacy','review_complete','deletion_request')),
 actor_id uuid not null, updated_at timestamptz not null default now()
);
create table private.operator_audit (
 id uuid primary key default gen_random_uuid(), actor_id uuid not null, subject_id uuid,
 resource_id uuid, report_id uuid, request_id uuid not null,
 action text not null check(action in ('bootstrap','approve','suspend','hold','clear','report_read','report_resolve','letter_delete','retention_hold')),
 before_version text, after_version text, before_status text, after_status text,
 reason_code text check(reason_code in ('abuse','privacy','review_complete','deletion_request')),
 case_reference text check(case_reference ~ '^[A-Za-z0-9_-]{3,80}$'),
 created_at timestamptz not null default now(), purge_after timestamptz not null default(now()+interval '90 days'),
 hold_until timestamptz, hold_approved_by uuid,
 check(hold_until is null or (hold_approved_by is not null and hold_until<=purge_after+interval '90 days'))
);
create index sl_audit_purge on private.operator_audit(purge_after);
alter table private.creator_access enable row level security;
alter table private.operator_accounts enable row level security;
alter table private.abuse_reports enable row level security;
alter table private.letter_moderation enable row level security;
alter table private.operator_audit enable row level security;
revoke all on private.creator_access,private.operator_accounts,private.abuse_reports,private.letter_moderation,private.operator_audit from public,anon,authenticated;
grant all on private.creator_access,private.operator_accounts,private.abuse_reports,private.letter_moderation,private.operator_audit to service_role;

create function public.sl_creator_is_active() returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from private.creator_access where user_id=(select auth.uid()) and status='approved')
$$;
alter policy sl_owner_letters on public.letters using(owner_id=(select auth.uid()) and deleted_at is null and (select public.sl_creator_is_active()));
alter policy sl_owner_photos on public.letter_photos using((select public.sl_creator_is_active()) and exists(select 1 from public.letters l where l.id=letter_id and l.owner_id=(select auth.uid()) and l.deleted_at is null));
-- Asset policy name is retained from 003.
alter policy sl_owner_assets on public.letter_assets using((select public.sl_creator_is_active()) and exists(select 1 from public.letters l where l.id=letter_id and l.owner_id=(select auth.uid()) and l.deleted_at is null));

create function private.require_approved(a uuid) returns void language plpgsql security invoker set search_path='' as $$
begin
 perform 1 from private.creator_access where user_id=a and status='approved' for share;
 if not found then raise exception 'CREATOR_NOT_APPROVED'; end if;
end $$;
create function private.require_operator(a uuid) returns void language plpgsql security invoker set search_path='' as $$
begin
 perform 1 from private.operator_accounts where user_id=a and active for share;
 if not found then raise exception 'OPERATOR_REQUIRED'; end if;
end $$;
create function private.recipient_owner(share_digest text) returns void language plpgsql security invoker set search_path='' as $$
declare owner uuid;
begin
 select l.owner_id into owner from public.letters l join private.letter_shares s on s.letter_id=l.id where s.token_digest=decode(share_digest,'base64');
 perform 1 from private.creator_access where user_id=owner and status='approved' for share;
 if not found then raise exception 'NOT_FOUND'; end if;
end $$;
create function private.require_clear(lid uuid) returns void language plpgsql security invoker set search_path='' as $$
begin
 if exists(select 1 from private.letter_moderation where letter_id=lid and state='held') then raise exception 'LETTER_HELD'; end if;
end $$;
create function public.sl_creator_status(a uuid) returns jsonb language sql security invoker set search_path='' as $$
 select jsonb_build_object('status',coalesce((select status from private.creator_access where user_id=a),'not_approved'),'version',coalesce((select version::text from private.creator_access where user_id=a),'0'))
$$;
create function public.sl_operator_status(a uuid) returns boolean language sql security invoker set search_path='' as $$
 select exists(select 1 from private.operator_accounts where user_id=a and active)
$$;

-- Registry → membership → parent → dependent rows. Never resurrect old publications.
create function public.sl_creator_access_set(a uuid,target uuid,expected text,action_input text,reason_input text,request_input uuid)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare c private.creator_access; l public.letters; next_status text;
begin
 perform private.require_operator(a);
 if action_input is null or reason_input is null or action_input not in ('approve','suspend') or reason_input not in ('abuse','privacy','review_complete','deletion_request') then raise exception 'INVALID_ACTION'; end if;
 -- Serialize the absent-row approval case without locking Auth/provider tables.
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('approval:'||target::text,0));
 select * into c from private.creator_access where user_id=target for update;
 if coalesce(c.version::text,'0') is distinct from expected then raise exception 'VERSION_CONFLICT'; end if;
 next_status:=case when action_input='approve' then 'approved' else 'suspended' end;
 insert into private.creator_access(user_id,status,approved_by,updated_by) values(target,next_status,a,a)
 on conflict(user_id) do update set status=excluded.status,version=private.creator_access.version+1,updated_by=a,updated_at=now();
 if next_status='suspended' then
  for l in select * from public.letters where owner_id=target and deleted_at is null order by id for update loop
   update private.letter_shares set active=false where letter_id=l.id;
   update private.recipient_sessions set revoked_at=clock_timestamp() where letter_id=l.id and revoked_at is null;
   delete from private.audio_ingests where letter_id=l.id;
   update public.letters set status='draft',published_at=null,version=version+1,access_version=access_version+1,updated_at=now() where id=l.id;
  end loop;
 end if;
 insert into private.operator_audit(actor_id,subject_id,resource_id,request_id,action,before_version,after_version,before_status,after_status,reason_code)
 values(a,target,target,request_input,action_input,coalesce(c.version::text,'0'),coalesce(c.version,0)+1,coalesce(c.status,'not_approved'),next_status,reason_input);
 return public.sl_creator_status(target);
end $$;
create function public.sl_creator_access_list(a uuid,cursor_input uuid default null) returns jsonb language plpgsql security invoker set search_path='' as $$
declare result jsonb;
begin
 perform private.require_operator(a);
 select coalesce(jsonb_agg(to_jsonb(q)),'[]'::jsonb) into result from
 (select user_id as id,status,version::text as version from private.creator_access where cursor_input is null or user_id>cursor_input order by user_id limit 50) q;
 return result;
end $$;

create function public.sl_report_submit(digest_input text,reason_input text,description_input text) returns jsonb language plpgsql security invoker set search_path='' as $$
declare rid uuid; lid uuid;
begin
 select letter_id into lid from private.letter_shares where token_digest=decode(digest_input,'base64');
 insert into private.abuse_reports(letter_id,share_digest,reason,description) values(lid,decode(digest_input,'base64'),reason_input,description_input) returning id into rid;
 return jsonb_build_object('received',true,'reference',rid);
end $$;
create function public.sl_report_list(a uuid,cursor_input uuid default null) returns jsonb language plpgsql security invoker set search_path='' as $$
declare result jsonb;
begin
 perform private.require_operator(a);
 select coalesce(jsonb_agg(to_jsonb(q)),'[]'::jsonb) into result from
 (select id,reason,status,created_at as "createdAt",version::text as version from private.abuse_reports where cursor_input is null or id>cursor_input order by id limit 50) q;
 return result;
end $$;
create function public.sl_report_get(a uuid,rid uuid,request_input uuid) returns jsonb language plpgsql security invoker set search_path='' as $$
declare r private.abuse_reports; result jsonb;
begin
 perform private.require_operator(a);
 select * into r from private.abuse_reports where id=rid;
 if not found then raise exception 'NOT_FOUND'; end if;
 insert into private.operator_audit(actor_id,resource_id,report_id,request_id,action) values(a,rid,rid,request_input,'report_read');
 select jsonb_build_object('id',r.id,'letterId',r.letter_id,'reason',r.reason,'description',r.description,'status',r.status,'version',r.version::text,
 'moderationVersion',coalesce((select version::text from private.letter_moderation where letter_id=r.letter_id),'0'),
 'letterVersion',(select version::text from public.letters where id=r.letter_id and deleted_at is null)) into result;
 return result;
end $$;
create function public.sl_report_resolve(a uuid,rid uuid,expected text,resolution_input text,request_input uuid) returns jsonb language plpgsql security invoker set search_path='' as $$
declare r private.abuse_reports;
begin
 perform private.require_operator(a);
 if resolution_input is null or resolution_input not in ('dismissed','action_taken','unresolved_target') then raise exception 'INVALID_ACTION'; end if;
 select * into r from private.abuse_reports where id=rid for update;
 if not found then raise exception 'NOT_FOUND'; end if;
 if r.version::text is distinct from expected then raise exception 'VERSION_CONFLICT'; end if;
 update private.abuse_reports set status='resolved',resolution=resolution_input,resolved_at=now(),purge_after=now()+interval '90 days',version=version+1 where id=rid;
 update private.operator_audit set purge_after=greatest(purge_after,now()+interval '90 days') where report_id=rid;
 insert into private.operator_audit(actor_id,resource_id,report_id,request_id,action,before_version,after_version,before_status,after_status)
 values(a,rid,rid,request_input,'report_resolve',r.version::text,(r.version+1)::text,r.status,'resolved');
 return jsonb_build_object('version',(r.version+1)::text);
end $$;
create function public.sl_letter_moderate(a uuid,lid uuid,expected text,action_input text,reason_input text,rid uuid,request_input uuid) returns jsonb language plpgsql security invoker set search_path='' as $$
declare l public.letters; m private.letter_moderation; owner uuid; result_state text;
begin
 perform private.require_operator(a);
 if action_input is null or reason_input is null or action_input not in ('hold','clear') or reason_input not in ('abuse','privacy','review_complete','deletion_request') then raise exception 'INVALID_ACTION'; end if;
 select owner_id into owner from public.letters where id=lid;
 perform 1 from private.creator_access where user_id=owner for share;
 select * into l from public.letters where id=lid and deleted_at is null for update;
 if not found then raise exception 'NOT_FOUND'; end if;
 if rid is not null and not exists(select 1 from private.abuse_reports where id=rid and letter_id=lid) then raise exception 'NOT_FOUND'; end if;
 select * into m from private.letter_moderation where letter_id=lid for update;
 if coalesce(m.version::text,'0') is distinct from expected then raise exception 'VERSION_CONFLICT'; end if;
 result_state:=case when action_input='hold' then 'held' else 'clear' end;
 insert into private.letter_moderation(letter_id,state,reason_code,actor_id) values(lid,result_state,reason_input,a)
 on conflict(letter_id) do update set state=excluded.state,reason_code=excluded.reason_code,actor_id=a,version=private.letter_moderation.version+1,updated_at=now();
 update private.letter_shares set active=false where letter_id=lid;
 update private.recipient_sessions set revoked_at=clock_timestamp() where letter_id=lid and revoked_at is null;
 delete from private.audio_ingests where letter_id=lid;
 update public.letters set status='draft',published_at=null,version=version+1,access_version=access_version+1,updated_at=now() where id=lid;
 insert into private.operator_audit(actor_id,subject_id,resource_id,report_id,request_id,action,before_version,after_version,before_status,after_status,reason_code)
 values(a,owner,lid,rid,request_input,action_input,coalesce(m.version::text,'0'),(coalesce(m.version,0)+1)::text,coalesce(m.state,'clear'),result_state,reason_input);
 return jsonb_build_object('state',result_state,'version',(coalesce(m.version,0)+1)::text,'letterVersion',(l.version+1)::text);
end $$;

-- Bounded maintenance only. Holds are finite; no execution when applying migration.
create function public.sl_report_prune() returns integer language plpgsql security invoker set search_path='' as $$
declare n integer; k integer;
begin
 delete from private.operator_audit where id in(select id from private.operator_audit where purge_after<clock_timestamp() and coalesce(hold_until,purge_after)<clock_timestamp() order by purge_after limit 100 for update skip locked);
 get diagnostics n=row_count;
 delete from private.abuse_reports where id in(select id from private.abuse_reports where purge_after<clock_timestamp() and coalesce(hold_until,purge_after)<clock_timestamp() order by purge_after limit 100 for update skip locked);
 get diagnostics k=row_count;
 return n+k;
end $$;

-- Latest gateway replacements follow. Their payload/validation logic stays intact.

create or replace function private.lock_letter(a uuid, lid uuid, expected text, draft_only boolean default true)
returns public.letters language plpgsql security invoker set search_path = '' as $$
declare l public.letters;
begin
 perform private.require_approved(a);
  select * into l from public.letters where id = lid and owner_id = a and deleted_at is null for update;
  if not found then raise exception 'NOT_FOUND'; end if;
  if l.version::text is distinct from expected then raise exception 'VERSION_CONFLICT'; end if;
  if draft_only and l.status <> 'draft' then raise exception 'LETTER_PUBLISHED'; end if;
  return l;
end $$;

create or replace function private.sl_ingest_lock(a uuid,lid uuid,iid uuid)
returns private.audio_ingests language plpgsql security invoker set search_path='' as $$
declare i private.audio_ingests; l public.letters;
begin
 perform private.require_approved(a);
 select * into l from public.letters where id=lid and owner_id=a and deleted_at is null for update;
 if not found then raise exception 'NOT_FOUND'; end if;
 select * into i from private.audio_ingests where id=iid and letter_id=lid and owner_id=a for update;
 if not found then raise exception 'NOT_FOUND'; end if;
 if l.status<>'draft' then raise exception 'LETTER_PUBLISHED'; end if;
 if l.version<>i.reserved_version then raise exception 'VERSION_CONFLICT'; end if;
 if i.expires_at<=clock_timestamp() then raise exception 'UPLOAD_EXPIRED'; end if;
 return i;
end $$;

create or replace function public.sl_create_letter(a uuid, title_input text)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare lid uuid;
begin
 perform private.require_approved(a);
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(a::text, 0));
  if (select count(*) from public.letters where owner_id = a and deleted_at is null) >= 20 then raise exception 'LETTER_LIMIT'; end if;
  insert into public.letters(owner_id,title) values (a,title_input) returning id into lid;
  return jsonb_build_object('id',lid);
end $$;

create or replace function public.sl_gate_flags(a uuid, lid uuid)
returns jsonb language plpgsql security invoker set search_path = '' as $$
begin
 perform private.require_approved(a);
  if not exists (select 1 from public.letters where id = lid and owner_id = a and deleted_at is null) then raise exception 'NOT_FOUND'; end if;
  return jsonb_build_object('moderation',jsonb_build_object('state',coalesce((select state from private.letter_moderation where letter_id=lid),'clear'),'version',coalesce((select version::text from private.letter_moderation where letter_id=lid),'0')),'verificationConfigured',exists(select 1 from private.letter_gates where letter_id = lid),'passphraseRequired',exists(select 1 from private.letter_gates where letter_id = lid and passphrase_record is not null));
end $$;

create or replace function public.sl_photo_finalize(a uuid, lid uuid, pid uuid, reserved text)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare l public.letters; photo public.letter_photos; path text; v bigint;
begin
 perform private.require_approved(a);
  select * into l from public.letters where id = lid and owner_id = a for update;
  if not found then raise exception 'NOT_FOUND'; end if;
  path := a::text || '/' || lid::text || '/' || pid::text || '.webp';
  select * into photo from public.letter_photos where id = pid and letter_id = lid and object_path = path;
  -- A retry must never enqueue an already committed photo for deletion.
  if photo.status = 'ready' then return jsonb_build_object('conflict',true); end if;
  if photo.id is null or l.deleted_at is not null or l.status <> 'draft' or l.version::text is distinct from reserved then
    insert into private.media_cleanup_jobs(object_path,letter_id) values(path,lid) on conflict(object_path) do nothing;
    delete from public.letter_photos where id = pid and letter_id = lid and status = 'pending';
    if found then update public.letters set version = version+1,updated_at = now() where id = lid; end if;
    return jsonb_build_object('conflict',true);
  end if;
  update public.letter_photos set status = 'ready' where id = pid;
  update public.letters set version = version+1,updated_at = now() where id = lid returning version into v;
  return jsonb_build_object('conflict',false,'version',v::text);
end $$;

create or replace function public.sl_photo_path(a uuid, lid uuid, pid uuid)
returns text language plpgsql security invoker set search_path = '' as $$
declare path text;
begin
 perform private.require_approved(a);
  select p.object_path into path from public.letter_photos p join public.letters l on l.id = p.letter_id where p.id = pid and l.id = lid and l.owner_id = a and l.deleted_at is null and p.status = 'ready';
  if not found then raise exception 'NOT_FOUND'; end if;
  return path;
end $$;

create or replace function public.sl_owner_audio(a uuid,lid uuid,aid uuid)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare result jsonb;
begin
 perform private.require_approved(a);
 select jsonb_build_object('path',p.object_path,'size',p.byte_size) into result from public.letter_assets p join public.letters l on l.id=p.letter_id where p.id=aid and p.letter_id=lid and l.owner_id=a and l.deleted_at is null and p.status='ready';
 if result is null then raise exception 'NOT_FOUND'; end if; return result;
end $$;

create or replace function public.sl_share(a uuid, lid uuid)
returns text language plpgsql security invoker set search_path = '' as $$
declare token text;
begin
 perform private.require_approved(a);
  if not exists(select 1 from public.letters where id=lid and owner_id=a and deleted_at is null) then raise exception 'NOT_FOUND'; end if;
 perform private.require_clear(lid);
  select s.share_token into token from private.letter_shares s join public.letters l on l.id=s.letter_id
    where l.id=lid and l.owner_id=a and l.status='published' and l.deleted_at is null and s.active;
  if token is null then raise exception 'NOT_PUBLISHED'; end if;
  return token;
end $$;

create or replace function public.sl_ingest_flags(a uuid,lid uuid)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare result jsonb;
begin
 perform private.require_approved(a);
 if not exists(select 1 from public.letters where id=lid and owner_id=a and deleted_at is null) then raise exception 'NOT_FOUND'; end if;
 select jsonb_build_object('id',id,'status',status,'expiresAt',expires_at) into result from private.audio_ingests where letter_id=lid and owner_id=a;
 return result;
end $$;

create or replace function public.sl_audio_reserve(a uuid,lid uuid,expected text,aid uuid,size_input integer,duration_input double precision)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare l public.letters; path text; v bigint;
begin
 perform private.require_approved(a);
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

create or replace function public.sl_ingest_begin(a uuid,lid uuid,expected text,size_input integer,digest_input text)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare l public.letters; i private.audio_ingests; total bigint; jobs bigint; parts integer;
begin
 perform private.require_approved(a);
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

create or replace function public.sl_publish(a uuid, lid uuid, expected text, token_input text, digest_input text)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare l public.letters; token text;
begin
  l := private.lock_letter(a,lid,expected,false);
 perform private.require_clear(lid);
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

create or replace function public.sl_bootstrap(share_digest text)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare needed boolean;
begin
 perform private.recipient_owner(share_digest);
  select g.passphrase_record is not null into needed from private.letter_shares s
    join public.letters l on l.id=s.letter_id join private.letter_gates g on g.letter_id=l.id
    where s.token_digest=decode(share_digest,'base64') and s.active and l.status='published' and l.deleted_at is null and not exists(select 1 from private.letter_moderation m where m.letter_id=l.id and m.state='held');
  if not found then raise exception 'NOT_FOUND'; end if;
  return jsonb_build_object('available',true,'passphraseRequired',needed);
end $$;

create or replace function public.sl_verification_gate(share_digest text)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare result jsonb;
begin
 perform private.recipient_owner(share_digest);
  select jsonb_build_object('letterId',l.id,'accessVersion',l.access_version::text,
    'nonce',encode(g.identity_nonce,'base64'),'digest',encode(g.identity_digest,'base64'),
    'keyVersion',g.hmac_key_version,'passphrase',g.passphrase_record) into result
    from private.letter_shares s join public.letters l on l.id=s.letter_id join private.letter_gates g on g.letter_id=l.id
    where s.token_digest=decode(share_digest,'base64') and s.active and l.status='published' and l.deleted_at is null and not exists(select 1 from private.letter_moderation m where m.letter_id=l.id and m.state='held');
  if result is null then raise exception 'NOT_FOUND'; end if;
  return result;
end $$;

create or replace function public.sl_session_issue(share_digest text, expected_access text, nonce_input text, session_digest text, previous_digest text)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare l public.letters; sid uuid; expiry timestamptz := clock_timestamp()+interval '30 minutes';
begin
 perform private.recipient_owner(share_digest);
  select p.* into l from public.letters p join private.letter_shares s on s.letter_id=p.id
    where s.token_digest=decode(share_digest,'base64') for update of p;
  if not found then raise exception 'NOT_FOUND'; end if;
 if exists(select 1 from private.letter_moderation m where m.letter_id=l.id and m.state='held') then raise exception 'NOT_FOUND'; end if;
  if l.deleted_at is not null or l.status<>'published' or not exists(select 1 from private.letter_shares where letter_id=l.id and active and token_digest=decode(share_digest,'base64')) then raise exception 'NOT_FOUND'; end if;
  if l.access_version::text is distinct from expected_access or not exists(select 1 from private.letter_gates where letter_id=l.id and identity_nonce=decode(nonce_input,'base64')) then raise exception 'ACCESS_REQUIRED'; end if;
  if previous_digest is not null then update private.recipient_sessions set revoked_at=clock_timestamp() where letter_id=l.id and token_digest=decode(previous_digest,'base64') and revoked_at is null; end if;
  insert into private.recipient_sessions(letter_id,token_digest,access_version,expires_at)
    values(l.id,decode(session_digest,'base64'),l.access_version,expiry) returning id into sid;
  return jsonb_build_object('expiresAt',expiry);
end $$;

create or replace function private.recipient_letter(share_digest text, session_digest text)
returns public.letters language plpgsql security invoker set search_path = '' as $$
declare l public.letters;
begin
 perform private.recipient_owner(share_digest);
  select p.* into l from public.letters p join private.letter_shares s on s.letter_id=p.id
    where s.token_digest=decode(share_digest,'base64') and s.active and p.status='published' and p.deleted_at is null for share of p;
  if not found then raise exception 'NOT_FOUND'; end if;
 if exists(select 1 from private.letter_moderation m where m.letter_id=l.id and m.state='held') then raise exception 'NOT_FOUND'; end if;
  if session_digest is null or not exists(select 1 from private.recipient_sessions r where r.letter_id=l.id
    and r.token_digest=decode(session_digest,'base64') and r.access_version=l.access_version and r.revoked_at is null and r.expires_at>clock_timestamp()) then raise exception 'ACCESS_REQUIRED'; end if;
  return l;
end $$;

create function private.tombstone_letter(a uuid, lid uuid, expected text)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare l public.letters;
begin
  select * into l from public.letters where id = lid and owner_id = a for update;
  if not found then raise exception 'NOT_FOUND'; end if;
  if l.deleted_at is null then
    if l.version::text is distinct from expected then raise exception 'VERSION_CONFLICT'; end if;
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

create or replace function public.sl_delete_letter(a uuid,lid uuid,expected text) returns jsonb language plpgsql security invoker set search_path='' as $$
begin perform private.require_approved(a); return private.tombstone_letter(a,lid,expected); end $$;
create function public.sl_operator_letter_delete(a uuid,lid uuid,expected text,reference_input text,reason_input text,request_input uuid)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare owner uuid; result jsonb; l public.letters;
begin
 perform private.require_operator(a);
 if reference_input is null or reference_input !~ '^[A-Za-z0-9_-]{3,80}$' or reason_input not in ('abuse','privacy','deletion_request') then raise exception 'INVALID_ACTION'; end if;
 select owner_id into owner from public.letters where id=lid;
 if owner is null then raise exception 'NOT_FOUND'; end if;
 perform 1 from private.creator_access where user_id=owner for share;
 select * into l from public.letters where id=lid and deleted_at is null for update;
 if not found then raise exception 'NOT_FOUND'; end if;
 if expected is null or l.version::text<>expected then raise exception 'VERSION_CONFLICT'; end if;
 -- Internal tombstone is shared only after explicit operator/owner authorization, never an owner RPC impersonation.
 result:=private.tombstone_letter(owner,lid,expected);
 insert into private.operator_audit(actor_id,subject_id,resource_id,request_id,action,before_version,after_status,case_reference,reason_code) values(a,owner,lid,request_input,'letter_delete',expected,'deleted',reference_input,reason_input);
 return result;
end $$;
create or replace function public.sl_audio_finalize(a uuid,lid uuid,aid uuid,reserved text)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare l public.letters; asset public.letter_assets;
begin
 perform private.require_approved(a);
 select * into l from public.letters where id=lid and owner_id=a for update;
 if not found then raise exception 'NOT_FOUND'; end if;
 select * into asset from public.letter_assets where id=aid and letter_id=lid;
 if asset.status='ready' then return jsonb_build_object('conflict',true); end if;
 if asset.id is null or l.deleted_at is not null or l.status<>'draft' or l.version::text is distinct from reserved then
   perform public.sl_audio_fail(a,lid,aid); return jsonb_build_object('conflict',true);
 end if;
 update public.letter_assets set status='ready' where id=aid;
 update public.letters set presentation_config=coalesce(l.presentation_config,'{"schemaVersion":1}'::jsonb)||jsonb_build_object('schemaVersion',1,'music',jsonb_build_object('enabled',false,'assetId',aid,'defaultVolume',coalesce(l.presentation_config->'music'->'defaultVolume','0.35'::jsonb),'loop',coalesce(l.presentation_config->'music'->'loop','false'::jsonb),'startPolicy','manual')),version=version+1,updated_at=now() where id=lid;
 return jsonb_build_object('conflict',false);
end $$;
-- Exact function privileges, including new helpers. The only browser exception is the no-argument RLS predicate.
do $$ declare f record; begin
 for f in select p.oid::regprocedure as signature from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid=p.pronamespace where n.nspname='private' or (n.nspname='public' and p.proname like 'sl\_%' escape '\') loop
 execute format('revoke all on function %s from public,anon,authenticated',f.signature);
 execute format('grant execute on function %s to service_role',f.signature);
 end loop;
end $$;
grant execute on function public.sl_creator_is_active() to authenticated;
commit;
