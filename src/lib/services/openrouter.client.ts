// src/lib/services/openrouter.client.ts
// Singleton client for OpenRouterService

import { OpenRouterService } from './openrouter.service.ts';
import type { OpenRouterConfig } from './openrouter.types.ts';

let serviceInstance: OpenRouterService | null = null;

/**
 * Pobiera singleton instancję OpenRouterService
 * Tworzy nową instancję przy pierwszym wywołaniu
 * 
 * @returns Singleton instance of OpenRouterService
 * @throws {Error} If OPENROUTER_API_KEY environment variable is not set
 */
export function getOpenRouterService(): OpenRouterService {
  if (!serviceInstance) {
    const apiKey = import.meta.env.OPENROUTER_API_KEY;

    if (!apiKey) {
      throw new Error(
        'OPENROUTER_API_KEY environment variable is not set. ' +
        'Please add it to your .env file.'
      );
    }

    const config: OpenRouterConfig = {
      apiKey,
      baseUrl: import.meta.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1',
      referer: import.meta.env.OPENROUTER_REFERER,
      appTitle: import.meta.env.OPENROUTER_APP_TITLE || 'DoFIRE App',
      timeout: parseInt(import.meta.env.OPENROUTER_TIMEOUT || '30000', 10),
      maxRetries: parseInt(import.meta.env.OPENROUTER_MAX_RETRIES || '3', 10),
      retryDelay: parseInt(import.meta.env.OPENROUTER_RETRY_DELAY || '1000', 10),
    };

    serviceInstance = new OpenRouterService(config);
  }

  return serviceInstance;
}

