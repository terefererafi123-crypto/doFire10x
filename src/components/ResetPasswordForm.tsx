import * as React from "react";
import { Button } from "@/components/ui/button";
import { PasswordField } from "./PasswordField";

interface ResetPasswordFormState {
  password: string;
  confirmPassword: string;
  errors: {
    password?: string;
    confirmPassword?: string;
    submit?: string;
  };
  isLoading: boolean;
  isSuccess: boolean;
  successMessage?: string;
}

const REQUEST_TIMEOUT_MS = 10000; // 10 seconds
const MIN_PASSWORD_LENGTH = 6;

export default function ResetPasswordForm() {
  const [state, setState] = React.useState<ResetPasswordFormState>({
    password: "",
    confirmPassword: "",
    errors: {},
    isLoading: false,
    isSuccess: false,
  });

  // Check for token in URL on mount
  React.useEffect(() => {
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const accessToken = hashParams.get("access_token");
    const type = hashParams.get("type");

    // Check if this is a recovery token
    if (!accessToken || type !== "recovery") {
      setState((prev) => ({
        ...prev,
        errors: {
          submit: "Link resetujący wygasł lub jest nieprawidłowy. Poproś o nowy link resetujący.",
        },
      }));
    }

    // Clean up URL after checking
    if (accessToken) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

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

    // Validate all fields
    const passwordError = validatePassword(state.password);
    const confirmPasswordError = validateConfirmPassword(state.password, state.confirmPassword);

    if (passwordError || confirmPasswordError) {
      setState((prev) => ({
        ...prev,
        errors: {
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

      // TODO: Implement actual password reset with Supabase
      // const updatePromise = supabaseClient.auth.updateUser({
      //   password: state.password,
      // });

      // const { error } = await Promise.race([updatePromise, timeoutPromise]);

      // For now, simulate a delay
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Simulate error for demonstration
      // In real implementation, handle Supabase errors:
      // - 'Invalid token' → "Link resetujący wygasł lub jest nieprawidłowy"
      // - 'Password too weak' → "Hasło jest zbyt słabe. Minimum 6 znaków"
      // - 'Session expired' → "Sesja wygasła. Poproś o nowy link resetujący"

      // Success
      setState((prev) => ({
        ...prev,
        isLoading: false,
        isSuccess: true,
        successMessage: "Hasło zostało zresetowane. Zostaniesz przekierowany...",
      }));

      // TODO: After successful password reset, redirect to dashboard
      // window.location.href = "/dashboard";
    } catch (error) {
      // Handle timeout or network errors
      let errorMessage = "Nie udało się zresetować hasła. Sprawdź połączenie z internetem i spróbuj ponownie.";

      if (error instanceof Error) {
        if (error.message === "TIMEOUT") {
          errorMessage = "Żądanie trwa zbyt długo. Spróbuj ponownie.";
        } else if (
          error.message?.toLowerCase().includes("network") ||
          error.message?.toLowerCase().includes("fetch")
        ) {
          errorMessage = "Brak połączenia z internetem. Sprawdź swoje połączenie i spróbuj ponownie.";
        } else if (error.message?.toLowerCase().includes("token") || error.message?.toLowerCase().includes("expired")) {
          errorMessage = "Link resetujący wygasł lub jest nieprawidłowy. Poproś o nowy link resetujący.";
        }
      }

      console.error("Reset password error:", error);
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
    !state.password ||
    !state.confirmPassword ||
    !!state.errors.password ||
    !!state.errors.confirmPassword ||
    state.isSuccess;

  return (
    <div className="w-full">
      <form
        onSubmit={handleSubmit}
        className="space-y-6"
        noValidate
        aria-label="Formularz resetowania hasła"
      >
        <PasswordField
          value={state.password}
          onChange={handlePasswordChange}
          onBlur={handlePasswordBlur}
          onFocus={handlePasswordFocus}
          error={state.errors.password}
          disabled={state.isLoading || state.isSuccess}
          autoFocus={true}
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
              <span className="mr-2" aria-hidden="true">Resetowanie...</span>
              <span
                className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
                aria-hidden="true"
              />
              <span className="sr-only">Resetowanie hasła</span>
            </>
          ) : (
            "Zresetuj hasło"
          )}
        </Button>
      </form>
    </div>
  );
}

