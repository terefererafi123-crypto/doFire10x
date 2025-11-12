# API Endpoint Implementation Plan: GET `/v1/me/profile`

## 1. Przegląd punktu końcowego

Endpoint `GET /v1/me/profile` służy do pobierania profilu użytkownika związanego z aktualnie zalogowanym użytkownikiem. Endpoint jest chroniony autoryzacją Bearer JWT i wykorzystuje Row Level Security (RLS) Supabase, aby zapewnić, że użytkownik może zobaczyć tylko swój własny profil.

**Funkcjonalność:**
- Pobiera dane profilu użytkownika z tabeli `profiles`
- Zwraca wszystkie pola profilu w formacie DTO
- Wykorzystuje RLS do automatycznej filtracji po `user_id`
- Obsługuje przypadki, gdy profil nie istnieje (404)

**Relacja z bazą danych:**
- Tabela: `public.profiles`
- Relacja: 1:1 z `auth.users` (przez `user_id`)
- Indeks: `profiles_user_id_idx` (optymalizacja zapytań)

---

## 2. Szczegóły żądania

### Metoda HTTP
- `GET`

### Struktura URL
```
GET /v1/me/profile
```

### Parametry
- **Wymagane:** Brak
- **Opcjonalne:** Brak
- **Query string:** Brak
- **Request body:** Brak

### Headers
- **Wymagane:**
  - `Authorization: Bearer <JWT_TOKEN>` - Token JWT z Supabase Auth
- **Opcjonalne:**
  - `Accept-Language: pl-PL` - Lokalizacja komunikatów błędów (domyślnie: en-US)
  - `X-Request-Id: <uuid>` - Identyfikator korelacji żądania

---

## 3. Wykorzystywane typy

### DTO (Data Transfer Objects)

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
    code: "unauthorized" | "not_found" | "internal";
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

**Mapowanie DbProfileRow → ProfileDto:**
- Mapowanie jest bezpośrednie (1:1)
- Wszystkie pola są zgodne z typami
- `birth_date` może być `null`

---

## 4. Szczegóły odpowiedzi

### Sukces (200 OK)

**Status Code:** `200 OK`

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
- `ETag: <hash>` (opcjonalnie, dla cache)
- `Last-Modified: <timestamp>` (opcjonalnie, dla cache)

### Błędy

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
    "message": "Profile not found"
  }
}
```

#### 500 Internal Server Error

**Status Code:** `500 Internal Server Error`

**Przyczyny:**
- Błąd połączenia z bazą danych
- Błąd zapytania SQL
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
Client Request
    ↓
Astro Middleware (context.locals.supabase)
    ↓
API Route Handler (GET /v1/me/profile)
    ↓
1. Authentication Check (getUser())
    ├─→ 401 Unauthorized (if invalid/missing token)
    └─→ Continue
    ↓
2. Profile Service (getProfileByUserId())
    ↓
3. Supabase Query (RLS filtered)
    SELECT * FROM profiles WHERE user_id = auth.uid()
    ↓
4. Database Response
    ├─→ Profile found → 200 OK (ProfileDto)
    ├─→ Profile not found → 404 Not Found
    └─→ Database error → 500 Internal Server Error
    ↓
5. Response to Client
```

### Szczegółowy przepływ

1. **Odebranie żądania**
   - Astro middleware (`src/middleware/index.ts`) dodaje Supabase client do `context.locals.supabase`
   - API route handler odbiera żądanie

2. **Weryfikacja autoryzacji**
   - Pobranie tokenu JWT z nagłówka `Authorization: Bearer <token>`
   - Weryfikacja tokenu przez Supabase: `context.locals.supabase.auth.getUser()`
   - Jeśli token jest nieprawidłowy lub brakuje → zwróć `401 Unauthorized`

3. **Pobranie profilu**
   - Wywołanie serwisu: `profileService.getProfileByUserId(userId)`
   - Zapytanie do bazy: `supabase.from('profiles').select('*').eq('user_id', userId).single()`
   - RLS automatycznie filtruje wyniki (tylko własny profil użytkownika)

4. **Obsługa odpowiedzi**
   - Jeśli profil znaleziony → zwróć `200 OK` z `ProfileDto`
   - Jeśli profil nie znaleziony → zwróć `404 Not Found`
   - Jeśli błąd bazy danych → zwróć `500 Internal Server Error`

5. **Zwrócenie odpowiedzi**
   - Serializacja `ProfileDto` do JSON
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
   - RLS jest włączone na tabeli `profiles`
   - Polityka SELECT: `user_id = auth.uid()`
   - Użytkownik może zobaczyć tylko swój własny profil
   - RLS działa automatycznie na poziomie bazy danych

3. **Weryfikacja użytkownika**
   - `auth.uid()` jest automatycznie ustawiane przez Supabase na podstawie tokenu JWT
   - Nie ma potrzeby ręcznej weryfikacji `user_id` w kodzie (RLS zapewnia bezpieczeństwo)

### Walidacja danych

1. **Brak danych wejściowych**
   - Endpoint nie przyjmuje żadnych danych wejściowych
   - Nie ma potrzeby walidacji danych wejściowych

2. **Walidacja odpowiedzi**
   - Dane z bazy są automatycznie walidowane przez typy TypeScript
   - Sprawdzenie, czy profil istnieje przed zwróceniem odpowiedzi

### Bezpieczeństwo danych

1. **Ochrona przed atakami**
   - Brak SQL injection (używamy Supabase client z parametrami)
   - Brak XSS (zwracamy tylko dane z bazy, bez HTML)
   - Brak CSRF (używamy Bearer token, nie cookies)

2. **Logowanie**
   - Logowanie błędów autoryzacji (401)
   - Logowanie błędów bazy danych (500)
   - Brak logowania danych wrażliwych (PII)

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
  return new Response(
    JSON.stringify({ error: { code: 'unauthorized', message: 'Missing or invalid authentication token' } }),
    { status: 401, headers: { 'Content-Type': 'application/json' } }
  );
}

const { data: { user }, error: authError } = await supabase.auth.getUser();
if (authError || !user) {
  return new Response(
    JSON.stringify({ error: { code: 'unauthorized', message: 'Invalid or expired token' } }),
    { status: 401, headers: { 'Content-Type': 'application/json' } }
  );
}
```

#### 2. Profil nie istnieje (404)

**Scenariusz:** Użytkownik jest zalogowany, ale nie ma profilu w bazie danych.

**Obsługa:**
```typescript
const { data: profile, error } = await supabase
  .from('profiles')
  .select('*')
  .eq('user_id', user.id)
  .single();

if (error) {
  if (error.code === 'PGRST116') { // No rows returned
    return new Response(
      JSON.stringify({ error: { code: 'not_found', message: 'Profile not found' } }),
      { status: 404, headers: { 'Content-Type': 'application/json' } }
    );
  }
  // Other database errors → 500
  throw error;
}
```

#### 3. Błąd bazy danych (500)

**Scenariusz:** Błąd połączenia z bazą danych lub błąd zapytania SQL.

**Obsługa:**
```typescript
try {
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', user.id)
    .single();
  
  if (error && error.code !== 'PGRST116') {
    console.error('Database error:', error);
    return new Response(
      JSON.stringify({ error: { code: 'internal', message: 'An internal server error occurred' } }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
} catch (err) {
  console.error('Unexpected error:', err);
  return new Response(
    JSON.stringify({ error: { code: 'internal', message: 'An internal server error occurred' } }),
    { status: 500, headers: { 'Content-Type': 'application/json' } }
  );
}
```

#### 4. Nieoczekiwany błąd (500)

**Scenariusz:** Nieoczekiwany błąd w kodzie (np. null reference, type error).

**Obsługa:**
```typescript
try {
  // ... endpoint logic
} catch (err) {
  console.error('Unexpected error:', err);
  return new Response(
    JSON.stringify({ error: { code: 'internal', message: 'An internal server error occurred' } }),
    { status: 500, headers: { 'Content-Type': 'application/json' } }
  );
}
```

### Strategia obsługi błędów

1. **Early returns**
   - Sprawdzenie autoryzacji na początku funkcji
   - Zwrócenie błędu natychmiast, jeśli autoryzacja nie powiodła się
   - Unikanie zagnieżdżonych if-else

2. **Guard clauses**
   - Sprawdzenie warunków wstępnych (token, użytkownik)
   - Zwrócenie błędu, jeśli warunki nie są spełnione
   - Kontynuacja tylko w przypadku spełnienia warunków

3. **Logowanie błędów**
   - Logowanie wszystkich błędów (401, 404, 500)
   - Brak logowania danych wrażliwych (PII)
   - Używanie strukturalnego logowania (JSON)

4. **Komunikaty błędów**
   - Komunikaty błędów są przyjazne dla użytkownika
   - Komunikaty błędów są zlokalizowane (Accept-Language)
   - Komunikaty błędów nie ujawniają szczegółów implementacji

---

## 8. Rozważania dotyczące wydajności

### Optymalizacje

1. **Indeksy bazy danych**
   - Indeks `profiles_user_id_idx` na kolumnie `user_id`
   - Indeks jest używany przez RLS do szybkiego wyszukiwania
   - Zapytanie jest zoptymalizowane do pojedynczego wiersza (`.single()`)

2. **Pojedyncze zapytanie**
   - Endpoint wykonuje tylko jedno zapytanie do bazy danych
   - Brak N+1 queries
   - Brak zbędnych zapytań

3. **Cache (opcjonalnie)**
   - Endpoint może używać cache HTTP (ETag, Last-Modified)
   - Cache jest opcjonalny (nie wymagany dla MVP)
   - Cache może być dodany w przyszłości

4. **Connection pooling**
   - Supabase automatycznie zarządza poolowaniem połączeń
   - Brak potrzeby ręcznego zarządzania połączeniami

### Potencjalne wąskie gardła

1. **Baza danych**
   - Wąskie gardło: połączenie z bazą danych
   - Rozwiązanie: connection pooling (automatycznie przez Supabase)
   - Monitorowanie: czas odpowiedzi bazy danych

2. **Autoryzacja**
   - Wąskie gardło: weryfikacja tokenu JWT
   - Rozwiązanie: cache tokenów (opcjonalnie)
   - Monitorowanie: czas weryfikacji tokenu

3. **Serializacja JSON**
   - Wąskie gardło: serializacja odpowiedzi
   - Rozwiązanie: minimalna serializacja (tylko potrzebne pola)
   - Monitorowanie: czas serializacji

### Metryki wydajności

1. **Czas odpowiedzi**
   - Cel: < 100ms (p95)
   - Monitorowanie: czas od żądania do odpowiedzi
   - Alerty: jeśli czas odpowiedzi > 500ms

2. **Throughput**
   - Cel: 1000 req/s (na serwer)
   - Monitorowanie: liczba żądań na sekundę
   - Alerty: jeśli throughput < 100 req/s

3. **Błędy**
   - Cel: < 1% błędów
   - Monitorowanie: procent błędów (401, 404, 500)
   - Alerty: jeśli procent błędów > 5%

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

### Krok 2: Utworzenie serwisu profilu

1. Utworzenie pliku `src/lib/services/profile.service.ts`:
   - Funkcja `getProfileByUserId(userId: string)`
   - Obsługa błędów bazy danych
   - Mapowanie `DbProfileRow` → `ProfileDto`

2. **Implementacja serwisu:**
   ```typescript
   // src/lib/services/profile.service.ts
   import type { SupabaseClient } from '../db/supabase.client.ts';
   import type { Database } from '../db/database.types.ts';
   import type { ProfileDto } from '../../types.ts';
   import type { Tables } from '../db/database.types.ts';

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
  ```

### Krok 3: Utworzenie helpera autoryzacji

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

### Krok 4: Utworzenie helpera odpowiedzi API

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

### Krok 5: Implementacja endpointu API

1. Utworzenie pliku `src/pages/api/v1/me/profile.ts`:
   - Handler `GET`
   - Weryfikacja autoryzacji
   - Wywołanie serwisu
   - Zwrócenie odpowiedzi

2. **Implementacja endpointu:**
   ```typescript
   // src/pages/api/v1/me/profile.ts
   import type { APIRoute } from 'astro';
   import { getAuthenticatedUser } from '../../../lib/auth/helpers.ts';
   import { getProfileByUserId } from '../../../lib/services/profile.service.ts';
   import { jsonResponse, errorResponse } from '../../../lib/api/response.ts';

   export const prerender = false;

   export const GET: APIRoute = async ({ locals }) => {
     // 1. Authentication check
     const user = await getAuthenticatedUser(locals.supabase);
     if (!user) {
       return errorResponse(
         { code: 'unauthorized', message: 'Missing or invalid authentication token' },
         401
       );
     }

     // 2. Get profile
     try {
       const profile = await getProfileByUserId(locals.supabase, user.id);
       
       if (!profile) {
         return errorResponse(
           { code: 'not_found', message: 'Profile not found' },
           404
         );
       }

       return jsonResponse(profile, 200);
     } catch (error) {
       console.error('Error fetching profile:', error);
       return errorResponse(
         { code: 'internal', message: 'An internal server error occurred' },
         500
       );
     }
   };
   ```

### Krok 6: Testy jednostkowe (opcjonalnie)

1. Utworzenie testów dla serwisu:
   - Test: pobranie profilu istniejącego użytkownika
   - Test: pobranie profilu nieistniejącego użytkownika
   - Test: obsługa błędów bazy danych

2. Utworzenie testów dla endpointu:
   - Test: sukces (200 OK)
   - Test: brak autoryzacji (401)
   - Test: profil nie istnieje (404)
   - Test: błąd bazy danych (500)

### Krok 7: Testy integracyjne (opcjonalnie)

1. Testy E2E z Playwright:
   - Test: pobranie profilu z prawidłowym tokenem
   - Test: pobranie profilu z nieprawidłowym tokenem
   - Test: pobranie profilu bez tokenu
   - Test: pobranie profilu, który nie istnieje
 

### Krok 9: Code review

1. Przegląd kodu:
   - Sprawdzenie zgodności z zasadami kodowania
   - Sprawdzenie obsługi błędów
   - Sprawdzenie bezpieczeństwa
   - Sprawdzenie wydajności

### Krok 10: Wdrożenie

1. Wdrożenie na środowisko deweloperskie
2. Testy na środowisku deweloperskim
3. Wdrożenie na środowisko produkcyjne
4. Monitorowanie błędów i wydajności

---

## 10. Podsumowanie

### Kluczowe punkty implementacji

1. **Autoryzacja:** Endpoint wymaga Bearer JWT token i weryfikuje użytkownika przez Supabase Auth
2. **RLS:** Row Level Security zapewnia, że użytkownik widzi tylko swój własny profil
3. **Obsługa błędów:** Endpoint obsługuje 401 (unauthorized), 404 (not_found), 500 (internal)
4. **Wydajność:** Endpoint używa indeksów bazy danych i wykonuje tylko jedno zapytanie
5. **Bezpieczeństwo:** Endpoint jest chroniony przez RLS i nie wymaga walidacji danych wejściowych

### Zależności

- **Supabase Client:** Dostępny przez `context.locals.supabase`
- **Typy:** `ProfileDto`, `ApiError` z `src/types.ts`
- **Baza danych:** Tabela `profiles` z RLS włączonym
- **Middleware:** Astro middleware dodaje Supabase client do context.locals

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
GET /v1/me/profile HTTP/1.1
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
ETag: "abc123def456"
Last-Modified: Wed, 02 Jan 2025 09:00:12 GMT

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
    "message": "Profile not found"
  }
}
```

---

*Plan wdrożenia utworzony: 2025-01-15*
*Wersja: 1.0*
*Autor: AI Assistant*

