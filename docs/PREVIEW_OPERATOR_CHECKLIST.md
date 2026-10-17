# Prompt 07.5 — operator configuration and authorization checklist

Latest PPD-03/04: operator reports default modern secret retired, legacy keys disabled, local cutover checks PASS and no existing Preview deployment. Preview API/HMAC/Cron keys are separately configured; direct old-key denial and old application-secret consumer retirement are not verified. Current source candidate and checks: DAY3_SOURCE_FREEZE_REVIEW.md. Historical blockers below must be read with this update; deployment still needs explicit authorization.

Date: 2026-10-15, Asia/Bangkok. Branch: `feature/day-3-preview-acceptance`. **Preparation only; no remote creation/configuration/deployment or mail send authorized.** Acceptance evidence belongs in DAY3_PREVIEW_ACCEPTANCE_REPORT.md. All unchecked items are pending, not successful tests.

## Target record — complete before asking for approval

| Field | Current verified information / missing input |
| --- | --- |
| Vercel project name | `secretlove-preview`, owner-created; local link verified; remote effective settings not independently inspected |
| Vercel account/team and project ID | Local link: org `team_KJpwyYId3LugWZ4U1jnF4h67`, project `prj_TH2Qq194T1GbYwRUJ0n7DfR7MXYK`; actual scope slug pending |
| Canonical stable HTTPS Preview origin | Operator-intended `https://secretlove-review-ngcd.vercel.app`; format valid, **alias allocation/routing/TLS NOT VERIFIED** |
| Deployment and alias inventory | PENDING: immutable URL, branch alias, canonical alias, any other/custom/project domains |
| Environment | Preview only, branch `feature/day-3-preview-acceptance` |
| Code baseline | Current HEAD `3b55d83351132b86de7d1dc90f8778a251377f21` plus uncommitted modern Storage fix/tests/docs; freeze exact reviewed artifact before approval |
| Protection/access | Owner reports Authentication/Standard enabled; required All Deployments/owner-only effective access still NOT VERIFIED and not changed |
| Supabase public project reference | `samelfoyrujhcywcnofw`, read from existing local public URL; isolated status is owner-confirmed, remote configuration not re-audited here |
| Supabase public origin | `https://samelfoyrujhcywcnofw.supabase.co`; use only this existing isolated test project |
| Local APP_ORIGIN | `http://localhost:3000`; preserved for local use, cannot be copied as deployed origin |
| Plan, region, memory, Fluid Compute, budgets | PENDING operator selection; no purchase/configuration inferred |
| SMTP provider/sender/test inboxes | PENDING; no address or delivery success invented |
| Authorization | NOT GRANTED; alias-bootstrap proposal in PREVIEW_ORIGIN_PLAN.md, exact hostname/scope packet incomplete |

## 1. Project creation or verification

- [ ] Operator identifies the exact account/team and verifies whether the named project exists through a read-only authenticated dashboard review. Record its actual ID and ownership; do not link a similarly named project blindly.
- [ ] If absent, **stop for separate creation authorization** identifying the account/name, intended creation-only action and origin dependency. Do not treat this checklist as permission to create. The user's exact-origin requirement remains unresolved; obtain an operator decision rather than inventing a URL or assuming a bootstrap exception.
- [ ] Use a reviewed empty-project creation path if separately approved. Avoid import/setup actions that implicitly perform a first Production deployment. Vercel documents a separate [project create command](https://vercel.com/docs/cli/project); no CLI command is run here and no CLI dependency is installed.
- [ ] Verify Next.js/root/build/install settings against vercel.json; preserve `node scripts/check-preview-config.mjs && pnpm build` and frozen pnpm installation. Ensure automatic Git deployments remain disabled remotely as well as in source. Do not use promote/Production targets or override the build guard.

## 2. Actual stable HTTPS origin

Latest owner setup: the existing project domain is Production-assigned and the dashboard cannot save Preview reassignment without Git integration. Local CLI 64.0.2 is available. PREVIEW_ORIGIN_PLAN.md proposes a separate manual free vercel.app alias and All Deployments, without Git/Production or app changes. Candidate hostname must be explicitly approved before the first protected Preview; allocation/verification follows. This conditional bootstrap is not approved yet and supersedes no exact-Origin control. Do not run an unprotected discovery deployment or assume a generated deployment URL survives redeployment.

- [ ] Confirm the real branch/canonical Preview URL from provider records; document which alias points to the reviewed **Preview** deployment. Keep domain assignment separate from environment promotion.
- [ ] Record all generated/branch/custom/project aliases. One canonical origin is accepted by application mutations; other aliases must remain protected and must not widen Origin trust.
- [ ] Set APP_ORIGIN only to the verified exact HTTPS origin, without trailing slash, credentials, path or query. No Host-derived trust or `*.vercel.app` allowlist.
- [ ] Verify ownership/TLS/DNS for the selected alias and avoid stale immutable URLs in confirmation/recovery/share/QR links. If URL assignment requires a remote action, include it in the approval packet before performing it.

## 3. Protection and owner-only access

- [ ] Enable **Vercel Authentication + All Deployments** before any deployment. Standard Protection excludes production domains and does not meet the all-URLs requirement. Record settings evidence and independently test each URL with a fresh unauthenticated client. [Protection scope](https://vercel.com/docs/deployment-protection)
- [ ] Review team/project memberships, viewer access, access groups, granted access requests, shareable links, trusted-source/exemption settings and automation bypasses. Vercel Authentication is not automatically owner-only. No other tester/moderator is approved. Do not remove existing team members or change remote access without authorization. [Who can access](https://vercel.com/docs/deployment-protection/methods-to-protect-deployments/vercel-authentication)
- [ ] Use an owner-only account/project scope that can enforce the requested access policy, or stop for an operator decision. Keep protection enabled throughout testing; never open callbacks/API/static routes as a workaround.
- [ ] Prefer owner-authenticated protection state for tests. If an automation bypass is explicitly approved, restrict its storage/use to the runner, send only in a header to the approved host, never share it in links/logs or client code, and revoke it when testing ends. Protection access does not bypass application authorization.
- [ ] Vercel protection cookies are URL-specific. The owner may need to authenticate on each alias and after following mail links; do not assume one alias cookie proves protection/access on another.

## 4. Preview environment variables

Configure in **Preview scope**, preferably this branch only, after authorization. Keep values in hosting secret settings; do not copy/overwrite .env.local, print values or commit a host-exported environment file.

Latest operator update: all nine application/guard variables are configured Preview-only, four server entries as Vercel Secret. This is operator-reported, not independent dashboard/value verification. Current intended candidate origin and remaining blockers are in DAY3_PREDEPLOYMENT_SECURITY_REVIEW.md. No secret values were read. Privately confirm system VERCEL/VERCEL_ENV exposure, key type/project pair/canonical independent security keys/cap, effective protection and exposed-key retirement. No `.vercelignore` exists; explicit CLI upload safety is a blocker despite Git ignore rules.

Subsequent operator-authorized packaging follow-up resolves the final sentence above: root .vercelignore added and actual offline CLI selection PASS, 143 safe files with required source retained. All selected-file local checks PASS; modern live Storage remains SKIPPED / NOT TESTED. PPD-02–06 and deployment approval are still pending; no hosting/settings action follows from packaging success.

| Variable | Operator action |
| --- | --- |
| NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY | Existing isolated project only; verify paired values privately; these public values are build-time inputs |
| SUPABASE_SERVICE_ROLE_KEY | Dedicated modern sb_secret_ credential for this isolated Preview, privately configured; unchanged variable name, never NEXT_PUBLIC or browser-visible. No exposed legacy fallback; operator records credential type for the exact deployment without revealing its value |
| PREVIEW_SUPABASE_PROJECT_REF | Confirm actual isolated reference `samelfoyrujhcywcnofw`; guard checks matching hostname, not independent proof of isolation |
| APP_ORIGIN | Actual approved canonical HTTPS origin — PENDING |
| VERIFICATION_HMAC_KEY | Approved new Preview HMAC: existing old-key gates cannot unlock there; configure only separately approved acceptance fixtures through normal Studio. Preserve historical data, do not add an old-key fallback or invent key version 2 |
| RATE_LIMIT_HMAC_KEY / CRON_SECRET | Independently generated server-only Preview values; review shared-DB/rate identity and scheduler consumers. Keep three security keys distinct |
| MAX_AUDIO_UPLOAD_BYTES | Existing hard cap 16777216; optional lower cap needs an explicit operational decision, never increase silently |
| VERCEL / VERCEL_ENV | Provider-supplied; verify Preview, do not override to bypass the guard |
| SECRETLOVE_TEST_PROJECT / SECRETLOVE_TEST_RATE_NAMESPACE / TEST_CREATOR_* | Runner-only where required; omit from hosted application settings. Deployed test namespace is forbidden |

- [ ] Verify environment scoping, secret visibility and build-guard success without including values in evidence. Rebuild when public build-time values change. Independently record the actual deployed revision and Supabase project.

## 5. Isolated Supabase and migration history

- [ ] Confirm account/project/region and that data is synthetic. Migrations 001–008 were manually applied and verified by the owner; do not reapply/reset them or execute new remote SQL. Eight files are present; 009 is next unused, but no new migration is needed for this planning phase.
- [ ] Run approved read-only bucket/RLS/grant checks from CHUNK_AUDIO_SETUP.md and DAY3_RECOVERY_SETUP.md; verify private schema not exposed, all three buckets private/browser-denied and Storage global limit >=16 MiB.
- [ ] Do not reconfigure historical synthetic letters/accounts merely to pass acceptance. Keep source quotas, authorization, expiry and republish rotation unchanged.

## 6. Origin and Auth callbacks

- [ ] Before changing shared isolated Auth settings, record current Site URL/redirects/templates and local test impact, plus a restore plan. Include those remote changes in authorization.
- [ ] Set Site URL to the exact approved origin. Allow its exact `/auth/callback` and `/auth/callback?next=/reset-password` redirect targets. Existing localhost entries may remain solely if deliberately approved for continuing local tests; no broad wildcard or production origin.
- [ ] Use SETUP.md's token-hash confirmation and recovery templates. Confirmation: `{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=email`; recovery: same callback with `type=recovery`. These template variables are not actual credentials. A `next` parameter or normal login must not grant recovery authority.
- [ ] Test delivered links through owner protection without adding protection bypass tokens to emails. Redact full callback URLs/token hashes, cookies and inbox addresses from evidence.

## 7. SMTP and approved inboxes

- [ ] Operator selects custom SMTP provider, verified sender/domain, transport/port, credentials and approved test inboxes. Configure SPF/DKIM/DMARC as appropriate and confirm provider delivery/rate limits. No provider/address invented or message sent in this phase.
- [ ] Keep email confirmation enabled and unused/anonymous providers disabled. Review provider password-change/reauthentication/session policy separately from the application's single-use recovery proof.
- [ ] Obtain explicit real-mail test authorization, then use approved synthetic accounts/inboxes for signup, confirmation, password recovery, fresh login and copied/expired/reused recovery denial. Admin-generated links/users do not prove SMTP delivery. [Supabase SMTP](https://supabase.com/docs/guides/auth/auth-smtp)

## 8. Runtime, resources and operations

- [ ] Select Node 24.x (local inspected runtime 24.20.0), declared pnpm 11.25.0, Next.js defaults and **Node functions**, not Edge, for Sharp/scrypt/MP3 processing. Verify deployed effective settings, not just package engines.
- [ ] Confirm actual isolated DB region before selecting a Function region. No region selected from timezone alone. Approve plan/cost, memory/CPU/Fluid concurrency and budgets; verify audio/commit/cleanup maxDuration=60 and relevant default-route limits. [Regions](https://vercel.com/docs/functions/configuring-functions/region), [duration](https://vercel.com/docs/functions/configuring-functions/duration)
- [ ] Measure target duration/memory/cold starts/egress/error counts using only the approved bounded workload. Account for scrypt, MP3 assembly/decoder buffers and per-instance versus fleet concurrency. Per-process caps do not cap fleet spend.
- [ ] Record monitoring/incident owner, alert thresholds, budget evidence and a compatible rollback revision including 007 recovery and 008 staging support. No live rollback or failure injection without scope approval.
- [ ] Vercel's configured daily 03:00 UTC cron is Production-only; Preview requires a separately approved operator schedule. **Do not activate global cleanup on the historical shared fixture project.** Test missing/wrong cron auth only; no valid cron secret invocation here.
- [ ] Existing cleanupMedia/cron has no cohort filter. For scoped deletion acceptance, obtain approval of an exact newly created letter/asset/path manifest, use normal owner API deletion and verify only those exact objects. Testing the queue worker physically requires an approved implementation supporting that scope or a separately approved isolated environment; do not present direct object removal as worker drainage. Existing synthetic Auth accounts must not be deleted.

## 9. Final authorization packet and stop

Prepare a concrete request with: exact account/team/project ID/name; canonical HTTPS origin and full alias inventory; Preview environment/branch/revision; verified All Deployments protection and owner-only effective access; isolated Supabase reference and intended setting changes; runtime/region/plan/budget; one intended Preview deployment action; approved runner fixture IDs/mutations and test inboxes/mail actions; exact cleanup scope if any. Separate setup/creation permission from deployment permission. Record the operator's explicit authorization and what it covers.

Current packet is incomplete: project/account/origin/access/resource/SMTP details and authorization are pending. **STOP before any remote creation/configuration/deployment.** Once complete, ask for explicit authorization and wait. Do not interpret providing identifiers or the original milestone request as approval, run an unprotected initial deployment to discover its URL, promote to Production, or start Prompt 08.

## Modern audio acceptance and fixture scope update

The optional local modern Storage live fixture is owner-deferred: SKIPPED / NOT TESTED, with no new draft/upload. Its earlier approval/login handoff is retired. Follow PREVIEW_AUDIO_ACCEPTANCE.md on the actual approved HTTPS target; every modern private GET/206/HEAD/416/cross-letter/anonymous/non-disclosure/>4.5 MB stream gate must PASS before acceptance. No local/mock result substitutes for this. Use existing synthetic credentials privately with direct guarded Playwright; the older fixture runner changes passwords/accounts and is not authorized. Separately approve all new fixture mutations and the current scenario's finally deletion, or review a leave-intact variant. No global cleanup, existing-account deletion, emails, remote configuration or deployment under preparation authority.
