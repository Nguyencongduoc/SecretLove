# G7 — Public Access release preparation

Completion record: [G7_PUBLIC_ACCESS_REPORT.md](G7_PUBLIC_ACCESS_REPORT.md). Public-opening actions complete with explicitly accepted NOT TESTED exceptions; legacy redirect repaired and verified. This packet retains historical approvals/failures/execution detail, not a request to repeat the protection save or PATCH. G6/full security acceptance remains incomplete; G8 transition is scoped separately.

Date: 2026-10-17, Asia/Bangkok. Branch verified `codex/g7-public-access`. This report records preparation, subsequent exact operator approval/save and scoped public-access verification. Owner skipped additional backup/log/retention verification; deferred tests do not become PASS. No remote change, deployment, account/fixture write, cleanup, mail, commit or push performed by agent.

## Current outcome — homepage confirmed

After the independent canonical200 and authorization-denial samples below, owner replies “đã oke” to opening the canonical directly. Record PASS — operator confirmation for homepage access only, superseding the earlier browser failure as a current unresolved access issue. Its original cause was not established; no fix, cache cause, credential issue or wider test result inferred.

Approved public-access scope change is operator-reported complete; canonical homepage availability is demonstrated by direct stateless request and owner confirmation. Sampled Creator/Operator restrictions and Preview/generated protection passed as recorded. The old-hostname404 was subsequently repaired through one separately approved redirect PATCH:7/7 post-repair checks PASS, correct domain/alias metadata and canonical binding preserved. See [repair evidence](G7_LEGACY_HOSTNAME_REPAIR.md). This is not full G6/security/media/operations acceptance; deferred tests remain NOT TESTED and risk acceptance explicit. No automatic G8 work or extra deployment/settings change.

## Latest operator approval and reported execution

Owner explicitly approved the concrete G7 packet: “Duyệt mở public và đóng lại khi lỗi; chấp nhận các mục NOT TESTED”. This supersedes approval-pending statements below for the exact scoped action only. Owner accepts proceeding despite the recorded technical NO-GO recommendation; it does not change test outcomes, establish G6 completion, authorize unrelated settings or create verified retention/transport guarantees.

Approved: keep Vercel Authentication enabled on project `secretlove-preview`, change All Deployments to current Standard Protection for the recorded deployment/domain inventory, preserve existing Preview/redirect configuration, perform scoped read-only anonymous checks, and restore All Deployments if security checks fail/unexpected exposure occurs. No deploy, alias mutation, Git change, fixture upload/write, cleanup, provider data/credential change or new email included.

Initial execution handoff: available Dashboard browser was at Vercel login; agent did not change settings or click Save. Operator subsequently reports **Standard Protection saved**, initially says homepage public, then corrects the browser result to **not accessible without Vercel**. Following direct checks and the canonical-link handoff, owner finally confirms “đã oke”. This latest confirmation resolves the reported access issue for the homepage, without proving its historical cause. No login credentials requested/read/exported, API mutation or deploy executed by agent. App/runtime source remains unchanged.

### Fresh bounded post-save checks (2026-10-17)

A separate browser tab directly rendered the SecretLove homepage on the canonical URL. Independently, eight direct HTTPS GETs with no Cookie/Authorization headers and no redirect following returned the results below. These fresh requests supersede the earlier network-error attempt only for the sampled paths; not every alias/bypass or private media path was tested. No private content body or redirect query retained.

| Target | Actual response | Result |
| --- | --- | --- |
| Canonical `/` |200, title SecretLove, no redirect | PASS — direct stateless public homepage |
| Canonical `/api/letters` |401 `AUTH_REQUIRED` | PASS — anonymous Creator API denied |
| Canonical `/api/operator/reports` |401 `AUTH_REQUIRED` | PASS — anonymous Operator API denied |
| Canonical `/studio` |307 to same-origin `/login` | PASS — Creator login required |
| Canonical `/operator` |307 to same-origin `/login` | PASS — Operator login required |
| `secretlove-preview.vercel.app/` |404, no redirect | FAIL — expected307 redirect not observed; routing discrepancy, not demonstrated private-data exposure |
| `secretlove-review-ngcd.vercel.app/` |302 to Vercel `/sso-api` | PASS — sampled Preview root protected |
| Recorded immutable deployment root |302 to Vercel `/sso-api` | PASS — sampled generated URL protected |

Evidence: ignored `test-results/g7-public-access/anonymous-results.json`. Total:7 PASS /1 FAIL expected redirect; previously deferred audio/security/operations tests remain NOT TESTED. Root availability is established for fresh stateless requests and subsequently confirmed by owner. The earlier owner browser failure remains historical with unknown cause. Do not call the Creator sign-in link Vercel Authentication, disable Authentication, or alter Origin to remedy that distinction. No OAuth state, cookies or token-bearing URLs requested or retained in reports.

No unexpected protected-content access was observed in these eight requests, so no containment change was invoked. Old-hostname404 does not establish a leak or justify changing its alias/redirect outside the approved scope. Additional routing correction needs its exact review/authorization. Public availability is partially verified, not full G6/G7 acceptance.

Owner subsequently requests and explicitly approves the legacy-hostname repair. Provider/domain/alias checks localize404 to Vercel routing despite a saved verified307 domain rule. One approved PATCH reconciles routing; root/path/query307 and scoped security regression checks PASS, canonical binding unchanged. See [diagnosis and completed repair](G7_LEGACY_HOSTNAME_REPAIR.md). Original404 row above is historical; no application code/deploy/protection change performed.

### Historical operator execution handoff — do not repeat completed save

1. In the owner's signed-in Vercel Dashboard, select exact project `secretlove-preview`. Confirm current Production deployment is `dpl_C7vmfH8rjnpSXQHBvMoQ4GEe6vCa` and reported three-domain mapping has not changed; otherwise stop and report metadata only.
2. Settings → Deployment Protection → Vercel Authentication: keep enabled; change scope from All Deployments to current Standard Protection (not None or a legacy scope).
3. Save this one setting. Keep domains, Preview branch, environment variables, Git, cron and Supabase unchanged.
4. Report whether Save succeeded and displayed scope, then check canonical homepage in a private browser with no Vercel/app session. Report displayed page/status only; no cookies, tokens or protected content. Opening remains unverified until actual save and anonymous results arrive.

No additional approval is needed for this unchanged exact scope. The already-approved containment is to restore All Deployments on unexpected exposure; no speculative rollback/deletion is authorized.

## Exact candidate

| Property | Candidate / evidence |
| --- | --- |
| Frozen runtime HEAD | `4a169ff185bd464516cdebf24b066a7963ca05d6`, directly verified locally |
| Recorded deployed artifact | `dpl_C7vmfH8rjnpSXQHBvMoQ4GEe6vCa`, prior G6 READY evidence; not freshly re-inspected here |
| Vercel project | `secretlove-preview`, `prj_TH2Qq194T1GbYwRUJ0n7DfR7MXYK` |
| Team | `team_KJpwyYId3LugWZ4U1jnF4h67` |
| Intended public canonical | `https://secretlove-production.vercel.app` |
| Production backend | `mdoaageegovutlxhhicz`; historical test backend excluded |
| Recorded protection | Operator reports Vercel Authentication / Standard Protection saved; direct canonical public and Preview/generated protection samples now measured, no fresh authenticated settings inspection |
| Approved change | All Deployments → current Standard Protection, operator-reported executed; agent made no remote setting change |
| Runtime/config boundaries | Preserve exact APP_ORIGIN, private buckets, Creator approval, recipient authorization, cron unscheduled and Git deployment disabled |

No new build/deploy is inherently required for a protection-scope change. Source/runtime, environment variables, keys, aliases, SQL and provider billing settings are outside this preparation.

## Evidence and prerequisite disposition

| Item | Status | Meaning |
| --- | --- | --- |
| G7 branch / frozen HEAD | PASS — direct local | Expected branch and HEAD confirmed; G6 reporting edits retained unstaged |
| Historical local runtime checks | PASS — previous runs only | Typecheck/lint/build,139 portable tests and22 mocked MFA browser tests;2 optional tests skipped. These do not prove hosted media authorization |
| Auth/MFA/Creator/header/cookie observations | PASS within recorded G6 scope | Use [G6 current report](G6_CURRENT_ACCEPTANCE_STATUS.md); no expanded coverage inferred |
| Aggregate private buckets/queue | PASS — operator snapshot only | Three private flags, empty queue; not proof of full Storage policy, deletion or transport |
| Media fixture readiness | INCOMPLETE — operator | Owner clarified files not fully uploaded; snapshot has zero ready audio assets/objects and one photo across two active letters. No application defect inferred |
| Real modern-key full audio GET/bytes above4.5MB/HEAD/206/416 and recipient cross-letter/revoked/anonymous denial | NOT TESTED | Original helper stopped at fixture preconditions; optional live test deferred. No automatic fixture creation/re-upload or repeat of skipped metadata diagnosis |
| Other locked-content/ownership/recovery-negative/report/deletion controls | NOT TESTED where G6 evidence absent | Local/source protections are not deployed acceptance |
| Backup/log/retention verification | SKIPPED BY OWNER / NOT VERIFIED | Owner instructed to stop this work. Log target remains maximum30days, shorter Free/Hobby history accepted; no final retention guarantee or new request to repeat the work |
| Fresh anonymous HTTPS probes |7 PASS /1 FAIL — direct | Canonical200, two APIs401, two app pages307 to login, Preview/generated302 SSO; old hostname404 instead of307. Earlier four network errors remain historical; no full media/gate acceptance inferred |
| Project domain inventory | PASS — operator Dashboard metadata | Three hostnames with environments/redirect given below; no independent provider inventory or live routing verification in this step |
| G7 public-opening/containment action | Save reported by operator; partial effect verified | Agent did not save settings; containment authorized but not invoked. Exact settings/bypass inventory not freshly re-inspected |

Owner's request to make items PASS is not test evidence. Deferred requirements remain unverified; acceptance criteria may only change through an explicit recorded scope decision. Do not manufacture successful results or describe incomplete uploads as a fixed program defect. Preparation can proceed while the technical recommendation remains NO-GO for public opening on current evidence.

## Protection scope and alias gate

Current Vercel documentation describes Standard Protection as leaving production domains public while protecting other deployments, including generated production deployment URLs. This is project-wide scope, not an allowlist of only our canonical hostname. Review the current (not legacy) setting and every attached Production domain before any save. [Vercel protection scopes](https://vercel.com/docs/deployment-protection#choose-which-urls-to-protect).

Operator supplied the complete Settings → Domains inventory on 2026-10-17:

| Hostname | Operator-reported configuration | Intended post-change check |
| --- | --- | --- |
| `secretlove-production.vercel.app` | Production; Valid Configuration | Public canonical shell, with application authorization still mandatory for private content |
| `secretlove-review-ngcd.vercel.app` | Preview; branch `feature/day-3-preview-acceptance`; Valid Configuration | Remain protected; do not change branch binding or trigger a Preview deploy. Valid Configuration alone does not prove an available deployment |
| `secretlove-preview.vercel.app` | HTTP307 redirect to canonical; No Deployment | Keep existing redirect unchanged; verify actual Location/destination without assuming a hosted app at this alias |

Recorded immutable deployment URL `secretlove-preview-3d0vtuuwn-nguyencongduoc.vercel.app` is also a protection-check target; generated URLs are not necessarily separate entries in Settings → Domains. No extra Production app hostname reported. This is operator metadata, not fresh routing/protection proof or live deployment inspection. Do not remove, redirect, reassign or exempt any hostname. Exact Origin validation is not a substitute for protection. Any additional domain/artifact discovered before saving means stop and reconcile.

## Concrete approval candidate — not executed

On project/team identified above, for the existing frozen Production deployment and reported domain inventory only: operator keeps Vercel Authentication enabled and changes its scope from All Deployments to current Standard Protection. Canonical becomes publicly reachable; the existing307 redirect stays configured; Preview/generated URLs are expected to remain protected and must be checked. Do not select None, legacy protection scope or create exceptions/bypass/share links. Do not deploy, assign aliases, change Git, credentials, APP_ORIGIN, backend, region, Storage, Auth, SQL or cron.

Candidate also includes one bounded containment action: if a security check fails or an unexpected hostname is public, operator restores All Deployments immediately on this same project, with subsequent anonymous protection verification. Owner approval must explicitly acknowledge that remaining G6 audio/security/operations tests are NOT TESTED and public-readiness recommendation remains NO-GO. Such an operator exception is a release decision under uncertainty, not test success; no exception or remote change is inferred from the inventory response. Normal recipient letter/session gates must still be enforced. No fixture write, global cleanup or new email is included.

## Ordered execution packet — pending prerequisites and exact approval

1. Review alias inventory and current deployment target/protection/exceptions. Stop for unexpected domain, artifact, bypass, account or settings change. Do not reveal credentials or create a bypass to make tests pass.
2. Disposition missing G6 security evidence explicitly. Audio cannot be tested without an eligible ready asset; fixture changes are not authorized here. Keep optional/live/deferred outcomes separate. Do not relabel skipped checks PASS or silently waive server authorization requirements.
3. Present the final exact project, all Production domains affected, frozen deployment, current-to-target protection scope and outstanding risks. Owner separately approves that concrete public-opening action and the containment action in step6. No approval inferred from switching branches.
4. Only after approval, operator changes Vercel Authentication scope from All Deployments to current Standard Protection on this project. Keep authentication enabled, no exceptions/share links/new bypasses, no deploy/alias/Git/provider changes. Record actual save result/time.
5. In a new browser session without Vercel/application/bypass cookies: canonical root/login/privacy/generic gift shell should load without Vercel login; `/api/letters` must deny anonymous application access, Studio/Operator must enforce app identity and roles. Verify locked content/media deny without a valid letter-bound session and inspect HTML/RSC/metadata/preloads for leaks using approved fixture scope. Verify generated/Preview URLs remain protected and all Production domains behave as approved. Follow-up recipient verification/rate/report POSTs or fixture writes require their actual approved test scope; no bulk testing or cleanup.
6. Proposed containment for explicit approval: if private content is accessible before authorization, cross-letter access succeeds, unintended hostname becomes public, or expected protection is absent, operator restores Vercel Authentication / All Deployments on the same project immediately, then confirms anonymous SSO redirects. Do not rotate keys, delete data, roll back SQL, deploy an old artifact or purge queues as an improvised response. Scope rollback does not recall previously delivered content. Stop traffic promotion and investigate.
7. Record each result PASS/FAIL/NOT TESTED with actual environment/evidence. Only then issue a public-operation recommendation; G8 scheduler/monitoring/cleanup remain separately scoped.

## Current recommendation

**Approved canonical public-opening action complete by operator report; homepage access PASS by direct stateless sample and subsequent owner confirmation; separately approved old-hostname redirect repair PASS. Full release-readiness recommendation remains NO-GO with deferred security/transport/operations evidence.** Operator accepted documented NOT TESTED risks. Agent executed only the approved one-domain redirect reconciliation, not the protection change or a new deployment. No claim of complete public acceptance or automatic G8 authorization. Runtime source unchanged; no app-test rerun required for the provider-only repair/reporting.
