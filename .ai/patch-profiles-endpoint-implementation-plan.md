# API Endpoint Implementation Plan: PATCH `/v1/me/profile`

## 1. Przegląd punktu końcowego

Endpoint `PATCH /v1/me/profile` umożliwia częściową aktualizację danych profilu aktualnie zalogowanego użytkownika. Korzysta z Supabase Auth (Bearer JWT) oraz polityk RLS (`user_id = auth.uid()`), aby zagwarantować, że każda aktualizacja dotyczy wyłącznie rekordu właściciela. Typowe scenariusze użycia obejmują zmianę wydatków, stóp procentowych lub daty urodzenia potrzebnych do obliczeń FIRE.

## 2. Szczegóły żądania

- **Metoda HTTP:** `PATCH`
- **Struktura URL:** `/v1/me/profile`
- **Headers:**
  - Wymagane: `Authorization: Bearer <JWT>` (Supabase session)
  - Opcjonalne: `Accept-Language`, `X-Request-Id`, `Idempotency-Key`
- **Request Body (JSON):**
  - Dozwolone pola (`number`/`string`):
    - `monthly_expense`
    - `withdrawal_rate_pct`
    - `expected_return_pct`
    - `birth_date` (ISO YYYY-MM-DD)
  - Zasady:
    - Body musi zawierać co najmniej jedno z powyższych pól.
    - Pola spoza listy są odrzucane (400).
- **Walidacja (Zod → `UpdateProfileCommand`):**
  - `monthly_expense`: liczba ≥ 0, max 9 999 999 999 999.99 (zgodnie z `numeric(16,2)`).
  - `withdrawal_rate_pct`: liczba w zakresie 0–100 (<= 2 miejsca po przecinku).
  - `expected_return_pct`: liczba w zakresie -100–1000.
  - `birth_date`: data < `today`, ≥ `today - 120 lat`.
  - `refine` wymuszające obecność co najmniej jednego pola.
  - Konwersja wartości `number` zachowuje 2 miejsca po przecinku (użycie helpera formatowania lub `toFixed` podczas zapisu).
- **Powiązane typy:**
  - `UpdateProfileCommand` (Partial `CreateProfileCommand`) z `src/types.ts`.
  - `ProfileDto` dla odpowiedzi.
  - Lokalna definicja `UpdateProfileSchema` (Zod) mapująca do `UpdateProfileCommand`.

## 3. Szczegóły odpowiedzi

- **Sukces:** `200 OK`
  - Body: `ProfileDto` (pełny zaktualizowany rekord).
- **Błędy walidacji:** `400 Bad Request`
  - Body: `ApiError` z `error.code = "bad_request"` oraz `fields` dla szczegółów.
- **Brak autoryzacji:** `401 Unauthorized`
  - Body: `ApiError` (`error.code = "unauthorized"`).
- **Brak profilu:** `404 Not Found`
  - Body: `ApiError` (`error.code = "not_found"`).
- **Awaria serwera / Supabase:** `500 Internal Server Error`
  - Body: `ApiError` (`error.code = "internal"`).

## 4. Przepływ danych

1. **API Route (Astro server endpoint)** w `src/pages/api/v1/me/profile.ts`:
   - Odczytuje `supabase` z `Astro.locals`.
   - Autoryzuje żądanie przez `context.locals.session` (lub `supabase.auth.getUser()`).
   - Parsuje i waliduje body przy użyciu schematu Zod → `UpdateProfileCommand`.
2. **Serwis profilu** (`src/lib/services/profile.service.ts`):
   - `updateProfile(supabase, userId, command)`:
     1. Próbuje pobrać istniejący rekord `profiles` (SELECT limit 1).
     2. Jeśli brak rekordu → zwraca błąd domenowy `ProfileNotFoundError`.
     3. Buduje `DbProfileUpdate` z przekazanych pól (whitelist + `updated_at = now()`).
     4. Wykonuje `supabase.from("profiles").update(updatePayload).eq("user_id", userId).select().single()`.
     5. Mapuje wynik na `ProfileDto`.
3. **Handler**:
   - Obsługuje wynik serwisu: sukces → `200` + DTO; brak profilu → `404`; inne błędy → mapowanie na `400/500`.
   - Dodaje nagłówki (`Content-Type`, ewentualny `X-Request-Id` echo).

## 5. Względy bezpieczeństwa

- Wymuszaj autoryzację Supabase (`context.locals.session`, brak sesji → 401).
- Polegaj na RLS tabeli `profiles` (`user_id = auth.uid()`), nie przekazuj `user_id` w commandach.
- Whitelist aktualizowanych pól, odrzucaj niespodziewane klucze.
- Sanitacja danych: walidacja formatów liczb i dat, trimming stringów jeśli potrzebne.
- Opcjonalnie loguj `X-Request-Id`/`Accept-Language` do kontekstu diagnostycznego (bez danych wrażliwych).
- Zabezpiecz endpoint przed brute-force (opcjonalnie limit rate w middleware).

## 6. Obsługa błędów

- **Walidacja:** zwracaj `400` z `fields` wskazującymi konkretne naruszenia.
- **Brak profilu:** zmapuj `ProfileNotFoundError` na `404`.
- **Błędy Supabase:** sprawdzaj `error.code`; `PGRST116` (violated RLS) traktuj jako `404`, inne → `500`.
- **Logowanie błędów:** użyj centralnego loggera (np. `console.error` lub integracja Sentry jeśli dostępna). Brak dedykowanej tabeli logów w DB planie – odnotuj w kodzie komentarz TODO jeśli w przyszłości pojawi się `error_logs`.
- **Nieoczekiwane wyjątki:** opakuj w `try/catch` i zwróć `500` z generycznym komunikatem, zachowując szczegóły tylko w logach.

## 7. Wydajność

- Operacja dotyczy pojedynczego rekordu (SELECT + UPDATE). Indeks `profiles_user_id_idx` zapewnia O(1) dostęp.
- Zminimalizuj liczbę roundtripów: połącz UPDATE z `select().single()` dla zwrócenia wyniku w jednym zapytaniu.
- Walidację przeprowadź przed zapytaniem, by uniknąć zbędnych roundtripów.
- Cache niepotrzebny (dane użytkownika dynamiczne). Można ewentualnie wykorzystać etag w przyszłości (poza zakresem).

## 8. Kroki implementacji

1. **Przygotowanie plików:**
   - Utwórz folder `src/lib/services` (jeśli nie istnieje) i plik `profile.service.ts`.
   - Dodaj/uzupełnij endpoint `src/pages/api/v1/me/profile.ts` (handler PATCH).
2. **Zdefiniuj walidację:**
   - Utwórz `UpdateProfileSchema` (Zod) z zasadami jak w sekcji 2.
   - Dodaj helper konwertujący wynik do `UpdateProfileCommand`.
3. **Zaimplementuj serwis:**
   - Funkcja `buildProfileUpdatePayload(command)` tworząca `DbProfileUpdate`.
   - Funkcja `updateProfile` wykonująca SELECT + UPDATE, kontrola błędów Supabase.
   - Zdefiniuj i wyeksportuj niestandardowe błędy (`ProfileNotFoundError`).
4. **Zaimplementuj handler PATCH:**
   - Wczytaj sesję, waliduj autoryzację (401 gdy brak).
   - Parsuj JSON, waliduj schematem; w razie błędu zwróć `400` z `fields`.
   - Wywołaj `updateProfile` z `userId`.
   - Zwróć `200` + `ProfileDto`.
5. **Obsługa błędów i logowanie:**
   - Dodaj `try/catch`; w `catch` rozpoznaj typ błędu i mapuj na status.
   - Loguj błędy (`console.error` lub globalny logger). Dodaj TODO dotyczący integracji z tabelą logów, jeśli pojawi się w przyszłości.
6. **Testy jednostkowe/integracyjne:**
   - Przygotuj testy serwisu (mock Supabase client) obejmujące ścieżki sukcesu, 404, 400.
   - Dodać e2e/integration (np. Vitest + supertest) jeśli istnieje framework testowy, weryfikując statusy dla różnych payloadów.
7. **Weryfikacja lokalna:**
   - Uruchom lint i testy (`pnpm lint`, `pnpm test`).
   - Przetestuj endpoint manualnie przez `curl` lub API client (Supabase session token).
8. **Dokumentacja i readiness:**
   - Zaktualizuj `api-plan.md`/Changelog jeśli wymagane.
   - Przygotuj opis zmian do PR, podkreślając walidację i obsługę błędów.


