# Analiza flow logowania i tworzenia profilu

## Problem

Po logowaniu:

1. ✅ LoginForm sprawdza profil (`GET /api/v1/me/profile`)
2. ✅ Jeśli 404 (profil nie istnieje) → redirect do `/onboarding`
3. ❌ Middleware dla `/onboarding` nie znajduje użytkownika (cookies nie są jeszcze zsynchronizowane)
4. ❌ Middleware przekierowuje z powrotem do `/login`

## Obecny flow (z dokumentów)

### auth-spec.md (linie 518-520):

- Po logowaniu: sprawdzenie profilu → jeśli brak → redirect do `/onboarding`
- Po rejestracji: automatyczne logowanie → sprawdzenie profilu → jeśli brak → redirect do `/onboarding`

### ui-plan.md (linie 221-225):

- Dashboard próbuje pobrać profil
- Jeśli 404 → redirect do `/onboarding`

### prd.md:

- Onboarding jest miejscem gdzie użytkownik uzupełnia profil (krok 1: profil, krok 2: pierwsza inwestycja)

## Rozwiązania

### Opcja 1: Stworzyć podstawowy profil automatycznie po rejestracji (TRIGGER w bazie danych)

**Zalety:**

- Użytkownik zawsze ma profil po rejestracji
- Nie ma problemu z 404
- Prostsze flow

**Wady:**

- Niezgodne z PRD (onboarding jest do tworzenia profilu)
- Wymaga wartości domyślnych dla profilu (które mogą być nieprawidłowe)

### Opcja 2: Naprawić synchronizację cookies w middleware

**Zalety:**

- Zachowuje obecny flow zgodny z PRD
- Onboarding pozostaje miejscem tworzenia profilu

**Wady:**

- Wymaga debugowania problemu z cookies
- Może być problem z timing cookies w Astro SSR

### Opcja 3: Zmienić flow - nie sprawdzać profilu po logowaniu, tylko w `/onboarding`

**Zalety:**

- Prostsze flow
- Nie ma problemu z cookies przy przekierowaniu

**Wady:**

- Wymaga zmiany w LoginForm (nie sprawdzać profilu)
- Wymaga zmiany w `/onboarding` (sprawdzać profil i przekierowywać do dashboard jeśli istnieje)

## Rekomendacja

**Opcja 2 + Opcja 3 (hybrydowe):**

1. Po logowaniu: **NIE sprawdzać profilu**, tylko zawsze przekierowywać do `/onboarding`
2. W `/onboarding`: sprawdzić profil:
   - Jeśli profil istnieje → redirect do `/dashboard`
   - Jeśli profil nie istnieje → pokazać formularz onboardingu
3. Naprawić synchronizację cookies w middleware (upewnić się, że cookies są dostępne)

**Dlaczego:**

- Zachowuje flow zgodny z PRD (onboarding jest do tworzenia profilu)
- Unika problemu z cookies przy przekierowaniu (nie sprawdzamy profilu po logowaniu)
- Prostsze i bardziej przewidywalne

## Implementacja

### Zmiany w LoginForm.tsx:

- Usunąć sprawdzanie profilu po logowaniu
- Zawsze przekierowywać do `/onboarding` po sukcesie logowania

### Zmiany w onboarding.astro:

- Sprawdzić profil przy mount (już jest w script)
- Jeśli profil istnieje → redirect do `/dashboard`
- Jeśli profil nie istnieje → pokazać formularz onboardingu

### Zmiany w middleware:

- Upewnić się, że cookies są dostępne dla `/onboarding`
- Dodać więcej logowania dla debugowania
