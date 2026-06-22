const { z } = require('zod');

const createSpendingSchema = z.object({
  title: z.string().trim().min(1).max(100),
  amount: z.coerce.number().positive(),
  spent_at: z.string().trim().min(1),
  note: z.string().trim().max(500).optional()
});

const updateSpendingSchema = z.object({
  title: z.string().trim().min(1).max(100).optional(),
  amount: z.coerce.number().positive().optional(),
  spent_at: z.string().trim().min(1).optional(),
  note: z.string().trim().max(500).optional()
}).refine(
  (value) => Object.keys(value).length > 0,
  {
    message: 'Cập nhật khoản chi cần ít nhất một trường'
  }
);

module.exports = {
  createSpendingSchema,
  updateSpendingSchema
};
