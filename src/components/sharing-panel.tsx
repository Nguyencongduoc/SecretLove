'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/client-api';
import type { Letter } from '@/lib/types';
export function SharingPanel({
  letter,
  disabled,
  onChange,
  run,
}: {
  letter: Letter;
  disabled: boolean;
  onChange(letter: Letter): void;
  run(work: () => Promise<void>): Promise<void>;
}) {
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  useEffect(() => {
    if (letter.status !== 'published') return;
    let active = true;
    api<{ shareUrl: string }>(`/api/letters/${letter.id}/share`)
      .then((result) => {
        if (active) setUrl(result.shareUrl);
      })
      .catch(() => {
        if (active) setError('The sharing link could not load. Reload to try again.');
      });
    return () => {
      active = false;
    };
  }, [letter.id, letter.status]);
  async function publish() {
    await run(async () => {
      const result = await api<{ letter: Letter; shareUrl: string }>(
        `/api/letters/${letter.id}/publish`,
        'POST',
        { expectedVersion: letter.version },
      );
      onChange(result.letter);
      setUrl(result.shareUrl);
      setError('');
    });
  }
  async function unpublish() {
    if (!window.confirm('Unpublish and revoke this link and its reading sessions?')) return;
    await run(async () => {
      const result = await api<Letter>(`/api/letters/${letter.id}/unpublish`, 'POST', {
        expectedVersion: letter.version,
      });
      onChange(result);
      setUrl('');
      setNotice('Access revoked. Save changes before publishing a fresh link.');
    });
  }
  async function qr() {
    try {
      const QRCode = await import('qrcode');
      const data = await QRCode.toDataURL(url, {
        width: 768,
        margin: 3,
        errorCorrectionLevel: 'M',
      });
      const link = document.createElement('a');
      link.href = data;
      link.download = 'secretlove-qr.png';
      link.click();
      setNotice('QR downloaded. It contains only the sharing link.');
    } catch {
      setError('The QR could not be generated. Try again.');
    }
  }
  return (
    <section className="panel mb-6" aria-label="Publish and share">
      <h2 className="text-2xl">Send your little gift</h2>
      <p className="hint my-3">
        Publishing freezes the saved letter. Unpublish before editing; publishing again creates a
        fresh link. Name and birth date offer limited protection. Share an optional passphrase
        separately.
      </p>
      {error && (
        <p role="alert" className="notice mb-3">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="hint mb-3">
          {notice}
        </p>
      )}
      {letter.status === 'draft' ? (
        <button type="button" className="button" disabled={disabled} onClick={() => void publish()}>
          Publish saved letter
        </button>
      ) : (
        <>
          <label className="label" htmlFor="share-url">
            Private sharing link
          </label>
          <input className="field mb-4" id="share-url" value={url} readOnly />
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              className="button"
              disabled={!url || disabled}
              onClick={() => {
                void navigator.clipboard
                  .writeText(url)
                  .then(() => setNotice('Link copied.'))
                  .catch(() => setError('Copy the link from the field above.'));
              }}
            >
              Copy link
            </button>
            <button
              type="button"
              className="button secondary"
              disabled={!url || disabled}
              onClick={() => void qr()}
            >
              Download QR
            </button>
            <button
              type="button"
              className="button secondary"
              disabled={disabled}
              onClick={() => void unpublish()}
            >
              Unpublish and revoke
            </button>
          </div>
        </>
      )}
    </section>
  );
}
