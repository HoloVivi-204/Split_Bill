const { z } = require("zod");

const createInvitationSchema = z.object({
  expires_at: z.string().datetime().nullable().optional(),
  max_uses: z.number().int().positive().nullable().optional()
});

const joinInvitationSchema = z.object({
  token: z.string().trim().min(6)
});

module.exports = {
  createInvitationSchema,
  joinInvitationSchema
};
