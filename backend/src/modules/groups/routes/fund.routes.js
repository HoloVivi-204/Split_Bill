function registerFundCampaignRoutes(router, deps) {
  const {
    authMiddleware,
    groupMembershipMiddleware,
    roleCheck,
    validate,
    campaignsController,
    contributionsController,
    schemas,
  } = deps;

  router.post(
    '/:id/fund/campaigns',
    authMiddleware,
    groupMembershipMiddleware,
    roleCheck('leader'),
    validate(schemas.createCampaignSchema),
    campaignsController.createCampaign
  );
  router.get(
    '/:id/fund/campaigns',
    authMiddleware,
    groupMembershipMiddleware,
    validate(schemas.listCampaignsQuerySchema, 'query'),
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
    validate(schemas.updateCampaignSchema),
    campaignsController.updateCampaign
  );
  router.delete(
    '/:id/fund/campaigns/:cId',
    authMiddleware,
    groupMembershipMiddleware,
    roleCheck('leader'),
    validate(schemas.mutateCampaignSchema),
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
    validate(schemas.manualConfirmSchema),
    contributionsController.confirmContribution
  );
  router.get(
    '/:id/fund/campaigns/:cId/contributions/history',
    authMiddleware,
    groupMembershipMiddleware,
    contributionsController.listContributionHistory
  );
}

function registerFundQrAndSpendingRoutes(router, deps) {
  const {
    authMiddleware,
    groupMembershipMiddleware,
    roleCheck,
    upload,
    validate,
    qrController,
    spendingsController,
    schemas,
  } = deps;

  router.post(
    '/:id/fund/qr',
    authMiddleware,
    groupMembershipMiddleware,
    roleCheck('secretary'),
    validate(schemas.createQrSchema),
    qrController.createQr
  );
  router.get(
    '/:id/fund/qr',
    authMiddleware,
    groupMembershipMiddleware,
    validate(schemas.getQrQuerySchema, 'query'),
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
    validate(schemas.createSpendingSchema),
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
    validate(schemas.updateSpendingSchema),
    spendingsController.updateSpending
  );
  router.delete(
    '/:id/fund/spendings/:sId',
    authMiddleware,
    groupMembershipMiddleware,
    roleCheck('leader'),
    spendingsController.deleteSpending
  );
}

function registerFundBalanceRoute(router, deps) {
  const {
    authMiddleware,
    groupMembershipMiddleware,
    spendingsController,
  } = deps;

  router.get(
    '/:id/fund/balance',
    authMiddleware,
    groupMembershipMiddleware,
    spendingsController.getFundBalance
  );
}

module.exports = {
  registerFundBalanceRoute,
  registerFundCampaignRoutes,
  registerFundQrAndSpendingRoutes,
};
