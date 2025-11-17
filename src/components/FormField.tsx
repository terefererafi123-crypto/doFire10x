import * as React from "react";
import { ErrorMessage } from "./ErrorMessage";
import { cn } from "@/lib/utils";

export interface FormFieldProps {
  label: string;
  name: string;
  required?: boolean;
  error?: string;
  helperText?: string;
  children: React.ReactNode;
  className?: string;
}

/**
 * Universal form field component with error handling
 * Wraps input/select/textarea with label, error message, and helper text
 */
export function FormField({
  label,
  name,
  required = false,
  error,
  helperText,
  children,
  className,
}: FormFieldProps) {
  const errorId = error ? `${name}-error` : undefined;
  const helperId = helperText ? `${name}-helper` : undefined;
  const describedBy = [errorId, helperId].filter(Boolean).join(" ") || undefined;

  // Clone children and add aria attributes
  const enhancedChildren = React.Children.map(children, (child) => {
    if (React.isValidElement(child)) {
      return React.cloneElement(child, {
        id: name,
        "aria-invalid": error ? true : undefined,
        "aria-describedby": describedBy,
        className: cn(
          child.props.className,
          error && "border-destructive focus-visible:ring-destructive"
        ),
      } as React.HTMLAttributes<HTMLElement>);
    }
    return child;
  });

  return (
    <div className={cn("space-y-2", className)}>
      <label
        htmlFor={name}
        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
      >
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </label>
      {enhancedChildren}
      {error && (
        <ErrorMessage
          message={error}
          variant="inline"
          className="mt-1"
          id={errorId}
        />
      )}
      {helperText && !error && (
        <p
          id={helperId}
          className="text-xs text-muted-foreground"
          aria-live="polite"
        >
          {helperText}
        </p>
      )}
    </div>
  );
}

