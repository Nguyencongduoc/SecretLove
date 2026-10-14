'use client';
import { useState, useSyncExternalStore } from 'react';
import { HeartScene } from '@/components/recipient/scenes';
import {
  DEFAULT_HEART,
  HEART_PHRASE_LIMIT,
  HEART_RING_LIMIT,
  heartCustomizationSchema,
  type HeartCustomization,
} from '@/lib/validation/heart';
import { DEFAULT_SCENE_TEXT, type SceneText } from '@/lib/validation/scene-text';
import { resolveLegacyPresentation } from '@/lib/experience/configuration';
import type { RecipientContent } from '@/lib/experience/types';
import '@/components/recipient/recipient.css';

const motionQuery = '(prefers-reduced-motion: reduce)';
function subscribeMotion(change: () => void) {
  const query = window.matchMedia(motionQuery);
  query.addEventListener('change', change);
  return () => query.removeEventListener('change', change);
}
const browserMotion = () => window.matchMedia(motionQuery).matches;
const serverMotion = () => true;

export function HeartPreview({
  value,
  sceneText = DEFAULT_SCENE_TEXT,
}: {
  value: HeartCustomization;
  sceneText?: SceneText;
}) {
  // Hydrate the same static markup as the server, then honor live browser preferences.
  const reducedMotion = useSyncExternalStore(subscribeMotion, browserMotion, serverMotion);
  const presentation = resolveLegacyPresentation('rose');
  presentation.configuration.heartCustomization = value;
  const content: RecipientContent = {
    letterId: 'owner-preview',
    expiresAt: '',
    recipientDisplayName: '',
    bodyDoc: { type: 'doc', content: [] },
    templateId: 'rose',
    photos: [],
    sceneText,
    presentation,
  };
  return (
    <div
      className="sl-experience sl-cosmic sl-owner-heart-preview"
      aria-label="Private 3D heart preview"
    >
      <HeartScene
        content={content}
        options={{ presetId: 'pink-heart', pacing: 'gentle', scale: 1 }}
        reducedMotion={reducedMotion}
        photoUrl={() => ''}
        next={() => {}}
        replay={() => {}}
        mediaError={() => {}}
        interact={() => {}}
      />
    </div>
  );
}
export function HeartCustomizationFields({
  value,
  sceneText,
  onChange,
}: {
  value: HeartCustomization;
  sceneText: SceneText;
  onChange(value: HeartCustomization): void;
}) {
  const [preview, setPreview] = useState(false);
  const validation = heartCustomizationSchema.safeParse(value);
  return (
    <section className="panel space-y-5">
      <h2 className="text-2xl">3D Heart Customization</h2>
      <p className="hint">
        Up to five private Vietnamese or English phrases. Each phrase allows 60 Unicode characters.
      </p>
      <label className="label" htmlFor="heart-color">
        Heart color
      </label>
      <select
        id="heart-color"
        className="field"
        value={value.heart.color}
        onChange={(event) =>
          onChange({
            ...value,
            heart: {
              ...value.heart,
              color: event.target.value as HeartCustomization['heart']['color'],
            },
          })
        }
      >
        <option value="pink">Glowing pink</option>
        <option value="red">Rose red</option>
        <option value="purple">Soft purple</option>
      </select>
      <label className="flex gap-3">
        <input
          type="checkbox"
          checked={value.textRings.enabled}
          onChange={(event) =>
            onChange({ ...value, textRings: { ...value.textRings, enabled: event.target.checked } })
          }
        />
        Show rotating text rings
      </label>
      {value.textRings.phrases.map((phrase, index) => (
        <div key={index} className="space-y-2">
          <label className="label" htmlFor={`heart-phrase-${index}`}>
            Ring phrase {index + 1}
          </label>
          <input
            id={`heart-phrase-${index}`}
            className="field"
            value={phrase}
            required
            onChange={(event) =>
              onChange({
                ...value,
                textRings: {
                  ...value.textRings,
                  phrases: value.textRings.phrases.map((text, i) =>
                    i === index ? event.target.value : text,
                  ),
                },
              })
            }
          />
          <div className="flex justify-between gap-3">
            <span className="hint">
              {[...phrase.normalize('NFC')].length}/{HEART_PHRASE_LIMIT} characters
            </span>
            <button
              className="button secondary"
              type="button"
              onClick={() =>
                onChange({
                  ...value,
                  textRings: {
                    ...value.textRings,
                    phrases: value.textRings.phrases.filter((_, i) => i !== index),
                  },
                })
              }
            >
              Remove phrase {index + 1}
            </button>
          </div>
        </div>
      ))}
      {!value.textRings.phrases.length && (
        <p className="hint">
          Default phrases appear when rings are enabled and no custom phrases are saved.
        </p>
      )}
      <button
        className="button secondary"
        type="button"
        disabled={value.textRings.phrases.length >= HEART_RING_LIMIT}
        onClick={() =>
          onChange({
            ...value,
            textRings: { ...value.textRings, phrases: [...value.textRings.phrases, ''] },
          })
        }
      >
        Add ring phrase
      </button>
      <label className="label" htmlFor="heart-speed">
        Ring rotation speed
      </label>
      <select
        id="heart-speed"
        className="field"
        value={value.textRings.rotationSpeed}
        onChange={(event) =>
          onChange({
            ...value,
            textRings: {
              ...value.textRings,
              rotationSpeed: event.target.value as HeartCustomization['textRings']['rotationSpeed'],
            },
          })
        }
      >
        <option value="slow">Slow</option>
        <option value="normal">Normal</option>
        <option value="fast">Fast</option>
      </select>
      {!validation.success && (
        <p role="alert" className="notice">
          {validation.error.issues[0].message}
        </p>
      )}
      <div className="flex flex-wrap gap-3">
        <button
          className="button secondary"
          type="button"
          disabled={!validation.success}
          onClick={() => setPreview(!preview)}
        >
          {preview ? 'Close heart preview' : 'Preview 3D heart'}
        </button>
        <button
          className="button secondary"
          type="button"
          onClick={() => onChange(structuredClone(DEFAULT_HEART))}
        >
          Reset heart customization
        </button>
      </div>
      {preview && validation.success && (
        <HeartPreview value={validation.data} sceneText={sceneText} />
      )}
      <p className="hint">
        Preview includes current edits. Save changes to keep them. Reduced motion uses a static
        heart.
      </p>
    </section>
  );
}
