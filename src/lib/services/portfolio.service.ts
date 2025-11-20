// src/lib/services/portfolio.service.ts
// Service layer for portfolio aggregation operations

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../../db/database.types.ts";
import type { PortfolioAggDto } from "../../types.ts";
import { toPortfolioAggDto } from "../../types.ts";

/**
 * Retrieves portfolio aggregation data for a specific user.
 * Uses RLS (Row Level Security) to ensure users can only access their own portfolio data.
 *
 * If the user has no investments (view returns null), this function returns a zero-filled
 * PortfolioAggDto with the user_id set to the provided userId.
 *
 * @param supabase - Supabase client instance with authenticated user context
 * @param userId - ID of the authenticated user
 * @returns Promise resolving to PortfolioAggDto containing aggregated portfolio data
 * @throws Error if database query fails (excluding "not found" case)
 *
 * @example
 * ```typescript
 * const portfolio = await getPortfolioAggByUserId(supabase, user.id);
 * console.log(portfolio.total_amount); // Total invested amount
 * ```
 */
export async function getPortfolioAggByUserId(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<PortfolioAggDto> {
  // RLS automatically filters by user_id = auth.uid()
  const { data, error } = await supabase.from("v_investments_agg").select("*").eq("user_id", userId).maybeSingle();

  // Handle database errors (excluding "not found" which is expected for zero investments)
  if (error && error.code !== "PGRST116") {
    throw error;
  }

  // If portfolio doesn't exist (no investments), return zero-filled DTO
  if (!data) {
    return {
      user_id: userId,
      total_amount: 0,
      sum_stock: 0,
      sum_etf: 0,
      sum_bond: 0,
      sum_cash: 0,
      share_stock: 0,
      share_etf: 0,
      share_bond: 0,
      share_cash: 0,
    };
  }

  // Convert DB row to DTO (handles null values by zeroing them)
  return toPortfolioAggDto(data);
}
