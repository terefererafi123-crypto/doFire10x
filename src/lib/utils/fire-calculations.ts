// src/lib/utils/fire-calculations.ts
// Helper functions for FIRE (Financial Independence, Retire Early) calculations

import type { ISODateString } from "../../types.ts";

/**
 * Calculates the current age in years (with decimal precision) from a birth date.
 * Accounts for the current date, month, and day to provide accurate age calculation.
 *
 * @param birthDate - ISO date string (YYYY-MM-DD) representing the birth date
 * @returns Age in years as a decimal number (e.g., 33.5 for 33 years and 6 months)
 */
export function calculateAge(birthDate: ISODateString): number {
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age + (monthDiff * 30 + (today.getDate() - birth.getDate())) / 365.25;
}

/**
 * Calculates the number of years until FIRE (Financial Independence, Retire Early)
 * based on the FIRE target amount, current invested total, and expected return rate.
 *
 * Formula: years_to_fire = log(fire_target / invested_total) / log(1 + expected_return_pct / 100)
 *
 * @param fireTarget - Target amount needed to achieve FIRE (in PLN)
 * @param investedTotal - Current total invested amount (in PLN)
 * @param expectedReturnPct - Expected annual return percentage (e.g., 7.0 for 7%)
 * @returns Number of years until FIRE, or null if calculation is not possible
 *          (e.g., zero investments, invalid values, or division by zero)
 */
export function calculateYearsToFire(
  fireTarget: number,
  investedTotal: number,
  expectedReturnPct: number
): number | null {
  // Edge case: zero or negative investments
  if (investedTotal <= 0) {
    return null;
  }

  // Edge case: invalid fire target or expected return
  if (fireTarget <= 0 || expectedReturnPct <= -100) {
    return null;
  }

  // Calculate the ratio of target to current investment
  const ratio = fireTarget / investedTotal;
  if (ratio <= 0) {
    return null;
  }

  // Calculate growth rate (1 + expected_return_pct / 100)
  const growthRate = 1 + expectedReturnPct / 100;
  if (growthRate <= 0) {
    return null;
  }

  // Calculate years using logarithmic formula
  // years = log(ratio) / log(growthRate)
  return Math.log(ratio) / Math.log(growthRate);
}

