import { useCallback } from "react";
import type { CreateProfileCommand, CreateInvestmentCommand } from "@/types";

export type ProfileFormData = CreateProfileCommand;
export type InvestmentFormData = CreateInvestmentCommand;
export type ProfileFormErrors = Record<string, string>;
export type InvestmentFormErrors = Record<string, string>;

/**
 * Custom hook for onboarding form validation
 */
export function useOnboardingForm() {
  const validateProfileForm = useCallback((data: ProfileFormData): ProfileFormErrors => {
    const errors: ProfileFormErrors = {};

    // Validate monthly_expense
    // Note: 0 is a valid value (user can have 0 monthly expenses)
    if (data.monthly_expense === undefined || data.monthly_expense === null || !isFinite(data.monthly_expense)) {
      errors.monthly_expense = "Miesięczne wydatki są wymagane";
    } else if (data.monthly_expense < 0) {
      errors.monthly_expense = "Miesięczne wydatki muszą być >= 0";
    }

    // Validate withdrawal_rate_pct
    if (
      data.withdrawal_rate_pct === undefined ||
      data.withdrawal_rate_pct === null ||
      !isFinite(data.withdrawal_rate_pct)
    ) {
      errors.withdrawal_rate_pct = "Stopa wypłat jest wymagana";
    } else if (data.withdrawal_rate_pct < 0 || data.withdrawal_rate_pct > 100) {
      errors.withdrawal_rate_pct = "Stopa wypłat musi być w zakresie 0-100";
    }

    // Validate expected_return_pct
    if (
      data.expected_return_pct === undefined ||
      data.expected_return_pct === null ||
      !isFinite(data.expected_return_pct)
    ) {
      errors.expected_return_pct = "Oczekiwany zwrot jest wymagany";
    } else if (data.expected_return_pct < -100 || data.expected_return_pct > 1000) {
      errors.expected_return_pct = "Oczekiwany zwrot musi być w zakresie -100 do 1000";
    }

    // Validate birth_date (optional)
    if (data.birth_date) {
      const date = new Date(data.birth_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const maxAge = new Date();
      maxAge.setFullYear(today.getFullYear() - 120);
      maxAge.setHours(0, 0, 0, 0);

      date.setHours(0, 0, 0, 0);

      if (date >= today) {
        errors.birth_date = "Data urodzenia musi być w przeszłości";
      } else if (date < maxAge) {
        errors.birth_date = "Data urodzenia nie może być starsza niż 120 lat";
      }
    }

    return errors;
  }, []);

  const validateInvestmentForm = useCallback((data: InvestmentFormData): InvestmentFormErrors => {
    const errors: InvestmentFormErrors = {};

    // Validate type
    if (!data.type || !["etf", "bond", "stock", "cash"].includes(data.type)) {
      errors.type = "Wybierz typ inwestycji";
    }

    // Validate amount
    if (
      data.amount === undefined ||
      data.amount === null ||
      !isFinite(data.amount) ||
      data.amount <= 0 ||
      data.amount > 999999999999.99
    ) {
      errors.amount = "Kwota musi być większa od 0 i mniejsza niż 999999999999.99";
    }

    // Validate acquired_at
    if (!data.acquired_at) {
      errors.acquired_at = "Data nabycia jest wymagana";
    } else {
      const date = new Date(data.acquired_at);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      date.setHours(0, 0, 0, 0);

      if (date > today) {
        errors.acquired_at = "Data nabycia nie może być w przyszłości";
      }
    }

    // Validate notes (optional)
    if (data.notes !== undefined && data.notes !== null) {
      const trimmed = data.notes.trim();
      if (trimmed.length > 0 && trimmed.length > 1000) {
        errors.notes = "Notatki nie mogą przekraczać 1000 znaków";
      }
    }

    return errors;
  }, []);

  return {
    validateProfileForm,
    validateInvestmentForm,
  };
}
