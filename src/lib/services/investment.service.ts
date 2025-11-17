// src/lib/services/investment.service.ts
// Service layer for investment-related database operations

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../../db/database.types";

/**
 * Deletes an investment by ID for the authenticated user.
 * Uses RLS (Row Level Security) to ensure users can only delete their own investments.
 *
 * @param supabase - Supabase client instance with authenticated user context
 * @param userId - ID of the authenticated user (for verification)
 * @param investmentId - UUID of the investment to delete
 * @returns Promise with success status and optional error message
 */
export async function deleteInvestmentById(
  supabase: SupabaseClient<Database>,
  userId: string,
  investmentId: string
): Promise<{ success: boolean; error?: string }> {
  // RLS automatically filters by user_id = auth.uid()
  const { error, count } = await supabase
    .from("investments")
    .delete({ count: "exact" })
    .eq("id", investmentId);

  if (error) {
    console.error("Database error deleting investment:", error);
    return { success: false, error: "Database error" };
  }

  if (count === 0) {
    return { success: false, error: "Investment not found or access denied" };
  }

  return { success: true };
}

