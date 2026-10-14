'use client';
import { useEffect, useState } from 'react';
import type { Letter } from '@/lib/types';
import { api, ApiError } from '@/lib/client-api';
import { MusicPlayer } from './music-player';
import { AUDIO_HARD_MAX, AUDIO_MAX_SECONDS } from '@/lib/audio-limits';
import { uploadMusicInChunks } from '@/lib/client-music-upload';
export function MusicSection({
  letter,
  disabled,
  disabledReason,
  onChange,
  onDirty,
  run,
}: {
  letter: Letter;
  disabled: boolean;
  disabledReason?: string;
  onChange: (letter: Letter) => void;
  onDirty: (dirty: boolean) => void;
  run: (work: () => Promise<void>) => Promise<void>;
}) {
  const [enabled, setEnabled] = useState(letter.music.enabled),
    [volume, setVolume] = useState(letter.music.defaultVolume),
    [loop, setLoop] = useState(letter.music.loop);
  const [selected, setSelected] = useState(false),
    [pending, setPending] = useState<'upload' | 'save' | 'remove' | null>(null),
    [feedback, setFeedback] = useState(''),
    [error, setError] = useState('');
  const ready =
    letter.audioAsset?.status === 'ready' && letter.audioAsset.id === letter.music.assetId;
  const changed =
    enabled !== letter.music.enabled ||
    volume !== letter.music.defaultVolume ||
    loop !== letter.music.loop;
  const blockedReason = disabled
    ? (disabledReason ?? 'Music controls are unavailable until the current change finishes.')
    : !letter.audioAsset
      ? selected
        ? 'File selected, not uploaded. Click Upload private music before enabling the soundtrack.'
        : 'Upload a private MP3 track before enabling background music.'
      : letter.audioAsset.status !== 'ready'
        ? 'The track is not ready. Reload the saved letter to check the upload before enabling music.'
        : !ready
          ? 'The track attachment is unavailable. Reload the saved letter before changing music.'
          : '';
  function applySaved(updated: Letter) {
    onChange(updated);
    setEnabled(updated.music.enabled);
    setVolume(updated.music.defaultVolume);
    setLoop(updated.music.loop);
  }
  function perform(action: 'upload' | 'save' | 'remove', work: () => Promise<void>) {
    void run(async () => {
      setPending(action);
      setFeedback('');
      setError('');
      try {
        await work();
      } catch (problem) {
        setError(
          problem instanceof ApiError && problem.code === 'ORIGIN_DENIED'
            ? 'This address does not match APP_ORIGIN. Open the configured app address; LAN access requires an approved HTTPS configuration.'
            : problem instanceof Error
              ? problem.message
              : 'This music change could not finish. Please try again.',
        );
        // Keep the editor's version/conflict recovery and shared mutation lock.
        throw problem;
      } finally {
        setPending(null);
      }
    });
  }
  useEffect(() => {
    onDirty(changed);
  }, [changed, onDirty]);
  const path = `/api/letters/${letter.id}/music`;
  return (
    <section
      className="panel my-6 space-y-5"
      aria-label="Background music settings"
      aria-busy={pending !== null}
    >
      <h2 className="text-2xl">Background Music</h2>
      <p className="hint">
        Upload only music you own or have permission to share. One MP3, up to{' '}
        {AUDIO_HARD_MAX / 1048576} MiB and {AUDIO_MAX_SECONDS / 60} minutes. A configured server
        limit may be smaller.
      </p>
      {error && (
        <p className="notice" role="alert">
          {error}
        </p>
      )}
      <p className="hint" role="status" aria-live="polite">
        {pending === 'upload'
          ? feedback || 'Uploading and validating your private MP3…'
          : pending === 'save'
            ? 'Saving music settings…'
            : pending === 'remove'
              ? 'Removing the track…'
              : feedback ||
                (ready
                  ? letter.music.enabled
                    ? 'Background music is enabled. It starts after unlocking, or when the recipient opens the envelope if their browser requires another interaction.'
                    : 'Private track attached. Enable it, then save music settings for recipients.'
                  : 'No ready soundtrack is enabled.')}
      </p>
      {letter.audioUpload ? (
        <div className="space-y-3">
          <p className="hint">
            An unfinished private upload is reserved. Cancel it before starting another track.
            Private cleanup is queued separately.
          </p>
          <button
            type="button"
            className="button secondary"
            disabled={disabled}
            onClick={() =>
              perform('remove', async () => {
                applySaved(
                  await api<Letter>(`${path}/ingests/${letter.audioUpload!.id}`, 'DELETE'),
                );
                setFeedback('Pending upload cancelled. Private cleanup is queued.');
              })
            }
          >
            Cancel pending music upload
          </button>
        </div>
      ) : letter.audioAsset ? (
        <>
          <p className="hint">
            {letter.audioAsset.status === 'ready'
              ? `Private track · ${Math.ceil(letter.audioAsset.durationSeconds)} seconds`
              : 'Upload pending. Reload later.'}
          </p>
          {letter.audioAsset.status === 'ready' && (
            <MusicPlayer
              key={letter.audioAsset.id}
              preview
              source={`/api/letters/${letter.id}/audio/${letter.audioAsset.id}/media`}
              music={letter.music}
            />
          )}
          <button
            type="button"
            className="button secondary"
            disabled={disabled}
            onClick={() =>
              perform('remove', async () => {
                const updated = await api<Letter>(path, 'DELETE', {
                  expectedVersion: letter.version,
                });
                applySaved(updated);
                setFeedback(
                  'Track removed. Private file cleanup is queued. Upload a new MP3 to replace it.',
                );
              })
            }
          >
            Remove track to replace
          </button>
          <p className="hint">
            Removal clears the attachment immediately; private file cleanup runs separately.
          </p>
        </>
      ) : (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            const form = event.currentTarget,
              data = new FormData(form);
            data.set('expectedVersion', letter.version);
            perform('upload', async () => {
              applySaved(await uploadMusicInChunks(path, data, applySaved, setFeedback));
              setSelected(false);
              form.reset();
              setFeedback(
                'Track uploaded privately. Enable background music, then click Save music settings.',
              );
            });
          }}
        >
          <fieldset disabled={disabled} className="space-y-4">
            <label className="label" htmlFor="music-file">
              Choose an MP3
            </label>
            <input
              className="field"
              id="music-file"
              name="file"
              type="file"
              accept="audio/mpeg,.mp3"
              required
              onChange={(event) => {
                setSelected(Boolean(event.target.files?.length));
                setError('');
                setFeedback('');
              }}
            />
            <label className="flex gap-2">
              <input name="rightsAcknowledged" type="checkbox" value="true" required />I have
              permission to use and share this music.
            </label>
            <button className="button secondary" disabled={!selected}>
              {pending === 'upload' ? 'Uploading private music…' : 'Upload private music'}
            </button>
          </fieldset>
        </form>
      )}
      <form
        onSubmit={(event) => {
          event.preventDefault();
          perform('save', async () => {
            const updated = await api<Letter>(path, 'PATCH', {
              expectedVersion: letter.version,
              music: { ...letter.music, enabled, defaultVolume: volume, loop },
            });
            applySaved(updated);
            setFeedback(
              updated.music.enabled
                ? 'Music settings saved. The soundtrack starts after unlocking or opening the envelope, subject to browser permissions.'
                : 'Music settings saved. Background music is disabled; your private track stays attached.',
            );
          });
        }}
      >
        <fieldset
          disabled={disabled || !ready}
          className="space-y-4"
          aria-describedby="music-blocked-reason"
        >
          <label className="flex gap-2">
            <input
              type="checkbox"
              checked={enabled}
              onChange={(e) => {
                setEnabled(e.target.checked);
                setFeedback('');
              }}
            />
            Enable background music
          </label>
          <label className="flex flex-wrap items-center gap-3">
            Default volume
            <input
              aria-label="Default volume"
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={volume}
              onChange={(e) => {
                setVolume(Number(e.target.value));
                setFeedback('');
              }}
            />
            <span>{Math.round(volume * 100)}%</span>
          </label>
          <label className="flex gap-2">
            <input
              type="checkbox"
              checked={loop}
              onChange={(e) => {
                setLoop(e.target.checked);
                setFeedback('');
              }}
            />
            Loop background music
          </label>
          <button className="button secondary" disabled={!changed}>
            {pending === 'save' ? 'Saving music settings…' : 'Save music settings'}
          </button>
        </fieldset>
      </form>
      <p id="music-blocked-reason" className="hint">
        {blockedReason ||
          (!changed
            ? 'No unsaved music settings. Change Enable, volume or looping to save.'
            : 'Music changes are not saved yet. Save before previewing or publishing the letter.')}
      </p>
      <p className="hint">
        Recipient music starts after unlocking or opening the envelope, subject to browser
        permissions. Readers have no playback buttons in the letter; browser/device sound settings
        still apply. Disabling keeps your track attached.
      </p>
    </section>
  );
}
