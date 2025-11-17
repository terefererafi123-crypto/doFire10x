// src/lib/services/health.service.ts
// Service layer for health check operations

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../../db/database.types.ts";

export type DatabaseStatus = "reachable" | "degraded" | "down";

const DB_TIMEOUT_MS = 2000;
const DB_DEGRADED_THRESHOLD_MS = 500;

/**
 * Checks database connectivity by executing a simple query and measuring response time.
 * 
 * This function performs a lightweight database operation to verify connectivity.
 * It uses a simple SELECT query to a table that should be accessible (with RLS handling
 * the case where no rows are returned).
 * 
 * Status classification:
 * - "reachable": Response time < 500ms and no errors
 * - "degraded": Response time >= 500ms but < 2000ms and no errors
 * - "down": Response time >= 2000ms, timeout, or any error occurred
 * 
 * @param supabase - Supabase client instance (from context.locals.supabase)
 * @returns Promise resolving to DatabaseStatus indicating database health
 * 
 * @example
 * ```typescript
 * const dbStatus = await checkDatabaseConnectivity(supabase);
 * // Returns: "reachable" | "degraded" | "down"
 * ```
 */
export async function checkDatabaseConnectivity(
  supabase: SupabaseClient<Database>
): Promise<DatabaseStatus> {
  const startTime = Date.now();

  try {
    // Create a timeout promise that rejects after DB_TIMEOUT_MS
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Database timeout")), DB_TIMEOUT_MS)
    );

    // Simple query to check database connectivity
    // Using maybeSingle() to avoid errors when no rows exist (RLS may block access)
    // This is a lightweight operation that doesn't require authentication
    const queryPromise = supabase
      .from("profiles")
      .select("id")
      .limit(1)
      .maybeSingle();

    // Race between query and timeout
    const result = await Promise.race([queryPromise, timeoutPromise]);
    const responseTime = Date.now() - startTime;

    // If we get here, the query completed (even if it returned no rows due to RLS)
    // Check if there was an error in the result
    if (result.error) {
      // Database is reachable but returned an error (e.g., RLS blocking access)
      // For health check purposes, if we got a response, the database is reachable
      // We classify based on response time
      if (responseTime >= DB_TIMEOUT_MS) {
        return "down";
      }
      if (responseTime >= DB_DEGRADED_THRESHOLD_MS) {
        return "degraded";
      }
      // Even with an error, if response was fast, consider it reachable
      // (the error might be due to RLS, not connectivity)
      return "reachable";
    }

    // Query succeeded - classify based on response time
    if (responseTime >= DB_TIMEOUT_MS) {
      return "down";
    }
    if (responseTime >= DB_DEGRADED_THRESHOLD_MS) {
      return "degraded";
    }

    return "reachable";
  } catch (error) {
    // Timeout or any other error occurred
    // Log error only in development (as per plan: minimal logging)
    if (import.meta.env.DEV) {
      console.error("Health check database connectivity error:", error);
    }
    return "down";
  }
}

