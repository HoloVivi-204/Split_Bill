function registerInvitationCreateRoutes(router, deps) {
  const {
    authMiddleware,
    groupMembershipMiddleware,
    roleCheck,
    validate,
    invitationsController,
    schemas,
  } = deps;

  router.post(
    '/:id/invitations',
    authMiddleware,
    groupMembershipMiddleware,
    roleCheck('leader'),
    validate(schemas.createInvitationSchema),
    invitationsController.createInvitation
  );
}

function registerInvitationManagementRoutes(router, deps) {
  const {
    authMiddleware,
    groupMembershipMiddleware,
    roleCheck,
    groupsController,
    invitationsController,
  } = deps;

  router.get(
    '/:id/invitations',
    authMiddleware,
    groupMembershipMiddleware,
    roleCheck('leader'),
    invitationsController.listInvitations
  );
  router.delete(
    '/:id/invitations/:invId',
    authMiddleware,
    groupMembershipMiddleware,
    roleCheck('leader'),
    groupsController.revokeInvitation
  );
}

module.exports = {
  registerInvitationCreateRoutes,
  registerInvitationManagementRoutes,
};
