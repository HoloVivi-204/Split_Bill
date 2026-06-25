function registerSettlementRoutes(router, deps) {
  const {
    authMiddleware,
    groupMembershipMiddleware,
    validate,
    settlementsController,
    schemas,
  } = deps;

  router.get(
    '/:id/balances',
    authMiddleware,
    groupMembershipMiddleware,
    settlementsController.getGroupBalances
  );
  router.get(
    '/:id/settlements/suggest',
    authMiddleware,
    groupMembershipMiddleware,
    settlementsController.getSettlementSuggestions
  );
  router.get(
    '/:id/settlements/bank-info/me',
    authMiddleware,
    groupMembershipMiddleware,
    settlementsController.getMySettlementBankInfo
  );
  router.patch(
    '/:id/settlements/bank-info/me',
    authMiddleware,
    groupMembershipMiddleware,
    validate(schemas.settlementBankInfoSchema),
    settlementsController.updateMySettlementBankInfo
  );
  router.delete(
    '/:id/settlements/bank-info/me',
    authMiddleware,
    groupMembershipMiddleware,
    settlementsController.clearMySettlementBankInfo
  );
  router.post(
    '/:id/settlements',
    authMiddleware,
    groupMembershipMiddleware,
    validate(schemas.createSettlementSchema),
    settlementsController.createSettlement
  );
  router.get(
    '/:id/settlements',
    authMiddleware,
    groupMembershipMiddleware,
    settlementsController.listSettlements
  );
}

module.exports = { registerSettlementRoutes };
