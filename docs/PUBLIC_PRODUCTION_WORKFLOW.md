# Production Public Access + Private Letter Gate — workflow trình duyệt

Latest G3 (2026-10-16): owner approved implementation on `codex/g3-production-implementation`. Local source and migration 009 are prepared; see [G3 evidence and remaining gates](G3_PUBLIC_RELEASE_IMPLEMENTATION.md) and [G4 preparation](G4_CONFIGURATION_PREPARATION.md). G4 settings/SQL/accounts/mail, G5 freeze/deployment and G7 public opening still require separate approval. No remote changes or deployment in G3. Earlier proposed/unimplemented status below is historical.

Ngày: 2026-10-15, Asia/Bangkok. Chủ dự án đã chốt workflow Production Public Access + Private Letter Gate và cho phép bắt đầu G1. **G1 đã hoàn tất: backend Production riêng và chỉ Creator được chủ dự án duyệt trong đợt đầu.** Biên bản: [G1_PRODUCTION_DECISIONS.md](G1_PRODUCTION_DECISIONS.md). Chưa cho phép mở public, sửa cấu hình remote, commit/push, chạy migration, tạo fixture/gửi email hoặc deploy lần mới. Chủ dự án duyệt từng bước bên dưới. Giữ bản chuẩn bị Owner-only để đối chiếu, không tự xóa hoặc triển khai nó.

## 1. Mô hình đã chốt tại G1 — implementation còn chờ G2/G3

**Cập nhật G2:** chủ dự án đã chuyển sang `codex/g2-production-design` và duyệt thực hiện thiết kế. [G2_PUBLIC_PRODUCTION_DESIGN.md](G2_PUBLIC_PRODUCTION_DESIGN.md) đã sẵn sàng để review; approval bắt đầu G2 không phải approval implement G3. Mỗi giai đoạn dùng branch `codex/gN-...` riêng; trình lệnh trước khi bắt đầu, không tự commit/merge/push. Các file Owner-only chưa commit được giữ nguyên, không nhầm HEAD cũ với source public mới.

Public Access là quyền vào website, không phải quyền đọc thư. Người nhận không cần Vercel login. Creator phải đăng nhập Supabase; recipient phải được server cấp session gắn đúng letter. Không có public bucket, URL audio ngoài hệ thống, bypass RLS hay kiểm tra gate chỉ ở client.

| Bề mặt | Quyền truy cập đích |
| --- | --- |
| Trang chủ, đăng nhập, recovery/callback, privacy/report | Public theo đúng chức năng; không chứa nội dung thư hoặc thông tin tài khoản riêng |
| `/l/{shareToken}` | Public shell/metadata chung; bootstrap chỉ availability/passphrase-required như hiện tại, không preload message, tên/DOB, ảnh, nhạc hay cấu hình cá nhân |
| Creator Studio và owner APIs | Supabase user đã xác thực email + kiểm tra sở hữu server-side trên mọi entry point |
| Recipient content/photos/audio | Session HttpOnly/Secure/SameSite=Lax, đúng letter/access-version, còn hạn, published, không bị revoke hoặc đình chỉ; kiểm tra trên mọi request trước cả HEAD/Range/416 |
| Supabase database/RPC/private Storage | RLS/grants/service-only gateways như hiện tại; client không được cấp service key hoặc object path |
| Report intake | Public, bounded input, generic receipt, Origin/rate limits; report không tự cấp quyền đọc hoặc quyền đình chỉ |
| Operator review/suspend/reinstate | Actor xác thực và quyền operator server-side riêng; audit, không dùng service key làm mật khẩu admin hay coi mọi Creator là admin |
| Cleanup | Server-only secret; không có quyền chạy từ browser session. Không chạy project test cũ hoặc xóa historical fixtures |

Tên/DOB là gate có mức bảo đảm thấp, **không chứng minh danh tính**. Giữ optional passphrase và các giới hạn hiện tại; không âm thầm thay policy thành nhận diện mạnh, mở bucket hoặc bỏ kiểm tra bảo mật. Session hiện tại có lifetime 30 phút; rotation HMAC không tự revoke session. Nội dung đã gửi cho reader không thể thu hồi khỏi thiết bị.

**Hạ tầng đề xuất:** giữ Vercel project hiện có và canonical hostname đã xác minh ở lượt rà soát trước `secretlove-preview.vercel.app`, `sin1`, Node 24.x/pnpm 11.25.0. Trạng thái READY/config remote chưa được kiểm tra lại trong bước tài liệu này; HTTPS acceptance vẫn NOT TESTED. Dùng **Supabase Production riêng, sạch**, ưu tiên Singapore để cùng khu vực; project ref/URL/keys mới còn PENDING, không tự tạo. Không đưa 100 synthetic accounts, thư, HMAC hoặc media test cũ vào public backend, không tự xóa hay di chuyển chúng. Không suy luận môi trường an toàn từ tên project `secretlove-preview`.

**Protection đề xuất:** trong giai đoạn nghiệm thu giữ Authentication / All Deployments. Sau khi duyệt mở public, dùng Authentication / **Standard Protection** cho domain Production, không tắt bảo vệ mọi deployment. Vercel hiện mô tả Standard bảo vệ các URL khác và để Production domains public; phải kiểm tra thực tế từng URL/alias sau thay đổi. Không dùng exception/bypass secret để giả lập public release. [Vercel protection scopes](https://vercel.com/docs/deployment-protection#choose-which-urls-to-protect)

**Creator onboarding đã chốt:** đợt đầu chỉ tài khoản Creator được chủ dự án duyệt; recipient vẫn public. Đóng self-signup phải được enforce ở cả ứng dụng và Supabase Auth, không chỉ ẩn nút; cần phân biệt Auth user với quyền Creator đã duyệt. Đăng ký Creator công khai không thuộc launch scope hiện tại; nếu mở sau phải chuẩn bị thêm chống signup/mail abuse, provider limits và CAPTCHA phù hợp rồi nghiệm thu riêng.

## 2. Baseline đã kiểm tra trong bước lập kế hoạch

- HEAD `81c49be824713bd51142d959b9d56b3f1f25b0f1`, branch `feature/day-3-preview-acceptance`; có các thay đổi Owner-only chưa commit từ lượt trước, được giữ nguyên. Không coi working tree là frozen commit.
- Lần PPD-06 duy nhất `dpl_2fYeyQBb9MQJHHPsyAFnZNexf13U` đã dùng hết; remote Production/ERROR, guard dừng trước Next build. Không retry trong workflow preparation.
- Guard hiện tại chỉ hỗ trợ Preview và opt-in `owner-only-review`, ghim project Supabase test/hostname đã chọn. **Chưa có mode public đã triển khai**. Không được chỉ tắt Vercel Authentication rồi dùng bản Owner-only để public test database.
- Source có Creator/recipient auth và private media DAL, cấu trúc RLS/service-only RPC trong migrations 001–008. `requireCreator` dùng `getUser()` và email confirmation; signup API hiện gọi `auth.signUp`, nên chưa có chế độ closed onboarding được nghiệm thu.
- Không có report/privacy/operator moderation routes trong source được kiểm tra; `Close` chỉ revoke session hiện tại, không phải block bền vững. Contact email vẫn PENDING. Review cũ đã ghi các mục này là public-release gaps.
- `vercel.json` đang có `crons: []`, Git deployment disabled; endpoint cleanup vẫn có auth. Không tự bật lịch hoặc gọi endpoint.
- Kết quả gần nhất của **bản Owner-only chuẩn bị trước đó**, không phải chứng nhận public: typecheck/lint/build PASS, 102 tests PASS / 2 SKIPPED, 143 deployment inputs. Hosted modern audio/HTTPS/SMTP vẫn NOT TESTED. Không rerun checks cho thay đổi chỉ tài liệu này.
- Migrations thực tế chỉ tới 008; **009 là số tiếp theo nếu cần**, phải kiểm tra lại lịch sử khi bắt đầu implement. Không sửa migration đã áp dụng.

## 3. Workflow duyệt từng bước

| Bước / điểm duyệt | Công việc và đầu ra cụ thể để chủ dự án duyệt | Điều kiện qua bước |
| --- | --- | --- |
| **G1 — Mô hình, dữ liệu và phạm vi** (hoàn tất) | Chủ dự án chốt workflow, chọn Supabase Production riêng và chỉ Creator được duyệt; baseline và các đầu vào PENDING ghi trong biên bản G1 | PASS cho quyết định mô hình/backend/onboarding; không phải app/hosting acceptance. Contact/domain/backend identifiers/plan xác minh tiếp ở các bước cấu hình, vẫn chặn release nếu chưa đủ |
| **G2 — Thiết kế thay đổi tối thiểu** (approved for local G3) | Chủ dự án cho phép G2; thiết kế/schema/API/file scope/acceptance đã trình trong G2_PUBLIC_PRODUCTION_DESIGN.md. Approval/MFA/invite-recovery, report-led hold và no-resurrection semantics đều là proposed | Chủ dự án review và duyệt G3 trước viết feature/migration. Policy/provider chưa rõ vẫn PENDING; không coi design là test PASS |
| **G3 — Implement và kiểm tra cục bộ** | Chỉ implement G2 đã duyệt: gate/hold enforcement, report intake/operator review, thông báo privacy/low-assurance/contact, signup policy; guard `public-private-gate` dự kiến ràng buộc đúng project/origin/backend Production đã chọn và secrets hợp lệ. Giữ tính năng Creator/scenes/music và migration history | Typecheck/lint/unit/in-memory integration/build PASS; test quyền, report spam, hold/reinstate/republish và failure/race; review diff, không có secrets. Đây chưa phải hosted acceptance |
| **G4 — Cấu hình backend/hosting có duyệt** | Operator chuẩn bị project/ref/keys Production mới qua kênh riêng; trình SQL additive và exact scope để chạy thủ công; trình exact APP_ORIGIN/Auth URLs/token-hash recovery template/SMTP/inboxes, operator role, provider limits, retention/budget/monitoring | Từng thay đổi remote được duyệt cụ thể; metadata/config và read-only schema checks có bằng chứng. Không export secrets, không gửi mail hoặc cấp account ngoài scope |
| **G5 — Freeze source và duyệt một deployment đang khóa** | Review manifest mới/credential exclusion, commit mới theo phép riêng; packet ghi revision, project/team, Production target, backend mới, exact origin, `sin1`, guarded build, All Deployments, cron status và **một lần** deploy | Chủ dự án duyệt rõ đúng action/revision. Lần cũ không tái sử dụng. Build fail/mismatch thì STOP; không retry, đổi alias hoặc bypass tự động |
| **G6 — Nghiệm thu HTTPS trên Production đang khóa** | Chạy test với các account/letter/audio/inbox được duyệt đích danh; dùng canonical domain sau platform auth để kiểm tra đúng Origin. Trình PASS/FAIL/NOT TESTED và lỗi/corrective action | Toàn bộ security/transport bắt buộc PASS, privacy/operator/SMTP/deletion/retention/monitoring đủ điều kiện. Không global cleanup historical test project; không tự tạo/xóa/reset tài khoản |
| **G7 — Duyệt mở Public Access** | Packet ghi artifact đã nghiệm thu, Production domain/alias inventory, action chuyển scope All Deployments → Standard, kế hoạch test anonymous, người trực/rollback | Chủ dự án phê duyệt **mở public** riêng; sau thay đổi xác minh anonymous vào public shell không cần Vercel, nhưng private APIs/media vẫn deny trước gate và Preview/generated URLs còn được bảo vệ |
| **G8 — Theo dõi và vận hành** | Kiểm tra auth errors/rate limits/audio timeout/egress/CPU, report/deletion queue và xử lý sự cố theo ngân sách; runbook khôi phục All Deployments nếu cần đóng public | Chỉ thực hiện lịch/cleanup/containment đã được duyệt phạm vi; không tự xóa cohort, promote, gửi mail hoặc chạy Prompt khác |

G2 có thể chia thành các PR/nhóm file nhỏ để duyệt, không biến thành refactor toàn ứng dụng. Workflow là đề xuất về trình tự, không phải cam kết lịch 3 ngày hay quyền thực hiện mọi bước một lần. Nếu cần bỏ/chuyển một yêu cầu, ghi rõ decision và risk; không đổi FAIL thành PASS chỉ bằng việc chấp nhận rủi ro.

## 4. Phạm vi tối thiểu cho G2 — chưa implement

1. **Report và suspension:** lý do allowlisted + mô tả ngắn có giới hạn, locator xử lý server-side, generic receipt, rate/Origin/body checks; lưu private report tối thiểu, không sao chép DOB, passphrase, body hay ảnh. Chỉ operator được duyệt mới xử lý; không auto-suspend theo số report. Hold phải được mọi đường bootstrap/verify/session/content/photo/audio/publish kiểm tra ở server/RPC, có lý do/action/time/outcome audit. Reinstatement và link/session mới phải có semantics được duyệt, không bật lại token cũ ngầm. Close tiếp tục revoke session hiện tại; không hứa chặn một người qua nhiều thiết bị với name/DOB.
2. **Privacy và deletion:** contact thật, quyền dùng recipient data/media, low-assurance gate, provider/region/retention thực tế, quyền yêu cầu xóa và quy trình xác minh người yêu cầu. Targets 90 ngày sau report resolution, log 30 ngày, backup tối đa 30 ngày đang là đề xuất cũ; xác minh năng lực/thời hạn thật hoặc xin duyệt sửa target. Không hứa compliance hoặc erasure deadline chưa kiểm chứng. Tách live deletion và backup expiry.
3. **Creator onboarding:** kiểm tra cả signup API và Supabase provider, email confirmation, recovery single-use, rate/SMTP abuse. Không dùng service role ở browser hay tắt confirmation để onboarding nhanh.
4. **Public build policy:** không tái dùng nhãn `owner-only-review` để tuyên bố website public. Không spoof VERCEL_ENV, wildcard Origin, key fallback hay hạ upload limits ngầm. Backend/origin mới phải được duyệt trước khi ghim config. Build flag không chứng minh app authorization hoặc Vercel protection.
5. **Operational cleanup:** cron hiện tắt là phù hợp lúc chuẩn bị, nhưng trước public cần lịch/worker/operator plan được duyệt và nghiệm thu trên **project mới**; không giữ lời hứa xóa vật lý nếu không có worker hoạt động. Endpoint hiện là global trong một project, không cohort-scoped; tuyệt đối không gọi vào project test cũ. Không bulk-delete historical synthetic accounts.

## 5. Acceptance bắt buộc trước và sau G7

- Locked HTML/RSC/metadata/hydration/prefetch không có private content; public bootstrap chỉ thông tin tối thiểu được duyệt. `/studio`/owner APIs deny anonymous/foreign owner, không coi platform cookie là app auth.
- Sai name/DOB/passphrase có lỗi generic và rate limit; valid gate mới cấp cookie đúng scope; session A không đọc B. Expire/Close/unpublish/republish/delete/suspension deny content/media mới. Không đổi name/DOB thành thông điệp identity guarantee.
- Modern `sb_secret_` thật trên target: private audio full GET, expected bytes, Range 206, HEAD, malformed/unsatisfiable 416 sau auth, anonymous/cross-letter denial, không credential/object-path disclosure. Upload chunk bài >4.5 MB và full streaming thực sự qua Vercel phải PASS; test mock hoặc localhost không thay thế.
- Private images, audio error/network failure, Heart/custom Unicode/reduced motion/WebGL fallback, music continuity, mobile layout; audible media chỉ sau thao tác tương tác hợp lệ. Không dùng file nhạc chưa được cho phép.
- HTTPS/Secure/HttpOnly/SameSite/CSP/cache/exact Origin, callback/recovery replay, SMTP inbox thật, trusted-IP/anti-spam và budget/monitoring. Auth mail, fixture writes và cleanup cần scope riêng.
- Report/hold/operator permissions/audit, cannot-republish bypass, closed signup direct-provider denial nếu chọn, privacy links/contact và verified account deletion/physical cleanup có bằng chứng.
- Sau G7: một client mới không cookie/bypass vào canonical Production nhận website/generic letter gate; content/media chưa unlock deny. URL deployment/Preview không vô tình public theo scope đã duyệt. Nếu lỗi nghiêm trọng: STOP và thực hiện containment đã được duyệt; không nới security để cho test PASS.

## 6. Trạng thái và quyết định đang chờ

**Workflow được chốt; G1/G2 hoàn tất, chủ dự án đã duyệt G3 và source được implement/kiểm thử cục bộ. Xem báo cáo G3 để phân biệt local PASS với hosted NOT TESTED. G4 cấu hình, source freeze mới, deployment mới và mở public chưa được duyệt/thực hiện. Public release hiện NO-GO** vì các gap đã xác định, không phải vì mô hình Public Access + Private Gate bị cấm.

Hai quyết định trước G2 đã có: backend Production riêng và closed Creator onboarding. Contact email/operator process cần hoàn tất trước nghiệm thu/mở public; thiếu email không ngăn thiết kế độc lập, nhưng vẫn là release blocker. Domain hiện hữu là đề xuất, không mặc định được đổi/alias. Mỗi bước sau sẽ trình kết quả thực tế và action cụ thể; không dùng câu duyệt G1 để tự làm remote release.
