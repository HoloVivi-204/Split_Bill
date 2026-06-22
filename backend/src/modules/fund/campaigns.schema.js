const { z } = require('zod');

const paymentFrequencyEnum = z.enum(['one_time', 'weekly', 'biweekly', 'monthly']);
const campaignStatusEnum = z.enum(['active', 'closed', 'cancelled', 'all']);

const createCampaignSchema = z.object({
  title: z.string().trim().min(1).max(100),
  description: z.string().trim().max(500).optional(),
  amount_per_person: z.number().positive(),
  payment_frequency: paymentFrequencyEnum,
  due_date: z.string().trim().min(1)
});

const listCampaignsQuerySchema = z.object({
  status: campaignStatusEnum.optional().default('active')
});

const updateCampaignSchema = z.object({
  title: z.string().trim().min(1).max(100).optional(),
  description: z.string().trim().max(500).nullable().optional(),
  amount_per_person: z.number().positive().optional(),
  payment_frequency: paymentFrequencyEnum.optional(),
  due_date: z.string().trim().min(1).optional()
});

const mutateCampaignSchema = z.object({
  action: z.enum(['close', 'cancel'])
});

module.exports = {
  createCampaignSchema,
  listCampaignsQuerySchema,
  updateCampaignSchema,
  mutateCampaignSchema
};
