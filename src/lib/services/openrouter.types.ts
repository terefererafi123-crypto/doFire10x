// src/lib/services/openrouter.types.ts
// Type definitions for OpenRouter service

// Typy dla wiadomości
export interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

// Typy dla response format
export interface ResponseFormat {
  type: 'json_schema';
  json_schema: {
    name: string;
    strict: boolean;
    schema: JSONSchema;
  };
}

// Typy dla parametrów żądania
export interface ChatCompletionParams {
  messages: Message[];
  model: string;
  responseFormat?: ResponseFormat;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  topK?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  stream?: boolean;
  metadata?: Record<string, unknown>;
}

// Typy dla odpowiedzi
export interface ChatCompletionResponse {
  id: string;
  model: string;
  created: number;
  choices: Array<{
    index: number;
    message: Message;
    finish_reason: 'stop' | 'length' | 'tool_calls' | 'content_filter' | null;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  error?: {
    message: string;
    type: string;
    code: string;
  };
}

// Typy dla konfiguracji
export interface OpenRouterConfig {
  apiKey: string;
  baseUrl?: string;
  referer?: string;
  appTitle?: string;
  timeout?: number;
  maxRetries?: number;
  retryDelay?: number;
}

// Typy dla modeli
export interface Model {
  id: string;
  name: string;
  description?: string;
  pricing?: {
    prompt: string;
    completion: string;
  };
  context_length?: number;
  architecture?: {
    modality: string;
    tokenizer: string;
  };
}

// Typ dla JSON Schema (uproszczony)
export interface JSONSchema {
  type: string;
  properties?: Record<string, JSONSchema>;
  required?: string[];
  additionalProperties?: boolean;
  enum?: unknown[];
  minimum?: number;
  maximum?: number;
  description?: string;
  [key: string]: unknown;
}

