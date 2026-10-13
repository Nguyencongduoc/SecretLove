'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/client-api';
export function NewLetter() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  return (
    <form
      className="panel space-y-5"
      onSubmit={async (event) => {
        event.preventDefault();
        if (busy) return;
        const form = new FormData(event.currentTarget);
        setBusy(true);
        setError('');
        try {
          const result = await api<{ id: string }>('/api/letters', 'POST', {
            title: form.get('title'),
          });
          router.push(`/studio/letters/${result.id}`);
          router.refresh();
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Could not create this letter.');
          setBusy(false);
        }
      }}
    >
      <div>
        <label htmlFor="title" className="label">
          Letter title
        </label>
        <input
          id="title"
          name="title"
          className="field"
          required
          maxLength={120}
          placeholder="A name for this little moment"
          disabled={busy}
        />
        <p className="hint mt-2">This title is for your studio.</p>
      </div>
      {error && (
        <p role="alert" className="notice">
          {error}
        </p>
      )}
      <button className="button" disabled={busy}>
        {busy ? 'Creating…' : 'Create letter'}
      </button>
    </form>
  );
}
