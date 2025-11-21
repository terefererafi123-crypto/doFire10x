import { getSupabaseClient } from "@/db/supabase.client";
import type { AuthError } from "@supabase/supabase-js";

export interface SignInResult {
  success: boolean;
  authToken: string | null;
  error?: {
    message: string;
    isRateLimited: boolean;
  };
}

export interface CheckProfileResult {
  hasProfile: boolean;
  shouldRedirectToDashboard: boolean;
  shouldRedirectToOnboarding: boolean;
}

/**
 * Service layer for authentication operations
 * Separates business logic from React components
 */
export class AuthService {
  private readonly REQUEST_TIMEOUT_MS = 10000; // 10 seconds

  /**
   * Signs in a user with email and password
   * @param email User email
   * @param password User password
   * @returns SignInResult with success status, auth token, and error details
   */
  async signIn(email: string, password: string): Promise<SignInResult> {
    try {
      // Import Supabase client dynamically to avoid SSR issues
      const supabase = getSupabaseClient();

      // Create timeout promise
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error("TIMEOUT")), this.REQUEST_TIMEOUT_MS);
      });

      // Call signInWithPassword directly from Supabase client (client-side)
      const loginPromise = supabase.auth.signInWithPassword({
        email,
        password,
      });

      const { data, error } = await Promise.race([loginPromise, timeoutPromise]);

      if (error) {
        return this.handleSignInError(error);
      }

      // Success - session is returned directly from signInWithPassword
      const session = data?.session;

      if (!session) {
        // Session not in response - try getSession() as fallback
        await new Promise((resolve) => setTimeout(resolve, 500));
        const {
          data: { session: fallbackSession },
        } = await supabase.auth.getSession();

        if (!fallbackSession) {
          return {
            success: false,
            authToken: null,
            error: {
              message: "Nie udało się utworzyć sesji. Spróbuj ponownie.",
              isRateLimited: false,
            },
          };
        }

        // Persist fallback session
        await this.persistSession(supabase, fallbackSession);
        return {
          success: true,
          authToken: fallbackSession.access_token,
        };
      }

      // Persist session to ensure localStorage persistence
      await this.persistSession(supabase, session);

      return {
        success: true,
        authToken: session.access_token,
      };
    } catch (error) {
      return this.handleNetworkError(error);
    }
  }

  /**
   * Checks if user has a profile and determines redirect destination
   * @param authToken Authentication token
   * @returns CheckProfileResult with redirect information
   */
  async checkProfileAndRedirect(authToken: string | null): Promise<CheckProfileResult> {
    try {
      const profileResponse = await fetch("/api/v1/me/profile", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        credentials: "include",
      });

      if (profileResponse.ok) {
        // Profile exists - redirect to dashboard
        return {
          hasProfile: true,
          shouldRedirectToDashboard: true,
          shouldRedirectToOnboarding: false,
        };
      }

      if (profileResponse.status === 404) {
        // No profile - redirect to onboarding
        return {
          hasProfile: false,
          shouldRedirectToDashboard: false,
          shouldRedirectToOnboarding: true,
        };
      }

      // Auth error or other error - default to onboarding
      return {
        hasProfile: false,
        shouldRedirectToDashboard: false,
        shouldRedirectToOnboarding: true,
      };
    } catch (error) {
      // Network error - default to onboarding
      // eslint-disable-next-line no-console
      console.error("Error checking profile:", error);
      return {
        hasProfile: false,
        shouldRedirectToDashboard: false,
        shouldRedirectToOnboarding: true,
      };
    }
  }

  /**
   * Handles sign-in errors and maps them to user-friendly messages
   */
  private handleSignInError(error: AuthError): SignInResult {
    let errorMessage = "Nieprawidłowy adres e-mail lub hasło.";
    let isRateLimited = false;

    // Handle specific error cases
    if (error.status === 429) {
      errorMessage = "Zbyt wiele prób. Spróbuj ponownie za kilka minut.";
      isRateLimited = true;
    } else if (
      error.message?.toLowerCase().includes("invalid") ||
      error.message?.toLowerCase().includes("credentials")
    ) {
      errorMessage = "Nieprawidłowy adres e-mail lub hasło.";
    } else if (
      error.message?.toLowerCase().includes("rate limit") ||
      error.message?.toLowerCase().includes("too many")
    ) {
      errorMessage = "Zbyt wiele prób. Spróbuj ponownie za kilka minut.";
      isRateLimited = true;
    } else {
      errorMessage = error.message || "Nie udało się zalogować.";
    }

    return {
      success: false,
      authToken: null,
      error: {
        message: errorMessage,
        isRateLimited,
      },
    };
  }

  /**
   * Handles network errors (timeout, fetch failures)
   */
  private handleNetworkError(error: unknown): SignInResult {
    let errorMessage = "Nie udało się zalogować. Sprawdź połączenie z internetem i spróbuj ponownie.";

    if (error instanceof Error) {
      if (error.message === "TIMEOUT") {
        errorMessage = "Żądanie trwa zbyt długo. Spróbuj ponownie.";
      } else if (error.message?.toLowerCase().includes("network") || error.message?.toLowerCase().includes("fetch")) {
        errorMessage = "Brak połączenia z internetem. Sprawdź swoje połączenie i spróbuj ponownie.";
      }
    }

    return {
      success: false,
      authToken: null,
      error: {
        message: errorMessage,
        isRateLimited: false,
      },
    };
  }

  /**
   * Persists session to localStorage and sessionStorage as backup
   */
  private async persistSession(
    supabase: ReturnType<typeof getSupabaseClient>,
    session: { access_token: string; refresh_token: string; expires_at?: number | null }
  ): Promise<void> {
    // Try setSession() first
    const { error: setSessionError } = await supabase.auth.setSession({
      access_token: session.access_token,
      refresh_token: session.refresh_token,
    });

    // Verify session is now available
    const {
      data: { session: verifiedSession },
    } = await supabase.auth.getSession();

    if (setSessionError || !verifiedSession) {
      // Store session in sessionStorage as backup
      if (typeof window !== "undefined") {
        sessionStorage.setItem(
          "supabase.auth.session",
          JSON.stringify({
            access_token: session.access_token,
            refresh_token: session.refresh_token,
            expires_at: session.expires_at,
          })
        );
      }
    }
  }
}

// Export singleton instance
export const authService = new AuthService();
