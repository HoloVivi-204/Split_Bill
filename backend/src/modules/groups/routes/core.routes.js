function registerGroupCoreRoutes(router, deps) {
  const {
    authMiddleware,
    groupMembershipMiddleware,
    roleCheck,
    validate,
    groupsController,
    schemas,
  } = deps;

  router.post('/', authMiddleware, validate(schemas.createGroupSchema), groupsController.createGroup);
  router.get('/', authMiddleware, groupsController.listGroups);
  router.get('/conversations', authMiddleware, groupsController.listGroupConversations);
  router.get('/:id', authMiddleware, groupMembershipMiddleware, groupsController.getGroupDetail);
  router.get('/:id/members', authMiddleware, groupMembershipMiddleware, groupsController.listGroupMembers);
  router.patch(
    '/:id',
    authMiddleware,
    groupMembershipMiddleware,
    roleCheck('leader'),
    validate(schemas.updateGroupSchema),
    groupsController.updateGroup
  );
  router.delete(
    '/:id',
    authMiddleware,
    groupMembershipMiddleware,
    validate(schemas.deleteGroupSchema),
    groupsController.deleteGroup
  );
  router.post(
    '/:id/leave',
    authMiddleware,
    groupMembershipMiddleware,
    validate(schemas.leaveGroupSchema),
    groupsController.requestLeaveGroup
  );
  router.get(
    '/:id/leave-requests',
    authMiddleware,
    groupMembershipMiddleware,
    roleCheck('leader'),
    groupsController.listLeaveRequests
  );
  router.patch(
    '/:id/leader',
    authMiddleware,
    groupMembershipMiddleware,
    roleCheck('leader'),
    validate(schemas.transferLeaderSchema),
    groupsController.transferLeader
  );
  router.patch(
    '/:id/leave-requests/:requestId',
    authMiddleware,
    groupMembershipMiddleware,
    roleCheck('leader'),
    validate(schemas.processLeaveRequestSchema),
    groupsController.processLeaveRequest
  );
}

module.exports = { registerGroupCoreRoutes };
