const express = require('express');

const { authMiddleware } = require('../../middlewares/auth');
const { groupMembershipMiddleware } = require('../../middlewares/groupMembership');
const { roleCheck } = require('../../middlewares/roleCheck');
const { validate } = require('../../middlewares/validate');
const { upload } = require('../../middlewares/upload');
const groupsController = require('./groups.controller');
const invitationsController = require('../invitations/invitations.controller');
const expensesController = require('../expenses/expenses.controller');
const settlementsController = require('../settlements/settlements.controller');
const campaignsController = require('../fund/campaigns.controller');
const contributionsController = require('../fund/contributions.controller');
const qrController = require('../fund/qr.controller');
const spendingsController = require('../fund/spendings.controller');
const chatController = require('../chat/chat.controller');
const statsController = require('../stats/stats.controller');
const {
  createGroupSchema,
  updateGroupSchema,
  leaveGroupSchema,
  processLeaveRequestSchema,
  transferLeaderSchema,
  updateMemberRoleSchema,
  deleteGroupSchema,
} = require('./groups.schema');
const { createInvitationSchema } = require('../invitations/invitations.schema');
const {
  createExpenseSchema,
  listExpensesQuerySchema,
  updateExpenseSchema,
} = require('../expenses/expenses.schema');
const {
  createSettlementSchema,
  settlementBankInfoSchema,
} = require('../settlements/settlements.schema');
const {
  createCampaignSchema,
  listCampaignsQuerySchema,
  updateCampaignSchema,
  mutateCampaignSchema,
} = require('../fund/campaigns.schema');
const { manualConfirmSchema } = require('../fund/contributions.schema');
const { createQrSchema, getQrQuerySchema } = require('../fund/qr.schema');
const { createSpendingSchema, updateSpendingSchema } = require('../fund/spendings.schema');
const {
  addChatParticipantSchema,
  createMessageSchema,
  listMessagesQuerySchema,
  pinMessageSchema,
  updateChatParticipantSchema,
} = require('../chat/chat.schema');
const { groupStatsQuerySchema, timelineStatsQuerySchema } = require('../stats/stats.schema');
const { normalizeExpensePayload } = require('../expenses/expenses.payload');
const { registerChatRoutes } = require('./routes/chat.routes');
const { registerExpenseMutationRoutes, registerExpenseReadRoutes } = require('./routes/expenses.routes');
const {
  registerFundBalanceRoute,
  registerFundCampaignRoutes,
  registerFundQrAndSpendingRoutes,
} = require('./routes/fund.routes');
const { registerGroupCoreRoutes } = require('./routes/core.routes');
const {
  registerInvitationCreateRoutes,
  registerInvitationManagementRoutes,
} = require('./routes/invitations.routes');
const { registerMemberManagementRoutes } = require('./routes/members.routes');
const { registerSettlementRoutes } = require('./routes/settlements.routes');
const { registerStatsRoutes } = require('./routes/stats.routes');

const router = express.Router();
const routeDependencies = {
  authMiddleware,
  campaignsController,
  chatController,
  contributionsController,
  expensesController,
  groupMembershipMiddleware,
  groupsController,
  invitationsController,
  normalizeExpensePayload,
  qrController,
  roleCheck,
  schemas: {
    addChatParticipantSchema,
    createCampaignSchema,
    createExpenseSchema,
    createGroupSchema,
    createInvitationSchema,
    createMessageSchema,
    createQrSchema,
    createSettlementSchema,
    createSpendingSchema,
    deleteGroupSchema,
    getQrQuerySchema,
    groupStatsQuerySchema,
    leaveGroupSchema,
    listCampaignsQuerySchema,
    listExpensesQuerySchema,
    listMessagesQuerySchema,
    manualConfirmSchema,
    mutateCampaignSchema,
    pinMessageSchema,
    processLeaveRequestSchema,
    settlementBankInfoSchema,
    timelineStatsQuerySchema,
    transferLeaderSchema,
    updateCampaignSchema,
    updateChatParticipantSchema,
    updateExpenseSchema,
    updateGroupSchema,
    updateMemberRoleSchema,
    updateSpendingSchema,
  },
  settlementsController,
  spendingsController,
  statsController,
  upload,
  validate,
};

registerGroupCoreRoutes(router, routeDependencies);
registerInvitationCreateRoutes(router, routeDependencies);
registerExpenseReadRoutes(router, routeDependencies);
registerSettlementRoutes(router, routeDependencies);
registerFundCampaignRoutes(router, routeDependencies);
registerFundQrAndSpendingRoutes(router, routeDependencies);
registerChatRoutes(router, routeDependencies);
registerFundBalanceRoute(router, routeDependencies);
registerStatsRoutes(router, routeDependencies);
registerExpenseMutationRoutes(router, routeDependencies);
registerInvitationManagementRoutes(router, routeDependencies);
registerMemberManagementRoutes(router, routeDependencies);

module.exports = router;
