import * as React from "react";
import { Button } from "@/components/ui/button";
import { PasswordField } from "./PasswordField";
import { useAuthForm } from "@/lib/hooks/useAuthForm";
import { resetPasswordService } from "@/lib/services/reset-password.service";

const MIN_PASSWORD_LENGTH = 6;

interface ResetPasswordFormData {
  password: string;
  confirmPassword: string;
}

export default function ResetPasswordForm() {
  const form = useAuthForm<ResetPasswordFormData>({
    initialData: {
      password: "",
      confirmPassword: "",
    },
    minPasswordLength: MIN_PASSWORD_LENGTH,
  });

  // Track success state separately
  const [isSuccess, setIsSuccess] = React.useState(false);
  const [successMessage, setSuccessMessage] = React.useState<string | undefined>();

  // Check for token in URL on mount
  React.useEffect(() => {
    if (!resetPasswordService.validateToken()) {
      form.setSubmitError("Link resetujący wygasł lub jest nieprawidłowy. Poproś o nowy link resetujący.");
    }

    // Clean up URL after checking
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const accessToken = hashParams.get("access_token");
    if (accessToken) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [form]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Validate all fields
    if (!form.validateAll()) {
      return;
    }

    // Set loading state
    form.setLoading(true);
    form.clearErrors();
    setIsSuccess(false);

    try {
      // Use ResetPasswordService
      const result = await resetPasswordService.resetPassword(form.state.data.password);

      if (!result.success) {
        form.setSubmitError(result.error?.message || "Nie udało się zresetować hasła.");
        return;
      }

      // Success
      form.setLoading(false);
      setIsSuccess(true);
      setSuccessMessage("Hasło zostało zresetowane. Zostaniesz przekierowany...");

      // TODO: After successful password reset, redirect to dashboard
      // window.location.href = "/dashboard";
    } catch {
      form.setSubmitError("Nie udało się zresetować hasła. Sprawdź połączenie z internetem i spróbuj ponownie.");
    }
  };

  const isSubmitDisabled =
    form.state.isLoading ||
    !form.state.data.password ||
    !form.state.data.confirmPassword ||
    !!form.state.errors.password ||
    !!form.state.errors.confirmPassword ||
    isSuccess;

  return (
    <div className="w-full">
      <form onSubmit={handleSubmit} className="space-y-6" noValidate aria-label="Formularz resetowania hasła">
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
          autoFocus={true}
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
              <span className="mr-2" aria-hidden="true">
                Resetowanie...
              </span>
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
