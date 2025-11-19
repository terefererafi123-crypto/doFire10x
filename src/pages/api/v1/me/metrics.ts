// src/pages/api/v1/me/metrics.ts
// GET /v1/me/metrics - Calculate FIRE metrics endpoint

import type { APIRoute } from "astro";
import { getAuthenticatedUser } from "../../../../lib/auth/helpers.ts";
import { getProfileByUserId } from "../../../../lib/services/profile.service.ts";
import { getPortfolioAggByUserId } from "../../../../lib/services/portfolio.service.ts";
import { calculateFireMetrics } from "../../../../lib/services/metrics.service.ts";
import { metricsQuerySchema } from "../../../../lib/validators/metrics-query.validator.ts";
import { jsonResponse, errorResponse } from "../../../../lib/api/response.ts";

export const prerender = false;

/**
 * GET /v1/me/metrics
 *
 * Calculates FIRE (Financial Independence, Retire Early) metrics based on user profile
 * and portfolio aggregation. All calculations are performed at runtime and not persisted.
 *
 * Supports "what-if" scenarios through optional query parameters that override profile
 * and portfolio values.
 *
 * @returns 200 OK with MetricsDto on success
 * @returns 400 Bad Request for invalid query parameters or merged values
 * @returns 401 Unauthorized if authentication fails
 * @returns 404 Not Found if user profile doesn't exist
 * @returns 500 Internal Server Error on unexpected errors
 *
 * Query Parameters (all optional):
 * - monthly_expense: Override profile monthly expense (>= 0)
 * - withdrawal_rate_pct: Override profile withdrawal rate (0-100)
 * - expected_return_pct: Override profile expected return (> -100)
 * - invested_total: Override portfolio total amount (>= 0)
 */
export const GET: APIRoute = async ({ locals, url }) => {
  // 0. Check if supabase client is available
  if (!locals.supabase) {
    console.error("Supabase client not available in locals");
    return errorResponse(
      { code: "internal", message: "Server configuration error" },
      500
    );
  }

  // 1. Authentication check - early return guard clause
  const user = await getAuthenticatedUser(locals.supabase);
  if (!user) {
    return errorResponse(
      { code: "unauthorized", message: "Missing or invalid authentication token" },
      401
    );
  }

  // 2. Parse and validate query parameters
  const queryParams = Object.fromEntries(url.searchParams.entries());
  const parseResult = metricsQuerySchema.safeParse(queryParams);
  if (!parseResult.success) {
    // Convert Zod field errors to the expected format
    const fieldErrors: Record<string, string> = {};
    for (const [key, errors] of Object.entries(parseResult.error.flatten().fieldErrors)) {
      if (errors && errors.length > 0) {
        fieldErrors[key] = errors[0];
      }
    }
    return errorResponse(
      {
        code: "bad_request",
        message: "Invalid input parameters",
        fields: fieldErrors,
      },
      400
    );
  }

  // 3. Get profile
  let profile;
  try {
    profile = await getProfileByUserId(locals.supabase, user.id);
    if (!profile) {
      return errorResponse({ code: "not_found", message: "profile_not_found" }, 404);
    }
  } catch (error) {
    console.error("Error fetching profile:", error);
    return errorResponse(
      { code: "internal", message: "An internal server error occurred" },
      500
    );
  }

  // 4. Get portfolio aggregation
  let portfolioAgg;
  try {
    portfolioAgg = await getPortfolioAggByUserId(locals.supabase, user.id);
  } catch (error) {
    console.error("Error fetching portfolio aggregation:", error);
    return errorResponse(
      { code: "internal", message: "An internal server error occurred" },
      500
    );
  }

  // 5. Merge data (query params override profile/portfolio values)
  const mergedInputs = {
    monthly_expense: parseResult.data.monthly_expense ?? profile.monthly_expense,
    withdrawal_rate_pct: parseResult.data.withdrawal_rate_pct ?? profile.withdrawal_rate_pct,
    expected_return_pct: parseResult.data.expected_return_pct ?? profile.expected_return_pct,
    invested_total: parseResult.data.invested_total ?? portfolioAgg.total_amount,
    birth_date: profile.birth_date,
  };

  // 6. Validate merged values
  if (mergedInputs.expected_return_pct <= -100) {
    return errorResponse(
      {
        code: "bad_request",
        message: "Invalid input parameters",
        fields: {
          expected_return_pct: "Expected return percentage must be greater than -100",
        },
      },
      400
    );
  }

  // 7. Calculate metrics - happy path last
  try {
    const metrics = calculateFireMetrics(mergedInputs);
    return jsonResponse(metrics, 200);
  } catch (error) {
    console.error("Error calculating metrics:", error);
    return errorResponse(
      { code: "internal", message: "An internal server error occurred" },
      500
    );
  }
};



