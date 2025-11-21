// src/pages/api/v1/investments/[id].ts
// GET /v1/investments/{id} - Get investment endpoint
// PATCH /v1/investments/{id} - Update investment endpoint
// DELETE /v1/investments/{id} - Delete investment endpoint

/* eslint-disable no-console */
import type { APIRoute } from "astro";
import {
  getInvestmentById,
  deleteInvestmentById,
  updateInvestment,
  InvestmentNotFoundError,
  DatabaseError,
} from "../../../../lib/services/investment.service";
import { investmentIdParamSchema, validateUpdateInvestment } from "../../../../lib/validators/investment.validator";
import { jsonResponse, errorResponse } from "../../../../lib/api/response";
import type { InvestmentDto } from "../../../../types";

export const prerender = false;

/**
 * GET /v1/investments/{id}
 *
 * Retrieves a single investment by ID for the authenticated user.
 * Requires authentication via Supabase JWT token.
 * Uses RLS to ensure users can only access their own investments.
 *
 * @returns 200 OK with InvestmentDto on success
 * @returns 400 Bad Request if investment ID format is invalid
 * @returns 401 Unauthorized if authentication fails
 * @returns 404 Not Found if investment doesn't exist or user doesn't have access
 * @returns 500 Internal Server Error on unexpected errors
 */
export const GET: APIRoute = async ({ params, locals, request }) => {
  // 1. Weryfikacja autoryzacji - early return guard clause
  const supabase = locals.supabase;
  if (!supabase) {
    const requestId = request.headers.get("X-Request-Id");
    console.error(`Supabase client not available in context.locals${requestId ? ` [Request-ID: ${requestId}]` : ""}`);
    return errorResponse({ code: "internal", message: "Internal server error" }, 500);
  }

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    const requestId = request.headers.get("X-Request-Id");
    console.warn(`Authentication failed in GET /v1/investments/{id}${requestId ? ` [Request-ID: ${requestId}]` : ""}`);
    return errorResponse({ code: "unauthorized", message: "Missing or invalid authentication token" }, 401);
  }

  // 2. Walidacja parametrów ścieżki - early return guard clause
  const { id } = params;
  if (!id) {
    return errorResponse({ code: "bad_request", message: "Investment ID is required" }, 400);
  }

  const validationResult = investmentIdParamSchema.safeParse({ id });
  if (!validationResult.success) {
    return errorResponse(
      {
        code: "bad_request",
        message: "Invalid investment ID format",
        fields: { id: "must_be_valid_uuid" },
      },
      400
    );
  }

  // 3. Pobranie inwestycji - happy path last
  try {
    const investment = await getInvestmentById(validationResult.data.id, supabase);

    if (!investment) {
      return errorResponse({ code: "not_found", message: "Investment not found" }, 404);
    }

    // 4. Sukces - zwrócenie InvestmentDto
    return jsonResponse(investment, 200);
  } catch (error) {
    // 5. Błąd serwera - unexpected error
    const requestId = request.headers.get("X-Request-Id");
    console.error(`Error fetching investment${requestId ? ` [Request-ID: ${requestId}]` : ""}:`, error);
    return errorResponse({ code: "internal", message: "An internal server error occurred" }, 500);
  }
};

/**
 * DELETE /v1/investments/{id}
 *
 * Deletes an investment by ID for the authenticated user.
 * Requires authentication via Supabase JWT token.
 * Uses RLS to ensure users can only delete their own investments.
 *
 * @returns 204 No Content on success
 * @returns 401 Unauthorized if authentication fails
 * @returns 404 Not Found if investment doesn't exist or user doesn't have access
 * @returns 500 Internal Server Error on unexpected errors
 */
export const DELETE: APIRoute = async ({ params, locals, request }) => {
  // 1. Autoryzacja - early return guard clause
  const supabase = locals.supabase;
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    const requestId = request.headers.get("X-Request-Id");
    console.warn(
      `Authentication failed in DELETE /v1/investments/{id}${requestId ? ` [Request-ID: ${requestId}]` : ""}`
    );
    return errorResponse({ code: "unauthorized", message: "Missing or invalid authentication token" }, 401);
  }

  // 2. Walidacja parametrów ścieżki - early return guard clause
  const validationResult = investmentIdParamSchema.safeParse({
    id: params.id,
  });

  if (!validationResult.success) {
    return errorResponse({ code: "not_found", message: "Investment not found" }, 404);
  }

  const { id } = validationResult.data;

  // 3. Usunięcie inwestycji - happy path last
  try {
    const result = await deleteInvestmentById(supabase, user.id, id);

    if (!result.success) {
      return errorResponse({ code: "not_found", message: "Investment not found" }, 404);
    }

    // 4. Sukces - 204 No Content
    return new Response(null, {
      status: 204,
    });
  } catch (error) {
    // 5. Błąd serwera - unexpected error
    const requestId = request.headers.get("X-Request-Id");
    console.error(`Error deleting investment${requestId ? ` [Request-ID: ${requestId}]` : ""}:`, error);
    return errorResponse({ code: "internal", message: "An internal server error occurred" }, 500);
  }
};

/**
 * PATCH /v1/investments/{id}
 *
 * Partially updates an investment by ID for the authenticated user.
 * Requires authentication via Supabase JWT token.
 * Uses RLS to ensure users can only update their own investments.
 *
 * Request body (partial update):
 * - type: optional enum (etf, bond, stock, cash)
 * - amount: optional positive number, max 999999999999999.99
 * - acquired_at: optional ISO date string (YYYY-MM-DD), cannot be future date
 * - notes: optional string (1-1000 chars) or null (to delete notes)
 * - At least one field must be provided
 *
 * @returns 200 OK with updated InvestmentDto on success
 * @returns 400 Bad Request if validation fails (invalid fields, empty body, etc.)
 * @returns 401 Unauthorized if authentication fails
 * @returns 404 Not Found if investment doesn't exist or user doesn't have access
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
 */
export const PATCH: APIRoute = async ({ params, locals, request }) => {
  const requestId = request.headers.get("X-Request-Id");

  // 1. Weryfikacja autoryzacji - early return guard clause
  const supabase = locals.supabase;
  if (!supabase) {
    console.error(`Supabase client not available in context.locals${requestId ? ` [Request-ID: ${requestId}]` : ""}`);
    return errorResponse({ code: "internal", message: "Internal server error" }, 500);
  }

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    console.warn(
      `Authentication failed in PATCH /v1/investments/{id}${requestId ? ` [Request-ID: ${requestId}]` : ""}`
    );
    return errorResponse({ code: "unauthorized", message: "Missing or invalid authentication token" }, 401);
  }

  // 2. Walidacja parametrów ścieżki - early return guard clause
  const { id } = params;
  if (!id) {
    return errorResponse({ code: "bad_request", message: "Investment ID is required" }, 400);
  }

  const idValidationResult = investmentIdParamSchema.safeParse({ id });
  if (!idValidationResult.success) {
    return errorResponse(
      {
        code: "bad_request",
        message: "Invalid investment ID format",
        fields: { id: "must_be_valid_uuid" },
      },
      400
    );
  }

  const investmentId = idValidationResult.data.id;

  // 3. Parsowanie i walidacja request body - early return guard clause
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    console.warn(
      `Invalid JSON in request body for PATCH /v1/investments/{id}${requestId ? ` [Request-ID: ${requestId}]` : ""}`
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
  const validationResult = validateUpdateInvestment(body);
  if (!validationResult.success) {
    // Map Zod errors to field-wise error messages
    const fields: Record<string, string> = {};
    validationResult.error.errors.forEach((err) => {
      const path = err.path.join(".");
      if (err.code === "invalid_type") {
        fields[path] = "invalid_type";
      } else if (err.code === "too_small") {
        if (path === "amount") {
          fields[path] = "must_be_gt_zero";
        } else if (path === "notes") {
          fields[path] = "must_be_at_least_1_character";
        } else {
          fields[path] = "too_small";
        }
      } else if (err.code === "too_big") {
        if (path === "amount") {
          fields[path] = "exceeds_maximum_value";
        } else if (path === "notes") {
          fields[path] = "must_not_exceed_1000_characters";
        } else {
          fields[path] = "too_big";
        }
      } else if (err.code === "invalid_string") {
        if (path.includes("acquired_at")) {
          fields[path] = "invalid_date_format";
        } else {
          fields[path] = "invalid_format";
        }
      } else if (err.code === "invalid_enum_value") {
        if (path === "type") {
          fields[path] = "must_be_one_of_etf_bond_stock_cash";
        } else {
          fields[path] = "invalid_value";
        }
      } else if (err.code === "unrecognized_keys") {
        // Handle unknown fields (from .strict() mode)
        // Zod returns unrecognized_keys as an array in the error
        const unknownKeys = (
          err && typeof err === "object" && "keys" in err && Array.isArray(err.keys) ? err.keys : []
        ) as string[];
        unknownKeys.forEach((key: string) => {
          fields[key] = "unknown_field";
        });
      } else if (err.code === "custom") {
        // Handle custom refine errors (e.g., "acquired_at cannot be a future date")
        if (err.message.includes("future date")) {
          fields[path] = "cannot_be_future_date";
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

  // 4. Aktualizacja inwestycji - happy path last
  try {
    const updatedInvestment: InvestmentDto = await updateInvestment(supabase, user.id, investmentId, updateCommand);

    // 5. Sukces - zwrócenie zaktualizowanego InvestmentDto
    const response = jsonResponse(updatedInvestment, 200);
    // Echo X-Request-Id header if provided
    if (requestId) {
      response.headers.set("X-Request-Id", requestId);
    }
    return response;
  } catch (error) {
    // 6. Obsługa błędów - sprawdzenie typu błędu
    if (error instanceof InvestmentNotFoundError) {
      console.warn(
        `Investment not found in PATCH /v1/investments/{id}: ${investmentId}${requestId ? ` [Request-ID: ${requestId}]` : ""}`
      );
      return errorResponse({ code: "not_found", message: "Investment not found" }, 404);
    }

    if (error instanceof DatabaseError) {
      console.error(
        `Database error in PATCH /v1/investments/{id}${requestId ? ` [Request-ID: ${requestId}]` : ""}:`,
        error.originalError || error.message
      );
      return errorResponse({ code: "internal", message: "An unexpected error occurred" }, 500);
    }

    // Unexpected error
    console.error(
      `Unexpected error in PATCH /v1/investments/{id}${requestId ? ` [Request-ID: ${requestId}]` : ""}:`,
      error
    );
    return errorResponse({ code: "internal", message: "An unexpected error occurred" }, 500);
  }
};
