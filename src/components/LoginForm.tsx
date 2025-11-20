import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { EmailField } from "./EmailField";
import { PasswordField } from "./PasswordField";
import { loginSchema, type LoginFormData } from "@/lib/validators/auth.schemas";
import { authService } from "@/lib/services/auth.service";
import { useRateLimiter } from "@/lib/hooks/useRateLimiter";

const RATE_LIMIT_COOLDOWN_MS = 60000; // 60 seconds

export default function LoginForm() {
  const rateLimiter = useRateLimiter({ cooldownMs: RATE_LIMIT_COOLDOWN_MS });

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
    mode: "onBlur",
  });

  const { register, handleSubmit, watch, setValue, clearErrors, setError, formState } = form;
  const emailRegister = register("email");
  const passwordRegister = register("password");

  // Check for error in query params on mount (from middleware redirect)
  React.useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const error = urlParams.get("error");

    if (error === "session_expired") {
      setError("root", { message: "Zaloguj ponownie." });

      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [setError]);

  const onSubmit = handleSubmit(async (data) => {
    // Check if rate limited
    if (rateLimiter.isRateLimited) {
      return;
    }

    // Clear previous errors
    clearErrors("root");

    try {
      // Use AuthService for sign in
      const signInResult = await authService.signIn(data.email, data.password);

      if (!signInResult.success) {
        // Handle error
        setError("root", {
          message: signInResult.error?.message || "Nie udało się zalogować.",
        });

        // Start countdown if rate limited
        if (signInResult.error?.isRateLimited) {
          rateLimiter.startCooldown();
        }

        return;
      }

      // Success - check profile and redirect
      const profileResult = await authService.checkProfileAndRedirect(signInResult.authToken);

      if (profileResult.shouldRedirectToDashboard) {
        window.location.replace("/dashboard");
      } else if (profileResult.shouldRedirectToOnboarding) {
        window.location.replace("/onboarding");
      }
    } catch {
      // Handle unexpected errors
      setError("root", {
        message: "Nie udało się zalogować. Sprawdź połączenie z internetem i spróbuj ponownie.",
      });
    }
  });

  const isSubmitting = formState.isSubmitting;
  const rootError = formState.errors.root?.message;
  const emailError = formState.errors.email?.message;
  const passwordError = formState.errors.password?.message;

  const isSubmitDisabled =
    isSubmitting ||
    !watch("email")?.trim() ||
    !watch("password") ||
    !!emailError ||
    !!passwordError ||
    rateLimiter.isRateLimited;

  return (
    <div className="w-full">
      <form onSubmit={onSubmit} className="space-y-6" noValidate aria-label="Formularz logowania">
        <EmailField
          value={watch("email")}
          onChange={(value) => setValue("email", value)}
          onBlur={emailRegister.onBlur}
          onFocus={() => clearErrors("email")}
          error={emailError}
          disabled={isSubmitting}
          autoFocus={true}
        />

        <PasswordField
          value={watch("password")}
          onChange={(value) => setValue("password", value)}
          onBlur={passwordRegister.onBlur}
          onFocus={() => clearErrors("password")}
          error={passwordError}
          disabled={isSubmitting}
          placeholder="Wprowadź hasło"
        />

        {rootError && (
          <div
            role="alert"
            className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm font-medium text-destructive"
            aria-live="assertive"
            aria-atomic="true"
          >
            {rootError}
          </div>
        )}

        <Button
          type="submit"
          disabled={isSubmitDisabled}
          className="w-full transition-all"
          aria-busy={isSubmitting}
          aria-disabled={isSubmitDisabled}
        >
          {isSubmitting ? (
            <>
              <span className="mr-2" aria-hidden="true">
                Logowanie...
              </span>
              <span
                className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
                aria-hidden="true"
              />
              <span className="sr-only">Logowanie</span>
            </>
          ) : rateLimiter.isRateLimited ? (
            <>
              <span aria-live="polite" aria-atomic="true">
                Spróbuj ponownie za {rateLimiter.cooldownSeconds}s
              </span>
            </>
          ) : (
            "Zaloguj się"
          )}
        </Button>
      </form>
    </div>
  );
}
