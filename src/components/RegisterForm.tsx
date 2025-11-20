import * as React from "react";
import { Button } from "@/components/ui/button";
import { EmailField } from "./EmailField";
import { PasswordField } from "./PasswordField";
import { useAuthForm } from "@/lib/hooks/useAuthForm";
import { registerService } from "@/lib/services/register.service";

const RATE_LIMIT_COOLDOWN_MS = 60000; // 60 seconds
const MIN_PASSWORD_LENGTH = 6;

interface RegisterFormData {
  email: string;
  password: string;
  confirmPassword: string;
}

export default function RegisterForm() {
  const form = useAuthForm<RegisterFormData>({
    initialData: {
      email: "",
      password: "",
      confirmPassword: "",
    },
    minPasswordLength: MIN_PASSWORD_LENGTH,
    rateLimitCooldownMs: RATE_LIMIT_COOLDOWN_MS,
  });

  // Track success state separately (not in useAuthForm)
  const [isSuccess, setIsSuccess] = React.useState(false);
  const [successMessage, setSuccessMessage] = React.useState<string | undefined>();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Check if rate limited
    if (form.rateLimiter.isRateLimited) {
      return;
    }

    // Validate all fields
    if (!form.validateAll()) {
      return;
    }

    // Set loading state
    form.setLoading(true);
    form.clearErrors();
    setIsSuccess(false);

    try {
      // Use RegisterService for registration
      const registerResult = await registerService.register(
        form.state.data.email,
        form.state.data.password
      );

      if (!registerResult.success) {
        // Handle error
        form.setSubmitError(registerResult.error?.message || "Nie udało się utworzyć konta.");

        // Start countdown if rate limited
        if (registerResult.error?.isRateLimited) {
          form.rateLimiter.startCooldown();
        }

        return;
      }

      // Success - inform user about confirmation email
      form.setLoading(false);
      setIsSuccess(true);
      setSuccessMessage(
        "Konto zostało utworzone. Sprawdź swoją skrzynkę e-mail i kliknij w link potwierdzający, aby aktywować konto."
      );
    } catch (error) {
      // Handle unexpected errors
      console.error("Registration error:", error);
      form.setSubmitError(
        "Nie udało się utworzyć konta. Sprawdź połączenie z internetem i spróbuj ponownie."
      );
    }
  };

  const isSubmitDisabled =
    form.state.isLoading ||
    !form.state.data.email.trim() ||
    !form.state.data.password ||
    !form.state.data.confirmPassword ||
    !!form.state.errors.email ||
    !!form.state.errors.password ||
    !!form.state.errors.confirmPassword ||
    isSuccess ||
    form.rateLimiter.isRateLimited;

  return (
    <div className="w-full">
      <form
        onSubmit={handleSubmit}
        className="space-y-6"
        noValidate
        aria-label="Formularz rejestracji"
      >
        <EmailField
          value={form.state.data.email}
          onChange={(value) => {
            form.setFieldValue("email", value);
            setIsSuccess(false);
          }}
          onBlur={() => form.validateField("email")}
          onFocus={() => form.clearFieldError("email")}
          error={form.state.errors.email}
          disabled={form.state.isLoading || isSuccess}
          autoFocus={true}
        />

        <PasswordField
          value={form.state.data.password}
          onChange={(value) => {
            form.setFieldValue("password", value);
            setIsSuccess(false);
            // Re-validate confirm password if it has a value
            if (form.state.data.confirmPassword) {
              form.validateField("confirmPassword");
            }
          }}
          onBlur={() => form.validateField("password")}
          onFocus={() => form.clearFieldError("password")}
          error={form.state.errors.password}
          disabled={form.state.isLoading || isSuccess}
          placeholder="Minimum 6 znaków"
          showStrengthIndicator={true}
        />

        <PasswordField
          value={form.state.data.confirmPassword}
          onChange={(value) => {
            form.setFieldValue("confirmPassword", value);
            setIsSuccess(false);
          }}
          onBlur={() => form.validateField("confirmPassword")}
          onFocus={() => form.clearFieldError("confirmPassword")}
          error={form.state.errors.confirmPassword}
          disabled={form.state.isLoading || isSuccess}
          label="Potwierdzenie hasła"
          placeholder="Powtórz hasło"
        />

        {form.state.errors.submit && (
          <div
            role="alert"
            className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm font-medium text-destructive"
            aria-live="assertive"
            aria-atomic="true"
          >
            {form.state.errors.submit}
          </div>
        )}

        {isSuccess && successMessage && (
          <div
            role="alert"
            className="rounded-md border border-green-500/50 bg-green-500/10 p-3 text-sm font-medium text-green-700 dark:text-green-400"
            aria-live="polite"
            aria-atomic="true"
          >
            {successMessage}
          </div>
        )}

        <Button
          type="submit"
          disabled={isSubmitDisabled}
          className="w-full transition-all"
          aria-busy={form.state.isLoading}
          aria-disabled={isSubmitDisabled}
        >
          {form.state.isLoading ? (
            <>
              <span className="mr-2" aria-hidden="true">Tworzenie konta...</span>
              <span
                className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
                aria-hidden="true"
              />
              <span className="sr-only">Tworzenie konta</span>
            </>
          ) : form.rateLimiter.isRateLimited ? (
            <>
              <span aria-live="polite" aria-atomic="true">
                Spróbuj ponownie za {form.rateLimiter.cooldownSeconds}s
              </span>
            </>
          ) : (
            "Zarejestruj się"
          )}
        </Button>
      </form>
    </div>
  );
}

