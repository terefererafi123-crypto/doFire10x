// src/lib/services/profile.service.ts
// Service layer for profile-related database operations

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../../db/database.types.ts";
import type { ProfileDto } from "../../types.ts";
import type { Tables } from "../../db/database.types.ts";

type DbProfileRow = Tables<"profiles">;

/**
 * Retrieves a user profile by user ID.
 * Uses RLS (Row Level Security) to ensure users can only access their own profile.
 *
 * @param supabase - Supabase client instance with authenticated user context
 * @param userId - ID of the authenticated user
 * @returns Promise resolving to ProfileDto if found, null otherwise
 * @throws Error if database query fails
 *
 * @example
 * ```typescript
 * const profile = await getProfileByUserId(supabase, user.id);
 * if (!profile) {
 *   return errorResponse({ code: 'not_found', message: 'profile_not_found' }, 404);
 * }
 * ```
 */
export async function getProfileByUserId(
  supabase: SupabaseClient<Database>,
  userId: string
): Promise<ProfileDto | null> {
  // RLS automatically filters by user_id = auth.uid()
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("user_id", userId)
    .single();

  if (error) {
    // PGRST116 is the code for "not found" (no rows returned)
    if (error.code === "PGRST116") {
      return null;
    }
    throw error;
  }

  if (!data) {
    return null;
  }

  // Map DB row to DTO (they have the same structure, but this ensures type safety)
  const profile: ProfileDto = {
    id: data.id,
    user_id: data.user_id,
    monthly_expense: data.monthly_expense,
    withdrawal_rate_pct: data.withdrawal_rate_pct,
    expected_return_pct: data.expected_return_pct,
    birth_date: data.birth_date,
    created_at: data.created_at,
    updated_at: data.updated_at,
  };

  return profile;
}

