function registerMemberManagementRoutes(router, deps) {
  const {
    authMiddleware,
    groupMembershipMiddleware,
    roleCheck,
    validate,
    groupsController,
    schemas,
  } = deps;

  router.patch(
    '/:id/members/:userId',
    authMiddleware,
    groupMembershipMiddleware,
    roleCheck('leader'),
    validate(schemas.updateMemberRoleSchema),
    groupsController.updateMemberRole
  );
  router.delete(
    '/:id/members/:userId',
    authMiddleware,
    groupMembershipMiddleware,
    roleCheck('leader'),
    groupsController.kickMember
  );
}

module.exports = { registerMemberManagementRoutes };
