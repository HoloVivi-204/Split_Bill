# SplitBill — Technical Design Document (TDD)

**Version:** 1.0  
**Ngày:** 2026  
**Tác giả:** Tech Lead & Senior Developer  
**Status:** Approved

---

## Mục lục

1. [Tổng quan kiến trúc](#1-tổng-quan-kiến-trúc)
2. [Tech Stack chi tiết](#2-tech-stack-chi-tiết)
3. [Database Schema & ERD](#3-database-schema--erd)
4. [API Architecture](#4-api-architecture)
5. [Module Design chi tiết](#5-module-design-chi-tiết)
6. [Security Design](#6-security-design)
7. [Real-time Architecture (Socket.io)](#7-real-time-architecture-socketio)
8. [SePay Webhook Architecture](#8-sepay-webhook-architecture)
9. [Background Jobs](#9-background-jobs)
10. [File Upload Architecture](#10-file-upload-architecture)
11. [Error Handling Strategy](#11-error-handling-strategy)
12. [Test Strategy](#12-test-strategy)
13. [Definition of Done](#13-definition-of-done)
14. [Performance Considerations](#14-performance-considerations)
15. [Environment & Configuration](#15-environment--configuration)
16. [Deployment Architecture](#16-deployment-architecture)

---

## 1. Tổng quan kiến trúc

### 1.1 Architectural Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                         │
│          React 18 + Vite + Tailwind + Zustand               │
│          (Vercel CDN — Static hosting)                      │
└───────────────────┬─────────────────────────────────────────┘
                    │ HTTPS REST + Socket.io WSS
┌───────────────────▼─────────────────────────────────────────┐
│                       API LAYER                             │
│              Node.js 20 + Express.js                        │
│           (Railway / Render — Server hosting)               │
│                                                             │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐   │
│  │  Auth    │ │  Groups  │ │ Expenses │ │     Fund     │   │
│  │ Module   │ │  Module  │ │  Module  │ │    Module    │   │
│  └──────────┘ └──────────┘ └──────────┘ └──────────────┘   │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐   │
│  │   Chat   │ │  Stats   │ │Notif.    │ │   Webhook    │   │
│  │  Module  │ │  Module  │ │ Module   │ │   Handler    │   │
│  └──────────┘ └──────────┘ └──────────┘ └──────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              Middleware Layer                        │    │
│  │  authMiddleware | roleCheck | validate | errorHandler│   │
│  └─────────────────────────────────────────────────────┘    │
└────────┬────────────────────┬────────────────────┬──────────┘
         │                    │                    │
┌────────▼──────┐  ┌──────────▼──────┐  ┌─────────▼─────────┐
│  PostgreSQL   │  │   Cloudinary    │  │      SePay        │
│  (Primary DB) │  │  (File Storage) │  │   (Webhook src)   │
└───────────────┘  └─────────────────┘  └───────────────────┘
         │
┌────────▼──────┐
│  node-cron    │
│ (Background   │
│    Jobs)      │
└───────────────┘
```

### 1.2 Kiến trúc tổng quát

- **Monolithic API Server** với module-based structure — phù hợp với quy mô hiện tại, dễ maintain
- **Stateless REST API** — access token trong header, không giữ session server-side
- **Stateful WebSocket** — Socket.io rooms theo group_id
- **Event-driven webhook processing** — SePay → webhook endpoint → DB transaction → Socket.io broadcast

### 1.3 Data Flow chính

**Flow chia tiền:**
```
Client POST /expenses 
  → Validate middleware 
  → checkGroupMembership middleware 
  → ExpenseService.create() 
    → DB Transaction: INSERT expenses + INSERT expense_splits 
    → NotificationService.broadcastExpenseAdded() 
  → Response 201
  → Socket.io: system_event → tất cả member trong room
```

**Flow SePay Webhook:**
```
SePay POST /webhooks/sepay
  → verifyHmacSignature()           // reject 401 nếu sai
  → checkIdempotency(txnRef)        // skip nếu đã xử lý
  → normalizeContent()              // bỏ dấu, uppercase
  → matchTransferCode()             // tìm campaign + user
  → DB Transaction:
      INSERT fund_contribution_payments
      UPDATE fund_contributions.amount_paid
      UPDATE fund_contributions.status (nếu đủ)
      INSERT notifications
  → Socket.io: system_event → room
  → Response 200
```

---


### 1.4 Architecture Goals & Design Guardrails

Các mục tiêu kỹ thuật sau được áp dụng xuyên suốt khi triển khai:

- **Correctness of financial calculations over convenience:** tính toán số dư, quỹ và settlement phải ưu tiên đúng tuyệt đối; frontend chỉ hỗ trợ UX, backend là source of truth.
- **Idempotent webhook processing:** webhook SePay phải xử lý an toàn khi nhận duplicate/retry.
- **Privacy-preserving bank transaction handling:** không lưu hoặc log giao dịch ngân hàng không liên quan đến SplitBill.
- **Clear role-based authorization:** mọi mutation phải kiểm tra membership + role ở backend.
- **Auditable financial history:** settlement, contribution payment, fund spending nên là append-only hoặc soft-delete khi cần audit.
- **Minimal N+1 queries:** các endpoint list/detail cần dùng Prisma `include`, `select`, pagination và index phù hợp.
- **Testable service-layer business logic:** thuật toán chia tiền, balance, settlement, webhook matching, campaign closing phải nằm ở service/util có unit test.
- **Clean separation of concerns:** routes chỉ map URL; controllers xử lý request/response; validators validate schema; services xử lý business rules/transaction; repositories chứa Prisma queries; sockets chỉ emit/join rooms; jobs chỉ gọi service.

### 1.5 Backend/Frontend Layer Responsibilities

**Backend responsibilities:**
- Enforce tất cả quyền truy cập, role, membership và business rules.
- Tính toán balance, settlement, contribution status và fund balance.
- Xử lý upload, webhook, cron job, notification và realtime event.
- Không dựa vào frontend để đảm bảo tính đúng của dữ liệu tài chính.

**Frontend responsibilities:**
- Cung cấp UX rõ ràng: loading, empty, error states; validate realtime để giảm lỗi nhập liệu.
- Lưu access token trong memory state; gọi refresh flow qua httpOnly cookie.
- Subscribe Socket.io để cập nhật chat, notification và fund status.
- Không tự quyết định quyền cuối cùng; mọi thao tác vẫn phải chờ backend authorize.

## 2. Tech Stack chi tiết

### 2.1 Backend

| Layer | Technology | Version | Lý do chọn |
|---|---|---|---|
| Runtime | Node.js | 20 LTS | LTS stable, ES modules support |
| Framework | Express.js | 4.x | Minimal, flexible, ecosystem lớn |
| ORM | Prisma | 5.x | Type-safe, migration management, query logging |
| Database | PostgreSQL | 15+ | ACID transactions, JSON support, reliable |
| Auth | jsonwebtoken | 9.x | Industry standard JWT |
| Password | bcrypt | 5.x | Secure hashing với salt |
| Validation | Zod | 3.x | Type-safe validation, tích hợp TypeScript |
| File upload | Multer | 1.x | Memory storage → Cloudinary stream |
| Cloud storage | Cloudinary SDK | 2.x | Image transformations, CDN tích hợp |
| Real-time | Socket.io | 4.x | WebSocket + fallback, room management |
| Scheduler | node-cron | 3.x | Cron syntax, timezone support |
| HTTP | Axios | 1.x | Webhook requests (nếu cần) |
| Rate limiting | express-rate-limit | 7.x | Built-in IP rate limiting |
| API docs | swagger-ui-express | 5.x | Live swagger UI |
| Testing | Jest + Supertest | Latest | Unit + Integration testing |
| Process mgr | PM2 | Latest | Production process management |

### 2.2 Frontend

| Layer | Technology | Version |
|---|---|---|
| Framework | React | 18.x |
| Build tool | Vite | 5.x |
| Styling | Tailwind CSS | 3.x |
| Routing | React Router | v6 |
| State | Zustand | 4.x |
| HTTP | Axios | 1.x |
| Real-time | Socket.io client | 4.x |
| Forms | React Hook Form + Zod | Latest |
| Charts | Recharts | 2.x |
| Icons | Lucide React | Latest |
| Notifications | react-hot-toast | 2.x |
| Deploy | Vercel | - |

---

## 3. Database Schema & ERD

### 3.1 ERD Diagram (Text representation)

```
users
  ├── 1:N → refresh_tokens
  ├── 1:N → recovery_codes
  ├── 1:N → group_members (qua user_id)
  ├── 1:N → expenses (qua paid_by)
  ├── 1:N → expenses (qua created_by)
  ├── 1:N → expense_splits
  ├── 1:N → settlements (qua from_user)
  ├── 1:N → settlements (qua to_user)
  ├── 1:N → fund_campaigns (qua created_by)
  ├── 1:N → fund_contributions
  ├── 1:N → fund_contribution_payments (qua confirmed_by)
  ├── 1:N → fund_qr_codes (qua uploaded_by)
  ├── 1:N → fund_spendings (qua recorded_by)
  ├── 1:N → messages (qua sender_id)
  ├── 1:N → message_reads
  └── 1:N → notifications

groups
  ├── 1:N → group_members
  ├── 1:N → invitations
  ├── 1:N → expenses
  ├── 1:N → settlements
  ├── 1:N → fund_campaigns
  ├── 1:N → fund_qr_codes
  ├── 1:N → fund_spendings
  ├── 1:N → messages
  └── 1:N → notifications

fund_campaigns
  └── 1:N → fund_contributions
               └── 1:N → fund_contribution_payments

expenses
  └── 1:N → expense_splits

messages
  └── 1:N → message_reads
```

### 3.2 Full Database Schema (PostgreSQL / Prisma)

```prisma
// schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// ===========================
// USERS & AUTH
// ===========================

model User {
  id            String   @id @default(uuid())
  email         String   @unique
  password_hash String
  display_name  String?
  avatar_url    String?
  created_at    DateTime @default(now())

  // Relations
  refresh_tokens           RefreshToken[]
  recovery_codes           RecoveryCode[]
  leave_requests           LeaveRequest[]
  group_members            GroupMember[]
  expenses_paid            Expense[]              @relation("ExpensePaidBy")
  expenses_created         Expense[]              @relation("ExpenseCreatedBy")
  expense_splits           ExpenseSplit[]
  settlements_from         Settlement[]           @relation("SettlementFrom")
  settlements_to           Settlement[]           @relation("SettlementTo")
  settlements_recorded     Settlement[]           @relation("SettlementRecorded")
  fund_campaigns_created   FundCampaign[]
  fund_contributions       FundContribution[]
  fund_payments_confirmed  FundContributionPayment[]
  fund_qr_codes            FundQrCode[]
  fund_spendings           FundSpending[]
  messages_sent            Message[]              @relation("MessageSender")
  messages_pinned          Message[]              @relation("MessagePinnedBy")
  message_reads            MessageRead[]
  notifications            Notification[]
  groups_created           Group[]

  @@map("users")
}

model RefreshToken {
  id         String    @id @default(uuid())
  user_id    String
  token_hash String    @unique
  expires_at DateTime
  revoked_at DateTime?
  created_at DateTime  @default(now())

  user User @relation(fields: [user_id], references: [id], onDelete: Cascade)

  @@index([user_id])
  @@index([token_hash])
  @@map("refresh_tokens")
}

model RecoveryCode {
  id            String    @id @default(uuid())
  user_id       String
  code_hash     String    // bcrypt hash — không bao giờ lưu plain text
  code_preview  String?   // VD: "A3F2-****" — chỉ lưu cho 4 mã đầu (index 1–4), null cho 4 mã sau
  display_order Int       // 1–8, dùng để sort và quyết định hiển thị preview hay ****-****
  used_at       DateTime?
  created_at    DateTime  @default(now())

  user User @relation(fields: [user_id], references: [id], onDelete: Cascade)

  @@index([user_id])
  @@map("recovery_codes")
}
// Business rule:
// - display_order 1–4: code_preview = "XXXX-****" (4 ký tự đầu lộ ra)
// - display_order 5–8: code_preview = null → API trả "****-****"
// - Khi regenerate: xóa tất cả record cũ, tạo 8 record mới

// ===========================
// GROUPS
// ===========================

model Group {
  id          String      @id @default(uuid())
  name        String
  description String?
  currency    String      @default("VND")
  status      GroupStatus @default(active)
  deleted_at  DateTime?
  created_by  String
  created_at  DateTime    @default(now())

  creator    User          @relation(fields: [created_by], references: [id])
  members    GroupMember[]
  invitations Invitation[]
  expenses   Expense[]
  settlements Settlement[]
  fund_campaigns FundCampaign[]
  fund_qr_codes  FundQrCode[]
  fund_spendings FundSpending[]
  messages   Message[]
  notifications  Notification[]
  leave_requests LeaveRequest[]

  @@map("groups")
}

enum GroupStatus {
  active
  deleted
}

model GroupMember {
  id            String       @id @default(uuid())
  group_id      String
  user_id       String
  role          MemberRole   @default(member)
  animal_avatar String
  joined_at     DateTime     @default(now())
  status        MemberStatus @default(active)
  left_at       DateTime?    // set khi status → left hoặc kicked
  settlement_bank_id        String?
  settlement_bank_name      String?
  settlement_account_number String?
  settlement_account_name   String?

  group Group @relation(fields: [group_id], references: [id], onDelete: Cascade)
  user  User  @relation(fields: [user_id], references: [id], onDelete: Cascade)

  @@unique([group_id, user_id])
  @@index([group_id])
  @@index([user_id])
  @@map("group_members")
}

enum MemberRole {
  leader
  secretary
  member
}

enum MemberStatus {
  active           // Thành viên đang hoạt động bình thường
  left             // Đã rời nhóm tự nguyện (đã được approve)
  kicked           // Bị leader kick ra khỏi nhóm
  pending_leave    // Đã gửi leave request, đang chờ leader approve
  // Note: "invited" không dùng ở đây — trạng thái invite lưu riêng ở bảng Invitation
}

model Invitation {
  id         String    @id @default(uuid())
  group_id   String
  token      String    @unique
  created_by String
  expires_at DateTime?
  max_uses   Int?
  use_count  Int       @default(0)
  created_at DateTime  @default(now())

  group Group @relation(fields: [group_id], references: [id], onDelete: Cascade)

  @@index([token])
  @@map("invitations")
}

model LeaveRequest {
  id           String             @id @default(uuid())
  group_id     String
  user_id      String
  status       LeaveRequestStatus @default(pending)
  reason       String?            // Lý do reject (leader điền khi reject)
  processed_by String?            // user_id của leader xử lý
  processed_at DateTime?
  created_at   DateTime           @default(now())

  group        Group       @relation(fields: [group_id], references: [id], onDelete: Cascade)
  user         User        @relation(fields: [user_id], references: [id], onDelete: Cascade)

  @@index([group_id, status])
  @@unique([group_id, user_id, status])  // Mỗi user chỉ có 1 pending request / nhóm
  @@map("leave_requests")
}

enum LeaveRequestStatus {
  pending    // Đang chờ leader xử lý — MemberStatus = pending_leave
  approved   // Leader đã approve — MemberStatus chuyển thành left
  rejected   // Leader đã reject — MemberStatus trở về active
  cancelled  // User tự hủy trước khi được xử lý
}

// ===========================
// EXPENSES
// ===========================

model Expense {
  id          String      @id @default(uuid())
  group_id    String
  title       String
  amount      Decimal     @db.Decimal(15, 2)
  paid_by     String
  category    ExpenseCategory
  date        DateTime    @db.Date
  note        String?
  receipt_url String?
  created_by  String
  created_at  DateTime    @default(now())

  group      Group         @relation(fields: [group_id], references: [id], onDelete: Cascade)
  payer      User          @relation("ExpensePaidBy", fields: [paid_by], references: [id])
  creator    User          @relation("ExpenseCreatedBy", fields: [created_by], references: [id])
  splits     ExpenseSplit[]

  @@index([group_id])
  @@index([group_id, date])
  @@map("expenses")
}

enum ExpenseCategory {
  food
  transport
  accommodation
  entertainment
  shopping
  other
}

model ExpenseSplit {
  id         String  @id @default(uuid())
  expense_id String
  user_id    String
  amount     Decimal @db.Decimal(15, 2)

  expense Expense @relation(fields: [expense_id], references: [id], onDelete: Cascade)
  user    User    @relation(fields: [user_id], references: [id])

  @@index([expense_id])
  @@map("expense_splits")
}

model Settlement {
  id          String   @id @default(uuid())
  group_id    String
  from_user   String
  to_user     String
  amount      Decimal  @db.Decimal(15, 2)
  note        String?
  settled_at  DateTime @default(now())
  recorded_by String

  group    Group @relation(fields: [group_id], references: [id])
  from     User  @relation("SettlementFrom", fields: [from_user], references: [id])
  to       User  @relation("SettlementTo", fields: [to_user], references: [id])
  recorder User  @relation("SettlementRecorded", fields: [recorded_by], references: [id])

  @@index([group_id])
  @@map("settlements")
}

// ===========================
// FUND
// ===========================

model FundCampaign {
  id                           String            @id @default(uuid())
  group_id                     String
  title                        String
  description                  String?
  amount_per_person            Decimal           @db.Decimal(15, 2)
  payment_frequency            PaymentFrequency
  suggested_amount_per_payment Decimal           @db.Decimal(15, 2)
  due_date                     DateTime          @db.Date
  status                       CampaignStatus    @default(active)
  created_by                   String
  created_at                   DateTime          @default(now())

  group         Group              @relation(fields: [group_id], references: [id])
  creator       User               @relation(fields: [created_by], references: [id])
  contributions FundContribution[]

  @@index([group_id])
  @@index([group_id, status])
  @@map("fund_campaigns")
}

enum PaymentFrequency {
  one_time
  weekly
  biweekly
  monthly
}

enum CampaignStatus {
  active
  closed
  cancelled
}

model FundContribution {
  id              String             @id @default(uuid())
  campaign_id     String
  user_id         String
  amount_required Decimal            @db.Decimal(15, 2)
  amount_paid     Decimal            @db.Decimal(15, 2) @default(0)
  status          ContributionStatus @default(pending)
  fully_paid_at   DateTime?

  campaign FundCampaign              @relation(fields: [campaign_id], references: [id])
  user     User                      @relation(fields: [user_id], references: [id])
  payments FundContributionPayment[]

  @@unique([campaign_id, user_id])
  @@index([campaign_id])
  @@map("fund_contributions")
}

enum ContributionStatus {
  pending
  paid
  late
  kicked
}

model FundContributionPayment {
  id              String   @id @default(uuid())
  contribution_id String
  amount          Decimal  @db.Decimal(15, 2)
  paid_at         DateTime @default(now())
  method          PaymentMethod
  transaction_ref String?  @unique  // Idempotency key
  confirmed_by    String?
  note            String?

  contribution FundContribution @relation(fields: [contribution_id], references: [id])
  confirmer    User?            @relation(fields: [confirmed_by], references: [id])

  @@index([contribution_id])
  @@index([transaction_ref])
  @@map("fund_contribution_payments")
}

enum PaymentMethod {
  auto
  manual
}

model FundQrCode {
  id             String   @id @default(uuid())
  group_id       String
  uploaded_by    String
  bank_id        String
  bank_name      String
  account_number String
  account_name   String?
  is_active      Boolean  @default(true)
  created_at     DateTime @default(now())

  group    Group @relation(fields: [group_id], references: [id])
  uploader User  @relation(fields: [uploaded_by], references: [id])

  @@index([group_id, is_active])
  @@map("fund_qr_codes")
}

model FundSpending {
  id          String   @id @default(uuid())
  group_id    String
  title       String
  amount      Decimal  @db.Decimal(15, 2)
  spent_at    DateTime @db.Date
  note        String?
  receipt_url String?
  recorded_by String
  created_at  DateTime @default(now())

  group    Group @relation(fields: [group_id], references: [id])
  recorder User  @relation(fields: [recorded_by], references: [id])

  @@index([group_id])
  @@map("fund_spendings")
}

// ===========================
// CHAT
// ===========================

model Message {
  id         String      @id @default(uuid())
  group_id   String
  sender_id  String
  content    String
  type       MessageType @default(text)
  is_pinned  Boolean     @default(false)
  pinned_by  String?
  created_at DateTime    @default(now())
  edited_at  DateTime?
  is_deleted Boolean     @default(false)

  group    Group         @relation(fields: [group_id], references: [id])
  sender   User          @relation("MessageSender", fields: [sender_id], references: [id])
  pinner   User?         @relation("MessagePinnedBy", fields: [pinned_by], references: [id])
  reads    MessageRead[]

  @@index([group_id, created_at(sort: Desc)])
  @@index([group_id, is_pinned])
  @@map("messages")
}

enum MessageType {
  text
  system
}

model MessageRead {
  id         String   @id @default(uuid())
  message_id String
  user_id    String
  read_at    DateTime @default(now())

  message Message @relation(fields: [message_id], references: [id])
  user    User    @relation(fields: [user_id], references: [id])

  @@unique([message_id, user_id])
  @@map("message_reads")
}

// ===========================
// NOTIFICATIONS
// ===========================

model Notification {
  id         String           @id @default(uuid())
  user_id    String
  group_id   String?
  type       NotificationType
  title      String
  body       String
  is_read    Boolean          @default(false)
  created_at DateTime         @default(now())

  user  User   @relation(fields: [user_id], references: [id], onDelete: Cascade)
  group Group? @relation(fields: [group_id], references: [id])

  @@index([user_id, is_read])
  @@index([user_id, created_at(sort: Desc)])
  @@map("notifications")
}

enum NotificationType {
  expense_added
  fund_reminder
  fund_paid
  fund_late
  fund_complete
  settlement_suggested
  member_joined
  member_left
  campaign_created
  leave_request
  leave_approved
  leave_rejected
  overpayment_alert
}
```

### 3.3 Index Strategy

| Table | Index | Lý do |
|---|---|---|
| expenses | (group_id, date DESC) | Filter expenses theo nhóm + sort theo ngày |
| messages | (group_id, created_at DESC) | Cursor-based chat pagination |
| messages | (group_id, is_pinned) | Lấy pinned messages |
| fund_campaigns | (group_id, status) | Lọc campaign active |
| fund_contributions | (campaign_id) | Lấy contributions của campaign |
| fund_contribution_payments | (transaction_ref) | Idempotency check |
| notifications | (user_id, is_read) | Badge count |
| notifications | (user_id, created_at DESC) | Danh sách thông báo |
| group_members | (group_id, status) | Lấy active members |
| refresh_tokens | (token_hash) | Lookup khi refresh |

---


### 3.4 Production Schema Constraints & Auditability Notes

Các constraint và ghi chú triển khai production cần được áp dụng khi viết migration:

- `users.email` là unique identifier chính để đăng nhập.
- `users.username` nếu còn tồn tại thì phải nullable hoặc non-unique; không dùng username làm business identifier trong UX.
- Nên bổ sung soft-delete cho `groups` trong production:
  - `status`: `active | deleted`
  - `deleted_at`: timestamp nullable
  - Khi xoá nhóm có dữ liệu tài chính, ưu tiên soft delete thay vì hard delete để giữ audit trail.
- `group_members` cần giữ lịch sử thành viên rời nhóm:
  - `status`: `active | left`
  - Có thể bổ sung `left_at` để phục vụ audit và historical UI.
- Mỗi group chỉ nên có tối đa một active secretary. Có thể enforce ở service transaction và bổ sung partial unique index bằng raw SQL:

```sql
CREATE UNIQUE INDEX one_active_secretary_per_group
ON group_members(group_id)
WHERE role = 'secretary' AND status = 'active';
```

- `fund_campaigns` nên có `campaign_code` unique để generate transfer code ổn định:

```prisma
campaignCode String @unique @map("campaign_code") @db.VarChar(20)
```

- `fund_contribution_payments` nên lưu hai khóa idempotency khi có:
  - `transaction_ref` unique nullable — mã tham chiếu ngân hàng/SePay.
  - `sepay_transaction_id` unique nullable — ID transaction từ SePay.
- Không lưu field `accumulated` từ SePay vì đây là số dư/tổng lũy kế tài khoản và không cần cho nghiệp vụ.
- Không lưu payload hoặc content của webhook nếu không match mã SplitBill.
- Financial records nên được thiết kế append-only khi có thể: settlement, contribution payment, fund spending history không nên bị xoá vật lý nếu cần audit.

### 3.5 Recommended Additional Enums

> `GroupStatus` và `LeaveRequestStatus` đã được merge vào schema chính (xem mục 4.3). Phần còn lại trong section này chỉ còn:

```prismaenum ContributionStatus {
  pending
  paid
  late
  kicked
  // removed_from_group: không dùng trong MVP — map vào `kicked` cho cả 2 trường hợp
}

enum TransferType {
  in
  out
}
```

> **Đã chốt MVP:** `ContributionStatus` có 4 giá trị: `pending`, `paid`, `late`, `kicked`. Trường hợp member rời nhóm (left/kicked) khi còn contribution active đều map vào `kicked`. Không dùng `removed_from_group` hay `resolved` — `kicked` giữ nguyên để audit trail. Khi campaign close, contribution `kicked` không cần đổi status.

## 4. API Architecture

### 4.1 Request Lifecycle

```
Request
  → cors()
  → helmet()
  → express.json()
  → rateLimiter (route-specific)
  → authMiddleware (trừ public routes)
  → checkGroupMembership (trừ routes không liên quan nhóm)
  → checkRole (leader/secretary routes)
  → validateSchema (Zod)
  → Route Handler
  → Service Layer
  → Prisma ORM
  → Database
  → Response (chuẩn hóa format)
  → errorHandler (global)
```

### 4.2 Cấu trúc thư mục chi tiết

```
src/
├── app.js                    # Express app setup
├── server.js                 # HTTP server + Socket.io
├── config/
│   ├── database.js           # Prisma client singleton
│   ├── env.js                # Zod env validation
│   ├── swagger.js            # Swagger/OpenAPI config
│   └── socket.js             # Socket.io server setup
├── middlewares/
│   ├── auth.js               # JWT verify, attach req.user
│   ├── checkMembership.js    # Verify user thuộc nhóm
│   ├── roleCheck.js          # leader/secretary role guard
│   ├── validate.js           # Zod schema validation
│   ├── rateLimiter.js        # express-rate-limit configs
│   ├── errorHandler.js       # Global error handler
│   └── upload.js             # Multer config
├── modules/
│   ├── auth/
│   │   ├── auth.routes.js
│   │   ├── auth.controller.js
│   │   ├── auth.service.js
│   │   └── auth.schema.js    # Zod schemas
│   ├── groups/
│   │   ├── groups.routes.js
│   │   ├── groups.controller.js
│   │   ├── groups.service.js
│   │   └── groups.schema.js
│   ├── invitations/
│   │   ├── invitations.routes.js
│   │   ├── invitations.controller.js
│   │   └── invitations.service.js
│   ├── members/
│   │   ├── members.routes.js
│   │   ├── members.controller.js
│   │   └── members.service.js
│   ├── expenses/
│   │   ├── expenses.routes.js
│   │   ├── expenses.controller.js
│   │   ├── expenses.service.js
│   │   └── expenses.schema.js
│   ├── settlements/
│   │   ├── settlements.routes.js
│   │   ├── settlements.controller.js
│   │   └── settlements.service.js
│   ├── stats/
│   │   ├── stats.routes.js
│   │   ├── stats.controller.js
│   │   └── stats.service.js
│   ├── notifications/
│   │   ├── notifications.routes.js
│   │   ├── notifications.controller.js
│   │   └── notifications.service.js
│   ├── chat/
│   │   ├── chat.routes.js       # REST: history, delete, pin
│   │   ├── chat.controller.js
│   │   ├── chat.service.js
│   │   └── chat.socket.js       # Socket.io handlers
│   └── fund/
│       ├── campaigns.routes.js
│       ├── campaigns.controller.js
│       ├── campaigns.service.js
│       ├── contributions.routes.js
│       ├── contributions.controller.js
│       ├── contributions.service.js
│       ├── qr.routes.js
│       ├── qr.controller.js
│       ├── qr.service.js
│       ├── spendings.routes.js
│       ├── spendings.controller.js
│       └── spendings.service.js
├── utils/
│   ├── debtSettlement.js     # Greedy algorithm
│   ├── transferCode.js       # Generate QUY-xxx-xxx
│   ├── vietqr.js             # Generate VietQR URL
│   ├── normalizeText.js      # Bỏ dấu, uppercase
│   ├── notification.js       # createNotification helper
│   ├── cloudinary.js         # Upload/delete helpers
│   └── apiResponse.js        # success/error response format
├── jobs/
│   └── cronJobs.js           # node-cron jobs
├── webhooks/
│   └── sepay.js              # SePay webhook handler
└── tests/
    ├── unit/
    ├── integration/
    └── fixtures/
```

### 4.3 Response Format chuẩn

**Success:**
```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "has_more": true
  }
}
```

**Error:**
```json
{
  "success": false,
  "error": {
    "code": "EXPENSE_NOT_FOUND",
    "message": "Khoản chi không tồn tại",
    "details": []
  }
}
```

**Validation Error (422):**
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

---


### 4.4 Layer Responsibility Contract

| Layer | Trách nhiệm | Không nên làm |
|---|---|---|
| Routes | Khai báo URL, HTTP method, middleware chain | Business logic |
| Controllers | Đọc `req`, gọi service, trả response chuẩn | Query DB trực tiếp phức tạp |
| Validators/Schemas | Zod schema cho params/query/body | Kiểm tra role hoặc DB state |
| Middlewares | Auth, membership, role, rate limit, upload | Mutation nghiệp vụ |
| Services | Business rules, transaction, orchestration | Format HTTP response |
| Repositories | Prisma queries tái sử dụng | Quyết định nghiệp vụ |
| Sockets | Join room, emit event | Tính toán hoặc ghi DB ngoài service |
| Jobs | Schedule và gọi service idempotent | Copy logic từ service |

### 4.5 Shared Utilities & Helpers

Các helper nên được tách riêng để dễ test:

- `debtSettlement.js`: Greedy algorithm cho settlement suggestions.
- `transferCode.js`: generate/parse `QUY-{CAMPAIGN_CODE}-{USER_CODE}`.
- `normalizeText.js`: bỏ dấu tiếng Việt, uppercase, normalize whitespace, bỏ ký tự không cần thiết khi match mã chuyển khoản.
- `vietqr.js`: build VietQR URL động, chỉ thêm `accountName` khi có tên chủ tài khoản và chỉ thêm `addInfo` khi caller truyền nội dung chuyển khoản.
- `fundBalance.js`: tính tổng thu, tổng chi, số dư quỹ.
- `notification.js`: tạo notification chuẩn, tránh duplicate reminder.
- `cloudinary.js`: stream upload/delete image.
- `recoveryCode.js`: generate/hash/verify recovery codes.
- `apiResponse.js`: response success/error chuẩn.
- `idempotency.js`: helper kiểm tra transaction duplicate cho webhook/cron.

### 4.6 Repository Boundary Recommendation

Nếu codebase lớn dần, nên thêm folder `repositories/` cho các Prisma query phức tạp:

```text
repositories/
├── user.repository.js
├── group.repository.js
├── expense.repository.js
├── fund.repository.js
├── notification.repository.js
└── message.repository.js
```

Service vẫn là nơi quyết định business rule; repository chỉ nhận params và trả dữ liệu.

## 5. Module Design chi tiết

### 5.1 Auth Module

#### JWT Strategy

```javascript
// Access Token: short-lived, in memory (Zustand)
const ACCESS_TOKEN_TTL = '15m';

// Refresh Token: long-lived, httpOnly cookie
const REFRESH_TOKEN_TTL_NORMAL = '7d';
const REFRESH_TOKEN_TTL_REMEMBER = '30d';

// Payload của access token
{
  sub: userId,          // subject
  email: user.email,
  iat: issuedAt,
  exp: expiredAt
}
```

#### Recovery Code Generation

```javascript
// Generate 8 codes
function generateRecoveryCodes() {
  return Array.from({ length: 8 }, () => {
    const part1 = randomBytes(2).toString('hex').toUpperCase(); // 4 chars
    const part2 = randomBytes(2).toString('hex').toUpperCase(); // 4 chars
    return `${part1}-${part2}`;
  });
}
// VD: "A3F2-9B1C"

// Store as bcrypt hash
async function hashCode(code) {
  return bcrypt.hash(code, 10);
}

// Verify
async function verifyCode(plain, hash) {
  return bcrypt.compare(plain, hash);
}
```

#### Display Name Flow

- Sau khi đăng ký: response trả thêm `display_name_required: true`
- Client lưu flag này, force render màn hình đặt tên
- `PATCH /auth/me/display-name` → update, flag tắt
- Kiểm tra flag: `user.display_name === null`


#### Recovery Code Storage Caveat

Nếu backend chỉ lưu `code_hash` bằng bcrypt thì không thể hiển thị lại plain text recovery code sau lần tạo đầu tiên. Để đáp ứng yêu cầu profile hiển thị 4 mã đầu theo thứ tự tạo, có 2 hướng an toàn:

1. **Khuyến nghị:** lưu `code_preview` hoặc metadata hiển thị an toàn cho 4 mã đầu, không lưu full plain text.
2. Nếu bắt buộc hiển thị lại toàn bộ 4 mã đầu, phải lưu encrypted value bằng key quản lý riêng, nhưng điều này làm tăng rủi ro bảo mật và cần threat model rõ.

Trong MVP, schema đã được xác định như sau (xem Prisma schema đầy đủ ở mục 4.3):

```prisma
model RecoveryCode {
  id            String    @id @default(uuid())
  user_id       String
  code_hash     String    // bcrypt — không bao giờ lưu plain text
  code_preview  String?   // "XXXX-****" cho display_order 1–4, null cho 5–8
  display_order Int       // 1–8
  used_at       DateTime?
  created_at    DateTime  @default(now())
}
```

Business rule “4 mã đầu” phải hiểu là **4 mã đầu theo thứ tự tạo**, không phải 4 mã còn hiệu lực đầu tiên.

### 5.2 Expense Module

#### Split Validation Logic

```javascript
function validateSplits(amount, splits, splitType) {
  const total = splits.reduce((sum, s) => sum + s.amount, 0);
  const tolerance = 1; // 1 đồng tolerance

  if (Math.abs(total - amount) > tolerance) {
    throw new ValidationError('SPLIT_AMOUNT_MISMATCH', 
      `Tổng splits (${total}) phải bằng amount (${amount})`);
  }

  if (splitType === 'percentage') {
    const totalPct = splits.reduce((sum, s) => sum + s.percentage, 0);
    // Cho phép sai lệch làm tròn: 33.33 × 3 = 99.99 ≈ 100
    if (Math.abs(totalPct - 100) > 0.1) {
      throw new ValidationError('PERCENTAGE_MISMATCH', 
        `Tổng phần trăm phải bằng 100%`);
    }
  }
}
```

#### Balance Calculation

```javascript
// Tính balance từ đầu mỗi khi query — không cache
async function calculateGroupBalances(groupId) {
  const expenses = await prisma.expense.findMany({
    where: { group_id: groupId },
    include: { splits: true }
  });

  const settlements = await prisma.settlement.findMany({
    where: { group_id: groupId }
  });

  const balanceMap = new Map();

  // Từ expenses
  for (const expense of expenses) {
    // Người trả: cộng thêm amount
    addBalance(balanceMap, expense.paid_by, expense.amount);
    // Người chịu: trừ đi split amount
    for (const split of expense.splits) {
      addBalance(balanceMap, split.user_id, -split.amount);
    }
  }

  // Từ settlements
  // from_user là người trả nợ → balance tăng (bớt âm)
  // to_user là người nhận tiền → balance giảm (bớt dương)
  for (const settlement of settlements) {
    addBalance(balanceMap, settlement.from_user, settlement.amount);
    addBalance(balanceMap, settlement.to_user, -settlement.amount);
  }

  return balanceMap;
}
```


#### Balance Formula Clarification

Quy ước chuẩn: **balance dương = user đang được nợ**, **balance âm = user đang nợ**.

Công thức cần dùng trong implementation cuối:

```text
expense: paid_by += expense.amount
split: split_user -= split.amount
settlement: from_user += settlement.amount
settlement: to_user -= settlement.amount
```

Giải thích settlement: `from_user` là người trả nợ nên balance của họ tăng dần về 0; `to_user` là người nhận tiền nên balance của họ giảm dần về 0. Công thức này phải được unit test bằng case trước/sau settlement.

Ví dụ:

```text
Trước settlement:
An: +200.000
Bình: -200.000

Bình trả An 200.000:
Bình += 200.000 => 0
An -= 200.000 => 0
```

#### Debt Simplification (Greedy Algorithm)

```javascript
function simplifyDebts(balances) {
  // balances: Map<userId, amount>
  const creditors = []; // balance > 0
  const debtors = [];   // balance < 0

  for (const [userId, balance] of balances) {
    if (balance > 0.01) creditors.push({ userId, amount: balance });
    if (balance < -0.01) debtors.push({ userId, amount: -balance });
  }

  const transactions = [];

  while (creditors.length > 0 && debtors.length > 0) {
    // Lấy creditor và debtor lớn nhất
    creditors.sort((a, b) => b.amount - a.amount);
    debtors.sort((a, b) => b.amount - a.amount);

    const creditor = creditors[0];
    const debtor = debtors[0];
    const amount = Math.min(creditor.amount, debtor.amount);

    transactions.push({
      from: debtor.userId,
      to: creditor.userId,
      amount: Math.round(amount)
    });

    creditor.amount -= amount;
    debtor.amount -= amount;

    if (creditor.amount < 0.01) creditors.shift();
    if (debtor.amount < 0.01) debtors.shift();
  }

  return transactions;
}
```

### 5.3 Fund Module

#### Transfer Code Generation

```javascript
// Format: QUY-{CAMPAIGN_CODE}-{USER_CODE}
// CAMPAIGN_CODE: encode campaign_id thành 4-6 char uppercase
// USER_CODE: encode user position trong campaign thành 2-4 char

function generateTransferCode(campaignId, userId, sequenceNumber) {
  // Dùng base36 encode của 3 ký tự cuối UUID để ngắn gọn
  const campaignCode = campaignId.replace(/-/g, '').slice(-6).toUpperCase();
  const userCode = sequenceNumber.toString().padStart(3, '0');
  return `QUY-${campaignCode}-${userCode}`;
}

// Normalize trước khi match
function normalizeTransferContent(content) {
  return content
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // bỏ dấu
    .toUpperCase()
    .replace(/\s+/g, ' ')            // normalize spaces
    .trim();
}

// Extract code từ nội dung
function extractTransferCode(content) {
  const normalized = normalizeTransferContent(content);
  const match = normalized.match(/QUY-[A-Z0-9]+-[0-9]+/);
  return match ? match[0] : null;
}
```

#### VietQR URL Generation

```javascript
function generateVietQRUrl(bankId, accountNumber, accountName = null, transferContent = '') {
  const template = 'compact2';
  const params = new URLSearchParams();

  if (accountName) {
    params.set('accountName', accountName);
  }

  if (transferContent) {
    params.set('addInfo', transferContent);
  }

  const query = params.toString();
  return `https://img.vietqr.io/image/${bankId}-${accountNumber}-${template}.png${query ? `?${query}` : ''}`;
}
```

Fund QR truyền `transferContent` để có `addInfo=QUY-...`. Settlement QR không truyền `transferContent`, chỉ generate QR chứa bank/account/name và không tự điền nội dung chuyển khoản.

#### Animal Avatar Assignment

```javascript
const ANIMALS = [
  'cat', 'dog', 'fox', 'rabbit', 'bear', 'tiger', 'lion', 
  'elephant', 'giraffe', 'panda', 'koala', 'penguin', 'owl',
  'eagle', 'dolphin', 'whale', 'deer', 'wolf', 'monkey', 'horse'
]; // 20 animals

async function assignAnimalAvatar(groupId) {
  const usedAvatars = await prisma.groupMember.findMany({
    where: { group_id: groupId, status: 'active' },
    select: { animal_avatar: true }
  });
  
  const usedSet = new Set(usedAvatars.map(m => m.animal_avatar));
  const available = ANIMALS.filter(a => !usedSet.has(a));
  
  if (available.length === 0) {
    // Nhóm > 20 người: random bất kỳ
    return ANIMALS[Math.floor(Math.random() * ANIMALS.length)];
  }
  
  return available[Math.floor(Math.random() * available.length)];
}
```

---


### 5.4 Group Leave Service

Flow rời nhóm cần chạy qua service riêng để đảm bảo rule thống nhất:

1. Load membership của requester trong group.
2. Tính balance hiện tại, nếu `balance != 0` thì reject.
3. Nếu requester là leader:
   - yêu cầu `replacement_leader_id` nếu còn thành viên active khác;
   - replacement phải là active member;
   - trong transaction: chuyển role leader, set requester `status = left`, set `left_at` nếu có.
4. Nếu requester là member/secretary:
   - tạo leave request `pending`;
   - notify leader;
   - leader approve/reject bằng endpoint riêng.
5. Khi approve: set `group_member.status = left`, giữ lịch sử expense/contribution cũ.

### 5.4.1 Leader Transfer Service

Flow này khác với leader rời nhóm. Khi leader chủ động chuyển quyền nhưng vẫn ở lại nhóm:

1. Actor phải là active leader của group.
2. `new_leader_id` phải là active member khác actor.
3. Trong transaction:
   - new leader chuyển thành `leader`;
   - actor chuyển thành `member`;
   - không đổi `status` hoặc `left_at` của actor.
4. Không dùng endpoint đổi role thường để set `leader`; endpoint đổi role thường chỉ dùng cho `member` và `secretary`.

### 5.5 Group Deletion Service

Production recommendation: dùng soft delete.

Checks bắt buộc:

1. Actor là leader.
2. Tất cả balance trong group = 0.
3. Không có active fund campaign.
4. Nếu group có secretary hoặc fund history, cần đủ confirmation theo business rule.
5. Trong transaction:
   - set `groups.status = deleted`, `deleted_at = now()`;
   - revoke active invitations;
   - tạo system message/notification nếu cần.

Không hard-delete financial history nếu group đã có expenses, settlements, campaigns, contributions hoặc spendings.

### 5.6 Secretary Change Service

Transaction khi đổi secretary:

1. Actor phải là leader.
2. New secretary phải là active group member.
3. Secretary cũ chuyển về `member` nếu có.
4. New secretary chuyển thành `secretary`.
5. Deactivate hoặc xoá active `fund_qr_codes` của group.
6. Gửi notification cho group và secretary mới.
7. Lịch sử payment/contribution/fund spending giữ nguyên.

Invariant cần đảm bảo: mỗi group chỉ có tối đa một active secretary.

### 5.7 Contribution Payment Service

Tạo shared function `applyContributionPayment()` để dùng chung cho webhook auto payment và manual confirmation.

Input:

```javascript
{
  contributionId,
  amount,
  paidAt,
  method, // 'auto' | 'manual'
  transactionRef,
  sepayTransactionId,
  confirmedBy,
  note
}
```

Transaction:

1. Insert `fund_contribution_payments` với idempotency key nếu có.
2. Increment `fund_contributions.amount_paid`.
3. Nếu `amount_paid >= amount_required` và status không phải `kicked`, set `status = paid`, `fully_paid_at` nếu chưa có.
4. Nếu overpayment, tạo notification cho secretary.
5. Tạo notification cho member.
6. Nếu tất cả payable contributions đã paid, notify leader.

MVP không dùng row-level lock; dùng database transaction + unique dedup constraint để tránh ghi trùng transaction.

### 5.8 Fund Campaign Closing Rules

- Campaign có overpayment vẫn được close.
- Nếu còn unpaid member, cần explicit confirmation flag từ leader.
- Contribution `kicked` không tính là active pending khi close, nhưng vẫn giữ trong history để audit.
- Delete campaign nếu đã có payment nên được hiểu là cancel/close theo policy, không xoá vật lý dữ liệu thanh toán.

## 6. Security Design

### 6.1 Authentication Flow

```
Register:
  POST /auth/register
  → Hash password (bcrypt, 10 rounds)
  → Create user
  → Generate 8 recovery codes (random hex)
  → Hash each code (bcrypt, 10 rounds)
  → Store hashed codes in recovery_codes
  → Return plain codes ONCE (response chỉ lần này)
  → Set display_name_required = true

Login:
  POST /auth/login
  → Find user by email
  → Compare password hash (bcrypt.compare)
  → Generate access token (JWT, 15m)
  → Generate refresh token (UUID)
  → Hash refresh token (SHA-256)
  → Store in refresh_tokens table
  → Set httpOnly cookie (refresh_token)
  → Return access_token in body

Refresh:
  POST /auth/refresh
  → Read refresh_token from httpOnly cookie
  → Hash with SHA-256
  → Find in DB where token_hash = hash AND revoked_at IS NULL AND expires_at > NOW
  → Revoke old token (set revoked_at)
  → Generate new access token + new refresh token
  → Store new refresh token
  → Return new access token
```

### 6.2 Authorization Middleware

```javascript
// auth.js middleware
async function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return next(new AppError('UNAUTHORIZED', 401));
  }
  
  const token = authHeader.slice(7);
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { id: payload.sub, email: payload.email };
    next();
  } catch {
    return next(new AppError('TOKEN_INVALID', 401));
  }
}

// checkMembership.js middleware
async function checkGroupMembership(req, res, next) {
  const { id: groupId } = req.params;
  const member = await prisma.groupMember.findFirst({
    where: { group_id: groupId, user_id: req.user.id, status: 'active' }
  });
  if (!member) return next(new AppError('NOT_GROUP_MEMBER', 403));
  req.member = member; // attach role info
  next();
}

// roleCheck.js middleware
function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.member.role)) {
      return next(new AppError('INSUFFICIENT_ROLE', 403));
    }
    next();
  };
}
```

### 6.3 SePay Webhook Security

> SePay gửi 2 header: `X-SePay-Signature` (format `sha256=<hex>`) và `X-SePay-Timestamp` (Unix seconds).
> Node/Express tự normalize header name về lowercase — đọc bằng `req.headers['x-sepay-signature']` và `req.headers['x-sepay-timestamp']`.

Route webhook phải dùng `express.raw` để giữ raw body trước khi parse:

```javascript
app.post('/api/webhooks/sepay/:webhookConfigId', express.raw({ type: 'application/json' }), sepayHandler);
```

Thuật toán verify (chuỗi ký = `${timestamp}.${raw_body}`):

```javascript
function verifySePaySignature(rawBody, signatureHeader, timestampHeader, secret) {
  const timestamp = Number(timestampHeader);
  const now = Math.floor(Date.now() / 1000);

  if (!timestamp || Math.abs(now - timestamp) > 300) {
    return false;
  }

  const expected = 'sha256=' + crypto
    .createHmac('sha256', secret)
    .update(`${timestamp}.${rawBody.toString('utf8')}`)
    .digest('hex');

  return crypto.timingSafeEqual(
    Buffer.from(signatureHeader),
    Buffer.from(expected)
  );
}
```

Headers:

```http
X-SePay-Signature: sha256=<hex>
X-SePay-Timestamp: <unix_seconds>
```

Nếu signature sai hoặc timestamp lệch quá 5 phút, trả `401`.

### 6.4 Rate Limiting Config

```javascript
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 phút
  max: 5,
  message: { success: false, error: { code: 'RATE_LIMIT_EXCEEDED', message: 'Quá nhiều lần thử. Vui lòng thử lại sau 15 phút.' } }
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 giờ
  max: 10,
});

const webhookLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 phút
  max: 100,
});
```

---

## 7. Real-time Architecture (Socket.io)

### 7.1 Server Setup

```javascript
// server.js
const { createServer } = require('http');
const { Server } = require('socket.io');
const app = require('./app');
const { handleSocketAuth } = require('./middlewares/auth');
const { registerChatHandlers } = require('./modules/chat/chat.socket');

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: process.env.FRONTEND_URL, credentials: true }
});

// Auth middleware cho socket
io.use(handleSocketAuth);

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.user.id}`);
  registerChatHandlers(io, socket);
  
  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.user.id}`);
  });
});
```

### 7.2 Socket Auth Middleware

```javascript
async function handleSocketAuth(socket, next) {
  const token = socket.handshake.auth?.token || 
                socket.handshake.headers?.authorization?.slice(7);
  
  if (!token) return next(new Error('UNAUTHORIZED'));
  
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    socket.user = { id: payload.sub, email: payload.email };
    next();
  } catch {
    next(new Error('TOKEN_INVALID'));
  }
}
```

### 7.3 Chat Handlers

```javascript
// chat.socket.js
function registerChatHandlers(io, socket) {
  
  socket.on('join_group', async ({ group_id }) => {
    // Verify membership
    const member = await prisma.groupMember.findFirst({
      where: { group_id, user_id: socket.user.id, status: 'active' }
    });
    if (!member) return socket.emit('error', { code: 'NOT_GROUP_MEMBER' });
    
    socket.join(`group:${group_id}`);
    socket.emit('joined', { group_id });
  });

  socket.on('send_message', async ({ group_id, content }) => {
    // Verify membership + create message
    const message = await chatService.createMessage({
      group_id, 
      sender_id: socket.user.id, 
      content,
      type: 'text'
    });
    
    io.to(`group:${group_id}`).emit('new_message', message);
  });

  socket.on('typing', ({ group_id }) => {
    socket.to(`group:${group_id}`).emit('user_typing', {
      user_id: socket.user.id
    });
  });

  socket.on('stop_typing', ({ group_id }) => {
    socket.to(`group:${group_id}`).emit('user_stop_typing', {
      user_id: socket.user.id
    });
  });

  socket.on('mark_read', async ({ group_id, last_message_id }) => {
    await chatService.markRead(socket.user.id, last_message_id);
  });

  socket.on('leave_group', ({ group_id }) => {
    socket.leave(`group:${group_id}`);
  });
}
```

### 7.4 System Events Broadcast

```javascript
// notification.js utility
async function broadcastSystemEvent(io, groupId, content) {
  // 1. Tạo system message trong DB
  const message = await prisma.message.create({
    data: { group_id: groupId, sender_id: SYSTEM_USER_ID, content, type: 'system' }
  });
  
  // 2. Broadcast qua Socket.io
  io.to(`group:${groupId}`).emit('system_event', { content, message });
}
```

### 7.5 Cursor-based Pagination cho Chat

```javascript
// GET /groups/:id/messages?cursor=<message_id>&limit=20
async function getMessages(groupId, cursor, limit = 20) {
  const where = {
    group_id: groupId,
    ...(cursor ? { created_at: { lt: await getMessageTimestamp(cursor) } } : {})
  };
  
  const messages = await prisma.message.findMany({
    where,
    orderBy: { created_at: 'desc' },
    take: limit + 1,
    include: {
      sender: { select: { id: true, display_name: true, avatar_url: true } }
    }
  });
  
  const hasMore = messages.length > limit;
  if (hasMore) messages.pop();
  
  return {
    messages: messages.reverse(),
    next_cursor: hasMore ? messages[0].id : null,
    has_more: hasMore
  };
}
```

---

## 8. SePay Webhook Architecture

### 8.1 Webhook Processing Flow

```javascript
// webhooks/sepay.js
// POST /api/webhooks/sepay/:webhookConfigId
async function handleSePayWebhook(req, res) {
  // 1. Load group-scoped webhook config before HMAC verification
  const webhookConfig = await prisma.fundQrCode.findUnique({
    where: { webhook_config_id: req.params.webhookConfigId },
    select: { group_id: true, webhook_secret: true, is_active: true }
  });

  if (!webhookConfig?.is_active) {
    return res.status(401).json({
      success: false,
      error: { code: 'INVALID_WEBHOOK_SIGNATURE', message: 'Chữ ký không hợp lệ hoặc request đã hết hạn' }
    });
  }

  // 2. Verify timestamp drift (lớp 1 replay protection)
  const signatureHeader = req.headers['x-sepay-signature'];   // X-SePay-Signature
  const timestampHeader = req.headers['x-sepay-timestamp'];   // X-SePay-Timestamp

  if (!verifySePaySignature(req.body, signatureHeader, timestampHeader, webhookConfig.webhook_secret)) {
    return res.status(401).json({
      success: false,
      error: { code: 'INVALID_WEBHOOK_SIGNATURE', message: 'Chữ ký không hợp lệ hoặc request đã hết hạn' }
    });
  }

  const normalizedPayload = normalizeSePayPayload(req.body);

  // 3. Only incoming money is relevant to fund contributions.
  if (normalizedPayload.transferType && normalizedPayload.transferType !== 'in') return res.status(200).json({ success: true });
  if (normalizedPayload.amountIn <= 0) return res.status(200).json({ success: true });

  // 4. Idempotency check (lớp 2 replay protection)
  const existing = await prisma.fundContributionPayment.findUnique({
    where: { transaction_ref: normalizedPayload.referenceNumber }
  });
  if (existing) return res.status(200).json({ success: true, message: 'Already processed' });

  // 5. Normalize và extract mã định danh
  const normalized = normalizeTransferContent(normalizedPayload.transferContent);
  const transferCode = extractTransferCode(normalized);

  // 6. Nếu không có mã: bỏ qua hoàn toàn
  if (!transferCode) return res.status(200).json({ success: true });

  // 7. Match campaign + user in the same group as the webhook config
  const match = await matchTransferCode(transferCode);
  if (!match || match.campaign.group_id !== webhookConfig.group_id) return res.status(200).json({ success: true });
  
  const { contribution, campaign } = match;

  // 6. Tính toán amount cần ghi
  const remaining = contribution.amount_required - contribution.amount_paid;
  const actualAmount = Math.min(normalizedPayload.amountIn, remaining);
  const overpaid = normalizedPayload.amountIn - actualAmount;

  // 7. Database transaction
  await prisma.$transaction(async (tx) => {
    // Insert payment record
    await tx.fundContributionPayment.create({
      data: {
        contribution_id: contribution.id,
        amount: actualAmount,
        method: 'auto',
        transaction_ref: normalizedPayload.referenceNumber,
        sepay_transaction_id: normalizedPayload.sepayTransactionId
      }
    });
    
    // Update contribution
    const newAmountPaid = contribution.amount_paid + actualAmount;
    const newStatus = newAmountPaid >= contribution.amount_required ? 'paid' : contribution.status;
    
    await tx.fundContribution.update({
      where: { id: contribution.id },
      data: {
        amount_paid: newAmountPaid,
        status: newStatus,
        ...(newStatus === 'paid' ? { fully_paid_at: new Date() } : {})
      }
    });
    
    // Thông báo cho thành viên
    const remaining_after = contribution.amount_required - newAmountPaid;
    const message = remaining_after > 0 
      ? `Đã nhận ${formatCurrency(actualAmount)}, còn thiếu ${formatCurrency(remaining_after)}`
      : `Đã đóng đủ quỹ ${campaign.title}`;
    
    await tx.notification.create({
      data: {
        user_id: contribution.user_id,
        group_id: campaign.group_id,
        type: newStatus === 'paid' ? 'fund_paid' : 'fund_reminder',
        title: 'Xác nhận đóng quỹ',
        body: message
      }
    });
    
    // Thông báo overpayment cho secretary
    if (overpaid > 0) {
      const secretary = await getGroupSecretary(tx, campaign.group_id);
      if (secretary) {
        await tx.notification.create({
          data: {
            user_id: secretary.user_id,
            group_id: campaign.group_id,
            type: 'overpayment_alert',
            title: 'Cần xử lý thủ công',
            body: `${contribution.user?.display_name} đóng dư ${formatCurrency(overpaid)}. Vui lòng xử lý thủ công.`
          }
        });
      }
    }
  });
  
  // 8. Broadcast qua Socket.io
  const user = await prisma.user.findUnique({ where: { id: contribution.user_id } });
  broadcastSystemEvent(io, campaign.group_id, 
    `${user.display_name} vừa đóng quỹ ${campaign.title}`);
  
  // 9. Kiểm tra tất cả đã đóng chưa
  await checkCampaignCompletion(campaign.id, campaign.group_id);
  
  res.status(200).json({ success: true });
}
```

### 8.2 SePay Webhook Payload Format

SePay gửi POST request với body (dạng JSON):
```json
{
  "id": 92704,
  "gateway": "Vietcombank",
  "transactionDate": "2024-07-02 11:08:33",
  "accountNumber": "1017588888",
  "subAccount": "",
  "code": "QUYABC123001",
  "content": "QUY-ABC123-001 dong quy",
  "transferType": "in",
  "description": "NGUYEN VAN A chuyen tien",
  "transferAmount": 100000,
  "accumulated": 1234567,
  "referenceCode": "FT24315ABCDEF"
}
```

Field mapping:
- `transferType` + `transferAmount` -> kiểm tra tiền vào và số tiền ghi nhận.
- `content` hoặc `code` -> nội dung/mã chuyển khoản cần normalize và extract mã quỹ.
- `referenceCode` + `id` -> transaction_ref / sepay_transaction_id cho idempotency.
- Backend normalize tương thích thêm payload snake_case cũ: `amount_in`, `transaction_content`, `reference_number`, `transfer_type`.

---


### 8.3 Webhook Storage Policy & Privacy

- Chỉ xử lý `transferType = "in"` hoặc field tương đương thể hiện tiền vào tài khoản.
- Nếu payload không có mã SplitBill hợp lệ, return success và **không lưu/log payload**.
- Nếu mã hợp lệ nhưng không resolve được campaign/user, return success và **không lưu/log payload**.
- Không lưu `accumulated`.
- Chỉ lưu các field cần thiết cho audit payment đã match:
  - SePay transaction id hoặc reference code.
  - amount.
  - paid_at / transaction date.
  - contribution id.
  - method = `auto`.
  - note tối thiểu, không chứa dữ liệu nhạy cảm không cần thiết.

### 8.4 Webhook Idempotency & Retry Behavior

SePay có thể retry nếu endpoint không trả success đúng hạn. Vì vậy handler phải idempotent:

1. Verify signature.
2. Parse JSON.
3. Check `transferType`.
4. Dedup bằng `sepay_transaction_id` hoặc `transaction_ref` unique.
5. Nếu duplicate, return `200 { "success": true }`.
6. Match transfer code.
7. Apply contribution payment trong transaction.
8. Return `200 { "success": true }`.

Response thành công nên ngắn gọn:

```json
{ "success": true }
```

Không throw lỗi cho transaction không match business code vì đó không phải lỗi của SePay.

### 8.5 Transfer Code Parsing Priority

Khi parse webhook:

1. Ưu tiên field `code` nếu SePay cấu hình tách mã riêng.
2. Nếu không có, normalize `content` hoặc `transaction_content`.
3. Normalize: bỏ dấu tiếng Việt, uppercase, trim, collapse whitespace, bỏ ký tự phân cách không cần thiết.
4. Match pattern `QUY-{CAMPAIGN_CODE}-{USER_CODE}` và biến thể không dấu gạch ngang như `QUYC11U42`.
5. Nếu nhiều mã trong content, chọn mã đầu tiên hợp lệ và log warning nội bộ không chứa full content nhạy cảm.

## 9. Background Jobs

### 9.1 Cron Job Configuration

```javascript
// jobs/cronJobs.js
const cron = require('node-cron');

// Chạy lúc 8:00 sáng hàng ngày (UTC+7 = UTC+7, tức là 1:00 UTC)
cron.schedule('0 1 * * *', async () => {
  await remindExpenseDebts();
  await remindFundContributions();
  await cleanupExpiredTokens();
}, {
  timezone: 'Asia/Ho_Chi_Minh'
});
```

### 9.2 Debt Reminder Job

```javascript
async function remindExpenseDebts() {
  // Lấy tất cả thành viên của tất cả nhóm có balance âm
  const groups = await prisma.group.findMany({
    include: { members: { where: { status: 'active' } } }
  });
  
  for (const group of groups) {
    const balances = await calculateGroupBalances(group.id);
    
    for (const [userId, balance] of balances) {
      if (balance < -1000) { // Nợ hơn 1000đ mới nhắc
        await createNotification({
          user_id: userId,
          group_id: group.id,
          type: 'settlement_suggested',
          title: 'Nhắc nhở trả nợ',
          body: `Bạn đang nợ ${formatCurrency(Math.abs(balance))} trong nhóm ${group.name}`
        });
      }
    }
  }
}
```

### 9.3 Fund Reminder Job

```javascript
async function remindFundContributions() {
  const today = new Date();
  const activeCampaigns = await prisma.fundCampaign.findMany({
    where: { status: 'active' },
    include: {
      contributions: {
        where: { status: { in: ['pending', 'late'] } },
        include: { user: true }
      },
      group: true
    }
  });
  
  for (const campaign of activeCampaigns) {
    const dueDate = new Date(campaign.due_date);
    const daysUntilDue = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));
    
    for (const contribution of campaign.contributions) {
      // Trước 3 ngày
      if (daysUntilDue === 3) {
        await createFundReminder(contribution, campaign, 'Còn 3 ngày nữa đến hạn đóng quỹ');
      }
      // Trước 1 ngày
      else if (daysUntilDue === 1) {
        await createFundReminder(contribution, campaign, 'Ngày mai là hạn cuối đóng quỹ!');
      }
      // Đúng ngày
      else if (daysUntilDue === 0) {
        await createFundReminder(contribution, campaign, 'Hôm nay là hạn cuối đóng quỹ!');
        // Update status → late nếu chưa đóng đủ
        await prisma.fundContribution.update({
          where: { id: contribution.id },
          data: { status: 'late' }
        });
      }
      // Sau hạn (tối đa 3 lần)
      else if (daysUntilDue < 0 && daysUntilDue >= -3) {
        await createFundReminder(contribution, campaign, 
          `Bạn đã quá hạn đóng quỹ ${Math.abs(daysUntilDue)} ngày!`);
      }
    }
  }
}
```

### 9.4 Token Cleanup Job

```javascript
// Chạy hàng tuần: xóa refresh tokens đã hết hạn hoặc revoked
cron.schedule('0 2 * * 0', async () => {
  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  await prisma.refreshToken.deleteMany({
    where: {
      OR: [
        { expires_at: { lt: new Date() } },
        { revoked_at: { lt: cutoff } }
      ]
    }
  });
});
```

---


### 9.5 Job Idempotency Requirements

Cron jobs phải an toàn khi chạy lại:

- Reminder job không được tạo duplicate notification trong cùng reminder window.
- Late marking job chỉ chuyển `pending -> late`, không đụng `paid` hoặc `kicked`.
- Token cleanup chỉ xoá hoặc revoke token đã expired theo batch nhỏ để tránh lock lâu.
- Job nên log summary count, không log dữ liệu nhạy cảm.

### 9.6 Recommended Cron Schedule

| Job | Lịch chạy | Timezone | Ghi chú |
|---|---|---|---|
| Expense debt reminder | 08:00 hằng ngày | Asia/Ho_Chi_Minh | Nhắc user có balance âm |
| Fund reminder | 08:00 hằng ngày | Asia/Ho_Chi_Minh | Trước hạn 3 ngày, 1 ngày, đúng hạn, sau hạn tối đa 3 lần |
| Mark contribution late | 00:10 hằng ngày | Asia/Ho_Chi_Minh | Chỉ áp dụng campaign active |
| Refresh token cleanup | Hàng tuần | Asia/Ho_Chi_Minh | Xoá token expired/revoked quá lâu |
| Expired invitation cleanup | Hàng ngày | Asia/Ho_Chi_Minh | Có thể soft cleanup hoặc filter khi query |

## 10. File Upload Architecture

### 10.1 Multer Configuration

```javascript
// middlewares/upload.js
const multer = require('multer');

// Memory storage → stream thẳng lên Cloudinary
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new AppError('INVALID_FILE_TYPE', 400));
    }
    cb(null, true);
  }
});

module.exports = { upload };
```

### 10.2 Cloudinary Upload

```javascript
// utils/cloudinary.js
const cloudinary = require('cloudinary').v2;
const { Readable } = require('stream');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

async function uploadImage(buffer, folder, publicId = null) {
  return new Promise((resolve, reject) => {
    const uploadOptions = {
      folder,
      resource_type: 'image',
      ...(publicId ? { public_id: publicId, overwrite: true } : {})
    };
    
    const stream = cloudinary.uploader.upload_stream(uploadOptions, (error, result) => {
      if (error) reject(error);
      else resolve(result);
    });
    
    Readable.from(buffer).pipe(stream);
  });
}

async function deleteImage(publicId) {
  return cloudinary.uploader.destroy(publicId);
}

module.exports = { uploadImage, deleteImage };
```

### 10.3 Avatar Upload Flow

```javascript
// Khi upload avatar mới:
// 1. Lấy public_id của avatar cũ (nếu có)
// 2. Upload avatar mới lên Cloudinary (folder: 'splitbill/avatars', publicId: userId)
// 3. Overwrite nếu cùng publicId → Cloudinary tự xóa cái cũ
// 4. Update users.avatar_url

async function updateUserAvatar(userId, buffer) {
  const result = await uploadImage(buffer, 'splitbill/avatars', userId);
  await prisma.user.update({
    where: { id: userId },
    data: { avatar_url: result.secure_url }
  });
  return result.secure_url;
}
```

---

## 11. Error Handling Strategy

### 11.1 AppError Class

```javascript
class AppError extends Error {
  constructor(code, statusCode = 500, details = []) {
    super(code);
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = true;
  }
}

// Predefined errors
class NotFoundError extends AppError {
  constructor(resource) {
    super(`${resource}_NOT_FOUND`, 404);
  }
}

class ForbiddenError extends AppError {
  constructor(code = 'FORBIDDEN') {
    super(code, 403);
  }
}

class ValidationError extends AppError {
  constructor(code, details) {
    super(code, 422, details);
  }
}
```

### 11.2 Global Error Handler

```javascript
// middlewares/errorHandler.js
function errorHandler(err, req, res, next) {
  // Log lỗi không phải operational
  if (!err.isOperational) {
    console.error('UNEXPECTED ERROR:', err);
  }
  
  const statusCode = err.statusCode || 500;
  const code = err.code || 'INTERNAL_SERVER_ERROR';
  const message = getErrorMessage(code);
  
  res.status(statusCode).json({
    success: false,
    error: {
      code,
      message,
      ...(err.details?.length ? { details: err.details } : {})
    }
  });
}

// Error message mapping (tiếng Việt)
function getErrorMessage(code) {
  const messages = {
    'UNAUTHORIZED': 'Bạn cần đăng nhập để thực hiện thao tác này',
    'TOKEN_INVALID': 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn',
    'FORBIDDEN': 'Bạn không có quyền thực hiện thao tác này',
    'NOT_GROUP_MEMBER': 'Bạn không phải thành viên của nhóm này',
    'INSUFFICIENT_ROLE': 'Vai trò của bạn không đủ quyền',
    'EXPENSE_NOT_FOUND': 'Khoản chi không tồn tại',
    'GROUP_NOT_FOUND': 'Nhóm không tồn tại',
    'CAMPAIGN_NOT_FOUND': 'Đợt thu không tồn tại',
    'SPLIT_AMOUNT_MISMATCH': 'Tổng số tiền chia không khớp với tổng khoản chi',
    'CONTRIBUTION_ALREADY_PAID': 'Khoản đóng quỹ này đã được xác nhận, không thể thay đổi',
    'CAMPAIGN_HAS_PENDING': 'Còn thành viên chưa đóng quỹ, không thể đóng đợt thu',
    'FUND_BALANCE_NEGATIVE': 'Số tiền chi vượt quá số tiền quỹ hiện có',
    'VALIDATION_ERROR': 'Dữ liệu đầu vào không hợp lệ',
    'INTERNAL_SERVER_ERROR': 'Lỗi hệ thống, vui lòng thử lại sau',
    'RATE_LIMIT_EXCEEDED': 'Quá nhiều yêu cầu, vui lòng thử lại sau',
    // ... etc
  };
  return messages[code] || 'Đã xảy ra lỗi không xác định';
}
```

---

## 12. Test Strategy

### 12.1 Testing Pyramid

```
         /\
        /  \
       / E2E \    ← Minimal (5%) — Happy paths chính
      /────────\
     /Integration\  ← Trung bình (30%) — API endpoints
    /────────────\
   /   Unit Tests  \  ← Nhiều nhất (65%) — Business logic
  /──────────────────\
```

### 12.2 Unit Tests

**Phạm vi cover:**
- `utils/debtSettlement.js` — Greedy algorithm (toàn bộ cases)
- `utils/transferCode.js` — Sinh mã + normalize + extract
- `utils/normalizeText.js` — Bỏ dấu tiếng Việt
- `utils/vietqr.js` — Generate URL
- `modules/expenses/expenses.service.js` — validateSplits(), calculateBalance()
- `modules/fund/campaigns.service.js` — Tính suggested_amount_per_payment
- `modules/auth/auth.service.js` — generateRecoveryCodes(), hashCode()
- `middlewares/roleCheck.js` — Logic check role
- `webhooks/sepay.js` — Idempotency check, normalize, match logic

**Mock database:** YES — unit tests mock Prisma client hoàn toàn. Không kết nối DB thật.

```javascript
// Ví dụ unit test: debtSettlement
describe('simplifyDebts', () => {
  it('should simplify 3-person debt to 2 transactions', () => {
    const balances = new Map([
      ['user-a', 600000],
      ['user-b', -400000],
      ['user-c', -200000],
    ]);
    
    const result = simplifyDebts(balances);
    
    expect(result).toHaveLength(2);
    expect(result).toContainEqual({ from: 'user-b', to: 'user-a', amount: 400000 });
    expect(result).toContainEqual({ from: 'user-c', to: 'user-a', amount: 200000 });
  });
  
  it('should handle already-settled balances', () => {
    const balances = new Map([['user-a', 0], ['user-b', 0]]);
    expect(simplifyDebts(balances)).toHaveLength(0);
  });
  
  it('should handle single creditor multiple debtors', () => { ... });
  it('should handle circular debts', () => { ... });
  it('should handle floating point precision', () => { ... });
});
```

**Coverage minimum cho unit tests:** 90% cho các file trong `utils/` và service logic thuần.

### 12.3 Integration Tests

**Phạm vi cover:**
- Toàn bộ API endpoints (happy path + error cases chính)
- Middleware chain: auth → membership → role → validate
- Database transactions (expense create, webhook processing)
- Pagination (cursor-based chat, offset expenses)

**Mock database:** NO — sử dụng test database PostgreSQL thật (Docker trong CI)

**Setup:**
```javascript
// tests/setup.js
const { execSync } = require('child_process');

beforeAll(async () => {
  // Reset database
  await prisma.$executeRaw`TRUNCATE TABLE users, groups, ... CASCADE`;
  // Seed fixtures
  await seedTestData();
});

afterEach(async () => {
  // Cleanup sau mỗi test để isolate
  await cleanupTestData();
});
```

**Ví dụ integration tests theo module:**

```javascript
// Auth
describe('POST /api/auth/register', () => {
  it('should return 8 recovery codes on success', ...)
  it('should return 400 if email already exists', ...)
  it('should return 422 if password < 8 chars', ...)
  it('should not store plain text recovery codes', ...)
});

describe('POST /api/auth/login', () => {
  it('should return access_token and set httpOnly cookie', ...)
  it('should return 401 on wrong password', ...)
  it('should set 30-day cookie when remember_me=true', ...)
  it('should block after 5 failed attempts', ...)
});

// Expenses
describe('POST /api/groups/:id/expenses', () => {
  it('should create expense with equal split', ...)
  it('should create expense with custom split', ...)
  it('should reject if splits dont sum to amount', ...)
  it('should reject if non-member tries to create', ...)
  it('should run in database transaction (atomic)', ...)
});

// Webhook
describe('POST /api/webhooks/sepay/:webhookConfigId', () => {
  it('should reject invalid HMAC signature', ...)
  it('should ignore duplicate transaction_ref', ...)
  it('should update contribution status to paid when full', ...)
  it('should cap amount at remaining and notify secretary on overpayment', ...)
  it('should ignore transactions without valid transfer code', ...)
  it('should NOT save any data for unmatched transactions', ...)
});
```

**Coverage minimum cho integration tests:** 80% line coverage tổng các route handlers.

### 12.4 Coverage Requirements

| Layer | Coverage Target | Tool |
|---|---|---|
| Utils (business logic) | ≥ 90% | Jest --coverage |
| Services | ≥ 85% | Jest --coverage |
| Controllers / Routes | ≥ 80% | Jest + Supertest |
| Middleware | ≥ 85% | Jest |
| Tổng codebase | ≥ 80% | Jest --coverage |

**Coverage command:**
```bash
jest --coverage --coverageReporters=text --coverageReporters=html
```

**Coverage thresholds trong package.json:**
```json
{
  "jest": {
    "coverageThreshold": {
      "global": {
        "branches": 80,
        "functions": 85,
        "lines": 80,
        "statements": 80
      }
    }
  }
}
```

### 12.5 Test File Structure

```
tests/
├── unit/
│   ├── utils/
│   │   ├── debtSettlement.test.js
│   │   ├── transferCode.test.js
│   │   ├── normalizeText.test.js
│   │   └── vietqr.test.js
│   ├── services/
│   │   ├── auth.service.test.js
│   │   ├── expenses.service.test.js
│   │   └── fund.campaigns.service.test.js
│   └── middlewares/
│       └── roleCheck.test.js
├── integration/
│   ├── auth.test.js
│   ├── groups.test.js
│   ├── expenses.test.js
│   ├── settlements.test.js
│   ├── fund.campaigns.test.js
│   ├── fund.contributions.test.js
│   ├── fund.qr.test.js
│   ├── chat.test.js
│   ├── notifications.test.js
│   └── webhook.sepay.test.js
└── fixtures/
    ├── users.js
    ├── groups.js
    └── expenses.js
```

---


### 12.6 Critical Test Matrix

Các test bắt buộc nên có trước khi release:

**Financial calculations:**
- Equal split có số dư làm tròn.
- Custom split tổng đúng/sai.
- Percentage split `33.33 x 3 = 99.99` vẫn hợp lệ theo tolerance.
- Balance trước/sau settlement đúng convention.
- Left member vẫn xuất hiện trong historical balance nếu có expense/settlement liên quan.

**Webhook:**
- Signature hợp lệ/không hợp lệ.
- Timestamp quá hạn bị reject.
- Duplicate transaction không ghi trùng.
- Payload không match mã quỹ không được lưu.
- Overpayment tạo notification cho secretary.
- All-paid tạo notification cho leader.

**Authorization:**
- Member không thể sửa group.
- Secretary chỉ thao tác các quyền quỹ được phép.
- Leader có thể sửa/xoá expense bất kỳ; creator có thể sửa/xoá expense của mình.
- User ngoài group không truy cập được group resource.

**Group lifecycle:**
- Leave request khi balance != 0 bị reject.
- Leader rời nhóm cần replacement leader.
- Delete group bị chặn khi còn active campaign hoặc non-zero balance.
- Đổi secretary xoá/deactivate QR cũ.

**Realtime:**
- Socket handshake token sai bị reject.
- User join đúng group rooms.
- Message/system event/notification broadcast đúng room.

### 12.7 Frontend Component & E2E Smoke Tests

Frontend nên có test tối thiểu cho:

- Auth 3 bước: register → recovery codes → display name.
- Axios interceptor refresh token khi 401.
- Expense form equal/custom/percentage validation.
- Fund QR display và copy transfer content.
- Chat send/receive basic flow.
- Notification dropdown unread/read state.
- Responsive mobile bottom navigation và bottom sheet modal.

E2E smoke test nên cover:

1. Register/login.
2. Create group.
3. Join invite.
4. Create expense.
5. View balance and settlement suggestion.
6. Create fund campaign.
7. Generate QR.
8. Mock webhook payment.

## 13. Definition of Done

Một task (issue/ticket) được coi là **DONE** khi thỏa mãn **TẤT CẢ** các điều kiện sau:

### 13.1 Code Quality

- [ ] **Không có `console.log`** trong code (trừ `console.error` trong error handler được phép có note)
- [ ] Không có `TODO` hoặc `FIXME` chưa được resolve
- [ ] Không có dead code (commented-out code block)
- [ ] Tất cả biến và function có tên rõ nghĩa, không viết tắt mập mờ
- [ ] Không có hardcoded strings (URL, config values) — phải dùng env vars hoặc constants
- [ ] Không có N+1 query (kiểm tra Prisma query log trong dev)

### 13.2 Testing

- [ ] **Unit tests pass** với coverage ≥ 90% cho utilities
- [ ] **Integration tests pass** cho endpoint liên quan
- [ ] **Tổng coverage ≥ 80%** (không được giảm coverage so với base)
- [ ] Test cases cover cả **happy path và error cases** được định nghĩa trong spec
- [ ] Không có test bị skip (`it.skip`) trừ khi có comment lý do rõ ràng

### 13.3 API & Documentation

- [ ] Swagger documentation được cập nhật cho endpoint mới/thay đổi
- [ ] Response format đúng chuẩn `{ success, data }` hoặc `{ success, error }`
- [ ] HTTP status codes đúng (200, 201, 400, 401, 403, 404, 422, 500)
- [ ] Error codes được định nghĩa trong Error Code Catalog (API.md)

### 13.4 Security

- [ ] Route mới có middleware auth (nếu cần)
- [ ] Route liên quan nhóm có middleware `checkGroupMembership`
- [ ] Route leader/secretary-only có `requireRole`
- [ ] Input validation bằng Zod schema
- [ ] Không log thông tin nhạy cảm (password, token, recovery code)

### 13.5 Database

- [ ] Migration file được tạo nếu có schema changes
- [ ] Migration đã được test trên môi trường dev
- [ ] Các thao tác cần thiết chạy trong DB transaction

### 13.6 Pull Request

- [ ] **PR title** theo format: `feat: [module] mô tả ngắn` / `fix: [module] mô tả`
- [ ] **PR description** phải có:
  - Mô tả thay đổi là gì và tại sao
  - Link đến issue/ticket liên quan
  - Checklist các test đã chạy
  - Screenshots (nếu có thay đổi API response)
  - Breaking changes (nếu có)
- [ ] Được **review bởi ít nhất 1 người** khác (hoặc self-review với checklist đầy đủ nếu solo)
- [ ] **Không có merge conflicts**
- [ ] Branch được merge vào đúng branch target (`develop` hoặc `main`)

### 13.7 Frontend (nếu applicable)

- [ ] Responsive trên mobile (375px) và desktop (1280px)
- [ ] Loading state hiển thị đúng
- [ ] Error state hiển thị đúng với message từ API
- [ ] Không có `console.log` trong production code
- [ ] Số tiền được format `1.000.000 ₫` nhất quán

---

## 14. Performance Considerations

### 14.1 Database Optimization

- Sử dụng `select` chỉ lấy các field cần thiết, không `SELECT *`
- Tất cả `findMany` phải có `include` hoặc `join` để tránh N+1
- Balance calculation: chấp nhận tính lại từ đầu, không cache — nhưng query được optimize với single JOIN
- Messages: cursor-based pagination, không OFFSET để tránh chậm với data lớn
- Index trên các cột filter/sort thường xuyên (xem mục 3.3)

### 14.2 API Response Optimization

- Pagination mặc định: `limit=20`
- Không trả về toàn bộ array không paginate với bộ data lớn
- `GET /balances`: tính realtime nhưng với query tối ưu (1 query expenses + 1 query settlements)

### 14.3 File Upload

- Stream trực tiếp buffer lên Cloudinary, không lưu file tạm trên disk
- Validate file type và size trước khi upload

---


### 14.4 N+1 Query Prevention Checklist

- List expenses phải include payer và chỉ select fields cần thiết.
- Expense detail include splits + user info trong một query hợp lý.
- Group detail không load toàn bộ expenses/messages; chỉ load summary hoặc paginated data.
- Chat dùng cursor pagination với index `(group_id, created_at DESC)`.
- Notification dropdown giới hạn số lượng item gần nhất.
- Stats endpoint nên aggregate bằng SQL/Prisma groupBy thay vì load toàn bộ data khi dữ liệu lớn.
- Balance calculation có thể load expenses/splits/settlements theo group bằng query có index; chưa cache trong MVP.

### 14.5 Upload & Payload Limits

- `express.json({ limit: '1mb' })` cho API JSON thường.
- Webhook raw body limit nên nhỏ, ví dụ `256kb`.
- Avatar/receipt max 5MB.
- Reject MIME không phải `image/*` và kiểm tra magic bytes nếu có thể.

## 15. Environment & Configuration

### 15.1 Environment Variables

```env
# Database
DATABASE_URL="postgresql://user:password@host:5432/splitbill"

# JWT
JWT_SECRET="..."             # min 32 chars random string
JWT_REFRESH_SECRET="..."     # khác với JWT_SECRET

# Server
PORT=3000
NODE_ENV=development|production
FRONTEND_URL="https://your-frontend.vercel.app"

# Cloudinary
CLOUDINARY_CLOUD_NAME="..."
CLOUDINARY_API_KEY="..."
CLOUDINARY_API_SECRET="..."

# Optional
LOG_LEVEL=info|debug|error
```

### 15.2 Environment Validation

```javascript
// config/env.js
const { z } = require('zod');

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(32),
  JWT_REFRESH_SECRET: z.string().min(32),
  PORT: z.string().default('3000'),
  NODE_ENV: z.enum(['development', 'production', 'test']),
  FRONTEND_URL: z.string().url(),
  CLOUDINARY_CLOUD_NAME: z.string(),
  CLOUDINARY_API_KEY: z.string(),
  CLOUDINARY_API_SECRET: z.string(),
});

module.exports = envSchema.parse(process.env);
```

---


### 15.3 Additional Environment Variables

```env
# Security
JWT_ACCESS_SECRET=
JWT_REFRESH_SECRET=
COOKIE_SECRET=
BCRYPT_ROUNDS=10

# SePay
SEPAY_TIMESTAMP_TOLERANCE_SECONDS=300

# Rate Limits
RATE_LIMIT_LOGIN_MAX=5
RATE_LIMIT_REGISTER_MAX=10
RATE_LIMIT_WEBHOOK_MAX=100

# App
APP_TIMEZONE=Asia/Ho_Chi_Minh
FRONTEND_URL=http://localhost:5173
BACKEND_URL=http://localhost:3000

# Upload limits
MAX_IMAGE_SIZE_MB=5
JSON_BODY_LIMIT=1mb
WEBHOOK_BODY_LIMIT=256kb
```

### 15.4 Configuration Validation Rules

- Production bắt buộc có JWT secrets đủ dài và Cloudinary credentials. SePay webhook secret không nằm trong env; app sinh và lưu theo từng `webhook_config_id`.
- `FRONTEND_URL` phải nằm trong CORS allowlist.
- Cookie config production phải `Secure=true`, `SameSite=Strict` hoặc `Lax` theo deployment domain.
- Không cho app start nếu thiếu biến môi trường bắt buộc.

## 16. Deployment Architecture

### 16.1 Production Setup

```
Frontend (Vercel CDN)
  └── Static React build
  └── Environment variables trong Vercel dashboard

Backend (Railway / Render)
  └── Node.js Docker container
  └── PM2 process manager
  └── Environment variables trong platform dashboard

Database (Railway PostgreSQL / Supabase)
  └── PostgreSQL 15
  └── Connection pooling (PgBouncer nếu cần)

File Storage (Cloudinary)
  └── CDN tự động
  └── Transformations

SePay Webhook
  └── Public endpoint: POST /api/webhooks/sepay/{webhook_config_id}
  └── URL và Secret Key được SplitBill sinh khi secretary lưu tài khoản nhận quỹ
  └── Registered trong SePay dashboard
```

### 16.2 CI/CD

```yaml
# .github/workflows/ci.yml
name: CI

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_DB: splitbill_test
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
    
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with: { node-version: '20' }
      - run: npm ci
      - run: npx prisma migrate deploy
        env: { DATABASE_URL: "postgresql://test:test@localhost:5432/splitbill_test" }
      - run: npm test -- --coverage
      - run: npm run lint
```

### 16.3 Database Migrations

```bash
# Development
npx prisma migrate dev --name "add_contribution_kicked_status"

# Production
npx prisma migrate deploy
```

### 16.4 package.json scripts

```json
{
  "scripts": {
    "start": "node src/server.js",
    "dev": "nodemon src/server.js",
    "test": "jest",
    "test:unit": "jest tests/unit",
    "test:integration": "jest tests/integration",
    "test:coverage": "jest --coverage",
    "lint": "eslint src/ --ext .js",
    "migrate": "prisma migrate dev",
    "migrate:deploy": "prisma migrate deploy",
    "postinstall": "prisma generate"
  }
}
```


---

## 17. Production Implementation Checklist

### 17.1 Backend Foundation

- [ ] Prisma client singleton.
- [ ] Global error handler trả response format chuẩn.
- [ ] Zod env validation khi boot.
- [ ] Helmet/CORS/rate limit cấu hình theo environment.
- [ ] Request ID middleware để trace lỗi.
- [ ] Không log password, token, recovery code, raw webhook body hoặc unmatched bank content.

### 17.2 Financial Data Safety

- [ ] Tất cả mutation tài chính chạy trong DB transaction.
- [ ] Settlement records append-only hoặc có audit trail nếu sửa/xoá.
- [ ] Contribution payment có unique idempotency key.
- [ ] Webhook duplicate trả success và không tạo bản ghi mới.
- [ ] Group deletion production dùng soft delete khi có financial history.

### 17.3 Security & Privacy

- [ ] Access token không lưu localStorage.
- [ ] Refresh token cookie httpOnly, Secure ở production.
- [ ] Recovery codes chỉ hiển thị full một lần.
- [ ] Upload validate size + MIME.
- [ ] SePay HMAC verify raw body + timestamp.
- [ ] Unmatched webhook không lưu/log.

### 17.4 Release Readiness

- [ ] Unit tests cho services/utils quan trọng.
- [ ] Integration tests cho tất cả endpoint chính.
- [ ] Webhook tests với payload hợp lệ, duplicate, invalid signature, unmatched code.
- [ ] Swagger/OpenAPI update theo API.md.
- [ ] Migration chạy sạch trên database mới.
- [ ] Seed data development có user/group/expense/fund sample.
- [ ] CI chạy lint/test/build trước deploy.
