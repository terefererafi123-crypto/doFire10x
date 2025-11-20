import { z } from "zod";

/**
 * Calculate today's date for acquired_at validation
 */
const today = new Date();
today.setHours(0, 0, 0, 0);

/**
 * Asset type enum
 */
export const assetTypeEnum = z.enum(["etf", "bond", "stock", "cash"]);

/**
 * Investment form schema
 */
export const investmentSchema = z.object({
  type: assetTypeEnum,

  amount: z
    .number({
      required_error: "Kwota jest wymagana",
      invalid_type_error: "Kwota musi być liczbą",
    })
    .positive("Kwota musi być większa od 0")
    .max(999999999999.99, "Kwota musi być mniejsza niż 999999999999.99")
    .finite("Kwota musi być skończoną liczbą"),

  acquired_at: z
    .string()
    .min(1, "Data nabycia jest wymagana")
    .refine(
      (date) => {
        const d = new Date(date);
        d.setHours(0, 0, 0, 0);
        return d <= today;
      },
      { message: "Data nabycia nie może być w przyszłości" }
    ),

  notes: z
    .string()
    .max(1000, "Notatki nie mogą przekraczać 1000 znaków")
    .optional()
    .nullable(),
});

export type InvestmentFormData = z.infer<typeof investmentSchema>;

