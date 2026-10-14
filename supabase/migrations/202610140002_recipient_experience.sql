-- Additive Day 2 gateways over the existing Day 1 tables.
-- No DROP, TRUNCATE, reset, seed, or data deletion. Apply once after 001.
begin;

create function public.sl_publish(a uuid, lid uuid, expected text, token_input text, digest_input text)
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
  if token_input !~ '^[A-Za-z0-9_-]{43}$' or octet_length(decode(digest_input,'base64')) <> 32 then raise exception 'INVALID_TOKEN'; end if;
  insert into private.letter_shares(letter_id,share_token,token_digest,active)
    values(lid,token_input,decode(digest_input,'base64'),true)
    on conflict(letter_id) do update set share_token=excluded.share_token,token_digest=excluded.token_digest,active=true,created_at=now();
  update public.letters set status='published',published_at=now(),version=version+1,access_version=access_version+1,updated_at=now() where id=lid;
  return jsonb_build_object('shareToken',token_input);
end $$;

create function public.sl_unpublish(a uuid, lid uuid, expected text)
returns void language plpgsql security invoker set search_path = '' as $$
declare l public.letters;
begin
  l := private.lock_letter(a,lid,expected,false);
  if l.status='draft' then return; end if;
  update private.letter_shares set active=false where letter_id=lid;
  update public.letters set status='draft',published_at=null,version=version+1,access_version=access_version+1,updated_at=now() where id=lid;
end $$;

create function public.sl_share(a uuid, lid uuid)
returns text language plpgsql security invoker set search_path = '' as $$
declare token text;
begin
  if not exists(select 1 from public.letters where id=lid and owner_id=a and deleted_at is null) then raise exception 'NOT_FOUND'; end if;
  select s.share_token into token from private.letter_shares s join public.letters l on l.id=s.letter_id
    where l.id=lid and l.owner_id=a and l.status='published' and l.deleted_at is null and s.active;
  if token is null then raise exception 'NOT_PUBLISHED'; end if;
  return token;
end $$;

create function public.sl_bootstrap(share_digest text)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare needed boolean;
begin
  select g.passphrase_record is not null into needed from private.letter_shares s
    join public.letters l on l.id=s.letter_id join private.letter_gates g on g.letter_id=l.id
    where s.token_digest=decode(share_digest,'base64') and s.active and l.status='published' and l.deleted_at is null;
  if not found then raise exception 'NOT_FOUND'; end if;
  return jsonb_build_object('available',true,'passphraseRequired',needed);
end $$;

create function public.sl_verification_gate(share_digest text)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare result jsonb;
begin
  select jsonb_build_object('letterId',l.id,'accessVersion',l.access_version::text,
    'nonce',encode(g.identity_nonce,'base64'),'digest',encode(g.identity_digest,'base64'),
    'keyVersion',g.hmac_key_version,'passphrase',g.passphrase_record) into result
    from private.letter_shares s join public.letters l on l.id=s.letter_id join private.letter_gates g on g.letter_id=l.id
    where s.token_digest=decode(share_digest,'base64') and s.active and l.status='published' and l.deleted_at is null;
  if result is null then raise exception 'NOT_FOUND'; end if;
  return result;
end $$;

create function public.sl_verification_limits(ip_letter_digest text, letter_digest text)
returns boolean language plpgsql security invoker set search_path = '' as $$
declare first_allowed boolean; second_allowed boolean;
begin
  first_allowed := public.sl_rate_limit('verify_letter_ip',ip_letter_digest,5,900);
  second_allowed := public.sl_rate_limit('verify_letter',letter_digest,100,86400);
  return first_allowed and second_allowed;
end $$;

create function public.sl_session_issue(share_digest text, expected_access text, nonce_input text, session_digest text, previous_digest text)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare l public.letters; sid uuid; expiry timestamptz := clock_timestamp()+interval '30 minutes';
begin
  select p.* into l from public.letters p join private.letter_shares s on s.letter_id=p.id
    where s.token_digest=decode(share_digest,'base64') for update of p;
  if not found then raise exception 'NOT_FOUND'; end if;
  if l.deleted_at is not null or l.status<>'published' or not exists(select 1 from private.letter_shares where letter_id=l.id and active and token_digest=decode(share_digest,'base64')) then raise exception 'NOT_FOUND'; end if;
  if l.access_version::text<>expected_access or not exists(select 1 from private.letter_gates where letter_id=l.id and identity_nonce=decode(nonce_input,'base64')) then raise exception 'ACCESS_REQUIRED'; end if;
  if previous_digest is not null then update private.recipient_sessions set revoked_at=clock_timestamp() where letter_id=l.id and token_digest=decode(previous_digest,'base64') and revoked_at is null; end if;
  insert into private.recipient_sessions(letter_id,token_digest,access_version,expires_at)
    values(l.id,decode(session_digest,'base64'),l.access_version,expiry) returning id into sid;
  return jsonb_build_object('expiresAt',expiry);
end $$;

create function private.recipient_letter(share_digest text, session_digest text)
returns public.letters language plpgsql security invoker set search_path = '' as $$
declare l public.letters;
begin
  select p.* into l from public.letters p join private.letter_shares s on s.letter_id=p.id
    where s.token_digest=decode(share_digest,'base64') and s.active and p.status='published' and p.deleted_at is null for share of p;
  if not found then raise exception 'NOT_FOUND'; end if;
  if session_digest is null or not exists(select 1 from private.recipient_sessions r where r.letter_id=l.id
    and r.token_digest=decode(session_digest,'base64') and r.access_version=l.access_version and r.revoked_at is null and r.expires_at>clock_timestamp()) then raise exception 'ACCESS_REQUIRED'; end if;
  return l;
end $$;

create function public.sl_recipient_content(share_digest text, session_digest text)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare l public.letters; expiry timestamptz; photos jsonb;
begin
  l := private.recipient_letter(share_digest,session_digest);
  select expires_at into expiry from private.recipient_sessions where token_digest=decode(session_digest,'base64') and letter_id=l.id;
  select coalesce(jsonb_agg(jsonb_build_object('id',id,'altText',alt_text) order by created_at,id),'[]'::jsonb) into photos
    from public.letter_photos where letter_id=l.id and status='ready';
  return jsonb_build_object('letterId',l.id,'expiresAt',expiry,'recipientDisplayName',l.recipient_display_name,
    'bodyDoc',l.body_doc,'templateId',l.template_id,'photos',photos);
end $$;

create function public.sl_recipient_photo(share_digest text, session_digest text, pid uuid)
returns text language plpgsql security invoker set search_path = '' as $$
declare l public.letters; path text;
begin
  l := private.recipient_letter(share_digest,session_digest);
  select object_path into path from public.letter_photos where id=pid and letter_id=l.id and status='ready';
  if path is null then raise exception 'NOT_FOUND'; end if;
  return path;
end $$;

create function public.sl_session_close(share_digest text, session_digest text)
returns void language plpgsql security invoker set search_path = '' as $$
declare lid uuid;
begin
  select letter_id into lid from private.letter_shares where token_digest=decode(share_digest,'base64');
  if lid is not null and session_digest is not null then
    perform 1 from public.letters where id=lid for update;
    update private.recipient_sessions set revoked_at=clock_timestamp() where letter_id=lid and token_digest=decode(session_digest,'base64') and revoked_at is null;
  end if;
end $$;

revoke all on function public.sl_publish(uuid,uuid,text,text,text), public.sl_unpublish(uuid,uuid,text), public.sl_share(uuid,uuid),
  public.sl_bootstrap(text), public.sl_verification_gate(text), public.sl_verification_limits(text,text),
  public.sl_session_issue(text,text,text,text,text), public.sl_recipient_content(text,text), public.sl_recipient_photo(text,text,uuid), public.sl_session_close(text,text)
  from public, anon, authenticated;
grant execute on function public.sl_publish(uuid,uuid,text,text,text), public.sl_unpublish(uuid,uuid,text), public.sl_share(uuid,uuid),
  public.sl_bootstrap(text), public.sl_verification_gate(text), public.sl_verification_limits(text,text),
  public.sl_session_issue(text,text,text,text,text), public.sl_recipient_content(text,text), public.sl_recipient_photo(text,text,uuid), public.sl_session_close(text,text)
  to service_role;
revoke all on function private.recipient_letter(text,text) from public, anon, authenticated;
grant execute on function private.recipient_letter(text,text) to service_role;
commit;
