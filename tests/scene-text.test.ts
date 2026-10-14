import { describe, it, expect } from 'vitest';
import { sceneTextSchema, resolveSceneText, DEFAULT_SCENE_TEXT } from '@/lib/validation/scene-text';
import { saveLetterSchema } from '@/lib/validation/letters';
describe('bounded private scene text', () => {
  it('keeps exact legacy defaults and preserves Unicode/newlines', () => {
    expect(resolveSceneText(null)).toEqual(DEFAULT_SCENE_TEXT);
    expect(resolveSceneText(undefined)).toEqual(DEFAULT_SCENE_TEXT);
    const text = {
      ...DEFAULT_SCENE_TEXT,
      closing: { ...DEFAULT_SCENE_TEXT.closing, message: 'Em là điều đặc biệt.\nLuôn bên nhau 💗' },
    };
    expect(resolveSceneText(text)).toEqual(text);
    expect(saveLetterSchema.parse({ expectedVersion: '1', sceneText: text }).sceneText).toEqual(
      text,
    );
    expect(
      saveLetterSchema.parse({ expectedVersion: '1', title: 'Old client' }),
    ).not.toHaveProperty('sceneText');
    expect(saveLetterSchema.parse({ expectedVersion: '1', sceneText: null }).sceneText).toBeNull();
  });
  it('rejects unknown fields, rich objects, empty copy and excessive lengths', () => {
    for (const value of [
      { ...DEFAULT_SCENE_TEXT, script: 'alert(1)' },
      { ...DEFAULT_SCENE_TEXT, heart: { ...DEFAULT_SCENE_TEXT.heart, title: ' '.repeat(3) } },
      { ...DEFAULT_SCENE_TEXT, heart: { ...DEFAULT_SCENE_TEXT.heart, title: 'x'.repeat(161) } },
      {
        ...DEFAULT_SCENE_TEXT,
        closing: { ...DEFAULT_SCENE_TEXT.closing, message: { html: '<script>bad</script>' } },
      },
      {
        ...DEFAULT_SCENE_TEXT,
        closing: { ...DEFAULT_SCENE_TEXT.closing, message: 'x'.repeat(501) },
      },
    ])
      expect(sceneTextSchema.safeParse(value).success).toBe(false);
  });
  it('keeps markup as literal text; renderer must never interpret creator code', () => {
    const text = {
      ...DEFAULT_SCENE_TEXT,
      heart: { ...DEFAULT_SCENE_TEXT.heart, message: '<script>alert(1)</script>' },
    };
    expect(resolveSceneText(text).heart.message).toBe('<script>alert(1)</script>');
  });
});
