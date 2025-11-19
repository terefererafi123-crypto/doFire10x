# API Endpoint Implementation Plan: GET `/v1/me/portfolio-agg`

## 1. Przegląd punktu końcowego

Endpoint `GET /v1/me/portfolio-agg` służy do pobierania zagregowanych danych portfela inwestycyjnego użytkownika. Dane są pobierane z widoku bazy danych `v_investments_agg`, który agreguje sumy i udziały procentowe dla każdego typu aktywa (stock, etf, bond, cash). Endpoint zwraca wartości wyzerowane (0) w przypadku, gdy użytkownik nie ma żadnych inwestycji.

**Główne funkcjonalności:**
- Pobieranie zagregowanych sum inwestycji według typu aktywa
- Obliczanie udziałów procentowych każdego typu aktywa w portfelu
- Automatyczne wyzerowanie wartości dla użytkowników bez inwestycji
- Wymaga autoryzacji (tylko zalogowany użytkownik może zobaczyć swoje dane)

## 2. Szczegóły żądania

- **Metoda HTTP:** `GET`
- **Struktura URL:** `/v1/me/portfolio-agg`
- **Parametry:**
  - Brak parametrów query string
  - Brak parametrów ścieżki
- **Request Body:** Brak (GET request)
- **Nagłówki wymagane:**
  - `Authorization: Bearer <JWT_TOKEN>` - Token JWT z Supabase Auth
- **Nagłówki opcjonalne:**
  - `Accept-Language` - Lokalizacja odpowiedzi (np. "pl-PL", "en-US")
  - `X-Request-Id` - Identyfikator korelacji żądania (dla logowania)

## 3. Wykorzystywane typy

### 3.1. DTO (Data Transfer Object)

**PortfolioAggDto** - Typ odpowiedzi zdefiniowany w `src/types.ts`:

```typescript
export interface PortfolioAggDto {
  user_id: string;              // UUID użytkownika
  total_amount: number;         // Suma wszystkich inwestycji (Money)
  sum_stock: number;            // Suma inwestycji typu 'stock'
  sum_etf: number;              // Suma inwestycji typu 'etf'
  sum_bond: number;             // Suma inwestycji typu 'bond'
  sum_cash: number;             // Suma inwestycji typu 'cash'
  share_stock: number;          // Procentowy udział akcji (0-100)
  share_etf: number;            // Procentowy udział ETF (0-100)
  share_bond: number;           // Procentowy udział obligacji (0-100)
  share_cash: number;           // Procentowy udział gotówki (0-100)
}
```

### 3.2. Typy bazy danych

**DbPortfolioAggRow** - Typ z widoku `v_investments_agg` (z `src/db/database.types.ts`):

```typescript
type DbPortfolioAggRow = Tables<"v_investments_agg">
```

**Helper function** - Funkcja mapująca z `src/types.ts`:

```typescript
export const toPortfolioAggDto = (row: DbPortfolioAggRow): PortfolioAggDto
```

Funkcja ta konwertuje wiersz z widoku bazy danych (który może zawierać wartości NULL) na DTO z wyzerowanymi wartościami.

### 3.3. Typy błędów

**ApiError** - Standardowy format błędu z `src/types.ts`:

```typescript
export interface ApiError {
  error: {
    code: "unauthorized" | "internal" | ...
    message: string
    fields?: Record<string, string>
  }
}
```

## 4. Szczegóły odpowiedzi

### 4.1. Sukces (200 OK)

**Content-Type:** `application/json`

**Przykładowa odpowiedź dla użytkownika z inwestycjami:**

```json
{
  "user_id": "3b9c1234-5678-90ab-cdef-1234567890ab",
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

**Przykładowa odpowiedź dla użytkownika bez inwestycji:**

```json
{
  "user_id": "3b9c1234-5678-90ab-cdef-1234567890ab",
  "total_amount": 0.00,
  "sum_stock": 0.00,
  "sum_etf": 0.00,
  "sum_bond": 0.00,
  "sum_cash": 0.00,
  "share_stock": 0.00,
  "share_etf": 0.00,
  "share_bond": 0.00,
  "share_cash": 0.00
}
```

### 4.2. Błędy

**401 Unauthorized** - Brak lub nieprawidłowy token autoryzacji:

```json
{
  "error": {
    "code": "unauthorized",
    "message": "Authentication required. Please log in."
  }
}
```

**500 Internal Server Error** - Błąd po stronie serwera:

```json
{
  "error": {
    "code": "internal",
    "message": "An unexpected error occurred while fetching portfolio aggregation."
  }
}
```

## 5. Przepływ danych

### 5.1. Diagram przepływu

```
Client Request
    ↓
[Astro Middleware]
    ├─→ Extract JWT from Authorization header
    ├─→ Validate JWT with Supabase
    └─→ Attach supabase client to context.locals
    ↓
[API Endpoint Handler]
    ├─→ Verify authentication (get user from JWT)
    ├─→ Extract user_id from authenticated session
    └─→ Call Portfolio Service
    ↓
[Portfolio Service]
    ├─→ Query v_investments_agg view for user_id
    ├─→ Handle case when no investments exist (NULL result)
    ├─→ Map DB row to DTO using toPortfolioAggDto()
    └─→ Return PortfolioAggDto
    ↓
[API Endpoint Handler]
    ├─→ Return 200 OK with PortfolioAggDto
    └─→ Handle errors → Return appropriate error response
    ↓
Client Response
```

### 5.2. Szczegółowy przepływ

1. **Odbieranie żądania:**
   - Astro middleware przechwytuje żądanie
   - Middleware inicjalizuje klienta Supabase i dodaje go do `context.locals.supabase`

2. **Weryfikacja autoryzacji:**
   - Endpoint odczytuje nagłówek `Authorization`
   - Weryfikuje token JWT używając `context.locals.supabase.auth.getUser()`
   - Jeśli token jest nieprawidłowy lub brakuje, zwraca `401 Unauthorized`

3. **Pobieranie danych:**
   - Wyodrębnienie `user_id` z sesji użytkownika
   - Zapytanie do widoku `v_investments_agg` z filtrem `user_id = auth.uid()`
   - RLS (Row Level Security) automatycznie filtruje dane, więc użytkownik widzi tylko swoje dane

4. **Obsługa braku danych:**
   - Jeśli widok nie zwraca wiersza (użytkownik nie ma inwestycji), funkcja `toPortfolioAggDto()` zwraca DTO z wartościami wyzerowanymi
   - Jeśli widok zwraca wiersz z wartościami NULL (teoretycznie możliwe), funkcja mapująca używa `COALESCE` lub operatora `??` do wyzerowania

5. **Mapowanie i odpowiedź:**
   - Konwersja wiersza bazy danych na `PortfolioAggDto` używając `toPortfolioAggDto()`
   - Zwrócenie odpowiedzi `200 OK` z JSON

### 5.3. Interakcje z bazą danych

**Zapytanie SQL (wykonywane przez Supabase):**

```sql
SELECT 
  user_id,
  total_amount,
  sum_stock,
  sum_etf,
  sum_bond,
  sum_cash,
  share_stock,
  share_etf,
  share_bond,
  share_cash
FROM v_investments_agg
WHERE user_id = auth.uid()
LIMIT 1;
```

**Uwagi:**
- RLS automatycznie filtruje wyniki na podstawie `user_id = auth.uid()`
- Widok `v_investments_agg` agreguje dane z tabeli `investments`
- Jeśli użytkownik nie ma inwestycji, widok nie zwraca wiersza (GROUP BY nie tworzy wierszy dla brakujących danych)
- Indeks `investments_user_id_idx` przyspiesza zapytania

## 6. Względy bezpieczeństwa

### 6.1. Autoryzacja

- **Wymagana autoryzacja:** Endpoint wymaga zalogowanego użytkownika
- **Mechanizm:** Bearer JWT token z Supabase Auth
- **Weryfikacja:** Token jest weryfikowany przez Supabase przed wykonaniem zapytania
- **Izolacja danych:** RLS (Row Level Security) zapewnia, że użytkownik widzi tylko swoje dane

### 6.2. Walidacja danych wejściowych

- **Brak danych wejściowych:** Endpoint GET nie przyjmuje parametrów, więc walidacja nie jest wymagana
- **Walidacja tokenu:** Token JWT jest weryfikowany przez Supabase Auth

### 6.3. Ochrona przed atakami

- **SQL Injection:** Zabezpieczone przez Supabase SDK (parametryzowane zapytania)
- **Authorization Bypass:** Zabezpieczone przez RLS - nawet jeśli ktoś spróbuje zmienić `user_id`, RLS zablokuje dostęp
- **Rate Limiting:** (Opcjonalnie) Można dodać rate limiting na poziomie middleware lub Supabase

### 6.4. Bezpieczeństwo danych

- **PII (Personally Identifiable Information):** Endpoint zwraca tylko `user_id` (UUID), który nie jest PII
- **Dane finansowe:** Dane finansowe są chronione przez RLS i dostępne tylko dla właściciela
- **Logowanie:** Nie logujemy wrażliwych danych finansowych w logach

## 7. Obsługa błędów

### 7.1. Scenariusze błędów

| Scenariusz | Kod HTTP | Kod błędu | Komunikat |
|------------|----------|-----------|-----------|
| Brak tokenu autoryzacji | 401 | `unauthorized` | "Authentication required. Please log in." |
| Nieprawidłowy/wygasły token | 401 | `unauthorized` | "Invalid or expired authentication token." |
| Błąd połączenia z bazą danych | 500 | `internal` | "An unexpected error occurred while fetching portfolio aggregation." |
| Błąd Supabase SDK | 500 | `internal` | "Database error occurred. Please try again later." |
| Błąd mapowania danych | 500 | `internal` | "An error occurred while processing portfolio data." |

### 7.2. Implementacja obsługi błędów

**Struktura obsługi błędów:**

```typescript
try {
  // 1. Weryfikacja autoryzacji
  const user = await getAuthenticatedUser(context);
  if (!user) {
    return new Response(JSON.stringify({
      error: { code: "unauthorized", message: "..." }
    }), { status: 401 });
  }

  // 2. Pobieranie danych
  const portfolioData = await portfolioService.getAggregation(user.id);
  
  // 3. Zwrócenie odpowiedzi
  return new Response(JSON.stringify(portfolioData), { status: 200 });
} catch (error) {
  // 4. Obsługa błędów
  if (error instanceof SupabaseError) {
    // Logowanie błędu (bez wrażliwych danych)
    console.error("Supabase error:", error.message);
    return new Response(JSON.stringify({
      error: { code: "internal", message: "..." }
    }), { status: 500 });
  }
  // Inne błędy
  return new Response(JSON.stringify({
    error: { code: "internal", message: "..." }
  }), { status: 500 });
}
```

### 7.3. Logowanie błędów

- **Błędy autoryzacji:** Logowane na poziomie INFO (nie są błędami systemu)
- **Błędy bazy danych:** Logowane na poziomie ERROR z kontekstem (bez wrażliwych danych)
- **Błędy nieoczekiwane:** Logowane na poziomie ERROR z pełnym stack trace

**Uwaga:** Zgodnie z regułami implementacji, błędy powinny być logowane, ale nie zapisywane w tabeli błędów (nie ma takiej tabeli w MVP).

## 8. Rozważania dotyczące wydajności

### 8.1. Optymalizacje zapytań

- **Indeksy:** Widok `v_investments_agg` korzysta z indeksów na tabeli `investments`:
  - `investments_user_id_idx` - przyspiesza filtrowanie po `user_id`
  - `investments_type_idx` - przyspiesza agregację po typie aktywa
- **Widok materializowany:** (Opcjonalnie w przyszłości) Można rozważyć materializowany widok dla lepszej wydajności przy dużej liczbie inwestycji
- **Cache:** (Opcjonalnie) Można dodać cache na poziomie serwera dla często pobieranych danych

### 8.2. Potencjalne wąskie gardła

- **Agregacja danych:** Widok wykonuje agregację SUM i CASE WHEN dla każdego typu aktywa
- **Rozwiązanie:** Indeksy na `user_id` i `type` minimalizują czas wykonania
- **Skalowalność:** Dla MVP (mała skala) wydajność powinna być wystarczająca

### 8.3. Strategie optymalizacji

1. **Krótkoterminowe (MVP):**
   - Poleganie na istniejących indeksach
   - Użycie widoku zamiast bezpośrednich zapytań do tabeli

2. **Długoterminowe (jeśli potrzebne):**
   - Materializowany widok z odświeżaniem okresowym
   - Cache na poziomie aplikacji (Redis)
   - Denormalizacja danych (zapis zagregowanych wartości w tabeli)

## 9. Etapy wdrożenia

### Krok 1: Utworzenie struktury katalogów i plików

1. Utworzenie katalogu `src/pages/api/v1/me/` jeśli nie istnieje
2. Utworzenie pliku `src/pages/api/v1/me/portfolio-agg.ts` (lub `.astro` jeśli używamy Astro endpoints)

**Struktura plików:**
```
src/
  pages/
    api/
      v1/
        me/
          portfolio-agg.ts
  lib/
    services/
      portfolio.service.ts
```

### Krok 2: Utworzenie serwisu Portfolio

1. Utworzenie pliku `src/lib/services/portfolio.service.ts`
2. Implementacja funkcji `getPortfolioAggregation(userId: string): Promise<PortfolioAggDto>`
3. Funkcja powinna:
   - Przyjmować `userId` jako parametr
   - Wykonywać zapytanie do widoku `v_investments_agg`
   - Obsługiwać przypadek braku danych (NULL)
   - Zwracać `PortfolioAggDto` z wyzerowanymi wartościami jeśli brak danych

**Przykładowa implementacja serwisu:**

```typescript
// src/lib/services/portfolio.service.ts
import type { SupabaseClient } from '../db/supabase.client';
import type { PortfolioAggDto } from '../../types';
import { toPortfolioAggDto } from '../../types';

export async function getPortfolioAggregation(
  supabase: SupabaseClient,
  userId: string
): Promise<PortfolioAggDto> {
  const { data, error } = await supabase
    .from('v_investments_agg')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error) {
    // Jeśli błąd to "no rows returned", zwróć wyzerowane wartości
    if (error.code === 'PGRST116') {
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
    throw error;
  }

  // Mapuj wiersz bazy danych na DTO (obsługuje NULL)
  return toPortfolioAggDto(data);
}
```

### Krok 3: Utworzenie helpera do autoryzacji

1. Utworzenie pliku `src/lib/auth/helpers.ts` (jeśli nie istnieje)
2. Implementacja funkcji `getAuthenticatedUser(context: APIContext): Promise<User | null>`
3. Funkcja powinna:
   - Pobierać token z nagłówka `Authorization`
   - Weryfikować token używając `context.locals.supabase.auth.getUser()`
   - Zwracać użytkownika lub `null` jeśli nieautoryzowany

**Przykładowa implementacja helpera:**

```typescript
// src/lib/auth/helpers.ts
import type { APIContext } from 'astro';
import type { User } from '@supabase/supabase-js';

export async function getAuthenticatedUser(
  context: APIContext
): Promise<User | null> {
  const authHeader = context.request.headers.get('Authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);
  const { data: { user }, error } = await context.locals.supabase.auth.getUser(token);

  if (error || !user) {
    return null;
  }

  return user;
}
```

### Krok 4: Implementacja endpointu API

1. Utworzenie pliku `src/pages/api/v1/me/portfolio-agg.ts`
2. Implementacja handlera `GET`:
   - Eksport funkcji `GET` (Astro Server Endpoint)
   - Ustawienie `export const prerender = false`
   - Weryfikacja autoryzacji
   - Wywołanie serwisu Portfolio
   - Zwrócenie odpowiedzi JSON

**Przykładowa implementacja endpointu:**

```typescript
// src/pages/api/v1/me/portfolio-agg.ts
import type { APIContext } from 'astro';
import { getAuthenticatedUser } from '../../../../lib/auth/helpers';
import { getPortfolioAggregation } from '../../../../lib/services/portfolio.service';
import type { ApiError } from '../../../../types';

export const prerender = false;

export async function GET(context: APIContext): Promise<Response> {
  try {
    // 1. Weryfikacja autoryzacji
    const user = await getAuthenticatedUser(context);
    if (!user) {
      const error: ApiError = {
        error: {
          code: 'unauthorized',
          message: 'Authentication required. Please log in.',
        },
      };
      return new Response(JSON.stringify(error), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 2. Pobieranie danych portfela
    const portfolioData = await getPortfolioAggregation(
      context.locals.supabase,
      user.id
    );

    // 3. Zwrócenie odpowiedzi
    return new Response(JSON.stringify(portfolioData), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    // 4. Obsługa błędów
    console.error('Error fetching portfolio aggregation:', error);
    
    const apiError: ApiError = {
      error: {
        code: 'internal',
        message: 'An unexpected error occurred while fetching portfolio aggregation.',
      },
    };

    return new Response(JSON.stringify(apiError), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
```

### Krok 5: Walidacja typów TypeScript

1. Sprawdzenie, czy wszystkie typy są poprawnie zaimportowane
2. Weryfikacja, czy `PortfolioAggDto` i `toPortfolioAggDto` są dostępne w `src/types.ts`
3. Upewnienie się, że typy bazy danych (`Database`, `Tables`) są wygenerowane w `src/db/database.types.ts`

### Krok 6: Testowanie

1. **Testy jednostkowe (opcjonalnie):**
   - Test serwisu `getPortfolioAggregation` z mockiem Supabase
   - Test helpera `getAuthenticatedUser` z różnymi scenariuszami tokenów

2. **Testy integracyjne:**
   - Test endpointu z prawdziwym tokenem JWT
   - Test przypadku użytkownika bez inwestycji
   - Test przypadku użytkownika z inwestycjami
   - Test przypadku nieautoryzowanego żądania

3. **Testy ręczne:**
   - Użycie narzędzia jak Postman lub curl do testowania endpointu
   - Weryfikacja odpowiedzi JSON
   - Weryfikacja kodów statusu HTTP

**Przykładowy test curl:**

```bash
# Test z tokenem
curl -X GET http://localhost:4321/api/v1/me/portfolio-agg \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json"

# Test bez tokenu (powinien zwrócić 401)
curl -X GET http://localhost:4321/api/v1/me/portfolio-agg \
  -H "Content-Type: application/json"
```

### Krok 7: Dokumentacja i code review

1. Sprawdzenie zgodności z regułami implementacji:
   - Użycie `context.locals.supabase` zamiast bezpośredniego importu
   - Wczesne zwracanie błędów (early returns)
   - Brak niepotrzebnych else statements
   - Właściwa obsługa błędów

2. Sprawdzenie zgodności z konwencjami:
   - Nazewnictwo plików i funkcji
   - Formatowanie kodu (Prettier)
   - Linting (ESLint)

3. Aktualizacja dokumentacji API (jeśli istnieje)

### Krok 8: Wdrożenie i monitorowanie

1. Commit zmian do repozytorium
2. Weryfikacja działania w środowisku deweloperskim
3. Wdrożenie do środowiska produkcyjnego (jeśli dotyczy)
4. Monitorowanie błędów i wydajności

## 10. Uwagi dodatkowe

### 10.1. Zgodność z regułami implementacji

- ✅ Użycie `context.locals.supabase` zamiast bezpośredniego importu klienta
- ✅ Wczesne zwracanie błędów (early returns)
- ✅ Brak niepotrzebnych else statements
- ✅ Właściwa obsługa błędów i edge cases
- ✅ Użycie Zod do walidacji (nie dotyczy tego endpointu - brak danych wejściowych)
- ✅ Ekstrakcja logiki do serwisu w `src/lib/services`

### 10.2. Zgodność z architekturą

- ✅ Endpoint w `src/pages/api/v1/me/portfolio-agg.ts`
- ✅ Serwis w `src/lib/services/portfolio.service.ts`
- ✅ Helper autoryzacji w `src/lib/auth/helpers.ts`
- ✅ Typy DTO w `src/types.ts`
- ✅ Użycie typów z `src/db/database.types.ts`

### 10.3. Potencjalne rozszerzenia w przyszłości

- **Cache:** Dodanie cache na poziomie serwera dla często pobieranych danych
- **Rate limiting:** Ograniczenie liczby żądań na użytkownika
- **Wersjonowanie:** Obsługa różnych wersji API (v1, v2, etc.)
- **Filtrowanie:** Dodanie opcjonalnych parametrów query string do filtrowania danych (np. data od-do)
- **Webhooks:** Powiadomienia o zmianach w portfelu (jeśli potrzebne)

---

**Data utworzenia planu:** 2025-01-15  
**Wersja:** 1.0  
**Status:** Gotowy do implementacji



