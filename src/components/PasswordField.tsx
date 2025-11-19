import * as React from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface PasswordFieldProps {
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
  placeholder?: string;
  showStrengthIndicator?: boolean;
}

export const PasswordField = React.forwardRef<HTMLInputElement, PasswordFieldProps>(
  (
    {
      value,
      onChange,
      error,
      onBlur,
      onFocus,
      id,
      label = "Hasło",
      required = true,
      disabled = false,
      autoFocus = false,
      placeholder,
      showStrengthIndicator = false,
    },
    ref
  ) => {
    const fieldId = id || React.useId();
    const errorId = `${fieldId}-error`;
    const [showPassword, setShowPassword] = React.useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      onChange(e.target.value);
    };

    const togglePasswordVisibility = () => {
      setShowPassword((prev) => !prev);
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
        <div className="relative">
          <Input
            ref={ref}
            id={fieldId}
            type={showPassword ? "text" : "password"}
            value={value}
            onChange={handleChange}
            onBlur={onBlur}
            onFocus={onFocus}
            required={required}
            disabled={disabled}
            autoFocus={autoFocus}
            placeholder={placeholder}
            autoComplete="current-password"
            aria-invalid={error ? "true" : "false"}
            aria-describedby={error ? errorId : undefined}
            aria-required={required}
            aria-label={label}
            className={cn(
              error && "border-destructive focus-visible:ring-destructive focus-visible:ring-2",
              "transition-colors pr-10"
            )}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
            onClick={togglePasswordVisibility}
            aria-label={showPassword ? "Ukryj hasło" : "Pokaż hasło"}
            tabIndex={-1}
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4 text-muted-foreground" />
            ) : (
              <Eye className="h-4 w-4 text-muted-foreground" />
            )}
          </Button>
        </div>
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
        {showStrengthIndicator && value && !error && (
          <p className="text-xs text-muted-foreground">
            {value.length < 6
              ? "Hasło powinno mieć minimum 6 znaków"
              : "Hasło spełnia wymagania"}
          </p>
        )}
      </div>
    );
  }
);

PasswordField.displayName = "PasswordField";

