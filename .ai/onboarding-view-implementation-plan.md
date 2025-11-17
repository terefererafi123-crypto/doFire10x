# Plan implementacji widoku Onboarding

## 1. Przegląd

Widok onboarding jest kreatorem 2-krokowym, który umożliwia nowemu użytkownikowi skonfigurowanie profilu finansowego i dodanie pierwszej inwestycji. Widok prowadzi użytkownika przez proces inicjalizacji konta, zapewniając płynne przejście do dashboardu z pełnymi danymi.

**Główne cele:**
- Umożliwienie definicji profilu finansowego (krok 1)
- Umożliwienie dodania pierwszej inwestycji (krok 2)
- Zapewnienie walidacji zgodnej z regułami API
- Wyświetlanie jasnych komunikatów błędów
- Płynne przejście do dashboardu po zakończeniu

## 2. Routing widoku

**Ścieżka:** `/onboarding`

**Plik:** `src/pages/onboarding.astro`

**Uwagi:**
- Widok wymaga autoryzacji (użytkownik musi być zalogowany)
- W przypadku błędu 404 profilu z API, użytkownik powinien być automatycznie przekierowany do tego widoku
- Po pomyślnym zakończeniu obu kroków, użytkownik jest przekierowywany do `/dashboard`

## 3. Struktura komponentów

```
OnboardingPage (Astro)
├── OnboardingContainer (React - client-side)
    ├── Stepper (React)
    │   ├── StepIndicator (1/2 lub 2/2)
    │   └── ProgressBar (wizualny pasek postępu)
    ├── StepContent (React)
    │   ├── ProfileForm (React) - Krok 1
    │   │   ├── FormField (monthly_expense)
    │   │   ├── FormField (withdrawal_rate_pct)
    │   │   ├── FormField (expected_return_pct)
    │   │   ├── FormField (birth_date)
    │   │   └── ErrorDisplay (inline errors)
    │   └── InvestmentForm (React) - Krok 2
    │       ├── FormField (type - select)
    │       ├── FormField (amount)
    │       ├── FormField (acquired_at)
    │       ├── FormField (notes - optional)
    │       └── ErrorDisplay (inline errors)
    ├── NavigationButtons (React)
    │   ├── SecondaryButton ("Wstecz")
    │   └── PrimaryButton ("Dalej" / "Zakończ i przejdź do dashboardu")
    └── Toast (React) - dla błędów API
```

## 4. Szczegóły komponentów

### OnboardingPage (Astro)

**Opis:** Główny plik strony Astro, który renderuje layout i inicjalizuje komponent React OnboardingContainer.

**Główne elementy:**
- Layout wrapper (używa Layout.astro)
- Import i renderowanie OnboardingContainer jako komponentu React
- Przekazanie Supabase client z context.locals

**Obsługiwane interakcje:**
- Brak bezpośrednich interakcji (statyczny wrapper)

**Obsługiwana walidacja:**
- Brak walidacji na poziomie Astro

**Typy:**
- Brak specyficznych typów (używa standardowych typów Astro)

**Propsy:**
- Brak propsów (komponent Astro)

### OnboardingContainer (React)

**Opis:** Główny komponent React zarządzający stanem całego procesu onboarding. Kontroluje aktualny krok, dane formularzy, walidację i komunikację z API.

**Główne elementy:**
- State management dla aktualnego kroku (1 lub 2)
- State management dla danych formularzy (profileData, investmentData)
- State management dla błędów walidacji i API
- State management dla stanu ładowania
- Hook do zarządzania formularzami (useOnboardingForm)
- Integracja z API (POST /v1/me/profile, POST /v1/investments)
- Logika nawigacji między krokami
- Obsługa przekierowania po zakończeniu

**Obsługiwane interakcje:**
- Przejście do następnego kroku (po walidacji i zapisaniu)
- Powrót do poprzedniego kroku
- Zapisanie danych profilu (krok 1)
- Zapisanie inwestycji i przekierowanie (krok 2)
- Wyświetlanie błędów walidacji i API

**Obsługiwana walidacja:**
- Walidacja przed przejściem do następnego kroku
- Walidacja przed zapisaniem danych
- Wyświetlanie błędów walidacji z API

**Typy:**
- `OnboardingStep`: `1 | 2`
- `ProfileFormData`: `CreateProfileCommand`
- `InvestmentFormData`: `CreateInvestmentCommand`
- `OnboardingState`: obiekt zawierający wszystkie stany

**Propsy:**
- `supabaseClient`: `SupabaseClient<Database>` (wymagany)

### Stepper (React)

**Opis:** Komponent wyświetlający pasek postępu i aktualny krok w procesie onboarding.

**Główne elementy:**
- Wizualny pasek postępu (progres bar)
- Wskaźnik aktualnego kroku (np. "Krok 1/2", "Krok 2/2")
- Wizualne oznaczenie ukończonych kroków

**Obsługiwane interakcje:**
- Brak interakcji (tylko wyświetlanie)

**Obsługiwana walidacja:**
- Brak walidacji

**Typy:**
- `StepperProps`: `{ currentStep: OnboardingStep; totalSteps: number }`

**Propsy:**
- `currentStep`: `OnboardingStep` (wymagany)
- `totalSteps`: `number` (opcjonalny, domyślnie 2)

### ProfileForm (React)

**Opis:** Formularz do wprowadzania danych profilu finansowego (krok 1). Zawiera pola: monthly_expense, withdrawal_rate_pct, expected_return_pct, birth_date.

**Główne elementy:**
- Input dla `monthly_expense` (number, >= 0)
- Input dla `withdrawal_rate_pct` (number, 0-100)
- Input dla `expected_return_pct` (number, -100 do 1000)
- Input dla `birth_date` (date picker, ISO format YYYY-MM-DD, opcjonalny)
- Inline error messages dla każdego pola
- Oznaczenia pól wymaganych (gwiazdka)

**Obsługiwane interakcje:**
- Wprowadzanie danych w polach formularza
- Walidacja w czasie rzeczywistym (onBlur lub onChange)
- Wyświetlanie błędów walidacji

**Obsługiwana walidacja:**
- `monthly_expense`: wymagane, >= 0, liczba skończona
- `withdrawal_rate_pct`: wymagane, 0-100, liczba skończona
- `expected_return_pct`: wymagane, -100 do 1000, liczba skończona
- `birth_date`: opcjonalne, format YYYY-MM-DD, data w przeszłości, nie starsza niż 120 lat

**Typy:**
- `ProfileFormData`: `CreateProfileCommand`
- `ProfileFormErrors`: `Record<string, string>`

**Propsy:**
- `data`: `ProfileFormData` (wymagany)
- `errors`: `ProfileFormErrors` (wymagany)
- `onChange`: `(field: keyof ProfileFormData, value: unknown) => void` (wymagany)
- `onBlur`: `(field: keyof ProfileFormData) => void` (opcjonalny)

### InvestmentForm (React)

**Opis:** Formularz do wprowadzania danych pierwszej inwestycji (krok 2). Zawiera pola: type, amount, acquired_at, notes (opcjonalne).

**Główne elementy:**
- Select dla `type` (enum: etf, bond, stock, cash)
- Input dla `amount` (number, > 0)
- Input dla `acquired_at` (date picker, ISO format YYYY-MM-DD, <= dziś)
- Textarea dla `notes` (opcjonalne, 1-1000 znaków)
- Inline error messages dla każdego pola
- Oznaczenia pól wymaganych (gwiazdka)
- Oznaczenie pola `notes` jako opcjonalne

**Obsługiwane interakcje:**
- Wprowadzanie danych w polach formularza
- Walidacja w czasie rzeczywistym (onBlur lub onChange)
- Wyświetlanie błędów walidacji

**Obsługiwana walidacja:**
- `type`: wymagane, enum (etf, bond, stock, cash)
- `amount`: wymagane, > 0, liczba skończona, max 999999999999.99
- `acquired_at`: wymagane, format YYYY-MM-DD, data <= dziś
- `notes`: opcjonalne, 1-1000 znaków po trim, lub null

**Typy:**
- `InvestmentFormData`: `CreateInvestmentCommand`
- `InvestmentFormErrors`: `Record<string, string>`

**Propsy:**
- `data`: `InvestmentFormData` (wymagany)
- `errors`: `InvestmentFormErrors` (wymagany)
- `onChange`: `(field: keyof InvestmentFormData, value: unknown) => void` (wymagany)
- `onBlur`: `(field: keyof InvestmentFormData) => void` (opcjonalny)

### NavigationButtons (React)

**Opis:** Komponent zawierający przyciski nawigacji między krokami.

**Główne elementy:**
- SecondaryButton "Wstecz" (widoczny tylko w kroku 2)
- PrimaryButton "Dalej" (krok 1) lub "Zakończ i przejdź do dashboardu" (krok 2)
- Stan disabled dla przycisków podczas ładowania

**Obsługiwane interakcje:**
- Kliknięcie "Wstecz" - powrót do kroku 1
- Kliknięcie "Dalej" - walidacja i zapisanie profilu, przejście do kroku 2
- Kliknięcie "Zakończ i przejdź do dashboardu" - walidacja, zapisanie inwestycji, przekierowanie

**Obsługiwana walidacja:**
- Przyciski są disabled podczas ładowania
- Przycisk "Dalej" jest disabled jeśli formularz jest nieprawidłowy

**Typy:**
- `NavigationButtonsProps`: `{ currentStep: OnboardingStep; isLoading: boolean; onBack: () => void; onNext: () => void; isFormValid: boolean }`

**Propsy:**
- `currentStep`: `OnboardingStep` (wymagany)
- `isLoading`: `boolean` (wymagany)
- `onBack`: `() => void` (wymagany)
- `onNext`: `() => void` (wymagany)
- `isFormValid`: `boolean` (wymagany)

### Toast (React)

**Opis:** Komponent do wyświetlania komunikatów błędów z API (400, 409, 401, 500).

**Główne elementy:**
- Toast notification z komunikatem błędu
- Automatyczne ukrywanie po określonym czasie
- Różne style dla różnych typów błędów (error, warning)

**Obsługiwane interakcje:**
- Wyświetlanie komunikatu błędu
- Ręczne zamknięcie (przycisk X)
- Automatyczne zamknięcie po czasie

**Obsługiwana walidacja:**
- Brak walidacji

**Typy:**
- `ToastProps`: `{ message: string; type: 'error' | 'warning' | 'success'; onClose: () => void }`

**Propsy:**
- `message`: `string` (wymagany)
- `type`: `'error' | 'warning' | 'success'` (wymagany)
- `onClose`: `() => void` (wymagany)

## 5. Typy

### Typy podstawowe

```typescript
// Typ kroku onboarding
type OnboardingStep = 1 | 2;

// Typy formularzy (używają DTO z types.ts)
type ProfileFormData = CreateProfileCommand;
type InvestmentFormData = CreateInvestmentCommand;

// Typy błędów walidacji
type ProfileFormErrors = Record<string, string>;
type InvestmentFormErrors = Record<string, string>;

// Typ stanu onboarding
interface OnboardingState {
  currentStep: OnboardingStep;
  profileData: ProfileFormData;
  investmentData: InvestmentFormData;
  profileErrors: ProfileFormErrors;
  investmentErrors: InvestmentFormErrors;
  isLoading: boolean;
  apiError: string | null;
}
```

### Typy ViewModel

```typescript
// ViewModel dla formularza profilu
interface ProfileFormViewModel {
  monthly_expense: {
    value: number;
    error: string | null;
    required: true;
    label: string;
    placeholder: string;
    type: 'number';
    min: 0;
    step: 0.01;
  };
  withdrawal_rate_pct: {
    value: number;
    error: string | null;
    required: true;
    label: string;
    placeholder: string;
    type: 'number';
    min: 0;
    max: 100;
    step: 0.01;
  };
  expected_return_pct: {
    value: number;
    error: string | null;
    required: true;
    label: string;
    placeholder: string;
    type: 'number';
    min: -100;
    max: 1000;
    step: 0.01;
  };
  birth_date: {
    value: string | null;
    error: string | null;
    required: false;
    label: string;
    placeholder: string;
    type: 'date';
    max: string; // dzisiejsza data
    min: string; // data sprzed 120 lat
  };
}

// ViewModel dla formularza inwestycji
interface InvestmentFormViewModel {
  type: {
    value: AssetType;
    error: string | null;
    required: true;
    label: string;
    options: Array<{ value: AssetType; label: string }>;
  };
  amount: {
    value: number;
    error: string | null;
    required: true;
    label: string;
    placeholder: string;
    type: 'number';
    min: 0.01;
    step: 0.01;
    max: 999999999999.99;
  };
  acquired_at: {
    value: string;
    error: string | null;
    required: true;
    label: string;
    placeholder: string;
    type: 'date';
    max: string; // dzisiejsza data
  };
  notes: {
    value: string | null;
    error: string | null;
    required: false;
    label: string;
    placeholder: string;
    type: 'textarea';
    maxLength: 1000;
    rows: 3;
  };
}
```

### Typy dla API

Widok używa następujących typów z `src/types.ts`:
- `CreateProfileCommand` - dla danych profilu
- `CreateInvestmentCommand` - dla danych inwestycji
- `ProfileDto` - dla odpowiedzi z API (POST /v1/me/profile)
- `InvestmentDto` - dla odpowiedzi z API (POST /v1/investments)
- `ApiError` - dla błędów z API
- `AssetType` - dla typu inwestycji

## 6. Zarządzanie stanem

### Stan lokalny komponentu OnboardingContainer

Stan jest zarządzany za pomocą React hooks (`useState`, `useCallback`):

```typescript
const [currentStep, setCurrentStep] = useState<OnboardingStep>(1);
const [profileData, setProfileData] = useState<ProfileFormData>({
  monthly_expense: 0,
  withdrawal_rate_pct: 4,
  expected_return_pct: 7,
  birth_date: undefined,
});
const [investmentData, setInvestmentData] = useState<InvestmentFormData>({
  type: 'etf',
  amount: 0,
  acquired_at: new Date().toISOString().split('T')[0],
  notes: undefined,
});
const [profileErrors, setProfileErrors] = useState<ProfileFormErrors>({});
const [investmentErrors, setInvestmentErrors] = useState<InvestmentFormErrors>({});
const [isLoading, setIsLoading] = useState(false);
const [apiError, setApiError] = useState<string | null>(null);
```

### Custom Hook: useOnboardingForm

Hook do zarządzania logiką formularzy i walidacją:

```typescript
function useOnboardingForm() {
  // Walidacja formularza profilu
  const validateProfileForm = useCallback((data: ProfileFormData): ProfileFormErrors => {
    const errors: ProfileFormErrors = {};
    
    // Walidacja zgodna z regułami API
    if (data.monthly_expense < 0 || !isFinite(data.monthly_expense)) {
      errors.monthly_expense = 'Miesięczne wydatki muszą być >= 0';
    }
    if (data.withdrawal_rate_pct < 0 || data.withdrawal_rate_pct > 100 || !isFinite(data.withdrawal_rate_pct)) {
      errors.withdrawal_rate_pct = 'Stopa wypłat musi być w zakresie 0-100';
    }
    if (data.expected_return_pct < -100 || data.expected_return_pct > 1000 || !isFinite(data.expected_return_pct)) {
      errors.expected_return_pct = 'Oczekiwany zwrot musi być w zakresie -100 do 1000';
    }
    if (data.birth_date) {
      const date = new Date(data.birth_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const maxAge = new Date();
      maxAge.setFullYear(today.getFullYear() - 120);
      maxAge.setHours(0, 0, 0, 0);
      
      if (date >= today) {
        errors.birth_date = 'Data urodzenia musi być w przeszłości';
      } else if (date < maxAge) {
        errors.birth_date = 'Data urodzenia nie może być starsza niż 120 lat';
      }
    }
    
    return errors;
  }, []);

  // Walidacja formularza inwestycji
  const validateInvestmentForm = useCallback((data: InvestmentFormData): InvestmentFormErrors => {
    const errors: InvestmentFormErrors = {};
    
    // Walidacja zgodna z regułami API
    if (!data.type || !['etf', 'bond', 'stock', 'cash'].includes(data.type)) {
      errors.type = 'Wybierz typ inwestycji';
    }
    if (data.amount <= 0 || !isFinite(data.amount) || data.amount > 999999999999.99) {
      errors.amount = 'Kwota musi być większa od 0 i mniejsza niż 999999999999.99';
    }
    if (!data.acquired_at) {
      errors.acquired_at = 'Data nabycia jest wymagana';
    } else {
      const date = new Date(data.acquired_at);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      date.setHours(0, 0, 0, 0);
      
      if (date > today) {
        errors.acquired_at = 'Data nabycia nie może być w przyszłości';
      }
    }
    if (data.notes !== undefined && data.notes !== null) {
      const trimmed = data.notes.trim();
      if (trimmed.length > 0 && trimmed.length > 1000) {
        errors.notes = 'Notatki nie mogą przekraczać 1000 znaków';
      }
    }
    
    return errors;
  }, []);

  return {
    validateProfileForm,
    validateInvestmentForm,
  };
}
```

### Custom Hook: useOnboardingApi

Hook do zarządzania wywołaniami API:

```typescript
function useOnboardingApi(supabaseClient: SupabaseClient<Database>) {
  const createProfile = useCallback(async (data: CreateProfileCommand): Promise<ProfileDto> => {
    // Pobranie tokenu z Supabase
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session) {
      throw new Error('Brak sesji');
    }

    const response = await fetch('/api/v1/me/profile', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error: ApiError = await response.json();
      throw error;
    }

    return response.json();
  }, [supabaseClient]);

  const createInvestment = useCallback(async (data: CreateInvestmentCommand): Promise<InvestmentDto> => {
    // Pobranie tokenu z Supabase
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session) {
      throw new Error('Brak sesji');
    }

    const response = await fetch('/api/v1/investments', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error: ApiError = await response.json();
      throw error;
    }

    return response.json();
  }, [supabaseClient]);

  return {
    createProfile,
    createInvestment,
  };
}
```

## 7. Integracja API

### POST /v1/me/profile

**Endpoint:** `POST /api/v1/me/profile`

**Request:**
- Headers:
  - `Authorization: Bearer <Supabase-JWT>` (wymagany)
  - `Content-Type: application/json` (wymagany)
- Body: `CreateProfileCommand`
  ```typescript
  {
    monthly_expense: number; // >= 0
    withdrawal_rate_pct: number; // 0-100
    expected_return_pct: number; // -100 do 1000
    birth_date?: string | null; // YYYY-MM-DD, opcjonalne
  }
  ```

**Response:**
- 201 Created: `ProfileDto`
- 400 Bad Request: `ApiError` z polami błędów walidacji
- 401 Unauthorized: `ApiError`
- 409 Conflict: `ApiError` (profil już istnieje)
- 500 Internal Server Error: `ApiError`

**Obsługa w komponencie:**
- Wywołanie w kroku 1 po kliknięciu "Dalej"
- Walidacja przed wysłaniem
- Obsługa błędów walidacji (400) - wyświetlenie błędów w polach formularza
- Obsługa błędu 409 - wyświetlenie komunikatu w Toast
- Obsługa błędu 401 - przekierowanie do logowania
- Po sukcesie - przejście do kroku 2

### POST /v1/investments

**Endpoint:** `POST /api/v1/investments`

**Request:**
- Headers:
  - `Authorization: Bearer <Supabase-JWT>` (wymagany)
  - `Content-Type: application/json` (wymagany)
- Body: `CreateInvestmentCommand`
  ```typescript
  {
    type: AssetType; // 'etf' | 'bond' | 'stock' | 'cash'
    amount: number; // > 0, max 999999999999.99
    acquired_at: string; // YYYY-MM-DD, <= dziś
    notes?: string | null; // opcjonalne, 1-1000 znaków
  }
  ```

**Response:**
- 201 Created: `InvestmentDto`
- 400 Bad Request: `ApiError` z polami błędów walidacji
- 401 Unauthorized: `ApiError`
- 500 Internal Server Error: `ApiError`

**Obsługa w komponencie:**
- Wywołanie w kroku 2 po kliknięciu "Zakończ i przejdź do dashboardu"
- Walidacja przed wysłaniem
- Obsługa błędów walidacji (400) - wyświetlenie błędów w polach formularza
- Obsługa błędu 401 - przekierowanie do logowania
- Po sukcesie - przekierowanie do `/dashboard`

## 8. Interakcje użytkownika

### Krok 1 - Profil

1. **Wprowadzanie danych:**
   - Użytkownik wprowadza dane w polach formularza
   - Walidacja w czasie rzeczywistym (onBlur) dla każdego pola
   - Wyświetlanie błędów walidacji pod polami

2. **Kliknięcie "Dalej":**
   - Walidacja wszystkich pól formularza
   - Jeśli błędy - wyświetlenie komunikatów, blokada przejścia
   - Jeśli OK - wywołanie API POST /v1/me/profile
   - Podczas ładowania - wyłączenie przycisku, wyświetlenie spinnera
   - Po sukcesie - przejście do kroku 2
   - Po błędzie - wyświetlenie komunikatu w Toast i błędów w polach

### Krok 2 - Inwestycja

1. **Wprowadzanie danych:**
   - Użytkownik wprowadza dane w polach formularza
   - Walidacja w czasie rzeczywistym (onBlur) dla każdego pola
   - Wyświetlanie błędów walidacji pod polami

2. **Kliknięcie "Wstecz":**
   - Powrót do kroku 1 (bez zapisywania danych inwestycji)

3. **Kliknięcie "Zakończ i przejdź do dashboardu":**
   - Walidacja wszystkich pól formularza
   - Jeśli błędy - wyświetlenie komunikatów, blokada zapisu
   - Jeśli OK - wywołanie API POST /v1/investments
   - Podczas ładowania - wyłączenie przycisku, wyświetlenie spinnera
   - Po sukcesie - przekierowanie do `/dashboard`
   - Po błędzie - wyświetlenie komunikatu w Toast i błędów w polach

### Obsługa błędów API

1. **Błąd 400 (Bad Request):**
   - Wyświetlenie błędów walidacji w odpowiednich polach formularza
   - Wyświetlenie ogólnego komunikatu w Toast

2. **Błąd 401 (Unauthorized):**
   - Wyświetlenie komunikatu "Zaloguj ponownie" w Toast
   - Przekierowanie do strony logowania

3. **Błąd 409 (Conflict) - tylko dla profilu:**
   - Wyświetlenie komunikatu "Profil już istnieje" w Toast
   - Przekierowanie do dashboardu (użytkownik już ma profil)

4. **Błąd 500 (Internal Server Error):**
   - Wyświetlenie komunikatu "Wystąpił błąd serwera. Spróbuj ponownie." w Toast

## 9. Warunki i walidacja

### Walidacja formularza profilu (krok 1)

**Pole: monthly_expense**
- Wymagane: Tak
- Typ: number
- Warunki: >= 0, liczba skończona
- Komunikat błędu: "Miesięczne wydatki muszą być >= 0"

**Pole: withdrawal_rate_pct**
- Wymagane: Tak
- Typ: number
- Warunki: 0-100, liczba skończona
- Komunikat błędu: "Stopa wypłat musi być w zakresie 0-100"

**Pole: expected_return_pct**
- Wymagane: Tak
- Typ: number
- Warunki: -100 do 1000, liczba skończona
- Komunikat błędu: "Oczekiwany zwrot musi być w zakresie -100 do 1000"

**Pole: birth_date**
- Wymagane: Nie
- Typ: string (YYYY-MM-DD) lub null
- Warunki: data w przeszłości, nie starsza niż 120 lat
- Komunikat błędu: "Data urodzenia musi być w przeszłości" lub "Data urodzenia nie może być starsza niż 120 lat"

**Walidacja przed przejściem do kroku 2:**
- Wszystkie pola wymagane muszą być wypełnione
- Wszystkie pola muszą przejść walidację
- Brak błędów walidacji

### Walidacja formularza inwestycji (krok 2)

**Pole: type**
- Wymagane: Tak
- Typ: enum ('etf' | 'bond' | 'stock' | 'cash')
- Warunki: musi być jednym z dozwolonych wartości
- Komunikat błędu: "Wybierz typ inwestycji"

**Pole: amount**
- Wymagane: Tak
- Typ: number
- Warunki: > 0, liczba skończona, max 999999999999.99
- Komunikat błędu: "Kwota musi być większa od 0 i mniejsza niż 999999999999.99"

**Pole: acquired_at**
- Wymagane: Tak
- Typ: string (YYYY-MM-DD)
- Warunki: data <= dziś
- Komunikat błędu: "Data nabycia nie może być w przyszłości"

**Pole: notes**
- Wymagane: Nie
- Typ: string lub null
- Warunki: jeśli podane, 1-1000 znaków po trim
- Komunikat błędu: "Notatki nie mogą przekraczać 1000 znaków"

**Walidacja przed zapisaniem:**
- Wszystkie pola wymagane muszą być wypełnione
- Wszystkie pola muszą przejść walidację
- Brak błędów walidacji

### Mapowanie błędów API na komunikaty użytkownika

**Kody błędów z API (fields):**
- `must_be_gte_zero` → "Wartość musi być >= 0"
- `must_be_lte_100` → "Wartość musi być <= 100"
- `must_be_gte_minus_100` → "Wartość musi być >= -100"
- `must_be_lte_1000` → "Wartość musi być <= 1000"
- `must_be_in_past_and_within_last_120_years` → "Data urodzenia musi być w przeszłości i nie starsza niż 120 lat"
- `amount_must_be_positive` → "Kwota musi być większa od 0"
- `acquired_at_cannot_be_future` → "Data nabycia nie może być w przyszłości"
- `must_be_one_of_etf_bond_stock_cash` → "Wybierz typ inwestycji"
- `invalid_date_format` → "Nieprawidłowy format daty (wymagany: YYYY-MM-DD)"
- `notes_cannot_be_empty` → "Notatki nie mogą być puste"
- `must_not_exceed_1000_characters` → "Notatki nie mogą przekraczać 1000 znaków"

## 10. Obsługa błędów

### Błędy walidacji lokalnej

**Scenariusz:** Użytkownik wprowadza nieprawidłowe dane
- **Obsługa:** Wyświetlenie komunikatu błędu pod odpowiednim polem
- **Stan:** Formularz pozostaje aktywny, przycisk "Dalej" jest disabled

### Błędy walidacji API (400)

**Scenariusz:** API zwraca błędy walidacji
- **Obsługa:** 
  - Mapowanie kodów błędów z `fields` na komunikaty użytkownika
  - Wyświetlenie błędów w odpowiednich polach formularza
  - Wyświetlenie ogólnego komunikatu w Toast
- **Stan:** Formularz pozostaje aktywny, użytkownik może poprawić błędy

### Błąd 401 (Unauthorized)

**Scenariusz:** Token wygasł lub jest nieprawidłowy
- **Obsługa:** 
  - Wyświetlenie komunikatu "Zaloguj ponownie" w Toast
  - Przekierowanie do strony logowania (`/login`)
- **Stan:** Sesja użytkownika jest nieważna

### Błąd 409 (Conflict) - tylko dla profilu

**Scenariusz:** Profil już istnieje dla użytkownika
- **Obsługa:** 
  - Wyświetlenie komunikatu "Profil już istnieje" w Toast
  - Przekierowanie do dashboardu (`/dashboard`)
- **Stan:** Użytkownik już ma profil, nie powinien być w onboarding

### Błąd 500 (Internal Server Error)

**Scenariusz:** Błąd serwera
- **Obsługa:** 
  - Wyświetlenie komunikatu "Wystąpił błąd serwera. Spróbuj ponownie." w Toast
  - Formularz pozostaje aktywny, użytkownik może spróbować ponownie
- **Stan:** Formularz pozostaje aktywny

### Błędy sieciowe

**Scenariusz:** Brak połączenia z serwerem
- **Obsługa:** 
  - Wyświetlenie komunikatu "Brak połączenia z serwerem. Sprawdź połączenie internetowe." w Toast
  - Formularz pozostaje aktywny, użytkownik może spróbować ponownie
- **Stan:** Formularz pozostaje aktywny

### Edge cases

1. **Użytkownik odświeża stronę podczas onboarding:**
   - Dane formularzy są tracone (brak persistencji w MVP)
   - Użytkownik musi rozpocząć od nowa

2. **Użytkownik ma już profil i próbuje wejść do onboarding:**
   - Middleware powinien przekierować do dashboardu
   - Jeśli użytkownik jakoś wejdzie, błąd 409 przekieruje go

3. **Użytkownik wypełnia formularz bardzo długo:**
   - Token może wygasnąć
   - Błąd 401 przekieruje do logowania

## 11. Kroki implementacji

### Krok 1: Przygotowanie struktury plików

1. Utworzenie pliku `src/pages/onboarding.astro`
2. Utworzenie katalogu `src/components/onboarding/`
3. Utworzenie plików komponentów:
   - `src/components/onboarding/OnboardingContainer.tsx`
   - `src/components/onboarding/Stepper.tsx`
   - `src/components/onboarding/ProfileForm.tsx`
   - `src/components/onboarding/InvestmentForm.tsx`
   - `src/components/onboarding/NavigationButtons.tsx`

### Krok 2: Implementacja komponentu Stepper

1. Utworzenie komponentu `Stepper.tsx`
2. Implementacja wizualnego paska postępu
3. Implementacja wskaźnika kroku (1/2, 2/2)
4. Stylowanie z użyciem Tailwind CSS

### Krok 3: Implementacja komponentu ProfileForm

1. Utworzenie komponentu `ProfileForm.tsx`
2. Implementacja pól formularza:
   - Input dla monthly_expense
   - Input dla withdrawal_rate_pct
   - Input dla expected_return_pct
   - Date picker dla birth_date
3. Implementacja walidacji lokalnej (onBlur)
4. Implementacja wyświetlania błędów
5. Oznaczenie pól wymaganych (gwiazdka)

### Krok 4: Implementacja komponentu InvestmentForm

1. Utworzenie komponentu `InvestmentForm.tsx`
2. Implementacja pól formularza:
   - Select dla type
   - Input dla amount
   - Date picker dla acquired_at
   - Textarea dla notes
3. Implementacja walidacji lokalnej (onBlur)
4. Implementacja wyświetlania błędów
5. Oznaczenie pól wymaganych (gwiazdka)
6. Oznaczenie pola notes jako opcjonalne

### Krok 5: Implementacja custom hooks

1. Utworzenie pliku `src/lib/hooks/useOnboardingForm.ts`
2. Implementacja funkcji walidacji:
   - `validateProfileForm`
   - `validateInvestmentForm`
3. Utworzenie pliku `src/lib/hooks/useOnboardingApi.ts`
4. Implementacja funkcji API:
   - `createProfile`
   - `createInvestment`

### Krok 6: Implementacja komponentu NavigationButtons

1. Utworzenie komponentu `NavigationButtons.tsx`
2. Implementacja przycisku "Wstecz" (tylko w kroku 2)
3. Implementacja przycisku "Dalej" / "Zakończ i przejdź do dashboardu"
4. Implementacja stanu disabled podczas ładowania
5. Integracja z komponentami Button z Shadcn/ui

### Krok 7: Implementacja komponentu OnboardingContainer

1. Utworzenie komponentu `OnboardingContainer.tsx`
2. Implementacja zarządzania stanem:
   - currentStep
   - profileData, investmentData
   - profileErrors, investmentErrors
   - isLoading, apiError
3. Implementacja logiki nawigacji:
   - Przejście do kroku 2 po zapisaniu profilu
   - Powrót do kroku 1
   - Przekierowanie do dashboardu po zapisaniu inwestycji
4. Integracja z custom hooks
5. Implementacja obsługi błędów API
6. Integracja z komponentami formularzy i nawigacji

### Krok 8: Implementacja strony Astro

1. Utworzenie pliku `src/pages/onboarding.astro`
2. Import i renderowanie OnboardingContainer
3. Przekazanie Supabase client z context.locals
4. Dodanie layoutu (Layout.astro)
5. Dodanie meta tagów i tytułu strony

### Krok 9: Implementacja komponentu Toast

1. Sprawdzenie czy komponent Toast istnieje w Shadcn/ui
2. Jeśli nie - utworzenie komponentu `src/components/ui/toast.tsx`
3. Implementacja wyświetlania komunikatów błędów
4. Integracja z OnboardingContainer

### Krok 10: Implementacja mapowania błędów API

1. Utworzenie pliku `src/lib/utils/error-mapper.ts`
2. Implementacja funkcji mapującej kody błędów API na komunikaty użytkownika
3. Integracja z OnboardingContainer

### Krok 11: Stylowanie i UX

1. Stylowanie wszystkich komponentów z użyciem Tailwind CSS
2. Dodanie animacji przejść między krokami
3. Dodanie spinnera podczas ładowania
4. Upewnienie się, że wszystkie komunikaty są czytelne
5. Testowanie responsywności

### Krok 12: Testowanie

1. Testowanie walidacji formularzy
2. Testowanie wywołań API
3. Testowanie obsługi błędów
4. Testowanie nawigacji między krokami
5. Testowanie przekierowań
6. Testowanie edge cases

### Krok 13: Integracja z middleware

1. Sprawdzenie czy middleware przekierowuje użytkowników bez profilu do onboarding
2. Sprawdzenie czy middleware przekierowuje użytkowników z profilem z onboarding do dashboardu
3. Ewentualne poprawki w middleware

### Krok 14: Dokumentacja i finalizacja

1. Dodanie komentarzy do kodu
2. Sprawdzenie zgodności z PRD
3. Sprawdzenie zgodności z API plan
4. Finalne testy end-to-end
5. Code review i poprawki

