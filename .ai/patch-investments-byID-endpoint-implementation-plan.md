# API Endpoint Implementation Plan: PATCH `/v1/investments/{id}`

## 1. Przegląd punktu końcowego

Endpoint `PATCH /v1/investments/{id}` umożliwia częściową aktualizację inwestycji należącej do aktualnie zalogowanego użytkownika. Endpoint wykorzystuje Supabase Auth (Bearer JWT) oraz polityki RLS (`user_id = auth.uid()`), aby zagwarantować, że aktualizacja dotyczy wyłącznie inwestycji należących do właściciela. Typowe scenariusze użycia obejmują korektę kwoty, zmiany typu aktywa, aktualizację daty nabycia lub edycję notatek.

Endpoint obsługuje częściowe aktualizacje (partial update), co oznacza, że klient może przesłać tylko te pola, które chce zaktualizować, bez konieczności przesyłania całego obiektu.

## 2. Szczegóły żądania

- **Metoda HTTP:** `PATCH`
- **Struktura URL:** `/v1/investments/{id}`
  - `{id}` - UUID inwestycji (wymagany parametr ścieżki)
- **Headers:**
  - Wymagane: `Authorization: Bearer <JWT>` (Supabase session token)
  - Opcjonalne: 
    - `Accept-Language` (np. `pl-PL`, `en-US`) - dla lokalizacji komunikatów błędów
    - `X-Request-Id` - identyfikator żądania do korelacji logów
    - `Content-Type: application/json`
- **Request Body (JSON):**
  - Dozwolone pola (częściowa aktualizacja):
    - `type` (string, opcjonalne) - typ aktywa: `"etf" | "bond" | "stock" | "cash"`
    - `amount` (number, opcjonalne) - kwota inwestycji w PLN
    - `acquired_at` (string, opcjonalne) - data nabycia w formacie ISO YYYY-MM-DD
    - `notes` (string | null, opcjonalne) - opcjonalne notatki
  - Zasady:
    - Body musi zawierać co najmniej jedno z powyższych pól.
    - Pola spoza listy są odrzucane (400 bad_request).
    - Wszystkie pola są opcjonalne, ale przynajmniej jedno musi być obecne.
- **Walidacja (Zod → `UpdateInvestmentCommand`):**
  - `type`: musi być jednym z wartości ENUM: `"etf" | "bond" | "stock" | "cash"` (walidacja zgodna z `asset_type` ENUM w bazie)
  - `amount`: liczba > 0, max 9 999 999 999 999.99 (zgodnie z `numeric(16,2)` w bazie)
  - `acquired_at`: data w formacie ISO YYYY-MM-DD, musi być ≤ `current_date` (nie może być datą przyszłą), walidacja względem czasu bazy danych
  - `notes`: 
    - Może być `null` lub string
    - Jeśli string: po trim() musi mieć długość 1-1000 znaków (niepusty po usunięciu białych znaków)
    - Jeśli `null` - dozwolone (usuwa notatki)
  - `refine` wymuszające obecność co najmniej jednego pola do aktualizacji
  - Konwersja wartości `number` zachowuje 2 miejsca po przecinku (użycie helpera formatowania lub `toFixed` podczas zapisu)
- **Powiązane typy:**
  - `UpdateInvestmentCommand` (Partial `CreateInvestmentCommand`) z `src/types.ts`
  - `InvestmentDto` dla odpowiedzi (bez `user_id`)
  - Lokalna definicja `UpdateInvestmentSchema` (Zod) mapująca do `UpdateInvestmentCommand`

## 3. Wykorzystywane typy

### DTOs i Command Modele

1. **`UpdateInvestmentCommand`** (z `src/types.ts`):
   ```typescript
   export type UpdateInvestmentCommand = Partial<CreateInvestmentCommand>
   ```
   - Częściowa aktualizacja, wszystkie pola opcjonalne
   - Bazuje na `CreateInvestmentCommand`:
     ```typescript
     export type CreateInvestmentCommand = {
       type: NonNullable<DbInvestmentInsert["type"]>
       amount: NonNullable<DbInvestmentInsert["amount"]>
       acquired_at: NonNullable<DbInvestmentInsert["acquired_at"]>
       notes?: DbInvestmentInsert["notes"]
     }
     ```

2. **`InvestmentDto`** (z `src/types.ts`):
   ```typescript
   export type InvestmentDto = Omit<DbInvestmentRow, "user_id">
   ```
   - DTO odpowiedzi, bez `user_id` (kontekst użytkownika z auth)
   - Zawiera: `id`, `type`, `amount`, `acquired_at`, `notes`, `created_at`, `updated_at`

3. **`DbInvestmentUpdate`** (z `src/db/database.types.ts`):
   - Typ Supabase dla operacji UPDATE
   - Wszystkie pola opcjonalne z wyjątkiem `user_id` (nie powinno być aktualizowane)

4. **`ApiError`** (z `src/types.ts`):
   ```typescript
   export interface ApiError {
     error: {
       code: "bad_request" | "unauthorized" | "forbidden" | "not_found" | "conflict" | "too_many_requests" | "internal"
       message: string
       fields?: Record<string, string>
     }
   }
   ```

### Schematy walidacji (Zod)

- **`UpdateInvestmentSchema`** - schemat Zod do walidacji request body:
  - `type`: `z.enum(["etf", "bond", "stock", "cash"])`
  - `amount`: `z.number().positive().max(999999999999999.99)`
  - `acquired_at`: `z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(...)` - walidacja daty
  - `notes`: `z.string().trim().min(1).max(1000).nullable().optional()`
  - `refine` - wymusza obecność co najmniej jednego pola

## 4. Szczegóły odpowiedzi

### Sukces

- **Status:** `200 OK`
- **Body:** `InvestmentDto` (pełny zaktualizowany rekord)
  ```json
  {
    "id": "ef2a...",
    "type": "etf",
    "amount": 12000.00,
    "acquired_at": "2024-11-01",
    "notes": "IKZE - zaktualizowane",
    "created_at": "2024-11-01T10:11:12Z",
    "updated_at": "2025-01-15T14:30:00Z"
  }
  ```
- **Headers:**
  - `Content-Type: application/json`
  - `X-Request-Id` (echo, jeśli przesłane w request)

### Błędy

- **400 Bad Request** - Błędy walidacji:
  ```json
  {
    "error": {
      "code": "bad_request",
      "message": "Validation failed",
      "fields": {
        "amount": "must_be_gt_zero",
        "acquired_at": "cannot_be_future_date"
      }
    }
  }
  ```
  - Zwracany gdy:
    - Request body jest puste (brak pól do aktualizacji)
    - Nieprawidłowy format JSON
    - Naruszenie reguł walidacji (amount ≤ 0, data przyszła, notes za długie, itp.)
    - Nieznane pola w body

- **401 Unauthorized** - Brak autoryzacji:
  ```json
  {
    "error": {
      "code": "unauthorized",
      "message": "Authentication required"
    }
  }
  ```
  - Zwracany gdy:
    - Brak tokena `Authorization`
    - Nieprawidłowy/wygasły token JWT
    - Token nie może być zweryfikowany przez Supabase

- **404 Not Found** - Inwestycja nie znaleziona:
  ```json
  {
    "error": {
      "code": "not_found",
      "message": "Investment not found"
    }
  }
  ```
  - Zwracany gdy:
    - Inwestycja o podanym `id` nie istnieje
    - Inwestycja istnieje, ale nie należy do aktualnie zalogowanego użytkownika (RLS)
    - Nieprawidłowy format UUID w `{id}`

- **500 Internal Server Error** - Błąd serwera:
  ```json
  {
    "error": {
      "code": "internal",
      "message": "An unexpected error occurred"
    }
  }
  ```
  - Zwracany gdy:
    - Błąd połączenia z Supabase
    - Nieoczekiwany błąd bazy danych
    - Inne nieobsłużone wyjątki

## 5. Przepływ danych

1. **API Route (Astro server endpoint)** w `src/pages/api/v1/investments/[id].ts`:
   - Odczytuje `supabase` z `Astro.locals` (zgodnie z regułami backend.mdc)
   - Autoryzuje żądanie przez `context.locals.session` lub `supabase.auth.getUser()`
   - Ekstrahuje `id` z parametrów ścieżki (`Astro.params.id`)
   - Waliduje format UUID (opcjonalnie, Supabase zwróci błąd jeśli nieprawidłowy)
   - Parsuje i waliduje body przy użyciu schematu Zod → `UpdateInvestmentCommand`
   - Wywołuje serwis `updateInvestment(supabase, userId, investmentId, command)`

2. **Serwis inwestycji** (`src/lib/services/investment.service.ts`):
   - `updateInvestment(supabase, userId, investmentId, command)`:
     1. Weryfikuje istnienie inwestycji (SELECT z filtrem `id` i `user_id`):
        ```typescript
        const { data: existing, error: fetchError } = await supabase
          .from("investments")
          .select("id")
          .eq("id", investmentId)
          .eq("user_id", userId)
          .single()
        ```
     2. Jeśli brak rekordu lub błąd RLS → zwraca błąd domenowy `InvestmentNotFoundError`
     3. Buduje `DbInvestmentUpdate` z przekazanych pól (whitelist + `updated_at` zostanie zaktualizowane przez trigger):
        - Tylko pola obecne w `command` są uwzględniane
        - `notes` może być `null` (usunięcie notatek)
        - `user_id` NIGDY nie jest aktualizowane
     4. Wykonuje UPDATE:
        ```typescript
        const { data, error } = await supabase
          .from("investments")
          .update(updatePayload)
          .eq("id", investmentId)
          .eq("user_id", userId)  // dodatkowa warstwa bezpieczeństwa
          .select()
          .single()
        ```
     5. Obsługuje błędy Supabase:
        - `PGRST116` (no rows returned) → `InvestmentNotFoundError`
        - Inne błędy → `DatabaseError`
     6. Mapuje wynik na `InvestmentDto` (usunięcie `user_id`)

3. **Handler**:
   - Obsługuje wynik serwisu:
     - Sukces → `200` + `InvestmentDto`
     - `InvestmentNotFoundError` → `404`
     - Błędy walidacji → `400` z `fields`
     - Inne błędy → mapowanie na `400/500`
   - Dodaje nagłówki (`Content-Type`, ewentualny `X-Request-Id` echo)
   - Loguje błędy (bez danych wrażliwych)

## 6. Względy bezpieczeństwa

### Autoryzacja i autentykacja

- **Wymuszaj autoryzację Supabase**: `context.locals.session` lub `supabase.auth.getUser()`, brak sesji → `401`
- **RLS jako warstwa bezpieczeństwa**: Polegaj na RLS tabeli `investments` (`user_id = auth.uid()`), nie przekazuj `user_id` w commandach
- **Podwójna weryfikacja**: W zapytaniu UPDATE używaj zarówno `eq("id", investmentId)` jak i `eq("user_id", userId)` jako dodatkowej warstwy bezpieczeństwa (defense in depth)

### Walidacja danych

- **Whitelist pól**: Tylko dozwolone pola (`type`, `amount`, `acquired_at`, `notes`) są akceptowane, odrzucaj niespodziewane klucze
- **Sanitacja danych**:
  - Walidacja formatów liczb i dat przed zapisem
  - Trimming stringów (`notes`) przed walidacją
  - Walidacja zakresów (amount > 0, data ≤ today)
- **Walidacja UUID**: Weryfikuj format `{id}` przed zapytaniem do bazy (opcjonalnie, Supabase zwróci błąd, ale wcześniejsza walidacja jest lepsza dla UX)

### Ochrona przed atakami

- **SQL Injection**: Używaj Supabase client (parametryzowane zapytania), nigdy nie konstruuj SQL ręcznie
- **XSS**: Dane `notes` są przechowywane jako plain text, sanitizacja po stronie frontendu (poza zakresem endpointu)
- **CSRF**: Wymagany token JWT w headerze `Authorization`, nie w cookie
- **Rate limiting**: Opcjonalnie limit rate w middleware (np. 20 req/min dla mutacji, zgodnie z api-plan.md)

### Logowanie i audyt

- **Logowanie bezpieczne**: Loguj `X-Request-Id`/`Accept-Language` do kontekstu diagnostycznego (bez danych wrażliwych jak amount, notes)
- **Brak tabeli logów w MVP**: Zgodnie z db-plan.md, brak dedykowanej tabeli `error_logs` w MVP - użyj `console.error` lub integracja Sentry jeśli dostępna
- **Redakcja PII**: W logach nie zapisuj pełnych danych inwestycji, tylko `id` i `user_id` dla korelacji

## 7. Obsługa błędów

### Scenariusze błędów i kody statusu

1. **Walidacja request body (400 Bad Request)**:
   - Puste body (brak pól do aktualizacji)
   - Nieprawidłowy format JSON
   - `amount ≤ 0` lub `amount` przekracza limit
   - `acquired_at` jest datą przyszłą
   - `notes` ma długość < 1 lub > 1000 znaków (po trim)
   - `type` nie jest w ENUM
   - Nieznane pola w body
   - **Obsługa**: Zwróć `400` z `ApiError` zawierającym `fields` z szczegółami błędów dla każdego pola

2. **Brak autoryzacji (401 Unauthorized)**:
   - Brak header `Authorization`
   - Nieprawidłowy format tokena
   - Token wygasły lub nieprawidłowy
   - **Obsługa**: Zwróć `401` z `ApiError` (`error.code = "unauthorized"`)

3. **Inwestycja nie znaleziona (404 Not Found)**:
   - Inwestycja o podanym `id` nie istnieje
   - Inwestycja istnieje, ale nie należy do użytkownika (RLS)
   - Nieprawidłowy format UUID (może być obsłużony jako 400, ale 404 jest bardziej semantyczne)
   - **Obsługa**: Zwróć `404` z `ApiError` (`error.code = "not_found"`)

4. **Błędy bazy danych (500 Internal Server Error)**:
   - Błąd połączenia z Supabase
   - Timeout zapytania
   - Błąd constraint CHECK (powinien być przechwycony przez walidację, ale jako fallback)
   - Inne nieoczekiwane błędy Supabase
   - **Obsługa**: 
     - Sprawdź `error.code` z Supabase
     - `PGRST116` (no rows) → `404` (już obsłużone wyżej)
     - Inne → `500` z generycznym komunikatem
     - Loguj szczegóły błędu (bez danych wrażliwych)

5. **Nieoczekiwane wyjątki (500 Internal Server Error)**:
   - Wyjątki JavaScript/TypeScript nieobsłużone przez serwis
   - Błędy parsowania JSON
   - **Obsługa**: Opakuj w `try/catch`, zwróć `500` z generycznym komunikatem, zachowując szczegóły tylko w logach

### Mapowanie błędów Supabase

- **`PGRST116`** (no rows returned) → `404 Not Found` (inwestycja nie znaleziona)
- **`23505`** (unique violation) → nie dotyczy (brak unique constraints poza PK)
- **`23503`** (foreign key violation) → nie dotyczy (brak FK poza user_id, który jest z auth)
- **`23514`** (check constraint violation) → `400 Bad Request` (powinno być przechwycone przez walidację, ale jako fallback)
- **Inne błędy** → `500 Internal Server Error`

### Logowanie błędów

- **Struktura logów**: Używaj strukturyzowanych logów z kontekstem:
  ```typescript
  console.error("Investment update failed", {
    requestId: requestId,
    userId: userId,
    investmentId: investmentId,
    error: error.message,
    // NIE loguj: amount, notes (dane wrażliwe)
  })
  ```
- **Poziomy logowania**:
  - `error` - błędy 4xx/5xx
  - `warn` - nieprawidłowe próby dostępu (404 dla cudzych inwestycji)
  - `info` - udane aktualizacje (opcjonalnie, dla audytu)

## 8. Rozważania dotyczące wydajności

### Optymalizacje zapytań

- **Indeksy**: Wykorzystaj istniejące indeksy:
  - `investments_pkey` (PK na `id`) - O(1) dostęp do rekordu
  - `investments_user_id_idx` - przyspiesza filtrowanie po `user_id` (RLS)
- **Minimalizacja roundtripów**: 
  - Połącz UPDATE z `select().single()` dla zwrócenia wyniku w jednym zapytaniu (zamiast SELECT + UPDATE + SELECT)
  - Walidację przeprowadź przed zapytaniem, by uniknąć zbędnych roundtripów do bazy
- **Trigger `updated_at`**: Automatyczna aktualizacja `updated_at` przez trigger `investments_updated_at_trigger` (nie wymaga ręcznej aktualizacji w kodzie)

### Cache

- **Brak cache dla mutacji**: Dane użytkownika są dynamiczne, cache niepotrzebny dla operacji UPDATE
- **ETag (przyszłość)**: Można ewentualnie wykorzystać ETag w przyszłości dla optymistycznej aktualizacji (poza zakresem MVP)

### Limity i skalowalność

- **Rozmiar request body**: Limit 16KB (zgodnie z api-plan.md) - wystarczający dla JSON z maksymalnymi `notes` (1000 znaków)
- **Timeout**: Supabase ma domyślny timeout, monitoruj długie zapytania
- **Concurrent updates**: RLS zapewnia izolację, ale warto rozważyć optimistic locking w przyszłości (poza zakresem MVP)

## 9. Kroki implementacji

### Krok 1: Przygotowanie struktury plików

1. **Utwórz/zweryfikuj strukturę katalogów**:
   - `src/lib/services/` - jeśli nie istnieje
   - `src/pages/api/v1/investments/` - jeśli nie istnieje

2. **Utwórz pliki**:
   - `src/lib/services/investment.service.ts` - serwis do operacji na inwestycjach
   - `src/pages/api/v1/investments/[id].ts` - endpoint Astro (obsługa PATCH)

### Krok 2: Definicja walidacji (Zod)

1. **Utwórz schemat walidacji** w `src/lib/services/investment.service.ts` lub osobnym pliku `src/lib/validators/investment.validator.ts`:
   ```typescript
   import { z } from "zod"
   import type { UpdateInvestmentCommand } from "@/types"

   export const UpdateInvestmentSchema = z.object({
     type: z.enum(["etf", "bond", "stock", "cash"]).optional(),
     amount: z.number().positive().max(999999999999999.99).optional(),
     acquired_at: z.string()
       .regex(/^\d{4}-\d{2}-\d{2}$/)
       .refine((date) => {
         const dateObj = new Date(date)
         const today = new Date()
         today.setHours(0, 0, 0, 0)
         return dateObj <= today
       }, { message: "acquired_at cannot be a future date" })
       .optional(),
     notes: z.string().trim().min(1).max(1000).nullable().optional(),
   }).refine(
     (data) => Object.keys(data).length > 0,
     { message: "At least one field must be provided" }
   )
   ```

2. **Helper konwersji**: Funkcja mapująca wynik Zod do `UpdateInvestmentCommand`

### Krok 3: Implementacja serwisu

1. **Zdefiniuj niestandardowe błędy** w `src/lib/services/investment.service.ts`:
   ```typescript
   export class InvestmentNotFoundError extends Error {
     constructor(investmentId: string) {
       super(`Investment not found: ${investmentId}`)
       this.name = "InvestmentNotFoundError"
    }
   }

   export class DatabaseError extends Error {
     constructor(message: string, public originalError?: unknown) {
       super(message)
       this.name = "DatabaseError"
    }
   }
   ```

2. **Funkcja `buildInvestmentUpdatePayload`**:
   - Tworzy `DbInvestmentUpdate` z `UpdateInvestmentCommand`
   - Whitelist pól (tylko dozwolone)
   - Obsługa `notes: null` (usunięcie notatek)

3. **Funkcja `updateInvestment`**:
   - Parametry: `supabase`, `userId`, `investmentId`, `command`
   - Weryfikacja istnienia inwestycji (SELECT)
   - Budowa payloadu aktualizacji
   - Wykonanie UPDATE z `select().single()`
   - Mapowanie na `InvestmentDto` (usunięcie `user_id`)
   - Obsługa błędów Supabase

### Krok 4: Implementacja handlera PATCH

1. **W `src/pages/api/v1/investments/[id].ts`**:
   ```typescript
   export const prerender = false

   export async function PATCH(context: APIContext) {
     // 1. Autoryzacja
     // 2. Ekstrakcja id z params
     // 3. Parsowanie i walidacja body (Zod)
     // 4. Wywołanie serwisu
     // 5. Zwrócenie odpowiedzi
   }
   ```

2. **Autoryzacja**:
   - Odczyt `supabase` z `context.locals`
   - Weryfikacja sesji (`supabase.auth.getUser()`)
   - Brak sesji → `401`

3. **Walidacja**:
   - Parsowanie JSON z `context.request.body`
   - Walidacja schematem Zod
   - Błędy walidacji → `400` z `fields`

4. **Wywołanie serwisu**:
   - `updateInvestment(supabase, userId, investmentId, command)`
   - Obsługa błędów domenowych (`InvestmentNotFoundError` → `404`)

5. **Odpowiedź**:
   - Sukces → `200` + `InvestmentDto`
   - Dodanie nagłówków (`Content-Type`, `X-Request-Id`)

### Krok 5: Obsługa błędów i logowanie

1. **Try/catch w handlerze**:
   - Opakuj logikę w `try/catch`
   - Rozpoznaj typ błędu (domenowy vs. nieoczekiwany)
   - Mapuj na odpowiedni kod statusu

2. **Logowanie**:
   - Używaj `console.error` dla błędów (lub globalny logger jeśli dostępny)
   - Strukturyzowane logi z kontekstem (requestId, userId, investmentId)
   - NIE loguj danych wrażliwych (amount, notes)

3. **TODO dla przyszłości**:
   - Dodaj komentarz TODO dotyczący integracji z tabelą `error_logs`, jeśli pojawi się w przyszłości

### Krok 6: Testy

1. **Testy jednostkowe serwisu** (jeśli framework testowy dostępny):
   - Mock Supabase client
   - Testy ścieżek: sukces, 404, błędy walidacji, błędy bazy danych

2. **Testy integracyjne/e2e** (np. Playwright):
   - Test aktualizacji z prawidłowymi danymi → `200`
   - Test aktualizacji nieistniejącej inwestycji → `404`
   - Test aktualizacji cudzej inwestycji → `404` (RLS)
   - Test walidacji (amount ≤ 0, data przyszła, itp.) → `400`
   - Test braku autoryzacji → `401`
   - Test aktualizacji z pustym body → `400`

### Krok 7: Weryfikacja lokalna

1. **Lint i formatowanie**:
   ```bash
   pnpm lint
   pnpm lint:fix
   pnpm format
   ```

2. **Testy manualne**:
   - Uruchom lokalny serwer deweloperski
   - Przetestuj endpoint przez `curl` lub API client (Postman, Insomnia):
     ```bash
     curl -X PATCH http://localhost:4321/api/v1/investments/{id} \
       -H "Authorization: Bearer <token>" \
       -H "Content-Type: application/json" \
       -d '{"amount": 15000.00, "notes": "Zaktualizowane"}'
     ```

3. **Weryfikacja w bazie**:
   - Sprawdź, czy `updated_at` jest aktualizowane przez trigger
   - Sprawdź, czy tylko dozwolone pola są aktualizowane
   - Sprawdź, czy RLS działa poprawnie (próba aktualizacji cudzej inwestycji)

### Krok 8: Dokumentacja i readiness

1. **Aktualizacja dokumentacji**:
   - Sprawdź, czy `api-plan.md` wymaga aktualizacji (endpoint już jest opisany)
   - Zaktualizuj changelog jeśli wymagane

2. **Przygotowanie PR**:
   - Opis zmian podkreślający walidację i obsługę błędów
   - Lista testowanych scenariuszy
   - Screenshoty/logi z testów manualnych (opcjonalnie)

3. **Code review checklist**:
   - [ ] Walidacja zgodna ze specyfikacją API
   - [ ] Obsługa błędów kompletna (400, 401, 404, 500)
   - [ ] Bezpieczeństwo (RLS, whitelist pól, sanitizacja)
   - [ ] Logowanie bez danych wrażliwych
   - [ ] Testy przechodzą
   - [ ] Lint bez błędów
   - [ ] Zgodność z regułami implementacji (backend.mdc, astro.mdc)



