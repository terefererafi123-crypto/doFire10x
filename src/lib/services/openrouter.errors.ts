// src/lib/services/openrouter.errors.ts
// Custom error classes for OpenRouter service

export class OpenRouterApiError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly type: string,
    public readonly statusCode: number
  ) {
    super(message);
    this.name = "OpenRouterApiError";
    Object.setPrototypeOf(this, OpenRouterApiError.prototype);
  }
}

export class OpenRouterRateLimitError extends OpenRouterApiError {
  constructor(
    message: string,
    public readonly retryAfter: number
  ) {
    super(message, "429", "rate_limit_error", 429);
    this.name = "OpenRouterRateLimitError";
    Object.setPrototypeOf(this, OpenRouterRateLimitError.prototype);
  }
}

export class OpenRouterValidationError extends Error {
  constructor(
    message: string,
    public readonly field?: string
  ) {
    super(message);
    this.name = "OpenRouterValidationError";
    Object.setPrototypeOf(this, OpenRouterValidationError.prototype);
  }
}
