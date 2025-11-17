// src/lib/services/profile.service.ts
// Service layer for profile-related database operations

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../../db/database.types.ts";
import type { CreateProfileCommand, ProfileDto, UpdateProfileCommand } from "../../types.ts";
import type { Tables, TablesUpdate } from "../../db/database.types.ts";

type DbProfileRow = Tables<"profiles">;

/**
 * Custom error thrown when a profile is not found or access is denied.
 */
export class ProfileNotFoundError extends Error {
  constructor(userId: string) {
    super(`Profile not found for user: ${userId}`);
    this.name = "ProfileNotFoundError";
  }
}

/**
 * Custom error thrown when a database operation fails unexpectedly.
 */
export class DatabaseError extends Error {
  constructor(message: string, public originalError?: unknown) {
    super(message);
    this.name = "DatabaseError";
  }
}

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

/**
 * Creates a new user profile.
 * Uses RLS (Row Level Security) to ensure users can only create their own profile.
 * The user_id is automatically set from auth.uid() by RLS.
 *
 * @param supabase - Supabase client instance with authenticated user context
 * @param userId - ID of the authenticated user
 * @param command - Profile creation command
 * @returns Promise resolving to created ProfileDto
 * @throws Error with code '23505' if profile already exists (unique constraint violation)
 * @throws Error with code '23514' if data violates CHECK constraints
 * @throws DatabaseError if database operation fails unexpectedly
 *
 * @example
 * ```typescript
 * try {
 *   const profile = await createProfile(supabase, user.id, {
 *     monthly_expense: 4500.00,
 *     withdrawal_rate_pct: 4.00,
 *     expected_return_pct: 7.00,
 *     birth_date: "1992-05-12"
 *   });
 * } catch (error) {
 *   if (error.code === '23505') {
 *     // Handle unique constraint violation (profile already exists)
 *   }
 *   throw error;
 * }
 * ```
 */
export async function createProfile(
  supabase: SupabaseClient<Database>,
  userId: string,
  command: CreateProfileCommand
): Promise<ProfileDto> {
  // RLS automatically ensures user_id = auth.uid()
  // Additional safety: explicitly set user_id (defense in depth)
  const { data, error } = await supabase
    .from("profiles")
    .insert({
      user_id: userId,
      monthly_expense: command.monthly_expense,
      withdrawal_rate_pct: command.withdrawal_rate_pct,
      expected_return_pct: command.expected_return_pct,
      birth_date: command.birth_date || null,
    })
    .select()
    .single();

  if (error) {
    // Re-throw error with code for proper handling in endpoint
    // 23505 = unique constraint violation (profile already exists)
    // 23514 = check constraint violation (data validation failed)
    throw error;
  }

  if (!data) {
    throw new DatabaseError("Failed to create profile: no data returned");
  }

  // Map DB row to DTO
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

/**
 * Builds a database update payload from an UpdateProfileCommand.
 * Only includes fields that are defined in the command (whitelist approach).
 * Formats numeric values to 2 decimal places where appropriate.
 *
 * @param command - Partial profile update command
 * @returns Database update payload
 */
function buildProfileUpdatePayload(
  command: UpdateProfileCommand
): TablesUpdate<"profiles"> {
  const payload: TablesUpdate<"profiles"> = {};

  if (command.monthly_expense !== undefined) {
    // Ensure monthly_expense is formatted to 2 decimal places
    payload.monthly_expense = Number(command.monthly_expense.toFixed(2));
  }

  if (command.withdrawal_rate_pct !== undefined) {
    // Ensure withdrawal_rate_pct is formatted to 2 decimal places
    payload.withdrawal_rate_pct = Number(command.withdrawal_rate_pct.toFixed(2));
  }

  if (command.expected_return_pct !== undefined) {
    // Ensure expected_return_pct is formatted to 2 decimal places
    payload.expected_return_pct = Number(command.expected_return_pct.toFixed(2));
  }

  if (command.birth_date !== undefined) {
    // Allow null to clear birth_date, or string to update
    payload.birth_date = command.birth_date;
  }

  // Always update the updated_at timestamp
  payload.updated_at = new Date().toISOString();

  return payload;
}

/**
 * Updates a user profile by user ID.
 * Uses RLS (Row Level Security) to ensure users can only update their own profile.
 *
 * @param supabase - Supabase client instance with authenticated user context
 * @param userId - ID of the authenticated user
 * @param command - Partial profile update command
 * @returns Promise resolving to updated ProfileDto
 * @throws ProfileNotFoundError if profile does not exist
 * @throws DatabaseError if database operation fails unexpectedly
 *
 * @example
 * ```typescript
 * try {
 *   const updatedProfile = await updateProfile(supabase, user.id, {
 *     monthly_expense: 5000.00,
 *     withdrawal_rate_pct: 4.0
 *   });
 * } catch (error) {
 *   if (error instanceof ProfileNotFoundError) {
 *     return errorResponse({ code: 'not_found', message: 'Profile not found' }, 404);
 *   }
 *   throw error;
 * }
 * ```
 */
export async function updateProfile(
  supabase: SupabaseClient<Database>,
  userId: string,
  command: UpdateProfileCommand
): Promise<ProfileDto> {
  // 1. Verify profile exists and belongs to user (early return guard clause)
  const { data: existing, error: fetchError } = await supabase
    .from("profiles")
    .select("id")
    .eq("user_id", userId)
    .single();

  if (fetchError) {
    // PGRST116 means no rows returned (not found or access denied)
    if (fetchError.code === "PGRST116") {
      throw new ProfileNotFoundError(userId);
    }
    // Other errors are unexpected
    throw new DatabaseError("Failed to verify profile existence", fetchError);
  }

  if (!existing) {
    throw new ProfileNotFoundError(userId);
  }

  // 2. Build update payload (whitelist approach - only provided fields)
  const updatePayload = buildProfileUpdatePayload(command);

  // 3. Execute UPDATE with select to return updated row
  // RLS ensures user can only update their own profile
  // Additional safety: filter by user_id (defense in depth)
  const { data, error } = await supabase
    .from("profiles")
    .update(updatePayload)
    .eq("user_id", userId)
    .select()
    .single();

  if (error) {
    // PGRST116 means no rows returned (shouldn't happen after verification, but handle it)
    if (error.code === "PGRST116") {
      throw new ProfileNotFoundError(userId);
    }
    // Other errors are unexpected
    throw new DatabaseError("Failed to update profile", error);
  }

  if (!data) {
    throw new ProfileNotFoundError(userId);
  }

  // 4. Map DB row to DTO
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

