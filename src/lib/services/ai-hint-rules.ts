// src/lib/services/ai-hint-rules.ts
// AI Hint rules definitions and matching logic

import type { PortfolioAggDto } from "../../types.ts";
import type { AiRuleId } from "../../types.ts";

/**
 * Type for locale identifier
 */
export type Locale = "pl-PL" | "en-US" | "en" | "pl";

/**
 * Interface for AI Hint rule definition
 */
export interface AiHintRule {
  id: AiRuleId;
  condition: (shares: PortfolioAggDto) => boolean;
  priority: number; // Lower number = higher priority
}

/**
 * Rule: stock_plus_etf_ge_80
 * Condition: share_stock + share_etf >= 80
 * Priority: 1 (highest)
 */
const stockPlusEtfGe80: AiHintRule = {
  id: "stock_plus_etf_ge_80",
  condition: (shares) => shares.share_stock + shares.share_etf >= 80,
  priority: 1,
};

/**
 * Rule: bond_ge_50
 * Condition: share_bond >= 50
 * Priority: 2
 */
const bondGe50: AiHintRule = {
  id: "bond_ge_50",
  condition: (shares) => shares.share_bond >= 50,
  priority: 2,
};

/**
 * Rule: cash_ge_30
 * Condition: share_cash >= 30
 * Priority: 3
 */
const cashGe30: AiHintRule = {
  id: "cash_ge_30",
  condition: (shares) => shares.share_cash >= 30,
  priority: 3,
};

/**
 * Rule: stock_plus_etf_lt_40
 * Condition: share_stock + share_etf < 40
 * Priority: 4 (lowest)
 */
const stockPlusEtfLt40: AiHintRule = {
  id: "stock_plus_etf_lt_40",
  condition: (shares) => shares.share_stock + shares.share_etf < 40,
  priority: 4,
};

/**
 * All AI Hint rules in priority order (lower priority number = checked first)
 */
export const AI_HINT_RULES: readonly AiHintRule[] = [stockPlusEtfGe80, bondGe50, cashGe30, stockPlusEtfLt40] as const;

/**
 * Matches portfolio shares against AI Hint rules and returns matched rule IDs
 * in priority order (first matched rule determines the hint).
 *
 * Rules are checked in priority order, and only the first matching rule
 * is returned (as per PRD requirements).
 *
 * @param shares - Portfolio aggregation data with share percentages
 * @returns Array of matched rule IDs (typically 0 or 1 element, but can be multiple if needed)
 *
 * @example
 * ```typescript
 * const matched = matchRules(portfolioAgg);
 * if (matched.length > 0) {
 *   const ruleId = matched[0]; // First matched rule (highest priority)
 * }
 * ```
 */
export function matchRules(shares: PortfolioAggDto): AiRuleId[] {
  // Validate shares are within valid range (0-100)
  const sharesToCheck = {
    stock: Math.max(0, Math.min(100, shares.share_stock)),
    etf: Math.max(0, Math.min(100, shares.share_etf)),
    bond: Math.max(0, Math.min(100, shares.share_bond)),
    cash: Math.max(0, Math.min(100, shares.share_cash)),
  };

  const normalizedShares: PortfolioAggDto = {
    ...shares,
    ...sharesToCheck,
  };

  // Check rules in priority order (first match wins)
  for (const rule of AI_HINT_RULES) {
    if (rule.condition(normalizedShares)) {
      return [rule.id];
    }
  }

  // No rules matched
  return [];
}
