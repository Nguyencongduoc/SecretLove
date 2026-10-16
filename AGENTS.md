
# SecretLove — Agent Instructions

SecretLove is a private digital letter platform: authenticated Creator Studio and gated Recipient Experience. Stack: Next.js App Router, TypeScript, Tailwind, Supabase Auth/PostgreSQL/private Storage, Motion, React Three Fiber, Vercel.

## Approval and scope

- Latest G5: owner requested source-freeze preparation and confirmed `codex/g5-production-source-freeze`. Review carried G4.4 changes, verify deployment-source continuity/exclusions, and prepare the exact commit manifest/report. Do not change runtime/guard/migrations, read secrets, stage, commit/push, mutate remote settings/data, invite users, send mail, run cleanup or deploy. A local commit requires separate approval of the reviewed file manifest. See `docs/G5_PRODUCTION_SOURCE_FREEZE_REVIEW.md`.

- Latest G4.4: owner authorized local Production binding/guard/tests/docs updates on `codex/g4-production-configuration`: origin `https://secretlove-production.vercel.app`, backend `mdoaageegovutlxhhicz`. G4.1–G4.3 completion is operator-reported, not direct provider/HTTPS acceptance. Preserve historical Preview/owner-only modes and migrations 001–009. Do not read/change `.env.local`, use real credentials, mutate remote settings/data, send mail, create fixtures, invoke cleanup, commit/push or deploy. See `docs/G4_PRODUCTION_CONFIGURATION_STATUS.md` for current evidence and outstanding gates. Earlier milestone restrictions/status below are historical where superseded.

- Latest: user approved G3 public-release implementation on `codex/g3-production-implementation`, following `docs/G2_PUBLIC_PRODUCTION_DESIGN.md`. Local approval/report/operator/privacy/public guard work is authorized. New migration 009 is for the separately approved new Production backend only. Preserve 001–008, `.env.local`, historical test data and the existing server; no remote SQL/settings/accounts/mail/fixtures, cleanup, commit/push or deployment without their later exact gates. See `docs/G3_PUBLIC_RELEASE_IMPLEMENTATION.md` and the G4 preparation packet.

- Read docs/PRD.md, docs/ARCHITECTURE.md, docs/ARCHITECTURE_REVIEW.md, docs/DATABASE.md, docs/API.md, and TASKS.md before work.
- The user approved the core and Day 1.5 architecture and authorized Day 2 publishing/access plus the complete recipient scenes (previously planned for Day 3). Preserve Day 1 functionality and .env.local; no destructive SQL. Advanced theme/drag-and-drop editors, video, private music uploads and deployment remain outside this milestone.
- After approval, implement one milestone at a time; keep future features out of scope. The three-day target is a stretch estimate requiring schedule/scope approval. Record approval and progress in TASKS.md.
- Public-release phases follow docs/PUBLIC_PRODUCTION_WORKFLOW.md. Present a new `codex/gN-...` branch command before each phase and verify the branch before work; preserve uncommitted work and do not commit/merge/push automatically. G2 is design-only; implementation, remote configuration, deployment and public opening have separate approval gates.

## Implementation

- Prefer simple maintainable architecture and existing conventions; avoid unnecessary dependencies.
- Use Server Components for server data/shells; Client Components for forms, editor, and animations. Share authorization logic in a server-only DAL.
- Mobile-first layout; accessible labels/focus/controls; loading, empty, validation, error, and reduced-motion/fallback states.
- No mock success in production paths, hardcoded personal data/secrets, or silent security-check removal.

## Security

- Read docs/SECURITY.md before modifying authentication/authorization, recipient verification, sessions, protected content APIs, or Storage permissions.
- Never expose service-role/server secrets or protected letter content before authorization; private letter media must never use public Storage.
- Validate all input and enforce ownership server-side on every entry point; service role bypasses RLS and needs explicit checks.
- Enforce recipient letter-bound session, expiry, publication, and access version on every content/media request. Name/DOB is low security, not identity proof.
- Published letters are frozen; unpublish before edits. Republish rotates the link and invalidates prior access. No secret content in metadata, hydration, preloads, shared caches, or logs.

## Completion

- Test important business/security rules and relevant failure/concurrency cases against an isolated environment.
- Run typecheck, lint, production build, and relevant tests after implementation; fix failures before marking a milestone complete. Planning-only edits do not require nonexistent app checks.
- Update TASKS.md with acceptance evidence, failures, and remaining work. Summarize changed files and limitations honestly.
- Deploy only to an approved target after release gates pass; never mark proposed or untested behavior implemented.
