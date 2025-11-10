# REST API Plan

> Version: 1.0 (MVP) • Target platform: Supabase (PostgreSQL 14+, Auth, RLS) • Runtime: Edge Functions/Node (TypeScript) • Style: JSON over HTTPS • Base path: `/v1`

## 1. Resources

| Resource | Backing DB object | Description |
|---|---|---|
| `profiles` | table `public.profiles` | Per-user FIRE inputs (monthly expense, withdrawal rate, expected return, birth date). 1:1 with `auth.users`. |
| `investments` | table `public.investments` | User’s investment ledger (type, amount, acquired_at, notes). 1:N with `auth.users`. |
| `portfolio-agg` | view `public.v_investments_agg` | Aggregated totals and percentage shares by asset type for each user. Read-only. |
| `metrics` | computed at runtime | FIRE calculations based on `profiles` + `v_investments_agg`. |
| `ai-hint` | computed at runtime | Deterministic hint derived from `v_investments_agg` shares, per PRD rules. |
| `auth/session` | Supabase Auth | Magic-link login handled on client; server trusts Supabase JWT. |
| `health` | — | Liveness and minimal environment info. |

> **Notes:** All user-scoped resources are implicitly filtered by `auth.uid()` due to RLS. Clients NEVER send `user_id` in payloads.

## 2. Endpoints

### 2.1 Profiles

#### GET `/v1/me/profile`
- **Description:** Fetch the caller’s profile.
- **Auth:** Bearer JWT from Supabase (`authenticated` role). RLS `user_id = auth.uid()`.
- **Response 200 JSON:**
```json
{
  "id": "c0a1dba8-...",
  "user_id": "3b9c...",
  "monthly_expense": 4500.00,
  "withdrawal_rate_pct": 4.00,
  "expected_return_pct": 7.00,
  "birth_date": "1992-05-12",
  "created_at": "2025-01-02T09:00:12Z",
  "updated_at": "2025-01-02T09:00:12Z"
}
```
- **Errors:**
  - `401 unauthorized` (missing/invalid token)
  - `404 not_found` (no profile yet)

#### POST `/v1/me/profile`
- **Description:** Create profile for the caller (idempotent – upsert blocked if exists).
- **Request JSON:**
```json
{
  "monthly_expense": 4500.00,
  "withdrawal_rate_pct": 4.00,
  "expected_return_pct": 7.00,
  "birth_date": "1992-05-12"
}
```
- **Validation:** 
  - `monthly_expense >= 0`
  - `0 <= withdrawal_rate_pct <= 100`
  - `-100 <= expected_return_pct <= 1000`
  - `birth_date` must be in the past and not older than 120 years (or null)
- **Responses:**
  - `201 created` → profile JSON (as above)
  - `409 conflict` if a profile already exists (MVP behavior)
  - `400 bad_request` (validation error with field-wise messages)

#### PATCH `/v1/me/profile`
- **Description:** Partial update of the caller’s profile.
- **Request JSON (any subset):**
```json
{
  "monthly_expense": 5200.00,
  "withdrawal_rate_pct": 3.80,
  "expected_return_pct": 6.50,
  "birth_date": "1991-03-01"
}
```
- **Responses:**
  - `200 ok` → updated profile
  - `404 not_found` (no profile yet)
  - `400 bad_request` (validation error)

### 2.2 Investments

#### GET `/v1/investments`
- **Description:** List investments for the caller with pagination, filtering, and sorting.
- **Query params:**  
  - `limit` (int, 1–200; default 25)  
  - `cursor` (string; opaque next-cursor)  
  - `type` (`etf|bond|stock|cash`, optional)  
  - `acquired_at_from` (`YYYY-MM-DD`, optional)  
  - `acquired_at_to` (`YYYY-MM-DD`, optional)  
  - `sort` (one of: `acquired_at_desc`*default*, `acquired_at_asc`, `amount_desc`, `amount_asc`)
- **Response 200 JSON:**
```json
{
  "items": [
    {
      "id": "ef2a...",
      "type": "etf",
      "amount": 12000.00,
      "acquired_at": "2024-11-01",
      "notes": "IKZE",
      "created_at": "2024-11-01T10:11:12Z",
      "updated_at": "2024-11-01T10:11:12Z"
    }
  ],
  "next_cursor": "eyJvZmZzZXQiOjI1fQ=="
}
```
- **Errors:** `401 unauthorized`

#### POST `/v1/investments`
- **Description:** Create a new investment.
- **Request JSON:**
```json
{
  "type": "bond",
  "amount": 5000.00,
  "acquired_at": "2025-01-10",
  "notes": "COI 4-letnie"
}
```
- **Validation:**
  - `type` in ENUM (`etf|bond|stock|cash`)
  - `amount > 0`
  - `acquired_at <= today`
  - `notes` either null or 1–1000 chars (trimmed non-empty)
- **Responses:**
  - `201 created` → investment JSON with server `id`
  - `400 bad_request` (field-wise errors)

#### GET `/v1/investments/{id}`
- **Description:** Fetch single investment by id (must belong to caller).
- **Responses:**
  - `200 ok` → investment JSON
  - `404 not_found`

#### PATCH `/v1/investments/{id}`
- **Description:** Partial update (type/amount/acquired_at/notes).
- **Validation:** same as POST.
- **Responses:** `200 ok` or `404 not_found` or `400 bad_request`.

#### DELETE `/v1/investments/{id}`
- **Description:** Hard delete (as per PRD). Confirmation is a UI concern.
- **Responses:** `204 no_content` or `404 not_found`.

### 2.3 Portfolio Aggregation (read-only)

#### GET `/v1/me/portfolio-agg`
- **Description:** Fetch aggregated totals and shares for the caller (from `v_investments_agg`). Returns zeroed values if the user has no investments.
- **Response 200 JSON:**
```json
{
  "user_id": "3b9c...",
  "total_amount": 34000.00,
  "sum_stock": 12000.00,
  "sum_etf": 14000.00,
  "sum_bond": 6000.00,
  "sum_cash": 2000.00,
  "share_stock": 35.29,
  "share_etf": 41.18,
  "share_bond": 17.65,
  "share_cash": 5.88
}
```
- **Errors:** `401 unauthorized`

### 2.4 FIRE Metrics (runtime compute)

#### GET `/v1/me/metrics`
- **Description:** Compute FIRE metrics from the caller’s `profile` + `portfolio-agg` at **request time** (no persistence). Supports *what-if* overrides via query.
- **Query params (optional what‑if):**  
  - `monthly_expense` (number)  
  - `withdrawal_rate_pct` (number)  
  - `expected_return_pct` (number)  
  - `invested_total` (number – overrides aggregated total)  
- **Response 200 JSON:**
```json
{
  "inputs": {
    "monthly_expense": 4500.00,
    "withdrawal_rate_pct": 4.00,
    "expected_return_pct": 7.00,
    "invested_total": 34000.00
  },
  "derived": {
    "annual_expense": 54000.00,
    "fire_target": 1350000.00,
    "fire_progress": 0.0252
  },
  "time_to_fire": {
    "years_to_fire": 24.8,
    "birth_date": "1992-05-12",
    "current_age": 33.5,
    "fire_age": 58.3
  }
}
```
- **Edge cases & errors:**
  - If `invested_total <= 0` → `years_to_fire` is `null`, include `"note": "Years to FIRE undefined for zero investments."`
  - If `expected_return_pct <= -100` → `400 bad_request`
  - If profile missing → `404 not_found` with `"message": "profile_not_found"`

### 2.5 AI Hint (deterministic)

#### GET `/v1/me/ai-hint`
- **Description:** Returns a concise portfolio hint based on PRD rules using shares from `/portfolio-agg`.
- **Response 200 JSON:**
```json
{
  "hint": "High risk — large share of stocks and ETFs.",
  "rules_matched": ["stock_plus_etf_ge_80"],
  "shares": {
    "stock": 35.29,
    "etf": 41.18,
    "bond": 17.65,
    "cash": 5.88
  }
}
```
- **Localization:** `Accept-Language` respected (`pl-PL` -> Polish strings).
- **Errors:** `401 unauthorized`

### 2.6 Auth & Session

> **Client-first.** Login via Supabase magic link is handled on the frontend. The backend trusts Supabase JWT and never issues tokens.

#### GET `/v1/auth/session`
- **Description:** Echo endpoint to verify token and return user id and roles.
- **Response 200 JSON:**
```json
{ "user_id": "3b9c...", "roles": ["authenticated"], "iat": 1731172800 }
```
- **Errors:** `401 unauthorized`

### 2.7 Health

#### GET `/v1/health`
- **Description:** Liveness probe and minimal diagnostics.
- **Response 200 JSON:**
```json
{ "status": "ok", "time": "2025-11-10T10:00:00Z", "db": "reachable" }
```

---

## 3. Authentication & Authorization

- **Transport:** HTTPS only; reject plain HTTP.
- **Scheme:** `Authorization: Bearer <Supabase-JWT>` validated by Supabase middleware (Edge Function) or server using JWKS.
- **RLS:** All data paths rely on Postgres Row Level Security: `USING (user_id = auth.uid())` for `SELECT`, `WITH CHECK (user_id = auth.uid())` for `INSERT/UPDATE/DELETE`.
- **Roles:** 
  - `anon`: no table/view access.  
  - `authenticated`: full CRUD on `profiles`/`investments` under RLS; SELECT `v_investments_agg`.  
  - `service_role`: unrestricted (backend only; never exposed to browser).
- **Idempotency:** Support `Idempotency-Key` header for `POST /investments` and `POST /me/profile` to avoid duplicates.
- **CORS:** Restrict to known origins (frontend).
- **Rate limiting:** e.g., 60 req/min per user (global) + stricter 20 req/min for mutation endpoints. Respond `429 too_many_requests` with `Retry-After`.
- **Auditing (future):** Not required per MVP; can add server logs only.

---

## 4. Validation & Business Logic

### 4.1 Field Validation (mirrors DB CHECKs)

**profiles**
- `monthly_expense`: number, `>= 0`.
- `withdrawal_rate_pct`: number, `0–100` inclusive.
- `expected_return_pct`: number, `-100–1000` inclusive; reject `<= -100` for metrics division edge.
- `birth_date`: ISO date in past and not earlier than 120 years.

**investments**
- `type`: enum in `["etf","bond","stock","cash"]`.
- `amount`: number, `> 0`.
- `acquired_at`: ISO date, `<= today` (use DB `current_date` as source of truth).
- `notes`: null or trimmed UTF-8, `1–1000` chars.

> Server performs pre-DB validation to deliver user-friendly messages; DB CHECKs remain the final guardrail.

### 4.2 Business Logic

- **Compute metrics** (runtime only):
  - `annual_expense = monthly_expense * 12`
  - `fire_target = annual_expense / (withdrawal_rate_pct / 100)`
  - `invested_total = Σ(amount)` from `v_investments_agg.total_amount`
  - `fire_progress = invested_total / fire_target`
  - `years_to_fire = ln(fire_target / invested_total) / ln(1 + expected_return_pct/100)` when `invested_total > 0` and `expected_return_pct > -100`
  - `age` from `birth_date`; if null, `current_age` and `fire_age` returned as `null`
- **AI Hint** (deterministic, max ~160 chars; localized):
  - If `share_stock + share_etf >= 80` → “High risk — large share of stocks and ETFs.”
  - Else if `share_bond >= 50` → “Conservative — bonds dominate.”
  - Else if `share_cash >= 30` → “Too much cash — consider investing surplus.”
  - Else if `share_stock + share_etf < 40` → “Low equity — limited growth potential.”
- **Pagination model:** cursor-based; `next_cursor` encodes `(last_sort_value, last_id)` to ensure stable ordering.
- **Sorting:** default `acquired_at DESC` using `investments_acquired_at_idx` and `investments_user_id_idx` for RLS-filtered scans.
- **Error contract:** 
```json
{ "error": { "code": "bad_request", "message": "Kwota musi być większa od zera", "fields": { "amount": "must_be_gt_zero" } } }
```
  - Messages localized via `Accept-Language` (fallback English).

---

## 5. Performance & Security Considerations

- **Indices leveraged:**  
  - `investments_user_id_idx` (RLS filtered lookups)  
  - `investments_acquired_at_idx` (date filters/sorts)  
  - `investments_type_idx` (type filters)  
  - `profiles_user_id_idx` (single-row retrieval)
- **N+1 avoidance:** Aggregations via single query to `v_investments_agg`.
- **HTTP caching:** `GET` endpoints emit `ETag`/`Last-Modified`. Clients may use `If-None-Match` for `/me/profile`, `/investments` (w/o cursor filters), `/me/portfolio-agg`, `/me/ai-hint`, `/me/metrics` (for identical inputs). Avoid caching where inputs vary.
- **Input hardening:** Reject unknown fields; strict JSON parsing; size limits (e.g., 16KB body).
- **Content Security:** No HTML/markdown content is stored except `notes`; sanitize to avoid log injection; DB `text` only.
- **Clock source:** Use DB time (`now()`, `current_date`) for date validations to avoid client skew.
- **Internationalization:** Monetary numbers are in PLN; server emits decimals with two fraction digits.
- **Observability:** Correlate via `X-Request-Id`; structured logs; redact PII.

---

## 6. OpenAPI Sketch (concise)

- OpenAPI 3.1 document can be derived from the above; tags: `Profile`, `Investments`, `Portfolio`, `Metrics`, `AI`, `Auth`, `Health`.  
- Schemas: `Profile`, `Investment`, `PortfolioAgg`, `Metrics`, `AIHint`, `Error`.

---

## 7. Examples

### Create investment
`POST /v1/investments`
```http
Idempotency-Key: 2b4f3b8a-5b9a-4d5a-9b3b-9a12f8d0e001
```
Request
```json
{ "type": "etf", "amount": 12000.00, "acquired_at": "2024-11-01", "notes": "IKZE" }
```
Response 201
```json
{ "id":"ef2a...", "type":"etf", "amount":12000.00, "acquired_at":"2024-11-01", "notes":"IKZE", "created_at":"...", "updated_at":"..." }
```

### Recalculate metrics (what-if)
`GET /v1/me/metrics?monthly_expense=5000&withdrawal_rate_pct=3.5&expected_return_pct=6`

---

## 8. Assumptions (MVP)

- Single profile per user; server returns `409` on duplicate create. Future: `PUT` idempotent upsert.
- No soft deletes (per PRD). Deletion is permanent.
- No external market price integrations; amounts are user-entered (PLN).
- No export/report endpoints in MVP.

---

## 9. Change Log

- 1.0 — Initial MVP plan aligned with DB schema, PRD, and tech stack.
