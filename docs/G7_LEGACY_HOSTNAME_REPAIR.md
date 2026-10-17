# G7 — Legacy hostname redirect repair packet

Date: 2026-10-17, Asia/Bangkok. User requests investigating/fixing the old-hostname404. Branch verified `codex/g7-public-access`, frozen runtime `4a169ff185bd464516cdebf24b066a7963ca05d6`. Investigation performed using bounded anonymous GETs and allowlisted Vercel domain/alias metadata only. No settings/API mutation, deploy, alias creation/removal, source-feature change, credential read/export, SQL, fixture, cleanup, mail or commit performed.

## Completed repair — PASS

The preceding investigation status is historical. Owner subsequently approves exactly one307 synchronization attempt. Fresh preflight confirms the existing verified rule, exact project and canonical deployment. Agent executes **one PATCH only** with the two approved redirect fields through the authenticated Vercel CLI; API returns success with the expected hostname/project/destination/status. No retry, deploy, protection/environment/Git/Supabase/source-feature change, domain removal or separate alias-set operation performed.

Fresh allowlisted readbacks confirm the domain rule and a newly functioning old-hostname alias: `secretlove-preview.vercel.app` now has redirect `secretlove-production.vercel.app`, status307, correct project and current deployment ID. Canonical remains bound to `dpl_C7vmfH8rjnpSXQHBvMoQ4GEe6vCa` without redirect. Reapplying the saved rule reconciled routing in this actual attempt; no wider provider guarantee inferred.

| Anonymous GET after repair | Actual result | Status |
| --- | --- | --- |
| Old root |307 → exact HTTPS canonical `/` | PASS |
| Old `/login?legacy_probe=1` |307 → canonical `/login`, synthetic query preserved | PASS |
| Canonical root destination |200, no redirect | PASS |
| Canonical Creator API |401 `AUTH_REQUIRED` | PASS |
| Canonical Operator API |401 `AUTH_REQUIRED` | PASS |
| Preview root |302 → Vercel `/sso-api` | PASS |
| Recorded immutable root |302 → Vercel `/sso-api` | PASS |

**7/7 sampled HTTPS checks PASS**, plus safe domain/alias metadata readbacks. GETs sent no cookies/Authorization, did not follow redirects or retain private bodies/redirect queries. Evidence: ignored `test-results/g7-public-access/redirect-repair-results.json`. Original404/missing-alias observations remain historical evidence below. Real token-bearing letter links, callback tokens, POST redirects and every route were not exercised. Deferred audio/security/operations requirements remain NOT TESTED; no complete release certification or G8 authorization follows.

## Actual diagnosis

| Read-only check | Result |
| --- | --- |
| `https://secretlove-preview.vercel.app/` |404; server Vercel; `x-vercel-error: DEPLOYMENT_NOT_FOUND`; no Location; plain text provider error |
| Same hostname `/login` | Same404/DEPLOYMENT_NOT_FOUND; not the application's normal login response |
| Canonical `https://secretlove-production.vercel.app/` |200 HTML; no Vercel error or redirect |
| GET project-domain metadata, old hostname | Correct project `prj_TH2Qq194T1GbYwRUJ0n7DfR7MXYK`; verified=true; redirect=`secretlove-production.vercel.app`, status307, no Git/custom-environment binding |
| GET project-domain metadata, canonical | Same project, verified=true; no redirect/Git/custom-environment binding |
| GET canonical alias metadata | Current deployment ID `dpl_C7vmfH8rjnpSXQHBvMoQ4GEe6vCa`, correct project, no redirect |
| GET old alias metadata | CLI exit1/no metadata; focused diagnostic reports not-found text. Raw response/header/credential/bypass fields not printed or persisted; exact management HTTP status not obtained |

Confirmed fault boundary: Vercel deployment/alias routing for the old hostname, not an observed Next.js route or Supabase failure. The project-level redirect record exists, but a functioning live redirect alias is absent/not resolving. Canonical deployment remains live. Previous `--skip-domain` deployment followed by canonical-only assignment is consistent with the missing alias; it is a possible historical explanation, not independently proven provider causation. No evidence here warrants changing APP_ORIGIN, disabling protection, creating a new application endpoint or rebuilding the app.

Provider references: [Get a project domain](https://vercel.com/docs/rest-api/projects/get-a-project-domain), [Get an alias](https://vercel.com/docs/rest-api/aliases/get-an-alias), [domain redirect configuration](https://vercel.com/docs/domains/working-with-domains/deploying-and-redirecting).

## Approved repair candidate — executed once as recorded above

Reapply the existing domain redirect configuration **once**, through the officially documented project-domain update API on this exact project/team and hostname. Goal is to reconcile the existing redirect configuration with live routing; whether the provider regenerates the missing alias from an unchanged configuration must be verified, not promised.

```text
PATCH /v9/projects/prj_TH2Qq194T1GbYwRUJ0n7DfR7MXYK/domains/secretlove-preview.vercel.app
  ?teamId=team_KJpwyYId3LugWZ4U1jnF4h67
Body: {"redirect":"secretlove-production.vercel.app","redirectStatusCode":307}
```

Use the existing authorized Vercel CLI authentication without reading/exporting tokens. Do not include unrelated project properties or switch to No Redirect temporarily. Preserve Standard Protection, exact canonical APP_ORIGIN, canonical current deployment, Preview hostname/branch, all environment values and private Storage. Do not remove/re-add a domain, use `alias set` to serve the application directly at the old hostname, promote/deploy, connect Git or modify Supabase.

Before the one write, recheck domain project/verification/redirect and canonical deployment binding. Any mismatch stops execution. After writing, read back only safe domain metadata; response success alone is not PASS. No secret values, verification challenge values, bypass objects, full API payload or private links in reports.

[Official project-domain update contract](https://vercel.com/docs/rest-api/projects/update-a-project-domain).

## Acceptance and stopping rules

- Anonymous old `/` returns307 with exact HTTPS canonical target; no redirect to an unexpected hostname or loop.
- Anonymous old `/login?legacy_probe=1` redirects to the same canonical path and preserves this synthetic non-sensitive query. Never use a real letter link, Auth token or cookie as a probe; check reported Location without following it with credentials.
- Following the approved non-sensitive root destination yields canonical200; canonical anonymous letters/Operator APIs remain401.
- Preview and immutable deployment samples remain Vercel SSO-protected; canonical current deployment binding unchanged. Normal TLS remains required.
- If no effective redirect after the one update and a bounded propagation recheck, mark repair FAILED/NOT EFFECTIVE and stop. Do not silently broaden to a redeploy, domain deletion/reassignment, temporary direct-app exposure, different status, protection exception or source patch. Prepare the next concrete option for review.

This is a narrowly scoped routing repair, not audio/media/security/retention acceptance or G8 authorization. Existing deferred tests retain their recorded status. Current repair status: **PASS — one approved update;7/7 scoped HTTPS checks and domain/alias readbacks passed**. No additional remote change, commit/push or deployment automatically authorized.
