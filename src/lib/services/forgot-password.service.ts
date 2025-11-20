export interface ForgotPasswordResult {
  success: boolean;
  error?: {
    message: string;
    isRateLimited: boolean;
  };
}

/**
 * Service layer for forgot password operations
 * Separates business logic from React components
 */
export class ForgotPasswordService {
  private readonly REQUEST_TIMEOUT_MS = 10000; // 10 seconds

  /**
   * Sends password reset email
   * @param email User email (currently unused, TODO: implement)
   * @returns ForgotPasswordResult with success status and error details
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async sendResetEmail(email: string): Promise<ForgotPasswordResult> {
    try {
      // TODO: Implement actual password reset email with Supabase
      // const resetPromise = supabaseClient.auth.resetPasswordForEmail(email, {
      //   redirectTo: `${window.location.origin}/reset-password`,
      // });

      // For now, simulate a delay
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Success - always show success message (don't reveal if email exists)
      return { success: true };
    } catch (error) {
      return this.handleNetworkError(error);
    }
  }

  /**
   * Handles network errors (timeout, fetch failures)
   */
  private handleNetworkError(error: unknown): ForgotPasswordResult {
    let errorMessage = "Nie udało się wysłać linku. Sprawdź połączenie z internetem i spróbuj ponownie.";

    if (error instanceof Error) {
      if (error.message === "TIMEOUT") {
        errorMessage = "Żądanie trwa zbyt długo. Spróbuj ponownie.";
      } else if (error.message?.toLowerCase().includes("network") || error.message?.toLowerCase().includes("fetch")) {
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
export const forgotPasswordService = new ForgotPasswordService();
