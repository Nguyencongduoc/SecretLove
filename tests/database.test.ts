import { beforeAll, afterAll, describe, expect, it } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { readFile } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
let db: PGlite;
async function call<T = Record<string, unknown>>(name: string, args: unknown[]): Promise<T> {
  const result = await db.query<{ value: T }>(
    `select public.${name}(${args.map((_, index) => `$${index + 1}`).join(',')}) as value`,
    args,
  );
  return result.rows[0].value;
}
async function creator() {
  const id = randomUUID();
  await db.query('insert into auth.users(id) values($1)', [id]);
  return id;
}
async function letter(owner: string) {
  return (await call<{ id: string }>('sl_create_letter', [owner, 'Test letter'])).id;
}
async function asRole<T>(role: string, id: string, run: () => Promise<T>) {
  await db.exec(`set role ${role}`);
  try {
    await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id]);
    return await run();
  } finally {
    await db.exec('reset role');
  }
}
beforeAll(async () => {
  db = new PGlite();
  // Test-only fixtures for Supabase-owned schemas. The application migration is unchanged.
  await db.exec(`create role anon; create role authenticated; create role service_role bypassrls;
    create schema auth; create table auth.users(id uuid primary key);
    create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
    grant usage on schema auth, public to anon,authenticated,service_role;
    grant execute on function auth.uid() to anon,authenticated,service_role;
    create schema storage; grant usage on schema storage to anon,authenticated,service_role;
    create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
    create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text);
    alter table storage.objects enable row level security;
    grant all on storage.objects to anon,authenticated,service_role;
    create policy existing_broad_policy on storage.objects for all to anon,authenticated using(true) with check(true);`);
  await db.exec(await readFile('supabase/migrations/202610140001_creator_studio.sql', 'utf8'));
});
afterAll(async () => {
  await db?.close();
});
describe('actual PostgreSQL migration and access rules', () => {
  it('isolates creator reads and denies browser writes and privileged functions', async () => {
    const a = await creator(),
      b = await creator(),
      id = await letter(a);
    await asRole('authenticated', a, async () => {
      expect(
        (await db.query('select id from public.creator_letters where id=$1', [id])).rows,
      ).toHaveLength(1);
      await expect(
        db.query('update public.letters set title=$1 where id=$2', ['Forbidden', id]),
      ).rejects.toThrow(/permission denied/);
      await expect(call('sl_save_letter', [a, id, '1', { title: 'Forbidden' }])).rejects.toThrow(
        /permission denied/,
      );
      await expect(db.query('select * from private.letter_gates')).rejects.toThrow(
        /permission denied/,
      );
    });
    await asRole('authenticated', b, async () =>
      expect(
        (await db.query('select id from public.creator_letters where id=$1', [id])).rows,
      ).toHaveLength(0),
    );
    await asRole('anon', '', async () => {
      await expect(db.query('select * from public.creator_letters')).rejects.toThrow(
        /permission denied/,
      );
    });
    await asRole('service_role', '', async () => {
      await expect(call('sl_save_letter', [b, id, '1', { title: 'Forbidden' }])).rejects.toThrow(
        'NOT_FOUND',
      );
    });
  });
  it('keeps the media bucket private even with existing permissive policies', async () => {
    await db.query(
      "insert into storage.objects(bucket_id,name) values('letter-media','test.webp'),('other','public.webp')",
    );
    for (const role of ['anon', 'authenticated'])
      await asRole(role, '', async () => {
        expect(
          (await db.query("select * from storage.objects where bucket_id='letter-media'")).rows,
        ).toHaveLength(0);
        expect(
          (await db.query("select * from storage.objects where bucket_id='other'")).rows,
        ).toHaveLength(1);
        await expect(
          db.query(
            "insert into storage.objects(bucket_id,name) values('letter-media','forbidden.webp')",
          ),
        ).rejects.toThrow(/row-level security/);
      });
    expect(
      (
        await db.query<{ public: boolean }>(
          "select public from storage.buckets where id='letter-media'",
        )
      ).rows[0].public,
    ).toBe(false);
  });
  it('enforces quotas and optimistic save versions', async () => {
    const a = await creator();
    const id = await letter(a);
    expect(await call('sl_save_letter', [a, id, '1', { title: 'Saved' }])).toEqual({
      version: '2',
    });
    await expect(call('sl_save_letter', [a, id, '1', { title: 'Lost update' }])).rejects.toThrow(
      'VERSION_CONFLICT',
    );
    expect(
      (await db.query<{ title: string }>('select title from public.letters where id=$1', [id]))
        .rows[0].title,
    ).toBe('Saved');
    for (let index = 1; index < 20; index++) await letter(a);
    await expect(letter(a)).rejects.toThrow('LETTER_LIMIT');
  });
  it('rejects passphrase-only incomplete gates without partially saving', async () => {
    const a = await creator(),
      id = await letter(a);
    await expect(
      call('sl_save_letter', [
        a,
        id,
        '1',
        { title: 'Partial', passphraseRecord: { hash: 'test' } },
      ]),
    ).rejects.toThrow('VERIFICATION_REQUIRED');
    expect(await call('sl_gate_flags', [a, id])).toEqual({
      verificationConfigured: false,
      passphraseRequired: false,
    });
    await call('sl_save_letter', [
      a,
      id,
      '1',
      {
        gate: {
          nonce: Buffer.alloc(16).toString('base64'),
          digest: Buffer.alloc(32).toString('base64'),
        },
        passphraseRecord: { hash: 'test-only' },
      },
    ]);
    expect(await call('sl_gate_flags', [a, id])).toEqual({
      verificationConfigured: true,
      passphraseRequired: true,
    });
  });
  it('commits upload-conflict cleanup while preserving a concurrent Save', async () => {
    const a = await creator(),
      id = await letter(a),
      pid = randomUUID();
    const reserved = await call<{ reservedVersion: string }>('sl_photo_reserve', [
      a,
      id,
      '1',
      pid,
      { byteSize: 100, width: 10, height: 10, altText: 'Test image' },
    ]);
    await call('sl_save_letter', [a, id, reserved.reservedVersion, { title: 'Concurrent save' }]);
    expect(await call('sl_photo_finalize', [a, id, pid, reserved.reservedVersion])).toEqual({
      conflict: true,
    });
    expect(
      (await db.query('select id from public.letter_photos where id=$1', [pid])).rows,
    ).toHaveLength(0);
    expect(
      (await db.query<{ title: string }>('select title from public.letters where id=$1', [id]))
        .rows[0].title,
    ).toBe('Concurrent save');
    expect(
      (await db.query('select id from private.media_cleanup_jobs where letter_id=$1', [id])).rows,
    ).toHaveLength(1);
  });
  it('limits photos, protects finalized images from retry cleanup, and checks membership', async () => {
    const a = await creator(),
      b = await creator(),
      id = await letter(a);
    let version = '1';
    let first = '';
    for (let index = 0; index < 6; index++) {
      const pid = randomUUID();
      first ||= pid;
      const reserved = await call<{ reservedVersion: string }>('sl_photo_reserve', [
        a,
        id,
        version,
        pid,
        { byteSize: 100, width: 10, height: 10, altText: 'Test image' },
      ]);
      const final = await call<{ version: string }>('sl_photo_finalize', [
        a,
        id,
        pid,
        reserved.reservedVersion,
      ]);
      version = final.version;
    }
    await expect(
      call('sl_photo_reserve', [
        a,
        id,
        version,
        randomUUID(),
        { byteSize: 100, width: 10, height: 10, altText: 'Extra' },
      ]),
    ).rejects.toThrow('PHOTO_LIMIT');
    await call('sl_photo_fail', [a, id, first]);
    await call('sl_photo_finalize', [a, id, first, '2']);
    expect(
      (await db.query('select id from private.media_cleanup_jobs where letter_id=$1', [id])).rows,
    ).toHaveLength(0);
    await expect(call('sl_photo_path', [b, id, first])).rejects.toThrow('NOT_FOUND');
    expect(await call('sl_photo_path', [a, id, first])).toBe(`${a}/${id}/${first}.webp`);
    expect(await call('sl_delete_letter', [a, id, version])).toEqual({
      deleted: true,
      mediaCleanup: 'pending',
    });
    await expect(call('sl_photo_path', [a, id, first])).rejects.toThrow('NOT_FOUND');
    expect(
      (
        await db.query<{ recipient_display_name: null; title: string }>(
          'select title,recipient_display_name from public.letters where id=$1',
          [id],
        )
      ).rows[0],
    ).toEqual({ title: 'Deleted letter', recipient_display_name: null });
  });
  it('leases cleanup jobs and rejects stale acknowledgements', async () => {
    const jobs = await call<{ id: string; leaseToken: string }[]>('sl_cleanup_claim', []);
    expect(jobs.length).toBeGreaterThan(0);
    expect(await call('sl_cleanup_claim', [])).toEqual([]);
    await call('sl_cleanup_complete', [jobs[0].id, randomUUID(), true]);
    expect(
      (await db.query('select id from private.media_cleanup_jobs where id=$1', [jobs[0].id])).rows,
    ).toHaveLength(1);
    await call('sl_cleanup_complete', [jobs[0].id, jobs[0].leaseToken, false]);
    expect(
      (
        await db.query<{ attempts: number }>(
          'select attempts from private.media_cleanup_jobs where id=$1',
          [jobs[0].id],
        )
      ).rows[0].attempts,
    ).toBe(1);
  });
  it('persists denied rate-limit attempts', async () => {
    const digest = Buffer.alloc(32, 5).toString('base64');
    expect(await call('sl_rate_limit', ['test', digest, 2, 86400])).toBe(true);
    expect(await call('sl_rate_limit', ['test', digest, 2, 86400])).toBe(true);
    expect(await call('sl_rate_limit', ['test', digest, 2, 86400])).toBe(false);
    expect(
      (
        await db.query<{ attempts: number }>(
          "select attempts from private.rate_limit_buckets where scope='test'",
        )
      ).rows[0].attempts,
    ).toBe(3);
  });
});
