const { z } = require("zod");

const listMessagesQuerySchema = z.object({
  cursor: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20)
});

const createMessageSchema = z.object({
  content: z
    .string()
    .trim()
    .min(1, "Nội dung không được để trống")
    .max(2000, "Nội dung không được vượt quá 2000 ký tự")
});

const pinMessageSchema = z.object({
  pinned: z.boolean()
});

const updateChatParticipantSchema = z.object({
  is_muted: z.boolean()
});

const addChatParticipantSchema = z.object({
  user_id: z.string().trim().min(1, "Vui lòng chọn thành viên cần thêm vào chat")
});

module.exports = {
  addChatParticipantSchema,
  createMessageSchema,
  listMessagesQuerySchema,
  pinMessageSchema,
  updateChatParticipantSchema
};
