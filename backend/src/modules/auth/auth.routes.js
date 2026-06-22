const express = require("express");

const { authMiddleware } = require("../../middlewares/auth");
const { upload } = require("../../middlewares/upload");
const {
  loginRateLimiter,
  registerRateLimiter
} = require("../../middlewares/rateLimit");
const { validate } = require("../../middlewares/validate");
const authController = require("./auth.controller");
const {
  registerSchema,
  loginSchema,
  displayNameUpdateSchema,
  profileUpdateSchema,
  changePasswordSchema,
  recoverSchema,
  regenerateRecoveryCodesSchema
} = require("./auth.schema");

const router = express.Router();

router.post("/register", registerRateLimiter, validate(registerSchema), authController.register);
router.post("/login", loginRateLimiter, validate(loginSchema), authController.login);
router.post("/refresh", authController.refresh);
router.post("/logout", authMiddleware, authController.logout);
router.post("/recover", loginRateLimiter, validate(recoverSchema), authController.recover);
router.get("/me", authMiddleware, authController.getMe);
router.patch("/me", authMiddleware, validate(profileUpdateSchema), authController.updateProfile);
router.delete("/me", authMiddleware, authController.deleteAccount);
router.patch(
  "/me/display-name",
  authMiddleware,
  validate(displayNameUpdateSchema),
  authController.updateDisplayName
);
router.patch(
  "/me/password",
  authMiddleware,
  validate(changePasswordSchema),
  authController.changePassword
);
router.post("/me/avatar", authMiddleware, upload.single("avatar"), authController.uploadAvatar);
router.delete("/me/avatar", authMiddleware, authController.deleteAvatar);
router.get("/recovery-codes", authMiddleware, authController.getRecoveryCodes);
router.post(
  "/recovery-codes/regenerate",
  authMiddleware,
  validate(regenerateRecoveryCodesSchema),
  authController.regenerateRecoveryCodes
);

module.exports = router;
