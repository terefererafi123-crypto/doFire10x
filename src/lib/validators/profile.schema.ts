import { z } from "zod";

/**
 * Calculate date boundaries for birth_date validation
 */
const today = new Date();
today.setHours(0, 0, 0, 0);

const maxAge = new Date();
maxAge.setFullYear(today.getFullYear() - 120);
maxAge.setHours(0, 0, 0, 0);

/**
 * Profile form schema for onboarding
 */
export const profileSchema = z.object({
  monthly_expense: z
    .number({
      required_error: "Miesięczne wydatki są wymagane",
      invalid_type_error: "Miesięczne wydatki muszą być liczbą",
    })
    .min(0, "Miesięczne wydatki muszą być >= 0")
    .finite("Miesięczne wydatki muszą być skończoną liczbą"),

  withdrawal_rate_pct: z
    .number({
      required_error: "Stopa wypłat jest wymagana",
      invalid_type_error: "Stopa wypłat musi być liczbą",
    })
    .min(0, "Stopa wypłat musi być >= 0")
    .max(100, "Stopa wypłat musi być <= 100")
    .finite("Stopa wypłat musi być skończoną liczbą"),

  expected_return_pct: z
    .number({
      required_error: "Oczekiwany zwrot jest wymagany",
      invalid_type_error: "Oczekiwany zwrot musi być liczbą",
    })
    .min(-100, "Oczekiwany zwrot musi być >= -100")
    .max(1000, "Oczekiwany zwrot musi być <= 1000")
    .finite("Oczekiwany zwrot musi być skończoną liczbą"),

  birth_date: z
    .string()
    .optional()
    .refine(
      (date) => {
        if (!date) return true;
        const d = new Date(date);
        d.setHours(0, 0, 0, 0);
        return d < today && d >= maxAge;
      },
      {
        message: "Data urodzenia musi być w przeszłości i nie starsza niż 120 lat",
      }
    ),
});

export type ProfileFormData = z.infer<typeof profileSchema>;
