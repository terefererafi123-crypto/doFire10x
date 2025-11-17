import * as React from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export interface EmailFieldProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  onBlur?: () => void;
  onFocus?: () => void;
  id?: string;
  label?: string;
  required?: boolean;
  disabled?: boolean;
  autoFocus?: boolean;
}

export const EmailField = React.forwardRef<HTMLInputElement, EmailFieldProps>(
  (
    {
      value,
      onChange,
      error,
      onBlur,
      onFocus,
      id,
      label = "Adres e-mail",
      required = true,
      disabled = false,
      autoFocus = true,
    },
    ref
  ) => {
    const fieldId = id || React.useId();
    const errorId = `${fieldId}-error`;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange(e.target.value);
    };

    return (
      <div className="space-y-2">
        <label
          htmlFor={fieldId}
          className="text-sm font-medium leading-none text-foreground peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
        >
          {label}
          {required && (
            <span className="text-destructive ml-1" aria-label="wymagane">
              *
            </span>
          )}
        </label>
        <Input
          ref={ref}
          id={fieldId}
          type="email"
          value={value}
          onChange={handleChange}
          onBlur={onBlur}
          onFocus={onFocus}
          required={required}
          disabled={disabled}
          autoFocus={autoFocus}
          autoComplete="email"
          aria-invalid={error ? "true" : "false"}
          aria-describedby={error ? errorId : undefined}
          aria-required={required}
          aria-label={label}
          className={cn(
            error && "border-destructive focus-visible:ring-destructive focus-visible:ring-2",
            "transition-colors"
          )}
        />
        {error && (
          <p
            id={errorId}
            role="alert"
            className="text-sm font-medium text-destructive"
            aria-live="polite"
          >
            {error}
          </p>
        )}
      </div>
    );
  }
);

EmailField.displayName = "EmailField";

