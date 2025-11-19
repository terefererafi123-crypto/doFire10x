// src/lib/validators/metrics-query.validator.ts
// Zod schema for validating GET /v1/me/metrics query parameters

import { z } from "zod";

/**
 * Zod schema for validating query parameters for GET /v1/me/metrics endpoint.
 * All parameters are optional and serve as "what-if" overrides for profile and portfolio values.
 *
 * Validation rules:
 * - monthly_expense: must be >= 0
 * - withdrawal_rate_pct: must be >= 0 and <= 100
 * - expected_return_pct: must be > -100 (to prevent division by zero in calculations)
 * - invested_total: must be >= 0
 *
 * @example
 * ```typescript
 * const result = metricsQuerySchema.safeParse({
 *   monthly_expense: "5000",
 *   expected_return_pct: "8.5"
 * });
 * ```
 */
export const metricsQuerySchema = z.object({
  monthly_expense: z.coerce.number().min(0, "Monthly expense must be >= 0").optional(),
  withdrawal_rate_pct: z
    .coerce.number()
    .min(0, "Withdrawal rate must be >= 0")
    .max(100, "Withdrawal rate must be <= 100")
    .optional(),
  expected_return_pct: z
    .coerce.number()
    .gt(-100, "Expected return percentage must be greater than -100")
    .optional(),
  invested_total: z.coerce.number().min(0, "Invested total must be >= 0").optional(),
});

/**
 * TypeScript type inferred from the Zod schema.
 * Represents the validated query parameters for GET /v1/me/metrics.
 */
export type MetricsQueryInput = z.infer<typeof metricsQuerySchema>;



