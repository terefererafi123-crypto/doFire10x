// src/pages/api/v1/me/portfolio-agg.ts
// GET /v1/me/portfolio-agg - Portfolio aggregation endpoint

import type { APIRoute } from "astro";
import { getAuthenticatedUser } from "../../../../lib/auth/helpers.ts";
import { getPortfolioAggByUserId } from "../../../../lib/services/portfolio.service.ts";
import { jsonResponse, errorResponse } from "../../../../lib/api/response.ts";

export const prerender = false;

/**
 * GET /v1/me/portfolio-agg
 *
 * Retrieves aggregated portfolio data for the authenticated user.
 * Data is fetched from the v_investments_agg view which aggregates sums and
 * percentage shares for each asset type (stock, etf, bond, cash).
 *
 * Returns zero-filled values (0) if the user has no investments.
 *
 * @returns 200 OK with PortfolioAggDto on success
 * @returns 401 Unauthorized if authentication fails
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
    return errorResponse({ code: "unauthorized", message: "Authentication required. Please log in." }, 401);
  }

  // 2. Get portfolio aggregation
  try {
    const portfolioData = await getPortfolioAggByUserId(locals.supabase, user.id);
    return jsonResponse(portfolioData, 200);
  } catch (error) {
    // Log error with context (X-Request-Id if available)
    const requestId = request.headers.get("X-Request-Id");
    console.error("Error fetching portfolio aggregation:", {
      userId: user.id,
      requestId,
      error: error instanceof Error ? error.message : String(error),
    });

    return errorResponse(
      {
        code: "internal",
        message: "An unexpected error occurred while fetching portfolio aggregation.",
      },
      500
    );
  }
};
