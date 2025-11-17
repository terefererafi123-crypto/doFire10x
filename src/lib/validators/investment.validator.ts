// src/lib/validators/investment.validator.ts
// Zod schema for validating investment-related parameters

import { z } from "zod";
import type { InvestmentListQuery } from "../../types";

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
  acquired_at_from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format. Expected YYYY-MM-DD").optional(),
  acquired_at_to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format. Expected YYYY-MM-DD").optional(),
  sort: z.enum(["acquired_at_desc", "acquired_at_asc", "amount_desc", "amount_asc"]).optional().default("acquired_at_desc"),
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

