// src/pages/api/v1/investments/index.ts
// GET /v1/investments - Get investments list endpoint

/* eslint-disable no-console */
import type { APIRoute } from "astro";
import {
  getInvestments,
  createInvestment,
  ConstraintViolationError,
  DatabaseError,
} from "../../../../lib/services/investment.service";
import { validateInvestmentListQuery, validateCreateInvestment } from "../../../../lib/validators/investment.validator";
import { jsonResponse, errorResponse } from "../../../../lib/api/response";
import type { InvestmentListResponseDto, InvestmentDto } from "../../../../types";

export const prerender = false;

/**
 * GET /v1/investments
 *
 * Retrieves a list of investments for the authenticated user with pagination, filtering, and sorting.
 * Requires authentication via Supabase JWT token.
 * Uses RLS to ensure users can only access their own investments.
 *
 * Query parameters:
 * - limit: integer 1-200 (default: 25) - Number of records to return
 * - cursor: string (optional) - Opaque cursor for pagination
 * - type: enum (optional) - Filter by asset type: etf, bond, stock, cash
 * - acquired_at_from: ISODateString (optional) - Filter: acquired date from (inclusive)
 * - acquired_at_to: ISODateString (optional) - Filter: acquired date to (inclusive)
 * - sort: enum (optional) - Sort order: acquired_at_desc (default), acquired_at_asc, amount_desc, amount_asc
 *
 * @returns 200 OK with InvestmentListResponseDto on success
 * @returns 400 Bad Request if query parameters are invalid or cursor format is invalid
 * @returns 401 Unauthorized if authentication fails
 * @returns 500 Internal Server Error on unexpected errors
 *
 * Response headers:
 * - Content-Type: application/json
 * - Cache-Control: private, max-age=60 (for queries without cursor)
 * - Cache-Control: private, no-cache, no-store, must-revalidate (for queries with cursor)
 *
 * Request headers:
 * - Authorization: Bearer <Supabase-JWT> (required)
 * - X-Request-Id: <uuid> (optional, for log correlation)
 */
export const GET: APIRoute = async ({ request, locals }) => {
  // 1. Weryfikacja autoryzacji - early return guard clause
  const supabase = locals.supabase;
  if (!supabase) {
    const requestId = request.headers.get("X-Request-Id");
    console.error(`Supabase client not available in context.locals${requestId ? ` [Request-ID: ${requestId}]` : ""}`);
    return errorResponse({ code: "internal", message: "Internal server error" }, 500);
  }

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    const requestId = request.headers.get("X-Request-Id");
    console.warn(`Authentication failed in GET /v1/investments${requestId ? ` [Request-ID: ${requestId}]` : ""}`);
    return errorResponse({ code: "unauthorized", message: "Missing or invalid authentication token" }, 401);
  }

  // 2. Parsowanie i walidacja parametrów zapytania - early return guard clause
  const url = new URL(request.url);
  const queryParams: Record<string, string | undefined> = {};

  // Extract all query parameters
  for (const [key, value] of url.searchParams.entries()) {
    queryParams[key] = value;
  }

  const validationResult = validateInvestmentListQuery(queryParams);

  if (!validationResult.success) {
    // Map Zod errors to field-wise error messages
    const fields: Record<string, string> = {};
    validationResult.error.errors.forEach((err) => {
      const path = err.path.join(".");
      if (err.code === "invalid_type") {
        fields[path] = "invalid_type";
      } else if (err.code === "too_small") {
        fields[path] = "must_be_between_1_and_200";
      } else if (err.code === "too_big") {
        fields[path] = "must_be_between_1_and_200";
      } else if (err.code === "invalid_string") {
        if (path.includes("acquired_at")) {
          fields[path] = "invalid_date_format";
        } else {
          fields[path] = "invalid_format";
        }
      } else if (err.code === "invalid_enum_value") {
        if (path === "type") {
          fields[path] = "must_be_one_of_etf_bond_stock_cash";
        } else if (path === "sort") {
          fields[path] = "must_be_one_of_acquired_at_desc_acquired_at_asc_amount_desc_amount_asc";
        } else {
          fields[path] = "invalid_value";
        }
      } else {
        fields[path] = err.message || "invalid_value";
      }
    });

    return errorResponse(
      {
        code: "bad_request",
        message: "Invalid query parameters",
        fields,
      },
      400
    );
  }

  const validatedQuery = validationResult.data;

  // 3. Pobranie listy inwestycji - happy path last
  try {
    const result: InvestmentListResponseDto = await getInvestments(supabase, validatedQuery);

    // 4. Sukces - zwrócenie InvestmentListResponseDto z nagłówkami cache
    // Cache-Control: private, max-age=60 dla zapytań z filtrami (cache tylko dla tego użytkownika)
    // Zapytania z kursorem nie powinny być cache'owane (dynamiczne wyniki)
    const cacheControl = validatedQuery.cursor ? "private, no-cache, no-store, must-revalidate" : "private, max-age=60";

    const response = jsonResponse(result, 200);
    response.headers.set("Cache-Control", cacheControl);
    return response;
  } catch (error) {
    // 5. Obsługa błędów - sprawdzenie typu błędu
    const requestId = request.headers.get("X-Request-Id");

    // Jeśli błąd to "Invalid cursor format", zwróć 400
    if (error instanceof Error && error.message === "Invalid cursor format") {
      console.warn(`Invalid cursor format in GET /v1/investments${requestId ? ` [Request-ID: ${requestId}]` : ""}`);
      return errorResponse(
        {
          code: "bad_request",
          message: "Invalid cursor format",
          fields: { cursor: "invalid_cursor_format" },
        },
        400
      );
    }

    // Inne błędy to błędy serwera
    console.error(`Error fetching investments${requestId ? ` [Request-ID: ${requestId}]` : ""}:`, error);
    return errorResponse({ code: "internal", message: "An unexpected error occurred" }, 500);
  }
};

/**
 * POST /v1/investments
 *
 * Creates a new investment for the authenticated user.
 * Requires authentication via Supabase JWT token.
 * Uses RLS to ensure users can only create investments for themselves.
 *
 * Request body (CreateInvestmentCommand):
 * - type: required enum (etf, bond, stock, cash)
 * - amount: required positive number, max 999999999999.99
 * - acquired_at: required ISO date string (YYYY-MM-DD), cannot be future date
 * - notes: optional string (1-1000 chars) or null (empty/whitespace treated as null)
 *
 * @returns 201 Created with InvestmentDto on success
 * @returns 400 Bad Request if validation fails (invalid fields, constraint violations, etc.)
 * @returns 401 Unauthorized if authentication fails
 * @returns 500 Internal Server Error on unexpected errors
 *
 * Response headers:
 * - Content-Type: application/json
 * - Location: /v1/investments/{id} (optional)
 * - Idempotency-Key: echo of request header if provided
 * - X-Request-Id: echo of request header if provided
 *
 * Request headers:
 * - Authorization: Bearer <Supabase-JWT> (required)
 * - Content-Type: application/json (required)
 * - Idempotency-Key: <string> (optional, for future idempotency support)
 * - X-Request-Id: <uuid> (optional, for log correlation)
 */
export const POST: APIRoute = async ({ request, locals }) => {
  const requestId = request.headers.get("X-Request-Id");
  const idempotencyKey = request.headers.get("Idempotency-Key");

  // 1. Weryfikacja autoryzacji - early return guard clause
  const supabase = locals.supabase;
  if (!supabase) {
    console.error(`Supabase client not available in context.locals${requestId ? ` [Request-ID: ${requestId}]` : ""}`);
    return errorResponse({ code: "internal", message: "Internal server error" }, 500);
  }

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    console.warn(`Authentication failed in POST /v1/investments${requestId ? ` [Request-ID: ${requestId}]` : ""}`);
    return errorResponse({ code: "unauthorized", message: "Missing or invalid authentication token" }, 401);
  }

  // 2. Parsowanie request body - early return guard clause
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    console.warn(
      `Invalid JSON in request body for POST /v1/investments${requestId ? ` [Request-ID: ${requestId}]` : ""}`
    );
    return errorResponse(
      {
        code: "bad_request",
        message: "Invalid JSON in request body",
      },
      400
    );
  }

  // 3. Walidacja request body - early return guard clause
  const validationResult = validateCreateInvestment(body);
  if (!validationResult.success) {
    // Map Zod errors to field-wise error messages
    const fields: Record<string, string> = {};
    validationResult.error.errors.forEach((err) => {
      const path = err.path.join(".");
      if (err.code === "invalid_type") {
        fields[path] = "invalid_type";
      } else if (err.code === "too_small") {
        if (path === "amount") {
          fields[path] = "amount_must_be_positive";
        } else if (path === "notes") {
          fields[path] = "notes_cannot_be_empty";
        } else {
          fields[path] = "too_small";
        }
      } else if (err.code === "too_big") {
        if (path === "amount") {
          fields[path] = "exceeds_maximum_value";
        } else if (path === "notes") {
          fields[path] = "must_not_exceed_1000_characters";
        } else {
          fields[path] = "too_big";
        }
      } else if (err.code === "invalid_string") {
        if (path.includes("acquired_at")) {
          fields[path] = "invalid_date_format";
        } else {
          fields[path] = "invalid_format";
        }
      } else if (err.code === "invalid_enum_value") {
        if (path === "type") {
          fields[path] = "must_be_one_of_etf_bond_stock_cash";
        } else {
          fields[path] = "invalid_value";
        }
      } else if (err.code === "custom") {
        // Handle custom refine errors
        if (err.message === "acquired_at_cannot_be_future") {
          fields[path] = "acquired_at_cannot_be_future";
        } else if (err.message === "invalid_date") {
          fields[path] = "invalid_date";
        } else {
          fields[path] = err.message;
        }
      } else if (err.code === "unrecognized_keys") {
        // Handle unknown fields (from .strict() mode)
        const unknownKeys = (
          err && typeof err === "object" && "keys" in err && Array.isArray(err.keys) ? err.keys : []
        ) as string[];
        unknownKeys.forEach((key: string) => {
          fields[key] = "unknown_field";
        });
      } else {
        fields[path] = err.message || "invalid_value";
      }
    });

    return errorResponse(
      {
        code: "bad_request",
        message: "Validation failed",
        fields,
      },
      400
    );
  }

  const createCommand = validationResult.data;

  // 4. Tworzenie inwestycji - happy path last
  try {
    const createdInvestment: InvestmentDto = await createInvestment(supabase, user.id, createCommand);

    // 5. Sukces - zwrócenie 201 Created z InvestmentDto
    const response = jsonResponse(createdInvestment, 201);

    // Add Location header
    response.headers.set("Location", `/v1/investments/${createdInvestment.id}`);

    // Echo Idempotency-Key header if provided (for future idempotency support)
    if (idempotencyKey) {
      response.headers.set("Idempotency-Key", idempotencyKey);
    }

    // Echo X-Request-Id header if provided
    if (requestId) {
      response.headers.set("X-Request-Id", requestId);
    }

    return response;
  } catch (error) {
    // 6. Obsługa błędów - sprawdzenie typu błędu
    if (error instanceof ConstraintViolationError) {
      // Map constraint violations to 400 with field-specific errors
      const fields: Record<string, string> = {};
      if (error.field) {
        if (error.field === "amount") {
          fields[error.field] = "amount_must_be_positive";
        } else if (error.field === "acquired_at") {
          fields[error.field] = "acquired_at_cannot_be_future";
        } else {
          fields[error.field] = "constraint_violation";
        }
      }

      console.warn(
        `Constraint violation in POST /v1/investments${requestId ? ` [Request-ID: ${requestId}]` : ""}:`,
        error.message
      );
      return errorResponse(
        {
          code: "bad_request",
          message: "Validation failed",
          fields: Object.keys(fields).length > 0 ? fields : undefined,
        },
        400
      );
    }

    if (error instanceof DatabaseError) {
      console.error(
        `Database error in POST /v1/investments${requestId ? ` [Request-ID: ${requestId}]` : ""}:`,
        error.originalError || error.message
      );
      return errorResponse({ code: "internal", message: "An unexpected error occurred" }, 500);
    }

    // Unexpected error
    console.error(`Unexpected error in POST /v1/investments${requestId ? ` [Request-ID: ${requestId}]` : ""}:`, error);
    return errorResponse({ code: "internal", message: "An unexpected error occurred" }, 500);
  }
};
