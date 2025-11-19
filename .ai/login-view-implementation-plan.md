# Plan implementacji widoku Logowanie

## 1. Przegląd

Widok logowania (`/login`) umożliwia użytkownikom uwierzytelnienie w aplikacji DoFIRE za pomocą magic linka wysyłanego na adres e-mail. Widok jest publiczny (nie wymaga autoryzacji) i stanowi punkt wejścia do aplikacji dla niezalogowanych użytkowników. Po pomyślnym zalogowaniu użytkownik jest przekierowywany do `/dashboard` lub `/onboarding` (jeśli nie ma jeszcze profilu).

Główne funkcje widoku:
- Wprowadzanie adresu e-mail przez użytkownika
- Wysyłanie magic linka przez Supabase SDK
- Wyświetlanie komunikatów o statusie operacji (sukces/błąd)
- Obsługa błędów autoryzacji (wygasły/błędny token)
- Automatyczne przekierowanie po pomyślnym zalogowaniu

## 2. Routing widoku

**Ścieżka:** `/login`  
**Plik:** `src/pages/login.astro`  
**Typ:** Astro page (statyczna struktura HTML z React komponentami dla interaktywności)

Widok jest publiczny i nie wymaga autoryzacji. Jeśli użytkownik jest już zalogowany i próbuje wejść na `/login`, powinien zostać przekierowany do `/dashboard`.

## 3. Struktura komponentów

```
LoginPage (Astro)
├── LoginLayout (Astro - opcjonalny, dla spójnego layoutu)
└── LoginForm (React - client-side)
    ├── EmailField (React - FormField wrapper)
    │   ├── Label
    │   ├── Input (email type)
    │   └── ErrorMessage (aria-describedby)
    ├── InfoText (Astro/React - statyczny tekst)
    ├── SubmitButton (React - PrimaryButton)
    └── ToastProvider (React - dla komunikatów)
```

**Hierarchia komponentów:**
- `LoginPage` - główna strona Astro, zawiera layout i integruje React komponenty
- `LoginForm` - React komponent zarządzający stanem formularza i logiką logowania
- `EmailField` - wrapper dla pola e-mail z walidacją i obsługą błędów
- `InfoText` - statyczny tekst informujący o działaniu magic linka
- `SubmitButton` - przycisk wysyłania formularza z obsługą stanu ładowania

## 4. Szczegóły komponentów

### LoginPage (Astro)

- **Opis komponentu:** Główna strona Astro renderująca widok logowania. Zawiera podstawową strukturę HTML, importuje React komponenty i zarządza przekierowaniami dla już zalogowanych użytkowników.

- **Główne elementy:**
  - `<html>`, `<head>`, `<body>` - podstawowa struktura HTML
  - `<Layout>` - opcjonalny layout wrapper (jeśli potrzebny)
  - `<LoginForm client:load />` - React komponent formularza logowania
  - Skrypty do sprawdzania sesji i przekierowania

- **Obsługiwane zdarzenia:**
  - `load` - sprawdzenie, czy użytkownik jest już zalogowany (przekierowanie do `/dashboard`)

- **Obsługiwana walidacja:**
  - Brak walidacji po stronie Astro (wszystko w React)

- **Typy:**
  - Brak specyficznych typów dla komponentu Astro

- **Propsy:**
  - Brak propsów (strona statyczna)

### LoginForm (React)

- **Opis komponentu:** React komponent zarządzający całym procesem logowania. Obsługuje wprowadzanie e-maila, walidację, wysyłanie magic linka przez Supabase SDK, zarządzanie stanem formularza oraz obsługę błędów i sukcesów.

- **Główne elementy:**
  - `<form>` - element formularza HTML
  - `<EmailField>` - pole e-mail z walidacją
  - `<InfoText>` - tekst informacyjny o magic linku
  - `<SubmitButton>` - przycisk wysyłania
  - `<Toast>` - komponenty do wyświetlania komunikatów (opcjonalnie przez ToastProvider)

- **Obsługiwane zdarzenia:**
  - `onSubmit` - obsługa wysłania formularza (preventDefault, walidacja, wywołanie Supabase)
  - `onChange` - aktualizacja stanu pola e-mail (controlled input)
  - `onBlur` - walidacja pola po opuszczeniu fokusu
  - `onFocus` - czyszczenie błędów przy ponownym fokusie

- **Obsługiwana walidacja:**
  - Format e-mail: regex `/^[^\s@]+@[^\s@]+\.[^\s@]+$/` lub użycie HTML5 `type="email"`
  - Pole wymagane: e-mail nie może być pusty
  - Walidacja po stronie klienta przed wysłaniem do Supabase
  - Wyświetlanie błędów walidacji w czasie rzeczywistym

- **Typy:**
  - `LoginFormState` - stan formularza (email, errors, isLoading, isSuccess)
  - `LoginFormErrors` - typ błędów walidacji
  - `SupabaseAuthError` - typ błędów z Supabase SDK

- **Propsy:**
  - Brak propsów (komponent samodzielny)

### EmailField (React)

- **Opis komponentu:** Wrapper dla pola e-mail z pełną obsługą dostępności, walidacji i wyświetlania błędów. Zapewnia spójny wygląd i zachowanie zgodne z wytycznymi dostępności.

- **Główne elementy:**
  - `<label>` - etykieta pola z `htmlFor` powiązanym z `id` inputa
  - `<input type="email">` - pole wprowadzania e-maila
  - `<span>` lub `<p>` - komunikat błędu z `aria-describedby`
  - Opcjonalnie: ikona walidacji

- **Obsługiwane zdarzenia:**
  - `onChange` - przekazanie wartości do rodzica (LoginForm)
  - `onBlur` - wywołanie walidacji
  - `onFocus` - czyszczenie błędów

- **Obsługiwana walidacja:**
  - Format e-mail (HTML5 + regex)
  - Pole wymagane
  - Wyświetlanie błędów z `aria-invalid="true"` i `aria-describedby` wskazującym na komunikat błędu

- **Typy:**
  - `EmailFieldProps` - props komponentu (value, onChange, error, onBlur, onFocus, id, label)

- **Propsy:**
  ```typescript
  interface EmailFieldProps {
    value: string;
    onChange: (value: string) => void;
    error?: string;
    onBlur?: () => void;
    onFocus?: () => void;
    id?: string;
    label?: string;
    required?: boolean;
    disabled?: boolean;
  }
  ```

### InfoText (Astro/React)

- **Opis komponentu:** Statyczny tekst informujący użytkownika o działaniu magic linka. Może być zarówno komponentem Astro (jeśli tylko tekst) jak i React (jeśli potrzebna interaktywność).

- **Główne elementy:**
  - `<p>` lub `<div>` - kontener tekstu
  - Tekst informacyjny: "Wprowadź swój adres e-mail, a wyślemy Ci link logujący. Kliknij w link w wiadomości e-mail, aby zalogować się do aplikacji."

- **Obsługiwane zdarzenia:**
  - Brak (komponent statyczny)

- **Obsługiwana walidacja:**
  - Brak

- **Typy:**
  - Brak specyficznych typów

- **Propsy:**
  - Brak propsów (lub opcjonalne className dla stylowania)

### SubmitButton (React - PrimaryButton)

- **Opis komponentu:** Przycisk wysyłania formularza oparty na komponencie `Button` z shadcn/ui. Wyświetla stan ładowania i jest wyłączony podczas przetwarzania żądania.

- **Główne elementy:**
  - `<Button>` - komponent z shadcn/ui z variant="default"
  - Tekst: "Wyślij link logowania"
  - Opcjonalnie: spinner/loader podczas ładowania

- **Obsługiwane zdarzenia:**
  - `onClick` - wywołanie onSubmit formularza (lub przez type="submit" w form)
  - `disabled` - wyłączenie podczas ładowania

- **Obsługiwana walidacja:**
  - Przycisk wyłączony, gdy:
    - `isLoading === true`
    - `email` jest pusty lub nieprawidłowy
    - `isSuccess === true` (opcjonalnie, aby zapobiec wielokrotnemu wysłaniu)

- **Typy:**
  - `SubmitButtonProps` - props komponentu (isLoading, disabled, onClick)

- **Propsy:**
  ```typescript
  interface SubmitButtonProps {
    isLoading?: boolean;
    disabled?: boolean;
    onClick?: () => void;
  }
  ```

## 5. Typy

### LoginFormState

```typescript
interface LoginFormState {
  email: string;
  errors: LoginFormErrors;
  isLoading: boolean;
  isSuccess: boolean;
  successMessage?: string;
}
```

**Pola:**
- `email: string` - wartość wprowadzona w polu e-mail
- `errors: LoginFormErrors` - obiekt zawierający błędy walidacji
- `isLoading: boolean` - flaga wskazująca, czy trwa wysyłanie magic linka
- `isSuccess: boolean` - flaga wskazująca, czy magic link został wysłany pomyślnie
- `successMessage?: string` - opcjonalny komunikat sukcesu

### LoginFormErrors

```typescript
interface LoginFormErrors {
  email?: string;
  submit?: string;
}
```

**Pola:**
- `email?: string` - błąd walidacji pola e-mail (np. "Nieprawidłowy format e-mail", "Pole e-mail jest wymagane")
- `submit?: string` - błąd ogólny podczas wysyłania (np. "Nie udało się wysłać linku. Spróbuj ponownie.")

### EmailFieldProps

```typescript
interface EmailFieldProps {
  value: string;
  onChange: (value: string) => void;
  error?: string;
  onBlur?: () => void;
  onFocus?: () => void;
  id?: string;
  label?: string;
  required?: boolean;
  disabled?: boolean;
  autoFocus?: boolean;
}
```

**Pola:**
- `value: string` - aktualna wartość pola (controlled input)
- `onChange: (value: string) => void` - callback wywoływany przy zmianie wartości
- `error?: string` - opcjonalny komunikat błędu do wyświetlenia
- `onBlur?: () => void` - opcjonalny callback wywoływany przy opuszczeniu fokusu
- `onFocus?: () => void` - opcjonalny callback wywoływany przy fokusie
- `id?: string` - opcjonalny identyfikator pola (używany do powiązania z label)
- `label?: string` - opcjonalna etykieta pola (domyślnie "Adres e-mail")
- `required?: boolean` - czy pole jest wymagane (domyślnie true)
- `disabled?: boolean` - czy pole jest wyłączone
- `autoFocus?: boolean` - czy automatycznie ustawić fokus przy montowaniu (domyślnie true)

### SubmitButtonProps

```typescript
interface SubmitButtonProps {
  isLoading?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  children?: React.ReactNode;
}
```

**Pola:**
- `isLoading?: boolean` - czy przycisk jest w stanie ładowania
- `disabled?: boolean` - czy przycisk jest wyłączony
- `onClick?: () => void` - opcjonalny callback wywoływany przy kliknięciu
- `children?: React.ReactNode` - opcjonalna zawartość przycisku (domyślnie "Wyślij link logowania")

### AuthSessionDto (z types.ts)

```typescript
interface AuthSessionDto {
  user_id: string;
  roles: string[];
  iat: number;
}
```

**Pola:**
- `user_id: string` - identyfikator użytkownika z Supabase
- `roles: string[]` - tablica ról użytkownika (zazwyczaj `["authenticated"]`)
- `iat: number` - timestamp wydania tokenu (issued at)

### SupabaseAuthResponse

```typescript
interface SupabaseAuthResponse {
  data: {
    user: User | null;
    session: Session | null;
  };
  error: AuthError | null;
}
```

**Pola:**
- `data.user: User | null` - obiekt użytkownika po pomyślnym logowaniu
- `data.session: Session | null` - obiekt sesji Supabase
- `error: AuthError | null` - błąd autoryzacji, jeśli wystąpił

## 6. Zarządzanie stanem

Widok logowania wykorzystuje lokalny stan React (`useState`) w komponencie `LoginForm` do zarządzania:
- wartością pola e-mail (`email: string`)
- błędami walidacji (`errors: LoginFormErrors`)
- stanem ładowania (`isLoading: boolean`)
- stanem sukcesu (`isSuccess: boolean`)

**Custom hook (opcjonalny):** `useLoginForm`

Jeśli logika stanie się zbyt złożona, można wyodrębnić ją do custom hooka `useLoginForm` w `src/components/hooks/useLoginForm.ts`:

```typescript
function useLoginForm() {
  const [state, setState] = useState<LoginFormState>({
    email: '',
    errors: {},
    isLoading: false,
    isSuccess: false,
  });

  const validateEmail = (email: string): string | undefined => {
    // Logika walidacji
  };

  const handleSubmit = async (e: React.FormEvent) => {
    // Logika wysyłania magic linka
  };

  return {
    state,
    setState,
    validateEmail,
    handleSubmit,
  };
}
```

**Integracja z Supabase:**
- Supabase client jest importowany bezpośrednio w komponencie: `import { supabaseClient } from '@/db/supabase.client'`
- Sesja jest automatycznie zarządzana przez Supabase SDK (`persistSession: true` w konfiguracji)
- Po pomyślnym logowaniu Supabase automatycznie zapisuje sesję w localStorage

**Przekierowania:**
- Po pomyślnym wysłaniu magic linka: wyświetlenie komunikatu sukcesu (bez automatycznego przekierowania, użytkownik musi kliknąć w link)
- Po kliknięciu w magic link (obsługiwane przez Supabase): automatyczne przekierowanie do `/dashboard` lub `/onboarding` (sprawdzenie przez `GET /v1/auth/session` i `GET /v1/me/profile`)

## 7. Integracja API

### Wysyłanie magic linka (client-side)

**Endpoint:** Brak (obsługiwane przez Supabase SDK)  
**Metoda:** `supabase.auth.signInWithOtp()`  
**Typ żądania:** N/A (SDK call)  
**Typ odpowiedzi:** `SupabaseAuthResponse`

**Implementacja:**
```typescript
const { data, error } = await supabaseClient.auth.signInWithOtp({
  email: email,
  options: {
    emailRedirectTo: `${window.location.origin}/dashboard`,
  },
});
```

**Obsługa odpowiedzi:**
- Sukces (`error === null`): ustawienie `isSuccess = true`, wyświetlenie komunikatu "Sprawdź swoją skrzynkę e-mail"
- Błąd (`error !== null`): ustawienie błędu w `errors.submit`, wyświetlenie neutralnego komunikatu (nie ujawniającego, czy e-mail istnieje)

### Weryfikacja sesji (po kliknięciu w magic link)

**Endpoint:** `GET /v1/auth/session`  
**Metoda:** GET  
**Typ żądania:** Brak (tylko header `Authorization: Bearer <token>`)  
**Typ odpowiedzi:** `AuthSessionDto`

**Implementacja:**
```typescript
const response = await fetch('/api/v1/auth/session', {
  headers: {
    'Authorization': `Bearer ${session.access_token}`,
  },
});

if (response.ok) {
  const sessionData: AuthSessionDto = await response.json();
  // Przekierowanie do /dashboard lub /onboarding
}
```

**Obsługa błędów:**
- `401 Unauthorized`: wyświetlenie komunikatu "Zaloguj ponownie", przekierowanie do `/login`
- `500 Internal Server Error`: wyświetlenie komunikatu "Problem po naszej stronie. Spróbuj ponownie."

**Uwaga:** Weryfikacja sesji jest wykonywana automatycznie przez Supabase po kliknięciu w magic link. Frontend powinien nasłuchiwać na zmiany sesji przez `supabase.auth.onAuthStateChange()` i przekierowywać użytkownika odpowiednio.

## 8. Interakcje użytkownika

### 1. Wprowadzanie e-maila

**Akcja użytkownika:** Wprowadzenie tekstu w pole e-mail  
**Oczekiwany wynik:**
- Wartość pola jest aktualizowana w czasie rzeczywistym (`onChange`)
- Jeśli wcześniej był błąd walidacji, jest on czyszczony
- Przycisk "Wyślij link logowania" jest włączany/wyłączany w zależności od poprawności e-maila

### 2. Opuszczenie pola e-mail (blur)

**Akcja użytkownika:** Kliknięcie poza pole e-mail lub przejście do innego elementu  
**Oczekiwany wynik:**
- Jeśli e-mail jest nieprawidłowy, wyświetlenie komunikatu błędu pod polem
- Pole otrzymuje `aria-invalid="true"` i `aria-describedby` wskazujący na komunikat błędu

### 3. Wysłanie formularza (kliknięcie przycisku lub Enter)

**Akcja użytkownika:** Kliknięcie przycisku "Wyślij link logowania" lub naciśnięcie Enter w polu e-mail  
**Oczekiwany wynik:**
- Walidacja e-maila przed wysłaniem
- Jeśli e-mail jest nieprawidłowy: wyświetlenie błędu, formularz nie jest wysyłany
- Jeśli e-mail jest prawidłowy:
  - Przycisk jest wyłączony i pokazuje stan ładowania
  - Wywołanie `supabase.auth.signInWithOtp()`
  - Po sukcesie: wyświetlenie komunikatu "Sprawdź swoją skrzynkę e-mail. Kliknij w link, aby zalogować się."
  - Po błędzie: wyświetlenie neutralnego komunikatu błędu

### 4. Kliknięcie w magic link w e-mailu

**Akcja użytkownika:** Otwarcie magic linka w przeglądarce  
**Oczekiwany wynik:**
- Supabase automatycznie loguje użytkownika i zapisuje sesję
- Frontend nasłuchuje na `onAuthStateChange` i przekierowuje do `/dashboard`
- Jeśli użytkownik nie ma profilu (`GET /v1/me/profile` zwraca 404), przekierowanie do `/onboarding`

### 5. Próba wejścia na `/login` jako zalogowany użytkownik

**Akcja użytkownika:** Wpisanie `/login` w przeglądarce podczas bycia zalogowanym  
**Oczekiwany wynik:**
- Sprawdzenie sesji przez `supabase.auth.getSession()`
- Jeśli sesja istnieje, automatyczne przekierowanie do `/dashboard`

### 6. Obsługa wygasłego/błędnego tokenu

**Akcja użytkownika:** Kliknięcie w wygasły magic link lub próba użycia nieprawidłowego tokenu  
**Oczekiwany wynik:**
- Wyświetlenie komunikatu "Link logowania wygasł lub jest nieprawidłowy. Zaloguj się ponownie."
- Możliwość ponownego wprowadzenia e-maila i wysłania nowego magic linka

## 9. Warunki i walidacja

### Walidacja pola e-mail (client-side)

**Warunki:**
1. **Pole wymagane:** E-mail nie może być pusty
   - Komunikat: "Pole e-mail jest wymagane"
   - Sprawdzane: przy `onBlur` i `onSubmit`

2. **Format e-mail:** E-mail musi mieć poprawny format
   - Regex: `/^[^\s@]+@[^\s@]+\.[^\s@]+$/` lub użycie HTML5 `type="email"` z `required`
   - Komunikat: "Nieprawidłowy format adresu e-mail"
   - Sprawdzane: przy `onBlur` i `onSubmit`

**Komponenty odpowiedzialne:**
- `EmailField` - wyświetlanie błędów walidacji
- `LoginForm` - logika walidacji i zarządzanie stanem błędów

**Wpływ na stan interfejsu:**
- Jeśli e-mail jest nieprawidłowy: pole otrzymuje `aria-invalid="true"`, wyświetlany jest komunikat błędu, przycisk "Wyślij link logowania" jest wyłączony
- Jeśli e-mail jest prawidłowy: błędy są czyszczone, przycisk jest włączony

### Walidacja po stronie Supabase

**Warunki:**
1. **E-mail nie istnieje w systemie:** Supabase zawsze zwraca sukces (dla bezpieczeństwa), ale nie wysyła e-maila do nieistniejących adresów
   - Frontend nie może rozróżnić tego przypadku (neutralne komunikaty)

2. **Błąd wysyłania e-maila:** Supabase może zwrócić błąd z powodu problemów z konfiguracją lub limitami
   - Komunikat: "Nie udało się wysłać linku. Spróbuj ponownie za chwilę."
   - Sprawdzane: w `handleSubmit` po wywołaniu `signInWithOtp()`

**Komponenty odpowiedzialne:**
- `LoginForm` - obsługa błędów z Supabase SDK

**Wpływ na stan interfejsu:**
- Jeśli wystąpi błąd: wyświetlenie komunikatu błędu w `Toast` lub pod formularzem, przycisk jest ponownie włączony

### Sprawdzanie sesji

**Warunki:**
1. **Użytkownik już zalogowany:** Sprawdzenie przez `supabase.auth.getSession()` przy montowaniu komponentu
   - Przekierowanie do `/dashboard` jeśli sesja istnieje

2. **Weryfikacja tokenu po kliknięciu w magic link:** Sprawdzenie przez `GET /v1/auth/session`
   - Jeśli `401`: przekierowanie do `/login` z komunikatem "Zaloguj ponownie"
   - Jeśli `200`: kontynuacja do `/dashboard` lub `/onboarding`

**Komponenty odpowiedzialne:**
- `LoginPage` (Astro) - sprawdzenie sesji przy ładowaniu strony
- `LoginForm` - nasłuchiwanie na `onAuthStateChange` i przekierowania

## 10. Obsługa błędów

### Błędy walidacji (client-side)

**Scenariusz:** Użytkownik wprowadza nieprawidłowy format e-maila  
**Obsługa:**
- Wyświetlenie komunikatu błędu pod polem e-mail
- Pole otrzymuje `aria-invalid="true"` i `aria-describedby`
- Przycisk "Wyślij link logowania" jest wyłączony
- Komunikat jest czyszczony przy ponownym wprowadzaniu prawidłowego e-maila

**Scenariusz:** Użytkownik próbuje wysłać formularz z pustym polem e-mail  
**Obsługa:**
- Wyświetlenie komunikatu "Pole e-mail jest wymagane"
- Formularz nie jest wysyłany

### Błędy Supabase SDK

**Scenariusz:** Błąd wysyłania magic linka (np. problem z konfiguracją Supabase)  
**Obsługa:**
- Wyświetlenie neutralnego komunikatu: "Nie udało się wysłać linku. Spróbuj ponownie za chwilę."
- Przycisk jest ponownie włączony, użytkownik może spróbować ponownie
- Błąd jest logowany w konsoli dla debugowania (w trybie development)

**Scenariusz:** Rate limiting (zbyt wiele prób wysłania magic linka)  
**Obsługa:**
- Wyświetlenie komunikatu: "Zbyt wiele prób. Spróbuj ponownie za kilka minut."
- Przycisk jest wyłączony na określony czas (np. 60 sekund)

### Błędy weryfikacji sesji

**Scenariusz:** Wygasły lub nieprawidłowy token w magic linku  
**Obsługa:**
- Wyświetlenie komunikatu: "Link logowania wygasł lub jest nieprawidłowy. Zaloguj się ponownie."
- Użytkownik może ponownie wprowadzić e-mail i wysłać nowy magic link

**Scenariusz:** Błąd 401 z `GET /v1/auth/session`  
**Obsługa:**
- Przekierowanie do `/login` z komunikatem "Sesja wygasła. Zaloguj się ponownie."
- Sesja Supabase jest czyszczona (`supabase.auth.signOut()`)

**Scenariusz:** Błąd 500 z `GET /v1/auth/session`  
**Obsługa:**
- Wyświetlenie komunikatu: "Problem po naszej stronie. Spróbuj ponownie za chwilę."
- Użytkownik może spróbować ponownie lub skontaktować się z supportem

### Błędy sieciowe

**Scenariusz:** Brak połączenia z internetem  
**Obsługa:**
- Wyświetlenie komunikatu: "Brak połączenia z internetem. Sprawdź swoje połączenie i spróbuj ponownie."
- Przycisk jest ponownie włączony po przywróceniu połączenia

**Scenariusz:** Timeout żądania  
**Obsługa:**
- Wyświetlenie komunikatu: "Żądanie trwa zbyt długo. Spróbuj ponownie."
- Przycisk jest ponownie włączony

### Ogólne zasady obsługi błędów

1. **Neutralne komunikaty:** Nie ujawnianie, czy e-mail istnieje w systemie (bezpieczeństwo)
2. **Czytelne komunikaty:** Wszystkie komunikaty błędów po polsku, zrozumiałe dla użytkownika
3. **Możliwość ponowienia:** Po błędzie użytkownik zawsze może spróbować ponownie (chyba że jest rate limiting)
4. **Logowanie błędów:** W trybie development błędy są logowane w konsoli dla debugowania
5. **Dostępność:** Wszystkie komunikaty błędów są dostępne dla czytników ekranu (aria-describedby, role="alert")

## 11. Kroki implementacji

1. **Utworzenie strony Astro `/login`**
   - Utworzenie pliku `src/pages/login.astro`
   - Dodanie podstawowej struktury HTML z Layout
   - Dodanie logiki sprawdzania sesji i przekierowania dla już zalogowanych użytkowników
   - Import React komponentu `LoginForm` z `client:load`

2. **Utworzenie komponentu EmailField**
   - Utworzenie pliku `src/components/EmailField.tsx` (React)
   - Implementacja pola e-mail z label, input i komunikatem błędu
   - Dodanie obsługi dostępności (aria-invalid, aria-describedby)
   - Dodanie autoFocus przy montowaniu
   - Stylowanie z użyciem Tailwind CSS i shadcn/ui Input (jeśli dostępny)

3. **Utworzenie komponentu LoginForm**
   - Utworzenie pliku `src/components/LoginForm.tsx` (React)
   - Implementacja stanu formularza z `useState`
   - Implementacja walidacji e-maila (regex + required)
   - Implementacja `handleSubmit` z wywołaniem `supabase.auth.signInWithOtp()`
   - Dodanie obsługi błędów i sukcesów
   - Integracja z `EmailField` i `Button` (shadcn/ui)
   - Dodanie `InfoText` z opisem magic linka

4. **Dodanie obsługi przekierowań po logowaniu**
   - Implementacja nasłuchiwania na `supabase.auth.onAuthStateChange()` w `LoginForm`
   - Po pomyślnym logowaniu: wywołanie `GET /v1/auth/session` do weryfikacji
   - Sprawdzenie profilu przez `GET /v1/me/profile`
   - Przekierowanie do `/dashboard` (jeśli profil istnieje) lub `/onboarding` (jeśli brak profilu)

5. **Dodanie komponentu Toast (jeśli potrzebny)**
   - Sprawdzenie, czy shadcn/ui Toast/Sonner jest zainstalowany
   - Jeśli nie: instalacja przez `npx shadcn@latest add sonner` (lub toast)
   - Integracja ToastProvider w `LoginForm` lub na poziomie Layout
   - Wyświetlanie komunikatów sukcesu i błędów przez Toast

6. **Dodanie walidacji i obsługi błędów**
   - Implementacja szczegółowej walidacji e-maila
   - Dodanie obsługi wszystkich scenariuszy błędów (Supabase, sieć, timeout)
   - Dodanie neutralnych komunikatów błędów (nie ujawniających, czy e-mail istnieje)
   - Dodanie rate limiting (opcjonalnie, jeśli wymagane)

7. **Stylowanie i dostępność**
   - Stylowanie formularza z użyciem Tailwind CSS
   - Zapewnienie odpowiedniego kontrastu i rozmiaru czcionek
   - Dodanie focus states dla wszystkich interaktywnych elementów
   - Testowanie z czytnikiem ekranu (NVDA/JAWS)
   - Dodanie odpowiednich aria-label i aria-describedby

8. **Testowanie**
   - Testowanie wprowadzania prawidłowego i nieprawidłowego e-maila
   - Testowanie wysyłania magic linka
   - Testowanie kliknięcia w magic link i przekierowania
   - Testowanie obsługi błędów (wygasły token, błąd sieci)
   - Testowanie dostępności (klawiatura, czytnik ekranu)
   - Testowanie na różnych przeglądarkach (Chrome, Firefox, Safari)

9. **Optymalizacja i poprawki**
   - Sprawdzenie wydajności (lazy loading komponentów, jeśli potrzebne)
   - Optymalizacja re-renderów (React.memo, useCallback, jeśli potrzebne)
   - Poprawki zgodnie z feedbackiem z lintera
   - Finalne testy E2E (jeśli dostępne)

10. **Dokumentacja (opcjonalnie)**
    - Dodanie komentarzy w kodzie dla złożonych fragmentów
    - Aktualizacja dokumentacji projektu (jeśli istnieje)



