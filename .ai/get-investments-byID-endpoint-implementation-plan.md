# API Endpoint Implementation Plan: GET `/v1/investments/{id}`

## 1. Przegląd punktu końcowego

Endpoint `GET /v1/investments/{id}` służy do pobierania pojedynczej inwestycji użytkownika na podstawie identyfikatora. Endpoint wymaga autoryzacji i zwraca tylko te inwestycje, które należą do zalogowanego użytkownika (weryfikacja przez Row Level Security w bazie danych). Jest to podstawowy endpoint do odczytu pojedynczego zasobu, używany w scenariuszach, gdy klient potrzebuje szczegółowych informacji o konkretnej inwestycji (np. w widoku szczegółów, formularzu edycji).

**Kluczowe cechy:**

- Wymaga autoryzacji (Bearer JWT token)
- Zwraca pojedynczy zasób inwestycji
- Automatyczna filtracja przez RLS (tylko inwestycje użytkownika)
- Zwraca 404, jeśli inwestycja nie istnieje lub nie należy do użytkownika
- Nie wymaga parametrów zapytania (tylko ID w ścieżce URL)

## 2. Szczegóły żądania

- **Metoda HTTP:** `GET`
- **Struktura URL:** `/v1/investments/{id}`
- **Parametry ścieżki:**
  - `id` (wymagany, UUID) - Identyfikator inwestycji do pobrania
- **Parametry zapytania:** Brak
- **Request Body:** Brak
- **Nagłówki wymagane:**
  - `Authorization: Bearer <Supabase-JWT>` - Token JWT z Supabase Auth
- **Nagłówki opcjonalne:**
  - `Accept: application/json` (domyślnie)
  - `X-Request-Id` (dla korelacji logów, opcjonalne)
  - `Accept-Language` (dla lokalizacji komunikatów błędów, opcjonalne)

## 3. Wykorzystywane typy

### 3.1. DTO odpowiedzi

Endpoint wykorzystuje typ `InvestmentDto` zdefiniowany w `src/types.ts`:

```typescript
export type InvestmentDto = Omit<DbInvestmentRow, "user_id">;
```

**Struktura odpowiedzi (200 OK):**

```typescript
{
  id: string; // UUID
  type: AssetType; // "etf" | "bond" | "stock" | "cash"
  amount: number; // Money (PLN, 2 miejsca po przecinku)
  acquired_at: ISODateString; // "YYYY-MM-DD"
  notes: string | null; // Opcjonalne notatki (max 1000 znaków)
  created_at: TimestampString; // RFC 3339 timestamp
  updated_at: TimestampString; // RFC 3339 timestamp
}
```

**Uwaga:** Pole `user_id` jest pomijane w odpowiedzi, ponieważ kontekst użytkownika wynika z autoryzacji.

### 3.2. Typy błędów

Endpoint wykorzystuje typ `ApiError` zdefiniowany w `src/types.ts`:

```typescript
export interface ApiError {
  error: {
    code: "unauthorized" | "not_found" | "bad_request" | "internal";
    message: string;
    fields?: Record<string, string>;
  };
}
```

### 3.3. Typy pomocnicze

- `AssetType`: `"etf" | "bond" | "stock" | "cash"` (z `src/types.ts`)
- `ISODateString`: Alias typu `string` dla dat w formacie ISO (YYYY-MM-DD)
- `TimestampString`: Alias typu `string` dla timestampów RFC 3339
- `Money`: Alias typu `number` dla wartości pieniężnych w PLN

### 3.4. Walidacja parametrów ścieżki

Parametr `id` powinien być walidowany za pomocą schematu Zod:

```typescript
import { z } from "zod";

const InvestmentIdParamSchema = z.object({
  id: z.string().uuid("Invalid investment ID format"),
});
```

## 4. Szczegóły odpowiedzi

### 4.1. Sukces (200 OK)

**Status:** `200 OK`

**Body:**

```json
{
  "id": "ef2a1b2c-3d4e-5f6a-7b8c-9d0e1f2a3b4c",
  "type": "etf",
  "amount": 12000.0,
  "acquired_at": "2024-11-01",
  "notes": "IKZE",
  "created_at": "2024-11-01T10:11:12Z",
  "updated_at": "2024-11-01T10:11:12Z"
}
```

**Nagłówki:**

- `Content-Type: application/json`
- `ETag` (opcjonalnie, dla cache'owania)
- `Last-Modified` (opcjonalnie, dla cache'owania)

### 4.2. Błąd autoryzacji (401 Unauthorized)

**Status:** `401 Unauthorized`

**Body:**

```json
{
  "error": {
    "code": "unauthorized",
    "message": "Missing or invalid authentication token"
  }
}
```

**Scenariusze:**

- Brak nagłówka `Authorization`
- Nieprawidłowy format tokenu
- Token wygasł
- Token nie został zweryfikowany przez Supabase

### 4.3. Nie znaleziono (404 Not Found)

**Status:** `404 Not Found`

**Body:**

```json
{
  "error": {
    "code": "not_found",
    "message": "Investment not found"
  }
}
```

**Scenariusze:**

- Inwestycja o podanym ID nie istnieje
- Inwestycja istnieje, ale należy do innego użytkownika (RLS blokuje dostęp)
- Nieprawidłowy format UUID (powinien być obsłużony jako 400, ale RLS może zwrócić 404)

### 4.4. Nieprawidłowe żądanie (400 Bad Request)

**Status:** `400 Bad Request`

**Body:**

```json
{
  "error": {
    "code": "bad_request",
    "message": "Invalid investment ID format",
    "fields": {
      "id": "must_be_valid_uuid"
    }
  }
}
```

**Scenariusze:**

- Parametr `id` nie jest prawidłowym UUID
- Parametr `id` jest pusty lub nieprawidłowy

### 4.5. Błąd serwera (500 Internal Server Error)

**Status:** `500 Internal Server Error`

**Body:**

```json
{
  "error": {
    "code": "internal",
    "message": "An internal server error occurred"
  }
}
```

**Scenariusze:**

- Błąd połączenia z bazą danych
- Nieoczekiwany błąd podczas przetwarzania żądania
- Błąd konwersji danych

## 5. Przepływ danych

### 5.1. Diagram przepływu

```
Client Request
    ↓
[Middleware] - Weryfikacja autoryzacji (JWT)
    ↓
[API Route Handler] - Walidacja parametrów ścieżki (Zod)
    ↓
[Investment Service] - Pobranie inwestycji z bazy danych
    ↓
[Supabase Client] - SELECT z RLS (user_id = auth.uid())
    ↓
[Database] - Zwrócenie rekordu lub null
    ↓
[Investment Service] - Konwersja DB row → InvestmentDto
    ↓
[API Route Handler] - Zwrócenie odpowiedzi JSON
    ↓
Client Response
```

### 5.2. Szczegółowy przepływ

1. **Odebranie żądania:**
   - Middleware Astro przechwytuje żądanie
   - Weryfikacja nagłówka `Authorization`
   - Dekodowanie i walidacja JWT tokenu przez Supabase
   - Ustawienie `context.locals.supabase` z autoryzowanym klientem

2. **Walidacja parametrów:**
   - Wyodrębnienie parametru `id` z URL (`context.params.id`)
   - Walidacja formatu UUID za pomocą schematu Zod
   - Jeśli walidacja nie powiedzie się → zwróć 400 Bad Request

3. **Pobranie danych:**
   - Wywołanie serwisu `getInvestmentById(id, supabaseClient)`
   - Serwis wykonuje zapytanie: `supabase.from('investments').select('*').eq('id', id).single()`
   - RLS automatycznie filtruje wyniki (tylko inwestycje użytkownika)
   - Jeśli wynik jest null → zwróć 404 Not Found

4. **Konwersja danych:**
   - Konwersja rekordu z bazy danych do `InvestmentDto` (usunięcie `user_id`)
   - Użycie funkcji pomocniczej `toInvestmentDto()` z `src/types.ts`

5. **Zwrócenie odpowiedzi:**
   - Ustawienie nagłówków odpowiedzi (`Content-Type: application/json`)
   - Zwrócenie statusu 200 OK z ciałem JSON

### 5.3. Interakcje z bazą danych

**Zapytanie SQL (wykonywane przez Supabase):**

```sql
SELECT
  id,
  type,
  amount,
  acquired_at,
  notes,
  created_at,
  updated_at
FROM investments
WHERE id = $1
  AND user_id = auth.uid()  -- RLS automatycznie dodaje ten warunek
LIMIT 1;
```

**Wykorzystywane indeksy:**

- `investments_pkey` (PRIMARY KEY na `id`) - główny indeks dla wyszukiwania po ID
- `investments_user_id_idx` (B-tree na `user_id`) - wspomaga filtrowanie RLS

**Wydajność:**

- Zapytanie jest bardzo wydajne dzięki indeksowi PRIMARY KEY
- RLS dodaje minimalne obciążenie (warunek `user_id = auth.uid()` jest zoptymalizowany)
- Oczekiwany czas odpowiedzi: < 50ms w normalnych warunkach

## 6. Względy bezpieczeństwa

### 6.1. Autoryzacja

- **Wymagana autoryzacja:** Endpoint wymaga ważnego tokenu JWT z Supabase Auth
- **Weryfikacja tokenu:** Token jest weryfikowany przez middleware przed przetworzeniem żądania
- **Kontekst użytkownika:** `auth.uid()` jest automatycznie ustawiane przez Supabase na podstawie tokenu JWT

### 6.2. Autoryzacja zasobów (RLS)

- **Row Level Security:** Wszystkie zapytania do tabeli `investments` są automatycznie filtrowane przez RLS
- **Polityka SELECT:** `user_id = auth.uid()` - użytkownik może zobaczyć tylko swoje inwestycje
- **Izolacja danych:** Nawet jeśli użytkownik zna ID inwestycji innego użytkownika, nie będzie mógł jej pobrać (RLS zwróci pusty wynik, co zostanie zinterpretowane jako 404)

### 6.3. Walidacja wejścia

- **Format UUID:** Parametr `id` jest walidowany jako prawidłowy UUID przed wykonaniem zapytania
- **Ochrona przed SQL injection:** Supabase używa parametryzowanych zapytań, co eliminuje ryzyko SQL injection
- **Ograniczenie rozmiaru:** Brak danych wejściowych od użytkownika w body (tylko parametr ścieżki)

### 6.4. Bezpieczeństwo odpowiedzi

- **Ukrycie user_id:** Pole `user_id` jest usuwane z odpowiedzi (nie jest częścią `InvestmentDto`)
- **Brak wrażliwych danych:** Endpoint zwraca tylko dane inwestycji, bez dodatkowych metadanych systemowych
- **Komunikaty błędów:** Komunikaty błędów nie ujawniają szczegółów implementacji (np. nie mówią, czy inwestycja istnieje, ale należy do innego użytkownika)

### 6.5. Rate limiting

- Endpoint powinien być objęty rate limitingiem (np. 60 req/min na użytkownika)
- Rate limiting jest implementowany na poziomie middleware lub infrastruktury (np. load balancer)

### 6.6. Logowanie i audyt

- Wszystkie żądania powinny być logowane z korelacją (`X-Request-Id`)
- Błędy autoryzacji (401) powinny być logowane jako warning
- Błędy 404 mogą być logowane jako info (normalne zachowanie)
- Błędy 500 powinny być logowane jako error z pełnym stack trace

## 7. Obsługa błędów

### 7.1. Scenariusze błędów i odpowiedzi

| Scenariusz                              | Kod statusu | Kod błędu      | Komunikat                                 |
| --------------------------------------- | ----------- | -------------- | ----------------------------------------- |
| Brak tokenu autoryzacji                 | 401         | `unauthorized` | "Missing or invalid authentication token" |
| Nieprawidłowy/wygasły token             | 401         | `unauthorized` | "Missing or invalid authentication token" |
| Nieprawidłowy format UUID               | 400         | `bad_request`  | "Invalid investment ID format"            |
| Inwestycja nie istnieje                 | 404         | `not_found`    | "Investment not found"                    |
| Inwestycja należy do innego użytkownika | 404         | `not_found`    | "Investment not found"                    |
| Błąd połączenia z bazą danych           | 500         | `internal`     | "An internal server error occurred"       |
| Nieoczekiwany błąd                      | 500         | `internal`     | "An internal server error occurred"       |

### 7.2. Strategia obsługi błędów

1. **Walidacja wejścia (400):**
   - Wykonywana przed jakimikolwiek operacjami na bazie danych
   - Używa schematu Zod do walidacji formatu UUID
   - Zwraca szczegółowe informacje o błędzie w polu `fields`

2. **Autoryzacja (401):**
   - Weryfikowana przez middleware przed dotarciem do handlera endpointu
   - Jeśli token jest nieprawidłowy, middleware zwraca 401 i przerywa przetwarzanie

3. **Nie znaleziono (404):**
   - Sprawdzane po wykonaniu zapytania do bazy danych
   - Jeśli wynik jest `null`, zwracany jest 404
   - **Uwaga:** Nie rozróżniamy między "nie istnieje" a "należy do innego użytkownika" ze względów bezpieczeństwa

4. **Błędy serwera (500):**
   - Wszystkie nieoczekiwane błędy są przechwytywane przez globalny error handler
   - Błędy są logowane z pełnym kontekstem (request ID, stack trace)
   - Użytkownik otrzymuje ogólny komunikat błędu (bez szczegółów implementacji)

### 7.3. Logowanie błędów

**Struktura logu błędu:**

```typescript
{
  level: 'error' | 'warn' | 'info',
  timestamp: string,
  requestId: string,
  userId: string | null,
  endpoint: 'GET /v1/investments/{id}',
  error: {
    code: string,
    message: string,
    stack?: string
  },
  context: {
    investmentId: string
  }
}
```

**Poziomy logowania:**

- `error`: Błędy 500, błędy bazy danych
- `warn`: Błędy 401 (potencjalne próby nieautoryzowanego dostępu)
- `info`: Błędy 404 (normalne zachowanie, użytkownik może szukać nieistniejącego zasobu)

## 8. Rozważania dotyczące wydajności

### 8.1. Optymalizacje zapytań

- **Indeks PRIMARY KEY:** Zapytanie wykorzystuje indeks `investments_pkey` na kolumnie `id`, co zapewnia bardzo szybkie wyszukiwanie (O(log n))
- **Indeks user_id:** Indeks `investments_user_id_idx` wspomaga filtrowanie RLS, choć w tym przypadku PRIMARY KEY jest wystarczający
- **LIMIT 1:** Zapytanie używa `.single()`, co jest równoważne z `LIMIT 1` i przerywa wyszukiwanie po znalezieniu pierwszego rekordu

### 8.2. Cache'owanie

- **ETag:** Endpoint może zwracać nagłówek `ETag` oparty na `updated_at` inwestycji
- **Last-Modified:** Nagłówek `Last-Modified` może być ustawiony na wartość `updated_at`
- **Warunkowe żądania:** Klient może używać `If-None-Match` lub `If-Modified-Since` do sprawdzenia, czy dane się zmieniły
- **Cache-Control:** Dla danych, które rzadko się zmieniają, można ustawić `Cache-Control: private, max-age=60` (cache na 60 sekund)

**Uwaga:** Cache'owanie powinno być ostrożnie implementowane, ponieważ dane inwestycji mogą być często aktualizowane przez użytkownika.

### 8.3. Ograniczenia wydajności

- **Czas odpowiedzi:** Oczekiwany czas odpowiedzi < 50ms (w normalnych warunkach)
- **Przepustowość:** Endpoint jest lekki i może obsłużyć dużą liczbę żądań na sekundę
- **Obciążenie bazy danych:** Minimalne (pojedyncze zapytanie SELECT z indeksem PRIMARY KEY)

### 8.4. Skalowalność

- Endpoint jest stateless i może być łatwo skalowany poziomo
- Brak zależności od sesji lub stanu serwera
- RLS działa na poziomie bazy danych, więc nie ma dodatkowego obciążenia na aplikacji

## 9. Etapy wdrożenia

### 9.1. Przygotowanie struktury

1. **Utworzenie katalogu dla endpointu:**
   - Utworzenie pliku `src/pages/api/v1/investments/[id].ts` (Astro dynamic route)
   - Alternatywnie: `src/pages/api/v1/investments/[id]/index.ts`

2. **Sprawdzenie istniejących serwisów:**
   - Sprawdzenie, czy istnieje serwis `src/lib/services/investment.service.ts`
   - Jeśli nie istnieje, utworzenie nowego serwisu

### 9.2. Implementacja serwisu (jeśli potrzebny)

1. **Utworzenie/rozszerzenie serwisu inwestycji:**
   - Utworzenie pliku `src/lib/services/investment.service.ts` (jeśli nie istnieje)
   - Implementacja funkcji `getInvestmentById(id: string, supabase: SupabaseClient): Promise<InvestmentDto | null>`
   - Funkcja powinna:
     - Wykonać zapytanie: `supabase.from('investments').select('*').eq('id', id).single()`
     - Obsłużyć błędy (np. błąd połączenia z bazą danych)
     - Zwrócić `null`, jeśli inwestycja nie istnieje
     - Użyć funkcji `toInvestmentDto()` do konwersji rekordu

2. **Dodanie typów i importów:**
   - Import typu `SupabaseClient` z `src/db/supabase.client.ts`
   - Import typu `InvestmentDto` i funkcji `toInvestmentDto` z `src/types.ts`
   - Import typu `Database` z `src/db/database.types.ts` (dla typowania Supabase)

### 9.3. Implementacja walidacji

1. **Utworzenie schematu walidacji:**
   - Utworzenie pliku `src/lib/validators/investment.validator.ts` (jeśli nie istnieje)
   - Implementacja schematu Zod dla parametru ID:

     ```typescript
     import { z } from "zod";

     export const InvestmentIdParamSchema = z.object({
       id: z.string().uuid("Invalid investment ID format"),
     });
     ```

2. **Import schematu w endpoincie:**
   - Import `InvestmentIdParamSchema` w pliku endpointu

### 9.4. Implementacja endpointu

1. **Utworzenie handlera GET:**
   - Eksport funkcji `export async function GET(context: APIContext)`
   - Ustawienie `export const prerender = false` (endpoint API nie może być prerenderowany)

2. **Weryfikacja autoryzacji:**
   - Sprawdzenie, czy `context.locals.supabase` istnieje (ustawione przez middleware)
   - Jeśli nie istnieje, zwrócenie 401 Unauthorized

3. **Walidacja parametrów:**
   - Wyodrębnienie `id` z `context.params.id`
   - Walidacja za pomocą `InvestmentIdParamSchema.parse({ id })`
   - Obsługa błędów walidacji (zwrócenie 400 Bad Request)

4. **Pobranie danych:**
   - Wywołanie `getInvestmentById(id, context.locals.supabase)`
   - Obsługa przypadku, gdy wynik jest `null` (zwrócenie 404 Not Found)
   - Obsługa błędów serwera (zwrócenie 500 Internal Server Error)

5. **Zwrócenie odpowiedzi:**
   - Ustawienie nagłówka `Content-Type: application/json`
   - Zwrócenie statusu 200 OK z ciałem JSON (`InvestmentDto`)

### 9.5. Implementacja obsługi błędów

1. **Utworzenie helpera do błędów (jeśli nie istnieje):**
   - Utworzenie pliku `src/lib/utils/api-error.ts`
   - Implementacja funkcji pomocniczych do tworzenia odpowiedzi błędów:
     - `createErrorResponse(code, message, fields?)`
     - Funkcje dla konkretnych kodów: `unauthorized()`, `notFound()`, `badRequest()`, `internalError()`

2. **Integracja z endpointem:**
   - Użycie funkcji pomocniczych do zwracania odpowiedzi błędów
   - Logowanie błędów z kontekstem (request ID, user ID, investment ID)

### 9.6. Testowanie

1. **Testy jednostkowe serwisu:**
   - Test pobierania istniejącej inwestycji
   - Test pobierania nieistniejącej inwestycji
   - Test obsługi błędów bazy danych

2. **Testy integracyjne endpointu:**
   - Test z prawidłowym tokenem i istniejącą inwestycją (200 OK)
   - Test z prawidłowym tokenem i nieistniejącą inwestycją (404)
   - Test z prawidłowym tokenem i inwestycją innego użytkownika (404)
   - Test bez tokenu (401)
   - Test z nieprawidłowym tokenem (401)
   - Test z nieprawidłowym formatem UUID (400)

3. **Testy wydajności:**
   - Pomiar czasu odpowiedzi (powinien być < 50ms)
   - Test obciążeniowy (sprawdzenie, czy endpoint radzi sobie z dużą liczbą żądań)

### 9.7. Dokumentacja

1. **Aktualizacja dokumentacji API:**
   - Dodanie endpointu do dokumentacji OpenAPI/Swagger (jeśli istnieje)
   - Opis parametrów, odpowiedzi i kodów błędów

2. **Dodanie komentarzy w kodzie:**
   - Komentarze JSDoc dla funkcji serwisu
   - Komentarze wyjaśniające logikę biznesową

### 9.8. Code review i optymalizacja

1. **Przegląd kodu:**
   - Sprawdzenie zgodności z zasadami kodowania (early returns, guard clauses)
   - Sprawdzenie obsługi błędów i edge cases
   - Sprawdzenie typów TypeScript (brak `any`, prawidłowe typy)

2. **Optymalizacja:**
   - Sprawdzenie, czy nie ma niepotrzebnych zapytań do bazy danych
   - Sprawdzenie, czy cache'owanie jest prawidłowo zaimplementowane (jeśli dotyczy)

### 9.9. Wdrożenie

1. **Merge do głównej gałęzi:**
   - Po pozytywnym code review i przejściu testów

2. **Monitorowanie:**
   - Monitorowanie błędów w produkcji
   - Monitorowanie czasu odpowiedzi
   - Monitorowanie liczby żądań 404 (może wskazywać na problemy z frontendem)

## 10. Przykładowa implementacja

### 10.1. Endpoint (`src/pages/api/v1/investments/[id].ts`)

```typescript
import type { APIContext } from "astro";
import { z } from "zod";
import { getInvestmentById } from "../../../lib/services/investment.service";
import { unauthorized, notFound, badRequest, internalError } from "../../../lib/utils/api-error";

export const prerender = false;

const InvestmentIdParamSchema = z.object({
  id: z.string().uuid("Invalid investment ID format"),
});

export async function GET(context: APIContext) {
  // Weryfikacja autoryzacji
  const supabase = context.locals.supabase;
  if (!supabase) {
    return unauthorized("Missing or invalid authentication token");
  }

  // Walidacja parametrów
  const { id } = context.params;
  if (!id) {
    return badRequest("Investment ID is required");
  }

  const validationResult = InvestmentIdParamSchema.safeParse({ id });
  if (!validationResult.success) {
    return badRequest("Invalid investment ID format", {
      id: "must_be_valid_uuid",
    });
  }

  // Pobranie inwestycji
  try {
    const investment = await getInvestmentById(validationResult.data.id, supabase);

    if (!investment) {
      return notFound("Investment not found");
    }

    return new Response(JSON.stringify(investment), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.error("Error fetching investment:", error);
    return internalError("An internal server error occurred");
  }
}
```

### 10.2. Serwis (`src/lib/services/investment.service.ts`)

```typescript
import type { SupabaseClient } from "../../db/supabase.client";
import type { InvestmentDto } from "../../types";
import { toInvestmentDto } from "../../types";

export async function getInvestmentById(id: string, supabase: SupabaseClient): Promise<InvestmentDto | null> {
  const { data, error } = await supabase.from("investments").select("*").eq("id", id).single();

  if (error) {
    // Jeśli błąd to "not found", zwróć null
    if (error.code === "PGRST116") {
      return null;
    }
    // Inne błędy rzucamy dalej
    throw error;
  }

  if (!data) {
    return null;
  }

  return toInvestmentDto(data);
}
```

### 10.3. Helper błędów (`src/lib/utils/api-error.ts`)

```typescript
import type { ApiError } from "../../types";

export function unauthorized(message = "Missing or invalid authentication token") {
  return new Response(
    JSON.stringify({
      error: {
        code: "unauthorized" as const,
        message,
      },
    } satisfies ApiError),
    {
      status: 401,
      headers: { "Content-Type": "application/json" },
    }
  );
}

export function notFound(message = "Resource not found") {
  return new Response(
    JSON.stringify({
      error: {
        code: "not_found" as const,
        message,
      },
    } satisfies ApiError),
    {
      status: 404,
      headers: { "Content-Type": "application/json" },
    }
  );
}

export function badRequest(message: string, fields?: Record<string, string>) {
  return new Response(
    JSON.stringify({
      error: {
        code: "bad_request" as const,
        message,
        ...(fields && { fields }),
      },
    } satisfies ApiError),
    {
      status: 400,
      headers: { "Content-Type": "application/json" },
    }
  );
}

export function internalError(message = "An internal server error occurred") {
  return new Response(
    JSON.stringify({
      error: {
        code: "internal" as const,
        message,
      },
    } satisfies ApiError),
    {
      status: 500,
      headers: { "Content-Type": "application/json" },
    }
  );
}
```

## 11. Podsumowanie

Endpoint `GET /v1/investments/{id}` jest prostym, ale krytycznym endpointem do pobierania pojedynczych inwestycji użytkownika. Kluczowe aspekty implementacji:

- **Bezpieczeństwo:** Pełna autoryzacja przez JWT i RLS zapewnia izolację danych użytkowników
- **Wydajność:** Wykorzystanie indeksu PRIMARY KEY zapewnia szybkie wyszukiwanie
- **Obsługa błędów:** Kompleksowa obsługa wszystkich scenariuszy błędów z odpowiednimi kodami statusu
- **Walidacja:** Walidacja formatu UUID przed wykonaniem zapytania do bazy danych
- **Typy:** Pełne typowanie TypeScript zapewnia bezpieczeństwo typów end-to-end

Plan wdrożenia jest gotowy do implementacji przez zespół programistów i zapewnia wszystkie niezbędne wskazówki dla skutecznego i poprawnego wdrożenia endpointu.
