import { useState } from "react";
import type { DashboardState } from "./types";
import type { MetricsDto, AiHintDto, ApiError } from "@/types";
import { getAuthToken } from "@/lib/auth/client-helpers";

const REQUEST_TIMEOUT_MS = 30000; // 30 seconds

/**
 * Custom hook for managing Dashboard state and API calls
 */
export function useDashboard() {
  const [state, setState] = useState<DashboardState>({
    metrics: null,
    aiHint: null,
    isLoading: false,
    error: null,
  });

  const recalculateMetrics = async () => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));

    try {
      const authToken = await getAuthToken();
      if (!authToken) {
        // No token, redirect to login
        window.location.href = "/login";
        return;
      }

      const acceptLanguage = navigator.language || "pl-PL";

      // Create AbortController for timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

      // Parallel API calls
      const [metricsResponse, aiHintResponse] = await Promise.all([
        fetch("/api/v1/me/metrics", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${authToken}`,
            "Accept-Language": acceptLanguage,
            "Content-Type": "application/json",
          },
          signal: controller.signal,
        }),
        fetch("/api/v1/me/ai-hint", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${authToken}`,
            "Accept-Language": acceptLanguage,
            "Content-Type": "application/json",
          },
          signal: controller.signal,
        }),
      ]);

      clearTimeout(timeoutId);

      // Handle metrics response
      if (!metricsResponse.ok) {
        if (metricsResponse.status === 401) {
          // Unauthorized - redirect to login
          window.location.href = "/login";
          return;
        }

        if (metricsResponse.status === 404) {
          const error = await metricsResponse.json();
          if (error.error?.message === "profile_not_found") {
            // No profile - redirect to onboarding
            window.location.href = "/onboarding";
            return;
          }
        }

        const error: ApiError = await metricsResponse.json();
        throw new Error(error.error?.message || "Błąd pobierania metryk");
      }

      // Handle AI hint response
      if (!aiHintResponse.ok) {
        if (aiHintResponse.status === 401) {
          // Unauthorized - redirect to login
          window.location.href = "/login";
          return;
        }

        const error: ApiError = await aiHintResponse.json();
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
        error: error instanceof Error
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

  return {
    ...state,
    recalculateMetrics,
  };
}
