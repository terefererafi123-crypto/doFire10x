// src/lib/services/openrouter.service.ts
// OpenRouter service for AI chat completions

import type {
  OpenRouterConfig,
  ChatCompletionParams,
  ChatCompletionResponse,
  ResponseFormat,
  Model,
} from "./openrouter.types.ts";
import { OpenRouterApiError, OpenRouterRateLimitError, OpenRouterValidationError } from "./openrouter.errors.ts";

const MAX_MESSAGE_LENGTH = 1_000_000; // 1M znaków

/**
 * OpenRouterService - Service for interacting with OpenRouter API
 *
 * Provides a unified interface for communicating with various AI models
 * available through OpenRouter (OpenAI, Anthropic, Google, etc.)
 */
export class OpenRouterService {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly timeout: number;
  private readonly maxRetries: number;
  private readonly retryDelay: number;
  private headers: Record<string, string>;

  /**
   * Creates a new instance of OpenRouterService
   *
   * @param config - Configuration object for the service
   * @throws {Error} If API key is missing or invalid
   */
  constructor(config: OpenRouterConfig) {
    // Walidacja klucza API
    if (!config.apiKey || typeof config.apiKey !== "string" || config.apiKey.trim().length === 0) {
      throw new Error("OpenRouter API key is required");
    }

    this.apiKey = config.apiKey.trim();
    this.baseUrl = config.baseUrl ?? "https://openrouter.ai/api/v1";
    this.timeout = config.timeout ?? 30000;
    this.maxRetries = config.maxRetries ?? 3;
    this.retryDelay = config.retryDelay ?? 1000;

    // Inicjalizacja nagłówków
    this.headers = {
      Authorization: `Bearer ${this.apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": config.referer ?? "",
      "X-Title": config.appTitle ?? "",
    };

    // Usuń puste nagłówki opcjonalne
    if (!this.headers["HTTP-Referer"]) {
      delete this.headers["HTTP-Referer"];
    }
    if (!this.headers["X-Title"]) {
      delete this.headers["X-Title"];
    }
  }

  /**
   * Sends a chat completion request to OpenRouter API
   *
   * @param params - Chat completion parameters
   * @returns Promise resolving to chat completion response
   * @throws {OpenRouterValidationError} If input validation fails
   * @throws {OpenRouterApiError} If API request fails
   */
  async chatCompletion(params: ChatCompletionParams): Promise<ChatCompletionResponse> {
    // Walidacja danych wejściowych
    this._validateInput(params);

    // Buduj payload żądania
    const payload = this._buildRequestPayload(params);

    // Wykonaj żądanie
    const response = await this._makeRequest("chat/completions", payload);

    // Obsłuż odpowiedź
    return await this._handleResponse(response);
  }

  /**
   * Sets additional HTTP headers for API requests
   *
   * @param headers - Headers to set (referer, title, or custom headers)
   */
  setHeaders(headers: Partial<Record<string, string>>): void {
    if (headers.referer !== undefined) {
      if (headers.referer) {
        this.headers["HTTP-Referer"] = headers.referer;
      } else {
        delete this.headers["HTTP-Referer"];
      }
    }

    if (headers.title !== undefined) {
      if (headers.title) {
        this.headers["X-Title"] = headers.title;
      } else {
        delete this.headers["X-Title"];
      }
    }

    // Dodaj inne niestandardowe nagłówki
    for (const [key, value] of Object.entries(headers)) {
      if (key !== "referer" && key !== "title" && value !== undefined) {
        this.headers[key] = value;
      }
    }
  }

  /**
   * Retrieves list of available models from OpenRouter API
   *
   * @returns Promise resolving to array of available models
   * @throws {OpenRouterApiError} If API request fails
   */
  async getModels(): Promise<Model[]> {
    const response = await this._makeRequest("models", {}, "GET");
    const data = await this._handleModelsResponse(response);
    return data.data || [];
  }

  /**
   * Waliduje dane wejściowe dla chat completion
   */
  private _validateInput(params: ChatCompletionParams): void {
    // Walidacja wiadomości
    if (!Array.isArray(params.messages) || params.messages.length === 0) {
      throw new OpenRouterValidationError("Messages array is required and cannot be empty");
    }

    const validRoles = ["system", "user", "assistant"];
    for (const msg of params.messages) {
      if (!validRoles.includes(msg.role)) {
        throw new OpenRouterValidationError(
          `Invalid message role: ${msg.role}. Must be one of: ${validRoles.join(", ")}`,
          "messages.role"
        );
      }

      if (typeof msg.content !== "string") {
        throw new OpenRouterValidationError("Message content must be a string", "messages.content");
      }

      if (msg.content.length === 0) {
        throw new OpenRouterValidationError("Message content cannot be empty", "messages.content");
      }

      if (msg.content.length > MAX_MESSAGE_LENGTH) {
        throw new OpenRouterValidationError(
          `Message content exceeds maximum length of ${MAX_MESSAGE_LENGTH} characters`,
          "messages.content"
        );
      }
    }

    // Walidacja modelu
    if (typeof params.model !== "string" || params.model.trim().length === 0) {
      throw new OpenRouterValidationError("Model name is required and must be a non-empty string", "model");
    }

    // Walidacja parametrów numerycznych
    this._validateNumericParam(params.temperature, 0, 2, "temperature");
    this._validateNumericParam(params.topP, 0, 1, "topP");
    this._validateNumericParam(params.maxTokens, 1, undefined, "maxTokens");
    this._validateNumericParam(params.topK, 1, undefined, "topK");
    this._validateNumericParam(params.frequencyPenalty, -2, 2, "frequencyPenalty");
    this._validateNumericParam(params.presencePenalty, -2, 2, "presencePenalty");
  }

  /**
   * Waliduje parametr numeryczny
   */
  private _validateNumericParam(
    value: number | undefined,
    min: number,
    max: number | undefined,
    paramName: string
  ): void {
    if (value === undefined) {
      return;
    }

    if (typeof value !== "number" || isNaN(value)) {
      throw new OpenRouterValidationError(`${paramName} must be a valid number`, paramName);
    }

    if (value < min) {
      throw new OpenRouterValidationError(`${paramName} must be at least ${min}`, paramName);
    }

    if (max !== undefined && value > max) {
      throw new OpenRouterValidationError(`${paramName} must be at most ${max}`, paramName);
    }
  }

  /**
   * Buduje payload żądania zgodnie z parametrami wejściowymi
   */
  private _buildRequestPayload(params: ChatCompletionParams): Record<string, unknown> {
    const payload: Record<string, unknown> = {
      model: params.model,
      messages: params.messages,
    };

    // Dodaj response_format jeśli określony
    if (params.responseFormat) {
      this._validateResponseFormat(params.responseFormat);
      payload.response_format = params.responseFormat;
    }

    // Dodaj parametry modelu jeśli określone
    if (params.temperature !== undefined) {
      payload.temperature = params.temperature;
    }

    if (params.maxTokens !== undefined) {
      payload.max_tokens = params.maxTokens;
    }

    if (params.topP !== undefined) {
      payload.top_p = params.topP;
    }

    if (params.topK !== undefined) {
      payload.top_k = params.topK;
    }

    if (params.frequencyPenalty !== undefined) {
      payload.frequency_penalty = params.frequencyPenalty;
    }

    if (params.presencePenalty !== undefined) {
      payload.presence_penalty = params.presencePenalty;
    }

    if (params.stream !== undefined) {
      payload.stream = params.stream;
    }

    if (params.metadata) {
      payload.metadata = params.metadata;
    }

    return payload;
  }

  /**
   * Waliduje format odpowiedzi (JSON Schema)
   */
  private _validateResponseFormat(format: ResponseFormat): void {
    if (format.type !== "json_schema") {
      throw new OpenRouterValidationError('responseFormat.type must be "json_schema"', "responseFormat.type");
    }

    if (!format.json_schema) {
      throw new OpenRouterValidationError("responseFormat.json_schema is required", "responseFormat.json_schema");
    }

    const { name, strict, schema } = format.json_schema;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      throw new OpenRouterValidationError(
        "json_schema.name must be a non-empty string",
        "responseFormat.json_schema.name"
      );
    }

    if (typeof strict !== "boolean") {
      throw new OpenRouterValidationError("json_schema.strict must be a boolean", "responseFormat.json_schema.strict");
    }

    if (!schema || typeof schema !== "object") {
      throw new OpenRouterValidationError("json_schema.schema must be an object", "responseFormat.json_schema.schema");
    }

    // Podstawowa walidacja JSON Schema
    if (schema.type !== "object") {
      throw new OpenRouterValidationError(
        'json_schema.schema.type must be "object" for structured responses',
        "responseFormat.json_schema.schema.type"
      );
    }

    if (!schema.properties || typeof schema.properties !== "object") {
      throw new OpenRouterValidationError(
        "json_schema.schema.properties must be defined for object schema",
        "responseFormat.json_schema.schema.properties"
      );
    }
  }

  /**
   * Wykonuje żądanie HTTP do API OpenRouter z obsługą ponownych prób
   */
  private async _makeRequest(
    endpoint: string,
    payload: Record<string, unknown> = {},
    method: "GET" | "POST" = "POST"
  ): Promise<Response> {
    const url = `${this.baseUrl}/${endpoint}`;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.timeout);

        const requestOptions: RequestInit = {
          method,
          headers: this.headers,
          signal: controller.signal,
        };

        if (method === "POST" && Object.keys(payload).length > 0) {
          requestOptions.body = JSON.stringify(payload);
        }

        const response = await fetch(url, requestOptions);

        clearTimeout(timeoutId);

        // Nie ponawiaj przy błędach 4xx (błędy klienta)
        if (response.status >= 400 && response.status < 500) {
          return response;
        }

        // Nie ponawiaj przy sukcesie
        if (response.ok) {
          return response;
        }

        // Dla błędów 5xx, rzuć błąd aby uruchomić retry
        if (response.status >= 500) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return response;
      } catch (error) {
        lastError = error as Error;

        // Nie ponawiaj przy błędach AbortError (timeout) jeśli to ostatnia próba
        if (error instanceof Error && error.name === "AbortError") {
          if (attempt === this.maxRetries) {
            throw new Error(`Request timeout after ${this.timeout}ms`);
          }
        }

        // Nie ponawiaj przy ostatniej próbie
        if (attempt === this.maxRetries) {
          break;
        }

        // Czekaj przed kolejną próbą (exponential backoff)
        await new Promise((resolve) => setTimeout(resolve, this.retryDelay * (attempt + 1)));
      }
    }

    throw new Error(`Request failed after ${this.maxRetries + 1} attempts: ${lastError?.message || "Unknown error"}`);
  }

  /**
   * Obsługuje odpowiedź z API, parsuje JSON i obsługuje błędy
   */
  private async _handleResponse(response: Response): Promise<ChatCompletionResponse> {
    const contentType = response.headers.get("content-type");

    if (!contentType || !contentType.includes("application/json")) {
      const text = await response.text();
      throw new OpenRouterApiError(
        `Unexpected content type: ${contentType}. Response: ${text.substring(0, 200)}`,
        response.status.toString(),
        "invalid_response",
        response.status
      );
    }

    let data: ChatCompletionResponse;
    try {
      data = await response.json();
    } catch (error) {
      throw new OpenRouterApiError(
        `Failed to parse API response: ${error instanceof Error ? error.message : "Unknown error"}`,
        response.status.toString(),
        "parse_error",
        response.status
      );
    }

    // Obsługa błędów rate limiting
    if (response.status === 429) {
      const retryAfter = response.headers.get("Retry-After");
      const retryAfterSeconds = retryAfter ? parseInt(retryAfter, 10) : 60;
      throw new OpenRouterRateLimitError(
        "Rate limit exceeded. Please wait before making another request.",
        retryAfterSeconds
      );
    }

    // Sprawdź błędy API
    if (!response.ok || data.error) {
      const error = data.error || {
        message: `HTTP ${response.status}`,
        code: response.status.toString(),
        type: "api_error",
      };
      throw new OpenRouterApiError(
        error.message || "Unknown API error",
        error.code || response.status.toString(),
        error.type || "api_error",
        response.status
      );
    }

    return data;
  }

  /**
   * Obsługuje odpowiedź z endpointu models
   */
  private async _handleModelsResponse(response: Response): Promise<{ data: Model[] }> {
    const contentType = response.headers.get("content-type");

    if (!contentType || !contentType.includes("application/json")) {
      const text = await response.text();
      throw new OpenRouterApiError(
        `Unexpected content type: ${contentType}. Response: ${text.substring(0, 200)}`,
        response.status.toString(),
        "invalid_response",
        response.status
      );
    }

    let data: { data: Model[]; error?: { message: string; code: string; type: string } };
    try {
      data = await response.json();
    } catch (error) {
      throw new OpenRouterApiError(
        `Failed to parse API response: ${error instanceof Error ? error.message : "Unknown error"}`,
        response.status.toString(),
        "parse_error",
        response.status
      );
    }

    // Sprawdź błędy API
    if (!response.ok || data.error) {
      const error = data.error || {
        message: `HTTP ${response.status}`,
        code: response.status.toString(),
        type: "api_error",
      };
      throw new OpenRouterApiError(
        error.message || "Unknown API error",
        error.code || response.status.toString(),
        error.type || "api_error",
        response.status
      );
    }

    return data;
  }
}
