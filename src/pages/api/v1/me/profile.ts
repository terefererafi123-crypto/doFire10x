// src/pages/api/v1/me/profile.ts
// GET /v1/me/profile - User profile endpoint
// POST /v1/me/profile - Create user profile endpoint
// PATCH /v1/me/profile - Update user profile endpoint

import type { APIRoute } from "astro";
import { getAuthenticatedUser } from "../../../../lib/auth/helpers.ts";
import {
  getProfileByUserId,
  createProfile,
  updateProfile,
  ProfileNotFoundError,
  DatabaseError,
} from "../../../../lib/services/profile.service.ts";
import {
  validateCreateProfile,
  validateUpdateProfile,
} from "../../../../lib/validators/profile.validator.ts";
import { jsonResponse, errorResponse } from "../../../../lib/api/response.ts";
import type { CreateProfileCommand, ProfileDto } from "../../../../types.ts";

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

/**
 * POST /v1/me/profile
 *
 * Creates a new profile for the currently authenticated user.
 * Uses Row Level Security (RLS) to ensure users can only create their own profile.
 *
 * Request body (CreateProfileCommand):
 * - monthly_expense: required number >= 0, finite (numeric(16,2))
 * - withdrawal_rate_pct: required number in range 0-100, finite
 * - expected_return_pct: required number in range -100 to 1000, finite
 * - birth_date: optional ISO date string (YYYY-MM-DD) or null, must be < today and >= today - 120 years
 *
 * @returns 201 Created with ProfileDto on success
 * @returns 400 Bad Request if validation fails (invalid fields, constraint violations, etc.)
 * @returns 401 Unauthorized if authentication fails
 * @returns 409 Conflict if profile already exists for this user
 * @returns 500 Internal Server Error on unexpected errors
 *
 * Response headers:
 * - Content-Type: application/json
 * - Location: /v1/me/profile (optional, for REST compliance)
 * - X-Request-Id: echo of request header if provided
 *
 * Request headers:
 * - Authorization: Bearer <Supabase-JWT> (required)
 * - Content-Type: application/json (required)
 * - X-Request-Id: <uuid> (optional, for log correlation)
 * - Accept-Language: pl-PL | en-US | pl | en (optional, for future localization)
 */
export const POST: APIRoute = async ({ locals, request }) => {
  const requestId = request.headers.get("X-Request-Id");

  // 1. Authentication check - early return guard clause
  const user = await getAuthenticatedUser(locals.supabase);
  if (!user) {
    console.warn(
      `Authentication failed in POST /v1/me/profile${requestId ? ` [Request-ID: ${requestId}]` : ""}`
    );
    return errorResponse(
      {
        code: "unauthorized",
        message: "Missing or invalid authentication token",
      },
      401
    );
  }

  // 2. Parse request body - early return guard clause
  let body: unknown;
  try {
    body = await request.json();
  } catch (error) {
    console.warn(
      `Invalid JSON in request body for POST /v1/me/profile${requestId ? ` [Request-ID: ${requestId}]` : ""}`
    );
    return errorResponse(
      {
        code: "bad_request",
        message: "Invalid JSON in request body",
      },
      400
    );
  }

  // 3. Validate request body - early return guard clause
  const validationResult = validateCreateProfile(body);
  if (!validationResult.success) {
    // Map Zod errors to field-wise error messages
    const fields: Record<string, string> = {};
    validationResult.error.errors.forEach((err) => {
      const path = err.path.join(".");
      if (err.code === "invalid_type") {
        fields[path] = "invalid_type";
      } else if (err.code === "too_small") {
        if (path === "monthly_expense") {
          fields[path] = "must_be_gte_zero";
        } else if (path === "withdrawal_rate_pct") {
          fields[path] = "must_be_gte_zero";
        } else if (path === "expected_return_pct") {
          fields[path] = "must_be_gte_minus_100";
        } else {
          fields[path] = "too_small";
        }
      } else if (err.code === "too_big") {
        if (path === "withdrawal_rate_pct") {
          fields[path] = "must_be_lte_100";
        } else if (path === "expected_return_pct") {
          fields[path] = "must_be_lte_1000";
        } else {
          fields[path] = "too_big";
        }
      } else if (err.code === "invalid_string") {
        if (path.includes("birth_date")) {
          fields[path] = "invalid_date_format";
        } else {
          fields[path] = "invalid_format";
        }
      } else if (err.code === "custom") {
        // Handle custom refine errors
        if (err.message.includes("past") || err.message.includes("120 years")) {
          fields[path] = "must_be_in_past_and_within_last_120_years";
        } else {
          fields[path] = err.message;
        }
      } else if (err.code === "unrecognized_keys") {
        // Handle unknown fields (from .strict() mode)
        const unknownKeys = (err as any).keys || [];
        unknownKeys.forEach((key: string) => {
          fields[key] = "unknown_field";
        });
      } else {
        fields[path] = err.message || "invalid_value";
      }
    });

    return errorResponse(
      {
        code: "bad_request",
        message: "Validation failed",
        fields,
      },
      400
    );
  }

  const createCommand: CreateProfileCommand = validationResult.data;

  // 4. Check if profile exists - early return guard clause (idempotency check for MVP)
  try {
    const existingProfile = await getProfileByUserId(locals.supabase, user.id);
    if (existingProfile) {
      console.warn(
        `Profile already exists in POST /v1/me/profile: ${user.id}${requestId ? ` [Request-ID: ${requestId}]` : ""}`
      );
      return errorResponse(
        {
          code: "conflict",
          message: "Profile already exists for this user",
        },
        409
      );
    }
  } catch (error) {
    console.error(
      `Error checking existing profile in POST /v1/me/profile${requestId ? ` [Request-ID: ${requestId}]` : ""}:`,
      error
    );
    return errorResponse(
      {
        code: "internal",
        message: "An internal server error occurred",
      },
      500
    );
  }

  // 5. Create profile - happy path last
  try {
    const profile: ProfileDto = await createProfile(
      locals.supabase,
      user.id,
      createCommand
    );

    // 6. Success - return 201 Created with ProfileDto
    const response = jsonResponse(profile, 201);
    
    // Add Location header (optional, for REST compliance)
    response.headers.set("Location", "/v1/me/profile");
    
    // Echo X-Request-Id header if provided
    if (requestId) {
      response.headers.set("X-Request-Id", requestId);
    }
    
    return response;
  } catch (error: any) {
    // 7. Handle errors - check error type
    console.error(
      `Error creating profile in POST /v1/me/profile${requestId ? ` [Request-ID: ${requestId}]` : ""}:`,
      error
    );

    // Handle unique constraint violation (profile already exists)
    if (error.code === "23505") {
      return errorResponse(
        {
          code: "conflict",
          message: "Profile already exists for this user",
        },
        409
      );
    }

    // Handle check constraint violation (data validation failed)
    if (error.code === "23514") {
      return errorResponse(
        {
          code: "bad_request",
          message: "Data validation failed",
          fields: { [error.column || "unknown"]: error.message || "constraint_violation" },
        },
        400
      );
    }

    // Handle DatabaseError
    if (error instanceof DatabaseError) {
      return errorResponse(
        {
          code: "internal",
          message: "An internal server error occurred",
        },
        500
      );
    }

    // Unexpected error
    return errorResponse(
      {
        code: "internal",
        message: "An internal server error occurred",
      },
      500
    );
  }
};

/**
 * PATCH /v1/me/profile
 *
 * Partially updates the profile of the currently authenticated user.
 * Uses Row Level Security (RLS) to ensure users can only update their own profile.
 *
 * Request body (partial update):
 * - monthly_expense: optional number >= 0, max 9999999999999.99
 * - withdrawal_rate_pct: optional number in range 0-100, max 2 decimal places
 * - expected_return_pct: optional number in range -100 to 1000
 * - birth_date: optional ISO date string (YYYY-MM-DD), must be < today and >= today - 120 years
 * - At least one field must be provided
 *
 * @returns 200 OK with updated ProfileDto on success
 * @returns 400 Bad Request if validation fails (invalid fields, empty body, etc.)
 * @returns 401 Unauthorized if authentication fails
 * @returns 404 Not Found if profile does not exist
 * @returns 500 Internal Server Error on unexpected errors
 *
 * Response headers:
 * - Content-Type: application/json
 * - X-Request-Id: echo of request header if provided
 *
 * Request headers:
 * - Authorization: Bearer <Supabase-JWT> (required)
 * - Content-Type: application/json (required)
 * - X-Request-Id: <uuid> (optional, for log correlation)
 * - Accept-Language: pl-PL | en-US | pl | en (optional, for future localization)
 */
export const PATCH: APIRoute = async ({ locals, request }) => {
  const requestId = request.headers.get("X-Request-Id");

  // 1. Weryfikacja autoryzacji - early return guard clause
  const user = await getAuthenticatedUser(locals.supabase);
  if (!user) {
    console.warn(
      `Authentication failed in PATCH /v1/me/profile${requestId ? ` [Request-ID: ${requestId}]` : ""}`
    );
    return errorResponse(
      {
        code: "unauthorized",
        message: "Missing or invalid authentication token",
      },
      401
    );
  }

  // 2. Parsowanie i walidacja request body - early return guard clause
  let body: unknown;
  try {
    body = await request.json();
  } catch (error) {
    console.warn(
      `Invalid JSON in request body for PATCH /v1/me/profile${requestId ? ` [Request-ID: ${requestId}]` : ""}`
    );
    return errorResponse(
      {
        code: "bad_request",
        message: "Invalid JSON in request body",
      },
      400
    );
  }

  // Validate request body with Zod schema
  const validationResult = validateUpdateProfile(body);
  if (!validationResult.success) {
    // Map Zod errors to field-wise error messages
    const fields: Record<string, string> = {};
    validationResult.error.errors.forEach((err) => {
      const path = err.path.join(".");
      if (err.code === "invalid_type") {
        fields[path] = "invalid_type";
      } else if (err.code === "too_small") {
        if (path === "monthly_expense") {
          fields[path] = "must_be_gte_zero";
        } else if (path === "withdrawal_rate_pct") {
          fields[path] = "must_be_gte_zero";
        } else if (path === "expected_return_pct") {
          fields[path] = "must_be_gte_minus_100";
        } else {
          fields[path] = "too_small";
        }
      } else if (err.code === "too_big") {
        if (path === "monthly_expense") {
          fields[path] = "exceeds_maximum_value";
        } else if (path === "withdrawal_rate_pct") {
          fields[path] = "must_be_lte_100";
        } else if (path === "expected_return_pct") {
          fields[path] = "must_be_lte_1000";
        } else {
          fields[path] = "too_big";
        }
      } else if (err.code === "invalid_string") {
        if (path.includes("birth_date")) {
          fields[path] = "invalid_date_format";
        } else {
          fields[path] = "invalid_format";
        }
      } else if (err.code === "unrecognized_keys") {
        // Handle unknown fields (from .strict() mode)
        const unknownKeys = (err as any).keys || [];
        unknownKeys.forEach((key: string) => {
          fields[key] = "unknown_field";
        });
      } else if (err.code === "custom") {
        // Handle custom refine errors
        if (err.message.includes("past")) {
          fields[path] = "must_be_in_past";
        } else if (err.message.includes("120 years")) {
          fields[path] = "must_be_within_last_120_years";
        } else if (err.message.includes("decimal places")) {
          fields[path] = "must_have_at_most_2_decimal_places";
        } else if (err.message.includes("At least one field")) {
          // This is a root-level error, not field-specific
          // We'll handle it separately
        } else {
          fields[path] = err.message;
        }
      } else {
        fields[path] = err.message || "invalid_value";
      }
    });

    // Handle root-level refine error (at least one field required)
    const hasRootError = validationResult.error.errors.some(
      (err) => err.code === "custom" && err.message.includes("At least one field")
    );
    if (hasRootError && Object.keys(fields).length === 0) {
      return errorResponse(
        {
          code: "bad_request",
          message: "At least one field must be provided for update",
        },
        400
      );
    }

    return errorResponse(
      {
        code: "bad_request",
        message: "Validation failed",
        fields,
      },
      400
    );
  }

  const updateCommand = validationResult.data;

  // 3. Aktualizacja profilu - happy path last
  try {
    const updatedProfile: ProfileDto = await updateProfile(
      locals.supabase,
      user.id,
      updateCommand
    );

    // 4. Sukces - zwrócenie zaktualizowanego ProfileDto
    const response = jsonResponse(updatedProfile, 200);
    // Echo X-Request-Id header if provided
    if (requestId) {
      response.headers.set("X-Request-Id", requestId);
    }
    return response;
  } catch (error) {
    // 5. Obsługa błędów - sprawdzenie typu błędu
    if (error instanceof ProfileNotFoundError) {
      console.warn(
        `Profile not found in PATCH /v1/me/profile: ${user.id}${requestId ? ` [Request-ID: ${requestId}]` : ""}`
      );
      return errorResponse(
        { code: "not_found", message: "Profile not found" },
        404
      );
    }

    if (error instanceof DatabaseError) {
      console.error(
        `Database error in PATCH /v1/me/profile${requestId ? ` [Request-ID: ${requestId}]` : ""}:`,
        error.originalError || error.message
      );
      return errorResponse(
        { code: "internal", message: "An unexpected error occurred" },
        500
      );
    }

    // Unexpected error
    console.error(
      `Unexpected error in PATCH /v1/me/profile${requestId ? ` [Request-ID: ${requestId}]` : ""}:`,
      error
    );
    return errorResponse(
      { code: "internal", message: "An unexpected error occurred" },
      500
    );
  }
};

