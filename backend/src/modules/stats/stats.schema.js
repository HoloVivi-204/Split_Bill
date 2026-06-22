const { z } = require('zod');

const statsPeriods = ['7d', '30d', '90d', 'custom'];
const granularities = ['day', 'week', 'month'];

const basePeriodShape = {
  period: z.enum(statsPeriods).optional().default('30d'),
  from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()
};

function withCustomPeriodValidation(schema) {
  return schema.superRefine((value, context) => {
    if (value.period === 'custom' && (!value.from || !value.to)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'from va to la bat buoc khi period=custom',
        path: ['period']
      });
    }
  });
}

const groupStatsQuerySchema = withCustomPeriodValidation(z.object(basePeriodShape));

const timelineStatsQuerySchema = withCustomPeriodValidation(
  z.object({
    ...basePeriodShape,
    granularity: z.enum(granularities).optional().default('day')
  })
);

module.exports = {
  groupStatsQuerySchema,
  timelineStatsQuerySchema
};
