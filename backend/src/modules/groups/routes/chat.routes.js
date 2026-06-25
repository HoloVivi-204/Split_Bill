function registerChatRoutes(router, deps) {
  const {
    authMiddleware,
    groupMembershipMiddleware,
    roleCheck,
    validate,
    chatController,
    schemas,
  } = deps;

  router.patch(
    '/:id/chat/me',
    authMiddleware,
    groupMembershipMiddleware,
    validate(schemas.updateChatParticipantSchema),
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
    validate(schemas.addChatParticipantSchema),
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
    validate(schemas.listMessagesQuerySchema, 'query'),
    chatController.listMessages
  );
  router.post(
    '/:id/messages',
    authMiddleware,
    groupMembershipMiddleware,
    validate(schemas.createMessageSchema),
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
    validate(schemas.pinMessageSchema),
    chatController.pinMessage
  );
}

module.exports = { registerChatRoutes };
