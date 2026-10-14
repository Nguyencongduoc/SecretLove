export type Mark = { type: 'bold' | 'italic' };
export type RichTextNode = {
  type: 'paragraph' | 'text' | 'hardBreak' | 'bulletList' | 'orderedList' | 'listItem';
  text?: string;
  content?: RichTextNode[];
  marks?: Mark[];
  attrs?: { start?: number; type?: null };
};
export type RichTextDoc = { type: 'doc'; content: RichTextNode[] };
export type Photo = { id: string; altText: string; status: 'pending' | 'ready'; createdAt: string };
export type Letter = {
  heartCustomization: import('@/lib/validation/heart').HeartCustomization;
  sceneText: import('@/lib/validation/scene-text').SceneText;
  music: import('@/lib/validation/music').MusicConfiguration;
  audioAsset: { id: string; status: 'pending' | 'ready'; durationSeconds: number } | null;
  audioUpload?: { id: string; status: 'collecting' | 'finalizing'; expiresAt: string } | null;
  id: string;
  title: string;
  recipientDisplayName: string | null;
  bodyDoc: RichTextDoc;
  templateId: 'rose' | 'minimal';
  status: 'draft' | 'published';
  version: string;
  verificationConfigured: boolean;
  passphraseRequired: boolean;
  photos: Photo[];
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
};
export type LetterCard = Pick<
  Letter,
  'id' | 'title' | 'status' | 'templateId' | 'version' | 'createdAt' | 'updatedAt'
>;
export const EMPTY_DOC: RichTextDoc = { type: 'doc', content: [{ type: 'paragraph' }] };
