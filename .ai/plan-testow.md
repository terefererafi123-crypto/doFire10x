# Plan Testów - DoFIRE

## 1. Wprowadzenie i cele testowania

### 1.1. Cel dokumentu

Niniejszy dokument stanowi kompleksowy plan testów dla aplikacji DoFIRE - kalkulatora finansowego typu FIRE (Financial Independence, Retire Early). Plan został opracowany w oparciu o analizę wymagań produktu (PRD), architekturę UI, schemat bazy danych oraz strukturę kodu aplikacji.

### 1.2. Cele testowania

Główne cele procesu testowania:

1. **Zapewnienie jakości funkcjonalnej** - weryfikacja, że wszystkie funkcjonalności działają zgodnie z wymaganiami PRD
2. **Weryfikacja bezpieczeństwa** - potwierdzenie, że mechanizmy autoryzacji i RLS działają poprawnie
3. **Walidacja obliczeń** - sprawdzenie poprawności formuł FIRE i logiki biznesowej
4. **Testowanie integracji** - weryfikacja współpracy między frontendem, backendem API i bazą danych Supabase
5. **Zapewnienie użyteczności** - weryfikacja, że interfejs użytkownika jest intuicyjny i dostępny
6. **Weryfikacja wydajności** - sprawdzenie, że aplikacja działa wydajnie przy typowych obciążeniach

### 1.3. Zakres dokumentu

Plan testów obejmuje:

- Testy jednostkowe (Unit Tests)
- Testy integracyjne (Integration Tests)
- Testy end-to-end (E2E Tests)
- Testy bezpieczeństwa (Security Tests)
- Testy wydajnościowe (Performance Tests)
- Testy dostępności (Accessibility Tests)

---

## 2. Zakres testów

### 2.1. Komponenty objęte testowaniem

#### 2.1.1. Backend API (Astro Server Endpoints)

**Endpointy autoryzacji:**

- `POST /api/auth/login` - logowanie magic linkiem
- `POST /api/auth/register` - rejestracja użytkownika
- `POST /api/auth/logout` - wylogowanie
- `POST /api/auth/reset-password` - reset hasła
- `GET /api/v1/auth/session` - weryfikacja sesji

**Endpointy profilu użytkownika:**

- `GET /api/v1/me/profile` - pobranie profilu
- `POST /api/v1/me/profile` - utworzenie profilu
- `PATCH /api/v1/me/profile` - aktualizacja profilu

**Endpointy inwestycji:**

- `GET /api/v1/investments` - lista inwestycji (z paginacją, filtrowaniem, sortowaniem)
- `POST /api/v1/investments` - utworzenie inwestycji
- `GET /api/v1/investments/[id]` - pobranie pojedynczej inwestycji
- `PATCH /api/v1/investments/[id]` - aktualizacja inwestycji
- `DELETE /api/v1/investments/[id]` - usunięcie inwestycji

**Endpointy metryk i analizy:**

- `GET /api/v1/me/metrics` - obliczenie wskaźników FIRE
- `GET /api/v1/me/portfolio-agg` - agregacja portfela
- `GET /api/v1/me/ai-hint` - generowanie AI Hint

**Endpointy pomocnicze:**

- `GET /api/v1/health` - health check

#### 2.1.2. Serwisy biznesowe (Services Layer)

**Serwisy do testowania:**

- `metrics.service.ts` - obliczenia FIRE
- `ai-hint.service.ts` - generowanie AI Hint
- `profile.service.ts` - operacje na profilu
- `investment.service.ts` - operacje na inwestycjach
- `portfolio.service.ts` - agregacja portfela

#### 2.1.3. Walidatory (Validators)

**Walidatory do testowania:**

- `profile.validator.ts` - walidacja danych profilu
- `investment.validator.ts` - walidacja danych inwestycji
- `metrics-query.validator.ts` - walidacja parametrów zapytań metryk

#### 2.1.4. Komponenty React (Frontend)

**Komponenty do testowania:**

- `DashboardContent.tsx` - główny komponent dashboardu
- `OnboardingContainer.tsx` - kontener onboardingu
- `LoginForm.tsx` - formularz logowania
- `RegisterForm.tsx` - formularz rejestracji
- `InvestmentsList.tsx` - lista inwestycji
- `EditInvestmentModal.tsx` - modal edycji inwestycji
- `ProfileForm.tsx` - formularz profilu
- `InvestmentForm.tsx` - formularz inwestycji

#### 2.1.5. Middleware i pomocnicze

**Komponenty infrastrukturalne:**

- `middleware/index.ts` - middleware autoryzacji
- `lib/auth/helpers.ts` - pomocnicze funkcje autoryzacji
- `lib/utils/fire-calculations.ts` - funkcje obliczeniowe FIRE

### 2.2. Komponenty wyłączone z testowania

- Komponenty UI z biblioteki Shadcn/ui (testowane przez bibliotekę)
- Konfiguracja Supabase (zarządzana przez Supabase)
- Migracje bazy danych (testowane ręcznie podczas wdrożenia)

---

## 3. Typy testów do przeprowadzenia

### 3.1. Testy jednostkowe (Unit Tests)

**Narzędzie:** Vitest lub Jest

**Zakres:**

- Funkcje obliczeniowe FIRE (`fire-calculations.ts`)
- Serwisy biznesowe (metrics, ai-hint, profile, investment, portfolio)
- Walidatory (profile, investment, metrics-query)
- Funkcje pomocnicze (auth helpers, utils)

**Priorytet:** Wysoki

**Przykładowe testy:**

- Obliczanie `annual_expense` z `monthly_expense`
- Obliczanie `fire_target` z różnych wartości `withdrawal_rate_pct`
- Obliczanie `years_to_fire` dla różnych scenariuszy
- Walidacja zakresów wartości (amount > 0, dates ≤ today)
- Generowanie AI Hint dla różnych struktur portfela

### 3.2. Testy integracyjne (Integration Tests)

**Narzędzie:** Vitest z Supabase Test Client

**Zakres:**

- Integracja serwisów z bazą danych Supabase
- Integracja endpointów API z serwisami
- Integracja middleware z endpointami
- Integracja walidatorów z endpointami

**Priorytet:** Wysoki

**Przykładowe testy:**

- Tworzenie profilu przez API i weryfikacja w bazie
- Tworzenie inwestycji i weryfikacja agregacji portfela
- Weryfikacja RLS - użytkownik widzi tylko swoje dane
- Weryfikacja walidacji na poziomie bazy (CHECK constraints)
- Testowanie paginacji inwestycji z kursorem

### 3.3. Testy end-to-end (E2E Tests)

**Narzędzie:** Playwright

**Zakres:**

- Pełne przepływy użytkownika
- Interakcje między frontendem a backendem
- Testowanie w rzeczywistym środowisku przeglądarki

**Priorytet:** Krytyczny (wymagane przez PRD)

**Przykładowe scenariusze:**

- Rejestracja → Onboarding → Dashboard → Dodanie inwestycji → Przeliczenie metryk
- Logowanie → Edycja profilu → Aktualizacja inwestycji → Usunięcie inwestycji
- Testowanie sesji między odświeżeniami strony
- Testowanie błędów autoryzacji (401/403)

### 3.4. Testy bezpieczeństwa (Security Tests)

**Narzędzie:** Manual + Automated (Playwright)

**Zakres:**

- Autoryzacja i uwierzytelnianie
- Row Level Security (RLS)
- Walidacja danych wejściowych
- Ochrona przed atakami (XSS, SQL Injection, CSRF)

**Priorytet:** Wysoki

**Przykładowe testy:**

- Użytkownik nie może zobaczyć danych innego użytkownika (RLS)
- Nieautoryzowany dostęp do chronionych endpointów zwraca 401
- Walidacja SQL injection w polach tekstowych
- Weryfikacja wygaśnięcia sesji i redirect do /login

### 3.5. Testy wydajnościowe (Performance Tests)

**Narzędzie:** Playwright + Lighthouse CI (opcjonalnie)

**Zakres:**

- Czas odpowiedzi API
- Czas renderowania komponentów
- Wydajność obliczeń FIRE
- Optymalizacja zapytań do bazy danych

**Priorytet:** Średni (dla MVP)

**Przykładowe testy:**

- Czas odpowiedzi `GET /api/v1/me/metrics` < 1 sekunda
- Czas renderowania dashboardu < 2 sekundy
- Wydajność zapytania z 100+ inwestycjami

### 3.6. Testy dostępności (Accessibility Tests)

**Narzędzie:** Playwright + axe-core

**Zakres:**

- Zgodność z WCAG 2.1 (poziom AA)
- Nawigacja klawiaturą
- Czytniki ekranu
- Kontrast kolorów

**Priorytet:** Średni (dla MVP)

**Przykładowe testy:**

- Wszystkie interaktywne elementy dostępne z klawiatury
- Formularze mają odpowiednie etykiety ARIA
- Komunikaty błędów są dostępne dla czytników ekranu

---

## 4. Scenariusze testowe dla kluczowych funkcjonalności

### 4.1. Autoryzacja i sesja użytkownika

#### TC-AUTH-001: Rejestracja nowego użytkownika

**Priorytet:** Wysoki  
**Typ testu:** E2E

**Kroki:**

1. Otwórz stronę `/register`
2. Wprowadź poprawny adres e-mail
3. Wprowadź hasło (min. 6 znaków)
4. Wprowadź potwierdzenie hasła
5. Kliknij "Zarejestruj się"

**Oczekiwany wynik:**

- Użytkownik otrzymuje komunikat o wysłaniu e-maila weryfikacyjnego
- E-mail zawiera link weryfikacyjny
- Po kliknięciu linku użytkownik jest zalogowany
- Użytkownik jest przekierowany do `/onboarding` (jeśli brak profilu) lub `/dashboard`

#### TC-AUTH-002: Logowanie magic linkiem

**Priorytet:** Wysoki  
**Typ testu:** E2E

**Kroki:**

1. Otwórz stronę `/login`
2. Wprowadź adres e-mail
3. Kliknij "Wyślij link logowania"
4. Otwórz e-mail i kliknij magic link

**Oczekiwany wynik:**

- Użytkownik jest zalogowany
- Sesja jest utrzymywana między odświeżeniami
- Użytkownik jest przekierowany do `/dashboard` lub `/onboarding`

#### TC-AUTH-003: Wygaśnięcie sesji

**Priorytet:** Wysoki  
**Typ testu:** E2E + Integracyjny

**Kroki:**

1. Zaloguj się do aplikacji
2. Symuluj wygaśnięcie tokenu (usunięcie z localStorage/cookies)
3. Spróbuj wykonać akcję wymagającą autoryzacji

**Oczekiwany wynik:**

- API zwraca 401 Unauthorized
- Użytkownik jest przekierowany do `/login?error=session_expired`
- Wyświetlany jest komunikat "Sesja wygasła – zaloguj się ponownie"

#### TC-AUTH-004: Ochrona chronionych endpointów

**Priorytet:** Wysoki  
**Typ testu:** Integracyjny + Security

**Kroki:**

1. Wykonaj request do `/api/v1/me/profile` bez tokenu autoryzacji
2. Wykonaj request z nieprawidłowym tokenem
3. Wykonaj request z tokenem innego użytkownika

**Oczekiwany wynik:**

- Wszystkie requesty zwracają 401 Unauthorized
- Brak wycieku informacji o strukturze danych

### 4.2. Zarządzanie profilem użytkownika

#### TC-PROFILE-001: Utworzenie profilu (onboarding krok 1)

**Priorytet:** Wysoki  
**Typ testu:** E2E

**Kroki:**

1. Zaloguj się jako nowy użytkownik (bez profilu)
2. Przejdź do `/onboarding`
3. Wypełnij formularz profilu:
   - `monthly_expense`: 4500
   - `withdrawal_rate_pct`: 4.0
   - `expected_return_pct`: 7.0
   - `birth_date`: 1992-05-12
4. Kliknij "Dalej"

**Oczekiwany wynik:**

- Profil jest utworzony w bazie danych
- Użytkownik przechodzi do kroku 2 (dodanie pierwszej inwestycji)
- Wszystkie pola są poprawnie zapisane

#### TC-PROFILE-002: Walidacja danych profilu

**Priorytet:** Wysoki  
**Typ testu:** Jednostkowy + Integracyjny

**Testowane przypadki:**

- `monthly_expense` < 0 → błąd walidacji
- `withdrawal_rate_pct` < 0 lub > 100 → błąd walidacji
- `expected_return_pct` < -100 lub > 1000 → błąd walidacji
- `birth_date` w przyszłości → błąd walidacji
- `birth_date` starsza niż 120 lat → błąd walidacji
- Brak wymaganych pól → błąd walidacji

**Oczekiwany wynik:**

- Wszystkie nieprawidłowe wartości zwracają 400 Bad Request
- Komunikaty błędów są czytelne i wskazują konkretne pola

#### TC-PROFILE-003: Aktualizacja profilu

**Priorytet:** Średni  
**Typ testu:** E2E

**Kroki:**

1. Zaloguj się i przejdź do `/profile`
2. Zmień `monthly_expense` z 4500 na 5000
3. Kliknij "Zapisz"

**Oczekiwany wynik:**

- Profil jest zaktualizowany
- Nowe wartości są widoczne na dashboardzie po przeliczeniu
- Komunikat sukcesu jest wyświetlony

#### TC-PROFILE-004: Konflikt - próba utworzenia drugiego profilu

**Priorytet:** Średni  
**Typ testu:** Integracyjny

**Kroki:**

1. Utwórz profil dla użytkownika
2. Spróbuj utworzyć drugi profil dla tego samego użytkownika

**Oczekiwany wynik:**

- API zwraca 409 Conflict
- Komunikat: "Profile already exists for this user"

### 4.3. Zarządzanie inwestycjami (CRUD)

#### TC-INVEST-001: Dodanie inwestycji

**Priorytet:** Wysoki  
**Typ testu:** E2E

**Kroki:**

1. Zaloguj się i przejdź do `/investments`
2. Kliknij "Dodaj inwestycję"
3. Wypełnij formularz:
   - `type`: ETF
   - `amount`: 10000
   - `acquired_at`: 2024-01-15
   - `notes`: "ETF SP500"
4. Kliknij "Zapisz"

**Oczekiwany wynik:**

- Inwestycja jest utworzona
- Inwestycja jest widoczna na liście
- Agregacja portfela jest zaktualizowana

#### TC-INVEST-002: Walidacja danych inwestycji

**Priorytet:** Wysoki  
**Typ testu:** Jednostkowy + Integracyjny

**Testowane przypadki:**

- `amount` ≤ 0 → błąd walidacji
- `amount` > 999999999999.99 → błąd walidacji
- `acquired_at` w przyszłości → błąd walidacji
- `type` nie jest jednym z: etf, bond, stock, cash → błąd walidacji
- `notes` > 1000 znaków → błąd walidacji
- Brak wymaganych pól → błąd walidacji

**Oczekiwany wynik:**

- Wszystkie nieprawidłowe wartości zwracają 400 Bad Request
- Komunikaty błędów wskazują konkretne pola

#### TC-INVEST-003: Edycja inwestycji

**Priorytet:** Wysoki  
**Typ testu:** E2E

**Kroki:**

1. Przejdź do `/investments`
2. Kliknij "Edytuj" przy inwestycji
3. Zmień `amount` z 10000 na 15000
4. Kliknij "Zapisz"

**Oczekiwany wynik:**

- Inwestycja jest zaktualizowana
- Nowa wartość jest widoczna na liście
- Agregacja portfela jest zaktualizowana

#### TC-INVEST-004: Usunięcie inwestycji

**Priorytet:** Wysoki  
**Typ testu:** E2E

**Kroki:**

1. Przejdź do `/investments`
2. Kliknij "Usuń" przy inwestycji
3. Potwierdź usunięcie w modalu

**Oczekiwany wynik:**

- Modal potwierdzenia jest wyświetlony
- Po potwierdzeniu inwestycja jest usunięta (hard delete)
- Inwestycja znika z listy
- Agregacja portfela jest zaktualizowana

#### TC-INVEST-005: Paginacja inwestycji

**Priorytet:** Średni  
**Typ testu:** Integracyjny + E2E

**Kroki:**

1. Utwórz 30 inwestycji
2. Przejdź do `/investments`
3. Sprawdź, że wyświetlane są pierwsze 25 (domyślny limit)
4. Kliknij "Pokaż więcej"

**Oczekiwany wynik:**

- Pierwsze 25 inwestycji jest wyświetlonych
- Po kliknięciu "Pokaż więcej" wyświetlane są kolejne inwestycje
- `next_cursor` jest poprawnie używany do paginacji

#### TC-INVEST-006: Filtrowanie i sortowanie inwestycji

**Priorytet:** Średni  
**Typ testu:** Integracyjny

**Testowane przypadki:**

- Filtrowanie po `type` (etf, bond, stock, cash)
- Filtrowanie po `acquired_at_from` i `acquired_at_to`
- Sortowanie: `acquired_at_desc`, `acquired_at_asc`, `amount_desc`, `amount_asc`

**Oczekiwany wynik:**

- Filtry zwracają tylko pasujące inwestycje
- Sortowanie działa poprawnie dla wszystkich opcji

#### TC-INVEST-007: RLS - użytkownik widzi tylko swoje inwestycje

**Priorytet:** Wysoki  
**Typ testu:** Security + Integracyjny

**Kroki:**

1. Utwórz inwestycję jako User A
2. Zaloguj się jako User B
3. Spróbuj pobrać inwestycję User A przez API

**Oczekiwany wynik:**

- User B nie widzi inwestycji User A
- API zwraca tylko inwestycje User B
- RLS działa poprawnie na poziomie bazy danych

### 4.4. Obliczenia FIRE i metryki

#### TC-METRICS-001: Obliczenie podstawowych metryk FIRE

**Priorytet:** Krytyczny  
**Typ testu:** Jednostkowy + Integracyjny + E2E

**Dane testowe:**

- `monthly_expense`: 4500
- `withdrawal_rate_pct`: 4.0
- `expected_return_pct`: 7.0
- `invested_total`: 34000
- `birth_date`: 1992-05-12

**Oczekiwane wyniki:**

- `annual_expense` = 54000 (4500 \* 12)
- `fire_target` = 1350000 (54000 / 0.04)
- `fire_progress` ≈ 0.0252 (34000 / 1350000)
- `years_to_fire` ≈ obliczone poprawnie
- `fire_age` = current_age + years_to_fire

#### TC-METRICS-002: Obliczenia z zerowymi inwestycjami

**Priorytet:** Wysoki  
**Typ testu:** Jednostkowy + Integracyjny

**Dane testowe:**

- `invested_total`: 0

**Oczekiwany wynik:**

- `years_to_fire` = null
- `fire_age` = null
- Komunikat: "Years to FIRE undefined for zero investments."

#### TC-METRICS-003: Obliczenia bez daty urodzenia

**Priorytet:** Średni  
**Typ testu:** Jednostkowy + Integracyjny

**Dane testowe:**

- `birth_date`: null

**Oczekiwany wynik:**

- `current_age` = null
- `fire_age` = null
- `years_to_fire` jest obliczane (nie zależy od wieku)

#### TC-METRICS-004: "What-if" scenariusze (query parameters)

**Priorytet:** Średni  
**Typ testu:** Integracyjny

**Kroki:**

1. Wywołaj `GET /api/v1/me/metrics?monthly_expense=5000&expected_return_pct=8.0`

**Oczekiwany wynik:**

- Query parameters nadpisują wartości z profilu
- Obliczenia są wykonywane z nowymi wartościami
- Profil w bazie pozostaje niezmieniony

#### TC-METRICS-005: Przeliczenie wskaźników z dashboardu

**Priorytet:** Wysoki  
**Typ testu:** E2E

**Kroki:**

1. Zaloguj się i przejdź do `/dashboard`
2. Kliknij "Przelicz wskaźniki"
3. Sprawdź wyświetlone wartości

**Oczekiwany wynik:**

- Metryki są obliczone i wyświetlone
- Czas odpowiedzi < 1 sekunda
- Wartości są sformatowane poprawnie (PLN, zaokrąglenia)

### 4.5. AI Hint (analiza portfela)

#### TC-AIHINT-001: Generowanie AI Hint dla wysokiego ryzyka

**Priorytet:** Wysoki  
**Typ testu:** Jednostkowy + Integracyjny

**Dane testowe:**

- `share_stock`: 50%
- `share_etf`: 35%
- `share_bond`: 10%
- `share_cash`: 5%

**Oczekiwany wynik:**

- AI Hint: "Wysokie ryzyko – duży udział akcji i ETF."
- Reguła: `share_stock + share_etf ≥ 80%` jest dopasowana

#### TC-AIHINT-002: Generowanie AI Hint dla bezpiecznego portfela

**Priorytet:** Wysoki  
**Typ testu:** Jednostkowy + Integracyjny

**Dane testowe:**

- `share_bond`: 60%
- `share_stock`: 20%
- `share_etf`: 15%
- `share_cash`: 5%

**Oczekiwany wynik:**

- AI Hint: "Bezpieczny portfel – przewaga obligacji."
- Reguła: `share_bond ≥ 50%` jest dopasowana

#### TC-AIHINT-003: Generowanie AI Hint dla zbyt dużej gotówki

**Priorytet:** Wysoki  
**Typ testu:** Jednostkowy + Integracyjny

**Dane testowe:**

- `share_cash`: 35%
- `share_stock`: 30%
- `share_etf`: 20%
- `share_bond`: 15%

**Oczekiwany wynik:**

- AI Hint: "Zbyt dużo gotówki – rozważ inwestowanie nadwyżki."
- Reguła: `share_cash ≥ 30%` jest dopasowana

#### TC-AIHINT-004: Generowanie AI Hint dla zbyt małej ilości akcji

**Priorytet:** Wysoki  
**Typ testu:** Jednostkowy + Integracyjny

**Dane testowe:**

- `share_stock`: 15%
- `share_etf`: 20%
- `share_bond`: 50%
- `share_cash`: 15%

**Oczekiwany wynik:**

- AI Hint: "Zbyt mało akcji – niższy potencjał wzrostu."
- Reguła: `share_stock + share_etf < 40%` jest dopasowana

#### TC-AIHINT-005: Domyślny AI Hint (brak dopasowanych reguł)

**Priorytet:** Średni  
**Typ testu:** Jednostkowy + Integracyjny

**Dane testowe:**

- `share_stock`: 30%
- `share_etf`: 30%
- `share_bond`: 30%
- `share_cash`: 10%

**Oczekiwany wynik:**

- AI Hint: domyślny komunikat o zrównoważonym portfelu
- Brak dopasowanych reguł

#### TC-AIHINT-006: Długość AI Hint (max 160 znaków)

**Priorytet:** Średni  
**Typ testu:** Jednostkowy

**Kroki:**

1. Wygeneruj AI Hint dla różnych scenariuszy

**Oczekiwany wynik:**

- Wszystkie AI Hint mają ≤ 160 znaków
- Dłuższe komunikaty są obcinane z "..."

#### TC-AIHINT-007: Lokalizacja AI Hint (pl-PL, en-US)

**Priorytet:** Niski (opcjonalne dla MVP)  
**Typ testu:** Jednostkowy + Integracyjny

**Kroki:**

1. Wywołaj `GET /api/v1/me/ai-hint` z `Accept-Language: en-US`
2. Wywołaj z `Accept-Language: pl-PL`

**Oczekiwany wynik:**

- AI Hint jest zwracany w odpowiednim języku
- Domyślnie: pl-PL

### 4.6. Onboarding (dwukrokowy kreator)

#### TC-ONBOARD-001: Pełny przepływ onboardingu

**Priorytet:** Wysoki  
**Typ testu:** E2E

**Kroki:**

1. Zaloguj się jako nowy użytkownik
2. Przejdź do `/onboarding` (automatyczny redirect)
3. Wypełnij formularz profilu (krok 1)
4. Kliknij "Dalej"
5. Wypełnij formularz pierwszej inwestycji (krok 2)
6. Kliknij "Zakończ i przejdź do dashboardu"

**Oczekiwany wynik:**

- Profil jest utworzony
- Pierwsza inwestycja jest utworzona
- Użytkownik jest przekierowany do `/dashboard`
- Dashboard wyświetla poprawne dane

#### TC-ONBOARD-002: Nawigacja między krokami

**Priorytet:** Średni  
**Typ testu:** E2E

**Kroki:**

1. Przejdź do kroku 2 onboardingu
2. Kliknij "Wstecz"
3. Zmień dane w kroku 1
4. Kliknij "Dalej"

**Oczekiwany wynik:**

- Nawigacja między krokami działa poprawnie
- Dane są zachowane podczas nawigacji
- Pasek postępu jest aktualizowany

#### TC-ONBOARD-003: Walidacja w onboardingu

**Priorytet:** Wysoki  
**Typ testu:** E2E

**Kroki:**

1. Przejdź do onboardingu
2. Spróbuj przejść do kroku 2 bez wypełnienia profilu
3. Wypełnij nieprawidłowe dane (np. ujemna kwota)

**Oczekiwany wynik:**

- Nie można przejść do kroku 2 bez profilu
- Komunikaty błędów są wyświetlane inline
- Formularz nie jest wysyłany z nieprawidłowymi danymi

### 4.7. Dashboard

#### TC-DASH-001: Wyświetlanie metryk na dashboardzie

**Priorytet:** Wysoki  
**Typ testu:** E2E

**Kroki:**

1. Zaloguj się z pełnym profilem i inwestycjami
2. Przejdź do `/dashboard`
3. Kliknij "Przelicz wskaźniki"

**Oczekiwany wynik:**

- Wszystkie metryki są wyświetlone:
  - "Twoja liczba FIRE: X zł"
  - "Osiągniesz FIRE w wieku Y lat"
  - Postęp w procentach
- AI Hint jest wyświetlony
- Struktura portfela jest wyświetlona

#### TC-DASH-002: Empty state - brak profilu

**Priorytet:** Średni  
**Typ testu:** E2E

**Kroki:**

1. Zaloguj się jako użytkownik bez profilu
2. Przejdź do `/dashboard`

**Oczekiwany wynik:**

- Wyświetlony jest komunikat o braku profilu
- Link do `/onboarding` lub `/profile` jest dostępny
- Przycisk "Przelicz wskaźniki" jest nieaktywny

#### TC-DASH-003: Empty state - brak inwestycji

**Priorytet:** Średni  
**Typ testu:** E2E

**Kroki:**

1. Zaloguj się jako użytkownik z profilem, ale bez inwestycji
2. Przejdź do `/dashboard`
3. Kliknij "Przelicz wskaźniki"

**Oczekiwany wynik:**

- Wyświetlony jest komunikat o braku inwestycji
- `years_to_fire` = null
- Link do `/investments` jest dostępny

#### TC-DASH-004: Obsługa błędów na dashboardzie

**Priorytet:** Średni  
**Typ testu:** E2E

**Kroki:**

1. Symuluj błąd API (np. wyłącz Supabase)
2. Przejdź do `/dashboard`
3. Kliknij "Przelicz wskaźniki"

**Oczekiwany wynik:**

- Komunikat błędu jest wyświetlony
- Aplikacja nie crashuje
- Użytkownik może spróbować ponownie

---

## 5. Środowisko testowe

### 5.1. Środowiska testowe

#### 5.1.1. Środowisko lokalne (Development)

**Przeznaczenie:** Testy jednostkowe, integracyjne, E2E podczas rozwoju

**Konfiguracja:**

- Node.js v22.14.0
- Supabase Local Development (Docker)
- Baza danych testowa (osobna instancja)
- Zmienne środowiskowe z `.env.test`

**Uruchomienie:**

```bash
npm run test:unit        # Testy jednostkowe
npm run test:integration # Testy integracyjne
npm run test:e2e         # Testy E2E
npm run test:all         # Wszystkie testy
```

#### 5.1.2. Środowisko CI/CD (GitHub Actions)

**Przeznaczenie:** Automatyczne testy przy każdym commit/pull request

**Konfiguracja:**

- GitHub Actions workflow
- Supabase Test Client lub Docker Compose
- Izolowane środowisko dla każdego testu

**Workflow:**

1. Setup Node.js
2. Install dependencies
3. Setup Supabase Local
4. Run migrations
5. Run tests (unit → integration → E2E)
6. Generate coverage report
7. Upload artifacts

#### 5.1.3. Środowisko staging (opcjonalne)

**Przeznaczenie:** Testy przed wdrożeniem na produkcję

**Konfiguracja:**

- Osobna instancja Supabase (staging)
- Osobna domena/staging URL
- Dane testowe (seed data)

### 5.2. Dane testowe

#### 5.2.1. Seed data dla testów

**Lokalizacja:** `tests/fixtures/seed-data.sql`

**Zawartość:**

- Testowi użytkownicy (różne scenariusze)
- Profile testowe
- Inwestycje testowe (różne typy, kwoty, daty)

#### 5.2.2. Factory functions

**Lokalizacja:** `tests/factories/`

**Funkcje:**

- `createTestUser()` - tworzenie użytkownika testowego
- `createTestProfile()` - tworzenie profilu testowego
- `createTestInvestment()` - tworzenie inwestycji testowej
- `createTestPortfolio()` - tworzenie portfela testowego

### 5.3. Izolacja testów

#### 5.3.1. Testy jednostkowe

- Brak zależności od bazy danych
- Mockowanie zależności zewnętrznych
- Deterministic test data

#### 5.3.2. Testy integracyjne

- Osobna baza danych dla każdego testu (transaction rollback)
- Cleanup po każdym teście
- Izolowane dane testowe

#### 5.3.3. Testy E2E

- Osobne konta testowe
- Cleanup po każdym teście
- Reset stanu aplikacji przed testem

---

## 6. Narzędzia do testowania

### 6.1. Frameworki testowe

#### 6.1.1. Testy jednostkowe i integracyjne

**Narzędzie:** Vitest
**Uzasadnienie:**

- Szybki i kompatybilny z TypeScript
- Dobra integracja z Astro
- Wsparcie dla ES modules
- Wbudowane mockowanie

**Konfiguracja:** `vitest.config.ts`

#### 6.1.2. Testy E2E

**Narzędzie:** Playwright
**Uzasadnienie:**

- Wymagane przez PRD
- Wsparcie dla wielu przeglądarek
- Automatyczne screenshots i videos
- Dobra dokumentacja

**Konfiguracja:** `playwright.config.ts`

### 6.2. Narzędzia pomocnicze

#### 6.2.1. Mockowanie

- **Vitest mocks** - dla funkcji i modułów
- **MSW (Mock Service Worker)** - dla API calls (opcjonalnie)
- **Supabase Test Client** - dla testów integracyjnych

#### 6.2.2. Coverage

- **Vitest Coverage** - z użyciem `@vitest/coverage-v8`
- **Threshold:** 80% dla serwisów, 70% dla komponentów

#### 6.2.3. Linting i formatowanie

- **ESLint** - już skonfigurowany
- **Prettier** - już skonfigurowany

#### 6.2.4. Accessibility

- **axe-core** - dla testów dostępności
- **Playwright Accessibility** - wbudowane wsparcie

### 6.3. Narzędzia CI/CD

#### 6.3.1. GitHub Actions

**Workflow:** `.github/workflows/test.yml`

**Kroki:**

1. Checkout code
2. Setup Node.js
3. Install dependencies
4. Setup Supabase Local
5. Run database migrations
6. Run tests
7. Generate coverage report
8. Upload coverage to Codecov (opcjonalnie)

---

## 7. Harmonogram testów

### 7.1. Faza 1: Testy jednostkowe (Tydzień 1-2)

**Cel:** Pokrycie testami jednostkowymi wszystkich serwisów i funkcji pomocniczych

**Zakres:**

- ✅ Funkcje obliczeniowe FIRE (`fire-calculations.ts`)
- ✅ Serwis metryk (`metrics.service.ts`)
- ✅ Serwis AI Hint (`ai-hint.service.ts`)
- ✅ Walidatory (profile, investment, metrics-query)
- ✅ Funkcje pomocnicze (auth helpers, utils)

**Kryterium sukcesu:** 80% code coverage dla serwisów

### 7.2. Faza 2: Testy integracyjne (Tydzień 2-3)

**Cel:** Weryfikacja integracji między warstwami aplikacji

**Zakres:**

- ✅ Integracja serwisów z bazą danych
- ✅ Integracja endpointów API z serwisami
- ✅ Integracja middleware z endpointami
- ✅ Testy RLS (Row Level Security)
- ✅ Testy walidacji na poziomie bazy

**Kryterium sukcesu:** Wszystkie endpointy API mają testy integracyjne

### 7.3. Faza 3: Testy E2E (Tydzień 3-4)

**Cel:** Weryfikacja pełnych przepływów użytkownika

**Zakres:**

- ✅ Scenariusze autoryzacji (rejestracja, logowanie, wylogowanie)
- ✅ Scenariusz onboardingu (pełny przepływ)
- ✅ CRUD inwestycji (dodanie, edycja, usunięcie)
- ✅ Dashboard (wyświetlanie metryk, przeliczenie)
- ✅ Obsługa błędów (401, 404, 500)

**Kryterium sukcesu:** Wszystkie user stories z PRD mają testy E2E

### 7.4. Faza 4: Testy bezpieczeństwa i wydajności (Tydzień 4)

**Cel:** Weryfikacja bezpieczeństwa i wydajności aplikacji

**Zakres:**

- ✅ Testy bezpieczeństwa (RLS, autoryzacja, walidacja)
- ✅ Testy wydajnościowe (czas odpowiedzi API)
- ✅ Testy dostępności (WCAG 2.1 AA)

**Kryterium sukcesu:** Wszystkie testy bezpieczeństwa przechodzą, API < 1s response time

### 7.5. Faza 5: Testy regresyjne (ciągłe)

**Cel:** Zapobieganie regresjom przy nowych zmianach

**Zakres:**

- ✅ Automatyczne testy przy każdym PR
- ✅ Smoke tests przed każdym release
- ✅ Testy regresyjne po bugfixach

**Kryterium sukcesu:** Wszystkie testy przechodzą przed merge do main

---

## 8. Kryteria akceptacji testów

### 8.1. Kryteria ogólne

1. **Code Coverage:**
   - Minimum 80% dla serwisów biznesowych
   - Minimum 70% dla komponentów React
   - Minimum 60% dla endpointów API

2. **Wszystkie testy przechodzą:**
   - Testy jednostkowe: 100% pass rate
   - Testy integracyjne: 100% pass rate
   - Testy E2E: 100% pass rate (z wyjątkiem flaky tests)

3. **Brak krytycznych błędów:**
   - Brak błędów bezpieczeństwa (high/critical)
   - Brak błędów funkcjonalnych (blocking)
   - Wszystkie user stories z PRD są zaimplementowane i przetestowane

### 8.2. Kryteria dla poszczególnych typów testów

#### 8.2.1. Testy jednostkowe

- ✅ Wszystkie funkcje obliczeniowe mają testy
- ✅ Wszystkie edge cases są pokryte
- ✅ Testy są deterministyczne (brak flakiness)
- ✅ Testy są szybkie (< 100ms każdy)

#### 8.2.2. Testy integracyjne

- ✅ Wszystkie endpointy API mają testy
- ✅ RLS jest przetestowany dla wszystkich tabel
- ✅ Walidacja działa na poziomie API i bazy
- ✅ Testy są izolowane (cleanup po każdym teście)

#### 8.2.3. Testy E2E

- ✅ Wszystkie user stories z PRD mają testy E2E
- ✅ Testy pokrywają happy path i error paths
- ✅ Testy są stabilne (minimalna flakiness)
- ✅ Testy są wykonywane w przeglądarce (Chrome, Firefox, Safari)

### 8.3. Metryki sukcesu (zgodnie z PRD)

| Metryka         | Opis                                                 | Kryterium sukcesu                                               |
| --------------- | ---------------------------------------------------- | --------------------------------------------------------------- |
| Logowanie       | Użytkownik loguje się i utrzymuje sesję              | 100% poprawnych logowań                                         |
| CRUD inwestycji | Dodawanie, edycja, usuwanie działa poprawnie         | Wszystkie operacje CRUD zwracają sukces                         |
| Obliczenia      | Wyniki generowane po kliknięciu "Przelicz wskaźniki" | Wyniki zgodne z formułami                                       |
| Testy           | E2E i CI/CD działają poprawnie                       | Wszystkie testy Playwright i GitHub Actions zakończone sukcesem |

---

## 9. Role i odpowiedzialności w procesie testowania

### 9.1. Zespół deweloperski

**Odpowiedzialności:**

- Pisanie testów jednostkowych dla nowych funkcji
- Utrzymanie istniejących testów
- Naprawa testów po zmianach w kodzie
- Code review testów innych deweloperów

### 9.2. QA Engineer (jeśli dostępny)

**Odpowiedzialności:**

- Tworzenie i utrzymanie testów E2E
- Testowanie scenariuszy użytkownika
- Testowanie bezpieczeństwa
- Raportowanie błędów
- Weryfikacja fixów błędów

### 9.3. Product Owner / Project Manager

**Odpowiedzialności:**

- Definiowanie kryteriów akceptacji
- Priorytetyzacja testów
- Decyzje o release (na podstawie wyników testów)

### 9.4. DevOps / CI/CD

**Odpowiedzialności:**

- Konfiguracja środowisk testowych
- Utrzymanie pipeline'ów CI/CD
- Monitorowanie wydajności testów

---

## 10. Procedury raportowania błędów

### 10.1. Szablon raportu błędu

**Format:** GitHub Issues lub system zarządzania błędami

**Pola wymagane:**

1. **Tytuł:** Krótki, opisowy tytuł błędu
2. **Priorytet:** Critical / High / Medium / Low
3. **Typ:** Bug / Security / Performance / Accessibility
4. **Środowisko:** Development / Staging / Production
5. **Kroki reprodukcji:** Krok po kroku, jak odtworzyć błąd
6. **Oczekiwany wynik:** Co powinno się wydarzyć
7. **Rzeczywisty wynik:** Co się faktycznie wydarzyło
8. **Zrzuty ekranu / Logi:** Jeśli dostępne
9. **Dodatkowe informacje:** Browser, OS, wersja aplikacji

### 10.2. Klasyfikacja priorytetów

#### Critical (Krytyczny)

- Aplikacja nie działa (crash, biały ekran)
- Błąd bezpieczeństwa (wyciek danych, brak autoryzacji)
- Błąd w obliczeniach FIRE (nieprawidłowe wyniki)

**Czas naprawy:** 24 godziny

#### High (Wysoki)

- Główna funkcjonalność nie działa (CRUD, dashboard)
- Błąd uniemożliwiający ukończenie user story
- Błąd wpływający na większość użytkowników

**Czas naprawy:** 3 dni

#### Medium (Średni)

- Funkcjonalność działa, ale z problemami (UI, UX)
- Błąd wpływający na część użytkowników
- Błąd w funkcjonalności pomocniczej

**Czas naprawy:** 1 tydzień

#### Low (Niski)

- Drobne problemy UI/UX
- Błędy w funkcjonalnościach opcjonalnych
- Sugestie ulepszeń

**Czas naprawy:** 2 tygodnie lub w następnej iteracji

### 10.3. Workflow naprawy błędu

1. **Raportowanie:** QA/Developer tworzy issue z opisem błędu
2. **Triage:** Zespół ocenia priorytet i przypisuje do dewelopera
3. **Naprawa:** Deweloper naprawia błąd i pisze testy
4. **Weryfikacja:** QA weryfikuje naprawę
5. **Zamknięcie:** Issue jest zamykane po weryfikacji

### 10.4. Metryki jakości

**Śledzone metryki:**

- Liczba zgłoszonych błędów
- Czas naprawy błędów (średni)
- Wskaźnik ponownego otwarcia (reopening rate)
- Pokrycie testami (code coverage)

---

## 11. Dodatkowe uwagi i rekomendacje

### 11.1. Testowanie w kontekście MVP

Ponieważ DoFIRE jest projektem MVP, priorytetem są:

1. **Testy E2E** - wymagane przez PRD, pokrywają główne scenariusze użytkownika
2. **Testy jednostkowe dla obliczeń** - krytyczne dla poprawności wyników FIRE
3. **Testy bezpieczeństwa (RLS)** - krytyczne dla ochrony danych użytkowników

Testy wydajnościowe i dostępności mogą być uproszczone dla MVP, ale powinny być rozszerzone w przyszłości.

### 11.2. Flaky tests

**Problemy z flaky tests:**

- Testy E2E mogą być niestabilne z powodu timing issues
- Testy integracyjne mogą być niestabilne z powodu stanu bazy danych

**Rozwiązania:**

- Użycie `waitFor` w Playwright zamiast `sleep`
- Proper cleanup i isolation dla testów integracyjnych
- Retry mechanism dla testów E2E (max 2 retries)

### 11.3. Testowanie z Supabase

**Supabase Local Development:**

- Użycie Supabase CLI do lokalnego środowiska
- Seed data dla testów
- Reset bazy danych przed każdym testem

**Supabase Test Client:**

- Użycie Supabase Test Client dla testów integracyjnych
- Mockowanie Supabase Auth dla testów jednostkowych

### 11.4. Testowanie obliczeń finansowych

**Szczególna uwaga:**

- Obliczenia FIRE muszą być dokładne (precyzja do 2 miejsc po przecinku)
- Testy powinny weryfikować edge cases (zero investments, negative returns)
- Testy powinny weryfikować różne scenariusze (różne stopy zwrotu, różne wydatki)

### 11.5. Testowanie AI Hint

**Deterministyczny AI Hint:**

- AI Hint jest deterministyczny (nie używa AI), więc testy są proste
- Należy przetestować wszystkie reguły i ich priorytety
- Należy przetestować lokalizację (pl-PL, en-US)

### 11.6. Testowanie Astro + React

**Hybrydowa architektura:**

- Testy Astro pages (server-side rendering)
- Testy React components (client-side interactivity)
- Testy integracji między Astro i React

**Narzędzia:**

- Vitest dla testów jednostkowych React components
- Playwright dla testów E2E (Astro + React)
- Astro Test Utils (jeśli dostępne) dla testów Astro pages

---

## 12. Podsumowanie

Plan testów dla DoFIRE został opracowany w oparciu o:

- Wymagania produktu (PRD)
- Architekturę aplikacji (Astro + React + Supabase)
- Strukturę kodu i komponenty
- Best practices testowania

**Kluczowe elementy planu:**

1. ✅ Testy jednostkowe dla serwisów i obliczeń
2. ✅ Testy integracyjne dla API i bazy danych
3. ✅ Testy E2E dla wszystkich user stories
4. ✅ Testy bezpieczeństwa (RLS, autoryzacja)
5. ✅ Testy wydajnościowe i dostępności

**Następne kroki:**

1. Konfiguracja środowisk testowych
2. Implementacja testów jednostkowych
3. Implementacja testów integracyjnych
4. Implementacja testów E2E
5. Konfiguracja CI/CD pipeline
6. Uruchomienie testów i weryfikacja coverage

Plan testów jest żywym dokumentem i powinien być aktualizowany w miarę rozwoju projektu.
