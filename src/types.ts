// src/types.ts
// DTO & Command Model definitions for DoFIRE API (MVP)
// These types are derived from the generated Supabase database types to ensure
// end-to-end type safety between persistence and transport layers.

// Adjust the import path below to where your generated DB types live.
// It should export `Database`, `Tables`, `TablesInsert`, `TablesUpdate`, `Enums`.
import type {
  Tables,
  TablesInsert,
  TablesUpdate,
  Enums,
} from "./database_models"

/* ------------------------------------------------------------
 * Common primitives
 * ----------------------------------------------------------*/

/** ISO calendar date (YYYY-MM-DD) */
export type ISODateString = string
/** RFC 3339 timestamp */
export type TimestampString = string
/** PLN monetary values serialized with 2 fraction digits */
export type Money = number // serialized as JSON number with 2 decimals

/** Cursor for cursor-based pagination (opaque to clients) */
export type Cursor = string

/** Shared API error envelope */
export interface ApiError {
  error: {
    code:
      | "bad_request"
      | "unauthorized"
      | "forbidden"
      | "not_found"
      | "conflict"
      | "too_many_requests"
      | "internal"
    message: string
    /** Optional field-wise validation info */
    fields?: Record<string, string>
  }
}

/* ------------------------------------------------------------
 * Database-proxied entity helpers
 * ----------------------------------------------------------*/

/**
 * DB-backed row shapes (already narrowed to public schema)
 * These aliases anchor our DTOs to the persistence model.
 */
type DbProfileRow = Tables<"profiles">
type DbInvestmentRow = Tables<"investments">
type DbPortfolioAggRow = Tables<"v_investments_agg">

/** Insert/Update helpers from Supabase typegen (never expose user_id in commands) */
type DbProfileInsert = TablesInsert<"profiles">
type DbProfileUpdate = TablesUpdate<"profiles">
type DbInvestmentInsert = TablesInsert<"investments">
type DbInvestmentUpdate = TablesUpdate<"investments">

/** Enum passthrough */
export type AssetType = Enums<"asset_type">

/* ------------------------------------------------------------
 * Profiles
 * ----------------------------------------------------------*/

/** GET /v1/me/profile — response DTO mirrors DB row */
export interface ProfileDto {
  id: DbProfileRow["id"]
  user_id: DbProfileRow["user_id"]
  monthly_expense: DbProfileRow["monthly_expense"] // Money
  withdrawal_rate_pct: DbProfileRow["withdrawal_rate_pct"]
  expected_return_pct: DbProfileRow["expected_return_pct"]
  birth_date: DbProfileRow["birth_date"] // ISODate or null
  created_at: DbProfileRow["created_at"] // TimestampString
  updated_at: DbProfileRow["updated_at"] // TimestampString
}

/** POST /v1/me/profile — command payload (client NEVER sends user_id/id/timestamps) */
export type CreateProfileCommand = {
  monthly_expense: NonNullable<DbProfileInsert["monthly_expense"]>
  withdrawal_rate_pct: NonNullable<DbProfileInsert["withdrawal_rate_pct"]>
  expected_return_pct: NonNullable<DbProfileInsert["expected_return_pct"]>
  birth_date?: DbProfileInsert["birth_date"]
}

/** PATCH /v1/me/profile — partial update command */
export type UpdateProfileCommand = Partial<CreateProfileCommand>

/* ------------------------------------------------------------
 * Investments
 * ----------------------------------------------------------*/

/**
 * Investment DTO (response), derived from DB row but without user_id
 * as per API plan (user context comes from auth).
 */
export type InvestmentDto = Omit<DbInvestmentRow, "user_id">

/** GET /v1/investments — list response with cursor pagination */
export interface InvestmentListResponseDto {
  items: InvestmentDto[]
  next_cursor?: Cursor
}

/** Query params for GET /v1/investments */
export interface InvestmentListQuery {
  limit?: number // 1–200 (default 25)
  cursor?: Cursor
  type?: AssetType
  acquired_at_from?: ISODateString
  acquired_at_to?: ISODateString
  sort?:
    | "acquired_at_desc"
    | "acquired_at_asc"
    | "amount_desc"
    | "amount_asc"
}

/** POST /v1/investments — create command (no user_id/id/created_at/updated_at) */
export type CreateInvestmentCommand = {
  type: NonNullable<DbInvestmentInsert["type"]>
  amount: NonNullable<DbInvestmentInsert["amount"]>
  acquired_at: NonNullable<DbInvestmentInsert["acquired_at"]>
  notes?: DbInvestmentInsert["notes"]
}

/** PATCH /v1/investments/{id} — update command (partial) */
export type UpdateInvestmentCommand = Partial<CreateInvestmentCommand>

/* ------------------------------------------------------------
 * Portfolio Aggregation (read-only view)
 * ----------------------------------------------------------*/

/** GET /v1/me/portfolio-agg — response DTO (zeroed by server if nulls) */
export interface PortfolioAggDto {
  user_id: NonNullable<DbPortfolioAggRow["user_id"]>
  total_amount: number // Money
  sum_stock: number
  sum_etf: number
  sum_bond: number
  sum_cash: number
  share_stock: number
  share_etf: number
  share_bond: number
  share_cash: number
}

/* ------------------------------------------------------------
 * Metrics (runtime compute)
 * ----------------------------------------------------------*/

/** Query params for GET /v1/me/metrics (what-if overrides) */
export interface MetricsQuery {
  monthly_expense?: number
  withdrawal_rate_pct?: number
  expected_return_pct?: number
  invested_total?: number
}

/** GET /v1/me/metrics — response DTO */
export interface MetricsDto {
  inputs: {
    monthly_expense: number
    withdrawal_rate_pct: number
    expected_return_pct: number
    invested_total: number
  }
  derived: {
    annual_expense: number
    fire_target: number
    fire_progress: number
  }
  time_to_fire: {
    years_to_fire: number | null
    birth_date: ISODateString | null
    current_age: number | null
    fire_age: number | null
  }
  /** Optional server-provided notes for edge cases */
  note?: string
}

/* ------------------------------------------------------------
 * AI Hint (deterministic)
 * ----------------------------------------------------------*/

/** Internal rule identifiers as defined by the API plan */
export type AiRuleId =
  | "stock_plus_etf_ge_80"
  | "bond_ge_50"
  | "cash_ge_30"
  | "stock_plus_etf_lt_40"

/** GET /v1/me/ai-hint — response DTO */
export interface AiHintDto {
  hint: string // localized one-liner (<= ~160 chars)
  rules_matched: AiRuleId[]
  shares: {
    stock: number
    etf: number
    bond: number
    cash: number
  }
}

/* ------------------------------------------------------------
 * Auth & Health
 * ----------------------------------------------------------*/

/** GET /v1/auth/session — echo DTO */
export interface AuthSessionDto {
  user_id: string
  roles: string[]
  iat: number
}

/** GET /v1/health — liveness DTO */
export interface HealthDto {
  status: "ok"
  time: TimestampString
  db: "reachable" | "degraded" | "down"
}

/* ------------------------------------------------------------
 * Idempotency & Headers
 * ----------------------------------------------------------*/

/** Supported custom request headers */
export interface RequestHeaders {
  /** Optional idempotency key for POST endpoints */
  "Idempotency-Key"?: string
  /** Localization; examples: "pl-PL", "en-US" */
  "Accept-Language"?: string
  /** Client-provided correlation identifier */
  "X-Request-Id"?: string
}

/* ------------------------------------------------------------
 * Server Envelope Helpers (optional, for SDKs)
 * ----------------------------------------------------------*/

/** Generic success envelope (not strictly required by API; handy for SDKs) */
export interface Ok<T> {
  ok: true
  data: T
}

/** Generic failure envelope aligned with ApiError */
export interface Err extends ApiError {
  ok?: false
}

/** Discriminated union */
export type Result<T> = Ok<T> | Err

/* ------------------------------------------------------------
 * Type guards (lightweight)
 * ----------------------------------------------------------*/

export const isApiError = (v: unknown): v is ApiError =>
  typeof v === "object" && v !== null && "error" in (v as any)

/* ------------------------------------------------------------
 * Mapping helpers (example optional utilities)
 * ----------------------------------------------------------*/

/** Convert DB investment row -> API DTO (drops user_id) */
export const toInvestmentDto = (row: DbInvestmentRow): InvestmentDto => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { user_id, ...rest } = row
  return rest
}

/** Convert nullable view row -> zero-filled PortfolioAggDto */
export const toPortfolioAggDto = (row: DbPortfolioAggRow): PortfolioAggDto => ({
  user_id: row.user_id ?? "",
  total_amount: row.total_amount ?? 0,
  sum_stock: row.sum_stock ?? 0,
  sum_etf: row.sum_etf ?? 0,
  sum_bond: row.sum_bond ?? 0,
  sum_cash: row.sum_cash ?? 0,
  share_stock: row.share_stock ?? 0,
  share_etf: row.share_etf ?? 0,
  share_bond: row.share_bond ?? 0,
  share_cash: row.share_cash ?? 0,
})
