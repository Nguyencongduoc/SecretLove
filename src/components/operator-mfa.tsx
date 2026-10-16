'use client';
import { createBrowserClient } from '@supabase/ssr';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
export function OperatorMfa() {
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState('');
  const [factor, setFactor] = useState(''),
    [qr, setQr] = useState('');
  const router = useRouter();
  function client() {
    return createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    );
  }
  async function prepare(enroll: boolean) {
    if (busy) return;
    setBusy(true);
    setMessage('');
    setQr('');
    try {
      const c = client();
      const { data, error } = await c.auth.mfa.listFactors();
      if (error) throw new Error('Could not load factors. Sign in again.');
      const existing = data.totp.find((f) => f.status === 'verified');
      if (existing) {
        setFactor(existing.id);
        setMessage('Enter the code from your existing authenticator.');
      } else if (enroll) {
        // Reuse a pending enrollment rather than accumulating factors on retries.
        for (const pending of data.all.filter(
          (f) => f.factor_type === 'totp' && f.status === 'unverified',
        )) {
          const { error } = await c.auth.mfa.unenroll({ factorId: pending.id });
          if (error) throw new Error('Could not replace pending enrollment.');
        }
        const { data: r, error } = await c.auth.mfa.enroll({
          factorType: 'totp',
          friendlyName: 'SecretLove operator',
        });
        if (error) throw new Error('Could not enroll. Check provider MFA configuration.');
        setFactor(r.id);
        setQr(r.totp.qr_code);
        setMessage('Scan with your authenticator, then verify. Keep this enrollment QR private.');
      } else setMessage('No verified TOTP factor. Choose enrollment first.');
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'MFA unavailable.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-4">
        <button className="button" disabled={busy} onClick={() => prepare(false)}>
          Use existing authenticator
        </button>
        <button className="button secondary" disabled={busy} onClick={() => prepare(true)}>
          Enroll authenticator
        </button>
      </div>
      {qr && (
        <div role="img" aria-label="Private TOTP enrollment QR" className="max-w-64 bg-white p-3">
          {/* Provider SVG is embedded as an image, never executable markup. */}
          <img src={qr} alt="Private TOTP enrollment QR" width={240} height={240} />
        </div>
      )}
      {factor && (
        <form
          className="space-y-4"
          onSubmit={async (e) => {
            e.preventDefault();
            if (busy) return;
            const code = String(new FormData(e.currentTarget).get('code'));
            if (!/^\d{6}$/.test(code)) {
              setMessage('Enter six digits.');
              return;
            }
            setBusy(true);
            try {
              const { error } = await client().auth.mfa.challengeAndVerify({
                factorId: factor,
                code,
              });
              if (error) throw new Error('Verification failed. Try a fresh code.');
              setQr('');
              router.replace('/operator');
              router.refresh();
            } catch (e) {
              setMessage(e instanceof Error ? e.message : 'Verification unavailable.');
            } finally {
              setBusy(false);
            }
          }}
        >
          <label className="label">
            Authenticator code
            <input
              className="field"
              name="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6}"
              maxLength={6}
              required
              disabled={busy}
            />
          </label>
          <button className="button" disabled={busy}>
            Verify
          </button>
        </form>
      )}
      <p role="status">{message}</p>
    </div>
  );
}
