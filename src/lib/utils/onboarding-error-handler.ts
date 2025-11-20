import type { ApiError } from "@/types";
import { mapApiErrorsToFormErrors } from "./error-mapper";

export interface HandleOnboardingErrorOptions {
  error: unknown;
  onNetworkError: (message: string) => void;
  onValidationError: (errors: Record<string, string>, message: string) => void;
  onAuthError: () => void;
  onConflictError: (message: string) => void;
  onOtherError: (message: string) => void;
}

/**
 * Centralized error handler for onboarding flow
 * Handles all error types consistently
 */
export function handleOnboardingError(options: HandleOnboardingErrorOptions): void {
  const { error, onNetworkError, onValidationError, onAuthError, onConflictError, onOtherError } = options;

  // Handle network errors
  if (error instanceof TypeError && error.message === "Failed to fetch") {
    onNetworkError("Brak połączenia z serwerem. Sprawdź połączenie internetowe.");
    return;
  }

  const apiError = error as ApiError;

  if (apiError.error?.code === "bad_request" && apiError.error?.fields) {
    // Validation errors from API
    const formErrors = mapApiErrorsToFormErrors(apiError.error.fields);
    onValidationError(formErrors, "Popraw błędy w formularzu");
  } else if (apiError.error?.code === "unauthorized" || apiError.error?.code === "forbidden") {
    // Unauthorized/Forbidden - handled by GlobalErrorBanner
    onAuthError();
  } else if (apiError.error?.code === "conflict") {
    // Conflict error (e.g., profile already exists)
    onConflictError(apiError.error?.message || "Profil już istnieje. Zaktualizowano tryb edycji - spróbuj ponownie.");
  } else {
    // Other errors (5xx, 429, etc.)
    onOtherError(apiError.error?.message || "Wystąpił błąd serwera. Spróbuj ponownie.");
  }
}
