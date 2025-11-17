import * as React from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export interface FormErrorSummaryProps {
  errors: Record<string, string>;
  onFieldClick?: (fieldName: string) => void;
  className?: string;
}

/**
 * Component displaying a summary of all form validation errors
 * Shows a list of errors with optional links to scroll to fields
 */
export function FormErrorSummary({
  errors,
  onFieldClick,
  className,
}: FormErrorSummaryProps) {
  // Don't render if there are no errors
  if (Object.keys(errors).length === 0) {
    return null;
  }

  const errorEntries = Object.entries(errors);

  const handleFieldClick = React.useCallback(
    (fieldName: string) => {
      if (onFieldClick) {
        onFieldClick(fieldName);
        return;
      }

      // Default behavior: scroll to field
      const fieldElement = document.getElementById(fieldName);
      if (fieldElement) {
        fieldElement.scrollIntoView({ behavior: "smooth", block: "center" });
        fieldElement.focus();
      }
    },
    [onFieldClick]
  );

  return (
    <Alert variant="destructive" className={cn("mb-4", className)} role="alert">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Proszę poprawić następujące błędy:</AlertTitle>
      <AlertDescription>
        <ul className="mt-2 list-disc list-inside space-y-1">
          {errorEntries.map(([fieldName, errorMessage]) => (
            <li key={fieldName}>
              <button
                type="button"
                onClick={() => handleFieldClick(fieldName)}
                className="text-left underline hover:no-underline focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 rounded"
              >
                {errorMessage}
              </button>
            </li>
          ))}
        </ul>
      </AlertDescription>
    </Alert>
  );
}

