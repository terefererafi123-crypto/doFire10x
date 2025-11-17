// src/pages/api/v1/auth/session.ts
// GET /v1/auth/session - Session verification endpoint

import type { APIRoute } from "astro";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../../../../db/database.types.ts";
import { jsonResponse, errorResponse } from "../../../../lib/api/response.ts";
import type { AuthSessionDto } from "../../../../types.ts";

export const prerender = false;

/**
 * GET /v1/auth/session
 *
 * Verifies the validity of a Supabase JWT token and returns basic session information:
 * user_id, roles, and token issued at timestamp (iat).
 *
 * This endpoint does not query the database - all data comes from the JWT token.
 * Authentication is handled client-side via Supabase magic link, and the backend
 * only verifies the token.
 *
 * @returns 200 OK with AuthSessionDto on success
 * @returns 401 Unauthorized if authentication fails or token is invalid
 * @returns 500 Internal Server Error on unexpected errors
 *
 * Headers:
 * - Authorization: Bearer <Supabase-JWT> (required)
 * - X-Request-Id: <uuid> (optional, for log correlation)
 */
export const GET: APIRoute = async ({ request }) => {
  // 1. Extract and validate Authorization header - early return guard clause
  const authHeader = request.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    // Log warning for missing/invalid format token (as per spec: WARN level)
    const requestId = request.headers.get("X-Request-Id");
    console.warn(
      `Missing or invalid Authorization header format${requestId ? ` [Request-ID: ${requestId}]` : ""}`
    );

    return errorResponse(
      { code: "unauthorized", message: "Missing or invalid authentication token" },
      401
    );
  }

  const token = authHeader.replace("Bearer ", "");

  try {
    // 2. Create Supabase client with token for verification
    const supabaseUrl = import.meta.env.SUPABASE_URL;
    const supabaseAnonKey = import.meta.env.SUPABASE_KEY;

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error("Missing Supabase environment variables");
      return errorResponse(
        { code: "internal", message: "Internal server error" },
        500
      );
    }

    // Create a new client with the token in headers for verification
    const supabaseWithToken = createClient<Database>(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    });

    // 3. Verify token and get user
    const {
      data: { user },
      error: userError,
    } = await supabaseWithToken.auth.getUser();

    if (userError || !user) {
      // Log error for Supabase verification failure (as per spec: ERROR level for verification errors)
      const requestId = request.headers.get("X-Request-Id");
      console.error(
        `Supabase token verification failed${requestId ? ` [Request-ID: ${requestId}]` : ""}:`,
        userError?.message || "User not found"
      );

      return errorResponse(
        { code: "unauthorized", message: "Missing or invalid authentication token" },
        401
      );
    }

    // 4. Extract iat from JWT token payload
    let iat: number;
    try {
      // Parse JWT payload to extract iat
      // JWT format: header.payload.signature
      const payload = JSON.parse(
        Buffer.from(token.split(".")[1], "base64").toString()
      );
      iat = payload.iat || Math.floor(Date.now() / 1000);
    } catch (parseError) {
      // Log error for JWT parsing failure (as per spec: ERROR level for parsing errors)
      // Fallback to current time if parsing fails
      // This should not happen with valid Supabase tokens, but we handle it gracefully
      const requestId = request.headers.get("X-Request-Id");
      console.error(
        `Failed to parse JWT payload for iat${requestId ? ` [Request-ID: ${requestId}]` : ""}:`,
        parseError
      );
      iat = Math.floor(Date.now() / 1000);
    }

    // 5. Map user data to AuthSessionDto
    const sessionDto: AuthSessionDto = {
      user_id: user.id,
      roles: user.role ? [user.role] : ["authenticated"],
      iat: iat,
    };

    // 6. Return success response - happy path last
    return jsonResponse(sessionDto, 200);
  } catch (error) {
    // Log unexpected errors
    const requestId = request.headers.get("X-Request-Id");
    console.error(
      `Error in GET /v1/auth/session${requestId ? ` [Request-ID: ${requestId}]` : ""}:`,
      error
    );

    return errorResponse(
      { code: "internal", message: "Internal server error" },
      500
    );
  }
};

