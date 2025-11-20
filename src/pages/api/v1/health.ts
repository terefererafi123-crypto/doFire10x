// src/pages/api/v1/health.ts
// GET /v1/health - Health check endpoint (liveness probe)

import type { APIRoute } from "astro";
import { checkDatabaseConnectivity } from "../../../lib/services/health.service.ts";
import { jsonResponse, errorResponse } from "../../../lib/api/response.ts";
import type { HealthDto } from "../../../types.ts";

export const prerender = false;

/**
 * GET /v1/health
 *
 * Liveness probe endpoint that checks the health of the application and database.
 * This is a public endpoint (no authentication required) used by monitoring systems,
 * load balancers, and orchestration tools (e.g., Kubernetes) to verify application availability.
 *
 * The endpoint always returns 200 OK, even when the database is down, to allow
 * monitoring systems to distinguish between database issues and complete application unavailability.
 *
 * @returns 200 OK with HealthDto on success (always, even if database is down)
 * @returns 500 Internal Server Error only on critical server errors (rare)
 *
 * Response fields:
 * - status: Always "ok" when endpoint responds (200)
 * - time: Current server time in RFC 3339 format (e.g., "2025-01-15T14:30:45.123Z")
 * - db: Database status - "reachable" | "degraded" | "down"
 *
 * Headers:
 * - Accept: application/json (optional, default)
 * - X-Request-Id: <uuid> (optional, for log correlation)
 */
export const GET: APIRoute = async (context) => {
  try {
    // 1. Get Supabase client from context (added by middleware)
    const supabase = context.locals.supabase;
    if (!supabase) {
      // This should not happen if middleware is properly configured
      console.error("Supabase client not available in context.locals");
      return errorResponse({ code: "internal", message: "Internal server error" }, 500);
    }

    // 2. Check database connectivity
    const dbStatus = await checkDatabaseConnectivity(supabase);

    // 3. Get current server time in RFC 3339 format (ISO 8601)
    const currentTime = new Date().toISOString();

    // 4. Prepare response DTO
    const response: HealthDto = {
      status: "ok",
      time: currentTime,
      db: dbStatus,
    };

    // 5. Return success response - always 200 OK, even if database is down
    // This allows monitoring systems to distinguish between app and DB issues
    return jsonResponse(response, 200);
  } catch (error) {
    // Only log critical errors that prevent the endpoint from responding
    // This should be extremely rare
    const requestId = context.request.headers.get("X-Request-Id");
    console.error(`Critical error in GET /v1/health${requestId ? ` [Request-ID: ${requestId}]` : ""}:`, error);

    // Return 500 only for critical server errors
    return errorResponse({ code: "internal", message: "Internal server error" }, 500);
  }
};
