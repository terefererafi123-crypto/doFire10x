// src/lib/auth/helpers.ts
// Authentication helper functions

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../../db/database.types.ts";
import type { User } from "@supabase/supabase-js";
import type { Redirect } from "astro";

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
export async function getAuthenticatedUser(supabase: SupabaseClient<Database>): Promise<User | null> {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return null;
  }

  return user;
}

/**
 * Requires authentication for an Astro page.
 *
 * This function provides a defense-in-depth mechanism for protecting Astro pages.
 * The primary protection is handled by middleware (src/middleware/index.ts), which
 * redirects unauthenticated users to /login?error=session_expired.
 *
 * This helper function can be used in page components as an additional safeguard
 * to ensure that the user is authenticated before rendering the page content.
 *
 * Note: In practice, middleware will handle most cases. This function serves as
 * a safety net and makes the protection intent explicit in the page code.
 *
 * @param user - User object from Astro.locals.user (set by middleware)
 * @param redirectPath - Optional custom redirect path (defaults to '/login')
 * @returns Redirect response if user is not authenticated, null otherwise
 *
 * @example
 * ```astro
 * ---
 * import { requireAuth } from '../lib/auth/helpers';
 *
 * const redirect = requireAuth(Astro.locals.user);
 * if (redirect) return redirect;
 * ---
 *
 * <h1>Protected Page</h1>
 * ```
 */
export function requireAuth(user: { email: string; id: string } | undefined, redirectPath = "/login"): Redirect | null {
  if (!user) {
    // Redirect to login with error message indicating session expired
    // Using Response with 302 status for redirect
    return new Response(null, {
      status: 302,
      headers: {
        Location: `${redirectPath}?error=session_expired`,
      },
    }) as Redirect;
  }

  return null;
}
