import * as React from "react";
import { Button } from "@/components/ui/button";
import { EmailField } from "./EmailField";
import { PasswordField } from "./PasswordField";

interface RegisterFormState {
  email: string;
  password: string;
  confirmPassword: string;
  errors: {
    email?: string;
    password?: string;
    confirmPassword?: string;
    submit?: string;
  };
  isLoading: boolean;
  isSuccess: boolean;
  successMessage?: string;
  rateLimitCooldown?: number; // seconds remaining
}

const REQUEST_TIMEOUT_MS = 10000; // 10 seconds
const RATE_LIMIT_COOLDOWN_MS = 60000; // 60 seconds
const MIN_PASSWORD_LENGTH = 6;

export default function RegisterForm() {
  const [state, setState] = React.useState<RegisterFormState>({
    email: "",
    password: "",
    confirmPassword: "",
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

  const validatePassword = (password: string): string | undefined => {
    if (!password) {
      return "Pole hasła jest wymagane";
    }

    if (password.length < MIN_PASSWORD_LENGTH) {
      return `Hasło musi mieć minimum ${MIN_PASSWORD_LENGTH} znaków`;
    }

    return undefined;
  };

  const validateConfirmPassword = (password: string, confirmPassword: string): string | undefined => {
    if (!confirmPassword) {
      return "Pole potwierdzenia hasła jest wymagane";
    }

    if (password !== confirmPassword) {
      return "Hasła nie są identyczne";
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

  const handlePasswordChange = (value: string) => {
    setState((prev) => {
      const newErrors = { ...prev.errors };
      if (prev.errors.password) {
        delete newErrors.password;
      }
      // Re-validate confirm password if it has a value
      if (prev.confirmPassword) {
        const confirmError = validateConfirmPassword(value, prev.confirmPassword);
        if (confirmError) {
          newErrors.confirmPassword = confirmError;
        } else if (prev.errors.confirmPassword) {
          delete newErrors.confirmPassword;
        }
      }
      return {
        ...prev,
        password: value,
        errors: newErrors,
        isSuccess: false,
      };
    });
  };

  const handleConfirmPasswordChange = (value: string) => {
    setState((prev) => ({
      ...prev,
      confirmPassword: value,
      errors: prev.errors.confirmPassword
        ? { ...prev.errors, confirmPassword: undefined }
        : prev.errors,
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

  const handlePasswordBlur = () => {
    const passwordError = validatePassword(state.password);
    if (passwordError) {
      setState((prev) => ({
        ...prev,
        errors: { ...prev.errors, password: passwordError },
      }));
    }
  };

  const handleConfirmPasswordBlur = () => {
    const confirmPasswordError = validateConfirmPassword(state.password, state.confirmPassword);
    if (confirmPasswordError) {
      setState((prev) => ({
        ...prev,
        errors: { ...prev.errors, confirmPassword: confirmPasswordError },
      }));
    }
  };

  const handleEmailFocus = () => {
    setState((prev) => ({
      ...prev,
      errors: prev.errors.email ? { ...prev.errors, email: undefined } : prev.errors,
    }));
  };

  const handlePasswordFocus = () => {
    setState((prev) => ({
      ...prev,
      errors: prev.errors.password ? { ...prev.errors, password: undefined } : prev.errors,
    }));
  };

  const handleConfirmPasswordFocus = () => {
    setState((prev) => ({
      ...prev,
      errors: prev.errors.confirmPassword
        ? { ...prev.errors, confirmPassword: undefined }
        : prev.errors,
    }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Check if rate limited
    if (state.rateLimitCooldown && state.rateLimitCooldown > 0) {
      return;
    }

    // Validate all fields
    const emailError = validateEmail(state.email);
    const passwordError = validatePassword(state.password);
    const confirmPasswordError = validateConfirmPassword(state.password, state.confirmPassword);

    if (emailError || passwordError || confirmPasswordError) {
      setState((prev) => ({
        ...prev,
        errors: {
          email: emailError,
          password: passwordError,
          confirmPassword: confirmPasswordError,
        },
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

      // Call register API endpoint
      const registerPromise = fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: state.email,
          password: state.password,
        }),
      });

      const response = await Promise.race([registerPromise, timeoutPromise]);

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        let errorMessage = "Nie udało się utworzyć konta. Spróbuj ponownie.";
        let rateLimitCooldown: number | undefined;

        // Handle specific error cases
        if (response.status === 429) {
          errorMessage = "Zbyt wiele prób. Spróbuj ponownie za kilka minut.";
          rateLimitCooldown = RATE_LIMIT_COOLDOWN_MS / 1000;
        } else if (response.status === 409) {
          errorMessage = "Użytkownik o tym adresie e-mail już istnieje.";
        } else if (data.error) {
          // Use error message from API if available
          const apiError = data.error.toLowerCase();
          if (apiError.includes("already registered") || apiError.includes("user already")) {
            errorMessage = "Użytkownik o tym adresie e-mail już istnieje.";
          } else if (apiError.includes("password") && apiError.includes("weak")) {
            errorMessage = "Hasło jest zbyt słabe. Minimum 6 znaków.";
          } else if (apiError.includes("invalid email") || apiError.includes("email")) {
            errorMessage = "Nieprawidłowy format adresu e-mail.";
          } else if (apiError.includes("rate limit") || apiError.includes("too many")) {
            errorMessage = "Zbyt wiele prób. Spróbuj ponownie za kilka minut.";
            rateLimitCooldown = RATE_LIMIT_COOLDOWN_MS / 1000;
          } else {
            errorMessage = data.error;
          }
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

      // Success - inform user about confirmation email
      setState((prev) => ({
        ...prev,
        isLoading: false,
        isSuccess: true,
        successMessage: "Konto zostało utworzone. Sprawdź swoją skrzynkę e-mail i kliknij w link potwierdzający, aby aktywować konto.",
      }));
    } catch (error) {
      // Handle timeout or network errors
      let errorMessage = "Nie udało się utworzyć konta. Sprawdź połączenie z internetem i spróbuj ponownie.";

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

      console.error("Registration error:", error);
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
    !state.password ||
    !state.confirmPassword ||
    !!state.errors.email ||
    !!state.errors.password ||
    !!state.errors.confirmPassword ||
    state.isSuccess ||
    (state.rateLimitCooldown !== undefined && state.rateLimitCooldown > 0);

  return (
    <div className="w-full">
      <form
        onSubmit={handleSubmit}
        className="space-y-6"
        noValidate
        aria-label="Formularz rejestracji"
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

        <PasswordField
          value={state.password}
          onChange={handlePasswordChange}
          onBlur={handlePasswordBlur}
          onFocus={handlePasswordFocus}
          error={state.errors.password}
          disabled={state.isLoading || state.isSuccess}
          placeholder="Minimum 6 znaków"
          showStrengthIndicator={true}
        />

        <PasswordField
          value={state.confirmPassword}
          onChange={handleConfirmPasswordChange}
          onBlur={handleConfirmPasswordBlur}
          onFocus={handleConfirmPasswordFocus}
          error={state.errors.confirmPassword}
          disabled={state.isLoading || state.isSuccess}
          label="Potwierdzenie hasła"
          placeholder="Powtórz hasło"
        />

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
              <span className="mr-2" aria-hidden="true">Tworzenie konta...</span>
              <span
                className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
                aria-hidden="true"
              />
              <span className="sr-only">Tworzenie konta</span>
            </>
          ) : state.rateLimitCooldown && state.rateLimitCooldown > 0 ? (
            <>
              <span aria-live="polite" aria-atomic="true">
                Spróbuj ponownie za {state.rateLimitCooldown}s
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

