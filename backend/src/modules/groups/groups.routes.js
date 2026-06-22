const express = require("express");

const { authMiddleware } = require("../../middlewares/auth");
const { groupMembershipMiddleware } = require("../../middlewares/groupMembership");
const { roleCheck } = require("../../middlewares/roleCheck");
const { validate } = require("../../middlewares/validate");
const { upload } = require('../../middlewares/upload');
const groupsController = require("./groups.controller");
const invitationsController = require("../invitations/invitations.controller");
const expensesController = require("../expenses/expenses.controller");
const settlementsController = require("../settlements/settlements.controller");
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
  deleteGroupSchema
} = require("./groups.schema");
const { createInvitationSchema } = require("../invitations/invitations.schema");
const {
  createExpenseSchema,
  listExpensesQuerySchema,
  updateExpenseSchema
} = require("../expenses/expenses.schema");
const {
  createSettlementSchema,
  settlementBankInfoSchema
} = require("../settlements/settlements.schema");
const {
  createCampaignSchema,
  listCampaignsQuerySchema,
  updateCampaignSchema,
  mutateCampaignSchema
} = require('../fund/campaigns.schema');
const { manualConfirmSchema } = require('../fund/contributions.schema');
const { createQrSchema, getQrQuerySchema } = require('../fund/qr.schema');
const { createSpendingSchema, updateSpendingSchema } = require('../fund/spendings.schema');
const {
  addChatParticipantSchema,
  createMessageSchema,
  listMessagesQuerySchema,
  pinMessageSchema,
  updateChatParticipantSchema
} = require('../chat/chat.schema');
const { groupStatsQuerySchema, timelineStatsQuerySchema } = require('../stats/stats.schema');
const { normalizeExpensePayload } = require('../expenses/expenses.payload');

const router = express.Router();

router.post("/", authMiddleware, validate(createGroupSchema), groupsController.createGroup);
router.get("/", authMiddleware, groupsController.listGroups);
router.get("/conversations", authMiddleware, groupsController.listGroupConversations);
router.get("/:id", authMiddleware, groupMembershipMiddleware, groupsController.getGroupDetail);
router.get("/:id/members", authMiddleware, groupMembershipMiddleware, groupsController.listGroupMembers);
router.patch(
  "/:id",
  authMiddleware,
  groupMembershipMiddleware,
  roleCheck("leader"),
  validate(updateGroupSchema),
  groupsController.updateGroup
);
router.delete(
  "/:id",
  authMiddleware,
  groupMembershipMiddleware,
  validate(deleteGroupSchema),
  groupsController.deleteGroup
);
router.post(
  "/:id/leave",
  authMiddleware,
  groupMembershipMiddleware,
  validate(leaveGroupSchema),
  groupsController.requestLeaveGroup
);
router.get(
  "/:id/leave-requests",
  authMiddleware,
  groupMembershipMiddleware,
  roleCheck("leader"),
  groupsController.listLeaveRequests
);
router.patch(
  "/:id/leader",
  authMiddleware,
  groupMembershipMiddleware,
  roleCheck("leader"),
  validate(transferLeaderSchema),
  groupsController.transferLeader
);
router.patch(
  "/:id/leave-requests/:requestId",
  authMiddleware,
  groupMembershipMiddleware,
  roleCheck("leader"),
  validate(processLeaveRequestSchema),
  groupsController.processLeaveRequest
);
router.post(
  "/:id/invitations",
  authMiddleware,
  groupMembershipMiddleware,
  roleCheck("leader"),
  validate(createInvitationSchema),
  invitationsController.createInvitation
);
router.post(
  "/:id/expenses",
  authMiddleware,
  groupMembershipMiddleware,
  upload.single('receipt'),
  normalizeExpensePayload,
  validate(createExpenseSchema),
  expensesController.createExpense
);
router.get(
  "/:id/expenses",
  authMiddleware,
  groupMembershipMiddleware,
  validate(listExpensesQuerySchema, "query"),
  expensesController.listExpenses
);
router.get(
  "/:id/expenses/:expId",
  authMiddleware,
  groupMembershipMiddleware,
  expensesController.getExpenseDetail
);
router.get(
  "/:id/balances",
  authMiddleware,
  groupMembershipMiddleware,
  settlementsController.getGroupBalances
);
router.get(
  "/:id/settlements/suggest",
  authMiddleware,
  groupMembershipMiddleware,
  settlementsController.getSettlementSuggestions
);
router.get(
  "/:id/settlements/bank-info/me",
  authMiddleware,
  groupMembershipMiddleware,
  settlementsController.getMySettlementBankInfo
);
router.patch(
  "/:id/settlements/bank-info/me",
  authMiddleware,
  groupMembershipMiddleware,
  validate(settlementBankInfoSchema),
  settlementsController.updateMySettlementBankInfo
);
router.delete(
  "/:id/settlements/bank-info/me",
  authMiddleware,
  groupMembershipMiddleware,
  settlementsController.clearMySettlementBankInfo
);
router.post(
  "/:id/settlements",
  authMiddleware,
  groupMembershipMiddleware,
  validate(createSettlementSchema),
  settlementsController.createSettlement
);
router.get(
  "/:id/settlements",
  authMiddleware,
  groupMembershipMiddleware,
  settlementsController.listSettlements
);
router.post(
  '/:id/fund/campaigns',
  authMiddleware,
  groupMembershipMiddleware,
  roleCheck('leader'),
  validate(createCampaignSchema),
  campaignsController.createCampaign
);
router.get(
  '/:id/fund/campaigns',
  authMiddleware,
  groupMembershipMiddleware,
  validate(listCampaignsQuerySchema, 'query'),
  campaignsController.listCampaigns
);
router.get(
  '/:id/fund/campaigns/:cId',
  authMiddleware,
  groupMembershipMiddleware,
  campaignsController.getCampaignDetail
);
router.patch(
  '/:id/fund/campaigns/:cId',
  authMiddleware,
  groupMembershipMiddleware,
  roleCheck('leader'),
  validate(updateCampaignSchema),
  campaignsController.updateCampaign
);
router.delete(
  '/:id/fund/campaigns/:cId',
  authMiddleware,
  groupMembershipMiddleware,
  roleCheck('leader'),
  validate(mutateCampaignSchema),
  campaignsController.mutateCampaign
);
router.get(
  '/:id/fund/campaigns/:cId/contributions',
  authMiddleware,
  groupMembershipMiddleware,
  roleCheck(['leader', 'secretary']),
  campaignsController.listContributions
);
router.get(
  '/:id/fund/campaigns/:cId/contributions/me',
  authMiddleware,
  groupMembershipMiddleware,
  contributionsController.getMyContribution
);
router.patch(
  '/:id/fund/campaigns/:cId/contributions/:userId',
  authMiddleware,
  groupMembershipMiddleware,
  roleCheck('secretary'),
  validate(manualConfirmSchema),
  contributionsController.confirmContribution
);
router.get(
  '/:id/fund/campaigns/:cId/contributions/history',
  authMiddleware,
  groupMembershipMiddleware,
  contributionsController.listContributionHistory
);
router.post(
  '/:id/fund/qr',
  authMiddleware,
  groupMembershipMiddleware,
  roleCheck('secretary'),
  validate(createQrSchema),
  qrController.createQr
);
router.get(
  '/:id/fund/qr',
  authMiddleware,
  groupMembershipMiddleware,
  validate(getQrQuerySchema, 'query'),
  qrController.getQr
);
router.delete(
  '/:id/fund/qr/:qrId',
  authMiddleware,
  groupMembershipMiddleware,
  roleCheck('secretary'),
  qrController.deleteQr
);
router.post(
  '/:id/fund/spendings',
  authMiddleware,
  groupMembershipMiddleware,
  roleCheck(['leader', 'secretary']),
  upload.single('receipt'),
  validate(createSpendingSchema),
  spendingsController.createSpending
);
router.get(
  '/:id/fund/spendings',
  authMiddleware,
  groupMembershipMiddleware,
  spendingsController.listSpendings
);
router.patch(
  '/:id/fund/spendings/:sId',
  authMiddleware,
  groupMembershipMiddleware,
  roleCheck(['leader', 'secretary']),
  upload.single('receipt'),
  validate(updateSpendingSchema),
  spendingsController.updateSpending
);
router.delete(
  '/:id/fund/spendings/:sId',
  authMiddleware,
  groupMembershipMiddleware,
  roleCheck('leader'),
  spendingsController.deleteSpending
);
router.patch(
  '/:id/chat/me',
  authMiddleware,
  groupMembershipMiddleware,
  validate(updateChatParticipantSchema),
  chatController.updateMyChatSettings
);
router.delete(
  '/:id/chat/me',
  authMiddleware,
  groupMembershipMiddleware,
  chatController.leaveChat
);
router.get(
  '/:id/chat/participants/available',
  authMiddleware,
  groupMembershipMiddleware,
  chatController.listAvailableChatParticipants
);
router.post(
  '/:id/chat/participants',
  authMiddleware,
  groupMembershipMiddleware,
  validate(addChatParticipantSchema),
  chatController.addChatParticipant
);
router.get(
  '/:id/messages/pinned',
  authMiddleware,
  groupMembershipMiddleware,
  chatController.listPinnedMessages
);
router.get(
  '/:id/messages',
  authMiddleware,
  groupMembershipMiddleware,
  validate(listMessagesQuerySchema, 'query'),
  chatController.listMessages
);
router.post(
  '/:id/messages',
  authMiddleware,
  groupMembershipMiddleware,
  validate(createMessageSchema),
  chatController.createMessage
);
router.delete(
  '/:id/messages/:msgId',
  authMiddleware,
  groupMembershipMiddleware,
  chatController.deleteMessage
);
router.patch(
  '/:id/messages/:msgId/pin',
  authMiddleware,
  groupMembershipMiddleware,
  roleCheck(['leader', 'secretary']),
  validate(pinMessageSchema),
  chatController.pinMessage
);
router.get(
  '/:id/fund/balance',
  authMiddleware,
  groupMembershipMiddleware,
  spendingsController.getFundBalance
);
router.get(
  '/:id/stats',
  authMiddleware,
  groupMembershipMiddleware,
  validate(groupStatsQuerySchema, 'query'),
  statsController.getGroupOverview
);
router.get(
  '/:id/stats/by-category',
  authMiddleware,
  groupMembershipMiddleware,
  validate(groupStatsQuerySchema, 'query'),
  statsController.getStatsByCategory
);
router.get(
  '/:id/stats/by-member',
  authMiddleware,
  groupMembershipMiddleware,
  validate(groupStatsQuerySchema, 'query'),
  statsController.getStatsByMember
);
router.get(
  '/:id/stats/timeline',
  authMiddleware,
  groupMembershipMiddleware,
  validate(timelineStatsQuerySchema, 'query'),
  statsController.getStatsTimeline
);
router.patch(
  "/:id/expenses/:expId",
  authMiddleware,
  groupMembershipMiddleware,
  upload.single('receipt'),
  normalizeExpensePayload,
  validate(updateExpenseSchema),
  expensesController.updateExpense
);
router.delete(
  "/:id/expenses/:expId",
  authMiddleware,
  groupMembershipMiddleware,
  expensesController.deleteExpense
);
router.get(
  "/:id/invitations",
  authMiddleware,
  groupMembershipMiddleware,
  roleCheck("leader"),
  invitationsController.listInvitations
);
router.delete(
  "/:id/invitations/:invId",
  authMiddleware,
  groupMembershipMiddleware,
  roleCheck("leader"),
  groupsController.revokeInvitation
);
router.patch(
  "/:id/members/:userId",
  authMiddleware,
  groupMembershipMiddleware,
  roleCheck("leader"),
  validate(updateMemberRoleSchema),
  groupsController.updateMemberRole
);
router.delete(
  "/:id/members/:userId",
  authMiddleware,
  groupMembershipMiddleware,
  roleCheck("leader"),
  groupsController.kickMember
);

module.exports = router;
