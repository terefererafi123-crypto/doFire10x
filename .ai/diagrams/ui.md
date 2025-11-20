# Diagram Architektury UI - Moduł Logowania i Rejestracji

<architecture_analysis>

## Analiza komponentów

### Obecne komponenty (przed wdrożeniem US-007):

1. **Strony Astro:**
   - `login.astro` - Strona logowania (obecnie magic link)
   - `dashboard.astro` - Dashboard użytkownika
   - `onboarding.astro` - Proces onboardingu
   - `index.astro` - Strona główna

2. **Komponenty React:**
   - `LoginForm.tsx` - Formularz logowania (magic link/OTP)
   - `EmailField.tsx` - Pole email z walidacją
   - `ErrorMessage.tsx` - Komponent wyświetlania błędów
   - `FormField.tsx` - Uniwersalne pole formularza
   - `FormErrorSummary.tsx` - Podsumowanie błędów formularza
   - `TopNav.tsx` - Nawigacja górna z przyciskiem wylogowania

3. **Layouts:**
   - `Layout.astro` - Podstawowy layout HTML
   - `AppLayout.astro` - Layout z nawigacją dla zalogowanych użytkowników

4. **Pomocnicze:**
   - `client-helpers.ts` - Funkcje pomocnicze do autoryzacji (getAuthToken)
   - `supabase.client.ts` - Klient Supabase

### Komponenty wymagane po wdrożeniu US-007:

1. **Nowe strony Astro:**
   - `register.astro` - Strona rejestracji
   - `reset-password.astro` - Strona resetowania hasła

2. **Nowe komponenty React:**
   - `RegisterForm.tsx` - Formularz rejestracji (email, hasło, potwierdzenie hasła)
   - `PasswordField.tsx` - Pole hasła z walidacją
   - `ResetPasswordForm.tsx` - Formularz resetowania hasła
   - Zaktualizowany `LoginForm.tsx` - Zmiana z magic link na logowanie z hasłem

3. **Aktualizacje istniejących:**
   - `TopNav.tsx` - Dodanie przycisku logowania dla niezalogowanych użytkowników
   - `login.astro` - Aktualizacja do logowania z hasłem

## Przepływ danych:

1. **Rejestracja:**
   - Użytkownik → `register.astro` → `RegisterForm` → Supabase Auth → Przekierowanie do logowania

2. **Logowanie:**
   - Użytkownik → `login.astro` → `LoginForm` → Supabase Auth → Sprawdzenie profilu → Dashboard/Onboarding

3. **Reset hasła:**
   - Użytkownik → `reset-password.astro` → `ResetPasswordForm` → Supabase Auth → Przekierowanie do logowania

4. **Wylogowanie:**
   - Użytkownik → `TopNav` → Supabase Auth → Przekierowanie do logowania

## Funkcjonalność komponentów:

- **LoginForm**: Walidacja email i hasła, obsługa błędów autoryzacji, przekierowania
- **RegisterForm**: Walidacja email, hasła i potwierdzenia hasła, tworzenie konta
- **ResetPasswordForm**: Wysyłanie linku resetującego hasło
- **EmailField**: Walidacja formatu email, obsługa błędów
- **PasswordField**: Walidacja siły hasła, ukrywanie/pokazywanie hasła
- **FormField**: Uniwersalne pole z etykietą, błędami i helper text
- **ErrorMessage**: Wyświetlanie komunikatów błędów (inline/banner)
- **FormErrorSummary**: Podsumowanie wszystkich błędów formularza
- **TopNav**: Nawigacja, przycisk logowania/wylogowania w zależności od stanu sesji

</architecture_analysis>

<mermaid_diagram>

```mermaid
flowchart TD
    Start([Użytkownik]) --> Layout[Layout.astro]

    subgraph "Strony Autentykacji"
        LoginPage[login.astro]
        RegisterPage[register.astro]
        ResetPage[reset-password.astro]
    end

    subgraph "Layouty"
        Layout --> AppLayout[AppLayout.astro]
        Layout --> LoginPage
        Layout --> RegisterPage
        Layout --> ResetPage
    end

    subgraph "Komponenty Formularzy Autentykacji"
        LoginForm[LoginForm.tsx]
        RegisterForm[RegisterForm.tsx]
        ResetForm[ResetPasswordForm.tsx]
    end

    subgraph "Komponenty Pól Formularzy"
        EmailField[EmailField.tsx]
        PasswordField[PasswordField.tsx]
        FormField[FormField.tsx]
    end

    subgraph "Komponenty Obsługi Błędów"
        ErrorMessage[ErrorMessage.tsx]
        FormErrorSummary[FormErrorSummary.tsx]
    end

    subgraph "Komponenty UI"
        Button[Button - shadcn/ui]
        Input[Input - shadcn/ui]
        Alert[Alert - shadcn/ui]
    end

    subgraph "Komponenty Nawigacji"
        TopNav[TopNav.tsx]
    end

    subgraph "Warstwa Autentykacji"
        SupabaseClient[supabase.client.ts]
        AuthHelpers[client-helpers.ts]
    end

    subgraph "Backend Supabase"
        SupabaseAuth[Supabase Auth API]
        SupabaseDB[Supabase Database]
    end

    LoginPage --> LoginForm
    RegisterPage --> RegisterForm
    ResetPage --> ResetForm

    LoginForm --> EmailField
    LoginForm --> PasswordField
    LoginForm --> ErrorMessage
    LoginForm --> FormErrorSummary
    LoginForm --> Button

    RegisterForm --> EmailField
    RegisterForm --> PasswordField
    RegisterForm --> ErrorMessage
    RegisterForm --> FormErrorSummary
    RegisterForm --> Button

    ResetForm --> EmailField
    ResetForm --> ErrorMessage
    ResetForm --> Button

    EmailField --> Input
    PasswordField --> Input
    FormField --> Input
    FormField --> ErrorMessage
    FormErrorSummary --> Alert

    AppLayout --> TopNav
    TopNav --> Button

    LoginForm -.->|Walidacja| AuthHelpers
    RegisterForm -.->|Walidacja| AuthHelpers
    ResetForm -.->|Walidacja| AuthHelpers

    LoginForm -->|signInWithPassword| SupabaseClient
    RegisterForm -->|signUp| SupabaseClient
    ResetForm -->|resetPasswordForEmail| SupabaseClient
    TopNav -->|signOut| SupabaseClient

    SupabaseClient -->|API Calls| SupabaseAuth
    SupabaseAuth -->|Session Management| SupabaseDB

    LoginForm -.->|Sukces| Dashboard[dashboard.astro]
    LoginForm -.->|Brak profilu| Onboarding[onboarding.astro]
    RegisterForm -.->|Sukces| LoginPage
    ResetForm -.->|Sukces| LoginPage
    TopNav -.->|Wylogowanie| LoginPage

    classDef pageClass fill:#e1f5ff,stroke:#01579b,stroke-width:2px
    classDef componentClass fill:#f3e5f5,stroke:#4a148c,stroke-width:2px
    classDef formClass fill:#fff3e0,stroke:#e65100,stroke-width:2px
    classDef authClass fill:#e8f5e9,stroke:#1b5e20,stroke-width:2px
    classDef backendClass fill:#fce4ec,stroke:#880e4f,stroke-width:2px

    class LoginPage,RegisterPage,ResetPage,Dashboard,Onboarding pageClass
    class EmailField,PasswordField,FormField,ErrorMessage,FormErrorSummary,TopNav componentClass
    class LoginForm,RegisterForm,ResetForm formClass
    class SupabaseClient,AuthHelpers authClass
    class SupabaseAuth,SupabaseDB backendClass
```

</mermaid_diagram>
