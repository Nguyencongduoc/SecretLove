# Free-tier stable Preview origin — proposal, not execution

Latest final review: operator intends `https://secretlove-review-ngcd.vercel.app` and reports nine Preview-only variables/four server Secrets configured. **Candidate hostname, not an allocated alias.** Current directly opened September 15, 2026 Vercel scope/pricing pages confirm Authentication + All Deployments on all plans; an older conflicting search-cache result is superseded. Effective project protection remains unverified. Read DAY3_PREDEPLOYMENT_SECURITY_REVIEW.md for upload-exclusion, key-retirement, artifact and configuration blockers before executing this historical procedure. No remote action or deployment is authorized.

2026-10-15, Asia/Bangkok. Branch: `feature/day-3-preview-acceptance`. Owner has created/linked `secretlove-preview`; no deployment exists according to the owner. This document authorizes **nothing** remotely. No Vercel/Supabase setting, deployment, alias or email operation has been performed by the agent.

## Confirmed inputs and pending fields

Local `.vercel/project.json`: project `prj_TH2Qq194T1GbYwRUJ0n7DfR7MXYK`, org `team_KJpwyYId3LugWZ4U1jnF4h67`, name `secretlove-preview`. CLI **64.0.2** is now installed; local version/help inspected, not a remote project inspection. Current repository revision is `3b55d83351132b86de7d1dc90f8778a251377f21` plus the owner's pre-existing .gitignore addition excluding .vercel, which is preserved.

Owner reports Authentication/Standard Protection and Git auto-deployment disabled; dashboard project domain is assigned to Production and cannot be reassigned to Preview without Git integration. Remote effective settings have not been independently checked. Exact existing project hostname, scope slug, proposed canonical alias hostname, alias availability and resource/settings approval remain **PENDING**. No guessed hostname is an actual URL.

## Recommendation

Use a **separate, operator-selected free `vercel.app` alias**, manually pointed to an explicitly Preview-targeted CLI deployment. Leave the existing Production-assigned project domain untouched. Keep one exact APP_ORIGIN equal to that selected HTTPS alias and keep the Preview-only guard unchanged. Git integration, custom paid Preview suffix and a Production deployment are unnecessary for this proposal.

First obtain approval to strengthen protection to **Vercel Authentication / All Deployments**, then verify effective owner-only access. Vercel documents this scope without a paid add-on; Standard excludes Production domains. A manual alias must not depend on assumptions about its protection/domain classification. If the account cannot enable the documented free scope, stop and review rather than weaken protection. [Protection scope](https://vercel.com/docs/deployment-protection)

Alias assignment routes a hostname to a selected deployment; it is separate from selecting the deployment environment. The deployment must be created with `--target=preview` and verified as Preview before and after aliasing. Manual assignment does not require automatic Git branch/domain association. [CLI alias](https://vercel.com/docs/cli/alias), [deployment target](https://vercel.com/docs/cli/deploy)

This is a **two-stage bootstrap approval**, not a claim the alias already exists: approve one exact candidate hostname before build, create one protected Preview, then bind/verify that exact hostname. If it is unavailable or protection fails, stop without trying alternate names, moving existing aliases, changing Origin, exposing public access or sending mail. The final HTTPS acceptance origin becomes verified only after the binding/protection/TLS checks. The operator must expressly approve this dependency; it is not implied by the earlier exact-origin gate.

## Options evaluated

| Option | Origin stability / first-deployment issue | Decision |
| --- | --- | --- |
| Unique generated deployment URL | Exact and pinned to one artifact, subject to retention; unknown before creation, different for another deployment. Current guard needs APP_ORIGIN before the build | Useful for inspecting the bootstrap artifact, not the stable canonical origin. Do not deploy, copy its URL into env, then redeploy expecting the same generated URL |
| Automatic Git branch URL | Can follow the branch; depends on actual branch association/provider configuration | Do not introduce Git integration or fabricate a branch hostname to resolve this setup issue |
| Generated CLI project/author alias | Provider may generate additional reusable URLs; inspect actual assignments. A project URL can later point to Production | Do not predict the hostname or assume it is Preview-only. An independently verified alias could be chosen in a separately reviewed packet |
| Existing Production-assigned project domain + manual alias | Manual routing can target a Preview artifact, but its Production domain classification makes Standard Protection unsafe to assume and the dashboard label confusing | Leave it untouched in the recommended flow; no reassignment/promotion workaround |
| Separate manual `vercel.app` alias | Operator chooses exact hostname first; allocation requires a deployment, conflicts possible; manually repoint after approved updates | Recommended with All Deployments and explicit conditional bootstrap approval |

Unique generated URLs and reusable aliases are different objects; do not derive actual names from documentation formulas. See [generated URL behavior](https://vercel.com/docs/deployments/generated-urls). Alias-list absence does not prove global availability, and another scope's `vercel.app` alias cannot be claimed by DNS verification. See [alias conflicts](https://vercel.com/docs/cli/alias#troubleshooting-alias-conflicts).

## Changes needed before the first deployment

**No application, migration, dependency, APP_ORIGIN validator or build-guard change is needed for the recommended alias flow.** The guard validates an explicit exact HTTPS value; it does not require the hostname to be serving before build. `src/lib/server/env.ts` and `http.ts` keep the same server-side Origin checks. The first generated hostname will not match the canonical alias, so application mutations there should deny; this is intentional, not a defect to bypass.

Required, approval-gated operator changes: All Deployments protection, effective owner-only access, complete **project-level Preview-only** variables and the one exact proposed alias as APP_ORIGIN. Without Git integration, do not depend on unverified branch-specific variable selection for the first CLI deployment. Keep Production settings and the existing Production-assigned hostname unused. Preserve the existing gate HMAC continuity, isolated Supabase selection, quotas and private Storage from DEPLOYMENT.md.

Using the unique generated URL as APP_ORIGIN before its first build would instead require a separately reviewed bootstrap resolver using trusted Vercel-provided deployment metadata at both build and runtime. Merely setting a runtime `--env` value is insufficient for the build guard; changing host variables after a deployment does not reconfigure that existing artifact. No resolver is implemented or approved. Never substitute incoming Host/forwarded headers, allow wildcard origins or bypass the guard.

## Ordered manual procedure — execute only after the exact packet is approved

1. **Complete identifiers and get approval.** Confirm the local project/org match the intended Vercel account; obtain the actual scope slug and existing Production-assigned hostname. Choose one separate exact candidate alias ending in `vercel.app`, confirm no conflicting alias under the controlled scope, and record it as proposed/unallocated. Present the exact hostname, Preview environment, branch/revision, protection change, env settings, one bootstrap deployment and subsequent alias action for explicit approval. No current command below is authorized.
2. **Strengthen and inspect protection.** In this project's protection settings keep Authentication enabled and select All Deployments. Audit owner-only effective access and all bypass/exemption/share/access-group/membership entries. Verify remote Git auto-deployment remains disabled. Do not enable Git, create a Production deployment, or remove other users/aliases without authorization.
3. **Configure Preview values privately.** In project-level Preview scope configure the isolated Supabase URL/public key/server key/reference and required security settings. Set APP_ORIGIN to `https://` plus the exact approved alias, without trailing slash. Keep Production values absent/unused; no deployed test namespace. Confirm Node/runtime/region/resources and the unchanged guarded build command. Do not export/overwrite .env.local or put secret values in CLI arguments/logs. Review deploy file exclusions, including .env*, .test-fixtures.json and .vercel.
4. **Create exactly one Preview artifact.** From the reviewed branch/workspace with the local link, after approval:

   ```powershell
   # Placeholder scope must be replaced by the actual approved slug.
   vercel deploy --target=preview --project prj_TH2Qq194T1GbYwRUJ0n7DfR7MXYK --scope <VERIFIED_SCOPE_SLUG>
   ```

   Use a cloud build with Preview-scoped settings, not a prebuilt artifact built for another environment. Record the actual returned unique URL/ID and inspect its project, org, environment and revision. Confirm VERCEL_ENV=preview and guard success. Probe its platform protection. Do not perform app mutations or send mail on this noncanonical hostname. Never use `--prod`, `--target=production`, `promote`, `--public`, a temporary anonymous deployment or an overridden unguarded build. `--skip-domain` is a Production option, not a Preview workaround.
5. **Bind the separately approved exact alias.** Only after confirming that the returned artifact is protected and belongs to this project in Preview:

   ```powershell
   vercel alias set <ACTUAL_PREVIEW_DEPLOYMENT_URL_OR_ID> <EXACT_APPROVED_ALIAS_HOSTNAME> --scope <VERIFIED_SCOPE_SLUG>
   ```

   Alias hostname has no `https://` prefix. Use the actual CLI-returned deployment; no invented URL. Do not overwrite/remove/move an existing alias or operate on the Production-assigned project hostname. A conflict/error ends this bootstrap; ask before choosing a different hostname or attempting a second deployment. Reinspect target environment and alias ownership/routing after assignment; it must still be the same Preview artifact.
6. **Verify the canonical origin before use.** Confirm DNS/TLS and exact alias routing, and use a fresh unauthenticated browser/client on the canonical, unique and any additional generated URLs. All must show genuine provider authentication protection, not private application content or an unrelated redirect. Authenticate as the sole approved owner; confirm canonical hydration/CSP and exact-Origin behavior. If any host is public, stop and use only a separately approved rollback action; do not disable checks to complete setup. The existing Production-assigned domain must not serve an unprotected app.
7. **Configure callbacks only after alias verification and approval.** Set isolated Supabase Site URL and exact callback targets to the verified canonical origin, retain token-hash confirmation/recovery templates and approved local callback entries only as intended. No wildcard. Changing Supabase Auth settings is a remote action included in a separate or completed approval packet. No signup/recovery email test is authorized by alias creation alone.
8. **Run gated acceptance separately.** After explicit test/mail/fixture approval, set the runner's exact Preview origin to this verified alias and run the guarded tests plus the missing seventeen-row checks. No valid global cleanup, historical fixture/account deletion or public release. Store sanitized target/revision/results. To update later, build another explicitly approved Preview with the same APP_ORIGIN, verify it, then repoint this alias; no automatic production promotion. Repointing must preserve publication/session semantics and compatible code/schema.

## Status and approval request

Local link/CLI/source review complete. Alias allocation, All Deployments setting, actual routing/TLS/protection and all hosted acceptance are **NOT TESTED**. Attempt remains NO-GO until the exact candidate/scope/resource/configuration packet and this conditional bootstrap are explicitly approved; owner-only and public release acceptance remain independently NO-GO.

Requested next input: approve or reject the **plan only**, and provide the actual scope slug, existing project hostname and desired separate alias hostname. That response does not authorize remote execution unless it explicitly approves the completed exact settings/deployment/alias action packet. No remote settings/deployment/alias/mail operation has occurred.
