import type { ApiError } from "@/types";

/**
 * Checks if an error should be handled globally (401/403/5xx/429)
 * @param error - API error to check
 * @returns true if error should be handled globally
 */
export function shouldHandleGlobally(error: ApiError): boolean {
  const code = error.error.code;
  return (
    code === "unauthorized" ||
    code === "forbidden" ||
    code === "internal" ||
    code === "too_many_requests"
  );
}

/**
 * Checks if an error is an authorization error (401/403)
 * @param error - API error to check
 * @returns true if error is authorization error
 */
export function isAuthError(error: ApiError): boolean {
  const code = error.error.code;
  return code === "unauthorized" || code === "forbidden";
}

/**
 * Checks if an error is a server error (5xx)
 * @param error - API error to check
 * @returns true if error is server error
 */
export function isServerError(error: ApiError): boolean {
  return error.error.code === "internal";
}

/**
 * Checks if an error is a rate limit error (429)
 * @param error - API error to check
 * @returns true if error is rate limit error
 */
export function isRateLimitError(error: ApiError): boolean {
  return error.error.code === "too_many_requests";
}

