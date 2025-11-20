# Plan wdrożenia usługi OpenRouter

## 1. Opis usługi

Usługa `OpenRouterService` integruje się z interfejsem API OpenRouter w celu uzupełnienia czatów opartych na modelach językowych (LLM). Usługa zapewnia jednolity interfejs do komunikacji z różnorodnymi modelami AI dostępnymi przez OpenRouter (OpenAI, Anthropic, Google i inne), automatycznie obsługując:

- **Komunikaty systemowe** - definiowanie kontekstu i zachowania asystenta
- **Komunikaty użytkownika** - interaktywne wiadomości w konwersacji
- **Ustrukturyzowane odpowiedzi** - wymuszenie formatu JSON zgodnie z określonym schematem
- **Wybór modelu** - dynamiczne wybieranie odpowiedniego modelu dla zadania
- **Parametry modelu** - konfiguracja temperatury, max_tokens, top_p i innych parametrów generacji

Usługa jest zaimplementowana w TypeScript zgodnie ze stackiem technologicznym projektu (Astro 5, TypeScript 5), przechowuje konfigurację w zmiennych środowiskowych i integruje się z istniejącym systemem obsługi błędów aplikacji.

**Lokalizacja:** `src/lib/services/openrouter.service.ts`

## 2. Opis konstruktora

Konstruktor `OpenRouterService` inicjalizuje usługę z wymaganym kluczem API i opcjonalnymi ustawieniami konfiguracyjnymi.

### 2.1. Parametry konstruktora

```typescript
interface OpenRouterConfig {
  apiKey: string; // Wymagany klucz API OpenRouter
  baseUrl?: string; // Opcjonalny URL bazowy (domyślnie: 'https://openrouter.ai/api/v1')
  referer?: string; // Opcjonalny nagłówek HTTP-Referer dla identyfikacji aplikacji
  appTitle?: string; // Opcjonalny nagłówek X-Title dla identyfikacji aplikacji
  timeout?: number; // Opcjonalny timeout żądania w ms (domyślnie: 30000)
  maxRetries?: number; // Opcjonalna liczba ponownych prób przy błędach sieciowych (domyślnie: 3)
  retryDelay?: number; // Opcjonalne opóźnienie między próbami w ms (domyślnie: 1000)
}
```

### 2.2. Inicjalizacja

```typescript
class OpenRouterService {
  private readonly apiKey: string;
  private readonly baseUrl: string;
  private readonly timeout: number;
  private readonly maxRetries: number;
  private readonly retryDelay: number;
  private headers: Record<string, string>;

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
}
```

### 2.3. Przykład użycia konstruktora

```typescript
// Podstawowa inicjalizacja z kluczem API
const service = new OpenRouterService({
  apiKey: import.meta.env.OPENROUTER_API_KEY,
});

// Pełna konfiguracja z wszystkimi opcjami
const service = new OpenRouterService({
  apiKey: import.meta.env.OPENROUTER_API_KEY,
  baseUrl: "https://openrouter.ai/api/v1",
  referer: "https://dofire.app",
  appTitle: "DoFIRE App",
  timeout: 60000,
  maxRetries: 5,
  retryDelay: 2000,
});
```

## 3. Publiczne metody i pola

### 3.1. Metoda `chatCompletion`

Główna metoda do wysyłania żądań do API OpenRouter dla uzupełnienia czatów.

**Sygnatura:**

```typescript
async chatCompletion(params: ChatCompletionParams): Promise<ChatCompletionResponse>
```

**Parametry wejściowe:**

```typescript
interface ChatCompletionParams {
  messages: Message[]; // Lista wiadomości w konwersacji
  model: string; // Nazwa modelu (np. 'openai/gpt-4o', 'anthropic/claude-3.5-sonnet')
  responseFormat?: ResponseFormat; // Opcjonalny format odpowiedzi (JSON schema)
  temperature?: number; // Opcjonalna temperatura (0-2, domyślnie: 1)
  maxTokens?: number; // Opcjonalna maksymalna liczba tokenów w odpowiedzi
  topP?: number; // Opcjonalny top_p (0-1, domyślnie: 1)
  topK?: number; // Opcjonalny top_k (dla niektórych modeli)
  frequencyPenalty?: number; // Opcjonalna kara za częstotliwość (-2 do 2)
  presencePenalty?: number; // Opcjonalna kara za obecność (-2 do 2)
  stream?: boolean; // Opcjonalne włączenie streaming (domyślnie: false)
  metadata?: Record<string, unknown>; // Opcjonalne metadane żądania
}
```

**Format wiadomości:**

```typescript
interface Message {
  role: "system" | "user" | "assistant"; // Rola wiadomości
  content: string; // Treść wiadomości
}
```

**Format odpowiedzi (JSON Schema):**

```typescript
interface ResponseFormat {
  type: "json_schema";
  json_schema: {
    name: string; // Nazwa schematu
    strict: boolean; // Czy schemat jest ścisły (wymusza dokładne dopasowanie)
    schema: JSONSchema; // Schemat JSON zgodny z JSON Schema Draft 7
  };
}
```

**Przykład użycia - podstawowy czat:**

```typescript
const response = await service.chatCompletion({
  messages: [
    { role: "system", content: "You are a helpful financial advisor." },
    { role: "user", content: "What is the FIRE number?" },
  ],
  model: "openai/gpt-4o",
  temperature: 0.7,
  maxTokens: 500,
});
```

**Przykład użycia - ustrukturyzowana odpowiedź JSON:**

```typescript
const response = await service.chatCompletion({
  messages: [
    {
      role: "system",
      content: "You are a financial advisor. Analyze the portfolio and provide structured feedback.",
    },
    {
      role: "user",
      content: "My portfolio has 80% stocks and 20% bonds. Provide feedback.",
    },
  ],
  model: "openai/gpt-4o",
  responseFormat: {
    type: "json_schema",
    json_schema: {
      name: "portfolio_feedback",
      strict: true,
      schema: {
        type: "object",
        properties: {
          risk_level: {
            type: "string",
            enum: ["low", "medium", "high"],
            description: "Risk level of the portfolio",
          },
          recommendation: {
            type: "string",
            description: "Recommendation for portfolio adjustment",
          },
          diversification_score: {
            type: "number",
            minimum: 0,
            maximum: 100,
            description: "Diversification score from 0 to 100",
          },
        },
        required: ["risk_level", "recommendation", "diversification_score"],
        additionalProperties: false,
      },
    },
  },
  temperature: 0.3,
  maxTokens: 300,
});
```

**Odpowiedź:**

```typescript
interface ChatCompletionResponse {
  id: string; // Unikalny identyfikator odpowiedzi
  model: string; // Nazwa użytego modelu
  created: number; // Timestamp utworzenia odpowiedzi
  choices: Array<{
    index: number;
    message: Message; // Wiadomość asystenta
    finish_reason: "stop" | "length" | "tool_calls" | "content_filter" | null;
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
```

### 3.2. Metoda `setHeaders`

Ustawia dodatkowe nagłówki HTTP dla żądań API.

**Sygnatura:**

```typescript
setHeaders(headers: Partial<Record<string, string>>): void
```

**Parametry:**

```typescript
interface Headers {
  referer?: string; // HTTP-Referer header
  title?: string; // X-Title header
  [key: string]: string; // Inne niestandardowe nagłówki
}
```

**Przykład użycia:**

```typescript
service.setHeaders({
  referer: "https://dofire.app",
  title: "DoFIRE App",
});
```

### 3.3. Metoda `getModels`

Pobiera listę dostępnych modeli z API OpenRouter (opcjonalne, dla informacji).

**Sygnatura:**

```typescript
async getModels(): Promise<Model[]>
```

**Odpowiedź:**

```typescript
interface Model {
  id: string; // Identyfikator modelu
  name: string; // Nazwa modelu
  description?: string; // Opis modelu
  pricing?: {
    prompt: string; // Cena za prompt token
    completion: string; // Cena za completion token
  };
  context_length?: number; // Maksymalna długość kontekstu
  architecture?: {
    modality: string; // Modality (text, vision, etc.)
    tokenizer: string; // Tokenizer używany
  };
}
```

## 4. Prywatne metody i pola

### 4.1. Metoda `_buildRequestPayload`

Buduje payload żądania zgodnie z parametrami wejściowymi.

**Sygnatura:**

```typescript
private _buildRequestPayload(params: ChatCompletionParams): Record<string, unknown>
```

**Funkcjonalność:**

- Waliduje i formatuje listę wiadomości
- Dodaje format odpowiedzi jeśli określony
- Dodaje parametry modelu (temperature, max_tokens, top_p, itp.)
- Obsługuje metadane żądania

**Implementacja:**

```typescript
private _buildRequestPayload(params: ChatCompletionParams): Record<string, unknown> {
  // Walidacja wiadomości
  if (!Array.isArray(params.messages) || params.messages.length === 0) {
    throw new Error('Messages array is required and cannot be empty');
  }

  // Walidacja roli wiadomości
  const validRoles = ['system', 'user', 'assistant'];
  for (const msg of params.messages) {
    if (!validRoles.includes(msg.role)) {
      throw new Error(`Invalid message role: ${msg.role}. Must be one of: ${validRoles.join(', ')}`);
    }
    if (typeof msg.content !== 'string' || msg.content.trim().length === 0) {
      throw new Error('Message content must be a non-empty string');
    }
  }

  // Buduj payload
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
    if (params.temperature < 0 || params.temperature > 2) {
      throw new Error('Temperature must be between 0 and 2');
    }
    payload.temperature = params.temperature;
  }

  if (params.maxTokens !== undefined) {
    if (params.maxTokens < 1) {
      throw new Error('maxTokens must be at least 1');
    }
    payload.max_tokens = params.maxTokens;
  }

  if (params.topP !== undefined) {
    if (params.topP < 0 || params.topP > 1) {
      throw new Error('topP must be between 0 and 1');
    }
    payload.top_p = params.topP;
  }

  if (params.topK !== undefined) {
    if (params.topK < 1) {
      throw new Error('topK must be at least 1');
    }
    payload.top_k = params.topK;
  }

  if (params.frequencyPenalty !== undefined) {
    if (params.frequencyPenalty < -2 || params.frequencyPenalty > 2) {
      throw new Error('frequencyPenalty must be between -2 and 2');
    }
    payload.frequency_penalty = params.frequencyPenalty;
  }

  if (params.presencePenalty !== undefined) {
    if (params.presencePenalty < -2 || params.presencePenalty > 2) {
      throw new Error('presencePenalty must be between -2 and 2');
    }
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
```

### 4.2. Metoda `_validateResponseFormat`

Waliduje format odpowiedzi (JSON Schema).

**Sygnatura:**

```typescript
private _validateResponseFormat(format: ResponseFormat): void
```

**Funkcjonalność:**

- Sprawdza strukturę response_format
- Waliduje zgodność schematu JSON Schema Draft 7
- Weryfikuje wymagane pola w schemacie

**Implementacja:**

```typescript
private _validateResponseFormat(format: ResponseFormat): void {
  if (format.type !== 'json_schema') {
    throw new Error('responseFormat.type must be "json_schema"');
  }

  if (!format.json_schema) {
    throw new Error('responseFormat.json_schema is required');
  }

  const { name, strict, schema } = format.json_schema;

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    throw new Error('json_schema.name must be a non-empty string');
  }

  if (typeof strict !== 'boolean') {
    throw new Error('json_schema.strict must be a boolean');
  }

  if (!schema || typeof schema !== 'object') {
    throw new Error('json_schema.schema must be an object');
  }

  // Podstawowa walidacja JSON Schema
  if (schema.type !== 'object') {
    throw new Error('json_schema.schema.type must be "object" for structured responses');
  }

  if (!schema.properties || typeof schema.properties !== 'object') {
    throw new Error('json_schema.schema.properties must be defined for object schema');
  }
}
```

### 4.3. Metoda `_makeRequest`

Wykonuje żądanie HTTP do API OpenRouter z obsługą ponownych prób.

**Sygnatura:**

```typescript
private async _makeRequest(endpoint: string, payload: Record<string, unknown>): Promise<Response>
```

**Funkcjonalność:**

- Wykonuje żądanie POST do określonego endpointu
- Obsługuje ponowne próby przy błędach sieciowych
- Zastosowuje timeout dla żądań
- Zwraca odpowiedź z API

**Implementacja:**

```typescript
private async _makeRequest(
  endpoint: string,
  payload: Record<string, unknown>
): Promise<Response> {
  const url = `${this.baseUrl}/${endpoint}`;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);

      const response = await fetch(url, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      lastError = error as Error;

      // Nie ponawiaj przy błędach 4xx (błędy klienta)
      if (error instanceof Response && error.status >= 400 && error.status < 500) {
        throw error;
      }

      // Nie ponawiaj przy ostatniej próbie
      if (attempt === this.maxRetries) {
        break;
      }

      // Czekaj przed kolejną próbą
      await new Promise((resolve) => setTimeout(resolve, this.retryDelay * (attempt + 1)));
    }
  }

  throw new Error(`Request failed after ${this.maxRetries + 1} attempts: ${lastError?.message}`);
}
```

### 4.4. Metoda `_handleResponse`

Obsługuje odpowiedź z API, parsuje JSON i obsługuje błędy.

**Sygnatura:**

```typescript
private async _handleResponse(response: Response): Promise<ChatCompletionResponse>
```

**Funkcjonalność:**

- Parsuje odpowiedź JSON
- Obsługuje błędy API zgodnie ze strukturą OpenRouter
- Rzuca odpowiednie wyjątki dla różnych scenariuszy błędów

**Implementacja:**

```typescript
private async _handleResponse(response: Response): Promise<ChatCompletionResponse> {
  const contentType = response.headers.get('content-type');

  if (!contentType || !contentType.includes('application/json')) {
    const text = await response.text();
    throw new Error(`Unexpected content type: ${contentType}. Response: ${text}`);
  }

  const data = await response.json();

  // Sprawdź błędy API
  if (!response.ok || data.error) {
    const error = data.error || { message: `HTTP ${response.status}`, code: response.status };
    throw new OpenRouterApiError(
      error.message || 'Unknown API error',
      error.code || response.status.toString(),
      error.type || 'api_error',
      response.status
    );
  }

  return data as ChatCompletionResponse;
}
```

### 4.5. Klasa wyjątków `OpenRouterApiError`

Niestandardowa klasa wyjątków dla błędów API OpenRouter.

```typescript
class OpenRouterApiError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly type: string,
    public readonly statusCode: number
  ) {
    super(message);
    this.name = "OpenRouterApiError";
  }
}
```

## 5. Obsługa błędów

### 5.1. Scenariusze błędów

#### 5.1.1. Błąd walidacji klucza API (401 Unauthorized)

**Scenariusz:** Klucz API jest nieprawidłowy, wygasły lub nieaktywny.

**Obsługa:**

```typescript
// W metodzie _handleResponse
if (response.status === 401) {
  throw new OpenRouterApiError("Invalid or expired API key", "401", "authentication_error", 401);
}
```

**Działanie dla dewelopera:**

- Sprawdź poprawność klucza API w zmiennych środowiskowych
- Zweryfikuj, czy klucz API jest aktywny w panelu OpenRouter
- Upewnij się, że klucz API nie został cofnięty lub zablokowany

#### 5.1.2. Błąd walidacji modelu (400 Bad Request)

**Scenariusz:** Podana nazwa modelu jest nieprawidłowa lub nieobsługiwana.

**Obsługa:**

```typescript
// Błąd zwracany przez API
if (response.status === 400 && data.error?.message?.includes("model")) {
  throw new OpenRouterApiError(
    `Invalid model: ${params.model}. Please check available models.`,
    "400",
    "validation_error",
    400
  );
}
```

**Działanie dla dewelopera:**

- Użyj metody `getModels()` do sprawdzenia dostępnych modeli
- Sprawdź dokumentację OpenRouter dla aktualnej listy modeli
- Upewnij się, że nazwa modelu jest w formacie `provider/model-name`

#### 5.1.3. Błąd walidacji response_format (400 Bad Request)

**Scenariusz:** Schemat JSON w response_format jest nieprawidłowy lub nieobsługiwany przez model.

**Obsługa:**

```typescript
// Walidacja przed wysłaniem żądania
private _validateResponseFormat(format: ResponseFormat): void {
  // ... walidacja struktury ...

  // Sprawdź, czy model obsługuje JSON schema
  // Niektóre modele mogą nie obsługiwać strict mode
}
```

**Działanie dla dewelopera:**

- Sprawdź dokumentację modelu pod kątem obsługi JSON Schema
- Upewnij się, że schemat jest zgodny z JSON Schema Draft 7
- Rozważ użycie `strict: false` jeśli model nie obsługuje ścisłego trybu

#### 5.1.4. Przekroczenie limitu żądań (429 Too Many Requests)

**Scenariusz:** Przekroczono limit żądań API (rate limiting).

**Obsługa:**

```typescript
if (response.status === 429) {
  const retryAfter = response.headers.get("Retry-After");
  throw new OpenRouterRateLimitError(
    "Rate limit exceeded. Please wait before making another request.",
    retryAfter ? parseInt(retryAfter, 10) : 60
  );
}
```

**Działanie dla dewelopera:**

- Zaimplementuj exponential backoff między żądaniami
- Monitoruj liczbę żądań i stosuj odpowiednie limity
- Rozważ użycie kolejki żądań dla batch processing

#### 5.1.5. Błąd sieciowy (Network Error)

**Scenariusz:** Brak połączenia z internetem, timeout lub błąd DNS.

**Obsługa:**

```typescript
// W metodzie _makeRequest
catch (error) {
  if (error instanceof TypeError && error.message.includes('fetch')) {
    throw new Error('Network error: Unable to connect to OpenRouter API');
  }
  if (error.name === 'AbortError') {
    throw new Error(`Request timeout after ${this.timeout}ms`);
  }
  throw error;
}
```

**Działanie dla dewelopera:**

- Sprawdź połączenie internetowe
- Zwiększ timeout jeśli żądania są wolne
- Zaimplementuj ponowne próby z exponential backoff (już zaimplementowane)

#### 5.1.6. Błąd parsowania odpowiedzi (500 Internal Server Error)

**Scenariusz:** API zwróciło nieprawidłową odpowiedź JSON lub błąd serwera.

**Obsługa:**

```typescript
try {
  const data = await response.json();
} catch (error) {
  throw new Error(`Failed to parse API response: ${error.message}`);
}
```

**Działanie dla dewelopera:**

- Sprawdź logi API OpenRouter pod kątem problemów
- Skontaktuj się z supportem OpenRouter jeśli błąd się powtarza
- Zaimplementuj fallback mechanism dla krytycznych operacji

#### 5.1.7. Błąd walidacji wiadomości

**Scenariusz:** Lista wiadomości jest pusta, zawiera nieprawidłowe role lub treść.

**Obsługa:**

```typescript
// W metodzie _buildRequestPayload
if (!Array.isArray(params.messages) || params.messages.length === 0) {
  throw new Error("Messages array is required and cannot be empty");
}

for (const msg of params.messages) {
  if (!["system", "user", "assistant"].includes(msg.role)) {
    throw new Error(`Invalid message role: ${msg.role}`);
  }
  if (typeof msg.content !== "string" || msg.content.trim().length === 0) {
    throw new Error("Message content must be a non-empty string");
  }
}
```

### 5.2. Mapowanie błędów na ApiError

Dla integracji z istniejącym systemem obsługi błędów aplikacji:

```typescript
function mapOpenRouterErrorToApiError(error: unknown): ApiError {
  if (error instanceof OpenRouterApiError) {
    // Mapuj kody statusu HTTP na kody ApiError
    if (error.statusCode === 401 || error.statusCode === 403) {
      return {
        error: {
          code: "unauthorized",
          message: error.message,
        },
      };
    }
    if (error.statusCode === 429) {
      return {
        error: {
          code: "too_many_requests",
          message: error.message,
        },
      };
    }
    if (error.statusCode >= 400 && error.statusCode < 500) {
      return {
        error: {
          code: "bad_request",
          message: error.message,
        },
      };
    }
  }

  // Domyślny błąd wewnętrzny
  return {
    error: {
      code: "internal",
      message: error instanceof Error ? error.message : "Unknown error occurred",
    },
  };
}
```

### 5.3. Logowanie błędów

```typescript
private _logError(error: unknown, context: Record<string, unknown>): void {
  const logData = {
    timestamp: new Date().toISOString(),
    service: 'OpenRouterService',
    error: error instanceof Error ? {
      message: error.message,
      stack: error.stack,
      name: error.name,
    } : error,
    context,
  };

  // W środowisku deweloperskim loguj do konsoli
  if (import.meta.env.DEV) {
    console.error('OpenRouterService Error:', logData);
  }

  // W produkcji wysyłaj do systemu logowania (np. Sentry, LogRocket)
  // Logger.error(logData);
}
```

## 6. Kwestie bezpieczeństwa

### 6.1. Ochrona klucza API

**Problema:** Klucz API musi być bezpiecznie przechowywany i nie może być ujawniony w kodzie źródłowym lub logach.

**Rozwiązanie:**

1. **Użycie zmiennych środowiskowych:**
   - Klucz API powinien być przechowywany w pliku `.env` (dodany do `.gitignore`)
   - Użyj `import.meta.env.OPENROUTER_API_KEY` w Astro
   - Nigdy nie commituj pliku `.env` do repozytorium

2. **Przykład konfiguracji:**

```env
# .env (dodaj do .gitignore)
OPENROUTER_API_KEY=sk-or-v1-xxxxxxxxxxxxxxxxxxxxx
```

```typescript
// src/env.d.ts - rozszerz typy dla zmiennych środowiskowych
/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly OPENROUTER_API_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
```

3. **Walidacja w konstruktorze:**
   - Sprawdź, czy klucz API jest ustawiony przed utworzeniem instancji
   - Rzuć wyjątek jeśli klucz jest pusty lub nieprawidłowy

### 6.2. Walidacja danych wejściowych

**Problema:** Nieprawidłowe dane wejściowe mogą prowadzić do błędów API lub ataków typu injection.

**Rozwiązanie:**

1. **Walidacja wiadomości:**
   - Sprawdź, czy lista wiadomości nie jest pusta
   - Waliduj role wiadomości (tylko 'system', 'user', 'assistant')
   - Sprawdź, czy treść wiadomości jest niepustym stringiem
   - Ogranicz długość wiadomości (np. maksymalnie 1M znaków)

2. **Walidacja parametrów modelu:**
   - Sprawdź zakresy wartości (temperature: 0-2, top_p: 0-1, itp.)
   - Waliduj max_tokens (minimalna wartość: 1, maksymalna zgodna z limitami modelu)

3. **Walidacja response_format:**
   - Sprawdź strukturę JSON Schema
   - Waliduj zgodność z JSON Schema Draft 7
   - Ogranicz głębokość zagnieżdżenia schematu

**Implementacja:**

```typescript
private _validateInput(params: ChatCompletionParams): void {
  // Walidacja wiadomości
  if (!Array.isArray(params.messages) || params.messages.length === 0) {
    throw new Error('Messages array is required and cannot be empty');
  }

  const MAX_MESSAGE_LENGTH = 1_000_000; // 1M znaków
  for (const msg of params.messages) {
    if (typeof msg.content !== 'string') {
      throw new Error('Message content must be a string');
    }
    if (msg.content.length === 0) {
      throw new Error('Message content cannot be empty');
    }
    if (msg.content.length > MAX_MESSAGE_LENGTH) {
      throw new Error(`Message content exceeds maximum length of ${MAX_MESSAGE_LENGTH} characters`);
    }
  }

  // Walidacja modelu
  if (typeof params.model !== 'string' || params.model.trim().length === 0) {
    throw new Error('Model name is required and must be a non-empty string');
  }

  // Walidacja parametrów numerycznych
  this._validateNumericParam(params.temperature, 0, 2, 'temperature');
  this._validateNumericParam(params.topP, 0, 1, 'topP');
  this._validateNumericParam(params.maxTokens, 1, undefined, 'maxTokens');
}

private _validateNumericParam(
  value: number | undefined,
  min: number,
  max: number | undefined,
  paramName: string
): void {
  if (value === undefined) {
    return;
  }

  if (typeof value !== 'number' || isNaN(value)) {
    throw new Error(`${paramName} must be a valid number`);
  }

  if (value < min) {
    throw new Error(`${paramName} must be at least ${min}`);
  }

  if (max !== undefined && value > max) {
    throw new Error(`${paramName} must be at most ${max}`);
  }
}
```

### 6.3. Ochrona przed atakami

**6.3.1. Rate Limiting:**

- Zaimplementuj rate limiting po stronie aplikacji
- Monitoruj liczbę żądań per użytkownik/IP
- Stosuj exponential backoff przy błędach 429

**6.3.2. Timeout Protection:**

- Ustaw rozsądny timeout dla żądań (domyślnie 30s)
- Zapobiegaj długotrwałym żądaniom blokującym zasoby

**6.3.3. Input Sanitization:**

- Nie wysyłaj wrażliwych danych (hasła, tokeny) w wiadomościach
- Rozważ filtrowanie lub redakcję danych osobowych przed wysłaniem do API

**6.3.4. Error Message Sanitization:**

- Nie ujawniaj szczegółowych informacji o błędach użytkownikom końcowym
- Loguj szczegóły błędów tylko po stronie serwera

### 6.4. Monitoring i audyt

1. **Logowanie żądań:**
   - Loguj metadane żądań (model, długość wiadomości, timestamp)
   - Nie loguj treści wiadomości ani kluczy API
   - Użyj correlation IDs dla śledzenia żądań

2. **Metryki:**
   - Monitoruj liczbę żądań API
   - Śledź czas odpowiedzi
   - Monitoruj błędy i rate limits

## 7. Plan wdrożenia krok po kroku

### Krok 1: Przygotowanie zmiennych środowiskowych

1. Utwórz plik `.env` w katalogu głównym projektu (jeśli nie istnieje)
2. Dodaj klucz API OpenRouter:

```env
OPENROUTER_API_KEY=sk-or-v1-your-api-key-here
```

3. Utwórz plik `.env.example` jako szablon:

```env
OPENROUTER_API_KEY=sk-or-v1-xxxxxxxxxxxxxxxxxxxxx
```

4. Zaktualizuj `src/env.d.ts`:

```typescript
/// <reference types="astro/client" />

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./db/database.types.ts";

declare global {
  namespace App {
    interface Locals {
      supabase: SupabaseClient<Database>;
    }
  }
}

interface ImportMetaEnv {
  readonly OPENROUTER_API_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
```

### Krok 2: Utworzenie struktury plików

1. Utwórz główny plik serwisu: `src/lib/services/openrouter.service.ts`
2. Utwórz plik z typami: `src/lib/services/openrouter.types.ts`
3. Utwórz plik z wyjątkami: `src/lib/services/openrouter.errors.ts`
4. Utwórz plik z pomocniczymi funkcjami: `src/lib/services/openrouter.utils.ts`

### Krok 3: Implementacja typów

W pliku `src/lib/services/openrouter.types.ts`:

```typescript
// Typy dla wiadomości
export interface Message {
  role: "system" | "user" | "assistant";
  content: string;
}

// Typy dla response format
export interface ResponseFormat {
  type: "json_schema";
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
    finish_reason: "stop" | "length" | "tool_calls" | "content_filter" | null;
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
  [key: string]: unknown;
}
```

### Krok 4: Implementacja wyjątków

W pliku `src/lib/services/openrouter.errors.ts`:

```typescript
export class OpenRouterApiError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly type: string,
    public readonly statusCode: number
  ) {
    super(message);
    this.name = "OpenRouterApiError";
    Object.setPrototypeOf(this, OpenRouterApiError.prototype);
  }
}

export class OpenRouterRateLimitError extends OpenRouterApiError {
  constructor(
    message: string,
    public readonly retryAfter: number
  ) {
    super(message, "429", "rate_limit_error", 429);
    this.name = "OpenRouterRateLimitError";
    Object.setPrototypeOf(this, OpenRouterRateLimitError.prototype);
  }
}

export class OpenRouterValidationError extends Error {
  constructor(
    message: string,
    public readonly field?: string
  ) {
    super(message);
    this.name = "OpenRouterValidationError";
    Object.setPrototypeOf(this, OpenRouterValidationError.prototype);
  }
}
```

### Krok 5: Implementacja głównej klasy serwisu

W pliku `src/lib/services/openrouter.service.ts`:

1. **Importy i eksport klasy:**

```typescript
import type {
  OpenRouterConfig,
  ChatCompletionParams,
  ChatCompletionResponse,
  Message,
  ResponseFormat,
  Model,
} from "./openrouter.types.ts";
import { OpenRouterApiError, OpenRouterRateLimitError, OpenRouterValidationError } from "./openrouter.errors.ts";
```

2. **Implementacja konstruktora** (zgodnie z sekcją 2)

3. **Implementacja publicznych metod** (zgodnie z sekcją 3)

4. **Implementacja prywatnych metod** (zgodnie z sekcją 4)

### Krok 6: Utworzenie instancji serwisu (singleton pattern)

Utwórz plik `src/lib/services/openrouter.client.ts`:

```typescript
import { OpenRouterService } from "./openrouter.service.ts";
import type { OpenRouterConfig } from "./openrouter.types.ts";

let serviceInstance: OpenRouterService | null = null;

/**
 * Pobiera singleton instancję OpenRouterService
 * Tworzy nową instancję przy pierwszym wywołaniu
 */
export function getOpenRouterService(): OpenRouterService {
  if (!serviceInstance) {
    const apiKey = import.meta.env.OPENROUTER_API_KEY;

    if (!apiKey) {
      throw new Error("OPENROUTER_API_KEY environment variable is not set. " + "Please add it to your .env file.");
    }

    const config: OpenRouterConfig = {
      apiKey,
      baseUrl: import.meta.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1",
      referer: import.meta.env.OPENROUTER_REFERER,
      appTitle: import.meta.env.OPENROUTER_APP_TITLE || "DoFIRE App",
      timeout: parseInt(import.meta.env.OPENROUTER_TIMEOUT || "30000", 10),
      maxRetries: parseInt(import.meta.env.OPENROUTER_MAX_RETRIES || "3", 10),
      retryDelay: parseInt(import.meta.env.OPENROUTER_RETRY_DELAY || "1000", 10),
    };

    serviceInstance = new OpenRouterService(config);
  }

  return serviceInstance;
}
```

### Krok 7: Integracja z systemem obsługi błędów

Zaktualizuj `src/lib/utils/api-error-handler.ts`:

```typescript
import { OpenRouterApiError } from "../services/openrouter.errors.ts";
import type { ApiError } from "@/types.ts";

export function mapOpenRouterErrorToApiError(error: unknown): ApiError {
  if (error instanceof OpenRouterApiError) {
    if (error.statusCode === 401 || error.statusCode === 403) {
      return {
        error: {
          code: "unauthorized",
          message: "Authentication failed with AI service",
        },
      };
    }
    if (error.statusCode === 429) {
      return {
        error: {
          code: "too_many_requests",
          message: "Rate limit exceeded. Please try again later.",
        },
      };
    }
    if (error.statusCode >= 400 && error.statusCode < 500) {
      return {
        error: {
          code: "bad_request",
          message: error.message,
        },
      };
    }
  }

  return {
    error: {
      code: "internal",
      message: error instanceof Error ? error.message : "Unknown error occurred",
    },
  };
}
```

### Krok 8: Przykład użycia w endpointzie API

Utwórz przykładowy endpoint `src/pages/api/v1/test/openrouter.ts`:

```typescript
import type { APIRoute } from "astro";
import { getOpenRouterService } from "@/lib/services/openrouter.client.ts";
import { mapOpenRouterErrorToApiError } from "@/lib/utils/api-error-handler.ts";
import type { ApiError } from "@/types.ts";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    const service = getOpenRouterService();
    const body = await request.json();

    const response = await service.chatCompletion({
      messages: body.messages || [
        { role: "system", content: "You are a helpful assistant." },
        { role: "user", content: "Hello!" },
      ],
      model: body.model || "openai/gpt-4o",
      temperature: body.temperature,
      maxTokens: body.maxTokens,
      responseFormat: body.responseFormat,
    });

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    const apiError: ApiError = mapOpenRouterErrorToApiError(error);
    const statusCode = error instanceof OpenRouterApiError ? error.statusCode : 500;

    return new Response(JSON.stringify(apiError), {
      status: statusCode,
      headers: { "Content-Type": "application/json" },
    });
  }
};
```

### Krok 9: Testowanie

1. **Testy jednostkowe:**

Utwórz plik `src/lib/services/__tests__/openrouter.service.test.ts`:

```typescript
import { describe, it, expect, beforeEach, vi } from "vitest";
import { OpenRouterService } from "../openrouter.service.ts";
import { OpenRouterApiError } from "../openrouter.errors.ts";

describe("OpenRouterService", () => {
  let service: OpenRouterService;

  beforeEach(() => {
    service = new OpenRouterService({
      apiKey: "test-api-key",
    });
  });

  it("should throw error if API key is missing", () => {
    expect(() => {
      new OpenRouterService({ apiKey: "" });
    }).toThrow("OpenRouter API key is required");
  });

  it("should validate messages array", async () => {
    await expect(
      service.chatCompletion({
        messages: [],
        model: "openai/gpt-4o",
      })
    ).rejects.toThrow("Messages array is required and cannot be empty");
  });

  it("should validate message roles", async () => {
    await expect(
      service.chatCompletion({
        messages: [{ role: "invalid" as any, content: "Test" }],
        model: "openai/gpt-4o",
      })
    ).rejects.toThrow("Invalid message role");
  });

  // Dodaj więcej testów...
});
```

2. **Testy integracyjne:**

Przetestuj rzeczywiste wywołania API (używaj testowego klucza API):

```typescript
describe("OpenRouterService Integration", () => {
  it("should make a successful API call", async () => {
    const service = new OpenRouterService({
      apiKey: process.env.OPENROUTER_API_KEY!,
    });

    const response = await service.chatCompletion({
      messages: [{ role: "user", content: "Say hello" }],
      model: "openai/gpt-4o",
      maxTokens: 10,
    });

    expect(response).toHaveProperty("choices");
    expect(response.choices.length).toBeGreaterThan(0);
  });
});
```

### Krok 10: Dokumentacja i code review

1. **Dodaj JSDoc komentarze** do wszystkich publicznych metod
2. **Zweryfikuj zgodność z linterem** (`npm run lint`)
3. **Sprawdź typy TypeScript** (`npm run type-check`)
4. **Zaktualizuj README** z instrukcjami konfiguracji OpenRouter

### Krok 11: Wdrożenie do środowiska staging

1. Ustaw zmienne środowiskowe w środowisku staging
2. Zweryfikuj działanie usługi
3. Monitoruj logi pod kątem błędów
4. Testuj różne scenariusze użycia

### Krok 12: Wdrożenie do produkcji

1. Ustaw zmienne środowiskowe w produkcji
2. Wdróż zmiany przez CI/CD pipeline
3. Monitoruj metryki i logi
4. Przygotuj plan rollback w przypadku problemów

## 8. Przykłady użycia

### Przykład 1: Podstawowy czat

```typescript
import { getOpenRouterService } from "@/lib/services/openrouter.client.ts";

const service = getOpenRouterService();

const response = await service.chatCompletion({
  messages: [
    {
      role: "system",
      content: "You are a financial advisor helping users with FIRE calculations.",
    },
    {
      role: "user",
      content: "What is my FIRE number if I spend $3000 per month?",
    },
  ],
  model: "openai/gpt-4o",
  temperature: 0.7,
  maxTokens: 500,
});

const answer = response.choices[0].message.content;
console.log(answer);
```

### Przykład 2: Ustrukturyzowana odpowiedź JSON

```typescript
const response = await service.chatCompletion({
  messages: [
    {
      role: "system",
      content: "Analyze the investment portfolio and provide structured feedback.",
    },
    {
      role: "user",
      content: "Portfolio: 60% stocks, 30% bonds, 10% cash. Provide analysis.",
    },
  ],
  model: "openai/gpt-4o",
  responseFormat: {
    type: "json_schema",
    json_schema: {
      name: "portfolio_analysis",
      strict: true,
      schema: {
        type: "object",
        properties: {
          risk_level: {
            type: "string",
            enum: ["low", "medium", "high"],
            description: "Overall risk level of the portfolio",
          },
          recommendation: {
            type: "string",
            description: "Recommendation for portfolio adjustment",
          },
          diversification_score: {
            type: "number",
            minimum: 0,
            maximum: 100,
            description: "Diversification score from 0 to 100",
          },
          suggested_allocation: {
            type: "object",
            properties: {
              stocks: { type: "number", minimum: 0, maximum: 100 },
              bonds: { type: "number", minimum: 0, maximum: 100 },
              cash: { type: "number", minimum: 0, maximum: 100 },
            },
            required: ["stocks", "bonds", "cash"],
            additionalProperties: false,
          },
        },
        required: ["risk_level", "recommendation", "diversification_score", "suggested_allocation"],
        additionalProperties: false,
      },
    },
  },
  temperature: 0.3,
  maxTokens: 400,
});

// Parse JSON response
const analysis = JSON.parse(response.choices[0].message.content);
console.log("Risk Level:", analysis.risk_level);
console.log("Recommendation:", analysis.recommendation);
console.log("Diversification Score:", analysis.diversification_score);
```

### Przykład 3: Konwersacja z kontekstem

```typescript
const messages: Message[] = [
  {
    role: "system",
    content: "You are a financial advisor. Keep responses concise (max 200 words).",
  },
];

// Pierwsza wiadomość użytkownika
messages.push({
  role: "user",
  content: "I want to achieve FIRE. Where should I start?",
});

const response1 = await service.chatCompletion({
  messages,
  model: "openai/gpt-4o",
  temperature: 0.7,
  maxTokens: 300,
});

// Dodaj odpowiedź asystenta do kontekstu
messages.push(response1.choices[0].message);

// Druga wiadomość użytkownika (kontynuacja konwersacji)
messages.push({
  role: "user",
  content: "How much should I save per month if I want to retire in 15 years?",
});

const response2 = await service.chatCompletion({
  messages,
  model: "openai/gpt-4o",
  temperature: 0.7,
  maxTokens: 300,
});

console.log("Follow-up answer:", response2.choices[0].message.content);
```

### Przykład 4: Różne modele dla różnych zadań

```typescript
// Szybki i tani model dla prostych pytań
const quickResponse = await service.chatCompletion({
  messages: [{ role: "user", content: "What is FIRE?" }],
  model: "openai/gpt-3.5-turbo",
  maxTokens: 100,
});

// Zaawansowany model dla złożonych analiz
const detailedResponse = await service.chatCompletion({
  messages: [
    {
      role: "system",
      content: "You are an expert financial analyst. Provide detailed analysis.",
    },
    {
      role: "user",
      content: "Analyze my portfolio: 50% VTI, 30% BND, 20% cash. Provide detailed recommendations.",
    },
  ],
  model: "openai/gpt-4o",
  temperature: 0.5,
  maxTokens: 800,
});
```

### Przykład 5: Obsługa błędów w endpointzie

```typescript
import type { APIRoute } from "astro";
import { getOpenRouterService } from "@/lib/services/openrouter.client.ts";
import { OpenRouterApiError } from "@/lib/services/openrouter.errors.ts";
import { mapOpenRouterErrorToApiError } from "@/lib/utils/api-error-handler.ts";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    const service = getOpenRouterService();
    const body = await request.json();

    // Walidacja wejścia
    if (!body.messages || !Array.isArray(body.messages)) {
      return new Response(
        JSON.stringify({
          error: {
            code: "bad_request",
            message: "Messages array is required",
          },
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const response = await service.chatCompletion({
      messages: body.messages,
      model: body.model || "openai/gpt-4o",
      temperature: body.temperature,
      maxTokens: body.maxTokens,
      responseFormat: body.responseFormat,
    });

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    // Mapuj błędy OpenRouter na ApiError
    const apiError = mapOpenRouterErrorToApiError(error);
    const statusCode = error instanceof OpenRouterApiError ? error.statusCode : 500;

    // Loguj szczegóły błędu (tylko po stronie serwera)
    console.error("OpenRouter API Error:", {
      error: error instanceof Error ? error.message : error,
      statusCode,
    });

    return new Response(JSON.stringify(apiError), {
      status: statusCode,
      headers: { "Content-Type": "application/json" },
    });
  }
};
```

## 9. Uwagi końcowe

### 9.1. Wydajność

- **Caching:** Rozważ cachowanie odpowiedzi dla powtarzających się zapytań
- **Batch Processing:** Dla wielu żądań rozważ użycie kolejki z kontrolowanym rate limitingiem
- **Timeout:** Ustaw rozsądne timeouty aby uniknąć długotrwałych blokad

### 9.2. Koszty

- **Monitoring:** Monitoruj użycie tokenów i koszty API
- **Model Selection:** Wybieraj odpowiednie modele dla zadań (tańsze dla prostych, droższe dla złożonych)
- **Token Management:** Optymalizuj długość wiadomości i max_tokens

### 9.3. Rozszerzalność

- **Streaming:** Implementacja streaming jest możliwa przez ustawienie `stream: true`
- **Function Calling:** Niektóre modele obsługują function calling - rozważ dodanie wsparcia w przyszłości
- **Multi-modal:** Niektóre modele obsługują obrazy - można rozszerzyć interfejs Message

### 9.4. Kompatybilność

- Usługa jest zgodna z API OpenRouter i powinna działać z wszystkimi obsługiwanymi modelami
- Sprawdź dokumentację OpenRouter dla aktualizacji API i nowych funkcji
- Upewnij się, że wybrany model obsługuje wymagane funkcje (np. JSON Schema)
