# SplitBill — API Documentation

**Version:** 1.0  
**Base URL:** `https://api.splitbill.app/api`  
**Webhook URL:** `https://api.splitbill.app/api/webhooks/sepay/:webhookConfigId`
**Protocol:** HTTPS REST + Socket.io WSS  
**Content-Type:** `application/json` (trừ file upload: `multipart/form-data`)  
**Encoding:** UTF-8

---

## Mục lục

1. [Giao thức kết nối tổng quan](#1-giao-thức-kết-nối-tổng-quan)
2. [Authentication](#2-authentication)
3. [Groups](#3-groups)
4. [Invitations](#4-invitations)
5. [Members](#5-members)
6. [Expenses](#6-expenses)
7. [Balances & Settlements](#7-balances--settlements)
8. [Statistics](#8-statistics)
9. [Fund Campaigns](#9-fund-campaigns)
10. [Fund Contributions](#10-fund-contributions)
11. [Fund QR Codes](#11-fund-qr-codes)
12. [Fund Spendings](#12-fund-spendings)
13. [Chat (REST)](#13-chat-rest)
14. [Notifications](#14-notifications)
15. [SePay Webhook](#15-sepay-webhook)
16. [Socket.io Events](#16-socketio-events)
17. [Error Code Catalog](#17-error-code-catalog)

---

## 1. Giao thức kết nối tổng quan

### 1.1 Request Format

Tất cả request gửi JSON trong body (trừ upload file):

```
POST /api/auth/login
Content-Type: application/json
Authorization: Bearer <access_token>   ← bắt buộc với mọi route trừ auth

{
  "email": "user@example.com",
  "password": "securepassword"
}
```

### 1.2 Response Format

**Thành công:**
```json
{
  "success": true,
  "data": { ... }
}
```

**Thành công có pagination:**
```json
{
  "success": true,
  "data": [ ... ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "has_more": true
  }
}
```

**Thành công cursor-based (chat):**
```json
{
  "success": true,
  "data": [ ... ],
  "meta": {
    "next_cursor": "<message_id>",
    "has_more": true
  }
}
```

**Lỗi:**
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Mô tả lỗi bằng tiếng Việt",
    "details": []
  }
}
```

**Lỗi validation (422):**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Dữ liệu đầu vào không hợp lệ",
    "details": [
      { "field": "amount", "message": "Số tiền phải lớn hơn 0" },
      { "field": "splits", "message": "Tổng splits phải bằng amount" }
    ]
  }
}
```

### 1.3 HTTP Status Codes

| Code | Ý nghĩa |
|---|---|
| 200 | OK — Thành công (GET, PATCH, DELETE) |
| 201 | Created — Tạo mới thành công (POST) |
| 204 | No Content — Xóa thành công |
| 400 | Bad Request — Request sai format |
| 401 | Unauthorized — Chưa đăng nhập / token không hợp lệ |
| 403 | Forbidden — Không có quyền |
| 404 | Not Found — Resource không tồn tại |
| 409 | Conflict — Trùng lặp / vi phạm business rule |
| 422 | Unprocessable Entity — Validation lỗi |
| 429 | Too Many Requests — Rate limit |
| 500 | Internal Server Error — Lỗi server |

### 1.4 Authentication

Tất cả route (trừ `/auth/login`, `/auth/register`, `/auth/refresh`, `/auth/recover`) yêu cầu:

```
Authorization: Bearer <access_token>
```

Access token có TTL 15 phút. Khi nhận 401, client tự động gọi `POST /auth/refresh` để lấy token mới.

Refresh token được gửi tự động qua **httpOnly cookie** tên `refresh_token`.

---

## 2. Authentication

### 2.1 Đăng ký

```
POST /api/auth/register
```

**Rate limit:** 10 lần / giờ / IP

**Request:**
```json
{
  "email": "user@example.com",
  "password": "securepassword123",
  "confirm_password": "securepassword123"
}
```

**Validation:**
- `email`: required, valid email format, unique
- `password`: required, min 8 ký tự
- `confirm_password`: phải khớp với password

**Response 201:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "display_name": null
    },
    "access_token": "eyJhbGci...",
    "recovery_codes": [
      "A3F2-9B1C",
      "D71E-4A2B",
      "F9C3-8E1D",
      "B2A5-7F3E",
      "E4D1-2C9B",
      "C8F7-1A4D",
      "A1B2-C3D4",
      "9E8F-7A6B"
    ],
    "display_name_required": true
  }
}
```

> ⚠️ `recovery_codes` chỉ trả về **một lần duy nhất** tại đây — đây là lần duy nhất full plain text được trả về. Server lưu hash + masked preview, không bao giờ trả plain text lại sau lần này.
> `display_name_required: true` → client phải hiển thị màn hình đặt tên trước khi vào app.

**Errors:**
| Code | HTTP | Mô tả |
|---|---|---|
| `EMAIL_ALREADY_EXISTS` | 409 | Email đã được đăng ký |
| `VALIDATION_ERROR` | 422 | Email sai format, password yếu, confirm không khớp |
| `RATE_LIMIT_EXCEEDED` | 429 | Quá giới hạn 10 lần/giờ |

---

### 2.2 Đặt display_name (bắt buộc sau đăng ký)

```
PATCH /api/auth/me/display-name
Authorization: Bearer <token>
```

**Request:**
```json
{
  "display_name": "Thành An"
}
```

**Validation:**
- `display_name`: required, 1–50 ký tự, không chứa ký tự đặc biệt nguy hiểm

**Response 200:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "display_name": "Thành An"
  }
}
```

**Errors:**
| Code | HTTP | Mô tả |
|---|---|---|
| `VALIDATION_ERROR` | 422 | display_name không hợp lệ |

---

### 2.3 Đăng nhập

```
POST /api/auth/login
```

**Rate limit:** 5 lần / 15 phút / IP

**Request:**
```json
{
  "email": "user@example.com",
  "password": "securepassword123",
  "remember_me": false
}
```

**Validation:**
- `email`: required
- `password`: required
- `remember_me`: boolean, default false

**Response 200:**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "display_name": "Thành An",
      "avatar_url": null
    },
    "access_token": "eyJhbGci...",
    "display_name_required": false
  }
}
```

> Cookie được set tự động: `refresh_token=<token>; HttpOnly; Secure; SameSite=Strict; Max-Age=604800` (7 ngày) hoặc 2592000 (30 ngày nếu `remember_me=true`).

**Errors:**
| Code | HTTP | Mô tả |
|---|---|---|
| `INVALID_CREDENTIALS` | 401 | Email hoặc mật khẩu sai |
| `RATE_LIMIT_EXCEEDED` | 429 | Quá 5 lần thử trong 15 phút |

---

### 2.4 Refresh Access Token

```
POST /api/auth/refresh
```

> Không cần Authorization header. Đọc `refresh_token` từ httpOnly cookie.

**Request:** (không có body)

**Response 200:**
```json
{
  "success": true,
  "data": {
    "access_token": "eyJhbGci..."
  }
}
```

> Cookie mới được set với refresh token mới (rotation). Token cũ bị revoke.

**Errors:**
| Code | HTTP | Mô tả |
|---|---|---|
| `REFRESH_TOKEN_MISSING` | 401 | Không có cookie refresh_token |
| `REFRESH_TOKEN_INVALID` | 401 | Token không hợp lệ, hết hạn, hoặc đã bị revoke |

---

### 2.5 Đăng xuất

```
POST /api/auth/logout
Authorization: Bearer <token>
```

**Request:** (không có body)

**Response 200:**
```json
{
  "success": true,
  "data": { "message": "Đăng xuất thành công" }
}
```

> Server revoke refresh token hiện tại. Cookie bị xóa.

---

### 2.6 Xoá tài khoản

```
DELETE /api/auth/me
Authorization: Bearer <token>
```

**Request:** (không có body)

**Response 200:**
```json
{
  "success": true,
  "data": { "message": "Đã xoá tài khoản thành công" }
}
```

**Quy tắc xử lý:**
- Chỉ cho xoá khi tài khoản không còn balance khác 0 trong các nhóm đang tham gia.
- Chỉ cho xoá khi không còn khoản quỹ `pending` hoặc `late` trong campaign đang hoạt động.
- Nếu user còn là `leader` của nhóm đang hoạt động, phải chuyển quyền trưởng nhóm trước.
- Hệ thống vô hiệu hoá và ẩn danh tài khoản, revoke refresh token, xoá recovery codes, xoá avatar và đánh dấu membership active là `left`. Dữ liệu lịch sử chi tiêu, quỹ, settlement và chat được giữ lại.

**Errors:**
| Code | HTTP | Mô tả |
|---|---|---|
| `ACCOUNT_HAS_DEBT` | 409 | Tài khoản còn nợ, còn được nợ, hoặc còn khoản quỹ chưa đóng |
| `ACCOUNT_LEADER_IN_ACTIVE_GROUP` | 409 | User còn là trưởng nhóm của nhóm đang hoạt động |
| `TOKEN_MISSING` / `TOKEN_INVALID` | 401 | Chưa đăng nhập hoặc token không hợp lệ |

---

### 2.7 Lấy thông tin user hiện tại

```
GET /api/auth/me
Authorization: Bearer <token>
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "user@example.com",
    "display_name": "Thành An",
    "avatar_url": "https://res.cloudinary.com/...",
    "created_at": "2024-01-01T00:00:00Z",
    "stats": {
      "groups_count": 3,
      "total_personal_spending": 1500000,
      "total_owed": 200000,
      "total_owe": 50000
    }
  }
}
```

---

### 2.8 Cập nhật profile

```
PATCH /api/auth/me
Authorization: Bearer <token>
```

**Request:**
```json
{
  "display_name": "Tên mới"
}
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "display_name": "Tên mới"
  }
}
```

---

### 2.9 Upload avatar

```
POST /api/auth/me/avatar
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

**Request:** Form field `avatar` chứa file ảnh.

**Validation:**
- Chỉ chấp nhận `image/*`
- Tối đa 5MB

**Response 200:**
```json
{
  "success": true,
  "data": {
    "avatar_url": "https://res.cloudinary.com/splitbill/image/upload/v.../avatars/uuid.jpg"
  }
}
```

**Errors:**
| Code | HTTP | Mô tả |
|---|---|---|
| `INVALID_FILE_TYPE` | 400 | File không phải ảnh |
| `FILE_TOO_LARGE` | 400 | File vượt 5MB |
| `UPLOAD_FAILED` | 500 | Lỗi upload Cloudinary |

---

### 2.10 Đổi mật khẩu

```
PATCH /api/auth/me/password
Authorization: Bearer <token>
```

**Request:**
```json
{
  "current_password": "oldpassword123",
  "new_password": "newpassword456",
  "confirm_new_password": "newpassword456"
}
```

**Response 200:**
```json
{
  "success": true,
  "data": { "message": "Đổi mật khẩu thành công" }
}
```

**Errors:**
| Code | HTTP | Mô tả |
|---|---|---|
| `CURRENT_PASSWORD_INCORRECT` | 401 | Mật khẩu cũ sai |
| `VALIDATION_ERROR` | 422 | Password mới < 8 ký tự hoặc confirm không khớp |

---

### 2.11 Quên mật khẩu (Recovery Code)

```
POST /api/auth/recover
```

**Request:**
```json
{
  "email": "user@example.com",
  "recovery_code": "A3F2-9B1C",
  "new_password": "newpassword456",
  "confirm_new_password": "newpassword456"
}
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "message": "Đặt lại mật khẩu thành công. Tất cả thiết bị đã bị đăng xuất."
  }
}
```

> Recovery code bị đánh dấu `used_at`. Toàn bộ refresh tokens của user bị revoke.

**Errors:**
| Code | HTTP | Mô tả |
|---|---|---|
| `INVALID_RECOVERY_CODE` | 401 | Mã khôi phục sai hoặc đã được dùng |
| `USER_NOT_FOUND` | 404 | Email không tồn tại |
| `VALIDATION_ERROR` | 422 | Password không hợp lệ |

---

### 2.12 Xem Recovery Codes

```
GET /api/auth/recovery-codes
Authorization: Bearer <token>
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "codes": [
      { "index": 1, "preview": "A3F2-****", "used": false },
      { "index": 2, "preview": "D71E-****", "used": false },
      { "index": 3, "preview": "F9C3-****", "used": true },
      { "index": 4, "preview": "B2A5-****", "used": false },
      { "index": 5, "preview": "****-****", "used": false },
      { "index": 6, "preview": "****-****", "used": false },
      { "index": 7, "preview": "****-****", "used": false },
      { "index": 8, "preview": "****-****", "used": false }
    ],
    "active_count": 7
  }
}
```

> 4 mã đầu (index 1–4): hiển thị masked preview dạng `XXXX-****` (4 ký tự đầu, 4 ký tự sau che).
> 4 mã sau (index 5–8): hiển thị `****-****` hoàn toàn.
> Full plain text **chỉ hiển thị một lần duy nhất** ngay sau đăng ký hoặc regenerate.

---

### 2.13 Tạo lại Recovery Codes

```
POST /api/auth/recovery-codes/regenerate
Authorization: Bearer <token>
```

**Request:**
```json
{
  "password": "currentpassword123"
}
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "recovery_codes": [
      "X1Y2-Z3W4",
      "A5B6-C7D8",
      "E9F0-G1H2",
      "I3J4-K5L6",
      "M7N8-O9P0",
      "Q1R2-S3T4",
      "U5V6-W7X8",
      "Y9Z0-A1B2"
    ]
  }
}
```

> 8 mã cũ bị xóa. 8 mã mới được tạo và hiển thị đầy đủ chỉ lần này.

**Errors:**
| Code | HTTP | Mô tả |
|---|---|---|
| `CURRENT_PASSWORD_INCORRECT` | 401 | Mật khẩu xác nhận sai |

---

### 2.14 Xóa avatar

```
DELETE /api/auth/me/avatar
Authorization: Bearer <token>
```

> Xóa avatar hiện tại khỏi Cloudinary. Hiển thị fallback về `animal_avatar` trong mỗi nhóm.

**Request:** (không có body)

**Response 200:**
```json
{
  "success": true,
  "data": {
    "message": "Đã xóa avatar thành công",
    "avatar_url": null
  }
}
```

**Errors:**
| Code | HTTP | Mô tả |
|---|---|---|
| `NO_AVATAR_TO_DELETE` | 400 | Người dùng chưa có avatar để xóa |
| `UPLOAD_FAILED` | 500 | Lỗi khi xóa file trên Cloudinary |

---

## 3. Groups

### 3.1 Tạo nhóm

```
POST /api/groups
Authorization: Bearer <token>
```

**Request:**
```json
{
  "name": "Phòng trọ 5B",
  "description": "Quỹ phòng trọ tháng này",
  "currency": "VND"
}
```

**Validation:**
- `name`: required, 1–100 ký tự
- `description`: optional, max 500 ký tự
- `currency`: default "VND"

**Response 201:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Phòng trọ 5B",
    "description": "Quỹ phòng trọ tháng này",
    "currency": "VND",
    "created_by": "user-uuid",
    "created_at": "2024-01-01T00:00:00Z",
    "my_role": "leader",
    "member_count": 1
  }
}
```

---

### 3.2 Danh sách nhóm của user

```
GET /api/groups
Authorization: Bearer <token>
```

**Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "name": "Phòng trọ 5B",
      "description": "...",
      "currency": "VND",
      "member_count": 6,
      "my_role": "leader",
      "my_balance": -150000,
      "created_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

> `my_balance`: dương = đang được nợ, âm = đang nợ.

---

### 3.2.1 Danh sách hội thoại nhóm

```
GET /api/groups/conversations
Authorization: Bearer <token>
```

> Dùng cho trang chat tổng, dropdown chat trên navbar và bong bóng chat nhanh. Chỉ trả các nhóm mà user hiện tại đang là thành viên active. Endpoint này không trả `animal_avatar`.

**Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "id": "group-uuid",
      "name": "Nhóm đi Đà Lạt",
      "description": "Kế hoạch cuối tuần",
      "member_count": 5,
      "my_role": "member",
      "is_muted": false,
      "created_at": "2026-06-08T10:00:00.000Z",
      "latest_message": {
        "id": "message-uuid",
        "content": "Nhớ mang áo khoác nhé",
        "type": "text",
        "is_deleted": false,
        "created_at": "2026-06-08T10:10:00.000Z",
        "sender": {
          "user_id": "user-uuid",
          "display_name": "Bình",
          "avatar_url": null
        }
      },
      "unread_count": 3,
      "pinned_count": 1
    }
  ]
}
```

**Rules:**
- `latest_message` là `null` nếu nhóm chưa có tin nhắn.
- `latest_message.sender` là `null` với system message.
- Tin nhắn đã xoá trả `content: "Tin nhắn đã bị xoá"` và `is_deleted: true`.
- `unread_count` không tính tin do chính user hiện tại gửi.
- Nếu user đã rời nhóm chat, hội thoại không xuất hiện trong danh sách dù membership tài chính vẫn active.
- Nếu `is_muted = true`, `unread_count` luôn là `0` và tin mới không làm tăng số chưa đọc.
- Route phải được mount trước `/api/groups/:id`.

---

### 3.3 Chi tiết nhóm

```
GET /api/groups/:id
Authorization: Bearer <token>
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Phòng trọ 5B",
    "description": "...",
    "currency": "VND",
    "created_by": "user-uuid",
    "created_at": "2024-01-01T00:00:00Z",
    "my_role": "member",
    "member_count": 6,
    "active_campaigns_count": 1,
    "has_qr": true
  }
}
```

**Errors:**
| Code | HTTP | Mô tả |
|---|---|---|
| `GROUP_NOT_FOUND` | 404 | Nhóm không tồn tại |
| `NOT_GROUP_MEMBER` | 403 | Không phải thành viên |

---

### 3.4 Cập nhật nhóm

```
PATCH /api/groups/:id
Authorization: Bearer <token>
```

> Chỉ leader.

**Request:**
```json
{
  "name": "Phòng trọ mới",
  "description": "Mô tả mới"
}
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Phòng trọ mới",
    "description": "Mô tả mới"
  }
}
```

**Errors:**
| Code | HTTP | Mô tả |
|---|---|---|
| `INSUFFICIENT_ROLE` | 403 | Không phải leader |

---

### 3.5 Xóa nhóm

```
DELETE /api/groups/:id
Authorization: Bearer <token>
```

> Chỉ leader. 2-step: leader xác nhận trước, secretary xác nhận sau (nếu có).
>
> ⚠️ **Soft delete:** Khi nhóm đã có lịch sử tài chính (expenses, settlements, campaigns, contributions), server set `status = deleted` và `deleted_at = now()` thay vì xóa vật lý. Dữ liệu vẫn được giữ cho mục đích audit. Hard delete chỉ xảy ra với nhóm chưa có bất kỳ giao dịch tài chính nào.

**Step 1 — Leader khởi tạo xóa:**

**Request:**
```json
{
  "confirm": true,
  "step": "leader"
}
```

**Response 200 (nếu không có secretary):**
```json
{
  "success": true,
  "data": { "message": "Nhóm đã được xóa thành công" }
}
```

**Response 200 (nếu có secretary):**
```json
{
  "success": true,
  "data": {
    "message": "Đã gửi yêu cầu xóa nhóm đến thư ký. Chờ thư ký xác nhận.",
    "pending_confirmation": true
  }
}
```

**Step 2 — Secretary xác nhận:**

**Request:**
```json
{
  "confirm": true,
  "step": "secretary"
}
```

**Response 200:**
```json
{
  "success": true,
  "data": { "message": "Nhóm đã được xóa thành công" }
}
```

**Errors:**
| Code | HTTP | Mô tả |
|---|---|---|
| `GROUP_HAS_UNPAID_DEBTS` | 409 | Còn khoản nợ chưa thanh toán |
| `GROUP_HAS_ACTIVE_CAMPAIGNS` | 409 | Còn đợt thu đang active |
| `INSUFFICIENT_ROLE` | 403 | Không phải leader/secretary |

---

### 3.6 Rời nhóm

```
POST /api/groups/:id/leave
Authorization: Bearer <token>
```

**Request:**
```json
{
  "transfer_leader_to": "user-uuid"
}
```

> `transfer_leader_to`: bắt buộc nếu user đang là leader. UUID của thành viên nhận role leader.

**Response 200:**
```json
{
  "success": true,
  "data": {
    "message": "Yêu cầu rời nhóm đã được gửi. Chờ trưởng nhóm xác nhận.",
    "leave_request_id": "uuid"
  }
}
```

**Errors:**
| Code | HTTP | Mô tả |
|---|---|---|
| `BALANCE_NOT_ZERO` | 409 | Bạn còn nợ hoặc đang được nợ |
| `LEADER_MUST_TRANSFER` | 400 | Leader phải chỉ định người nhận role trước |
| `TRANSFER_TARGET_NOT_MEMBER` | 400 | Người được chuyển không phải thành viên active |

---

### 3.7 Danh sách leave requests

```
GET /api/groups/:id/leave-requests
Authorization: Bearer <token>
```

> Chỉ leader. Trả danh sách các yêu cầu rời nhóm đang pending.

**Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "user": {
        "user_id": "uuid",
        "display_name": "Thành An",
        "animal_avatar": "fox"
      },
      "status": "pending",
      "created_at": "2024-11-10T09:00:00Z"
    }
  ]
}
```

---

### 3.8 Approve / Reject leave request

```
PATCH /api/groups/:id/leave-requests/:requestId
Authorization: Bearer <token>
```

> Chỉ leader. Dùng một endpoint duy nhất với field `action` để approve hoặc reject.

**Request:**
```json
{
  "action": "approve"
}
```

```json
{
  "action": "reject",
  "reason": "Cần thanh toán xong khoản còn lại"
}
```

> `action`: `"approve"` hoặc `"reject"`. Field `reason` tùy chọn khi reject.

**Response 200:**
```json
{
  "success": true,
  "data": {
    "message": "Đã chấp nhận yêu cầu rời nhóm"
  }
}
```

**Errors:**
| Code | HTTP | Mô tả |
|---|---|---|
| `LEAVE_REQUEST_NOT_FOUND` | 404 | Không tìm thấy leave request |
| `LEAVE_REQUEST_ALREADY_PROCESSED` | 409 | Request đã được xử lý trước đó |

---

## 4. Invitations

### 4.1 Tạo invite link

```
POST /api/groups/:id/invitations
Authorization: Bearer <token>
```

> Chỉ leader.

**Request:**
```json
{
  "expires_at": "2024-12-31T23:59:59Z",
  "max_uses": 10
}
```

> `expires_at` và `max_uses` đều optional. null = không giới hạn.

**Response 201:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "token": "abc123xyz789",
    "invite_url": "https://splitbill.app/invite/abc123xyz789",
    "expires_at": "2024-12-31T23:59:59Z",
    "max_uses": 10,
    "use_count": 0,
    "created_at": "2024-11-01T00:00:00Z"
  }
}
```

---

### 4.2 Danh sách invite links

```
GET /api/groups/:id/invitations
Authorization: Bearer <token>
```

> Chỉ leader.

**Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "token": "abc123xyz789",
      "invite_url": "https://splitbill.app/invite/abc123xyz789",
      "expires_at": "2024-12-31T23:59:59Z",
      "max_uses": 10,
      "use_count": 3,
      "created_at": "2024-11-01T00:00:00Z"
    }
  ]
}
```

---

### 4.3 Thu hồi invite link

```
DELETE /api/groups/:id/invitations/:invId
Authorization: Bearer <token>
```

> Chỉ leader.

**Response 204:** (no body)

---


### 4.4 Preview invite link cong khai

```
GET /api/invitations/:token
```

> Public endpoint để frontend hiển thị tên nhóm và trạng thái link trước khi user đăng nhập.

**Response 200:**
```json
{
  "success": true,
  "data": {
    "token": "abc123xyz789",
    "group": {
      "id": "uuid",
      "name": "Phòng trọ 5B",
      "description": "Quỹ phòng trọ tháng này"
    },
    "expires_at": "2024-12-31T23:59:59Z",
    "max_uses": 10,
    "use_count": 3,
    "is_joinable": true
  }
}
```

**Errors:**
| Code | HTTP | Mô tả |
|---|---|---|
| `INVITATION_NOT_FOUND` | 404 | Token không tồn tại hoặc đã bị thu hồi |
| `INVITATION_EXPIRED` | 409 | Link đã hết hạn |
| `INVITATION_MAX_USES_REACHED` | 409 | Link đã đạt giới hạn sử dụng |

---

### 4.5 Tham gia nhóm qua invite link

```
POST /api/invitations/join
Authorization: Bearer <token>
```

> Yêu cầu đăng nhập. Server cần `user_id` để tạo `GroupMember` record, gán `animal_avatar` unique trong nhóm, và kiểm tra `ALREADY_GROUP_MEMBER`. Client phải redirect user về trang đăng nhập trước khi gọi endpoint này nếu chưa có token.

**Request:**
```json
{
  "token": "abc123xyz789"
}
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "group": {
      "id": "uuid",
      "name": "Phòng trọ 5B"
    },
    "my_role": "member",
    "animal_avatar": "fox",
    "message": "Tham gia nhóm thành công!"
  }
}
```

**Errors:**
| Code | HTTP | Mô tả |
|---|---|---|
| `INVITATION_NOT_FOUND` | 404 | Token không tồn tại |
| `INVITATION_EXPIRED` | 409 | Link đã hết hạn |
| `INVITATION_MAX_USES_REACHED` | 409 | Link đã đạt giới hạn sử dụng |
| `ALREADY_GROUP_MEMBER` | 409 | Bạn đã là thành viên của nhóm này |

---

## 5. Members

### 5.1 Danh sách thành viên

```
GET /api/groups/:id/members
Authorization: Bearer <token>
```

**Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "user_id": "uuid",
      "display_name": "Thành An",
      "avatar_url": null,
      "animal_avatar": "fox",
      "role": "leader",
      "status": "active",
      "joined_at": "2024-01-01T00:00:00Z"
    },
    {
      "user_id": "uuid-2",
      "display_name": "Minh Lan",
      "avatar_url": "https://res.cloudinary.com/...",
      "animal_avatar": "cat",
      "role": "secretary",
      "status": "active",
      "joined_at": "2024-01-02T00:00:00Z"
    }
  ]
}
```

> Avatar priority: nếu `avatar_url != null` → dùng avatar_url. Ngược lại → dùng animal_avatar.

---

### 5.2 Đổi role thành viên

```
PATCH /api/groups/:id/members/:userId
Authorization: Bearer <token>
```

> Chỉ leader.

**Request:**
```json
{
  "role": "secretary"
}
```

> `role`: `"secretary"` | `"member"`. Chuyển quyền trưởng nhóm dùng endpoint riêng `PATCH /api/groups/:id/leader`.

> Nếu đổi ai đó thành secretary: secretary cũ tự động về `"member"`, QR/tài khoản ngân hàng cũ bị xóa.

**Response 200:**
```json
{
  "success": true,
  "data": {
    "user_id": "uuid",
    "role": "secretary",
    "message": "Đổi vai trò thành công"
  }
}
```

**Errors:**
| Code | HTTP | Mô tả |
|---|---|---|
| `MEMBER_NOT_FOUND` | 404 | Thành viên không tồn tại trong nhóm |
| `CANNOT_CHANGE_OWN_ROLE` | 400 | Không thể tự đổi role của mình |
| `INSUFFICIENT_ROLE` | 403 | Không phải leader |

---

### 5.3 Chuyển quyền trưởng nhóm

```
PATCH /api/groups/:id/leader
Authorization: Bearer <token>
```

> Chỉ leader. Đây là flow tự chọn: leader hiện tại chuyển quyền cho một thành viên active nhưng vẫn ở lại nhóm với role `"member"`. Flow này khác với `POST /api/groups/:id/leave`, nơi leader bắt buộc chọn người nhận quyền trước khi rời nhóm.

**Request:**
```json
{
  "new_leader_id": "user-uuid"
}
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "previous_leader_id": "old-leader-uuid",
    "new_leader_id": "new-leader-uuid",
    "previous_leader_role": "member",
    "message": "Chuyển quyền trưởng nhóm thành công"
  }
}
```

**Errors:**
| Code | HTTP | Mô tả |
|---|---|---|
| `CANNOT_TRANSFER_TO_SELF` | 400 | Không thể chuyển quyền cho chính mình |
| `TRANSFER_TARGET_NOT_MEMBER` | 400 | Người nhận quyền không phải thành viên active |
| `INSUFFICIENT_ROLE` | 403 | Không phải leader |

---

### 5.4 Kick thành viên

```
DELETE /api/groups/:id/members/:userId
Authorization: Bearer <token>
```

> Chỉ leader.

**Response 200:**
```json
{
  "success": true,
  "data": {
    "message": "Đã xóa thành viên khỏi nhóm",
    "affected_contributions": 1
  }
}
```

> `affected_contributions`: số contribution bị chuyển sang status `kicked`.

**Errors:**
| Code | HTTP | Mô tả |
|---|---|---|
| `MEMBER_NOT_FOUND` | 404 | Thành viên không tồn tại |
| `CANNOT_KICK_SELF` | 400 | Không thể tự kick bản thân |
| `INSUFFICIENT_ROLE` | 403 | Không phải leader |

---

## 6. Expenses

### 6.1 Tạo khoản chi

```
POST /api/groups/:id/expenses
Authorization: Bearer <token>
Content-Type: multipart/form-data
```

> Nếu không upload ảnh: `Content-Type: application/json`

**Request (JSON):**
```json
{
  "title": "Tiền nhậu tối qua",
  "amount": 850000,
  "paid_by": "user-uuid",
  "category": "food",
  "date": "2024-11-20",
  "split_type": "equal",
  "note": "Bia bò lá lốt",
  "splits": [
    { "user_id": "uuid-a" },
    { "user_id": "uuid-b" },
    { "user_id": "uuid-c" },
    { "user_id": "uuid-d" }
  ]
}
```

> Với `split_type = "equal"`: `splits` có thể bỏ qua để chia đều cho toàn bộ active members; nếu gửi `splits`, server chỉ chia đều cho các `user_id` được chọn.
> Với `split_type = "percentage"`: `splits` chứa thêm field `percentage`.  
> Với `split_type = "custom"`: `splits` chứa `amount` cho từng người.

**Validation:**
- `title`: required, 1–200 ký tự
- `amount`: required, > 0
- `paid_by`: required, phải là thành viên active của nhóm và phải nằm trong danh sách `splits`
- `category`: required, một trong: `food | transport | accommodation | entertainment | shopping | other`
- `date`: required, định dạng YYYY-MM-DD
- `split_type`: required, một trong: `equal | custom | percentage`
- `splits`: với `equal` có thể bỏ qua hoặc chứa danh sách participant `{ "user_id": "uuid" }`; với `custom` và `percentage` là bắt buộc
- `splits[].amount`: tổng phải = amount (sai lệch ≤ 1đ)
- `splits[].percentage`: tổng phải = 100 (sai lệch do làm tròn cho phép)

**Response 201:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "group_id": "group-uuid",
    "title": "Tiền nhậu tối qua",
    "amount": 850000,
    "paid_by": {
      "user_id": "uuid",
      "display_name": "Thành An"
    },
    "category": "food",
    "date": "2024-11-20",
    "note": "Bia bò lá lốt",
    "receipt_url": null,
    "splits": [
      { "user_id": "uuid-a", "display_name": "An", "amount": 212500 },
      { "user_id": "uuid-b", "display_name": "Bình", "amount": 212500 },
      { "user_id": "uuid-c", "display_name": "Chi", "amount": 212500 },
      { "user_id": "uuid-d", "display_name": "Dũng", "amount": 212500 }
    ],
    "created_by": "user-uuid",
    "created_at": "2024-11-20T10:30:00Z"
  }
}
```

**Errors:**
| Code | HTTP | Mô tả |
|---|---|---|
| `SPLIT_AMOUNT_MISMATCH` | 422 | Tổng splits không bằng amount |
| `PERCENTAGE_MISMATCH` | 422 | Tổng phần trăm không bằng 100% |
| `INVALID_PAYER` | 422 | paid_by không phải thành viên active hoặc không nằm trong danh sách chia |
| `INVALID_SPLIT_USER` | 422 | splits chứa user không phải thành viên |
| `AMOUNT_MUST_BE_POSITIVE` | 422 | Số tiền phải > 0 |

---

### 6.2 Danh sách khoản chi

```
GET /api/groups/:id/expenses
Authorization: Bearer <token>
```

**Query params:**
| Param | Type | Mô tả |
|---|---|---|
| `page` | int | Trang, default 1 |
| `limit` | int | Số item mỗi trang, default 20, max 50 |
| `category` | string | Filter theo category |
| `from` | date | Filter từ ngày (YYYY-MM-DD) |
| `to` | date | Filter đến ngày (YYYY-MM-DD) |
| `paid_by` | uuid | Filter theo người trả |

**Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "title": "Tiền nhậu",
      "amount": 850000,
      "paid_by": {
        "user_id": "uuid",
        "display_name": "Thành An",
        "avatar_url": null,
        "animal_avatar": "fox"
      },
      "category": "food",
      "date": "2024-11-20",
      "note": "Bia bò lá lốt",
      "receipt_url": null,
      "splits": [
        { "user_id": "uuid-a", "display_name": "An", "amount": 425000 },
        { "user_id": "uuid-b", "display_name": "Bình", "amount": 425000 }
      ],
      "created_at": "2024-11-20T10:30:00Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "has_more": true
  }
}
```

---

### 6.3 Chi tiết khoản chi

```
GET /api/groups/:id/expenses/:expId
Authorization: Bearer <token>
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "title": "Tiền nhậu",
    "amount": 850000,
    "paid_by": {
      "user_id": "uuid",
      "display_name": "Thành An"
    },
    "category": "food",
    "date": "2024-11-20",
    "note": "...",
    "receipt_url": "https://res.cloudinary.com/...",
    "splits": [
      { "user_id": "uuid-a", "display_name": "An", "amount": 212500 },
      { "user_id": "uuid-b", "display_name": "Bình", "amount": 212500 }
    ],
    "created_by": { "user_id": "uuid", "display_name": "Thành An" },
    "created_at": "2024-11-20T10:30:00Z"
  }
}
```

**Errors:**
| Code | HTTP | Mô tả |
|---|---|---|
| `EXPENSE_NOT_FOUND` | 404 | Khoản chi không tồn tại |

---

### 6.4 Sửa khoản chi

```
PATCH /api/groups/:id/expenses/:expId
Authorization: Bearer <token>
```

> Chỉ người tạo expense hoặc leader. `paid_by` không được thay đổi khi sửa; nếu client gửi `paid_by`, server vẫn giữ người đã thanh toán ban đầu.

**Request:** (các field muốn cập nhật — partial update)
```json
{
  "title": "Tiêu đề mới",
  "amount": 900000,
  "split_type": "custom",
  "splits": [...]
}
```

> Khi sửa `amount`, `split_type` hoặc `splits`, danh sách `splits` sau cập nhật vẫn phải chứa người `paid_by` ban đầu.

**Response 200:** (giống GET chi tiết)

**Errors:**
| Code | HTTP | Mô tả |
|---|---|---|
| `EXPENSE_NOT_FOUND` | 404 | Khoản chi không tồn tại |
| `CANNOT_EDIT_EXPENSE` | 403 | Không phải người tạo hoặc leader |
| `SPLIT_AMOUNT_MISMATCH` | 422 | Validation lỗi |
| `INVALID_PAYER` | 422 | Người thanh toán ban đầu không nằm trong danh sách chia mới |

---

### 6.5 Xóa khoản chi

```
DELETE /api/groups/:id/expenses/:expId
Authorization: Bearer <token>
```

> Chỉ người tạo hoặc leader.

**Response 204:** (no body)

**Errors:**
| Code | HTTP | Mô tả |
|---|---|---|
| `EXPENSE_NOT_FOUND` | 404 | Khoản chi không tồn tại |
| `CANNOT_DELETE_EXPENSE` | 403 | Không phải người tạo hoặc leader |

---

## 7. Balances & Settlements

### 7.1 Số dư của các thành viên

```
GET /api/groups/:id/balances
Authorization: Bearer <token>
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "balances": [
      {
        "user_id": "uuid-a",
        "display_name": "An",
        "avatar_url": null,
        "animal_avatar": "fox",
        "balance": 450000
      },
      {
        "user_id": "uuid-b",
        "display_name": "Bình",
        "avatar_url": null,
        "animal_avatar": "cat",
        "balance": -200000
      },
      {
        "user_id": "uuid-c",
        "display_name": "Chi",
        "avatar_url": null,
        "animal_avatar": "dog",
        "balance": -250000
      }
    ],
    "total_expenses": 850000,
    "is_settled": false
  }
}
```

> `balance` dương = đang được nợ, âm = đang nợ. Tính realtime mỗi lần gọi.

---

### 7.2 Gợi ý thanh toán tối ưu

```
GET /api/groups/:id/settlements/suggest
Authorization: Bearer <token>
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "suggestions": [
      {
        "from": { "user_id": "uuid-b", "display_name": "Bình" },
        "to": {
          "user_id": "uuid-a",
          "display_name": "An",
          "settlement_bank_info": {
            "bank_id": "970436",
            "bank_name": "Vietcombank",
            "account_number": "123456789",
            "account_name": null
          },
          "qr_url": "https://img.vietqr.io/image/970436-123456789-compact2.png"
        },
        "amount": 200000
      },
      {
        "from": { "user_id": "uuid-c", "display_name": "Chi" },
        "to": {
          "user_id": "uuid-a",
          "display_name": "An",
          "settlement_bank_info": {
            "bank_id": "970436",
            "bank_name": "Vietcombank",
            "account_number": "123456789",
            "account_name": null
          },
          "qr_url": "https://img.vietqr.io/image/970436-123456789-compact2.png"
        },
        "amount": 250000
      }
    ],
    "total_transactions": 2
  }
}
```

> `settlement_bank_info` là thông tin tài khoản của người nhận trong chính group hiện tại. Nếu người nhận chưa nhập đủ thông tin ngân hàng cho group này, `settlement_bank_info = null` và không có `qr_url`. QR settlement chỉ điền ngân hàng/số tài khoản; `account_name` có thể là `null` vì flow hiện tại không tra cứu tên chủ tài khoản.

---

### 7.3 Ghi nhận thanh toán

```
POST /api/groups/:id/settlements
Authorization: Bearer <token>
```

**Quyền ghi nhận:**
- `leader` được ghi nhận thanh toán cho bất kỳ cặp thành viên active nào trong nhóm.
- `member` chỉ được ghi nhận thanh toán khi chính họ là người trả (`from_user`).

**Request:**
```json
{
  "from_user": "uuid-b",
  "to_user": "uuid-a",
  "amount": 200000,
  "note": "Chuyển khoản rồi nhé"
}
```

**Response 201:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "from_user": { "user_id": "uuid-b", "display_name": "Bình" },
    "to_user": { "user_id": "uuid-a", "display_name": "An" },
    "amount": 200000,
    "note": "Chuyển khoản rồi nhé",
    "settled_at": "2024-11-20T15:00:00Z",
    "recorded_by": "uuid"
  }
}
```

**Errors:**
| Code | HTTP | Mô tả |
|---|---|---|
| `INSUFFICIENT_ROLE` | 403 | Thành viên không có quyền ghi nhận khoản thanh toán này |
| `INVALID_SETTLEMENT_USER` | 422 | `from_user` hoặc `to_user` không phải thành viên active |
| `AMOUNT_MUST_BE_POSITIVE` | 422 | Số tiền phải lớn hơn 0 |

---

### 7.4 Lịch sử thanh toán

```
GET /api/groups/:id/settlements
Authorization: Bearer <token>
```

**Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "from_user": { "user_id": "uuid-b", "display_name": "Bình" },
      "to_user": { "user_id": "uuid-a", "display_name": "An" },
      "amount": 200000,
      "note": "...",
      "settled_at": "2024-11-20T15:00:00Z",
      "recorded_by": { "user_id": "uuid", "display_name": "Chi" }
    }
  ]
}
```

---

### 7.5 Tài khoản nhận tiền chia bill của tôi trong group

Thông tin này lưu theo membership trong group hiện tại, không lưu toàn cục theo user. Sang group khác, thành viên phải nhập lại.

```
GET /api/groups/:id/settlements/bank-info/me
Authorization: Bearer <token>
```

**Response 200 khi đã cấu hình:**
```json
{
  "success": true,
  "data": {
    "bank_id": "970436",
    "bank_name": "Vietcombank",
    "account_number": "123456789",
    "account_name": null
  }
}
```

**Response 200 khi chưa cấu hình:**
```json
{
  "success": true,
  "data": null
}
```

```
PATCH /api/groups/:id/settlements/bank-info/me
Authorization: Bearer <token>
```

**Request:**
```json
{
  "bank_id": "970436",
  "account_number": "123456789"
}
```

> Client không được gửi `bank_name` hoặc `account_name`. Backend resolve metadata ngân hàng từ danh sách VietQR, lưu `bank_name` và để `account_name = null` nếu không có nguồn xác thực tên chủ tài khoản.

**Response 200:**
```json
{
  "success": true,
  "data": {
    "bank_id": "970436",
    "bank_name": "Vietcombank",
    "account_number": "123456789",
    "account_name": null
  }
}
```

```
DELETE /api/groups/:id/settlements/bank-info/me
Authorization: Bearer <token>
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "bank_info": null,
    "message": "Đã xoá thông tin ngân hàng nhận tiền"
  }
}
```

**Rules:**
- Mọi active member trong group đều được GET/PATCH/DELETE thông tin của chính mình.
- Không role-check leader/secretary cho endpoint này; chỉ cần auth + active group membership.
- Không dùng thông tin này cho quỹ chung. QR quỹ vẫn dùng cấu hình riêng của secretary và có `addInfo`.
- Không cho nhập tay tên chủ tài khoản để tránh lưu sai người nhận.

**Errors:**
| Code | HTTP | Mô tả |
|---|---|---|
| `BANK_PROVIDER_UNAVAILABLE` | 502 | Không kết nối được dịch vụ ngân hàng |
| `BANK_NOT_FOUND` | 404 | Ngân hàng không tồn tại |

---

### 7.6 Ngân hàng dùng chung

Endpoint này phục vụ form tài khoản nhận tiền chia bill và tài khoản nhận quỹ. Frontend chỉ gọi qua backend, không gọi trực tiếp nhà cung cấp từ trình duyệt.

#### 7.6.1 Danh sách ngân hàng

```
GET /api/banks
Authorization: Bearer <token>
```

**Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "bank_id": "970422",
      "bank_code": "MB",
      "bank_name": "MBBank",
      "full_name": "Ngân hàng TMCP Quân đội",
      "lookup_supported": true
    }
  ]
}
```

#### 7.6.2 Kiểm tra tên chủ tài khoản legacy

```
POST /api/banks/account-lookup
Authorization: Bearer <token>
Content-Type: application/json
```

> Endpoint này giữ lại cho tương thích ngược. Flow QR hiện tại không dùng endpoint này, không yêu cầu tên chủ tài khoản và không cho frontend nhập tay `account_name`.

**Request:**
```json
{
  "bank_id": "970422",
  "account_number": "0123456789"
}
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "bank_id": "970422",
    "bank_code": "MB",
    "bank_name": "MBBank",
    "account_number": "0123456789",
    "account_name": "NGUYEN VAN A"
  }
}
```

**Rules:**
- `bank_id` có thể là BIN VietQR hoặc mã ngân hàng nếu backend map được sang BIN.
- `account_number` chỉ nhận chữ số.
- `account_name` nếu có luôn đến từ backend/provider, không nhận từ input của client.

---

## 8. Statistics

### 8.1 Tổng quan

```
GET /api/groups/:id/stats
Authorization: Bearer <token>
```

**Query params:**
| Param | Default | Mô tả |
|---|---|---|
| `period` | `30d` | `7d`, `30d`, `90d`, `custom` |
| `from` | - | Bắt buộc nếu period=custom |
| `to` | - | Bắt buộc nếu period=custom |

**Response 200:**
```json
{
  "success": true,
  "data": {
    "total_spending": 3500000,
    "period": "30d",
    "from": "2024-10-21",
    "to": "2024-11-20",
    "vs_previous_period": {
      "total": 2800000,
      "change_percent": 25.0
    },
    "expense_count": 15
  }
}
```

---

### 8.2 Chi tiêu theo category

```
GET /api/groups/:id/stats/by-category
Authorization: Bearer <token>
```

**Response 200:**
```json
{
  "success": true,
  "data": [
    { "category": "food", "total": 2000000, "count": 8, "percentage": 57.14 },
    { "category": "transport", "total": 800000, "count": 4, "percentage": 22.86 },
    { "category": "entertainment", "total": 700000, "count": 3, "percentage": 20.0 }
  ]
}
```

---

### 8.3 Chi tiêu theo thành viên

```
GET /api/groups/:id/stats/by-member
Authorization: Bearer <token>
```

**Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "user_id": "uuid",
      "display_name": "Thành An",
      "total_paid": 1500000,
      "total_owed": 800000,
      "net": 700000
    }
  ]
}
```

---

### 8.4 Chi tiêu theo thời gian

```
GET /api/groups/:id/stats/timeline
Authorization: Bearer <token>
```

**Query params:** `period`, `granularity` (`day | week | month`)

**Response 200:**
```json
{
  "success": true,
  "data": [
    { "date": "2024-11-01", "total": 350000 },
    { "date": "2024-11-08", "total": 800000 },
    { "date": "2024-11-15", "total": 1200000 }
  ]
}
```

---

## 9. Fund Campaigns

### 9.1 Tạo đợt thu

```
POST /api/groups/:id/fund/campaigns
Authorization: Bearer <token>
```

> Chỉ leader.

**Request:**
```json
{
  "title": "Quỹ tháng 11",
  "description": "Đóng trước ngày 30",
  "amount_per_person": 100000,
  "payment_frequency": "monthly",
  "due_date": "2024-11-30"
}
```

**Validation:**
- `title`: required, 1–100 ký tự
- `amount_per_person`: required, > 0
- `payment_frequency`: required, `one_time | weekly | biweekly | monthly`
- `due_date`: required, phải > ngày hiện tại

**Response 201:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "title": "Quỹ tháng 11",
    "description": "Đóng trước ngày 30",
    "amount_per_person": 100000,
    "payment_frequency": "monthly",
    "suggested_amount_per_payment": 25000,
    "due_date": "2024-11-30",
    "status": "active",
    "created_at": "2024-11-01T00:00:00Z",
    "contributions_summary": {
      "total": 6,
      "pending": 6,
      "paid": 0,
      "late": 0
    }
  }
}
```

**Errors:**
| Code | HTTP | Mô tả |
|---|---|---|
| `INSUFFICIENT_ROLE` | 403 | Không phải leader |
| `DUE_DATE_IN_PAST` | 422 | Hạn đóng phải ở tương lai |

---

### 9.2 Danh sách đợt thu

```
GET /api/groups/:id/fund/campaigns
Authorization: Bearer <token>
```

**Query params:** `status` (`active | closed | cancelled | all`, default `active`)

**Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "title": "Quỹ tháng 11",
      "amount_per_person": 100000,
      "due_date": "2024-11-30",
      "status": "active",
      "contributions_summary": {
        "total": 6,
        "pending": 2,
        "paid": 3,
        "late": 1
      }
    }
  ]
}
```

---

### 9.3 Chi tiết đợt thu

```
GET /api/groups/:id/fund/campaigns/:cId
Authorization: Bearer <token>
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "title": "Quỹ tháng 11",
    "description": "Đóng trước ngày 30",
    "amount_per_person": 100000,
    "payment_frequency": "monthly",
    "suggested_amount_per_payment": 25000,
    "due_date": "2024-11-30",
    "status": "active",
    "created_by": { "user_id": "uuid", "display_name": "Thành An" },
    "created_at": "2024-11-01T00:00:00Z",
    "contributions_summary": {
      "total": 6,
      "pending": 2,
      "paid": 3,
      "late": 1
    }
  }
}
```

---

### 9.4 Cập nhật đợt thu

```
PATCH /api/groups/:id/fund/campaigns/:cId
Authorization: Bearer <token>
```

> Chỉ leader. Chỉ campaign active.

**Request:**
```json
{
  "title": "Quỹ tháng 11 (cập nhật)",
  "due_date": "2024-11-28"
}
```

**Response 200:** (giống GET chi tiết)

---

### 9.5 Đóng / Hủy đợt thu

```
DELETE /api/groups/:id/fund/campaigns/:cId
Authorization: Bearer <token>
```

> Chỉ leader.

**Request:**
```json
{
  "action": "close"
}
```

> `action`: `"close"` (đóng bình thường) hoặc `"cancel"` (hủy).

> Close điều kiện: không còn contribution nào status = `pending`.

**Response 200:**
```json
{
  "success": true,
  "data": {
    "message": "Đợt thu đã được đóng",
    "status": "closed"
  }
}
```

**Errors:**
| Code | HTTP | Mô tả |
|---|---|---|
| `CAMPAIGN_HAS_PENDING` | 409 | Còn thành viên chưa đóng đủ |
| `CAMPAIGN_ALREADY_CLOSED` | 409 | Đợt thu đã đóng |

---

## 10. Fund Contributions

### 10.1 Bảng trạng thái đóng quỹ (leader/secretary)

```
GET /api/groups/:id/fund/campaigns/:cId/contributions
Authorization: Bearer <token>
```

> Chỉ leader và secretary.

**Response 200:**
```json
{
  "success": true,
  "data": {
    "campaign": {
      "title": "Quỹ tháng 11",
      "due_date": "2024-11-30",
      "amount_per_person": 100000
    },
    "summary": {
      "total_members": 6,
      "paid": 3,
      "pending": 2,
      "late": 1
    },
    "contributions": [
      {
        "user_id": "uuid-a",
        "display_name": "An",
        "avatar_url": null,
        "animal_avatar": "fox",
        "transfer_code": "QUY-ABC123-001",
        "status": "paid",
        "amount_required": 100000,
        "amount_paid": 100000,
        "fully_paid_at": "2024-11-10T08:32:00Z"
      },
      {
        "user_id": "uuid-b",
        "display_name": "Bình",
        "avatar_url": null,
        "animal_avatar": "cat",
        "transfer_code": "QUY-ABC123-002",
        "status": "pending",
        "amount_required": 100000,
        "amount_paid": 60000,
        "fully_paid_at": null
      },
      {
        "user_id": "uuid-c",
        "display_name": "Chi",
        "avatar_url": null,
        "animal_avatar": "dog",
        "transfer_code": "QUY-ABC123-003",
        "status": "late",
        "amount_required": 100000,
        "amount_paid": 0,
        "fully_paid_at": null
      }
    ]
  }
}
```

---

### 10.2 Trạng thái đóng quỹ của bản thân (member)

```
GET /api/groups/:id/fund/campaigns/:cId/contributions/me
Authorization: Bearer <token>
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "campaign": {
      "title": "Quỹ tháng 11",
      "due_date": "2024-11-30",
      "amount_per_person": 100000,
      "suggested_amount_per_payment": 25000
    },
    "my_contribution": {
      "transfer_code": "QUY-ABC123-002",
      "status": "pending",
      "amount_required": 100000,
      "amount_paid": 60000,
      "remaining": 40000,
      "fully_paid_at": null
    },
    "qr_info": {
      "bank_name": "MB Bank",
      "account_number": "0123456789",
      "account_name": null,
      "transfer_content": "QUY-ABC123-002",
      "qr_url": "https://img.vietqr.io/image/MB-0123456789-compact2.png?addInfo=QUY-ABC123-002"
    }
  }
}
```

---

### 10.3 Xác nhận thủ công (Secretary)

```
PATCH /api/groups/:id/fund/campaigns/:cId/contributions/:userId
Authorization: Bearer <token>
```

> Chỉ secretary.

**Request:**
```json
{
  "amount": 100000,
  "note": "Đóng tiền mặt trực tiếp"
}
```

**Validation:**
- `amount`: required, > 0
- `note`: optional

**Response 200:**
```json
{
  "success": true,
  "data": {
    "contribution": {
      "user_id": "uuid",
      "display_name": "Bình",
      "status": "paid",
      "amount_required": 100000,
      "amount_paid": 100000,
      "fully_paid_at": "2024-11-15T10:00:00Z"
    },
    "payment": {
      "id": "uuid",
      "amount": 100000,
      "method": "manual",
      "confirmed_by": "Minh Lan (thư ký)",
      "note": "Đóng tiền mặt trực tiếp",
      "paid_at": "2024-11-15T10:00:00Z"
    }
  }
}
```

**Errors:**
| Code | HTTP | Mô tả |
|---|---|---|
| `CONTRIBUTION_ALREADY_PAID` | 409 | Thành viên đã đóng đủ |
| `INSUFFICIENT_ROLE` | 403 | Không phải secretary |
| `AMOUNT_MUST_BE_POSITIVE` | 422 | Số tiền phải > 0 |

---

### 10.4 Lịch sử đóng quỹ toàn nhóm

```
GET /api/groups/:id/fund/campaigns/:cId/contributions/history
Authorization: Bearer <token>
```

> Mọi thành viên đều xem được.

**Response 200:**
```json
{
  "success": true,
  "data": {
    "campaign": {
      "title": "Quỹ tháng 11",
      "due_date": "2024-11-30",
      "amount_per_person": 100000
    },
    "history": [
      {
        "user_name": "An",
        "amount": 100000,
        "cumulative_paid": 100000,
        "amount_required": 100000,
        "paid_at": "2024-11-10T08:32:00Z",
        "method": "auto",
        "confirmed_by_name": null,
        "note": null
      },
      {
        "user_name": "Bình",
        "amount": 100000,
        "cumulative_paid": 100000,
        "amount_required": 100000,
        "paid_at": "2024-11-11T14:05:00Z",
        "method": "manual",
        "confirmed_by_name": "Minh Lan (thư ký)",
        "note": "Đóng tiền mặt"
      },
      {
        "user_name": "Chi",
        "amount": 40000,
        "cumulative_paid": 40000,
        "amount_required": 100000,
        "paid_at": "2024-11-12T09:00:00Z",
        "method": "auto",
        "confirmed_by_name": null,
        "note": null
      }
    ]
  }
}
```

> Response không trả `user_id` — chỉ `user_name` để không leak thông tin nhạy cảm.

---

## 11. Fund QR Codes

### 11.1 Lưu thông tin tài khoản (Secretary)

```
POST /api/groups/:id/fund/qr
Authorization: Bearer <token>
Content-Type: application/json
```

> Chỉ secretary.

**Request:**
```json
{
  "bank_id": "970422",
  "account_number": "0123456789"
}
```

**Validation:**
- `bank_id`: required, phải map được sang ngân hàng VietQR
- `account_number`: required, chỉ gồm chữ số
- Không nhận `bank_name` hoặc `account_name` từ client; backend resolve `bank_name` từ danh sách ngân hàng và lưu `account_name = null` nếu không có nguồn xác thực tên chủ tài khoản.

**Response 201:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "bank_id": "970422",
    "bank_name": "MBBank",
    "account_number": "0123456789",
    "account_name": null,
    "webhook_config_id": "whcfg_abc123",
    "webhook_url": "https://api.splitbill.app/api/webhooks/sepay/whcfg_abc123",
    "webhook_secret": "whsec_xxxxxxxxxxxxxxxxx",
    "webhook_secret_preview": "whsec_xxxx...xxx",
    "is_active": true,
    "created_at": "2024-11-01T00:00:00Z"
  }
}
```

> `webhook_secret` là Secret Key HMAC-SHA256 để secretary copy vào SePay. Secret này chỉ dùng để xác thực webhook tiền vào của cấu hình nhóm hiện tại, không dùng để gọi API SePay hoặc đọc lịch sử giao dịch cũ.

**Errors:**
| Code | HTTP | Mô tả |
|---|---|---|
| `INSUFFICIENT_ROLE` | 403 | Không phải secretary |
| `BANK_PROVIDER_UNAVAILABLE` | 502 | Không kết nối được dịch vụ ngân hàng |
| `BANK_NOT_FOUND` | 404 | Ngân hàng không tồn tại |

---

### 11.2 Lấy thông tin QR (mọi thành viên)

```
GET /api/groups/:id/fund/qr
Authorization: Bearer <token>
```

> Query param `campaign_id` bắt buộc để generate đúng mã định danh và QR cho thành viên hiện tại.

```
GET /api/groups/:id/fund/qr?campaign_id=<cId>
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "bank_name": "MBBank",
    "account_number": "0123456789",
    "account_name": null,
    "transfer_content": "QUY-ABC123-002",
    "qr_url": "https://img.vietqr.io/image/970422-0123456789-compact2.png?addInfo=QUY-ABC123-002"
  }
}
```

**Errors:**
| Code | HTTP | Mô tả |
|---|---|---|
| `QR_NOT_CONFIGURED` | 404 | Thư ký chưa cấu hình tài khoản ngân hàng |

---

### 11.3 Xóa thông tin tài khoản

```
DELETE /api/groups/:id/fund/qr/:qrId
Authorization: Bearer <token>
```

> Chỉ secretary.

**Response 204:** (no body)

---

## 12. Fund Spendings

### 12.1 Ghi khoản chi quỹ

```
POST /api/groups/:id/fund/spendings
Authorization: Bearer <token>
```

> Leader hoặc secretary.

**Request:**
```json
{
  "title": "Mua vé xe Đà Lạt",
  "amount": 500000,
  "spent_at": "2024-11-15",
  "note": "2 vé giường nằm"
}
```

**Validation:**
- `title`: required
- `amount`: required, > 0
- `spent_at`: required, YYYY-MM-DD
- Điều kiện: `amount` phải ≤ số dư quỹ còn lại

**Response 201:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "title": "Mua vé xe Đà Lạt",
    "amount": 500000,
    "spent_at": "2024-11-15",
    "note": "2 vé giường nằm",
    "receipt_url": null,
    "recorded_by": { "user_id": "uuid", "display_name": "Minh Lan" },
    "created_at": "2024-11-15T09:00:00Z"
  }
}
```

**Errors:**
| Code | HTTP | Mô tả |
|---|---|---|
| `FUND_BALANCE_NEGATIVE` | 409 | Số tiền chi vượt quỹ hiện có |
| `INSUFFICIENT_ROLE` | 403 | Không phải leader hoặc secretary |

---

### 12.2 Danh sách khoản chi quỹ

```
GET /api/groups/:id/fund/spendings
Authorization: Bearer <token>
```

**Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "title": "Mua vé xe",
      "amount": 500000,
      "spent_at": "2024-11-15",
      "note": "...",
      "receipt_url": null,
      "recorded_by": { "user_id": "uuid", "display_name": "Minh Lan" }
    }
  ]
}
```

---

### 12.3 Số dư quỹ

```
GET /api/groups/:id/fund/balance
Authorization: Bearer <token>
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "total_collected": 7000000,
    "total_spent": 2500000,
    "remaining": 4500000,
    "breakdown": {
      "campaigns_count": 3,
      "spendings_count": 5
    }
  }
}
```

---

## 13. Chat (REST)

### 13.1 Lịch sử tin nhắn (cursor-based)

```
GET /api/groups/:id/messages
Authorization: Bearer <token>
```

**Query params:**
| Param | Mô tả |
|---|---|
| `cursor` | Message ID — load tin cũ hơn cursor này. Bỏ qua để lấy tin mới nhất |
| `limit` | Số tin nhắn, default 20, max 50 |

**Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "group_id": "group-uuid",
      "sender": {
        "user_id": "uuid",
        "display_name": "Thành An",
        "avatar_url": null,
        "animal_avatar": "fox"
      },
      "content": "Tháng này ai chưa đóng quỹ vậy?",
      "type": "text",
      "is_pinned": false,
      "is_deleted": false,
      "created_at": "2024-11-10T09:00:00Z",
      "edited_at": null
    },
    {
      "id": "uuid-2",
      "sender": null,
      "content": "An vừa đóng quỹ tháng 11",
      "type": "system",
      "is_pinned": false,
      "is_deleted": false,
      "created_at": "2024-11-10T08:32:00Z"
    }
  ],
  "meta": {
    "next_cursor": "uuid-oldest",
    "has_more": true
  }
}
```

> Tin nhắn đã xóa: `is_deleted: true`, `content: "Tin nhắn đã bị xoá"`, không trả content gốc.

---

### 13.2 Xóa tin nhắn

```
DELETE /api/groups/:id/messages/:msgId
Authorization: Bearer <token>
```

> Chủ tin nhắn hoặc leader. Soft delete (is_deleted = true, giữ record).

**Response 200:**
```json
{
  "success": true,
  "data": { "message": "Tin nhắn đã bị xoá" }
}
```

**Errors:**
| Code | HTTP | Mô tả |
|---|---|---|
| `MESSAGE_NOT_FOUND` | 404 | Tin nhắn không tồn tại |
| `CANNOT_DELETE_MESSAGE` | 403 | Không phải chủ tin hoặc leader |

---

### 13.3 Ghim tin nhắn

```
PATCH /api/groups/:id/messages/:msgId/pin
Authorization: Bearer <token>
```

> Leader hoặc secretary.

**Request:**
```json
{
  "pinned": true
}
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "message_id": "uuid",
    "is_pinned": true,
    "pinned_by": { "user_id": "uuid", "display_name": "Minh Lan" }
  }
}
```

---

### 13.4 Danh sách tin nhắn đã ghim

```
GET /api/groups/:id/messages/pinned
Authorization: Bearer <token>
```

**Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "content": "Nhớ đóng quỹ trước ngày 30 nhé!",
      "sender": { "display_name": "Minh Lan" },
      "pinned_by": { "display_name": "Minh Lan" },
      "created_at": "2024-11-01T10:00:00Z"
    }
  ]
}
```

---

### 13.5 Cập nhật cài đặt chat của tôi

```
PATCH /api/groups/:id/chat/me
Authorization: Bearer <token>
```

**Request:**
```json
{
  "is_muted": true
}
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "group_id": "group-uuid",
    "user_id": "user-uuid",
    "status": "active",
    "is_muted": true
  }
}
```

**Rules:**
- Chỉ active group member đang tham gia chat mới cập nhật được.
- Khi `is_muted = true`, tin mới trong nhóm chat đó không tăng unread count.

---

### 13.6 Rời nhóm chat

```
DELETE /api/groups/:id/chat/me
Authorization: Bearer <token>
```

**Response 200:**
```json
{
  "success": true,
  "data": {
    "group_id": "group-uuid",
    "user_id": "user-uuid",
    "status": "left",
    "is_muted": false,
    "message": "Bạn đã rời nhóm chat."
  }
}
```

**Rules:**
- Chỉ rời chat, không thay đổi group membership tài chính, role, balance, expense, settlement hoặc fund status.
- User đã rời chat không thấy hội thoại trong `GET /api/groups/conversations`, không nhận realtime chat events và không tăng unread count.
- Lịch sử tin nhắn vẫn được giữ. Nếu được thêm lại, user xem lại được lịch sử hiện có.

---

### 13.7 Danh sách thành viên có thể thêm lại vào chat

```
GET /api/groups/:id/chat/participants/available
Authorization: Bearer <token>
```

**Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "user_id": "user-uuid",
      "display_name": "Chi",
      "avatar_url": null,
      "role": "member"
    }
  ]
}
```

**Rules:**
- Chỉ trả active SplitBill group members đã rời chat.
- Không trả outsider hoặc user không còn active trong nhóm tài chính.

---

### 13.8 Thêm thành viên vào chat

```
POST /api/groups/:id/chat/participants
Authorization: Bearer <token>
```

**Request:**
```json
{
  "user_id": "user-uuid"
}
```

**Response 201:**
```json
{
  "success": true,
  "data": {
    "group_id": "group-uuid",
    "user_id": "user-uuid",
    "display_name": "Chi",
    "avatar_url": null,
    "status": "active",
    "is_muted": false
  }
}
```

**Rules:**
- Bất kỳ chat participant active hiện tại đều có thể thêm active SplitBill group member vào chat.
- Chỉ thêm được thành viên active của nhóm tài chính. Không invite outsider từ chat.

---

## 14. Notifications

### 14.1 Danh sách thông báo

```
GET /api/notifications
Authorization: Bearer <token>
```

**Query params:** `page` (default 1), `limit` (default 20), `unread_only` (boolean)

**Response 200:**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "type": "fund_paid",
      "title": "Xác nhận đóng quỹ",
      "body": "Đã nhận 100.000 ₫, đã đóng đủ quỹ tháng 11",
      "is_read": false,
      "group_id": "group-uuid",
      "group_name": "Phòng trọ 5B",
      "created_at": "2024-11-10T08:32:00Z"
    }
  ],
  "meta": {
    "unread_count": 3,
    "page": 1,
    "total": 15,
    "has_more": false
  }
}
```

---

### 14.2 Đánh dấu đã đọc

```
PATCH /api/notifications/:id/read
Authorization: Bearer <token>
```

**Response 200:**
```json
{
  "success": true,
  "data": { "id": "uuid", "is_read": true }
}
```

---

### 14.3 Đánh dấu tất cả đã đọc

```
PATCH /api/notifications/read-all
Authorization: Bearer <token>
```

**Response 200:**
```json
{
  "success": true,
  "data": { "updated_count": 5 }
}
```

---

## 15. SePay Webhook

```
POST /api/webhooks/sepay/:webhookConfigId
```

> Public endpoint — không cần Authorization header. Xác thực bằng HMAC-SHA256. `webhookConfigId` là ID public của cấu hình tài khoản nhận quỹ, ví dụ `whcfg_abc123`; secret tương ứng do SplitBill sinh khi secretary lưu tài khoản nhận quỹ.

**Rate limit:** 100 lần / phút

**Headers bắt buộc (do SePay gửi):**
```
X-SePay-Signature: sha256=<hmac-sha256-hex>
X-SePay-Timestamp: <unix_timestamp_seconds>
Content-Type: application/json
```

> Node/Express tự normalize header name về lowercase khi đọc:
> `req.headers['x-sepay-signature']` và `req.headers['x-sepay-timestamp']`

**Công thức ký (signed payload):**
```
signed_payload = `${timestamp}.${raw_body_as_string}`
expected_sig   = "sha256=" + HMAC_SHA256(secret, signed_payload)
```

> Phải dùng **raw body** (Buffer/string trước khi parse JSON). `JSON.stringify(parsed)` sẽ sai vì thứ tự key có thể thay đổi.

**Verification logic:**
1. Đọc `X-SePay-Timestamp` → parse số nguyên
2. Reject 401 nếu `|now - timestamp| > 300` giây (5 phút) — chống replay attack
3. Tính `signed_payload = "${timestamp}.${rawBody}"`
4. So sánh constant-time với `X-SePay-Signature` → reject 401 nếu sai

**Request body (từ SePay):**
```json
{
  "id": 92704,
  "gateway": "Vietcombank",
  "transactionDate": "2024-07-02 11:08:33",
  "accountNumber": "1017588888",
  "subAccount": "",
  "code": "QUYABC123001",
  "content": "QUY-ABC123-001 đóng quỹ",
  "transferType": "in",
  "description": "NGUYEN VAN A chuyển tiền",
  "transferAmount": 100000,
  "accumulated": 1234567,
  "referenceCode": "FT24315ABCDEF"
}
```

> Payload chính thức của SePay dùng camelCase như trên. Backend có lớp normalize để vẫn nhận các field snake_case cũ (`amount_in`, `transaction_content`, `reference_number`, `transfer_type`) nếu có.

**Processing logic:**
1. Tìm cấu hình webhook bằng `webhookConfigId`; nếu không tồn tại hoặc inactive → reject 401.
2. Verify `X-SePay-Timestamp` drift ≤ 5 phút → reject 401 nếu lệch.
3. Verify HMAC-SHA256 signature bằng secret của cấu hình đó → reject 401 nếu sai.
4. Chỉ xử lý giao dịch tiền vào (`transferType = "in"` và `transferAmount > 0`; hoặc field snake_case tương đương nếu payload cũ).
5. Kiểm tra `referenceCode`/SePay `id` (idempotency) → 200 nếu đã xử lý.
6. Normalize `content`/`code` → extract mã `QUY-xxx-xxx`.
7. Nếu không có mã hợp lệ → 200 (bỏ qua, không lưu bất cứ thứ gì).
8. Match mã → tìm contribution cùng group với webhook config → xử lý.
9. Trả 200 trong mọi trường hợp thành công/bỏ qua.

> Replay protection dùng 2 lớp: timestamp tolerance chặn replay ngắn hạn; idempotency `referenceCode`/SePay `id` chặn duplicate xử lý dù request đã qua timestamp window.

**Response 200 (mọi trường hợp thành công hoặc bỏ qua):**
```json
{
  "success": true
}
```

**Response 401 (HMAC sai hoặc timestamp drift > 5 phút):**
```json
{
  "success": false,
  "error": {
    "code": "INVALID_WEBHOOK_SIGNATURE",
    "message": "Chữ ký không hợp lệ hoặc request đã hết hạn"
  }
}
```

---

## 16. Socket.io Events

### 16.1 Kết nối

```javascript
const socket = io('wss://api.splitbill.app', {
  auth: {
    token: accessToken  // JWT access token
  }
});
```

> Server verify JWT khi handshake. Nếu invalid → disconnect với error `TOKEN_INVALID`.

---

### 16.2 Client → Server Events

| Event | Payload | Mô tả |
|---|---|---|
| `join_group` | `{ group_id: string }` | Vào phòng chat nhóm |
| `join_groups` | `{ group_ids: string[] }` | Vào nhiều phòng chat nhóm active cùng lúc |
| `leave_group` | `{ group_id: string }` | Rời phòng chat |
| `send_message` | `{ group_id: string, content: string }` | Gửi tin nhắn |
| `typing` | `{ group_id: string }` | Đang gõ |
| `stop_typing` | `{ group_id: string }` | Ngừng gõ |
| `mark_read` | `{ group_id: string, last_message_id: string }` | Đã đọc đến đây |

**Lưu ý `mark_read`:**
- Server phải xác minh `last_message_id` thuộc đúng `group_id`.
- Server phải xác minh user đang là thành viên active của nhóm và chưa rời nhóm chat.
- Chỉ đánh dấu các tin trong nhóm đó đến `last_message_id`; không đánh dấu tin ở nhóm khác.
- Server emit lại cho socket hiện tại `messages_read` với `{ group_id, last_message_id, read_count }`.

**Lưu ý `join_group`:**
- Server verify user là thành viên active của nhóm và chưa rời nhóm chat.
- Nếu không hợp lệ: emit `error` → `{ code: "NOT_CHAT_PARTICIPANT" }`.
- Trang chat tổng dùng `join_groups` để nhận realtime latest message, unread count và pinned count cho tất cả hội thoại active.

---

### 16.3 Server → Client Events

| Event | Payload | Trigger |
|---|---|---|
| `new_message` | `{ message: MessageObject }` | Có tin nhắn mới |
| `user_typing` | `{ user_id: string, display_name: string }` | Có người đang gõ |
| `user_stop_typing` | `{ user_id: string }` | Ngừng gõ |
| `joined_groups` | `{ group_ids: string[] }` | Socket đã join các phòng chat hợp lệ |
| `message_deleted` | `{ group_id: string, message_id: string }` | Tin nhắn bị xóa |
| `message_pinned` | `{ group_id: string, message_id: string, is_pinned: boolean, pinned_by: UserLite \| null }` | Tin nhắn được ghim/bỏ ghim |
| `messages_read` | `{ group_id: string, last_message_id: string, read_count: number }` | Socket hiện tại đã đánh dấu đã đọc |
| `chat_participant_left` | `{ group_id: string }` | User hiện tại đã rời nhóm chat |
| `chat_participant_added` | `{ group_id: string }` hoặc `ChatParticipantObject` | User được thêm lại hoặc nhóm có participant mới |
| `system_event` | `{ content: string, message: MessageObject }` | Sự kiện hệ thống |
| `new_notification` | `{ notification: NotificationObject }` | Có thông báo mới |
| `error` | `{ code: string, message: string }` | Lỗi từ server |

**MessageObject:**
```json
{
  "id": "uuid",
  "group_id": "uuid",
  "sender": {
    "user_id": "uuid",
    "display_name": "Thành An",
    "avatar_url": null,
    "animal_avatar": "fox"
  },
  "content": "Nội dung tin nhắn",
  "type": "text",
  "is_pinned": false,
  "is_deleted": false,
  "created_at": "2024-11-10T09:00:00Z"
}
```

**System messages tự động khi:**
- Thành viên mới tham gia nhóm: `"An vừa tham gia nhóm"`
- Expense mới được thêm: `"An vừa thêm khoản chi: Tiền nhậu 850.000 ₫"`
- Thành viên đóng quỹ: `"An vừa đóng quỹ tháng 11"`
- Đợt thu mới: `"Đợt thu 'Quỹ tháng 12' vừa được tạo"`

---

## 17. Error Code Catalog

Đây là danh sách đầy đủ tất cả error codes trong hệ thống, kèm HTTP status tương ứng và ngữ cảnh xảy ra.

### 17.1 Authentication Errors (4xx)

| Code | HTTP | Message | Ngữ cảnh |
|---|---|---|---|
| `UNAUTHORIZED` | 401 | Bạn cần đăng nhập để thực hiện thao tác này | Route yêu cầu auth nhưng không có token |
| `TOKEN_INVALID` | 401 | Phiên đăng nhập không hợp lệ hoặc đã hết hạn | JWT verify fail, token expired |
| `TOKEN_MISSING` | 401 | Không tìm thấy token xác thực | Authorization header thiếu |
| `REFRESH_TOKEN_MISSING` | 401 | Không tìm thấy refresh token | Cookie không có refresh_token |
| `REFRESH_TOKEN_INVALID` | 401 | Refresh token không hợp lệ hoặc đã hết hạn | Token revoked, expired, hoặc không tồn tại trong DB |
| `INVALID_CREDENTIALS` | 401 | Email hoặc mật khẩu không chính xác | POST /auth/login với thông tin sai |
| `CURRENT_PASSWORD_INCORRECT` | 401 | Mật khẩu hiện tại không đúng | Đổi mật khẩu hoặc regenerate codes |
| `INVALID_RECOVERY_CODE` | 401 | Mã khôi phục không hợp lệ hoặc đã được sử dụng | Recovery code sai hoặc đã dùng |
| `INVALID_WEBHOOK_SIGNATURE` | 401 | Chữ ký webhook không hợp lệ | SePay webhook HMAC sai |

### 17.2 Authorization Errors (403)

| Code | HTTP | Message | Ngữ cảnh |
|---|---|---|---|
| `FORBIDDEN` | 403 | Bạn không có quyền thực hiện thao tác này | Generic forbidden |
| `NOT_GROUP_MEMBER` | 403 | Bạn không phải thành viên của nhóm này | Truy cập resource của nhóm không thuộc về |
| `INSUFFICIENT_ROLE` | 403 | Vai trò của bạn không đủ quyền | Member cố thực hiện action của leader/secretary |
| `CANNOT_EDIT_EXPENSE` | 403 | Bạn không có quyền chỉnh sửa khoản chi này | Không phải người tạo hoặc leader |
| `CANNOT_DELETE_EXPENSE` | 403 | Bạn không có quyền xóa khoản chi này | Không phải người tạo hoặc leader |
| `CANNOT_DELETE_MESSAGE` | 403 | Bạn không có quyền xóa tin nhắn này | Không phải chủ tin hoặc leader |
| `CONTRIBUTION_NOT_EDITABLE` | 403 | Khoản đóng quỹ này không thể chỉnh sửa | Contribution đã paid — không ai được sửa |

### 17.3 Not Found Errors (404)

| Code | HTTP | Message | Ngữ cảnh |
|---|---|---|---|
| `GROUP_NOT_FOUND` | 404 | Nhóm không tồn tại | group_id không hợp lệ |
| `EXPENSE_NOT_FOUND` | 404 | Khoản chi không tồn tại | expense_id không hợp lệ |
| `SETTLEMENT_NOT_FOUND` | 404 | Giao dịch thanh toán không tồn tại | settlement_id không hợp lệ |
| `CAMPAIGN_NOT_FOUND` | 404 | Đợt thu không tồn tại | campaign_id không hợp lệ |
| `CONTRIBUTION_NOT_FOUND` | 404 | Không tìm thấy thông tin đóng quỹ | user không có contribution trong campaign |
| `QR_NOT_CONFIGURED` | 404 | Thư ký chưa cấu hình tài khoản ngân hàng | GET /fund/qr khi chưa có QR |
| `MEMBER_NOT_FOUND` | 404 | Thành viên không tồn tại trong nhóm | userId không phải thành viên |
| `MESSAGE_NOT_FOUND` | 404 | Tin nhắn không tồn tại | msgId không hợp lệ |
| `INVITATION_NOT_FOUND` | 404 | Link mời không tồn tại | token không hợp lệ |
| `NOTIFICATION_NOT_FOUND` | 404 | Thông báo không tồn tại | notification_id không hợp lệ |
| `USER_NOT_FOUND` | 404 | Tài khoản không tồn tại | email không có trong DB |
| `LEAVE_REQUEST_NOT_FOUND` | 404 | Yêu cầu rời nhóm không tồn tại | request_id không hợp lệ |
| `BANK_NOT_FOUND` | 404 | Ngân hàng không tồn tại | bank_id không map được sang ngân hàng hỗ trợ |

### 17.4 Conflict / Business Rule Errors (409)

| Code | HTTP | Message | Ngữ cảnh |
|---|---|---|---|
| `EMAIL_ALREADY_EXISTS` | 409 | Email này đã được đăng ký | POST /auth/register |
| `ALREADY_GROUP_MEMBER` | 409 | Bạn đã là thành viên của nhóm này | POST /invitations/join |
| `BALANCE_NOT_ZERO` | 409 | Bạn còn khoản nợ chưa thanh toán trong nhóm | Rời nhóm khi balance ≠ 0 |
| `GROUP_HAS_UNPAID_DEBTS` | 409 | Nhóm còn khoản nợ chưa thanh toán | Xóa nhóm khi có debt |
| `GROUP_HAS_ACTIVE_CAMPAIGNS` | 409 | Nhóm còn đợt thu đang hoạt động | Xóa nhóm khi có campaign active |
| `CAMPAIGN_HAS_PENDING` | 409 | Còn thành viên chưa đóng đủ quỹ | Close campaign khi còn pending |
| `CAMPAIGN_ALREADY_CLOSED` | 409 | Đợt thu đã được đóng | Thao tác trên campaign đã closed |
| `CONTRIBUTION_ALREADY_PAID` | 409 | Thành viên này đã đóng đủ quỹ | Secretary xác nhận khi đã paid |
| `FUND_BALANCE_NEGATIVE` | 409 | Số tiền chi vượt quá số dư quỹ hiện có | Ghi chi khi fund balance không đủ |
| `INVITATION_EXPIRED` | 409 | Link mời đã hết hạn | expires_at đã qua |
| `INVITATION_MAX_USES_REACHED` | 409 | Link mời đã đạt giới hạn sử dụng | use_count >= max_uses |
| `CANNOT_KICK_SELF` | 409 | Không thể kick chính mình | Leader tự kick bản thân |
| `CANNOT_CHANGE_OWN_ROLE` | 409 | Không thể tự đổi role của mình | Leader đổi role của chính mình |
| `DUE_DATE_IN_PAST` | 409 | Hạn đóng phải là ngày trong tương lai | Tạo campaign với due_date quá khứ |
| `SECRETARY_CONFIRMATION_REQUIRED` | 409 | Cần thư ký xác nhận để hoàn tất thao tác | Xóa nhóm thiếu xác nhận secretary |

### 17.5 Validation Errors (400 / 422)

| Code | HTTP | Message | Ngữ cảnh |
|---|---|---|---|
| `VALIDATION_ERROR` | 422 | Dữ liệu đầu vào không hợp lệ | Zod validation fail — kèm `details` array |
| `LEADER_MUST_TRANSFER` | 400 | Trưởng nhóm phải chuyển quyền trước khi rời | Leader rời nhóm không chọn người kế nhiệm |
| `TRANSFER_TARGET_NOT_MEMBER` | 400 | Người nhận quyền không phải thành viên active | `transfer_leader_to` hoặc `new_leader_id` không hợp lệ |
| `CANNOT_TRANSFER_TO_SELF` | 400 | Không thể chuyển quyền cho chính mình | Leader chọn chính mình làm người nhận quyền |
| `SPLIT_AMOUNT_MISMATCH` | 422 | Tổng số tiền chia không khớp với tổng khoản chi | splits.amount sum ≠ expense.amount |
| `PERCENTAGE_MISMATCH` | 422 | Tổng phần trăm phải bằng 100% | splits.percentage sum ≠ 100 |
| `AMOUNT_MUST_BE_POSITIVE` | 422 | Số tiền phải lớn hơn 0 | amount <= 0 |
| `INVALID_PAYER` | 422 | Người trả không phải thành viên active hoặc không nằm trong danh sách chia | paid_by không hợp lệ hoặc không có trong splits |
| `INVALID_SPLIT_USER` | 422 | Danh sách chia chứa thành viên không hợp lệ | splits chứa user không trong nhóm |
| `INVALID_SETTLEMENT_USER` | 422 | Người thanh toán không hợp lệ | from_user hoặc to_user không trong nhóm |
| `INVALID_FILE_TYPE` | 400 | Chỉ chấp nhận file ảnh | Upload file không phải image/* |
| `FILE_TOO_LARGE` | 400 | Kích thước file không được vượt quá 5MB | File > 5MB |
| `INVALID_BANK_ID` | 422 | Mã ngân hàng không hợp lệ | bank_id không theo chuẩn VietQR |
| `BANK_LOOKUP_UNSUPPORTED` | 422 | Ngân hàng chưa hỗ trợ tự động kiểm tra tên chủ tài khoản | Chỉ dùng cho endpoint lookup legacy |
| `BANK_ACCOUNT_LOOKUP_FAILED` | 422 | Không kiểm tra được tên chủ tài khoản | Chỉ dùng cho endpoint lookup legacy |
| `INVALID_ACTION` | 400 | Thao tác không hợp lệ | action không phải approve/reject/close/cancel |

### 17.6 Rate Limit Errors (429)

| Code | HTTP | Message | Ngữ cảnh |
|---|---|---|---|
| `RATE_LIMIT_EXCEEDED` | 429 | Quá nhiều yêu cầu. Vui lòng thử lại sau | Login > 5 lần/15 phút, Register > 10 lần/giờ, Webhook > 100 lần/phút |

> Header `Retry-After: <seconds>` được set khi trả 429.

### 17.7 Server Errors (500)

| Code | HTTP | Message | Ngữ cảnh |
|---|---|---|---|
| `INTERNAL_SERVER_ERROR` | 500 | Lỗi hệ thống, vui lòng thử lại sau | Lỗi không xác định, DB lỗi, etc. |
| `UPLOAD_FAILED` | 500 | Tải lên file thất bại | Cloudinary error |
| `DATABASE_ERROR` | 500 | Lỗi cơ sở dữ liệu | Prisma error, connection fail |
| `TRANSACTION_FAILED` | 500 | Giao dịch thất bại, vui lòng thử lại | DB transaction rollback |
| `BANK_LOOKUP_NOT_CONFIGURED` | 503 | Chưa cấu hình dịch vụ kiểm tra tên chủ tài khoản | Chỉ dùng cho endpoint lookup legacy |
| `BANK_PROVIDER_UNAVAILABLE` | 502 | Không thể kết nối dịch vụ ngân hàng | VietQR/provider lỗi hoặc timeout |

---

### 17.8 Response Format đầy đủ cho từng loại lỗi

**401 Unauthorized:**
```json
{
  "success": false,
  "error": {
    "code": "TOKEN_INVALID",
    "message": "Phiên đăng nhập không hợp lệ hoặc đã hết hạn"
  }
}
```

**403 Forbidden:**
```json
{
  "success": false,
  "error": {
    "code": "INSUFFICIENT_ROLE",
    "message": "Vai trò của bạn không đủ quyền"
  }
}
```

**422 Validation Error (có details):**
```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Dữ liệu đầu vào không hợp lệ",
    "details": [
      { "field": "amount", "message": "Số tiền phải lớn hơn 0" },
      { "field": "date", "message": "Ngày không đúng định dạng YYYY-MM-DD" }
    ]
  }
}
```

**409 Conflict:**
```json
{
  "success": false,
  "error": {
    "code": "CONTRIBUTION_ALREADY_PAID",
    "message": "Thành viên này đã đóng đủ quỹ, không thể xác nhận thêm"
  }
}
```

**429 Rate Limit:**
```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Quá nhiều yêu cầu. Vui lòng thử lại sau 15 phút."
  }
}
```

**500 Internal Error:**
```json
{
  "success": false,
  "error": {
    "code": "INTERNAL_SERVER_ERROR",
    "message": "Lỗi hệ thống, vui lòng thử lại sau"
  }
}
```

---

### 17.9 Client Error Handling Guide

Hướng dẫn cho Frontend xử lý từng loại lỗi:

| HTTP | Xử lý phía client |
|---|---|
| 401 (`TOKEN_INVALID`) | Tự động gọi `POST /auth/refresh`. Nếu refresh cũng fail → logout, redirect `/login` |
| 401 (`INVALID_CREDENTIALS`) | Hiển thị inline error "Email hoặc mật khẩu không chính xác" |
| 403 | Toast error: "Bạn không có quyền thực hiện thao tác này" |
| 404 | Hiển thị empty state hoặc redirect về trang trước |
| 409 | Toast error với message từ API (đã human-readable) |
| 422 | Hiển thị inline errors từ `details` array vào đúng field |
| 429 | Toast error + disable button, hiển thị countdown từ `Retry-After` header |
| 500 | Toast error generic: "Đã xảy ra lỗi. Vui lòng thử lại." |

---

## Appendix: Danh sách tất cả Endpoints

```
# Auth
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/logout
POST   /api/auth/refresh
GET    /api/auth/me
PATCH  /api/auth/me
DELETE /api/auth/me
PATCH  /api/auth/me/display-name
PATCH  /api/auth/me/password
POST   /api/auth/me/avatar
DELETE /api/auth/me/avatar
POST   /api/auth/recover
GET    /api/auth/recovery-codes
POST   /api/auth/recovery-codes/regenerate

# Groups
POST   /api/groups
GET    /api/groups
GET    /api/groups/conversations
GET    /api/groups/:id
PATCH  /api/groups/:id
DELETE /api/groups/:id
POST   /api/groups/:id/leave
GET    /api/groups/:id/leave-requests
PATCH  /api/groups/:id/leave-requests/:requestId

# Invitations
POST   /api/groups/:id/invitations
GET    /api/groups/:id/invitations
DELETE /api/groups/:id/invitations/:invId
GET    /api/invitations/:token
POST   /api/invitations/join

# Members
GET    /api/groups/:id/members
PATCH  /api/groups/:id/members/:userId
DELETE /api/groups/:id/members/:userId

# Expenses
POST   /api/groups/:id/expenses
GET    /api/groups/:id/expenses
GET    /api/groups/:id/expenses/:expId
PATCH  /api/groups/:id/expenses/:expId
DELETE /api/groups/:id/expenses/:expId

# Balances & Settlements
GET    /api/groups/:id/balances
GET    /api/groups/:id/settlements/suggest
POST   /api/groups/:id/settlements
GET    /api/groups/:id/settlements
GET    /api/groups/:id/settlements/bank-info/me
PATCH  /api/groups/:id/settlements/bank-info/me
DELETE /api/groups/:id/settlements/bank-info/me

# Banks
GET    /api/banks
POST   /api/banks/account-lookup   # legacy, flow QR-only của frontend không dùng endpoint này

# Statistics
GET    /api/groups/:id/stats
GET    /api/groups/:id/stats/by-category
GET    /api/groups/:id/stats/by-member
GET    /api/groups/:id/stats/timeline

# Fund Campaigns
POST   /api/groups/:id/fund/campaigns
GET    /api/groups/:id/fund/campaigns
GET    /api/groups/:id/fund/campaigns/:cId
PATCH  /api/groups/:id/fund/campaigns/:cId
DELETE /api/groups/:id/fund/campaigns/:cId

# Fund Contributions
GET    /api/groups/:id/fund/campaigns/:cId/contributions
GET    /api/groups/:id/fund/campaigns/:cId/contributions/me
PATCH  /api/groups/:id/fund/campaigns/:cId/contributions/:userId
GET    /api/groups/:id/fund/campaigns/:cId/contributions/history

# Fund QR
POST   /api/groups/:id/fund/qr
GET    /api/groups/:id/fund/qr
DELETE /api/groups/:id/fund/qr/:qrId

# Fund Spendings
POST   /api/groups/:id/fund/spendings
GET    /api/groups/:id/fund/spendings
PATCH  /api/groups/:id/fund/spendings/:sId
DELETE /api/groups/:id/fund/spendings/:sId
GET    /api/groups/:id/fund/balance

# Chat (REST)
GET    /api/groups/:id/messages
POST   /api/groups/:id/messages
DELETE /api/groups/:id/messages/:msgId
PATCH  /api/groups/:id/messages/:msgId/pin
GET    /api/groups/:id/messages/pinned
PATCH  /api/groups/:id/chat/me
DELETE /api/groups/:id/chat/me
GET    /api/groups/:id/chat/participants/available
POST   /api/groups/:id/chat/participants

# Notifications
GET    /api/notifications
PATCH  /api/notifications/:id/read
PATCH  /api/notifications/read-all

# Webhook
POST   /api/webhooks/sepay/:webhookConfigId
```

**Tổng cộng: 53 REST endpoints + Socket.io real-time**

---

## 18. Phụ lục bổ sung

> Các mục trong phần này đã được merge từ nhiều phiên bản tài liệu. Những mục đã được tích hợp hoàn toàn vào section chính sẽ được đánh dấu là reference. Các mục còn lại vẫn là nội dung bổ sung hợp lệ.

---

## 18.1 Timezone và Date Format

> **Timezone:** UTC (client tự convert sang UTC+7 để hiển thị)

### 1.4 Date Format
- Request: `YYYY-MM-DD` (date) hoặc ISO 8601 (timestamp)
- Response: ISO 8601 (`2024-11-20T08:32:00.000Z`)

---

## 18.2 Xóa avatar cá nhân

> Endpoint `DELETE /api/auth/me/avatar` đã được mô tả đầy đủ tại mục **2.14** trong phần Auth ở trên.

---

## 18.3 Leave Requests API

> Đã được merge đầy đủ vào mục **3.7** (GET danh sách) và **3.8** (PATCH approve/reject) trong phần Groups. Bao gồm cả optional `reason` khi reject.

---

---

## 18.4 Gửi tin nhắn (bổ sung)

### 13.5 Gửi tin nhắn (REST fallback)

```
POST /api/groups/:id/messages
Authorization: Bearer <token>
```

> Endpoint REST để gửi tin nhắn khi không dùng Socket.io. Thông thường nên gửi qua Socket.io event `send_message` để nhận phản hồi realtime. Endpoint này phục vụ fallback hoặc testing.

**Request:**
```json
{
  "content": "Hello cả nhà"
}
```

**Validation:**
- `content`: required, không rỗng, max 2000 ký tự

**Response 201:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "group_id": "group-uuid",
    "sender": {
      "user_id": "uuid",
      "display_name": "Thành An",
      "avatar_url": null,
      "animal_avatar": "fox"
    },
    "content": "Hello cả nhà",
    "type": "text",
    "is_pinned": false,
    "is_deleted": false,
    "created_at": "2024-11-10T09:00:00Z"
  }
}
```

**Errors:**
| Code | HTTP | Mô tả |
|---|---|---|
| `NOT_GROUP_MEMBER` | 403 | Không phải thành viên active |
| `VALIDATION_ERROR` | 422 | Content rỗng hoặc quá dài |

---

---

## 18.5 SePay Webhook HMAC với timestamp

> Đã được merge đầy đủ vào mục **15. SePay Webhook** (canonical section). Payload chuẩn dùng **snake_case** theo SePay API thực tế. Verification dùng 2 header: `X-SePay-Signature` (format `sha256=<hex>`) và `X-SePay-Timestamp` (Unix seconds); chuỗi ký là `${timestamp}.${raw_body}`.

---

---

## 18.6 Socket.io Payload bổ sung

## 17. Socket.io Protocol

### 17.1 Connection

Client:

```js
io(SOCKET_URL, { auth: { token: accessToken } })
```

Server rejects invalid/expired token.

### 17.2 Events

Client emits:

```json
{ "event": "send_message", "payload": { "group_id": "uuid", "body": "Hello" } }
```

Server emits:

- `new_message`
- `message_deleted`
- `message_pinned`
- `notification_created`
- `system_event`
- `fund_contribution_updated`
- `campaign_completed`
- `expense_added`
- `user_typing`

Payloads should include `group_id`, relevant entity id and minimal display info.

---

---

## 18.7 HTTP Status, Rate Limiting & SePay Security Checklist

## 15. HTTP Status Code Summary

| Status | Ý nghĩa | Khi nào dùng |
|---|---|---|
| **200** | OK | GET thành công, PATCH thành công, DELETE thành công |
| **201** | Created | POST tạo resource mới thành công |
| **400** | Bad Request | Business rule violation (balance ≠ 0, campaign active, etc.) |
| **401** | Unauthorized | Chưa đăng nhập, token sai/hết hạn, credentials sai |
| **403** | Forbidden | Không có quyền (wrong role, not member, not owner) |
| **404** | Not Found | Resource không tồn tại |
| **405** | Method Not Allowed | HTTP method sai |
| **409** | Conflict | Duplicate (email, unique constraint) |
| **413** | Payload Too Large | File > 5MB |
| **422** | Unprocessable Entity | Validation error (Zod), format sai |
| **429** | Too Many Requests | Rate limit exceeded |
| **500** | Internal Server Error | Lỗi server không mong đợi |

---

## 16. Rate Limiting Summary

| Endpoint | Limit | Window | Scope |
|---|---|---|---|
| POST /auth/login | 5 requests | 15 phút | Per IP |
| POST /auth/register | 10 requests | 1 giờ | Per IP |
| POST /auth/recover | 5 requests | 15 phút | Per IP |
| POST /webhooks/sepay | 100 requests | 1 phút | Global |
| All other endpoints | 100 requests | 1 phút | Per user |

**Response khi bị rate limit:**
```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Quá nhiều yêu cầu, vui lòng thử lại sau X phút"
  }
}
```
Header: `Retry-After: <seconds>`

---

## 17. SePay Webhook Security Checklist

1. ✅ Verify `X-SePay-Signature` + `X-SePay-Timestamp` bằng HMAC-SHA256 với `webhook_secret` của `webhookConfigId`
2. ✅ Chỉ xử lý giao dịch tiền vào (`transferType = "in"` và `transferAmount > 0`; hoặc field snake_case tương đương), bỏ qua outgoing
3. ✅ Idempotency check bằng `referenceCode` / SePay `id`
4. ✅ Normalize content trước khi match QUY-xxx-xxx
5. ✅ Không match → bỏ qua, KHÔNG lưu bất kỳ thông tin nào
6. ✅ KHÔNG lưu `accumulated` (số dư TK thư ký)
7. ✅ KHÔNG log nội dung giao dịch không liên quan
8. ✅ Database transaction cho toàn bộ flow xử lý
9. ✅ SELECT FOR UPDATE để handle concurrent webhooks
10. ✅ Rate limiting 100/phút
11. ✅ Luôn trả 200 (kể cả không match) — tránh SePay retry
12. ✅ Overpayment: chỉ ghi nhận phần còn thiếu + notify thư ký

---

## 18.8 Error Message Format Examples

## 19. Error Message Format Examples

Validation error:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Dữ liệu không hợp lệ",
    "details": {
      "fields": {
        "amount": "Số tiền phải lớn hơn 0"
      }
    }
  }
}
```

Permission error:

```json
{
  "success": false,
  "error": {
    "code": "GROUP_LEADER_REQUIRED",
    "message": "Chỉ nhóm trưởng được thực hiện thao tác này"
  }
}
```

SePay invalid signature:

```json
{
  "success": false,
  "error": {
    "code": "SEPAY_SIGNATURE_INVALID",
    "message": "Chữ ký SePay không hợp lệ"
  }
}
```
