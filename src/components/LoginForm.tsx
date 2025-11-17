import * as React from "react";
import { supabaseClient } from "@/db/supabase.client";
import { Button } from "@/components/ui/button";
import { EmailField } from "./EmailField";
import { cn } from "@/lib/utils";

interface LoginFormState {
  email: string;
  errors: {
    email?: string;
    submit?: string;
  };
  isLoading: boolean;
  isSuccess: boolean;
  successMessage?: string;
}

export default function LoginForm() {
  const [state, setState] = React.useState<LoginFormState>({
    email: "",
    errors: {},
    isLoading: false,
    isSuccess: false,
  });

  // Handle auth state changes (e.g., after clicking magic link)
  React.useEffect(() => {
    const {
      data: { subscription },
    } = supabaseClient.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_IN" && session) {
        // User successfully logged in via magic link
        // Check if user has a profile
        try {
          const response = await fetch("/api/v1/me/profile", {
            headers: {
              Authorization: `Bearer ${session.access_token}`,
            },
          });

          if (response.status === 404) {
            // No profile, redirect to onboarding
            window.location.href = "/onboarding";
          } else if (response.ok) {
            // Profile exists, redirect to dashboard
            window.location.href = "/dashboard";
          } else if (response.status === 401) {
            // Session invalid, redirect to login
            await supabaseClient.auth.signOut();
            window.location.href = "/login";
          }
        } catch (error) {
          console.error("Error checking profile:", error);
          // On error, try to redirect to dashboard anyway
          window.location.href = "/dashboard";
        }
      }
    });

    return () => {
      subscription.unsubscribe();
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
      // Clear email error when user starts typing
      errors: prev.errors.email ? { ...prev.errors, email: undefined } : prev.errors,
      // Clear success state when user changes email
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
    // Clear email error on focus
    setState((prev) => ({
      ...prev,
      errors: prev.errors.email ? { ...prev.errors, email: undefined } : prev.errors,
    }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

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
      const { error } = await supabaseClient.auth.signInWithOtp({
        email: state.email,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`,
        },
      });

      if (error) {
        // Handle error - show neutral message (don't reveal if email exists)
        setState((prev) => ({
          ...prev,
          isLoading: false,
          errors: {
            submit: "Nie udało się wysłać linku. Spróbuj ponownie za chwilę.",
          },
        }));
        return;
      }

      // Success
      setState((prev) => ({
        ...prev,
        isLoading: false,
        isSuccess: true,
        successMessage: "Sprawdź swoją skrzynkę e-mail. Kliknij w link, aby zalogować się.",
      }));
    } catch (error) {
      // Network or other errors
      console.error("Login error:", error);
      setState((prev) => ({
        ...prev,
        isLoading: false,
        errors: {
          submit: "Nie udało się wysłać linku. Sprawdź połączenie z internetem i spróbuj ponownie.",
        },
      }));
    }
  };

  const isSubmitDisabled =
    state.isLoading ||
    !state.email.trim() ||
    !!state.errors.email ||
    state.isSuccess;

  return (
    <div className="w-full">
      <form onSubmit={handleSubmit} className="space-y-6" noValidate>
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
            Wprowadź swój adres e-mail, a wyślemy Ci link logujący. Kliknij w link w wiadomości
            e-mail, aby zalogować się do aplikacji.
          </p>
        </div>

        {state.errors.submit && (
          <div
            role="alert"
            className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive"
            aria-live="assertive"
          >
            {state.errors.submit}
          </div>
        )}

        {state.isSuccess && state.successMessage && (
          <div
            role="alert"
            className="rounded-md border border-green-500/50 bg-green-500/10 p-3 text-sm text-green-700 dark:text-green-400"
            aria-live="polite"
          >
            {state.successMessage}
          </div>
        )}

        <Button
          type="submit"
          disabled={isSubmitDisabled}
          className="w-full"
          aria-busy={state.isLoading}
        >
          {state.isLoading ? (
            <>
              <span className="mr-2">Wysyłanie...</span>
              <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
            </>
          ) : (
            "Wyślij link logowania"
          )}
        </Button>
      </form>
    </div>
  );
}

