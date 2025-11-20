export interface RegisterResult {
  success: boolean;
  error?: {
    message: string;
    isRateLimited: boolean;
  };
}

/**
 * Service layer for user registration operations
 * Separates business logic from React components
 */
export class RegisterService {
  private readonly REQUEST_TIMEOUT_MS = 10000; // 10 seconds

  /**
   * Registers a new user with email and password
   * @param email User email
   * @param password User password
   * @returns RegisterResult with success status and error details
   */
  async register(email: string, password: string): Promise<RegisterResult> {
    try {
      // Create timeout promise
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error("TIMEOUT")), this.REQUEST_TIMEOUT_MS);
      });

      // Call register API endpoint
      const registerPromise = fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      const response = await Promise.race([registerPromise, timeoutPromise]);

      if (!response.ok) {
        return this.handleRegisterError(response);
      }

      // Success
      return { success: true };
    } catch (error) {
      return this.handleNetworkError(error);
    }
  }

  /**
   * Handles registration errors and maps them to user-friendly messages
   */
  private async handleRegisterError(response: Response): Promise<RegisterResult> {
    const data = await response.json().catch(() => ({}));
    let errorMessage = "Nie udało się utworzyć konta. Spróbuj ponownie.";
    let isRateLimited = false;

    // Handle specific error cases
    if (response.status === 429) {
      errorMessage = "Zbyt wiele prób. Spróbuj ponownie za kilka minut.";
      isRateLimited = true;
    } else if (response.status === 409) {
      errorMessage = "Użytkownik o tym adresie e-mail już istnieje.";
    } else if (data.error) {
      // Use error message from API if available
      const apiError = data.error.toLowerCase();
      if (apiError.includes("already registered") || apiError.includes("user already")) {
        errorMessage = "Użytkownik o tym adresie e-mail już istnieje.";
      } else if (apiError.includes("password") && apiError.includes("weak")) {
        errorMessage = "Hasło jest zbyt słabe. Minimum 6 znaków.";
      } else if (apiError.includes("invalid email") || apiError.includes("email")) {
        errorMessage = "Nieprawidłowy format adresu e-mail.";
      } else if (apiError.includes("rate limit") || apiError.includes("too many")) {
        errorMessage = "Zbyt wiele prób. Spróbuj ponownie za kilka minut.";
        isRateLimited = true;
      } else {
        errorMessage = data.error;
      }
    }

    return {
      success: false,
      error: {
        message: errorMessage,
        isRateLimited,
      },
    };
  }

  /**
   * Handles network errors (timeout, fetch failures)
   */
  private handleNetworkError(error: unknown): RegisterResult {
    let errorMessage = "Nie udało się utworzyć konta. Sprawdź połączenie z internetem i spróbuj ponownie.";

    if (error instanceof Error) {
      if (error.message === "TIMEOUT") {
        errorMessage = "Żądanie trwa zbyt długo. Spróbuj ponownie.";
      } else if (
        error.message?.toLowerCase().includes("network") ||
        error.message?.toLowerCase().includes("fetch")
      ) {
        errorMessage = "Brak połączenia z internetem. Sprawdź swoje połączenie i spróbuj ponownie.";
      }
    }

    return {
      success: false,
      error: {
        message: errorMessage,
        isRateLimited: false,
      },
    };
  }
}

// Export singleton instance
export const registerService = new RegisterService();

