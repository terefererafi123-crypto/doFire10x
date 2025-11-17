import * as React from "react";
import { AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ErrorMessageProps {
  message: string;
  variant?: "inline" | "banner";
  className?: string;
  id?: string;
}

/**
 * Component for displaying error messages
 * Supports two variants: inline (for form fields) and banner (for global errors)
 */
export function ErrorMessage({
  message,
  variant = "inline",
  className,
  id,
}: ErrorMessageProps) {
  if (variant === "banner") {
    return (
      <div
        id={id}
        className={cn(
          "flex items-center gap-2 rounded-md border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive",
          className
        )}
        role="alert"
      >
        <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span>{message}</span>
      </div>
    );
  }

  // Inline variant (default)
  return (
    <p
      id={id}
      className={cn("text-sm text-destructive", className)}
      role="alert"
      aria-live="polite"
    >
      {message}
    </p>
  );
}

