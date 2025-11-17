// src/lib/auth/helpers.ts
// Authentication helper functions

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../../db/database.types.ts";
import type { User } from "@supabase/supabase-js";

/**
 * Retrieves the authenticated user from the Supabase client.
 * Verifies the JWT token and returns the user if valid.
 *
 * This function is used as a guard clause in API routes to ensure
 * that only authenticated users can access protected endpoints.
 *
 * @param supabase - Supabase client instance with JWT token in headers
 * @returns Promise resolving to User object if authenticated, null otherwise
 *
 * @example
 * ```typescript
 * const user = await getAuthenticatedUser(locals.supabase);
 * if (!user) {
 *   return errorResponse({ code: 'unauthorized', message: '...' }, 401);
 * }
 * ```
 */
export async function getAuthenticatedUser(
  supabase: SupabaseClient<Database>
): Promise<User | null> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  return user;
}

