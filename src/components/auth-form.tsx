'use client';
import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/client-api';
type Mode = 'login' | 'signup' | 'recover' | 'reset';
const labels = {
  login: ['Welcome back', 'Sign in to your private studio.', 'Sign in'],
  signup: [
    'A space for your heart',
    'Create an account to begin your first letter.',
    'Create account',
  ],
  recover: [
    'Find your way back',
    'We’ll send a link to reset your password.',
    'Send recovery email',
  ],
  reset: ['A fresh start', 'Choose a new password for your studio.', 'Update password'],
};
export function AuthForm({ mode }: { mode: Mode }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const router = useRouter();
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError('');
    setMessage('');
    const form = new FormData(event.currentTarget);
    const payload = {
      ...(mode !== 'reset' ? { email: form.get('email') } : {}),
      ...(mode !== 'recover' ? { password: form.get('password') } : {}),
    };
    try {
      const result = await api<{ message?: string }>(`/api/auth/${mode}`, 'POST', payload);
      if (mode === 'login' || mode === 'reset') {
        router.replace('/studio');
        router.refresh();
      } else setMessage(result.message ?? 'Check your email.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Please try again.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
      <Link href="/" className="serif mb-12 text-center text-xl">
        ♡ SecretLove
      </Link>
      <div className="panel">
        <h1 className="text-3xl">{labels[mode][0]}</h1>
        <p className="hint mb-7 mt-3">{labels[mode][1]}</p>
        <form onSubmit={submit} className="space-y-5">
          {mode !== 'reset' && (
            <div>
              <label htmlFor="email" className="label">
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                maxLength={254}
                className="field"
                disabled={busy}
              />
            </div>
          )}
          {mode !== 'recover' && (
            <div>
              <label htmlFor="password" className="label">
                {mode === 'reset' ? 'New password' : 'Password'}
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                required
                minLength={mode === 'login' ? 1 : 12}
                maxLength={128}
                className="field"
                disabled={busy}
              />
              {mode !== 'login' && <p className="hint mt-2">Use at least 12 characters.</p>}
            </div>
          )}
          {error && (
            <p role="alert" className="notice">
              {error}
            </p>
          )}
          {message && (
            <p role="status" className="notice">
              {message}
            </p>
          )}
          <button className="button w-full" disabled={busy}>
            {busy ? 'Please wait…' : labels[mode][2]}
          </button>
        </form>
        {mode === 'login' && (
          <div className="hint mt-5 flex justify-between gap-4">
            <Link href="/recover">Forgot password?</Link>
            <Link href="/signup">Create account</Link>
          </div>
        )}
        {mode !== 'login' && (
          <Link className="hint mt-5 block text-center underline" href="/login">
            Back to sign in
          </Link>
        )}
      </div>
    </main>
  );
}
export function SignOut() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  return (
    <div>
      <button
        className="button secondary"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setError('');
          try {
            await api('/api/auth/logout', 'POST', {});
            router.replace('/login');
            router.refresh();
          } catch (err) {
            setError(err instanceof Error ? err.message : 'Sign out failed.');
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? 'Signing out…' : 'Sign out'}
      </button>
      {error && (
        <p role="alert" className="hint mt-2">
          {error}
        </p>
      )}
    </div>
  );
}
