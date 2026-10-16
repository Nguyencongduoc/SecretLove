# G4 Production configuration and G4.4 local validation

G5 follow-up: owner confirmed `codex/g5-production-source-freeze` for review and commit preparation. See [G5 source-freeze review](G5_PRODUCTION_SOURCE_FREEZE_REVIEW.md). G4.4 validation below remains the source of local check evidence, subject to G5 byte-for-byte deployment-input continuity. No commit/deployment permission follows from the branch change.

Date: 2026-10-16, Asia/Bangkok. Branch `codex/g4-production-configuration`; baseline HEAD `cc4f071b30604d91fed46d28a418c8d3ae7c3ad6`, clean before G4.4. The owner explicitly approved updating local binding, public guard, tests and documentation. No commit/push, deployment, remote settings, SQL, credentials, mail, fixtures or cleanup is authorized in this local step. `.env.local` and the existing application server are preserved.

## Approved target

| Item | Approved target / evidence |
| --- | --- |
| Vercel project | Existing `secretlove-preview`, `prj_TH2Qq194T1GbYwRUJ0n7DfR7MXYK` |
| Vercel team | `team_KJpwyYId3LugWZ4U1jnF4h67` |
| Canonical Production origin | `https://secretlove-production.vercel.app` |
| Production Supabase | `secretlove-production`, `mdoaageegovutlxhhicz` |
| Production Supabase URL | `https://mdoaageegovutlxhhicz.supabase.co` |
| Supabase organization | SecretLove, operator-reported slug `pbacgzvnkxusrhspmmyn`; separate organization ID not independently verified |
| Region / resources | Operator-reported Singapore `ap-southeast-1`, Free, Nano, Healthy, zero additional charges/no paid add-ons; no automatic backup reported |
| Vercel region / protection | Required `sin1`, Authentication All Deployments/owner-only through acceptance; not remotely reverified in G4.4 |

The operator reported Vercel accepted the new hostname after removing the `https://` prefix from the Domains field. This does not establish TLS, routing, protection or an application deployment. The Vercel project was not assumed renamed. Domain field values exclude the scheme; APP_ORIGIN/Supabase Site URL include HTTPS.

## G4.1–G4.3 evidence: operator-reported, not direct provider verification

- **PASS — G4.1:** operator Dashboard metadata and reported read-only preflight: required schemas/roles/UUID/Auth helpers present; public/private relations and application functions absent; zero Auth users, buckets and Storage objects; Free/no additional charges. No historical data import was authorized.
- **PASS — G4.2:** operator applied complete migrations 001–009 in order, each once, and reported each migration's read-only verification PASS. Final aggregate report: 17 RLS tables; browser/private-schema/table grants, owner approval policies, security-invoker view and RPC privilege checks correct; three private buckets with restrictive browser-denial policies; all 19 Auth/application/object inventories zero. Operator and Creator registries remain unseeded. This is not an independent SQL session, raw PostgREST denial or application concurrency test by the agent.
- **PASS — G4.3 configuration:** operator reported self-signup/anonymous/unused providers OFF, Email and Confirm Email ON, persisted after reload. Site URL and requested callbacks on the new Production origin reported PASS. No actual settings export was collected. Requested allowlist: `https://secretlove-production.vercel.app/auth/callback` and `https://secretlove-production.vercel.app/auth/callback\?next=/reset-password`; the glob escape is only for the allowlist, not the URL sent by the application. Real matching/callback behavior remains NOT TESTED.
- No account invitation, bootstrap, mail, recovery request, fixture/media creation or scheduled cleanup was performed by the agent. The historical backend `samelfoyrujhcywcnofw` was not touched. No production-data migration or synthetic-account deletion was authorized.

## G4.4 local implementation

- Bind the exact approved public origin and backend in `config/public-deployment.json`, retaining project/team IDs.
- Pin the public guard to the new origin/backend. Deny pending/substituted/test bindings, matching-but-unapproved target pairs, wrong project/team/context, alternate/trailing-slash/credentialed origins, missing configuration, legacy credentials, shared/malformed HMACs, test namespaces and raised audio limits.
- Preserve separate Preview and historical `owner-only-review` behavior. Old domains in that branch/tests/runbooks describe that separate mode; they are not active public Production targets.
- Exercise both the actual checked-in binding and real guard CLI with inert settings. Credentials used in local tests are inert markers; no real Production credentials are validated by local tests.
- Preserve migrations 001–009, runtime authorization/media/player/scene behavior, dependencies, cron-off/Git-off configuration and local environment.

## Validation

Final controlled evidence: ignored `test-results/g44-validation-1792166778256/validation-results.json`, per-step logs and source manifest; isolated workspace `test-results/g44-build-workspace-1792166778256`. Installed tools/packages were reused through ancestor resolution; no install or dependency changes. Commands ran in the snapshot via the installed Node CLI entry points, equivalent to the package scripts (`next typegen`, `tsc --noEmit`, `eslint .`, `vitest run`, `next build --webpack`). The real hosting guard CLI is separately exercised by deployment tests using inert settings; the local Next build is not a remote Vercel build.

| Check | Result | Evidence / limitation |
| --- | --- | --- |
| Next type generation | PASS | Exit 0, 1 s |
| TypeScript | PASS | Exit 0, 7 s |
| ESLint | PASS | Exit 0, 45 s, empty lint log |
| Unit/local integration tests | PASS | 124 PASS / 0 FAIL / 2 SKIPPED across 12 files (11 passed / 1 skipped), runner wall time 17 s |
| Production compilation | PASS | Exit 0, 50 s; local Next.js build only |
| Source continuity | PASS | All 164 reviewed deployment inputs unchanged through the complete run |
| Offline/credential boundary | PASS for this local run | System-variable allowlist plus inert test values only, no env-file import or live opt-ins; Node fetch/HTTP/TLS/socket calls blocked, 0 observed network attempts |
| Migration history | PASS | All nine files still byte-match the reviewed G3 manifest; no SQL executed by this step |
| Changed-file safety | PASS | Reviewed 15 source/doc files; bounded unexpected credential-marker scan found 0, whitespace check clean, index remains empty |
| Live modern Storage / external MP3 decoder capacity | SKIPPED / NOT TESTED | Both opt-ins remain unset; no live fixture, private inventory or external audio file used |

Initial runner setup failed before application validation because the Windows sandbox denied a junction, then a preload path needed escaping and SWC canonicalization was blocked. The corrected runner avoids junctions, uses forward slashes for its preload path and ran the complete checks with the necessary local execution permission, retaining the sanitized environment and network blocker. Those setup attempts are not PASS evidence; only the final complete run above certifies the local candidate. No application implementation failure remained in the final run. The expected mocked recovery-denial stderr event is a regression-test result, not a live recovery request.

Existing G3 122 PASS / 2 SKIPPED evidence remains specific to its earlier source. Current G4.4 evidence supersedes it for this local candidate. **GO for review of the local G4.4 changes only; NO-GO for deployment/public opening.**

## Outstanding gates and GO/NO-GO

- **NOT TESTED:** actual modern Production-key SDK/Storage GET, 206 Range, HEAD/416, anonymous/cross-letter/revocation denial and credential/path non-disclosure; >4.5 MB Vercel chunk upload/streaming, runtime limits/egress; HTTPS/cookies/CSP/exact Origin/trusted-IP boundary; SMTP/invite/recovery delivery and replay denial, provider signup denial, TOTP/AAL2/Creator isolation, real multi-connection races, Heart/music/mobile and scoped physical cleanup.
- **PENDING:** privately configured Production hosting variables and credential operational checks, real contact/SMTP/provider/inboxes, Owner identity/bootstrap and MFA, retention/backup/logging capabilities and budget/plan suitability. Free has no automatic database backup reported; no Storage-byte recovery guarantee is made. No fictional contact or secrets are recorded here.
- **Pre-G7 exposure unresolved:** the build guard validates settings, not runtime release state. A valid recipient can access a published approved-owner fixture whenever the hostname is reachable. Before deployment, verify effective protection on all canonical/generated/alias URLs with no unapproved bypasses, or separately approve a default-closed server release lock and scoped acceptance access. No release lock is implemented by G4.4.
- **Maintenance:** `crons: []` means no configured schedule, not that `/api/cron/cleanup` is disabled. A valid secret can invoke destructive maintenance. No invocation/scheduler is approved; a stronger runtime disable control needs separate scope.
- **NO-GO for deployment or public release:** G5 review/source freeze, a new exact deployment authorization, G6 target acceptance and G7 public-opening approval remain separate. No retry of the consumed old attempt, automatic promotion or Prompt 08.
