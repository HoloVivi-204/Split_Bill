const { z } = require('zod');

const accountLookupSchema = z.object({
  bank_id: z.string().trim().min(1).max(20),
  account_number: z
    .string()
    .trim()
    .min(4)
    .max(32)
    .regex(/^[0-9]+$/, 'Số tài khoản không hợp lệ')
});

module.exports = {
  accountLookupSchema
};
