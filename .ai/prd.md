# Dokument wymagań produktu (PRD) - DoFIRE

## 1. Przegląd produktu

**Nazwa projektu:** DoFIRE  
**Cel:** Stworzenie prostego kalkulatora finansowego typu FIRE (Financial Independence, Retire Early), który pozwala użytkownikowi obliczyć swoją liczbę FIRE, czas do osiągnięcia niezależności finansowej i wiek, w którym może to nastąpić.  
**Zakres:** Aplikacja webowa z logowaniem, prostym CRUD inwestycji i dashboardem tekstowym, prezentującym podstawowe wskaźniki finansowe oraz krótką analizę portfela (AI Hint).  
**Stack technologiczny:**  
- Frontend: Astro + React  
- Backend: Supabase (Auth + Postgres + RLS)  
- Język: TypeScript  
- Stylowanie: TailwindCSS  
- Testy: Playwright  
- CI/CD: GitHub Actions  

**Charakter projektu:** MVP realizowany wyłącznie na potrzeby zaliczenia szkolenia 10xDevs.  
**Dane przetwarzane:** Tylko w czasie sesji (runtime); brak trwałego zapisu wyników obliczeń.

---

## 2. Problem użytkownika

Większość kalkulatorów FIRE ogranicza się do statycznych wyliczeń, takich jak „osiągniesz FIRE w 2043 roku”, bez kontekstu czy analizy finansowej użytkownika.  
Użytkownicy nie wiedzą:
- jak ich decyzje inwestycyjne wpływają na ryzyko i postęp,
- jak zrównoważyć portfel inwestycyjny,
- jak szybko mogą osiągnąć niezależność przy obecnych wydatkach i stopach zwrotu.

Aplikacja DoFIRE rozwiązuje ten problem, oferując proste, dynamiczne narzędzie z krótką interpretacją wyników — bez skomplikowanych wykresów czy nadmiarowych danych.

---

## 3. Wymagania funkcjonalne

### 3.1 Funkcje podstawowe
1. **Autoryzacja**
   - Logowanie przez Supabase magic link (bez haseł).
   - Trwała sesja (`persistSession`).
   - Obsługa błędów (401/403 → „Zaloguj ponownie”).

2. **Zarządzanie inwestycjami (CRUD)**
   - Typy aktywów: ETF, Bond, Stock, Cash.
   - Pola: type, amount, acquired_at, notes (opcjonalne).
   - Walidacje: amount > 0, date ≤ dziś.
   - Hard delete z potwierdzeniem (modal).

3. **Dashboard**
   - Tekstowa prezentacja wyników (bez wykresów).
   - Przycisk „Przelicz wskaźniki”.
   - Wyświetlane wartości:
     - Twoja liczba FIRE: X zł  
     - Osiągniesz FIRE w wieku Y lat  
   - AI Hint (krótkie komunikaty o strukturze portfela).

4. **Obliczenia (runtime)**
   - `annual_expense = monthly_expense * 12`
   - `fire_target = annual_expense / (withdrawal_rate_pct / 100)`
   - `invested_total = Σ(amount)`
   - `fire_progress = invested_total / fire_target`
   - `years_to_fire = log(fire_target / invested_total) / log(1 + expected_return_pct / 100)`
   - `fire_age = age + years_to_fire`

5. **AI Hint (deterministyczny)**
   Reguły oceny ryzyka na podstawie struktury portfela:
   - (share_stock + share_etf ≥ 80%) → „Wysokie ryzyko – duży udział akcji i ETF.”  
   - (share_bond ≥ 50%) → „Bezpieczny portfel – przewaga obligacji.”  
   - (share_cash ≥ 30%) → „Zbyt dużo gotówki – rozważ inwestowanie nadwyżki.”  
   - (share_stock + share_etf < 40%) → „Zbyt mało akcji – niższy potencjał wzrostu.”

---

## 4. Granice produktu

1. **Zakres MVP:**
   - Autoryzacja użytkownika.
   - CRUD inwestycji.
   - Prosty kalkulator FIRE.
   - Deterministyczny AI Hint.
   - Test Playwright.
   - Pipeline CI/CD (GitHub Actions).

2. **Poza zakresem (Out of Scope):**
   - Brak wykresów, raportów i eksportów danych.
   - Brak integracji z zewnętrznymi API finansowymi.
   - Brak mobilnej wersji natywnej.
   - Brak symulacji inflacyjnej lub miesięcznej kapitalizacji.
   - Brak trwałego zapisu wyników kalkulacji.

3. **Założenia (Assumptions):**
   - Brak podatków i opłat transakcyjnych.
   - Mieszkanie nie jest liczone w FIRE target.
   - Projekt tworzony wyłącznie w celu zaliczenia (niekomercyjny).
   - Wyniki prezentowane wyłącznie w walucie PLN.

---

## 5. Historyjki użytkowników

### US-001: Logowanie użytkownika
**Opis:**  
Jako użytkownik chcę móc zalogować się przez link magiczny, aby uzyskać dostęp do mojego profilu finansowego.

**Wymaga logowania:** Nie

**Kryteria akceptacji:**
- Użytkownik wprowadza e-mail i otrzymuje link logujący.
- Po kliknięciu linku zostaje zalogowany.
- Sesja utrzymuje się między odświeżeniami strony.
- Przy błędnym tokenie wyświetlany jest komunikat „Zaloguj ponownie”.

---

### US-002: Dodanie inwestycji
**Opis:**  
Jako użytkownik chcę dodać inwestycję (ETF, obligacje, akcje, gotówka), aby aplikacja mogła obliczyć mój postęp do FIRE.

**Wymaga logowania:** Tak

**Kryteria akceptacji:**
- Formularz wymaga wypełnienia pól: type, amount, acquired_at.
- Kwota > 0, data ≤ dziś.
- Po dodaniu inwestycji jest ona widoczna na liście.

---

### US-003: Edycja i usuwanie inwestycji
**Opis:**  
Jako użytkownik chcę móc edytować lub usuwać inwestycje, aby zaktualizować dane portfela.

**Wymaga logowania:** Tak

**Kryteria akceptacji:**
- Użytkownik może zaktualizować amount i datę.
- Usunięcie inwestycji wymaga potwierdzenia (modal).
- Po usunięciu rekord znika z listy.

---

### US-004: Przeliczenie wskaźników FIRE
**Opis:**  
Jako użytkownik chcę kliknąć przycisk „Przelicz wskaźniki”, aby zobaczyć swoją liczbę FIRE i wiek, w którym ją osiągnę.

**Wymaga logowania:** Tak

**Kryteria akceptacji:**
- Obliczenia wykonywane w runtime.
- Dashboard wyświetla:
  - „Twoja liczba FIRE: X zł”
  - „Osiągniesz FIRE w wieku Y lat”
- Wynik obliczeń jest widoczny w <1 sekundy.

---

### US-005: Analiza portfela (AI Hint)
**Opis:**  
Jako użytkownik chcę otrzymać krótką analizę mojego portfela, aby zrozumieć jego strukturę i poziom ryzyka.

**Wymaga logowania:** Tak

**Kryteria akceptacji:**
- System oblicza procentowy udział każdego typu aktywów.
- Wyświetla 1–2 zdania (≤160 znaków) opisujące strukturę.
- Przykład: „Wysokie ryzyko – duży udział akcji i ETF.”

---

### US-006: Walidacje i błędy
**Opis:**  
Jako użytkownik chcę być informowany o błędach przy wprowadzaniu danych lub problemach z autoryzacją.

**Wymaga logowania:** Częściowo (walidacje formularzy wymagają logowania; błędy autoryzacji mogą wystąpić bez logowania)

**Kryteria akceptacji:**
- Kwota ≤ 0 → komunikat „Kwota musi być większa od zera”.
- Data > dziś → komunikat „Nieprawidłowa data”.
- Błąd 401/403 → komunikat „Zaloguj ponownie”.

---

## 6. Metryki sukcesu

| Nr | Metryka | Opis | Kryterium sukcesu |
|----|----------|-------|------------------|
| 1 | Logowanie | Użytkownik loguje się i utrzymuje sesję | 100% poprawnych logowań |
| 2 | CRUD inwestycji | Dodawanie, edycja, usuwanie działa poprawnie | Wszystkie operacje CRUD zwracają sukces |
| 3 | Obliczenia | Wyniki generowane po kliknięciu „Przelicz wskaźniki” | Wyniki zgodne z formułami |
| 4 | Testy | E2E i CI/CD działają poprawnie | Wszystkie testy Playwright i GitHub Actions zakończone sukcesem |

---
