# Specyfikacja architektury modułu autentykacji - DoFIRE

## 1. Przegląd

Niniejsza specyfikacja opisuje architekturę modułu rejestracji, logowania i odzyskiwania hasła dla aplikacji DoFIRE, zgodnie z wymaganiami US-001 i US-007 z dokumentu PRD.

### 1.1 Uwagi dotyczące niespójności w PRD

**Wykryta sprzeczność #1 - Metoda autentykacji**: W dokumencie PRD istnieje sprzeczność między:

- Sekcją 3.1 (linia 37): "Logowanie przez Supabase magic link (bez haseł)"
- US-007 (linia 186): "Logowanie wymaga podania adresu email i hasła"

**Rozstrzygnięcie**: US-007 jest bardziej szczegółowym i aktualnym wymaganiem, które precyzuje metodę autentykacji. Niniejsza specyfikacja implementuje wymagania zgodnie z US-007 (email/hasło), ponieważ:

1. US-007 jest bardziej szczegółowy i zawiera pełną specyfikację procesu logowania
2. US-007 wymaga również rejestracji i odzyskiwania hasła, co nie jest możliwe z magic link
3. US-007 jest zgodny z wymaganiami bezpieczeństwa (hasła)

**Rekomendacja**: Sekcja 3.1 w PRD powinna zostać zaktualizowana do: "Logowanie przez Supabase email/hasło" w celu usunięcia sprzeczności.

**Wykryta niejasność #2 - Niepełny tekst w US-007**: W linii 189 PRD tekst jest ucięty: "Użytkownik może się wylogować z systemu poprzez przycisk w prawym górnym rogu w głównym" - brakuje zakończenia zdania.

**Rozstrzygnięcie**: Z kontekstu wynika, że chodzi o przycisk w prawym górnym rogu w głównym widoku/nawigacji. Niniejsza specyfikacja implementuje wylogowanie przez przycisk w `TopNav` (sekcja 2.2.5), co jest zgodne z intencją wymagania.

**Rekomendacja**: Linia 189 w PRD powinna zostać uzupełniona, np.: "Użytkownik może się wylogować z systemu poprzez przycisk w prawym górnym rogu w głównym widoku aplikacji."

### 1.2 Zakres zmian

- **Zmiana metody autentykacji**: Przejście z magic link (OTP) na autentykację email/hasło (zgodnie z US-007)
- **Nowe funkcjonalności**: Rejestracja użytkownika, odzyskiwanie hasła (zgodnie z US-007)
- **Aktualizacja interfejsu**: Rozszerzenie TopNav o przycisk logowania dla niezalogowanych użytkowników (zgodnie z US-007)
- **Zachowanie zgodności**: Wszystkie istniejące funkcjonalności (CRUD inwestycji, dashboard, obliczenia FIRE) pozostają niezmienione

### 1.3 Założenia techniczne

- Astro 5 z SSR (output: "server")
- Supabase Auth z metodą email/password
- React 19 dla komponentów interaktywnych
- TypeScript 5 dla typowania
- Shadcn/ui dla komponentów UI
- Trwała sesja (`persistSession: true`)

---

## 2. ARCHITEKTURA INTERFEJSU UŻYTKOWNIKA

### 2.1 Struktura stron Astro

#### 2.1.1 Strona logowania (`src/pages/login.astro`)

**Status**: Wymaga modyfikacji

**Obecna implementacja**:

- Używa magic link (OTP)
- Komponent `LoginForm` wysyła OTP email

**Zmiany wymagane**:

- Zastąpienie logiki magic link formularzem email/hasło
- Zachowanie obecnego layoutu i struktury
- Dodanie linku do rejestracji i odzyskiwania hasła

**Struktura**:

```astro
---
// Server-side: sprawdzenie czy użytkownik jest już zalogowany
// Jeśli tak → redirect do /dashboard
import Layout from "../layouts/Layout.astro";
import LoginForm from "../components/LoginForm";
---

<Layout title="Logowanie - DoFIRE">
  <main class="flex min-h-screen items-center justify-center bg-background px-4 py-12">
    <div class="w-full max-w-md space-y-8">
      <div class="text-center">
        <h1 class="text-3xl font-bold tracking-tight text-foreground">DoFIRE</h1>
        <p class="mt-2 text-sm text-muted-foreground">Zaloguj się do swojego konta</p>
      </div>
      <div class="rounded-lg border border-border bg-card p-6 shadow-sm">
        <LoginForm client:load />
      </div>
      <div class="text-center text-sm">
        <a href="/register" class="text-primary hover:underline">Nie masz konta? Zarejestruj się</a>
        <span class="mx-2">•</span>
        <a href="/forgot-password" class="text-primary hover:underline">Zapomniałeś hasła?</a>
      </div>
    </div>
  </main>
</Layout>
```

**Logika server-side**:

- Sprawdzenie sesji użytkownika przez `locals.supabase.auth.getUser()`
- Jeśli użytkownik jest zalogowany → redirect do `/dashboard`
- Jeśli nie → renderowanie formularza logowania

#### 2.1.2 Strona rejestracji (`src/pages/register.astro`) - NOWA

**Status**: Do utworzenia

**Funkcjonalność**:

- Formularz rejestracji z polami: email, hasło, potwierdzenie hasła
- Walidacja po stronie klienta i serwera
- Po udanej rejestracji → automatyczne logowanie → redirect do `/onboarding` (jeśli brak profilu) lub `/dashboard`

**Struktura**:

```astro
---
// Server-side: sprawdzenie czy użytkownik jest już zalogowany
// Jeśli tak → redirect do /dashboard
import Layout from "../layouts/Layout.astro";
import RegisterForm from "../components/RegisterForm";
---

<Layout title="Rejestracja - DoFIRE">
  <main class="flex min-h-screen items-center justify-center bg-background px-4 py-12">
    <div class="w-full max-w-md space-y-8">
      <div class="text-center">
        <h1 class="text-3xl font-bold tracking-tight text-foreground">DoFIRE</h1>
        <p class="mt-2 text-sm text-muted-foreground">Utwórz nowe konto</p>
      </div>
      <div class="rounded-lg border border-border bg-card p-6 shadow-sm">
        <RegisterForm client:load />
      </div>
      <div class="text-center text-sm">
        <a href="/login" class="text-primary hover:underline">Masz już konto? Zaloguj się</a>
      </div>
    </div>
  </main>
</Layout>
```

#### 2.1.3 Strona odzyskiwania hasła (`src/pages/forgot-password.astro`) - NOWA

**Status**: Do utworzenia

**Funkcjonalność**:

- Formularz z polem email
- Wysyłka linku resetującego hasło przez Supabase
- Komunikat sukcesu po wysłaniu emaila
- Link powrotu do logowania

**Struktura**:

```astro
---
// Server-side: sprawdzenie czy użytkownik jest już zalogowany
// Jeśli tak → redirect do /dashboard
import Layout from "../layouts/Layout.astro";
import ForgotPasswordForm from "../components/ForgotPasswordForm";
---

<Layout title="Odzyskiwanie hasła - DoFIRE">
  <main class="flex min-h-screen items-center justify-center bg-background px-4 py-12">
    <div class="w-full max-w-md space-y-8">
      <div class="text-center">
        <h1 class="text-3xl font-bold tracking-tight text-foreground">Odzyskiwanie hasła</h1>
        <p class="mt-2 text-sm text-muted-foreground">Wprowadź adres e-mail, aby otrzymać link resetujący hasło</p>
      </div>
      <div class="rounded-lg border border-border bg-card p-6 shadow-sm">
        <ForgotPasswordForm client:load />
      </div>
      <div class="text-center text-sm">
        <a href="/login" class="text-primary hover:underline">Powrót do logowania</a>
      </div>
    </div>
  </main>
</Layout>
```

#### 2.1.4 Strona resetowania hasła (`src/pages/reset-password.astro`) - NOWA

**Status**: Do utworzenia

**Funkcjonalność**:

- Formularz z polami: nowe hasło, potwierdzenie hasła
- Walidacja tokenu resetującego z URL (hash fragment)
- Aktualizacja hasła przez Supabase Auth
- Po sukcesie → automatyczne logowanie → redirect do `/dashboard`

**Struktura**:

```astro
---
// Server-side: sprawdzenie tokenu z URL (opcjonalne)
import Layout from "../layouts/Layout.astro";
import ResetPasswordForm from "../components/ResetPasswordForm";
---

<Layout title="Resetowanie hasła - DoFIRE">
  <main class="flex min-h-screen items-center justify-center bg-background px-4 py-12">
    <div class="w-full max-w-md space-y-8">
      <div class="text-center">
        <h1 class="text-3xl font-bold tracking-tight text-foreground">Resetowanie hasła</h1>
        <p class="mt-2 text-sm text-muted-foreground">Wprowadź nowe hasło</p>
      </div>
      <div class="rounded-lg border border-border bg-card p-6 shadow-sm">
        <ResetPasswordForm client:load />
      </div>
    </div>
  </main>
</Layout>
```

### 2.2 Komponenty React (Client-side)

#### 2.2.1 LoginForm (`src/components/LoginForm.tsx`)

**Status**: Wymaga całkowitej przebudowy

**Obecna implementacja**:

- Używa `supabaseClient.auth.signInWithOtp()`
- Obsługuje tylko email

**Nowa implementacja**:

- Pola formularza: `email` (string), `password` (string)
- Walidacja: email (format), hasło (wymagane)
- Metoda: `supabaseClient.auth.signInWithPassword({ email, password })`
- Obsługa błędów:
  - `Invalid login credentials` → "Nieprawidłowy email lub hasło"
  - `Email not confirmed` → "Potwierdź swój adres email przed logowaniem"
  - `Too many requests` → "Zbyt wiele prób. Spróbuj ponownie za kilka minut"
  - `Network error` → "Brak połączenia z internetem"
- Po sukcesie: sprawdzenie profilu użytkownika → redirect do `/onboarding` (brak profilu) lub `/dashboard`
- Trwała sesja: `persistSession: true` (domyślnie w Supabase)

**Struktura stanu**:

```typescript
interface LoginFormState {
  email: string;
  password: string;
  errors: {
    email?: string;
    password?: string;
    submit?: string;
  };
  isLoading: boolean;
}
```

**Walidacja**:

- Email: format regex `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`
- Hasło: wymagane (minimum 1 znak)
- Błędy wyświetlane inline pod polami

#### 2.2.2 RegisterForm (`src/components/RegisterForm.tsx`) - NOWY

**Status**: Do utworzenia

**Funkcjonalność**:

- Pola formularza: `email` (string), `password` (string), `confirmPassword` (string)
- Walidacja:
  - Email: format regex
  - Hasło: minimum 6 znaków (zgodnie z konfiguracją Supabase)
  - Potwierdzenie hasła: musi być identyczne z hasłem
- Metoda: `supabaseClient.auth.signUp({ email, password })`
- Obsługa błędów:
  - `User already registered` → "Użytkownik o tym adresie email już istnieje"
  - `Password too weak` → "Hasło jest zbyt słabe. Minimum 6 znaków"
  - `Invalid email` → "Nieprawidłowy format adresu email"
  - `Too many requests` → "Zbyt wiele prób. Spróbuj ponownie za kilka minut"
- Po sukcesie: automatyczne logowanie → sprawdzenie profilu → redirect do `/onboarding` (brak profilu) lub `/dashboard`

**Struktura stanu**:

```typescript
interface RegisterFormState {
  email: string;
  password: string;
  confirmPassword: string;
  errors: {
    email?: string;
    password?: string;
    confirmPassword?: string;
    submit?: string;
  };
  isLoading: boolean;
}
```

**Walidacja**:

- Email: format regex
- Hasło: minimum 6 znaków
- Potwierdzenie hasła: identyczne z hasłem
- Błędy wyświetlane inline pod polami

#### 2.2.3 ForgotPasswordForm (`src/components/ForgotPasswordForm.tsx`) - NOWY

**Status**: Do utworzenia

**Funkcjonalność**:

- Pole formularza: `email` (string)
- Walidacja: format email
- Metoda: `supabaseClient.auth.resetPasswordForEmail(email, { redirectTo: '/reset-password' })`
- Obsługa błędów:
  - `Email not found` → "Jeśli konto istnieje, otrzymasz email z linkiem resetującym" (nie ujawniamy czy email istnieje)
  - `Too many requests` → "Zbyt wiele prób. Spróbuj ponownie za kilka minut"
- Po sukcesie: komunikat "Sprawdź swoją skrzynkę e-mail. Kliknij w link, aby zresetować hasło"

**Struktura stanu**:

```typescript
interface ForgotPasswordFormState {
  email: string;
  errors: {
    email?: string;
    submit?: string;
  };
  isLoading: boolean;
  isSuccess: boolean;
}
```

#### 2.2.4 ResetPasswordForm (`src/components/ResetPasswordForm.tsx`) - NOWY

**Status**: Do utworzenia

**Funkcjonalność**:

- Pola formularza: `password` (string), `confirmPassword` (string)
- Walidacja:
  - Hasło: minimum 6 znaków
  - Potwierdzenie hasła: identyczne z hasłem
- Metoda: `supabaseClient.auth.updateUser({ password: newPassword })`
- Obsługa błędów:
  - `Invalid token` → "Link resetujący wygasł lub jest nieprawidłowy"
  - `Password too weak` → "Hasło jest zbyt słabe. Minimum 6 znaków"
  - `Session expired` → "Sesja wygasła. Poproś o nowy link resetujący"
- Po sukcesie: automatyczne logowanie → redirect do `/dashboard`

**Struktura stanu**:

```typescript
interface ResetPasswordFormState {
  password: string;
  confirmPassword: string;
  errors: {
    password?: string;
    confirmPassword?: string;
    submit?: string;
  };
  isLoading: boolean;
}
```

**Obsługa tokenu**:

- Token resetujący przychodzi w hash fragment URL: `#access_token=...&type=recovery`
- Supabase automatycznie parsuje token z hash fragment
- Jeśli token jest nieprawidłowy, wyświetlić komunikat błędu

#### 2.2.5 TopNav (`src/components/TopNav.tsx`)

**Status**: Wymaga modyfikacji

**Obecna implementacja**:

- Zawsze wyświetla przycisk "Wyloguj"
- Zakłada, że użytkownik jest zalogowany

**Nowa implementacja**:

- Sprawdzenie stanu autentykacji przez `supabaseClient.auth.getSession()` lub `useAuth()` hook
- Jeśli zalogowany: wyświetl przycisk "Wyloguj" (obecna funkcjonalność)
- Jeśli niezalogowany: wyświetl przycisk "Zaloguj się" (link do `/login`)
- Przycisk "Zaloguj się" w prawym górnym rogu (zgodnie z US-007)

**Struktura**:

```typescript
export function TopNav() {
  const [isAuthenticated, setIsAuthenticated] = React.useState<boolean | null>(null);

  React.useEffect(() => {
    // Sprawdzenie sesji przy mount
    supabaseClient.auth.getSession().then(({ data: { session } }) => {
      setIsAuthenticated(!!session);
    });

    // Nasłuchiwanie zmian stanu autentykacji
    const { data: { subscription } } = supabaseClient.auth.onAuthStateChange((event, session) => {
      setIsAuthenticated(!!session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Renderowanie warunkowe
  if (isAuthenticated === null) {
    return <nav>...</nav>; // Loading state
  }

  return (
    <nav>
      {/* Logo i linki */}
      {isAuthenticated ? (
        <Button onClick={handleSignOut}>Wyloguj</Button>
      ) : (
        <Button asChild>
          <a href="/login">Zaloguj się</a>
        </Button>
      )}
    </nav>
  );
}
```

**Lokalizacja przycisku**: Prawy górny róg (zgodnie z US-007)

### 2.3 Komponenty pomocnicze

#### 2.3.1 EmailField (`src/components/EmailField.tsx`)

**Status**: Istnieje, może wymagać drobnych modyfikacji

**Funkcjonalność**:

- Pole input dla adresu email
- Walidacja formatu
- Wyświetlanie błędów inline
- Obsługa stanów: disabled, error, autoFocus

#### 2.3.2 PasswordField (`src/components/PasswordField.tsx`) - NOWY

**Status**: Do utworzenia

**Funkcjonalność**:

- Pole input typu password z możliwością pokazania/ukrycia hasła
- Ikona oka do przełączania widoczności
- Walidacja (opcjonalna, może być przekazana z rodzica)
- Wyświetlanie błędów inline
- Obsługa stanów: disabled, error, autoFocus

**Struktura**:

```typescript
interface PasswordFieldProps {
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  onFocus?: () => void;
  error?: string;
  disabled?: boolean;
  autoFocus?: boolean;
  placeholder?: string;
  label?: string;
  showStrengthIndicator?: boolean; // Opcjonalne dla rejestracji
}
```

#### 2.3.3 FormErrorSummary (`src/components/FormErrorSummary.tsx`)

**Status**: Istnieje, może być używany w nowych formularzach

**Funkcjonalność**:

- Wyświetlanie ogólnych błędów formularza (np. błędy submit)
- Komunikaty błędów z API

### 2.4 Layouty

#### 2.4.1 Layout (`src/layouts/Layout.astro`)

**Status**: Bez zmian

**Funkcjonalność**:

- Podstawowy layout HTML
- Globalne style
- Meta tagi

#### 2.4.2 AppLayout (`src/layouts/AppLayout.astro`)

**Status**: Bez zmian

**Funkcjonalność**:

- Layout dla zalogowanych użytkowników
- Zawiera TopNav
- GlobalErrorProviderWrapper

### 2.5 Walidacja i komunikaty błędów

#### 2.5.1 Walidacja po stronie klienta

**Email**:

- Format: `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`
- Komunikat: "Nieprawidłowy format adresu e-mail"
- Wymagane: Tak

**Hasło**:

- Minimum: 6 znaków (zgodnie z konfiguracją Supabase)
- Komunikat: "Hasło musi mieć minimum 6 znaków"
- Wymagane: Tak

**Potwierdzenie hasła**:

- Musi być identyczne z hasłem
- Komunikat: "Hasła nie są identyczne"
- Wymagane: Tak (tylko w formularzach rejestracji i resetowania)

#### 2.5.2 Komunikaty błędów z Supabase

**Logowanie**:

- `Invalid login credentials` → "Nieprawidłowy email lub hasło"
- `Email not confirmed` → "Potwierdź swój adres email przed logowaniem"
- `Too many requests` → "Zbyt wiele prób. Spróbuj ponownie za kilka minut"
- `Network error` → "Brak połączenia z internetem. Sprawdź swoje połączenie i spróbuj ponownie"

**Rejestracja**:

- `User already registered` → "Użytkownik o tym adresie email już istnieje"
- `Password too weak` → "Hasło jest zbyt słabe. Minimum 6 znaków"
- `Invalid email` → "Nieprawidłowy format adresu email"
- `Too many requests` → "Zbyt wiele prób. Spróbuj ponownie za kilka minut"

**Odzyskiwanie hasła**:

- `Email not found` → "Jeśli konto istnieje, otrzymasz email z linkiem resetującym" (nie ujawniamy czy email istnieje)
- `Too many requests` → "Zbyt wiele prób. Spróbuj ponownie za kilka minut"

**Resetowanie hasła**:

- `Invalid token` → "Link resetujący wygasł lub jest nieprawidłowy"
- `Password too weak` → "Hasło jest zbyt słabe. Minimum 6 znaków"
- `Session expired` → "Sesja wygasła. Poproś o nowy link resetujący"

### 2.6 Scenariusze użytkownika

#### 2.6.1 Logowanie

1. Użytkownik wchodzi na `/login`
2. Wypełnia formularz: email, hasło
3. Kliknie "Zaloguj się"
4. System waliduje dane po stronie klienta
5. Jeśli błędy → wyświetlenie komunikatów
6. Jeśli OK → wywołanie `supabaseClient.auth.signInWithPassword()`
7. Jeśli błąd → wyświetlenie komunikatu błędu
8. Jeśli sukces → sprawdzenie profilu użytkownika (`/api/v1/me/profile`)
9. Jeśli brak profilu → redirect do `/onboarding`
10. Jeśli profil istnieje → redirect do `/dashboard`

#### 2.6.2 Rejestracja

1. Użytkownik wchodzi na `/register`
2. Wypełnia formularz: email, hasło, potwierdzenie hasła
3. Kliknie "Zarejestruj się"
4. System waliduje dane po stronie klienta
5. Jeśli błędy → wyświetlenie komunikatów
6. Jeśli OK → wywołanie `supabaseClient.auth.signUp()`
7. Jeśli błąd → wyświetlenie komunikatu błędu
8. Jeśli sukces → automatyczne logowanie → sprawdzenie profilu
9. Jeśli brak profilu → redirect do `/onboarding`
10. Jeśli profil istnieje → redirect do `/dashboard`

#### 2.6.3 Odzyskiwanie hasła

1. Użytkownik wchodzi na `/forgot-password`
2. Wypełnia formularz: email
3. Kliknie "Wyślij link resetujący"
4. System waliduje email
5. Jeśli błąd → wyświetlenie komunikatu
6. Jeśli OK → wywołanie `supabaseClient.auth.resetPasswordForEmail()`
7. Jeśli błąd → wyświetlenie komunikatu (bez ujawniania czy email istnieje)
8. Jeśli sukces → komunikat "Sprawdź swoją skrzynkę e-mail"

#### 2.6.4 Resetowanie hasła

1. Użytkownik klika link w emailu → przekierowanie do `/reset-password#access_token=...&type=recovery`
2. System automatycznie parsuje token z hash fragment
3. Użytkownik wypełnia formularz: nowe hasło, potwierdzenie hasła
4. Kliknie "Zresetuj hasło"
5. System waliduje dane
6. Jeśli błędy → wyświetlenie komunikatów
7. Jeśli OK → wywołanie `supabaseClient.auth.updateUser({ password })`
8. Jeśli błąd → wyświetlenie komunikatu (np. token wygasł)
9. Jeśli sukces → automatyczne logowanie → redirect do `/dashboard`

#### 2.6.5 Wylogowanie

1. Użytkownik klika "Wyloguj" w TopNav
2. Wywołanie `supabaseClient.auth.signOut()`
3. Redirect do `/login`
4. Sesja jest czyszczona (tokeny usunięte)

#### 2.6.6 Nawigacja dla niezalogowanych

1. Użytkownik niezalogowany widzi przycisk "Zaloguj się" w prawym górnym rogu
2. Kliknięcie → przekierowanie do `/login`
3. Po zalogowaniu → przycisk zmienia się na "Wyloguj"

---

## 3. LOGIKA BACKENDOWA

### 3.1 Endpointy API

#### 3.1.1 GET `/api/v1/auth/session` - WERYFIKACJA SESJI

**Status**: Istnieje, bez zmian

**Funkcjonalność**:

- Weryfikacja tokenu JWT z Supabase
- Zwraca informacje o sesji: `user_id`, `roles`, `iat`
- Używany przez frontend do sprawdzania stanu autentykacji

**Request**:

```
Headers:
  Authorization: Bearer <Supabase-JWT>
```

**Response**:

```typescript
{
  user_id: string;
  roles: string[];
  iat: number;
}
```

**Błędy**:

- `401 Unauthorized`: Brak lub nieprawidłowy token
- `500 Internal Server Error`: Błąd serwera

#### 3.1.2 Endpointy do utworzenia (opcjonalne)

**Uwaga**: Supabase Auth obsługuje większość logiki autentykacji po stronie klienta. Endpointy API mogą być potrzebne tylko dla dodatkowej walidacji lub logiki biznesowej.

**POST `/api/v1/auth/register`** (opcjonalny):

- Może być używany do dodatkowej walidacji przed rejestracją
- Tworzenie profilu użytkownika po rejestracji
- Obecnie nie jest wymagany, ponieważ Supabase Auth obsługuje rejestrację bezpośrednio

**POST `/api/v1/auth/reset-password`** (opcjonalny):

- Może być używany do weryfikacji tokenu przed resetowaniem
- Obecnie nie jest wymagany, ponieważ Supabase Auth obsługuje resetowanie bezpośrednio

### 3.2 Modele danych

#### 3.2.1 AuthSessionDto (`src/types.ts`)

**Status**: Istnieje, bez zmian

```typescript
export interface AuthSessionDto {
  user_id: string;
  roles: string[];
  iat: number;
}
```

#### 3.2.2 User (Supabase Auth)

**Status**: Zarządzany przez Supabase

**Struktura** (z Supabase):

```typescript
{
  id: string;
  email: string;
  email_confirmed_at: string | null;
  created_at: string;
  updated_at: string;
  // ... inne pola Supabase Auth
}
```

### 3.3 Walidacja danych wejściowych

#### 3.3.1 Walidacja po stronie serwera (middleware)

**Middleware** (`src/middleware/index.ts`):

- Tworzy Supabase client z tokenem z `Authorization` header
- Token jest weryfikowany przez Supabase przy każdym żądaniu
- Jeśli token jest nieprawidłowy, Supabase zwróci błąd

**Aktualizacja**:

- Middleware pozostaje bez zmian
- Token jest przekazywany z frontendu przez `Authorization: Bearer <token>`

#### 3.3.2 Walidacja w endpointach API

**Obecne endpointy** (`/api/v1/me/*`, `/api/v1/investments/*`):

- Używają `getAuthenticatedUser()` z `src/lib/auth/helpers.ts`
- Jeśli użytkownik nie jest zalogowany → `401 Unauthorized`
- Komunikat: "Zaloguj ponownie" (zgodnie z US-001)

**Bez zmian**: Wszystkie istniejące endpointy pozostają niezmienione

### 3.4 Obsługa wyjątków

#### 3.4.1 Błędy autentykacji

**401 Unauthorized**:

- Brak tokenu w `Authorization` header
- Nieprawidłowy lub wygasły token
- Komunikat: "Zaloguj ponownie" (zgodnie z US-001 i US-006)

**403 Forbidden**:

- Token prawidłowy, ale użytkownik nie ma uprawnień
- Komunikat: "Zaloguj ponownie" (zgodnie z US-006)

**Obsługa w komponentach**:

- GlobalErrorBanner może wyświetlać komunikaty błędów autentykacji
- Komponenty formularzy wyświetlają błędy inline

#### 3.4.2 Błędy sieciowe

**Network Error**:

- Brak połączenia z internetem
- Timeout żądania
- Komunikat: "Brak połączenia z internetem. Sprawdź swoje połączenie i spróbuj ponownie"

**Obsługa**:

- Try-catch w komponentach React
- Wyświetlanie komunikatów błędów w formularzach

#### 3.4.3 Rate limiting

**Too many requests**:

- Supabase zwraca błąd 429 lub komunikat o rate limit
- Komunikat: "Zbyt wiele prób. Spróbuj ponownie za kilka minut"
- Opcjonalnie: wyświetlenie countdown timer

**Obsługa**:

- Wykrywanie błędów rate limit w komponentach
- Wyświetlanie komunikatu z countdown (opcjonalnie)

### 3.5 Renderowanie server-side

#### 3.5.1 Strony publiczne (login, register, forgot-password)

**Renderowanie**:

- SSR (server-side rendering)
- Sprawdzenie sesji użytkownika w Astro page
- Jeśli zalogowany → redirect do `/dashboard`
- Jeśli niezalogowany → renderowanie formularza

**Przykład** (`src/pages/login.astro`):

```astro
---
import { getAuthenticatedUser } from "../lib/auth/helpers";

if (import.meta.env.SSR) {
  const user = await getAuthenticatedUser(Astro.locals.supabase);
  if (user) {
    return Astro.redirect("/dashboard");
  }
}
---
```

**Uwaga**: `getAuthenticatedUser()` wymaga tokenu w `locals.supabase`. W przypadku stron publicznych, token może nie być dostępny, więc sprawdzenie może być opcjonalne lub wykonywane po stronie klienta.

#### 3.5.2 Strony chronione (dashboard, onboarding)

**Renderowanie**:

- SSR z weryfikacją autentykacji
- Jeśli niezalogowany → redirect do `/login`
- Jeśli zalogowany → renderowanie zawartości

**Przykład** (`src/pages/dashboard.astro`):

```astro
---
import { getAuthenticatedUser } from "../lib/auth/helpers";

if (import.meta.env.SSR) {
  const user = await getAuthenticatedUser(Astro.locals.supabase);
  if (!user) {
    return Astro.redirect("/login");
  }
}
---
```

**Bez zmian**: Obecne strony chronione pozostają niezmienione

#### 3.5.3 Konfiguracja Astro (`astro.config.mjs`)

**Status**: Bez zmian

**Konfiguracja**:

- `output: "server"` - SSR włączony
- `adapter: node({ mode: "standalone" })` - Node.js adapter
- Middleware jest wykonywany przed renderowaniem stron

---

## 4. SYSTEM AUTENTYKACJI

### 4.1 Integracja z Supabase Auth

#### 4.1.1 Konfiguracja Supabase

**Plik**: `supabase/config.toml`

**Ustawienia wymagane**:

```toml
[auth]
enabled = true
site_url = "http://127.0.0.1:3000"  # lub URL produkcji
enable_signup = true  # Włączona rejestracja
minimum_password_length = 6  # Minimum 6 znaków

[auth.email]
enable_signup = true
enable_confirmations = false  # Opcjonalnie: wymaganie potwierdzenia email
```

**Metoda autentykacji**:

- Email/Password: włączona (domyślnie)
- Magic Link: wyłączona (nie używamy)
- OAuth providers: wyłączone (zgodnie z US-007)

#### 4.1.2 Klient Supabase

**Plik**: `src/db/supabase.client.ts`

**Status**: Wymaga aktualizacji

**Obecna implementacja**:

- Tworzy klienta bez dodatkowych opcji

**Nowa implementacja**:

```typescript
export const supabaseClient = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true, // Trwała sesja (zgodnie z US-001)
    autoRefreshToken: true, // Automatyczne odświeżanie tokenu
    detectSessionInUrl: true, // Wykrywanie sesji w URL (dla resetowania hasła)
  },
});
```

**Uwaga**: `persistSession: true` jest domyślną wartością w Supabase, ale warto to jawnie ustawić.

### 4.2 Metody autentykacji

#### 4.2.1 Logowanie (`signInWithPassword`)

**Metoda**: `supabaseClient.auth.signInWithPassword({ email, password })`

**Parametry**:

- `email`: string (wymagane)
- `password`: string (wymagane)

**Zwraca**:

- `{ data: { user, session }, error: null }` - sukces
- `{ data: { user: null, session: null }, error: AuthError }` - błąd

**Obsługa błędów**:

- `Invalid login credentials` → Nieprawidłowy email lub hasło
- `Email not confirmed` → Email nie został potwierdzony
- `Too many requests` → Rate limit

**Sesja**:

- Automatycznie zapisywana w localStorage (jeśli `persistSession: true`)
- Token jest odświeżany automatycznie
- Sesja jest utrzymywana między odświeżeniami strony (zgodnie z US-001)

#### 4.2.2 Rejestracja (`signUp`)

**Metoda**: `supabaseClient.auth.signUp({ email, password })`

**Parametry**:

- `email`: string (wymagane)
- `password`: string (wymagane, minimum 6 znaków)

**Zwraca**:

- `{ data: { user, session }, error: null }` - sukces
- `{ data: { user: null, session: null }, error: AuthError }` - błąd

**Obsługa błędów**:

- `User already registered` → Użytkownik już istnieje
- `Password too weak` → Hasło zbyt słabe
- `Invalid email` → Nieprawidłowy format email

**Sesja**:

- Po rejestracji użytkownik jest automatycznie logowany
- Sesja jest zapisywana w localStorage

#### 4.2.3 Wylogowanie (`signOut`)

**Metoda**: `supabaseClient.auth.signOut()`

**Parametry**: Brak

**Zwraca**:

- `{ error: null }` - sukces
- `{ error: AuthError }` - błąd

**Efekt**:

- Sesja jest usuwana z localStorage
- Token jest unieważniany
- Użytkownik jest wylogowany

#### 4.2.4 Odzyskiwanie hasła (`resetPasswordForEmail`)

**Metoda**: `supabaseClient.auth.resetPasswordForEmail(email, options)`

**Parametry**:

- `email`: string (wymagane)
- `options.redirectTo`: string (URL do przekierowania po kliknięciu linku)

**Zwraca**:

- `{ data: {}, error: null }` - sukces (email wysłany)
- `{ data: {}, error: AuthError }` - błąd

**Obsługa błędów**:

- `Email not found` → Nie ujawniamy czy email istnieje (bezpieczeństwo)
- `Too many requests` → Rate limit

**Proces**:

1. Supabase wysyła email z linkiem resetującym
2. Link zawiera token w hash fragment: `/reset-password#access_token=...&type=recovery`
3. Użytkownik klika link → przekierowanie do `/reset-password`
4. Supabase automatycznie parsuje token z hash fragment
5. Użytkownik wprowadza nowe hasło
6. Wywołanie `updateUser({ password })` aktualizuje hasło

#### 4.2.5 Resetowanie hasła (`updateUser`)

**Metoda**: `supabaseClient.auth.updateUser({ password: newPassword })`

**Parametry**:

- `password`: string (wymagane, minimum 6 znaków)

**Zwraca**:

- `{ data: { user }, error: null }` - sukces
- `{ data: { user: null }, error: AuthError }` - błąd

**Obsługa błędów**:

- `Invalid token` → Token wygasł lub jest nieprawidłowy
- `Password too weak` → Hasło zbyt słabe
- `Session expired` → Sesja wygasła

**Efekt**:

- Hasło jest zaktualizowane
- Użytkownik pozostaje zalogowany (jeśli token był prawidłowy)

### 4.3 Zarządzanie sesją

#### 4.3.1 Trwała sesja (`persistSession`)

**Konfiguracja**: `persistSession: true` w opcjach klienta Supabase

**Efekt**:

- Sesja jest zapisywana w localStorage
- Sesja jest przywracana po odświeżeniu strony
- Token jest automatycznie odświeżany

**Zgodność z US-001**: "Sesja utrzymuje się między odświeżeniami strony"

#### 4.3.2 Automatyczne odświeżanie tokenu

**Konfiguracja**: `autoRefreshToken: true` (domyślnie włączone)

**Efekt**:

- Token jest automatycznie odświeżany przed wygaśnięciem
- Użytkownik nie jest wylogowywany automatycznie
- Sesja pozostaje aktywna

#### 4.3.3 Wykrywanie sesji w URL

**Konfiguracja**: `detectSessionInUrl: true`

**Efekt**:

- Supabase automatycznie wykrywa token w hash fragment URL
- Używane przy resetowaniu hasła i innych przepływach OAuth
- Token jest parsowany i sesja jest tworzona automatycznie

### 4.4 Obsługa błędów autentykacji

#### 4.4.1 Błędy 401/403

**Źródło**:

- Nieprawidłowy lub wygasły token
- Brak tokenu w żądaniu

**Obsługa**:

- Middleware zwraca `401 Unauthorized`
- Frontend wyświetla komunikat "Zaloguj ponownie" (zgodnie z US-001 i US-006)
- Użytkownik jest przekierowywany do `/login`

**Implementacja**:

- Endpointy API używają `getAuthenticatedUser()`
- Jeśli `null` → zwróć `401 Unauthorized`
- Frontend obsługuje błędy 401/403 w komponentach

#### 4.4.2 Błędy sieciowe

**Źródło**:

- Brak połączenia z internetem
- Timeout żądania
- Błąd Supabase API

**Obsługa**:

- Try-catch w komponentach React
- Wyświetlanie komunikatów błędów w formularzach
- Komunikat: "Brak połączenia z internetem. Sprawdź swoje połączenie i spróbuj ponownie"

#### 4.4.3 Rate limiting

**Źródło**:

- Zbyt wiele żądań w krótkim czasie
- Supabase zwraca błąd 429 lub komunikat o rate limit

**Obsługa**:

- Wykrywanie błędów rate limit w komponentach
- Wyświetlanie komunikatu: "Zbyt wiele prób. Spróbuj ponownie za kilka minut"
- Opcjonalnie: countdown timer

### 4.5 Integracja z Astro

#### 4.5.1 Middleware (`src/middleware/index.ts`)

**Status**: Bez zmian

**Funkcjonalność**:

- Tworzy Supabase client z tokenem z `Authorization` header
- Token jest przekazywany do `context.locals.supabase`
- Endpointy API używają `locals.supabase` do weryfikacji autentykacji

**Uwaga**: Middleware pozostaje bez zmian, ponieważ działa z tokenami JWT niezależnie od metody autentykacji.

#### 4.5.2 Server-side rendering

**Strony publiczne**:

- Sprawdzenie sesji w Astro page (opcjonalne)
- Jeśli zalogowany → redirect do `/dashboard`
- Jeśli niezalogowany → renderowanie formularza

**Strony chronione**:

- Sprawdzenie sesji w Astro page (wymagane)
- Jeśli niezalogowany → redirect do `/login`
- Jeśli zalogowany → renderowanie zawartości

**Uwaga**: Sprawdzenie sesji w Astro wymaga tokenu w `locals.supabase`. W przypadku stron publicznych, token może nie być dostępny, więc sprawdzenie może być wykonywane po stronie klienta.

#### 4.5.3 Client-side rendering

**Komponenty React**:

- Używają `supabaseClient` do operacji autentykacji
- Sesja jest zarządzana przez Supabase (localStorage)
- Token jest przekazywany do API przez `Authorization` header

**Przykład**:

```typescript
const {
  data: { session },
} = await supabaseClient.auth.getSession();
const token = session?.access_token;

const response = await fetch("/api/v1/me/profile", {
  headers: {
    Authorization: `Bearer ${token}`,
  },
});
```

---

## 5. ZGODNOŚĆ Z WYMAGANIAMI

### 5.1 Weryfikacja pokrycia User Stories

**US-001: Logowanie użytkownika**

- ✅ **Sesja utrzymuje się między odświeżeniami strony** → Implementacja: `persistSession: true` w konfiguracji Supabase client (sekcja 4.1.2, 4.3.1)
- ✅ **Przy błędnym tokenie wyświetlany jest komunikat "Zaloguj ponownie"** → Implementacja: Obsługa błędów 401/403 w endpointach API i komponentach (sekcja 3.4.1, 4.4.1)

**US-002: Dodanie inwestycji**

- ✅ **Wymaga logowania** → Implementacja: Endpointy API używają `getAuthenticatedUser()` (sekcja 3.3.2)
- ℹ️ **Nie wymaga zmian w module autentykacji** → Istniejąca logika pozostaje niezmieniona

**US-003: Edycja i usuwanie inwestycji**

- ✅ **Wymaga logowania** → Implementacja: Endpointy API używają `getAuthenticatedUser()` (sekcja 3.3.2)
- ℹ️ **Nie wymaga zmian w module autentykacji** → Istniejąca logika pozostaje niezmieniona

**US-004: Przeliczenie wskaźników FIRE**

- ✅ **Wymaga logowania** → Implementacja: Endpointy API używają `getAuthenticatedUser()` (sekcja 3.3.2)
- ℹ️ **Nie wymaga zmian w module autentykacji** → Istniejąca logika pozostaje niezmieniona

**US-005: Analiza portfela (AI Hint)**

- ✅ **Wymaga logowania** → Implementacja: Endpointy API używają `getAuthenticatedUser()` (sekcja 3.3.2)
- ℹ️ **Nie wymaga zmian w module autentykacji** → Istniejąca logika pozostaje niezmieniona

**US-006: Walidacje i błędy**

- ✅ **Błąd 401/403 → komunikat "Zaloguj ponownie"** → Implementacja: Obsługa w endpointach API i komponentach (sekcja 3.4.1, 4.4.1)
- ℹ️ **Walidacje formularzy inwestycji** → Nie wymagają zmian w module autentykacji

**US-007: Bezpieczny dostęp i uwierzytelnianie**

- ✅ **Logowanie i rejestracja odbywają się na dedykowanych stronach** → Implementacja: `/login`, `/register` (sekcja 2.1.1, 2.1.2)
- ✅ **Logowanie wymaga podania adresu email i hasła** → Implementacja: `LoginForm` z `signInWithPassword()` (sekcja 2.2.1, 4.2.1)
- ✅ **Rejestracja wymaga podania adresu email, hasła i potwierdzenia hasła** → Implementacja: `RegisterForm` (sekcja 2.2.2, 4.2.2)
- ✅ **Użytkownik może logować się do systemu poprzez przycisk w prawym górnym rogu** → Implementacja: `TopNav` z przyciskiem "Zaloguj się" (sekcja 2.2.5)
- ✅ **Użytkownik może się wylogować z systemu poprzez przycisk w prawym górnym rogu** → Implementacja: `TopNav` z przyciskiem "Wyloguj" (sekcja 2.2.5, 2.6.5)
- ✅ **Nie korzystamy z zewnętrznych serwisów logowania** → Implementacja: Tylko email/password, OAuth wyłączone (sekcja 4.1.1)
- ✅ **Odzyskiwanie hasła powinno być możliwe** → Implementacja: `/forgot-password`, `/reset-password` (sekcja 2.1.3, 2.1.4, 2.6.3, 2.6.4)

### 5.2 Podsumowanie zgodności

**Wszystkie User Stories są w pełni pokryte przez niniejszą specyfikację:**

- US-001: ✅ Pełne pokrycie (trwała sesja, obsługa błędów)
- US-002: ✅ Zgodność zachowana (wymaga logowania)
- US-003: ✅ Zgodność zachowana (wymaga logowania)
- US-004: ✅ Zgodność zachowana (wymaga logowania)
- US-005: ✅ Zgodność zachowana (wymaga logowania)
- US-006: ✅ Pełne pokrycie (obsługa błędów 401/403)
- US-007: ✅ Pełne pokrycie (wszystkie wymagania zaimplementowane)

**Brak nadmiarowych założeń**: Wszystkie elementy specyfikacji wynikają bezpośrednio z wymagań PRD lub są niezbędne do ich realizacji.

---

## 6. PODSUMOWANIE IMPLEMENTACJI

### 6.1 Nowe pliki do utworzenia

1. `src/pages/register.astro` - Strona rejestracji
2. `src/pages/forgot-password.astro` - Strona odzyskiwania hasła
3. `src/pages/reset-password.astro` - Strona resetowania hasła
4. `src/components/RegisterForm.tsx` - Formularz rejestracji
5. `src/components/ForgotPasswordForm.tsx` - Formularz odzyskiwania hasła
6. `src/components/ResetPasswordForm.tsx` - Formularz resetowania hasła
7. `src/components/PasswordField.tsx` - Pole hasła z możliwością pokazania/ukrycia

### 6.2 Pliki do modyfikacji

1. `src/pages/login.astro` - Aktualizacja linków do rejestracji i odzyskiwania hasła
2. `src/components/LoginForm.tsx` - Przebudowa z magic link na email/hasło
3. `src/components/TopNav.tsx` - Dodanie przycisku logowania dla niezalogowanych
4. `src/db/supabase.client.ts` - Dodanie opcji `persistSession: true`

### 6.3 Pliki bez zmian

1. `src/middleware/index.ts` - Middleware pozostaje bez zmian
2. `src/lib/auth/helpers.ts` - Helpery pozostają bez zmian
3. `src/pages/api/v1/auth/session.ts` - Endpoint pozostaje bez zmian
4. Wszystkie endpointy API (`/api/v1/me/*`, `/api/v1/investments/*`) - Bez zmian
5. Wszystkie strony chronione (`dashboard.astro`, `onboarding.astro`) - Bez zmian

### 6.4 Kolejność implementacji

1. **Faza 1: Podstawowa infrastruktura**
   - Aktualizacja `supabase.client.ts` z `persistSession: true`
   - Utworzenie `PasswordField.tsx`
   - Przebudowa `LoginForm.tsx` na email/hasło

2. **Faza 2: Rejestracja**
   - Utworzenie `RegisterForm.tsx`
   - Utworzenie `register.astro`
   - Testowanie przepływu rejestracji

3. **Faza 3: Odzyskiwanie hasła**
   - Utworzenie `ForgotPasswordForm.tsx`
   - Utworzenie `forgot-password.astro`
   - Utworzenie `ResetPasswordForm.tsx`
   - Utworzenie `reset-password.astro`
   - Testowanie przepływu odzyskiwania hasła

4. **Faza 4: Nawigacja**
   - Aktualizacja `TopNav.tsx` z przyciskiem logowania
   - Aktualizacja `login.astro` z linkami do rejestracji i odzyskiwania

5. **Faza 5: Testy i walidacja**
   - Testowanie wszystkich scenariuszy użytkownika
   - Walidacja zgodności z wymaganiami US-001 i US-007
   - Testowanie zgodności z istniejącymi funkcjonalnościami

---

## 7. UWAGI TECHNICZNE

### 7.1 Bezpieczeństwo

- Hasła są hashowane przez Supabase (bcrypt)
- Tokeny JWT są podpisywane przez Supabase
- Rate limiting jest obsługiwany przez Supabase
- Nie ujawniamy czy email istnieje przy odzyskiwaniu hasła (bezpieczeństwo)

### 7.2 Wydajność

- Sesja jest przechowywana w localStorage (szybki dostęp)
- Token jest automatycznie odświeżany (bez przerw w sesji)
- SSR dla stron publicznych (szybsze pierwsze renderowanie)

### 7.3 Dostępność (A11y)

- Wszystkie formularze mają odpowiednie etykiety
- Komunikaty błędów są wyświetlane z `role="alert"` i `aria-live`
- Przyciski mają odpowiednie `aria-label` i `aria-busy`
- Nawigacja jest dostępna dla czytników ekranu

### 7.4 Testowanie

- Testy E2E powinny obejmować wszystkie scenariusze użytkownika
- Testy powinny weryfikować trwałość sesji
- Testy powinny weryfikować obsługę błędów
- Testy powinny weryfikować zgodność z istniejącymi funkcjonalnościami

---

**Koniec specyfikacji**
