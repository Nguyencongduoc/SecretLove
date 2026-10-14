# SecretLove — separate Preview and public release gates

Unchecked means pending; these are not test results. Current execution evidence is in DAY3_DEPLOYMENT_READINESS.md. No deployment or Prompt 08 is authorized.

## Before an owner-only private Preview attempt

- [x] Approved same-origin <=1 MiB upload chunks; server-validated 16 MiB/360-second cap preserved. Streaming/private/Range source and local tests prepared.
- [x] User manually applied/verified migration 008; 001–008 immutable. No browser staging grants.
- [x] Proposed project secretlove-preview, existing isolated Supabase project, Vercel Authentication and owner-only testers recorded.
- [x] Disable Git auto-deploy and prepare a Preview-only Vercel build-format guard; no project/remote setting created.
- [ ] Owner creates/verifies project and plan/region/Node 24.x; confirms exact stable HTTPS Preview origin. No invented URL.
- [ ] Owner confirms Protection on every URL/alias, approved tester membership and Preview-scoped credentials. Exact APP_ORIGIN/isolated project reference and callback settings verified.
- [ ] Assign monitoring/cleanup operator and verify isolated-project Storage/RLS/RPC/schema configuration including staging.
- [ ] Confirm SMTP/sender/templates and actual test inbox plan; keep public contact email pending until provided/verified.
- [ ] Explicit authorization to create a **protected Preview deployment for target testing**. This does not authorize sharing broadly, Production promotion or public access.

## Acceptance on the approved protected HTTPS target

- [ ] Unprotected access to every deployment/alias/HTML/API/static route gated by platform protection; valid operator protection credentials do not bypass application auth.
- [ ] HTTPS/TLS + exact Origin; wrong/null/missing Origin mutations denied. Generic locked HTML/RSC/metadata/no protected preload; CSP hydration/no unsafe-eval, no-referrer/nosniff/frame denial and private no-store/CDN headers.
- [ ] Signup/confirmation/recovery from real delivered email; fresh password login, used/expired/copy proof denial, normal login cannot reset; logout and forced refresh/expiry review.
- [ ] Secure/HttpOnly/Lax/Path=/ host recipient and recovery cookies on HTTPS; no Domain/session tokens in JSON/localStorage/URL.
- [ ] Full-song chunk upload above 4.5 MB succeeds (every binary request <=1 MiB; small begin/commit); bad manifest/codec/part/rights/MIME/size and stale owner/version/lease/publish cases deny safely.
- [ ] Full large GET actually crosses Vercel without payload error; Range 206/HEAD/416; expected bytes/hash; upstream redirects/errors/timeout/cancellation/concurrency behavior. This platform gate cannot be replaced by localhost tests.
- [ ] Anonymous/foreign owner/cross-letter recipient cannot read audio/photos/staging; revoked/expired/unpublished/deleted letter denies subsequent requests. Document in-flight/delivered-byte limitation.
- [ ] Real browser music begins after interaction, advances and persists across scenes; native/autoplay errors keep authorized reading available; Close/access loss tears down. Heart/custom Unicode/reduced motion/WebGL fallback/mobile framing render on target.
- [ ] Verify Vercel trusted IP overwrite/spoof resistance and distributed limiter; test namespace absent. Review shared provider-auth IP limits/CAPTCHA decisions.
- [ ] Cleanup endpoint denies absent/wrong cron secret. **Do not run unscoped maintenance against historical fixtures without separate approval.** Approved scoped cleanup/isolated fresh cohort, v3 staging jobs, failures/leases/orphans and physical erasure verified; scheduled Preview operator invocation configured (Vercel cron is production-only).
- [ ] Record aggregate monitoring, budget/egress/duration/memory/load and owner incident/rollback procedure; no private paths/request bodies in logs.
- [ ] Final local checks + approved target test evidence archived; decide GO for owner-only acceptance or NO-GO with defects. No automatic public release.

## Additional gates for public production — current NO-GO

- [ ] Reviewed real privacy/contact/disclosures, report intake/operator workflow, suspension/reinstatement and audited access implemented; no low-assurance identity claim.
- [ ] Verify proposed report 90-day/log 30-day/backup <=30-day targets against actual capabilities; document holds, active-versus-backup deletion and unsupported targets as blockers. Draft not published as final.
- [ ] Separate production Supabase/project credentials/origin/callback/SMTP and hosting authorization; operational audits and backups/restore/rotation verified.
- [ ] Complete physical Safari/iOS/Android/audio/accessibility/performance, long-reading, network/provider outages and multi-instance race/security checks.
- [ ] Exact historical synthetic cohort manifest approved before cleanup; no bulk deletion under preparation authorization.
- [ ] Production cron/monitoring/resource/egress acceptance plus explicit production deployment/public-release authorization.
