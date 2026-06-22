const express = require("express");

const { buildSuccessResponse } = require("../utils/apiResponse");
const authRoutes = require("../modules/auth/auth.routes");
const banksRoutes = require("../modules/banks/banks.routes");
const groupsRoutes = require("../modules/groups/groups.routes");
const notificationsRoutes = require("../modules/notifications/notifications.routes");
const invitationsController = require("../modules/invitations/invitations.controller");
const { authMiddleware } = require("../middlewares/auth");
const { validate } = require("../middlewares/validate");
const { joinInvitationSchema } = require("../modules/invitations/invitations.schema");

const router = express.Router();

router.get("/health", (_request, response) => {
  response.status(200).json(
    buildSuccessResponse({
      status: "ok",
      service: "splitbill-backend",
      timestamp: new Date().toISOString()
    })
  );
});

router.use("/auth", authRoutes);
router.use("/banks", banksRoutes);
router.use("/groups", groupsRoutes);
router.use("/notifications", notificationsRoutes);
router.get("/invitations/:token", invitationsController.getInvitationPreview);
router.post(
  "/invitations/join",
  authMiddleware,
  validate(joinInvitationSchema),
  invitationsController.joinInvitation
);

module.exports = router;
