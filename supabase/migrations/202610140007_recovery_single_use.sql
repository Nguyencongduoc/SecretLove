-- Additive security repair. Applied migrations 001-006 remain immutable.
-- No remote execution, data backfill, Storage changes or existing-table deletion.
begin;
set local lock_timeout = '5s';
create table private.recovery_consumptions (
  proof_digest bytea primary key check (octet_length(proof_digest) = 32),
  user_id uuid not null references auth.users(id) on delete cascade,
  expires_at timestamptz not null,
  consumed_at timestamptz not null default clock_timestamp()
);
create index recovery_consumptions_expiry on private.recovery_consumptions(expires_at);
alter table private.recovery_consumptions enable row level security;
revoke all on private.recovery_consumptions from public, anon, authenticated;
grant all on private.recovery_consumptions to service_role;

-- Called only after getUser and local HMAC/user/token/expiry validation.
-- One winner across instances; consume BEFORE the provider password mutation.
create function public.sl_recovery_consume(a uuid, proof_digest text, expires_input timestamptz)
returns boolean language plpgsql security invoker set search_path = '' as $$
declare consumed boolean;
begin
  if a is null or proof_digest is null or expires_input is null
    or proof_digest !~ '^[A-Za-z0-9+/]{43}=$' then raise exception 'INVALID_RECOVERY'; end if;
  if octet_length(decode(proof_digest, 'base64')) <> 32
    or expires_input <= clock_timestamp()
    or expires_input > clock_timestamp() + interval '11 minutes'
    then raise exception 'INVALID_RECOVERY'; end if;
  insert into private.recovery_consumptions(proof_digest,user_id,expires_at)
    values(decode(proof_digest,'base64'),a,expires_input)
    on conflict do nothing;
  consumed := found;
  return consumed;
end $$;

-- Only expired proofs are pruned; an expired HMAC cannot authorize a new reset.
create function public.sl_recovery_prune()
returns integer language plpgsql security invoker set search_path = '' as $$
declare total integer;
begin
  delete from private.recovery_consumptions where expires_at < clock_timestamp();
  get diagnostics total = row_count;
  return total;
end $$;
revoke all on function public.sl_recovery_consume(uuid,text,timestamptz), public.sl_recovery_prune()
  from public, anon, authenticated;
grant execute on function public.sl_recovery_consume(uuid,text,timestamptz), public.sl_recovery_prune()
  to service_role;
commit;
