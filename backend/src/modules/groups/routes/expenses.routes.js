function registerExpenseReadRoutes(router, deps) {
  const {
    authMiddleware,
    groupMembershipMiddleware,
    upload,
    validate,
    normalizeExpensePayload,
    expensesController,
    schemas,
  } = deps;

  router.post(
    '/:id/expenses',
    authMiddleware,
    groupMembershipMiddleware,
    upload.single('receipt'),
    normalizeExpensePayload,
    validate(schemas.createExpenseSchema),
    expensesController.createExpense
  );
  router.get(
    '/:id/expenses',
    authMiddleware,
    groupMembershipMiddleware,
    validate(schemas.listExpensesQuerySchema, 'query'),
    expensesController.listExpenses
  );
  router.get(
    '/:id/expenses/:expId',
    authMiddleware,
    groupMembershipMiddleware,
    expensesController.getExpenseDetail
  );
}

function registerExpenseMutationRoutes(router, deps) {
  const {
    authMiddleware,
    groupMembershipMiddleware,
    upload,
    validate,
    normalizeExpensePayload,
    expensesController,
    schemas,
  } = deps;

  router.patch(
    '/:id/expenses/:expId',
    authMiddleware,
    groupMembershipMiddleware,
    upload.single('receipt'),
    normalizeExpensePayload,
    validate(schemas.updateExpenseSchema),
    expensesController.updateExpense
  );
  router.delete(
    '/:id/expenses/:expId',
    authMiddleware,
    groupMembershipMiddleware,
    expensesController.deleteExpense
  );
}

module.exports = {
  registerExpenseMutationRoutes,
  registerExpenseReadRoutes,
};
