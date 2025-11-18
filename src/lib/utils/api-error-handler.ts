import type { ApiError } from "@/types";
import { OpenRouterApiError } from "../services/openrouter.errors.ts";

/**
 * Maps OpenRouter API errors to ApiError format
 * @param error - Error from OpenRouter service
 * @returns ApiError formatted error
 */
export function mapOpenRouterErrorToApiError(error: unknown): ApiError {
  if (error instanceof OpenRouterApiError) {
    // Mapuj kody statusu HTTP na kody ApiError
    if (error.statusCode === 401 || error.statusCode === 403) {
      return {
        error: {
          code: 'unauthorized',
          message: 'Authentication failed with AI service',
        },
      };
    }
    if (error.statusCode === 429) {
      return {
        error: {
          code: 'too_many_requests',
          message: 'Rate limit exceeded. Please try again later.',
        },
      };
    }
    if (error.statusCode >= 400 && error.statusCode < 500) {
      return {
        error: {
          code: 'bad_request',
          message: error.message,
        },
      };
    }
  }

  // Domyślny błąd wewnętrzny
  return {
    error: {
      code: 'internal',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
    },
  };
}

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

