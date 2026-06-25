const swaggerUi = require("swagger-ui-express");
const { components, info, servers, tags } = require("./swaggerMeta");

const swaggerDocument = {
  openapi: "3.0.3",
  info,
  servers,
  tags,
  components,
  paths: {
    "/auth/register": {
      post: {
        tags: ["Auth"],
        summary: "Register a new user and return recovery codes once",
        requestBody: { required: true },
        responses: {
          201: { description: "Created" },
          409: { description: "Email already exists" },
          422: { description: "Validation error" }
        }
      }
    },
    "/auth/login": {
      post: {
        tags: ["Auth"],
        summary: "Login and issue access/refresh tokens",
        requestBody: { required: true },
        responses: {
          200: { description: "OK" },
          401: { description: "Invalid credentials" }
        }
      }
    },
    "/auth/logout": {
      post: {
        tags: ["Auth"],
        summary: "Logout and revoke current refresh token",
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: "OK" }
        }
      }
    },
    "/auth/refresh": {
      post: {
        tags: ["Auth"],
        summary: "Rotate refresh token and issue a new access token",
        responses: {
          200: { description: "OK" },
          401: { description: "Refresh token missing or invalid" }
        }
      }
    },
    "/auth/recover": {
      post: {
        tags: ["Auth"],
        summary: "Reset password using a recovery code",
        requestBody: { required: true },
        responses: {
          200: { description: "OK" },
          401: { description: "Invalid recovery code" },
          404: { description: "User not found" }
        }
      }
    },
    "/banks": {
      get: {
        tags: ["Banks"],
        summary: "Danh sách ngân hàng từ nhà cung cấp VietQR",
        description:
          "Trả metadata ngân hàng đã chuẩn hoá cho form chọn ngân hàng. Flow QR-only dùng bank_id và account_number; không bắt buộc account_name.",
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: "OK" },
          502: { description: "Bank provider unavailable" }
        }
      }
    },
    "/banks/account-lookup": {
      post: {
        tags: ["Banks"],
        summary: "Tra cứu tên chủ tài khoản legacy qua backend",
        deprecated: true,
        description:
          "Endpoint tương thích ngược đã deprecated. Flow QR-only hiện tại của frontend không gọi endpoint này và không yêu cầu account_name.",
        security: [{ bearerAuth: [] }],
        requestBody: { required: true },
        responses: {
          200: { description: "OK" },
          404: { description: "Bank not found" },
          422: { description: "Lookup unsupported or account lookup failed" },
          502: { description: "Bank provider unavailable" },
          503: { description: "Bank lookup not configured" }
        }
      }
    },
    "/auth/me": {
      get: {
        tags: ["Auth"],
        summary: "Get current authenticated user profile and personal stats",
        description: "Returns the authenticated profile plus source-derived personal summary stats used by the profile workspace.",
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: "OK" }
        }
      },
      patch: {
        tags: ["Auth"],
        summary: "Update current authenticated user profile",
        security: [{ bearerAuth: [] }],
        requestBody: { required: true },
        responses: {
          200: { description: "OK" },
          422: { description: "Validation error" }
        }
      },
      delete: {
        tags: ["Auth"],
        summary: "Delete current account when no debt remains",
        description:
          "Disables and anonymizes the authenticated account after verifying there is no non-zero group balance, no unpaid active fund contribution, and no active leader membership.",
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: "OK" },
          401: { description: "Token missing or invalid" },
          409: { description: "Account has debt or active leader membership" }
        }
      }
    },
    "/auth/me/display-name": {
      patch: {
        tags: ["Auth"],
        summary: "Set display name after registration",
        security: [{ bearerAuth: [] }],
        requestBody: { required: true },
        responses: {
          200: { description: "OK" }
        }
      }
    },
    "/auth/me/password": {
      patch: {
        tags: ["Auth"],
        summary: "Change current password and revoke refresh tokens",
        security: [{ bearerAuth: [] }],
        requestBody: { required: true },
        responses: {
          200: { description: "OK" },
          401: { description: "Current password incorrect" }
        }
      }
    },
    "/auth/me/avatar": {
      post: {
        tags: ["Auth"],
        summary: "Upload avatar image",
        security: [{ bearerAuth: [] }],
        requestBody: { required: true },
        responses: {
          200: { description: "OK" },
          400: { description: "Invalid file type or too large" }
        }
      },
      delete: {
        tags: ["Auth"],
        summary: "Delete current avatar",
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: "OK" },
          400: { description: "No avatar to delete" }
        }
      }
    },
    "/auth/recovery-codes": {
      get: {
        tags: ["Auth"],
        summary: "Get masked recovery code previews",
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: "OK" }
        }
      }
    },
    "/auth/recovery-codes/regenerate": {
      post: {
        tags: ["Auth"],
        summary: "Regenerate recovery codes",
        security: [{ bearerAuth: [] }],
        requestBody: { required: true },
        responses: {
          200: { description: "OK" },
          401: { description: "Current password incorrect" }
        }
      }
    },
    "/groups": {
      get: {
        tags: ["Groups"],
        summary: "List groups for current user",
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: "OK" }
        }
      },
      post: {
        tags: ["Groups"],
        summary: "Create a group",
        security: [{ bearerAuth: [] }],
        requestBody: { required: true },
        responses: {
          201: { description: "Created" }
        }
      }
    },
    "/groups/{groupId}": {
      get: {
        tags: ["Groups"],
        summary: "Get group detail",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "groupId", in: "path", required: true }],
        responses: {
          200: { description: "OK" },
          403: { description: "Not a group member" },
          404: { description: "Group not found" }
        }
      },
      patch: {
        tags: ["Groups"],
        summary: "Update group metadata",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "groupId", in: "path", required: true }],
        requestBody: { required: true },
        responses: {
          200: { description: "OK" },
          403: { description: "Insufficient role" }
        }
      },
      delete: {
        tags: ["Groups"],
        summary: "Delete group with leader/secretary confirmation flow",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "groupId", in: "path", required: true }],
        requestBody: { required: true },
        responses: {
          200: { description: "OK" },
          403: { description: "Insufficient role" },
          409: { description: "Business rule conflict" }
        }
      }
    },
    "/groups/{groupId}/leave": {
      post: {
        tags: ["Groups"],
        summary: "Request leaving a group",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "groupId", in: "path", required: true }],
        requestBody: { required: false },
        responses: {
          200: { description: "OK" },
          400: { description: "Leader must transfer or invalid target" }
        }
      }
    },
    "/groups/{groupId}/leave-requests": {
      get: {
        tags: ["Groups"],
        summary: "List pending leave requests",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "groupId", in: "path", required: true }],
        responses: {
          200: { description: "OK" }
        }
      }
    },
    "/groups/{groupId}/leave-requests/{requestId}": {
      patch: {
        tags: ["Groups"],
        summary: "Approve or reject a leave request",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "groupId", in: "path", required: true },
          { name: "requestId", in: "path", required: true }
        ],
        requestBody: { required: true },
        responses: {
          200: { description: "OK" },
          404: { description: "Leave request not found" },
          409: { description: "Already processed" }
        }
      }
    },
    "/groups/{groupId}/invitations": {
      get: {
        tags: ["Invitations"],
        summary: "List invitation links for a group",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "groupId", in: "path", required: true }],
        responses: {
          200: { description: "OK" }
        }
      },
      post: {
        tags: ["Invitations"],
        summary: "Create invitation link for a group",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "groupId", in: "path", required: true }],
        requestBody: { required: true },
        responses: {
          201: { description: "Created" }
        }
      }
    },
    "/groups/{groupId}/expenses": {
      get: {
        tags: ["Expenses"],
        summary: "List group expenses with compact split participants, pagination, and filters",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "groupId", in: "path", required: true },
          { name: "page", in: "query", required: false },
          { name: "limit", in: "query", required: false },
          { name: "category", in: "query", required: false },
          { name: "from", in: "query", required: false },
          { name: "to", in: "query", required: false },
          { name: "paid_by", in: "query", required: false }
        ],
        responses: {
          200: { description: "OK" },
          403: { description: "Not a group member" }
        }
      },
      post: {
        tags: ["Expenses"],
        summary: "Create a group expense with selected participants for equal, custom, or percentage split",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "groupId", in: "path", required: true }],
        requestBody: { required: true },
        responses: {
          201: { description: "Created" },
          403: { description: "Not a group member" },
          422: { description: "Split or payer validation failed" }
        }
      }
    },
    "/groups/{groupId}/expenses/{expId}": {
      get: {
        tags: ["Expenses"],
        summary: "Get expense detail by id",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "groupId", in: "path", required: true },
          { name: "expId", in: "path", required: true }
        ],
        responses: {
          200: { description: "OK" },
          404: { description: "Expense not found" }
        }
      },
      patch: {
        tags: ["Expenses"],
        summary: "Update an expense by id without changing the original payer",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "groupId", in: "path", required: true },
          { name: "expId", in: "path", required: true }
        ],
        requestBody: { required: true },
        responses: {
          200: { description: "OK" },
          403: { description: "Cannot edit expense" },
          404: { description: "Expense not found" },
          422: { description: "Validation failed" }
        }
      },
      delete: {
        tags: ["Expenses"],
        summary: "Delete an expense by id",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "groupId", in: "path", required: true },
          { name: "expId", in: "path", required: true }
        ],
        responses: {
          204: { description: "No Content" },
          403: { description: "Cannot delete expense" },
          404: { description: "Expense not found" }
        }
      }
    },
    "/groups/{groupId}/chat/me": {
      patch: {
        tags: ["Chat"],
        summary: "Update current user's chat settings for a group",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "groupId", in: "path", required: true }],
        requestBody: { required: true },
        responses: {
          200: { description: "OK" },
          403: { description: "Not an active chat participant" },
          422: { description: "Validation failed" }
        }
      },
      delete: {
        tags: ["Chat"],
        summary: "Leave group chat without leaving the financial group",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "groupId", in: "path", required: true }],
        responses: {
          200: { description: "OK" },
          403: { description: "Not a group member" }
        }
      }
    },
    "/groups/{groupId}/chat/participants/available": {
      get: {
        tags: ["Chat"],
        summary: "List active financial group members who can be added back to chat",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "groupId", in: "path", required: true }],
        responses: {
          200: { description: "OK" },
          403: { description: "Not an active chat participant" }
        }
      }
    },
    "/groups/{groupId}/chat/participants": {
      post: {
        tags: ["Chat"],
        summary: "Add an active financial group member to chat",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "groupId", in: "path", required: true }],
        requestBody: { required: true },
        responses: {
          201: { description: "Created" },
          403: { description: "Not an active chat participant" },
          404: { description: "Chat member not available" },
          422: { description: "Validation failed" }
        }
      }
    },
    "/groups/{groupId}/messages": {
      get: {
        tags: ["Chat"],
        summary: "List group chat history with cursor pagination",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "groupId", in: "path", required: true },
          { name: "cursor", in: "query", required: false },
          { name: "limit", in: "query", required: false }
        ],
        responses: {
          200: { description: "OK" },
          403: { description: "Not a group member" }
        }
      },
      post: {
        tags: ["Chat"],
        summary: "Create a fallback REST chat message",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "groupId", in: "path", required: true }],
        requestBody: { required: true },
        responses: {
          201: { description: "Created" },
          422: { description: "Validation failed" }
        }
      }
    },
    "/groups/{groupId}/messages/pinned": {
      get: {
        tags: ["Chat"],
        summary: "List pinned messages for a group",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "groupId", in: "path", required: true }],
        responses: {
          200: { description: "OK" }
        }
      }
    },
    "/groups/{groupId}/messages/{msgId}": {
      delete: {
        tags: ["Chat"],
        summary: "Soft delete a group message",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "groupId", in: "path", required: true },
          { name: "msgId", in: "path", required: true }
        ],
        responses: {
          200: { description: "OK" },
          403: { description: "Cannot delete message" },
          404: { description: "Message not found" }
        }
      }
    },
    "/groups/{groupId}/messages/{msgId}/pin": {
      patch: {
        tags: ["Chat"],
        summary: "Pin or unpin a group message",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "groupId", in: "path", required: true },
          { name: "msgId", in: "path", required: true }
        ],
        requestBody: { required: true },
        responses: {
          200: { description: "OK" },
          403: { description: "Insufficient role" },
          404: { description: "Message not found" }
        }
      }
    },
    "/groups/{groupId}/stats": {
      get: {
        tags: ["Stats"],
        summary: "Get group overview stats",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "groupId", in: "path", required: true },
          { name: "period", in: "query", required: false },
          { name: "from", in: "query", required: false },
          { name: "to", in: "query", required: false }
        ],
        responses: {
          200: { description: "OK" }
        }
      }
    },
    "/groups/{groupId}/stats/by-category": {
      get: {
        tags: ["Stats"],
        summary: "Get group spending by category",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "groupId", in: "path", required: true },
          { name: "period", in: "query", required: false },
          { name: "from", in: "query", required: false },
          { name: "to", in: "query", required: false }
        ],
        responses: {
          200: { description: "OK" }
        }
      }
    },
    "/groups/{groupId}/stats/by-member": {
      get: {
        tags: ["Stats"],
        summary: "Get group spending by member",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "groupId", in: "path", required: true },
          { name: "period", in: "query", required: false },
          { name: "from", in: "query", required: false },
          { name: "to", in: "query", required: false }
        ],
        responses: {
          200: { description: "OK" }
        }
      }
    },
    "/groups/{groupId}/stats/timeline": {
      get: {
        tags: ["Stats"],
        summary: "Get group spending timeline",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "groupId", in: "path", required: true },
          { name: "period", in: "query", required: false },
          { name: "from", in: "query", required: false },
          { name: "to", in: "query", required: false },
          { name: "granularity", in: "query", required: false }
        ],
        responses: {
          200: { description: "OK" }
        }
      }
    },
    "/groups/{groupId}/balances": {
      get: {
        tags: ["Expenses"],
        summary: "Get realtime group balances",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "groupId", in: "path", required: true }],
        responses: {
          200: { description: "OK" }
        }
      }
    },
    "/groups/{groupId}/settlements/suggest": {
      get: {
        tags: ["Expenses"],
        summary: "Get greedy settlement suggestions with receiver bank QR when configured",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "groupId", in: "path", required: true }],
        responses: {
          200: { description: "OK" }
        }
      }
    },
    "/groups/{groupId}/settlements": {
      post: {
        tags: ["Expenses"],
        summary: "Ghi nhận thanh toán nợ",
        description:
          "Trưởng nhóm được ghi nhận thanh toán cho bất kỳ cặp thành viên active nào. Thành viên thường chỉ được ghi nhận khoản thanh toán mà chính họ là người trả (`from_user`).",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "groupId", in: "path", required: true }],
        requestBody: { required: true },
        responses: {
          201: { description: "Đã tạo" },
          403: { description: "Thành viên hiện tại không có quyền ghi nhận khoản thanh toán này" },
          422: { description: "Dữ liệu không hợp lệ" }
        }
      },
      get: {
        tags: ["Expenses"],
        summary: "List settlement history",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "groupId", in: "path", required: true }],
        responses: {
          200: { description: "OK" }
        }
      }
    },
    "/groups/{groupId}/settlements/bank-info/me": {
      get: {
        tags: ["Expenses"],
        summary: "Get my group-scoped settlement bank info",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "groupId", in: "path", required: true }],
        responses: {
          200: { description: "OK" }
        }
      },
      patch: {
        tags: ["Expenses"],
        summary: "Cập nhật tài khoản nhận tiền chia bill của tôi trong nhóm",
        description:
          "Request body chỉ chứa bank_id và account_number. Backend resolve bank_name từ metadata ngân hàng và có thể trả account_name là null.",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "groupId", in: "path", required: true }],
        requestBody: { required: true },
        responses: {
          200: { description: "OK" },
          422: { description: "Validation failed" }
        }
      },
      delete: {
        tags: ["Expenses"],
        summary: "Clear my group-scoped settlement bank info",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "groupId", in: "path", required: true }],
        responses: {
          200: { description: "OK" }
        }
      }
    },
    "/groups/{groupId}/invitations/{invId}": {
      delete: {
        tags: ["Invitations"],
        summary: "Revoke invitation link",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "groupId", in: "path", required: true },
          { name: "invId", in: "path", required: true }
        ],
        responses: {
          204: { description: "No Content" }
        }
      }
    },
    "/groups/{groupId}/leader": {
      patch: {
        tags: ["Groups"],
        summary: "Transfer group leader role without leaving the group",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "groupId", in: "path", required: true }],
        requestBody: { required: true },
        responses: {
          200: { description: "OK" },
          400: { description: "Invalid transfer target" },
          403: { description: "Insufficient role" },
          422: { description: "Validation failed" }
        }
      }
    },
    "/groups/{groupId}/members/{userId}": {
      patch: {
        tags: ["Groups"],
        summary: "Change member role to member or secretary",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "groupId", in: "path", required: true },
          { name: "userId", in: "path", required: true }
        ],
        requestBody: { required: true },
        responses: {
          200: { description: "OK" },
          400: { description: "Cannot change own role" },
          403: { description: "Insufficient role" },
          422: { description: "Validation failed" },
          404: { description: "Member not found" }
        }
      },
      delete: {
        tags: ["Groups"],
        summary: "Kick member from group",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "groupId", in: "path", required: true },
          { name: "userId", in: "path", required: true }
        ],
        responses: {
          200: { description: "OK" },
          400: { description: "Cannot kick self" },
          404: { description: "Member not found" }
        }
      }
    },
    "/invitations/join": {
      post: {
        tags: ["Invitations"],
        summary: "Join a group using an invitation token",
        security: [{ bearerAuth: [] }],
        requestBody: { required: true },
        responses: {
          200: { description: "OK" },
          404: { description: "Invitation not found" },
          409: { description: "Invitation expired or max uses reached" }
        }
      }
    },
    "/invitations/{token}": {
      get: {
        tags: ["Invitations"],
        summary: "Get public invitation preview by token",
        parameters: [{ name: "token", in: "path", required: true }],
        responses: {
          200: { description: "OK" },
          404: { description: "Invitation not found" },
          409: { description: "Invitation expired or max uses reached" }
        }
      }
    },
    "/groups/{groupId}/fund/qr": {
      post: {
        tags: ["Fund"],
        summary: "Lưu tài khoản nhận quỹ đang hoạt động",
        description:
          "Thư ký chỉ gửi bank_id và account_number. Backend resolve bank_name từ metadata ngân hàng, lưu account_name dạng nullable, thay cấu hình QR active và trả webhook URL kèm secret SePay cho nhóm.",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "groupId", in: "path", required: true }],
        requestBody: { required: true },
        responses: {
          201: { description: "Created" },
          403: { description: "Secretary role required" },
          404: { description: "Bank not found" },
          422: { description: "Validation thất bại" },
          502: { description: "Không kết nối được nhà cung cấp ngân hàng" }
        }
      },
      get: {
        tags: ["Fund"],
        summary: "Get current member's dynamic VietQR for a fund campaign",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "groupId", in: "path", required: true },
          { name: "campaign_id", in: "query", required: true }
        ],
        responses: {
          200: { description: "OK" },
          404: { description: "QR not configured or campaign not found" }
        }
      }
    },
    "/webhooks/sepay/{webhookConfigId}": {
      post: {
        tags: ["Webhooks"],
        summary: "Receive SePay webhook notifications for a group fund QR config",
        parameters: [{ name: "webhookConfigId", in: "path", required: true }],
        requestBody: { required: true },
        responses: {
          200: { description: "Processed or ignored safely" },
          401: { description: "Invalid signature or stale timestamp" }
        }
      }
    },
    "/notifications": {
      get: {
        tags: ["Notifications"],
        summary: "List notifications for the authenticated user",
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: "page", in: "query", required: false },
          { name: "limit", in: "query", required: false },
          { name: "unread_only", in: "query", required: false }
        ],
        responses: {
          200: { description: "OK" }
        }
      }
    },
    "/notifications/{notificationId}/read": {
      patch: {
        tags: ["Notifications"],
        summary: "Mark a notification as read",
        security: [{ bearerAuth: [] }],
        parameters: [{ name: "notificationId", in: "path", required: true }],
        responses: {
          200: { description: "OK" },
          404: { description: "Notification not found" }
        }
      }
    },
    "/notifications/read-all": {
      patch: {
        tags: ["Notifications"],
        summary: "Mark all notifications as read",
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: "OK" }
        }
      }
    }
  }
};

module.exports = {
  swaggerUi,
  swaggerDocument
};
