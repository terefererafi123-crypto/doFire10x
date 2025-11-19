# Diagram architektury autentykacji - DoFIRE

<authentication_analysis>

## Analiza wymagań autentykacji

### 1. Przepływy autentykacji wymienione w dokumentacji

Na podstawie analizy PRD (US-001, US-007) oraz auth-spec.md zidentyfikowano następujące przepływy:

1. **Rejestracja użytkownika** (US-007)
   - Formularz: email, hasło, potwierdzenie hasła
   - Metoda: `signUp()` z Supabase Auth
   - Automatyczne logowanie po rejestracji
   - Redirect do onboarding lub dashboard

2. **Logowanie użytkownika** (US-001, US-007)
   - Formularz: email, hasło
   - Metoda: `signInWithPassword()` z Supabase Auth
   - Trwała sesja (persistSession: true)
   - Redirect do dashboard

3. **Odzyskiwanie hasła** (US-007)
   - Formularz: email
   - Metoda: `resetPasswordForEmail()` z Supabase Auth
   - Wysyłka email z linkiem resetującym
   - Token w hash fragment URL

4. **Resetowanie hasła** (US-007)
   - Formularz: nowe hasło, potwierdzenie hasła
   - Metoda: `updateUser({ password })` z Supabase Auth
   - Weryfikacja tokenu z URL
   - Automatyczne logowanie po resetowaniu

5. **Weryfikacja sesji** (US-001)
   - Middleware sprawdza token z Authorization header
   - Weryfikacja przez Supabase Auth
   - Obsługa błędów 401/403

6. **Odświeżanie tokenu** (US-001)
   - Automatyczne odświeżanie przed wygaśnięciem
   - autoRefreshToken: true
   - Sesja utrzymuje się między odświeżeniami

7. **Wylogowanie** (US-007)
   - Metoda: `signOut()` z Supabase Auth
   - Usunięcie sesji z localStorage
   - Redirect do login

8. **Dostęp do chronionych zasobów** (US-002, US-003, US-004, US-005)
   - Weryfikacja tokenu w middleware
   - Przekazanie tokenu do endpointów API
   - Row Level Security (RLS) w Supabase

### 2. Główni aktorzy i ich interakcje

**Aktorzy:**
1. **Przeglądarka (Browser)** - Frontend React/Astro
   - Wysyła żądania autentykacji
   - Przechowuje sesję w localStorage
   - Obsługuje redirecty i komunikaty błędów

2. **Middleware (Astro)** - Warstwa pośrednia
   - Przechwytuje wszystkie żądania
   - Tworzy Supabase client z tokenem z Authorization header
   - Przekazuje client do context.locals.supabase

3. **Astro API** - Endpointy backendowe
   - Weryfikują autentykację przez getAuthenticatedUser()
   - Zwracają dane lub błędy 401/403
   - Komunikują się z Supabase przez locals.supabase

4. **Supabase Auth** - Serwis autentykacji
   - Weryfikuje dane logowania/rejestracji
   - Generuje tokeny JWT
   - Zarządza sesjami i odświeżaniem tokenów
   - Wysyła emaile resetujące hasło

### 3. Procesy weryfikacji i odświeżania tokenów

**Weryfikacja tokenu:**
1. Przeglądarka wysyła żądanie z Authorization header (Bearer token)
2. Middleware przechwytuje żądanie i tworzy Supabase client z tokenem
3. Endpoint API używa getAuthenticatedUser() do weryfikacji
4. Supabase Auth weryfikuje token JWT
5. Jeśli token prawidłowy → zwraca dane użytkownika
6. Jeśli token nieprawidłowy/wygasły → zwraca 401/403

**Odświeżanie tokenu:**
1. Supabase client automatycznie wykrywa zbliżające się wygaśnięcie tokenu
2. Przed wygaśnięciem wysyła żądanie odświeżenia do Supabase Auth
3. Supabase Auth weryfikuje refresh token
4. Zwraca nowy access token i refresh token
5. Sesja jest aktualizowana w localStorage
6. Użytkownik pozostaje zalogowany bez przerwy

### 4. Opis kroków autentykacji

**Rejestracja:**
1. Użytkownik wypełnia formularz rejestracji (email, hasło, potwierdzenie)
2. Przeglądarka waliduje dane po stronie klienta
3. Wywołanie signUp() z Supabase Auth
4. Supabase Auth tworzy konto i haszuje hasło
5. Automatyczne logowanie (sesja tworzona)
6. Sesja zapisywana w localStorage
7. Sprawdzenie profilu użytkownika
8. Redirect do onboarding (brak profilu) lub dashboard

**Logowanie:**
1. Użytkownik wypełnia formularz logowania (email, hasło)
2. Przeglądarka waliduje dane
3. Wywołanie signInWithPassword() z Supabase Auth
4. Supabase Auth weryfikuje dane logowania
5. Jeśli prawidłowe → generuje tokeny JWT (access + refresh)
6. Sesja zapisywana w localStorage (persistSession: true)
7. Sprawdzenie profilu użytkownika
8. Redirect do dashboard

**Odzyskiwanie hasła:**
1. Użytkownik wypełnia formularz (email)
2. Wywołanie resetPasswordForEmail() z Supabase Auth
3. Supabase Auth generuje token resetujący
4. Email z linkiem resetującym wysyłany do użytkownika
5. Link zawiera token w hash fragment

**Resetowanie hasła:**
1. Użytkownik klika link w emailu
2. Przeglądarka przekierowuje do /reset-password z tokenem w URL
3. Supabase automatycznie parsuje token z hash fragment
4. Użytkownik wypełnia formularz (nowe hasło, potwierdzenie)
5. Wywołanie updateUser({ password }) z Supabase Auth
6. Supabase Auth weryfikuje token i aktualizuje hasło
7. Automatyczne logowanie
8. Redirect do dashboard

**Weryfikacja sesji w middleware:**
1. Przeglądarka wysyła żądanie z Authorization header
2. Middleware przechwytuje żądanie
3. Tworzy Supabase client z tokenem z header
4. Przekazuje client do context.locals.supabase
5. Endpoint API używa locals.supabase do weryfikacji
6. Jeśli token prawidłowy → przetwarzanie żądania
7. Jeśli token nieprawidłowy → zwraca 401/403

**Dostęp do chronionych zasobów:**
1. Przeglądarka pobiera token z localStorage
2. Wysyła żądanie z Authorization: Bearer token
3. Middleware weryfikuje token
4. Endpoint API sprawdza autentykację
5. Jeśli zalogowany → zwraca dane
6. Jeśli niezalogowany → zwraca 401 z komunikatem "Zaloguj ponownie"

</authentication_analysis>

<mermaid_diagram>

```mermaid
sequenceDiagram
    autonumber
    
    participant Browser as Przeglądarka
    participant Middleware as Middleware Astro
    participant API as Astro API
    participant Supabase as Supabase Auth
    
    Note over Browser,Supabase: Przepływ rejestracji użytkownika
    
    Browser->>Supabase: signUp(email, password)
    activate Supabase
    Supabase->>Supabase: Weryfikacja danych<br/>Hashowanie hasła
    alt Rejestracja udana
        Supabase-->>Browser: Session + JWT tokens
        activate Browser
        Browser->>Browser: Zapis sesji w localStorage
        Browser->>API: GET /api/v1/me/profile<br/>Authorization: Bearer token
        activate API
        API->>Middleware: Przekazanie żądania
        activate Middleware
        Middleware->>Middleware: Utworzenie Supabase client<br/>z tokenem z header
        Middleware->>API: context.locals.supabase
        deactivate Middleware
        API->>Supabase: Weryfikacja tokenu
        Supabase-->>API: User data
        alt Profil istnieje
            API-->>Browser: Profile data
            Browser->>Browser: Redirect do /dashboard
        else Brak profilu
            API-->>Browser: 404 Profile not found
            Browser->>Browser: Redirect do /onboarding
        end
        deactivate API
    else Błąd rejestracji
        Supabase-->>Browser: Error (User exists,<br/>Weak password, etc.)
        Browser->>Browser: Wyświetlenie komunikatu błędu
    end
    deactivate Supabase
    deactivate Browser
    
    Note over Browser,Supabase: Przepływ logowania użytkownika
    
    Browser->>Supabase: signInWithPassword(email, password)
    activate Supabase
    Supabase->>Supabase: Weryfikacja danych logowania
    alt Logowanie udane
        Supabase-->>Browser: Session + JWT tokens<br/>(access + refresh)
        activate Browser
        Browser->>Browser: Zapis sesji w localStorage<br/>(persistSession: true)
        Browser->>API: GET /api/v1/me/profile<br/>Authorization: Bearer token
        activate API
        API->>Middleware: Przekazanie żądania
        activate Middleware
        Middleware->>Middleware: Utworzenie Supabase client<br/>z tokenem z header
        Middleware->>API: context.locals.supabase
        deactivate Middleware
        API->>Supabase: Weryfikacja tokenu
        Supabase-->>API: User data
        API-->>Browser: Profile data
        Browser->>Browser: Redirect do /dashboard
        deactivate API
    else Błąd logowania
        Supabase-->>Browser: Error (Invalid credentials,<br/>Email not confirmed, etc.)
        Browser->>Browser: Wyświetlenie komunikatu błędu
    end
    deactivate Supabase
    deactivate Browser
    
    Note over Browser,Supabase: Przepływ odzyskiwania hasła
    
    Browser->>Supabase: resetPasswordForEmail(email)
    activate Supabase
    Supabase->>Supabase: Generowanie tokenu resetującego
    Supabase->>Supabase: Wysyłka email z linkiem
    Supabase-->>Browser: Success (email wysłany)
    Browser->>Browser: Komunikat "Sprawdź email"
    deactivate Supabase
    
    Note over Browser,Supabase: Przepływ resetowania hasła
    
    Browser->>Browser: Kliknięcie linku w emailu<br/>Redirect do /reset-password#token
    Browser->>Browser: Parsowanie tokenu z hash fragment
    Browser->>Supabase: updateUser({ password: newPassword })
    activate Supabase
    Supabase->>Supabase: Weryfikacja tokenu resetującego
    alt Token prawidłowy
        Supabase->>Supabase: Aktualizacja hasła
        Supabase-->>Browser: Session + JWT tokens
        activate Browser
        Browser->>Browser: Zapis sesji w localStorage
        Browser->>Browser: Redirect do /dashboard
        deactivate Browser
    else Token nieprawidłowy/wygasły
        Supabase-->>Browser: Error (Invalid token,<br/>Session expired)
        Browser->>Browser: Wyświetlenie komunikatu błędu
    end
    deactivate Supabase
    
    Note over Browser,Supabase: Przepływ weryfikacji sesji i dostępu do zasobów
    
    Browser->>Browser: Pobranie tokenu z localStorage
    Browser->>API: GET /api/v1/investments<br/>Authorization: Bearer token
    activate API
    API->>Middleware: Przekazanie żądania
    activate Middleware
    Middleware->>Middleware: Utworzenie Supabase client<br/>z tokenem z Authorization header
    Middleware->>API: context.locals.supabase
    deactivate Middleware
    API->>Supabase: Weryfikacja tokenu JWT
    activate Supabase
    alt Token prawidłowy
        Supabase-->>API: User data (user_id, roles)
        API->>Supabase: Query do bazy danych<br/>(z RLS)
        Supabase-->>API: Investment data
        API-->>Browser: 200 OK + Data
        deactivate API
    else Token nieprawidłowy/wygasły
        Supabase-->>API: Error (Invalid token)
        API-->>Browser: 401 Unauthorized<br/>"Zaloguj ponownie"
        Browser->>Browser: Wyświetlenie komunikatu błędu
        Browser->>Browser: Redirect do /login
        deactivate API
    end
    deactivate Supabase
    
    Note over Browser,Supabase: Przepływ automatycznego odświeżania tokenu
    
    Browser->>Browser: Wykrycie zbliżającego się<br/>wygaśnięcia tokenu
    Browser->>Supabase: refreshSession()
    activate Supabase
    Supabase->>Supabase: Weryfikacja refresh token
    alt Refresh token prawidłowy
        Supabase-->>Browser: Nowy access token<br/>+ refresh token
        Browser->>Browser: Aktualizacja sesji<br/>w localStorage
        Browser->>Browser: Kontynuacja sesji<br/>bez przerwy
    else Refresh token nieprawidłowy
        Supabase-->>Browser: Error (Session expired)
        Browser->>Browser: Wylogowanie użytkownika
        Browser->>Browser: Redirect do /login
    end
    deactivate Supabase
    
    Note over Browser,Supabase: Przepływ wylogowania
    
    Browser->>Supabase: signOut()
    activate Supabase
    Supabase->>Supabase: Unieważnienie tokenów
    Supabase-->>Browser: Success
    Browser->>Browser: Usunięcie sesji<br/>z localStorage
    Browser->>Browser: Redirect do /login
    deactivate Supabase
    
    Note over Browser,Supabase: Obsługa błędów 401/403 w endpointach API
    
    Browser->>API: GET /api/v1/investments<br/>Brak tokenu lub nieprawidłowy token
    activate API
    API->>Middleware: Przekazanie żądania
    activate Middleware
    Middleware->>Middleware: Utworzenie Supabase client<br/>bez tokenu lub z nieprawidłowym tokenem
    Middleware->>API: context.locals.supabase
    deactivate Middleware
    API->>Supabase: Weryfikacja tokenu
    activate Supabase
    Supabase-->>API: Error (Invalid token)
    deactivate Supabase
    API->>API: getAuthenticatedUser()<br/>zwraca null
    API-->>Browser: 401 Unauthorized<br/>"Zaloguj ponownie"
    Browser->>Browser: Wyświetlenie komunikatu błędu
    Browser->>Browser: Redirect do /login
    deactivate API

```

</mermaid_diagram>

## Opis diagramu

Diagram przedstawia kompleksowy przepływ autentykacji w aplikacji DoFIRE, obejmujący:

1. **Rejestrację użytkownika** - proces tworzenia konta z automatycznym logowaniem
2. **Logowanie użytkownika** - uwierzytelnianie z trwałą sesją
3. **Odzyskiwanie hasła** - wysyłka email z linkiem resetującym
4. **Resetowanie hasła** - aktualizacja hasła z weryfikacją tokenu
5. **Weryfikację sesji** - sprawdzanie autentykacji przy dostępie do zasobów
6. **Automatyczne odświeżanie tokenu** - utrzymanie sesji bez przerwy
7. **Wylogowanie** - zakończenie sesji i czyszczenie danych
8. **Obsługę błędów** - komunikaty 401/403 i przekierowania

Diagram pokazuje interakcje między czterema głównymi aktorami:
- **Przeglądarka** - frontend React/Astro zarządzający sesją w localStorage
- **Middleware Astro** - warstwa pośrednia tworząca Supabase client z tokenem
- **Astro API** - endpointy backendowe weryfikujące autentykację
- **Supabase Auth** - serwis autentykacji zarządzający tokenami i sesjami

Wszystkie przepływy uwzględniają obsługę błędów, walidację danych i zgodność z wymaganiami US-001 i US-007 z dokumentu PRD.

