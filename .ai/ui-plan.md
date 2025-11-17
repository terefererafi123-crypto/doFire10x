# Architektura UI dla DoFIRE

## 1. Przegląd struktury UI

Aplikacja DoFIRE to prosta, desktop-owa aplikacja webowa (min-width ~1024 px), zbudowana na Astro + React + Tailwind + shadcn/ui. Interfejs jest zorganizowany wokół trzech głównych sekcji:

- **Dashboard** – centralne miejsce prezentacji wyników FIRE i AI Hint.
- **Investments** – zarządzanie inwestycjami (CRUD w jednym widoku z modalami).
- **Profile** – konfiguracja parametrów profilu finansowego (wydatki, stopy, data urodzenia).

Dodatkowe ścieżki wspierające:

- **/login** – logowanie magic linkiem (Supabase).
- **/onboarding** – dwukrokowy kreator pierwszej konfiguracji profilu i pierwszej inwestycji.

Wszystkie ścieżki (poza /login) są chronione **globalnym Auth Guardem**, który sprawdza sesję (`GET /v1/auth/session`). Aplikacja używa jednego centralnego store (np. Zustand) z trzema domenami stanu:

- `profile`
- `investments`
- `metrics / aiHint`

Dane ładowane są w trybie **stale-while-revalidate**, z skeletonami podczas ładowania i pesymistycznymi mutacjami (UI aktualizuje się po sukcesie API).

---

## 2. Lista widoków

### 2.1 Login

- **Nazwa widoku:** Logowanie
- **Ścieżka widoku:** `/login`
- **Główny cel:**
  - Pozwolić użytkownikowi wprowadzić adres e-mail i rozpocząć logowanie magic linkiem.
  - Obsłużyć błędy autoryzacji (np. wygasły/błędny link).
- **Kluczowe informacje do wyświetlenia:**
  - Pole e-mail.
  - Komunikat o wysłaniu linku („Sprawdź swoją skrzynkę e-mail”).
  - Komunikaty błędów (np. niepoprawny email, problem z wysłaniem linku).
- **Kluczowe komponenty widoku:**
  - `FormField` (pole e-mail).
  - `PrimaryButton` – „Wyślij link logowania”.
  - `InfoText` / mały opis, jak działa logowanie magic linkiem.
  - `Toast` na sukces/błąd.
- **UX, dostępność i względy bezpieczeństwa:**
  - Walidacja e-mail po stronie klienta + czytelne komunikaty po polsku.
  - Fokus automatycznie na polu e-mail.
  - Komunikaty błędów powiązane z polem (aria-describedby).
  - Brak ujawniania, czy dany e-mail istnieje w systemie (neutralne komunikaty).
  - Po poprawnym zalogowaniu redirect do `/dashboard` lub (w razie braku profilu) do `/onboarding`.

---

### 2.2 Onboarding (kreator 2-krokowy)

- **Nazwa widoku:** Onboarding – konfiguracja startowa
- **Ścieżka widoku:** `/onboarding`
- **Główny cel:**
  - Umożliwić nowemu użytkownikowi:
    - zdefiniowanie profilu finansowego (`POST /v1/me/profile`),
    - dodanie pierwszej inwestycji (`POST /v1/investments`).
  - Zapewnić płynne przejście do dashboardu z pełnymi danymi.
- **Kluczowe informacje do wyświetlenia:**
  - **Krok 1 – Profil:**
    - `monthly_expense`, `withdrawal_rate_pct`, `expected_return_pct`, `birth_date`.
  - **Krok 2 – Pierwsza inwestycja:**
    - `type`, `amount`, `acquired_at`, `notes` (opcjonalne).
  - Pasek postępu (Krok 1/2, Krok 2/2).
  - Komunikaty walidacji (zgodne z regułami API).
- **Kluczowe komponenty widoku:**
  - `Stepper` / pasek postępu (Krok 1 / Krok 2).
  - `ProfileForm` (wykorzystujący walidację zod).
  - `InvestmentForm` (wersja uproszczona, dla pierwszej inwestycji).
  - `PrimaryButton` – „Dalej”, „Zakończ i przejdź do dashboardu”.
  - `SecondaryButton` – „Wstecz”.
  - `Toast` / inline errors z API (400, 409, itp.).
- **UX, dostępność i względy bezpieczeństwa:**
  - Wyraźny kontekst, nad czym użytkownik pracuje (nagłówki + opis).
  - Pola wymagane oznaczone gwiazdką, `notes` oznaczone jako „opcjonalne”.
  - W przypadku błędu 404 profilu z API – automatyczne przejście do tego widoku.
  - Spójne komunikaty błędów lokalnych i serwerowych.
  - Brak „unsaved changes guard” w MVP – prostota, ale jasne przyciski „Zapisz / Dalej”.

---

### 2.3 Dashboard

- **Nazwa widoku:** Dashboard – Twoja droga do FIRE
- **Ścieżka widoku:** `/dashboard`
- **Główny cel:**
  - Zaprezentować najważniejsze informacje:
    - Liczba FIRE, wiek FIRE, postęp do FIRE.
    - Krótką analizę portfela (AI Hint).
    - Tekstowe podsumowanie struktury portfela.
  - Umożliwić użytkownikowi ręczne **przeliczenie wskaźników**.
- **Kluczowe informacje do wyświetlenia:**
  - Dane z `GET /v1/me/metrics`:
    - `fire_target`, `fire_progress`, `years_to_fire`, `fire_age`.
  - Dane z `GET /v1/me/ai-hint`:
    - `hint`, udział procentowy typów aktywów (`shares`).
  - Informacja o braku profilu / braku inwestycji / `years_to_fire = null`.
  - Ewentualny komunikat informujący, że obliczenia są przybliżone i nie są poradą finansową.
- **Kluczowe komponenty widoku:**
  - **Layout dwukolumnowy:**
    - Lewa kolumna:
      - `MetricsPanel` – „Twoja liczba FIRE: X zł”, „Osiągniesz FIRE w wieku Y lat”, postęp w %/tekście.
      - `PrimaryButton` – „Przelicz wskaźniki”.
      - `EmptyState` – gdy brak profilu lub inwestycji.
    - Prawa kolumna:
      - `AIHintAlert` – komponent Alert z AI Hint.
      - `PortfolioSummaryList` – lista udziałów ETF/stock/bond/cash (prosty tekst).
  - `Skeleton` – dla metryk i AI Hint podczas ładowania.
  - Linki/CTA: „Uzupełnij profil”, „Dodaj inwestycję” (prowadzące do /profile /investments).
- **UX, dostępność i względy bezpieczeństwa:**
  - Przycisk „Przelicz wskaźniki” jako jedyny jawny trigger przeliczenia (`GET /v1/me/metrics` + `/v1/me/ai-hint`).
  - Przy `years_to_fire = null` – jasny komunikat: „Lata do FIRE nie mogą zostać obliczone przy zerowych inwestycjach”.
  - Wszystkie teksty po polsku, proste, bez żargonu finansowego.
  - Wyraźne nagłówki sekcji (semantyczne `<h1>`, `<h2>`).
  - Dbanie o kontrast i focus na przycisku „Przelicz wskaźniki”.
  - Brak wykresów – tylko klarowny tekst.

---

### 2.4 Investments (lista i CRUD)

- **Nazwa widoku:** Inwestycje
- **Ścieżka widoku:** `/investments`
- **Główny cel:**
  - Umożliwić użytkownikowi:
    - dodawanie, edytowanie i usuwanie inwestycji,
    - przeglądanie listy inwestycji z paginacją.
  - Zapewnić spójne dane do obliczeń na Dashboardzie.
- **Kluczowe informacje do wyświetlenia:**
  - Lista inwestycji (`GET /v1/investments`):
    - `type`, `amount`, `acquired_at`, skrócone `notes`.
  - Informacja o tym, czy są dalsze rekordy (`next_cursor`).
  - Notka „Brak inwestycji – dodaj pierwszą, aby policzyć postęp do FIRE” dla pustej listy.
- **Kluczowe komponenty widoku:**
  - `InvestmentsTable`:
    - Kolumny: Typ, Kwota, Data nabycia, Notatki (skrócone), Akcje.
  - `PrimaryButton` – „Dodaj inwestycję”.
  - `InvestmentFormModal` (dodawanie / edycja).
  - `ConfirmDialog` – potwierdzenie usunięcia.
  - `ShowMoreButton` – „Pokaż więcej” dla cursor-based pagination.
  - `SkeletonRows` – placeholdery w tabeli podczas ładowania.
- **UX, dostępność i względy bezpieczeństwa:**
  - Pesymistyczne mutacje: po wysłaniu formularza przyciski blokowane do czasu odpowiedzi.
  - Po `POST /PATCH /DELETE` – refetch listy oraz (opcjonalnie) odświeżenie danych referencyjnych na dashboard (metrics/portfolio-agg przy powrocie).
  - Czytelne komunikaty walidacji przy `amount <= 0`, `acquired_at > today`.
  - Modale dostępne z klawiatury (focus trap, aria-modal, role="dialog").
  - Usuwanie wymaga jednoznacznego potwierdzenia („Tej operacji nie można cofnąć.”).

---

### 2.5 Profile

- **Nazwa widoku:** Profil finansowy
- **Ścieżka widoku:** `/profile`
- **Główny cel:**
  - Pozwolić użytkownikowi skonfigurować parametry wpływające na obliczenia FIRE.
  - Zapewnić spójne wejścia dla endpointu `/v1/me/metrics`.
- **Kluczowe informacje do wyświetlenia:**
  - Profil z `GET /v1/me/profile` (lub empty state, jeśli brak).
  - Pola:
    - `monthly_expense`
    - `withdrawal_rate_pct`
    - `expected_return_pct`
    - `birth_date`
  - Krótkie objaśnienia pod polami (static helper texts).
- **Kluczowe komponenty widoku:**
  - `ProfileForm`:
    - Group 1 – „Wydatki miesięczne” (miesięczny koszt życia).
    - Group 2 – „Założenia inwestycyjne” (stopa wypłaty, oczekiwana stopa zwrotu).
    - Group 3 – „Data urodzenia”.
  - `PrimaryButton` – „Zapisz”.
  - `SpinnerOverlay` – podczas zapisu / refetchu.
  - `Toast` – sukces / błąd zapisu.
- **UX, dostępność i względy bezpieczeństwa:**
  - Walidacja po stronie klienta (zod) + mapowanie błędów serwera (400, 404).
  - Czytelne opisy: np. tooltip „Typowe wartości stopy wypłaty: 3–4%”.
  - Brak ostrzeżeń o niezapisanych zmianach w MVP (świadoma decyzja).
  - Po pierwszym zapisaniu profilu i dodaniu inwestycji – użytkownik na dashboardzie zobaczy poprawne metryki.

---

### 2.6 Layout / Top Nav / Error states

- **Nazwa widoku:** Layout aplikacji
- **Ścieżka widoku:** Layout dla ścieżek chronionych (`/dashboard`, `/investments`, `/profile`, `/onboarding`)
- **Główny cel:**
  - Zapewnić wspólną nawigację, obsługę stanu sesji, komunikaty globalne.
- **Kluczowe informacje do wyświetlenia:**
  - Logo/nazwa aplikacji „DoFIRE”.
  - Linki nawigacyjne: „Dashboard”, „Inwestycje”, „Profil”.
  - Ikona/element konta z opcją „Wyloguj”.
  - Baner z informacją o wygaśnięciu sesji (gdy Auth Guard wykryje 401/403).
- **Kluczowe komponenty widoku:**
  - `AppLayout` (kontener `max-w-5xl mx-auto`, min-width 1024 px).
  - `TopNav` – linki, aktywny stan, dropdown „Konto”.
  - `AuthGuard` – otaczający komponenty stron chronionych.
  - `ToastProvider` – globalne toasty.
  - `GlobalErrorBanner` – np. dla sesji wygasłej.
- **UX, dostępność i względy bezpieczeństwa:**
  - Wszystkie linki nawigacyjne dostępne z klawiatury, z wyraźnym focusem.
  - „Wyloguj” czyści lokalny stan i sesję Supabase, przenosi na `/login`.
  - Przy błędach 5xx – możliwość wyświetlenia prostego ekranu „Problem po naszej stronie – spróbuj ponownie”.
  - Przy 429 – globalny toast „Za dużo zapytań – spróbuj ponownie za chwilę”.

---

## 3. Mapa podróży użytkownika

### 3.1 Główny przypadek użycia – od zera do pierwszych wyników

1. **Wejście na aplikację (brak sesji):**
   - Użytkownik trafia na `/login`.
   - Wprowadza e-mail, wysyła magic link.
2. **Kliknięcie w magic link:**
   - Supabase loguje użytkownika.
   - UI po autoryzacji wywołuje `GET /v1/auth/session`.
   - Sukces → redirect do `/dashboard`.
3. **Sprawdzenie stanu profilu/portfela:**
   - Dashboard (AuthGuard + AppLayout) próbuje:
     - `GET /v1/me/profile`
     - `GET /v1/me/portfolio-agg`
   - Jeśli `404 profile_not_found` lub brak inwestycji → redirect do `/onboarding`.
4. **Onboarding – Krok 1: Profil:**
   - Użytkownik wypełnia formularz profilu.
   - `POST /v1/me/profile` (przy błędach walidacji – komunikaty inline).
   - Po sukcesie: przejście do kroku 2.
5. **Onboarding – Krok 2: Pierwsza inwestycja:**
   - Formularz inwestycji (modal lub sekcja na stronie).
   - `POST /v1/investments`.
   - Po sukcesie: redirect do `/dashboard`.
6. **Dashboard – pierwsze metryki:**
   - Użytkownik klika „Przelicz wskaźniki”.
   - `GET /v1/me/metrics` + `GET /v1/me/ai-hint`.
   - UI prezentuje:
     - „Twoja liczba FIRE: X zł”
     - „Osiągniesz FIRE w wieku Y lat”
     - AI Hint + struktura portfela.

### 3.2 Przepływ CRUD inwestycji

1. Użytkownik na Dashboard klika „Zarządzaj inwestycjami” (link do `/investments`).
2. Widok `/investments` pobiera `GET /v1/investments` (pierwsza strona).
3. Dodanie inwestycji:
   - „Dodaj inwestycję” → `InvestmentFormModal`.
   - `POST /v1/investments`.
   - Sukces → zamknięcie modala, refetch listy.
4. Edycja inwestycji:
   - Ikona „Edytuj” przy wierszu → modal z prefill.
   - `PATCH /v1/investments/{id}`.
   - Sukces → refetch listy.
5. Usunięcie inwestycji:
   - Ikona „Usuń” → `ConfirmDialog`.
   - `DELETE /v1/investments/{id}`.
   - Sukces → refetch listy.
6. Użytkownik wraca na `/dashboard` i klika „Przelicz wskaźniki”, aby zobaczyć wpływ zmian.

### 3.3 Edycja profilu

1. Z `/dashboard` użytkownik klika „Edytuj parametry” (link do `/profile`).
2. `/profile` pobiera `GET /v1/me/profile`.
3. Użytkownik zmienia wartości i zapisuje (`PATCH /v1/me/profile`).
4. Po sukcesie zostaje na stronie profilowej lub wraca na `/dashboard` (w zależności od UX decyzji – np. toast + link „Powrót na dashboard”).
5. Na `/dashboard` użytkownik klika „Przelicz wskaźniki”, aby zobaczyć nowy wynik.

### 3.4 Obsługa błędów autoryzacji

1. W dowolnym widoku chronionym wystąpi błąd 401/403.
2. `AuthGuard`:
   - Wyświetla globalny baner „Sesja wygasła – zaloguj się ponownie”.
   - Po krótkiej chwili przekierowuje użytkownika na `/login`.
3. Po ponownym zalogowaniu użytkownik wraca na `/dashboard`.

---

## 4. Układ i struktura nawigacji

- **Top Nav (we wszystkich widokach chronionych):**
  - Logo / nazwa „DoFIRE” (link do `/dashboard`).
  - Linki:
    - „Dashboard” → `/dashboard`
    - „Inwestycje” → `/investments`
    - „Profil” → `/profile`
  - Prawa strona:
    - Ikona/tekst użytkownika → menu z opcją „Wyloguj”.
- **Routing:**
  - `/login` – publiczny.
  - `/onboarding`, `/dashboard`, `/investments`, `/profile` – chronione przez `AuthGuard`.
- **AuthGuard:**
  - Przy montowaniu:
    - `GET /v1/auth/session`.
    - Jeżeli 200 – renderuje wewnętrzną stronę.
    - Jeżeli 401 – redirect do `/login`.
  - Przy błędach 401/403 z dowolnego endpointu:
    - Pokazuje baner/toast „Sesja wygasła – zaloguj się ponownie”.
    - Przekierowuje na `/login`.
- **Układ strony:**
  - `AppLayout`:
    - centralny kontener `max-w-5xl mx-auto`.
    - minimalna szerokość aplikacji 1024 px, ewentualny poziomy scroll przy mniejszych oknach.
  - W każdym widoku:
    - nagłówek (`<h1>`),
    - sekcja treści,
    - obszar na skeletony/loader.

---

## 5. Kluczowe komponenty

Poniżej lista kluczowych komponentów wielokrotnego użytku (konceptualnie, niezależnie od implementacji):

1. **AppLayout**
   - Odpowiedzialny za podstawowy układ strony, centralny kontener, integrację z TopNav i ToastProvider.

2. **TopNav**
   - Zawiera linki do `/dashboard`, `/investments`, `/profile` i menu konta z „Wyloguj”.
   - Pokazuje aktywną sekcję.

3. **AuthGuard**
   - Otacza widoki chronione.
   - Woła `/v1/auth/session`.
   - Obsługuje błędy 401/403 i przekierowania.

4. **PrimaryButton / DangerButton / SecondaryButton**
   - Aliasowe komponenty o wspólnym stylu (shadcn/ui + Tailwind).
   - Używane m.in. w formularzach, modalach i nawigacji.

5. **FormField**
   - Ogólny wrapper dla pól formularzy:
     - label, input, error message, helper text.
   - Stosowany w ProfileForm, InvestmentForm, LoginForm.

6. **LoginForm**
   - Specjalizacja FormField dla e-maila + przycisk wysłania magic linku.

7. **ProfileForm**
   - Formularz dla `/profile` i kroku 1 onboardingu.
   - Zawiera pola: monthly_expense, withdrawal_rate_pct, expected_return_pct, birth_date.
   - Walidacja zod + integracja z API.

8. **InvestmentForm / InvestmentFormModal**
   - Formularz do dodawania/edycji inwestycji.
   - Używany jako modal w `/investments` i ewentualnie w kroku 2 onboardingu.
   - Obsługuje `type`, `amount`, `acquired_at`, `notes`.

9. **InvestmentsTable**
   - Prezentuje listę inwestycji.
   - Kolumny: typ, kwota, data, skrót notatek, akcje (edytuj/usuń).
   - Integracja z `ShowMoreButton` (pobranie kolejnych stron).

10. **MetricsPanel**
    - Prezentuje wynik obliczeń z `/v1/me/metrics`:
      - liczba FIRE,
      - wiek FIRE,
      - progress (np. procent).
    - Obsługuje stany:
      - dane dostępne,
      - brak profilu/brak inwestycji,
      - `years_to_fire = null`.

11. **AIHintAlert**
    - Bazuje na shadcn/ui Alert.
    - Wyświetla krótkie tekstowe AI Hint + ewentualnie regułę (w przyszłości).
    - W prawej kolumnie Dashboardu.

12. **PortfolioSummaryList**
    - Lista udziałów ETF/stock/bond/cash na podstawie udziałów procentowych.
    - Prosta prezentacja tekstowa (bez wykresów).

13. **Skeleton / SkeletonRows / SpinnerOverlay**
    - Skeleton dla metryk i AI Hint na Dashboardzie.
    - SkeletonRows w tabeli inwestycji.
    - SpinnerOverlay w formularzu profilu.

14. **ToastProvider / Toast**
    - Globalny system komunikatów:
      - sukces (zapis, usunięcie),
      - błąd (API, autoryzacja),
      - rate limit.

15. **ConfirmDialog**
    - Dialog potwierdzający usuwanie inwestycji (hard delete).
    - Jasny komunikat o nieodwracalności operacji.

16. **EmptyState**
    - Dla:
      - braku profilu,
      - braku inwestycji,
      - innych sytuacji, w których nie ma danych do wyświetlenia.
    - Zawiera krótkie objaśnienie + CTA („Uzupełnij profil”, „Dodaj inwestycję”).

17. **GlobalErrorBanner**
    - Pasek u góry ekranu dla:
      - problemów z sesją,
      - problemów technicznych (5xx, 429).
    - Np. „Sesja wygasła – zaloguj się ponownie”.

---

Ta architektura UI zapewnia ścisłą zgodność z PRD, strukturyzuje aplikację wokół kluczowych zasobów API i uwzględnia decyzje podjęte w sesji planowania (desktop-only, prosty routing, pesymistyczne mutacje, deterministyczny AI Hint, brak wykresów). Stanowi solidną podstawę do przejścia do projektu szczegółowych makiet i implementacji komponentów.
