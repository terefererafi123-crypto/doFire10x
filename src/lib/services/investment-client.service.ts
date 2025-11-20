import { getAuthToken } from "@/lib/auth/client-helpers";
import type { InvestmentDto, UpdateInvestmentCommand, ApiError } from "@/types";

/**
 * Client-side service for investment operations
 * Handles API calls from React components
 */
export class InvestmentClientService {
  /**
   * Updates an investment
   * @param id Investment ID
   * @param data Update command with only changed fields
   * @returns Updated InvestmentDto
   * @throws ApiError if update fails
   */
  async update(id: string, data: UpdateInvestmentCommand): Promise<InvestmentDto> {
    const authToken = await getAuthToken();
    if (!authToken) {
      throw {
        error: {
          code: "unauthorized" as const,
          message: "Brak sesji. Zaloguj się ponownie.",
        },
      } as ApiError;
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

// Export singleton instance
export const investmentClientService = new InvestmentClientService();
