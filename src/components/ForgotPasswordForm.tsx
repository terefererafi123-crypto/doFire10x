import * as React from "react";
import { Button } from "@/components/ui/button";
import { EmailField } from "./EmailField";

interface ForgotPasswordFormState {
  email: string;
  errors: {
    email?: string;
    submit?: string;
  };
  isLoading: boolean;
  isSuccess: boolean;
  successMessage?: string;
  rateLimitCooldown?: number; // seconds remaining
}

const REQUEST_TIMEOUT_MS = 10000; // 10 seconds
const RATE_LIMIT_COOLDOWN_MS = 60000; // 60 seconds

export default function ForgotPasswordForm() {
  const [state, setState] = React.useState<ForgotPasswordFormState>({
    email: "",
    errors: {},
    isLoading: false,
    isSuccess: false,
  });

  const rateLimitIntervalRef = React.useRef<ReturnType<typeof setInterval> | null>(null);

  // Cleanup interval on unmount
  React.useEffect(() => {
    return () => {
      if (rateLimitIntervalRef.current) {
        clearInterval(rateLimitIntervalRef.current);
      }
    };
  }, []);

  const validateEmail = (email: string): string | undefined => {
    if (!email.trim()) {
      return "Pole e-mail jest wymagane";
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return "Nieprawidłowy format adresu e-mail";
    }

    return undefined;
  };

  const handleEmailChange = (value: string) => {
    setState((prev) => ({
      ...prev,
      email: value,
      errors: prev.errors.email ? { ...prev.errors, email: undefined } : prev.errors,
      isSuccess: false,
    }));
  };

  const handleEmailBlur = () => {
    const emailError = validateEmail(state.email);
    if (emailError) {
      setState((prev) => ({
        ...prev,
        errors: { ...prev.errors, email: emailError },
      }));
    }
  };

  const handleEmailFocus = () => {
    setState((prev) => ({
      ...prev,
      errors: prev.errors.email ? { ...prev.errors, email: undefined } : prev.errors,
    }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Check if rate limited
    if (state.rateLimitCooldown && state.rateLimitCooldown > 0) {
      return;
    }

    // Validate email
    const emailError = validateEmail(state.email);
    if (emailError) {
      setState((prev) => ({
        ...prev,
        errors: { email: emailError },
      }));
      return;
    }

    // Clear previous errors
    setState((prev) => ({
      ...prev,
      isLoading: true,
      errors: {},
      isSuccess: false,
    }));

    try {
      // Create timeout promise
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error("TIMEOUT")), REQUEST_TIMEOUT_MS);
      });

      // TODO: Implement actual password reset email with Supabase
      // const resetPromise = supabaseClient.auth.resetPasswordForEmail(state.email, {
      //   redirectTo: `${window.location.origin}/reset-password`,
      // });

      // const { error } = await Promise.race([resetPromise, timeoutPromise]);

      // For now, simulate a delay
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Simulate error for demonstration
      // In real implementation, handle Supabase errors:
      // - 'Email not found' → "Jeśli konto istnieje, otrzymasz email z linkiem resetującym" (don't reveal if email exists)
      // - 'Too many requests' → "Zbyt wiele prób. Spróbuj ponownie za kilka minut"

      // Success - always show success message (don't reveal if email exists)
      setState((prev) => ({
        ...prev,
        isLoading: false,
        isSuccess: true,
        successMessage: "Jeśli konto istnieje, otrzymasz email z linkiem resetującym hasło.",
      }));
    } catch (error) {
      // Handle timeout or network errors
      let errorMessage = "Nie udało się wysłać linku. Sprawdź połączenie z internetem i spróbuj ponownie.";

      if (error instanceof Error) {
        if (error.message === "TIMEOUT") {
          errorMessage = "Żądanie trwa zbyt długo. Spróbuj ponownie.";
        } else if (
          error.message?.toLowerCase().includes("network") ||
          error.message?.toLowerCase().includes("fetch")
        ) {
          errorMessage = "Brak połączenia z internetem. Sprawdź swoje połączenie i spróbuj ponownie.";
        }
      }

      console.error("Forgot password error:", error);
      setState((prev) => ({
        ...prev,
        isLoading: false,
        errors: {
          submit: errorMessage,
        },
      }));
    }
  };

  const isSubmitDisabled =
    state.isLoading ||
    !state.email.trim() ||
    !!state.errors.email ||
    state.isSuccess ||
    (state.rateLimitCooldown !== undefined && state.rateLimitCooldown > 0);

  return (
    <div className="w-full">
      <form
        onSubmit={handleSubmit}
        className="space-y-6"
        noValidate
        aria-label="Formularz odzyskiwania hasła"
      >
        <EmailField
          value={state.email}
          onChange={handleEmailChange}
          onBlur={handleEmailBlur}
          onFocus={handleEmailFocus}
          error={state.errors.email}
          disabled={state.isLoading || state.isSuccess}
          autoFocus={true}
        />

        <div className="text-sm text-muted-foreground">
          <p>
            Wprowadź swój adres e-mail, a wyślemy Ci link resetujący hasło. Kliknij w link w wiadomości
            e-mail, aby zresetować hasło.
          </p>
        </div>

        {state.errors.submit && (
          <div
            role="alert"
            className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm font-medium text-destructive"
            aria-live="assertive"
            aria-atomic="true"
          >
            {state.errors.submit}
          </div>
        )}

        {state.isSuccess && state.successMessage && (
          <div
            role="alert"
            className="rounded-md border border-green-500/50 bg-green-500/10 p-3 text-sm font-medium text-green-700 dark:text-green-400"
            aria-live="polite"
            aria-atomic="true"
          >
            {state.successMessage}
          </div>
        )}

        <Button
          type="submit"
          disabled={isSubmitDisabled}
          className="w-full transition-all"
          aria-busy={state.isLoading}
          aria-disabled={isSubmitDisabled}
        >
          {state.isLoading ? (
            <>
              <span className="mr-2" aria-hidden="true">Wysyłanie...</span>
              <span
                className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
                aria-hidden="true"
              />
              <span className="sr-only">Wysyłanie linku resetującego hasło</span>
            </>
          ) : state.rateLimitCooldown && state.rateLimitCooldown > 0 ? (
            <>
              <span aria-live="polite" aria-atomic="true">
                Spróbuj ponownie za {state.rateLimitCooldown}s
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

