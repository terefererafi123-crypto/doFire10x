# Struktura komponentów i zależności

Dokumentacja przedstawiająca strukturę komponentów React i ich zależności w projekcie DoFIRE.

## 1. DASHBOARD - Start: `DashboardContent.tsx`

```
DashboardContent.tsx
│
├── DashboardErrorBoundary (class component)
│   └── DashboardContentInner
│       │
│       ├── useDashboard (hook)
│       │   ├── getAuthToken (from @/lib/auth/client-helpers)
│       │   ├── useGlobalError (from @/lib/contexts/GlobalErrorContext)
│       │   └── shouldHandleGlobally (from @/lib/utils/api-error-handler)
│       │
│       ├── DashboardHeader
│       │   └── (no dependencies - pure component)
│       │
│       ├── Alert (from @/components/ui/alert)
│       │   └── AlertDescription
│       │
│       ├── LoadingSkeleton
│       │   ├── Skeleton (from @/components/ui/skeleton)
│       │   └── Card (from @/components/ui/card)
│       │
│       └── DashboardGrid
│           │
│           ├── MetricsPanel
│           │   ├── FireTargetCard
│           │   │   ├── Card (from @/components/ui/card)
│           │   │   └── formatCurrency (from @/lib/utils/formatting)
│           │   │
│           │   ├── FireAgeCard
│           │   │   ├── Card (from @/components/ui/card)
│           │   │   └── formatYearsAndMonths (from @/lib/utils/formatting)
│           │   │
│           │   ├── FireProgressCard
│           │   │   ├── Card (from @/components/ui/card)
│           │   │   ├── Progress (from @/components/ui/progress)
│           │   │   └── formatPercent (from @/lib/utils/formatting)
│           │   │
│           │   └── EmptyState
│           │       ├── Card (from @/components/ui/card)
│           │       └── Button (from @/components/ui/button)
│           │
│           ├── RecalculateButton
│           │   └── Button (from @/components/ui/button)
│           │
│           ├── AIHintAlert
│           │   └── Alert (from @/components/ui/alert)
│           │
│           └── PortfolioSummaryList
│               ├── Card (from @/components/ui/card)
│               └── formatPercent (from @/lib/utils/formatting)
│
└── UI Components (shared)
    ├── alert.tsx
    │   └── cn (from @/lib/utils)
    │
    ├── button.tsx
    │   └── cn (from @/lib/utils)
    │
    ├── card.tsx
    │   └── cn (from @/lib/utils)
    │
    ├── progress.tsx
    │   └── cn (from @/lib/utils)
    │
    └── skeleton.tsx
        └── cn (from @/lib/utils)
```

## 2. ONBOARDING - Start: `OnboardingContainer.tsx`

```
OnboardingContainer.tsx
│
├── Stepper
│   ├── Progress (from @/components/ui/progress)
│   └── cn (from @/lib/utils)
│
├── ProfileForm
│   ├── Input (from @/components/ui/input)
│   └── cn (from @/lib/utils)
│
├── InvestmentForm
│   ├── Input (from @/components/ui/input)
│   ├── Textarea (from @/components/ui/textarea)
│   ├── Select (from @/components/ui/select)
│   │   ├── SelectPrimitive (from @radix-ui/react-select)
│   │   └── cn (from @/lib/utils)
│   │
│   ├── FormField
│   │   ├── ErrorMessage
│   │   │   ├── AlertCircle (from lucide-react)
│   │   │   └── cn (from @/lib/utils)
│   │   └── cn (from @/lib/utils)
│   │
│   └── FormErrorSummary
│       ├── Alert (from @/components/ui/alert)
│       ├── AlertCircle (from lucide-react)
│       └── cn (from @/lib/utils)
│
├── NavigationButtons
│   └── Button (from @/components/ui/button)
│
├── Alert (from @/components/ui/alert)
│   └── AlertDescription
│
├── Card (from @/components/ui/card)
│   ├── CardContent
│   ├── CardHeader
│   └── CardTitle
│
├── useOnboardingForm (hook)
│   └── (validation logic)
│
├── useOnboardingApi (hook)
│   ├── getAuthToken (from @/lib/auth/client-helpers)
│   └── (API calls)
│
└── useApiErrorHandler (hook)
    └── investmentErrorMessages (from @/lib/utils/error-mapper)
```

## 3. INNE GŁÓWNE KOMPONENTY

```
LoginForm.tsx
├── Button (from @/components/ui/button)
├── EmailField
│   ├── Input (from @/components/ui/input)
│   └── cn (from @/lib/utils)
└── PasswordField
    ├── Input (from @/components/ui/input)
    ├── Button (from @/components/ui/button)
    ├── Eye, EyeOff (from lucide-react)
    └── cn (from @/lib/utils)

RegisterForm.tsx
├── Button (from @/components/ui/button)
├── EmailField
└── PasswordField

InvestmentsList.tsx
├── Card (from @/components/ui/card)
├── Button (from @/components/ui/button)
├── Alert (from @/components/ui/alert)
├── EditInvestmentModal
│   ├── Dialog (from @/components/ui/dialog)
│   │   └── DialogPrimitive (from @radix-ui/react-dialog)
│   ├── Button (from @/components/ui/button)
│   ├── InvestmentForm (reused from onboarding)
│   └── Loader2 (from lucide-react)
└── getAuthToken (from @/lib/auth/client-helpers)

TopNav.tsx
├── Button (from @/components/ui/button)
├── supabaseClient (from @/db/supabase.client)
└── getAuthToken (from @/lib/auth/client-helpers)

GlobalErrorProviderWrapper.tsx
├── GlobalErrorProvider (from @/lib/contexts/GlobalErrorContext)
└── GlobalErrorBannerWrapper
    ├── GlobalErrorBanner
    │   ├── Button (from @/components/ui/button)
    │   ├── ErrorMessage
    │   ├── X, AlertCircle, AlertTriangle (from lucide-react)
    │   └── cn (from @/lib/utils)
    └── useGlobalError (from @/lib/contexts/GlobalErrorContext)
```

## 4. WARSTWA UI (Shadcn/UI)

```
ui/
├── button.tsx → cn (@/lib/utils)
├── input.tsx → cn (@/lib/utils)
├── textarea.tsx → cn (@/lib/utils)
├── select.tsx
│   ├── SelectPrimitive (@radix-ui/react-select)
│   └── cn (@/lib/utils)
├── card.tsx → cn (@/lib/utils)
├── alert.tsx → cn (@/lib/utils)
├── progress.tsx → cn (@/lib/utils)
├── skeleton.tsx → cn (@/lib/utils)
├── dialog.tsx
│   ├── DialogPrimitive (@radix-ui/react-dialog)
│   ├── XIcon (lucide-react)
│   └── cn (@/lib/utils)
└── avatar.tsx
    ├── AvatarPrimitive (@radix-ui/react-avatar)
    └── cn (@/lib/utils)
```

## 5. ZALEŻNOŚCI ZEWNĘTRZNE

```
External Dependencies:
├── @radix-ui/react-dialog
├── @radix-ui/react-select
├── @radix-ui/react-avatar
├── lucide-react (ikony)
└── class-variance-authority (dla alert.tsx)
```

## 6. HOOKI I UTILS

```
lib/hooks/
├── useDashboard.ts
│   ├── getAuthToken
│   ├── useGlobalError
│   └── shouldHandleGlobally
│
├── useOnboardingForm.ts
│   └── (validation logic)
│
├── useOnboardingApi.ts
│   └── getAuthToken
│
└── useApiErrorHandler.ts
    └── error-mapper

lib/utils/
├── formatting.ts
│   ├── formatCurrency
│   ├── formatPercent
│   └── formatYearsAndMonths
│
├── error-mapper.ts
│   ├── mapApiErrorsToFormErrors
│   └── investmentErrorMessages
│
└── api-error-handler.ts
    └── shouldHandleGlobally
```

## 7. KONTEKSTY

```
lib/contexts/
└── GlobalErrorContext.tsx
    ├── GlobalErrorProvider
    └── useGlobalError (hook)
```

## 8. PUNKTY WEJŚCIA (Astro Pages)

```
pages/
├── dashboard.astro
│   └── DashboardContent (client:only="react")
│
├── onboarding.astro
│   └── OnboardingContainer (client:only="react")
│
├── login.astro
│   └── LoginForm (client:only="react")
│
├── register.astro
│   └── RegisterForm (client:only="react")
│
└── investments.astro
    └── InvestmentsList (client:only="react")
```

## Rekomendacje

**Najlepsze punkty startowe do analizy:**

1. `DashboardContent.tsx` - główny komponent dashboardu, pokazuje pełną strukturę
2. `OnboardingContainer.tsx` - główny komponent onboarding, pokazuje formularze i walidację

**Struktura folderów:**

- `src/components/dashboard/` - komponenty dashboardu
- `src/components/onboarding/` - komponenty onboarding
- `src/components/ui/` - komponenty UI (Shadcn)
- `src/components/` - komponenty wspólne (formularze, błędy, itp.)
- `src/lib/hooks/` - custom hooks
- `src/lib/utils/` - funkcje pomocnicze
- `src/lib/contexts/` - konteksty React
