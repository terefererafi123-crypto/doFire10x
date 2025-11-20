import * as React from "react";
import type { ApiError } from "@/types";

interface GlobalErrorContextType {
  error: ApiError | null;
  setError: (error: ApiError | null) => void;
  clearError: () => void;
}

const GlobalErrorContext = React.createContext<GlobalErrorContextType | undefined>(undefined);

/**
 * Provider for global error state
 * Used to manage and display global API errors (401/403, 5xx, 429)
 */
export function GlobalErrorProvider({ children }: { children: React.ReactNode }) {
  const [error, setError] = React.useState<ApiError | null>(null);

  const clearError = React.useCallback(() => {
    setError(null);
  }, []);

  const value = React.useMemo(
    () => ({
      error,
      setError,
      clearError,
    }),
    [error, clearError]
  );

  return <GlobalErrorContext.Provider value={value}>{children}</GlobalErrorContext.Provider>;
}

/**
 * Hook to access global error context
 * Returns a safe default if context is not available (for graceful degradation)
 */
export function useGlobalError() {
  const context = React.useContext(GlobalErrorContext);
  if (context === undefined) {
    // Return a safe default instead of throwing to prevent component crashes
    // This can happen during SSR or if the provider hasn't mounted yet
    console.warn("useGlobalError called outside GlobalErrorProvider, using default no-op implementation");
    return {
      error: null,
      setError: () => {
        // No-op
      },
      clearError: () => {
        // No-op
      },
    };
  }
  return context;
}
