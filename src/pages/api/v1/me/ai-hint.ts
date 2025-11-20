// src/pages/api/v1/me/ai-hint.ts
// GET /v1/me/ai-hint - AI Hint endpoint

import type { APIRoute } from "astro";
import { getAuthenticatedUser } from "../../../../lib/auth/helpers.ts";
import { getPortfolioAggByUserId } from "../../../../lib/services/portfolio.service.ts";
import { generateAiHint } from "../../../../lib/services/ai-hint.service.ts";
import { parseAcceptLanguage } from "../../../../lib/services/ai-hint-locales.ts";
import { jsonResponse, errorResponse } from "../../../../lib/api/response.ts";

export const prerender = false;

/**
 * GET /v1/me/ai-hint
 *
 * Returns a concise AI-generated hint about the user's investment portfolio
 * based on deterministic PRD rules. The hint is generated from percentage shares
 * of different asset types from the v_investments_agg view.
 *
 * Supports localization (Polish/English) based on the Accept-Language header.
 *
 * @returns 200 OK with AiHintDto on success
 * @returns 401 Unauthorized if authentication fails
 * @returns 500 Internal Server Error on unexpected errors
 *
 * Headers:
 * - Authorization: Bearer <Supabase-JWT> (required)
 * - Accept-Language: pl-PL | en-US | pl | en (optional, defaults to en)
 * - X-Request-Id: <uuid> (optional, for log correlation)
 */
export const GET: APIRoute = async ({ locals, request }) => {
  // 1. Authentication check - early return guard clause
  const user = await getAuthenticatedUser(locals.supabase);
  if (!user) {
    return errorResponse({ code: "unauthorized", message: "Authentication required" }, 401);
  }

  // 2. Parse Accept-Language header
  const acceptLanguageHeader = request.headers.get("Accept-Language");
  const locale = parseAcceptLanguage(acceptLanguageHeader);

  // 3. Get portfolio aggregation
  let portfolioAgg;
  try {
    portfolioAgg = await getPortfolioAggByUserId(locals.supabase, user.id);
  } catch (error) {
    // Log error with context (X-Request-Id if available)
    const requestId = request.headers.get("X-Request-Id");
    console.error("Error fetching portfolio aggregation:", {
      userId: user.id,
      requestId,
      error: error instanceof Error ? error.message : String(error),
    });

    return errorResponse({ code: "internal", message: "An unexpected error occurred" }, 500);
  }

  // 4. Generate AI Hint - happy path last
  try {
    const aiHint = generateAiHint(portfolioAgg, locale);
    return jsonResponse(aiHint, 200);
  } catch (error) {
    // Log error with context
    const requestId = request.headers.get("X-Request-Id");
    console.error("Error generating AI hint:", {
      userId: user.id,
      requestId,
      error: error instanceof Error ? error.message : String(error),
    });

    return errorResponse({ code: "internal", message: "An unexpected error occurred" }, 500);
  }
};
