import { expect, it } from 'vitest';
import sharp from 'sharp';
import jsQR from 'jsqr';
import { enrollmentQr, parseTotpEnrollment } from '@/lib/mfa-enrollment';

// Public, inert local fixtures. Never read actual enrollment material in these tests.
const secret = 'JBSWY3DPEHPK3PXP';
const uri = `otpauth://totp/SecretLove:unit%40example.invalid?secret=${secret}&issuer=SecretLove`;
const response = (input = uri) => ({
  id: '11111111-1111-4111-8111-111111111111',
  type: 'totp',
  totp: { secret, uri: input, qr_code: 'inert-provider-svg' },
});

it('keeps the same factor, setup key and original URI; displays standard TOTP defaults', () => {
  expect(parseTotpEnrollment(response())).toEqual({
    factorId: response().id,
    secret,
    uri,
    label: 'SecretLove:unit@example.invalid',
    algorithm: 'SHA1',
    digits: 6,
    period: 30,
  });
});
it('preserves explicit supported algorithm, digits, period and Unicode label', () => {
  const original =
    uri.replace('unit%40example.invalid', encodeURIComponent('Người gửi')) +
    '&algorithm=SHA256&digits=8&period=60';
  expect(parseTotpEnrollment(response(original))).toMatchObject({
    uri: original,
    label: 'SecretLove:Người gửi',
    algorithm: 'SHA256',
    digits: 8,
    period: 60,
  });
});
it.each([
  uri.replace('otpauth:', 'https:'),
  uri.replace('//totp/', '//hotp/'),
  uri + '&secret=OTHER',
  uri + '&digits=7',
  uri + '&algorithm=MD5',
  uri + '&period=0',
  uri + '&period=30.5',
  uri + '&callback=https://example.invalid',
  uri + '#private-fragment',
  uri.replace(secret, 'AAAAAAAAAAAAAAAA'),
  uri.replace('SecretLove:unit%40example.invalid', '%00'),
])('rejects unsupported or inconsistent enrollment input without exposing it (%#)', (input) => {
  expect(() => parseTotpEnrollment(response(input))).toThrow(
    'The authenticator setup response could not be validated.',
  );
});
it('fails closed on malformed responses without serializing provider objects', () => {
  for (const value of [
    null,
    {},
    { ...response(), type: 'phone' },
    {
      ...response(),
      totp: { secret: 'INERT_INVALID_INPUT', uri },
    },
  ]) {
    let message = '';
    try {
      parseTotpEnrollment(value);
    } catch (error) {
      message = (error as Error).message;
    }
    expect(message).toBe('The authenticator setup response could not be validated.');
  }
});
it('generates a local high-contrast PNG whose decoded URI exactly matches the enrollment', async () => {
  const image = await enrollmentQr(parseTotpEnrollment(response()));
  expect(image.startsWith('data:image/png;base64,')).toBe(true);
  const { data, info } = await sharp(Buffer.from(image.split(',')[1], 'base64'))
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  expect([info.width, info.height]).toEqual([320, 320]);
  expect(Array.from(data.subarray(0, 4))).toEqual([255, 255, 255, 255]);
  const decoded = jsQR(new Uint8ClampedArray(data), info.width, info.height);
  // Avoid including enrollment data in assertion diagnostics.
  expect(decoded?.data === uri).toBe(true);
});
