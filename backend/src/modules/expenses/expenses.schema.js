const { z } = require("zod");

const expenseCategories = [
  "food",
  "transport",
  "accommodation",
  "entertainment",
  "shopping",
  "other"
];

const splitTypes = ["equal", "custom", "percentage"];

const expenseSplitSchema = z.object({
  user_id: z.string().trim().min(1),
  amount: z.number().finite().optional(),
  percentage: z.number().finite().optional()
});

const createExpenseSchema = z.object({
  title: z.string().trim().min(1).max(200),
  amount: z.number().finite(),
  paid_by: z.string().trim().min(1),
  category: z.enum(expenseCategories),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  split_type: z.enum(splitTypes),
  note: z.string().trim().max(1000).optional(),
  splits: z.array(expenseSplitSchema).optional()
});

const updateExpenseSchema = z
  .object({
    title: z.string().trim().min(1).max(200).optional(),
    amount: z.number().finite().optional(),
    paid_by: z.string().trim().min(1).optional(),
    category: z.enum(expenseCategories).optional(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    note: z.string().max(1000).optional(),
    split_type: z.enum(splitTypes).optional(),
    splits: z.array(expenseSplitSchema).optional()
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: "Phải có ít nhất một trường cần cập nhật"
  });

const listExpensesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(50).optional().default(20),
  category: z.enum(expenseCategories).optional(),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  paid_by: z.string().trim().min(1).optional()
});

module.exports = {
  createExpenseSchema,
  updateExpenseSchema,
  listExpensesQuerySchema
};
