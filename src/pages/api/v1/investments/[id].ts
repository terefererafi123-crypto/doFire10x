// src/pages/api/v1/investments/[id].ts
// GET /v1/investments/{id} - Get investment endpoint
// DELETE /v1/investments/{id} - Delete investment endpoint

import type { APIRoute } from "astro";
import { getInvestmentById, deleteInvestmentById } from "../../../../lib/services/investment.service";
import { investmentIdParamSchema } from "../../../../lib/validators/investment.validator";
import { jsonResponse, errorResponse } from "../../../../lib/api/response";
import type { ApiError } from "../../../../types";

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
    console.error(
      `Supabase client not available in context.locals${requestId ? ` [Request-ID: ${requestId}]` : ""}`
    );
    return errorResponse(
      { code: "internal", message: "Internal server error" },
      500
    );
  }

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    const requestId = request.headers.get("X-Request-Id");
    console.warn(
      `Authentication failed in GET /v1/investments/{id}${requestId ? ` [Request-ID: ${requestId}]` : ""}`
    );
    return errorResponse(
      { code: "unauthorized", message: "Missing or invalid authentication token" },
      401
    );
  }

  // 2. Walidacja parametrów ścieżki - early return guard clause
  const { id } = params;
  if (!id) {
    return errorResponse(
      { code: "bad_request", message: "Investment ID is required" },
      400
    );
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
      return errorResponse(
        { code: "not_found", message: "Investment not found" },
        404
      );
    }

    // 4. Sukces - zwrócenie InvestmentDto
    return jsonResponse(investment, 200);
  } catch (error) {
    // 5. Błąd serwera - unexpected error
    const requestId = request.headers.get("X-Request-Id");
    console.error(
      `Error fetching investment${requestId ? ` [Request-ID: ${requestId}]` : ""}:`,
      error
    );
    return errorResponse(
      { code: "internal", message: "An internal server error occurred" },
      500
    );
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
    return errorResponse(
      { code: "unauthorized", message: "Missing or invalid authentication token" },
      401
    );
  }

  // 2. Walidacja parametrów ścieżki - early return guard clause
  const validationResult = investmentIdParamSchema.safeParse({
    id: params.id,
  });

  if (!validationResult.success) {
    return errorResponse(
      { code: "not_found", message: "Investment not found" },
      404
    );
  }

  const { id } = validationResult.data;

  // 3. Usunięcie inwestycji - happy path last
  try {
    const result = await deleteInvestmentById(supabase, user.id, id);

    if (!result.success) {
      return errorResponse(
        { code: "not_found", message: "Investment not found" },
        404
      );
    }

    // 4. Sukces - 204 No Content
    return new Response(null, {
      status: 204,
    });
  } catch (error) {
    // 5. Błąd serwera - unexpected error
    const requestId = request.headers.get("X-Request-Id");
    console.error(
      `Error deleting investment${requestId ? ` [Request-ID: ${requestId}]` : ""}:`,
      error
    );
    return errorResponse(
      { code: "internal", message: "An internal server error occurred" },
      500
    );
  }
};

