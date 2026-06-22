const { z } = require("zod");

const createGroupSchema = z.object({
  name: z.string().trim().min(1).max(100),
  description: z.string().trim().max(500).optional(),
  currency: z.string().trim().min(3).max(10).optional().default("VND")
});

const updateGroupSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  description: z.string().trim().max(500).nullable().optional()
});

const leaveGroupSchema = z.object({
  transfer_leader_to: z.string().trim().min(1).optional()
});

const processLeaveRequestSchema = z.object({
  action: z.enum(["approve", "reject"]),
  reason: z.string().trim().max(500).optional()
});

const updateMemberRoleSchema = z.object({
  role: z.enum(["secretary", "member"])
});

const transferLeaderSchema = z.object({
  new_leader_id: z.string().trim().min(1)
});

const deleteGroupSchema = z.object({
  confirm: z.literal(true),
  step: z.enum(["leader", "secretary"])
});

module.exports = {
  createGroupSchema,
  updateGroupSchema,
  leaveGroupSchema,
  processLeaveRequestSchema,
  updateMemberRoleSchema,
  transferLeaderSchema,
  deleteGroupSchema
};
