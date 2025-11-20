# Plan implementacji widoku Walidacje i błędy (US-006)

## 1. Przegląd

Widok walidacji i błędów nie jest osobnym widokiem, ale systemem obsługi błędów zintegrowanym z formularzami inwestycji oraz globalnym systemem obsługi błędów aplikacji. System zapewnia spójne wyświetlanie komunikatów błędów walidacji pól formularzy oraz globalnych błędów autoryzacji i serwera.

**Główne cele:**

- Wyświetlanie błędów walidacji pól formularzy inwestycji (inline errors)
- Mapowanie kodów błędów API na czytelne komunikaty po polsku
- Globalna obsługa błędów autoryzacji (401/403) z przekierowaniem do logowania
- Obsługa błędów serwera (5xx) i rate limiting (429)
- Integracja z formularzami w `/investments` i onboarding krok 2

**Zakres:**

- Formularz dodawania/edycji inwestycji (`/investments`)
- Formularz pierwszej inwestycji (onboarding krok 2)
- Globalne błędy autoryzacji i serwera (Layout)

## 2. Routing widoku

**Uwaga:** Widok walidacji i błędów nie ma własnej ścieżki routingu. Jest zintegrowany z:

- `/investments` - formularz dodawania/edycji inwestycji
- `/onboarding` - formularz pierwszej inwestycji (krok 2)
- Layout aplikacji - globalne błędy (401/403, 5xx, 429)

## 3. Struktura komponentów

```
AppLayout (Astro/React)
├── GlobalErrorBanner (React) - dla błędów 401/403/5xx/429
│   └── ErrorMessage (React) - komunikat błędu
│
InvestmentForm / InvestmentFormModal (React)
├── FormField (React) - dla każdego pola
│   ├── Label
│   ├── Input/Select/Textarea
│   ├── ErrorMessage (React) - inline error dla pola
│   └── HelperText (opcjonalny)
├── FormErrorSummary (React) - podsumowanie błędów (opcjonalne)
└── Toast (React) - dla błędów API (opcjonalne)

OnboardingContainer (React) - Krok 2
└── InvestmentForm (React) - reużywa komponenty powyżej

ErrorDisplay (React) - komponent pomocniczy
├── FieldError (React) - błąd dla pojedynczego pola
└── ErrorMessage (React) - ogólny komunikat błędu
```

## 4. Szczegóły komponentów

### GlobalErrorBanner (React)

**Opis:** Globalny baner wyświetlany u góry strony dla błędów autoryzacji, serwera i rate limiting. Jest częścią Layout aplikacji i wyświetla się automatycznie przy wykryciu odpowiednich błędów.

**Główne elementy:**

- Kontener banera z odpowiednim kolorem (czerwony dla błędów, żółty dla ostrzeżeń)
- Komunikat błędu dostosowany do typu błędu
- Przycisk akcji (np. "Zaloguj ponownie" dla 401/403)
- Możliwość zamknięcia banera (dla błędów 5xx/429)

**Obsługiwane interakcje:**

- Wyświetlanie banera przy błędzie 401/403 (sesja wygasła)
- Wyświetlanie banera przy błędzie 5xx (błąd serwera)
- Wyświetlanie banera przy błędzie 429 (rate limiting)
- Przekierowanie do `/login` przy 401/403
- Zamknięcie banera (dla błędów 5xx/429)

**Obsługiwana walidacja:**

- Brak walidacji (komponent wyświetla tylko komunikaty)

**Typy:**

- `GlobalErrorBannerProps`:
  - `error: ApiError | null` - błąd do wyświetlenia
  - `onDismiss?: () => void` - callback do zamknięcia banera
  - `onRedirect?: () => void` - callback do przekierowania

**Propsy:**

- `error: ApiError | null` - błąd API do wyświetlenia
- `onDismiss?: () => void` - opcjonalny callback do zamknięcia banera
- `onRedirect?: () => void` - opcjonalny callback do przekierowania

### FormField (React)

**Opis:** Uniwersalny komponent pola formularza z obsługą błędów walidacji. Używany w formularzach inwestycji do wyświetlania pól z etykietami, walidacją i komunikatami błędów.

**Główne elementy:**

- Label z opcjonalną gwiazdką dla pól wymaganych
- Input/Select/Textarea (w zależności od typu pola)
- Komunikat błędu wyświetlany pod polem (inline error)
- Opcjonalny tekst pomocniczy (helper text)
- Wizualne oznaczenie błędu (czerwona ramka, ikona błędu)

**Obsługiwane interakcje:**

- Wyświetlanie błędu walidacji pod polem
- Zmiana stylu pola przy błędzie (czerwona ramka)
- Powiązanie komunikatu błędu z polem przez `aria-describedby`
- Automatyczne fokusowanie pola z błędem (opcjonalne)

**Obsługiwana walidacja:**

- Wyświetlanie błędów walidacji z API (field-wise errors)
- Wyświetlanie błędów walidacji po stronie klienta (przed wysłaniem)

**Typy:**

- `FormFieldProps<T>`:
  - `label: string` - etykieta pola
  - `name: string` - nazwa pola (dla formularza)
  - `required?: boolean` - czy pole jest wymagane
  - `error?: string` - komunikat błędu do wyświetlenia
  - `helperText?: string` - opcjonalny tekst pomocniczy
  - `children: React.ReactNode` - input/select/textarea jako dziecko
  - `className?: string` - dodatkowe klasy CSS

**Propsy:**

- `label: string` - etykieta pola
- `name: string` - nazwa pola
- `required?: boolean` - czy pole jest wymagane
- `error?: string` - komunikat błędu
- `helperText?: string` - tekst pomocniczy
- `children: React.ReactNode` - element input/select/textarea
- `className?: string` - dodatkowe klasy CSS

### ErrorMessage (React)

**Opis:** Komponent wyświetlający komunikat błędu. Używany zarówno w FormField (inline errors) jak i w GlobalErrorBanner (globalne błędy).

**Główne elementy:**

- Tekst komunikatu błędu
- Opcjonalna ikona błędu
- Stylowanie odpowiednie do kontekstu (inline vs banner)

**Obsługiwane interakcje:**

- Wyświetlanie komunikatu błędu
- Brak interakcji użytkownika (tylko wyświetlanie)

**Obsługiwana walidacja:**

- Brak walidacji (komponent wyświetla tylko komunikat)

**Typy:**

- `ErrorMessageProps`:
  - `message: string` - komunikat błędu
  - `variant?: "inline" | "banner"` - wariant wyświetlania
  - `className?: string` - dodatkowe klasy CSS

**Propsy:**

- `message: string` - komunikat błędu
- `variant?: "inline" | "banner"` - wariant (domyślnie "inline")
- `className?: string` - dodatkowe klasy CSS

### FormErrorSummary (React)

**Opis:** Opcjonalny komponent wyświetlający podsumowanie wszystkich błędów formularza u góry formularza. Pomaga użytkownikowi szybko zobaczyć wszystkie błędy bez przewijania.

**Główne elementy:**

- Lista wszystkich błędów formularza
- Linki do pól z błędami (scroll do pola)
- Komunikat "Proszę poprawić następujące błędy"

**Obsługiwane interakcje:**

- Wyświetlanie listy błędów
- Scroll do pola z błędem po kliknięciu w link
- Automatyczne ukrywanie po poprawieniu wszystkich błędów

**Obsługiwana walidacja:**

- Wyświetlanie wszystkich błędów z obiektu `fields` z odpowiedzi API

**Typy:**

- `FormErrorSummaryProps`:
  - `errors: Record<string, string>` - obiekt z błędami (nazwa pola -> kod błędu)
  - `onFieldClick?: (fieldName: string) => void` - callback do scroll do pola
  - `className?: string` - dodatkowe klasy CSS

**Propsy:**

- `errors: Record<string, string>` - obiekt z błędami
- `onFieldClick?: (fieldName: string) => callback` - callback do scroll do pola
- `className?: string` - dodatkowe klasy CSS

### InvestmentForm / InvestmentFormModal (React)

**Opis:** Formularz dodawania/edycji inwestycji z integracją obsługi błędów walidacji. Używany w `/investments` (jako modal) i w onboarding krok 2.

**Główne elementy:**

- FormField dla każdego pola (type, amount, acquired_at, notes)
- FormErrorSummary (opcjonalne)
- Przyciski akcji (Zapisz, Anuluj)
- Obsługa stanu ładowania
- Integracja z API (POST /v1/investments, PATCH /v1/investments/{id})

**Obsługiwane interakcje:**

- Wypełnianie formularza
- Walidacja po stronie klienta (przed wysłaniem)
- Wysyłanie formularza do API
- Wyświetlanie błędów walidacji z API
- Zamknięcie modala po sukcesie
- Reset formularza po sukcesie

**Obsługiwana walidacja:**

- Walidacja po stronie klienta (zod schema)
- Walidacja po stronie serwera (błędy z API)
- Mapowanie kodów błędów API na komunikaty po polsku

**Typy:**

- `InvestmentFormProps`:
  - `initialData?: Partial<CreateInvestmentCommand>` - dane początkowe (dla edycji)
  - `onSubmit: (data: CreateInvestmentCommand | UpdateInvestmentCommand) => Promise<void>` - callback po sukcesie
  - `onCancel?: () => void` - callback anulowania
  - `isLoading?: boolean` - stan ładowania
  - `errors?: Record<string, string>` - błędy z API

**Propsy:**

- `initialData?: Partial<CreateInvestmentCommand>` - dane początkowe
- `onSubmit: (data) => Promise<void>` - callback po sukcesie
- `onCancel?: () => void` - callback anulowania
- `isLoading?: boolean` - stan ładowania
- `errors?: Record<string, string>` - błędy z API

## 5. Typy

### ErrorMessageMap

Mapa kodów błędów API na komunikaty po polsku. Używana do tłumaczenia kodów błędów z API na czytelne komunikaty dla użytkownika.

```typescript
type ErrorMessageMap = Record<string, string>;

const investmentErrorMessages: ErrorMessageMap = {
  // Błędy walidacji amount
  amount_must_be_positive: "Kwota musi być większa od zera",
  must_be_gt_zero: "Kwota musi być większa od zera",
  exceeds_maximum_value: "Kwota przekracza maksymalną wartość",

  // Błędy walidacji acquired_at
  acquired_at_cannot_be_future: "Data nabycia nie może być z przyszłości",
  invalid_date_format: "Nieprawidłowy format daty. Oczekiwany format: YYYY-MM-DD",
  invalid_date: "Nieprawidłowa data",

  // Błędy walidacji type
  must_be_one_of_etf_bond_stock_cash: "Typ musi być jednym z: ETF, Obligacja, Akcja, Gotówka",
  invalid_enum_value: "Nieprawidłowa wartość",

  // Błędy walidacji notes
  notes_cannot_be_empty: "Notatki nie mogą być puste (jeśli podane)",
  must_be_at_least_1_character: "Notatki muszą mieć co najmniej 1 znak",
  must_not_exceed_1000_characters: "Notatki nie mogą przekraczać 1000 znaków",

  // Ogólne błędy
  invalid_type: "Nieprawidłowy typ danych",
  invalid_format: "Nieprawidłowy format",
  invalid_value: "Nieprawidłowa wartość",
  unknown_field: "Nieznane pole",
  constraint_violation: "Naruszenie ograniczenia",
  must_be_valid_uuid: "Nieprawidłowy format identyfikatora",

  // Błędy query params
  must_be_between_1_and_200: "Wartość musi być między 1 a 200",
  invalid_cursor_format: "Nieprawidłowy format kursora",
  must_be_one_of_acquired_at_desc_acquired_at_asc_amount_desc_amount_asc: "Nieprawidłowa wartość sortowania",
};
```

### ApiErrorResponse

Typ reprezentujący odpowiedź błędu z API. Zgodny z typem `ApiError` z `src/types.ts`.

```typescript
interface ApiErrorResponse {
  error: {
    code: "bad_request" | "unauthorized" | "forbidden" | "not_found" | "conflict" | "too_many_requests" | "internal";
    message: string;
    fields?: Record<string, string>; // Kody błędów dla poszczególnych pól
  };
}
```

### FormValidationErrors

Typ reprezentujący błędy walidacji formularza. Mapuje nazwy pól na komunikaty błędów.

```typescript
interface FormValidationErrors {
  [fieldName: string]: string; // Nazwa pola -> komunikat błędu (po polsku)
}
```

### GlobalErrorState

Typ reprezentujący stan globalnego błędu w aplikacji.

```typescript
interface GlobalErrorState {
  error: ApiError | null;
  dismissed: boolean;
  redirecting: boolean;
}
```

## 6. Zarządzanie stanem

### Stan błędów w formularzach

Błędy walidacji w formularzach są zarządzane lokalnie w komponencie formularza:

```typescript
// W InvestmentForm
const [fieldErrors, setFieldErrors] = useState<FormValidationErrors>({});
const [isSubmitting, setIsSubmitting] = useState(false);
const [apiError, setApiError] = useState<ApiError | null>(null);
```

**Przepływ obsługi błędów:**

1. Użytkownik wypełnia formularz
2. Walidacja po stronie klienta (zod) - błędy wyświetlane natychmiast
3. Wysyłanie formularza do API
4. W przypadku błędu 400 z `fields` - mapowanie kodów błędów na komunikaty i wyświetlenie w FormField
5. W przypadku innych błędów (401, 5xx) - wyświetlenie w Toast lub GlobalErrorBanner

### Stan globalnych błędów

Globalne błędy (401/403, 5xx, 429) są zarządzane w Layout lub przez globalny store (np. Zustand):

```typescript
// W AppLayout lub globalnym store
const [globalError, setGlobalError] = useState<GlobalErrorState>({
  error: null,
  dismissed: false,
  redirecting: false,
});
```

**Przepływ obsługi globalnych błędów:**

1. Wykrycie błędu 401/403 w dowolnym wywołaniu API
2. Ustawienie globalnego błędu w stanie
3. Wyświetlenie GlobalErrorBanner
4. Automatyczne przekierowanie do `/login` po krótkim opóźnieniu (dla 401/403)
5. Dla błędów 5xx/429 - możliwość zamknięcia banera

### Custom Hook: useApiErrorHandler

Hook pomocniczy do obsługi błędów API w formularzach:

```typescript
function useApiErrorHandler() {
  const [fieldErrors, setFieldErrors] = useState<FormValidationErrors>({});
  const [apiError, setApiError] = useState<ApiError | null>(null);

  const handleApiError = (error: ApiError, errorMessages: ErrorMessageMap) => {
    // Mapowanie błędów z API na komunikaty po polsku
    if (error.error.fields) {
      const mappedErrors: FormValidationErrors = {};
      Object.entries(error.error.fields).forEach(([field, code]) => {
        mappedErrors[field] = errorMessages[code] || error.error.message;
      });
      setFieldErrors(mappedErrors);
    } else {
      setApiError(error);
    }
  };

  const clearErrors = () => {
    setFieldErrors({});
    setApiError(null);
  };

  return { fieldErrors, apiError, handleApiError, clearErrors };
}
```

## 7. Integracja API

### Endpointy używane przez system walidacji

#### POST /v1/investments

- **Opis:** Tworzenie nowej inwestycji
- **Błędy walidacji:** 400 Bad Request z `fields` object
- **Obsługa:** Mapowanie kodów błędów z `fields` na komunikaty i wyświetlenie w FormField

#### PATCH /v1/investments/{id}

- **Opis:** Aktualizacja inwestycji
- **Błędy walidacji:** 400 Bad Request z `fields` object
- **Obsługa:** Mapowanie kodów błędów z `fields` na komunikaty i wyświetlenie w FormField

#### GET /v1/auth/session

- **Opis:** Weryfikacja sesji użytkownika
- **Błędy:** 401 Unauthorized
- **Obsługa:** Wyświetlenie GlobalErrorBanner i przekierowanie do `/login`

### Format odpowiedzi błędów

Wszystkie endpointy zwracają błędy w formacie zgodnym z `ApiError`:

```json
{
  "error": {
    "code": "bad_request",
    "message": "Validation failed",
    "fields": {
      "amount": "amount_must_be_positive",
      "acquired_at": "acquired_at_cannot_be_future"
    }
  }
}
```

### Mapowanie kodów błędów

Kody błędów z API są mapowane na komunikaty po polsku przy użyciu `ErrorMessageMap`:

```typescript
function mapErrorCode(code: string, errorMessages: ErrorMessageMap): string {
  return errorMessages[code] || "Wystąpił błąd walidacji";
}
```

## 8. Interakcje użytkownika

### Interakcje w formularzu inwestycji

1. **Wypełnianie formularza:**
   - Użytkownik wprowadza dane w pola formularza
   - Walidacja po stronie klienta (opcjonalnie w czasie rzeczywistym)
   - Błędy walidacji wyświetlane pod polami (inline errors)

2. **Wysyłanie formularza:**
   - Użytkownik klika "Zapisz"
   - Formularz jest blokowany (przycisk disabled, spinner)
   - Wysyłanie żądania do API

3. **Obsługa błędów walidacji:**
   - W przypadku błędu 400 z `fields`:
     - Mapowanie kodów błędów na komunikaty po polsku
     - Wyświetlenie błędów pod odpowiednimi polami
     - Scroll do pierwszego pola z błędem (opcjonalnie)
     - Wyświetlenie FormErrorSummary u góry formularza (opcjonalnie)

4. **Obsługa innych błędów:**
   - W przypadku błędu 401/403:
     - Wyświetlenie GlobalErrorBanner
     - Przekierowanie do `/login`
   - W przypadku błędu 5xx:
     - Wyświetlenie Toast z komunikatem "Problem po naszej stronie – spróbuj ponownie"
   - W przypadku błędu 429:
     - Wyświetlenie Toast z komunikatem "Za dużo zapytań – spróbuj ponownie za chwilę"

5. **Sukces:**
   - Zamknięcie modala (jeśli modal)
   - Reset formularza
   - Wyświetlenie Toast z komunikatem sukcesu
   - Odświeżenie listy inwestycji

### Interakcje z GlobalErrorBanner

1. **Wyświetlanie banera:**
   - Baner pojawia się automatycznie przy wykryciu błędu 401/403/5xx/429
   - Baner jest widoczny u góry strony (fixed position)

2. **Działania użytkownika:**
   - Dla 401/403: Automatyczne przekierowanie do `/login` po 3 sekundach
   - Dla 5xx/429: Możliwość zamknięcia banera (przycisk "Zamknij")
   - Kliknięcie w przycisk "Zaloguj ponownie" (dla 401/403) - natychmiastowe przekierowanie

## 9. Warunki i walidacja

### Walidacja po stronie klienta

Formularz inwestycji wykonuje walidację po stronie klienta przed wysłaniem do API:

1. **Walidacja typu (type):**
   - Wartość musi być jedną z: "etf", "bond", "stock", "cash"
   - Błąd: "Typ musi być jednym z: ETF, Obligacja, Akcja, Gotówka"

2. **Walidacja kwoty (amount):**
   - Wartość musi być liczbą większą od 0
   - Wartość musi być skończona (finite)
   - Wartość nie może przekraczać 999999999999.99
   - Błąd: "Kwota musi być większa od zera" lub "Kwota przekracza maksymalną wartość"

3. **Walidacja daty (acquired_at):**
   - Format musi być YYYY-MM-DD
   - Data nie może być z przyszłości
   - Błąd: "Data nabycia nie może być z przyszłości" lub "Nieprawidłowy format daty"

4. **Walidacja notatek (notes):**
   - Jeśli podane, muszą mieć 1-1000 znaków (po trim)
   - Puste/whitespace traktowane jako null
   - Błąd: "Notatki muszą mieć co najmniej 1 znak" lub "Notatki nie mogą przekraczać 1000 znaków"

### Walidacja po stronie serwera

API wykonuje dodatkową walidację i zwraca błędy w formacie `ApiError`:

1. **Błędy walidacji (400 Bad Request):**
   - Obiekt `fields` zawiera kody błędów dla poszczególnych pól
   - Kody błędów są mapowane na komunikaty po polsku
   - Komunikaty wyświetlane pod odpowiednimi polami

2. **Błędy autoryzacji (401/403):**
   - Brak lub nieprawidłowy token JWT
   - Wyświetlenie GlobalErrorBanner
   - Przekierowanie do `/login`

3. **Błędy serwera (5xx):**
   - Nieoczekiwane błędy serwera
   - Wyświetlenie Toast lub GlobalErrorBanner
   - Komunikat: "Problem po naszej stronie – spróbuj ponownie"

4. **Rate limiting (429):**
   - Zbyt wiele żądań
   - Wyświetlenie Toast
   - Komunikat: "Za dużo zapytań – spróbuj ponownie za chwilę"

### Warunki wyświetlania błędów

1. **Błędy pól formularza:**
   - Wyświetlane pod odpowiednimi polami (inline errors)
   - Widoczne tylko gdy pole ma błąd
   - Automatycznie ukrywane po poprawieniu wartości

2. **FormErrorSummary:**
   - Wyświetlane u góry formularza
   - Widoczne tylko gdy są błędy walidacji
   - Zawiera listę wszystkich błędów z linkami do pól

3. **GlobalErrorBanner:**
   - Wyświetlany u góry strony
   - Widoczny dla błędów 401/403/5xx/429
   - Automatycznie ukrywany po przekierowaniu (401/403) lub zamknięciu (5xx/429)

## 10. Obsługa błędów

### Scenariusze błędów i ich obsługa

#### 1. Błąd walidacji pola (400 z fields)

**Scenariusz:** Użytkownik wprowadza nieprawidłowe dane (np. kwota = 0, data z przyszłości)

**Obsługa:**

- API zwraca 400 Bad Request z obiektem `fields`
- Kody błędów są mapowane na komunikaty po polsku
- Błędy wyświetlane pod odpowiednimi polami (FormField)
- FormErrorSummary wyświetla podsumowanie błędów (opcjonalnie)
- Formularz pozostaje otwarty, użytkownik może poprawić błędy

**Przykład:**

```json
{
  "error": {
    "code": "bad_request",
    "message": "Validation failed",
    "fields": {
      "amount": "amount_must_be_positive",
      "acquired_at": "acquired_at_cannot_be_future"
    }
  }
}
```

#### 2. Błąd autoryzacji (401/403)

**Scenariusz:** Sesja użytkownika wygasła lub token jest nieprawidłowy

**Obsługa:**

- Wyświetlenie GlobalErrorBanner z komunikatem "Sesja wygasła – zaloguj się ponownie"
- Automatyczne przekierowanie do `/login` po 3 sekundach
- Opcjonalnie: przycisk "Zaloguj ponownie" dla natychmiastowego przekierowania
- Wyczyszczenie lokalnego stanu i sesji Supabase

#### 3. Błąd serwera (5xx)

**Scenariusz:** Nieoczekiwany błąd serwera (500, 502, 503, etc.)

**Obsługa:**

- Wyświetlenie GlobalErrorBanner lub Toast z komunikatem "Problem po naszej stronie – spróbuj ponownie"
- Możliwość zamknięcia banera (dla GlobalErrorBanner)
- Formularz pozostaje otwarty, użytkownik może spróbować ponownie

#### 4. Rate limiting (429)

**Scenariusz:** Zbyt wiele żądań w krótkim czasie

**Obsługa:**

- Wyświetlenie Toast z komunikatem "Za dużo zapytań – spróbuj ponownie za chwilę"
- Opcjonalnie: wyświetlenie czasu do następnej próby (jeśli dostępny w nagłówku Retry-After)
- Formularz pozostaje otwarty, użytkownik może spróbować ponownie po chwili

#### 5. Błąd sieci (network error)

**Scenariusz:** Brak połączenia z internetem lub timeout

**Obsługa:**

- Wyświetlenie Toast z komunikatem "Brak połączenia z internetem. Sprawdź połączenie i spróbuj ponownie"
- Formularz pozostaje otwarty, użytkownik może spróbować ponownie

#### 6. Nieznany błąd

**Scenariusz:** Błąd, który nie pasuje do żadnej kategorii

**Obsługa:**

- Wyświetlenie Toast z ogólnym komunikatem "Wystąpił nieoczekiwany błąd. Spróbuj ponownie"
- Logowanie błędu do konsoli (dla debugowania)
- Formularz pozostaje otwarty, użytkownik może spróbować ponownie

### Edge cases

1. **Wielokrotne błędy w tym samym polu:**
   - Wyświetlany jest tylko pierwszy błąd (lub najbardziej istotny)
   - Kolejne błędy są ignorowane

2. **Błędy w polach, które nie są widoczne:**
   - FormErrorSummary zawiera linki do wszystkich pól z błędami
   - Kliknięcie w link scrolluje do odpowiedniego pola

3. **Błędy podczas edycji:**
   - Błędy są wyświetlane tak samo jak przy dodawaniu
   - Formularz pozostaje w trybie edycji, użytkownik może poprawić błędy

4. **Błędy podczas onboardingu:**
   - Błędy są wyświetlane w formularzu inwestycji (krok 2)
   - Użytkownik nie może przejść do następnego kroku, dopóki nie poprawi błędów

## 11. Kroki implementacji

### Krok 1: Utworzenie komponentu ErrorMessage

1. Utworzenie pliku `src/components/ErrorMessage.tsx`
2. Implementacja komponentu z obsługą wariantów (inline, banner)
3. Dodanie stylowania (Tailwind + shadcn/ui)
4. Dodanie testów (opcjonalnie)

### Krok 2: Utworzenie komponentu FormField

1. Utworzenie pliku `src/components/FormField.tsx`
2. Implementacja komponentu z obsługą błędów
3. Integracja z ErrorMessage dla wyświetlania błędów
4. Dodanie obsługi aria-describedby dla dostępności
5. Dodanie stylowania (Tailwind + shadcn/ui)

### Krok 3: Utworzenie mapy komunikatów błędów

1. Utworzenie pliku `src/lib/error-messages.ts`
2. Definicja `ErrorMessageMap` dla inwestycji
3. Funkcja pomocnicza `mapErrorCode` do mapowania kodów na komunikaty
4. Eksport mapy i funkcji

### Krok 4: Utworzenie custom hook useApiErrorHandler

1. Utworzenie pliku `src/components/hooks/useApiErrorHandler.ts`
2. Implementacja hooka z obsługą błędów API
3. Mapowanie błędów z API na komunikaty po polsku
4. Funkcje do czyszczenia błędów

### Krok 5: Utworzenie komponentu FormErrorSummary

1. Utworzenie pliku `src/components/FormErrorSummary.tsx`
2. Implementacja komponentu z listą błędów
3. Dodanie linków do pól z błędami (scroll do pola)
4. Dodanie stylowania (Tailwind + shadcn/ui)

### Krok 6: Utworzenie komponentu GlobalErrorBanner

1. Utworzenie pliku `src/components/GlobalErrorBanner.tsx`
2. Implementacja komponentu z obsługą różnych typów błędów
3. Dodanie przycisków akcji (Zaloguj ponownie, Zamknij)
4. Dodanie automatycznego przekierowania dla 401/403
5. Dodanie stylowania (Tailwind + shadcn/ui)

### Krok 7: Integracja z InvestmentForm

1. Aktualizacja `src/components/InvestmentForm.tsx` (lub utworzenie, jeśli nie istnieje)
2. Integracja z FormField dla każdego pola
3. Integracja z useApiErrorHandler
4. Wyświetlanie błędów walidacji pod polami
5. Wyświetlanie FormErrorSummary (opcjonalnie)
6. Obsługa błędów API (400, 401, 5xx, 429)

### Krok 8: Integracja z OnboardingContainer (krok 2)

1. Aktualizacja `src/components/OnboardingContainer.tsx`
2. Integracja InvestmentForm z obsługą błędów
3. Wyświetlanie błędów walidacji w formularzu inwestycji
4. Blokada przejścia do następnego kroku przy błędach

### Krok 9: Integracja z AppLayout

1. Aktualizacja `src/layouts/Layout.astro` lub komponentu AppLayout
2. Dodanie GlobalErrorBanner do layoutu
3. Integracja z globalnym stanem błędów (store lub context)
4. Obsługa błędów 401/403 z przekierowaniem do `/login`
5. Obsługa błędów 5xx/429

### Krok 10: Integracja z wywołaniami API

1. Aktualizacja funkcji wywołujących API (w InvestmentForm, OnboardingContainer)
2. Obsługa błędów z odpowiedzi API
3. Mapowanie błędów na odpowiednie komponenty (FormField, GlobalErrorBanner, Toast)
4. Testowanie różnych scenariuszy błędów

### Krok 11: Testowanie i poprawki

1. Testowanie wszystkich scenariuszy błędów
2. Testowanie dostępności (ARIA, keyboard navigation)
3. Testowanie responsywności (jeśli dotyczy)
4. Poprawki i optymalizacje
5. Aktualizacja dokumentacji (jeśli potrzebna)

### Krok 12: Integracja z ToastProvider (opcjonalnie)

1. Aktualizacja ToastProvider dla wyświetlania błędów
2. Integracja z systemem błędów (dla błędów 5xx/429)
3. Testowanie wyświetlania toastów

---

**Uwagi końcowe:**

- Wszystkie komunikaty błędów powinny być po polsku
- Komponenty powinny być dostępne (ARIA, keyboard navigation)
- Stylowanie powinno być spójne z resztą aplikacji (Tailwind + shadcn/ui)
- Błędy powinny być wyświetlane w sposób nieinwazyjny, ale widoczny
- System powinien być łatwy do rozszerzenia o nowe typy błędów
