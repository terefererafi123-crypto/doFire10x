import * as React from "react";
import { Button } from "@/components/ui/button";
import { EmailField } from "./EmailField";
import { PasswordField } from "./PasswordField";

interface LoginFormState {
  email: string;
  password: string;
  errors: {
    email?: string;
    password?: string;
    submit?: string;
  };
  isLoading: boolean;
  rateLimitCooldown?: number; // seconds remaining
}

const REQUEST_TIMEOUT_MS = 10000; // 10 seconds
const RATE_LIMIT_COOLDOWN_MS = 60000; // 60 seconds

export default function LoginForm() {
  const [state, setState] = React.useState<LoginFormState>({
    email: "",
    password: "",
    errors: {},
    isLoading: false,
  });
  
  const rateLimitIntervalRef = React.useRef<ReturnType<typeof setInterval> | null>(null);

  // Helper function to check profile and redirect
  const checkProfileAndRedirect = async (authToken: string | null) => {
    console.log("Checking profile with token:", authToken ? "available" : "not available");

    // Check profile (matches diagram auth.md line 208)
    const profileResponse = await fetch("/api/v1/me/profile", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      },
      credentials: "include",
    });

    console.log("Profile response status:", profileResponse.status);

    if (profileResponse.ok) {
      // Profile exists - redirect to dashboard (matches diagram auth.md line 217-218)
      console.log("Profile exists, redirecting to /dashboard");
      window.location.replace("/dashboard");
    } else if (profileResponse.status === 404) {
      // No profile - redirect to onboarding (matches diagram auth.md line 189)
      // This is expected for new users
      console.log("No profile found (expected for new users), redirecting to /onboarding");
      window.location.replace("/onboarding");
    } else if (profileResponse.status === 401 || profileResponse.status === 403) {
      // Auth error - token might not be ready yet, try onboarding anyway
      console.log("Auth error checking profile, redirecting to /onboarding");
      window.location.replace("/onboarding");
    } else {
      // Other error - default to onboarding (will handle error there)
      console.log("Error checking profile (status:", profileResponse.status, "), redirecting to /onboarding");
      window.location.replace("/onboarding");
    }
  };

  // Check for error in query params on mount (from middleware redirect)
  React.useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const error = urlParams.get("error");
    
    if (error === "session_expired") {
      setState((prev) => ({
        ...prev,
        errors: { submit: "Zaloguj ponownie." },
      }));
      
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);
  
  // Cleanup interval on unmount
  React.useEffect(() => {
    return () => {
      if (rateLimitIntervalRef.current) {
        clearInterval(rateLimitIntervalRef.current);
      }
    };
  }, []);

  const validateEmail = (email: string): string | undefined => {
    if (!email.trim()) {
      return "Pole e-mail jest wymagane";
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return "Nieprawidłowy format adresu e-mail";
    }

    return undefined;
  };

  const validatePassword = (password: string): string | undefined => {
    if (!password) {
      return "Pole hasła jest wymagane";
    }

    return undefined;
  };

  const handleEmailChange = (value: string) => {
    setState((prev) => ({
      ...prev,
      email: value,
      errors: prev.errors.email ? { ...prev.errors, email: undefined } : prev.errors,
    }));
  };

  const handlePasswordChange = (value: string) => {
    setState((prev) => ({
      ...prev,
      password: value,
      errors: prev.errors.password ? { ...prev.errors, password: undefined } : prev.errors,
    }));
  };

  const handleEmailBlur = () => {
    const emailError = validateEmail(state.email);
    if (emailError) {
      setState((prev) => ({
        ...prev,
        errors: { ...prev.errors, email: emailError },
      }));
    }
  };

  const handlePasswordBlur = () => {
    const passwordError = validatePassword(state.password);
    if (passwordError) {
      setState((prev) => ({
        ...prev,
        errors: { ...prev.errors, password: passwordError },
      }));
    }
  };

  const handleEmailFocus = () => {
    setState((prev) => ({
      ...prev,
      errors: prev.errors.email ? { ...prev.errors, email: undefined } : prev.errors,
    }));
  };

  const handlePasswordFocus = () => {
    setState((prev) => ({
      ...prev,
      errors: prev.errors.password ? { ...prev.errors, password: undefined } : prev.errors,
    }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    // Check if rate limited
    if (state.rateLimitCooldown && state.rateLimitCooldown > 0) {
      return;
    }

    // Validate fields
    const emailError = validateEmail(state.email);
    const passwordError = validatePassword(state.password);

    if (emailError || passwordError) {
      setState((prev) => ({
        ...prev,
        errors: {
          email: emailError,
          password: passwordError,
        },
      }));
      return;
    }

    // Clear previous errors
    setState((prev) => ({
      ...prev,
      isLoading: true,
      errors: {},
    }));

    try {
      // Import Supabase client dynamically to avoid SSR issues
      const { getSupabaseClient } = await import("@/db/supabase.client");
      const supabase = getSupabaseClient();

      // Create timeout promise
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error("TIMEOUT")), REQUEST_TIMEOUT_MS);
      });

      // Call signInWithPassword directly from Supabase client (client-side)
      // This matches the diagram in auth.md (lines 201-225)
      const loginPromise = supabase.auth.signInWithPassword({
        email: state.email,
        password: state.password,
      });

      const { data, error } = await Promise.race([loginPromise, timeoutPromise]);

      console.log("Login response:", { 
        hasData: !!data, 
        hasSession: !!data?.session, 
        hasUser: !!data?.user,
        error: error?.message 
      });

      if (error) {
        let errorMessage = "Nieprawidłowy adres e-mail lub hasło.";
        let rateLimitCooldown: number | undefined;

        // Handle specific error cases
        if (error.status === 429) {
          errorMessage = "Zbyt wiele prób. Spróbuj ponownie za kilka minut.";
          rateLimitCooldown = RATE_LIMIT_COOLDOWN_MS / 1000;
        } else if (error.message?.toLowerCase().includes("invalid") || 
                   error.message?.toLowerCase().includes("credentials")) {
          errorMessage = "Nieprawidłowy adres e-mail lub hasło.";
        } else if (error.message?.toLowerCase().includes("rate limit") || 
                   error.message?.toLowerCase().includes("too many")) {
          errorMessage = "Zbyt wiele prób. Spróbuj ponownie za kilka minut.";
          rateLimitCooldown = RATE_LIMIT_COOLDOWN_MS / 1000;
        } else {
          errorMessage = error.message || "Nie udało się zalogować.";
        }

        setState((prev) => ({
          ...prev,
          isLoading: false,
          errors: {
            submit: errorMessage,
          },
          rateLimitCooldown,
        }));

        // Start countdown if rate limited
        if (rateLimitCooldown) {
          if (rateLimitIntervalRef.current) {
            clearInterval(rateLimitIntervalRef.current);
          }
          
          rateLimitIntervalRef.current = setInterval(() => {
            setState((prev) => {
              if (!prev.rateLimitCooldown || prev.rateLimitCooldown <= 1) {
                if (rateLimitIntervalRef.current) {
                  clearInterval(rateLimitIntervalRef.current);
                  rateLimitIntervalRef.current = null;
                }
                const { rateLimitCooldown: _, ...rest } = prev;
                return rest;
              }
              return {
                ...prev,
                rateLimitCooldown: prev.rateLimitCooldown - 1,
              };
            });
          }, 1000);
        }

        return;
      }

      // Success - session is returned directly from signInWithPassword
      console.log("Login successful, data:", {
        hasSession: !!data?.session,
        hasUser: !!data?.user,
        sessionAccessToken: data?.session?.access_token ? "present" : "missing",
      });
      
      // Use session from login response directly (most reliable)
      const session = data?.session;
      
      if (!session) {
        // Session not in response - try getSession() as fallback
        console.log("Session not in response, trying getSession()...");
        await new Promise((resolve) => setTimeout(resolve, 500));
        const { data: { session: fallbackSession }, error: sessionError } = await supabase.auth.getSession();
        console.log("getSession() result:", {
          hasSession: !!fallbackSession,
          error: sessionError?.message,
        });
        
        if (!fallbackSession) {
          console.log("Session still not available, redirecting to /onboarding anyway");
          window.location.replace("/onboarding");
          return;
        }
        // Use fallback session
        const authToken = fallbackSession.access_token;
        await checkProfileAndRedirect(authToken);
        return;
      }

      // CRITICAL: createBrowserClient from @supabase/ssr may not persist session
      // Try setSession() first, but if it doesn't work, pass token via URL hash
      console.log("Setting session explicitly to ensure localStorage persistence...");
      const { error: setSessionError } = await supabase.auth.setSession({
        access_token: session.access_token,
        refresh_token: session.refresh_token,
      });
      
      // Verify session is now available
      const { data: { session: verifiedSession } } = await supabase.auth.getSession();
      
      if (setSessionError || !verifiedSession) {
        console.warn("Warning: Session not persisted, will pass token via URL hash");
        // Store session in sessionStorage as backup
        sessionStorage.setItem('supabase.auth.session', JSON.stringify({
          access_token: session.access_token,
          refresh_token: session.refresh_token,
          expires_at: session.expires_at,
        }));
      } else {
        console.log("Session verified in localStorage");
      }

      const authToken = session.access_token;
      console.log("Using session from login response, token:", authToken ? "available" : "not available");
      
      // Check profile and redirect
      await checkProfileAndRedirect(authToken);
    } catch (error) {
      // Handle timeout or network errors
      let errorMessage = "Nie udało się zalogować. Sprawdź połączenie z internetem i spróbuj ponownie.";

      if (error instanceof Error) {
        if (error.message === "TIMEOUT") {
          errorMessage = "Żądanie trwa zbyt długo. Spróbuj ponownie.";
        } else if (error.message?.toLowerCase().includes("network") || error.message?.toLowerCase().includes("fetch")) {
          errorMessage = "Brak połączenia z internetem. Sprawdź swoje połączenie i spróbuj ponownie.";
        }
      }

      console.error("Login error:", error);
      setState((prev) => ({
        ...prev,
        isLoading: false,
        errors: {
          submit: errorMessage,
        },
      }));
    }
  };

  const isSubmitDisabled =
    state.isLoading ||
    !state.email.trim() ||
    !state.password ||
    !!state.errors.email ||
    !!state.errors.password ||
    (state.rateLimitCooldown !== undefined && state.rateLimitCooldown > 0);

  return (
    <div className="w-full">
      <form
        onSubmit={handleSubmit}
        className="space-y-6"
        noValidate
        aria-label="Formularz logowania"
      >
        <EmailField
          value={state.email}
          onChange={handleEmailChange}
          onBlur={handleEmailBlur}
          onFocus={handleEmailFocus}
          error={state.errors.email}
          disabled={state.isLoading}
          autoFocus={true}
        />

        <PasswordField
          value={state.password}
          onChange={handlePasswordChange}
          onBlur={handlePasswordBlur}
          onFocus={handlePasswordFocus}
          error={state.errors.password}
          disabled={state.isLoading}
          placeholder="Wprowadź hasło"
        />

        {state.errors.submit && (
          <div
            role="alert"
            className="rounded-md border border-destructive/50 bg-destructive/10 p-3 text-sm font-medium text-destructive"
            aria-live="assertive"
            aria-atomic="true"
          >
            {state.errors.submit}
          </div>
        )}

        <Button
          type="submit"
          disabled={isSubmitDisabled}
          className="w-full transition-all"
          aria-busy={state.isLoading}
          aria-disabled={isSubmitDisabled}
        >
          {state.isLoading ? (
            <>
              <span className="mr-2" aria-hidden="true">Logowanie...</span>
              <span
                className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
                aria-hidden="true"
              />
              <span className="sr-only">Logowanie</span>
            </>
          ) : state.rateLimitCooldown && state.rateLimitCooldown > 0 ? (
            <>
              <span aria-live="polite" aria-atomic="true">
                Spróbuj ponownie za {state.rateLimitCooldown}s
              </span>
            </>
          ) : (
            "Zaloguj się"
          )}
        </Button>
      </form>
    </div>
  );
}

