const { z } = require('zod');

const manualConfirmSchema = z.object({
  amount: z.number().positive(),
  note: z.string().trim().max(500).optional()
});

module.exports = {
  manualConfirmSchema
};
