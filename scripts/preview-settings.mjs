/** @param {Record<string, string | undefined>} env */
export function previewProblem(env) {
  if (env.VERCEL !== '1' || env.VERCEL_ENV !== 'preview') return 'PREVIEW_BUILD_ONLY';
  try {
    const origin = new URL(env.APP_ORIGIN ?? '');
    if (
      origin.origin !== env.APP_ORIGIN ||
      origin.protocol !== 'https:' ||
      ['localhost', '127.0.0.1'].includes(origin.hostname)
    )
      return 'EXACT_HTTPS_ORIGIN_REQUIRED';
    const database = new URL(env.NEXT_PUBLIC_SUPABASE_URL ?? '');
    if (
      !/^[a-z0-9]{20}$/.test(env.PREVIEW_SUPABASE_PROJECT_REF ?? '') ||
      database.origin !== env.NEXT_PUBLIC_SUPABASE_URL ||
      database.protocol !== 'https:' ||
      database.hostname !== `${env.PREVIEW_SUPABASE_PROJECT_REF}.supabase.co`
    )
      return 'ISOLATED_PROJECT_REFERENCE_REQUIRED';
  } catch {
    return 'EXACT_ORIGIN_AND_PROJECT_REQUIRED';
  }
  if (
    !env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    !env.SUPABASE_SERVICE_ROLE_KEY ||
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY === env.SUPABASE_SERVICE_ROLE_KEY
  )
    return 'SEPARATE_SERVER_CREDENTIAL_REQUIRED';
  const keys = ['VERIFICATION_HMAC_KEY', 'RATE_LIMIT_HMAC_KEY', 'CRON_SECRET'].map(
    (name) => env[name],
  );
  if (
    keys.some(
      (value) =>
        !value ||
        Buffer.from(value, 'base64').length < 32 ||
        Buffer.from(value, 'base64').toString('base64') !== value,
    ) ||
    new Set(keys).size !== 3
  )
    return 'INDEPENDENT_SECURITY_KEYS_REQUIRED';
  if (env.SECRETLOVE_TEST_RATE_NAMESPACE) return 'DEPLOYED_TEST_NAMESPACE_DENIED';
  if (
    env.MAX_AUDIO_UPLOAD_BYTES &&
    (!/^\d+$/.test(env.MAX_AUDIO_UPLOAD_BYTES) ||
      Number(env.MAX_AUDIO_UPLOAD_BYTES) < 1024 ||
      Number(env.MAX_AUDIO_UPLOAD_BYTES) > 16777216)
  )
    return 'INVALID_AUDIO_LIMIT';
  return null;
}
