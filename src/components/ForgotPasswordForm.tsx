import * as React from "react";
import { Button } from "@/components/ui/button";
import { EmailField } from "./EmailField";
import { useAuthForm } from "@/lib/hooks/useAuthForm";
import { forgotPasswordService } from "@/lib/services/forgot-password.service";

const RATE_LIMIT_COOLDOWN_MS = 60000; // 60 seconds

interface ForgotPasswordFormData {
  email: string;
}

export default function ForgotPasswordForm() {
  const form = useAuthForm<ForgotPasswordFormData>({
    initialData: {
      email: "",
    },
    rateLimitCooldownMs: RATE_LIMIT_COOLDOWN_MS,
  });

  // Track success state separately
  const [isSuccess, setIsSuccess] = React.useState(false);
  const [successMessage, setSuccessMessage] = React.useState<string | undefined>();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Check if rate limited
    if (form.rateLimiter.isRateLimited) {
      return;
    }

    // Validate email
    if (!form.validateAll()) {
      return;
    }

    // Set loading state
    form.setLoading(true);
    form.clearErrors();
    setIsSuccess(false);

    try {
      // Use ForgotPasswordService
      const result = await forgotPasswordService.sendResetEmail(form.state.data.email);

      if (!result.success) {
        form.setSubmitError(result.error?.message || "Nie udało się wysłać linku.");

        if (result.error?.isRateLimited) {
          form.rateLimiter.startCooldown();
        }

        return;
      }

      // Success - always show success message (don't reveal if email exists)
      form.setLoading(false);
      setIsSuccess(true);
      setSuccessMessage("Jeśli konto istnieje, otrzymasz email z linkiem resetującym hasło.");
    } catch (error) {
      console.error("Forgot password error:", error);
      form.setSubmitError(
        "Nie udało się wysłać linku. Sprawdź połączenie z internetem i spróbuj ponownie."
      );
    }
  };

  const isSubmitDisabled =
    form.state.isLoading ||
    !form.state.data.email.trim() ||
    !!form.state.errors.email ||
    isSuccess ||
    form.rateLimiter.isRateLimited;

  return (
    <div className="w-full">
      <form
        onSubmit={handleSubmit}
        className="space-y-6"
        noValidate
        aria-label="Formularz odzyskiwania hasła"
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

        <div className="text-sm text-muted-foreground">
          <p>
            Wprowadź swój adres e-mail, a wyślemy Ci link resetujący hasło. Kliknij w link w wiadomości
            e-mail, aby zresetować hasło.
          </p>
        </div>

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
              <span className="mr-2" aria-hidden="true">Wysyłanie...</span>
              <span
                className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
                aria-hidden="true"
              />
              <span className="sr-only">Wysyłanie linku resetującego hasło</span>
            </>
          ) : form.rateLimiter.isRateLimited ? (
            <>
              <span aria-live="polite" aria-atomic="true">
                Spróbuj ponownie za {form.rateLimiter.cooldownSeconds}s
              </span>
            </>
          ) : (
            "Wyślij link resetujący"
          )}
        </Button>
      </form>
    </div>
  );
}

