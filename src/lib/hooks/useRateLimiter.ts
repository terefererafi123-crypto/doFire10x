import { useState, useEffect, useRef, useCallback } from "react";

export interface UseRateLimiterOptions {
  /**
   * Cooldown duration in milliseconds
   * @default 60000 (60 seconds)
   */
  cooldownMs?: number;
}

export interface UseRateLimiterReturn {
  /**
   * Current cooldown in seconds (0 if not rate limited)
   */
  cooldownSeconds: number;
  /**
   * Whether the rate limiter is currently active
   */
  isRateLimited: boolean;
  /**
   * Start the rate limit cooldown
   */
  startCooldown: () => void;
  /**
   * Clear the rate limit cooldown
   */
  clearCooldown: () => void;
}

/**
 * Custom hook for managing rate limiting with countdown
 *
 * @example
 * ```tsx
 * const { cooldownSeconds, isRateLimited, startCooldown } = useRateLimiter();
 *
 * if (error.status === 429) {
 *   startCooldown();
 * }
 * ```
 */
export function useRateLimiter(options: UseRateLimiterOptions = {}): UseRateLimiterReturn {
  const { cooldownMs = 60000 } = options;
  const [cooldownSeconds, setCooldownSeconds] = useState<number>(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const startCooldown = useCallback(() => {
    // Clear existing interval if any
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // Start with full cooldown in seconds
    const initialCooldown = Math.ceil(cooldownMs / 1000);
    setCooldownSeconds(initialCooldown);

    // Start countdown interval
    intervalRef.current = setInterval(() => {
      setCooldownSeconds((prev) => {
        if (prev <= 1) {
          // Cooldown finished
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [cooldownMs]);

  const clearCooldown = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setCooldownSeconds(0);
  }, []);

  const isRateLimited = cooldownSeconds > 0;

  return {
    cooldownSeconds,
    isRateLimited,
    startCooldown,
    clearCooldown,
  };
}
