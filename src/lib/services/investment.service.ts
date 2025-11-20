// src/lib/services/investment.service.ts
// Service layer for investment-related database operations

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../../db/database.types";
import type {
  InvestmentDto,
  InvestmentListResponseDto,
  InvestmentListQuery,
  UpdateInvestmentCommand,
  CreateInvestmentCommand,
  Cursor,
} from "../../types";
import { toInvestmentDto } from "../../types";
import type { TablesUpdate, TablesInsert } from "../../db/database.types";

/**
 * Custom error thrown when an investment is not found or access is denied.
 */
export class InvestmentNotFoundError extends Error {
  constructor(investmentId: string) {
    super(`Investment not found: ${investmentId}`);
    this.name = "InvestmentNotFoundError";
  }
}

/**
 * Custom error thrown when a database operation fails unexpectedly.
 */
export class DatabaseError extends Error {
  constructor(
    message: string,
    public originalError?: unknown
  ) {
    super(message);
    this.name = "DatabaseError";
  }
}

/**
 * Custom error thrown when a database constraint is violated.
 */
export class ConstraintViolationError extends Error {
  constructor(
    message: string,
    public field?: string,
    public originalError?: unknown
  ) {
    super(message);
    this.name = "ConstraintViolationError";
  }
}

/**
 * Retrieves an investment by ID for the authenticated user.
 * Uses RLS (Row Level Security) to ensure users can only access their own investments.
 *
 * @param id - UUID of the investment to retrieve
 * @param supabase - Supabase client instance with authenticated user context
 * @returns Promise resolving to InvestmentDto if found, null if not found or access denied
 * @throws Error if database operation fails unexpectedly
 */
export async function getInvestmentById(id: string, supabase: SupabaseClient<Database>): Promise<InvestmentDto | null> {
  // RLS automatically filters by user_id = auth.uid()
  const { data, error } = await supabase.from("investments").select("*").eq("id", id).single();

  if (error && typeof error === "object" && "code" in error) {
    // If error is "not found" (PGRST116), return null
    if ((error as { code?: string }).code === "PGRST116") {
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
  const { error, count } = await supabase.from("investments").delete({ count: "exact" }).eq("id", investmentId);

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
  let queryBuilder = supabase.from("investments").select("*", { count: "exact" });

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
      // ASC: We want records where (sort_column, id) > (last_sort_value, last_id)
      // This means: sort_column > last_sort_value OR (sort_column = last_sort_value AND id > last_id)
      // Since PostgREST doesn't support compound tuple comparisons, we use >= and filter in post-processing
      if (sortColumn === "acquired_at") {
        queryBuilder = queryBuilder.gte("acquired_at", cursorData.last_sort_value as string);
      } else {
        queryBuilder = queryBuilder.gte("amount", cursorData.last_sort_value as number);
      }
    } else {
      // DESC: We want records where (sort_column, id) < (last_sort_value, last_id)
      // This means: sort_column < last_sort_value OR (sort_column = last_sort_value AND id > last_id)
      // Since PostgREST doesn't support compound tuple comparisons, we use <= and filter in post-processing
      if (sortColumn === "acquired_at") {
        queryBuilder = queryBuilder.lte("acquired_at", cursorData.last_sort_value as string);
      } else {
        queryBuilder = queryBuilder.lte("amount", cursorData.last_sort_value as number);
      }
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
      // Filter out records that should be excluded based on cursor (tie-breaking)
      // For stable pagination: exclude records where (sort_column, id) <= (last_sort_value, last_id)
      filteredData = filteredData.filter((item) => {
        const sortValue = sortColumn === "acquired_at" ? item.acquired_at : item.amount;

        // Compare sort values (handle both string dates and numbers)
        const sortValueNum = typeof sortValue === "string" ? new Date(sortValue).getTime() : sortValue;
        const cursorValueNum =
          typeof cursorData.last_sort_value === "string"
            ? new Date(cursorData.last_sort_value).getTime()
            : cursorData.last_sort_value;

        if (sortDirection) {
          // ASC: include if sort_column > last_sort_value OR (sort_column = last_sort_value AND id > last_id)
          if (sortValueNum > cursorValueNum) {
            return true;
          }
          if (sortValueNum === cursorValueNum) {
            return item.id > cursorData.last_id;
          }
          return false;
        } else {
          // DESC: include if sort_column < last_sort_value OR (sort_column = last_sort_value AND id > last_id)
          if (sortValueNum < cursorValueNum) {
            return true;
          }
          if (sortValueNum === cursorValueNum) {
            return item.id > cursorData.last_id;
          }
          return false;
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

/**
 * Builds a database update payload from an UpdateInvestmentCommand.
 * Only includes fields that are present in the command (whitelist approach).
 * Handles null values for notes (to allow deletion of notes).
 *
 * @param command - Update command with optional fields
 * @returns Database update payload with only provided fields
 */
function buildInvestmentUpdatePayload(command: UpdateInvestmentCommand): TablesUpdate<"investments"> {
  const payload: TablesUpdate<"investments"> = {};

  if (command.type !== undefined) {
    payload.type = command.type;
  }

  if (command.amount !== undefined) {
    // Ensure amount is formatted to 2 decimal places
    payload.amount = Number(command.amount.toFixed(2));
  }

  if (command.acquired_at !== undefined) {
    payload.acquired_at = command.acquired_at;
  }

  if (command.notes !== undefined) {
    // Allow null to delete notes, or string to update
    payload.notes = command.notes;
  }

  return payload;
}

/**
 * Updates an investment by ID for the authenticated user.
 * Uses RLS (Row Level Security) to ensure users can only update their own investments.
 *
 * @param supabase - Supabase client instance with authenticated user context
 * @param userId - ID of the authenticated user (for verification)
 * @param investmentId - UUID of the investment to update
 * @param command - Update command with fields to update (partial)
 * @returns Promise resolving to updated InvestmentDto
 * @throws InvestmentNotFoundError if investment doesn't exist or user doesn't have access
 * @throws DatabaseError if database operation fails unexpectedly
 *
 * @example
 * ```typescript
 * const updated = await updateInvestment(supabase, userId, investmentId, {
 *   amount: 15000.00,
 *   notes: "Updated notes"
 * });
 * ```
 */
export async function updateInvestment(
  supabase: SupabaseClient<Database>,
  userId: string,
  investmentId: string,
  command: UpdateInvestmentCommand
): Promise<InvestmentDto> {
  // 1. Verify investment exists and belongs to user (early return guard clause)
  const { data: existing, error: fetchError } = await supabase
    .from("investments")
    .select("id")
    .eq("id", investmentId)
    .eq("user_id", userId)
    .single();

  if (fetchError) {
    // PGRST116 means no rows returned (not found or access denied)
    if (fetchError.code === "PGRST116") {
      throw new InvestmentNotFoundError(investmentId);
    }
    // Other errors are unexpected
    throw new DatabaseError("Failed to verify investment existence", fetchError);
  }

  if (!existing) {
    throw new InvestmentNotFoundError(investmentId);
  }

  // 2. Build update payload (whitelist approach - only provided fields)
  const updatePayload = buildInvestmentUpdatePayload(command);

  // 3. Execute UPDATE with select to return updated row
  // RLS ensures user can only update their own investments
  // Additional safety: filter by both id and user_id (defense in depth)
  const { data, error } = await supabase
    .from("investments")
    .update(updatePayload)
    .eq("id", investmentId)
    .eq("user_id", userId)
    .select()
    .single();

  if (error && typeof error === "object" && "code" in error) {
    // PGRST116 means no rows returned (shouldn't happen after verification, but handle it)
    if ((error as { code?: string }).code === "PGRST116") {
      throw new InvestmentNotFoundError(investmentId);
    }
    // Other errors are unexpected
    throw new DatabaseError("Failed to update investment", error);
  }

  if (!data) {
    throw new InvestmentNotFoundError(investmentId);
  }

  // 4. Convert DB row to DTO (removes user_id)
  return toInvestmentDto(data);
}

/**
 * Builds a database insert payload from a CreateInvestmentCommand.
 * Adds user_id and ensures amount is formatted to 2 decimal places.
 *
 * @param command - Create command with investment data
 * @param userId - ID of the authenticated user
 * @returns Database insert payload
 */
function buildInvestmentInsertPayload(command: CreateInvestmentCommand, userId: string): TablesInsert<"investments"> {
  return {
    type: command.type,
    amount: Number(command.amount.toFixed(2)), // Ensure 2 decimal places
    acquired_at: command.acquired_at,
    notes: command.notes ?? null, // Convert undefined to null
    user_id: userId,
  };
}

/**
 * Maps Supabase/Postgres error codes to appropriate error types.
 * Handles constraint violations and other database errors.
 *
 * @param error - Supabase error object
 * @returns Appropriate error instance or null if error cannot be mapped
 */
function mapSupabaseError(error: unknown): Error | null {
  // Postgres error codes
  // 23514 = CHECK constraint violation
  // 22P02 = invalid input syntax (e.g., invalid date format)
  // 42501 = insufficient privilege (shouldn't happen with RLS, but handle it)

  if (!error || typeof error !== "object") {
    return null;
  }

  const supabaseError = error as { code?: string; message?: string };

  if (supabaseError.code === "23514") {
    // CHECK constraint violation - could be amount <= 0 or acquired_at > current_date
    const message = supabaseError.message || "Constraint violation";
    // Try to determine which field caused the violation
    let field: string | undefined;
    if (message.includes("amount") || message.includes("positive")) {
      field = "amount";
    } else if (message.includes("acquired_at") || message.includes("future") || message.includes("date")) {
      field = "acquired_at";
    }
    return new ConstraintViolationError(message, field, error);
  }

  if (supabaseError.code === "22P02") {
    // Invalid input syntax
    return new ConstraintViolationError("Invalid input format", undefined, error);
  }

  if (supabaseError.code === "42501") {
    // Insufficient privilege
    return new DatabaseError("Access denied", error);
  }

  // Other errors are not mapped here - let them bubble up as DatabaseError
  return null;
}

/**
 * Creates a new investment for the authenticated user.
 * Uses RLS (Row Level Security) to ensure users can only create investments for themselves.
 *
 * @param supabase - Supabase client instance with authenticated user context
 * @param userId - ID of the authenticated user
 * @param command - Create command with investment data
 * @returns Promise resolving to created InvestmentDto
 * @throws ConstraintViolationError if database constraints are violated
 * @throws DatabaseError if database operation fails unexpectedly
 *
 * @example
 * ```typescript
 * const investment = await createInvestment(supabase, userId, {
 *   type: "bond",
 *   amount: 5000.00,
 *   acquired_at: "2025-01-10",
 *   notes: "COI 4-letnie"
 * });
 * ```
 */
export async function createInvestment(
  supabase: SupabaseClient<Database>,
  userId: string,
  command: CreateInvestmentCommand
): Promise<InvestmentDto> {
  // 1. Build insert payload with user_id
  const insertPayload = buildInvestmentInsertPayload(command, userId);

  // 2. Execute INSERT with select to return created row
  // RLS ensures user can only create investments for themselves
  const { data, error } = await supabase.from("investments").insert(insertPayload).select().single();

  if (error) {
    // 3. Map known Supabase errors to controlled exceptions
    const mappedError = mapSupabaseError(error);
    if (mappedError) {
      throw mappedError;
    }

    // Other errors are unexpected
    throw new DatabaseError("Failed to create investment", error);
  }

  if (!data) {
    throw new DatabaseError("Investment was not created (no data returned)");
  }

  // 4. Convert DB row to DTO (removes user_id)
  return toInvestmentDto(data);
}
