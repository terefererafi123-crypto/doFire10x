import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { EmailField } from "./EmailField";
import { forgotPasswordSchema, type ForgotPasswordFormData } from "@/lib/validators/auth.schemas";
import { forgotPasswordService } from "@/lib/services/forgot-password.service";
import { useRateLimiter } from "@/lib/hooks/useRateLimiter";

const RATE_LIMIT_COOLDOWN_MS = 60000; // 60 seconds

export default function ForgotPasswordForm() {
  const rateLimiter = useRateLimiter({ cooldownMs: RATE_LIMIT_COOLDOWN_MS });
  const [isSuccess, setIsSuccess] = React.useState(false);
  const [successMessage, setSuccessMessage] = React.useState<string | undefined>();

  const form = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
    },
    mode: "onBlur", // Validate on blur
  });

  const { register, handleSubmit, watch, setValue, clearErrors, setError, formState } = form;
  const emailRegister = register("email");

  const onSubmit = handleSubmit(async (data) => {
    // Check if rate limited
    if (rateLimiter.isRateLimited) {
      return;
    }

    // Clear previous errors
    clearErrors("root");
    setIsSuccess(false);

    try {
      // Use ForgotPasswordService
      const result = await forgotPasswordService.sendResetEmail(data.email);

      if (!result.success) {
        setError("root", {
          message: result.error?.message || "Nie udało się wysłać linku.",
        });

        if (result.error?.isRateLimited) {
          rateLimiter.startCooldown();
        }

        return;
      }

      // Success - always show success message (don't reveal if email exists)
      setIsSuccess(true);
      setSuccessMessage("Jeśli konto istnieje, otrzymasz email z linkiem resetującym hasło.");
    } catch {
      setError("root", {
        message: "Nie udało się wysłać linku. Sprawdź połączenie z internetem i spróbuj ponownie.",
      });
    }
  });

  const isSubmitting = formState.isSubmitting;
  const rootError = formState.errors.root?.message;
  const emailError = formState.errors.email?.message;

  const isSubmitDisabled =
    isSubmitting || !watch("email")?.trim() || !!emailError || isSuccess || rateLimiter.isRateLimited;

  return (
    <div className="w-full">
      <form onSubmit={onSubmit} className="space-y-6" noValidate aria-label="Formularz odzyskiwania hasła">
        <EmailField
          value={watch("email")}
          onChange={(value) => {
            setValue("email", value);
            setIsSuccess(false);
          }}
          onBlur={emailRegister.onBlur}
          onFocus={() => clearErrors("email")}
          error={emailError}
          disabled={isSubmitting || isSuccess}
          autoFocus={true}
        />

        <div className="text-sm text-muted-foreground">
          <p>
            Wprowadź swój adres e-mail, a wyślemy Ci link resetujący hasło. Kliknij w link w wiadomości e-mail, aby
            zresetować hasło.
          </p>
        </div>

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
          aria-busy={isSubmitting}
          aria-disabled={isSubmitDisabled}
        >
          {isSubmitting ? (
            <>
              <span className="mr-2" aria-hidden="true">
                Wysyłanie...
              </span>
              <span
                className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
                aria-hidden="true"
              />
              <span className="sr-only">Wysyłanie linku resetującego hasło</span>
            </>
          ) : rateLimiter.isRateLimited ? (
            <>
              <span aria-live="polite" aria-atomic="true">
                Spróbuj ponownie za {rateLimiter.cooldownSeconds}s
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
