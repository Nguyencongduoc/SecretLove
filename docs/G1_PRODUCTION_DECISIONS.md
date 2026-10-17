# G1 — Biên bản chốt mô hình Production

Ngày 2026-10-15, Asia/Bangkok. **G1 hoàn tất về mô hình và quyết định sản phẩm.** Chủ dự án đã chốt workflow Public Access + Private Letter Gate, yêu cầu bắt đầu G1 và trực tiếp chọn hai phương án bên dưới. Đây không phải nghiệm thu app/hosting hoặc quyền triển khai các giai đoạn sau.

## Quyết định đã chốt

| Hạng mục | Quyết định và nguồn xác nhận |
| --- | --- |
| Workflow | G1–G8, chủ dự án duyệt từng bước; xác nhận trong yêu cầu bắt đầu G1 |
| Public Access | Người nhận vào website/link không cần tài khoản Vercel; private content/media vẫn cần authorization server-side; kế thừa workflow đã chốt |
| Backend | **Tạo Supabase Production riêng**, không dùng lại project test; lựa chọn trực tiếp của chủ dự án trong câu hỏi G1 |
| Creator onboarding | **Chỉ Creator được chủ dự án duyệt trong đợt đầu**; lựa chọn trực tiếp trong câu hỏi G1. Không mở đăng ký Creator tự do khi launch |
| Recipient | Không cần tài khoản Creator; name/DOB là gate mức bảo đảm thấp, optional passphrase và session đúng letter như policy hiện tại |
| Dữ liệu test | Giữ nguyên project test, synthetic accounts/letters/media; không copy sang public backend, không tự dọn/xóa hoặc bulk rehash gate |
| Quyền duyệt | Mỗi bước trình kết quả/action cụ thể. Quyết định G1 không cấp quyền G2 implementation, remote configuration, SQL, mail, fixture writes, commit/push hoặc deployment |

Closed Creator onboarding phải được enforce server-side và tại Supabase Auth, không chỉ bỏ nút Sign up. Thiết kế G2 phải phân biệt user xác thực email với Creator đã được duyệt; không coi mọi tài khoản Auth hoặc client state là quyền được tạo thư. Cách cấp/rút quyền, vận hành operator và test direct-provider/signup/RPC denial sẽ được trình trong G2 trước implement.

## Baseline xác minh trong G1

- Local branch `feature/day-3-preview-acceptance`, HEAD `81c49be824713bd51142d959b9d56b3f1f25b0f1`. Working tree có bản chuẩn bị Owner-only và tài liệu mới chưa commit; không phải source freeze public.
- `.vercel/project.json` khớp project `secretlove-preview`, ID `prj_TH2Qq194T1GbYwRUJ0n7DfR7MXYK`, team `team_KJpwyYId3LugWZ4U1jnF4h67`.
- Read-only Vercel API: đúng project/team, Next.js, Node `24.x`, install/build command như source, system variables enabled, Function region `sin1`, Authentication scope `all`, zero automation-bypass entries, không có Git link. API không cung cấp đầy đủ protection-exception inventory; Owner-only membership/không exception vẫn cần kiểm tra ở bước tương ứng. Không dùng metadata này làm hosted acceptance.
- Các tên cấu hình dự kiến được kiểm tra trong project response vẫn có target Preview; không đọc giá trị credential, không xác nhận Production backend đã được cấu hình. Scope mới phải dùng backend Production được chốt, không tiếp tục public hóa bộ settings test Owner-only cũ.
- Source `vercel.json`: Git auto-deploy disabled, `crons: []`. Source guard chưa có public mode; signup API còn `auth.signUp`; `requireCreator` hiện yêu cầu confirmed Auth user, chưa có Creator approval gate. Các thay đổi này thuộc G2/G3.
- Không chạy app tests/build mới cho bước chỉ đọc/tài liệu. Kết quả cũ 102 PASS / 2 SKIPPED + typecheck/lint/build PASS chỉ áp dụng candidate Owner-only đã kiểm tra. Hosted audio/HTTPS/SMTP và public-release acceptance vẫn NOT TESTED.

## Các mục để PENDING có chủ đích

| Mục | Khi nào hoàn tất |
| --- | --- |
| Tên/ref/URL/keys Supabase Production mới | G4 sau packet và phép tạo/cấu hình cụ thể; chưa tạo project trong G1, không gửi keys vào chat |
| Region backend | Đề xuất Singapore để gần `sin1`; xác minh lựa chọn/provider/plan khi chuẩn bị project, không tự đổi remote |
| Domain | Giữ đề xuất hostname hiện có `secretlove-preview.vercel.app`; xác minh exact origin/domain/alias và cấu hình ở G4/G5. Không assign alias trong G1 |
| Privacy/report contact | Địa chỉ thật và xác minh còn thiếu; không chặn thiết kế G2 độc lập, nhưng chặn public release |
| Reporting/suspension/operator | Trình schema/API/role/audit và hold chống republish bypass ở G2; không tuyên bố đã có tính năng |
| SMTP, provider limits, retention/backups, ngân sách/monitoring | Phương án và bằng chứng theo G2/G4/G6; không gửi email, mua plan hoặc công bố policy chưa duyệt |
| Phép deployment/mở public | Các gate G5/G7 riêng. Lần PPD-06 cũ đã dùng hết và không cấp lại ở G1 |

## Điều kiện đóng G1

- [x] Workflow và mô hình public website/private letters đã được chủ dự án chốt.
- [x] Backend Production riêng được chủ dự án chọn rõ ràng.
- [x] Closed Creator onboarding được chủ dự án chọn rõ ràng.
- [x] Baseline source/project metadata và giới hạn bằng chứng được ghi lại.
- [x] Các đầu vào cấu hình sau này còn thiếu được đánh dấu PENDING; không bịa identifiers, secrets, contact hoặc test PASS.
- [x] Không thực hiện remote mutation, tạo backend/account/fixture, SQL, gửi email, cleanup, commit/push, deploy hoặc mở public.

**GO cho việc trình phạm vi thiết kế G2 để duyệt. Public release vẫn NO-GO.** G2 sẽ trình thiết kế approval cho Creator, report-led letter suspension/operator, privacy/deletion/retention và public build configuration; chỉ implement sau khi chủ dự án duyệt scope. Xem [workflow](PUBLIC_PRODUCTION_WORKFLOW.md).
