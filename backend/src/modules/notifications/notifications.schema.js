const { z } = require('zod');

const listNotificationsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(50).optional().default(20),
  unread_only: z.coerce.boolean().optional().default(false)
});

module.exports = {
  listNotificationsQuerySchema
};
