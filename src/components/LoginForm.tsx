import * as React from "react";
import { Button } from "@/components/ui/button";
import { EmailField } from "./EmailField";
import { PasswordField } from "./PasswordField";
import { useAuthForm } from "@/lib/hooks/useAuthForm";
import { authService } from "@/lib/services/auth.service";

const RATE_LIMIT_COOLDOWN_MS = 60000; // 60 seconds

interface LoginFormData {
  email: string;
  password: string;
}

export default function LoginForm() {
  const form = useAuthForm<LoginFormData>({
    initialData: {
      email: "",
      password: "",
    },
    rateLimitCooldownMs: RATE_LIMIT_COOLDOWN_MS,
    // Login form doesn't require minimum password length validation
    validators: {
      password: (password: string) => {
        if (!password) {
          return "Pole hasła jest wymagane";
        }
        return undefined;
      },
    },
  });

  // Check for error in query params on mount (from middleware redirect)
  React.useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const error = urlParams.get("error");
    
    if (error === "session_expired") {
      form.setSubmitError("Zaloguj ponownie.");
      
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [form]);

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

    try {
      // Use AuthService for sign in
      const signInResult = await authService.signIn(
        form.state.data.email,
        form.state.data.password
      );

      if (!signInResult.success) {
        // Handle error
        form.setSubmitError(signInResult.error?.message || "Nie udało się zalogować.");

        // Start countdown if rate limited
        if (signInResult.error?.isRateLimited) {
          form.rateLimiter.startCooldown();
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
    } catch (error) {
      // Handle unexpected errors
      console.error("Login error:", error);
      form.setSubmitError(
        "Nie udało się zalogować. Sprawdź połączenie z internetem i spróbuj ponownie."
      );
    }
  };

  const isSubmitDisabled =
    form.state.isLoading ||
    !form.state.data.email.trim() ||
    !form.state.data.password ||
    !!form.state.errors.email ||
    !!form.state.errors.password ||
    form.rateLimiter.isRateLimited;

  return (
    <div className="w-full">
      <form
        onSubmit={handleSubmit}
        className="space-y-6"
        noValidate
        aria-label="Formularz logowania"
      >
        <EmailField
          value={form.state.data.email}
          onChange={(value) => form.setFieldValue("email", value)}
          onBlur={() => form.validateField("email")}
          onFocus={() => form.clearFieldError("email")}
          error={form.state.errors.email}
          disabled={form.state.isLoading}
          autoFocus={true}
        />

        <PasswordField
          value={form.state.data.password}
          onChange={(value) => form.setFieldValue("password", value)}
          onBlur={() => form.validateField("password")}
          onFocus={() => form.clearFieldError("password")}
          error={form.state.errors.password}
          disabled={form.state.isLoading}
          placeholder="Wprowadź hasło"
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

        <Button
          type="submit"
          disabled={isSubmitDisabled}
          className="w-full transition-all"
          aria-busy={form.state.isLoading}
          aria-disabled={isSubmitDisabled}
        >
          {form.state.isLoading ? (
            <>
              <span className="mr-2" aria-hidden="true">Logowanie...</span>
              <span
                className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
                aria-hidden="true"
              />
              <span className="sr-only">Logowanie</span>
            </>
          ) : form.rateLimiter.isRateLimited ? (
            <>
              <span aria-live="polite" aria-atomic="true">
                Spróbuj ponownie za {form.rateLimiter.cooldownSeconds}s
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

