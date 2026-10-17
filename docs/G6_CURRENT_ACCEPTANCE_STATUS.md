# G6 — Current protected Production acceptance status

Date: 2026-10-17, Asia/Bangkok. This report supersedes earlier pending commit/deployment/MFA/Creator/header/cookie statements in historical G6 reports. It does not erase initial failures or turn deferred checks into PASS.

## Target and decision

- Branch: `codex/g6-production-https-acceptance`.
- Frozen deployed runtime: `4a169ff185bd464516cdebf24b066a7963ca05d6` (`fix: add safe MFA setup fallback and preserve pending factors`). One approved local 11-file commit; no Git push performed in this workflow.
- Vercel project: `secretlove-preview`, ID `prj_TH2Qq194T1GbYwRUJ0n7DfR7MXYK`, team `team_KJpwyYId3LugWZ4U1jnF4h67`.
- Approved protected deployment: `dpl_C7vmfH8rjnpSXQHBvMoQ4GEe6vCa`, Production, READY. Canonical `https://secretlove-production.vercel.app` assigned under separate explicit approval. Function samples sin1; build location iad1 is distinct.
- Production Supabase: `mdoaageegovutlxhhicz` (new Production backend); historical test backend remains excluded. No migration edits or additional SQL from this update.
- Protection: last direct anonymous probes redirect to Vercel SSO; All Deployments/Owner-only/no added bypasses/Git-off confirmed by operator. No public opening or protection change performed.

**GO: continue existing owner-protected evaluation. G6 full acceptance: INCOMPLETE. G7 public opening: NO-GO on current recorded evidence.** Specific media/security and operational requirements below are unverified; user-directed diagnostic deferral is honored. No new deployment is required for this documentation update.

## Evidence rules

`PASS — operator` means the owner performed/reported that exact check. It is not independent browser automation, a raw-header export, or an agent provider query. Browser helper results below are actual operator-executed target observations, distinct from their local mocked tests. General “no errors” reports have limited coverage. No secrets, recipient sharing tokens, passphrases, MFA seeds/codes, cookie values, object paths or private fixture inventories are included here.

## Actual results

| Test | Status | Evidence / scope |
| --- | --- | --- |
| Exact local commit and deployment-source continuity | PASS — direct local | Approved SHA; 11 reviewed commit files, 167 matching deployment inputs. Environment/private-artifact exclusions retained. |
| One protected Production patch deployment | PASS — direct CLI | `vercel deploy --prod --skip-domain`, exit0, 167 downloaded inputs, environment guard/install/Next.js TypeScript/build success, READY; no retry. |
| Canonical routing and inspected runtime region | PASS — direct CLI | Separate approved alias assignment; canonical inspect resolves to patch deployment, sin1 samples. |
| Anonymous Vercel protection | PASS — bounded direct probes | Canonical root/MFA path and generated/system URLs return302 to Vercel SSO with normal TLS; no bypass or redirect following. Not exhaustive exception/path testing. |
| Invite, Recovery happy path and login | PASS — operator | Real controlled-inbox invite/recovery delivered; expected canonical callbacks/reset page; password update/sign-out/sign-in successful. No password/token collected. |
| Initial operator bootstrap | PASS — operator | Previously approved exact UID transaction/verification counts1/1/1/0. No re-execution. |
| Initial phone QR setup | FAIL — historical operator observation | Google Authenticator could not scan old QR. Root cause was never established. |
| MFA remediation and pending-factor reconciliation | PASS — scoped evidence | Patch removes implicit unenrollment, supplies local PNG/manual fallback. Exact single unverified factor retirement approved; operator-run supported Auth helper reports removal and empty remaining inventory. No bulk reset. |
| Replacement real QR/TOTP | PASS — operator | One new enrollment; Google Authenticator QR scan successful, Verify successful, navigation to `/operator`. Real manual-key fallback remains NOT TESTED. |
| Operator access and pre-Creator denial after MFA | PASS — operator | `/operator` renders; reports API200; Studio pending redirect and letters API403 `CREATOR_NOT_APPROVED` before approval. Source verifies identity/registry/AAL2. No JWT copied for independent claim inspection. |
| Single Creator approval and Dashboard | PASS — operator | Exact existing UID approved through normal Operator UI, revision1, Studio Dashboard. No additional account approved. |
| Authenticated collection/detail requests | PASS — operator browser output | Collection GET200, A/B detail GET200. Earlier uncorrelated404 was not reproduced in this measured batch; its origin is unknown. |
| A/B private image and MP3 Studio flow | PASS — operator | Normal uploads, images load, music Enable persists after reload, preview time advances, both published. Prescribed original MP3 is4,788,828bytes/299.99sec; actual end-to-end byte comparison was not reached. |
| Recipient visual reading | PASS — limited operator report | Owner reports no visible letter errors after flow instructions. Does not independently establish every negative gate, scene/mobile/fallback or timing requirement. |
| Close/unpublish/republish link lifecycle | PASS — operator | Close requires unlock; unpublish invalidates old A link; republish leaves old link invalid; new link gates/reads; B unaffected. Direct revoked-media byte denial is separate. |
| Hosted header sample suite | PASS — operator browser output | `/studio`200 and `/api/letters`200; all14 assertions true on each: private/no-store, CSP/default/nonce/exact connect/media/object/frame/base/form, referrer, nosniff, HSTS,noindex. Not every route/browser/Origin behavior. |
| Recipient cookie attributes | PASS — operator | HttpOnly=yes, Secure=yes, SameSite=Lax, Path=/ on instructed recipient cookie. No value/name suffix exported. Lifetime/fixation not measured. |
| Original owner-media metadata preconditions | FAIL — actual helper result | A/B detail200 but combined expected state false, suite `STOP_FIXTURE_STATE`. No media request followed; exact mismatch unknown. Not a confirmed upload/authentication defect. |
| Follow-up metadata diagnosis | SKIPPED — operator decision | Owner instructed skip and states self-test successful. Preserve original failure; no change to assertions or automatic fixture adjustment. |
| Full expected audio bytes, HEAD,206,416 and wrong-parent media via helper | NOT TESTED | Suite stopped before them. General manual self-test claim has no per-test evidence; do not upgrade to PASS. |
| Optional isolated `tests/audio-live.test.ts` | SKIPPED / NOT TESTED | Prior explicit deferral remains; no isolated fixture created solely for it and no claim it passed. |

The earlier deployed baseline `f1832f7be25a312974d79bcc9a44a9d86ffe7942` and its initial scan failure remain historical. Successful replacement QR is a demonstrated resolution of the observed flow, not proof of the old scan failure's cause.

## Fixtures and bounded operations

Two explicitly approved QA letters use existing approved Creator UID `3f043619-e816-49b9-ab42-e4919ef5e3d4`:

- A: `7e132579-d0e2-41a7-8850-40ec74b074d7`.
- B: `296715a7-cf14-4668-94b1-f6fa86b70db5`.

Owner performed normal Studio/recipient actions. An additional preparatory unpublish/media/republish cycle on A/B was specifically approved after both were initially published without media; a later A-only revocation cycle was within the original approved test scope. Current reports say both published and retained. No account/letter deletion, global cleanup/cron, unrelated fixture changes or historical-backend operations performed. QA sharing tokens were received in chat but not copied into repository reports or opened by the agent; after later republication old links are reported invalid. Keep current links private.

Prepared original images (PNG640x400,4,807bytes each) and synthetic five-minute MP3 were generated offline with existing dependencies/generator. Actual MP3 framing/decode/unchanged normalized bytes PASS locally. Silence proves transport/timing only, not audible playback quality. Runtime source/dependencies/migrations/credentials/provider settings were not changed by QA helper preparation.

## Remaining release gates

| Gate | Current state / required evidence |
| --- | --- |
| Actual private audio transport compatibility | Target full GET/expected bytes above4.5MB,HEAD,206,416 and revocation/anonymous/cross-letter recipient denial still need specific evidence or a documented change to acceptance requirements. Do not resurrect an exposed legacy key or claim mock/local tests satisfy target checks. Server modern-key type is operator configuration evidence, not a browser secret inspection. |
| Protected data before gate | Specific locked API/HTML/RSC/metadata/preload and anonymous Storage-denial results not supplied in this batch. Visible generic welcome alone is insufficient. |
| Ownership/negative gate controls | Second-Creator ownership test not authorized/executed on Production; normal invalid-name/wrong-passphrase generic denial, thresholds/trusted-IP behavior and exact authenticated Origin denial not individually evidenced. Name/DOB remains low assurance. |
| Session/recovery negatives | Deployed30-minute expiry/fixation, recovery replay/single-use/cross-account negatives and direct audio requests after Close/revoke remain unexecuted. Existing local tests/source protections are not target acceptance. |
| Device/scene/audio detail | Physical audibility, browser autoplay restrictions, exact continuity measurements, mobile performance, reduced-motion/WebGL fallback, real manual TOTP fallback not individually evidenced. No new controls feature requested. |
| Privacy/report/deletion operations | Real request contact exists, but report review/hold/audit/deletion/worker end-to-end and actual retention capabilities not verified here. Proposed reports90days-after-resolution/logs30days/backups<=30days are not operational guarantees or legal-compliance claims. |
| Cleanup and monitoring | Reviewed cron schedule remains empty; valid-secret cleanup endpoint is global within the Production project. No invocation authorized by these results. Establish an approved bounded worker/operator plan, staging/deletion queue behavior, monitoring/resource/egress/quota and rollback procedure before release. Do not bulk-delete historical synthetic users. |
| Legacy hostname | Prior old hostname404 remains a routing decision (redirect or intentionally retire); no remote domain correction performed. Canonical works on actual evidence. |
| G7 protection/public opening | Separate exact public-opening action and verification required; no approval inferred from success of private tests. Preserve All Deployments meanwhile. |

Do not repeat the deferred metadata diagnostic against the owner's instruction. Honest unresolved evidence remains unresolved. No confirmed new critical/high application defect was isolated in this batch; metadata failure remains unclassified until its condition is known.

## Validation and evidence location

Frozen runtime local checks, carried by exact-source continuity: typecheck/lint/production build PASS;139 portable tests PASS/2 SKIPPED;22 mocked desktop/mobile MFA component tests PASS. Approved cloud build also PASS. These are prior actual runs, not newly rerun by this documentation update.

Ignored operational helper mock tests are separate:11 factor-retirement,9 owner-media,10 metadata-diagnostic and4 header tests PASS; browser execution results are only those supplied by owner. They do not increase the main app-test count or prove provider execution. No new dependencies or remote test fixtures created by mock tests.

Local operational evidence is retained under ignored `test-results/g6-mfa-deploy-preflight/`: source/packaging checks, deployment/alias results, factor/Creator/fixture approval ledgers, offline asset metadata, `owner-media-attempt-01.json`, `header-result-operator.json` and `HEADER_COOKIE_STEPS.md`. Private test artifacts are excluded from source upload/Git; this sanitized report does not embed secret-bearing artifacts.

Documentation-only working-tree changes are intentionally uncommitted; frozen deployed SHA remains unchanged. No automatic commit/push/redeploy/public-opening action follows. Next work is to close or explicitly disposition outstanding G6 evidence/operational gates before presenting any G7 action.

Fresh reporting validation PASS: all167 deployment inputs byte-match the reviewed frozen source manifest; installed CLI selection remains167 files with24 deny/20 retention probes, all nine migrations retained, zero credential/private-artifact paths selected and zero network attempts. Eight current reporting/SQL files pass bounded unexpected credential/share-token marker scanning and Git whitespace checks. No credential file read or secret fingerprint produced. Evidence: ignored `consolidation-source-check.json` and `test-results/g6-mfa-upload-review-1792183151097/`. Reports are excluded from deployment upload; tracked working tree now contains reporting edits only, with no commit/staging.

## Subsequent operations preparation

Owner requested continuation. [G6_OPERATIONS_READINESS.md](G6_OPERATIONS_READINESS.md) records source-confirmed global cleanup effects, unscheduled source cron, draft privacy state, provider capability references, monitoring/rollback proposal and manual read-only snapshot. No cleanup/cron/SQL/remote settings invoked. Owner explicitly chose maximum30-day log retention with shorter Free/Hobby history accepted; backup/log metadata still pending. Reply “không” to usage/warnings is recorded only as no warning reported, not a numeric plan/quota verification. Prepared SQL passes isolated PGlite syntax/aggregate/read-only checks; actual Production execution NOT TESTED. Historical deployment/retention docs now distinguish current state. Public NO-GO and deferred media results remain unchanged.

### Subsequent operator snapshot received (2026-10-17)

Supersedes the awaiting-JSON status above: operator returned `transaction_read_only: true`, empty cleanup queue, all three buckets private, one expired recovery-consumption record, otherwise zero returned backlog, empty maintenance records, one user/active Operator/approved Creator and two active letters. One ready image/one Storage object (388,102 declared bytes); **zero ready audio assets and zero audio/staging objects**. No missing active ready-object metadata reported, but zero audio makes that audio counter vacuous. See operations report for exact limits and interpretation.

Snapshot is operator-supplied evidence, not agent provider execution. Subsequent operator clarification: files were not fully uploaded; missing audio/incomplete photos reflect fixture state, not a reported program defect. Audio target acceptance remains NOT TESTED / fixture prerequisite incomplete; earlier A/B reports are historical observations, not current full-audio proof. The original stopped suite's metadata FAIL remains recorded with this newer fixture explanation, without claiming its exact failed condition was diagnosed. Skipped diagnosis not repeated. Queue empty is not cleanup/deletion proof; empty maintenance is not proof a worker never ran. No new mutation, cleanup, fixture, deployment or public-opening authorization inferred. Backup/PITR/log facts remain pending. Public NO-GO unchanged.
