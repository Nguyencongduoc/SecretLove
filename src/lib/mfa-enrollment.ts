export type TotpEnrollment = {
  factorId: string;
  secret: string;
  uri: string;
  label: string;
  algorithm: 'SHA1' | 'SHA256' | 'SHA512';
  digits: 6 | 8;
  period: number;
};

const invalid = () => new Error('The authenticator setup response could not be validated.');
const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

// Enrollment material is private: never include input values in errors or logs.
export function parseTotpEnrollment(value: unknown): TotpEnrollment {
  try {
    if (
      !record(value) ||
      typeof value.id !== 'string' ||
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value.id) ||
      value.type !== 'totp' ||
      !record(value.totp)
    )
      throw invalid();
    const { secret, uri } = value.totp;
    if (
      typeof secret !== 'string' ||
      !/^[A-Z2-7]{16,128}={0,6}$/i.test(secret) ||
      typeof uri !== 'string' ||
      uri.length > 2048
    )
      throw invalid();
    const url = new URL(uri);
    const fields = [...url.searchParams.keys()];
    if (
      url.protocol !== 'otpauth:' ||
      url.hostname !== 'totp' ||
      url.username ||
      url.password ||
      url.port ||
      url.hash ||
      fields.some((key) => !['secret', 'issuer', 'algorithm', 'digits', 'period'].includes(key)) ||
      new Set(fields).size !== fields.length ||
      url.searchParams.get('secret')?.toUpperCase().replace(/=+$/, '') !==
        secret.toUpperCase().replace(/=+$/, '')
    )
      throw invalid();
    const label = decodeURIComponent(url.pathname.slice(1));
    const algorithm = url.searchParams.get('algorithm') ?? 'SHA1';
    const digits = url.searchParams.get('digits') ?? '6';
    const period = url.searchParams.get('period') ?? '30';
    if (
      !label ||
      label.length > 512 ||
      /[\u0000-\u001f\u007f]/.test(label) ||
      !['SHA1', 'SHA256', 'SHA512'].includes(algorithm) ||
      !['6', '8'].includes(digits) ||
      !/^[1-9]\d{0,2}$/.test(period)
    )
      throw invalid();
    return {
      factorId: value.id,
      secret,
      uri,
      label,
      algorithm: algorithm as TotpEnrollment['algorithm'],
      digits: Number(digits) as 6 | 8,
      period: Number(period),
    };
  } catch {
    throw invalid();
  }
}

export async function enrollmentQr(enrollment: TotpEnrollment): Promise<string> {
  const QRCode = await import('qrcode');
  return QRCode.toDataURL(enrollment.uri, {
    type: 'image/png',
    width: 320,
    margin: 4,
    errorCorrectionLevel: 'M',
    color: { dark: '#000000ff', light: '#ffffffff' },
  });
}
