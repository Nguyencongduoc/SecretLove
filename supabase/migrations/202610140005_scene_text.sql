-- Add protected plain-text scene copy. Existing rows retain null defaults.
-- No data deletion/backfill, RLS change, music policy or Storage change.
begin;
set local lock_timeout = '5s';
create function private.sl_scene_text_valid(value jsonb)
returns boolean language plpgsql immutable set search_path='' as $$
declare entry record; part jsonb; content text;
begin
  if pg_catalog.jsonb_typeof(value) is distinct from 'object'
    or (value-'heart'-'closing')<>'{}'::jsonb
    or not (value ?& array['heart','closing'])
    or pg_catalog.octet_length(value::text)>8192 then return false; end if;
  if pg_catalog.jsonb_typeof(value->'heart') is distinct from 'object'
    or pg_catalog.jsonb_typeof(value->'closing') is distinct from 'object' then return false; end if;
  if ((value->'heart')-'eyebrow'-'title'-'prompt'-'message')<>'{}'::jsonb
    or ((value->'closing')-'eyebrow'-'title'-'message')<>'{}'::jsonb then return false; end if;
  for entry in select * from (values
    ('heart','eyebrow',80),('heart','title',160),('heart','prompt',240),('heart','message',500),
    ('closing','eyebrow',80),('closing','title',160),('closing','message',500)
  ) as fields(section,key,maximum) loop
    part:=value->entry.section;
    if pg_catalog.jsonb_typeof(part->entry.key) is distinct from 'string' then return false; end if;
    content:=part->>entry.key;
    if pg_catalog.char_length(pg_catalog.btrim(content)) not between 1 and entry.maximum then return false; end if;
  end loop;
  return true;
end $$;
revoke all on function private.sl_scene_text_valid(jsonb) from public,anon,authenticated;
grant execute on function private.sl_scene_text_valid(jsonb) to service_role;
alter table public.letters add column scene_text jsonb
  check(scene_text is null or private.sl_scene_text_valid(scene_text))
  check(deleted_at is null or scene_text is null);
create or replace view public.creator_letters with (security_invoker=true) as
  select id,owner_id,title,recipient_display_name,body_doc,template_id,status,version::text as version,
    created_at,updated_at,published_at,deleted_at,presentation_config,scene_text from public.letters;

create or replace function public.sl_save_letter(a uuid,lid uuid,expected text,changes jsonb)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare l public.letters; v bigint; gate_changed boolean;
begin
  l:=private.lock_letter(a,lid,expected);
  if changes ? 'passphraseRecord' and changes->'passphraseRecord'<>'null'::jsonb
    and not (changes ? 'gate') and not exists(select 1 from private.letter_gates where letter_id=lid)
    then raise exception 'VERIFICATION_REQUIRED'; end if;
  if changes ? 'gate' then
    insert into private.letter_gates(letter_id,identity_nonce,identity_digest)
      values(lid,decode(changes->'gate'->>'nonce','base64'),decode(changes->'gate'->>'digest','base64'))
      on conflict(letter_id) do update set identity_nonce=excluded.identity_nonce,
        identity_digest=excluded.identity_digest,updated_at=now();
  end if;
  if changes ? 'passphraseRecord' then update private.letter_gates
    set passphrase_record=nullif(changes->'passphraseRecord','null'::jsonb),updated_at=now() where letter_id=lid; end if;
  gate_changed:=changes ? 'gate' or changes ? 'passphraseRecord';
  update public.letters set
    title=case when changes ? 'title' then changes->>'title' else title end,
    recipient_display_name=case when changes ? 'recipientDisplayName' then changes->>'recipientDisplayName' else recipient_display_name end,
    body_doc=case when changes ? 'bodyDoc' then changes->'bodyDoc' else body_doc end,
    template_id=case when changes ? 'templateId' then changes->>'templateId' else template_id end,
    scene_text=case when changes ? 'sceneText' then nullif(changes->'sceneText','null'::jsonb) else scene_text end,
    version=version+1,access_version=access_version+case when gate_changed then 1 else 0 end,updated_at=now()
    where id=lid returning version into v;
  return jsonb_build_object('version',v::text);
end $$;

create function private.sl_clear_deleted_scene_text()
returns trigger language plpgsql set search_path='' as $$
begin new.scene_text:=null; return new; end $$;
revoke all on function private.sl_clear_deleted_scene_text() from public,anon,authenticated;
grant execute on function private.sl_clear_deleted_scene_text() to service_role;
create trigger sl_clear_deleted_scene_text before update of deleted_at on public.letters
for each row when(new.deleted_at is not null) execute function private.sl_clear_deleted_scene_text();

create or replace function public.sl_recipient_content(share_digest text,session_digest text)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare l public.letters; expiry timestamptz; photos jsonb;
begin
  l:=private.recipient_letter(share_digest,session_digest);
  select expires_at into expiry from private.recipient_sessions
    where token_digest=decode(session_digest,'base64') and letter_id=l.id;
  select coalesce(jsonb_agg(jsonb_build_object('id',id,'altText',alt_text) order by created_at,id),'[]'::jsonb)
    into photos from public.letter_photos where letter_id=l.id and status='ready';
  return jsonb_build_object('letterId',l.id,'expiresAt',expiry,'recipientDisplayName',l.recipient_display_name,
    'bodyDoc',l.body_doc,'templateId',l.template_id,'photos',photos,'presentationConfig',l.presentation_config,'sceneText',l.scene_text);
end $$;
revoke all on function public.sl_save_letter(uuid,uuid,text,jsonb),public.sl_recipient_content(text,text)
  from public,anon,authenticated;
grant execute on function public.sl_save_letter(uuid,uuid,text,jsonb),public.sl_recipient_content(text,text) to service_role;
commit;
