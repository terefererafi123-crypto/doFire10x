// src/lib/api/response.ts
// Helper functions for creating API responses

import type { ApiError } from "../../types.ts";

/**
 * Creates a JSON response with the specified data and status code.
 *
 * @param data - Data to serialize as JSON
 * @param status - HTTP status code (default: 200)
 * @returns Response object with JSON content type
 *
 * @example
 * ```typescript
 * return jsonResponse({ message: "Success" }, 200);
 * ```
 */
export function jsonResponse<T>(data: T, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/**
 * Creates an error response with the specified error details and status code.
 *
 * @param error - Error object conforming to ApiError['error'] structure
 * @param status - HTTP status code (400, 401, 404, 500, etc.)
 * @returns Response object with JSON content type and error structure
 *
 * @example
 * ```typescript
 * return errorResponse(
 *   {
 *     code: 'bad_request',
 *     message: 'Invalid input parameters',
 *     fields: { email: 'Invalid email format' }
 *   },
 *   400
 * );
 * ```
 */
export function errorResponse(error: ApiError["error"], status: number): Response {
  return new Response(JSON.stringify({ error }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
