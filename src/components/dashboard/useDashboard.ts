import { useState, useEffect, useCallback } from "react";
import type { DashboardState } from "./types";
import type { MetricsDto, AiHintDto, ApiError } from "@/types";
import { getAuthToken } from "@/lib/auth/client-helpers";
import { useGlobalError } from "@/lib/contexts/GlobalErrorContext";
import { shouldHandleGlobally } from "@/lib/utils/api-error-handler";

const REQUEST_TIMEOUT_MS = 30000; // 30 seconds

/**
 * Custom hook for managing Dashboard state and API calls
 */
export function useDashboard() {
  const [isMounted, setIsMounted] = useState(false);
  const globalErrorContext = useGlobalError();

  // Wait for component to mount before using context to avoid hydration issues
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Use setGlobalError only after component has mounted
  const setGlobalError = useCallback(
    (error: ApiError | null) => {
      if (isMounted) {
        globalErrorContext.setError(error);
      }
    },
    [isMounted, globalErrorContext.setError]
  );
  const [state, setState] = useState<DashboardState>({
    metrics: null,
    aiHint: null,
    isLoading: false,
    error: null,
  });

  // Load metrics on mount
  useEffect(() => {
    loadMetrics();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadMetrics = async () => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      // Get auth token - if null, API will return 401 and we'll handle it via error response
      // Don't redirect here - middleware already verified auth on server side
      // If token is missing, it might be a timing issue or the API will handle it
      const authToken = await getAuthToken();

      const acceptLanguage = navigator.language || "pl-PL";

      // Create AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

      // Prepare headers - only include Authorization if token is available
      const headers: HeadersInit = {
        "Accept-Language": acceptLanguage,
        "Content-Type": "application/json",
      };
      if (authToken) {
        headers.Authorization = `Bearer ${authToken}`;
      }

      // Parallel API calls
      const [metricsResponse, aiHintResponse] = await Promise.all([
        fetch("/api/v1/me/metrics", {
          method: "GET",
          headers,
          signal: controller.signal,
        }),
        fetch("/api/v1/me/ai-hint", {
          method: "GET",
          headers,
          signal: controller.signal,
        }),
      ]);

      clearTimeout(timeoutId);

      // Handle metrics response
      if (!metricsResponse.ok) {
        if (metricsResponse.status === 404) {
          const error = await metricsResponse.json();
          if (error.error?.message === "profile_not_found") {
            // No profile - redirect to onboarding
            window.location.href = "/onboarding";
            return;
          }
        }

        const error: ApiError = await metricsResponse.json();

        // Handle auth errors (401/403) - but don't set global error immediately
        // Middleware already verified auth, so 401 might be a timing/sync issue
        // Only set global error if it's a persistent auth problem
        if (metricsResponse.status === 401 || metricsResponse.status === 403) {
          // Don't set global error for auth issues - API uses cookies from middleware
          // If middleware allowed access, session is valid, so this is likely a transient issue
          // Show error in component state instead of triggering global redirect
          setState((prev) => ({
            ...prev,
            isLoading: false,
            error: {
              error: {
                code: "unauthorized",
                message: "Problem z autoryzacją – odśwież stronę",
              },
            },
          }));
          return;
        }

        // Handle other global errors (5xx/429)
        if (shouldHandleGlobally(error)) {
          setGlobalError(error);
        }

        throw new Error(error.error?.message || "Błąd pobierania metryk");
      }

      // Handle AI hint response
      if (!aiHintResponse.ok) {
        const error: ApiError = await aiHintResponse.json();

        // For AI hint, auth errors are less critical - just show error, don't redirect
        if (aiHintResponse.status === 401 || aiHintResponse.status === 403) {
          // Set error but don't redirect - metrics might still be available
          // Don't set global error to avoid redirect
          setState((prev) => ({
            ...prev,
            isLoading: false,
            error: {
              error: {
                code: "unauthorized",
                message: "Nie udało się pobrać wskazówek AI",
              },
            },
          }));
          return;
        }

        // Handle other global errors (5xx/429)
        if (shouldHandleGlobally(error)) {
          setGlobalError(error);
        }

        throw new Error(error.error?.message || "Błąd pobierania AI hint");
      }

      // Parse responses
      const metrics: MetricsDto = await metricsResponse.json();
      const aiHint: AiHintDto = await aiHintResponse.json();

      setState({
        metrics,
        aiHint,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        // Request timeout
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: {
            error: {
              code: "internal",
              message: "Żądanie trwa zbyt długo – spróbuj ponownie",
            },
          },
        }));
        return;
      }

      if (error instanceof TypeError && error.message === "Failed to fetch") {
        // Network error
        setState((prev) => ({
          ...prev,
          isLoading: false,
          error: {
            error: {
              code: "internal",
              message: "Brak połączenia z internetem",
            },
          },
        }));
        return;
      }

      // Other errors
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error:
          error instanceof Error
            ? {
                error: {
                  code: "internal",
                  message: error.message,
                },
              }
            : {
                error: {
                  code: "internal",
                  message: "Wystąpił nieoczekiwany błąd",
                },
              },
      }));
    }
  };

  // recalculateMetrics is an alias for loadMetrics
  const recalculateMetrics = loadMetrics;

  return {
    ...state,
    recalculateMetrics,
  };
}
