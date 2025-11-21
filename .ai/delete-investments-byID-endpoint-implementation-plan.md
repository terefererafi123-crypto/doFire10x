# API Endpoint Implementation Plan: DELETE `/v1/investments/{id}`

## 1. Przegląd punktu końcowego

Endpoint `DELETE /v1/investments/{id}` służy do trwałego usunięcia (hard delete) inwestycji użytkownika z bazy danych. Endpoint wymaga autoryzacji - użytkownik może usuwać wyłącznie swoje własne inwestycje. Potwierdzenie usunięcia jest obsługiwane po stronie UI (modal), a endpoint wykonuje bezpośrednie usunięcie rekordu z tabeli `investments`.

**Kluczowe cechy:**

- Hard delete (brak soft delete zgodnie z PRD)
- Autoryzacja przez Supabase JWT
- Row Level Security (RLS) zapewnia izolację danych użytkowników
- Zwraca `204 No Content` przy sukcesie lub `404 Not Found` gdy inwestycja nie istnieje lub nie należy do użytkownika

## 2. Szczegóły żądania

- **Metoda HTTP:** `DELETE`
- **Struktura URL:** `/v1/investments/{id}`
  - `{id}` - UUID inwestycji do usunięcia (wymagany parametr ścieżki)
- **Parametry:**
  - **Wymagane:**
    - `id` (path parameter) - UUID inwestycji w formacie standardowym UUID v4
  - **Opcjonalne:** Brak
- **Request Body:** Brak (DELETE nie przyjmuje body)
- **Headers:**
  - `Authorization: Bearer <JWT_TOKEN>` - wymagany token JWT z Supabase Auth
  - `Content-Type: application/json` - opcjonalny (nie wymagany dla DELETE bez body)
  - `Accept-Language` - opcjonalny, dla lokalizacji komunikatów błędów

## 3. Wykorzystywane typy

### 3.1. Typy DTO

Brak - endpoint DELETE nie zwraca danych w odpowiedzi (204 No Content).

### 3.2. Typy walidacji

- **Path Parameter Validation:**
  - UUID validation dla `id` - użycie Zod schema:

    ```typescript
    import { z } from "zod";

    const deleteInvestmentParamsSchema = z.object({
      id: z.string().uuid("Invalid investment ID format"),
    });
    ```

### 3.3. Typy bazy danych

- `Tables<"investments">` - typ rekordu z tabeli investments (z `database.types.ts`)
- `SupabaseClient<Database>` - typ klienta Supabase z context.locals

## 4. Szczegóły odpowiedzi

### 4.1. Sukces - 204 No Content

- **Status Code:** `204`
- **Body:** Brak (pusty response body)
- **Headers:**
  - `Content-Length: 0`
  - Opcjonalnie: `X-Request-Id` (jeśli był przekazany w request)

**Warunki:**

- Inwestycja istnieje w bazie danych
- Inwestycja należy do zalogowanego użytkownika (RLS)
- Operacja usunięcia zakończyła się sukcesem

### 4.2. Błąd - 404 Not Found

- **Status Code:** `404`
- **Body:**

```json
{
  "error": {
    "code": "not_found",
    "message": "Investment not found or access denied"
  }
}
```

**Warunki:**

- Inwestycja o podanym ID nie istnieje w bazie danych
- Inwestycja istnieje, ale nie należy do zalogowanego użytkownika (RLS blokuje dostęp)
- UUID ma nieprawidłowy format (walidacja przed zapytaniem do bazy)

### 4.3. Błąd - 401 Unauthorized

- **Status Code:** `401`
- **Body:**

```json
{
  "error": {
    "code": "unauthorized",
    "message": "Authentication required"
  }
}
```

**Warunki:**

- Brak tokenu autoryzacyjnego w headerze
- Token jest nieprawidłowy lub wygasł
- Sesja użytkownika nie jest aktywna

### 4.4. Błąd - 500 Internal Server Error

- **Status Code:** `500`
- **Body:**

```json
{
  "error": {
    "code": "internal",
    "message": "An unexpected error occurred"
  }
}
```

**Warunki:**

- Błąd połączenia z bazą danych
- Nieoczekiwany błąd podczas wykonywania operacji DELETE
- Błąd w logice serwera

## 5. Przepływ danych

### 5.1. Sekwencja operacji

1. **Odbieranie żądania**
   - Astro Server Endpoint odbiera żądanie DELETE
   - Middleware dodaje Supabase client do `context.locals.supabase`

2. **Walidacja autoryzacji**
   - Sprawdzenie obecności tokenu JWT w headerze `Authorization`
   - Weryfikacja sesji użytkownika przez Supabase Auth
   - Jeśli brak autoryzacji → zwróć `401 Unauthorized`

3. **Walidacja parametrów ścieżki**
   - Wyodrębnienie `id` z parametrów URL
   - Walidacja formatu UUID za pomocą Zod schema
   - Jeśli nieprawidłowy format → zwróć `404 Not Found` (lub `400 Bad Request` - decyzja projektowa)

4. **Weryfikacja istnienia i własności**
   - Wykonanie zapytania SELECT do tabeli `investments` z filtrem:
     - `id = {id}` (z parametru)
     - RLS automatycznie filtruje po `user_id = auth.uid()`
   - Jeśli rekord nie istnieje lub nie należy do użytkownika → zwróć `404 Not Found`

5. **Usunięcie rekordu**
   - Wykonanie operacji DELETE na tabeli `investments`
   - RLS zapewnia, że można usunąć tylko własne rekordy
   - Jeśli operacja zakończy się sukcesem → zwróć `204 No Content`
   - Jeśli wystąpi błąd → zwróć `500 Internal Server Error`

### 5.2. Interakcje z bazą danych

**Zapytanie SELECT (weryfikacja):**

```sql
SELECT id, user_id, type, amount, acquired_at, notes, created_at, updated_at
FROM investments
WHERE id = $1 AND user_id = auth.uid()
LIMIT 1;
```

**Zapytanie DELETE:**

```sql
DELETE FROM investments
WHERE id = $1 AND user_id = auth.uid();
```

**Uwagi:**

- RLS automatycznie dodaje warunek `user_id = auth.uid()` do wszystkich zapytań
- Indeks `investments_user_id_idx` zapewnia wydajne wyszukiwanie
- Klucz podstawowy `investments_pkey` na `id` zapewnia szybkie dopasowanie
- Operacja DELETE jest atomowa - jeśli rekord nie istnieje, zwraca 0 affected rows

### 5.3. Logika serwisu

Logika powinna być wyodrębniona do serwisu w `src/lib/services/investment.service.ts`:

```typescript
// Przykładowa struktura funkcji serwisu
export async function deleteInvestmentById(
  supabase: SupabaseClient<Database>,
  userId: string,
  investmentId: string
): Promise<{ success: boolean; error?: string }> {
  // 1. Weryfikacja istnienia (opcjonalna - RLS i tak to zrobi)
  // 2. Usunięcie rekordu
  // 3. Zwrócenie wyniku
}
```

## 6. Względy bezpieczeństwa

### 6.1. Autoryzacja

- **Wymagana autoryzacja:** Tak - endpoint wymaga aktywnej sesji użytkownika
- **Mechanizm:** Supabase JWT token w headerze `Authorization: Bearer <token>`
- **Weryfikacja:** Middleware lub endpoint handler weryfikuje token przed przetworzeniem żądania

### 6.2. Autoryzacja na poziomie danych (RLS)

- **Row Level Security:** Włączone na tabeli `investments`
- **Polityka DELETE:** `user_id = auth.uid()` - użytkownik może usuwać tylko swoje rekordy
- **Ochrona:** Nawet jeśli UUID zostanie odgadnięty, RLS blokuje dostęp do cudzych danych

### 6.3. Walidacja danych wejściowych

- **Format UUID:** Walidacja formatu UUID przed wykonaniem zapytania do bazy
- **Zapobieganie SQL Injection:** Użycie Supabase client z parametryzowanymi zapytaniami
- **Rate Limiting:** Rozważyć implementację rate limitingu na poziomie middleware (opcjonalne dla MVP)

### 6.4. Identyfikacja użytkownika

- **Źródło user_id:** Z tokenu JWT (`auth.uid()`), NIE z parametrów żądania
- **Weryfikacja:** Supabase automatycznie weryfikuje token i ustawia kontekst użytkownika

### 6.5. Potencjalne zagrożenia i środki zaradcze

| Zagrożenie                  | Ryzyko  | Środek zaradczy                                               |
| --------------------------- | ------- | ------------------------------------------------------------- |
| Nieautoryzowany dostęp      | Wysokie | Wymagana autoryzacja JWT + RLS                                |
| Usunięcie cudzej inwestycji | Średnie | RLS blokuje dostęp do rekordów innych użytkowników            |
| SQL Injection               | Niskie  | Supabase client używa parametryzowanych zapytań               |
| UUID enumeration            | Niskie  | RLS zwraca 404 dla nieistniejących lub niedostępnych rekordów |
| Rate limiting               | Średnie | Rozważyć implementację w middleware (opcjonalne dla MVP)      |

## 7. Obsługa błędów

### 7.1. Scenariusze błędów i kody statusu

| Scenariusz                              | Kod statusu | Komunikat błędu                         | Logowanie     |
| --------------------------------------- | ----------- | --------------------------------------- | ------------- |
| Brak tokenu autoryzacyjnego             | `401`       | "Authentication required"               | Tak (warning) |
| Nieprawidłowy/wygasły token             | `401`       | "Invalid or expired token"              | Tak (warning) |
| Nieprawidłowy format UUID               | `404`       | "Investment not found or access denied" | Nie           |
| Inwestycja nie istnieje                 | `404`       | "Investment not found or access denied" | Nie           |
| Inwestycja należy do innego użytkownika | `404`       | "Investment not found or access denied" | Nie (RLS)     |
| Błąd połączenia z bazą                  | `500`       | "An unexpected error occurred"          | Tak (error)   |
| Nieoczekiwany błąd serwera              | `500`       | "An unexpected error occurred"          | Tak (error)   |

### 7.2. Strategia obsługi błędów

**Zasady:**

1. **Early returns:** Wszystkie błędy obsługiwane na początku funkcji (guard clauses)
2. **Spójne komunikaty:** Użycie typu `ApiError` z `types.ts` dla spójności
3. **Bezpieczeństwo:** Nie ujawniaj szczegółów błędów wewnętrznych (np. stack trace) w odpowiedziach
4. **Logowanie:** Loguj szczegóły błędów po stronie serwera dla debugowania

**Przykładowa struktura obsługi:**

```typescript
// 1. Walidacja autoryzacji (early return)
if (!user) {
  return new Response(JSON.stringify({ error: { code: "unauthorized", message: "..." } }), {
    status: 401,
  });
}

// 2. Walidacja parametrów (early return)
const validationResult = deleteInvestmentParamsSchema.safeParse({ id: params.id });
if (!validationResult.success) {
  return new Response(JSON.stringify({ error: { code: "not_found", message: "..." } }), {
    status: 404,
  });
}

// 3. Weryfikacja istnienia (early return)
// 4. Usunięcie (happy path)
```

### 7.3. Logowanie błędów

**Poziomy logowania:**

- **Warning:** Błędy autoryzacji (401) - podejrzana aktywność
- **Error:** Błędy serwera (500) - wymagają interwencji
- **Info:** Sukces (204) - opcjonalne, dla audytu

**Informacje do logowania:**

- Timestamp
- User ID (jeśli dostępny)
- Request ID (jeśli przekazany w headerze)
- Endpoint i metoda HTTP
- Szczegóły błędu (tylko po stronie serwera, nie w odpowiedzi)

## 8. Rozważania dotyczące wydajności

### 8.1. Optymalizacje zapytań

**Indeksy wykorzystywane:**

- `investments_pkey` (PRIMARY KEY na `id`) - szybkie dopasowanie po ID
- `investments_user_id_idx` (B-tree na `user_id`) - wykorzystywany przez RLS

**Wydajność:**

- Operacja DELETE jest wydajna dzięki indeksom
- RLS dodaje minimalny overhead (warunek `user_id = auth.uid()`)
- Brak potrzeby JOIN-ów - proste zapytanie DELETE

### 8.2. Potencjalne wąskie gardła

| Wąskie gardło            | Ryzyko  | Rozwiązanie                                    |
| ------------------------ | ------- | ---------------------------------------------- |
| Brak indeksu na `id`     | Niskie  | Indeks PRIMARY KEY już istnieje                |
| RLS overhead             | Niskie  | Indeks na `user_id` minimalizuje overhead      |
| Weryfikacja przed DELETE | Średnie | Opcjonalna - RLS i tak zapewnia bezpieczeństwo |
| Rate limiting            | Średnie | Rozważyć implementację w middleware            |

### 8.3. Strategie optymalizacji

1. **Opcjonalna weryfikacja przed DELETE:**
   - Można pominąć SELECT przed DELETE - RLS i tak zapewnia bezpieczeństwo
   - DELETE zwróci 0 affected rows jeśli rekord nie istnieje lub nie należy do użytkownika
   - Podejście: Sprawdzić `affected_rows` po DELETE i zwrócić odpowiedni status

2. **Caching:**
   - Brak potrzeby cache'owania dla operacji DELETE (nie idempotentne w kontekście cache)

3. **Connection pooling:**
   - Supabase automatycznie zarządza pulą połączeń
   - Brak potrzeby dodatkowej konfiguracji

## 9. Etapy wdrożenia

### Krok 1: Utworzenie struktury plików

- [ ] Utworzenie katalogu `src/pages/api/v1/investments/` jeśli nie istnieje
- [ ] Utworzenie pliku `src/pages/api/v1/investments/[id].ts` dla endpointu DELETE
- [ ] Sprawdzenie istnienia serwisu `src/lib/services/investment.service.ts`

### Krok 2: Implementacja walidacji

- [ ] Utworzenie Zod schema dla walidacji parametru `id` (UUID)
- [ ] Implementacja walidacji w handlerze endpointu
- [ ] Testy jednostkowe dla walidacji (opcjonalne)

### Krok 3: Implementacja logiki autoryzacji

- [ ] Sprawdzenie obecności tokenu JWT w headerze
- [ ] Weryfikacja sesji użytkownika przez Supabase Auth
- [ ] Zwracanie `401 Unauthorized` przy braku autoryzacji
- [ ] Testy autoryzacji (opcjonalne)

### Krok 4: Implementacja serwisu (jeśli nie istnieje)

- [ ] Utworzenie funkcji `deleteInvestmentById` w `src/lib/services/investment.service.ts`
- [ ] Implementacja logiki DELETE z użyciem Supabase client
- [ ] Obsługa błędów w serwisie
- [ ] Zwracanie informacji o sukcesie/błędzie

### Krok 5: Implementacja handlera endpointu

- [ ] Implementacja funkcji `DELETE` w pliku `[id].ts`
- [ ] Integracja z serwisem `deleteInvestmentById`
- [ ] Obsługa wszystkich scenariuszy błędów (401, 404, 500)
- [ ] Zwracanie odpowiednich kodów statusu i komunikatów błędów

### Krok 6: Konfiguracja Astro

- [ ] Upewnienie się, że `export const prerender = false` jest ustawione
- [ ] Sprawdzenie, że middleware dodaje Supabase client do `context.locals`
- [ ] Weryfikacja dostępności typów z `database.types.ts`

### Krok 7: Testy

- [ ] Test jednostkowy: Sukces - usunięcie własnej inwestycji (204)
- [ ] Test jednostkowy: Błąd - nieprawidłowy format UUID (404)
- [ ] Test jednostkowy: Błąd - inwestycja nie istnieje (404)
- [ ] Test jednostkowy: Błąd - próba usunięcia cudzej inwestycji (404)
- [ ] Test jednostkowy: Błąd - brak autoryzacji (401)
- [ ] Test jednostkowy: Błąd - nieprawidłowy token (401)
- [ ] Test integracyjny: End-to-end z prawdziwą bazą danych (opcjonalne)
- [ ] Test Playwright: Scenariusz usunięcia inwestycji z UI (opcjonalne)

### Krok 8: Dokumentacja i code review

- [ ] Dodanie komentarzy JSDoc do funkcji serwisu
- [ ] Sprawdzenie zgodności z regułami lintera
- [ ] Code review zgodności z zasadami implementacji
- [ ] Aktualizacja dokumentacji API (jeśli istnieje)

### Krok 9: Weryfikacja bezpieczeństwa

- [ ] Test penetracyjny: Próba usunięcia cudzej inwestycji (powinno zwrócić 404)
- [ ] Test: Próba użycia nieprawidłowego UUID (powinno zwrócić 404)
- [ ] Test: Próba użycia nieprawidłowego tokenu (powinno zwrócić 401)
- [ ] Weryfikacja, że RLS działa poprawnie

### Krok 10: Deployment

- [ ] Commit zmian do repozytorium
- [ ] Weryfikacja działania w środowisku lokalnym
- [ ] Deployment do środowiska testowego (jeśli dostępne)
- [ ] Weryfikacja działania w środowisku testowym
- [ ] Deployment do produkcji (jeśli wszystko działa poprawnie)

## 10. Przykładowa implementacja

### 10.1. Endpoint Handler (`src/pages/api/v1/investments/[id].ts`)

```typescript
import type { APIRoute } from "astro";
import { z } from "zod";
import type { SupabaseClient } from "../db/supabase.client";
import type { Database } from "../db/database.types";
import { deleteInvestmentById } from "../../../lib/services/investment.service";
import type { ApiError } from "../../../types";

export const prerender = false;

const deleteInvestmentParamsSchema = z.object({
  id: z.string().uuid("Invalid investment ID format"),
});

export const DELETE: APIRoute = async ({ params, locals, request }) => {
  // 1. Autoryzacja
  const supabase: SupabaseClient<Database> = locals.supabase;
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    const errorResponse: ApiError = {
      error: {
        code: "unauthorized",
        message: "Authentication required",
      },
    };
    return new Response(JSON.stringify(errorResponse), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  // 2. Walidacja parametrów
  const validationResult = deleteInvestmentParamsSchema.safeParse({ id: params.id });
  if (!validationResult.success) {
    const errorResponse: ApiError = {
      error: {
        code: "not_found",
        message: "Investment not found or access denied",
      },
    };
    return new Response(JSON.stringify(errorResponse), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { id } = validationResult.data;

  // 3. Usunięcie inwestycji
  try {
    const result = await deleteInvestmentById(supabase, user.id, id);

    if (!result.success) {
      const errorResponse: ApiError = {
        error: {
          code: "not_found",
          message: result.error || "Investment not found or access denied",
        },
      };
      return new Response(JSON.stringify(errorResponse), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }

    // 4. Sukces - 204 No Content
    return new Response(null, {
      status: 204,
    });
  } catch (error) {
    // 5. Błąd serwera
    console.error("Error deleting investment:", error);
    const errorResponse: ApiError = {
      error: {
        code: "internal",
        message: "An unexpected error occurred",
      },
    };
    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
```

### 10.2. Service Function (`src/lib/services/investment.service.ts`)

```typescript
import type { SupabaseClient } from "../../db/supabase.client";
import type { Database } from "../../db/database.types";

export async function deleteInvestmentById(
  supabase: SupabaseClient<Database>,
  userId: string,
  investmentId: string
): Promise<{ success: boolean; error?: string }> {
  const { error, count } = await supabase.from("investments").delete({ count: "exact" }).eq("id", investmentId);
  // RLS automatycznie filtruje po user_id = auth.uid()

  if (error) {
    console.error("Database error deleting investment:", error);
    return { success: false, error: "Database error" };
  }

  if (count === 0) {
    return { success: false, error: "Investment not found or access denied" };
  }

  return { success: true };
}
```

## 11. Uwagi dodatkowe

### 11.1. Zgodność z PRD

- ✅ Hard delete (brak soft delete) - zgodnie z PRD
- ✅ Potwierdzenie w UI (modal) - zgodnie z PRD, endpoint nie wymaga potwierdzenia
- ✅ Autoryzacja przez Supabase magic link - zgodnie z PRD

### 11.2. Zgodność z zasadami implementacji

- ✅ Użycie Astro Server Endpoints
- ✅ Handler DELETE w formacie uppercase
- ✅ `export const prerender = false` dla API route
- ✅ Walidacja za pomocą Zod
- ✅ Logika wyodrębniona do serwisu w `src/lib/services`
- ✅ Użycie `supabase` z `context.locals` zamiast bezpośredniego importu
- ✅ Early returns dla obsługi błędów
- ✅ Guard clauses na początku funkcji

### 11.3. Zgodność z API Plan

- ✅ Endpoint: `DELETE /v1/investments/{id}`
- ✅ Opis: Hard delete (as per PRD)
- ✅ Odpowiedzi: `204 no_content` lub `404 not_found`
- ✅ Dodatkowo: `401 unauthorized` dla braku autoryzacji, `500 internal` dla błędów serwera

### 11.4. Zgodność z DB Plan

- ✅ Tabela: `investments`
- ✅ RLS: Włączone, polityka DELETE `user_id = auth.uid()`
- ✅ Hard delete: Brak soft delete, zgodnie z DB plan
- ✅ Indeksy: Wykorzystanie `investments_pkey` i `investments_user_id_idx`

