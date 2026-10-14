import { z } from 'zod';
import { letterConfigurationV1Schema } from '@/lib/experience/configuration';
import { versionSchema } from './letters';
export const musicSchema = letterConfigurationV1Schema.shape.music.unwrap();
export type MusicConfiguration = z.output<typeof musicSchema>;
export const SILENT_MUSIC: MusicConfiguration = {
  enabled: false,
  assetId: null,
  defaultVolume: 0.35,
  loop: false,
  startPolicy: 'manual',
};
export const musicSettingsSchema = z.strictObject({
  expectedVersion: versionSchema,
  music: musicSchema,
});
export function resolvedMusic(config: unknown): MusicConfiguration {
  const parsed = letterConfigurationV1Schema.safeParse(config);
  return parsed.success ? (parsed.data.music ?? SILENT_MUSIC) : SILENT_MUSIC;
}
