# SplitBill — Product Requirements Document (PRD)

**Version:** 1.0  
**Ngày:** 2026  
**Tác giả:** Product Manager & Business Analyst  
**Trạng thái:** Approved — Ready for Development

---

## Mục lục

1. [Executive Summary](#1-executive-summary)
2. [Bối cảnh & Vấn đề cần giải quyết](#2-bối-cảnh--vấn-đề-cần-giải-quyết)
3. [Mục tiêu sản phẩm](#3-mục-tiêu-sản-phẩm)
4. [Đối tượng người dùng (User Personas)](#4-đối-tượng-người-dùng-user-personas)
5. [Phạm vi sản phẩm (Scope)](#5-phạm-vi-sản-phẩm-scope)
6. [Yêu cầu chức năng chi tiết](#6-yêu-cầu-chức-năng-chi-tiết)
7. [Yêu cầu phi chức năng](#7-yêu-cầu-phi-chức-năng)
8. [User Stories & Acceptance Criteria](#8-user-stories--acceptance-criteria)
9. [Business Rules tổng hợp](#9-business-rules-tổng-hợp)
10. [Luồng người dùng (User Flows)](#10-luồng-người-dùng-user-flows)
11. [Thiết kế UX/UI — Yêu cầu quan trọng](#11-thiết-kế-uxui--yêu-cầu-quan-trọng)
12. [Metrics & KPIs](#12-metrics--kpis)
13. [Rủi ro & Giả định](#13-rủi-ro--giả-định)
14. [Timeline & Milestones](#14-timeline--milestones)
15. [Glossary](#15-glossary)

---

## 1. Executive Summary

SplitBill là ứng dụng web quản lý chia tiền nhóm và quản lý quỹ chung, hướng đến đối tượng bạn bè, nhóm ở phòng trọ, hoặc team đi chơi tại Việt Nam. Ứng dụng giải quyết hai bài toán cốt lõi:

**Bài toán 1 — Chia tiền:** Mỗi khi nhóm người đi ăn, đi chơi, thường có người trả thay trước. Cuối cùng không ai nhớ rõ ai nợ ai bao nhiêu, việc chuyển khoản qua lại rất rối. SplitBill ghi lại mọi khoản chi, tự động tính số dư, và đề xuất cách thanh toán ít lần nhất (Debt Simplification Algorithm).

**Bài toán 2 — Quản lý quỹ chung:** Nhóm ở phòng trọ thường thu quỹ hàng tháng (điện, nước, internet, quỹ sự kiện). Việc thu tiền mặt và đối soát rất mất thời gian, hay xảy ra nhầm lẫn. SplitBill tự động hóa quy trình này thông qua tích hợp SePay webhook — khi thành viên chuyển khoản đúng nội dung, hệ thống tự động ghi nhận và cập nhật trạng thái.

---

## 2. Bối cảnh & Vấn đề cần giải quyết

### 2.1 Bối cảnh thị trường

Tại Việt Nam, văn hóa "chung tiền" rất phổ biến: bạn bè hay đi ăn, đi du lịch nhóm, và các nhà trọ sinh viên/đi làm thường có quỹ chung hàng tháng. Các công cụ hiện tại như Splitwise chưa phổ biến (giao diện tiếng Anh, không tích hợp ngân hàng Việt), còn nhắn tin qua Zalo/Messenger thủ công dễ mất thông tin.

### 2.2 Pain Points cụ thể

| Pain Point | Tần suất gặp | Mức độ ảnh hưởng |
|---|---|---|
| Không nhớ ai nợ ai bao nhiêu | Rất thường xuyên | Cao |
| Chuyển khoản qua lại nhiều lần không cần thiết | Thường xuyên | Trung bình |
| Thu quỹ nhóm: không biết ai đã đóng, ai chưa | Hàng tháng | Cao |
| Thư ký phải kiểm tra sao kê ngân hàng thủ công | Hàng tháng | Cao |
| Không có lịch sử minh bạch để đối soát | Khi có tranh chấp | Rất cao |

### 2.3 Giải pháp SplitBill đề xuất

- Ghi lại tất cả expense có phân loại (category)
- Tự động tính balance và gợi ý thanh toán tối ưu (ít bước nhất)
- Tích hợp SePay webhook: chuyển khoản đúng nội dung → hệ thống tự nhận
- QR code động theo từng campaign × từng thành viên (VietQR)
- Minh bạch hoàn toàn: mọi thành viên đều xem được lịch sử đóng quỹ
- Chat nhóm tích hợp để thảo luận mà không cần đổi sang app khác

---

## 3. Mục tiêu sản phẩm

### 3.1 Business Goals

- Xây dựng nền tảng web hoàn chỉnh cho bài toán chia tiền + quản lý quỹ nhóm tại thị trường Việt Nam
- Differentiation chính: tích hợp thanh toán ngân hàng tự động qua SePay, không cần app ngân hàng riêng

### 3.2 Product Goals (Measurable)

| Goal | Metric | Target |
|---|---|---|
| Tốc độ tạo expense | Thời gian từ mở app đến tạo xong expense | < 30 giây |
| Tự động hóa thu quỹ | % lần đóng tiền được ghi nhận tự động (webhook) | > 80% |
| Minh bạch tài chính | 100% thành viên đều xem được lịch sử quỹ | 100% |
| Độ chính xác balance | Sai số trong tính toán debt | 0 |
| Tối ưu thanh toán | Số lần chuyển khoản so với brute-force | Min bằng thuật toán Greedy |


### 3.4 Chỉ số vận hành & chất lượng bổ sung

| Metric | Mục tiêu | Cách đo |
|---|---:|---|
| Thời gian onboarding (đăng ký → tạo nhóm đầu tiên) | < 3 phút | Analytics tracking |
| Tỷ lệ đóng quỹ đúng hạn trong campaign | > 85% | DB query theo campaign status |
| Số lần chuyển khoản giảm so với manual | > 40% | So sánh số settlement gợi ý với worst case `N*(N-1)/2` |
| API response time P95 | < 500ms | APM monitoring |
| Uptime hệ thống | > 99.5% | Health check / uptime monitor |
| Tỷ lệ expense có receipt đính kèm | > 30% | DB query trên expense receipt |
| Số system messages tự động / ngày | Tracking | Socket.io logs / DB query |
| Thời gian trung bình từ tạo expense → settlement | < 7 ngày | DB query giữa expense created_at và settlement created_at |
| Khoản chi submit thành công lần đầu | ≥ 90% | Form analytics + API success rate |
| Campaign hiển thị đúng trạng thái đóng tiền | ≥ 95% | QA test + production monitoring |
| Webhook hợp lệ xử lý idempotent | ≥ 99% | Webhook audit log + unique constraint conflict rate |
| Tạo nhóm + mời thành viên đầu tiên | ≤ 2 phút | Funnel analytics |
| Xem QR + copy mã chuyển khoản | ≤ 15 giây | UX analytics |
| Backend test coverage | ≥ 85% | CI coverage report |
| Frontend logic/components quan trọng | ≥ 75% | CI coverage report |

### 3.3 Non-Goals (Out of Scope — Giai đoạn 1)

- Ứng dụng mobile native (iOS/Android) — chỉ web responsive
- Cổng thanh toán chủ động (Momo, VNPay, Stripe) — chỉ nhận webhook thụ động
- Báo cáo thuế / kế toán doanh nghiệp
- Multi-currency (chỉ hỗ trợ VND) và Multi-language (chỉ tiếng Việt)
- Tính năng mượn tiền cá nhân ngoài context nhóm
- Export dữ liệu ra Excel/PDF
- Admin dashboard
- Direct banking payout, KYC, ví điện tử
- Enterprise organization hierarchy
- Tự động hoàn tiền khi overpayment
- Xóa vĩnh viễn lịch sử tài chính khi dữ liệu còn cần audit

> Xem thêm danh sách Deferred Features tại mục 5.3.

---

## 4. Đối tượng người dùng (User Personas)

### Persona 1: Nguyễn Thành An — "Người hay trả thay"
- **Tuổi:** 22–28, sinh viên / đi làm năm đầu
- **Hành vi:** Thường trả trước khi đi nhậu, đi ăn với bạn bè. Hay bị quên tiền lại.
- **Nhu cầu:** Ghi lại expense nhanh, biết ai đang nợ mình bao nhiêu, nhắc bạn bè trả tiền một cách tự nhiên (qua app, không ngại ngùng)
- **Frustration:** Phải nhớ tất cả trong đầu hoặc nhắn tin từng người

### Persona 2: Trần Thị Lan — "Thư ký phòng trọ"
- **Tuổi:** 20–30, quản lý quỹ phòng trọ 6–8 người
- **Hành vi:** Thu tiền điện/nước/internet mỗi tháng, phải nhắc từng người, kiểm tra sao kê ngân hàng thủ công
- **Nhu cầu:** Tự động nhận tiền qua chuyển khoản, biết ngay ai đóng rồi ai chưa, minh bạch với cả nhóm
- **Frustration:** Mất 30–60 phút mỗi tháng để đối chiếu, bị nghi ngờ không trung thực

### Persona 3: Lê Hoàng Bình — "Thành viên thụ động"
- **Tuổi:** 18–35
- **Hành vi:** Không chủ động nhớ phải đóng tiền, cần được nhắc
- **Nhu cầu:** Biết mình đang nợ bao nhiêu, biết cần chuyển khoản gì với nội dung gì, nhận thông báo nhắc nhở
- **Frustration:** Phải hỏi lại số tài khoản, không biết đóng đủ chưa

### Persona 4: Phạm Minh Đức — "Trưởng nhóm du lịch"
- **Tuổi:** 25–35
- **Hành vi:** Tổ chức trip với 8–15 người, thu tiền trước đi, quản lý chi phí trong chuyến
- **Nhu cầu:** Tạo campaign thu tiền trước, ghi lại tất cả chi phí trong trip, tổng kết sau chuyến
- **Frustration:** Phải nhớ tất cả bằng Excel, mất thời gian cuối chuyến để quyết toán


### 4.1 Persona bổ sung: Sinh viên ở trọ chung
- **Tên đại diện:** Minh, 21 tuổi, sinh viên Đại học Bách Khoa
- **Bối cảnh:** Ở trọ chung 4 người, mỗi tháng chia tiền điện/nước/internet/gas, đi ăn chung nhiều lần mỗi tuần
- **Hành vi hiện tại:** Ghi vào nhóm Zalo nhưng tin nhắn bị trôi, cuối tháng phải lật lại từng tin để tính
- **Nhu cầu chính:** Chia tiền sinh hoạt nhanh, quản lý quỹ ăn chung, biết rõ mình đang nợ ai / ai nợ mình
- **Pain point:** Cuối tháng dễ tranh cãi vì không ai nhớ ai đã trả gì
- **Giá trị SplitBill:** Tự động tính, QR sẵn, lịch sử rõ ràng, giảm tranh cãi

### 4.2 Persona bổ sung: Nhóm bạn đi chơi / du lịch
- **Tên đại diện:** Lan, 28 tuổi, nhân viên văn phòng
- **Bối cảnh:** Đi ăn nhóm 8–10 người mỗi tuần, du lịch nhóm 2–3 lần/năm
- **Hành vi hiện tại:** Một người trả trước, chia đều bằng máy tính, nhắn Zalo để đòi tiền
- **Nhu cầu chính:** Ghi expense ngay khi chi, nhiều người trả khác nhau, cuối chuyến biết tổng và ai nợ ai
- **Pain point:** Đi du lịch nhiều ngày, về nhà mất nhiều thời gian để quyết toán
- **Giá trị SplitBill:** Ghi ngay, tính tự động, đề xuất thanh toán tối ưu

### 4.3 Persona bổ sung: Team trưởng / Quản lý quỹ team
- **Tên đại diện:** Hùng, 32 tuổi, team lead công ty IT
- **Bối cảnh:** Quản lý quỹ team 15 người, thu 200K/tháng cho team building, sinh nhật, quà tặng
- **Hành vi hiện tại:** Ghi Excel, nhắn từng người nhắc đóng, screenshot bảng kê gửi nhóm
- **Nhu cầu chính:** Thu quỹ tự động, biết ai đóng/chưa đóng real-time, sổ chi minh bạch
- **Pain point:** Mỗi tháng mất nhiều thời gian nhắc, check sao kê và ghi sổ
- **Giá trị SplitBill:** Auto xác nhận qua SePay, nhắc tự động, sổ chi online minh bạch

### 4.4 Mapping persona theo role hệ thống

| Role | Mục tiêu chính | Quyền/nhu cầu trọng tâm |
|---|---|---|
| Leader / Nhóm trưởng | Quản lý nhóm và chịu trách nhiệm quyết định cuối | Chỉnh thông tin nhóm, tạo đợt thu, phân quyền, kick thành viên, xác nhận xóa nhóm, xem toàn bộ trạng thái quỹ |
| Secretary / Thư ký | Quản lý tài khoản nhận quỹ và đối soát | Nhập thông tin ngân hàng, xác nhận đóng tiền thủ công, ghi sổ chi quỹ, minh bạch lịch sử đóng tiền |
| Member / Thành viên | Theo dõi nghĩa vụ tài chính cá nhân | Xem khoản chi, số dư, QR chuyển khoản, lịch sử đóng tiền, nhận nhắc nhở và chat nhóm |

---

## 5. Phạm vi sản phẩm (Scope)

### 5.1 Trong phạm vi (In Scope)

**Module 1: Authentication**
- Đăng ký / đăng nhập với email + password
- Recovery codes (8 mã, hiển thị 1 lần)
- Refresh token rotation
- Quên mật khẩu bằng recovery code

**Module 2: Quản lý nhóm**
- Tạo, xem, cập nhật nhóm
- Invite link có expiry và max_uses
- Rời nhóm (cần leader approve)
- Kick thành viên (leader)
- Phân quyền 3 cấp: leader / secretary / member

**Module 3: Chia tiền (Expenses)**
- Tạo/sửa/xóa expense với 3 kiểu chia: equal / custom / percentage
- Upload ảnh hóa đơn
- Xem balance từng thành viên
- Debt simplification: gợi ý thanh toán ít lần nhất
- Ghi nhận settlement

**Module 4: Quỹ nhóm (Fund)**
- Tạo đợt thu (campaign) với tần suất: one_time / weekly / biweekly / monthly
- Lưu thông tin tài khoản thư ký, generate QR VietQR động
- Mã định danh chuyển khoản unique per (campaign × user)
- Tích hợp SePay webhook: tự động ghi nhận khi thành viên chuyển khoản đúng mã
- Xác nhận thủ công (secretary)
- Sổ chi quỹ
- Lịch sử đóng quỹ minh bạch

**Module 5: Chat nhóm**
- Tin nhắn text real-time (Socket.io)
- System messages tự động (ai đóng quỹ, expense mới...)
- Ghim tin nhắn (leader/secretary)
- Xóa tin nhắn
- Typing indicator
- Cursor-based pagination

**Module 6: Thống kê**
- Tổng quan chi tiêu nhóm
- Biểu đồ theo category
- Biểu đồ theo thời gian
- Bảng xếp hạng chi tiêu

**Module 7: Notifications**
- Thông báo in-app (badge, dropdown)
- Real-time qua Socket.io
- Cron job nhắc nợ và nhắc đóng quỹ

**Module 8: Profile**
- Upload avatar
- Đổi display_name, password
- Xem / tạo lại recovery codes
- Thống kê cá nhân


**Module 9: Trạng thái UI & vận hành MVP**
- Loading state, error state và empty state rõ ràng cho các màn hình chính
- Audit trail cho thao tác tài chính quan trọng
- Các mutation quan trọng chạy trong database transaction
- Idempotency cho webhook và cron jobs
- Responsive UI cho desktop và mobile

### 5.2 Ngoài phạm vi (Out of Scope)

Danh sách đầy đủ — bao gồm tất cả mục đã nêu ở mục 3.3 và bổ sung thêm:

- App mobile native (iOS/Android)
- Cổng thanh toán chủ động (Momo, VNPay, Stripe) — chỉ nhận webhook thụ động
- Xuất báo cáo Excel/PDF
- Multi-language (chỉ tiếng Việt) và Multi-currency (chỉ VND)
- Chức năng mượn tiền cá nhân không thuộc nhóm
- Admin dashboard
- Direct banking payout từ ứng dụng
- KYC, thẻ thanh toán, ví điện tử hoặc cổng thanh toán chủ động
- Enterprise organization hierarchy
- Tự động hoàn tiền khi overpayment
- Xóa vĩnh viễn lịch sử tài chính nếu dữ liệu còn cần audit

### 5.3 Deferred Features sau V1

| Feature | Lý do defer |
|---|---|
| Mobile native iOS/Android | Web responsive đủ cho MVP, mobile native cần effort lớn |
| Export Excel/PDF | Chưa cần trong vòng đời MVP, ưu tiên core flow trước |
| Multi-language | Giai đoạn đầu chỉ tiếng Việt |
| Admin dashboard | Chưa cần khi chưa có vận hành quy mô lớn |
| AI phân tích chi tiêu | Nice-to-have, không thuộc core value đầu tiên |
| Recurring expenses tự động | Có thể phát sinh phức tạp nghiệp vụ, để sau khi expense flow ổn định |
| Push notification native | Chưa có app mobile native |
| Dark mode toggle | Có thể bổ sung sau phần core functionality |

---

## 6. Yêu cầu chức năng chi tiết

### 6.1 Module Authentication

#### 6.1.1 Đăng ký (3 bước)

**Bước 1 — Nhập thông tin:**
- Input: email (unique, required), password (min 8 ký tự), confirm_password
- Validate realtime
- Submit → server tạo user, sinh 8 recovery codes, trả về plain text codes (DUY NHẤT lần này)

**Bước 2 — Recovery Codes:**
- Hiển thị đầy đủ 8 mã dạng `ABCD-1234`, font monospace, nền tối
- Cảnh báo đỏ: "Đây là lần DUY NHẤT bạn thấy đủ 8 mã. Sau này chỉ xem được masked preview (4 ký tự đầu của mỗi mã)."
- Nút copy từng mã + copy tất cả
- Checkbox bắt buộc: "Tôi đã lưu đủ 8 mã ở nơi an toàn"
- Không có nút Back

**Bước 3 — Đặt display_name:**
- Màn hình: "Bạn muốn chúng tôi gọi bạn là gì?"
- 1 input duy nhất, gợi ý: "Tên này hiển thị với mọi người trong nhóm"
- Bắt buộc điền → vào app

#### 6.1.2 Đăng nhập

- Input: email + password
- Checkbox "Ghi nhớ đăng nhập" → refresh token 30 ngày (thay vì 7 ngày mặc định)
- Link "Quên mật khẩu?" → flow recovery code
- Rate limit: 5 lần / 15 phút / IP

#### 6.1.3 Quên mật khẩu (Recovery Code)

- Nhập email + 1 trong 8 recovery code
- Nếu đúng → form đặt mật khẩu mới
- Cảnh báo: mã đã dùng bị xóa, tất cả thiết bị bị đăng xuất
- Sau khi đặt mật khẩu mới: revoke toàn bộ refresh token hiện tại

---


#### 6.1.4 Quy định bổ sung về display name, username và recovery codes

- Email là định danh unique chính trong UX đăng ký / đăng nhập.
- `username` không còn bắt buộc là business identifier trong flow đăng ký. Nếu hệ thống vẫn cần trường kỹ thuật, trường này nên nullable hoặc auto-generated và không bắt người dùng nhập.
- Display name được thu thập sau đăng ký bằng màn hình hỏi tên hiển thị, không bắt buộc unique.
- Recovery codes phải sinh đủ 8 mã dạng `XXXX-XXXX`, ký tự alphanumeric uppercase.
- Recovery codes hiển thị đầy đủ một lần duy nhất sau đăng ký hoặc sau khi regenerate.
- **Quyết định đã chốt (MVP):** Backend lưu `code_hash` (bcrypt) + `code_preview` (4 ký tự đầu masked, VD: `"A3F2-****"`) cho 4 mã đầu, `null` cho 4 mã sau. Profile chỉ hiển thị masked preview — không hiển thị lại plain text sau lần đầu. Nếu muốn hiển thị full plain text, phải lưu encrypted value với key riêng, không khuyến nghị cho MVP.
- Khi dùng một recovery code để reset mật khẩu: đánh dấu `used_at`, revoke toàn bộ refresh tokens của user và buộc đăng nhập lại.
- Regenerate recovery codes yêu cầu mật khẩu hiện tại, xóa/disable bộ mã cũ và hiển thị 8 mã mới đầy đủ đúng một lần.

#### 6.1.5 Quy định bổ sung về token và session

- Access token lưu trong memory của frontend, không lưu localStorage nếu có thể tránh.
- Refresh token lưu bằng httpOnly cookie, lưu DB dưới dạng hash, có thể revoke.
- Refresh token mặc định TTL 7 ngày; nếu `remember_me = true` thì TTL 30 ngày.
- Refresh token rotation: mỗi lần refresh thành công, token cũ bị revoke và token mới được cấp.
- Logout phải revoke refresh token hiện tại và client xóa access token khỏi memory.

### 6.2 Module Nhóm

#### 6.2.1 Danh sách nhóm (Trang chủ)
- Mỗi nhóm: tên, số thành viên, số dư của bản thân (dương/âm, có màu sắc), role badge
- Nút tạo nhóm mới
- Nút tham gia nhóm qua invite link

#### 6.2.2 Tạo nhóm
- Input: tên nhóm (required), mô tả (optional), tiền tệ (mặc định VND)
- Người tạo tự động trở thành leader

#### 6.2.3 Invite Link
- Leader tạo link có expiry (tùy chọn ngày hết hạn) và max_uses (null = không giới hạn)
- Link dạng: `/invite/:token`
- Trang xác nhận: hiển thị tên nhóm, nút "Tham gia"
- Sau khi join: server gán animal_avatar tự động (không trùng với ai trong nhóm)

#### 6.2.4 Rời nhóm
- Member yêu cầu rời nhóm → tạo leave request → leader nhận thông báo với nút Xác nhận / Từ chối
- Nếu approve: member status = "left"
- **Điều kiện:** không thể rời nhóm nếu balance ≠ 0 (đang nợ hoặc được nợ)
- **Nếu leader muốn rời:** phải chọn 1 thành viên active để chuyển role leader trước, rồi mới submit leave request (leader mới approve)
- **Nếu leader chỉ muốn chuyển quyền nhưng vẫn ở lại nhóm:** leader chọn 1 thành viên active làm leader mới; leader cũ vẫn active trong nhóm và chuyển về role member.

#### 6.2.5 Kick thành viên (Leader)
- Leader có thể kick thành viên bất kỳ (trừ chính mình)
- Điều kiện: member không bị disable nút kick nếu họ đang có contribution pending/late trong campaign đang active
- Nếu kick thành viên đang có contribution pending/late: contribution của họ chuyển sang status đặc biệt `kicked` trong campaign đó. Khi leader đóng campaign: contribution về status bình thường (không còn pending/late)
- Sau khi kick: member.status = "left", xuất hiện trong lịch sử nhưng không thể thao tác

#### 6.2.6 Xóa nhóm (Leader)
- Điều kiện KHÔNG được xóa:
  - Còn khoản nợ chưa thanh toán (balance ≠ 0 bất kỳ thành viên)
  - Còn campaign đang active
- Nếu đủ điều kiện: cả leader VÀ secretary phải xác nhận (2 bước approval)
- Nếu nhóm không có secretary: chỉ cần leader xác nhận

---


#### 6.2.7 Quy định bổ sung về audit, soft delete và trạng thái thành viên

- Nên ưu tiên soft delete nhóm thay vì hard delete nếu nhóm đã có lịch sử tài chính, để đảm bảo auditability.
- Nhóm bị soft delete sẽ ẩn khỏi danh sách active nhưng vẫn giữ lịch sử cần thiết cho đối soát.
- Thành viên đã `left` vẫn xuất hiện trong lịch sử expense, settlement, contribution và chat/system message cũ.
- Không được để nhóm rơi vào trạng thái không có leader.
- Chỉ có đúng 1 secretary active tại một thời điểm.
- Khi đổi secretary, tất cả cấu hình QR/tài khoản ngân hàng active cũ bị deactivate/xóa khỏi active use; lịch sử campaign/payment giữ nguyên.
- Existing member mở lại invite link của chính nhóm đó nên xử lý idempotent: trả về thông tin nhóm, không tăng `use_count` lần nữa.
- Animal avatar nên tránh trùng trong cùng nhóm nếu số thành viên ≤ 20.

#### 6.2.8 Ma trận phân quyền chi tiết

| Hành động | Leader | Secretary | Member |
|---|:---:|:---:|:---:|
| Tạo nhóm | ✅ | — | — |
| Sửa thông tin nhóm | ✅ | ❌ | ❌ |
| Xóa nhóm | ✅ khởi tạo | ✅ xác nhận nếu có | ❌ |
| Rời nhóm | ✅, phải chuyển quyền | ✅, cần leader approve | ✅, cần leader approve |
| Tạo invite link | ✅ | ✅ | ✅ |
| Kick thành viên | ✅ | ❌ | ❌ |
| Đổi role | ✅ | ❌ | ❌ |
| Approve/Reject yêu cầu rời nhóm | ✅ | ❌ | ❌ |
| Tạo expense | ✅ | ✅ | ✅ |
| Sửa/xóa expense | ✅ tất cả | ✅ do mình tạo | ✅ do mình tạo |
| Xem expense | ✅ | ✅ | ✅ |
| Tạo/sửa/hủy/đóng đợt thu quỹ | ✅ | ❌ | ❌ |
| Nhập/xóa thông tin tài khoản ngân hàng QR quỹ | ❌ | ✅ | ❌ |
| Nhập/xóa tài khoản nhận tiền chia bill của chính mình trong group | ✅ | ✅ | ✅ |
| Xác nhận đóng quỹ thủ công | ❌ | ✅ | ❌ |
| Ghi/sửa sổ chi quỹ | ✅ | ✅ | ❌ |
| Xóa sổ chi quỹ | ✅ | ❌ | ❌ |
| Xem trạng thái, lịch sử và số dư quỹ | ✅ | ✅ | ✅ |
| Gửi tin nhắn | ✅ | ✅ | ✅ |
| Xóa tin nhắn | ✅ tất cả | ✅ do mình gửi | ✅ do mình gửi |
| Ghim tin nhắn | ✅ | ✅ | ❌ |
| Xem thống kê nhóm | ✅ | ✅ | ✅ |

### 6.3 Module Expenses

#### 6.3.1 Tạo Expense

**Form inputs:**
- Tiêu đề (required)
- Số tiền (required, > 0)
- Người trả (dropdown thành viên active)
- Ngày (date picker, mặc định hôm nay)
- Category: food / transport / accommodation / entertainment / shopping / other
- Ghi chú (optional)
- Upload ảnh hóa đơn (optional, max 5MB, image/*)
- Kiểu chia: equal / custom / percentage

**Kiểu chia Equal:**
- Nếu client không gửi `splits`, server tính đều cho tất cả thành viên active.
- Nếu client gửi `splits`, server chỉ tính đều cho các thành viên được chọn.

**Kiểu chia Custom:**
- Input số tiền cho từng thành viên
- Hiển thị realtime: "Còn thiếu X đồng" / "Đã đủ"
- Validate: tổng splits = amount (sai lệch do làm tròn: cho phép ≤ 1đ)

**Kiểu chia Percentage:**
- Input % cho từng thành viên
- Validate: tổng % = 100% (cho phép sai lệch làm tròn theo quy tắc toán học quốc tế, ví dụ 33.33% × 3 = 99.99% vẫn hợp lệ)
- Server convert % sang amount và làm tròn

#### 6.3.2 Sửa / Xóa Expense
- Chỉ người tạo expense hoặc leader mới được sửa/xóa
- Xóa expense → recalculate balance toàn nhóm

#### 6.3.3 Balance & Debt Settlement
- GET `/balances`: balance của từng thành viên (dương = được nợ, âm = đang nợ)
- GET `/settlements/suggest`: danh sách chuyển khoản tối ưu (Greedy algorithm)
- POST `/settlements`: ghi nhận đã thanh toán (không xóa nợ trong DB, chỉ thêm record)
- Balance được tính lại từ đầu mỗi khi query (không cache)
- Mỗi thành viên có thể nhập tài khoản nhận tiền chia bill của chính mình theo từng group; thông tin này không lưu toàn cục theo user.
- QR trong đề xuất thanh toán chia bill chỉ tự điền ngân hàng/số tài khoản/tên chủ tài khoản, không tự điền nội dung chuyển khoản. QR quỹ chung vẫn là flow riêng của secretary và có mã nội dung chuyển khoản.

---


#### 6.3.4 Quy định bổ sung về validation và dữ liệu lịch sử

- `paid_by` phải là active group member tại thời điểm tạo expense và phải nằm trong danh sách split users; khi sửa legacy expense, có thể cho phép historical member hợp lệ nếu họ thuộc lịch sử nhóm tại ngày expense.
- `split users` phải thuộc nhóm và không được duplicate trong cùng một expense.
- Với `equal`, backend có thể tự tính splits hoặc validate splits từ client, nhưng tổng cuối cùng phải đúng bằng expense amount.
- Với `percentage`, backend phải phân bổ phần dư làm tròn một cách deterministic để tổng split amount đúng bằng expense amount.
- Receipt image tối đa 5MB, chỉ nhận MIME image hợp lệ.
- Xóa expense phải xóa splits trong cùng transaction và trigger balance recalculation bằng query sau đó.
- Settlement là bản ghi tài chính append-only, không sửa/xóa nợ cũ trong database.
- Balance phải được tính từ expense/splits/settlements, không dựa vào cache nếu chưa có cơ chế invalidation an toàn.

### 6.4 Module Fund (Quỹ nhóm)

#### 6.4.1 Campaign (Đợt thu)

**Tạo campaign (Leader only):**
- Tiêu đề, số tiền/người (amount_per_person), tần suất (one_time/weekly/biweekly/monthly), hạn đóng (due_date), mô tả
- Hệ thống tự tính suggested_amount_per_payment = amount_per_person / số lần theo tần suất
- Khi tạo campaign: tự động tạo contribution record cho tất cả thành viên active

**Đóng campaign (Leader only):**
- Điều kiện: không còn thành viên status = pending (chỉ được có paid / late / kicked)
- Nếu có contribution `kicked`: campaign vẫn có thể close, contribution `kicked` không tính là nghĩa vụ active (giữ nguyên status `kicked` để audit, không đổi)

#### 6.4.2 Mã định danh chuyển khoản
- Format: `QUY-{CAMPAIGN_CODE}-{USER_CODE}` (VD: `QUY-C11-U42`)
- Unique per (campaign_id × user_id)
- Server normalize trước khi match: bỏ dấu, uppercase, bỏ khoảng trắng thừa
- Thành viên ghi đúng mã này vào nội dung chuyển khoản

#### 6.4.3 QR Code động (VietQR)
- Secretary lưu thông tin tài khoản (bank_id, account_number)
- Backend generate URL VietQR động per thành viên per campaign
- Format: `https://img.vietqr.io/image/{bank_id}-{account_number}-compact2.png?addInfo={transfer_content}`
- Không lưu file QR — generate URL on demand

#### 6.4.4 SePay Webhook
- Endpoint public theo cấu hình nhóm: `POST /api/webhooks/sepay/{webhook_config_id}`
- Khi secretary lưu tài khoản nhận quỹ, SplitBill sinh `webhook_config_id`, URL webhook và Secret Key `whsec_...` để secretary copy sang SePay.
- Verify HMAC secret của đúng cấu hình webhook → reject 401 nếu sai
- Chỉ xử lý giao dịch tiền vào; giao dịch tiền ra bị bỏ qua
- Idempotency: kiểm tra transaction_ref đã xử lý chưa
- Normalize nội dung → match mã định danh → tìm campaign + user
- Giao dịch không match: bỏ qua hoàn toàn, không lưu bất kỳ thông tin nào
- Nếu match: cộng dồn amount_paid; nếu đủ → status = "paid"
- Overpayment (amount_paid sẽ vượt amount_required): chỉ ghi nhận phần còn thiếu, phần dư ghi nhận vào lịch sử giao dịch và thông báo cho thư ký, chờ thư ký xác nhận đã đọc

#### 6.4.5 Xác nhận thủ công (Secretary)
- Secretary xác nhận contribution của 1 thành viên
- Bắt buộc ghi `confirmed_by` (tên thư ký)
- Lý do (note) tùy chọn
- Contribution không thể sửa sau khi đã `paid`

#### 6.4.6 Sổ chi quỹ
- Leader/secretary ghi khoản chi: tiêu đề, số tiền, ngày, ghi chú, ảnh receipt
- Điều kiện: tổng chi không được vượt tổng thu (balance không âm)
- Mọi thành viên xem được sổ chi

#### 6.4.7 Đổi thư ký
- Khi đổi thư ký mới: xóa toàn bộ thông tin QR + tài khoản ngân hàng của thư ký cũ
- SePay webhook tự động trỏ về thư ký mới (sau khi thư ký mới upload thông tin)
- Lịch sử đóng tiền trong các campaign vẫn giữ nguyên

---


#### 6.4.8 Quy định bổ sung về campaign, contribution và overpayment

- Khi tạo campaign, backend tạo contribution record cho toàn bộ thành viên active tại thời điểm đó.
- `suggested_amount_per_payment` được tính dựa trên `amount_per_person`, `payment_frequency` và thời gian tới `due_date`.
- Campaign active sẽ chặn xóa nhóm.
- Nếu campaign đã có payment, thao tác delete nên được hiểu là cancel theo chính sách sản phẩm, không xóa sạch lịch sử tài chính.
- Contribution status gồm: `pending`, `paid`, `late`, `kicked`. Trạng thái `kicked` dùng cho cả thành viên bị kick lẫn tự rời nhóm khi còn nghĩa vụ trong campaign active. Không dùng `removed_from_group` — đã chốt MVP.
- `amount_paid` có thể vượt `amount_required` để phản ánh overpayment trong lịch sử.
- Overpayment không tự động hoàn tiền. Hệ thống ghi nhận vào payment history và thông báo cho secretary.
- Tất cả thành viên được xem lịch sử đóng quỹ của nhóm nhưng không thấy dữ liệu nhạy cảm không cần thiết như ID giao dịch ngân hàng nội bộ.

#### 6.4.9 Quy định bổ sung về SePay webhook

- Endpoint public: `POST /api/webhooks/sepay/{webhook_config_id}`.
- Xác thực webhook bằng HMAC-SHA256 với header `x-sepay-signature` trên raw request body (không parse JSON trước khi verify).
- Chỉ xử lý giao dịch có `transfer_type = "in"`.
- Dedup key ưu tiên SePay `id`; lưu `reference_number` nếu có để audit.
- Payload SePay dùng **snake_case** (chuẩn API thực tế): `id`, `bank_brand_name`, `account_number`, `transaction_date`, `amount_in`, `amount_out`, `accumulated`, `transaction_content`, `reference_number`, `code`, `sub_account`, `bank_account_id`.
- Trước khi match mã định danh, server normalize nội dung: bỏ dấu, uppercase, trim và chuẩn hóa khoảng trắng.
- Nếu `transaction_content`/`code` không match mã định danh SplitBill, không lưu transaction data.
- Nếu match thành công, insert payment và update contribution trong cùng transaction.
- Không lưu trường `accumulated` để tránh lưu số dư tài khoản ngân hàng của secretary.
- MVP không bắt buộc row-level lock; dùng transaction + unique dedup constraint để đảm bảo không ghi trùng.

#### 6.4.10 Quyền riêng tư tài khoản thư ký

Hệ thống chỉ được lưu dữ liệu cần thiết cho việc đối soát quỹ:

- Số tiền giao dịch match mã định danh.
- Thời điểm giao dịch.
- Transaction reference/id phục vụ idempotency và audit.
- Tên tài khoản nhận nếu cần hiển thị đối soát.
- Mã campaign/user đã match.

Hệ thống không được lưu:

- Giao dịch không liên quan đến SplitBill.
- Số dư tài khoản ngân hàng (`accumulated`).
- Nội dung chuyển khoản cá nhân không match mã định danh.
- Dữ liệu sao kê ngoài phạm vi campaign/quỹ nhóm.

#### 6.4.11 Số dư quỹ và sổ chi

- Fund balance = tổng successful contribution payments - tổng fund spendings.
- Leader/secretary được tạo và cập nhật spending.
- Leader only được xóa spending.
- Fund spending có thể có receipt image, tối đa 5MB, MIME image hợp lệ.
- Điều kiện chi quỹ: tổng chi không được làm fund balance âm, trừ khi sau này sản phẩm có policy overdraft riêng.

### 6.5 Module Chat

- Tin nhắn text real-time qua Socket.io
- Phân biệt tin nhắn của mình (phải) / người khác (trái)
- System message: màu xám, căn giữa (VD: "An vừa đóng quỹ tháng 11")
- Tin nhắn đã ghim: banner ở trên cùng
- Typing indicator: "Bình đang gõ..."
- Gửi bằng Enter hoặc nút Send
- Xóa tin nhắn (chủ tin hoặc leader): hiển thị "Tin nhắn đã bị xoá" (giữ record trong DB với is_deleted = true)
- Ghim tin nhắn (leader/secretary): right-click hoặc menu 3 chấm
- Load thêm tin nhắn cũ khi scroll lên (cursor-based pagination)
- Socket reconnect: hiển thị banner "Mất kết nối, đang kết nối lại..."

---

### 6.6 Module Thống kê

- Tổng quan: tổng chi tiêu nhóm, so sánh tháng này vs tháng trước
- Biểu đồ tròn: theo category (Recharts PieChart)
- Biểu đồ cột: theo thời gian, toggle tuần/tháng (Recharts BarChart)
- Bảng xếp hạng: ai chi nhiều nhất
- Filter thời gian: 7 ngày / 30 ngày / 3 tháng / tùy chọn

---

### 6.7 Module Notifications

**Loại thông báo:**
- `expense_added` — Có khoản chi mới trong nhóm
- `fund_reminder` — Nhắc đóng quỹ (trước 3 ngày, 1 ngày, đúng hạn, sau hạn tối đa 3 lần)
- `fund_paid` — Xác nhận đã đóng quỹ thành công
- `fund_late` — Thông báo trễ hạn
- `fund_complete` — Tất cả thành viên đã đóng đủ (cho leader)
- `settlement_suggested` — Gợi ý thanh toán
- `member_joined` — Thành viên mới tham gia
- `member_left` — Thành viên rời nhóm
- `campaign_created` — Đợt thu mới được tạo

**UX:**
- Icon chuông trên navbar, badge số chưa đọc
- Dropdown danh sách thông báo gần nhất
- Click → navigate đến màn hình liên quan
- Đánh dấu đã đọc từng cái / tất cả
- Nhận realtime qua Socket.io

**Cron jobs:**
- 8:00 sáng hàng ngày (UTC+7): nhắc nợ expense cho thành viên balance âm
- Hàng ngày: kiểm tra campaign active → nhắc đóng quỹ theo lịch (trước 3 ngày, 1 ngày, đúng hạn, 3 ngày sau hạn)

---

### 6.8 Module Profile

**Hiển thị:**
- Avatar (upload hoặc animal_avatar)
- display_name (inline edit)
- username (không đổi được, chỉ để định danh)
- Email (không đổi được)

**Chức năng:**
- Upload avatar: max 5MB, image/* — ảnh cũ tự động xóa khỏi Cloudinary
- Xóa avatar → dùng lại animal_avatar
- Đổi password: form 3 trường (cũ, mới, xác nhận)
- Recovery Codes: xem masked preview 4 mã đầu (`XXXX-****`) + 4 mã sau (`****-****`), số mã còn hiệu lực
- Tạo lại 8 mã mới: nhập mật khẩu xác nhận → hiển thị 8 mã mới đầy đủ 1 lần

**Thống kê cá nhân (readonly):**
- Số nhóm đang tham gia
- Tổng chi tiêu cá nhân (tất cả nhóm)
- Tổng đang nợ / đang được nợ


### 6.9 Quy định bổ sung về reminder, cron và idempotency

- Cron nhắc nợ expense chạy 8:00 sáng hằng ngày theo UTC+7 cho thành viên có balance âm.
- Cron campaign active kiểm tra nhắc đóng quỹ trước hạn 3 ngày, trước hạn 1 ngày, đúng hạn, và sau hạn tối đa 3 lần.
- Nếu đóng tiền sau `due_date`, contribution chuyển trạng thái `late` nhưng vẫn được ghi nhận thanh toán.
- Cron jobs phải safe to rerun, không tạo notification trùng trong cùng reminder window.
- Notification nên có deep link tới màn hình liên quan: expense detail, campaign detail, settlement, leave request hoặc group members.
- Chat message soft delete giữ record trong DB với `is_deleted = true` và UI hiển thị “Tin nhắn đã bị xoá”.
- Chỉ thành viên active mới được join Socket.io room của nhóm.
- Socket reconnect phải hiển thị banner mất kết nối / đang kết nối lại khi cần.

---

## 7. Yêu cầu phi chức năng

### 7.1 Bảo mật

| Yêu cầu | Đặc tả |
|---|---|
| Password hashing | bcrypt, tối thiểu 10 rounds |
| Access token | JWT, TTL 15 phút |
| Refresh token | Lưu DB dạng hash, TTL 7 ngày (30 ngày nếu remember_me) |
| Refresh token rotation | Mỗi lần refresh → revoke cái cũ, cấp cái mới |
| Recovery codes | Lưu DB dạng hash (bcrypt), không bao giờ lưu plain text |
| Webhook verification | HMAC secret từ SePay, reject 401 nếu sai |
| Rate limiting | Login: 5/15 phút/IP; Register: 10/giờ/IP; Webhook: 100/phút |
| Socket auth | JWT verify khi handshake |
| Data privacy thư ký | Không log, không lưu giao dịch không liên quan đến quỹ |

### 7.2 Hiệu năng

| Yêu cầu | Target |
|---|---|
| API response time (p95) | < 500ms |
| Chat message delivery | < 200ms (local network) |
| Webhook processing | < 1 giây end-to-end |
| Database queries | Không có N+1 query |

### 7.3 Độ tin cậy

- Webhook idempotency: cùng transaction_ref chỉ xử lý 1 lần
- Database transactions: các thao tác quan trọng (tạo expense, xử lý webhook, kick member) phải chạy trong transaction
- Socket reconnect: tự động kết nối lại, không mất tin nhắn

### 7.4 Khả năng mở rộng

- Stateless API (JWT) → horizontal scaling dễ dàng
- Socket.io có thể scale với Redis adapter

### 7.5 Responsive

- Desktop: sidebar cố định trái + content phải
- Mobile: bottom navigation thay sidebar
- Modal → bottom sheet trên mobile
- QR code đủ lớn để quét trên mobile


### 7.6 Quyền riêng tư & dữ liệu nhạy cảm

- Không log access token, refresh token, recovery code, HMAC secret hoặc raw webhook body chứa dữ liệu nhạy cảm.
- Không lưu nội dung giao dịch ngân hàng không match mã định danh.
- Không hiển thị số tài khoản secretary ở nơi không cần thiết ngoài QR/payment screen.
- Tất cả financial history cần có audit trail: ai tạo/sửa/xác nhận, thời điểm, phương thức.
- Các thao tác tài chính quan trọng nên ghi immutable event hoặc audit log nếu hạ tầng cho phép.

### 7.7 Data Integrity

- Tạo expense + splits phải chạy trong transaction.
- Xử lý webhook phải chạy trong transaction và có unique constraint chống trùng giao dịch.
- Kick member và cập nhật contribution liên quan phải chạy trong transaction.
- Role changes phải đảm bảo không tạo trạng thái 0 leader hoặc nhiều secretary.
- Balance/fund balance nên tính từ nguồn dữ liệu sự kiện/bản ghi tài chính, không sửa trực tiếp số dư tay.

### 7.8 Validation & Error Handling

- Form validation realtime ở frontend nhưng backend vẫn là nguồn validate cuối cùng.
- API trả lỗi có code ổn định để frontend map message.
- Validation error hiển thị inline ở field tương ứng.
- Lỗi nghiệp vụ hiển thị toast hoặc alert block có hướng dẫn hành động tiếp theo.
- Các thao tác destructive cần confirmation rõ ràng, đặc biệt xóa nhóm, hủy campaign, xóa spending, regenerate recovery codes.

### 7.9 Upload & Storage

- Avatar, receipt expense và receipt fund spending chỉ nhận `image/*`.
- File upload tối đa 5MB.
- Khi thay avatar, ảnh cũ trên Cloudinary cần được xóa nếu không còn reference.
- Không cho upload file executable hoặc MIME không khớp extension.

### 7.10 Accessibility & UX chất lượng

- Touch target tối thiểu 44px trên mobile.
- Text và trạng thái tài chính không chỉ dựa vào màu sắc; cần có icon/label rõ.
- QR code tối thiểu 200×200px, khuyến nghị 300×300px.
- Các nút Copy cho mã định danh và recovery code phải có feedback tức thì.
- Keyboard navigation và focus state cần rõ cho form chính.

---

## 8. User Stories & Acceptance Criteria

### US-01: Đăng ký tài khoản

**As a** người dùng mới,  
**I want to** tạo tài khoản với email và password,  
**So that** tôi có thể sử dụng SplitBill.

**Acceptance Criteria:**
- [x] Form nhận email + password + confirm password, validate realtime
- [x] Sau khi submit thành công: hiển thị 8 recovery codes đầy đủ
- [x] Phải tick checkbox xác nhận đã lưu mã mới được sang bước tiếp
- [x] Phải đặt display_name trước khi vào app
- [x] Không thể đăng ký với email đã tồn tại
- [x] Password yếu (< 8 ký tự) hiển thị lỗi inline

---

### US-02: Tạo expense và chia tiền

**As a** thành viên nhóm,  
**I want to** ghi lại khoản chi và chia cho các thành viên,  
**So that** mọi người biết ai đang nợ bao nhiêu.

**Acceptance Criteria:**
- [x] Có thể chọn kiểu chia: equal / custom / percentage
- [x] Với custom: hiển thị realtime tổng còn lại, disable submit nếu chưa đủ
- [x] Với percentage: validate tổng = 100% (cho phép sai lệch làm tròn)
- [x] Có thể upload ảnh hóa đơn (max 5MB)
- [x] Expense hiển thị ngay trong danh sách sau khi tạo
- [x] Balance cập nhật ngay sau khi tạo

---

### US-03: Thu quỹ tự động qua chuyển khoản

**As a** thành viên nhóm,  
**I want to** chuyển khoản với mã định danh và hệ thống tự nhận,  
**So that** tôi không phải báo cáo thủ công với thư ký.

**Acceptance Criteria:**
- [x] Mỗi thành viên nhìn thấy mã định danh của mình (VD: QUY-C11-U42) rõ ràng, có nút copy
- [x] Có QR code để quét thẳng bằng app ngân hàng, tự điền đúng số tài khoản + nội dung
- [x] Sau khi chuyển khoản đúng nội dung: trạng thái cập nhật tự động trong vòng vài giây
- [x] Nhận thông báo xác nhận: "Đã nhận X đồng, còn thiếu Y đồng" hoặc "Đã đóng đủ"
- [x] Lịch sử hiển thị: ngày giờ, số tiền, phương thức (auto/manual)

---

### US-04: Thư ký quản lý quỹ

**As a** thư ký nhóm,  
**I want to** xem ai đã đóng quỹ và xác nhận thủ công nếu cần,  
**So that** tôi có thể quản lý quỹ chính xác và minh bạch.

**Acceptance Criteria:**
- [x] Xem bảng trạng thái đóng của toàn nhóm: xanh/vàng/đỏ
- [x] Có thể xác nhận thủ công cho từng thành viên (tên thư ký tự động ghi lại)
- [x] Contribution đã paid không thể sửa hoặc xóa
- [x] Nhận thông báo khi có overpayment cần xử lý
- [x] Khi đổi thư ký: QR/tài khoản cũ bị xóa, cần upload thông tin mới

---

### US-05: Chat nhóm real-time

**As a** thành viên nhóm,  
**I want to** nhắn tin với cả nhóm trong app,  
**So that** không cần chuyển sang Zalo hay Messenger.

**Acceptance Criteria:**
- [x] Tin nhắn hiển thị gần như ngay lập tức (< 200ms)
- [x] Phân biệt tin của mình (phải, màu khác) vs người khác (trái)
- [x] System message hiển thị ở giữa màu xám
- [x] Có thể xem tin nhắn đã ghim ở banner trên cùng
- [x] Khi scroll lên có thể load thêm lịch sử
- [x] Khi mất mạng: hiển thị banner thông báo và tự reconnect

---

### US-06: Nhận thông báo nhắc nhở

**As a** thành viên nhóm,  
**I want to** nhận thông báo nhắc đóng quỹ và nhắc trả nợ,  
**So that** tôi không quên.

**Acceptance Criteria:**
- [x] Nhận thông báo trước due_date 3 ngày, 1 ngày, đúng ngày
- [x] Nhận tối đa 3 thông báo sau due_date (hàng ngày)
- [x] Nhận thông báo nhắc nợ expense hàng ngày (nếu balance âm)
- [x] Click thông báo → navigate đến đúng màn hình
- [x] Đánh dấu đã đọc từng cái hoặc tất cả


### US-07: Tạo nhóm và mời thành viên

**As a** leader,  
**I want to** tạo nhóm và gửi invite link,  
**So that** các thành viên có thể tham gia nhanh.

**Acceptance Criteria:**
- [x] Tạo nhóm thành công thì người tạo trở thành leader
- [x] Invite link có expiry và max_uses tùy chọn
- [x] Người mở invite thấy tên nhóm trước khi join
- [x] Existing member mở lại link không bị tính thêm use_count
- [x] Thành viên mới được gán animal_avatar nếu chưa có avatar cá nhân

### US-08: Rời nhóm có phê duyệt

**As a** member,  
**I want to** gửi yêu cầu rời nhóm,  
**So that** tôi rời nhóm có kiểm soát và không làm sai lệch lịch sử tài chính.

**Acceptance Criteria:**
- [x] Không thể gửi yêu cầu nếu balance khác 0
- [x] Leader nhận notification approve/reject
- [x] Khi approve, trạng thái member là `left`
- [x] Member đã left vẫn hiển thị trong lịch sử expense/contribution cũ
- [x] Leader muốn rời nhóm phải chọn replacement leader

### US-09: Webhook xử lý idempotent

**As a** hệ thống,  
**I want to** xử lý webhook SePay idempotent,  
**So that** giao dịch không bị ghi nhận trùng.

**Acceptance Criteria:**
- [x] Webhook verify HMAC signature và timestamp
- [x] Chỉ xử lý `transfer_type = "in"`
- [x] Giao dịch không match mã định danh không được lưu
- [x] Cùng transaction id/reference chỉ xử lý một lần
- [x] Overpayment được ghi nhận lịch sử và thông báo secretary, không auto-refund

### US-10: Quản lý trạng thái loading/error/empty

**As a** người dùng,  
**I want to** thấy trạng thái rõ ràng khi tải/lỗi/chưa có dữ liệu,  
**So that** tôi biết phải làm gì tiếp theo.

**Acceptance Criteria:**
- [x] Danh sách dùng skeleton loader
- [x] Submit button có loading state
- [x] Form lỗi hiển thị inline tại field
- [x] Empty state có hướng dẫn hành động tiếp theo
- [x] Lỗi hệ thống hiển thị toast hoặc alert dễ hiểu

---

## 9. Business Rules tổng hợp

| # | Rule | Module |
|---|---|---|
| BR-01 | Không thể xóa nhóm nếu còn khoản nợ hoặc campaign active | Groups |
| BR-02 | Xóa nhóm cần leader VÀ secretary xác nhận (nếu có secretary) | Groups |
| BR-03 | Không thể rời nhóm nếu balance ≠ 0 | Groups |
| BR-04 | Rời nhóm phải được leader approve | Groups |
| BR-05 | Leader rời nhóm phải chuyển role trước | Groups |
| BR-06 | Chỉ 1 secretary tại một thời điểm | Groups |
| BR-07 | Đổi secretary → xóa QR/tài khoản cũ | Fund |
| BR-08 | Chỉ người tạo hoặc leader được sửa/xóa expense | Expenses |
| BR-09 | Xóa expense → recalculate balance | Expenses |
| BR-10 | Settlement chỉ thêm record, balance tính lại từ đầu mỗi query | Expenses |
| BR-11 | Tổng splits phải = amount (sai lệch làm tròn cho phép ≤ 1đ) | Expenses |
| BR-12 | Tổng % phải = 100% (cho phép sai lệch làm tròn quốc tế) | Expenses |
| BR-13 | Số dư quỹ không thể âm (chi không vượt thu) | Fund |
| BR-14 | Contribution đã paid không thể sửa/xóa dưới bất kỳ hình thức nào | Fund |
| BR-15 | Chỉ webhook SePay hoặc secretary mới cập nhật được contribution | Fund |
| BR-16 | Secretary bắt buộc ghi confirmed_by khi xác nhận thủ công | Fund |
| BR-17 | Không thể close campaign khi còn thành viên pending | Fund |
| BR-18 | Đóng tiền sau due_date → tự động status = "late" | Fund |
| BR-19 | Webhook: cùng transaction_ref chỉ xử lý 1 lần (idempotency) | Fund |
| BR-20 | Webhook: giao dịch không có mã định danh → bỏ qua, không lưu | Fund |
| BR-21 | Webhook: overpayment → chỉ ghi phần còn thiếu, phần dư thông báo thư ký | Fund |
| BR-22 | Recovery codes hiển thị đầy đủ DUY NHẤT 1 lần sau đăng ký | Auth |
| BR-23 | Recovery code đã dùng để reset mật khẩu → revoke toàn bộ refresh tokens | Auth |
| BR-24 | Animal_avatar không trùng trong cùng nhóm (nếu nhóm ≤ 20 người) | Groups |
| BR-25 | Kick member có contribution pending/late → status = "kicked", resolve khi close campaign | Fund |
| BR-26 | Thành viên đã left vẫn xuất hiện trong lịch sử expense cũ | Expenses |
| BR-27 | Chỉ thành viên active mới kết nối được vào room chat | Chat |
| BR-28 | Recovery code profile: 4 mã đầu hiển thị masked preview `XXXX-****`, 4 mã sau `****-****`. Full plain text chỉ hiển thị 1 lần sau register/regenerate | Auth |


| BR-29 | Email là unique identifier chính; display_name không bắt buộc unique | Auth |
| BR-30 | Backend lưu `code_preview` (`"XXXX-****"`) cho 4 mã đầu, `null` cho 4 mã sau — không lưu plain text sau lần tạo | Auth |
| BR-31 | Existing member join lại bằng invite không tăng use_count | Invitations |
| BR-32 | Role changes không được tạo trạng thái 0 leader hoặc nhiều secretary | Groups |
| BR-33 | Nên soft delete group có lịch sử tài chính để bảo toàn audit trail | Groups |
| BR-34 | Split users không được duplicate trong cùng expense | Expenses |
| BR-35 | Settlement records là append-only financial records | Expenses |
| BR-36 | Campaign có payment không được hard delete lịch sử; delete nên chuyển thành cancel theo policy | Fund |
| BR-37 | `amount_paid` có thể vượt `amount_required`; overpayment không auto-refund | Fund |
| BR-38 | Webhook chỉ xử lý `transfer_type = "in"` (snake_case, chuẩn SePay API thực tế) | Fund |
| BR-39 | Webhook phải verify HMAC signature và timestamp tolerance | Fund |
| BR-40 | Không lưu `accumulated` hoặc giao dịch ngân hàng không match mã định danh | Fund |
| BR-41 | Cron reminders phải idempotent, không gửi trùng trong cùng reminder window | Notifications |
| BR-42 | Chỉ thành viên active mới join được Socket.io room của nhóm | Chat |
| BR-43 | Mutation tài chính quan trọng phải chạy trong database transaction | System |

---

## 10. Luồng người dùng (User Flows)

### Flow 1: Đăng ký → Vào app lần đầu

```
Trang đăng ký
  → Nhập email + password
  → [Submit] → Server tạo user + 8 recovery codes
  → Hiển thị Recovery Codes (8 mã đầy đủ)
  → Tick checkbox xác nhận đã lưu
  → [Tiếp tục] → Màn hình đặt display_name
  → Nhập tên
  → [Xác nhận] → Trang chủ (danh sách nhóm)
```

### Flow 2: Thu quỹ tự động

```
Leader tạo campaign
  → Secretary upload thông tin tài khoản ngân hàng
  → Hệ thống generate mã định danh cho từng thành viên
  → Thành viên xem QR + mã định danh của mình
  → Thành viên quét QR bằng app ngân hàng → chuyển khoản
  → SePay nhận tiền → gọi webhook → Server verify HMAC
  → Normalize nội dung → match mã định danh → tìm contribution
  → Insert payment record + update amount_paid
  → Nếu đủ: update status = "paid" → tạo notification
  → Thành viên thấy trạng thái cập nhật realtime (Socket.io)
```

### Flow 3: Gợi ý thanh toán nợ

```
Thành viên mở tab "Chia tiền"
  → Xem bảng balance (ai nợ ai bao nhiêu)
  → Có thể nhập tài khoản nhận tiền của chính mình cho group hiện tại
  → Nhấn "Xem gợi ý thanh toán"
  → Server tính Greedy Debt Simplification
  → Hiển thị danh sách: "Bình trả An 400,000đ" / "Chi trả An 200,000đ"
  → Nếu người nhận đã nhập bank info trong group này, hiển thị QR ở trên và bank_name/account_number ở dưới
  → Nhấn "Ghi nhận đã thanh toán" → tạo Settlement record
  → Balance cập nhật lại
```

### Flow 4: Rời nhóm

```
Member nhấn "Rời nhóm"
  → Kiểm tra balance = 0 → nếu ≠ 0: hiển thị thông báo không thể rời
  → Nếu = 0: tạo leave request
  → Leader nhận notification + nút Xác nhận / Từ chối
  → Nếu approve: member.status = "left"
  → Nếu reject: hiển thị thông báo cho member
```


### Flow 5: Tạo nhóm và mời thành viên

```
Invitee mở /invite/:token
  → Trang xác nhận hiển thị tên nhóm + nút "Tham gia"
  → Nếu chưa đăng nhập: redirect đến trang login, sau khi login redirect lại /invite/:token
  → Sau khi đăng nhập: bấm "Tham gia" → client gọi POST /api/invitations/join với Bearer token
  → Server validate token + idempotency nếu đã là member
  → Tạo group_member role member + animal_avatar
  → Tạo system message + notification
```

### Flow 6: Secretary xác nhận đóng quỹ thủ công

```
Secretary mở campaign contribution table
  → Chọn thành viên cần xác nhận
  → Nhập amount + note optional
  → Server kiểm tra secretary role + campaign active
  → Insert manual payment với confirmed_by = secretary id
  → Update amount_paid/status
  → Ghi lịch sử đóng quỹ
  → Gửi notification realtime
```

### Flow 7: Đổi secretary và cấu hình QR mới

```
Leader đổi role một thành viên thành secretary
  → Server đảm bảo chỉ có 1 secretary active
  → Secretary cũ trở thành member
  → QR/bank config active cũ bị deactivate/xóa khỏi active use
  → Lịch sử payment/campaign giữ nguyên
  → Secretary mới nhập bank_id/account_number
  → Backend generate VietQR mới cho campaign/user về sau
```

### Flow 8: Kick member có contribution pending/late

```
Leader nhấn kick member
  → Server kiểm tra member không phải leader và không có expense balance outstanding
  → Nếu có contribution pending/late trong campaign active
      → chuyển contribution sang `kicked`
  → group_member.status = kicked, left_at = now()
  → Tạo system message + notification
  → Khi leader close campaign, contribution `kicked` không tính là active pending nhưng lịch sử vẫn giữ
```

---

## 11. Thiết kế UX/UI — Yêu cầu quan trọng

### 11.1 Quy tắc hiển thị nhất quán

| Element | Quy tắc |
|---|---|
| Số tiền | Luôn format `1.000.000 ₫`, không hiển thị số thô |
| Ngày giờ | UTC+7, dùng relative time cho chat ("2 phút trước") |
| Trạng thái đóng quỹ | Xanh = đã đóng đủ, Vàng = đóng một phần, Đỏ = chưa đóng / trễ hạn |
| Balance | Dương = xanh (được nợ), Âm = đỏ (đang nợ) |
| Mã định danh | Font monospace, spacing rõ, nền tối nổi bật, nút copy 1 chạm |
| Recovery codes | Font monospace, nền tối, nút copy từng mã và copy tất cả |
| Avatar priority | avatar_url > animal_avatar > placeholder |

### 11.2 Loading & Error States

- Skeleton loader cho danh sách (không dùng spinner toàn trang)
- Button loading state khi submit form
- Optimistic update cho chat
- Toast error cho lỗi API (react-hot-toast)
- Inline error cho form validation
- Empty state có hướng dẫn (không để trống trơn)

### 11.3 Mobile-specific

- Bottom navigation thay sidebar
- Modal → bottom sheet
- QR code đủ lớn để quét (tối thiểu 200×200px, recommend 300×300px)
- Các nút touch target tối thiểu 44px


### 11.4 Empty states khuyến nghị

| Màn hình | Empty state |
|---|---|
| Danh sách nhóm | “Bạn chưa có nhóm nào. Tạo nhóm mới hoặc tham gia bằng invite link.” |
| Expense list | “Chưa có khoản chi nào. Thêm khoản chi đầu tiên để bắt đầu chia tiền.” |
| Campaign list | “Chưa có đợt thu nào. Leader có thể tạo campaign mới.” |
| Chat | “Chưa có tin nhắn. Hãy bắt đầu thảo luận với nhóm.” |
| Notifications | “Bạn chưa có thông báo mới.” |

### 11.5 Error states khuyến nghị

- Mất kết nối Socket.io: banner “Mất kết nối, đang kết nối lại...”
- Webhook/payment chưa cập nhật: hiển thị hướng dẫn chờ hoặc liên hệ secretary xác nhận thủ công
- Invite link hết hạn/max uses: màn hình lỗi riêng kèm hướng dẫn xin link mới
- Không đủ quyền: thông báo rõ role nào mới được thực hiện hành động
- Balance khác 0 khi rời nhóm: hiển thị số dư cần xử lý trước khi rời

---

## 12. Metrics & KPIs

| Metric | Định nghĩa | Target |
|---|---|---|
| Time-to-first-expense | Thời gian từ đăng ký đến tạo expense đầu tiên | < 5 phút |
| Webhook success rate | % webhook được xử lý thành công | > 99% |
| Auto-payment rate | % lần đóng quỹ qua webhook tự động | > 80% |
| Balance accuracy | Tỷ lệ balance tính đúng (so với manual) | 100% |
| Chat delivery rate | % tin nhắn delivered trong 1 giây | > 99% |
| Notification open rate | % notification được nhấn vào | > 50% |


| Onboarding time | Đăng ký → tạo nhóm đầu tiên | < 3 phút |
| On-time fund contribution rate | % contribution đóng đúng hạn | > 85% |
| Transfer reduction rate | Số lần chuyển khoản giảm so với manual worst case | > 40% |
| API p95 latency | Thời gian phản hồi endpoint thường | < 500ms |
| System uptime | Thời gian hệ thống khả dụng | > 99.5% |
| Receipt attachment rate | % expense có receipt | > 30% |
| Expense-to-settlement time | Thời gian từ tạo expense đến settlement | < 7 ngày |
| Valid webhook idempotency | % webhook hợp lệ không bị ghi trùng | ≥ 99% |
| Backend test coverage | Coverage backend | ≥ 85% |
| Frontend important logic coverage | Coverage frontend logic/components quan trọng | ≥ 75% |

---

## 13. Rủi ro & Giả định

### 13.1 Rủi ro kỹ thuật

| Rủi ro | Khả năng | Ảnh hưởng | Mitigation |
|---|---|---|---|
| SePay webhook downtime | Trung bình | Cao | Cho phép xác nhận thủ công |
| Concurrent webhook gây double-credit | Thấp | Cao | Idempotency key (transaction_ref) + DB unique constraint |
| Socket.io connection drops | Trung bình | Trung bình | Auto-reconnect + offline banner |
| Overpayment từ webhook sai | Thấp | Trung bình | Cap at amount_required, thông báo thư ký |


| Recovery code preview không khả thi nếu chỉ lưu hash | Trung bình | Trung bình | Lưu `code_preview` an toàn hoặc điều chỉnh UX chỉ hiển thị masked |
| Xóa cứng lịch sử tài chính gây mất audit trail | Thấp | Cao | Ưu tiên soft delete nhóm/campaign có lịch sử tài chính |
| Cron reminder gửi trùng | Trung bình | Trung bình | Dùng reminder window + unique key/idempotency |
| Giao dịch ngân hàng không liên quan bị lưu nhầm | Thấp | Cao | Chỉ lưu khi match mã định danh; không lưu unmatched payload |
| Role change tạo 0 leader hoặc nhiều secretary | Thấp | Cao | Transaction + constraint/validation ở service layer |

### 13.2 Rủi ro nghiệp vụ

| Rủi ro | Mitigation |
|---|---|
| Thư ký xác nhận thủ công bừa bãi | Ghi confirmed_by, lịch sử công khai toàn nhóm |
| Member quên mã định danh → chuyển khoản sai | Nhắc nhở nổi bật, QR tự điền sẵn |
| Leader tự ý kick member để trốn nợ | Không thể kick nếu member đang được nợ (balance dương) — *cần xem xét thêm* |

### 13.3 Giả định

- Người dùng có tài khoản ngân hàng Việt Nam hỗ trợ chuyển khoản online
- SePay webhook hoạt động ổn định và có SLA
- VietQR API hoạt động ổn định để generate QR URL

---

## 14. Timeline & Milestones

| Phase | Nội dung | Estimate |
|---|---|---|
| Phase 1 | Auth + Groups + Invite | 2 tuần |
| Phase 2 | Expenses + Balance + Settlement | 2 tuần |
| Phase 3 | Fund Campaigns + QR + Manual confirm | 2 tuần |
| Phase 4 | SePay Webhook integration | 1 tuần |
| Phase 5 | Chat (Socket.io) | 1 tuần |
| Phase 6 | Stats + Notifications + Cron jobs | 1 tuần |
| Phase 7 | Profile + Polish + Testing | 1 tuần |
| **Total** | | **~10 tuần** |

---

## 15. Glossary

| Thuật ngữ | Định nghĩa |
|---|---|
| Campaign | Đợt thu quỹ — leader tạo để thu tiền từ thành viên |
| Contribution | Trạng thái đóng quỹ của 1 thành viên trong 1 campaign |
| Payment | Một lần đóng tiền thực tế (có thể đóng nhiều lần) |
| Settlement | Ghi nhận thanh toán nợ giữa 2 thành viên |
| Balance | Số dư ròng của 1 thành viên trong nhóm (dương = được nợ) |
| Animal avatar | Avatar con vật tự động gán cho mỗi thành viên trong nhóm |
| Mã định danh | Mã QUY-xxx-xxx unique per (campaign × user) dùng trong nội dung chuyển khoản |
| VietQR | Chuẩn QR thanh toán của Việt Nam, tương thích với tất cả app ngân hàng |
| SePay | Dịch vụ webhook nhận tiền — gọi callback khi có tiền vào tài khoản |
| Debt Simplification | Thuật toán Greedy tối ưu số lần chuyển khoản để giải quyết tất cả nợ |
| Recovery Code | 8 mã khẩn cấp để đặt lại mật khẩu khi quên |
| Idempotency | Thuộc tính: cùng 1 operation thực hiện nhiều lần vẫn cho kết quả như thực hiện 1 lần |
| Soft delete | Cách xóa bằng cách đánh dấu không còn active thay vì xóa vĩnh viễn dữ liệu, giúp giữ audit trail |
| Audit trail | Lịch sử truy vết ai làm gì, khi nào, với dữ liệu nào |
| Overpayment | Thành viên chuyển nhiều hơn số tiền cần đóng |
| HMAC | Cơ chế ký xác thực webhook bằng secret để đảm bảo request hợp lệ |
| Raw request body | Body nguyên bản của webhook dùng để verify chữ ký, không parse/serialize lại trước khi ký |
| Reminder window | Khoảng thời gian/điều kiện duy nhất cho một lần nhắc, dùng để tránh gửi trùng notification |
| Dedup key | Khóa định danh giao dịch dùng để đảm bảo cùng webhook không xử lý nhiều lần |
| Active use | Cấu hình đang được dùng hiện tại, ví dụ QR/bank account của secretary hiện tại |
| Historical member | Thành viên từng thuộc nhóm, đã rời nhưng vẫn cần xuất hiện trong lịch sử tài chính |
