/**
 * Maps API error field codes to user-friendly Polish messages
 * Used for displaying validation errors from API responses
 * 
 * This map covers all error codes that can be returned by the API
 * for investment and profile validation
 */
export type ErrorMessageMap = Record<string, string>;

export const investmentErrorMessages: ErrorMessageMap = {
  // Błędy walidacji amount
  amount_must_be_positive: "Kwota musi być większa od zera",
  must_be_gt_zero: "Kwota musi być większa od zera",
  exceeds_maximum_value: "Kwota przekracza maksymalną wartość",
  
  // Błędy walidacji acquired_at
  acquired_at_cannot_be_future: "Data nabycia nie może być z przyszłości",
  invalid_date_format: "Nieprawidłowy format daty. Oczekiwany format: YYYY-MM-DD",
  invalid_date: "Nieprawidłowa data",
  
  // Błędy walidacji type
  must_be_one_of_etf_bond_stock_cash: "Typ musi być jednym z: ETF, Obligacja, Akcja, Gotówka",
  invalid_enum_value: "Nieprawidłowa wartość",
  
  // Błędy walidacji notes
  notes_cannot_be_empty: "Notatki nie mogą być puste (jeśli podane)",
  must_be_at_least_1_character: "Notatki muszą mieć co najmniej 1 znak",
  must_not_exceed_1000_characters: "Notatki nie mogą przekraczać 1000 znaków",
  
  // Ogólne błędy
  invalid_type: "Nieprawidłowy typ danych",
  invalid_format: "Nieprawidłowy format",
  invalid_value: "Nieprawidłowa wartość",
  unknown_field: "Nieznane pole",
  constraint_violation: "Naruszenie ograniczenia",
  must_be_valid_uuid: "Nieprawidłowy format identyfikatora",
  
  // Błędy query params
  must_be_between_1_and_200: "Wartość musi być między 1 a 200",
  invalid_cursor_format: "Nieprawidłowy format kursora",
  must_be_one_of_acquired_at_desc_acquired_at_asc_amount_desc_amount_asc: "Nieprawidłowa wartość sortowania",
};

export const profileErrorMessages: ErrorMessageMap = {
  // Błędy walidacji monthly_expense
  must_be_gte_zero: "Wartość musi być >= 0",
  
  // Błędy walidacji withdrawal_rate_pct
  must_be_lte_100: "Wartość musi być <= 100",
  
  // Błędy walidacji expected_return_pct
  must_be_gte_minus_100: "Wartość musi być >= -100",
  must_be_lte_1000: "Wartość musi być <= 1000",
  
  // Błędy walidacji birth_date
  must_be_in_past_and_within_last_120_years:
    "Data urodzenia musi być w przeszłości i nie starsza niż 120 lat",
  invalid_date_format: "Nieprawidłowy format daty. Oczekiwany format: YYYY-MM-DD",
  invalid_date: "Nieprawidłowa data",
  
  // Ogólne błędy
  invalid_type: "Nieprawidłowy typ danych",
  invalid_format: "Nieprawidłowy format",
  invalid_value: "Nieprawidłowa wartość",
  unknown_field: "Nieznane pole",
  constraint_violation: "Naruszenie ograniczenia",
};

/**
 * Combined error message map for all error codes
 */
const allErrorMessages: ErrorMessageMap = {
  ...investmentErrorMessages,
  ...profileErrorMessages,
};

/**
 * Maps API error field codes to user-friendly Polish messages
 * @param code - Error code from API
 * @param errorMessages - Optional custom error message map (defaults to allErrorMessages)
 * @returns User-friendly error message in Polish
 */
export function mapApiErrorCode(
  code: string,
  errorMessages: ErrorMessageMap = allErrorMessages
): string {
  return errorMessages[code] || "Wystąpił błąd walidacji";
}

/**
 * Maps API error fields to form errors
 * @param fields - Error fields from API response
 * @param errorMessages - Optional custom error message map
 * @returns Record of field names to error messages
 */
export function mapApiErrorsToFormErrors(
  fields: Record<string, string> | undefined,
  errorMessages?: ErrorMessageMap
): Record<string, string> {
  if (!fields) {
    return {};
  }

  const formErrors: Record<string, string> = {};
  for (const [field, code] of Object.entries(fields)) {
    formErrors[field] = mapApiErrorCode(code, errorMessages);
  }

  return formErrors;
}

