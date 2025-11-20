import { useCallback, useState, useEffect } from "react";
import type {
  CreateProfileCommand,
  CreateInvestmentCommand,
  UpdateProfileCommand,
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
  const [isMounted, setIsMounted] = useState(false);
  // useGlobalError returns a safe default if context is not available
  // This is fine - it will just be a no-op until the provider mounts
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
    [setGlobalError]
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
    [setGlobalError]
  );

  const getProfile = useCallback(async (): Promise<ProfileDto | null> => {
    const authToken = await getAuthToken();
    if (!authToken) {
      throw new Error("Brak sesji");
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch("/api/v1/me/profile", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.status === 404) {
        // Profile doesn't exist - return null
        return null;
      }

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
  }, [setGlobalError]);

  const updateProfile = useCallback(
    async (data: UpdateProfileCommand): Promise<ProfileDto> => {
      const authToken = await getAuthToken();
      if (!authToken) {
        throw new Error("Brak sesji");
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

      try {
        const response = await fetch("/api/v1/me/profile", {
          method: "PATCH",
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
    [setGlobalError]
  );

  const hasInvestments = useCallback(async (): Promise<boolean> => {
    const authToken = await getAuthToken();
    if (!authToken) {
      return false;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch("/api/v1/investments", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        // If error, assume no investments
        return false;
      }

      const data = await response.json();
      return (data.items || []).length > 0;
    } catch {
      clearTimeout(timeoutId);
      // On error, assume no investments
      return false;
    }
  }, []);

  return {
    createProfile,
    createInvestment,
    getProfile,
    updateProfile,
    hasInvestments,
  };
}
