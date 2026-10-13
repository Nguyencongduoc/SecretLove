'use client';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api, ApiError } from '@/lib/client-api';
import type { Letter, Photo } from '@/lib/types';
import { MessageEditor } from './message-editor';
export function LetterEditor({ initial }: { initial: Letter }) {
  const [letter, setLetter] = useState(initial);
  const [title, setTitle] = useState(initial.title);
  const [displayName, setDisplayName] = useState(initial.recipientDisplayName ?? '');
  const [body, setBody] = useState(initial.bodyDoc);
  const [template, setTemplate] = useState(initial.templateId);
  const [gateName, setGateName] = useState('');
  const [dob, setDob] = useState('');
  const [passAction, setPassAction] = useState('keep');
  const [passphrase, setPassphrase] = useState('');
  const [altText, setAltText] = useState('');
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [stale, setStale] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const locked = useRef(false);
  const router = useRouter();
  const readonly = letter.status !== 'draft';
  const disabled = busy || stale || readonly;
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);
  async function mutate(work: () => Promise<void>) {
    if (locked.current || stale) return;
    locked.current = true;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await work();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'This change could not finish.');
      if (!(err instanceof ApiError) || err.status === 409 || err.status >= 500) setStale(true);
    } finally {
      locked.current = false;
      setBusy(false);
    }
  }
  async function save(event: React.FormEvent) {
    event.preventDefault();
    await mutate(async () => {
      const updated = await api<Letter>(`/api/letters/${letter.id}`, 'PATCH', {
        expectedVersion: letter.version,
        title,
        recipientDisplayName: displayName.trim() || null,
        bodyDoc: body,
        templateId: template,
        ...(gateName || dob ? { verification: { name: gateName, dateOfBirth: dob } } : {}),
        ...(passAction === 'keep'
          ? {}
          : {
              passphrase:
                passAction === 'remove'
                  ? { action: 'remove' }
                  : { action: 'set', value: passphrase },
            }),
      });
      setLetter(updated);
      setDirty(false);
      setGateName('');
      setDob('');
      setPassphrase('');
      setPassAction('keep');
      setNotice('Your letter is saved.');
    });
  }
  function changed() {
    setDirty(true);
    setNotice('');
  }
  const path = `/api/letters/${letter.id}`;
  return (
    <main className="py-10">
      <Link
        className="hint underline"
        href="/studio"
        onClick={(event) => {
          if (dirty && !window.confirm('Leave without saving your changes?'))
            event.preventDefault();
        }}
      >
        ← Your letters
      </Link>
      <div className="my-7 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl">Make it personal</h1>
          <p className="hint mt-3">
            {dirty ? 'You have unsaved changes.' : 'Your saved letter is private.'}
          </p>
        </div>
        {!dirty && !busy && !stale && (
          <Link className="button secondary" href={`/studio/letters/${letter.id}/preview`}>
            Preview saved letter
          </Link>
        )}
      </div>
      {error && (
        <p className="notice mb-5" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className="notice mb-5" role="status">
          {notice}
        </p>
      )}
      {stale && (
        <div className="notice mb-5">
          <p>
            Your changes are still in this form. Copy anything you want to keep before reloading the
            saved letter.
          </p>
          <button
            type="button"
            className="button secondary mt-3"
            onClick={() => {
              if (!dirty || window.confirm('Reload and discard unsaved changes?'))
                window.location.reload();
            }}
          >
            Reload saved letter
          </button>
        </div>
      )}
      {readonly && <p className="notice mb-5">This published letter is read-only.</p>}
      <form onSubmit={save}>
        <fieldset disabled={disabled} className="grid min-w-0 gap-6 lg:grid-cols-[1fr_320px]">
          <div className="space-y-6">
            <section className="panel space-y-5">
              <div>
                <label htmlFor="letter-title" className="label">
                  Title
                </label>
                <input
                  id="letter-title"
                  className="field"
                  value={title}
                  maxLength={120}
                  required
                  onChange={(event) => {
                    setTitle(event.target.value);
                    changed();
                  }}
                />
              </div>
              <div>
                <label htmlFor="display-name" className="label">
                  Recipient greeting name
                </label>
                <input
                  id="display-name"
                  className="field"
                  value={displayName}
                  maxLength={120}
                  onChange={(event) => {
                    setDisplayName(event.target.value);
                    changed();
                  }}
                />
                <p className="hint mt-2">The name that appears in your letter.</p>
              </div>
            </section>
            <section className="panel">
              <h2 className="mb-5 text-2xl">Your words</h2>
              <MessageEditor
                initial={initial.bodyDoc}
                disabled={disabled}
                onChange={(value) => {
                  setBody(value);
                  changed();
                }}
              />
              <p className="hint mt-3">Up to 10,000 characters. A few honest words are enough.</p>
            </section>
          </div>
          <aside className="space-y-6">
            <section className="panel">
              <h2 className="mb-5 text-2xl">The mood</h2>
              <label className="label" htmlFor="template">
                Letter template
              </label>
              <select
                id="template"
                className="field"
                value={template}
                onChange={(event) => {
                  setTemplate(event.target.value as Letter['templateId']);
                  changed();
                }}
              >
                <option value="rose">Rose · warm and romantic</option>
                <option value="minimal">Minimal · calm and simple</option>
              </select>
            </section>
            <section className="panel space-y-4">
              <h2 className="text-2xl">Recipient details</h2>
              <p className="hint">
                {letter.verificationConfigured
                  ? 'Verification is configured. Leave both fields blank to keep it.'
                  : 'Add a name and date of birth for future sharing.'}{' '}
                Name and birthday provide low security; they do not prove identity.
              </p>
              <div>
                <label className="label" htmlFor="gate-name">
                  Verification name
                </label>
                <input
                  className="field"
                  id="gate-name"
                  value={gateName}
                  maxLength={120}
                  autoComplete="off"
                  onChange={(event) => {
                    setGateName(event.target.value);
                    changed();
                  }}
                />
              </div>
              <div>
                <label className="label" htmlFor="dob">
                  Date of birth
                </label>
                <input
                  className="field"
                  id="dob"
                  type="date"
                  min="1900-01-01"
                  value={dob}
                  autoComplete="off"
                  onChange={(event) => {
                    setDob(event.target.value);
                    changed();
                  }}
                />
              </div>
              <p className="hint">Saved verification details are never displayed here.</p>
              <div>
                <label className="label" htmlFor="pass-action">
                  Optional secret passphrase
                </label>
                <select
                  className="field"
                  id="pass-action"
                  value={passAction}
                  onChange={(event) => {
                    setPassAction(event.target.value);
                    setPassphrase('');
                    changed();
                  }}
                >
                  <option value="keep">
                    {letter.passphraseRequired ? 'Keep existing passphrase' : 'No passphrase'}
                  </option>
                  <option value="set">Set a new passphrase</option>
                  {letter.passphraseRequired && <option value="remove">Remove passphrase</option>}
                </select>
              </div>
              {passAction === 'set' && (
                <div>
                  <label className="label" htmlFor="passphrase">
                    New passphrase
                  </label>
                  <input
                    className="field"
                    id="passphrase"
                    type="password"
                    autoComplete="new-password"
                    value={passphrase}
                    minLength={12}
                    maxLength={128}
                    required
                    onChange={(event) => {
                      setPassphrase(event.target.value);
                      changed();
                    }}
                  />
                  <p className="hint mt-2">
                    Use 12 or more characters. Share this separately from the letter link.
                  </p>
                </div>
              )}
            </section>
          </aside>
        </fieldset>
        <div className="my-6 flex flex-wrap items-center gap-4">
          <button className="button" disabled={disabled || !dirty}>
            {busy ? 'Working…' : 'Save changes'}
          </button>
          <p className="hint">Sharing will be added in the next milestone.</p>
        </div>
      </form>
      <section className="panel my-6">
        <h2 className="text-2xl">Photo memories</h2>
        <p className="hint mb-6 mt-3">
          Up to 6 private photos. Save your letter before changing photos.
        </p>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {letter.photos.map((photo) => (
            <PhotoCard
              key={photo.id}
              photo={photo}
              letterId={letter.id}
              disabled={disabled || dirty}
              onChange={(alt?: string) =>
                mutate(async () => {
                  const result = await api<{ version: string; photo?: Photo }>(
                    `${path}/photos/${photo.id}`,
                    alt === undefined ? 'DELETE' : 'PATCH',
                    {
                      expectedVersion: letter.version,
                      ...(alt === undefined ? {} : { altText: alt }),
                    },
                  );
                  setLetter((previous) => ({
                    ...previous,
                    version: result.version,
                    photos:
                      alt === undefined
                        ? previous.photos.filter((item) => item.id !== photo.id)
                        : previous.photos.map((item) =>
                            item.id === photo.id ? result.photo! : item,
                          ),
                  }));
                  setNotice(
                    alt === undefined
                      ? 'Photo removed. Private file cleanup is queued.'
                      : 'Photo description saved.',
                  );
                })
              }
            />
          ))}
        </div>
        {letter.photos.length === 0 && <p className="hint mb-5">No memories added yet.</p>}
        {letter.photos.length < 6 && (
          <form
            className="mt-6 space-y-4 border-t border-rose-100 pt-5"
            onSubmit={(event) => {
              event.preventDefault();
              const form = event.currentTarget;
              const data = new FormData(form);
              data.set('expectedVersion', letter.version);
              void mutate(async () => {
                const result = await api<{ version: string; photo: Photo }>(
                  `${path}/photos`,
                  'POST',
                  data,
                );
                setLetter((previous) => ({
                  ...previous,
                  version: result.version,
                  photos: [...previous.photos, result.photo],
                }));
                setAltText('');
                form.reset();
                setNotice('Your private photo is saved.');
              });
            }}
          >
            <fieldset disabled={disabled || dirty} className="space-y-4">
              <div>
                <label className="label" htmlFor="photo-file">
                  Choose a photo
                </label>
                <input
                  className="field"
                  id="photo-file"
                  name="file"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  required
                />
              </div>
              <div>
                <label className="label" htmlFor="photo-alt">
                  Describe this memory
                </label>
                <input
                  className="field"
                  id="photo-alt"
                  name="altText"
                  maxLength={200}
                  required
                  value={altText}
                  onChange={(event) => setAltText(event.target.value)}
                  placeholder="A description for anyone using a screen reader"
                />
              </div>
              <p className="hint">JPEG, PNG or WebP · up to 3 MiB · 4096 pixels per side.</p>
              <button className="button secondary">
                {busy ? 'Working…' : 'Upload private photo'}
              </button>
            </fieldset>
          </form>
        )}
      </section>
      <div className="flex flex-wrap items-center justify-between gap-4 py-6">
        <p className="hint">
          Deleting removes the letter immediately. Photo files are cleaned up separately.
        </p>
        <button
          className="button secondary"
          disabled={busy || stale}
          onClick={() => {
            if (window.confirm('Delete this letter and its memories? This cannot be undone.'))
              void mutate(async () => {
                await api(path, 'DELETE', { expectedVersion: letter.version });
                router.replace('/studio');
                router.refresh();
              });
          }}
        >
          Delete letter
        </button>
      </div>
    </main>
  );
}
function PhotoCard({
  photo,
  letterId,
  disabled,
  onChange,
}: {
  photo: Photo;
  letterId: string;
  disabled: boolean;
  onChange: (alt?: string) => Promise<void>;
}) {
  const [alt, setAlt] = useState(photo.altText);
  const [broken, setBroken] = useState(false);
  return (
    <div className="overflow-hidden rounded-xl border border-rose-100">
      {photo.status === 'ready' && !broken ? (
        <img
          className="aspect-[4/3] w-full object-cover"
          src={`/api/letters/${letterId}/photos/${photo.id}/media`}
          alt={photo.altText}
          onError={() => setBroken(true)}
        />
      ) : (
        <p className="hint flex aspect-[4/3] items-center justify-center bg-rose-50 p-5">
          {broken ? 'Photo could not load. Try reloading.' : 'Upload pending. Reload later.'}
        </p>
      )}
      <div className="space-y-3 p-4">
        <label className="label" htmlFor={`alt-${photo.id}`}>
          Memory description
        </label>
        <input
          id={`alt-${photo.id}`}
          className="field"
          maxLength={200}
          value={alt}
          disabled={disabled}
          onChange={(event) => setAlt(event.target.value)}
        />
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            className="button secondary"
            disabled={disabled || !alt.trim() || alt === photo.altText}
            onClick={() => void onChange(alt)}
          >
            Save description
          </button>
          <button
            type="button"
            className="text-sm text-rose-700 underline"
            disabled={disabled}
            onClick={() => {
              if (window.confirm('Remove this photo?')) void onChange();
            }}
          >
            Remove
          </button>
        </div>
      </div>
    </div>
  );
}
