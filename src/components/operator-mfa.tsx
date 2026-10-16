'use client';
import { createBrowserClient } from '@supabase/ssr';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { enrollmentQr, parseTotpEnrollment, type TotpEnrollment } from '@/lib/mfa-enrollment';

export function OperatorMfa() {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [problem, setProblem] = useState('');
  const [factor, setFactor] = useState('');
  const [enrollment, setEnrollment] = useState<TotpEnrollment | null>(null);
  const [qr, setQr] = useState('');
  const [manual, setManual] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [code, setCode] = useState('');
  const [enrollBlocked, setEnrollBlocked] = useState(false);
  const inFlight = useRef(false);
  const mounted = useRef(false);
  const router = useRouter();
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  function client() {
    return createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    );
  }
  async function prepare(enroll: boolean) {
    if (inFlight.current || factor || (enroll && enrollBlocked)) return;
    inFlight.current = true;
    setBusy(true);
    setProblem('');
    setMessage('Checking authenticator status…');
    let stage: 'list' | 'enroll' | 'response' = 'list';
    try {
      const c = client();
      const { data, error } = await c.auth.mfa.listFactors();
      if (!mounted.current) return;
      if (error || !data) throw new Error();
      const existing = data.totp.find((f) => f.status === 'verified');
      if (existing) {
        setFactor(existing.id);
        setMessage('Enter the code from your existing authenticator.');
        return;
      }
      if (data.all.some((f) => f.factor_type === 'totp' && f.status === 'unverified')) {
        setEnrollBlocked(true);
        setMessage('');
        setProblem(
          'A pending authenticator setup already exists. It has not been removed. Contact the operator to review it before starting another setup.',
        );
        return;
      }
      if (!enroll) {
        setMessage('No verified TOTP factor. Choose enrollment first.');
        return;
      }
      stage = 'enroll';
      // A lost response may still leave a pending factor. Never blindly reenroll.
      setEnrollBlocked(true);
      const { data: result, error: enrollError } = await c.auth.mfa.enroll({
        factorType: 'totp',
        friendlyName: 'SecretLove operator',
      });
      if (!mounted.current) return;
      if (enrollError) throw new Error();
      stage = 'response';
      const details = parseTotpEnrollment(result);
      setFactor(details.factorId);
      setEnrollment(details);
      setMessage('Scan this QR or use the setup key for the same authenticator, then verify.');
      try {
        const image = await enrollmentQr(details);
        if (mounted.current) setQr(image);
      } catch {
        if (mounted.current) {
          setManual(true);
          setProblem('The QR could not be displayed. Use the setup key for this enrollment below.');
        }
      }
    } catch {
      if (mounted.current) {
        setMessage('');
        setProblem(
          stage === 'list'
            ? 'Could not load authenticator status. Check your session before trying again.'
            : stage === 'enroll'
              ? 'Could not confirm enrollment. Do not enroll again; ask the operator to review pending factors.'
              : 'The setup response could not be validated. Do not enroll again; ask the operator to review pending factors.',
        );
      }
    } finally {
      inFlight.current = false;
      if (mounted.current) setBusy(false);
    }
  }
  const digits = enrollment?.digits ?? 6;
  async function verify(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (inFlight.current || !factor) return;
    if (!new RegExp(`^\\d{${digits}}$`).test(code)) {
      setProblem(`Enter ${digits} digits from your authenticator.`);
      return;
    }
    inFlight.current = true;
    setBusy(true);
    setProblem('');
    setShowKey(false);
    let completed = false;
    try {
      const { error } = await client().auth.mfa.challengeAndVerify({ factorId: factor, code });
      if (!mounted.current) return;
      if (error) throw new Error();
      completed = true;
      setEnrollment(null);
      setQr('');
      setFactor('');
      setCode('');
      setManual(false);
      setShowKey(false);
      setMessage('Authenticator verified. Opening operator review…');
      router.replace('/operator');
      router.refresh();
    } catch {
      if (mounted.current) {
        setCode('');
        setProblem(
          'Verification could not be confirmed. Keep this authenticator setup; do not enroll again. Check the current code and session before another verification attempt.',
        );
      }
    } finally {
      // Lock actions while leaving after success; no duplicate factor can be created.
      if (!completed) {
        inFlight.current = false;
        if (mounted.current) setBusy(false);
      }
    }
  }
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-4">
        <button className="button" disabled={busy || !!factor} onClick={() => prepare(false)}>
          Use existing authenticator
        </button>
        <button
          className="button secondary"
          disabled={busy || !!factor || enrollBlocked}
          onClick={() => prepare(true)}
        >
          Enroll authenticator
        </button>
      </div>
      {qr && (
        <div className="w-full max-w-80 bg-white p-3">
          <img
            src={qr}
            alt="Private TOTP enrollment QR"
            width={320}
            height={320}
            className="block h-auto max-w-full"
            onError={() => {
              setQr('');
              setManual(true);
              setShowKey(false);
              setProblem(
                'The QR could not be displayed. Use the setup key for this enrollment below.',
              );
            }}
          />
        </div>
      )}
      {enrollment && (
        <section className="space-y-3" aria-label="Manual authenticator setup">
          <button
            type="button"
            className="button secondary"
            disabled={busy}
            aria-expanded={manual}
            aria-controls="totp-manual-setup"
            onClick={() => {
              setManual(!manual);
              setShowKey(false);
            }}
          >
            {manual ? 'Hide manual setup' : 'Cannot scan? Enter setup key'}
          </button>
          {manual && (
            <div id="totp-manual-setup" className="space-y-3">
              <p>
                In your authenticator, add an account using a setup key. Choose Time based. Keep
                this key and QR private; never send them to support.
              </p>
              <p className="break-words">Account: {enrollment.label}</p>
              <p>
                Settings: {enrollment.algorithm}, {enrollment.digits} digits, every{' '}
                {enrollment.period} seconds.
              </p>
              <label className="label" htmlFor="totp-setup-key">
                Private setup key
              </label>
              <input
                id="totp-setup-key"
                className="field"
                type={showKey ? 'text' : 'password'}
                value={enrollment.secret}
                readOnly
                autoComplete="off"
                spellCheck={false}
              />
              <button
                type="button"
                className="button secondary"
                disabled={busy}
                aria-pressed={showKey}
                onClick={() => setShowKey(!showKey)}
              >
                {showKey ? 'Hide setup key' : 'Show setup key'}
              </button>
            </div>
          )}
        </section>
      )}
      {factor && (
        <form className="space-y-4" onSubmit={verify}>
          <label className="label">
            Authenticator code
            <input
              className="field"
              name="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern={`[0-9]{${digits}}`}
              maxLength={digits}
              required
              disabled={busy}
              value={code}
              onChange={(event) => setCode(event.target.value)}
            />
          </label>
          <button className="button" disabled={busy}>
            Verify
          </button>
        </form>
      )}
      {problem && <p role="alert">{problem}</p>}
      <p role="status">{message}</p>
    </div>
  );
}
