import { beforeAll, afterAll, describe, expect, it } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { readFile } from 'node:fs/promises';
import { randomUUID, randomBytes, createHash } from 'node:crypto';
import { DEFAULT_SCENE_TEXT } from '@/lib/validation/scene-text';
let db: PGlite;
let preUpgradeLetter: { owner: string; id: string };
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
describe('private music transactions and mixed cleanup workers', () => {
  it('saves private scene text with ownership/version/freeze checks and preserves omitted fields', async () => {
    const owner = await creator(),
      id = await letter(owner),
      other = await creator();
    const copy = {
      ...DEFAULT_SCENE_TEXT,
      heart: { ...DEFAULT_SCENE_TEXT.heart, title: 'A private custom heartbeat' },
    };
    await call('sl_save_letter', [owner, id, '1', { sceneText: copy }]);
    await call('sl_save_letter', [owner, id, '2', { title: 'Legacy Save preserves scenes' }]);
    expect(
      (
        await db.query<{ scene_text: unknown }>(
          'select scene_text from public.letters where id=$1',
          [id],
        )
      ).rows[0].scene_text,
    ).toEqual(copy);
    await expect(call('sl_save_letter', [owner, id, '2', { sceneText: null }])).rejects.toThrow(
      'VERSION_CONFLICT',
    );
    await expect(call('sl_save_letter', [other, id, '3', { sceneText: null }])).rejects.toThrow(
      'NOT_FOUND',
    );
    await asRole('authenticated', other, async () => {
      expect(
        (await db.query('select scene_text from public.creator_letters where id=$1', [id])).rows,
      ).toHaveLength(0);
    });
    await expect(
      call('sl_save_letter', [owner, id, '3', { sceneText: { heart: { title: 'incomplete' } } }]),
    ).rejects.toThrow('check constraint');
    await db.query("update public.letters set status='published',published_at=now() where id=$1", [
      id,
    ]);
    await expect(call('sl_save_letter', [owner, id, '3', { sceneText: null }])).rejects.toThrow(
      'LETTER_PUBLISHED',
    );
    await call('sl_delete_letter', [owner, id, '3']);
    expect(
      (
        await db.query<{ scene_text: unknown }>(
          'select scene_text from public.letters where id=$1',
          [id],
        )
      ).rows[0].scene_text,
    ).toBeNull();
  });
  it('protects authored scene text behind recipient authorization and permits explicit default reset', async () => {
    const owner = await creator(),
      id = await letter(owner);
    const copy = {
      ...DEFAULT_SCENE_TEXT,
      closing: { ...DEFAULT_SCENE_TEXT.closing, message: 'A private ending' },
    };
    const nonce = randomBytes(16).toString('base64');
    await call('sl_save_letter', [
      owner,
      id,
      '1',
      {
        recipientDisplayName: 'Reader',
        bodyDoc: {
          type: 'doc',
          content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Private' }] }],
        },
        gate: { nonce, digest: randomBytes(32).toString('base64') },
        sceneText: copy,
      },
    ]);
    const share = randomBytes(32).toString('base64'),
      session = randomBytes(32).toString('base64');
    await call('sl_publish', [owner, id, '2', randomBytes(32).toString('base64url'), share]);
    await expect(call('sl_recipient_content', [share, null])).rejects.toThrow('ACCESS_REQUIRED');
    await call('sl_session_issue', [share, '3', nonce, session, null]);
    expect(
      (await call<{ sceneText: unknown }>('sl_recipient_content', [share, session])).sceneText,
    ).toEqual(copy);
    await call('sl_unpublish', [owner, id, '3']);
    await call('sl_save_letter', [owner, id, '4', { sceneText: null }]);
    expect(
      (
        await db.query<{ scene_text: unknown }>(
          'select scene_text from public.letters where id=$1',
          [id],
        )
      ).rows[0].scene_text,
    ).toBeNull();
  });
  it('accepts full-song metadata, keeps old assets, and rejects values beyond new caps', async () => {
    const owner = await creator(),
      id = await letter(owner),
      aid = randomUUID();
    await call('sl_audio_reserve', [owner, id, '1', aid, 16777216, 360]);
    expect(
      (
        await db.query('select byte_size,duration_seconds from public.letter_assets where id=$1', [
          aid,
        ])
      ).rows[0],
    ).toMatchObject({ byte_size: 16777216, duration_seconds: 360 });
    for (const [bytes, seconds] of [
      [16777217, 30],
      [100, 360.01],
    ]) {
      const next = await letter(owner);
      await expect(
        call('sl_audio_reserve', [owner, next, '1', randomUUID(), bytes, seconds]),
      ).rejects.toThrow('check constraint');
    }
    const { rows } = await db.query(
      "select public,file_size_limit,allowed_mime_types from storage.buckets where id='letter-assets'",
    );
    expect(rows[0]).toMatchObject({
      public: false,
      file_size_limit: 16777216,
      allowed_mime_types: ['audio/mpeg'],
    });
  });
  it('pending and queued audio count toward aggregate creator quotas', async () => {
    const owner = await creator();
    let first = '';
    for (let i = 0; i < 20; i++) {
      const id = await letter(owner);
      if (!first) first = id;
      await call('sl_audio_reserve', [owner, id, '1', randomUUID(), 3145728, 30]);
    }
    await call('sl_music_remove', [owner, first, '2']);
    await expect(
      call('sl_audio_reserve', [owner, first, '3', randomUUID(), 100, 1]),
    ).rejects.toThrow('ASSET_QUOTA');
  });
  it('pending audio prevents publication and stale finalization queues only the failed reservation', async () => {
    const owner = await creator(),
      id = await letter(owner),
      aid = randomUUID();
    await call('sl_save_letter', [
      owner,
      id,
      '1',
      {
        recipientDisplayName: 'Reader',
        bodyDoc: {
          type: 'doc',
          content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Private' }] }],
        },
        gate: {
          nonce: randomBytes(16).toString('base64'),
          digest: randomBytes(32).toString('base64'),
        },
      },
    ]);
    const reserved = await call<{ path: string; reservedVersion: string }>('sl_audio_reserve', [
      owner,
      id,
      '2',
      aid,
      100,
      1,
    ]);
    await expect(
      call('sl_music_settings', [
        owner,
        id,
        '3',
        { enabled: true, assetId: aid, defaultVolume: 0.35, loop: false, startPolicy: 'manual' },
      ]),
    ).rejects.toThrow('INVALID_MUSIC');
    await expect(
      call('sl_publish', [
        owner,
        id,
        '3',
        randomBytes(32).toString('base64url'),
        randomBytes(32).toString('base64'),
      ]),
    ).rejects.toThrow('UPLOAD_PENDING');
    await call('sl_save_letter', [owner, id, '3', { title: 'Concurrent save' }]);
    expect(
      (
        await call<{ conflict: boolean }>('sl_audio_finalize', [
          owner,
          id,
          aid,
          reserved.reservedVersion,
        ])
      ).conflict,
    ).toBe(true);
    expect(
      (await db.query('select id from public.letter_assets where id=$1', [aid])).rows,
    ).toHaveLength(0);
    expect(
      (
        await db.query('select bucket_id from private.media_cleanup_jobs where object_path=$1', [
          reserved.path,
        ])
      ).rows[0],
    ).toEqual({ bucket_id: 'letter-assets' });
  });
  async function track() {
    const owner = await creator(),
      id = await letter(owner),
      aid = randomUUID();
    const reservation = await call<{ reservedVersion: string; path: string }>('sl_audio_reserve', [
      owner,
      id,
      '1',
      aid,
      100000,
      6,
    ]);
    await call('sl_audio_finalize', [owner, id, aid, reservation.reservedVersion]);
    return { owner, id, aid, path: reservation.path };
  }
  const music = (aid: string, enabled = true) => ({
    enabled,
    assetId: aid,
    defaultVolume: 0.4,
    loop: true,
    startPolicy: 'manual',
  });
  it('counts pending slots, denies foreign writes, checks references and freezes published settings', async () => {
    const t = await track(),
      other = await creator();
    await expect(
      call('sl_audio_reserve', [t.owner, t.id, '3', randomUUID(), 100, 1]),
    ).rejects.toThrow('AUDIO_LIMIT');
    await expect(call('sl_music_settings', [other, t.id, '3', music(t.aid)])).rejects.toThrow(
      'NOT_FOUND',
    );
    await expect(
      call('sl_music_settings', [t.owner, t.id, '3', music(randomUUID())]),
    ).rejects.toThrow('INVALID_MUSIC');
    await expect(call('sl_music_settings', [t.owner, t.id, '2', music(t.aid)])).rejects.toThrow(
      'VERSION_CONFLICT',
    );
    await call('sl_music_settings', [t.owner, t.id, '3', music(t.aid)]);
    await call('sl_save_letter', [t.owner, t.id, '4', { title: 'Legacy save preserves music' }]);
    const row = await db.query<{ presentation_config: { music: { assetId: string } } }>(
      'select presentation_config from public.letters where id=$1',
      [t.id],
    );
    expect(row.rows[0].presentation_config.music.assetId).toBe(t.aid);
    await db.query("update public.letters set status='published',published_at=now() where id=$1", [
      t.id,
    ]);
    await expect(call('sl_music_remove', [t.owner, t.id, '5'])).rejects.toThrow('LETTER_PUBLISHED');
  });
  it('guards ready records after failed responses and atomically detaches/replaces', async () => {
    const t = await track();
    await call('sl_audio_fail', [t.owner, t.id, t.aid]);
    await call('sl_audio_finalize', [t.owner, t.id, t.aid, '2']);
    expect(
      (await db.query('select id from private.media_cleanup_jobs where object_path=$1', [t.path]))
        .rows,
    ).toHaveLength(0);
    await call('sl_music_remove', [t.owner, t.id, '3']);
    expect(
      (await db.query('select id from public.letter_assets where id=$1', [t.aid])).rows,
    ).toHaveLength(0);
    expect(
      (
        await db.query('select bucket_id from private.media_cleanup_jobs where object_path=$1', [
          t.path,
        ])
      ).rows[0],
    ).toEqual({ bucket_id: 'letter-assets' });
    await call('sl_audio_reserve', [t.owner, t.id, '4', randomUUID(), 100, 1]);
  });
  it('owner RLS and browser storage/function grants deny access despite broad policies', async () => {
    const t = await track(),
      other = await creator();
    await db.query("insert into storage.objects(bucket_id,name) values('letter-assets',$1)", [
      t.path,
    ]);
    await asRole('authenticated', other, async () => {
      expect(
        (await db.query('select id from public.letter_assets where letter_id=$1', [t.id])).rows,
      ).toHaveLength(0);
      expect(
        (await db.query("select id from storage.objects where bucket_id='letter-assets'")).rows,
      ).toHaveLength(0);
      await expect(call('sl_owner_audio', [t.owner, t.id, t.aid])).rejects.toThrow(
        'permission denied',
      );
    });
    await asRole('authenticated', t.owner, async () =>
      expect(
        (await db.query('select id from public.letter_assets where letter_id=$1', [t.id])).rows,
      ).toHaveLength(1),
    );
  });
  it('authorizes current enabled selection only and denies cross-letter, revoked and expired sessions', async () => {
    const t = await track(),
      other = await track();
    const share = randomBytes(32).toString('base64'),
      session = randomBytes(32).toString('base64');
    await db.query("update public.letters set status='published',published_at=now() where id=$1", [
      t.id,
    ]);
    await db.query(
      "insert into private.letter_shares(letter_id,share_token,token_digest,active) values($1,$2,decode($3,'base64'),true)",
      [t.id, randomBytes(32).toString('base64url'), share],
    );
    await db.query(
      "insert into private.recipient_sessions(letter_id,token_digest,access_version,expires_at) values($1,decode($2,'base64'),1,now()+interval '30 minutes')",
      [t.id, session],
    );
    await expect(call('sl_recipient_audio', [share, null, t.aid])).rejects.toThrow(
      'ACCESS_REQUIRED',
    );
    await expect(call('sl_recipient_audio', [share, session, t.aid])).rejects.toThrow('NOT_FOUND');
    await db.query(
      "update public.letters set presentation_config=jsonb_set(presentation_config,'{music,enabled}','true') where id=$1",
      [t.id],
    );
    expect((await call<{ path: string }>('sl_recipient_audio', [share, session, t.aid])).path).toBe(
      t.path,
    );
    await expect(call('sl_recipient_audio', [share, session, other.aid])).rejects.toThrow(
      'NOT_FOUND',
    );
    const otherShare = randomBytes(32).toString('base64');
    await db.query(
      "update public.letters set status='published',published_at=now(),presentation_config=jsonb_set(presentation_config,'{music,enabled}','true') where id=$1",
      [other.id],
    );
    await db.query(
      "insert into private.letter_shares(letter_id,share_token,token_digest,active) values($1,$2,decode($3,'base64'),true)",
      [other.id, randomBytes(32).toString('base64url'), otherShare],
    );
    await expect(call('sl_recipient_audio', [otherShare, session, other.aid])).rejects.toThrow(
      'ACCESS_REQUIRED',
    );
    await db.query(
      "update private.recipient_sessions set expires_at=now()-interval '1 minute',created_at=now()-interval '31 minutes' where letter_id=$1",
      [t.id],
    );
    await expect(call('sl_recipient_audio', [share, session, t.aid])).rejects.toThrow(
      'ACCESS_REQUIRED',
    );
    await db.query(
      "update private.recipient_sessions set expires_at=now()+interval '1 minute',revoked_at=now() where letter_id=$1",
      [t.id],
    );
    await expect(call('sl_recipient_audio', [share, session, t.aid])).rejects.toThrow(
      'ACCESS_REQUIRED',
    );
  });
  it('old claim and acknowledgement cannot consume audio jobs; v2 binds bucket/path/lease', async () => {
    const t = await track();
    await call('sl_music_remove', [t.owner, t.id, '3']);
    const legacy = await call<{ path: string }[]>('sl_cleanup_claim', []);
    expect(legacy.some((j) => j.path === t.path)).toBe(false);
    const jobs = await call<{ id: string; bucket: string; path: string; leaseToken: string }[]>(
      'sl_cleanup_claim_v2',
      [],
    );
    const job = jobs.find((j) => j.path === t.path)!;
    expect(job.bucket).toBe('letter-assets');
    await call('sl_cleanup_complete', [job.id, job.leaseToken, true]);
    await call('sl_cleanup_complete_v2', [job.id, 'letter-media', job.path, job.leaseToken, true]);
    expect(
      (await db.query('select id from private.media_cleanup_jobs where id=$1', [job.id])).rows,
    ).toHaveLength(1);
    await call('sl_cleanup_complete_v2', [job.id, job.bucket, job.path, job.leaseToken, false]);
    expect(
      (
        await db.query<{ attempts: number }>(
          'select attempts from private.media_cleanup_jobs where id=$1',
          [job.id],
        )
      ).rows[0].attempts,
    ).toBe(1);
  });
  it('deletion queues audio, stale reservations reconcile, and ready assets are not orphaned', async () => {
    const t = await track();
    await call('sl_audio_orphan', [t.path]);
    expect(
      (await db.query('select id from private.media_cleanup_jobs where object_path=$1', [t.path]))
        .rows,
    ).toHaveLength(0);
    await call('sl_delete_letter', [t.owner, t.id, '3']);
    expect(
      (await db.query('select id from private.media_cleanup_jobs where object_path=$1', [t.path]))
        .rows,
    ).toHaveLength(1);
    await expect(call('sl_owner_audio', [t.owner, t.id, t.aid])).rejects.toThrow('NOT_FOUND');
    const owner = await creator(),
      id = await letter(owner),
      aid = randomUUID();
    await call('sl_audio_reserve', [owner, id, '1', aid, 100, 1]);
    await db.query(
      "update public.letter_assets set created_at=now()-interval '2 hours' where id=$1",
      [aid],
    );
    await call('sl_cleanup_stale', []);
    expect(
      (await db.query('select id from public.letter_assets where id=$1', [aid])).rows,
    ).toHaveLength(0);
  });
});
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
  const owner = await creator(),
    id = await letter(owner);
  preUpgradeLetter = { owner, id };
  await call('sl_save_letter', [
    owner,
    id,
    '1',
    {
      title: 'Existing Day 1 draft',
      recipientDisplayName: 'Legacy reader',
      templateId: 'minimal',
      bodyDoc: {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: 'Existing private Day 1 message' }],
          },
        ],
      },
      gate: {
        nonce: randomBytes(16).toString('base64'),
        digest: randomBytes(32).toString('base64'),
      },
    },
  ]);
  await db.exec(
    await readFile('supabase/migrations/202610140002_recipient_experience.sql', 'utf8'),
  );
  await db.exec(await readFile('supabase/migrations/202610140003_background_music.sql', 'utf8'));
  // Preserve a real pre-004 ready attachment/config through the limit expansion.
  const legacyOwner = await creator(),
    legacyId = await letter(legacyOwner),
    legacyAid = randomUUID();
  const reserved = await call<{ reservedVersion: string }>('sl_audio_reserve', [
    legacyOwner,
    legacyId,
    '1',
    legacyAid,
    100,
    30,
  ]);
  await call('sl_audio_finalize', [legacyOwner, legacyId, legacyAid, reserved.reservedVersion]);
  const before = (
    await db.query('select presentation_config,version from public.letters where id=$1', [legacyId])
  ).rows[0];
  await db.exec(await readFile('supabase/migrations/202610140004_full_song_audio.sql', 'utf8'));
  expect(
    (
      await db.query('select presentation_config,version from public.letters where id=$1', [
        legacyId,
      ])
    ).rows[0],
  ).toEqual(before);
  expect(
    (
      await db.query(
        'select status,byte_size,duration_seconds from public.letter_assets where id=$1',
        [legacyAid],
      )
    ).rows[0],
  ).toEqual({ status: 'ready', byte_size: 100, duration_seconds: 30 });
  await db.exec(await readFile('supabase/migrations/202610140005_scene_text.sql', 'utf8'));
  expect(
    (
      await db.query('select presentation_config,version from public.letters where id=$1', [
        legacyId,
      ])
    ).rows[0],
  ).toEqual(before);
  expect(
    (
      await db.query<{ scene_text: unknown }>('select scene_text from public.letters where id=$1', [
        legacyId,
      ])
    ).rows[0].scene_text,
  ).toBeNull();
});
it('preserves a real pre-upgrade Day 1 row through recipient and music migrations', async () => {
  const { owner, id } = preUpgradeLetter;
  await asRole('authenticated', owner, async () => {
    const { rows } = await db.query(
      'select title,recipient_display_name,template_id,version,presentation_config,body_doc from public.creator_letters where id=$1',
      [id],
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      title: 'Existing Day 1 draft',
      recipient_display_name: 'Legacy reader',
      template_id: 'minimal',
      version: '2',
      presentation_config: null,
      body_doc: {
        type: 'doc',
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: 'Existing private Day 1 message' }],
          },
        ],
      },
    });
  });
  expect(
    (await call<{ verificationConfigured: boolean }>('sl_gate_flags', [owner, id]))
      .verificationConfigured,
  ).toBe(true);
  const token = randomBytes(32).toString('base64url'),
    digest = createHash('sha256').update(token).digest('base64');
  expect(
    (await call<{ shareToken: string }>('sl_publish', [owner, id, '2', token, digest])).shareToken,
  ).toBe(token);
  await expect(call('sl_recipient_content', [digest, null])).rejects.toThrow('ACCESS_REQUIRED');
});

describe('recipient publication and letter-bound authorization', () => {
  const digest = (value: string) => createHash('sha256').update(value).digest('base64');
  async function published() {
    const owner = await creator(),
      id = await letter(owner);
    const nonce = randomBytes(16).toString('base64');
    await call('sl_save_letter', [
      owner,
      id,
      '1',
      {
        recipientDisplayName: 'Synthetic reader',
        bodyDoc: {
          type: 'doc',
          content: [
            { type: 'paragraph', content: [{ type: 'text', text: 'Private synthetic message' }] },
          ],
        },
        gate: { nonce, digest: randomBytes(32).toString('base64') },
      },
    ]);
    const token = randomBytes(32).toString('base64url');
    await call('sl_publish', [owner, id, '2', token, digest(token)]);
    return { owner, id, nonce, token, share: digest(token) };
  }
  it('denies incomplete, pending, foreign and browser publication; freezes writes and rotates links', async () => {
    const owner = await creator(),
      id = await letter(owner),
      other = await creator();
    const token = randomBytes(32).toString('base64url');
    await expect(call('sl_publish', [owner, id, '1', token, digest(token)])).rejects.toThrow(
      'PUBLISH_INCOMPLETE',
    );
    await expect(call('sl_publish', [other, id, '1', token, digest(token)])).rejects.toThrow(
      'NOT_FOUND',
    );
    await asRole('anon', '', async () => {
      await expect(call('sl_bootstrap', [digest(token)])).rejects.toThrow(/permission denied/);
    });
    const p = await published();
    expect(await call('sl_publish', [p.owner, p.id, '3', token, digest(token)])).toEqual({
      shareToken: p.token,
    });
    await expect(
      call('sl_save_letter', [p.owner, p.id, '3', { title: 'Forbidden' }]),
    ).rejects.toThrow('LETTER_PUBLISHED');
    await call('sl_unpublish', [p.owner, p.id, '3']);
    await expect(call('sl_bootstrap', [p.share])).rejects.toThrow('NOT_FOUND');
    await call('sl_publish', [p.owner, p.id, '4', token, digest(token)]);
    await expect(call('sl_bootstrap', [p.share])).rejects.toThrow('NOT_FOUND');
    expect(await call('sl_bootstrap', [digest(token)])).toEqual({
      available: true,
      passphraseRequired: false,
    });
    const pending = await letter(owner);
    await call('sl_save_letter', [
      owner,
      pending,
      '1',
      {
        recipientDisplayName: 'Reader',
        bodyDoc: {
          type: 'doc',
          content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Ready' }] }],
        },
        gate: {
          nonce: randomBytes(16).toString('base64'),
          digest: randomBytes(32).toString('base64'),
        },
      },
    ]);
    await call('sl_photo_reserve', [
      owner,
      pending,
      '2',
      randomUUID(),
      { byteSize: 100, width: 10, height: 10, altText: 'Pending' },
    ]);
    await expect(
      call('sl_publish', [
        owner,
        pending,
        '3',
        randomBytes(32).toString('base64url'),
        randomBytes(32).toString('base64'),
      ]),
    ).rejects.toThrow('UPLOAD_PENDING');
  });
  it('checks missing, cross-letter, revoked, expired sessions and photo membership on every read', async () => {
    const a = await published(),
      b = await published(),
      session = randomBytes(32).toString('base64');
    const issued = await call<{ expiresAt: string }>('sl_session_issue', [
      a.share,
      '3',
      a.nonce,
      session,
      null,
    ]);
    await expect(call('sl_recipient_content', [a.share, null])).rejects.toThrow('ACCESS_REQUIRED');
    await expect(call('sl_recipient_content', [b.share, session])).rejects.toThrow(
      'ACCESS_REQUIRED',
    );
    const content = await call<{ bodyDoc: unknown; expiresAt: string }>('sl_recipient_content', [
      a.share,
      session,
    ]);
    expect(content.expiresAt).toBe(issued.expiresAt);
    expect(JSON.stringify(content)).toContain('Private synthetic message');
    expect(JSON.stringify(content)).not.toMatch(
      /owner_id|identity_digest|nonce|shareToken|object_path/,
    );
    const pid = randomUUID();
    await db.query(
      "insert into public.letter_photos(id,letter_id,slot,object_path,status,byte_size,width,height) values($1,$2,0,'synthetic-private.webp','ready',100,10,10)",
      [pid, a.id],
    );
    expect(await call('sl_recipient_photo', [a.share, session, pid])).toBe(
      'synthetic-private.webp',
    );
    await expect(call('sl_recipient_photo', [b.share, session, pid])).rejects.toThrow(
      'ACCESS_REQUIRED',
    );
    await expect(call('sl_recipient_photo', [a.share, session, randomUUID()])).rejects.toThrow(
      'NOT_FOUND',
    );
    await call('sl_session_close', [b.share, session]);
    expect(
      (await call<{ expiresAt: string }>('sl_recipient_content', [a.share, session])).expiresAt,
    ).toBe(issued.expiresAt);
    await call('sl_session_close', [a.share, session]);
    await expect(call('sl_recipient_photo', [a.share, session, pid])).rejects.toThrow(
      'ACCESS_REQUIRED',
    );
    const next = randomBytes(32).toString('base64');
    await call('sl_session_issue', [a.share, '3', a.nonce, next, session]);
    await db.query(
      "update private.recipient_sessions set created_at=now()-interval '1 hour',expires_at=now()-interval '1 second' where token_digest=decode($1,'base64')",
      [next],
    );
    await expect(call('sl_recipient_content', [a.share, next])).rejects.toThrow('ACCESS_REQUIRED');
  });
  it('rejects issuance after unpublish/reconfigure and consumes both rate scopes when denied', async () => {
    const p = await published();
    await call('sl_unpublish', [p.owner, p.id, '3']);
    await expect(
      call('sl_session_issue', [p.share, '3', p.nonce, randomBytes(32).toString('base64'), null]),
    ).rejects.toThrow('NOT_FOUND');
    const ip = randomBytes(32).toString('base64'),
      scope = randomBytes(32).toString('base64');
    for (let i = 0; i < 5; i++)
      expect(await call('sl_verification_limits', [ip, scope])).toBe(true);
    expect(await call('sl_verification_limits', [ip, scope])).toBe(false);
    expect(
      (
        await db.query<{ attempts: number }>(
          "select attempts from private.rate_limit_buckets where scope='verify_letter' and key_digest=decode($1,'base64')",
          [scope],
        )
      ).rows[0].attempts,
    ).toBe(6);
  });
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
