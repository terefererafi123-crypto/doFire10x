// src/pages/api/v1/test/openrouter.ts
// POST /v1/test/openrouter - Test endpoint for OpenRouter service

import type { APIRoute } from "astro";
import { getOpenRouterService } from "../../../../lib/services/openrouter.client.ts";
import { OpenRouterApiError } from "../../../../lib/services/openrouter.errors.ts";
import { mapOpenRouterErrorToApiError } from "../../../../lib/utils/api-error-handler.ts";
import { jsonResponse, errorResponse } from "../../../../lib/api/response.ts";
import type { ChatCompletionParams } from "../../../../lib/services/openrouter.types.ts";

export const prerender = false;

/**
 * POST /v1/test/openrouter
 *
 * Test endpoint for OpenRouter service integration.
 * Allows testing chat completion functionality with various models and parameters.
 *
 * This is a test endpoint and should be protected or removed in production.
 *
 * @returns 200 OK with ChatCompletionResponse on success
 * @returns 400 Bad Request if input validation fails
 * @returns 401 Unauthorized if API key is invalid
 * @returns 429 Too Many Requests if rate limit is exceeded
 * @returns 500 Internal Server Error on unexpected errors
 *
 * Request body (ChatCompletionParams):
 * - messages: Array of Message objects (required)
 * - model: Model name string (required, e.g., 'openai/gpt-4o')
 * - temperature?: number (0-2, default: 1)
 * - maxTokens?: number (minimum: 1)
 * - responseFormat?: ResponseFormat (optional JSON schema)
 * - topP?: number (0-1)
 * - topK?: number (minimum: 1)
 * - frequencyPenalty?: number (-2 to 2)
 * - presencePenalty?: number (-2 to 2)
 * - stream?: boolean (default: false)
 * - metadata?: Record<string, unknown>
 *
 * Headers:
 * - Content-Type: application/json (required)
 * - X-Request-Id: <uuid> (optional, for log correlation)
 */
export const POST: APIRoute = async ({ request }) => {
  try {
    // 1. Parse request body
    let body: Partial<ChatCompletionParams>;
    try {
      body = await request.json();
    } catch {
      return errorResponse(
        {
          code: "bad_request",
          message: "Invalid JSON in request body",
        },
        400
      );
    }

    // 2. Validate required fields
    if (!body.messages || !Array.isArray(body.messages)) {
      return errorResponse(
        {
          code: "bad_request",
          message: "Messages array is required",
        },
        400
      );
    }

    if (!body.model || typeof body.model !== "string") {
      return errorResponse(
        {
          code: "bad_request",
          message: "Model name is required and must be a string",
        },
        400
      );
    }

    // 3. Get OpenRouter service instance
    let service;
    try {
      service = getOpenRouterService();
    } catch (error) {
      const requestId = request.headers.get("X-Request-Id");
      console.error("Error initializing OpenRouter service:", {
        requestId,
        error: error instanceof Error ? error.message : String(error),
      });

      return errorResponse(
        {
          code: "internal",
          message: "AI service is not properly configured",
        },
        500
      );
    }

    // 4. Prepare chat completion parameters
    const params: ChatCompletionParams = {
      messages: body.messages,
      model: body.model,
      temperature: body.temperature,
      maxTokens: body.maxTokens,
      responseFormat: body.responseFormat,
      topP: body.topP,
      topK: body.topK,
      frequencyPenalty: body.frequencyPenalty,
      presencePenalty: body.presencePenalty,
      stream: body.stream,
      metadata: body.metadata,
    };

    // 5. Call OpenRouter service - happy path last
    const response = await service.chatCompletion(params);

    return jsonResponse(response, 200);
  } catch (error) {
    // 6. Handle errors
    const requestId = request.headers.get("X-Request-Id");

    // Log error details (only on server side)
    console.error("OpenRouter API Error:", {
      requestId,
      error:
        error instanceof Error
          ? {
              message: error.message,
              name: error.name,
              stack: error.stack,
            }
          : error,
    });

    // Map OpenRouter errors to ApiError format
    const apiError = mapOpenRouterErrorToApiError(error);
    const statusCode = error instanceof OpenRouterApiError ? error.statusCode : 500;

    return errorResponse(apiError.error, statusCode);
  }
};
