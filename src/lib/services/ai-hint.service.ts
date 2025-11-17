// src/lib/services/ai-hint.service.ts
// Service layer for AI Hint generation

import type { PortfolioAggDto, AiHintDto } from "../../types.ts";
import { matchRules, type Locale } from "./ai-hint-rules.ts";
import {
  parseAcceptLanguage,
  getLocalizedHint,
  getDefaultHint,
} from "./ai-hint-locales.ts";

/**
 * Generates an AI Hint based on portfolio aggregation data and locale.
 *
 * The function applies deterministic rules in priority order to evaluate
 * the portfolio structure and generates a localized hint message (max ~160 chars).
 *
 * Rules are checked in priority order, and the first matching rule determines
 * the hint message. If no rules match, a default balanced portfolio message is returned.
 *
 * @param portfolioAgg - Portfolio aggregation data with share percentages
 * @param locale - Locale identifier (e.g., "pl-PL", "en-US")
 * @returns AiHintDto containing hint message, matched rules, and share percentages
 *
 * @example
 * ```typescript
 * const portfolioAgg = await getPortfolioAggByUserId(supabase, userId);
 * const locale = parseAcceptLanguage(request.headers.get("Accept-Language"));
 * const aiHint = generateAiHint(portfolioAgg, locale);
 * ```
 */
export function generateAiHint(portfolioAgg: PortfolioAggDto, locale: Locale): AiHintDto {
  // Match rules against portfolio shares
  const rulesMatched = matchRules(portfolioAgg);

  // Generate hint based on first matched rule (or default if none)
  let hint: string;
  if (rulesMatched.length > 0) {
    hint = getLocalizedHint(rulesMatched[0], locale);
  } else {
    hint = getDefaultHint(locale);
  }

  // Ensure hint doesn't exceed ~160 characters (as per PRD)
  if (hint.length > 160) {
    hint = hint.substring(0, 157) + "...";
  }

  // Return DTO with hint, matched rules, and shares
  return {
    hint,
    rules_matched: rulesMatched,
    shares: {
      stock: portfolioAgg.share_stock,
      etf: portfolioAgg.share_etf,
      bond: portfolioAgg.share_bond,
      cash: portfolioAgg.share_cash,
    },
  };
}

