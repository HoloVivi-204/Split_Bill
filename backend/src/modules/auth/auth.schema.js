const { z } = require("zod");

const emailSchema = z.string().trim().email().transform((value) => value.toLowerCase());
const passwordSchema = z.string().min(8).max(128);
const displayNameSchema = z
  .string()
  .trim()
  .min(1)
  .max(50)
  .regex(/^[^\u0000-\u001F<>`$\\\/]+$/u, "Tên hiển thị không hợp lệ");

const registerSchema = z
  .object({
    email: emailSchema,
    password: passwordSchema,
    confirm_password: z.string()
  })
  .superRefine((value, context) => {
    if (value.password !== value.confirm_password) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["confirm_password"],
        message: "Confirm password phai khop voi password"
      });
    }
  });

const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1),
  remember_me: z.boolean().optional().default(false)
});

const displayNameUpdateSchema = z.object({
  display_name: displayNameSchema
});

const profileUpdateSchema = z.object({
  display_name: displayNameSchema
});

const changePasswordSchema = z
  .object({
    current_password: z.string().min(1),
    new_password: passwordSchema,
    confirm_new_password: z.string()
  })
  .superRefine((value, context) => {
    if (value.new_password !== value.confirm_new_password) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["confirm_new_password"],
        message: "Confirm new password phai khop voi new password"
      });
    }
  });

const recoverSchema = z
  .object({
    email: emailSchema,
    recovery_code: z
      .string()
      .trim()
      .regex(/^[A-Z0-9]{4}-[A-Z0-9]{4}$/),
    new_password: passwordSchema,
    confirm_new_password: z.string()
  })
  .superRefine((value, context) => {
    if (value.new_password !== value.confirm_new_password) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["confirm_new_password"],
        message: "Confirm new password phai khop voi new password"
      });
    }
  });

const regenerateRecoveryCodesSchema = z.object({
  password: z.string().min(1)
});

module.exports = {
  registerSchema,
  loginSchema,
  displayNameUpdateSchema,
  profileUpdateSchema,
  changePasswordSchema,
  recoverSchema,
  regenerateRecoveryCodesSchema
};
