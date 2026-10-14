import type { RichTextDoc } from '@/lib/types';
import type { resolveLegacyPresentation, SceneKind, SceneOptions } from './configuration';
export type RecipientContent = {
  sceneText: import('@/lib/validation/scene-text').SceneText;
  letterId: string;
  expiresAt: string;
  recipientDisplayName: string;
  bodyDoc: RichTextDoc;
  templateId: 'rose' | 'minimal';
  photos: { id: string; altText: string }[];
  presentation: ReturnType<typeof resolveLegacyPresentation>;
};
export type SceneProps<K extends SceneKind> = {
  content: RecipientContent;
  options: SceneOptions<K>;
  reducedMotion: boolean;
  photoUrl(id: string): string;
  next(): void;
  replay(): void;
  mediaError(): void;
  interact(): void;
};
export function availableScenes(content: RecipientContent) {
  return content.presentation.scenes.filter(
    (scene) => scene.kind !== 'gallery' || content.photos.length > 0,
  );
}
