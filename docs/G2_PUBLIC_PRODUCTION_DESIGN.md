# G2 — Thiết kế Production Public Access + Private Letter Gate

2026-10-15, Asia/Bangkok. Branch đã xác minh: `codex/g2-production-design`; HEAD vẫn `81c49be824713bd51142d959b9d56b3f1f25b0f1`, có candidate Owner-only/tài liệu chưa commit được giữ nguyên. Chủ dự án duyệt **thực hiện G2 thiết kế**, không phải duyệt triển khai thiết kế này. Toàn bộ schema, API, UI và mode mới dưới đây là **PROPOSED / NOT IMPLEMENTED**. Không tạo migration, code, dependency, account, fixture hoặc thay đổi remote trong G2.

G1 đã chốt backend Supabase Production riêng, chỉ Creator được chủ dự án duyệt, recipient public shell/private letter session. Giữ Next.js App Router + server-only DAL + Supabase Auth/PostgreSQL/private Storage; không thêm backend/queue/ORM/vendor khác. Mỗi giai đoạn dùng branch riêng; G3 dự kiến `codex/g3-production-implementation`, chỉ tạo/chuyển sau khi bắt đầu giai đoạn đó. Không commit/merge/push tự động.

## 1. Kết quả đọc source và giới hạn

| Source hiện hữu | Hệ quả cho thiết kế |
| --- | --- |
| `identity.ts:requireCreator` chỉ `getUser()` + confirmed email | Cần tách authenticated identity khỏi approval; không đọc approval từ client/user_metadata |
| `letters.ts` đọc `creator_letters` bằng user JWT; service-only RPC nhận actor ID từ DAL | Cần cả owner RLS lẫn service RPC checks; chỉ sửa Next route không đủ |
| `private.lock_letter` không được mọi RPC dùng; photo/audio fail/finalize/path, delete/share và ingest có đường riêng | Migration phải có danh mục coverage cho từng gateway; cleanup không bị chặn theo approval |
| `private.recipient_letter` được content/photo/audio dùng; bootstrap/gate/session issue có kiểm tra riêng | Hold/owner approval phải chặn cả bốn nhóm, không chỉ content JSON |
| `sl_session_issue` và publish/unpublish lock parent; bigint versions đã serialize string | Giữ locks/version checks để xử lý verify/hold/revoke/publish/upload races |
| Callback chỉ nhận email/signup/recovery hoặc PKCE code | Invite cần nhánh riêng, không được suy luận invite hay code callback thành recovery proof |
| `sl_cleanup_complete_v3` purge tombstones đủ điều kiện; Auth FK vẫn RESTRICT | Account closure phải kiểm tra worker/jobs/ingests/tombstones trước xóa Auth; không blind cascade |
| Guard candidate chỉ Preview/owner-only test; `crons: []` | Cần mode public riêng ràng buộc backend mới; chưa mở public hay bật cron |

Đây là review source, không phải live test. Không đọc env values, inventories hoặc credential files. Kết quả 102 PASS/2 SKIPPED và build trước thuộc candidate Owner-only; không chứng nhận các tính năng G2. Hosted modern Storage/HTTPS/SMTP/public acceptance vẫn NOT TESTED.

## 2. Phân quyền và luồng onboarding

### 2.1 Ba mức độc lập

- `requireAuthenticatedUser()`: `ownerClient().auth.getUser()` xác thực server và email confirmed; dùng cho account status, recovery/reset và logout đúng flow. Không yêu cầu Creator approval để một người lấy lại quyền truy cập tài khoản của họ.
- `requireCreator()`: identity trên + fresh DB approval `approved`; missing row hoặc suspended → 403 `CREATOR_NOT_APPROVED`; DB/schema outage → 503, không fallback. Giữ owner/draft/version/quotas ở từng operation. `/access-pending` chỉ hiển thị trạng thái của chính user, có logout/recover/contact; `pageData` cần xử lý 403 riêng thay vì redirect loop/ghi lỗi provider.
- `requireOperator()`: confirmed identity + verified current JWT claims (`getClaims`, subject khớp `getUser`) + `aal2` + active DB operator registry. Không dùng JWT chỉ decode, client claim, service key hay email domain làm admin role. MFA TOTP chỉ bắt buộc operator trong scope này, không ép mọi Creator/recipient.

Mọi API mutation giữ exact Origin/content-type/size/rate checks. Thiếu login 401; role/MFA thiếu 403 (operator không được lộ dữ liệu); provider outage 503. Cookies/MFA không thay thế owner checks. [Verified claims](https://supabase.com/docs/reference/javascript/auth-getclaims), [Supabase MFA](https://supabase.com/docs/guides/auth/auth-mfa).

### 2.2 Creator chỉ theo phê duyệt — phương án tối thiểu

1. Production Supabase: **Allow new users to sign up OFF**, email confirmation ON, anonymous/social/unused providers OFF. `/signup` là trang thông tin invitation-only; app POST signup trả 403 `REGISTRATION_CLOSED` trước gọi Auth. Phải kiểm tra direct Auth REST signup cũng deny; không chỉ giấu UI. [Provider signup configuration](https://supabase.com/docs/guides/auth/general-configuration).
2. Chủ dự án duyệt danh tính/email ngoài hệ thống; operator dùng **Dashboard Invite user** trên đúng backend mới. MVP không có app endpoint gửi invite, tạo user, đặt mật khẩu hoặc bulk-import accounts. Mỗi thao tác thật/gửi mail phải nằm trong scope G4/G6 được duyệt; không tự gửi trong G3.
3. Invitation template dùng exact app callback, `token_hash` + `type=invite`. Callback chỉ verify OTP với Supabase rồi tới trang hướng dẫn/pending access; không cấp recovery proof. Owner/operator kiểm tra verified Auth UUID; phê duyệt bằng operator action có audit. Invite được chấp nhận không tự cấp Creator hoặc operator role.
4. Thiết lập mật khẩu dùng **fresh recovery email → type=recovery → durable single-use proof 007 → reset**, tái dùng flow hiện tại. Đề xuất chấp nhận hai email (invite + recovery) thay vì thêm đường đặt mật khẩu bỏ proof. Auth callback/code/invite thông thường không được reset qua `/api/auth/reset`.
5. Login/recovery vẫn hoạt động cho confirmed Auth user chưa được approve; Studio/APIs/RLS/RPC không cấp dữ liệu. Re-login không tự bật approval. Bản public không có self-approval hay promotion bằng metadata.

Proof 007 ràng buộc **application reset endpoint**, không tự áp lên Supabase Auth API. Một valid provider session có thể có quyền đổi password theo provider policy riêng; không tuyên bố code/invite bị cấm mọi password update trên mọi API. G4/G6 phải review provider reauthentication/password-change/MFA settings và stale-token effects; không dùng app proof để khẳng định JWT đã revoke toàn cục.

Operator bootstrap: migration tạo registry **rỗng**, không seed user hoặc approve mọi Auth user. G4 trình exact verified Owner Auth UUID và one-time audited bootstrap SQL cho người quản trị DB chạy thủ công sau phép riêng. Không public RPC tự bootstrap, không endpoint grant operator trong MVP. `/operator/security` chỉ cho operator đã nằm trong registry đăng ký/challenge TOTP; report/admin data yêu cầu aal2. Provider MFA enrollment/SMTP thực tế cần nghiệm thu.

## 3. Schema đề xuất — một migration mới, chưa tạo SQL

Hiện có 001–008. G3 dự kiến `...009_public_release_controls.sql`, kiểm tra lại số kế tiếp trước tạo. 001–008 bất biến; migration 009 chỉ áp dụng vào **backend mới** sau G4 approval, không tự áp vào test cũ. Tất cả bảng dưới là `private`, RLS ON, revoke browser schema/table grants, chỉ service role/DB owner truy cập qua gateways có kiểm tra rõ ràng.

| Bảng | Cột chính / constraints | Chính sách |
| --- | --- | --- |
| `private.creator_access` | `user_id uuid PK → auth.users ON DELETE CASCADE`, `status approved/suspended`, `version bigint >=1`, `approved_by/updated_by uuid`, timestamps | Missing row deny; không lưu email/password/token. Không trigger approve khi tạo Auth user |
| `private.operator_accounts` | `user_id uuid PK → auth.users ON DELETE RESTRICT`, `active boolean`, timestamps | Chỉ Owner đã bootstrap; tách Creator role. Không tự xóa operator qua closure UI |
| `private.abuse_reports` | UUID ID; nullable `letter_id → letters ON DELETE SET NULL`; `share_digest bytea CHECK octet_length=32`; bounded `reason`, plain-text `description <=1000 Unicode points/4000 UTF-8 bytes`; `status open/resolved`; resolution code; version; created/resolved/purge timestamps; optional documented retention-hold review date | Không raw share link/IP/email/DOB/passphrase/body/media copy theo mặc định; người báo có thể tự nhập PII nên UI cảnh báo và operator kiểm soát. Index `(status,created_at,id)`, purge eligibility; open reports cũng có deadline hữu hạn, không lưu vĩnh viễn vì chưa resolved |
| `private.letter_moderation` | `letter_id uuid PK → letters ON DELETE CASCADE`, `state clear/held`, `version bigint >=1`, reason code, actor/timestamps | Không có row = clear; không có schema/helper = lỗi cấu hình, không fail open. Owner không được ghi hold |
| `private.operator_audit` | UUID ID; actor/subject UUIDs; action enum; resource/version/status before/after; request ID; timestamp; retention deadline/hold metadata | Không FK tới Auth/letter nếu sẽ cản physical deletion; UUID vẫn là dữ liệu hạn chế, không quảng cáo là anonymous. Không free-form body/provider errors, secrets, report description hoặc letter content. Không edit/delete từ browser |

Creator/member state retained while account exists; reports proposed 90 days after resolution; unresolved/open reports tối đa 90 ngày từ creation, trước khi hết hạn cần operator review/alert chứ không tự ghi rằng đã xử lý. Audit proposed 90 days after action hoặc linked report resolution (later), nhưng unresolved-link không làm deadline vô hạn. Documented retention hold có approver/reason/review date hữu hạn, gia hạn phải được ghi audit; không để người báo tự đặt hold. Đây là **đề xuất open-report/audit retention mới**, không phải bảo đảm vận hành hay policy đã duyệt. Log/backup targets cũ chưa được xác minh. Retention pruning phải bounded, đúng project mới và chỉ sau operational approval; G3 không chạy xóa dữ liệu thật.

### 3.1 RLS và gateway boundaries

- Giữ public tables owner-read-only; bổ sung approved-Creator predicate vào SELECT policies của `letters`, `letter_photos`, `letter_assets` và security-invoker `creator_letters`. Không thêm browser INSERT/UPDATE/DELETE.
- Đề xuất **một** helper `public.sl_creator_is_active()` không tham số, trả boolean cho `auth.uid()` hiện tại: SECURITY DEFINER, `search_path=''`, schema-qualified, no dynamic SQL, reviewed owner. Grant EXECUTE **authenticated only**, revoke PUBLIC/anon; không grant usage/private-table access. Nó là ngoại lệ hẹp cho RLS, không API xem role của user khác. Không để vòng blanket revoke/grant `sl_*` ghi đè ngoại lệ này ở cuối migration. [RLS helper guidance](https://supabase.com/docs/guides/database/postgres/row-level-security).
- Các RPC nội bộ khác giữ service-only, security invoker + empty search_path; private helpers bị revoke khỏi browser. DAL actor ID lấy từ verified identity, không từ request body. DB recheck approved/operator/owner dù service bypasses RLS.
- Tạo helper kiểm tra approved và khóa membership row FOR SHARE; sửa `private.lock_letter` và các gateway bỏ qua helper này. RPC create/save/reserve/finalize/change/delete/share/owner-media/ingest/publish đều cần coverage; không chỉ sửa generic RPC transport.
- Cleanup/failure-release không tạo quyền đọc hoặc ready attachment: `sl_photo_fail`, `sl_audio_fail`, ingest release/cancel và maintenance có thể cần kết thúc reservation sau khi owner bị revoke. Giữ đường cleanup hẹp có ownership/reservation/path/lease checks; không buộc worker giả làm Creator approved, không cho revoked user ready-finalize/publish.
- Existing test DB chưa có 009 không tương thích với nhánh app approval mới: fail closed/configuration-required, không auto-approve/fallback. G3 dùng in-memory DB và snapshot; giữ localhost cũ/.env.local/test project. Live test nhánh mới chờ backend/schema được phép. Legacy letter config/music/heart resolution không đổi; một account cũ chỉ được quyền mới sau approval đích danh, không migration/backfill tự động.

### 3.2 Coverage tối thiểu khi sửa SQL ở G3

| Nhóm | Entry points cần kiểm tra trong **latest definitions sau 008** |
| --- | --- |
| Creator/read | owner RLS/view; `sl_gate_flags`, `sl_photo_path`, `sl_owner_audio`, `sl_share`, `sl_ingest_flags` |
| Creator/write | `sl_create_letter`, `sl_save_letter`, `sl_delete_letter`, photo reserve/finalize/change, audio reserve/finalize, music settings/remove, ingest begin/part/commit begin/finish, publish/unpublish |
| Recipient pre-session | `sl_bootstrap`, `sl_verification_gate`, `sl_session_issue` phải yêu cầu owner approved + not-held + existing published/share/access checks |
| Recipient authorized | `private.recipient_letter` central check → content/photo/audio; HEAD/Range/416 chỉ sau DAL/RPC authorization; Close vẫn được revoke session khi letter bị held/unpublished |
| Cleanup | failure/release/cancel, stale/lease/cleanup v3/orphan helpers vẫn hoạt động có phạm vi, không gọi creator approval trong cách gây deadlock hoặc resurrect asset |

G3 phải xuất danh sách từng gateway từ catalog/source để test completeness. Không dựa vào giả định mọi RPC đều gọi `private.lock_letter`.

## 4. Moderation, revoke và concurrency

### 4.1 Đình chỉ một thư

`hold`: operator aal2 + active registry; transaction lock parent, recheck operator + expected moderation revision (absent row = revision `0`); tạo/cập nhật state held. Atomically set letter draft/published_at null, shares inactive, revoke sessions, increment letter version/access_version và moderation version, append audit. Không xóa body/media/gate, không đưa nội dung vào audit. Pending uploads gặp changed version phải fail/cleanup; không được attach bằng stale finalize. Owner approved vẫn có thể đọc/edit/preview/delete thư riêng để sửa, nhưng publish/share/recipient access bị chặn bởi hold.

`clear`: expected moderation version; đổi clear, ghi audit, giữ draft/inactive shares/revoked sessions và increment versions. **Không tự republish, không phục hồi link/session cũ**; Creator approved phải publish lại bình thường để tạo link mới. Hold ở cấp letter chặn unpublish/republish bypass, không hứa phát hiện người tạo copy sang letter ID mới; abuse lặp lại có thể xử lý bằng suspend Creator riêng.

Public suspended/unknown/deleted share cùng generic 404; không công bố report/hold reason hay danh tính. Owner thấy banner trạng thái tối thiểu, không report text/người báo. Operator không có quyền preview body/media chỉ nhờ role; review UI chỉ dữ liệu report tối thiểu/IDs/status. Truy cập evidence nội dung riêng cần quy trình/phép riêng, không auto-copy.

### 4.2 Rút quyền một Creator

`suspend`: lock membership FOR UPDATE rồi nondeleted owned letters theo UUID tăng dần (quota hiện tại <=20 active), set suspended, vô hiệu hóa shares/sessions, đưa published letters về draft và increment versions; giữ các letter holds độc lập. Cancel/release pending ingests qua helper cleanup an toàn; bytes đã upload vẫn private và queue xử lý. Recipient queries còn kiểm tra membership để deny cả những publication không mong đợi.

`approve`/re-approve chỉ phục hồi quyền Studio, không tự publish hoặc clear hold. Existing JWT có thể còn hạn nhưng live RLS/RPC membership checks deny sau suspension commit; không hứa Supabase JWT đã bị revoke toàn cục. Auth recovery/logout vẫn tách biệt. Không bulk suspend hoặc xóa Auth tự động.

Lock order G3 cần thống nhất: operator registry (khi có) → Creator membership → parent letters theo UUID → report/moderation/asset rows. Membership lookup từ letter chỉ đọc để xác định owner, sau đó khóa đúng thứ tự và recheck parent. Không giữ report lock rồi mới xin parent lock. Preserve create quota advisory lock sau membership lock. Tests phải chứng minh verify/issue/hold, publish/hold, upload/revoke, delete/hold và concurrent tabs không tạo stale access, double mutation hoặc deadlock. Request đã được authorize trước revocation có thể đang gửi bytes; request mới sau commit phải deny.

## 5. Report và operator contracts — proposed

Public `/report` và nút Report ở locked/unlocked letter; `/privacy`/`/privacy/requests` là public thông tin không chứa letter data. Authenticated operator routes đặt riêng `/operator`, không lẫn Studio ownership hoặc recipient session.

| Method/path | Input / authority | Kết quả |
| --- | --- | --- |
| `POST /api/reports` | <=8 KiB strict JSON `{shareToken, reason, description?}`; token đúng 43 base64url chars; reason `unwanted_contact/harassment/privacy/other`; description bounded; exact Origin/rate checks | 202 `{data:{received:true,reference:uuid}}` cho valid-shaped active/unknown/expired/held token; không existence oracle. Luôn lưu bounded report (unresolved target nếu không tìm thấy), không fake provider success |
| `GET /api/operator/reports` | Operator aal2; validated cursor, <=50 | Minimal IDs/reason/status/timestamps; description chỉ qua detail khi mở, plain text; private no-store |
| `GET /api/operator/reports/{id}` | Operator aal2 | Minimal report + subject/moderation revision; không body/media, no auto-link untrusted text; audited detail access |
| `PATCH /api/operator/reports/{id}` | `{expectedVersion,resolution}`; resolution enum `dismissed/action_taken/unresolved_target` | Resolve/report revision audit; không ngầm hold/unhold hoặc notify qua mail; 409 nếu stale |
| `POST /api/operator/letters/{id}/moderation` | `{expectedModerationVersion,action:hold/clear,reasonCode,reportId?}`; actor lấy từ server | 200 minimal new moderation/letter versions; report phải cùng letter nếu supplied; unresolved report không được target letter tùy ý; no content/URLs |
| `GET /api/operator/creators` | Operator aal2; cursor <=50 | UUID/approval state/version only; không dump Auth directory/email |
| `PUT /api/operator/creators/{userId}` | `{expectedVersion,action:approve/suspend,reasonCode}`; absent approval revision `0` | Confirmed target Auth user phải tồn tại, operator check + audit; returns own approval state/version, no token/password/mail |
| `POST /api/operator/letters/{id}/delete` | Operator aal2; `{expectedVersion,requestReference,reasonCode}` | Scoped verified deletion request → exact-letter tombstone/queue via authorized internal helper; 202 pending cleanup. Không cho dùng owner RPC với ID giả, không bulk-delete endpoint |

New service-only RPC families: `sl_creator_status`, `sl_operator_status`, `sl_creator_access_set`, `sl_report_submit/list/get/resolve`, `sl_letter_moderate`, `sl_operator_letter_delete`; signatures follow inputs above with server actor `a`, validated resource UUIDs/version strings. Approval/moderation/status queries return no Storage path or secret content. Audit insertion in same transaction as mutations; audit failure rolls back action. Detail read audit may fail closed without revealing report if logging unavailable.

Owner DTO bổ sung `moderation: {state: 'clear'|'held', version: string}` từ `sl_gate_flags` được owner-authorize, không report/reason/actor data. `sl_creator_status` trả `{status:'not_approved'|'approved'|'suspended',version:string}` chỉ qua server dùng verified actor; không public user-ID lookup. Recipient DTO/letter presentation JSON không đổi. Operator approval kiểm tra target qua server Auth admin `getUserById` (confirmed user) trước transaction; FK bảo vệ user tồn tại, DB RPC recheck operator/revision. Không grant browser/service gateway quyền dump Auth directory để làm việc này.

Initial approval/hold dùng expected revision string `"0"` chỉ khi row chưa tồn tại; cần schema riêng cho zero sentinel, không tái dùng positive-only letter version validator nguyên trạng. Row đã tồn tại có revision >=1. Bad/stale revision trả 409; UI reload sau mất response thay vì retry mù. DB admin RPC recheck operator registry; aal2 đến từ identity đã verified ở DAL, không từ client-provided `aal` field. Service credential là trusted server boundary, không phải role đọc được từ cookie.

**Report limits đề xuất để duyệt:** IP HMAC 3/hour + 10/day; share-digest scope 3/day; global 200/day. Count before target lookup, including unknown tokens; `RATE_LIMIT_HMAC_KEY` dùng domain-separated scopes, không raw IP/log token. Reuse atomic DB counters, không rollback counter khi deny; không tắt existing recipient limits. 429 + Retry-After, outage 503. Giới hạn global có thể bị abuse để chặn report thật; operator monitoring/contact dự phòng phải phản ánh hạn chế này. Không auto-suspend theo volume, không unlimited unresolved reports/attachments/public report status endpoint. All rendering escaped; raw report bodies không đi vào logs/audit/traces. Report không xác minh danh tính người báo.

**Auth endpoint limits đề xuất:** trước provider login: IP 30/15 min và email+IP 10/15 min; recover: IP 3/hour và email 3/hour, khóa bằng HMAC riêng scope (canonical email chỉ cho rate key, không thay đổi identity gửi provider). Generic denial/outage như trên, không clear counters; phải ghi rõ targeted lockout risk. Các app limits không chặn client gọi thẳng Supabase Auth: G4 vẫn phải cấu hình/kiểm tra provider limits, SMTP budget và shared-egress IP behavior. Không giả mạo IP headers để né provider limits. CAPTCHA integration không nằm trong G3 này; nếu provider/abuse review yêu cầu nó thì trình scope bổ sung hoặc giữ release NO-GO, không bỏ kiểm tra để launch.

Operator reads đề xuất 120/minute/verified actor, mutations 60/minute/actor qua domain-separated durable counters; không dựa vào Creator approval để operator-only account được thực hiện. Pagination tối đa 50 và audit retention hữu hạn giữ queue/history có giới hạn; không truy vấn/list tất cả accounts hay reports một lần.

## 6. Privacy, deletion và retention

- G3 thêm link privacy/report ở home/login/signup-info/editor/unlock/reading; cảnh báo name/DOB thấp, recipients có thể lưu/copy nội dung, creator cần quyền dùng data/media/music. Không checkbox hay câu chữ nào được coi là chứng nhận pháp lý.
- Contact/operator identity và policy/provider/retention thật còn PENDING. Không publish draft là final; G3 dùng validation fixture/in-memory config cho policy tests, không invent email. Trước artifact public-ready ở G5 cần contact thật đã xác minh và nội dung policy được chủ dự án duyệt.
- Request xóa tài khoản qua contact đã xác minh; operator ghi case reference, xác minh entitlement trước disclosure/destruction. Account bị suspend vẫn có quyền yêu cầu xóa; không ép được approve lại mới được xử lý.
- Scoped operator tombstone giữ existing immediate logical revocation + durable bucket/path cleanup. Không preserve body/media làm evidence mặc định khi người dùng xóa; report/audit tối thiểu theo retention/hold đã duyệt, không claim selective backup erasure.
- Worker chỉ project Production mới sau G4/G6 authorization; verify queue/job leases/staging/orphans/full sweeps, physical bytes and remaining FK/tombstones. `sl_cleanup_complete_v3` có purge điều kiện, nhưng không suy luận queue=0 là mọi physical object đã mất. Nếu cần purge không chạy được từ worker hiện tại, trình exact targeted procedure để duyệt; không blind SQL/bulk Auth deletion.
- Auth delete là operator-controlled step sau manifest/FK/physical evidence và phép riêng; **không app endpoint xóa hàng loạt Auth hoặc scheduler xóa user** trong G3. Owner/operator account deletion cần bàn giao/quy trình riêng, không tự mất sole operator.
- Reports resolved và audit pruning theo deadlines/holds đã duyệt, bounded batches qua maintenance; mở cron ngoài localhost chỉ sau đúng backend/scope được duyệt, có monitoring. Giữ source `crons: []` trong G3. Public release bị chặn nếu cleanup/retention chưa có vận hành đủ điều kiện; không tự bật lịch và đụng test project cũ.

## 7. Public deployment guard và cấu hình

Đề xuất `SECRETLOVE_DEPLOYMENT_MODE=public-private-gate` cho **Production**. Đây là intent, không authentication, không bằng chứng website đã public hoặc compliance. Có thể deploy mode này khi All Deployments còn khóa để nghiệm thu G6, rồi cùng artifact được duyệt mở Standard ở G7. Không dùng `owner-only-review` để public backend test, không spoof provider vars.

G3 tạo non-secret binding `config/public-deployment.json`: exact Vercel project/team IDs đã biết, canonical origin đã duyệt, **Supabase Production ref = null/PENDING cho đến G4**. Không tạo ref giả. Guard public fail closed khi binding thiếu hoặc env không trùng. G4 cập nhật binding bằng public identifiers thật dưới review, chạy lại checks trước freeze G5; không ghi keys vào JSON. Bắt buộc ref khác `samelfoyrujhcywcnofw`; chưa đủ nếu chỉ khác — còn phải khớp binding đã duyệt.

| Production setting dự kiến | Rule |
| --- | --- |
| `APP_ORIGIN`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Exact approved HTTPS origin; URL match bound ref; modern publishable prefix; không wildcard/Host-derived trust |
| `SUPABASE_PROJECT_REF` | Public-mode name mới; mandatory match approved binding. Không fallback sang `PREVIEW_SUPABASE_PROJECT_REF` của test/legacy modes |
| `SUPABASE_SERVICE_ROLE_KEY` | Tên giữ nguyên; dedicated modern Production `sb_secret_`, khác public key; private Storage/transport headers giữ patch modern hiện tại |
| `VERIFICATION_HMAC_KEY`, `RATE_LIMIT_HMAC_KEY`, `CRON_SECRET` | New Production-only independent canonical base64 >=32 bytes; không copy test/local values; server Secret |
| `MAX_AUDIO_UPLOAD_BYTES`, `ENABLE_EXPERIMENTAL_COREPACK` | `16777216` hoặc approved lower cap; `1`; pinned pnpm 11.25.0 |
| `SECRETLOVE_DEPLOYMENT_MODE`, `PRIVACY_CONTACT_EMAIL` | `public-private-gate`; real reviewed contact (intentionally public output on privacy page), không placeholder hoặc claim email đã verified chỉ vì format pass |

Tổng dự kiến 12 application/config entries, bốn Sensitive; provider `VERCEL=1`, `VERCEL_ENV=production`, `VERCEL_TARGET_ENV=production`, `VERCEL_PROJECT_ID` tự cấp và khớp binding. Không đặt provider vars thủ công. Cấm test namespaces. Giữ Node 24.x/sin1, same guarded build path, frozen install, no Git auto-deploy. Guard format/prefix không chứng minh credential hoạt động, RLS/provider signup/protection hay policy đúng; G4 read-only schema/grants validation và G6 actual requests vẫn bắt buộc. Không pull/export/print secret values.

Legacy Preview/owner-only guard paths chỉ phục vụ môi trường riêng được phép trước đây; không trở thành fallback khi public config thiếu. New approval-enabled app cần 009; tránh thay local server đang làm việc với 001–008 hoặc `.env.local` trong G3.

## 8. G3 implementation slices và file scope để duyệt

| Slice | Phạm vi dự kiến | Acceptance trước bước tiếp theo |
| --- | --- | --- |
| G3-A access/schema | New 009; `identity.ts`, auth routes/callback/pages/AuthForm, errors/pageData, owner RLS/RPC coverage; pending/approved statuses | Unapproved/foreign/anonymous/table/RPC deny in-memory, mocked provider signup not called by closed app; actual direct-provider denial chờ G6. App recovery/invite không bỏ proof; revoke races pass; old migrations untouched |
| G3-B reports/operator | New bounded validation/DAL, report/operator pages/components/routes, MFA setup/challenge bằng Supabase SDK, role/bootstrap runbook, scoped delete operation | Origin/size/limits/generic receipt; operator aal2 + role/no privilege escalation; hold/reinstate/republish/revoke/cleanup/audit failure/races pass |
| G3-C policy/deploy/regression | Privacy/report/contact UX, public binding/guard tests, release-check runbook, tasks/docs; keep protected runtime media/rendering unchanged | No arbitrary content execution/preload/secret leak; old letters/scenes/music preserved; typecheck/lint/tests/build pass in clean snapshot; new upload manifest reviewed |

New file families dự kiến: `src/lib/server/{access,operator,reports}.ts`, `src/lib/validation/{access,reports}.ts`, `src/app/{access-pending,report,privacy,operator}/...`, `src/app/api/{reports,operator}/...`, small components, tests for each. Reuse existing `rpc`, `endpoint`, Origin/body/version/error conventions and Supabase SDK; split shared helpers only khi cần tránh import cycle, không broad refactor hoặc dependency mới. Service `rpc` currently in letters.ts phải tránh access→letters→identity circular dependency; nếu tách thì chỉ generic RPC helper sang module server-only nhỏ, giữ re-export/call sites kiểm thử.

Không có drag/drop/theme/video/OTP recipient, CAPTCHA vendor integration, public discovery, bulk account automation hoặc advanced moderation engine trong scope. Provider anti-abuse/SMTP configuration vẫn là manual gate, không hứa zero spam. Từng slice cần regression tests; chỉ bắt đầu sau phê duyệt G3 toàn scope hoặc từng phần chủ dự án chọn.

## 9. Ma trận kiểm thử sẽ thực hiện — tất cả NOT TESTED cho tính năng mới

| Nhóm | Assertions bắt buộc / loại bằng chứng |
| --- | --- |
| Identity/approval | Confirmed-but-unapproved, self-metadata approval, stale JWT after suspension, owner/foreign RPC/view/raw table; new auth record không auto approve; backend outage fail closed; cleanup vẫn giải phóng pending reservations |
| Onboarding/operator | App signup deny/local mock, actual direct-provider signup deny G6; invite callback không issue recovery proof; code/normal login/invite cannot use application reset endpoint without proof; provider password API policy riêng. Recovery single-use/expiry/failed Auth mutation; operator AAL1/nonoperator/forged claims deny; MFA enrollment không expose reports; no client service credential |
| Moderation | Hold denies bootstrap/verify/issue/content/photo/audio/HEAD/Range; clear leaves old links inactive; republish fresh locator; revoked Creator reapproval không resurrect; reports không auto-hold; foreign/unresolved report target denial |
| Concurrency/audit | Hold-vs-verify/publish/delete/upload; Creator suspend-vs-finalize/creation quota; stale expected versions; same-target multi-tab; audit failure rollback; deadlock retry/failure không tạo success giả; already-started stream limits ghi rõ |
| Reports/privacy | Strict byte/Unicode/enum/cursor bounds, escaped XSS text, no untrusted hyperlink/SSRF, generic unknown token receipts, rate counters persist denial, outage 503, data retention deadlines/holds and case privacy; no blanket content copy |
| Deletion/maintenance | Scoped tombstone even owner suspended; no owner impersonation; orphan/late upload/lease/FK/tombstone sequencing; queued not physical-complete; pruning not restore access; no historical cohort/global test cleanup |
| Public guard | No opt-in/unknown target/project/ref/origin/contact/malformed/shared secrets/test namespaces/raised cap deny; absent binding blocks; public cannot use old test ref or legacy ref fallback; headers modern key stay apikey-only |
| Local checks | PGlite migrations 001–009/catalog/RLS + Vitest/mocked SDK/routes; typecheck/lint/build; clean snapshots no real env/live opt-ins. Update in-memory creator factory to explicitly approve fixture users, plus real negative unapproved fixtures; không blanket auto-approval để tests pass |
| Hosted G4/G6/G7 | Separate manual approvals: new backend/provider behavior/bootstrap/MFA/inbox delivery, exact HTTPS/CSP/Origin/cookies/trusted IP, actual modern full GET/>4.5 MB Vercel stream/chunks/206/HEAD/416/anonymous/cross-letter/revocation, Heart/music/mobile, then anonymous canonical public + protected generated URLs after G7 |

G3 local PASS không thay hosted tests; hai optional local tests vẫn không đổi thành PASS khi chưa chạy. Production project creation, SQL, mail, real account/fixture writes và physical deletion đều có exact scope riêng. Không dùng `isolated-browser.mjs` để tạo/reset historical accounts.

## 10. Quyết định trình chủ dự án duyệt trước G3

Đề xuất duyệt năm điểm: **(1)** invitation + recovery giữ proof 007, closed signup và explicit Creator approval; **(2)** operator active registry + MFA aal2, bootstrap thủ công có audit; **(3)** letter-level hold và Creator suspension không phục hồi publication/session khi gỡ; **(4)** report bounds/limits/operator API và privacy/deletion tối thiểu như trên; **(5)** public binding/guard backend mới, contact thật và các G4–G7 approval gates.

Các đầu vào chưa chốt không được tự bịa: Production ref/keys, real privacy contact, exact verified inboxes/operator UUID/bootstrap permission, provider retention/plan/quota/SMTP settings và final policy. Chúng không chặn thiết kế hoặc portable local tests nhưng chặn cấu hình/deployment/public release tương ứng. Proposed report/audit caps/retention, hai email onboarding và operator MFA cần chủ dự án chấp nhận hoặc chỉnh trước G3.

**G2 design prepared for review; implementation tests chưa chạy. Public release vẫn NO-GO.** Kết thúc G2 bằng review tài liệu và source-continuity, không đổi code/config/migrations, không chuyển branch/commit/push hoặc tự bắt đầu G3. Tài liệu planning không cần chạy lại app build của code không đổi.
