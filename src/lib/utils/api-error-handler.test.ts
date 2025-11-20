import { describe, it, expect } from "vitest";
import {
  shouldHandleGlobally,
  isAuthError,
  isServerError,
  isRateLimitError,
  mapOpenRouterErrorToApiError,
} from "./api-error-handler";
import type { ApiError } from "@/types";
import { OpenRouterApiError } from "../services/openrouter.errors";

describe("api-error-handler", () => {
  describe("shouldHandleGlobally", () => {
    it("should return true for unauthorized error", () => {
      // Arrange
      const error: ApiError = {
        error: {
          code: "unauthorized",
          message: "Authentication required",
        },
      };

      // Act
      const result = shouldHandleGlobally(error);

      // Assert
      expect(result).toBe(true);
    });

    it("should return true for forbidden error", () => {
      // Arrange
      const error: ApiError = {
        error: {
          code: "forbidden",
          message: "Access denied",
        },
      };

      // Act
      const result = shouldHandleGlobally(error);

      // Assert
      expect(result).toBe(true);
    });

    it("should return true for internal error", () => {
      // Arrange
      const error: ApiError = {
        error: {
          code: "internal",
          message: "Internal server error",
        },
      };

      // Act
      const result = shouldHandleGlobally(error);

      // Assert
      expect(result).toBe(true);
    });

    it("should return true for too_many_requests error", () => {
      // Arrange
      const error: ApiError = {
        error: {
          code: "too_many_requests",
          message: "Rate limit exceeded",
        },
      };

      // Act
      const result = shouldHandleGlobally(error);

      // Assert
      expect(result).toBe(true);
    });

    it("should return false for bad_request error", () => {
      // Arrange
      const error: ApiError = {
        error: {
          code: "bad_request",
          message: "Validation failed",
        },
      };

      // Act
      const result = shouldHandleGlobally(error);

      // Assert
      expect(result).toBe(false);
    });

    it("should return false for not_found error", () => {
      // Arrange
      const error: ApiError = {
        error: {
          code: "not_found",
          message: "Resource not found",
        },
      };

      // Act
      const result = shouldHandleGlobally(error);

      // Assert
      expect(result).toBe(false);
    });

    it("should return false for conflict error", () => {
      // Arrange
      const error: ApiError = {
        error: {
          code: "conflict",
          message: "Resource conflict",
        },
      };

      // Act
      const result = shouldHandleGlobally(error);

      // Assert
      expect(result).toBe(false);
    });
  });

  describe("isAuthError", () => {
    it("should return true for unauthorized error", () => {
      // Arrange
      const error: ApiError = {
        error: {
          code: "unauthorized",
          message: "Authentication required",
        },
      };

      // Act
      const result = isAuthError(error);

      // Assert
      expect(result).toBe(true);
    });

    it("should return true for forbidden error", () => {
      // Arrange
      const error: ApiError = {
        error: {
          code: "forbidden",
          message: "Access denied",
        },
      };

      // Act
      const result = isAuthError(error);

      // Assert
      expect(result).toBe(true);
    });

    it("should return false for other error codes", () => {
      // Arrange
      const error: ApiError = {
        error: {
          code: "bad_request",
          message: "Validation failed",
        },
      };

      // Act
      const result = isAuthError(error);

      // Assert
      expect(result).toBe(false);
    });
  });

  describe("isServerError", () => {
    it("should return true for internal error", () => {
      // Arrange
      const error: ApiError = {
        error: {
          code: "internal",
          message: "Internal server error",
        },
      };

      // Act
      const result = isServerError(error);

      // Assert
      expect(result).toBe(true);
    });

    it("should return false for other error codes", () => {
      // Arrange
      const error: ApiError = {
        error: {
          code: "bad_request",
          message: "Validation failed",
        },
      };

      // Act
      const result = isServerError(error);

      // Assert
      expect(result).toBe(false);
    });
  });

  describe("isRateLimitError", () => {
    it("should return true for too_many_requests error", () => {
      // Arrange
      const error: ApiError = {
        error: {
          code: "too_many_requests",
          message: "Rate limit exceeded",
        },
      };

      // Act
      const result = isRateLimitError(error);

      // Assert
      expect(result).toBe(true);
    });

    it("should return false for other error codes", () => {
      // Arrange
      const error: ApiError = {
        error: {
          code: "bad_request",
          message: "Validation failed",
        },
      };

      // Act
      const result = isRateLimitError(error);

      // Assert
      expect(result).toBe(false);
    });
  });

  describe("mapOpenRouterErrorToApiError", () => {
    it("should map 401 status to unauthorized error", () => {
      // Arrange
      const error = new OpenRouterApiError("Unauthorized", "401", "unauthorized", 401);

      // Act
      const result = mapOpenRouterErrorToApiError(error);

      // Assert
      expect(result.error.code).toBe("unauthorized");
      expect(result.error.message).toBe("Authentication failed with AI service");
    });

    it("should map 403 status to unauthorized error", () => {
      // Arrange
      const error = new OpenRouterApiError("Forbidden", "403", "forbidden", 403);

      // Act
      const result = mapOpenRouterErrorToApiError(error);

      // Assert
      expect(result.error.code).toBe("unauthorized");
      expect(result.error.message).toBe("Authentication failed with AI service");
    });

    it("should map 429 status to too_many_requests error", () => {
      // Arrange
      const error = new OpenRouterApiError("Rate limit exceeded", "429", "rate_limit", 429);

      // Act
      const result = mapOpenRouterErrorToApiError(error);

      // Assert
      expect(result.error.code).toBe("too_many_requests");
      expect(result.error.message).toBe("Rate limit exceeded. Please try again later.");
    });

    it("should map 4xx status (except 401/403/429) to bad_request error", () => {
      // Arrange
      const error = new OpenRouterApiError("Bad request", "400", "bad_request", 400);

      // Act
      const result = mapOpenRouterErrorToApiError(error);

      // Assert
      expect(result.error.code).toBe("bad_request");
      expect(result.error.message).toBe("Bad request");
    });

    it("should map 404 status to bad_request error", () => {
      // Arrange
      const error = new OpenRouterApiError("Not found", "404", "not_found", 404);

      // Act
      const result = mapOpenRouterErrorToApiError(error);

      // Assert
      expect(result.error.code).toBe("bad_request");
      expect(result.error.message).toBe("Not found");
    });

    it("should map 5xx status to internal error", () => {
      // Arrange
      const error = new OpenRouterApiError("Internal server error", "500", "internal", 500);

      // Act
      const result = mapOpenRouterErrorToApiError(error);

      // Assert
      expect(result.error.code).toBe("internal");
      expect(result.error.message).toBe("Internal server error");
    });

    it("should map unknown error to internal error", () => {
      // Arrange
      const error = new Error("Unknown error");

      // Act
      const result = mapOpenRouterErrorToApiError(error);

      // Assert
      expect(result.error.code).toBe("internal");
      expect(result.error.message).toBe("Unknown error");
    });

    it("should map non-Error object to internal error with default message", () => {
      // Arrange
      const error = { someProperty: "value" };

      // Act
      const result = mapOpenRouterErrorToApiError(error);

      // Assert
      expect(result.error.code).toBe("internal");
      expect(result.error.message).toBe("Unknown error occurred");
    });
  });
});
