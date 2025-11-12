# API Endpoint Implementation Plan: POST `/v1/me/profile`

## 1. Przegląd punktu końcowego

Endpoint `POST /v1/me/profile` służy do tworzenia profilu użytkownika dla aktualnie zalogowanego użytkownika. Endpoint jest chroniony autoryzacją Bearer JWT i wykorzystuje Row Level Security (RLS) Supabase, aby zapewnić, że użytkownik może utworzyć tylko swój własny profil.

**Funkcjonalność:**
- Tworzy profil użytkownika w tabeli `profiles`
- Jest idempotentny w MVP (zwraca 409 Conflict, jeśli profil już istnieje)
- Waliduje dane wejściowe zgodnie ze specyfikacją API
- Automatycznie ustawia `user_id` na podstawie tokenu JWT
- Wykorzystuje RLS do automatycznej ochrony danych

**Relacja z bazą danych:**
- Tabela: `public.profiles`
- Relacja: 1:1 z `auth.users` (przez `user_id`)
- Indeks: `profiles_user_id_idx` (optymalizacja zapytań)
- Ograniczenie: `profiles_user_id_key` (UNIQUE na `user_id`)

**Zachowanie idempotentności (MVP):**
- W MVP endpoint zwraca `409 Conflict`, jeśli profil już istnieje
- W przyszłości można zmienić na upsert (PUT) lub zmodyfikować POST, aby obsługiwał upsert

---

## 2. Szczegóły żądania

### Metoda HTTP
- `POST`

### Struktura URL
```
POST /v1/me/profile
```

### Parametry
- **Wymagane:** Brak (wszystkie dane w request body)
- **Opcjonalne:** Brak
- **Query string:** Brak
- **Request body:** JSON z danymi profilu

### Request Body

**Struktura JSON:**
```json
{
  "monthly_expense": 4500.00,
  "withdrawal_rate_pct": 4.00,
  "expected_return_pct": 7.00,
  "birth_date": "1992-05-12"
}
```

**Pola:**
- `monthly_expense` (number, wymagane): Miesięczne wydatki użytkownika (PLN, numeric(16,2))
- `withdrawal_rate_pct` (number, wymagane): Roczna stopa wypłaty (procent, numeric(5,2))
- `expected_return_pct` (number, wymagane): Oczekiwana roczna stopa zwrotu (procent, numeric(5,2))
- `birth_date` (string | null, opcjonalne): Data urodzenia użytkownika (ISO 8601 date string: YYYY-MM-DD) lub null

### Headers
- **Wymagane:**
  - `Authorization: Bearer <JWT_TOKEN>` - Token JWT z Supabase Auth
  - `Content-Type: application/json` - Typ treści żądania
- **Opcjonalne:**
  - `Accept-Language: pl-PL` - Lokalizacja komunikatów błędów (domyślnie: en-US)
  - `X-Request-Id: <uuid>` - Identyfikator korelacji żądania
  - `Idempotency-Key: <uuid>` - Klucz idempotentności (opcjonalnie, dla przyszłych wersji)

---

## 3. Wykorzystywane typy

### DTO (Data Transfer Objects)

#### CreateProfileCommand
```typescript
interface CreateProfileCommand {
  monthly_expense: number;        // >= 0, numeric(16,2)
  withdrawal_rate_pct: number;    // 0-100, numeric(5,2)
  expected_return_pct: number;    // -100 to 1000, numeric(5,2)
  birth_date?: string | null;     // ISO 8601 date string (YYYY-MM-DD) lub null
}
```

#### ProfileDto
```typescript
interface ProfileDto {
  id: string;                    // UUID profilu
  user_id: string;               // UUID użytkownika (z auth.users)
  monthly_expense: number;       // Miesięczne wydatki (PLN, numeric(16,2))
  withdrawal_rate_pct: number;   // Roczna stopa wypłaty (%, numeric(5,2))
  expected_return_pct: number;   // Oczekiwana stopa zwrotu (%, numeric(5,2))
  birth_date: string | null;     // Data urodzenia (ISO 8601 date string) lub null
  created_at: string;            // Timestamp utworzenia (RFC 3339)
  updated_at: string;            // Timestamp ostatniej aktualizacji (RFC 3339)
}
```

#### ApiError
```typescript
interface ApiError {
  error: {
    code: "bad_request" | "unauthorized" | "conflict" | "internal";
    message: string;
    fields?: Record<string, string>;  // Field-wise validation errors
  }
}
```

### Typy z bazy danych

#### DbProfileInsert
```typescript
type DbProfileInsert = TablesInsert<"profiles">
```

**Mapowanie CreateProfileCommand → DbProfileInsert:**
- `monthly_expense` → `monthly_expense` (required)
- `withdrawal_rate_pct` → `withdrawal_rate_pct` (required)
- `expected_return_pct` → `expected_return_pct` (required)
- `birth_date` → `birth_date` (optional, nullable)
- `user_id` → automatycznie ustawiane na podstawie `auth.uid()`
- `id`, `created_at`, `updated_at` → automatycznie generowane przez bazę danych

### Typy walidacji (Zod)

#### CreateProfileSchema
```typescript
import { z } from 'zod';

const CreateProfileSchema = z.object({
  monthly_expense: z.number()
    .nonnegative('monthly_expense must be >= 0')
    .finite('monthly_expense must be a finite number'),
  withdrawal_rate_pct: z.number()
    .min(0, 'withdrawal_rate_pct must be >= 0')
    .max(100, 'withdrawal_rate_pct must be <= 100')
    .finite('withdrawal_rate_pct must be a finite number'),
  expected_return_pct: z.number()
    .min(-100, 'expected_return_pct must be >= -100')
    .max(1000, 'expected_return_pct must be <= 1000')
    .finite('expected_return_pct must be a finite number'),
  birth_date: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'birth_date must be in YYYY-MM-DD format')
    .refine((date) => {
      const dateObj = new Date(date);
      const today = new Date();
      const maxAge = new Date();
      maxAge.setFullYear(today.getFullYear() - 120);
      return dateObj < today && dateObj >= maxAge;
    }, 'birth_date must be in the past and not older than 120 years')
    .nullable()
    .optional(),
});
```

---

## 4. Szczegóły odpowiedzi

### Sukces (201 Created)

**Status Code:** `201 Created`

**Response Body:**
```json
{
  "id": "c0a1dba8-1234-5678-9abc-def012345678",
  "user_id": "3b9c1234-5678-9abc-def0-123456789abc",
  "monthly_expense": 4500.00,
  "withdrawal_rate_pct": 4.00,
  "expected_return_pct": 7.00,
  "birth_date": "1992-05-12",
  "created_at": "2025-01-02T09:00:12Z",
  "updated_at": "2025-01-02T09:00:12Z"
}
```

**Headers:**
- `Content-Type: application/json`
- `Location: /v1/me/profile` (opcjonalnie, dla zgodności z REST)

### Błędy

#### 400 Bad Request

**Status Code:** `400 Bad Request`

**Przyczyny:**
- Nieprawidłowy format JSON w request body
- Brak wymaganych pól (monthly_expense, withdrawal_rate_pct, expected_return_pct)
- Nieprawidłowe typy danych (np. string zamiast number)
- Nieprawidłowe wartości (np. monthly_expense < 0, withdrawal_rate_pct > 100)
- Nieprawidłowy format birth_date (nie YYYY-MM-DD)
- birth_date w przyszłości lub starsza niż 120 lat
- Nieznane pola w request body (dodatkowa walidacja)

**Response Body:**
```json
{
  "error": {
    "code": "bad_request",
    "message": "Validation failed",
    "fields": {
      "monthly_expense": "must be >= 0",
      "withdrawal_rate_pct": "must be between 0 and 100",
      "expected_return_pct": "must be between -100 and 1000",
      "birth_date": "must be in the past and not older than 120 years"
    }
  }
}
```

#### 401 Unauthorized

**Status Code:** `401 Unauthorized`

**Przyczyny:**
- Brak nagłówka `Authorization`
- Nieprawidłowy format tokenu JWT
- Token JWT wygasł
- Token JWT jest nieprawidłowy
- Użytkownik nie jest zalogowany

**Response Body:**
```json
{
  "error": {
    "code": "unauthorized",
    "message": "Missing or invalid authentication token"
  }
}
```

#### 409 Conflict

**Status Code:** `409 Conflict`

**Przyczyny:**
- Profil użytkownika już istnieje w bazie danych (relacja 1:1)
- Próba utworzenia drugiego profilu dla tego samego użytkownika

**Response Body:**
```json
{
  "error": {
    "code": "conflict",
    "message": "Profile already exists for this user"
  }
}
```

#### 500 Internal Server Error

**Status Code:** `500 Internal Server Error`

**Przyczyny:**
- Błąd połączenia z bazą danych
- Błąd zapytania SQL
- Nieoczekiwany błąd serwera
- Błąd walidacji na poziomie bazy danych (CHECK constraints)

**Response Body:**
```json
{
  "error": {
    "code": "internal",
    "message": "An internal server error occurred"
  }
}
```

---

## 5. Przepływ danych

### Diagram przepływu

```
Client Request
    ↓
Astro Middleware (context.locals.supabase)
    ↓
API Route Handler (POST /v1/me/profile)
    ↓
1. Authentication Check (getUser())
    ├─→ 401 Unauthorized (if invalid/missing token)
    └─→ Continue
    ↓
2. Parse Request Body (JSON)
    ├─→ 400 Bad Request (if invalid JSON)
    └─→ Continue
    ↓
3. Validate Request Body (Zod)
    ├─→ 400 Bad Request (if validation fails)
    └─→ Continue
    ↓
4. Check if Profile Exists (getProfileByUserId())
    ├─→ 409 Conflict (if profile exists)
    └─→ Continue
    ↓
5. Profile Service (createProfile())
    ↓
6. Supabase Insert (RLS filtered)
    INSERT INTO profiles (user_id, monthly_expense, withdrawal_rate_pct, expected_return_pct, birth_date)
    VALUES (auth.uid(), ..., ..., ..., ...)
    ↓
7. Database Response
    ├─→ Profile created → 201 Created (ProfileDto)
    ├─→ Unique constraint violation → 409 Conflict
    ├─→ CHECK constraint violation → 400 Bad Request
    └─→ Database error → 500 Internal Server Error
    ↓
8. Response to Client
```

### Szczegółowy przepływ

1. **Odebranie żądania**
   - Astro middleware (`src/middleware/index.ts`) dodaje Supabase client do `context.locals.supabase`
   - API route handler odbiera żądanie POST

2. **Weryfikacja autoryzacji**
   - Pobranie tokenu JWT z nagłówka `Authorization: Bearer <token>`
   - Weryfikacja tokenu przez Supabase: `context.locals.supabase.auth.getUser()`
   - Jeśli token jest nieprawidłowy lub brakuje → zwróć `401 Unauthorized`

3. **Parsowanie request body**
   - Odczytanie request body jako JSON
   - Jeśli JSON jest nieprawidłowy → zwróć `400 Bad Request`

4. **Walidacja danych wejściowych**
   - Walidacja za pomocą Zod schema (`CreateProfileSchema`)
   - Sprawdzenie wszystkich reguł walidacji:
     - `monthly_expense >= 0`
     - `0 <= withdrawal_rate_pct <= 100`
     - `-100 <= expected_return_pct <= 1000`
     - `birth_date` w formacie YYYY-MM-DD, w przeszłości, nie starsza niż 120 lat (lub null)
   - Jeśli walidacja nie powiodła się → zwróć `400 Bad Request` z szczegółami błędów

5. **Sprawdzenie, czy profil istnieje**
   - Wywołanie serwisu: `profileService.getProfileByUserId(userId)`
   - Zapytanie do bazy: `supabase.from('profiles').select('id').eq('user_id', userId).single()`
   - Jeśli profil istnieje → zwróć `409 Conflict`
   - Jeśli profil nie istnieje → kontynuuj

6. **Utworzenie profilu**
   - Wywołanie serwisu: `profileService.createProfile(userId, command)`
   - Zapytanie do bazy: `supabase.from('profiles').insert({ user_id: userId, ...command }).select().single()`
   - RLS automatycznie weryfikuje, że `user_id = auth.uid()`
   - Jeśli insert się powiódł → zwróć `201 Created` z `ProfileDto`
   - Jeśli wystąpił błąd unique constraint → zwróć `409 Conflict`
   - Jeśli wystąpił błąd CHECK constraint → zwróć `400 Bad Request`
   - Jeśli wystąpił inny błąd bazy danych → zwróć `500 Internal Server Error`

7. **Zwrócenie odpowiedzi**
   - Serializacja `ProfileDto` do JSON
   - Ustawienie nagłówków odpowiedzi (Content-Type, Location)
   - Zwrócenie odpowiedzi do klienta

---

## 6. Względy bezpieczeństwa

### Autoryzacja

1. **Bearer JWT Authentication**
   - Token JWT musi być przesłany w nagłówku `Authorization: Bearer <token>`
   - Token jest weryfikowany przez Supabase Auth
   - Token musi być ważny i nie wygasły

2. **Row Level Security (RLS)**
   - RLS jest włączone na tabeli `profiles`
   - Polityka INSERT: `WITH CHECK (user_id = auth.uid())`
   - Użytkownik może utworzyć tylko swój własny profil
   - RLS działa automatycznie na poziomie bazy danych
   - `user_id` jest automatycznie ustawiane na podstawie `auth.uid()`

3. **Weryfikacja użytkownika**
   - `auth.uid()` jest automatycznie ustawiane przez Supabase na podstawie tokenu JWT
   - Nie ma potrzeby ręcznej weryfikacji `user_id` w kodzie (RLS zapewnia bezpieczeństwo)
   - Klient NIE może przesłać `user_id` w request body (ignorowane nawet jeśli przesłane)

### Walidacja danych

1. **Walidacja po stronie aplikacji (Zod)**
   - Walidacja wszystkich pól przed wysłaniem do bazy danych
   - Sprawdzenie typów danych (number, string, null)
   - Sprawdzenie zakresów wartości (monthly_expense >= 0, withdrawal_rate_pct 0-100, etc.)
   - Sprawdzenie formatu daty (YYYY-MM-DD)
   - Sprawdzenie, czy data jest w przeszłości i nie starsza niż 120 lat
   - Odrzucenie nieznanych pól w request body

2. **Walidacja po stronie bazy danych (CHECK constraints)**
   - `profiles_monthly_expense_non_negative`: `monthly_expense >= 0`
   - `profiles_withdrawal_rate_range`: `withdrawal_rate_pct >= 0 AND withdrawal_rate_pct <= 100`
   - `profiles_expected_return_range`: `expected_return_pct >= -100 AND expected_return_pct <= 1000`
   - `profiles_birth_date_valid`: `birth_date IS NULL OR (birth_date < current_date AND birth_date >= current_date - interval '120 years')`
   - CHECK constraints działają jako ostatnia linia obrony

3. **Ochrona przed SQL Injection**
   - Używamy Supabase client z parametrami (nie raw SQL)
   - Wszystkie wartości są automatycznie escapowane
   - Brak możliwości SQL injection

### Bezpieczeństwo danych

1. **Ochrona przed atakami**
   - Brak SQL injection (używamy Supabase client z parametrami)
   - Brak XSS (zwracamy tylko dane z bazy, bez HTML)
   - Brak CSRF (używamy Bearer token, nie cookies)
   - Ochrona przed mass assignment (tylko dozwolone pola są akceptowane)

2. **Logowanie**
   - Logowanie błędów autoryzacji (401)
   - Logowanie błędów walidacji (400)
   - Logowanie błędów konfliktu (409)
   - Logowanie błędów bazy danych (500)
   - Brak logowania danych wrażliwych (PII) w logach
   - Używanie strukturalnego logowania (JSON)

3. **Rate limiting**
   - Endpoint powinien być objęty rate limitingiem (np. 20 req/min na użytkownika dla endpointów mutujących)
   - Rate limiting jest obsługiwany na poziomie infrastruktury (nie w tym endpoincie)

4. **Idempotentność (MVP)**
   - W MVP endpoint zwraca `409 Conflict`, jeśli profil już istnieje
   - W przyszłości można dodać obsługę `Idempotency-Key` header dla prawdziwej idempotentności

---

## 7. Obsługa błędów

### Scenariusze błędów

#### 1. Brak tokenu JWT (401)

**Scenariusz:** Klient nie przesłał nagłówka `Authorization` lub token jest nieprawidłowy.

**Obsługa:**
```typescript
const authHeader = request.headers.get('Authorization');
if (!authHeader || !authHeader.startsWith('Bearer ')) {
  return errorResponse(
    { code: 'unauthorized', message: 'Missing or invalid authentication token' },
    401
  );
}

const { data: { user }, error: authError } = await supabase.auth.getUser();
if (authError || !user) {
  return errorResponse(
    { code: 'unauthorized', message: 'Invalid or expired token' },
    401
  );
}
```

#### 2. Nieprawidłowy format JSON (400)

**Scenariusz:** Request body nie jest prawidłowym JSON lub jest puste.

**Obsługa:**
```typescript
let body: unknown;
try {
  body = await request.json();
} catch (error) {
  return errorResponse(
    { code: 'bad_request', message: 'Invalid JSON in request body' },
    400
  );
}
```

#### 3. Błąd walidacji (400)

**Scenariusz:** Dane wejściowe nie spełniają reguł walidacji.

**Obsługa:**
```typescript
const validationResult = CreateProfileSchema.safeParse(body);
if (!validationResult.success) {
  const fieldErrors: Record<string, string> = {};
  validationResult.error.errors.forEach((error) => {
    const field = error.path.join('.');
    fieldErrors[field] = error.message;
  });
  
  return errorResponse(
    {
      code: 'bad_request',
      message: 'Validation failed',
      fields: fieldErrors,
    },
    400
  );
}
```

#### 4. Profil już istnieje (409)

**Scenariusz:** Profil użytkownika już istnieje w bazie danych.

**Obsługa:**
```typescript
// Check if profile exists before insert
const existingProfile = await getProfileByUserId(supabase, user.id);
if (existingProfile) {
  return errorResponse(
    { code: 'conflict', message: 'Profile already exists for this user' },
    409
  );
}

// Or catch unique constraint violation during insert
const { data: profile, error } = await supabase
  .from('profiles')
  .insert({ user_id: user.id, ...command })
  .select()
  .single();

if (error) {
  if (error.code === '23505') { // Unique violation
    return errorResponse(
      { code: 'conflict', message: 'Profile already exists for this user' },
      409
    );
  }
  // Handle other database errors
}
```

#### 5. Błąd CHECK constraint (400)

**Scenariusz:** Dane nie spełniają CHECK constraints w bazie danych (teoretycznie nie powinno się zdarzyć po walidacji Zod).

**Obsługa:**
```typescript
const { data: profile, error } = await supabase
  .from('profiles')
  .insert({ user_id: user.id, ...command })
  .select()
  .single();

if (error) {
  if (error.code === '23514') { // Check constraint violation
    return errorResponse(
      {
        code: 'bad_request',
        message: 'Data validation failed',
        fields: { [error.column || 'unknown']: error.message },
      },
      400
    );
  }
  // Handle other database errors
}
```

#### 6. Błąd bazy danych (500)

**Scenariusz:** Błąd połączenia z bazą danych lub błąd zapytania SQL.

**Obsługa:**
```typescript
try {
  const { data: profile, error } = await supabase
    .from('profiles')
    .insert({ user_id: user.id, ...command })
    .select()
    .single();
  
  if (error && error.code !== '23505' && error.code !== '23514') {
    console.error('Database error:', error);
    return errorResponse(
      { code: 'internal', message: 'An internal server error occurred' },
      500
    );
  }
} catch (err) {
  console.error('Unexpected error:', err);
  return errorResponse(
    { code: 'internal', message: 'An internal server error occurred' },
    500
  );
}
```

#### 7. Nieoczekiwany błąd (500)

**Scenariusz:** Nieoczekiwany błąd w kodzie (np. null reference, type error).

**Obsługa:**
```typescript
try {
  // ... endpoint logic
} catch (err) {
  console.error('Unexpected error:', err);
  return errorResponse(
    { code: 'internal', message: 'An internal server error occurred' },
    500
  );
}
```

### Strategia obsługi błędów

1. **Early returns**
   - Sprawdzenie autoryzacji na początku funkcji
   - Zwrócenie błędu natychmiast, jeśli autoryzacja nie powiodła się
   - Walidacja danych przed wykonaniem jakichkolwiek operacji na bazie danych
   - Unikanie zagnieżdżonych if-else

2. **Guard clauses**
   - Sprawdzenie warunków wstępnych (token, użytkownik, dane wejściowe)
   - Zwrócenie błędu, jeśli warunki nie są spełnione
   - Kontynuacja tylko w przypadku spełnienia warunków

3. **Logowanie błędów**
   - Logowanie wszystkich błędów (401, 400, 409, 500)
   - Brak logowania danych wrażliwych (PII) w logach
   - Używanie strukturalnego logowania (JSON)
   - Logowanie kodów błędów bazy danych dla debugowania

4. **Komunikaty błędów**
   - Komunikaty błędów są przyjazne dla użytkownika
   - Komunikaty błędów są zlokalizowane (Accept-Language)
   - Komunikaty błędów nie ujawniają szczegółów implementacji
   - Szczegółowe komunikaty błędów walidacji (field-wise)

---

## 8. Rozważania dotyczące wydajności

### Optymalizacje

1. **Indeksy bazy danych**
   - Indeks `profiles_user_id_idx` na kolumnie `user_id`
   - Indeks jest używany przez RLS do szybkiego wyszukiwania
   - Zapytanie sprawdzające istnienie profilu jest zoptymalizowane (`.select('id').single()`)

2. **Pojedyncze zapytanie (po walidacji)**
   - Endpoint wykonuje tylko jedno zapytanie INSERT do bazy danych (po sprawdzeniu istnienia profilu)
   - Brak N+1 queries
   - Brak zbędnych zapytań

3. **Walidacja przed zapytaniem**
   - Walidacja danych wejściowych przed wykonaniem zapytania do bazy danych
   - Unikanie niepotrzebnych zapytań do bazy danych dla nieprawidłowych danych
   - Szybsza odpowiedź dla nieprawidłowych danych (bez opóźnienia bazy danych)

4. **Connection pooling**
   - Supabase automatycznie zarządza poolowaniem połączeń
   - Brak potrzeby ręcznego zarządzania połączeniami

### Potencjalne wąskie gardła

1. **Baza danych**
   - Wąskie gardło: połączenie z bazą danych i wykonanie INSERT
   - Rozwiązanie: connection pooling (automatycznie przez Supabase)
   - Monitorowanie: czas odpowiedzi bazy danych

2. **Autoryzacja**
   - Wąskie gardło: weryfikacja tokenu JWT
   - Rozwiązanie: cache tokenów (opcjonalnie)
   - Monitorowanie: czas weryfikacji tokenu

3. **Walidacja**
   - Wąskie gardło: walidacja danych wejściowych (Zod)
   - Rozwiązanie: optymalizacja schema Zod (minimalne sprawdzenia)
   - Monitorowanie: czas walidacji

4. **Serializacja JSON**
   - Wąskie gardło: serializacja odpowiedzi
   - Rozwiązanie: minimalna serializacja (tylko potrzebne pola)
   - Monitorowanie: czas serializacji

### Metryki wydajności

1. **Czas odpowiedzi**
   - Cel: < 200ms (p95) dla endpointów mutujących
   - Monitorowanie: czas od żądania do odpowiedzi
   - Alerty: jeśli czas odpowiedzi > 1000ms

2. **Throughput**
   - Cel: 100 req/s (na serwer) dla endpointów mutujących
   - Monitorowanie: liczba żądań na sekundę
   - Alerty: jeśli throughput < 10 req/s

3. **Błędy**
   - Cel: < 1% błędów
   - Monitorowanie: procent błędów (401, 400, 409, 500)
   - Alerty: jeśli procent błędów > 5%

4. **Błędy walidacji**
   - Cel: < 10% żądań z błędami walidacji
   - Monitorowanie: procent żądań z błędami walidacji (400)
   - Alerty: jeśli procent błędów walidacji > 20%

---

## 9. Etapy wdrożenia

### Krok 1: Utworzenie struktury katalogów

1. Utworzenie katalogu dla API routes:
   ```
   src/pages/api/v1/me/profile.ts
   ```

2. Utworzenie katalogu dla serwisów (jeśli nie istnieje):
   ```
   src/lib/services/
   ```

3. Utworzenie katalogu dla walidacji (jeśli nie istnieje):
   ```
   src/lib/validation/
   ```

### Krok 2: Utworzenie schematu walidacji Zod

1. Utworzenie pliku `src/lib/validation/profile.schema.ts`:
   - Schema `CreateProfileSchema` z wszystkimi regułami walidacji
   - Funkcje pomocnicze do walidacji daty
   - Typy TypeScript dla schematu

2. **Implementacja schematu:**
   ```typescript
   // src/lib/validation/profile.schema.ts
   import { z } from 'zod';

   const birthDateSchema = z.string()
     .regex(/^\d{4}-\d{2}-\d{2}$/, 'birth_date must be in YYYY-MM-DD format')
     .refine((date) => {
       const dateObj = new Date(date);
       const today = new Date();
       today.setHours(0, 0, 0, 0);
       const maxAge = new Date();
       maxAge.setFullYear(today.getFullYear() - 120);
       maxAge.setHours(0, 0, 0, 0);
       return dateObj < today && dateObj >= maxAge;
     }, 'birth_date must be in the past and not older than 120 years')
     .nullable()
     .optional();

   export const CreateProfileSchema = z.object({
     monthly_expense: z.number()
       .nonnegative('monthly_expense must be >= 0')
       .finite('monthly_expense must be a finite number'),
     withdrawal_rate_pct: z.number()
       .min(0, 'withdrawal_rate_pct must be >= 0')
       .max(100, 'withdrawal_rate_pct must be <= 100')
       .finite('withdrawal_rate_pct must be a finite number'),
     expected_return_pct: z.number()
       .min(-100, 'expected_return_pct must be >= -100')
       .max(1000, 'expected_return_pct must be <= 1000')
       .finite('expected_return_pct must be a finite number'),
     birth_date: birthDateSchema,
   });

   export type CreateProfileInput = z.infer<typeof CreateProfileSchema>;
   ```

### Krok 3: Utworzenie serwisu profilu

1. Utworzenie pliku `src/lib/services/profile.service.ts`:
   - Funkcja `getProfileByUserId(userId: string)` (jeśli nie istnieje)
   - Funkcja `createProfile(userId: string, command: CreateProfileCommand)`
   - Obsługa błędów bazy danych
   - Mapowanie `DbProfileRow` → `ProfileDto`

2. **Implementacja serwisu:**
   ```typescript
   // src/lib/services/profile.service.ts
   import type { SupabaseClient } from '@supabase/supabase-js';
   import type { Database } from '../../db/database.types.ts';
   import type { ProfileDto, CreateProfileCommand } from '../../types.ts';
   import type { Tables } from '../../db/database.types.ts';

   type DbProfileRow = Tables<'profiles'>;

   export async function getProfileByUserId(
     supabase: SupabaseClient<Database>,
     userId: string
   ): Promise<ProfileDto | null> {
     const { data, error } = await supabase
       .from('profiles')
       .select('*')
       .eq('user_id', userId)
       .single();

     if (error) {
       if (error.code === 'PGRST116') {
         // No rows returned
         return null;
       }
       throw error;
     }

     return data as ProfileDto;
   }

   export async function createProfile(
     supabase: SupabaseClient<Database>,
     userId: string,
     command: CreateProfileCommand
   ): Promise<ProfileDto> {
     const { data, error } = await supabase
       .from('profiles')
       .insert({
         user_id: userId,
         monthly_expense: command.monthly_expense,
         withdrawal_rate_pct: command.withdrawal_rate_pct,
         expected_return_pct: command.expected_return_pct,
         birth_date: command.birth_date || null,
       })
       .select()
       .single();

     if (error) {
       // Re-throw with error code for proper handling
       throw error;
     }

     return data as ProfileDto;
   }
   ```

### Krok 4: Utworzenie helpera autoryzacji

1. Utworzenie pliku `src/lib/auth/helpers.ts` (jeśli nie istnieje):
   - Funkcja `getAuthenticatedUser(supabase)`
   - Obsługa błędów autoryzacji
   - Zwracanie użytkownika lub null

2. **Implementacja helpera:**
   ```typescript
   // src/lib/auth/helpers.ts
   import type { SupabaseClient } from '@supabase/supabase-js';
   import type { Database } from '../../db/database.types.ts';
   import type { User } from '@supabase/supabase-js';

   export async function getAuthenticatedUser(
     supabase: SupabaseClient<Database>
   ): Promise<User | null> {
     const { data: { user }, error } = await supabase.auth.getUser();
     
     if (error || !user) {
       return null;
     }
     
     return user;
   }
   ```

### Krok 5: Utworzenie helpera odpowiedzi API

1. Utworzenie pliku `src/lib/api/response.ts` (jeśli nie istnieje):
   - Funkcje pomocnicze do tworzenia odpowiedzi API
   - Funkcje do obsługi błędów
   - Funkcje do serializacji DTO

2. **Implementacja helpera:**
   ```typescript
   // src/lib/api/response.ts
   import type { ApiError } from '../../types.ts';

   export function jsonResponse<T>(data: T, status: number = 200): Response {
     return new Response(JSON.stringify(data), {
       status,
       headers: { 'Content-Type': 'application/json' },
     });
   }

   export function errorResponse(error: ApiError['error'], status: number): Response {
     return new Response(JSON.stringify({ error }), {
       status,
       headers: { 'Content-Type': 'application/json' },
     });
   }
   ```

### Krok 6: Implementacja endpointu API

1. Utworzenie pliku `src/pages/api/v1/me/profile.ts`:
   - Handler `POST`
   - Weryfikacja autoryzacji
   - Parsowanie request body
   - Walidacja danych wejściowych
   - Sprawdzenie, czy profil istnieje
   - Wywołanie serwisu
   - Zwrócenie odpowiedzi

2. **Implementacja endpointu:**
   ```typescript
   // src/pages/api/v1/me/profile.ts
   import type { APIRoute } from 'astro';
   import { getAuthenticatedUser } from '../../../lib/auth/helpers.ts';
   import { getProfileByUserId, createProfile } from '../../../lib/services/profile.service.ts';
   import { jsonResponse, errorResponse } from '../../../lib/api/response.ts';
   import { CreateProfileSchema } from '../../../lib/validation/profile.schema.ts';
   import type { CreateProfileCommand } from '../../../types.ts';

   export const prerender = false;

   export const POST: APIRoute = async ({ request, locals }) => {
     // 1. Authentication check
     const user = await getAuthenticatedUser(locals.supabase);
     if (!user) {
       return errorResponse(
         { code: 'unauthorized', message: 'Missing or invalid authentication token' },
         401
       );
     }

     // 2. Parse request body
     let body: unknown;
     try {
       body = await request.json();
     } catch (error) {
       return errorResponse(
         { code: 'bad_request', message: 'Invalid JSON in request body' },
         400
       );
     }

     // 3. Validate request body
     const validationResult = CreateProfileSchema.safeParse(body);
     if (!validationResult.success) {
       const fieldErrors: Record<string, string> = {};
       validationResult.error.errors.forEach((error) => {
         const field = error.path.join('.');
         fieldErrors[field] = error.message;
       });
       
       return errorResponse(
         {
           code: 'bad_request',
           message: 'Validation failed',
           fields: fieldErrors,
         },
         400
       );
     }

     const command: CreateProfileCommand = validationResult.data;

     // 4. Check if profile exists
     try {
       const existingProfile = await getProfileByUserId(locals.supabase, user.id);
       if (existingProfile) {
         return errorResponse(
           { code: 'conflict', message: 'Profile already exists for this user' },
           409
         );
       }
     } catch (error) {
       console.error('Error checking existing profile:', error);
       return errorResponse(
         { code: 'internal', message: 'An internal server error occurred' },
         500
       );
     }

     // 5. Create profile
     try {
       const profile = await createProfile(locals.supabase, user.id, command);
       return jsonResponse(profile, 201);
     } catch (error: any) {
       console.error('Error creating profile:', error);
       
       // Handle database errors
       if (error.code === '23505') {
         // Unique constraint violation
         return errorResponse(
           { code: 'conflict', message: 'Profile already exists for this user' },
           409
         );
       }
       
       if (error.code === '23514') {
         // Check constraint violation
         return errorResponse(
           {
             code: 'bad_request',
             message: 'Data validation failed',
             fields: { [error.column || 'unknown']: error.message },
           },
           400
         );
       }
       
       // Other database errors
       return errorResponse(
         { code: 'internal', message: 'An internal server error occurred' },
         500
       );
     }
   };
   ```

### Krok 7: Instalacja zależności

1. Sprawdzenie, czy `zod` jest zainstalowany:
   ```bash
   npm install zod
   ```

2. Sprawdzenie, czy `@supabase/supabase-js` jest zainstalowany (powinien być już zainstalowany)

### Krok 8: Testy jednostkowe (opcjonalnie)

1. Utworzenie testów dla schematu walidacji:
   - Test: walidacja prawidłowych danych
   - Test: walidacja nieprawidłowych danych (monthly_expense < 0, withdrawal_rate_pct > 100, etc.)
   - Test: walidacja daty urodzenia (przeszłość, przyszłość, starsza niż 120 lat)

2. Utworzenie testów dla serwisu:
   - Test: utworzenie profilu dla nowego użytkownika
   - Test: próba utworzenia profilu dla użytkownika z istniejącym profilem
   - Test: obsługa błędów bazy danych

3. Utworzenie testów dla endpointu:
   - Test: sukces (201 Created)
   - Test: brak autoryzacji (401)
   - Test: nieprawidłowy JSON (400)
   - Test: błąd walidacji (400)
   - Test: profil już istnieje (409)
   - Test: błąd bazy danych (500)

### Krok 9: Testy integracyjne (opcjonalnie)

1. Testy E2E z Playwright:
   - Test: utworzenie profilu z prawidłowym tokenem i danymi
   - Test: utworzenie profilu z nieprawidłowym tokenem
   - Test: utworzenie profilu bez tokenu
   - Test: utworzenie profilu z nieprawidłowymi danymi
   - Test: utworzenie profilu, gdy profil już istnieje
   - Test: utworzenie profilu z datą urodzenia w przyszłości
   - Test: utworzenie profilu z datą urodzenia starszą niż 120 lat

### Krok 10: Code review

1. Przegląd kodu:
   - Sprawdzenie zgodności z zasadami kodowania
   - Sprawdzenie obsługi błędów
   - Sprawdzenie bezpieczeństwa
   - Sprawdzenie wydajności
   - Sprawdzenie walidacji danych

### Krok 11: Wdrożenie

1. Wdrożenie na środowisko deweloperskie
2. Testy na środowisku deweloperskim
3. Wdrożenie na środowisko produkcyjne
4. Monitorowanie błędów i wydajności

---

## 10. Podsumowanie

### Kluczowe punkty implementacji

1. **Autoryzacja:** Endpoint wymaga Bearer JWT token i weryfikuje użytkownika przez Supabase Auth
2. **RLS:** Row Level Security zapewnia, że użytkownik może utworzyć tylko swój własny profil
3. **Walidacja:** Endpoint waliduje dane wejściowe za pomocą Zod przed wysłaniem do bazy danych
4. **Idempotentność (MVP):** Endpoint zwraca `409 Conflict`, jeśli profil już istnieje
5. **Obsługa błędów:** Endpoint obsługuje 401 (unauthorized), 400 (bad_request), 409 (conflict), 500 (internal)
6. **Wydajność:** Endpoint używa indeksów bazy danych i wykonuje minimalną liczbę zapytań
7. **Bezpieczeństwo:** Endpoint jest chroniony przez RLS i waliduje wszystkie dane wejściowe

### Zależności

- **Supabase Client:** Dostępny przez `context.locals.supabase`
- **Typy:** `CreateProfileCommand`, `ProfileDto`, `ApiError` z `src/types.ts`
- **Baza danych:** Tabela `profiles` z RLS włączonym i CHECK constraints
- **Middleware:** Astro middleware dodaje Supabase client do context.locals
- **Walidacja:** Zod schema dla walidacji danych wejściowych
- **Zależności npm:** `zod`, `@supabase/supabase-js`

### Następne kroki

1. Implementacja endpointu zgodnie z planem
2. Testy jednostkowe i integracyjne
3. Code review
4. Wdrożenie na środowisko deweloperskie
5. Testy E2E
6. Wdrożenie na środowisko produkcyjne

---

## 11. Załączniki

### Przykładowe żądanie

```http
POST /v1/me/profile HTTP/1.1
Host: api.example.com
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Content-Type: application/json
Accept: application/json
Accept-Language: pl-PL
X-Request-Id: 550e8400-e29b-41d4-a716-446655440000

{
  "monthly_expense": 4500.00,
  "withdrawal_rate_pct": 4.00,
  "expected_return_pct": 7.00,
  "birth_date": "1992-05-12"
}
```

### Przykładowa odpowiedź (201 Created)

```http
HTTP/1.1 201 Created
Content-Type: application/json
Location: /v1/me/profile

{
  "id": "c0a1dba8-1234-5678-9abc-def012345678",
  "user_id": "3b9c1234-5678-9abc-def0-123456789abc",
  "monthly_expense": 4500.00,
  "withdrawal_rate_pct": 4.00,
  "expected_return_pct": 7.00,
  "birth_date": "1992-05-12",
  "created_at": "2025-01-02T09:00:12Z",
  "updated_at": "2025-01-02T09:00:12Z"
}
```

### Przykładowa odpowiedź (400 Bad Request)

```http
HTTP/1.1 400 Bad Request
Content-Type: application/json

{
  "error": {
    "code": "bad_request",
    "message": "Validation failed",
    "fields": {
      "monthly_expense": "must be >= 0",
      "withdrawal_rate_pct": "must be between 0 and 100",
      "birth_date": "must be in the past and not older than 120 years"
    }
  }
}
```

### Przykładowa odpowiedź (409 Conflict)

```http
HTTP/1.1 409 Conflict
Content-Type: application/json

{
  "error": {
    "code": "conflict",
    "message": "Profile already exists for this user"
  }
}
```

### Przykładowa odpowiedź (401 Unauthorized)

```http
HTTP/1.1 401 Unauthorized
Content-Type: application/json

{
  "error": {
    "code": "unauthorized",
    "message": "Missing or invalid authentication token"
  }
}
```

---

*Plan wdrożenia utworzony: 2025-01-15*
*Wersja: 1.0*
*Autor: AI Assistant*

