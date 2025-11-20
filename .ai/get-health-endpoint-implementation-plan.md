# API Endpoint Implementation Plan: GET `/v1/health`

## 1. Przegląd punktu końcowego

Endpoint `/v1/health` służy jako liveness probe i minimalna diagnostyka systemu. Jest to publiczny endpoint (bez wymaganej autoryzacji), który pozwala na szybkie sprawdzenie stanu aplikacji i dostępności bazy danych. Endpoint jest używany przez systemy monitoringu, load balancery i narzędzia orchestracji (np. Kubernetes) do weryfikacji, czy aplikacja działa poprawnie.

**Kluczowe cechy:**

- Publiczny endpoint (brak wymaganej autoryzacji)
- Minimalne obciążenie systemu
- Szybka odpowiedź (< 100ms w normalnych warunkach)
- Sprawdza dostępność bazy danych Supabase
- Zwraca aktualny czas serwera w formacie RFC 3339

## 2. Szczegóły żądania

- **Metoda HTTP:** `GET`
- **Struktura URL:** `/v1/health`
- **Parametry:** Brak parametrów
- **Request Body:** Brak
- **Nagłówki wymagane:** Brak
- **Nagłówki opcjonalne:**
  - `Accept: application/json` (domyślnie)
  - `X-Request-Id` (dla korelacji logów, opcjonalne)

## 3. Wykorzystywane typy

### 3.1. DTO odpowiedzi

Endpoint wykorzystuje typ `HealthDto` zdefiniowany w `src/types.ts`:

```typescript
export interface HealthDto {
  status: "ok";
  time: TimestampString; // RFC 3339 timestamp
  db: "reachable" | "degraded" | "down";
}
```

**Pola:**

- `status`: Zawsze `"ok"` gdy endpoint odpowiada (200)
- `time`: Aktualny czas serwera w formacie RFC 3339 (np. `"2025-11-10T10:00:00Z"`)
- `db`: Status połączenia z bazą danych:
  - `"reachable"`: Baza danych odpowiada normalnie
  - `"degraded"`: Baza danych odpowiada, ale z opóźnieniem lub błędami
  - `"down"`: Baza danych nie odpowiada

### 3.2. Typy pomocnicze

- `TimestampString`: Alias typu `string` dla timestampów RFC 3339 (zdefiniowany w `src/types.ts`)

## 4. Szczegóły odpowiedzi

### 4.1. Sukces (200 OK)

**Status Code:** `200 OK`

**Response Body:**

```json
{
  "status": "ok",
  "time": "2025-11-10T10:00:00Z",
  "db": "reachable"
}
```

**Przykładowe scenariusze:**

1. **Baza danych dostępna:**

```json
{
  "status": "ok",
  "time": "2025-01-15T14:30:45.123Z",
  "db": "reachable"
}
```

2. **Baza danych z opóźnieniem:**

```json
{
  "status": "ok",
  "time": "2025-01-15T14:30:45.123Z",
  "db": "degraded"
}
```

3. **Baza danych niedostępna:**

```json
{
  "status": "ok",
  "time": "2025-01-15T14:30:45.123Z",
  "db": "down"
}
```

**Uwaga:** Nawet gdy baza danych jest niedostępna, endpoint zwraca `200 OK` z `db: "down"`. To pozwala systemom monitoringu odróżnić problem z bazą danych od całkowitej niedostępności aplikacji.

### 4.2. Błędy

Endpoint nie powinien zwracać błędów HTTP (4xx/5xx) w normalnych warunkach, ponieważ jest to liveness probe. Jeśli endpoint nie odpowiada, oznacza to, że aplikacja jest całkowicie niedostępna.

**Potencjalne scenariusze błędów (rzadkie):**

- **500 Internal Server Error:** Tylko w przypadku krytycznego błędu serwera (np. brak pamięci, błąd runtime)
- **503 Service Unavailable:** Jeśli aplikacja jest celowo wyłączona do konserwacji

## 5. Przepływ danych

### 5.1. Diagram przepływu

```
Client Request
    ↓
Astro Middleware (context.locals.supabase)
    ↓
GET /v1/health Handler
    ↓
Health Service (checkDatabaseConnectivity)
    ↓
Supabase Client (SELECT 1)
    ↓
Response Assembly (HealthDto)
    ↓
JSON Response (200 OK)
```

### 5.2. Szczegółowy przepływ

1. **Otrzymanie żądania:**
   - Astro middleware dodaje `supabase` client do `context.locals`
   - Handler endpointu odbiera żądanie GET

2. **Sprawdzenie bazy danych:**
   - Wywołanie serwisu `checkDatabaseConnectivity()`
   - Wykonanie prostego zapytania `SELECT 1` do bazy danych
   - Pomiar czasu odpowiedzi
   - Określenie statusu: `reachable`, `degraded`, lub `down`

3. **Przygotowanie odpowiedzi:**
   - Pobranie aktualnego czasu serwera
   - Formatowanie czasu do RFC 3339
   - Utworzenie obiektu `HealthDto`
   - Serializacja do JSON

4. **Zwrócenie odpowiedzi:**
   - Ustawienie nagłówka `Content-Type: application/json`
   - Zwrócenie statusu `200 OK`
   - Wysłanie JSON response body

### 5.3. Interakcje z zewnętrznymi usługami

**Supabase Database:**

- Wykonanie prostego zapytania `SELECT 1` do sprawdzenia połączenia
- Timeout: 2 sekundy (konfigurowalny)
- Retry: Brak (health check powinien być szybki)
- Użycie klienta Supabase z `context.locals.supabase`

## 6. Względy bezpieczeństwa

### 6.1. Autoryzacja

**Brak wymaganej autoryzacji:**

- Endpoint jest publiczny i dostępny bez tokenu autoryzacyjnego
- To jest standardowa praktyka dla health check endpoints
- Endpoint nie zwraca żadnych wrażliwych danych

### 6.2. Walidacja danych

**Brak danych wejściowych do walidacji:**

- Endpoint nie przyjmuje parametrów ani body
- Brak potrzeby walidacji

### 6.3. Ochrona przed nadużyciami

**Rate limiting (opcjonalne):**

- Health check endpoints są często wywoływane przez systemy monitoringu
- Rozważ implementację rate limitingu, jeśli endpoint jest nadużywany
- Zalecany limit: 100 żądań/minutę na IP (konfigurowalny)

**Minimalne obciążenie:**

- Endpoint wykonuje tylko proste zapytanie `SELECT 1`
- Nie wykonuje żadnych ciężkich operacji
- Nie loguje szczegółowych informacji (tylko błędy)

### 6.4. Bezpieczeństwo informacji

**Brak wrażliwych danych:**

- Endpoint nie zwraca żadnych informacji o strukturze bazy danych
- Nie zwraca informacji o użytkownikach
- Nie zwraca szczegółów konfiguracji

## 7. Obsługa błędów

### 7.1. Scenariusze błędów

#### 7.1.1. Baza danych niedostępna (`db: "down"`)

**Przyczyna:**

- Brak połączenia z bazą danych
- Timeout połączenia (> 2 sekundy)
- Błąd sieci

**Obsługa:**

- Zwrócenie `200 OK` z `db: "down"`
- Logowanie błędu do systemu logowania (bez szczegółów)
- Nie rzucanie wyjątku (endpoint powinien zawsze odpowiadać)

**Przykładowa odpowiedź:**

```json
{
  "status": "ok",
  "time": "2025-01-15T14:30:45.123Z",
  "db": "down"
}
```

#### 7.1.2. Baza danych z opóźnieniem (`db: "degraded"`)

**Przyczyna:**

- Odpowiedź z bazy danych trwa > 500ms ale < 2s
- Częściowe problemy z wydajnością

**Obsługa:**

- Zwrócenie `200 OK` z `db: "degraded"`
- Logowanie ostrzeżenia (opcjonalne)
- Monitorowanie trendów (opcjonalne)

**Przykładowa odpowiedź:**

```json
{
  "status": "ok",
  "time": "2025-01-15T14:30:45.123Z",
  "db": "degraded"
}
```

#### 7.1.3. Błąd serwera (500 Internal Server Error)

**Przyczyna:**

- Krytyczny błąd runtime (np. brak pamięci)
- Błąd w kodzie endpointu

**Obsługa:**

- Zwrócenie `500 Internal Server Error`
- Logowanie szczegółów błędu (tylko w środowisku deweloperskim)
- Zwrócenie ogólnego komunikatu błędu (w produkcji)

**Przykładowa odpowiedź:**

```json
{
  "error": {
    "code": "internal",
    "message": "Internal server error"
  }
}
```

### 7.2. Logowanie błędów

**Poziomy logowania:**

- **Error:** Baza danych całkowicie niedostępna
- **Warn:** Baza danych z opóźnieniem (degraded)
- **Info:** Normalne działanie (opcjonalne, tylko w trybie debug)

**Informacje do logowania:**

- Timestamp
- Status bazy danych
- Czas odpowiedzi (ms)
- Request ID (jeśli dostępny)

**Nie logować:**

- Szczegółów konfiguracji
- Stack trace (w produkcji)
- Wrażliwych danych

## 8. Rozważania dotyczące wydajności

### 8.1. Optymalizacje

**Minimalne zapytanie do bazy:**

- Użycie `SELECT 1` zamiast bardziej złożonych zapytań
- Brak JOIN-ów, agregacji, ani skanowania tabel
- Zapytanie wykorzystuje połączenie z puli (connection pooling)

**Brak cache'owania:**

- Health check powinien zawsze sprawdzać aktualny stan
- Cache mógłby ukryć problemy z bazą danych

**Szybka odpowiedź:**

- Cel: < 100ms w normalnych warunkach
- Timeout bazy danych: 2 sekundy
- Brak retry (health check powinien być szybki)

### 8.2. Potencjalne wąskie gardła

**Połączenie z bazą danych:**

- Jeśli pula połączeń jest wyczerpana, health check może się opóźnić
- Rozwiązanie: Użycie dedykowanego połączenia dla health check (opcjonalne)

**Obciążenie sieci:**

- Wysoka częstotliwość wywołań health check może obciążyć sieć
- Rozwiązanie: Rate limiting (opcjonalne)

### 8.3. Monitoring

**Metryki do monitorowania:**

- Czas odpowiedzi endpointu (p50, p95, p99)
- Częstotliwość statusów `degraded` i `down`
- Czas odpowiedzi bazy danych
- Liczba żądań na sekundę

**Alerty:**

- Alert gdy `db: "down"` przez > 30 sekund
- Alert gdy czas odpowiedzi > 1 sekunda
- Alert gdy częstotliwość błędów > 10%

## 9. Etapy wdrożenia

### 9.1. Krok 1: Utworzenie serwisu health check

**Plik:** `src/lib/services/health.service.ts`

**Zadania:**

- Utworzenie funkcji `checkDatabaseConnectivity()`
- Implementacja logiki sprawdzania połączenia z bazą danych
- Określenie statusu na podstawie czasu odpowiedzi
- Obsługa błędów i timeoutów

**Szczegóły implementacji:**

- Użycie `context.locals.supabase` do wykonania zapytania `SELECT 1`
- Pomiar czasu odpowiedzi
- Klasyfikacja statusu:
  - `reachable`: < 500ms
  - `degraded`: 500ms - 2000ms
  - `down`: > 2000ms lub błąd

### 9.2. Krok 2: Utworzenie endpointu API

**Plik:** `src/pages/api/v1/health.ts`

**Zadania:**

- Utworzenie handlera GET dla `/v1/health`
- Wywołanie serwisu health check
- Przygotowanie odpowiedzi `HealthDto`
- Obsługa błędów

**Szczegóły implementacji:**

- Użycie `export const prerender = false`
- Użycie `export async function GET(context)`
- Pobranie `supabase` z `context.locals`
- Formatowanie czasu do RFC 3339
- Zwrócenie JSON response z statusem 200

### 9.3. Krok 3: Implementacja formatowania czasu

**Zadania:**

- Utworzenie funkcji pomocniczej do formatowania czasu do RFC 3339
- Upewnienie się, że czas jest w UTC
- Obsługa milisekund (opcjonalne)

**Szczegóły implementacji:**

- Użycie `new Date().toISOString()` dla formatu RFC 3339
- Alternatywnie: użycie biblioteki `date-fns` lub `luxon` (jeśli już używana)

### 9.4. Krok 4: Implementacja obsługi błędów

**Zadania:**

- Obsługa błędów połączenia z bazą danych
- Obsługa timeoutów
- Logowanie błędów (bez szczegółów w produkcji)

**Szczegóły implementacji:**

- Try-catch wokół zapytania do bazy danych
- Ustawienie timeoutu na 2 sekundy
- Zwrócenie `db: "down"` w przypadku błędu
- Logowanie tylko w środowisku deweloperskim

### 9.5. Krok 5: Testy jednostkowe (opcjonalne)

**Plik:** `src/lib/services/__tests__/health.service.test.ts`

**Zadania:**

- Test sprawdzania połączenia z bazą danych (reachable)
- Test opóźnionej odpowiedzi (degraded)
- Test braku połączenia (down)
- Test formatowania czasu

**Szczegóły implementacji:**

- Mock Supabase client
- Symulacja różnych scenariuszy odpowiedzi
- Weryfikacja poprawności statusów

### 9.6. Krok 6: Testy integracyjne (opcjonalne)

**Plik:** `tests/api/health.test.ts` (Playwright)

**Zadania:**

- Test GET `/v1/health` z dostępną bazą danych
- Test struktury odpowiedzi JSON
- Test statusu 200 OK
- Weryfikacja formatu czasu RFC 3339

**Szczegóły implementacji:**

- Użycie Playwright do testów E2E
- Weryfikacja odpowiedzi JSON
- Sprawdzenie nagłówków odpowiedzi

### 9.7. Krok 7: Dokumentacja (opcjonalne)

**Zadania:**

- Aktualizacja dokumentacji API (jeśli istnieje)
- Dodanie przykładów użycia
- Dokumentacja kodów statusu

### 9.8. Krok 8: Weryfikacja i wdrożenie

**Zadania:**

- Testowanie endpointu w środowisku deweloperskim
- Weryfikacja działania z dostępną bazą danych
- Weryfikacja działania z niedostępną bazą danych (symulacja)
- Weryfikacja czasu odpowiedzi
- Wdrożenie do środowiska produkcyjnego

## 10. Przykładowa implementacja

### 10.1. Serwis health check

```typescript
// src/lib/services/health.service.ts
import type { SupabaseClient } from "../db/supabase.client";

export type DatabaseStatus = "reachable" | "degraded" | "down";

const DB_TIMEOUT_MS = 2000;
const DB_DEGRADED_THRESHOLD_MS = 500;

export async function checkDatabaseConnectivity(supabase: SupabaseClient): Promise<DatabaseStatus> {
  const startTime = Date.now();

  try {
    // Use a simple RPC call or query that doesn't require authentication
    // Option 1: Use RPC function (requires creating a simple SQL function)
    // Option 2: Use a simple query with proper error handling
    // For MVP, we'll use a simple SELECT query with timeout

    const timeoutPromise = new Promise<{ error: Error }>((_, reject) =>
      setTimeout(() => reject(new Error("Database timeout")), DB_TIMEOUT_MS)
    );

    const queryPromise = supabase.rpc("health_check").then(({ error }) => ({ error }));

    const { error } = (await Promise.race([queryPromise, timeoutPromise])) as { error: any };

    const responseTime = Date.now() - startTime;

    if (error) {
      // If RPC doesn't exist, fallback to simple query
      // This is a fallback for MVP - in production, create the RPC function
      const fallbackResult = await supabase.from("profiles").select("id").limit(1).maybeSingle();

      if (fallbackResult.error) {
        return "down";
      }
    }

    if (responseTime > DB_DEGRADED_THRESHOLD_MS) {
      return "degraded";
    }

    return "reachable";
  } catch (error) {
    return "down";
  }
}
```

**Alternatywna implementacja (bez RPC):**

Jeśli nie chcemy tworzyć funkcji RPC, możemy użyć prostszego podejścia:

```typescript
// src/lib/services/health.service.ts
import type { SupabaseClient } from "../db/supabase.client";

export type DatabaseStatus = "reachable" | "degraded" | "down";

const DB_TIMEOUT_MS = 2000;
const DB_DEGRADED_THRESHOLD_MS = 500;

export async function checkDatabaseConnectivity(supabase: SupabaseClient): Promise<DatabaseStatus> {
  const startTime = Date.now();

  try {
    // Simple query to check database connectivity
    // Using maybeSingle() to avoid errors when no rows exist
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Database timeout")), DB_TIMEOUT_MS)
    );

    const queryPromise = supabase.from("profiles").select("id").limit(1).maybeSingle();

    const result = await Promise.race([queryPromise, timeoutPromise]);
    const responseTime = Date.now() - startTime;

    if (result.error) {
      return "down";
    }

    if (responseTime > DB_DEGRADED_THRESHOLD_MS) {
      return "degraded";
    }

    return "reachable";
  } catch (error) {
    return "down";
  }
}
```

**Uwaga:** Powyższe podejście może wymagać autoryzacji ze względu na RLS. Dla publicznego health check endpointu, rozważ:

1. Utworzenie prostej funkcji RPC bez RLS: `CREATE OR REPLACE FUNCTION health_check() RETURNS integer AS $$ SELECT 1; $$ LANGUAGE sql SECURITY DEFINER;`
2. Użycie service role client dla health check (tylko w tym endpoincie)

### 10.2. Endpoint API

```typescript
// src/pages/api/v1/health.ts
import type { APIRoute } from "astro";
import type { HealthDto } from "../../../types";
import { checkDatabaseConnectivity } from "../../../lib/services/health.service";

export const prerender = false;

export const GET: APIRoute = async (context) => {
  const supabase = context.locals.supabase;

  const dbStatus = await checkDatabaseConnectivity(supabase);
  const currentTime = new Date().toISOString();

  const response: HealthDto = {
    status: "ok",
    time: currentTime,
    db: dbStatus,
  };

  return new Response(JSON.stringify(response), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
    },
  });
};
```

## 11. Uwagi końcowe

### 11.1. Najlepsze praktyki

- **Zawsze zwracaj 200 OK:** Health check powinien zawsze odpowiadać, nawet gdy baza danych jest niedostępna
- **Szybka odpowiedź:** Cel < 100ms, maksymalnie 2 sekundy
- **Minimalne obciążenie:** Użyj prostego zapytania `SELECT 1` lub podobnego
- **Brak cache'owania:** Zawsze sprawdzaj aktualny stan
- **Logowanie:** Loguj tylko błędy, nie każdy request

### 11.2. Rozszerzenia w przyszłości

- **Dodatkowe sprawdzenia:** Redis, cache, zewnętrzne API
- **Metryki:** Zwracanie dodatkowych metryk w trybie debug
- **Wersjonowanie:** Informacja o wersji aplikacji
- **Zależności:** Status wszystkich zależności systemu

### 11.3. Zgodność z API plan

Plan jest zgodny z:

- Specyfikacją API w `.ai/api-plan.md` (linie 236-242)
- Typami DTO w `src/types.ts` (`HealthDto`)
- Regułami implementacji w `.cursor/rules/`
- Stackiem technologicznym (Astro 5, TypeScript 5, Supabase)
