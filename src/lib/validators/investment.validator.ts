// src/lib/validators/investment.validator.ts
// Zod schema for validating investment-related parameters

import { z } from "zod";
import type { InvestmentListQuery, UpdateInvestmentCommand, CreateInvestmentCommand } from "../../types";

/**
 * Zod schema for validating the investment ID path parameter.
 * Used in GET /v1/investments/{id} and DELETE /v1/investments/{id} endpoints.
 *
 * Validation rules:
 * - id: must be a valid UUID format
 *
 * @example
 * ```typescript
 * const result = investmentIdParamSchema.safeParse({
 *   id: "ef2a1b2c-3d4e-5f6a-7b8c-9d0e1f2a3b4c"
 * });
 * ```
 */
export const investmentIdParamSchema = z.object({
  id: z.string().uuid("Invalid investment ID format"),
});

/**
 * TypeScript type inferred from the Zod schema.
 * Represents the validated path parameters for investment endpoints.
 */
export type InvestmentIdParam = z.infer<typeof investmentIdParamSchema>;

/**
 * Zod schema for validating query parameters for GET /v1/investments endpoint.
 *
 * Validation rules:
 * - limit: integer between 1-200, defaults to 25
 * - cursor: optional string (opaque cursor for pagination)
 * - type: optional enum value (etf, bond, stock, cash)
 * - acquired_at_from: optional ISO date string (YYYY-MM-DD)
 * - acquired_at_to: optional ISO date string (YYYY-MM-DD)
 * - sort: optional enum value, defaults to "acquired_at_desc"
 *
 * @example
 * ```typescript
 * const result = investmentListQuerySchema.safeParse({
 *   limit: 25,
 *   type: "etf",
 *   sort: "acquired_at_desc"
 * });
 * ```
 */
export const investmentListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).optional().default(25),
  cursor: z.string().optional(),
  type: z.enum(["etf", "bond", "stock", "cash"]).optional(),
  acquired_at_from: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format. Expected YYYY-MM-DD")
    .optional(),
  acquired_at_to: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format. Expected YYYY-MM-DD")
    .optional(),
  sort: z
    .enum(["acquired_at_desc", "acquired_at_asc", "amount_desc", "amount_asc"])
    .optional()
    .default("acquired_at_desc"),
});

/**
 * TypeScript type for validated query parameters.
 * This type is defined in src/types.ts to ensure consistency across the codebase.
 * The Zod schema is designed to match this type.
 */
export type { InvestmentListQuery };

/**
 * Validates query parameters for GET /v1/investments endpoint.
 *
 * @param query - Raw query parameters from URL
 * @returns Validation result with validated data or errors
 *
 * @example
 * ```typescript
 * const result = validateInvestmentListQuery({
 *   limit: "25",
 *   type: "etf"
 * });
 * if (result.success) {
 *   // Use result.data
 * } else {
 *   // Handle result.error
 * }
 * ```
 */
export function validateInvestmentListQuery(query: Record<string, string | undefined>) {
  return investmentListQuerySchema.safeParse(query);
}

/**
 * Zod schema for validating request body for PATCH /v1/investments/{id} endpoint.
 *
 * Validation rules:
 * - type: optional enum value (etf, bond, stock, cash)
 * - amount: optional positive number, max 999999999999999.99
 * - acquired_at: optional ISO date string (YYYY-MM-DD), cannot be a future date
 * - notes: optional string (1-1000 chars after trim) or null
 * - At least one field must be provided (enforced by refine)
 *
 * @example
 * ```typescript
 * const result = updateInvestmentSchema.safeParse({
 *   amount: 15000.00,
 *   notes: "Updated notes"
 * });
 * ```
 */
export const updateInvestmentSchema = z
  .object({
    type: z.enum(["etf", "bond", "stock", "cash"]).optional(),
    amount: z
      .number()
      .positive("Amount must be greater than zero")
      .max(999999999999999.99, "Amount exceeds maximum value")
      .optional(),
    acquired_at: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format. Expected YYYY-MM-DD")
      .refine(
        (date) => {
          const dateObj = new Date(date);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          return dateObj <= today;
        },
        { message: "acquired_at cannot be a future date" }
      )
      .optional(),
    notes: z
      .union([
        z
          .string()
          .trim()
          .min(1, "Notes must be at least 1 character after trimming")
          .max(1000, "Notes must not exceed 1000 characters"),
        z.null(),
      ])
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
 * Represents the validated update command for investment endpoints.
 */
export type UpdateInvestmentSchemaType = z.infer<typeof updateInvestmentSchema>;

/**
 * Validates request body for PATCH /v1/investments/{id} endpoint.
 *
 * @param body - Raw request body (unknown type, typically from JSON.parse)
 * @returns Validation result with validated UpdateInvestmentCommand or errors
 *
 * @example
 * ```typescript
 * const result = validateUpdateInvestment(body);
 * if (result.success) {
 *   // Use result.data as UpdateInvestmentCommand
 * } else {
 *   // Handle result.error
 * }
 * ```
 */
export function validateUpdateInvestment(body: unknown) {
  return updateInvestmentSchema.safeParse(body) as z.SafeParseReturnType<unknown, UpdateInvestmentCommand>;
}

/**
 * Zod schema for validating request body for POST /v1/investments endpoint.
 *
 * Validation rules:
 * - type: required enum value (etf, bond, stock, cash)
 * - amount: required positive number, finite, max 999999999999.99
 * - acquired_at: required ISO date string (YYYY-MM-DD), cannot be a future date
 * - notes: optional string (1-1000 chars after trim), empty/whitespace treated as null
 *
 * @example
 * ```typescript
 * const result = createInvestmentSchema.safeParse({
 *   type: "bond",
 *   amount: 5000.00,
 *   acquired_at: "2025-01-10",
 *   notes: "COI 4-letnie"
 * });
 * ```
 */
export const createInvestmentSchema = z
  .object({
    type: z.enum(["etf", "bond", "stock", "cash"]),
    amount: z
      .number()
      .positive("Amount must be greater than zero")
      .finite()
      .max(999999999999.99, "Amount exceeds maximum value"),
    acquired_at: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format. Expected YYYY-MM-DD")
      .transform((value) => ({ value, date: new Date(value + "T00:00:00Z") }))
      .superRefine(({ date }, ctx) => {
        const today = new Date();
        today.setUTCHours(0, 0, 0, 0);
        const dateMidnight = new Date(date);
        dateMidnight.setUTCHours(0, 0, 0, 0);

        if (Number.isNaN(date.getTime())) {
          ctx.addIssue({ code: "custom", message: "invalid_date" });
          return;
        }
        if (dateMidnight > today) {
          ctx.addIssue({ code: "custom", message: "acquired_at_cannot_be_future" });
        }
      })
      .transform(({ value }) => value),
    notes: z.preprocess(
      (val) => {
        // If string is provided and empty after trim, treat as null
        if (typeof val === "string") {
          const trimmed = val.trim();
          return trimmed.length > 0 ? trimmed : null;
        }
        return val;
      },
      z.union([z.string().min(1).max(1000, "Notes must not exceed 1000 characters"), z.null()]).optional()
    ),
  })
  .strict(); // Reject unknown fields

/**
 * TypeScript type inferred from the Zod schema.
 * Represents the validated create command for investment endpoints.
 */
export type CreateInvestmentSchemaType = z.infer<typeof createInvestmentSchema>;

/**
 * Validates request body for POST /v1/investments endpoint.
 *
 * @param body - Raw request body (unknown type, typically from JSON.parse)
 * @returns Validation result with validated CreateInvestmentCommand or errors
 *
 * @example
 * ```typescript
 * const result = validateCreateInvestment(body);
 * if (result.success) {
 *   // Use result.data as CreateInvestmentCommand
 * } else {
 *   // Handle result.error
 * }
 * ```
 */
export function validateCreateInvestment(body: unknown) {
  return createInvestmentSchema.safeParse(body) as z.SafeParseReturnType<unknown, CreateInvestmentCommand>;
}
