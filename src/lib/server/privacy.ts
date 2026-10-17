import 'server-only';
import { z } from 'zod';
export function privacyContact() {
  const value = process.env.PRIVACY_CONTACT_EMAIL;
  return value && z.email().safeParse(value).success ? value : null;
}
