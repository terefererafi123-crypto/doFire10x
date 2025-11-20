export interface ResetPasswordResult {
  success: boolean;
  error?: {
    message: string;
  };
}

/**
 * Service layer for password reset operations
 * Separates business logic from React components
 */
export class ResetPasswordService {
  private readonly REQUEST_TIMEOUT_MS = 10000; // 10 seconds

  /**
   * Resets user password
   * @param newPassword New password
   * @returns ResetPasswordResult with success status and error details
   */
  async resetPassword(newPassword: string): Promise<ResetPasswordResult> {
    try {
      // TODO: Implement actual password reset with Supabase
      // const updatePromise = supabaseClient.auth.updateUser({
      //   password: newPassword,
      // });

      // For now, simulate a delay
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Success
      return { success: true };
    } catch (error) {
      return this.handleNetworkError(error);
    }
  }

  /**
   * Validates reset token from URL
   * @returns true if token is valid, false otherwise
   */
  validateToken(): boolean {
    if (typeof window === "undefined") {
      return false;
    }

    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const accessToken = hashParams.get("access_token");
    const type = hashParams.get("type");

    return accessToken !== null && type === "recovery";
  }

  /**
   * Handles network errors (timeout, fetch failures)
   */
  private handleNetworkError(error: unknown): ResetPasswordResult {
    let errorMessage = "Nie udało się zresetować hasła. Sprawdź połączenie z internetem i spróbuj ponownie.";

    if (error instanceof Error) {
      if (error.message === "TIMEOUT") {
        errorMessage = "Żądanie trwa zbyt długo. Spróbuj ponownie.";
      } else if (
        error.message?.toLowerCase().includes("network") ||
        error.message?.toLowerCase().includes("fetch")
      ) {
        errorMessage = "Brak połączenia z internetem. Sprawdź swoje połączenie i spróbuj ponownie.";
      } else if (
        error.message?.toLowerCase().includes("token") ||
        error.message?.toLowerCase().includes("expired")
      ) {
        errorMessage = "Link resetujący wygasł lub jest nieprawidłowy. Poproś o nowy link resetujący.";
      }
    }

    return {
      success: false,
      error: {
        message: errorMessage,
      },
    };
  }
}

// Export singleton instance
export const resetPasswordService = new ResetPasswordService();

