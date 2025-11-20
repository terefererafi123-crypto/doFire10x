import * as React from "react";
import { GlobalErrorBanner } from "./GlobalErrorBanner";
import { useGlobalError } from "@/lib/contexts/GlobalErrorContext";

/**
 * Wrapper component for GlobalErrorBanner that uses GlobalErrorContext
 * This component should be placed in the layout to display global errors
 */
export function GlobalErrorBannerWrapper() {
  const { error, clearError } = useGlobalError();

  const handleRedirect = React.useCallback(() => {
    window.location.href = "/login";
  }, []);

  return <GlobalErrorBanner error={error} onDismiss={clearError} onRedirect={handleRedirect} />;
}
