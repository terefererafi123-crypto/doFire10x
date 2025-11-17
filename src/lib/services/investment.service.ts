// src/lib/services/investment.service.ts
// Service layer for investment-related database operations

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../../db/database.types";
import type { InvestmentDto, InvestmentListResponseDto, InvestmentListQuery, Cursor } from "../../types";
import { toInvestmentDto } from "../../types";

/**
 * Retrieves an investment by ID for the authenticated user.
 * Uses RLS (Row Level Security) to ensure users can only access their own investments.
 *
 * @param id - UUID of the investment to retrieve
 * @param supabase - Supabase client instance with authenticated user context
 * @returns Promise resolving to InvestmentDto if found, null if not found or access denied
 * @throws Error if database operation fails unexpectedly
 */
export async function getInvestmentById(
  id: string,
  supabase: SupabaseClient<Database>
): Promise<InvestmentDto | null> {
  // RLS automatically filters by user_id = auth.uid()
  const { data, error } = await supabase
    .from("investments")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    // If error is "not found" (PGRST116), return null
    if (error.code === "PGRST116") {
      return null;
    }
    // Other errors are unexpected and should be thrown
    throw error;
  }

  if (!data) {
    return null;
  }

  // Convert DB row to DTO (removes user_id)
  return toInvestmentDto(data);
}

/**
 * Deletes an investment by ID for the authenticated user.
 * Uses RLS (Row Level Security) to ensure users can only delete their own investments.
 *
 * @param supabase - Supabase client instance with authenticated user context
 * @param userId - ID of the authenticated user (for verification)
 * @param investmentId - UUID of the investment to delete
 * @returns Promise with success status and optional error message
 */
export async function deleteInvestmentById(
  supabase: SupabaseClient<Database>,
  userId: string,
  investmentId: string
): Promise<{ success: boolean; error?: string }> {
  // RLS automatically filters by user_id = auth.uid()
  const { error, count } = await supabase
    .from("investments")
    .delete({ count: "exact" })
    .eq("id", investmentId);

  if (error) {
    console.error("Database error deleting investment:", error);
    return { success: false, error: "Database error" };
  }

  if (count === 0) {
    return { success: false, error: "Investment not found or access denied" };
  }

  return { success: true };
}

/**
 * Internal structure of a pagination cursor.
 * Contains information needed to resume pagination from a specific point.
 */
interface CursorData {
  last_id: string;
  last_sort_value: string | number;
}

/**
 * Decodes a base64-encoded cursor string to CursorData.
 *
 * @param cursor - Base64-encoded cursor string
 * @returns Decoded cursor data or null if decoding fails
 *
 * @example
 * ```typescript
 * const cursorData = decodeCursor("eyJsYXN0X2lkIjoiLi4uIiwibGFzdF9zb3J0X3ZhbHVlIjoiLi4uIn0=");
 * ```
 */
function decodeCursor(cursor: string): CursorData | null {
  try {
    const decoded = Buffer.from(cursor, "base64").toString("utf-8");
    const data = JSON.parse(decoded) as CursorData;
    
    if (!data.last_id || data.last_sort_value === undefined) {
      return null;
    }
    
    return data;
  } catch {
    return null;
  }
}

/**
 * Encodes CursorData to a base64-encoded cursor string.
 *
 * @param data - Cursor data to encode
 * @returns Base64-encoded cursor string
 *
 * @example
 * ```typescript
 * const cursor = encodeCursor({
 *   last_id: "abc-123",
 *   last_sort_value: "2024-01-01"
 * });
 * ```
 */
function encodeCursor(data: CursorData): Cursor {
  const json = JSON.stringify(data);
  return Buffer.from(json, "utf-8").toString("base64");
}

/**
 * Retrieves a list of investments for the authenticated user with pagination, filtering, and sorting.
 * Uses RLS (Row Level Security) to ensure users can only access their own investments.
 *
 * @param supabase - Supabase client instance with authenticated user context
 * @param query - Validated query parameters (limit, cursor, filters, sort)
 * @returns Promise resolving to InvestmentListResponseDto with items and optional next_cursor
 * @throws Error if database operation fails unexpectedly
 *
 * @example
 * ```typescript
 * const result = await getInvestments(supabase, {
 *   limit: 25,
 *   type: "etf",
 *   sort: "acquired_at_desc"
 * });
 * ```
 */
export async function getInvestments(
  supabase: SupabaseClient<Database>,
  query: InvestmentListQuery
): Promise<InvestmentListResponseDto> {
  // RLS automatically filters by user_id = auth.uid()
  let queryBuilder = supabase
    .from("investments")
    .select("*", { count: "exact" });

  // Apply filters
  if (query.type) {
    queryBuilder = queryBuilder.eq("type", query.type);
  }

  if (query.acquired_at_from) {
    queryBuilder = queryBuilder.gte("acquired_at", query.acquired_at_from);
  }

  if (query.acquired_at_to) {
    queryBuilder = queryBuilder.lte("acquired_at", query.acquired_at_to);
  }

  // Determine sort column and direction
  const sortColumn = query.sort?.startsWith("acquired_at") ? "acquired_at" : "amount";
  const sortDirection = query.sort?.endsWith("_desc") ? false : true; // false = DESC, true = ASC

  // Apply cursor-based pagination if cursor is provided
  if (query.cursor) {
    const cursorData = decodeCursor(query.cursor);
    if (!cursorData) {
      throw new Error("Invalid cursor format");
    }

    // For cursor-based pagination with stable sorting:
    // We need to filter: (sort_column, id) > (last_sort_value, last_id) for DESC
    // or (sort_column, id) < (last_sort_value, last_id) for ASC
    // Since Supabase PostgREST doesn't support compound tuple comparisons directly,
    // we use a simpler approach: filter by sort_column with appropriate operator,
    // and handle tie-breaking by id in post-processing if needed.
    // However, for better performance, we'll use a two-part filter approach.
    
    if (sortDirection) {
      // ASC: We want records where sort_column > last_sort_value
      // OR (sort_column = last_sort_value AND id > last_id)
      // Simplified: filter by sort_column >= last_sort_value, then filter by id > last_id if sort_column = last_sort_value
      if (sortColumn === "acquired_at") {
        queryBuilder = queryBuilder.gte("acquired_at", cursorData.last_sort_value as string);
      } else {
        queryBuilder = queryBuilder.gte("amount", cursorData.last_sort_value as number);
      }
      // Additional filter for tie-breaking: if sort_column equals, id must be greater
      // We'll handle this in post-processing for simplicity
    } else {
      // DESC: We want records where sort_column < last_sort_value
      // OR (sort_column = last_sort_value AND id > last_id)
      // Simplified: filter by sort_column <= last_sort_value, then filter by id > last_id if sort_column = last_sort_value
      if (sortColumn === "acquired_at") {
        queryBuilder = queryBuilder.lte("acquired_at", cursorData.last_sort_value as string);
      } else {
        queryBuilder = queryBuilder.lte("amount", cursorData.last_sort_value as number);
      }
      // Additional filter for tie-breaking: if sort_column equals, id must be greater
      // We'll handle this in post-processing for simplicity
    }
  }

  // Apply sorting
  queryBuilder = queryBuilder.order(sortColumn, { ascending: sortDirection });
  // Add id as secondary sort for stable pagination
  queryBuilder = queryBuilder.order("id", { ascending: true });

  // Fetch limit + 1 to check if there's a next page
  const limit = query.limit ?? 25;
  queryBuilder = queryBuilder.limit(limit + 1);

  const { data, error } = await queryBuilder;

  if (error) {
    throw error;
  }

  // Apply cursor-based filtering for tie-breaking (if cursor was provided)
  let filteredData = data || [];
  if (query.cursor) {
    const cursorData = decodeCursor(query.cursor);
    if (cursorData) {
      // Filter out records that match the cursor exactly (tie-breaking)
      filteredData = filteredData.filter((item) => {
        const sortValue = sortColumn === "acquired_at" ? item.acquired_at : item.amount;
        
        if (sortDirection) {
          // ASC: exclude if (sort_column = last_sort_value AND id <= last_id)
          if (sortValue === cursorData.last_sort_value) {
            return item.id > cursorData.last_id;
          }
          // Include if sort_column > last_sort_value
          return true;
        } else {
          // DESC: exclude if (sort_column = last_sort_value AND id <= last_id)
          if (sortValue === cursorData.last_sort_value) {
            return item.id > cursorData.last_id;
          }
          // Include if sort_column < last_sort_value
          return true;
        }
      });
    }
  }

  // Check if there's a next page
  const hasNextPage = filteredData.length > limit;
  const items = hasNextPage ? filteredData.slice(0, limit) : filteredData;

  // Convert DB rows to DTOs (removes user_id)
  const investmentDtos: InvestmentDto[] = items.map(toInvestmentDto);

  // Generate next_cursor if there's a next page
  let nextCursor: Cursor | undefined;
  if (hasNextPage && items.length > 0) {
    const lastItem = items[items.length - 1];
    const lastSortValue = sortColumn === "acquired_at" ? lastItem.acquired_at : lastItem.amount;
    
    nextCursor = encodeCursor({
      last_id: lastItem.id,
      last_sort_value: lastSortValue,
    });
  }

  return {
    items: investmentDtos,
    next_cursor: nextCursor,
  };
}

