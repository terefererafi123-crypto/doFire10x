# API Endpoint Implementation Plan: GET `/v1/me/ai-hint`

## 1. Przegląd punktu końcowego

Endpoint `GET /v1/me/ai-hint` zwraca zwięzłą podpowiedź dotyczącą portfela inwestycyjnego użytkownika na podstawie deterministycznych reguł PRD. Podpowiedź jest generowana na podstawie procentowych udziałów różnych typów aktywów z widoku `v_investments_agg`. Endpoint obsługuje lokalizację komunikatów (polski/angielski) na podstawie nagłówka `Accept-Language`.

**Główne funkcjonalności:**
- Pobranie zagregowanych danych portfela z widoku `v_investments_agg`
- Zastosowanie deterministycznych reguł PRD do oceny struktury portfela
- Generowanie zlokalizowanej podpowiedzi (max ~160 znaków)
- Zwrócenie listy dopasowanych reguł oraz aktualnych udziałów procentowych

## 2. Szczegóły żądania

- **Metoda HTTP:** `GET`
- **Struktura URL:** `/v1/me/ai-hint`
- **Parametry:** Brak parametrów query string
- **Request Body:** Brak
- **Nagłówki:**
  - `Authorization: Bearer <Supabase-JWT>` (wymagane)
  - `Accept-Language: pl-PL` lub `en-US` (opcjonalne, domyślnie angielski)
  - `X-Request-Id: <uuid>` (opcjonalne, dla korelacji logów)

## 3. Wykorzystywane typy

### 3.1. DTOs (Data Transfer Objects)

**`AiHintDto`** (z `src/types.ts`):
```typescript
export interface AiHintDto {
  hint: string // zlokalizowana podpowiedź (<= ~160 chars)
  rules_matched: AiRuleId[]
  shares: {
    stock: number
    etf: number
    bond: number
    cash: number
  }
}
```

**`AiRuleId`** (z `src/types.ts`):
```typescript
export type AiRuleId =
  | "stock_plus_etf_ge_80"
  | "bond_ge_50"
  | "cash_ge_30"
  | "stock_plus_etf_lt_40"
```

**`PortfolioAggDto`** (z `src/types.ts`):
```typescript
export interface PortfolioAggDto {
  user_id: string
  total_amount: number
  sum_stock: number
  sum_etf: number
  sum_bond: number
  sum_cash: number
  share_stock: number
  share_etf: number
  share_bond: number
  share_cash: number
}
```

### 3.2. Command Modele

Brak - endpoint jest tylko do odczytu (GET).

### 3.3. Typy pomocnicze

**Lokalizacja:**
```typescript
type Locale = "pl-PL" | "en-US" | "en"
```

**Reguły AI Hint:**
```typescript
interface AiHintRule {
  id: AiRuleId
  condition: (shares: PortfolioAggDto) => boolean
  getHint: (locale: Locale) => string
}
```

## 4. Szczegóły odpowiedzi

### 4.1. Sukces (200 OK)

**Struktura odpowiedzi:**
```json
{
  "hint": "Wysokie ryzyko – duży udział akcji i ETF.",
  "rules_matched": ["stock_plus_etf_ge_80"],
  "shares": {
    "stock": 35.29,
    "etf": 41.18,
    "bond": 17.65,
    "cash": 5.88
  }
}
```

**Pola odpowiedzi:**
- `hint` (string, wymagane): Zlokalizowana podpowiedź o strukturze portfela (max ~160 znaków)
- `rules_matched` (string[], wymagane): Lista identyfikatorów reguł, które zostały dopasowane (kolejność priorytetowa)
- `shares` (object, wymagane): Obiekt zawierający procentowe udziały każdego typu aktywa
  - `stock` (number): Udział akcji w procentach (0-100)
  - `etf` (number): Udział ETF w procentach (0-100)
  - `bond` (number): Udział obligacji w procentach (0-100)
  - `cash` (number): Udział gotówki w procentach (0-100)

**Uwagi:**
- Jeśli użytkownik nie ma żadnych inwestycji, wszystkie udziały będą równe 0, a podpowiedź będzie dotyczyć braku inwestycji
- Reguły są sprawdzane w kolejności priorytetowej - pierwsza dopasowana reguła decyduje o podpowiedzi
- Suma udziałów powinna wynosić 100% (z tolerancją zaokrągleń)

### 4.2. Błędy

**401 Unauthorized:**
```json
{
  "error": {
    "code": "unauthorized",
    "message": "Authentication required"
  }
}
```
- Występuje gdy brak tokenu JWT lub token jest nieprawidłowy
- Middleware autoryzacji powinien zwrócić ten błąd przed dotarciem do handlera

**500 Internal Server Error:**
```json
{
  "error": {
    "code": "internal",
    "message": "An unexpected error occurred"
  }
}
```
- Występuje przy nieoczekiwanych błędach bazy danych lub serwera
- Powinien być logowany z pełnym kontekstem (X-Request-Id)

## 5. Przepływ danych

### 5.1. Diagram przepływu

```
1. Request → Middleware (Auth)
   ↓
2. Middleware weryfikuje JWT token
   ↓ (401 jeśli nieprawidłowy)
3. Handler endpointu
   ↓
4. Service: getPortfolioAggregation(userId)
   ↓
5. Query do Supabase: SELECT * FROM v_investments_agg WHERE user_id = ?
   ↓
6. Jeśli brak danych → zwróć zeroed PortfolioAggDto
   ↓
7. Service: generateAiHint(portfolioAgg, locale)
   ↓
8. Zastosuj reguły PRD w kolejności priorytetowej:
   a. stock_plus_etf_ge_80
   b. bond_ge_50
   c. cash_ge_30
   d. stock_plus_etf_lt_40
   ↓
9. Wygeneruj zlokalizowaną podpowiedź
   ↓
10. Zwróć AiHintDto
```

### 5.2. Interakcje z bazą danych

**Zapytanie do widoku `v_investments_agg`:**
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
WHERE user_id = $1
```

**Obsługa przypadku braku danych:**
- Jeśli użytkownik nie ma żadnych inwestycji, widok nie zwróci wiersza
- W takim przypadku należy zwrócić `PortfolioAggDto` z zerowymi wartościami:
  ```typescript
  {
    user_id: userId,
    total_amount: 0,
    sum_stock: 0,
    sum_etf: 0,
    sum_bond: 0,
    sum_cash: 0,
    share_stock: 0,
    share_etf: 0,
    share_bond: 0,
    share_cash: 0
  }
  ```

### 5.3. Logika biznesowa - Reguły AI Hint

Reguły są sprawdzane w kolejności priorytetowej (pierwsza dopasowana decyduje):

1. **`stock_plus_etf_ge_80`** (najwyższy priorytet)
   - Warunek: `share_stock + share_etf >= 80`
   - PL: "Wysokie ryzyko – duży udział akcji i ETF."
   - EN: "High risk — large share of stocks and ETFs."

2. **`bond_ge_50`**
   - Warunek: `share_bond >= 50`
   - PL: "Bezpieczny portfel – przewaga obligacji."
   - EN: "Conservative — bonds dominate."

3. **`cash_ge_30`**
   - Warunek: `share_cash >= 30`
   - PL: "Zbyt dużo gotówki – rozważ inwestowanie nadwyżki."
   - EN: "Too much cash — consider investing surplus."

4. **`stock_plus_etf_lt_40`** (najniższy priorytet)
   - Warunek: `share_stock + share_etf < 40`
   - PL: "Zbyt mało akcji – niższy potencjał wzrostu."
   - EN: "Low equity — limited growth potential."

**Przypadek domyślny:**
- Jeśli żadna reguła nie jest dopasowana, zwróć neutralną podpowiedź:
  - PL: "Portfel zrównoważony."
  - EN: "Balanced portfolio."

## 6. Względy bezpieczeństwa

### 6.1. Uwierzytelnianie i autoryzacja

- **Wymagany token JWT:** Endpoint wymaga ważnego tokenu Supabase JWT w nagłówku `Authorization: Bearer <token>`
- **Middleware autoryzacji:** Weryfikacja tokenu powinna odbywać się w middleware Astro przed dotarciem do handlera
- **RLS (Row Level Security):** Widok `v_investments_agg` dziedziczy polityki RLS z tabeli `investments`, więc użytkownik zobaczy tylko swoje dane
- **Izolacja danych:** `user_id` jest automatycznie filtrowane przez RLS na podstawie `auth.uid()`

### 6.2. Walidacja danych wejściowych

- **Brak danych wejściowych:** Endpoint nie przyjmuje parametrów, więc walidacja wejściowa nie jest wymagana
- **Nagłówek Accept-Language:** 
  - Opcjonalny nagłówek
  - Obsługiwane wartości: `pl-PL`, `pl`, `en-US`, `en`
  - Domyślnie: `en` (angielski)
  - Parsowanie powinno być tolerancyjne (case-insensitive)

### 6.3. Ochrona przed atakami

- **SQL Injection:** Używanie Supabase client z parametrami zapytań eliminuje ryzyko SQL injection
- **XSS:** Dane zwracane są tylko numeryczne (udziały) i zdefiniowane stringi (podpowiedzi), więc ryzyko XSS jest minimalne
- **Rate Limiting:** Endpoint powinien podlegać ogólnym limitom API (60 req/min per user)
- **CORS:** Endpoint powinien respektować konfigurację CORS dla frontendu

### 6.4. Prywatność danych

- **Brak PII w odpowiedzi:** Odpowiedź zawiera tylko agregowane dane finansowe, bez danych osobowych
- **Logowanie:** W logach nie powinny być zapisywane wartości finansowe (tylko metadane: user_id, timestamp, X-Request-Id)

## 7. Obsługa błędów

### 7.1. Scenariusze błędów i kody statusu

| Scenariusz | Kod statusu | Struktura odpowiedzi |
|------------|-------------|---------------------|
| Brak tokenu JWT | 401 | `{ error: { code: "unauthorized", message: "Authentication required" } }` |
| Nieprawidłowy/wygasły token | 401 | `{ error: { code: "unauthorized", message: "Invalid or expired token" } }` |
| Błąd połączenia z bazą danych | 500 | `{ error: { code: "internal", message: "Database connection error" } }` |
| Nieoczekiwany błąd serwera | 500 | `{ error: { code: "internal", message: "An unexpected error occurred" } }` |

### 7.2. Logowanie błędów

**Struktura logu błędu:**
```typescript
{
  timestamp: string,
  level: "error",
  requestId: string,
  userId: string,
  endpoint: "GET /v1/me/ai-hint",
  error: {
    code: string,
    message: string,
    stack?: string // tylko w środowisku deweloperskim
  }
}
```

**Zasady logowania:**
- Wszystkie błędy 500 powinny być logowane z pełnym stack trace (tylko w dev/staging)
- Błędy 401 mogą być logowane na poziomie INFO (nie są krytyczne)
- Użyj `X-Request-Id` z nagłówka requestu dla korelacji logów
- Nie loguj wartości finansowych ani danych osobowych

### 7.3. Obsługa edge cases

**Brak inwestycji:**
- Jeśli użytkownik nie ma żadnych inwestycji, zwróć zeroed `PortfolioAggDto`
- Podpowiedź powinna być neutralna lub informować o braku inwestycji (zależnie od wymagań UX)

**Nieprawidłowe wartości udziałów:**
- Jeśli suma udziałów nie wynosi 100% (z powodu zaokrągleń), znormalizuj wartości
- Jeśli udział jest ujemny lub > 100, traktuj jako błąd danych i zwróć 500

**Brak danych w widoku:**
- Widok `v_investments_agg` nie zwraca wierszy dla użytkowników bez inwestycji
- Obsłuż to jako przypadek normalny (nie błąd) - zwróć zeroed wartości

## 8. Rozważania dotyczące wydajności

### 8.1. Optymalizacja zapytań

- **Wykorzystanie indeksów:** Widok `v_investments_agg` korzysta z indeksów na `investments.user_id_idx`, co zapewnia szybkie wyszukiwanie
- **Pojedyncze zapytanie:** Endpoint wykonuje tylko jedno zapytanie do bazy danych (SELECT z widoku)
- **RLS performance:** RLS filtrowanie po `user_id` jest zoptymalizowane przez indeks

### 8.2. Cache'owanie

- **HTTP Cache:** Endpoint może być cache'owany na poziomie HTTP z nagłówkami:
  - `Cache-Control: private, max-age=60` (cache na 60 sekund, tylko dla przeglądarki)
  - `ETag` oparty na `updated_at` z ostatniej inwestycji użytkownika
- **Cache po stronie serwera:** Nie jest wymagane w MVP, ale można rozważyć cache Redis dla często używanych danych
- **Invalidacja cache:** Cache powinien być invalidowany przy każdej zmianie inwestycji (INSERT/UPDATE/DELETE)

### 8.3. Potencjalne wąskie gardła

- **Zapytanie do widoku:** Widok `v_investments_agg` wykonuje agregację, ale jest zoptymalizowany dla małej skali (MVP)
- **Lokalizacja:** Parsowanie nagłówka `Accept-Language` i wybór odpowiedniego stringa jest trywialne i nie wpływa na wydajność
- **Generowanie podpowiedzi:** Logika reguł jest deterministyczna i bardzo szybka (tylko porównania numeryczne)

### 8.4. Monitoring wydajności

- **Metryki do monitorowania:**
  - Czas odpowiedzi endpointu (p50, p95, p99)
  - Czas wykonania zapytania do bazy danych
  - Liczba błędów 500 vs 401
  - Wykorzystanie cache (hit rate)

## 9. Etapy wdrożenia

### Krok 1: Utworzenie struktury plików

1. Utwórz plik endpointu: `src/pages/api/v1/me/ai-hint.ts`
2. Utwórz plik serwisu: `src/lib/services/ai-hint.service.ts`
3. Utwórz plik z regułami: `src/lib/services/ai-hint-rules.ts`
4. Utwórz plik z lokalizacjami: `src/lib/services/ai-hint-locales.ts`

### Krok 2: Implementacja serwisu portfolio aggregation

1. Utwórz funkcję `getPortfolioAggregation(userId: string): Promise<PortfolioAggDto>`
2. Wykonaj zapytanie do widoku `v_investments_agg` używając Supabase client
3. Obsłuż przypadek braku danych (zwróć zeroed wartości)
4. Użyj helpera `toPortfolioAggDto` z `src/types.ts` jeśli dostępny

### Krok 3: Implementacja reguł AI Hint

1. Zdefiniuj interfejs `AiHintRule` z warunkiem i funkcją generującą podpowiedź
2. Zaimplementuj wszystkie 4 reguły PRD w kolejności priorytetowej:
   - `stock_plus_etf_ge_80`
   - `bond_ge_50`
   - `cash_ge_30`
   - `stock_plus_etf_lt_40`
3. Dodaj regułę domyślną dla przypadku, gdy żadna reguła nie pasuje
4. Utwórz funkcję `matchRules(shares: PortfolioAggDto): AiRuleId[]`

### Krok 4: Implementacja lokalizacji

1. Utwórz mapę lokalizacji dla każdej reguły (PL i EN)
2. Zaimplementuj funkcję `parseAcceptLanguage(header: string | null): Locale`
3. Utwórz funkcję `getLocalizedHint(ruleId: AiRuleId, locale: Locale): string`
4. Obsłuż fallback do angielskiego dla nieobsługiwanych lokalizacji

### Krok 5: Implementacja głównej logiki serwisu

1. Utwórz funkcję `generateAiHint(portfolioAgg: PortfolioAggDto, locale: Locale): AiHintDto`
2. Zastosuj reguły w kolejności priorytetowej
3. Wygeneruj zlokalizowaną podpowiedź dla pierwszej dopasowanej reguły
4. Zwróć `AiHintDto` z podpowiedzią, listą dopasowanych reguł i udziałami

### Krok 6: Implementacja endpointu Astro

1. Utwórz handler `GET` w `src/pages/api/v1/me/ai-hint.ts`
2. Ustaw `export const prerender = false`
3. Pobierz `user_id` z `context.locals` (po weryfikacji przez middleware)
4. Pobierz nagłówek `Accept-Language`
5. Wywołaj serwis `generateAiHint`
6. Zwróć odpowiedź 200 z `AiHintDto`
7. Obsłuż błędy i zwróć odpowiednie kody statusu

### Krok 7: Integracja z middleware autoryzacji

1. Upewnij się, że middleware weryfikuje JWT token przed dotarciem do endpointu
2. Middleware powinien ustawić `context.locals.userId` po weryfikacji
3. Jeśli token jest nieprawidłowy, middleware zwraca 401 przed dotarciem do handlera

### Krok 8: Walidacja i testy

1. **Testy jednostkowe:**
   - Test reguł AI Hint (każda reguła osobno)
   - Test lokalizacji (PL i EN)
   - Test przypadku braku inwestycji
   - Test przypadku, gdy żadna reguła nie pasuje

2. **Testy integracyjne:**
   - Test endpointu z prawidłowym tokenem
   - Test endpointu bez tokenu (401)
   - Test endpointu z nieprawidłowym tokenem (401)
   - Test z różnymi wartościami udziałów

3. **Testy E2E (Playwright):**
   - Test pobrania AI hint dla użytkownika z inwestycjami
   - Test pobrania AI hint dla użytkownika bez inwestycji
   - Test lokalizacji (sprawdź odpowiedź dla różnych nagłówków Accept-Language)

### Krok 9: Dokumentacja i code review

1. Dodaj komentarze JSDoc do wszystkich funkcji publicznych
2. Zweryfikuj zgodność z zasadami kodowania (linter)
3. Upewnij się, że wszystkie typy są poprawnie zaimportowane z `src/types.ts`
4. Sprawdź, czy kod jest zgodny z zasadami z `.cursor/rules/backend.mdc` i `.cursor/rules/astro.mdc`

### Krok 10: Deployment i monitoring

1. Wdróż endpoint do środowiska staging
2. Zweryfikuj działanie w środowisku staging
3. Monitoruj logi pod kątem błędów
4. Wdróż do produkcji po pozytywnej weryfikacji

## 10. Przykłady użycia

### Przykład 1: Pobranie AI hint (polski)

**Request:**
```http
GET /v1/me/ai-hint
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Accept-Language: pl-PL
```

**Response 200:**
```json
{
  "hint": "Wysokie ryzyko – duży udział akcji i ETF.",
  "rules_matched": ["stock_plus_etf_ge_80"],
  "shares": {
    "stock": 35.29,
    "etf": 41.18,
    "bond": 17.65,
    "cash": 5.88
  }
}
```

### Przykład 2: Pobranie AI hint (angielski)

**Request:**
```http
GET /v1/me/ai-hint
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Accept-Language: en-US
```

**Response 200:**
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

### Przykład 3: Użytkownik bez inwestycji

**Request:**
```http
GET /v1/me/ai-hint
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
Accept-Language: pl-PL
```

**Response 200:**
```json
{
  "hint": "Portfel zrównoważony.",
  "rules_matched": [],
  "shares": {
    "stock": 0,
    "etf": 0,
    "bond": 0,
    "cash": 0
  }
}
```

### Przykład 4: Brak autoryzacji

**Request:**
```http
GET /v1/me/ai-hint
```

**Response 401:**
```json
{
  "error": {
    "code": "unauthorized",
    "message": "Authentication required"
  }
}
```

## 11. Uwagi implementacyjne

### 11.1. Zgodność z istniejącym kodem

- Użyj `SupabaseClient` z `src/db/supabase.client.ts`, nie bezpośrednio z `@supabase/supabase-js`
- Pobierz `supabase` z `context.locals` w endpointach Astro
- Użyj typów z `src/types.ts` dla DTOs
- Postępuj zgodnie z zasadami z `.cursor/rules/backend.mdc` i `.cursor/rules/astro.mdc`

### 11.2. Obsługa błędów

- Używaj early returns dla warunków błędów
- Zwracaj spójne struktury błędów zgodne z `ApiError` z `src/types.ts`
- Loguj błędy z kontekstem (X-Request-Id, userId)

### 11.3. Testowanie

- Testy jednostkowe dla logiki reguł (niezależnie od bazy danych)
- Testy integracyjne z mockowanym Supabase client
- Testy E2E z rzeczywistą bazą danych (staging)

### 11.4. Rozszerzalność

- Reguły są łatwe do dodania - wystarczy dodać nową regułę do tablicy w kolejności priorytetowej
- Lokalizacje są łatwe do rozszerzenia - dodaj nowy język do mapy lokalizacji
- Struktura odpowiedzi jest zgodna z typem `AiHintDto` z `src/types.ts`

