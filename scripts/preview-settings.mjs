import { readFileSync } from 'node:fs';
const publicBinding = JSON.parse(
  readFileSync(new URL('../config/public-deployment.json', import.meta.url), 'utf8'),
);
/** @param {Record<string, string | undefined>} env */
export function previewProblem(env, binding = publicBinding) {
  // Production is allowed only for this explicitly opted-in, protected test deployment.
  // Platform Authentication/owner membership must still be verified outside this guard.
  const ownerReview = env.SECRETLOVE_DEPLOYMENT_MODE === 'owner-only-review';
  const publicRelease = env.SECRETLOVE_DEPLOYMENT_MODE === 'public-private-gate';
  if (env.VERCEL !== '1') return 'PREVIEW_BUILD_ONLY';
  if (publicRelease) {
    if (env.VERCEL_ENV !== 'production' || env.VERCEL_TARGET_ENV !== 'production')
      return 'PUBLIC_PRODUCTION_CONTEXT_REQUIRED';
    if (
      binding.projectId !== 'prj_TH2Qq194T1GbYwRUJ0n7DfR7MXYK' ||
      binding.teamId !== 'team_KJpwyYId3LugWZ4U1jnF4h67' ||
      env.VERCEL_PROJECT_ID !== binding.projectId
    )
      return 'PUBLIC_PROJECT_REQUIRED';
    if (
      binding.origin !== 'https://secretlove-preview.vercel.app' ||
      env.APP_ORIGIN !== binding.origin
    )
      return 'PUBLIC_ORIGIN_REQUIRED';
    if (
      !/^[a-z0-9]{20}$/.test(binding.supabaseProjectRef ?? '') ||
      binding.supabaseProjectRef === 'samelfoyrujhcywcnofw' ||
      env.SUPABASE_PROJECT_REF !== binding.supabaseProjectRef
    )
      return 'NEW_PRODUCTION_PROJECT_BINDING_REQUIRED';
    if (env.ENABLE_EXPERIMENTAL_COREPACK !== '1') return 'COREPACK_REQUIRED';
    if (!env.MAX_AUDIO_UPLOAD_BYTES) return 'AUDIO_LIMIT_REQUIRED';
    if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(env.PRIVACY_CONTACT_EMAIL ?? '') ||
      /(^|[.@-])(example|invalid|test|localhost|pending)([.@-]|$)/i.test(
        env.PRIVACY_CONTACT_EMAIL ?? '',
      )
    )
      return 'REAL_PRIVACY_CONTACT_REQUIRED';
    if (Object.entries(env).some(([key, value]) => key.startsWith('SECRETLOVE_TEST_') && value))
      return 'DEPLOYED_TEST_NAMESPACE_DENIED';
  } else if (ownerReview) {
    if (env.VERCEL_ENV !== 'production' || env.VERCEL_TARGET_ENV !== 'production')
      return 'OWNER_REVIEW_PRODUCTION_CONTEXT_REQUIRED';
    if (env.VERCEL_PROJECT_ID !== 'prj_TH2Qq194T1GbYwRUJ0n7DfR7MXYK')
      return 'OWNER_REVIEW_PROJECT_REQUIRED';
    if (env.PREVIEW_SUPABASE_PROJECT_REF !== 'samelfoyrujhcywcnofw')
      return 'OWNER_REVIEW_ISOLATED_PROJECT_REQUIRED';
    if (env.APP_ORIGIN !== 'https://secretlove-preview.vercel.app')
      return 'OWNER_REVIEW_ORIGIN_REQUIRED';
  } else if (
    env.SECRETLOVE_DEPLOYMENT_MODE ||
    env.VERCEL_ENV !== 'preview' ||
    (env.VERCEL_TARGET_ENV && env.VERCEL_TARGET_ENV !== 'preview')
  )
    return 'PREVIEW_BUILD_ONLY';
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
      !/^[a-z0-9]{20}$/.test(
        (publicRelease ? env.SUPABASE_PROJECT_REF : env.PREVIEW_SUPABASE_PROJECT_REF) ?? '',
      ) ||
      database.origin !== env.NEXT_PUBLIC_SUPABASE_URL ||
      database.protocol !== 'https:' ||
      database.hostname !==
        `${publicRelease ? env.SUPABASE_PROJECT_REF : env.PREVIEW_SUPABASE_PROJECT_REF}.supabase.co`
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
  if ((ownerReview || publicRelease) && !env.SUPABASE_SERVICE_ROLE_KEY.startsWith('sb_secret_'))
    return 'MODERN_SERVER_CREDENTIAL_REQUIRED';
  if (
    (ownerReview || publicRelease) &&
    !env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.startsWith('sb_publishable_')
  )
    return 'MODERN_PUBLIC_CREDENTIAL_REQUIRED';
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
