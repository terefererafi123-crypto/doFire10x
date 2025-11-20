# API Endpoint Implementation Plan: GET `/v1/me/metrics`

## 1. Przegląd punktu końcowego

Endpoint `GET /v1/me/metrics` służy do obliczania wskaźników FIRE (Financial Independence, Retire Early) na podstawie profilu użytkownika i agregacji portfela inwestycyjnego. Obliczenia są wykonywane w czasie rzeczywistym (runtime) i nie są trwale zapisywane w bazie danych. Endpoint wspiera funkcjonalność "what-if" poprzez opcjonalne parametry zapytania, które pozwalają na nadpisanie wartości z profilu i portfela.

**Funkcjonalność:**
- Pobiera dane profilu użytkownika z tabeli `profiles`
- Pobiera agregację portfela z widoku `v_investments_agg`
- Wykonuje obliczenia FIRE w czasie rzeczywistym
- Obsługuje opcjonalne parametry "what-if" do symulacji różnych scenariuszy
- Zwraca szczegółowe metryki: inputs, derived values, time_to_fire
- Obsługuje przypadki brzegowe (zero inwestycji, nieprawidłowe wartości)

**Relacja z bazą danych:**
- Tabela: `public.profiles` (1:1 z `auth.users`)
- Widok: `public.v_investments_agg` (agregacja z `public.investments`)
- RLS: Automatyczna filtracja po `user_id = auth.uid()`

---

## 2. Szczegóły żądania

### Metoda HTTP
- `GET`

### Struktura URL
```
GET /v1/me/metrics
```

### Parametry zapytania (opcjonalne - what-if overrides)

Wszystkie parametry są opcjonalne i służą do nadpisania wartości z profilu i portfela:

- **`monthly_expense`** (number, opcjonalny)
  - Nadpisuje `monthly_expense` z profilu
  - Musi być liczbą >= 0
  - Przykład: `?monthly_expense=5000`

- **`withdrawal_rate_pct`** (number, opcjonalny)
  - Nadpisuje `withdrawal_rate_pct` z profilu
  - Musi być liczbą w zakresie 0-100
  - Przykład: `?withdrawal_rate_pct=3.5`

- **`expected_return_pct`** (number, opcjonalny)
  - Nadpisuje `expected_return_pct` z profilu
  - Musi być liczbą > -100 (walidacja: `expected_return_pct <= -100` → 400)
  - Przykład: `?expected_return_pct=8.5`

- **`invested_total`** (number, opcjonalny)
  - Nadpisuje `total_amount` z widoku `v_investments_agg`
  - Musi być liczbą >= 0
  - Jeśli <= 0, `years_to_fire` będzie `null`
  - Przykład: `?invested_total=50000`

### Headers
- **Wymagane:**
  - `Authorization: Bearer <JWT_TOKEN>` - Token JWT z Supabase Auth
- **Opcjonalne:**
  - `Accept-Language: pl-PL` - Lokalizacja komunikatów błędów (domyślnie: en-US)
  - `X-Request-Id: <uuid>` - Identyfikator korelacji żądania

### Request Body
- Brak (GET request)

---

## 3. Wykorzystywane typy

### DTO (Data Transfer Objects)

#### MetricsDto
```typescript
interface MetricsDto {
  inputs: {
    monthly_expense: number;        // PLN, numeric(16,2)
    withdrawal_rate_pct: number;    // %, numeric(5,2)
    expected_return_pct: number;    // %, numeric(5,2)
    invested_total: number;         // PLN, numeric(16,2)
  };
  derived: {
    annual_expense: number;         // PLN (monthly_expense * 12)
    fire_target: number;            // PLN (annual_expense / (withdrawal_rate_pct / 100))
    fire_progress: number;          // 0-1 (invested_total / fire_target)
  };
  time_to_fire: {
    years_to_fire: number | null;   // null jeśli invested_total <= 0
    birth_date: string | null;      // ISO 8601 date string lub null
    current_age: number | null;     // null jeśli birth_date jest null
    fire_age: number | null;        // null jeśli years_to_fire jest null
  };
  note?: string;                    // Opcjonalna notatka dla przypadków brzegowych
}
```

#### MetricsQuery
```typescript
interface MetricsQuery {
  monthly_expense?: number;
  withdrawal_rate_pct?: number;
  expected_return_pct?: number;
  invested_total?: number;
}
```

#### ApiError
```typescript
interface ApiError {
  error: {
    code: "bad_request" | "unauthorized" | "not_found" | "internal";
    message: string;
    fields?: Record<string, string>;
  }
}
```

### Typy z bazy danych

#### DbProfileRow
```typescript
type DbProfileRow = Tables<"profiles">
```

#### DbPortfolioAggRow
```typescript
type DbPortfolioAggRow = Tables<"v_investments_agg">
```

**Mapowanie danych:**
- `DbProfileRow` → wartości domyślne dla `inputs` (z możliwością nadpisania przez query params)
- `DbPortfolioAggRow.total_amount` → wartość domyślna dla `inputs.invested_total` (z możliwością nadpisania)
- Obliczenia są wykonywane w serwisie na podstawie zmapowanych wartości

---

## 4. Szczegóły odpowiedzi

### Sukces (200 OK)

**Status Code:** `200 OK`

**Response Body:**
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

**Przypadek brzegowy - zero inwestycji:**
```json
{
  "inputs": {
    "monthly_expense": 4500.00,
    "withdrawal_rate_pct": 4.00,
    "expected_return_pct": 7.00,
    "invested_total": 0.00
  },
  "derived": {
    "annual_expense": 54000.00,
    "fire_target": 1350000.00,
    "fire_progress": 0.00
  },
  "time_to_fire": {
    "years_to_fire": null,
    "birth_date": "1992-05-12",
    "current_age": 33.5,
    "fire_age": null
  },
  "note": "Years to FIRE undefined for zero investments."
}
```

**Headers:**
- `Content-Type: application/json`

### Błędy

#### 400 Bad Request

**Status Code:** `400 Bad Request`

**Przyczyny:**
- `expected_return_pct <= -100` (zapytanie lub profil)
- Nieprawidłowy format parametrów zapytania (nie są liczbami)
- Parametry poza dozwolonym zakresem (np. `withdrawal_rate_pct < 0` lub `> 100`)

**Response Body:**
```json
{
  "error": {
    "code": "bad_request",
    "message": "Invalid input parameters",
    "fields": {
      "expected_return_pct": "Expected return percentage must be greater than -100"
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

#### 404 Not Found

**Status Code:** `404 Not Found`

**Przyczyny:**
- Profil użytkownika nie istnieje w bazie danych
- RLS zwróciło pusty wynik (teoretycznie nie powinno się zdarzyć, jeśli użytkownik jest zalogowany)

**Response Body:**
```json
{
  "error": {
    "code": "not_found",
    "message": "profile_not_found"
  }
}
```

#### 500 Internal Server Error

**Status Code:** `500 Internal Server Error`

**Przyczyny:**
- Błąd połączenia z bazą danych
- Błąd zapytania SQL
- Błąd obliczeń (np. dzielenie przez zero, logarytm z wartości ujemnej)
- Nieoczekiwany błąd serwera

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
Client Request (GET /v1/me/metrics?monthly_expense=5000&expected_return_pct=8)
    ↓
Astro Middleware (context.locals.supabase)
    ↓
API Route Handler (GET /v1/me/metrics)
    ↓
1. Authentication Check (getUser())
    ├─→ 401 Unauthorized (if invalid/missing token)
    └─→ Continue
    ↓
2. Parse & Validate Query Parameters (Zod schema)
    ├─→ 400 Bad Request (if invalid)
    └─→ Continue
    ↓
3. Profile Service (getProfileByUserId())
    ↓
4. Supabase Query (RLS filtered)
    SELECT * FROM profiles WHERE user_id = auth.uid()
    ↓
5. Portfolio Aggregation Service (getPortfolioAggByUserId())
    ↓
6. Supabase Query (RLS filtered)
    SELECT * FROM v_investments_agg WHERE user_id = auth.uid()
    ↓
7. Metrics Calculation Service (calculateFireMetrics())
    - Merge profile data with query params (query params override)
    - Merge portfolio data with query params (query params override)
    - Validate merged values (expected_return_pct > -100)
    - Calculate derived metrics
    - Calculate time_to_fire (with edge case handling)
    ↓
8. Response Construction
    ├─→ Profile not found → 404 Not Found
    ├─→ Invalid merged values → 400 Bad Request
    ├─→ Calculation error → 500 Internal Server Error
    └─→ Success → 200 OK (MetricsDto)
    ↓
9. Response to Client
```

### Szczegółowy przepływ

1. **Odebranie żądania**
   - Astro middleware (`src/middleware/index.ts`) dodaje Supabase client do `context.locals.supabase`
   - API route handler odbiera żądanie z opcjonalnymi parametrami zapytania

2. **Weryfikacja autoryzacji**
   - Pobranie tokenu JWT z nagłówka `Authorization: Bearer <token>`
   - Weryfikacja tokenu przez Supabase: `context.locals.supabase.auth.getUser()`
   - Jeśli token jest nieprawidłowy lub brakuje → zwróć `401 Unauthorized`

3. **Parsowanie i walidacja parametrów zapytania**
   - Parsowanie parametrów zapytania z URL
   - Walidacja za pomocą schematu Zod
   - Konwersja stringów na liczby
   - Sprawdzenie zakresów wartości
   - Jeśli parametry są nieprawidłowe → zwróć `400 Bad Request`

4. **Pobranie profilu użytkownika**
   - Wywołanie serwisu: `profileService.getProfileByUserId(userId)`
   - Zapytanie do bazy: `supabase.from('profiles').select('*').eq('user_id', userId).single()`
   - RLS automatycznie filtruje wyniki (tylko własny profil użytkownika)
   - Jeśli profil nie istnieje → zwróć `404 Not Found`

5. **Pobranie agregacji portfela**
   - Wywołanie serwisu: `portfolioService.getPortfolioAggByUserId(userId)`
   - Zapytanie do bazy: `supabase.from('v_investments_agg').select('*').eq('user_id', userId).maybeSingle()`
   - RLS automatycznie filtruje wyniki
   - Jeśli portfel nie istnieje (brak inwestycji), `total_amount` = 0

6. **Scalenie danych i walidacja**
   - Scalanie danych z profilu z parametrami zapytania (parametry zapytania nadpisują wartości z profilu)
   - Scalanie danych z portfela z parametrami zapytania (parametry zapytania nadpisują wartości z portfela)
   - Walidacja scalonych wartości:
     - `expected_return_pct > -100` → jeśli nie, zwróć `400 Bad Request`
     - `monthly_expense >= 0`
     - `withdrawal_rate_pct >= 0 AND <= 100`
     - `invested_total >= 0`

7. **Obliczenie metryk FIRE**
   - Wywołanie serwisu: `metricsService.calculateFireMetrics(mergedInputs)`
   - Obliczenia:
     - `annual_expense = monthly_expense * 12`
     - `fire_target = annual_expense / (withdrawal_rate_pct / 100)`
     - `fire_progress = invested_total / fire_target`
     - `years_to_fire = log(fire_target / invested_total) / log(1 + expected_return_pct / 100)` (tylko jeśli `invested_total > 0`)
     - `current_age = calculateAge(birth_date)` (tylko jeśli `birth_date` nie jest null)
     - `fire_age = current_age + years_to_fire` (tylko jeśli oba nie są null)
   - Obsługa przypadków brzegowych:
     - Jeśli `invested_total <= 0` → `years_to_fire = null`, `fire_age = null`, dodaj `note`

8. **Konstrukcja odpowiedzi**
   - Utworzenie obiektu `MetricsDto` z obliczonymi wartościami
   - Dodanie opcjonalnej notatki dla przypadków brzegowych
   - Zwrócenie `200 OK` z `MetricsDto`

9. **Zwrócenie odpowiedzi**
   - Serializacja `MetricsDto` do JSON
   - Ustawienie nagłówków odpowiedzi
   - Zwrócenie odpowiedzi do klienta

---

## 6. Względy bezpieczeństwa

### Autoryzacja

1. **Bearer JWT Authentication**
   - Token JWT musi być przesłany w nagłówku `Authorization: Bearer <token>`
   - Token jest weryfikowany przez Supabase Auth
   - Token musi być ważny i nie wygasły

2. **Row Level Security (RLS)**
   - RLS jest włączone na tabeli `profiles` i widoku `v_investments_agg`
   - Polityka SELECT: `user_id = auth.uid()`
   - Użytkownik może zobaczyć tylko swoje własne dane
   - RLS działa automatycznie na poziomie bazy danych

3. **Weryfikacja użytkownika**
   - `auth.uid()` jest automatycznie ustawiane przez Supabase na podstawie tokenu JWT
   - Nie ma potrzeby ręcznej weryfikacji `user_id` w kodzie (RLS zapewnia bezpieczeństwo)

### Walidacja danych

1. **Walidacja parametrów zapytania**
   - Wszystkie parametry zapytania są walidowane za pomocą schematu Zod
   - Sprawdzenie typów (muszą być liczbami)
   - Sprawdzenie zakresów wartości:
     - `monthly_expense >= 0`
     - `withdrawal_rate_pct >= 0 AND <= 100`
     - `expected_return_pct > -100`
     - `invested_total >= 0`
   - Komunikaty błędów są przyjazne dla użytkownika

2. **Walidacja scalonych wartości**
   - Po scaleniu danych z profilu i portfela z parametrami zapytania, wartości są ponownie walidowane
   - Szczególna uwaga na `expected_return_pct <= -100` → `400 Bad Request`

3. **Ochrona przed atakami**
   - Brak SQL injection (używamy Supabase client z parametrami)
   - Brak XSS (zwracamy tylko dane z bazy, bez HTML)
   - Brak CSRF (używamy Bearer token, nie cookies)
   - Walidacja parametrów zapytania zapobiega injection przez query string

### Bezpieczeństwo danych

1. **Ochrona przed atakami**
   - Brak SQL injection (używamy Supabase client z parametrami)
   - Brak XSS (zwracamy tylko dane z bazy, bez HTML)
   - Brak CSRF (używamy Bearer token, nie cookies)

2. **Logowanie**
   - Logowanie błędów autoryzacji (401)
   - Logowanie błędów walidacji (400)
   - Logowanie błędów bazy danych (500)
   - Brak logowania danych wrażliwych (PII) w pełnej formie
   - Używanie strukturalnego logowania (JSON)

3. **Rate limiting**
   - Endpoint powinien być objęty rate limitingiem (np. 60 req/min na użytkownika)
   - Rate limiting jest obsługiwany na poziomie infrastruktury (nie w tym endpoincie)

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

#### 2. Profil nie istnieje (404)

**Scenariusz:** Użytkownik jest zalogowany, ale nie ma profilu w bazie danych.

**Obsługa:**
```typescript
const profile = await profileService.getProfileByUserId(supabase, user.id);
if (!profile) {
  return errorResponse(
    { code: 'not_found', message: 'profile_not_found' },
    404
  );
}
```

#### 3. Nieprawidłowe parametry zapytania (400)

**Scenariusz:** Parametry zapytania są nieprawidłowe (nie są liczbami, poza zakresem, `expected_return_pct <= -100`).

**Obsługa:**
```typescript
// Walidacja za pomocą Zod
const querySchema = z.object({
  monthly_expense: z.coerce.number().min(0).optional(),
  withdrawal_rate_pct: z.coerce.number().min(0).max(100).optional(),
  expected_return_pct: z.coerce.number().gt(-100).optional(),
  invested_total: z.coerce.number().min(0).optional(),
});

const parseResult = querySchema.safeParse(queryParams);
if (!parseResult.success) {
  return errorResponse(
    {
      code: 'bad_request',
      message: 'Invalid input parameters',
      fields: parseResult.error.flatten().fieldErrors,
    },
    400
  );
}

// Walidacja scalonych wartości
const mergedExpectedReturn = queryParams.expected_return_pct ?? profile.expected_return_pct;
if (mergedExpectedReturn <= -100) {
  return errorResponse(
    {
      code: 'bad_request',
      message: 'Invalid input parameters',
      fields: {
        expected_return_pct: 'Expected return percentage must be greater than -100',
      },
    },
    400
  );
}
```

#### 4. Błąd obliczeń (500)

**Scenariusz:** Błąd podczas obliczeń (np. dzielenie przez zero, logarytm z wartości ujemnej).

**Obsługa:**
```typescript
try {
  const metrics = await metricsService.calculateFireMetrics(mergedInputs);
  return jsonResponse(metrics, 200);
} catch (error) {
  console.error('Error calculating metrics:', error);
  return errorResponse(
    { code: 'internal', message: 'An internal server error occurred' },
    500
  );
}
```

#### 5. Błąd bazy danych (500)

**Scenariusz:** Błąd połączenia z bazą danych lub błąd zapytania SQL.

**Obsługa:**
```typescript
try {
  const profile = await profileService.getProfileByUserId(supabase, user.id);
  // ...
} catch (error) {
  console.error('Database error:', error);
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
   - Unikanie zagnieżdżonych if-else

2. **Guard clauses**
   - Sprawdzenie warunków wstępnych (token, użytkownik, profil)
   - Zwrócenie błędu, jeśli warunki nie są spełnione
   - Kontynuacja tylko w przypadku spełnienia warunków

3. **Walidacja danych wejściowych**
   - Walidacja parametrów zapytania za pomocą Zod
   - Walidacja scalonych wartości przed obliczeniami
   - Zwracanie szczegółowych komunikatów błędów dla każdego pola

4. **Logowanie błędów**
   - Logowanie wszystkich błędów (400, 401, 404, 500)
   - Brak logowania danych wrażliwych (PII) w pełnej formie
   - Używanie strukturalnego logowania (JSON)

5. **Komunikaty błędów**
   - Komunikaty błędów są przyjazne dla użytkownika
   - Komunikaty błędów są zlokalizowane (Accept-Language)
   - Komunikaty błędów nie ujawniają szczegółów implementacji

---

## 8. Rozważania dotyczące wydajności

### Optymalizacje

1. **Indeksy bazy danych**
   - Indeks `profiles_user_id_idx` na kolumnie `user_id` w tabeli `profiles`
   - Indeks `investments_user_id_idx` na kolumnie `user_id` w tabeli `investments`
   - Indeksy są używane przez RLS do szybkiego wyszukiwania
   - Zapytania są zoptymalizowane do pojedynczych wierszy (`.single()` lub `.maybeSingle()`)

2. **Pojedyncze zapytania**
   - Endpoint wykonuje tylko dwa zapytania do bazy danych:
     - Jedno zapytanie do tabeli `profiles`
     - Jedno zapytanie do widoku `v_investments_agg`
   - Brak N+1 queries
   - Brak zbędnych zapytań

3. **Obliczenia po stronie serwera**
   - Wszystkie obliczenia są wykonywane po stronie serwera
   - Brak potrzeby dodatkowych zapytań do bazy danych
   - Obliczenia są proste i szybkie (operacje arytmetyczne)

4. **Connection pooling**
   - Supabase automatycznie zarządza poolowaniem połączeń
   - Brak potrzeby ręcznego zarządzania połączeniami

### Potencjalne wąskie gardła

1. **Baza danych**
   - Wąskie gardło: połączenie z bazą danych (dwa zapytania)
   - Rozwiązanie: connection pooling (automatycznie przez Supabase)
   - Monitorowanie: czas odpowiedzi bazy danych

2. **Autoryzacja**
   - Wąskie gardło: weryfikacja tokenu JWT
   - Rozwiązanie: cache tokenów (opcjonalnie)
   - Monitorowanie: czas weryfikacji tokenu

3. **Obliczenia**
   - Wąskie gardło: obliczenia matematyczne (logarytmy)
   - Rozwiązanie: obliczenia są proste i szybkie
   - Monitorowanie: czas obliczeń

4. **Serializacja JSON**
   - Wąskie gardło: serializacja odpowiedzi
   - Rozwiązanie: minimalna serializacja (tylko potrzebne pola)
   - Monitorowanie: czas serializacji

### Metryki wydajności

1. **Czas odpowiedzi**
   - Cel: < 200ms (p95)
   - Monitorowanie: czas od żądania do odpowiedzi
   - Alerty: jeśli czas odpowiedzi > 1000ms

2. **Throughput**
   - Cel: 500 req/s (na serwer)
   - Monitorowanie: liczba żądań na sekundę
   - Alerty: jeśli throughput < 50 req/s

3. **Błędy**
   - Cel: < 1% błędów
   - Monitorowanie: procent błędów (400, 401, 404, 500)
   - Alerty: jeśli procent błędów > 5%

---

## 9. Etapy wdrożenia

### Krok 1: Utworzenie struktury katalogów

1. Utworzenie katalogu dla API routes:
   ```
   src/pages/api/v1/me/metrics.ts
   ```

2. Utworzenie katalogu dla serwisów (jeśli nie istnieje):
   ```
   src/lib/services/
   ```

3. Utworzenie katalogu dla helperów obliczeniowych (jeśli nie istnieje):
   ```
   src/lib/utils/
   ```

### Krok 2: Utworzenie helpera obliczeń FIRE

1. Utworzenie pliku `src/lib/utils/fire-calculations.ts`:
   - Funkcje pomocnicze do obliczeń FIRE
   - Funkcja `calculateAge(birthDate: string): number`
   - Funkcja `calculateYearsToFire(fireTarget: number, investedTotal: number, expectedReturnPct: number): number | null`
   - Obsługa przypadków brzegowych (zero inwestycji, dzielenie przez zero)

2. **Implementacja helpera:**
   ```typescript
   // src/lib/utils/fire-calculations.ts
   import type { ISODateString } from '../../types.ts';

   export function calculateAge(birthDate: ISODateString): number {
     const today = new Date();
     const birth = new Date(birthDate);
     let age = today.getFullYear() - birth.getFullYear();
     const monthDiff = today.getMonth() - birth.getMonth();
     if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
       age--;
     }
     return age + (monthDiff * 30 + (today.getDate() - birth.getDate())) / 365.25;
   }

   export function calculateYearsToFire(
     fireTarget: number,
     investedTotal: number,
     expectedReturnPct: number
   ): number | null {
     if (investedTotal <= 0) {
       return null;
     }
     if (fireTarget <= 0 || expectedReturnPct <= -100) {
       return null;
     }
     const ratio = fireTarget / investedTotal;
     if (ratio <= 0) {
       return null;
     }
     const growthRate = 1 + expectedReturnPct / 100;
     if (growthRate <= 0) {
       return null;
     }
     return Math.log(ratio) / Math.log(growthRate);
   }
   ```

### Krok 3: Utworzenie serwisu metryk

1. Utworzenie pliku `src/lib/services/metrics.service.ts`:
   - Funkcja `calculateFireMetrics(inputs: FireMetricsInputs): MetricsDto`
   - Obsługa przypadków brzegowych
   - Mapowanie danych do `MetricsDto`

2. **Implementacja serwisu:**
   ```typescript
   // src/lib/services/metrics.service.ts
   import type { MetricsDto, ISODateString } from '../../types.ts';
   import { calculateAge, calculateYearsToFire } from '../utils/fire-calculations.ts';

   interface FireMetricsInputs {
     monthly_expense: number;
     withdrawal_rate_pct: number;
     expected_return_pct: number;
     invested_total: number;
     birth_date: ISODateString | null;
   }

   export function calculateFireMetrics(inputs: FireMetricsInputs): MetricsDto {
     // Obliczenia podstawowe
     const annual_expense = inputs.monthly_expense * 12;
     const fire_target = annual_expense / (inputs.withdrawal_rate_pct / 100);
     const fire_progress = inputs.invested_total / fire_target;

     // Obliczenia time_to_fire
     const years_to_fire = calculateYearsToFire(
       fire_target,
       inputs.invested_total,
       inputs.expected_return_pct
     );

     let current_age: number | null = null;
     let fire_age: number | null = null;
     if (inputs.birth_date) {
       current_age = calculateAge(inputs.birth_date);
       if (years_to_fire !== null) {
         fire_age = current_age + years_to_fire;
       }
     }

     // Konstrukcja odpowiedzi
     const result: MetricsDto = {
       inputs: {
         monthly_expense: inputs.monthly_expense,
         withdrawal_rate_pct: inputs.withdrawal_rate_pct,
         expected_return_pct: inputs.expected_return_pct,
         invested_total: inputs.invested_total,
       },
       derived: {
         annual_expense,
         fire_target,
         fire_progress,
       },
       time_to_fire: {
         years_to_fire,
         birth_date: inputs.birth_date,
         current_age,
         fire_age,
       },
     };

     // Dodanie notatki dla przypadków brzegowych
     if (inputs.invested_total <= 0) {
       result.note = 'Years to FIRE undefined for zero investments.';
     }

     return result;
   }
   ```

### Krok 4: Utworzenie serwisu portfela (jeśli nie istnieje)

1. Utworzenie pliku `src/lib/services/portfolio.service.ts`:
   - Funkcja `getPortfolioAggByUserId(supabase, userId)`
   - Obsługa przypadku, gdy portfel nie istnieje (brak inwestycji)
   - Mapowanie `DbPortfolioAggRow` → `PortfolioAggDto` (z użyciem `toPortfolioAggDto` z `types.ts`)

2. **Implementacja serwisu:**
   ```typescript
   // src/lib/services/portfolio.service.ts
   import type { SupabaseClient } from '../db/supabase.client.ts';
   import type { Database } from '../db/database.types.ts';
   import type { PortfolioAggDto } from '../../types.ts';
   import { toPortfolioAggDto } from '../../types.ts';
   import type { Tables } from '../db/database.types.ts';

   type DbPortfolioAggRow = Tables<'v_investments_agg'>;

   export async function getPortfolioAggByUserId(
     supabase: SupabaseClient<Database>,
     userId: string
   ): Promise<PortfolioAggDto> {
     const { data, error } = await supabase
       .from('v_investments_agg')
       .select('*')
       .eq('user_id', userId)
       .maybeSingle();

     if (error && error.code !== 'PGRST116') {
       throw error;
     }

     // Jeśli portfel nie istnieje (brak inwestycji), zwróć zero-filled DTO
     if (!data) {
       return {
         user_id: userId,
         total_amount: 0,
         sum_stock: 0,
         sum_etf: 0,
         sum_bond: 0,
         sum_cash: 0,
         share_stock: 0,
         share_etf: 0,
         share_bond: 0,
         share_cash: 0,
       };
     }

     return toPortfolioAggDto(data);
   }
   ```

### Krok 5: Utworzenie schematu walidacji Zod

1. Utworzenie pliku `src/lib/validators/metrics-query.validator.ts`:
   - Schemat Zod do walidacji parametrów zapytania
   - Walidacja typów i zakresów wartości

2. **Implementacja walidatora:**
   ```typescript
   // src/lib/validators/metrics-query.validator.ts
   import { z } from 'zod';

   export const metricsQuerySchema = z.object({
     monthly_expense: z.coerce.number().min(0).optional(),
     withdrawal_rate_pct: z.coerce.number().min(0).max(100).optional(),
     expected_return_pct: z.coerce.number().gt(-100).optional(),
     invested_total: z.coerce.number().min(0).optional(),
   });

   export type MetricsQueryInput = z.infer<typeof metricsQuerySchema>;
   ```

### Krok 6: Utworzenie helpera autoryzacji (jeśli nie istnieje)

1. Utworzenie pliku `src/lib/auth/helpers.ts`:
   - Funkcja `getAuthenticatedUser(supabase)`
   - Obsługa błędów autoryzacji
   - Zwracanie użytkownika lub null

2. **Implementacja helpera:**
   ```typescript
   // src/lib/auth/helpers.ts
   import type { SupabaseClient } from '../db/supabase.client.ts';
   import type { Database } from '../db/database.types.ts';
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

### Krok 7: Utworzenie helpera odpowiedzi API (jeśli nie istnieje)

1. Utworzenie pliku `src/lib/api/response.ts`:
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

### Krok 8: Implementacja endpointu API

1. Utworzenie pliku `src/pages/api/v1/me/metrics.ts`:
   - Handler `GET`
   - Weryfikacja autoryzacji
   - Parsowanie i walidacja parametrów zapytania
   - Pobranie profilu i portfela
   - Scalenie danych
   - Obliczenie metryk
   - Zwrócenie odpowiedzi

2. **Implementacja endpointu:**
   ```typescript
   // src/pages/api/v1/me/metrics.ts
   import type { APIRoute } from 'astro';
   import { getAuthenticatedUser } from '../../../lib/auth/helpers.ts';
   import { getProfileByUserId } from '../../../lib/services/profile.service.ts';
   import { getPortfolioAggByUserId } from '../../../lib/services/portfolio.service.ts';
   import { calculateFireMetrics } from '../../../lib/services/metrics.service.ts';
   import { metricsQuerySchema } from '../../../lib/validators/metrics-query.validator.ts';
   import { jsonResponse, errorResponse } from '../../../lib/api/response.ts';

   export const prerender = false;

   export const GET: APIRoute = async ({ locals, url }) => {
     // 1. Authentication check
     const user = await getAuthenticatedUser(locals.supabase);
     if (!user) {
       return errorResponse(
         { code: 'unauthorized', message: 'Missing or invalid authentication token' },
         401
       );
     }

     // 2. Parse and validate query parameters
     const queryParams = Object.fromEntries(url.searchParams.entries());
     const parseResult = metricsQuerySchema.safeParse(queryParams);
     if (!parseResult.success) {
       return errorResponse(
         {
           code: 'bad_request',
           message: 'Invalid input parameters',
           fields: parseResult.error.flatten().fieldErrors as Record<string, string>,
         },
         400
       );
     }

     // 3. Get profile
     let profile;
     try {
       profile = await getProfileByUserId(locals.supabase, user.id);
       if (!profile) {
         return errorResponse(
           { code: 'not_found', message: 'profile_not_found' },
           404
         );
       }
     } catch (error) {
       console.error('Error fetching profile:', error);
       return errorResponse(
         { code: 'internal', message: 'An internal server error occurred' },
         500
       );
     }

     // 4. Get portfolio aggregation
     let portfolioAgg;
     try {
       portfolioAgg = await getPortfolioAggByUserId(locals.supabase, user.id);
     } catch (error) {
       console.error('Error fetching portfolio aggregation:', error);
       return errorResponse(
         { code: 'internal', message: 'An internal server error occurred' },
         500
       );
     }

     // 5. Merge data (query params override profile/portfolio values)
     const mergedInputs = {
       monthly_expense: parseResult.data.monthly_expense ?? profile.monthly_expense,
       withdrawal_rate_pct: parseResult.data.withdrawal_rate_pct ?? profile.withdrawal_rate_pct,
       expected_return_pct: parseResult.data.expected_return_pct ?? profile.expected_return_pct,
       invested_total: parseResult.data.invested_total ?? portfolioAgg.total_amount,
       birth_date: profile.birth_date,
     };

     // 6. Validate merged values
     if (mergedInputs.expected_return_pct <= -100) {
       return errorResponse(
         {
           code: 'bad_request',
           message: 'Invalid input parameters',
           fields: {
             expected_return_pct: 'Expected return percentage must be greater than -100',
           },
         },
         400
       );
     }

     // 7. Calculate metrics
     try {
       const metrics = calculateFireMetrics(mergedInputs);
       return jsonResponse(metrics, 200);
     } catch (error) {
       console.error('Error calculating metrics:', error);
       return errorResponse(
         { code: 'internal', message: 'An internal server error occurred' },
         500
       );
     }
   };
   ```

### Krok 9: Testy jednostkowe (opcjonalnie)

1. Utworzenie testów dla helpera obliczeń:
   - Test: obliczenie wieku z daty urodzenia
   - Test: obliczenie years_to_fire z prawidłowymi wartościami
   - Test: years_to_fire = null dla zero inwestycji
   - Test: years_to_fire = null dla nieprawidłowych wartości

2. Utworzenie testów dla serwisu metryk:
   - Test: obliczenie metryk z prawidłowymi wartościami
   - Test: obliczenie metryk z zero inwestycji
   - Test: obliczenie metryk bez daty urodzenia
   - Test: dodanie notatki dla przypadków brzegowych

3. Utworzenie testów dla endpointu:
   - Test: sukces (200 OK) z wartościami z profilu
   - Test: sukces (200 OK) z parametrami zapytania
   - Test: brak autoryzacji (401)
   - Test: profil nie istnieje (404)
   - Test: nieprawidłowe parametry zapytania (400)
   - Test: expected_return_pct <= -100 (400)
   - Test: błąd bazy danych (500)

### Krok 10: Testy integracyjne (opcjonalnie)

1. Testy E2E z Playwright:
   - Test: pobranie metryk z prawidłowym tokenem
   - Test: pobranie metryk z parametrami zapytania
   - Test: pobranie metryk z nieprawidłowym tokenem
   - Test: pobranie metryk bez tokenu
   - Test: pobranie metryk, gdy profil nie istnieje
   - Test: pobranie metryk z zero inwestycji
   - Test: pobranie metryk z nieprawidłowymi parametrami

### Krok 11: Code review

1. Przegląd kodu:
   - Sprawdzenie zgodności z zasadami kodowania
   - Sprawdzenie obsługi błędów
   - Sprawdzenie bezpieczeństwa
   - Sprawdzenie wydajności
   - Sprawdzenie przypadków brzegowych

### Krok 12: Wdrożenie

1. Wdrożenie na środowisko deweloperskie
2. Testy na środowisku deweloperskim
3. Wdrożenie na środowisko produkcyjne
4. Monitorowanie błędów i wydajności

---

## 10. Podsumowanie

### Kluczowe punkty implementacji

1. **Autoryzacja:** Endpoint wymaga Bearer JWT token i weryfikuje użytkownika przez Supabase Auth
2. **RLS:** Row Level Security zapewnia, że użytkownik widzi tylko swoje własne dane
3. **What-if overrides:** Parametry zapytania pozwalają na nadpisanie wartości z profilu i portfela
4. **Obliczenia runtime:** Wszystkie obliczenia są wykonywane w czasie rzeczywistym, bez trwałego zapisu
5. **Obsługa błędów:** Endpoint obsługuje 400 (bad_request), 401 (unauthorized), 404 (not_found), 500 (internal)
6. **Przypadki brzegowe:** Obsługa zero inwestycji, brak daty urodzenia, nieprawidłowe wartości
7. **Wydajność:** Endpoint używa indeksów bazy danych i wykonuje tylko dwa zapytania

### Zależności

- **Supabase Client:** Dostępny przez `context.locals.supabase`
- **Typy:** `MetricsDto`, `MetricsQuery`, `ApiError` z `src/types.ts`
- **Baza danych:** Tabela `profiles` i widok `v_investments_agg` z RLS włączonym
- **Middleware:** Astro middleware dodaje Supabase client do context.locals
- **Zod:** Do walidacji parametrów zapytania

### Następne kroki

1. Implementacja endpointu zgodnie z planem
2. Testy jednostkowe i integracyjne
3. Code review
4. Wdrożenie na środowisko deweloperskie
5. Testy E2E
6. Wdrożenie na środowisko produkcyjne

---

## 11. Załączniki

### Przykładowe żądanie (bez parametrów)

```http
GET /v1/me/metrics HTTP/1.1
Host: api.example.com
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Accept: application/json
Accept-Language: pl-PL
X-Request-Id: 550e8400-e29b-41d4-a716-446655440000
```

### Przykładowe żądanie (z parametrami what-if)

```http
GET /v1/me/metrics?monthly_expense=5000&expected_return_pct=8.5&invested_total=50000 HTTP/1.1
Host: api.example.com
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Accept: application/json
Accept-Language: pl-PL
X-Request-Id: 550e8400-e29b-41d4-a716-446655440000
```

### Przykładowa odpowiedź (200 OK)

```http
HTTP/1.1 200 OK
Content-Type: application/json

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

### Przykładowa odpowiedź (200 OK - zero inwestycji)

```http
HTTP/1.1 200 OK
Content-Type: application/json

{
  "inputs": {
    "monthly_expense": 4500.00,
    "withdrawal_rate_pct": 4.00,
    "expected_return_pct": 7.00,
    "invested_total": 0.00
  },
  "derived": {
    "annual_expense": 54000.00,
    "fire_target": 1350000.00,
    "fire_progress": 0.00
  },
  "time_to_fire": {
    "years_to_fire": null,
    "birth_date": "1992-05-12",
    "current_age": 33.5,
    "fire_age": null
  },
  "note": "Years to FIRE undefined for zero investments."
}
```

### Przykładowa odpowiedź (400 Bad Request)

```http
HTTP/1.1 400 Bad Request
Content-Type: application/json

{
  "error": {
    "code": "bad_request",
    "message": "Invalid input parameters",
    "fields": {
      "expected_return_pct": "Expected return percentage must be greater than -100"
    }
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

### Przykładowa odpowiedź (404 Not Found)

```http
HTTP/1.1 404 Not Found
Content-Type: application/json

{
  "error": {
    "code": "not_found",
    "message": "profile_not_found"
  }
}
```

---

*Plan wdrożenia utworzony: 2025-01-15*  
*Wersja: 1.0*  
*Autor: AI Assistant*




