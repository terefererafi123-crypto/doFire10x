/**
 * Maps API error field codes to user-friendly Polish messages
 * Used for displaying validation errors from API responses
 */
export function mapApiErrorCode(code: string): string {
  const errorMap: Record<string, string> = {
    must_be_gte_zero: "Wartość musi być >= 0",
    must_be_lte_100: "Wartość musi być <= 100",
    must_be_gte_minus_100: "Wartość musi być >= -100",
    must_be_lte_1000: "Wartość musi być <= 1000",
    must_be_in_past_and_within_last_120_years:
      "Data urodzenia musi być w przeszłości i nie starsza niż 120 lat",
    amount_must_be_positive: "Kwota musi być większa od 0",
    acquired_at_cannot_be_future: "Data nabycia nie może być w przyszłości",
    must_be_one_of_etf_bond_stock_cash: "Wybierz typ inwestycji",
    invalid_date_format: "Nieprawidłowy format daty (wymagany: YYYY-MM-DD)",
    notes_cannot_be_empty: "Notatki nie mogą być puste",
    must_not_exceed_1000_characters: "Notatki nie mogą przekraczać 1000 znaków",
  };

  return errorMap[code] || code;
}

/**
 * Maps API error fields to form errors
 * @param fields - Error fields from API response
 * @returns Record of field names to error messages
 */
export function mapApiErrorsToFormErrors(
  fields: Record<string, string> | undefined
): Record<string, string> {
  if (!fields) {
    return {};
  }

  const formErrors: Record<string, string> = {};
  for (const [field, code] of Object.entries(fields)) {
    formErrors[field] = mapApiErrorCode(code);
  }

  return formErrors;
}

