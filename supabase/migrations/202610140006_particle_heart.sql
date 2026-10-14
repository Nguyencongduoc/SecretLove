-- Additive protected particle-heart configuration in the existing V1 JSON.
-- No backfill, row/object deletion, RLS or Storage changes during application.
-- Existing music detach function retains its authorized runtime deletion body.
begin;
set local lock_timeout = '5s';
create function private.sl_heart_customization_valid(value jsonb)
returns boolean language plpgsql immutable set search_path='' as $$
declare phrase jsonb; content text;
begin
  if pg_catalog.jsonb_typeof(value) is distinct from 'object'
    or (value-'schemaVersion'-'heart'-'textRings')<>'{}'::jsonb
    or value->'schemaVersion' is distinct from '1'::jsonb
    or pg_catalog.octet_length(value::text)>4096 then return false; end if;
  if pg_catalog.jsonb_typeof(value->'heart') is distinct from 'object'
    or pg_catalog.jsonb_typeof(value->'textRings') is distinct from 'object' then return false; end if;
  if ((value->'heart')-'style'-'color')<>'{}'::jsonb
    or value->'heart'->>'style' is distinct from 'procedural-particle'
    or not coalesce(value->'heart'->>'color' in ('pink','red','purple'),false)
    or ((value->'textRings')-'enabled'-'phrases'-'rotationSpeed')<>'{}'::jsonb
    or pg_catalog.jsonb_typeof(value->'textRings'->'enabled') is distinct from 'boolean'
    or not coalesce(value->'textRings'->>'rotationSpeed' in ('slow','normal','fast'),false)
    or pg_catalog.jsonb_typeof(value->'textRings'->'phrases') is distinct from 'array'
    then return false; end if;
  if pg_catalog.jsonb_array_length(value->'textRings'->'phrases')>5 then return false; end if;
  for phrase in select * from pg_catalog.jsonb_array_elements(value->'textRings'->'phrases') loop
    if pg_catalog.jsonb_typeof(phrase) is distinct from 'string' then return false; end if;
    content:=phrase #>> '{}';
    if pg_catalog.char_length(pg_catalog.btrim(content)) not between 1 and 60
      or content ~ '[[:cntrl:]]' then return false; end if;
  end loop;
  return true;
end $$;
revoke all on function private.sl_heart_customization_valid(jsonb) from public,anon,authenticated;
grant execute on function private.sl_heart_customization_valid(jsonb) to service_role;
alter table public.letters add constraint sl_heart_customization_check check(
  presentation_config->'heartCustomization' is null
  or presentation_config->'heartCustomization'='null'::jsonb
  or private.sl_heart_customization_valid(presentation_config->'heartCustomization')
);
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
    presentation_config=case when changes ? 'heartCustomization' then
      coalesce(presentation_config,'{"schemaVersion":1}'::jsonb)||jsonb_build_object('heartCustomization',changes->'heartCustomization')
      else presentation_config end,
    scene_text=case when changes ? 'sceneText' then nullif(changes->'sceneText','null'::jsonb) else scene_text end,
    version=version+1,access_version=access_version+case when gate_changed then 1 else 0 end,updated_at=now()
    where id=lid returning version into v;
  return jsonb_build_object('version',v::text);
end $$;

create or replace function public.sl_audio_finalize(a uuid,lid uuid,aid uuid,reserved text)
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
 update public.letters set presentation_config=coalesce(l.presentation_config,'{"schemaVersion":1}'::jsonb)||jsonb_build_object('schemaVersion',1,'music',jsonb_build_object('enabled',false,'assetId',aid,'defaultVolume',coalesce(l.presentation_config->'music'->'defaultVolume','0.35'::jsonb),'loop',coalesce(l.presentation_config->'music'->'loop','false'::jsonb),'startPolicy','manual')),version=version+1,updated_at=now() where id=lid;
 return jsonb_build_object('conflict',false);
end $$;

create or replace function public.sl_music_settings(a uuid,lid uuid,expected text,music_input jsonb)
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
 update public.letters set presentation_config=coalesce(l.presentation_config,'{"schemaVersion":1}'::jsonb)||jsonb_build_object('schemaVersion',1,'music',music_input),version=version+1,updated_at=now() where id=lid;
end $$;

create or replace function public.sl_music_remove(a uuid,lid uuid,expected text)
returns void language plpgsql security invoker set search_path='' as $$
declare l public.letters;
begin
 l:=private.lock_letter(a,lid,expected);
 insert into private.media_cleanup_jobs(bucket_id,object_path,letter_id,byte_size) select 'letter-assets',object_path,lid,byte_size from public.letter_assets where letter_id=lid on conflict(object_path) do nothing;
 delete from public.letter_assets where letter_id=lid;
 update public.letters set presentation_config=coalesce(l.presentation_config,'{"schemaVersion":1}'::jsonb)||jsonb_build_object('schemaVersion',1,'music',jsonb_build_object('enabled',false,'assetId',null,'defaultVolume',coalesce(l.presentation_config->'music'->'defaultVolume','0.35'::jsonb),'loop',coalesce(l.presentation_config->'music'->'loop','false'::jsonb),'startPolicy','manual')),version=version+1,updated_at=now() where id=lid;
end $$;
revoke all on function public.sl_save_letter(uuid,uuid,text,jsonb),public.sl_audio_finalize(uuid,uuid,uuid,text),
  public.sl_music_settings(uuid,uuid,text,jsonb),public.sl_music_remove(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.sl_save_letter(uuid,uuid,text,jsonb),public.sl_audio_finalize(uuid,uuid,uuid,text),
  public.sl_music_settings(uuid,uuid,text,jsonb),public.sl_music_remove(uuid,uuid,text) to service_role;
commit;
