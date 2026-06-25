function registerStatsRoutes(router, deps) {
  const {
    authMiddleware,
    groupMembershipMiddleware,
    validate,
    statsController,
    schemas,
  } = deps;

  router.get(
    '/:id/stats',
    authMiddleware,
    groupMembershipMiddleware,
    validate(schemas.groupStatsQuerySchema, 'query'),
    statsController.getGroupOverview
  );
  router.get(
    '/:id/stats/by-category',
    authMiddleware,
    groupMembershipMiddleware,
    validate(schemas.groupStatsQuerySchema, 'query'),
    statsController.getStatsByCategory
  );
  router.get(
    '/:id/stats/by-member',
    authMiddleware,
    groupMembershipMiddleware,
    validate(schemas.groupStatsQuerySchema, 'query'),
    statsController.getStatsByMember
  );
  router.get(
    '/:id/stats/timeline',
    authMiddleware,
    groupMembershipMiddleware,
    validate(schemas.timelineStatsQuerySchema, 'query'),
    statsController.getStatsTimeline
  );
}

module.exports = { registerStatsRoutes };
