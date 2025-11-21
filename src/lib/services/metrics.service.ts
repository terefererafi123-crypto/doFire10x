// src/lib/services/metrics.service.ts
// Service layer for FIRE metrics calculations

import type { MetricsDto, ISODateString } from "../../types.ts";
import { calculateAge, calculateYearsToFire } from "../utils/fire-calculations.ts";

/**
 * Input parameters for FIRE metrics calculation.
 * These values are merged from profile, portfolio, and optional query parameters.
 */
interface FireMetricsInputs {
  monthly_expense: number;
  withdrawal_rate_pct: number;
  expected_return_pct: number;
  invested_total: number;
  birth_date: ISODateString | null;
}

/**
 * Calculates FIRE (Financial Independence, Retire Early) metrics based on user inputs.
 *
 * This function performs runtime calculations and does not persist results to the database.
 * It handles edge cases such as zero investments, missing birth date, and invalid values.
 *
 * @param inputs - Input parameters for FIRE calculations
 * @returns MetricsDto containing inputs, derived values, and time-to-FIRE calculations
 *
 * @example
 * ```typescript
 * const metrics = calculateFireMetrics({
 *   monthly_expense: 4500,
 *   withdrawal_rate_pct: 4.0,
 *   expected_return_pct: 7.0,
 *   invested_total: 34000,
 *   birth_date: "1992-05-12"
 * });
 * ```
 */
export function calculateFireMetrics(inputs: FireMetricsInputs): MetricsDto {
  // Validate: if return rate <= withdrawal rate, FIRE cannot be achieved
  if (inputs.expected_return_pct <= inputs.withdrawal_rate_pct) {
    const result: MetricsDto = {
      inputs: {
        monthly_expense: inputs.monthly_expense,
        withdrawal_rate_pct: inputs.withdrawal_rate_pct,
        expected_return_pct: inputs.expected_return_pct,
        invested_total: inputs.invested_total,
      },
      derived: {
        annual_expense: inputs.monthly_expense * 12,
        fire_target: (inputs.monthly_expense * 12) / (inputs.withdrawal_rate_pct / 100),
        fire_progress: inputs.invested_total / ((inputs.monthly_expense * 12) / (inputs.withdrawal_rate_pct / 100)),
      },
      time_to_fire: {
        years_to_fire: null,
        birth_date: inputs.birth_date,
        current_age: inputs.birth_date ? calculateAge(inputs.birth_date) : null,
        fire_age: null,
      },
      note: "return_rate_too_low",
    };
    return result;
  }

  // Calculate derived metrics
  const annual_expense = inputs.monthly_expense * 12;
  const fire_target = annual_expense / (inputs.withdrawal_rate_pct / 100);
  const fire_progress = inputs.invested_total / fire_target;

  // Calculate time to FIRE
  const years_to_fire = calculateYearsToFire(fire_target, inputs.invested_total, inputs.expected_return_pct);

  // Calculate age-related metrics
  let current_age: number | null = null;
  let fire_age: number | null = null;
  if (inputs.birth_date) {
    current_age = calculateAge(inputs.birth_date);
    if (years_to_fire !== null) {
      fire_age = current_age + years_to_fire;
    }
  }

  // Construct response DTO
  const result: MetricsDto = {
    inputs: {
      monthly_expense: inputs.monthly_expense,
      withdrawal_rate_pct: inputs.withdrawal_rate_pct,
      expected_return_pct: inputs.expected_return_pct,
      invested_total: inputs.invested_total,
    },
    derived: {
      annual_expense,
      fire_target,
      fire_progress,
    },
    time_to_fire: {
      years_to_fire,
      birth_date: inputs.birth_date,
      current_age,
      fire_age,
    },
  };

  // Add note for edge cases
  if (inputs.invested_total <= 0) {
    result.note = "Years to FIRE undefined for zero investments.";
  }

  return result;
}
