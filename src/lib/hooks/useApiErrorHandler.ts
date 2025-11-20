import { useState, useCallback } from "react";
import type { ApiError } from "@/types";
import { mapApiErrorsToFormErrors, type ErrorMessageMap, investmentErrorMessages } from "@/lib/utils/error-mapper";

/**
 * Type representing form validation errors
 * Maps field names to error messages
 */
export type FormValidationErrors = Record<string, string>;

/**
 * Custom hook for handling API errors in forms
 * Provides state management and error mapping functionality
 */
export function useApiErrorHandler(errorMessages?: ErrorMessageMap) {
  const [fieldErrors, setFieldErrors] = useState<FormValidationErrors>({});
  const [apiError, setApiError] = useState<ApiError | null>(null);

  /**
   * Handles API errors by mapping them to form field errors or setting general API error
   * @param error - API error from response
   */
  const handleApiError = useCallback(
    (error: ApiError) => {
      // If error has field-wise validation info, map to form errors
      if (error.error.fields) {
        const mappedErrors = mapApiErrorsToFormErrors(error.error.fields, errorMessages || investmentErrorMessages);
        setFieldErrors(mappedErrors);
        setApiError(null);
      } else {
        // General API error (401, 5xx, etc.)
        setApiError(error);
        setFieldErrors({});
      }
    },
    [errorMessages]
  );

  /**
   * Clears all errors (both field errors and API errors)
   */
  const clearErrors = useCallback(() => {
    setFieldErrors({});
    setApiError(null);
  }, []);

  /**
   * Clears error for a specific field
   * @param fieldName - Name of the field to clear error for
   */
  const clearFieldError = useCallback((fieldName: string) => {
    setFieldErrors((prev) => {
      const updated = { ...prev };
      delete updated[fieldName];
      return updated;
    });
  }, []);

  /**
   * Sets error for a specific field
   * @param fieldName - Name of the field
   * @param errorMessage - Error message to set
   */
  const setFieldError = useCallback((fieldName: string, errorMessage: string) => {
    setFieldErrors((prev) => ({
      ...prev,
      [fieldName]: errorMessage,
    }));
  }, []);

  return {
    fieldErrors,
    apiError,
    handleApiError,
    clearErrors,
    clearFieldError,
    setFieldError,
    setFieldErrors,
  };
}
