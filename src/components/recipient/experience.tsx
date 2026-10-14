'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, MotionConfig, motion, useReducedMotion } from 'motion/react';
import { Heart, LockKeyhole, ArrowLeft, ArrowRight, X } from 'lucide-react';
import { ApiError } from '@/lib/client-api';
import { availableScenes, type RecipientContent } from '@/lib/experience/types';
import { SceneRenderer } from './scenes';
import { Decorations } from './decorations';
import { MusicPlayer } from '@/components/music-player';
import './recipient.css';
type Phase = 'welcome' | 'verify' | 'active' | 'expired' | 'unavailable' | 'closed';
export function RecipientExperience({ shareToken }: { shareToken: string }) {
  const base = `/api/recipient/${encodeURIComponent(shareToken)}`;
  const [phase, setPhase] = useState<Phase>('welcome');
  const [available, setAvailable] = useState(false);
  const [passRequired, setPassRequired] = useState(false);
  const [content, setContent] = useState<RecipientContent | null>(null);
  const [slot, setSlot] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [name, setName] = useState('');
  const [dob, setDob] = useState('');
  const [passphrase, setPassphrase] = useState('');
  const generation = useRef(0);
  const work = useRef(new Set<AbortController>());
  const pending = useRef(false);
  const revalidating = useRef(false);
  const heading = useRef<HTMLDivElement>(null);
  const soundtrackStart = useRef<(() => void) | null>(null);
  const reducedMotion = useReducedMotion() ?? true;
  const invalidate = useCallback(() => {
    generation.current++;
    work.current.forEach((controller) => controller.abort());
    work.current.clear();
  }, []);
  const reset = useCallback(
    (next: Phase, message = '') => {
      invalidate();
      setContent(null);
      setPhase(next);
      setSlot(0);
      setError(message);
      setPassphrase('');
      setName('');
      setDob('');
    },
    [invalidate],
  );
  const request = useCallback(
    async <T,>(action: string, method = 'GET', body?: unknown): Promise<T> => {
      const controller = new AbortController();
      work.current.add(controller);
      try {
        const response = await fetch(`${base}/${action}`, {
          method,
          credentials: 'same-origin',
          cache: 'no-store',
          signal: controller.signal,
          headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
          body: body === undefined ? undefined : JSON.stringify(body),
        });
        if (response.status === 204) return undefined as T;
        const result = await response.json();
        if (!response.ok)
          throw new ApiError(result.error?.message ?? 'Please try again.', response.status);
        return result.data as T;
      } finally {
        work.current.delete(controller);
      }
    },
    [base],
  );
  useEffect(() => {
    const current = ++generation.current;
    request<{ available: true; passphraseRequired: boolean }>('bootstrap')
      .then((data) => {
        if (current !== generation.current) return;
        setAvailable(true);
        setPassRequired(data.passphraseRequired);
      })
      .catch((err) => {
        if (current !== generation.current) return;
        setError(
          err instanceof ApiError && err.status === 404
            ? 'This gift is no longer available.'
            : 'This gift could not load. Please refresh and try again.',
        );
        setPhase('unavailable');
      });
    return invalidate;
  }, [request, invalidate]);
  const revalidate = useCallback(async () => {
    if (revalidating.current) return;
    revalidating.current = true;
    const current = generation.current;
    try {
      await request<RecipientContent>('content');
    } catch (err) {
      if (current !== generation.current) return;
      reset(
        err instanceof ApiError && err.status === 404 ? 'unavailable' : 'expired',
        err instanceof ApiError && err.status === 401
          ? 'Your access has ended. Unlock the letter again to continue.'
          : 'Access could not be confirmed. Unlock again when the service is available.',
      );
    } finally {
      revalidating.current = false;
    }
  }, [request, reset]);
  useEffect(() => {
    if (!content || phase !== 'active') return;
    const remaining = Date.parse(content.expiresAt) - Date.now();
    const expiry = setTimeout(
      () => reset('expired', 'Your reading session has ended. Unlock again to continue.'),
      Math.max(0, remaining),
    );
    const poll = setInterval(() => {
      void revalidate();
    }, 45000);
    const visibility = () => {
      if (document.visibilityState === 'visible') void revalidate();
    };
    window.addEventListener('focus', visibility);
    document.addEventListener('visibilitychange', visibility);
    return () => {
      clearTimeout(expiry);
      clearInterval(poll);
      window.removeEventListener('focus', visibility);
      document.removeEventListener('visibilitychange', visibility);
    };
  }, [content, phase, revalidate, reset]);
  useEffect(() => {
    heading.current?.focus();
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [slot, phase]);
  async function unlock(resume = false) {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    setError('');
    const current = generation.current;
    try {
      if (!resume)
        await request('verify', 'POST', {
          name,
          dateOfBirth: dob,
          ...(passphrase ? { passphrase } : {}),
        });
      const data = await request<RecipientContent>('content');
      if (current !== generation.current) return;
      setContent(data);
      setPhase('active');
      setSlot(0);
      setName('');
      setDob('');
      setPassphrase('');
    } catch (err) {
      if (current !== generation.current) return;
      if (err instanceof ApiError && err.status === 404)
        reset('unavailable', 'This gift is no longer available.');
      else {
        setError(err instanceof Error ? err.message : 'Please try again.');
        if (resume) setPhase('verify');
      }
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  async function close() {
    reset('closed');
    setBusy(true);
    try {
      await request('session', 'DELETE');
    } catch {
      setError(
        'The letter is closed here, but the server could not confirm revocation. Retry Close before leaving.',
      );
    } finally {
      setBusy(false);
    }
  }
  const scenes = content ? availableScenes(content) : [];
  const scene = scenes[slot];
  const move = (index: number) => {
    soundtrackStart.current?.();
    setSlot(Math.max(0, Math.min(scenes.length - 1, index)));
  };
  const labels = {
    envelope: 'Envelope',
    heart: 'Heartbeat',
    gallery: 'Memories',
    letter: 'Letter',
    'final-message': 'Closing',
  };
  return (
    <MotionConfig reducedMotion="user">
      <main
        className={`sl-experience${phase === 'active' && scene?.kind === 'heart' ? ' sl-cosmic' : ''}`}
        style={
          content
            ? ({
                '--sl-primary': content.presentation.configuration.theme?.colors?.primary,
                '--sl-paper': content.presentation.configuration.theme?.colors?.surface,
              } as React.CSSProperties)
            : undefined
        }
      >
        {!(phase === 'active' && scene?.kind === 'heart') && <Decorations />}
        <header className="sl-header">
          <Link href="/" prefetch={false} className="sl-brand">
            <Heart size={18} strokeWidth={1.2} /> SecretLove
          </Link>
          <span className="sl-header-note">A private little moment</span>
          {phase === 'active' && (
            <button className="sl-close" onClick={() => void close()} aria-label="Close letter">
              <X size={17} />
              <span>Close</span>
            </button>
          )}
        </header>
        <div
          className="sl-stage"
          ref={heading}
          tabIndex={-1}
          aria-label={phase === 'active' && scene ? labels[scene.kind] : 'Private gift'}
        >
          {phase === 'active' && content && scene ? (
            <>
              <nav className="sl-progress" aria-label="Reading scenes">
                {scenes.map((item, index) => (
                  <button
                    key={item.slotId}
                    aria-current={index === slot ? 'step' : undefined}
                    aria-label={`Go to ${labels[item.kind]}`}
                    onClick={() => move(index)}
                  >
                    <span>{String(index + 1).padStart(2, '0')}</span>
                    <em>{labels[item.kind]}</em>
                  </button>
                ))}
              </nav>
              <AnimatePresence mode="wait" initial={false}>
                {/* Player lives outside this keyed scene boundary. */}
                <motion.div
                  key={scene.slotId}
                  initial={{ opacity: 0, y: reducedMotion ? 0 : 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: reducedMotion ? 0 : 0.35 }}
                >
                  <SceneRenderer
                    scene={scene}
                    content={content}
                    reducedMotion={reducedMotion}
                    photoUrl={(id) => `${base}/photos/${id}/media`}
                    next={() => move(slot + 1)}
                    replay={() => move(0)}
                    mediaError={() => void revalidate()}
                    interact={() => soundtrackStart.current?.()}
                  />
                </motion.div>
              </AnimatePresence>
              {content.presentation.configuration.music?.enabled &&
                content.presentation.configuration.music.assetId && (
                  <MusicPlayer
                    background
                    startRef={soundtrackStart}
                    key={content.presentation.configuration.music.assetId}
                    source={`${base}/audio/${content.presentation.configuration.music.assetId}/media`}
                    music={content.presentation.configuration.music}
                    onFailure={() => void revalidate()}
                  />
                )}
              <nav className="sl-navigation" aria-label="Scene navigation">
                <button
                  className="sl-link-button"
                  disabled={slot === 0}
                  onClick={() => move(slot - 1)}
                >
                  <ArrowLeft size={16} /> Back
                </button>
                <span>
                  {slot + 1} / {scenes.length}
                </span>
                {slot < scenes.length - 1 ? (
                  <button className="sl-link-button" onClick={() => move(slot + 1)}>
                    {scene.kind === 'envelope' || scene.kind === 'heart' ? 'Skip' : 'Next'}
                    <ArrowRight size={16} />
                  </button>
                ) : (
                  <button className="sl-link-button" onClick={() => void close()}>
                    Close letter
                    <X size={16} />
                  </button>
                )}
              </nav>
            </>
          ) : phase === 'verify' || phase === 'expired' ? (
            <section className="sl-unlock sl-centered">
              <div className="sl-small-icon">
                <LockKeyhole size={25} />
              </div>
              <p className="sl-eyebrow">A few details, a little closer</p>
              <h1>Unlock your letter</h1>
              <p className="sl-copy">Enter the details your sender chose for this gift.</p>
              {error && (
                <p className="sl-alert" role="alert">
                  {error}
                </p>
              )}
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  void unlock();
                }}
              >
                <label htmlFor="recipient-name">Full name</label>
                <input
                  id="recipient-name"
                  autoComplete="name"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  maxLength={100}
                  required
                  disabled={busy}
                />
                <label htmlFor="recipient-dob">Date of birth</label>
                <input
                  id="recipient-dob"
                  type="date"
                  min="1900-01-01"
                  max={new Date().toISOString().slice(0, 10)}
                  value={dob}
                  onChange={(event) => setDob(event.target.value)}
                  required
                  disabled={busy}
                />
                {passRequired && (
                  <>
                    <label htmlFor="recipient-passphrase">Secret passphrase</label>
                    <input
                      id="recipient-passphrase"
                      type="password"
                      autoComplete="off"
                      value={passphrase}
                      onChange={(event) => setPassphrase(event.target.value)}
                      maxLength={128}
                      disabled={busy}
                    />
                  </>
                )}
                <button type="submit" className="sl-button" disabled={busy}>
                  {busy ? 'Checking your gift…' : 'Unlock the gift'}
                  <ArrowRight size={16} />
                </button>
              </form>
              <p className="sl-assurance">
                Name and date of birth offer limited protection. Someone who knows these details may
                also unlock the letter.
              </p>
            </section>
          ) : phase === 'closed' || phase === 'unavailable' ? (
            <section className="sl-centered sl-welcome">
              <div className="sl-small-icon">
                <Heart size={28} />
              </div>
              <p className="sl-eyebrow">SecretLove</p>
              <h1>{phase === 'closed' ? 'A moment, held close' : 'This gift is unavailable'}</h1>
              <p className="sl-copy">
                {phase === 'closed'
                  ? busy
                    ? 'Closing your reading session…'
                    : 'Your letter is closed here. Keep the feeling with you.'
                  : error}
              </p>
              {phase === 'closed' && error && (
                <p className="sl-alert" role="alert">
                  {error}
                  <button className="sl-link-button" disabled={busy} onClick={() => void close()}>
                    Retry Close
                  </button>
                </p>
              )}
              {phase === 'closed' && (
                <button className="sl-button" disabled={busy} onClick={() => setPhase('verify')}>
                  Unlock again
                </button>
              )}
            </section>
          ) : (
            <section className="sl-welcome sl-centered">
              <div className="sl-welcome-envelope" aria-hidden="true">
                <span className="sl-envelope-front" />
                <span className="sl-envelope-flap" />
                <span className="sl-wax-seal">
                  <Heart size={22} fill="currentColor" />
                </span>
              </div>
              <p className="sl-eyebrow">Some words are meant just for a moment</p>
              <h1>
                A little mystery.
                <br />
                <i>A lot of heart.</i>
              </h1>
              <p className="sl-copy">
                Someone has left a gift of words.
                <br />
                Take a breath. Let the story unfold.
              </p>
              <button
                className="sl-button"
                disabled={!available}
                onClick={() => setPhase('verify')}
              >
                Unlock your gift
                <ArrowRight size={16} />
              </button>
              <button
                className="sl-resume"
                disabled={!available || busy}
                onClick={() => void unlock(true)}
              >
                Already unlocked? Continue reading
              </button>
            </section>
          )}
        </div>
        <footer className="sl-footer">
          <Heart size={12} />
          <span>Made for words that matter</span>
        </footer>
      </main>
    </MotionConfig>
  );
}
