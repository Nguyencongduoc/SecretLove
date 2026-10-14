'use client';
import { DEFAULT_SCENE_TEXT, type SceneText } from '@/lib/validation/scene-text';
export function SceneTextFields({
  value,
  onChange,
}: {
  value: SceneText;
  onChange(value: SceneText): void;
}) {
  function field<K extends keyof SceneText>(
    part: K,
    key: keyof SceneText[K],
    label: string,
    maximum: number,
  ) {
    const id = `scene-${part}-${String(key)}`;
    return (
      <div key={id}>
        <label className="label" htmlFor={id}>
          {label}
        </label>
        <textarea
          id={id}
          className="field"
          required
          maxLength={maximum}
          rows={key === 'message' ? 3 : 2}
          value={String(value[part][key])}
          onChange={(event) =>
            onChange({ ...value, [part]: { ...value[part], [key]: event.target.value } })
          }
        />
        <p className="hint mt-1">Up to {maximum} characters. Plain text only.</p>
      </div>
    );
  }
  return (
    <section className="panel space-y-5" aria-label="Heart and closing text">
      <h2 className="text-2xl">Heart and closing scenes</h2>
      <p className="hint">
        These words stay private until the recipient unlocks the gift. Save before previewing or
        publishing.
      </p>
      <h3 className="text-xl">Heartbeat</h3>
      {field('heart', 'eyebrow', 'Heart subtitle', 80)}
      {field('heart', 'title', 'Heart heading', 160)}
      {field('heart', 'prompt', 'Heart invitation', 240)}
      {field('heart', 'message', 'Heart revealed message', 500)}
      <h3 className="text-xl">Closing</h3>
      {field('closing', 'eyebrow', 'Closing subtitle', 80)}
      {field('closing', 'title', 'Closing heading', 160)}
      {field('closing', 'message', 'Closing message', 500)}
      <button
        type="button"
        className="button secondary"
        onClick={() => onChange(DEFAULT_SCENE_TEXT)}
      >
        Use default scene text
      </button>
    </section>
  );
}
