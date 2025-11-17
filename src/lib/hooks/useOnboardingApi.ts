import { useCallback } from "react";
import type {
  CreateProfileCommand,
  CreateInvestmentCommand,
  ProfileDto,
  InvestmentDto,
  ApiError,
} from "@/types";
import { getAuthToken } from "@/lib/auth/client-helpers";
import { useGlobalError } from "@/lib/contexts/GlobalErrorContext";
import { shouldHandleGlobally } from "@/lib/utils/api-error-handler";

const REQUEST_TIMEOUT_MS = 30000; // 30 seconds

/**
 * Custom hook for onboarding API calls
 */
export function useOnboardingApi() {
  const { setError: setGlobalError } = useGlobalError();
  const createProfile = useCallback(
    async (data: CreateProfileCommand): Promise<ProfileDto> => {
      const authToken = await getAuthToken();
      if (!authToken) {
        throw new Error("Brak sesji");
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

      try {
        const response = await fetch("/api/v1/me/profile", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify(data),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const error: ApiError = await response.json();
          // Handle global errors (401/403/5xx/429)
          if (shouldHandleGlobally(error)) {
            setGlobalError(error);
          }
          throw error;
        }

        return response.json();
      } catch (error) {
        clearTimeout(timeoutId);
        if (error instanceof Error && error.name === "AbortError") {
          throw {
            error: {
              code: "internal" as const,
              message: "Żądanie trwa zbyt długo – spróbuj ponownie",
            },
          } as ApiError;
        }
        throw error;
      }
    },
    []
  );

  const createInvestment = useCallback(
    async (data: CreateInvestmentCommand): Promise<InvestmentDto> => {
      const authToken = await getAuthToken();
      if (!authToken) {
        throw new Error("Brak sesji");
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

      try {
        const response = await fetch("/api/v1/investments", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${authToken}`,
          },
          body: JSON.stringify(data),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const error: ApiError = await response.json();
          // Handle global errors (401/403/5xx/429)
          if (shouldHandleGlobally(error)) {
            setGlobalError(error);
          }
          throw error;
        }

        return response.json();
      } catch (error) {
        clearTimeout(timeoutId);
        if (error instanceof Error && error.name === "AbortError") {
          throw {
            error: {
              code: "internal" as const,
              message: "Żądanie trwa zbyt długo – spróbuj ponownie",
            },
          } as ApiError;
        }
        throw error;
      }
    },
    []
  );

  return {
    createProfile,
    createInvestment,
  };
}

