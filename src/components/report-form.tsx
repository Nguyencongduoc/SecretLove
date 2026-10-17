'use client';
import { useState } from 'react';
import { api } from '@/lib/client-api';
import { shareTokenSchema } from '@/lib/validation/recipient';
export function ReportForm() {
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState('');
  return (
    <form
      className="space-y-5"
      onSubmit={async (e) => {
        e.preventDefault();
        if (busy) return;
        const f = new FormData(e.currentTarget);
        setBusy(true);
        setMessage('');
        try {
          let token = String(f.get('link') ?? '').trim();
          if (!shareTokenSchema.safeParse(token).success) {
            const url = new URL(token);
            if (
              url.origin !== location.origin ||
              !/^\/l\/[^/]+$/.test(url.pathname) ||
              url.search ||
              url.hash
            )
              throw new Error('Paste a SecretLove link from this site or its share token.');
            token = url.pathname.slice(3);
          }
          shareTokenSchema.parse(token);
          const r = await api<{ reference: string }>('/api/reports', 'POST', {
            shareToken: token,
            reason: f.get('reason'),
            description: f.get('description'),
          });
          setMessage(
            `Report received. Reference: ${r.reference}. Reports are reviewed by the owner; this does not automatically suspend a letter.`,
          );
        } catch (error) {
          setMessage(error instanceof Error ? error.message : 'Could not submit. Try later.');
        } finally {
          setBusy(false);
        }
      }}
    >
      <label className="label">
        Letter link or share token
        <input className="field" name="link" required maxLength={500} disabled={busy} />
      </label>
      <label className="label">
        Reason
        <select className="field" name="reason" disabled={busy}>
          <option value="unwanted_contact">Unwanted contact</option>
          <option value="harassment">Harassment</option>
          <option value="privacy">Privacy</option>
          <option value="other">Other</option>
        </select>
      </label>
      <label className="label">
        Description (optional)
        <textarea className="field" name="description" maxLength={1000} disabled={busy} />
      </label>
      <p>
        Do not include passwords, dates of birth, private letter contents or unrelated personal
        details. No attachments. Reports do not verify your identity.
      </p>
      <button className="button" disabled={busy}>
        {busy ? 'Submitting…' : 'Submit report'}
      </button>
      <p role="status">{message}</p>
    </form>
  );
}
