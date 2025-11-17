// src/lib/services/investment.service.ts
// Service layer for investment-related database operations

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../../db/database.types";
import type { InvestmentDto } from "../../types";
import { toInvestmentDto } from "../../types";

/**
 * Retrieves an investment by ID for the authenticated user.
 * Uses RLS (Row Level Security) to ensure users can only access their own investments.
 *
 * @param id - UUID of the investment to retrieve
 * @param supabase - Supabase client instance with authenticated user context
 * @returns Promise resolving to InvestmentDto if found, null if not found or access denied
 * @throws Error if database operation fails unexpectedly
 */
export async function getInvestmentById(
  id: string,
  supabase: SupabaseClient<Database>
): Promise<InvestmentDto | null> {
  // RLS automatically filters by user_id = auth.uid()
  const { data, error } = await supabase
    .from("investments")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    // If error is "not found" (PGRST116), return null
    if (error.code === "PGRST116") {
      return null;
    }
    // Other errors are unexpected and should be thrown
    throw error;
  }

  if (!data) {
    return null;
  }

  // Convert DB row to DTO (removes user_id)
  return toInvestmentDto(data);
}

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

