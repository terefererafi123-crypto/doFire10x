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

      // TODO: Implement actual registration with Supabase
      // const signUpPromise = supabaseClient.auth.signUp({
      //   email: state.email,
      //   password: state.password,
      // });

      // const { error } = await Promise.race([signUpPromise, timeoutPromise]);

      // For now, simulate a delay
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Simulate error for demonstration
      // In real implementation, handle Supabase errors:
      // - 'User already registered' → "Użytkownik o tym adresie email już istnieje"
      // - 'Password too weak' → "Hasło jest zbyt słabe. Minimum 6 znaków"
      // - 'Invalid email' → "Nieprawidłowy format adresu email"
      // - 'Too many requests' → "Zbyt wiele prób. Spróbuj ponownie za kilka minut"

      // Success
      setState((prev) => ({
        ...prev,
        isLoading: false,
        isSuccess: true,
        successMessage: "Konto zostało utworzone. Zostaniesz przekierowany...",
      }));

      // TODO: After successful registration, check profile and redirect
      // - Check if user has a profile
      // - If no profile → redirect to /onboarding
      // - If profile exists → redirect to /dashboard
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

