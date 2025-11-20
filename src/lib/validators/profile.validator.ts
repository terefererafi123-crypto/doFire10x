// src/lib/validators/profile.validator.ts
// Zod schema for validating profile-related parameters

import { z } from "zod";
import type { CreateProfileCommand, UpdateProfileCommand } from "../../types";

/**
 * Zod schema for validating request body for POST /v1/me/profile endpoint.
 *
 * Validation rules:
 * - monthly_expense: required number >= 0, finite (numeric(16,2))
 * - withdrawal_rate_pct: required number in range 0-100, finite
 * - expected_return_pct: required number in range -100 to 1000, finite
 * - birth_date: optional ISO date string (YYYY-MM-DD) or null, must be < today and >= today - 120 years
 *
 * @example
 * ```typescript
 * const result = createProfileSchema.safeParse({
 *   monthly_expense: 4500.00,
 *   withdrawal_rate_pct: 4.00,
 *   expected_return_pct: 7.00,
 *   birth_date: "1992-05-12"
 * });
 * ```
 */
const birthDateSchema = z
  .union([
    z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Birth date must be in YYYY-MM-DD format")
      .refine(
        (date) => {
          const dateObj = new Date(date);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const maxAge = new Date();
          maxAge.setFullYear(today.getFullYear() - 120);
          maxAge.setHours(0, 0, 0, 0);
          return dateObj < today && dateObj >= maxAge;
        },
        { message: "Birth date must be in the past and not older than 120 years" }
      ),
    z.null(),
  ])
  .optional();

export const createProfileSchema = z
  .object({
    monthly_expense: z
      .number()
      .nonnegative("monthly_expense must be >= 0")
      .finite("monthly_expense must be a finite number"),
    withdrawal_rate_pct: z
      .number()
      .min(0, "withdrawal_rate_pct must be >= 0")
      .max(100, "withdrawal_rate_pct must be <= 100")
      .finite("withdrawal_rate_pct must be a finite number"),
    expected_return_pct: z
      .number()
      .min(-100, "expected_return_pct must be >= -100")
      .max(1000, "expected_return_pct must be <= 1000")
      .finite("expected_return_pct must be a finite number"),
    birth_date: birthDateSchema,
  })
  .strict(); // Reject unknown fields (causes 400 bad_request)

/**
 * TypeScript type inferred from the Zod schema.
 * Represents the validated create command for profile endpoints.
 */
export type CreateProfileSchemaType = z.infer<typeof createProfileSchema>;

/**
 * Validates request body for POST /v1/me/profile endpoint.
 *
 * @param body - Raw request body (unknown type, typically from JSON.parse)
 * @returns Validation result with validated CreateProfileCommand or errors
 *
 * @example
 * ```typescript
 * const result = validateCreateProfile(body);
 * if (result.success) {
 *   // Use result.data as CreateProfileCommand
 * } else {
 *   // Handle result.error
 * }
 * ```
 */
export function validateCreateProfile(body: unknown) {
  return createProfileSchema.safeParse(body) as z.SafeParseReturnType<unknown, CreateProfileCommand>;
}

/**
 * Zod schema for validating request body for PATCH /v1/me/profile endpoint.
 *
 * Validation rules:
 * - monthly_expense: optional number >= 0, max 9999999999999.99 (numeric(16,2))
 * - withdrawal_rate_pct: optional number in range 0-100, max 2 decimal places
 * - expected_return_pct: optional number in range -100 to 1000
 * - birth_date: optional ISO date string (YYYY-MM-DD), must be < today and >= today - 120 years
 * - At least one field must be provided (enforced by refine)
 *
 * @example
 * ```typescript
 * const result = updateProfileSchema.safeParse({
 *   monthly_expense: 5000.00,
 *   withdrawal_rate_pct: 4.0
 * });
 * ```
 */
export const updateProfileSchema = z
  .object({
    monthly_expense: z
      .number()
      .min(0, "Monthly expense must be greater than or equal to zero")
      .max(9999999999999.99, "Monthly expense exceeds maximum value")
      .optional(),
    withdrawal_rate_pct: z
      .number()
      .min(0, "Withdrawal rate must be greater than or equal to zero")
      .max(100, "Withdrawal rate must be less than or equal to 100")
      .refine(
        (val) => {
          // Check if value has at most 2 decimal places
          const decimalPlaces = (val.toString().split(".")[1] || "").length;
          return decimalPlaces <= 2;
        },
        { message: "Withdrawal rate must have at most 2 decimal places" }
      )
      .optional(),
    expected_return_pct: z
      .number()
      .min(-100, "Expected return must be greater than or equal to -100")
      .max(1000, "Expected return must be less than or equal to 1000")
      .optional(),
    birth_date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format. Expected YYYY-MM-DD")
      .refine(
        (date) => {
          const dateObj = new Date(date);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          return dateObj < today;
        },
        { message: "Birth date must be in the past" }
      )
      .refine(
        (date) => {
          const dateObj = new Date(date);
          const today = new Date();
          const minDate = new Date(today);
          minDate.setFullYear(today.getFullYear() - 120);
          return dateObj >= minDate;
        },
        { message: "Birth date must be within the last 120 years" }
      )
      .optional(),
  })
  .strict() // Reject unknown fields (causes 400 bad_request)
  .refine(
    (data) => {
      // Check if at least one field is provided (excluding undefined values)
      return Object.keys(data).some((key) => data[key as keyof typeof data] !== undefined);
    },
    { message: "At least one field must be provided for update" }
  );

/**
 * TypeScript type inferred from the Zod schema.
 * Represents the validated update command for profile endpoints.
 */
export type UpdateProfileSchemaType = z.infer<typeof updateProfileSchema>;

/**
 * Validates request body for PATCH /v1/me/profile endpoint.
 *
 * @param body - Raw request body (unknown type, typically from JSON.parse)
 * @returns Validation result with validated UpdateProfileCommand or errors
 *
 * @example
 * ```typescript
 * const result = validateUpdateProfile(body);
 * if (result.success) {
 *   // Use result.data as UpdateProfileCommand
 * } else {
 *   // Handle result.error
 * }
 * ```
 */
export function validateUpdateProfile(body: unknown) {
  return updateProfileSchema.safeParse(body) as z.SafeParseReturnType<unknown, UpdateProfileCommand>;
}
