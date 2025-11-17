import * as React from "react";
import { X, AlertCircle, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ErrorMessage } from "./ErrorMessage";
import { cn } from "@/lib/utils";
import type { ApiError } from "@/types";

export interface GlobalErrorBannerProps {
  error: ApiError | null;
  onDismiss?: () => void;
  onRedirect?: () => void;
  className?: string;
}

/**
 * Global error banner component for displaying API errors
 * Handles 401/403 (authorization), 5xx (server), and 429 (rate limiting) errors
 */
export function GlobalErrorBanner({
  error,
  onDismiss,
  onRedirect,
  className,
}: GlobalErrorBannerProps) {
  const [isRedirecting, setIsRedirecting] = React.useState(false);

  // Don't render if there's no error
  if (!error) {
    return null;
  }

  const errorCode = error.error.code;
  const isAuthError = errorCode === "unauthorized" || errorCode === "forbidden";
  const isServerError = errorCode === "internal";
  const isRateLimitError = errorCode === "too_many_requests";

  // Get user-friendly error message
  const getErrorMessage = (): string => {
    if (isAuthError) {
      return "Sesja wygasła – zaloguj się ponownie";
    }
    if (isServerError) {
      return "Problem po naszej stronie – spróbuj ponownie";
    }
    if (isRateLimitError) {
      return "Za dużo zapytań – spróbuj ponownie za chwilę";
    }
    return error.error.message || "Wystąpił błąd";
  };

  // Handle redirect for auth errors
  React.useEffect(() => {
    if (isAuthError && !isRedirecting) {
      const timer = setTimeout(() => {
        setIsRedirecting(true);
        if (onRedirect) {
          onRedirect();
        } else {
          window.location.href = "/login";
        }
      }, 3000); // 3 seconds delay

      return () => clearTimeout(timer);
    }
  }, [isAuthError, isRedirecting, onRedirect]);

  const handleDismiss = () => {
    if (onDismiss) {
      onDismiss();
    }
  };

  const handleRedirect = () => {
    setIsRedirecting(true);
    if (onRedirect) {
      onRedirect();
    } else {
      window.location.href = "/login";
    }
  };

  // Determine banner styling based on error type
  const bannerClassName = cn(
    "fixed top-0 left-0 right-0 z-50 flex items-center justify-between gap-4 px-4 py-3 shadow-md",
    isAuthError && "bg-yellow-50 border-b border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800",
    isServerError && "bg-red-50 border-b border-red-200 dark:bg-red-900/20 dark:border-red-800",
    isRateLimitError && "bg-orange-50 border-b border-orange-200 dark:bg-orange-900/20 dark:border-orange-800",
    className
  );

  const textClassName = cn(
    "text-sm font-medium",
    isAuthError && "text-yellow-800 dark:text-yellow-200",
    isServerError && "text-red-800 dark:text-red-200",
    isRateLimitError && "text-orange-800 dark:text-orange-200"
  );

  return (
    <div className={bannerClassName} role="alert">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        {isAuthError ? (
          <AlertTriangle className="h-5 w-5 shrink-0 text-yellow-600 dark:text-yellow-400" />
        ) : (
          <AlertCircle className="h-5 w-5 shrink-0 text-red-600 dark:text-red-400" />
        )}
        <p className={textClassName}>{getErrorMessage()}</p>
        {isRedirecting && isAuthError && (
          <span className="text-xs text-muted-foreground">Przekierowywanie...</span>
        )}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {isAuthError && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleRedirect}
            disabled={isRedirecting}
            className="h-8"
          >
            Zaloguj ponownie
          </Button>
        )}
        {(isServerError || isRateLimitError) && (
          <Button
            variant="ghost"
            size="icon"
            onClick={handleDismiss}
            className="h-8 w-8"
            aria-label="Zamknij"
          >
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

