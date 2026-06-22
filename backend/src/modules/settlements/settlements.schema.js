const { z } = require('zod');

const createSettlementSchema = z.object({
  from_user: z.string().trim().min(1),
  to_user: z.string().trim().min(1),
  amount: z.number().finite(),
  note: z.string().trim().max(1000).optional()
});

const settlementBankInfoSchema = z.object({
  bank_id: z.string().trim().min(1).max(20),
  account_number: z
    .string()
    .trim()
    .min(4)
    .max(32)
    .regex(/^[0-9]+$/, 'Số tài khoản không hợp lệ')
});

module.exports = {
  createSettlementSchema,
  settlementBankInfoSchema
};
