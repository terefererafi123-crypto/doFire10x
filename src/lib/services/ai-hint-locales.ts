// src/lib/services/ai-hint-locales.ts
// Localization support for AI Hint messages

import type { AiRuleId } from "../../types.ts";
import type { Locale } from "./ai-hint-rules.ts";

/**
 * Map of rule IDs to localized hint messages
 */
const HINT_MESSAGES: Record<AiRuleId, Record<Locale, string>> = {
  stock_plus_etf_ge_80: {
    "pl-PL": "Wysokie ryzyko – duży udział akcji i ETF.",
    pl: "Wysokie ryzyko – duży udział akcji i ETF.",
    "en-US": "High risk — large share of stocks and ETFs.",
    en: "High risk — large share of stocks and ETFs.",
  },
  bond_ge_50: {
    "pl-PL": "Bezpieczny portfel – przewaga obligacji.",
    pl: "Bezpieczny portfel – przewaga obligacji.",
    "en-US": "Conservative — bonds dominate.",
    en: "Conservative — bonds dominate.",
  },
  cash_ge_30: {
    "pl-PL": "Zbyt dużo gotówki – rozważ inwestowanie nadwyżki.",
    pl: "Zbyt dużo gotówki – rozważ inwestowanie nadwyżki.",
    "en-US": "Too much cash — consider investing surplus.",
    en: "Too much cash — consider investing surplus.",
  },
  stock_plus_etf_lt_40: {
    "pl-PL": "Zbyt mało akcji – niższy potencjał wzrostu.",
    pl: "Zbyt mało akcji – niższy potencjał wzrostu.",
    "en-US": "Low equity — limited growth potential.",
    en: "Low equity — limited growth potential.",
  },
};

/**
 * Default hint message when no rules match
 */
const DEFAULT_HINTS: Record<Locale, string> = {
  "pl-PL": "Portfel zrównoważony.",
  pl: "Portfel zrównoważony.",
  "en-US": "Balanced portfolio.",
  en: "Balanced portfolio.",
};

/**
 * Parses Accept-Language header and returns a supported locale.
 * Supports: pl-PL, pl, en-US, en (case-insensitive)
 * Defaults to "en" if header is missing or unsupported.
 *
 * @param acceptLanguageHeader - Value of Accept-Language header (can be null/undefined)
 * @returns Supported locale identifier
 *
 * @example
 * ```typescript
 * const locale = parseAcceptLanguage(request.headers.get("Accept-Language"));
 * // Returns "pl-PL" for "pl-PL", "en" for "en-US", "en" for null
 * ```
 */
export function parseAcceptLanguage(acceptLanguageHeader: string | null | undefined): Locale {
  if (!acceptLanguageHeader) {
    return "en";
  }

  // Normalize to lowercase for case-insensitive matching
  const normalized = acceptLanguageHeader.toLowerCase().trim();

  // Check for exact matches first (pl-PL, en-US)
  if (normalized.startsWith("pl-pl") || normalized.startsWith("pl,")) {
    return "pl-PL";
  }
  if (normalized.startsWith("en-us") || normalized.startsWith("en,")) {
    return "en-US";
  }

  // Check for language codes only (pl, en)
  if (normalized.startsWith("pl")) {
    return "pl";
  }
  if (normalized.startsWith("en")) {
    return "en";
  }

  // Default to English for unsupported locales
  return "en";
}

/**
 * Gets localized hint message for a given rule ID and locale.
 * Falls back to English if locale is not found (should not happen with supported locales).
 *
 * @param ruleId - AI Hint rule identifier
 * @param locale - Locale identifier
 * @returns Localized hint message string
 *
 * @example
 * ```typescript
 * const hint = getLocalizedHint("stock_plus_etf_ge_80", "pl-PL");
 * // Returns "Wysokie ryzyko – duży udział akcji i ETF."
 * ```
 */
export function getLocalizedHint(ruleId: AiRuleId, locale: Locale): string {
  const messages = HINT_MESSAGES[ruleId];
  if (!messages) {
    // Fallback to default if rule ID is invalid
    return DEFAULT_HINTS[locale] || DEFAULT_HINTS["en"];
  }

  // Try exact locale match first, then fallback to language code
  if (messages[locale]) {
    return messages[locale];
  }

  // Fallback to language code (e.g., "pl" for "pl-PL")
  const langCode = locale.split("-")[0] as Locale;
  if (messages[langCode]) {
    return messages[langCode];
  }

  // Final fallback to English
  return messages["en"] || DEFAULT_HINTS["en"];
}

/**
 * Gets default localized hint message when no rules match.
 *
 * @param locale - Locale identifier
 * @returns Default localized hint message
 *
 * @example
 * ```typescript
 * const hint = getDefaultHint("pl-PL");
 * // Returns "Portfel zrównoważony."
 * ```
 */
export function getDefaultHint(locale: Locale): string {
  return DEFAULT_HINTS[locale] || DEFAULT_HINTS["en"];
}
