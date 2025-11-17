# Plan implementacji widoku Dashboard

## 1. Przegląd

Dashboard to główny widok aplikacji DoFIRE, prezentujący kluczowe wskaźniki finansowe użytkownika związane z osiągnięciem niezależności finansowej (FIRE). Widok umożliwia użytkownikowi przeglądanie:

- **Liczby FIRE** - docelowej kwoty potrzebnej do osiągnięcia niezależności finansowej
- **Wiek FIRE** - wieku, w którym użytkownik osiągnie FIRE
- **Postępu do FIRE** - procentowego postępu w kierunku celu
- **AI Hint** - krótkiej analizy struktury portfela inwestycyjnego
- **Struktury portfela** - procentowego udziału poszczególnych typów aktywów

Widok działa w trybie "on-demand" - obliczenia są wykonywane dopiero po kliknięciu przycisku "Przelicz wskaźniki", co pozwala na oszczędność zasobów i umożliwia użytkownikowi kontrolę nad momentem aktualizacji danych.

## 2. Routing widoku

**Ścieżka:** `/dashboard`

**Plik implementacji:** `src/pages/dashboard.astro`

**Ochrona:** Widok jest chroniony przez `AuthGuard` (middleware), który weryfikuje sesję użytkownika przed renderowaniem.

**Redirect logic:** Jeśli użytkownik nie ma profilu (`404 profile_not_found`) lub brak inwestycji, powinien zostać przekierowany do `/onboarding`.

## 3. Struktura komponentów

```
Dashboard (Astro page)
├── AppLayout
│   ├── TopNav
│   └── DashboardContent (React client component)
│       ├── DashboardHeader
│       ├── DashboardGrid (2-column layout)
│       │   ├── LeftColumn
│       │   │   ├── MetricsPanel
│       │   │   │   ├── FireTargetCard
│       │   │   │   ├── FireAgeCard
│       │   │   │   ├── FireProgressCard
│       │   │   │   └── EmptyState (conditional)
│       │   │   └── RecalculateButton
│       │   └── RightColumn
│       │       ├── AIHintAlert
│       │       └── PortfolioSummaryList
│       └── LoadingSkeleton (conditional)
```

## 4. Szczegóły komponentów

### Dashboard (Astro Page)

- **Opis komponentu:** Główny plik strony Astro, który renderuje layout aplikacji i integruje Reactowy komponent kliencki odpowiedzialny za logikę Dashboardu.

- **Główne elementy:**
  - Import i renderowanie `AppLayout`
  - Import i renderowanie `DashboardContent` jako komponentu React z `client:load`
  - Przekazanie niezbędnych props (np. session data jeśli potrzebne)

- **Obsługiwane zdarzenia:** Brak (Astro page jest statyczna, logika w React)

- **Warunki walidacji:** Brak (walidacja w komponencie React)

- **Typy:** Brak specyficznych typów dla strony Astro

- **Props:** Brak

### DashboardContent (React Client Component)

- **Opis komponentu:** Główny komponent React odpowiedzialny za zarządzanie stanem Dashboardu, wywoływanie API, obsługę błędów i renderowanie wszystkich podkomponentów.

- **Główne elementy:**
  - State management dla metryk (`metrics`), AI hint (`aiHint`), stanu ładowania (`isLoading`), błędów (`error`)
  - Hook `useDashboard` (custom hook) do zarządzania logiką biznesową
  - Renderowanie `DashboardHeader`
  - Renderowanie `DashboardGrid` z dwoma kolumnami
  - Renderowanie `LoadingSkeleton` podczas ładowania
  - Obsługa błędów z wyświetlaniem komunikatów

- **Obsługiwane zdarzenia:**
  - `onRecalculate` - wywoływane po kliknięciu przycisku "Przelicz wskaźniki"
  - `onError` - obsługa błędów z API

- **Warunki walidacji:**
  - Sprawdzanie, czy użytkownik ma profil (redirect do `/onboarding` jeśli brak)
  - Sprawdzanie, czy użytkownik ma inwestycje (opcjonalne - może wyświetlić empty state)

- **Typy:**
  - `DashboardState` - typ stanu komponentu
  - `MetricsDto` - z `src/types.ts`
  - `AiHintDto` - z `src/types.ts`

- **Props:** Brak (komponent pobiera dane samodzielnie)

### DashboardHeader

- **Opis komponentu:** Nagłówek widoku Dashboard z tytułem i ewentualnym opisem.

- **Główne elementy:**
  - `<h1>` z tytułem "Twoja droga do FIRE"
  - Opcjonalny tekst pomocniczy wyjaśniający, że obliczenia są przybliżone

- **Obsługiwane zdarzenia:** Brak

- **Warunki walidacji:** Brak

- **Typy:** Brak

- **Props:** Brak

### DashboardGrid

- **Opis komponentu:** Kontener z layoutem dwukolumnowym (grid) dla głównej zawartości Dashboardu.

- **Główne elementy:**
  - CSS Grid lub Flexbox z dwoma kolumnami
  - Lewa kolumna: `MetricsPanel` i `RecalculateButton`
  - Prawa kolumna: `AIHintAlert` i `PortfolioSummaryList`

- **Obsługiwane zdarzenia:** Brak (przekazuje zdarzenia do dzieci)

- **Warunki walidacji:** Brak

- **Typy:** Brak

- **Props:** Brak (renderuje dzieci bezpośrednio)

### MetricsPanel

- **Opis komponentu:** Panel wyświetlający kluczowe metryki FIRE: liczbę FIRE, wiek FIRE, postęp do FIRE.

- **Główne elementy:**
  - `FireTargetCard` - wyświetla `fire_target` w formacie "Twoja liczba FIRE: X zł"
  - `FireAgeCard` - wyświetla `fire_age` w formacie "Osiągniesz FIRE w wieku Y lat" (lub komunikat, jeśli `years_to_fire` jest null)
  - `FireProgressCard` - wyświetla `fire_progress` jako procent (np. "Postęp: 2.52%")
  - `EmptyState` - wyświetlany, gdy brak danych (brak profilu lub inwestycji)

- **Obsługiwane zdarzenia:** Brak (tylko prezentacja)

- **Warunki walidacji:**
  - Jeśli `metrics` jest `null` → wyświetl `EmptyState`
  - Jeśli `years_to_fire` jest `null` → wyświetl komunikat z `note` z API
  - Jeśli `fire_age` jest `null` → wyświetl tylko `years_to_fire` bez wieku

- **Typy:**
  - `MetricsDto | null` - dane metryk
  - `MetricsDto` - z `src/types.ts`

- **Props:**
  ```typescript
  interface MetricsPanelProps {
    metrics: MetricsDto | null;
    isLoading: boolean;
  }
  ```

### FireTargetCard

- **Opis komponentu:** Karta wyświetlająca docelową liczbę FIRE.

- **Główne elementy:**
  - Nagłówek: "Twoja liczba FIRE"
  - Wartość: `fire_target` sformatowana jako waluta PLN (np. "1 350 000,00 zł")
  - Opcjonalny opis: "Kwota potrzebna do osiągnięcia niezależności finansowej"

- **Obsługiwane zdarzenia:** Brak

- **Warunki walidacji:** Brak (wartość zawsze dostępna, jeśli `metrics` nie jest null)

- **Typy:**
  - `number` - wartość `fire_target`

- **Props:**
  ```typescript
  interface FireTargetCardProps {
    fireTarget: number;
  }
  ```

### FireAgeCard

- **Opis komponentu:** Karta wyświetlająca wiek, w którym użytkownik osiągnie FIRE.

- **Główne elementy:**
  - Nagłówek: "Wiek FIRE"
  - Wartość: `fire_age` sformatowana z jednym miejscem po przecinku (np. "58,3 lat")
  - Alternatywnie: komunikat, jeśli `years_to_fire` jest `null` (np. "Lata do FIRE nie mogą zostać obliczone przy zerowych inwestycjach")
  - Opcjonalnie: wyświetlenie `years_to_fire` jako dodatkowej informacji

- **Obsługiwane zdarzenia:** Brak

- **Warunki walidacji:**
  - Jeśli `years_to_fire` jest `null` → wyświetl komunikat z `note`
  - Jeśli `fire_age` jest `null` ale `years_to_fire` nie jest null → wyświetl tylko `years_to_fire`

- **Typy:**
  - `MetricsDto['time_to_fire']` - obiekt z polami `years_to_fire`, `fire_age`, `current_age`, `birth_date`
  - `string | null` - opcjonalna notatka z API

- **Props:**
  ```typescript
  interface FireAgeCardProps {
    timeToFire: MetricsDto['time_to_fire'];
    note?: string;
  }
  ```

### FireProgressCard

- **Opis komponentu:** Karta wyświetlająca postęp do osiągnięcia FIRE jako procent.

- **Główne elementy:**
  - Nagłówek: "Postęp do FIRE"
  - Wartość: `fire_progress` sformatowany jako procent z dwoma miejscami po przecinku (np. "2,52%")
  - Opcjonalnie: wizualna reprezentacja postępu (pasek postępu)

- **Obsługiwane zdarzenia:** Brak

- **Warunki walidacji:**
  - Wartość powinna być z zakresu 0-100% (lub więcej, jeśli użytkownik przekroczył cel)
  - Formatowanie z odpowiednią liczbą miejsc po przecinku

- **Typy:**
  - `number` - wartość `fire_progress` (0-1 lub jako procent)

- **Props:**
  ```typescript
  interface FireProgressCardProps {
    fireProgress: number; // wartość 0-1
  }
  ```

### RecalculateButton

- **Opis komponentu:** Przycisk wywołujący przeliczenie wskaźników FIRE.

- **Główne elementy:**
  - Przycisk typu `button` z tekstem "Przelicz wskaźniki"
  - Ikona ładowania podczas wykonywania żądania
  - Stan disabled podczas ładowania

- **Obsługiwane zdarzenia:**
  - `onClick` - wywołuje funkcję `handleRecalculate` z hooka `useDashboard`

- **Warunki walidacji:**
  - Przycisk powinien być disabled, gdy `isLoading` jest `true`
  - Przycisk powinien być disabled, gdy brak profilu lub inwestycji

- **Typy:** Brak specyficznych typów

- **Props:**
  ```typescript
  interface RecalculateButtonProps {
    onClick: () => void;
    isLoading: boolean;
    disabled?: boolean;
  }
  ```

### AIHintAlert

- **Opis komponentu:** Komponent Alert (z shadcn/ui) wyświetlający AI Hint - krótką analizę portfela inwestycyjnego.

- **Główne elementy:**
  - Komponent `Alert` z shadcn/ui
  - Nagłówek: "Analiza portfela" lub "AI Hint"
  - Treść: `hint` z `AiHintDto` (maksymalnie ~160 znaków)
  - Opcjonalnie: ikona informacyjna

- **Obsługiwane zdarzenia:** Brak

- **Warunki walidacji:**
  - Jeśli `aiHint` jest `null` → wyświetl placeholder lub ukryj komponent
  - Tekst powinien być zlokalizowany (polski/angielski)

- **Typy:**
  - `AiHintDto | null` - dane AI hint
  - `AiHintDto` - z `src/types.ts`

- **Props:**
  ```typescript
  interface AIHintAlertProps {
    aiHint: AiHintDto | null;
    isLoading: boolean;
  }
  ```

### PortfolioSummaryList

- **Opis komponentu:** Lista wyświetlająca procentowy udział poszczególnych typów aktywów w portfelu.

- **Główne elementy:**
  - Nagłówek: "Struktura portfela"
  - Lista elementów dla każdego typu aktywu:
    - ETF: `share_etf`%
    - Akcje: `share_stock`%
    - Obligacje: `share_bond`%
    - Gotówka: `share_cash`%
  - Formatowanie wartości z dwoma miejscami po przecinku

- **Obsługiwane zdarzenia:** Brak

- **Warunki walidacji:**
  - Suma udziałów powinna wynosić 100% (z tolerancją zaokrągleń)
  - Jeśli wszystkie udziały są 0 → wyświetl komunikat "Brak danych o portfelu"

- **Typy:**
  - `AiHintDto['shares']` - obiekt z udziałami procentowymi
  - Alternatywnie: `PortfolioAggDto` (jeśli dane pochodzą bezpośrednio z portfolio-agg)

- **Props:**
  ```typescript
  interface PortfolioSummaryListProps {
    shares: AiHintDto['shares'] | null;
    isLoading: boolean;
  }
  ```

### EmptyState

- **Opis komponentu:** Komponent wyświetlany, gdy brak danych do wyświetlenia (brak profilu lub inwestycji).

- **Główne elementy:**
  - Ikona lub ilustracja
  - Nagłówek: "Brak danych" lub "Uzupełnij profil"
  - Opis: "Aby zobaczyć swoje wskaźniki FIRE, uzupełnij profil i dodaj inwestycje."
  - Linki CTA:
    - "Uzupełnij profil" → `/profile`
    - "Dodaj inwestycję" → `/investments`

- **Obsługiwane zdarzenia:**
  - `onNavigate` - przekierowanie do odpowiedniej strony

- **Warunki walidacji:** Brak

- **Typy:** Brak specyficznych typów

- **Props:**
  ```typescript
  interface EmptyStateProps {
    type: 'no-profile' | 'no-investments' | 'no-data';
  }
  ```

### LoadingSkeleton

- **Opis komponentu:** Komponent wyświetlający placeholdery podczas ładowania danych.

- **Główne elementy:**
  - Skeleton dla `MetricsPanel` (3 karty)
  - Skeleton dla `AIHintAlert`
  - Skeleton dla `PortfolioSummaryList`

- **Obsługiwane zdarzenia:** Brak

- **Warunki walidacji:** Brak

- **Typy:** Brak

- **Props:**
  ```typescript
  interface LoadingSkeletonProps {
    // Brak props - komponent jest statyczny
  }
  ```

## 5. Typy

### Typy DTO (z `src/types.ts`)

#### MetricsDto
```typescript
interface MetricsDto {
  inputs: {
    monthly_expense: number;
    withdrawal_rate_pct: number;
    expected_return_pct: number;
    invested_total: number;
  };
  derived: {
    annual_expense: number;
    fire_target: number;
    fire_progress: number;
  };
  time_to_fire: {
    years_to_fire: number | null;
    birth_date: ISODateString | null;
    current_age: number | null;
    fire_age: number | null;
  };
  note?: string;
}
```

**Opis pól:**
- `inputs` - wartości wejściowe użyte do obliczeń (z profilu i portfela, ewentualnie nadpisane przez query params)
- `derived` - wartości obliczone:
  - `annual_expense` - roczne wydatki (monthly_expense * 12)
  - `fire_target` - docelowa liczba FIRE (annual_expense / (withdrawal_rate_pct / 100))
  - `fire_progress` - postęp do FIRE (invested_total / fire_target, wartość 0-1)
- `time_to_fire` - informacje o czasie do osiągnięcia FIRE:
  - `years_to_fire` - liczba lat do FIRE (null jeśli invested_total <= 0)
  - `birth_date` - data urodzenia użytkownika (może być null)
  - `current_age` - aktualny wiek (null jeśli brak birth_date)
  - `fire_age` - wiek osiągnięcia FIRE (null jeśli brak birth_date lub years_to_fire)
- `note` - opcjonalna notatka dla przypadków brzegowych (np. "Years to FIRE undefined for zero investments.")

#### AiHintDto
```typescript
interface AiHintDto {
  hint: string; // zlokalizowany komunikat (max ~160 znaków)
  rules_matched: AiRuleId[];
  shares: {
    stock: number;
    etf: number;
    bond: number;
    cash: number;
  };
}
```

**Opis pól:**
- `hint` - krótki tekst analizy portfela, zlokalizowany (polski/angielski), maksymalnie ~160 znaków
- `rules_matched` - tablica identyfikatorów reguł, które zostały dopasowane do portfela
- `shares` - procentowe udziały poszczególnych typów aktywów (wartości 0-100)

#### AiRuleId
```typescript
type AiRuleId =
  | "stock_plus_etf_ge_80"
  | "bond_ge_50"
  | "cash_ge_30"
  | "stock_plus_etf_lt_40";
```

**Opis:** Typy reguł używanych do generowania AI Hint.

### Typy ViewModel (nowe typy dla komponentów)

#### DashboardState
```typescript
interface DashboardState {
  metrics: MetricsDto | null;
  aiHint: AiHintDto | null;
  isLoading: boolean;
  error: ApiError | null;
}
```

**Opis:** Stan głównego komponentu Dashboard, przechowujący dane z API, stan ładowania i błędy.

#### MetricsQuery (z `src/types.ts`)
```typescript
interface MetricsQuery {
  monthly_expense?: number;
  withdrawal_rate_pct?: number;
  expected_return_pct?: number;
  invested_total?: number;
}
```

**Opis:** Opcjonalne parametry query dla endpointu `/v1/me/metrics`, umożliwiające "what-if" scenariusze. W MVP nie są używane w widoku Dashboard, ale mogą być wykorzystane w przyszłości.

#### ApiError (z `src/types.ts`)
```typescript
interface ApiError {
  error: {
    code: "bad_request" | "unauthorized" | "forbidden" | "not_found" | "conflict" | "too_many_requests" | "internal";
    message: string;
    fields?: Record<string, string>;
  };
}
```

**Opis:** Standardowy format błędu API, używany do obsługi błędów w komponentach.

## 6. Zarządzanie stanem

### Custom Hook: `useDashboard`

**Plik:** `src/components/dashboard/useDashboard.ts` (lub w tym samym pliku co komponent)

**Cel:** Centralizacja logiki biznesowej Dashboardu, zarządzanie stanem, wywoływanie API, obsługa błędów.

**Implementacja:**

```typescript
function useDashboard() {
  const [state, setState] = useState<DashboardState>({
    metrics: null,
    aiHint: null,
    isLoading: false,
    error: null,
  });

  const recalculateMetrics = async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      // Równoległe wywołanie obu endpointów
      const [metricsResponse, aiHintResponse] = await Promise.all([
        fetch('/api/v1/me/metrics', {
          headers: {
            'Authorization': `Bearer ${getAuthToken()}`,
            'Accept-Language': navigator.language || 'pl-PL',
          },
        }),
        fetch('/api/v1/me/ai-hint', {
          headers: {
            'Authorization': `Bearer ${getAuthToken()}`,
            'Accept-Language': navigator.language || 'pl-PL',
          },
        }),
      ]);

      // Obsługa błędów
      if (!metricsResponse.ok) {
        const error = await metricsResponse.json();
        throw new Error(error.error?.message || 'Błąd pobierania metryk');
      }

      if (!aiHintResponse.ok) {
        const error = await aiHintResponse.json();
        throw new Error(error.error?.message || 'Błąd pobierania AI hint');
      }

      const metrics: MetricsDto = await metricsResponse.json();
      const aiHint: AiHintDto = await aiHintResponse.json();

      setState({
        metrics,
        aiHint,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? { error: { code: 'internal', message: error.message } } : null,
      }));
    }
  };

  return {
    ...state,
    recalculateMetrics,
  };
}
```

**Użycie w komponencie:**

```typescript
const { metrics, aiHint, isLoading, error, recalculateMetrics } = useDashboard();
```

**Uwagi:**
- Hook używa `useState` do zarządzania stanem lokalnym
- Wywołania API są wykonywane równolegle (`Promise.all`) dla lepszej wydajności
- Obsługa błędów jest scentralizowana w hooku
- Token autoryzacji powinien być pobierany z kontekstu lub store (np. Zustand)
- Header `Accept-Language` jest ustawiany na podstawie języka przeglądarki

### Alternatywa: Globalny Store (Zustand)

Jeśli aplikacja używa globalnego store (jak wspomniano w UI plan), stan Dashboardu może być częścią większego store:

```typescript
interface DashboardStore {
  metrics: MetricsDto | null;
  aiHint: AiHintDto | null;
  isLoading: boolean;
  error: ApiError | null;
  recalculateMetrics: () => Promise<void>;
}
```

W MVP można zacząć od lokalnego stanu w hooku, a w przyszłości przenieść do globalnego store, jeśli będzie potrzeba współdzielenia stanu między widokami.

## 7. Integracja API

### GET /v1/me/metrics

**Endpoint:** `/api/v1/me/metrics`

**Metoda:** `GET`

**Autoryzacja:** Wymagana (Bearer token w headerze `Authorization`)

**Query Parameters (opcjonalne, nieużywane w MVP Dashboard):**
- `monthly_expense` (number, >= 0)
- `withdrawal_rate_pct` (number, 0-100)
- `expected_return_pct` (number, > -100)
- `invested_total` (number, >= 0)

**Request Headers:**
```typescript
{
  'Authorization': 'Bearer <Supabase-JWT>',
  'Accept-Language': 'pl-PL' | 'en-US' (opcjonalne)
}
```

**Response 200:**
```typescript
MetricsDto
```

**Response 400 Bad Request:**
- Nieprawidłowe query parameters
- `expected_return_pct <= -100` (po scaleniu z profilem)

**Response 401 Unauthorized:**
- Brak lub nieprawidłowy token autoryzacji

**Response 404 Not Found:**
- Brak profilu użytkownika (`"message": "profile_not_found"`)

**Response 500 Internal Server Error:**
- Nieoczekiwane błędy serwera

**Implementacja w komponencie:**

```typescript
const metricsResponse = await fetch('/api/v1/me/metrics', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${authToken}`,
    'Content-Type': 'application/json',
  },
});

if (!metricsResponse.ok) {
  if (metricsResponse.status === 404) {
    // Redirect do /onboarding
    window.location.href = '/onboarding';
    return;
  }
  const error = await metricsResponse.json();
  throw new Error(error.error?.message || 'Błąd pobierania metryk');
}

const metrics: MetricsDto = await metricsResponse.json();
```

### GET /v1/me/ai-hint

**Endpoint:** `/api/v1/me/ai-hint`

**Metoda:** `GET`

**Autoryzacja:** Wymagana (Bearer token w headerze `Authorization`)

**Query Parameters:** Brak

**Request Headers:**
```typescript
{
  'Authorization': 'Bearer <Supabase-JWT>',
  'Accept-Language': 'pl-PL' | 'en-US' (opcjonalne, domyślnie 'en')
}
```

**Response 200:**
```typescript
AiHintDto
```

**Response 401 Unauthorized:**
- Brak lub nieprawidłowy token autoryzacji

**Response 500 Internal Server Error:**
- Nieoczekiwane błędy serwera

**Implementacja w komponencie:**

```typescript
const aiHintResponse = await fetch('/api/v1/me/ai-hint', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${authToken}`,
    'Accept-Language': navigator.language || 'pl-PL',
    'Content-Type': 'application/json',
  },
});

if (!aiHintResponse.ok) {
  const error = await aiHintResponse.json();
  throw new Error(error.error?.message || 'Błąd pobierania AI hint');
}

const aiHint: AiHintDto = await aiHintResponse.json();
```

### Równoległe wywołania API

Oba endpointy są wywoływane równolegle przy użyciu `Promise.all` dla lepszej wydajności:

```typescript
const [metricsResponse, aiHintResponse] = await Promise.all([
  fetch('/api/v1/me/metrics', { /* ... */ }),
  fetch('/api/v1/me/ai-hint', { /* ... */ }),
]);
```

### Obsługa błędów autoryzacji

Jeśli którykolwiek endpoint zwróci `401 Unauthorized`, użytkownik powinien zostać przekierowany do `/login` przez `AuthGuard` (middleware). Komponent Dashboard nie musi obsługiwać tego przypadku bezpośrednio, ale powinien być przygotowany na obsługę błędów sieciowych.

## 8. Interakcje użytkownika

### 1. Kliknięcie przycisku "Przelicz wskaźniki"

**Akcja użytkownika:** Użytkownik klika przycisk "Przelicz wskaźniki"

**Oczekiwany wynik:**
1. Przycisk przechodzi w stan `disabled` i wyświetla ikonę ładowania
2. Wyświetlany jest `LoadingSkeleton` (lub spinner) zamiast danych
3. Wykonywane są równoległe wywołania do `/api/v1/me/metrics` i `/api/v1/me/ai-hint`
4. Po otrzymaniu odpowiedzi:
   - Dane są wyświetlane w `MetricsPanel`, `AIHintAlert` i `PortfolioSummaryList`
   - Przycisk wraca do stanu normalnego
   - Jeśli wystąpił błąd, wyświetlany jest komunikat błędu (Toast lub inline)

**Obsługa w kodzie:**
```typescript
const handleRecalculate = async () => {
  await recalculateMetrics();
};
```

### 2. Wyświetlanie danych po załadowaniu

**Akcja użytkownika:** Automatyczne (po kliknięciu "Przelicz wskaźniki")

**Oczekiwany wynik:**
- `MetricsPanel` wyświetla:
  - Liczbę FIRE (sformatowaną jako waluta)
  - Wiek FIRE (lub komunikat, jeśli nie można obliczyć)
  - Postęp do FIRE (jako procent)
- `AIHintAlert` wyświetla krótką analizę portfela
- `PortfolioSummaryList` wyświetla strukturę portfela

### 3. Obsługa stanu pustego (brak danych)

**Akcja użytkownika:** Automatyczne (gdy brak profilu lub inwestycji)

**Oczekiwany wynik:**
- Wyświetlany jest `EmptyState` z komunikatem i linkami CTA
- Przycisk "Przelicz wskaźniki" jest disabled
- Linki prowadzą do `/profile` lub `/investments`

### 4. Obsługa błędów

**Akcja użytkownika:** Automatyczne (gdy wystąpi błąd API)

**Oczekiwany wynik:**
- Wyświetlany jest Toast z komunikatem błędu
- Jeśli błąd to `404 profile_not_found` → redirect do `/onboarding`
- Jeśli błąd to `401 Unauthorized` → redirect do `/login` (przez AuthGuard)
- Jeśli błąd to `500 Internal Server Error` → komunikat "Problem po naszej stronie – spróbuj ponownie"

### 5. Nawigacja do innych widoków

**Akcja użytkownika:** Kliknięcie linku w `EmptyState` lub `TopNav`

**Oczekiwany wynik:**
- Przekierowanie do odpowiedniej strony (`/profile`, `/investments`, `/dashboard`)
- Stan Dashboardu pozostaje niezmieniony (dane nie są automatycznie odświeżane)

## 9. Warunki i walidacja

### Warunki weryfikowane przez interfejs

#### 1. Walidacja stanu profilu

**Komponent:** `DashboardContent`, `useDashboard`

**Warunek:** Sprawdzenie, czy użytkownik ma profil

**Weryfikacja:**
- Jeśli `GET /v1/me/metrics` zwraca `404` z `"message": "profile_not_found"` → redirect do `/onboarding`

**Wpływ na UI:**
- Wyświetlenie `EmptyState` z typem `'no-profile'`
- Wyłączenie przycisku "Przelicz wskaźniki"

#### 2. Walidacja stanu inwestycji

**Komponent:** `MetricsPanel`, `EmptyState`

**Warunek:** Sprawdzenie, czy użytkownik ma inwestycje

**Weryfikacja:**
- Jeśli `invested_total` w `MetricsDto.inputs` wynosi `0` → wyświetlenie komunikatu

**Wpływ na UI:**
- Wyświetlenie `EmptyState` z typem `'no-investments'` (opcjonalne)
- Wyświetlenie komunikatu w `FireAgeCard`, jeśli `years_to_fire` jest `null`

#### 3. Walidacja `years_to_fire`

**Komponent:** `FireAgeCard`

**Warunek:** Sprawdzenie, czy `years_to_fire` jest `null`

**Weryfikacja:**
- Jeśli `metrics.time_to_fire.years_to_fire === null` → wyświetlenie komunikatu z `note`

**Wpływ na UI:**
- Wyświetlenie komunikatu: "Lata do FIRE nie mogą zostać obliczone przy zerowych inwestycjach" (lub treść z `note`)
- Ukrycie wartości wieku FIRE

#### 4. Walidacja `fire_age`

**Komponent:** `FireAgeCard`

**Warunek:** Sprawdzenie, czy `fire_age` jest `null`

**Weryfikacja:**
- Jeśli `metrics.time_to_fire.fire_age === null` → wyświetlenie tylko `years_to_fire`

**Wpływ na UI:**
- Wyświetlenie tylko liczby lat do FIRE, bez wieku osiągnięcia FIRE

#### 5. Walidacja danych AI Hint

**Komponent:** `AIHintAlert`, `PortfolioSummaryList`

**Warunek:** Sprawdzenie, czy `aiHint` jest `null` lub ma puste dane

**Weryfikacja:**
- Jeśli `aiHint === null` → ukrycie komponentu lub wyświetlenie placeholder
- Jeśli wszystkie `shares` są `0` → wyświetlenie komunikatu "Brak danych o portfelu"

**Wpływ na UI:**
- Ukrycie `AIHintAlert` lub wyświetlenie komunikatu
- Wyświetlenie komunikatu w `PortfolioSummaryList`

#### 6. Walidacja formatowania liczb

**Komponenty:** `FireTargetCard`, `FireProgressCard`, `PortfolioSummaryList`

**Warunki:**
- Formatowanie waluty PLN z dwoma miejscami po przecinku
- Formatowanie procentów z odpowiednią liczbą miejsc po przecinku
- Separatory tysięcy dla dużych liczb

**Weryfikacja:**
- Użycie `Intl.NumberFormat` dla formatowania waluty i procentów
- Sprawdzenie, czy wartości są liczbami przed formatowaniem

**Wpływ na UI:**
- Poprawne wyświetlanie wartości zgodnie z lokalizacją (pl-PL)

### Warunki walidacji zgodne z API

#### Walidacja query parameters (nieużywane w MVP, ale przygotowane na przyszłość)

**Endpoint:** `GET /v1/me/metrics`

**Warunki:**
- `monthly_expense`: number >= 0
- `withdrawal_rate_pct`: number 0-100
- `expected_return_pct`: number > -100
- `invested_total`: number >= 0

**Obsługa w komponencie:**
- Jeśli w przyszłości Dashboard będzie obsługiwał "what-if" scenariusze, walidacja powinna być wykonana przed wysłaniem żądania (używając tego samego schematu Zod, co backend)

#### Walidacja odpowiedzi API

**Komponenty:** `useDashboard`

**Warunki:**
- Sprawdzenie, czy odpowiedź ma status `200 OK`
- Sprawdzenie, czy odpowiedź ma poprawny format JSON
- Sprawdzenie, czy odpowiedź zawiera wymagane pola

**Obsługa w komponencie:**
- Użycie type guards dla sprawdzenia typu odpowiedzi
- Obsługa błędów parsowania JSON

## 10. Obsługa błędów

### Scenariusze błędów i ich obsługa

#### 1. Błąd 401 Unauthorized

**Przyczyna:** Brak lub nieprawidłowy token autoryzacji, wygasła sesja

**Obsługa:**
- `AuthGuard` (middleware) powinien przechwycić błąd i przekierować do `/login`
- Komponent Dashboard nie musi obsługiwać tego przypadku bezpośrednio
- Jeśli błąd wystąpi w komponencie, wyświetlenie Toast z komunikatem "Sesja wygasła – zaloguj się ponownie"

**Implementacja:**
```typescript
if (response.status === 401) {
  // AuthGuard powinien obsłużyć redirect
  // Ale na wszelki wypadek:
  window.location.href = '/login';
  return;
}
```

#### 2. Błąd 404 Not Found (profile_not_found)

**Przyczyna:** Użytkownik nie ma profilu

**Obsługa:**
- Redirect do `/onboarding`
- Wyświetlenie `EmptyState` z typem `'no-profile'`

**Implementacja:**
```typescript
if (response.status === 404) {
  const error = await response.json();
  if (error.error?.message === 'profile_not_found') {
    window.location.href = '/onboarding';
    return;
  }
}
```

#### 3. Błąd 400 Bad Request

**Przyczyna:** Nieprawidłowe query parameters (w przyszłości, jeśli Dashboard będzie obsługiwał "what-if")

**Obsługa:**
- Wyświetlenie Toast z komunikatem błędu
- Wyświetlenie szczegółów walidacji, jeśli dostępne w `error.fields`

**Implementacja:**
```typescript
if (response.status === 400) {
  const error = await response.json();
  const message = error.error?.message || 'Nieprawidłowe dane';
  const fields = error.error?.fields || {};
  
  // Wyświetlenie Toast z komunikatem
  showToast(message, 'error');
  
  // Jeśli są szczegóły walidacji, można je wyświetlić inline
  if (Object.keys(fields).length > 0) {
    // Obsługa błędów walidacji pól
  }
}
```

#### 4. Błąd 500 Internal Server Error

**Przyczyna:** Błąd serwera, problem z bazą danych

**Obsługa:**
- Wyświetlenie Toast z komunikatem "Problem po naszej stronie – spróbuj ponownie"
- Możliwość ponowienia żądania (przycisk "Spróbuj ponownie")

**Implementacja:**
```typescript
if (response.status >= 500) {
  showToast('Problem po naszej stronie – spróbuj ponownie', 'error');
  // Opcjonalnie: przycisk "Spróbuj ponownie"
}
```

#### 5. Błąd sieciowy (Network Error)

**Przyczyna:** Brak połączenia z internetem, timeout, CORS

**Obsługa:**
- Wyświetlenie Toast z komunikatem "Brak połączenia z internetem"
- Możliwość ponowienia żądania

**Implementacja:**
```typescript
try {
  const response = await fetch(/* ... */);
} catch (error) {
  if (error instanceof TypeError && error.message === 'Failed to fetch') {
    showToast('Brak połączenia z internetem', 'error');
  } else {
    showToast('Wystąpił nieoczekiwany błąd', 'error');
  }
}
```

#### 6. Błąd parsowania JSON

**Przyczyna:** Nieprawidłowa odpowiedź z serwera (nie JSON)

**Obsługa:**
- Wyświetlenie Toast z komunikatem "Nieprawidłowa odpowiedź z serwera"
- Logowanie błędu do konsoli (dla debugowania)

**Implementacja:**
```typescript
try {
  const data = await response.json();
} catch (error) {
  console.error('Błąd parsowania JSON:', error);
  showToast('Nieprawidłowa odpowiedź z serwera', 'error');
}
```

#### 7. Timeout żądania

**Przyczyna:** Żądanie trwa zbyt długo (np. > 30 sekund)

**Obsługa:**
- Użycie `AbortController` z timeout
- Wyświetlenie Toast z komunikatem "Żądanie trwa zbyt długo – spróbuj ponownie"

**Implementacja:**
```typescript
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 30000);

try {
  const response = await fetch(url, {
    signal: controller.signal,
    /* ... */
  });
  clearTimeout(timeoutId);
} catch (error) {
  if (error.name === 'AbortError') {
    showToast('Żądanie trwa zbyt długo – spróbuj ponownie', 'error');
  }
}
```

#### 8. Edge case: `years_to_fire` jest `null`

**Przyczyna:** `invested_total <= 0` (zerowe inwestycje)

**Obsługa:**
- Wyświetlenie komunikatu w `FireAgeCard` z treścią z `note` (jeśli dostępne)
- Ukrycie wartości wieku FIRE

**Implementacja:**
```typescript
{metrics.time_to_fire.years_to_fire === null ? (
  <div className="text-muted-foreground">
    {metrics.note || 'Lata do FIRE nie mogą zostać obliczone przy zerowych inwestycjach.'}
  </div>
) : (
  <div>{metrics.time_to_fire.fire_age} lat</div>
)}
```

#### 9. Edge case: `fire_age` jest `null` (ale `years_to_fire` nie jest null)

**Przyczyna:** Brak `birth_date` w profilu

**Obsługa:**
- Wyświetlenie tylko `years_to_fire` bez wieku osiągnięcia FIRE
- Opcjonalnie: komunikat zachęcający do uzupełnienia daty urodzenia

**Implementacja:**
```typescript
{metrics.time_to_fire.fire_age === null ? (
  <div>
    Osiągniesz FIRE za {metrics.time_to_fire.years_to_fire} lat
    {!metrics.time_to_fire.birth_date && (
      <span className="text-sm text-muted-foreground">
        {' '}(Uzupełnij datę urodzenia, aby zobaczyć wiek FIRE)
      </span>
    )}
  </div>
) : (
  <div>Osiągniesz FIRE w wieku {metrics.time_to_fire.fire_age} lat</div>
)}
```

### Globalna obsługa błędów

**Komponent:** `ToastProvider` (globalny)

**Obsługa:**
- Wszystkie błędy są wyświetlane jako Toast
- Błędy krytyczne (401, 404) mogą wyświetlać dodatkowy baner (`GlobalErrorBanner`)

## 11. Kroki implementacji

### Krok 1: Przygotowanie struktury plików

1. Utworzenie katalogu `src/components/dashboard/`
2. Utworzenie plików:
   - `DashboardContent.tsx` - główny komponent React
   - `useDashboard.ts` - custom hook
   - `MetricsPanel.tsx`
   - `FireTargetCard.tsx`
   - `FireAgeCard.tsx`
   - `FireProgressCard.tsx`
   - `AIHintAlert.tsx`
   - `PortfolioSummaryList.tsx`
   - `EmptyState.tsx`
   - `LoadingSkeleton.tsx`
   - `RecalculateButton.tsx`
3. Utworzenie pliku `src/pages/dashboard.astro`

### Krok 2: Implementacja typów i interfejsów

1. Sprawdzenie, czy wszystkie typy z `src/types.ts` są dostępne
2. Utworzenie typów ViewModel (jeśli potrzebne):
   - `DashboardState`
   - Props dla każdego komponentu
3. Eksport typów z odpowiednich plików

### Krok 3: Implementacja utility functions

1. Utworzenie funkcji pomocniczych do formatowania:
   - `formatCurrency(value: number): string` - formatowanie PLN
   - `formatPercent(value: number, decimals?: number): string` - formatowanie procentów
   - `formatAge(age: number): string` - formatowanie wieku
2. Utworzenie funkcji do pobierania tokenu autoryzacji (lub użycie istniejącego store/context)

### Krok 4: Implementacja custom hook `useDashboard`

1. Utworzenie hooka z zarządzaniem stanem (`useState`)
2. Implementacja funkcji `recalculateMetrics`:
   - Obsługa stanu ładowania
   - Równoległe wywołania API (`Promise.all`)
   - Obsługa błędów
   - Aktualizacja stanu
3. Zwrócenie stanu i funkcji z hooka

### Krok 5: Implementacja komponentów prezentacyjnych (od najprostszych)

1. **FireTargetCard:**
   - Renderowanie wartości `fire_target`
   - Formatowanie jako waluta PLN
   - Stylowanie z użyciem shadcn/ui Card

2. **FireProgressCard:**
   - Renderowanie wartości `fire_progress`
   - Formatowanie jako procent
   - Opcjonalnie: wizualny pasek postępu

3. **FireAgeCard:**
   - Renderowanie `fire_age` lub `years_to_fire`
   - Obsługa przypadków `null`
   - Wyświetlanie komunikatu z `note`, jeśli dostępne

4. **PortfolioSummaryList:**
   - Renderowanie listy udziałów procentowych
   - Formatowanie wartości
   - Obsługa przypadku, gdy wszystkie udziały są 0

5. **AIHintAlert:**
   - Użycie komponentu `Alert` z shadcn/ui
   - Renderowanie `hint` z `AiHintDto`
   - Obsługa przypadku `null`

6. **EmptyState:**
   - Renderowanie komunikatu w zależności od typu
   - Linki CTA do `/profile` i `/investments`
   - Ikona lub ilustracja

7. **LoadingSkeleton:**
   - Użycie komponentu `Skeleton` z shadcn/ui
   - Placeholdery dla wszystkich sekcji

8. **RecalculateButton:**
   - Użycie komponentu `Button` z shadcn/ui
   - Obsługa stanu `disabled` i `isLoading`
   - Ikona ładowania

### Krok 6: Implementacja komponentów złożonych

1. **MetricsPanel:**
   - Renderowanie trzech kart (FireTargetCard, FireAgeCard, FireProgressCard)
   - Obsługa stanu `isLoading` (wyświetlanie LoadingSkeleton)
   - Obsługa przypadku `metrics === null` (wyświetlanie EmptyState)

2. **DashboardGrid:**
   - Layout dwukolumnowy (CSS Grid lub Flexbox)
   - Responsywność (w MVP: min-width 1024px)
   - Renderowanie lewej i prawej kolumny

3. **DashboardHeader:**
   - Nagłówek `<h1>`
   - Opcjonalny tekst pomocniczy

### Krok 7: Implementacja głównego komponentu `DashboardContent`

1. Użycie hooka `useDashboard`
2. Renderowanie `DashboardHeader`
3. Renderowanie `DashboardGrid` z wszystkimi komponentami
4. Obsługa stanu ładowania (wyświetlanie `LoadingSkeleton`)
5. Obsługa błędów (wyświetlanie Toast)
6. Przekazanie funkcji `recalculateMetrics` do `RecalculateButton`

### Krok 8: Implementacja strony Astro `dashboard.astro`

1. Import `AppLayout`
2. Import `DashboardContent` jako komponent React z `client:load`
3. Renderowanie layoutu i komponentu
4. Ustawienie metadanych strony (title, description)

### Krok 9: Integracja z AuthGuard i routing

1. Sprawdzenie, czy `AuthGuard` jest zaimplementowany w middleware
2. Upewnienie się, że `/dashboard` jest chronione
3. Implementacja logiki redirect do `/onboarding` (jeśli brak profilu)

### Krok 10: Implementacja obsługi błędów

1. Integracja z `ToastProvider` (jeśli istnieje)
2. Implementacja obsługi wszystkich scenariuszy błędów (z sekcji 10)
3. Testowanie różnych przypadków błędów

### Krok 11: Stylowanie i dostępność

1. Stylowanie wszystkich komponentów z użyciem Tailwind CSS
2. Sprawdzenie kontrastu kolorów
3. Implementacja focus states dla przycisków i linków
4. Dodanie aria-labels i aria-describedby gdzie potrzebne
5. Testowanie nawigacji klawiaturą

### Krok 12: Testowanie

1. Testowanie happy path:
   - Kliknięcie "Przelicz wskaźniki"
   - Wyświetlanie danych
   - Formatowanie wartości

2. Testowanie edge cases:
   - Brak profilu (redirect do `/onboarding`)
   - Brak inwestycji (`years_to_fire === null`)
   - Brak daty urodzenia (`fire_age === null`)
   - Wszystkie udziały portfela = 0

3. Testowanie błędów:
   - 401 Unauthorized
   - 404 Not Found
   - 500 Internal Server Error
   - Błąd sieciowy
   - Timeout

4. Testowanie dostępności:
   - Nawigacja klawiaturą
   - Screen reader
   - Kontrast kolorów

### Krok 13: Optymalizacja i refaktoryzacja

1. Sprawdzenie, czy nie ma niepotrzebnych re-renderów
2. Optymalizacja wywołań API (cache, jeśli potrzebne)
3. Refaktoryzacja kodu, jeśli potrzebne
4. Sprawdzenie zgodności z linterem

### Krok 14: Dokumentacja i code review

1. Dodanie komentarzy do złożonych fragmentów kodu
2. Sprawdzenie, czy wszystkie komponenty mają odpowiednie JSDoc
3. Code review (jeśli w zespole)
4. Aktualizacja dokumentacji projektu (jeśli potrzebne)

