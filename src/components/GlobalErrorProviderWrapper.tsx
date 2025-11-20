import * as React from "react";
import { GlobalErrorProvider } from "@/lib/contexts/GlobalErrorContext";
import { GlobalErrorBannerWrapper } from "./GlobalErrorBannerWrapper";

interface GlobalErrorProviderWrapperProps {
  children: React.ReactNode;
}

/**
 * Wrapper component that provides GlobalErrorProvider and GlobalErrorBanner
 * This component should be used in Astro layouts
 */
export function GlobalErrorProviderWrapper({ children }: GlobalErrorProviderWrapperProps) {
  return (
    <GlobalErrorProvider>
      <GlobalErrorBannerWrapper />
      {children}
    </GlobalErrorProvider>
  );
}
