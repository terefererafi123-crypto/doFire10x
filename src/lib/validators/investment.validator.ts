// src/lib/validators/investment.validator.ts
// Zod schema for validating investment-related parameters

import { z } from "zod";

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

