# API Endpoint Implementation Plan: GET `/v1/auth/session`

## 1. Przegląd punktu końcowego

Endpoint `GET /v1/auth/session` jest prostym endpointem "echo", który weryfikuje ważność tokenu JWT Supabase i zwraca podstawowe informacje o sesji użytkownika: identyfikator użytkownika, role oraz czas wystawienia tokenu (iat - issued at). Endpoint służy do weryfikacji autoryzacji i sprawdzania stanu sesji użytkownika.

**Główne funkcjonalności:**

- Weryfikacja ważności tokenu JWT Supabase
- Ekstrakcja danych użytkownika z tokenu (user_id, roles, iat)
- Zwrócenie informacji o sesji w formacie JSON
- Obsługa błędów autoryzacji (401 unauthorized)

**Uwaga:** Endpoint nie wykonuje zapytań do bazy danych - wszystkie dane pochodzą z tokenu JWT. Logowanie odbywa się po stronie klienta przez Supabase magic link, a backend jedynie weryfikuje token.

## 2. Szczegóły żądania

- **Metoda HTTP:** `GET`
- **Struktura URL:** `/v1/auth/session`
- **Parametry:** Brak parametrów query string
- **Request Body:** Brak
- **Nagłówki:**
  - `Authorization: Bearer <Supabase-JWT>` (wymagane)
  - `X-Request-Id: <uuid>` (opcjonalne, dla korelacji logów)

## 3. Wykorzystywane typy

### 3.1. DTOs (Data Transfer Objects)

**`AuthSessionDto`** (z `src/types.ts`):

```typescript
export interface AuthSessionDto {
  user_id: string;
  roles: string[];
  iat: number;
}
```

### 3.2. Command Modele

Brak - endpoint jest tylko do odczytu (GET) i nie przyjmuje danych wejściowych.

### 3.3. Typy pomocnicze

**Supabase User:**

```typescript
import type { User } from "@supabase/supabase-js";
```

**JWT Payload (wewnętrzny):**

```typescript
interface JWTPayload {
  sub: string; // user_id
  role: string; // 'authenticated' | 'anon'
  iat: number; // issued at timestamp
  exp: number; // expiration timestamp
  // ... inne pola JWT
}
```

## 4. Szczegóły odpowiedzi

### 4.1. Sukces (200 OK)

**Struktura odpowiedzi:**

```json
{
  "user_id": "3b9c1234-5678-90ab-cdef-1234567890ab",
  "roles": ["authenticated"],
  "iat": 1731172800
}
```

**Opis pól:**

- `user_id` (string, UUID): Identyfikator użytkownika z tokenu JWT (pole `sub`)
- `roles` (string[]): Tablica ról użytkownika, zwykle zawiera `["authenticated"]` dla zalogowanych użytkowników
- `iat` (number): Timestamp Unix (sekundy) czasu wystawienia tokenu (issued at)

**Content-Type:** `application/json`

### 4.2. Błędy

#### 401 Unauthorized

**Przyczyny:**

- Brak nagłówka `Authorization`
- Nieprawidłowy format tokenu (nie zaczyna się od "Bearer ")
- Nieprawidłowy lub wygasły token JWT
- Token nie został wystawiony przez Supabase
- Użytkownik nie jest zalogowany

**Struktura odpowiedzi:**

```json
{
  "error": {
    "code": "unauthorized",
    "message": "Missing or invalid authentication token"
  }
}
```

**Content-Type:** `application/json`

## 5. Przepływ danych

### 5.1. Diagram przepływu

```
Client Request
    │
    ├─► [Middleware] Extract Authorization header
    │
    ├─► [Route Handler] GET /v1/auth/session
    │       │
    │       ├─► [Auth Service] Verify JWT token
    │       │       │
    │       │       ├─► [Supabase Client] Get user from token
    │       │       │
    │       │       └─► Return User object or null
    │       │
    │       ├─► [Validation] Check if user exists
    │       │
    │       ├─► [Mapping] Extract user_id, roles, iat from JWT
    │       │
    │       └─► [Response] Return AuthSessionDto (200) or Error (401)
    │
    └─► Client receives response
```

### 5.2. Szczegółowy przepływ

1. **Odebranie żądania:**
   - Middleware Astro przechwytuje żądanie
   - Supabase client jest dostępny w `context.locals.supabase`

2. **Weryfikacja autoryzacji:**
   - Odczyt nagłówka `Authorization`
   - Wyodrębnienie tokenu JWT (po "Bearer ")
   - Weryfikacja tokenu przez Supabase client (`supabase.auth.getUser()`)
   - Jeśli token jest nieprawidłowy lub wygasły, zwróć 401

3. **Ekstrakcja danych z tokenu:**
   - Pobranie obiektu `User` z Supabase
   - Odczyt `user.id` jako `user_id`
   - Odczyt `user.role` i konwersja na tablicę `roles`
   - Odczyt `iat` z payloadu JWT (jeśli dostępny) lub użycie aktualnego czasu

4. **Mapowanie do DTO:**
   - Utworzenie obiektu `AuthSessionDto` z wyekstrahowanych danych
   - Walidacja struktury DTO

5. **Zwrócenie odpowiedzi:**
   - Sukces: 200 OK z `AuthSessionDto`
   - Błąd: 401 Unauthorized z `ApiError`

### 5.3. Interakcje z zewnętrznymi usługami

- **Supabase Auth:** Weryfikacja tokenu JWT i pobranie danych użytkownika
- **Brak interakcji z bazą danych:** Endpoint nie wykonuje zapytań SQL - wszystkie dane pochodzą z tokenu

## 6. Względy bezpieczeństwa

### 6.1. Uwierzytelnianie

- **Wymagany token JWT:** Endpoint wymaga ważnego tokenu JWT Supabase w nagłówku `Authorization`
- **Format tokenu:** Token musi być w formacie `Bearer <token>`
- **Weryfikacja tokenu:** Token jest weryfikowany przez Supabase client, który sprawdza:
  - Podpis tokenu
  - Datę wygaśnięcia (exp)
  - Wystawcę tokenu (iss)
  - Odbiorcę tokenu (aud)

### 6.2. Autoryzacja

- **Rola użytkownika:** Endpoint zwraca role użytkownika z tokenu
- **Brak dodatkowej autoryzacji:** Endpoint nie sprawdza uprawnień do konkretnych zasobów - tylko weryfikuje ważność sesji
- **RLS nie dotyczy:** Endpoint nie wykonuje zapytań do bazy danych, więc RLS nie jest istotne

### 6.3. Walidacja danych

- **Walidacja tokenu:** Token jest walidowany przez Supabase SDK
- **Walidacja struktury odpowiedzi:** DTO jest walidowany przed zwróceniem
- **Brak walidacji danych wejściowych:** Endpoint nie przyjmuje danych wejściowych

### 6.4. Potencjalne zagrożenia

1. **Token hijacking:**
   - **Ryzyko:** Przechwycenie tokenu przez atakującego
   - **Mitigacja:** Używanie HTTPS dla wszystkich żądań, krótki czas życia tokenu

2. **Token replay:**
   - **Ryzyko:** Ponowne użycie wygasłego tokenu
   - **Mitigacja:** Supabase automatycznie weryfikuje datę wygaśnięcia tokenu

3. **Information disclosure:**
   - **Ryzyko:** Ujawnienie user_id w odpowiedzi
   - **Mitigacja:** user_id jest już znany użytkownikowi (z tokenu), więc nie stanowi dodatkowego ryzyka

4. **Missing token:**
   - **Ryzyko:** Brak obsługi przypadku braku tokenu
   - **Mitigacja:** Zwracanie 401 z czytelnym komunikatem błędu

## 7. Obsługa błędów

### 7.1. Scenariusze błędów

| Scenariusz                   | Kod statusu | Komunikat błędu                           | Logowanie |
| ---------------------------- | ----------- | ----------------------------------------- | --------- |
| Brak nagłówka Authorization  | 401         | "Missing or invalid authentication token" | WARN      |
| Nieprawidłowy format tokenu  | 401         | "Missing or invalid authentication token" | WARN      |
| Nieprawidłowy token JWT      | 401         | "Missing or invalid authentication token" | WARN      |
| Wygasły token                | 401         | "Missing or invalid authentication token" | WARN      |
| Błąd weryfikacji Supabase    | 401         | "Missing or invalid authentication token" | ERROR     |
| Błąd parsowania JWT          | 401         | "Missing or invalid authentication token" | ERROR     |
| Błąd serwera (nieoczekiwany) | 500         | "Internal server error"                   | ERROR     |

### 7.2. Struktura błędów

Wszystkie błędy zwracają strukturę zgodną z `ApiError` z `src/types.ts`:

```typescript
{
  error: {
    code: "unauthorized" | "internal",
    message: string
  }
}
```

### 7.3. Logowanie błędów

- **Poziom WARN:** Brak tokenu, nieprawidłowy format tokenu
- **Poziom ERROR:** Błędy weryfikacji Supabase, błędy parsowania JWT, nieoczekiwane błędy serwera
- **Informacje do logowania:**
  - Request ID (jeśli dostępny w nagłówku `X-Request-Id`)
  - IP adres klienta
  - Typ błędu
  - Komunikat błędu (bez wrażliwych danych)

### 7.4. Rejestrowanie błędów w bazie danych

**Nie dotyczy** - endpoint nie loguje błędów do tabeli błędów w bazie danych. Błędy są logowane tylko do systemu logowania aplikacji (console/logging service).

## 8. Rozważania dotyczące wydajności

### 8.1. Optymalizacje

- **Brak zapytań do bazy danych:** Endpoint nie wykonuje zapytań SQL, co znacznie poprawia wydajność
- **Cache tokenu:** Supabase client może cache'ować wyniki weryfikacji tokenu (jeśli skonfigurowane)
- **Minimalne przetwarzanie:** Endpoint wykonuje tylko ekstrakcję danych z tokenu i mapowanie do DTO

### 8.2. Potencjalne wąskie gardła

1. **Weryfikacja tokenu przez Supabase:**
   - **Ryzyko:** Każde żądanie wymaga weryfikacji tokenu
   - **Mitigacja:** Supabase SDK optymalizuje weryfikację tokenu lokalnie (bez zapytań do serwera)

2. **Parsowanie JWT:**
   - **Ryzyko:** Parsowanie dużych tokenów może być kosztowne
   - **Mitigacja:** Tokeny Supabase są zwięzłe, parsowanie jest szybkie

### 8.3. Skalowalność

- **Stateless:** Endpoint jest bezstanowy, co ułatwia skalowanie poziome
- **Brak zależności od bazy danych:** Endpoint nie obciąża bazy danych
- **Niskie zużycie zasobów:** Endpoint wymaga minimalnych zasobów serwera

## 9. Etapy wdrożenia

### 9.1. Przygotowanie

1. **Utworzenie struktury katalogów:**
   - Upewnij się, że katalog `src/pages/api/v1/auth/` istnieje
   - Utworzenie pliku `src/pages/api/v1/auth/session.ts` (lub `.astro`)

2. **Weryfikacja zależności:**
   - Sprawdź, czy `@supabase/supabase-js` jest zainstalowany
   - Sprawdź, czy typy w `src/types.ts` zawierają `AuthSessionDto`

### 9.2. Implementacja endpointu

1. **Utworzenie pliku endpointu:**
   - Utworzenie `src/pages/api/v1/auth/session.ts` (Astro Server Endpoint)
   - Dodanie `export const prerender = false` dla API route

2. **Implementacja handlera GET:**

   ```typescript
   export async function GET(context: APIContext) {
     // Implementacja weryfikacji tokenu i zwrócenia danych sesji
   }
   ```

3. **Weryfikacja autoryzacji:**
   - Odczyt nagłówka `Authorization`
   - Wyodrębnienie tokenu JWT
   - Weryfikacja tokenu przez `context.locals.supabase.auth.getUser()`
   - Obsługa przypadku braku/nieprawidłowego tokenu (401)

4. **Ekstrakcja danych z tokenu:**
   - Pobranie `user.id` jako `user_id`
   - Pobranie `user.role` i konwersja na tablicę `roles`
   - Pobranie `iat` z payloadu JWT (jeśli dostępny)

5. **Mapowanie do DTO:**
   - Utworzenie obiektu `AuthSessionDto`
   - Zwrócenie odpowiedzi 200 OK z DTO

### 9.3. Obsługa błędów

1. **Implementacja obsługi błędów:**
   - Obsługa przypadku braku tokenu (401)
   - Obsługa przypadku nieprawidłowego tokenu (401)
   - Obsługa nieoczekiwanych błędów (500)

2. **Logowanie błędów:**
   - Dodanie logowania błędów na odpowiednich poziomach (WARN/ERROR)
   - Uwzględnienie Request ID w logach (jeśli dostępny)

### 9.4. Walidacja i testy

1. **Walidacja TypeScript:**
   - Sprawdzenie, czy kod kompiluje się bez błędów
   - Weryfikacja zgodności typów z `AuthSessionDto`

2. **Testy manualne:**
   - Test z prawidłowym tokenem (200 OK)
   - Test bez tokenu (401)
   - Test z nieprawidłowym tokenem (401)
   - Test z wygasłym tokenem (401)

3. **Testy automatyczne (opcjonalne):**
   - Testy jednostkowe dla funkcji ekstrakcji danych z tokenu
   - Testy integracyjne dla endpointu (z mock Supabase client)

### 9.5. Dokumentacja

1. **Aktualizacja dokumentacji API:**
   - Weryfikacja, czy endpoint jest udokumentowany w `api-plan.md`
   - Aktualizacja przykładów użycia (jeśli potrzebne)

2. **Komentarze w kodzie:**
   - Dodanie komentarzy wyjaśniających logikę weryfikacji tokenu
   - Dokumentacja obsługi błędów

### 9.6. Weryfikacja końcowa

1. **Sprawdzenie zgodności ze specyfikacją:**
   - Weryfikacja struktury odpowiedzi (zgodność z `AuthSessionDto`)
   - Weryfikacja kodów statusu (200, 401)
   - Weryfikacja komunikatów błędów

2. **Sprawdzenie zgodności z regułami implementacji:**
   - Użycie `context.locals.supabase` zamiast importu bezpośredniego
   - Użycie uppercase dla handlera GET
   - Użycie `export const prerender = false`
   - Obsługa błędów na początku funkcji (early returns)
   - Właściwe logowanie błędów

3. **Sprawdzenie bezpieczeństwa:**
   - Weryfikacja, że endpoint wymaga autoryzacji
   - Weryfikacja, że nieprawidłowe tokeny są odrzucane
   - Weryfikacja, że wrażliwe dane nie są ujawniane w błędach

## 10. Przykładowa implementacja

### 10.1. Struktura pliku

```typescript
// src/pages/api/v1/auth/session.ts
import type { APIContext } from "astro";
import type { AuthSessionDto } from "../../../types";

export const prerender = false;

export async function GET(context: APIContext): Promise<Response> {
  // Early return dla braku autoryzacji
  const authHeader = context.request.headers.get("Authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return new Response(
      JSON.stringify({
        error: {
          code: "unauthorized",
          message: "Missing or invalid authentication token",
        },
      }),
      {
        status: 401,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  try {
    // Weryfikacja tokenu przez Supabase
    // Uwaga: Aby zweryfikować token z nagłówka, możemy:
    // 1. Utworzyć nowy Supabase client z tokenem, lub
    // 2. Ustawić sesję w istniejącym client
    // Poniżej przykład z ustawieniem sesji:
    const supabase = context.locals.supabase;
    const token = authHeader.replace("Bearer ", "");

    // Ustawienie sesji z tokenem
    const {
      data: { session },
      error: sessionError,
    } = await supabase.auth.setSession({
      access_token: token,
      refresh_token: "", // Refresh token nie jest potrzebny dla weryfikacji
    });

    if (sessionError || !session || !session.user) {
      return new Response(
        JSON.stringify({
          error: {
            code: "unauthorized",
            message: "Missing or invalid authentication token",
          },
        }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Pobranie użytkownika z sesji
    const user = session.user;

    // Ekstrakcja danych z tokenu
    // Parsowanie JWT payload, aby uzyskać iat
    let iat: number;
    try {
      const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64").toString());
      iat = payload.iat || Math.floor(Date.now() / 1000);
    } catch {
      // Fallback do aktualnego czasu, jeśli parsowanie się nie powiedzie
      iat = Math.floor(Date.now() / 1000);
    }

    const sessionDto: AuthSessionDto = {
      user_id: user.id,
      roles: user.role ? [user.role] : ["authenticated"],
      iat: iat,
    };

    return new Response(JSON.stringify(sessionDto), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    // Logowanie nieoczekiwanych błędów
    console.error("Error in GET /v1/auth/session:", error);

    return new Response(
      JSON.stringify({
        error: {
          code: "internal",
          message: "Internal server error",
        },
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
```

### 10.2. Uwagi implementacyjne

1. **Weryfikacja tokenu - różne podejścia:**
   - **Opcja 1 (zalecana):** Utworzenie nowego Supabase client z tokenem:
     ```typescript
     import { createClient } from "@supabase/supabase-js";
     const supabaseWithToken = createClient(supabaseUrl, supabaseAnonKey, {
       global: { headers: { Authorization: `Bearer ${token}` } },
     });
     const {
       data: { user },
     } = await supabaseWithToken.auth.getUser();
     ```
   - **Opcja 2:** Użycie `setSession()` (może wymagać refresh token):
     ```typescript
     await supabase.auth.setSession({ access_token: token, refresh_token: "" });
     const {
       data: { user },
     } = await supabase.auth.getUser();
     ```
   - **Opcja 3:** Parsowanie i weryfikacja JWT bezpośrednio (wymaga biblioteki JWT):
     ```typescript
     import jwt from "jsonwebtoken";
     const payload = jwt.verify(token, supabaseJwtSecret);
     ```
   - **Uwaga:** Wybór metody zależy od wersji Supabase SDK i wymagań projektu. Sprawdź aktualną dokumentację Supabase.

2. **Parsowanie iat z JWT:**
   - Jeśli `iat` nie jest dostępny w obiekcie `user`, należy sparsować payload JWT
   - JWT składa się z trzech części oddzielonych kropkami: `header.payload.signature`
   - Payload można sparsować: `JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString())`
   - **Uwaga:** Parsowanie JWT bez weryfikacji podpisu jest bezpieczne tylko do odczytu danych (nie do weryfikacji autentyczności)

3. **Obsługa ról:**
   - Supabase zwraca `user.role` jako string, ale API wymaga tablicy
   - Domyślnie używamy `['authenticated']` jeśli rola nie jest dostępna
   - Rola może być również dostępna w payloadzie JWT jako `role` lub `user_role`

4. **Bezpieczeństwo weryfikacji tokenu:**
   - Zawsze weryfikuj token przez Supabase SDK lub bibliotekę JWT z kluczem publicznym
   - Nie ufaj tylko parsowaniu JWT bez weryfikacji podpisu
   - Supabase SDK automatycznie weryfikuje podpis i datę wygaśnięcia tokenu

## 11. Podsumowanie

Endpoint `GET /v1/auth/session` jest prostym endpointem weryfikacyjnym, który:

- Weryfikuje ważność tokenu JWT Supabase
- Zwraca podstawowe informacje o sesji użytkownika (user_id, roles, iat)
- Nie wykonuje zapytań do bazy danych
- Wymaga autoryzacji (Bearer token)
- Zwraca 200 OK dla prawidłowych tokenów i 401 Unauthorized dla nieprawidłowych

Implementacja powinna być prosta i wydajna, ponieważ endpoint nie wymaga interakcji z bazą danych ani złożonej logiki biznesowej.
