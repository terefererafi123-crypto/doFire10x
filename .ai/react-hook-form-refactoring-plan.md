# Plan Refaktoryzacji z React Hook Form

<refactoring_breakdown>

## Analiza Myślowa - Breakdown Refaktoryzacji

### 1. Analiza Obecnych Komponentów

#### 1.1 LoginForm (156 LOC)
**Obecna implementacja:**
- Używa `useAuthForm` hook (własna implementacja)
- Ręczne zarządzanie walidacją przez `validateAll()`
- Ręczne zarządzanie stanem przez `form.state.data` i `form.setFieldValue()`
- Integracja z `EmailField` i `PasswordField` przez props `onChange`, `onBlur`, `onFocus`

**Obszary wymagające refaktoryzacji:**
```typescript
// Linie 16-31: Ręczna konfiguracja useAuthForm
const form = useAuthForm<LoginFormData>({
  initialData: { email: "", password: "" },
  validators: { password: (p) => p ? undefined : "Pole hasła jest wymagane" }
});

// Linie 54-57: Ręczna walidacja
if (!form.validateAll()) {
  return;
}

// Linie 115-133: Ręczne bindingi do pól
<EmailField
  value={form.state.data.email}
  onChange={(value) => form.setFieldValue("email", value)}
  onBlur={() => form.validateField("email")}
  onFocus={() => form.clearFieldError("email")}
/>
```

**Potencjalne implementacje React Hook Form:**

**Opcja A: Pełna integracja z Controller**
- Pros: Pełna kontrola, łatwa integracja z Shadcn/ui
- Cons: Więcej boilerplate dla każdego pola

**Opcja B: Wrapper hook `useAuthFormWithRHF`**
- Pros: Zachowanie obecnego API, łatwa migracja
- Cons: Dodatkowa warstwa abstrakcji

**Opcja C: Bezpośrednia integracja z useForm**
- Pros: Najczystsze rozwiązanie, najlepsze performance
- Cons: Wymaga zmiany wszystkich komponentów

**Rekomendacja:** Opcja C - bezpośrednia integracja, ale z helper hookiem dla wspólnej logiki (rate limiting, error handling)

#### 1.2 RegisterForm (179 LOC)
**Obecna implementacja:**
- Podobna do LoginForm, ale z dodatkowym polem `confirmPassword`
- Ręczna walidacja potwierdzenia hasła
- Osobny stan dla `isSuccess` i `successMessage`

**Obszary wymagające refaktoryzacji:**
```typescript
// Linie 18-26: Konfiguracja z confirmPassword
const form = useAuthForm<RegisterFormData>({
  initialData: { email: "", password: "", confirmPassword: "" },
  minPasswordLength: MIN_PASSWORD_LENGTH,
});

// Linie 122-124: Ręczna re-walidacja confirmPassword przy zmianie password
if (form.state.data.confirmPassword) {
  form.validateField("confirmPassword");
}
```

**Potencjalne implementacje:**

**Opcja A: Zod schema z refine dla confirmPassword**
```typescript
const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Hasła nie są identyczne",
  path: ["confirmPassword"],
});
```
- Pros: Type-safe, automatyczna walidacja zależności
- Cons: Wymaga zmiany struktury

**Opcja B: watch() + useEffect dla re-walidacji**
- Pros: Reaktywna walidacja
- Cons: Dodatkowe re-rendery

**Rekomendacja:** Opcja A - Zod schema z refine, React Hook Form automatycznie obsłuży re-walidację

#### 1.3 ForgotPasswordForm (136 LOC)
**Obecna implementacja:**
- Najprostszy formularz - tylko email
- Używa `useAuthForm` z tylko jednym polem
- Integracja z `ForgotPasswordService`

**Obszary wymagające refaktoryzacji:**
```typescript
// Linie 16-22: Konfiguracja dla jednego pola
const form = useAuthForm<ForgotPasswordFormData>({
  initialData: { email: "" },
  rateLimitCooldownMs: RATE_LIMIT_COOLDOWN_MS,
});
```

**Potencjalne implementacje:**
- Najprostszy przypadek - bezpośrednia integracja z `useForm`
- Zod schema: `z.object({ email: z.string().email() })`
- Można użyć jako wzorca dla innych prostych formularzy

#### 1.4 ResetPasswordForm (155 LOC)
**Obecna implementacja:**
- Podobny do RegisterForm - password + confirmPassword
- Dodatkowa logika walidacji tokenu z URL
- Brak rate limiting (nie potrzebny)

**Obszary wymagające refaktoryzacji:**
```typescript
// Linie 30-50: Walidacja tokenu z URL
React.useEffect(() => {
  if (!resetPasswordService.validateToken()) {
    form.setSubmitError("Link resetujący wygasł...");
  }
}, [form]);
```

**Potencjalne implementacje:**
- Podobna do RegisterForm - Zod schema z refine
- Token validation może pozostać w useEffect, ale można przenieść do custom hooka

#### 1.5 ProfileForm (207 LOC)
**Obecna implementacja:**
- Kontrolowany komponent z props `data`, `errors`, `onChange`, `onBlur`
- Ręczna konwersja wartości (string -> number dla pól numerycznych)
- Ręczne zarządzanie błędami przez props

**Obszary wymagające refaktoryzacji:**
```typescript
// Linie 22-40: Ręczna konwersja wartości
const handleChange = (field: keyof ProfileFormData, value: string | number) => {
  if (field === "birth_date") {
    onChange(field, value || undefined);
  } else {
    const numValue = typeof value === "string" ? parseFloat(value) : value;
    if (!isNaN(numValue)) {
      onChange(field, numValue);
    }
  }
};

// Linie 72-74: Ręczne bindingi
value={data.monthly_expense === undefined || data.monthly_expense === null ? "" : data.monthly_expense}
onChange={(e) => handleChange("monthly_expense", e.target.value)}
```

**Potencjalne implementacje:**

**Opcja A: Controller z valueAsNumber**
```typescript
<Controller
  name="monthly_expense"
  control={control}
  render={({ field }) => (
    <Input
      type="number"
      {...field}
      value={field.value ?? ""}
      onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
    />
  )}
/>
```
- Pros: Automatyczna konwersja typów
- Cons: Wymaga Controller dla każdego pola

**Opcja B: Custom input wrapper z valueAsNumber**
```typescript
<FormField
  label="Miesięczne wydatki"
  error={errors.monthly_expense}
>
  <Input
    type="number"
    {...register("monthly_expense", { valueAsNumber: true })}
  />
</FormField>
```
- Pros: Prostsze, mniej boilerplate
- Cons: Wymaga rozszerzenia FormField

**Rekomendacja:** Opcja B - rozszerzyć FormField o wsparcie dla React Hook Form

#### 1.6 InvestmentForm (151 LOC)
**Obecna implementacja:**
- Podobny do ProfileForm - kontrolowany komponent
- Różne typy pól: Select, Input (number, date), Textarea
- Ręczna konwersja wartości

**Obszary wymagające refaktoryzacji:**
```typescript
// Linie 40-59: Ręczna konwersja wartości dla różnych typów
const handleChange = (field: keyof InvestmentFormData, value: string | number | null) => {
  if (field === "notes") {
    onChange(field, value || undefined);
  } else if (field === "type") {
    onChange(field, value as AssetType);
  } else if (field === "acquired_at") {
    onChange(field, value as string);
  } else {
    const numValue = typeof value === "string" ? parseFloat(value) : value;
    onChange(field, isNaN(numValue) ? 0 : numValue);
  }
};
```

**Potencjalne implementacje:**
- Controller dla Select (Shadcn/ui Select nie jest natywnym inputem)
- register() dla Input i Textarea
- valueAsNumber dla amount
- valueAsDate dla acquired_at (lub pozostawić jako string)

#### 1.7 EditInvestmentModal (266 LOC)
**Obecna implementacja:**
- Ręczne wykrywanie zmian przez porównywanie wartości
- Ręczna walidacja tylko zmienionych pól
- Złożona logika budowania `UpdateInvestmentCommand`

**Obszary wymagające refaktoryzacji:**
```typescript
// Linie 128-153: Ręczne wykrywanie zmian
const updateCommand: UpdateInvestmentCommand = {};
if (formData.type !== investment.type) {
  updateCommand.type = formData.type;
}
// ... podobnie dla innych pól

// Linie 155-160: Sprawdzanie czy są zmiany
if (Object.keys(updateCommand).length === 0) {
  setSubmitError("Nie wprowadzono żadnych zmian");
  return;
}
```

**Potencjalne implementacje:**

**Opcja A: formState.isDirty + dirtyFields**
```typescript
const { formState: { isDirty, dirtyFields } } = useForm({
  defaultValues: investment,
  mode: 'onChange'
});

// Automatyczne wykrywanie zmian
const hasChanges = isDirty;
const changedFields = Object.keys(dirtyFields);
```
- Pros: Automatyczne, zero boilerplate
- Cons: Wymaga ustawienia defaultValues z investment

**Opcja B: reset() z investment jako defaultValues**
```typescript
const form = useForm({
  defaultValues: investment || defaultInvestment
});

// Przy zmianie investment
useEffect(() => {
  if (investment) {
    form.reset(investment);
  }
}, [investment]);
```
- Pros: Automatyczne synchronizowanie z prop
- Cons: Może powodować nieoczekiwane resetowanie

**Rekomendacja:** Opcja A - użyć `isDirty` i `dirtyFields`, ale z ostrożnym zarządzaniem `defaultValues`

#### 1.8 OnboardingContainer (388 LOC)
**Obecna implementacja:**
- Zarządza dwoma formularzami (ProfileForm i InvestmentForm)
- Ręczne zarządzanie stanem dla obu formularzy
- Złożona logika przejść między krokami
- Ręczna walidacja przed przejściem do następnego kroku

**Obszary wymagające refaktoryzacji:**
```typescript
// Linie 53-71: Ręczny stan dla dwóch formularzy
const [state, setState] = React.useState<OnboardingState>({
  currentStep: 1,
  profileData: { monthly_expense: 0, ... },
  investmentData: { type: "etf", amount: 0, ... },
  profileErrors: {},
  investmentErrors: {},
  isLoading: false,
  apiError: null,
});

// Linie 192-281: Złożona logika handleNext z walidacją
const handleNext = React.useCallback(async () => {
  if (state.currentStep === 1) {
    const errors = validateProfileForm(state.profileData);
    if (Object.keys(errors).length > 0) {
      setState((prev) => ({ ...prev, profileErrors: errors }));
      return;
    }
    // ... API call i przejście do kroku 2
  }
}, [state.currentStep, state.profileData, ...]);
```

**Potencjalne implementacje:**

**Opcja A: Dwa osobne useForm (jeden na krok)**
```typescript
const profileForm = useForm<ProfileFormData>({
  defaultValues: { monthly_expense: 0, ... },
  resolver: zodResolver(profileSchema),
});

const investmentForm = useForm<InvestmentFormData>({
  defaultValues: { type: "etf", amount: 0, ... },
  resolver: zodResolver(investmentSchema),
});

// Przełączanie między formularzami
const currentForm = state.currentStep === 1 ? profileForm : investmentForm;
```
- Pros: Separacja concerns, łatwe zarządzanie
- Cons: Trzeba zarządzać dwoma formularzami

**Opcja B: Jeden useForm z conditional fields**
```typescript
const form = useForm<OnboardingFormData>({
  defaultValues: {
    profile: { monthly_expense: 0, ... },
    investment: { type: "etf", amount: 0, ... },
  },
});
```
- Pros: Jeden formularz, łatwe zarządzanie
- Cons: Złożona struktura danych

**Opcja C: useFormContext dla każdego kroku**
```typescript
<FormProvider {...profileForm}>
  <ProfileStep />
</FormProvider>
```
- Pros: Czytelna struktura, łatwe przekazywanie context
- Cons: Wymaga FormProvider wrapper

**Rekomendacja:** Opcja A - dwa osobne useForm, łatwiejsze w zarządzaniu i testowaniu

### 2. Analiza Wywołań API

**Obecne wzorce:**
- `AuthService` - już wyodrębniony ✅
- `RegisterService` - już wyodrębniony ✅
- `ForgotPasswordService` - już wyodrębniony ✅
- `ResetPasswordService` - już wyodrębniony ✅
- `useOnboardingApi` - hook z API calls ✅
- `EditInvestmentModal` - bezpośrednie wywołania fetch ❌

**Rekomendacje:**
- Utworzyć `InvestmentService` dla EditInvestmentModal
- Wszystkie API calls powinny być w service layer
- React Hook Form będzie tylko zarządzał stanem formularza, nie API calls

### 3. Analiza Walidacji

**Obecne wzorce:**
- `useOnboardingForm` - funkcje walidacji dla Profile i Investment
- `useAuthForm` - funkcje walidacji dla email, password, confirmPassword
- Ręczna walidacja w EditInvestmentModal

**Rekomendacje:**
- Migracja do Zod schemas
- Wszystkie schematy w `src/lib/validators/`
- Reużywalne schematy dla wspólnych pól (email, password)

</refactoring_breakdown>

---

## 1. Analiza Obecnych Komponentów

### 1.1 Lista Komponentów i Funkcjonalności

| Komponent | LOC | Główne Funkcjonalności | Formularz? |
|-----------|-----|------------------------|------------|
| **LoginForm** | 156 | Logowanie użytkownika, walidacja email/password, rate limiting | ✅ |
| **RegisterForm** | 179 | Rejestracja użytkownika, walidacja email/password/confirmPassword | ✅ |
| **ForgotPasswordForm** | 136 | Reset hasła - wysłanie emaila, walidacja email | ✅ |
| **ResetPasswordForm** | 155 | Reset hasła - nowe hasło, walidacja password/confirmPassword, token validation | ✅ |
| **ProfileForm** | 207 | Formularz profilu finansowego, walidacja pól numerycznych i daty | ✅ |
| **InvestmentForm** | 151 | Formularz inwestycji, walidacja różnych typów pól (select, number, date, textarea) | ✅ |
| **OnboardingContainer** | 388 | Kontener zarządzający dwoma formularzami (Profile + Investment), nawigacja między krokami | ✅ |
| **EditInvestmentModal** | 266 | Edycja inwestycji, wykrywanie zmian, partial updates | ✅ |

### 1.2 Identyfikacja Logiki Formularzy

**Wspólne wzorce:**
1. **Walidacja** - ręczna przez funkcje validators
2. **Zarządzanie stanem** - useState dla każdego pola lub useAuthForm
3. **Obsługa błędów** - ręczne mapowanie błędów do pól
4. **Konwersja wartości** - ręczna konwersja string -> number dla pól numerycznych
5. **Wykrywanie zmian** - ręczne porównywanie wartości (EditInvestmentModal)

**Obszary wysokiej złożoności:**
- `OnboardingContainer` - zarządzanie dwoma formularzami, złożona logika przejść
- `EditInvestmentModal` - ręczne wykrywanie zmian, partial updates
- `ProfileForm` / `InvestmentForm` - ręczna konwersja typów dla każdego pola

### 1.3 Lokalizacja Wywołań API

**Service Layer (już wyodrębnione):**
- `AuthService.signIn()` - LoginForm
- `RegisterService.register()` - RegisterForm
- `ForgotPasswordService.sendResetEmail()` - ForgotPasswordForm
- `ResetPasswordService.resetPassword()` - ResetPasswordForm

**Hooki (już wyodrębnione):**
- `useOnboardingApi` - OnboardingContainer (createProfile, createInvestment, updateProfile, getProfile, hasInvestments)

**Bezpośrednie wywołania (wymagają refaktoryzacji):**
- `EditInvestmentModal` - linie 168-194: bezpośrednie wywołanie `fetch('/api/v1/investments/${id}')`

---

## 2. Plan Refaktoryzacji

### 2.1 Zmiany Struktury Komponentów

#### 2.1.1 Instalacja Zależności

```bash
npm install react-hook-form @hookform/resolvers zod
```

**Uzasadnienie:**
- `react-hook-form` - zarządzanie stanem formularzy, minimalizacja re-renderów
- `@hookform/resolvers` - integracja Zod z React Hook Form
- `zod` - type-safe walidacja, kompatybilna z TypeScript 5

#### 2.1.2 Nowa Struktura Plików

```
src/
├── lib/
│   ├── validators/
│   │   ├── auth.schemas.ts          # Zod schemas dla auth formularzy
│   │   ├── profile.schema.ts        # Zod schema dla ProfileForm
│   │   ├── investment.schema.ts    # Zod schema dla InvestmentForm
│   │   └── common.schemas.ts        # Wspólne schematy (email, password)
│   ├── hooks/
│   │   ├── useAuthFormWithRHF.ts    # Wrapper hook łączący RHF z rate limiting
│   │   └── useOnboardingFormWithRHF.ts  # Wrapper dla onboarding
│   └── services/
│       └── investment.service.ts    # NOWY - dla EditInvestmentModal
└── components/
    ├── forms/                       # NOWY - wspólne komponenty formularzy
    │   ├── FormFieldWithRHF.tsx    # Wrapper FormField dla RHF
    │   └── FormErrorDisplay.tsx    # Wspólny komponent błędów
    └── [existing components - zrefaktoryzowane]
```

### 2.2 Implementacja React Hook Form

#### 2.2.1 Utworzenie Zod Schemas

**Plik: `src/lib/validators/common.schemas.ts`**
```typescript
import { z } from "zod";

export const emailSchema = z.string().trim().min(1, "Pole e-mail jest wymagane").email("Nieprawidłowy format adresu e-mail");

export const passwordSchema = (minLength: number = 6) => 
  z.string().min(1, "Pole hasła jest wymagane").min(minLength, `Hasło musi mieć minimum ${minLength} znaków`);

export const confirmPasswordSchema = (passwordField: string = "password") =>
  z.string().min(1, "Pole potwierdzenia hasła jest wymagane").refine(
    (val, ctx) => val === ctx.parent[passwordField],
    { message: "Hasła nie są identyczne", path: ["confirmPassword"] }
  );
```

**Plik: `src/lib/validators/auth.schemas.ts`**
```typescript
import { z } from "zod";
import { emailSchema, passwordSchema } from "./common.schemas";

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Pole hasła jest wymagane"),
});

export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema(6),
  confirmPassword: z.string().min(1, "Pole potwierdzenia hasła jest wymagane"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Hasła nie są identyczne",
  path: ["confirmPassword"],
});

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z.object({
  password: passwordSchema(6),
  confirmPassword: z.string().min(1, "Pole potwierdzenia hasła jest wymagane"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Hasła nie są identyczne",
  path: ["confirmPassword"],
});
```

**Plik: `src/lib/validators/profile.schema.ts`**
```typescript
import { z } from "zod";

const today = new Date();
today.setHours(0, 0, 0, 0);
const maxAge = new Date();
maxAge.setFullYear(today.getFullYear() - 120);
maxAge.setHours(0, 0, 0, 0);

export const profileSchema = z.object({
  monthly_expense: z.number({
    required_error: "Miesięczne wydatki są wymagane",
    invalid_type_error: "Miesięczne wydatki muszą być liczbą",
  }).min(0, "Miesięczne wydatki muszą być >= 0").finite("Miesięczne wydatki muszą być skończoną liczbą"),
  
  withdrawal_rate_pct: z.number({
    required_error: "Stopa wypłat jest wymagana",
    invalid_type_error: "Stopa wypłat musi być liczbą",
  }).min(0, "Stopa wypłat musi być >= 0").max(100, "Stopa wypłat musi być <= 100").finite(),
  
  expected_return_pct: z.number({
    required_error: "Oczekiwany zwrot jest wymagany",
    invalid_type_error: "Oczekiwany zwrot musi być liczbą",
  }).min(-100, "Oczekiwany zwrot musi być >= -100").max(1000, "Oczekiwany zwrot musi być <= 1000").finite(),
  
  birth_date: z.string().optional().refine(
    (date) => {
      if (!date) return true;
      const d = new Date(date);
      d.setHours(0, 0, 0, 0);
      return d < today && d >= maxAge;
    },
    {
      message: "Data urodzenia musi być w przeszłości i nie starsza niż 120 lat",
    }
  ),
});
```

**Plik: `src/lib/validators/investment.schema.ts`**
```typescript
import { z } from "zod";

const today = new Date();
today.setHours(0, 0, 0, 0);

export const assetTypeEnum = z.enum(["etf", "bond", "stock", "cash"]);

export const investmentSchema = z.object({
  type: assetTypeEnum,
  amount: z.number({
    required_error: "Kwota jest wymagana",
    invalid_type_error: "Kwota musi być liczbą",
  }).positive("Kwota musi być większa od 0").max(999999999999.99, "Kwota musi być mniejsza niż 999999999999.99").finite(),
  
  acquired_at: z.string().min(1, "Data nabycia jest wymagana").refine(
    (date) => {
      const d = new Date(date);
      d.setHours(0, 0, 0, 0);
      return d <= today;
    },
    { message: "Data nabycia nie może być w przyszłości" }
  ),
  
  notes: z.string().max(1000, "Notatki nie mogą przekraczać 1000 znaków").optional().nullable(),
});
```

#### 2.2.2 Wrapper Hook dla Auth Formularzy

**Plik: `src/lib/hooks/useAuthFormWithRHF.ts`**
```typescript
import { useForm, UseFormReturn } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRateLimiter } from "./useRateLimiter";
import type { z } from "zod";

export interface UseAuthFormWithRHFOptions<T extends z.ZodType> {
  schema: T;
  defaultValues: z.infer<T>;
  rateLimitCooldownMs?: number;
  onSubmit: (data: z.infer<T>) => Promise<void>;
}

export function useAuthFormWithRHF<T extends z.ZodType>(
  options: UseAuthFormWithRHFOptions<T>
) {
  const { schema, defaultValues, rateLimitCooldownMs = 60000, onSubmit } = options;
  const rateLimiter = useRateLimiter({ cooldownMs: rateLimitCooldownMs });
  
  const form = useForm<z.infer<T>>({
    resolver: zodResolver(schema),
    defaultValues,
    mode: "onBlur", // Walidacja przy blur
  });

  const handleSubmit = form.handleSubmit(async (data) => {
    if (rateLimiter.isRateLimited) {
      return;
    }
    
    try {
      await onSubmit(data);
    } catch (error) {
      // Error handling - można rozszerzyć
      console.error("Form submission error:", error);
    }
  });

  return {
    form,
    handleSubmit,
    rateLimiter,
    isSubmitting: form.formState.isSubmitting,
    errors: form.formState.errors,
  };
}
```

#### 2.2.3 Wrapper Komponentu FormField dla RHF

**Plik: `src/components/forms/FormFieldWithRHF.tsx`**
```typescript
import { Controller, useFormContext } from "react-hook-form";
import { FormField } from "@/components/FormField";
import type { ComponentProps } from "react";

interface FormFieldWithRHFProps {
  name: string;
  label: string;
  required?: boolean;
  helperText?: string;
  children: (field: { value: unknown; onChange: (value: unknown) => void; onBlur: () => void }) => React.ReactNode;
}

export function FormFieldWithRHF({ name, label, required, helperText, children }: FormFieldWithRHFProps) {
  const { control, formState: { errors } } = useFormContext();
  
  return (
    <Controller
      name={name}
      control={control}
      render={({ field }) => (
        <FormField
          label={label}
          name={name}
          required={required}
          error={errors[name]?.message as string}
          helperText={helperText}
        >
          {children({
            value: field.value,
            onChange: field.onChange,
            onBlur: field.onBlur,
          })}
        </FormField>
      )}
    />
  );
}
```

### 2.3 Optymalizacja Logiki Komponentów

#### 2.3.1 LoginForm z React Hook Form

**Przed (156 LOC):**
- Ręczne zarządzanie stanem przez useAuthForm
- Ręczna walidacja przez validateAll()
- Ręczne bindingi do pól

**Po (szacunkowo ~80 LOC):**
```typescript
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema } from "@/lib/validators/auth.schemas";
import { useRateLimiter } from "@/lib/hooks/useRateLimiter";
import { authService } from "@/lib/services/auth.service";

export default function LoginForm() {
  const rateLimiter = useRateLimiter({ cooldownMs: 60000 });
  
  const form = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
    mode: "onBlur",
  });

  const onSubmit = form.handleSubmit(async (data) => {
    if (rateLimiter.isRateLimited) return;
    
    form.setError("root", {}); // Clear previous errors
    
    const result = await authService.signIn(data.email, data.password);
    
    if (!result.success) {
      form.setError("root", { message: result.error?.message });
      if (result.error?.isRateLimited) {
        rateLimiter.startCooldown();
      }
      return;
    }

    const profileResult = await authService.checkProfileAndRedirect(result.authToken);
    if (profileResult.shouldRedirectToDashboard) {
      window.location.replace("/dashboard");
    } else if (profileResult.shouldRedirectToOnboarding) {
      window.location.replace("/onboarding");
    }
  });

  return (
    <FormProvider {...form}>
      <form onSubmit={onSubmit} className="space-y-6">
        <FormFieldWithRHF name="email" label="E-mail" required>
          {({ field }) => (
            <EmailField
              {...field}
              error={form.formState.errors.email?.message}
              disabled={form.formState.isSubmitting}
            />
          )}
        </FormFieldWithRHF>
        
        <FormFieldWithRHF name="password" label="Hasło" required>
          {({ field }) => (
            <PasswordField
              {...field}
              error={form.formState.errors.password?.message}
              disabled={form.formState.isSubmitting}
            />
          )}
        </FormFieldWithRHF>
        
        {/* Error display, button, etc. */}
      </form>
    </FormProvider>
  );
}
```

**Korzyści:**
- Redukcja z ~156 do ~80 LOC (-49%)
- Automatyczna walidacja przez Zod
- Mniej re-renderów (React Hook Form optymalizuje)
- Type-safe przez Zod inference

#### 2.3.2 RegisterForm z React Hook Form

**Kluczowe zmiany:**
- Użycie `registerSchema` z refine dla confirmPassword
- Automatyczna re-walidacja confirmPassword przy zmianie password
- Uproszczenie logiki success state

#### 2.3.3 ProfileForm i InvestmentForm z React Hook Form

**Kluczowe zmiany:**
- Użycie `valueAsNumber` dla pól numerycznych
- Controller dla Select (Shadcn/ui)
- Automatyczna konwersja typów przez React Hook Form

#### 2.3.4 EditInvestmentModal z React Hook Form

**Kluczowe zmiany:**
- Użycie `formState.isDirty` i `dirtyFields` do wykrywania zmian
- Automatyczne budowanie `UpdateInvestmentCommand` z dirtyFields
- Eliminacja ręcznego porównywania wartości

```typescript
const form = useForm<InvestmentFormData>({
  resolver: zodResolver(investmentSchema),
  defaultValues: investment || defaultInvestment,
  mode: "onChange", // Dla wykrywania zmian
});

const onSubmit = form.handleSubmit(async (data) => {
  const { isDirty, dirtyFields } = form.formState;
  
  if (!isDirty) {
    form.setError("root", { message: "Nie wprowadzono żadnych zmian" });
    return;
  }

  // Automatyczne budowanie updateCommand z dirtyFields
  const updateCommand: UpdateInvestmentCommand = {};
  Object.keys(dirtyFields).forEach((field) => {
    updateCommand[field] = data[field];
  });

  await investmentService.update(investment.id, updateCommand);
  onSuccess();
});
```

#### 2.3.5 OnboardingContainer z React Hook Form

**Kluczowe zmiany:**
- Dwa osobne `useForm` - jeden dla ProfileForm, jeden dla InvestmentForm
- Użycie `trigger()` do walidacji przed przejściem do następnego kroku
- Uproszczenie logiki przejść między krokami

```typescript
const profileForm = useForm<ProfileFormData>({
  resolver: zodResolver(profileSchema),
  defaultValues: { monthly_expense: 0, withdrawal_rate_pct: 4, expected_return_pct: 7 },
});

const investmentForm = useForm<InvestmentFormData>({
  resolver: zodResolver(investmentSchema),
  defaultValues: { type: "etf", amount: 0, acquired_at: new Date().toISOString().split("T")[0] },
});

const handleNext = async () => {
  if (currentStep === 1) {
    const isValid = await profileForm.trigger();
    if (!isValid) return;
    
    const profileData = profileForm.getValues();
    await createProfile(profileData);
    setCurrentStep(2);
  } else {
    const isValid = await investmentForm.trigger();
    if (!isValid) return;
    
    const investmentData = investmentForm.getValues();
    await createInvestment(investmentData);
    window.location.href = "/dashboard";
  }
};
```

### 2.4 Zarządzanie Wywołaniami API

#### 2.4.1 Utworzenie InvestmentService

**Plik: `src/lib/services/investment.service.ts`** (rozszerzenie istniejącego)
```typescript
export class InvestmentService {
  async update(id: string, data: UpdateInvestmentCommand): Promise<InvestmentDto> {
    const authToken = await getAuthToken();
    if (!authToken) {
      throw new Error("Brak sesji");
    }

    const response = await fetch(`/api/v1/investments/${id}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error: ApiError = await response.json();
      throw error;
    }

    return response.json();
  }
}
```

#### 2.4.2 Best Practices dla API Calls

1. **Wszystkie API calls w Service Layer**
   - Separacja logiki biznesowej od UI
   - Łatwiejsze testowanie (mockowanie services)
   - Reużywalność

2. **React Hook Form tylko dla stanu formularza**
   - `onSubmit` handler wywołuje service
   - Service zwraca wynik (success/error)
   - Form obsługuje tylko UI state (loading, errors)

3. **Error Handling**
   - Service rzuca ApiError
   - Form mapuje ApiError na formState.errors
   - GlobalErrorBanner obsługuje globalne błędy (401/403/5xx)

### 2.5 Strategia Testowania

#### 2.5.1 Unit Tests dla Zod Schemas

**Plik: `src/lib/validators/auth.schemas.test.ts`**
```typescript
import { describe, it, expect } from "vitest";
import { loginSchema, registerSchema } from "./auth.schemas";

describe("auth.schemas", () => {
  describe("loginSchema", () => {
    it("should validate valid login data", () => {
      const result = loginSchema.safeParse({
        email: "test@example.com",
        password: "password123",
      });
      expect(result.success).toBe(true);
    });

    it("should reject invalid email", () => {
      const result = loginSchema.safeParse({
        email: "invalid-email",
        password: "password123",
      });
      expect(result.success).toBe(false);
    });
  });

  describe("registerSchema", () => {
    it("should validate matching passwords", () => {
      const result = registerSchema.safeParse({
        email: "test@example.com",
        password: "password123",
        confirmPassword: "password123",
      });
      expect(result.success).toBe(true);
    });

    it("should reject non-matching passwords", () => {
      const result = registerSchema.safeParse({
        email: "test@example.com",
        password: "password123",
        confirmPassword: "different",
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toContain("confirmPassword");
      }
    });
  });
});
```

#### 2.5.2 Integration Tests dla Komponentów

**Plik: `src/components/LoginForm.test.tsx`**
```typescript
import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import LoginForm from "./LoginForm";
import { authService } from "@/lib/services/auth.service";

vi.mock("@/lib/services/auth.service");

describe("LoginForm", () => {
  it("should validate email on blur", async () => {
    render(<LoginForm />);
    const emailInput = screen.getByLabelText(/e-mail/i);
    
    await userEvent.type(emailInput, "invalid-email");
    await userEvent.tab(); // Blur
    
    await waitFor(() => {
      expect(screen.getByText(/nieprawidłowy format/i)).toBeInTheDocument();
    });
  });

  it("should submit form with valid data", async () => {
    vi.mocked(authService.signIn).mockResolvedValue({
      success: true,
      authToken: "token123",
    });
    
    render(<LoginForm />);
    
    await userEvent.type(screen.getByLabelText(/e-mail/i), "test@example.com");
    await userEvent.type(screen.getByLabelText(/hasło/i), "password123");
    await userEvent.click(screen.getByRole("button", { name: /zaloguj/i }));
    
    await waitFor(() => {
      expect(authService.signIn).toHaveBeenCalledWith("test@example.com", "password123");
    });
  });
});
```

#### 2.5.3 Edge Cases do Przetestowania

1. **Rate Limiting**
   - Sprawdzenie czy rate limiter blokuje submit
   - Sprawdzenie countdown display

2. **Network Errors**
   - Timeout handling
   - Failed fetch handling
   - Offline handling

3. **Validation Edge Cases**
   - Puste pola
   - Nieprawidłowe formaty
   - Boundary values (min/max)
   - Special characters

4. **Form State Management**
   - Reset formularza
   - Pre-fill z istniejących danych (EditInvestmentModal)
   - Dirty state detection

5. **Multi-step Forms (OnboardingContainer)**
   - Przejścia między krokami
   - Walidacja przed przejściem
   - Zachowanie danych przy powrocie do poprzedniego kroku

---

## 3. Szczegółowy Plan Implementacji

### Faza 1: Przygotowanie Infrastruktury (1-2 dni)

1. **Instalacja zależności**
   ```bash
   npm install react-hook-form @hookform/resolvers zod
   ```

2. **Utworzenie Zod Schemas**
   - `common.schemas.ts` - wspólne schematy
   - `auth.schemas.ts` - schematy dla auth formularzy
   - `profile.schema.ts` - schema dla ProfileForm
   - `investment.schema.ts` - schema dla InvestmentForm

3. **Utworzenie Helper Components**
   - `FormFieldWithRHF.tsx` - wrapper dla FormField
   - `FormErrorDisplay.tsx` - wspólny komponent błędów

4. **Utworzenie InvestmentService**
   - Rozszerzenie istniejącego `investment.service.ts`
   - Metoda `update()` dla EditInvestmentModal

### Faza 2: Refaktoryzacja Prostych Formularzy (2-3 dni)

1. **ForgotPasswordForm** (najprostszy - wzorzec)
   - Integracja z `useForm` + `forgotPasswordSchema`
   - Testy jako wzorzec dla innych

2. **LoginForm**
   - Integracja z `useForm` + `loginSchema`
   - Zachowanie rate limiting
   - Testy

3. **ResetPasswordForm**
   - Integracja z `useForm` + `resetPasswordSchema`
   - Token validation pozostaje w useEffect
   - Testy

4. **RegisterForm**
   - Integracja z `useForm` + `registerSchema` z refine
   - Testy dla confirmPassword validation

### Faza 3: Refaktoryzacja Złożonych Formularzy (3-4 dni)

1. **ProfileForm**
   - Integracja z `useForm` + `profileSchema`
   - `valueAsNumber` dla pól numerycznych
   - Controller dla date input
   - Testy

2. **InvestmentForm**
   - Integracja z `useForm` + `investmentSchema`
   - Controller dla Select
   - `valueAsNumber` dla amount
   - Testy

3. **EditInvestmentModal**
   - Integracja z `useForm` + `investmentSchema`
   - Użycie `isDirty` i `dirtyFields`
   - Integracja z InvestmentService
   - Testy dla wykrywania zmian

### Faza 4: Refaktoryzacja OnboardingContainer (2-3 dni)

1. **Dwa osobne useForm**
   - `profileForm` dla kroku 1
   - `investmentForm` dla kroku 2

2. **Uproszczenie logiki przejść**
   - Użycie `trigger()` do walidacji
   - Użycie `getValues()` do pobrania danych

3. **Testy**
   - Testy przejść między krokami
   - Testy walidacji przed przejściem

### Faza 5: Cleanup i Optymalizacja (1-2 dni)

1. **Usunięcie starych hooków**
   - `useAuthForm` (zastąpione przez RHF)
   - Możliwe uproszczenie `useOnboardingForm` (tylko walidacja -> Zod)

2. **Optymalizacja**
   - Code splitting dla dużych formularzy
   - Memoization gdzie potrzebne

3. **Dokumentacja**
   - Aktualizacja README
   - Przykłady użycia

---

## 4. Metryki Sukcesu

### Przed Refaktoryzacją:
- **LoginForm**: 156 LOC
- **RegisterForm**: 179 LOC
- **ForgotPasswordForm**: 136 LOC
- **ResetPasswordForm**: 155 LOC
- **ProfileForm**: 207 LOC
- **InvestmentForm**: 151 LOC
- **EditInvestmentModal**: 266 LOC
- **OnboardingContainer**: 388 LOC
- **Łącznie**: ~1638 LOC

### Po Refaktoryzacji (szacunki):
- **LoginForm**: ~80 LOC (-49%)
- **RegisterForm**: ~90 LOC (-50%)
- **ForgotPasswordForm**: ~70 LOC (-49%)
- **ResetPasswordForm**: ~80 LOC (-48%)
- **ProfileForm**: ~120 LOC (-42%)
- **InvestmentForm**: ~90 LOC (-40%)
- **EditInvestmentModal**: ~150 LOC (-44%)
- **OnboardingContainer**: ~250 LOC (-36%)
- **Łącznie**: ~930 LOC (-43%)

### Dodatkowe Korzyści:
- **Type Safety**: 100% type coverage przez Zod
- **Performance**: Mniej re-renderów przez React Hook Form
- **Maintainability**: Centralizacja walidacji w Zod schemas
- **Testability**: Łatwiejsze testowanie przez separację concerns

---

## 5. Potencjalne Problemy i Rozwiązania

### Problem 1: Shadcn/ui Select nie jest natywnym inputem
**Rozwiązanie:** Użycie Controller z custom render function

### Problem 2: Konwersja string -> number dla pól numerycznych
**Rozwiązanie:** `valueAsNumber` w register() lub custom transform w Controller

### Problem 3: Wykrywanie zmian w EditInvestmentModal
**Rozwiązanie:** `formState.isDirty` i `dirtyFields` - automatyczne przez RHF

### Problem 4: Multi-step form (OnboardingContainer)
**Rozwiązanie:** Dwa osobne useForm z przełączaniem między nimi

### Problem 5: Rate Limiting
**Rozwiązanie:** Integracja `useRateLimiter` z `onSubmit` handler

---

## 6. Timeline

- **Tydzień 1**: Faza 1-2 (Infrastruktura + Proste formularze)
- **Tydzień 2**: Faza 3-4 (Złożone formularze + OnboardingContainer)
- **Tydzień 3**: Faza 5 (Cleanup + Testy + Dokumentacja)

**Łączny czas**: ~3 tygodnie (przy pracy part-time)

---

## 7. Priorytetyzacja

### Wysoki Priorytet (duplikacja, wysokie ryzyko błędów):
1. LoginForm + RegisterForm (najczęściej używane)
2. EditInvestmentModal (złożona logika wykrywania zmian)

### Średni Priorytet (złożoność, maintainability):
3. ProfileForm + InvestmentForm (reużywalne komponenty)
4. OnboardingContainer (złożony, ale mniej krytyczny)

### Niski Priorytet (nice to have):
5. ForgotPasswordForm + ResetPasswordForm (proste, rzadko używane)

