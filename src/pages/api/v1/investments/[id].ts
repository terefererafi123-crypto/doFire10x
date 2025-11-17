// src/pages/api/v1/investments/[id].ts
// DELETE /v1/investments/{id} - Delete investment endpoint

import type { APIRoute } from "astro";
import { z } from "zod";
import { deleteInvestmentById } from "../../../lib/services/investment.service";
import type { ApiError } from "../../../types";

export const prerender = false;

/**
 * Zod schema for validating the investment ID path parameter
 */
const deleteInvestmentParamsSchema = z.object({
  id: z.string().uuid("Invalid investment ID format"),
});

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
export const DELETE: APIRoute = async ({ params, locals }) => {
  // 1. Autoryzacja - early return guard clause
  const supabase = locals.supabase;
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    const errorResponse: ApiError = {
      error: {
        code: "unauthorized",
        message: "Authentication required",
      },
    };
    return new Response(JSON.stringify(errorResponse), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  // 2. Walidacja parametrów ścieżki - early return guard clause
  const validationResult = deleteInvestmentParamsSchema.safeParse({
    id: params.id,
  });

  if (!validationResult.success) {
    const errorResponse: ApiError = {
      error: {
        code: "not_found",
        message: "Investment not found or access denied",
      },
    };
    return new Response(JSON.stringify(errorResponse), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { id } = validationResult.data;

  // 3. Usunięcie inwestycji - happy path last
  try {
    const result = await deleteInvestmentById(supabase, user.id, id);

    if (!result.success) {
      const errorResponse: ApiError = {
        error: {
          code: "not_found",
          message: result.error || "Investment not found or access denied",
        },
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 4. Sukces - 204 No Content
    return new Response(null, {
      status: 204,
    });
  } catch (error) {
    // 5. Błąd serwera - unexpected error
    console.error("Error deleting investment:", error);
    const errorResponse: ApiError = {
      error: {
        code: "internal",
        message: "An unexpected error occurred",
      },
    };
    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};

