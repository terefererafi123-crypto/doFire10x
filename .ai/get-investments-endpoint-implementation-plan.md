# API Endpoint Implementation Plan: GET `/v1/investments`

## 1. Przegląd punktu końcowego

Endpoint `GET /v1/investments` służy do pobierania listy inwestycji użytkownika z obsługą paginacji kursora, filtrowania i sortowania. Endpoint wymaga autoryzacji i zwraca tylko te inwestycje, które należą do zalogowanego użytkownika (weryfikacja przez Row Level Security w bazie danych). Jest to podstawowy endpoint do przeglądania inwestycji użytkownika, używany w scenariuszach takich jak lista inwestycji, raporty i analizy portfela.

**Kluczowe cechy:**
- Wymaga autoryzacji (Bearer JWT token)
- Zwraca listę inwestycji z paginacją kursora
- Obsługuje filtrowanie po typie aktywa i zakresie dat
- Obsługuje sortowanie po dacie nabycia lub kwocie
- Automatyczna filtracja przez RLS (tylko inwestycje użytkownika)
- Zwraca pustą listę, jeśli użytkownik nie ma inwestycji
- Domyślny limit: 25 rekordów (maksymalnie 200)

## 2. Szczegóły żądania

- **Metoda HTTP:** `GET`
- **Struktura URL:** `/v1/investments`
- **Parametry ścieżki:** Brak
- **Parametry zapytania:**
  - `limit` (opcjonalny, int, 1–200; domyślnie 25) - Liczba rekordów do zwrócenia
  - `cursor` (opcjonalny, string) - Nieprzezroczysty kursor do paginacji (zwracany w `next_cursor`)
  - `type` (opcjonalny, enum) - Filtr po typie aktywa: `etf`, `bond`, `stock`, `cash`
  - `acquired_at_from` (opcjonalny, ISODateString `YYYY-MM-DD`) - Filtr: data nabycia od (włącznie)
  - `acquired_at_to` (opcjonalny, ISODateString `YYYY-MM-DD`) - Filtr: data nabycia do (włącznie)
  - `sort` (opcjonalny, enum) - Sposób sortowania:
    - `acquired_at_desc` (domyślny) - Data nabycia malejąco
    - `acquired_at_asc` - Data nabycia rosnąco
    - `amount_desc` - Kwota malejąco
    - `amount_asc` - Kwota rosnąco
- **Request Body:** Brak
- **Nagłówki wymagane:**
  - `Authorization: Bearer <Supabase-JWT>` - Token JWT z Supabase Auth
- **Nagłówki opcjonalne:**
  - `Accept: application/json` (domyślnie)
  - `X-Request-Id` (dla korelacji logów, opcjonalne)
  - `Accept-Language` (dla lokalizacji komunikatów błędów, opcjonalne)

## 3. Wykorzystywane typy

### 3.1. DTO odpowiedzi

Endpoint wykorzystuje typy zdefiniowane w `src/types.ts`:

**InvestmentListResponseDto:**
```typescript
export interface InvestmentListResponseDto {
  items: InvestmentDto[]
  next_cursor?: Cursor
}
```

**InvestmentDto:**
```typescript
export type InvestmentDto = Omit<DbInvestmentRow, "user_id">
```

**Struktura odpowiedzi (200 OK):**
```typescript
{
  items: [
    {
      id: string                    // UUID
      type: AssetType              // "etf" | "bond" | "stock" | "cash"
      amount: number               // Money (PLN, 2 miejsca po przecinku)
      acquired_at: ISODateString   // "YYYY-MM-DD"
      notes: string | null         // Opcjonalne notatki (max 1000 znaków)
      created_at: TimestampString  // RFC 3339 timestamp
      updated_at: TimestampString  // RFC 3339 timestamp
    }
  ],
  next_cursor?: string             // Opaque cursor dla następnej strony (jeśli istnieje)
}
```

**Uwaga:** Pole `user_id` jest pomijane w odpowiedzi, ponieważ kontekst użytkownika wynika z autoryzacji.

### 3.2. Typy zapytań

**InvestmentListQuery:**
```typescript
export interface InvestmentListQuery {
  limit?: number // 1–200 (default 25)
  cursor?: Cursor
  type?: AssetType
  acquired_at_from?: ISODateString
  acquired_at_to?: ISODateString
  sort?: "acquired_at_desc" | "acquired_at_asc" | "amount_desc" | "amount_asc"
}
```

### 3.3. Typy błędów

Endpoint wykorzystuje typ `ApiError` zdefiniowany w `src/types.ts`:

```typescript
export interface ApiError {
  error: {
    code: "unauthorized" | "bad_request" | "internal"
    message: string
    fields?: Record<string, string>
  }
}
```

### 3.4. Typy pomocnicze

- `AssetType`: `"etf" | "bond" | "stock" | "cash"` (z `src/types.ts`)
- `ISODateString`: Alias typu `string` dla dat w formacie ISO (YYYY-MM-DD)
- `TimestampString`: Alias typu `string` dla timestampów RFC 3339
- `Money`: Alias typu `number` dla wartości pieniężnych w PLN
- `Cursor`: Alias typu `string` dla nieprzezroczystego kursora paginacji

### 3.5. Walidacja parametrów zapytania

Parametry zapytania powinny być walidowane za pomocą schematu Zod:

```typescript
import { z } from 'zod';

const InvestmentListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).optional().default(25),
  cursor: z.string().optional(),
  type: z.enum(['etf', 'bond', 'stock', 'cash']).optional(),
  acquired_at_from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  acquired_at_to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  sort: z.enum(['acquired_at_desc', 'acquired_at_asc', 'amount_desc', 'amount_asc']).optional().default('acquired_at_desc')
});
```

**Reguły walidacji:**
- `limit`: Musi być liczbą całkowitą z zakresu 1-200, domyślnie 25
- `cursor`: Opcjonalny string (dekodowany przez serwis)
- `type`: Musi być jednym z dozwolonych typów aktywów
- `acquired_at_from` i `acquired_at_to`: Muszą być w formacie ISO date (YYYY-MM-DD)
- `sort`: Musi być jednym z dozwolonych wartości sortowania, domyślnie `acquired_at_desc`

## 4. Szczegóły odpowiedzi

### 4.1. Sukces (200 OK)

**Status:** `200 OK`

**Body:**
```json
{
  "items": [
    {
      "id": "ef2a1b2c-3d4e-5f6a-7b8c-9d0e1f2a3b4c",
      "type": "etf",
      "amount": 12000.00,
      "acquired_at": "2024-11-01",
      "notes": "IKZE",
      "created_at": "2024-11-01T10:11:12Z",
      "updated_at": "2024-11-01T10:11:12Z"
    },
    {
      "id": "a1b2c3d4-5e6f-7a8b-9c0d-1e2f3a4b5c6d",
      "type": "bond",
      "amount": 5000.00,
      "acquired_at": "2024-10-15",
      "notes": null,
      "created_at": "2024-10-15T14:20:30Z",
      "updated_at": "2024-10-15T14:20:30Z"
    }
  ],
  "next_cursor": "eyJvZmZzZXQiOjI1LCJsYXN0X2lkIjoiZWYyYS4uLiIsImxhc3RfYWNxdWlyZWRfYXQiOiIyMDI0LTExLTAxIn0="
}
```

**Uwagi:**
- Jeśli użytkownik nie ma inwestycji, `items` będzie pustą tablicą
- `next_cursor` jest obecny tylko wtedy, gdy istnieją kolejne strony wyników
- Kursor jest nieprzezroczysty dla klienta (base64-encoded JSON)

### 4.2. Błędy

#### 4.2.1. 401 Unauthorized

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

**Przyczyny:**
- Brak nagłówka `Authorization`
- Nieprawidłowy format tokenu
- Wygasły lub nieprawidłowy token JWT
- Token nie został zweryfikowany przez Supabase

#### 4.2.2. 400 Bad Request

**Status:** `400 Bad Request`

**Body:**
```json
{
  "error": {
    "code": "bad_request",
    "message": "Invalid query parameters",
    "fields": {
      "limit": "must_be_between_1_and_200",
      "acquired_at_from": "invalid_date_format"
    }
  }
}
```

**Przyczyny:**
- Nieprawidłowy format parametru `limit` (poza zakresem 1-200)
- Nieprawidłowy format daty w `acquired_at_from` lub `acquired_at_to`
- Nieprawidłowa wartość `type` (nie jest jednym z dozwolonych typów)
- Nieprawidłowa wartość `sort` (nie jest jednym z dozwolonych sposobów sortowania)
- Nieprawidłowy format kursora (jeśli podany)

#### 4.2.3. 500 Internal Server Error

**Status:** `500 Internal Server Error`

**Body:**
```json
{
  "error": {
    "code": "internal",
    "message": "An unexpected error occurred"
  }
}
```

**Przyczyny:**
- Błąd połączenia z bazą danych
- Błąd podczas dekodowania kursora
- Nieoczekiwany błąd podczas wykonywania zapytania

## 5. Przepływ danych

### 5.1. Diagram przepływu

```
Client Request
    ↓
[Astro Middleware] - Weryfikacja JWT tokenu
    ↓
[API Route Handler] - Parsowanie i walidacja parametrów zapytania
    ↓
[Investment Service] - Budowanie zapytania SQL z filtrami i sortowaniem
    ↓
[Supabase Client] - Wykonanie zapytania (z RLS)
    ↓
[Database] - Zwrócenie wyników
    ↓
[Investment Service] - Transformacja do DTO, generowanie kursora
    ↓
[API Route Handler] - Formatowanie odpowiedzi
    ↓
Client Response
```

### 5.2. Szczegółowy przepływ

1. **Weryfikacja autoryzacji (Middleware)**
   - Middleware weryfikuje token JWT z nagłówka `Authorization`
   - Jeśli token jest nieprawidłowy, zwraca `401 Unauthorized`
   - Jeśli token jest prawidłowy, wyodrębnia `user_id` z tokenu i przekazuje do handlera

2. **Parsowanie i walidacja parametrów (Route Handler)**
   - Parsowanie parametrów zapytania z URL
   - Walidacja za pomocą schematu Zod
   - Jeśli walidacja nie powiedzie się, zwraca `400 Bad Request` z szczegółami błędów
   - Ustawienie domyślnych wartości (`limit=25`, `sort=acquired_at_desc`)

3. **Dekodowanie kursora (jeśli podany)**
   - Dekodowanie base64 kursora do obiektu JSON
   - Kursor zawiera: `{ offset, last_id, last_sort_value }`
   - Jeśli kursor jest nieprawidłowy, zwraca `400 Bad Request`

4. **Budowanie zapytania SQL (Investment Service)**
   - Konstrukcja zapytania SELECT z filtrami:
     - `WHERE user_id = auth.uid()` (automatycznie przez RLS)
     - `AND type = $1` (jeśli `type` jest podany)
     - `AND acquired_at >= $2` (jeśli `acquired_at_from` jest podany)
     - `AND acquired_at <= $3` (jeśli `acquired_at_to` jest podany)
   - Dodanie sortowania:
     - `ORDER BY acquired_at DESC` (domyślnie)
     - `ORDER BY acquired_at ASC` (jeśli `sort=acquired_at_asc`)
     - `ORDER BY amount DESC` (jeśli `sort=amount_desc`)
     - `ORDER BY amount ASC` (jeśli `sort=amount_asc`)
   - Dodanie paginacji:
     - `LIMIT $limit + 1` (pobieramy o jeden więcej, aby sprawdzić, czy istnieje następna strona)
     - `OFFSET $offset` (jeśli kursor jest podany)
     - Lub `WHERE (sort_column, id) > ($last_sort_value, $last_id)` (dla stabilnego sortowania)

5. **Wykonanie zapytania (Supabase Client)**
   - Wykonanie zapytania z użyciem Supabase client
   - RLS automatycznie filtruje wyniki do inwestycji użytkownika
   - Zwrócenie wyników z bazy danych

6. **Transformacja do DTO (Investment Service)**
   - Mapowanie wyników z bazy do `InvestmentDto` (usunięcie `user_id`)
   - Sprawdzenie, czy istnieje następna strona (jeśli pobrano `limit + 1` rekordów)
   - Generowanie `next_cursor` (jeśli istnieje następna strona):
     - Kodowanie: `base64(JSON.stringify({ offset: newOffset, last_id: lastItem.id, last_sort_value: lastItem.sortValue }))`

7. **Formatowanie odpowiedzi (Route Handler)**
   - Formatowanie odpowiedzi zgodnie z `InvestmentListResponseDto`
   - Ustawienie nagłówków HTTP (Content-Type, Cache-Control)
   - Zwrócenie odpowiedzi `200 OK`

### 5.3. Interakcje z bazą danych

**Tabela:** `public.investments`

**Indeksy wykorzystywane:**
- `investments_user_id_idx` - dla filtrowania po `user_id` (RLS)
- `investments_acquired_at_idx` - dla sortowania i filtrowania po dacie
- `investments_type_idx` - dla filtrowania po typie aktywa

**Zapytanie SQL (przykład):**
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
WHERE user_id = auth.uid()
  AND ($1::asset_type IS NULL OR type = $1::asset_type)
  AND ($2::date IS NULL OR acquired_at >= $2::date)
  AND ($3::date IS NULL OR acquired_at <= $3::date)
ORDER BY 
  CASE 
    WHEN $4 = 'acquired_at_desc' THEN acquired_at
    WHEN $4 = 'acquired_at_asc' THEN acquired_at
    WHEN $4 = 'amount_desc' THEN amount
    WHEN $4 = 'amount_asc' THEN amount
  END DESC,
  id ASC
LIMIT $5 + 1
OFFSET $6;
```

**Uwaga:** RLS automatycznie dodaje warunek `user_id = auth.uid()`, więc nie musimy go jawnie dodawać w zapytaniu (ale możemy dla czytelności).

## 6. Względy bezpieczeństwa

### 6.1. Autoryzacja

- **Wymagany token JWT:** Endpoint wymaga prawidłowego tokenu JWT z Supabase Auth
- **Weryfikacja tokenu:** Token jest weryfikowany przez middleware przed przetworzeniem żądania
- **RLS:** Row Level Security w bazie danych zapewnia, że użytkownik może zobaczyć tylko swoje własne inwestycje
- **Brak user_id w zapytaniu:** Klient nigdy nie wysyła `user_id` - jest on wyodrębniany z tokenu JWT

### 6.2. Walidacja danych wejściowych

- **Walidacja parametrów zapytania:** Wszystkie parametry są walidowane za pomocą schematu Zod przed użyciem
- **Ograniczenie limit:** Limit jest ograniczony do maksymalnie 200 rekordów, aby zapobiec przeciążeniu serwera
- **Walidacja dat:** Daty są walidowane pod kątem formatu ISO (YYYY-MM-DD)
- **Walidacja typu aktywa:** Typ aktywa jest walidowany przeciwko enum `asset_type`
- **Walidacja kursora:** Kursor jest walidowany przed dekodowaniem (jeśli podany)

### 6.3. Ochrona przed atakami

- **SQL Injection:** Używanie parametrówzapytań (prepared statements) przez Supabase client zapobiega SQL injection
- **Rate Limiting:** Endpoint powinien być objęty rate limitingiem (np. 60 req/min per user)
- **HTTPS:** Wszystkie żądania muszą być przesyłane przez HTTPS (wymuszane przez middleware)
- **CORS:** CORS powinien być skonfigurowany, aby zezwalać tylko na żądania z dozwolonych domen frontendu

### 6.4. Prywatność danych

- **Brak user_id w odpowiedzi:** Pole `user_id` jest usuwane z odpowiedzi DTO
- **RLS:** Row Level Security zapewnia, że użytkownik nie może zobaczyć inwestycji innych użytkowników
- **Logowanie:** W logach nie powinny być zapisywane wrażliwe dane (kwoty, notatki) - tylko metadane (ID, typ, data)

## 7. Obsługa błędów

### 7.1. Scenariusze błędów

#### 7.1.1. Błąd autoryzacji (401)

**Scenariusz:** Brak lub nieprawidłowy token JWT

**Obsługa:**
- Middleware zwraca `401 Unauthorized` przed przetworzeniem żądania
- Komunikat: "Missing or invalid authentication token"

**Logowanie:**
- Zaloguj próbę dostępu bez autoryzacji (bez wrażliwych danych)

#### 7.1.2. Błąd walidacji (400)

**Scenariusz:** Nieprawidłowe parametry zapytania

**Obsługa:**
- Walidacja za pomocą schematu Zod zwraca szczegółowe błędy
- Zwróć `400 Bad Request` z obiektem `fields` zawierającym szczegóły błędów dla każdego pola

**Przykłady:**
- `limit` poza zakresem 1-200 → `"limit": "must_be_between_1_and_200"`
- Nieprawidłowy format daty → `"acquired_at_from": "invalid_date_format"`
- Nieprawidłowy typ aktywa → `"type": "must_be_one_of_etf_bond_stock_cash"`

**Logowanie:**
- Zaloguj błędy walidacji z parametrami zapytania (bez wrażliwych danych)

#### 7.1.3. Błąd dekodowania kursora (400)

**Scenariusz:** Nieprawidłowy format kursora

**Obsługa:**
- Próba dekodowania base64 kursora kończy się niepowodzeniem
- Zwróć `400 Bad Request` z komunikatem: "Invalid cursor format"

**Logowanie:**
- Zaloguj próbę użycia nieprawidłowego kursora

#### 7.1.4. Błąd bazy danych (500)

**Scenariusz:** Błąd połączenia z bazą danych lub błąd zapytania

**Obsługa:**
- Przechwyć błąd z Supabase client
- Zwróć `500 Internal Server Error` z ogólnym komunikatem
- Nie ujawniaj szczegółów błędu klientowi (ze względów bezpieczeństwa)

**Logowanie:**
- Zaloguj pełny błąd z stack trace (tylko po stronie serwera)
- Użyj `X-Request-Id` do korelacji logów

#### 7.1.5. Błąd transformacji danych (500)

**Scenariusz:** Błąd podczas transformacji wyników z bazy do DTO

**Obsługa:**
- Przechwyć błąd podczas mapowania
- Zwróć `500 Internal Server Error`

**Logowanie:**
- Zaloguj błąd z kontekstem (user_id, parametry zapytania)

### 7.2. Struktura odpowiedzi błędów

Wszystkie błędy zwracają strukturę zgodną z `ApiError`:

```typescript
{
  error: {
    code: "unauthorized" | "bad_request" | "internal"
    message: string  // Zlokalizowany komunikat (jeśli Accept-Language)
    fields?: Record<string, string>  // Tylko dla błędów walidacji
  }
}
```

### 7.3. Lokalizacja komunikatów błędów

- Komunikaty błędów powinny być zlokalizowane zgodnie z nagłówkiem `Accept-Language`
- Domyślny język: angielski
- Obsługiwane języki: polski (`pl-PL`), angielski (`en-US`)

## 8. Rozważania dotyczące wydajności

### 8.1. Optymalizacja zapytań

- **Wykorzystanie indeksów:** Zapytania wykorzystują istniejące indeksy:
  - `investments_user_id_idx` - dla filtrowania po `user_id` (RLS)
  - `investments_acquired_at_idx` - dla sortowania i filtrowania po dacie
  - `investments_type_idx` - dla filtrowania po typie aktywa

- **Paginacja kursora:** Użycie paginacji kursora zamiast OFFSET zapewnia stabilne sortowanie i lepszą wydajność dla dużych zbiorów danych

- **Limit wyników:** Domyślny limit 25 rekordów i maksymalny limit 200 rekordów zapobiega przeciążeniu serwera i bazy danych

### 8.2. Cache'owanie

- **HTTP Cache:** Endpoint może emitować nagłówki `ETag` i `Last-Modified` dla odpowiedzi bez filtrów i sortowania
- **Cache-Control:** Ustaw `Cache-Control: private, max-age=60` dla odpowiedzi z filtrami (cache tylko dla tego użytkownika)
- **Brak cache dla zapytań z kursorem:** Zapytania z kursorem nie powinny być cache'owane (dynamiczne wyniki)

### 8.3. Potencjalne wąskie gardła

- **Duża liczba inwestycji:** Jeśli użytkownik ma bardzo dużo inwestycji, zapytania mogą być wolniejsze
  - **Rozwiązanie:** Użycie indeksów i paginacji kursora minimalizuje wpływ
  - **Monitorowanie:** Monitoruj czas wykonywania zapytań i rozważ optymalizację, jeśli przekracza 500ms

- **Złożone filtry:** Kombinacja wielu filtrów może wymagać sekwencyjnego skanowania
  - **Rozwiązanie:** Indeksy na `user_id`, `acquired_at` i `type` powinny wystarczyć dla większości zapytań

- **Sortowanie:** Sortowanie po `amount` może być wolniejsze niż sortowanie po `acquired_at` (indeks)
  - **Rozwiązanie:** Rozważ dodanie indeksu na `amount`, jeśli sortowanie po kwocie będzie często używane

### 8.4. Optymalizacje przyszłościowe

- **Indeks złożony:** Rozważ dodanie indeksu złożonego `(user_id, acquired_at, type)` dla jeszcze lepszej wydajności
- **Materialized View:** Dla bardzo dużych zbiorów danych można rozważyć materialized view z agregacjami
- **Read Replicas:** Dla skalowania odczytów można użyć read replicas bazy danych

## 9. Etapy wdrożenia

### 9.1. Przygotowanie środowiska

1. **Utworzenie struktury katalogów**
   - Utworzenie katalogu `src/pages/api/v1/investments/` (jeśli nie istnieje)
   - Utworzenie pliku `src/pages/api/v1/investments/index.ts` dla endpointu GET

2. **Utworzenie/usunięcie serwisu (jeśli potrzebne)**
   - Sprawdzenie, czy istnieje serwis `src/lib/services/investment.service.ts`
   - Jeśli nie istnieje, utworzenie serwisu z metodą `getInvestments()`
   - Jeśli istnieje, dodanie metody `getInvestments()` lub rozszerzenie istniejącej

### 9.2. Implementacja walidacji

3. **Utworzenie schematu walidacji Zod**
   - Utworzenie pliku `src/lib/validators/investment.validator.ts`
   - Zdefiniowanie schematu `InvestmentListQuerySchema` z walidacją wszystkich parametrów zapytania
   - Eksport schematu do użycia w route handlerze

4. **Utworzenie funkcji walidacji**
   - Funkcja `validateInvestmentListQuery()` przyjmująca parametry zapytania i zwracająca zwalidowane dane lub błędy
   - Obsługa domyślnych wartości (`limit=25`, `sort=acquired_at_desc`)

### 9.3. Implementacja logiki biznesowej

5. **Implementacja dekodowania kursora**
   - Utworzenie funkcji `decodeCursor()` w serwisie inwestycji
   - Funkcja dekoduje base64 kursora do obiektu `{ offset, last_id, last_sort_value }`
   - Obsługa błędów dekodowania (zwraca `null` lub rzuca błąd)

6. **Implementacja kodowania kursora**
   - Utworzenie funkcji `encodeCursor()` w serwisie inwestycji
   - Funkcja koduje obiekt `{ offset, last_id, last_sort_value }` do base64
   - Używana do generowania `next_cursor` w odpowiedzi

7. **Implementacja budowania zapytania SQL**
   - Utworzenie funkcji `buildInvestmentQuery()` w serwisie inwestycji
   - Funkcja przyjmuje zwalidowane parametry zapytania i zwraca obiekt z zapytaniem Supabase
   - Obsługa wszystkich filtrów (`type`, `acquired_at_from`, `acquired_at_to`)
   - Obsługa wszystkich sposobów sortowania
   - Obsługa paginacji kursora (użycie `gt()` lub `lt()` dla stabilnego sortowania)

8. **Implementacja metody `getInvestments()` w serwisie**
   - Metoda przyjmuje `user_id` i zwalidowane parametry zapytania
   - Buduje zapytanie SQL za pomocą `buildInvestmentQuery()`
   - Wykonuje zapytanie z limitem `limit + 1` (aby sprawdzić, czy istnieje następna strona)
   - Mapuje wyniki do `InvestmentDto` (usunięcie `user_id`)
   - Generuje `next_cursor` (jeśli istnieje następna strona)
   - Zwraca `InvestmentListResponseDto`

### 9.4. Implementacja route handlera

9. **Utworzenie route handlera GET**
   - Utworzenie pliku `src/pages/api/v1/investments/index.ts`
   - Importowanie zależności (Supabase client, serwis, walidator, typy)
   - Implementacja funkcji `GET()` zgodnie z konwencją Astro API routes

10. **Implementacja weryfikacji autoryzacji**
    - Wyodrębnienie tokenu JWT z nagłówka `Authorization`
    - Weryfikacja tokenu za pomocą Supabase client
    - Jeśli token jest nieprawidłowy, zwróć `401 Unauthorized`
    - Wyodrębnienie `user_id` z tokenu

11. **Implementacja parsowania i walidacji parametrów**
    - Parsowanie parametrów zapytania z `Astro.url.searchParams`
    - Walidacja za pomocą `validateInvestmentListQuery()`
    - Jeśli walidacja nie powiedzie się, zwróć `400 Bad Request` z szczegółami błędów

12. **Implementacja logiki endpointu**
    - Wywołanie `investmentService.getInvestments(user_id, validatedQuery)`
    - Obsługa błędów (500 dla błędów serwera)
    - Formatowanie odpowiedzi zgodnie z `InvestmentListResponseDto`
    - Ustawienie nagłówków HTTP (Content-Type, Cache-Control)
    - Zwrócenie odpowiedzi `200 OK`

### 9.5. Obsługa błędów i lokalizacja

13. **Implementacja obsługi błędów**
    - Utworzenie funkcji pomocniczej `handleApiError()` dla spójnej obsługi błędów
    - Mapowanie błędów do odpowiednich kodów statusu HTTP
    - Formatowanie odpowiedzi błędów zgodnie z `ApiError`

14. **Implementacja lokalizacji komunikatów błędów**
    - Utworzenie funkcji `getLocalizedErrorMessage()` dla lokalizacji komunikatów
    - Obsługa nagłówka `Accept-Language`
    - Domyślny język: angielski
    - Obsługiwane języki: polski, angielski

### 9.6. Testowanie

15. **Testy jednostkowe serwisu**
    - Testy dla `buildInvestmentQuery()` z różnymi kombinacjami filtrów i sortowania
    - Testy dla `decodeCursor()` i `encodeCursor()`
    - Testy dla `getInvestments()` z różnymi scenariuszami (pusta lista, paginacja, filtry)

16. **Testy integracyjne route handlera**
    - Testy z prawidłowym tokenem JWT
    - Testy z nieprawidłowym tokenem (401)
    - Testy z nieprawidłowymi parametrami zapytania (400)
    - Testy z różnymi kombinacjami filtrów i sortowania
    - Testy paginacji kursora

17. **Testy E2E (Playwright)**
    - Testy pełnego przepływu: autoryzacja → żądanie → odpowiedź
    - Testy z różnymi scenariuszami użytkownika (brak inwestycji, wiele inwestycji)
    - Testy wydajności (czas odpowiedzi < 500ms dla typowych zapytań)

### 9.7. Dokumentacja i optymalizacja

18. **Dokumentacja kodu**
    - Dodanie komentarzy JSDoc do wszystkich funkcji publicznych
    - Dokumentacja parametrów, zwracanych wartości i wyjątków
    - Przykłady użycia w komentarzach

19. **Optymalizacja wydajności**
    - Sprawdzenie wykorzystania indeksów w zapytaniach (EXPLAIN ANALYZE)
    - Optymalizacja zapytań, jeśli czas wykonywania przekracza 500ms
    - Dodanie cache'owania HTTP, jeśli odpowiednie

20. **Code review i refaktoryzacja**
    - Przegląd kodu pod kątem zgodności z zasadami implementacji
    - Refaktoryzacja, jeśli potrzebna (wydzielenie wspólnej logiki, poprawa czytelności)
    - Upewnienie się, że kod jest zgodny z TypeScript strict mode

### 9.8. Wdrożenie

21. **Merge do głównej gałęzi**
    - Utworzenie pull request z implementacją
    - Code review przez zespół
    - Merge po zatwierdzeniu

22. **Deployment**
    - Deployment przez CI/CD pipeline (GitHub Actions)
    - Weryfikacja działania endpointu w środowisku produkcyjnym
    - Monitorowanie błędów i wydajności

## 10. Uwagi dodatkowe

### 10.1. Paginacja kursora

Paginacja kursora jest preferowana nad OFFSET, ponieważ:
- Zapewnia stabilne sortowanie (nie ma problemu z duplikatami przy dodawaniu nowych rekordów)
- Lepsza wydajność dla dużych zbiorów danych (OFFSET jest kosztowny)
- Nieprzezroczysty dla klienta (nie ujawnia struktury danych)

**Format kursora:**
```typescript
{
  offset: number,           // Offset dla OFFSET-based pagination (opcjonalnie)
  last_id: string,          // UUID ostatniego rekordu na stronie
  last_sort_value: any      // Wartość kolumny sortowania ostatniego rekordu
}
```

**Użycie kursora:**
- Dla sortowania po `acquired_at`: `WHERE (acquired_at, id) > ($last_acquired_at, $last_id)`
- Dla sortowania po `amount`: `WHERE (amount, id) > ($last_amount, $last_id)`

### 10.2. Obsługa pustych wyników

Jeśli użytkownik nie ma inwestycji, endpoint zwraca:
```json
{
  "items": [],
  "next_cursor": undefined
}
```

Nie jest to błąd - to prawidłowa odpowiedź dla użytkownika bez inwestycji.

### 10.3. Sortowanie domyślne

Domyślne sortowanie to `acquired_at_desc` (najnowsze inwestycje pierwsze), ponieważ:
- Użytkownicy zazwyczaj chcą zobaczyć najnowsze inwestycje
- Indeks na `acquired_at` zapewnia dobrą wydajność

### 10.4. Limit domyślny

Domyślny limit 25 rekordów jest kompromisem między:
- Wydajnością (mniejsze zapytania są szybsze)
- Doświadczeniem użytkownika (wystarczająca liczba wyników na stronie)
- Obciążeniem serwera (mniejsze obciążenie bazy danych)

Maksymalny limit 200 rekordów zapobiega przeciążeniu serwera przy bardzo dużych zapytaniach.

### 10.5. Filtrowanie dat

Filtry `acquired_at_from` i `acquired_at_to` są włączne (inclusive):
- `acquired_at_from`: `acquired_at >= $date`
- `acquired_at_to`: `acquired_at <= $date`

Oznacza to, że inwestycja z datą dokładnie równą `acquired_at_from` lub `acquired_at_to` będzie uwzględniona w wynikach.

