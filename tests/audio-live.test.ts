import { expect, it, vi } from 'vitest';
import { readFile } from 'node:fs/promises';
import { createClient } from '@supabase/supabase-js';
import { audioResponse } from '@/lib/server/audio-response';

// Explicit opt-in: read existing marked/tracked synthetic data only. Never seed,
// rotate fixture passwords, upload, mutate RPC state or invoke cleanup here.
const approved = process.env.SECRETLOVE_LIVE_MODERN_STORAGE === '1';
it.skipIf(!approved)(
  'live isolated modern-key SDK/read-only RPC/private full GET/Range and anonymous denial',
  async (context) => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const publicKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    if (
      process.env.SECRETLOVE_TEST_PROJECT !== 'isolated' ||
      url !== 'https://samelfoyrujhcywcnofw.supabase.co' ||
      !key?.startsWith('sb_secret_') ||
      !publicKey
    )
      throw new Error(
        'Explicit isolated project and privately supplied modern key required; values withheld.',
      );
    const originalFetch = globalThis.fetch;
    const open: Response[] = [];
    try {
      const tracked: { id: string }[] = JSON.parse(await readFile('.test-fixtures.json', 'utf8'));
      const service = createClient(url, key, {
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      });
      const users = await service.auth.admin.listUsers({ page: 1, perPage: 1000 });
      if (users.error) throw new Error();
      const owners = users.data.users
        .filter(
          (user) =>
            tracked.some((item) => item.id === user.id) &&
            user.user_metadata?.secretlove_fixture === true &&
            /^secretlove-test-[0-9a-f-]{36}@example\.com$/.test(user.email ?? ''),
        )
        .map((user) => user.id);
      if (!owners.length) throw new Error();
      const parents = await service
        .from('letters')
        .select('id,owner_id')
        .in('owner_id', owners)
        .is('deleted_at', null)
        .limit(100);
      if (parents.error) throw new Error();
      if (!parents.data?.length) {
        console.info('Live modern Storage NOT TESTED: no active tracked synthetic letter.');
        context.skip('No active tracked synthetic letters; no live fixture was created.');
      }
      const assets = await service
        .from('letter_assets')
        .select('id,letter_id,object_path,byte_size')
        .in(
          'letter_id',
          parents.data!.map((letter) => letter.id),
        )
        .eq('status', 'ready')
        .limit(1);
      if (assets.error) throw new Error();
      if (!assets.data?.length) {
        console.info('Live modern Storage NOT TESTED: no reusable ready synthetic audio.');
        context.skip('No reusable ready synthetic audio; live media compatibility NOT TESTED.');
      }
      const selected = assets.data![0];
      const parent = parents.data!.find((letter) => letter.id === selected.letter_id)!;
      if (selected.object_path !== `${parent.owner_id}/${parent.id}/${selected.id}.mp3`)
        throw new Error();
      const flags = await service.rpc(
        'sl_ingest_flags',
        { a: parent.owner_id, lid: parent.id },
        { get: true },
      );
      if (flags.error) throw new Error();

      // Inspect the actual production helper's outgoing direct Storage headers,
      // using boolean assertions so failures cannot print a live credential.
      let transfers = 0;
      vi.stubGlobal('fetch', async (input: RequestInfo | URL, options?: RequestInit) => {
        const upstream = new URL(input instanceof Request ? input.url : input.toString());
        if (
          upstream.origin !== url ||
          !upstream.pathname.startsWith('/storage/v1/object/authenticated/letter-assets/')
        )
          throw new Error();
        const headers = new Headers(options?.headers);
        expect(headers.get('apikey') === key).toBe(true);
        expect(headers.get('authorization') === null).toBe(true);
        expect(headers.get('cookie') === null).toBe(true);
        transfers++;
        return originalFetch(input, options);
      });
      const asset = { path: selected.object_path, size: selected.byte_size };
      const full = await audioResponse(new Request('https://operator.invalid/audio'), asset);
      open.push(full);
      expect(full.status).toBe(200);
      expect(full.headers.get('content-length')).toBeNull();
      expect(full.headers.get('cache-control')).toContain('no-store');
      expect(full.headers.get('location')).toBeNull();
      const bytes = Buffer.from(await full.arrayBuffer());
      expect(bytes.length === asset.size).toBe(true);
      const end = Math.min(63, asset.size - 1);
      const range = await audioResponse(
        new Request('https://operator.invalid/audio', { headers: { range: `bytes=0-${end}` } }),
        asset,
      );
      open.push(range);
      expect(range.status).toBe(206);
      expect(range.headers.get('content-range')).toBe(`bytes 0-${end}/${asset.size}`);
      expect(Buffer.from(await range.arrayBuffer()).equals(bytes.subarray(0, end + 1))).toBe(true);
      for (const response of [full, range]) {
        const headers = JSON.stringify([...response.headers]);
        expect(headers.includes(key)).toBe(false);
        expect(headers.includes(asset.path)).toBe(false);
      }
      const head = await audioResponse(
        new Request('https://operator.invalid/audio', { method: 'HEAD' }),
        asset,
      );
      expect(head.status).toBe(200);
      expect(head.headers.get('content-length')).toBe(String(asset.size));
      expect(head.body).toBeNull();
      const invalid = await audioResponse(
        new Request('https://operator.invalid/audio', { headers: { range: 'bytes=0-1,3-4' } }),
        asset,
      );
      expect(invalid.status).toBe(416);
      expect(transfers).toBe(2);
      const denied = await originalFetch(
        new URL(`/storage/v1/object/authenticated/letter-assets/${asset.path}`, url),
        {
          headers: { apikey: publicKey, range: `bytes=0-${end}` },
          cache: 'no-store',
          redirect: 'manual',
          signal: AbortSignal.timeout(15000),
        },
      );
      open.push(denied);
      expect(denied.ok).toBe(false);
      expect(denied.headers.get('content-type')?.startsWith('audio/')).toBe(false);
    } catch (error) {
      // Preserve intentional skip; never bubble provider errors/URLs/credentials.
      if (context.task.result?.state === 'skip') throw error;
      throw new Error(
        'Read-only live modern-key verification failed; provider details and credentials withheld.',
      );
    } finally {
      for (const response of open) await response.body?.cancel().catch(() => {});
      vi.unstubAllGlobals();
    }
  },
  90000,
);
