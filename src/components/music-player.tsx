'use client';
import {
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type RefObject,
} from 'react';
import type { MusicConfiguration } from '@/lib/validation/music';
/** One authorized player outside keyed scenes; owner audition or recipient soundtrack. */
export function MusicPlayer({
  source,
  music,
  preview = false,
  onFailure,
  background = false,
  startRef,
}: {
  source: string;
  music: MusicConfiguration;
  preview?: boolean;
  onFailure?: () => void;
  background?: boolean;
  startRef?: RefObject<(() => void) | null>;
}) {
  const audio = useRef<HTMLAudioElement>(null),
    generation = useRef(0),
    wanted = useRef(false);
  const failure = useRef(onFailure);
  const volumeRestricted = useRef(false);
  const blocked = useRef(false);
  const [playing, setPlaying] = useState(false),
    [loading, setLoading] = useState(false),
    [started, setStarted] = useState(false);
  const [volume, setVolume] = useState(music.defaultVolume),
    [muted, setMuted] = useState(false),
    [message, setMessage] = useState(''),
    [deviceVolume, setDeviceVolume] = useState(false);
  useEffect(() => {
    failure.current = onFailure;
  }, [onFailure]);
  useEffect(() => {
    const element = audio.current;
    if (!element) return;
    try {
      element.volume = music.defaultVolume;
      volumeRestricted.current = Math.abs(element.volume - music.defaultVolume) > 0.01;
    } catch {
      volumeRestricted.current = true;
    }
  }, [music.defaultVolume]);
  useEffect(() => {
    if (audio.current) audio.current.loop = music.loop;
  }, [music.loop]);
  useEffect(() => {
    const element = audio.current;
    if (!element) return;
    const lifecycle = generation;
    return () => {
      lifecycle.current++;
      wanted.current = false;
      element.pause();
      element.removeAttribute('src');
      element.load();
    };
  }, [source]);
  const play = useCallback(async () => {
    const element = audio.current;
    if (!element) return;
    if (background && wanted.current) return;
    blocked.current = false;
    const current = ++generation.current;
    setDeviceVolume(volumeRestricted.current);
    wanted.current = true;
    setLoading(true);
    setMessage('');
    if (!element.canPlayType('audio/mpeg')) {
      wanted.current = false;
      setLoading(false);
      setMessage('This browser cannot play MP3 music. You can keep reading.');
      failure.current?.();
      return;
    }
    if (!element.getAttribute('src')) element.src = source;
    else if (element.error) element.load();
    try {
      await element.play();
      if (current !== generation.current) return;
      setStarted(true);
    } catch (error) {
      if (current !== generation.current) return;
      wanted.current = false;
      setLoading(false);
      setPlaying(false);
      const denied = error instanceof DOMException && error.name === 'NotAllowedError';
      blocked.current = denied;
      setMessage(
        denied
          ? background
            ? 'Your browser needs another interaction for sound. Open the envelope or continue the story to start the soundtrack.'
            : 'Playback was blocked. Press Play again to allow music.'
          : 'Music could not play. You can keep reading or try again.',
      );
      if (!denied) failure.current?.();
    }
  }, [source, background]);
  useImperativeHandle(
    startRef,
    () => () => {
      if (blocked.current) void play();
    },
    [play],
  );
  useEffect(() => {
    if (!background) return;
    let mounted = true;
    // The host only mounts after a user-initiated unlock/resume is authorized.
    // Rejection is handled honestly; later scene interactions can retry once.
    void Promise.resolve().then(() => {
      if (mounted) void play();
    });
    return () => {
      mounted = false;
    };
  }, [background, play]);
  function pause() {
    generation.current++;
    wanted.current = false;
    audio.current?.pause();
    setLoading(false);
  }
  function changeVolume(value: number) {
    const element = audio.current;
    if (!element) return;
    try {
      element.volume = value;
      setDeviceVolume(Math.abs(element.volume - value) > 0.01);
      setVolume(element.volume);
    } catch {
      setDeviceVolume(true);
    }
  }
  return (
    <section
      className={background ? 'sl-soundtrack-status' : 'sl-music panel my-5 space-y-3'}
      aria-label={preview ? 'Creator music preview' : 'Background music'}
    >
      {!background && (
        <p className="text-sm">
          {preview ? 'Preview your private track' : 'A soundtrack for this moment'}
        </p>
      )}
      <audio
        ref={audio}
        preload="none"
        controls={!background && deviceVolume}
        hidden={background}
        aria-label="Letter soundtrack"
        onPlaying={() => {
          if (!wanted.current && !audio.current?.controls) {
            audio.current?.pause();
            return;
          }
          setPlaying(true);
          wanted.current = true;
          setLoading(false);
          setStarted(true);
        }}
        onPause={() => setPlaying(false)}
        onWaiting={() => {
          if (wanted.current) setLoading(true);
        }}
        onEnded={() => {
          wanted.current = false;
          setPlaying(false);
          setLoading(false);
        }}
        onVolumeChange={() => {
          if (audio.current) {
            setVolume(audio.current.volume);
            setMuted(audio.current.muted);
          }
        }}
        onError={() => {
          if (!audio.current?.getAttribute('src')) return;
          blocked.current = false;
          audio.current.pause();
          wanted.current = false;
          setPlaying(false);
          setLoading(false);
          setMessage('Music could not load. You can keep reading or try again.');
          failure.current?.();
        }}
      />
      {!background && (
        <div className="flex flex-wrap items-center gap-4">
          <button
            type="button"
            className="button secondary"
            onClick={() => {
              if (playing || loading) pause();
              else void play();
            }}
            aria-label={
              playing || loading
                ? 'Pause music'
                : started
                  ? 'Play music'
                  : preview
                    ? 'Play preview'
                    : 'Open with music'
            }
          >
            {loading
              ? 'Loading… · Pause'
              : playing
                ? 'Pause music'
                : started
                  ? 'Play music'
                  : preview
                    ? 'Play preview'
                    : 'Open with music'}
          </button>
          <button
            type="button"
            className="button secondary"
            aria-pressed={muted}
            onClick={() => {
              if (audio.current) audio.current.muted = !audio.current.muted;
            }}
          >
            {muted ? 'Unmute music' : 'Mute music'}
          </button>
          <label className="flex items-center gap-2">
            Music volume
            <input
              aria-label="Music volume"
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={volume}
              onChange={(e) => changeVolume(Number(e.target.value))}
            />
          </label>
        </div>
      )}
      {!background && deviceVolume && (
        <p className="text-sm">
          This browser uses device volume. Use your device controls or the native player.
        </p>
      )}
      <p
        className={background && !message ? 'sr-only' : 'text-sm'}
        role="status"
        aria-live="polite"
      >
        {message ||
          (loading
            ? 'Loading music…'
            : playing
              ? 'Music is playing.'
              : background
                ? 'The soundtrack is not playing.'
                : 'Music is paused. Playback starts only when you choose it.')}
      </p>
    </section>
  );
}
