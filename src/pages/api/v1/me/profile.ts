// src/pages/api/v1/me/profile.ts
// GET /v1/me/profile - User profile endpoint

import type { APIRoute } from "astro";
import { getAuthenticatedUser } from "../../../../lib/auth/helpers.ts";
import { getProfileByUserId } from "../../../../lib/services/profile.service.ts";
import { jsonResponse, errorResponse } from "../../../../lib/api/response.ts";

export const prerender = false;

/**
 * GET /v1/me/profile
 *
 * Retrieves the profile of the currently authenticated user.
 * Uses Row Level Security (RLS) to ensure users can only access their own profile.
 *
 * @returns 200 OK with ProfileDto on success
 * @returns 401 Unauthorized if authentication fails
 * @returns 404 Not Found if profile does not exist
 * @returns 500 Internal Server Error on unexpected errors
 *
 * Headers:
 * - Authorization: Bearer <Supabase-JWT> (required)
 * - Accept-Language: pl-PL | en-US | pl | en (optional, for future localization)
 * - X-Request-Id: <uuid> (optional, for log correlation)
 */
export const GET: APIRoute = async ({ locals, request }) => {
  // 1. Authentication check - early return guard clause
  const user = await getAuthenticatedUser(locals.supabase);
  if (!user) {
    return errorResponse(
      {
        code: "unauthorized",
        message: "Missing or invalid authentication token",
      },
      401
    );
  }

  // 2. Get profile by user ID
  try {
    const profile = await getProfileByUserId(locals.supabase, user.id);

    if (!profile) {
      return errorResponse(
        {
          code: "not_found",
          message: "Profile not found",
        },
        404
      );
    }

    return jsonResponse(profile, 200);
  } catch (error) {
    // Log error with context (X-Request-Id if available)
    const requestId = request.headers.get("X-Request-Id");
    console.error("Error fetching profile:", {
      userId: user.id,
      requestId,
      error: error instanceof Error ? error.message : String(error),
    });

    return errorResponse(
      {
        code: "internal",
        message: "An internal server error occurred",
      },
      500
    );
  }
};

