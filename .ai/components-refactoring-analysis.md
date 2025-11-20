# Analiza TOP 5 komponentów - Rekomendacje refaktoryzacji

## TOP 5 plików o największej liczbie linii kodu (LOC)

1. **RegisterForm.tsx** - 435 linii
2. **LoginForm.tsx** - 434 linie
3. **OnboardingContainer.tsx** - 419 linii
4. **ResetPasswordForm.tsx** - 319 linii
5. **EditInvestmentModal.tsx** - 266 linii

---

## 1. RegisterForm.tsx (435 LOC)

### Zidentyfikowane problemy:
- **Duplikacja logiki** - podobna struktura do `LoginForm.tsx` (walidacja, obsługa błędów, rate limiting)
- **Mieszanie odpowiedzialności** - walidacja, obsługa stanu, logika API, UI w jednym komponencie
- **Złożona obsługa stanu** - wiele `useState` i `useEffect` dla różnych aspektów
- **Duplikacja kodu rate limiting** - identyczna logika w wielu formularzach
- **Brak separacji concerns** - logika biznesowa zmieszana z prezentacją

### Rekomendacje refaktoryzacji:

#### 1.1. Custom Hook dla formularzy autentykacji
**Wzorzec:** Custom Hook Pattern (React 19)
**Technika:** Wyodrębnienie logiki do `useAuthForm.ts`

```typescript
// src/lib/hooks/useAuthForm.ts
export function useAuthForm<T extends AuthFormData>({
  initialData,
  validator,
  onSubmit,
}: UseAuthFormOptions<T>) {
  // Centralizacja: walidacja, stan, obsługa błędów, rate limiting
}
```

**Korzyści:**
- Eliminacja duplikacji między `LoginForm`, `RegisterForm`, `ForgotPasswordForm`
- Łatwiejsze testowanie logiki biznesowej
- Reużywalność w innych formularzach

#### 1.2. Komponent bazowy dla formularzy
**Wzorzec:** Composition Pattern + Compound Components
**Technika:** Abstrakcja wspólnej struktury formularza

```typescript
// src/components/forms/AuthFormBase.tsx
export function AuthFormBase({ children, onSubmit, ... }) {
  // Wspólna struktura, obsługa submit, loading states
}
```

#### 1.3. Walidacja z użyciem biblioteki
**Technika:** React Hook Form + Zod (kompatybilne z React 19)
**Argumentacja:**
- React Hook Form minimalizuje re-rendery (lepsze performance)
- Zod zapewnia type-safe walidację (TypeScript 5)
- Integracja z Shadcn/ui przez `react-hook-form`

```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Hasła nie są identyczne",
  path: ["confirmPassword"],
});
```

#### 1.4. Rate Limiting Hook
**Wzorzec:** Custom Hook Pattern
**Technika:** `useRateLimiter.ts` - wyodrębnienie logiki rate limiting

```typescript
// src/lib/hooks/useRateLimiter.ts
export function useRateLimiter(cooldownMs: number) {
  // Centralizacja logiki countdown, interval management
}
```

#### 1.5. Error Boundary dla formularzy
**Wzorzec:** Error Boundary Pattern
**Technika:** Wykorzystanie React 19 Error Boundaries dla lepszej obsługi błędów

---

## 2. LoginForm.tsx (434 LOC)

### Zidentyfikowane problemy:
- **Duplikacja** - 90% kodu identyczne z `RegisterForm.tsx`
- **Złożona logika sesji** - wielokrotne próby pobrania sesji, fallbacki
- **Mieszanie logiki Supabase** - bezpośrednie wywołania w komponencie
- **Brak abstrakcji API** - bezpośrednie wywołania `fetch` i Supabase
- **Złożona obsługa błędów** - wiele warunków if/else dla różnych typów błędów

### Rekomendacje refaktoryzacji:

#### 2.1. Service Layer dla autentykacji
**Wzorzec:** Service Layer Pattern
**Technika:** `auth.service.ts` - abstrakcja logiki Supabase

```typescript
// src/lib/services/auth.service.ts
export class AuthService {
  async signIn(email: string, password: string): Promise<AuthResult> {
    // Centralizacja logiki logowania, obsługa sesji, error handling
  }
  
  async checkProfileAndRedirect(authToken: string): Promise<void> {
    // Wyodrębnienie logiki sprawdzania profilu i przekierowania
  }
}
```

**Korzyści:**
- Separacja concerns - komponent tylko renderuje, service obsługuje logikę
- Łatwiejsze testowanie (mockowanie service)
- Reużywalność w innych miejscach aplikacji

#### 2.2. Custom Hook dla logowania
**Wzorzec:** Custom Hook Pattern
**Technika:** `useLogin.ts` - wyodrębnienie całej logiki logowania

```typescript
// src/lib/hooks/useLogin.ts
export function useLogin() {
  const [state, setState] = useState<LoginState>(...);
  const authService = useAuthService();
  
  const handleSubmit = async (data: LoginFormData) => {
    // Cała logika logowania, obsługa błędów, redirects
  };
  
  return { state, handleSubmit, ... };
}
```

#### 2.3. React Query dla zarządzania stanem API
**Technika:** TanStack Query (React Query) v5
**Argumentacja:**
- Automatyczne cache'owanie, retry, loading states
- Integracja z React 19 (useSuspenseQuery)
- Lepsze zarządzanie stanem asynchronicznym

```typescript
import { useMutation } from '@tanstack/react-query';

const loginMutation = useMutation({
  mutationFn: authService.signIn,
  onSuccess: (data) => {
    // Obsługa sukcesu
  },
  onError: (error) => {
    // Centralizacja obsługi błędów
  },
});
```

#### 2.4. Middleware dla obsługi błędów API
**Wzorzec:** Middleware Pattern
**Technika:** `apiErrorMiddleware.ts` - centralizacja mapowania błędów

```typescript
// src/lib/utils/apiErrorMiddleware.ts
export function mapApiError(error: ApiError): UserFriendlyError {
  // Centralizacja mapowania kodów błędów na komunikaty użytkownika
}
```

#### 2.5. Context dla sesji użytkownika
**Wzorzec:** Context API Pattern (React 19)
**Technika:** `AuthContext.tsx` - globalny stan sesji

```typescript
// src/lib/contexts/AuthContext.tsx
export const AuthContext = createContext<AuthContextValue>(...);

export function AuthProvider({ children }) {
  // Centralizacja zarządzania sesją, automatyczne refresh
}
```

---

## 3. OnboardingContainer.tsx (419 LOC)

### Zidentyfikowane problemy:
- **Zbyt wiele odpowiedzialności** - zarządzanie dwoma formularzami, nawigacja, API calls, walidacja
- **Złożony stan** - wiele `useState` dla różnych aspektów (profile, investment, errors, loading)
- **Duplikacja logiki** - podobna obsługa błędów dla profile i investment
- **Złożona logika nawigacji** - ręczne zarządzanie krokami
- **Mieszanie logiki biznesowej z UI** - bezpośrednie wywołania API w komponencie

### Rekomendacje refaktoryzacji:

#### 3.1. State Machine dla przepływu onboarding
**Wzorzec:** Finite State Machine (FSM)
**Technika:** XState lub prosty custom hook `useOnboardingFlow.ts`

```typescript
// src/lib/hooks/useOnboardingFlow.ts
type OnboardingState = 
  | { step: 'profile'; data: ProfileData }
  | { step: 'investment'; data: InvestmentData }
  | { step: 'complete' };

export function useOnboardingFlow() {
  const [state, setState] = useState<OnboardingState>(...);
  
  const next = async () => {
    // Logika przejścia między krokami z walidacją
  };
  
  return { state, next, back, ... };
}
```

**Korzyści:**
- Przewidywalne przejścia między stanami
- Łatwiejsze testowanie logiki przepływu
- Eliminacja błędów związanych z nieprawidłowymi stanami

#### 3.2. Separacja komponentów na kroki
**Wzorzec:** Step Pattern + Composition
**Technika:** Wyodrębnienie każdego kroku do osobnego komponentu

```typescript
// src/components/onboarding/steps/ProfileStep.tsx
export function ProfileStep({ data, errors, onChange, onSubmit }) {
  // Tylko UI i podstawowa walidacja
}

// src/components/onboarding/steps/InvestmentStep.tsx
export function InvestmentStep({ data, errors, onChange, onSubmit }) {
  // Tylko UI i podstawowa walidacja
}
```

#### 3.3. Custom Hook dla każdego kroku
**Wzorzec:** Custom Hook Pattern
**Technika:** `useProfileStep.ts`, `useInvestmentStep.ts`

```typescript
// src/lib/hooks/useProfileStep.ts
export function useProfileStep() {
  const { createProfile, updateProfile } = useOnboardingApi();
  // Logika specyficzna dla kroku profilu
}
```

#### 3.4. React Hook Form dla każdego formularza
**Technika:** React Hook Form + Zod
**Argumentacja:**
- Lepsze zarządzanie stanem formularza
- Automatyczna walidacja
- Mniej boilerplate kodu

#### 3.5. Service Layer dla onboarding API
**Wzorzec:** Service Layer Pattern
**Technika:** `onboarding.service.ts` - wyodrębnienie wszystkich wywołań API

```typescript
// src/lib/services/onboarding.service.ts
export class OnboardingService {
  async createProfile(data: CreateProfileCommand): Promise<ProfileDto> {
    // Centralizacja wywołań API
  }
  
  async createInvestment(data: CreateInvestmentCommand): Promise<InvestmentDto> {
    // Centralizacja wywołań API
  }
}
```

#### 3.6. Error Handler Hook
**Wzorzec:** Custom Hook Pattern
**Technika:** `useOnboardingErrorHandler.ts` - centralizacja obsługi błędów

```typescript
// src/lib/hooks/useOnboardingErrorHandler.ts
export function useOnboardingErrorHandler() {
  const handleApiError = (error: ApiError, step: OnboardingStep) => {
    // Centralizacja mapowania błędów API na błędy formularza
  };
}
```

---

## 4. ResetPasswordForm.tsx (319 LOC)

### Zidentyfikowane problemy:
- **Duplikacja** - podobna struktura do `RegisterForm` i `ForgotPasswordForm`
- **Złożona walidacja hasła** - ręczna implementacja zamiast biblioteki
- **Mieszanie logiki resetowania** - bezpośrednia obsługa tokenów w komponencie
- **Brak abstrakcji** - bezpośrednie wywołania Supabase (obecnie TODO)

### Rekomendacje refaktoryzacji:

#### 4.1. Wykorzystanie wspólnego hooka formularza
**Wzorzec:** Custom Hook Pattern (reuse z punktu 1.1)
**Technika:** `useAuthForm` z opcją dla reset password

#### 4.2. Service dla resetowania hasła
**Wzorzec:** Service Layer Pattern
**Technika:** `passwordReset.service.ts`

```typescript
// src/lib/services/passwordReset.service.ts
export class PasswordResetService {
  async resetPassword(token: string, newPassword: string): Promise<void> {
    // Centralizacja logiki resetowania hasła
  }
  
  validateToken(token: string): boolean {
    // Walidacja tokenu z URL
  }
}
```

#### 4.3. React Hook Form + Zod
**Technika:** Jak w punktach 1.3 i 3.4
**Argumentacja:**
- Type-safe walidacja
- Mniej boilerplate
- Lepsze performance

#### 4.4. Hook dla zarządzania tokenem
**Wzorzec:** Custom Hook Pattern
**Technika:** `usePasswordResetToken.ts`

```typescript
// src/lib/hooks/usePasswordResetToken.ts
export function usePasswordResetToken() {
  // Wyodrębnienie logiki parsowania tokenu z URL, walidacji
}
```

---

## 5. EditInvestmentModal.tsx (266 LOC)

### Zidentyfikowane problemy:
- **Duplikacja walidacji** - podobna logika jak w `InvestmentForm`
- **Złożona logika porównywania** - ręczne wykrywanie zmian w formularzu
- **Mieszanie odpowiedzialności** - walidacja, API calls, zarządzanie stanem w jednym miejscu
- **Brak reużywalności** - specyficzna implementacja dla edycji

### Rekomendacje refaktoryzacji:

#### 5.1. React Hook Form z mode="onChange"
**Technika:** React Hook Form z `formState.isDirty`
**Argumentacja:**
- Automatyczne wykrywanie zmian (`isDirty`, `dirtyFields`)
- Eliminacja ręcznego porównywania wartości
- Type-safe zarządzanie formularzem

```typescript
import { useForm } from 'react-hook-form';

const form = useForm<UpdateInvestmentCommand>({
  defaultValues: investment ? mapToFormData(investment) : {},
  mode: 'onChange',
});

// Automatyczne wykrywanie zmian
const hasChanges = form.formState.isDirty;
const changedFields = form.formState.dirtyFields;
```

#### 5.2. Wykorzystanie istniejącego InvestmentForm
**Wzorzec:** Composition Pattern
**Technika:** Reużycie `InvestmentForm` z props `mode="edit"`

```typescript
// InvestmentForm.tsx - rozszerzenie o tryb edycji
interface InvestmentFormProps {
  mode?: 'create' | 'edit';
  // ...
}

// EditInvestmentModal.tsx - uproszczenie
export function EditInvestmentModal({ investment, ... }) {
  const form = useForm({ defaultValues: investment });
  return (
    <Dialog>
      <InvestmentForm form={form} mode="edit" />
    </Dialog>
  );
}
```

#### 5.3. Service dla inwestycji
**Wzorzec:** Service Layer Pattern
**Technika:** `investment.service.ts` - centralizacja CRUD operacji

```typescript
// src/lib/services/investment.service.ts
export class InvestmentService {
  async update(id: string, data: UpdateInvestmentCommand): Promise<InvestmentDto> {
    // Centralizacja logiki aktualizacji
  }
}
```

#### 5.4. Custom Hook dla edycji
**Wzorzec:** Custom Hook Pattern
**Technika:** `useEditInvestment.ts`

```typescript
// src/lib/hooks/useEditInvestment.ts
export function useEditInvestment(investment: InvestmentDto | null) {
  const form = useForm({ defaultValues: investment });
  const investmentService = useInvestmentService();
  
  const handleSubmit = async (data: UpdateInvestmentCommand) => {
    // Logika aktualizacji z automatycznym wykrywaniem zmian
    const changes = getChangedFields(form.formState.dirtyFields, data);
    if (Object.keys(changes).length === 0) return;
    
    await investmentService.update(investment.id, changes);
  };
  
  return { form, handleSubmit, ... };
}
```

#### 5.5. Optimistic Updates
**Technika:** React Query optimistic updates
**Argumentacja:**
- Lepsze UX - natychmiastowa aktualizacja UI
- Automatyczny rollback przy błędzie
- Integracja z React 19

```typescript
const updateMutation = useMutation({
  mutationFn: investmentService.update,
  onMutate: async (newData) => {
    // Optimistic update
    await queryClient.cancelQueries(['investments']);
    const previous = queryClient.getQueryData(['investments']);
    queryClient.setQueryData(['investments'], optimisticUpdate);
    return { previous };
  },
  onError: (err, newData, context) => {
    // Rollback
    queryClient.setQueryData(['investments'], context.previous);
  },
});
```

---

## Wspólne rekomendacje dla wszystkich plików

### 1. TypeScript Strict Mode
**Technika:** Wykorzystanie zaawansowanych typów TypeScript 5
- `satisfies` operator dla lepszej inferencji typów
- Template literal types dla type-safe paths
- Branded types dla bezpieczeństwa typów

### 2. Error Handling Strategy
**Wzorzec:** Centralized Error Handling
**Technika:** Global error handler + error boundaries
- `GlobalErrorContext` już istnieje - rozszerzyć o więcej typów błędów
- Error boundaries dla każdego głównego modułu
- Consistent error messages (i18n ready)

### 3. Testing Strategy
**Technika:** Vitest + React Testing Library
- Unit tests dla custom hooks
- Integration tests dla formularzy
- E2E tests dla przepływów (Playwright)

### 4. Performance Optimization
**Technika:** React 19 features
- `useMemo`, `useCallback` gdzie potrzebne
- Code splitting dla dużych komponentów
- Lazy loading modals i formularzy

### 5. Accessibility (a11y)
**Technika:** ARIA attributes + keyboard navigation
- Wszystkie formularze już mają podstawowe ARIA
- Rozszerzyć o pełną obsługę klawiatury
- Screen reader testing

---

## Priorytetyzacja refaktoryzacji

### Wysoki priorytet (duplikacja, wysokie ryzyko błędów):
1. **Custom Hook dla formularzy autentykacji** (RegisterForm, LoginForm, ResetPasswordForm)
2. **Service Layer dla autentykacji** (LoginForm, RegisterForm)
3. **React Hook Form + Zod** (wszystkie formularze)

### Średni priorytet (złożoność, maintainability):
4. **State Machine dla onboarding** (OnboardingContainer)
5. **Service Layer dla inwestycji** (EditInvestmentModal, InvestmentsList)
6. **React Query** (wszystkie komponenty z API calls)

### Niski priorytet (nice to have):
7. **Optimistic Updates** (EditInvestmentModal)
8. **Advanced TypeScript patterns** (wszystkie pliki)

---

## Metryki sukcesu refaktoryzacji

- **Redukcja LOC:** Cel: -40% w każdym z TOP 5 plików
- **Redukcja duplikacji:** Cel: -80% duplikowanego kodu
- **Test coverage:** Cel: >80% dla nowych hooków i services
- **Type safety:** Cel: 100% type coverage (strict mode)
- **Performance:** Cel: brak regresji, potencjalna poprawa przez React Hook Form

