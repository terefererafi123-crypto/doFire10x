import { z } from "zod";
import { emailSchema, passwordSchema } from "./common.schemas";

/**
 * Login form schema
 */
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Pole hasła jest wymagane"),
});

export type LoginFormData = z.infer<typeof loginSchema>;

/**
 * Registration form schema with password confirmation
 */
export const registerSchema = z
  .object({
    email: emailSchema,
    password: passwordSchema(6),
    confirmPassword: z.string().min(1, "Pole potwierdzenia hasła jest wymagane"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Hasła nie są identyczne",
    path: ["confirmPassword"],
  });

export type RegisterFormData = z.infer<typeof registerSchema>;

/**
 * Forgot password form schema (email only)
 */
export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

/**
 * Reset password form schema with password confirmation
 */
export const resetPasswordSchema = z
  .object({
    password: passwordSchema(6),
    confirmPassword: z.string().min(1, "Pole potwierdzenia hasła jest wymagane"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Hasła nie są identyczne",
    path: ["confirmPassword"],
  });

export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

