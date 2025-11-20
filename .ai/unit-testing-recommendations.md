# Rekomendacje testów jednostkowych

Dokumentacja wskazująca, które elementy projektu warto przetestować z wykorzystaniem unit testów i dlaczego.

## 🎯 Priorytet 1: Funkcje czysto obliczeniowe (Pure Functions)

### ✅ **Warto testować - Wysoki priorytet**

#### 1. `src/lib/utils/fire-calculations.ts`

**Dlaczego:**

- **Czyste funkcje** - łatwe do testowania, brak zależności zewnętrznych
- **Krytyczna logika biznesowa** - błędy w obliczeniach FIRE mogą prowadzić do błędnych decyzji finansowych
- **Wiele przypadków brzegowych** - wymaga testowania edge cases (zero, wartości ujemne, dzielenie przez zero)
- **Deterministyczne** - te same wejścia zawsze dają te same wyjścia

**Co testować:**

```typescript
// calculateAge()
- Poprawne obliczanie wieku z dokładnością do miesięcy
- Obsługa urodzin w różnych miesiącach
- Obsługa lat przestępnych
- Edge case: urodziny dzisiaj
- Edge case: urodziny jutro (w przyszłości - powinno być obsłużone)

// calculateYearsToFire()
- Poprawne obliczanie lat do FIRE dla różnych scenariuszy
- Edge case: investedTotal = 0 (powinno zwrócić null)
- Edge case: fireTarget = 0 (powinno zwrócić null)
- Edge case: expectedReturnPct = -100 (powinno zwrócić null)
- Edge case: fireTarget < investedTotal (ujemny wynik)
- Edge case: expectedReturnPct = 0 (brak wzrostu)
- Edge case: bardzo duże wartości
- Edge case: bardzo małe wartości (precyzja)
```

**Przykładowe testy:**

```typescript
describe("calculateYearsToFire", () => {
  it("should calculate years correctly for standard scenario", () => {
    const result = calculateYearsToFire(1000000, 100000, 7);
    expect(result).toBeCloseTo(33.8, 1);
  });

  it("should return null when investedTotal is 0", () => {
    expect(calculateYearsToFire(1000000, 0, 7)).toBeNull();
  });

  it("should return null when expectedReturnPct is -100", () => {
    expect(calculateYearsToFire(1000000, 100000, -100)).toBeNull();
  });
});
```

#### 2. `src/lib/utils/formatting.ts`

**Dlaczego:**

- **Czyste funkcje** - łatwe do testowania
- **Krytyczne dla UX** - błędy formatowania psują doświadczenie użytkownika
- **Lokalizacja** - wymaga testowania formatowania polskiego (PLN, przecinki, spacje)
- **Różne przypadki** - duże liczby, małe liczby, zera, wartości ujemne

**Co testować:**

```typescript
// formatCurrency()
- Formatowanie polskich złotych (PLN)
- Poprawne użycie separatorów (spacje dla tysięcy)
- Poprawne użycie przecinków dla dziesiętnych
- Edge case: 0 → "0,00 zł"
- Edge case: bardzo duże liczby
- Edge case: wartości ujemne

// formatPercent()
- Konwersja wartości 0-1 na procenty
- Poprawne zaokrąglanie do 2 miejsc po przecinku
- Edge case: 0 → "0,00%"
- Edge case: 1 → "100,00%"
- Edge case: wartości ujemne

// formatYearsAndMonths()
- Poprawne formatowanie lat i miesięcy
- Obsługa liczby pojedynczej/mnogiej (rok/lata/lat, miesiąc/miesiące/miesięcy)
- Edge case: 0 lat i 0 miesięcy → "0 lat"
- Edge case: tylko miesiące (0 lat)
- Edge case: tylko lata (0 miesięcy)
- Edge case: dokładnie 1 rok
- Edge case: dokładnie 1 miesiąc
```

---

## 🎯 Priorytet 2: Walidatory i mapowanie błędów

### ✅ **Warto testować - Wysoki priorytet**

#### 3. `src/lib/validators/profile.validator.ts`

**Dlaczego:**

- **Bezpieczeństwo danych** - walidacja zapobiega wprowadzeniu nieprawidłowych danych
- **Zod schemas** - łatwe do testowania, deterministyczne
- **Wiele reguł walidacji** - wymaga testowania każdej reguły osobno
- **Edge cases** - wartości graniczne, formaty dat

**Co testować:**

```typescript
// validateCreateProfile()
✅ Poprawne dane (happy path)
✅ monthly_expense: < 0, undefined, null, NaN, Infinity
✅ withdrawal_rate_pct: < 0, > 100, undefined, null
✅ expected_return_pct: < -100, > 1000, undefined, null
✅ birth_date: przyszłość, > 120 lat temu, nieprawidłowy format
✅ birth_date: null (opcjonalne)
✅ Nieznane pola (strict mode)
✅ Wszystkie pola wymagane

// validateUpdateProfile()
✅ At least one field required
✅ Wszystkie pola opcjonalne
✅ Poprawne wartości dla każdego pola
✅ Błędy walidacji dla każdego pola
✅ withdrawal_rate_pct: max 2 miejsca po przecinku
```

#### 4. `src/lib/validators/investment.validator.ts`

**Dlaczego:**

- **Bezpieczeństwo danych** - podobnie jak profile validator
- **Złożona logika** - transformacje, preprocessory, superRefine
- **Różne scenariusze** - create vs update, query params

**Co testować:**

```typescript
// validateCreateInvestment()
✅ Poprawne dane (happy path)
✅ type: enum validation (etf, bond, stock, cash)
✅ amount: <= 0, > max, undefined, null, NaN
✅ acquired_at: przyszłość, nieprawidłowy format
✅ notes: > 1000 znaków, empty string → null, whitespace → null
✅ Nieznane pola (strict mode)

// validateUpdateInvestment()
✅ At least one field required
✅ Wszystkie pola opcjonalne
✅ Poprawne wartości dla każdego pola

// validateInvestmentListQuery()
✅ limit: 1-200, default 25, poza zakresem
✅ cursor: optional string
✅ type: enum validation
✅ acquired_at_from/to: format daty
✅ sort: enum validation, default "acquired_at_desc"
```

#### 5. `src/lib/utils/error-mapper.ts`

**Dlaczego:**

- **Mapowanie błędów API** - krytyczne dla UX, użytkownik musi widzieć zrozumiałe komunikaty
- **Czysta funkcja** - łatwa do testowania
- **Pokrycie wszystkich kodów błędów** - wymaga testowania każdego kodu

**Co testować:**

```typescript
// mapApiErrorCode()
✅ Wszystkie kody błędów z investmentErrorMessages
✅ Wszystkie kody błędów z profileErrorMessages
✅ Nieznany kod błędu → domyślny komunikat
✅ Custom error message map

// mapApiErrorsToFormErrors()
✅ Puste fields → {}
✅ undefined fields → {}
✅ Pojedyncze pole z błędem
✅ Wiele pól z błędami
✅ Nieznane kody błędów
✅ Custom error message map
```

---

## 🎯 Priorytet 3: Hooks (React Testing Library)

### ✅ **Warto testować - Średni priorytet**

#### 6. `src/lib/hooks/useOnboardingForm.ts`

**Dlaczego:**

- **Logika walidacji po stronie klienta** - ważna dla UX (natychmiastowa walidacja)
- **Duplikacja logiki** - walidacja jest również po stronie serwera, testy zapewniają spójność
- **Wiele przypadków** - wymaga testowania wszystkich reguł walidacji

**Co testować:**

```typescript
// validateProfileForm()
✅ Poprawne dane (happy path)
✅ monthly_expense: undefined, null, < 0, NaN, Infinity
✅ withdrawal_rate_pct: undefined, null, < 0, > 100
✅ expected_return_pct: undefined, null, < -100, > 1000
✅ birth_date: przyszłość, > 120 lat temu
✅ birth_date: undefined (opcjonalne)
✅ Kombinacje błędów (wiele pól jednocześnie)

// validateInvestmentForm()
✅ Poprawne dane (happy path)
✅ type: nieprawidłowa wartość, undefined
✅ amount: <= 0, > max, undefined, null, NaN
✅ acquired_at: brak, przyszłość
✅ notes: > 1000 znaków, empty string (opcjonalne)
```

**Uwaga:** Wymaga React Testing Library do testowania hooków.

---

## 🎯 Priorytet 4: Komponenty UI (React Testing Library)

### ⚠️ **Ograniczone testowanie - Niski priorytet**

#### 7. Proste komponenty prezentacyjne

**Dlaczego ograniczone testowanie:**

- **Komponenty Shadcn/UI** - już przetestowane przez społeczność
- **Czyste komponenty prezentacyjne** - mało logiki biznesowej
- **Wysoki koszt utrzymania** - testy UI są kruche i wymagają częstych aktualizacji

**Co warto testować:**

```typescript
// Tylko komponenty z logiką biznesową:

// FormField.tsx
✅ Renderowanie label z required indicator
✅ Przekazywanie error do ErrorMessage
✅ Przekazywanie helperText
✅ aria-* attributes dla accessibility

// ErrorMessage.tsx
✅ Renderowanie komunikatu błędu
✅ Różne warianty (inline, banner)

// FormErrorSummary.tsx
✅ Renderowanie listy błędów
✅ Pusta lista błędów (nie renderuje się)
```

#### 8. Komponenty złożone (Dashboard, Onboarding)

**Dlaczego ograniczone testowanie:**

- **Wysoka złożoność** - wymagają mockowania wielu zależności
- **Lepsze testy integracyjne** - E2E testy lepiej sprawdzają przepływ użytkownika
- **Koszt vs korzyść** - unit testy są drogie w utrzymaniu dla złożonych komponentów

**Co warto testować:**

```typescript
// Tylko krytyczna logika:

// DashboardContent - ErrorBoundary
✅ Obsługa błędów renderowania
✅ Wyświetlanie komunikatu błędu

// OnboardingContainer - logika kroków
✅ Przechodzenie między krokami
✅ Walidacja przed przejściem do następnego kroku
✅ Obsługa błędów API
```

---

## 🎯 Priorytet 5: Funkcje pomocnicze

### ✅ **Warto testować - Średni priorytet**

#### 9. `src/lib/utils/api-error-handler.ts`

**Dlaczego:**

- **Logika routingu błędów** - decyduje, które błędy są obsługiwane globalnie
- **Czysta funkcja** - łatwa do testowania
- **Krytyczna dla UX** - błędy muszą być obsługiwane poprawnie

**Co testować:**

```typescript
// shouldHandleGlobally()
✅ 401 Unauthorized → true
✅ 403 Forbidden → true
✅ Inne kody błędów → false
✅ Edge cases: undefined, null
```

---

## 📊 Podsumowanie - Priorytety testowania

### 🔴 **Wysoki priorytet (Zacznij od tego)**

1. ✅ `fire-calculations.ts` - **Krytyczna logika biznesowa**
2. ✅ `formatting.ts` - **Czyste funkcje, łatwe do testowania**
3. ✅ `profile.validator.ts` - **Bezpieczeństwo danych**
4. ✅ `investment.validator.ts` - **Bezpieczeństwo danych**
5. ✅ `error-mapper.ts` - **Czysta funkcja, ważna dla UX**

### 🟡 **Średni priorytet**

6. ✅ `useOnboardingForm.ts` - **Walidacja po stronie klienta**
7. ✅ `api-error-handler.ts` - **Logika routingu błędów**

### 🟢 **Niski priorytet (lub pomiń)**

8. ⚠️ Komponenty UI (Shadcn) - **Już przetestowane przez społeczność**
9. ⚠️ Złożone komponenty (Dashboard, Onboarding) - **Lepsze testy E2E**

---

## 🛠️ Rekomendowane narzędzia

### Dla funkcji czystych (Priorytet 1-2):

- **Vitest** lub **Jest** - szybkie, łatwe w konfiguracji
- **TypeScript** - type safety w testach

### Dla hooków i komponentów (Priorytet 3-4):

- **Vitest** + **@testing-library/react** - testowanie React
- **@testing-library/react-hooks** - testowanie hooków
- **@testing-library/user-event** - symulacja interakcji użytkownika

### Dla testów integracyjnych:

- **Playwright** lub **Cypress** - E2E testy dla złożonych przepływów

---

## 📝 Przykładowa struktura testów

```
src/
├── lib/
│   ├── utils/
│   │   ├── fire-calculations.ts
│   │   ├── fire-calculations.test.ts  ← Unit testy
│   │   ├── formatting.ts
│   │   ├── formatting.test.ts         ← Unit testy
│   │   └── error-mapper.ts
│   │   └── error-mapper.test.ts       ← Unit testy
│   ├── validators/
│   │   ├── profile.validator.ts
│   │   ├── profile.validator.test.ts  ← Unit testy
│   │   ├── investment.validator.ts
│   │   └── investment.validator.test.ts ← Unit testy
│   └── hooks/
│       ├── useOnboardingForm.ts
│       └── useOnboardingForm.test.tsx  ← Testy hooków (RTL)
└── components/
    └── FormField.tsx
        └── FormField.test.tsx          ← Testy komponentów (RTL)
```

---

## 🎯 Metryki sukcesu

**Cel pokrycia testami:**

- **Funkcje czyste (Priorytet 1-2):** 90-100% pokrycia
- **Hooks (Priorytet 3):** 70-80% pokrycia
- **Komponenty (Priorytet 4):** 50-60% pokrycia (tylko krytyczna logika)

**Zasada:** Testuj to, co jest **łatwe do testowania** i **krytyczne dla działania aplikacji**.
