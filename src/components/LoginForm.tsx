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
  rateLimitCooldown?: number; // seconds remaining
}

const REQUEST_TIMEOUT_MS = 10000; // 10 seconds
const RATE_LIMIT_COOLDOWN_MS = 60000; // 60 seconds

export default function LoginForm() {
  const [state, setState] = React.useState<LoginFormState>({
    email: "",
    errors: {},
    isLoading: false,
    isSuccess: false,
  });
  
  const rateLimitIntervalRef = React.useRef<ReturnType<typeof setInterval> | null>(null);

  // Check for expired/invalid tokens in URL on mount
  React.useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    
    // Check for error in query params (Supabase redirects with error)
    const error = urlParams.get("error") || hashParams.get("error");
    const errorDescription = urlParams.get("error_description") || hashParams.get("error_description");
    
    if (error) {
      // Handle expired or invalid token
      let errorMessage = "Link logowania wygasł lub jest nieprawidłowy. Zaloguj się ponownie.";
      
      if (errorDescription) {
        // Decode URL-encoded error description
        try {
          const decoded = decodeURIComponent(errorDescription);
          if (decoded.includes("expired") || decoded.includes("invalid")) {
            errorMessage = "Link logowania wygasł lub jest nieprawidłowy. Zaloguj się ponownie.";
          }
        } catch (e) {
          // Use default message if decoding fails
        }
      }
      
      setState((prev) => ({
        ...prev,
        errors: { submit: errorMessage },
      }));
      
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  // Handle auth state changes (e.g., after clicking magic link)
  React.useEffect(() => {
    const {
      data: { subscription },
    } = supabaseClient.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_IN" && session) {
        // User successfully logged in via magic link
        // Check if user has a profile
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
          
          const response = await fetch("/api/v1/me/profile", {
            headers: {
              Authorization: `Bearer ${session.access_token}`,
            },
            signal: controller.signal,
          });
          
          clearTimeout(timeoutId);

          if (response.status === 404) {
            // No profile, redirect to onboarding
            window.location.href = "/onboarding";
            return;
          }
          
          if (response.ok) {
            // Profile exists, redirect to dashboard
            window.location.href = "/dashboard";
            return;
          }
          
          if (response.status === 401) {
            // Session invalid, clear session and redirect to login
            await supabaseClient.auth.signOut();
            setState((prev) => ({
              ...prev,
              errors: {
                submit: "Sesja wygasła. Zaloguj się ponownie.",
              },
            }));
            // Clean up URL
            window.history.replaceState({}, document.title, window.location.pathname);
            return;
          }
          
          if (response.status === 500) {
            // Server error
            setState((prev) => ({
              ...prev,
              errors: {
                submit: "Problem po naszej stronie. Spróbuj ponownie za chwilę.",
              },
            }));
            return;
          }
          
          // Other errors - try to redirect to dashboard anyway
          console.error("Unexpected response status:", response.status);
          window.location.href = "/dashboard";
        } catch (error) {
          if (error instanceof Error && error.name === "AbortError") {
            // Request timeout
            setState((prev) => ({
              ...prev,
              errors: {
                submit: "Żądanie trwa zbyt długo. Spróbuj ponownie.",
              },
            }));
            return;
          }
          
          // Network or other errors
          console.error("Error checking profile:", error);
          setState((prev) => ({
            ...prev,
            errors: {
              submit: "Brak połączenia z internetem. Sprawdź swoje połączenie i spróbuj ponownie.",
            },
          }));
        }
      }
      
      if (event === "TOKEN_REFRESHED" && session) {
        // Token refreshed successfully, no action needed
      }
      
      if (event === "SIGNED_OUT") {
        // User signed out, clear any errors
        setState((prev) => ({
          ...prev,
          errors: {},
        }));
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);
  
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

      // Race between Supabase call and timeout
      const signInPromise = supabaseClient.auth.signInWithOtp({
        email: state.email,
        options: {
          emailRedirectTo: `${window.location.origin}/dashboard`,
        },
      });

      const { error } = await Promise.race([signInPromise, timeoutPromise]);

      if (error) {
        // Handle specific Supabase errors
        let errorMessage = "Nie udało się wysłać linku. Spróbuj ponownie za chwilę.";
        let rateLimitCooldown: number | undefined;

        // Check for rate limiting (Supabase may return specific error codes)
        if (
          error.message?.toLowerCase().includes("rate limit") ||
          error.message?.toLowerCase().includes("too many") ||
          error.status === 429
        ) {
          errorMessage = "Zbyt wiele prób. Spróbuj ponownie za kilka minut.";
          rateLimitCooldown = RATE_LIMIT_COOLDOWN_MS / 1000; // Convert to seconds
        } else if (error.message?.toLowerCase().includes("email")) {
          // Email-related error (but don't reveal if email exists)
          errorMessage = "Nie udało się wysłać linku. Sprawdź adres e-mail i spróbuj ponownie.";
        }

        setState((prev) => ({
          ...prev,
          isLoading: false,
          errors: {
            submit: errorMessage,
          },
          rateLimitCooldown,
        }));

        // Start countdown if rate limited
        if (rateLimitCooldown) {
          // Clear any existing interval
          if (rateLimitIntervalRef.current) {
            clearInterval(rateLimitIntervalRef.current);
          }
          
          rateLimitIntervalRef.current = setInterval(() => {
            setState((prev) => {
              if (!prev.rateLimitCooldown || prev.rateLimitCooldown <= 1) {
                if (rateLimitIntervalRef.current) {
                  clearInterval(rateLimitIntervalRef.current);
                  rateLimitIntervalRef.current = null;
                }
                const { rateLimitCooldown: _, ...rest } = prev;
                return rest;
              }
              return {
                ...prev,
                rateLimitCooldown: prev.rateLimitCooldown - 1,
              };
            });
          }, 1000);
        }

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
      // Handle timeout or network errors
      let errorMessage = "Nie udało się wysłać linku. Sprawdź połączenie z internetem i spróbuj ponownie.";

      if (error instanceof Error) {
        if (error.message === "TIMEOUT") {
          errorMessage = "Żądanie trwa zbyt długo. Spróbuj ponownie.";
        } else if (error.message?.toLowerCase().includes("network") || error.message?.toLowerCase().includes("fetch")) {
          errorMessage = "Brak połączenia z internetem. Sprawdź swoje połączenie i spróbuj ponownie.";
        }
      }

      console.error("Login error:", error);
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
        aria-label="Formularz logowania"
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
            Wprowadź swój adres e-mail, a wyślemy Ci link logujący. Kliknij w link w wiadomości
            e-mail, aby zalogować się do aplikacji.
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
              <span className="sr-only">Wysyłanie linku logowania</span>
            </>
          ) : state.rateLimitCooldown && state.rateLimitCooldown > 0 ? (
            <>
              <span aria-live="polite" aria-atomic="true">
                Spróbuj ponownie za {state.rateLimitCooldown}s
              </span>
            </>
          ) : (
            "Wyślij link logowania"
          )}
        </Button>
      </form>
    </div>
  );
}

