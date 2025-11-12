# API Endpoint Implementation Plan: POST `/v1/investments`

## 1. Przegląd punktu końcowego

Endpoint `POST /v1/investments` umożliwia autoryzowanemu użytkownikowi dodanie nowej inwestycji do swojego portfela. Operacja zapisuje rekord w tabeli `public.investments`, automatycznie przypisując `user_id` z tokenu Supabase. RLS gwarantuje, że użytkownicy widzą i modyfikują jedynie własne dane.

**Cele funkcjonalne:**
- Walidacja wejścia zgodnie ze specyfikacją API oraz ograniczeniami bazy (`asset_type`, `amount > 0`, `acquired_at <= current_date`, długość `notes`).
- Uzupełnienie danych serwerowych (`id`, `created_at`, `updated_at`, `user_id`) podczas tworzenia rekordu.
- Zwrócenie kompletnego `InvestmentDto` z kodem `201 Created`.
- Spójna obsługa błędów walidacji i błędów Supabase (mapowanie na `400/401/500`).

**Powiązane zasoby:**
- Tabela: `public.investments`
- Typ ENUM: `asset_type` (`etf`, `bond`, `stock`, `cash`)
- Widok agregujący `v_investments_agg` (pośrednio aktualizowany po dodaniu rekordu)
- Typy transportowe: `CreateInvestmentCommand`, `InvestmentDto`, `ApiError`

---

## 2. Szczegóły żądania

- **Metoda HTTP:** `POST`
- **Struktura URL:** `/v1/investments`
- **Nagłówki:**
  - Wymagane: `Authorization: Bearer <JWT>` (Supabase session token), `Content-Type: application/json`
  - Opcjonalne: `Idempotency-Key`, `Accept-Language`, `X-Request-Id`
- **Parametry ścieżki/query:** brak
- **Body JSON (`CreateInvestmentCommand`):**
  ```json
  {
    "type": "bond",
    "amount": 5000.00,
    "acquired_at": "2025-01-10",
    "notes": "COI 4-letnie"
  }
  ```

**Pola:**
- `type` *(string, wymagane)* – jedna z wartości ENUM `etf|bond|stock|cash`
- `amount` *(number, wymagane)* – wartość dodatnia (`> 0`), skończona, z maks. dwoma miejscami po przecinku (walidacja aplikacyjna + CHECK w DB)
- `acquired_at` *(string, wymagane)* – data w formacie `YYYY-MM-DD`, nie późniejsza niż dzień bieżący
- `notes` *(string | null, opcjonalne)* – po trimie długość 1–1000 znaków; puste lub whitespace traktowane jako `null`

---

## 3. Wykorzystywane typy

- **Command/DTO z `src/types.ts`:**
  ```typescript
  type CreateInvestmentCommand = {
    type: AssetType;
    amount: number;
    acquired_at: ISODateString;
    notes?: string | null;
  };

  type InvestmentDto = Omit<Tables<"investments">, "user_id">;
  ```
- **Walidacja (Zod) – nowy schemat w `src/lib/validation/investments.ts`:**
  ```typescript
  const createInvestmentSchema = z.object({
    type: z.enum(["etf", "bond", "stock", "cash"]),
    amount: z.number().positive().finite().max(999999999999.99),
    acquired_at: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .transform((value) => ({ value, date: new Date(value + "T00:00:00Z") }))
      .superRefine(({ date }, ctx) => {
        const today = new Date();
        if (Number.isNaN(date.getTime())) {
          ctx.addIssue({ code: "custom", message: "invalid_date" });
          return;
        }
        if (date > new Date(today.toISOString().slice(0, 10) + "T00:00:00Z")) {
          ctx.addIssue({ code: "custom", message: "acquired_at_cannot_be_future" });
        }
      })
      .transform(({ value }) => value),
    notes: z
      .string()
      .trim()
      .max(1000)
      .refine((val) => val.length > 0, { message: "notes_cannot_be_empty" })
      .optional()
      .transform((val) => (val && val.length > 0 ? val : undefined)),
  });
  ```
  *Notatka:* Utrzymuj pojedynczą definicję schematu – eksportuj zarówno schemat, jak i wyprowadzony typ `CreateInvestmentInput`.

- **Usługa domenowa:** utworzyć `src/lib/services/investments.service.ts` z funkcją `createInvestment`, która przyjmuje kontekst Supabase (`SupabaseClient<Database>`) i `CreateInvestmentCommand`.

---

## 4. Szczegóły odpowiedzi

- **Sukces (`201 Created`):**
  - Body (JSON): `InvestmentDto` zawierający `id`, `type`, `amount`, `acquired_at`, `notes`, `created_at`, `updated_at`
  - Nagłówki: `Content-Type: application/json`; opcjonalnie `Location: /v1/investments/{id}`; jeżeli wykorzystujemy `Idempotency-Key`, dodaj `Idempotency-Key` echo

- **Błędy (`ApiError` envelope):**
  - `400 Bad Request` – walidacja danych wejściowych (Zod) lub naruszenie constraint (Supabase error code `23514`, `22P02`, `42501` etc.)
  - `401 Unauthorized` – brak/niepoprawny token, `supabase.auth.getUser()` zwraca błąd
  - `500 Internal Server Error` – inne nieoczekiwane błędy (Supabase outage, wyjątek runtime)

---

## 5. Przepływ danych

1. **Middleware (`src/middleware/index.ts`)** osadza `supabase` w `context.locals`.
2. **Route handler** (`src/pages/api/v1/investments/index.ts`):
   - Parsuje JSON (z limitowaniem rozmiaru jeśli Astro wspiera) i przeprowadza walidację Zod.
   - Pozyskuje użytkownika: `const { data: { user }, error } = await supabase.auth.getUser(authHeaderToken)`.
   - Tworzy `CreateInvestmentCommand` (po trimowaniu `notes`).
3. **Service layer** (`createInvestment`):
   - Buduje payload `TablesInsert<"investments">` (`{ ...command, user_id: user.id }`).
   - Wywołuje `supabase.from("investments").insert(insertPayload).select().single()`.
   - Konwertuje wynik na `InvestmentDto` poprzez `toInvestmentDto`.
   - Mapuje znane błędy Supabase (np. violation constraints) na kontrolowane wyjątki.
4. **Handler**:
   - Przy sukcesie → `201` z JSON-em.
   - Przy błędach walidacji → `400` z `fields`.
   - Przy błędach autoryzacji → `401`.
   - Inne → `500`, loguje zdarzenie (z `X-Request-Id` jeśli dostępny).
5. **Klient** otrzymuje odpowiedź; na poziomie widoku `v_investments_agg` zmiany będą widoczne przy kolejnym odczycie.

---

## 5. Względy bezpieczeństwa

- **Uwierzytelnianie:** Wymagaj ważnego tokenu Supabase w nagłówku `Authorization`. Odpytywanie `supabase.auth.getUser()` z przekazanym tokenem weryfikuje sesję.
- **Autoryzacja:** Nie pozwalaj klientowi przesyłać `user_id`; rely on RLS z kontem użytkownika. Nigdy nie używaj klucza serwisowego w kontekście użytkownika.
- **Walidacja danych:** Zod + trimming tekstu, filtracja dat i liczb (zapobiega SQL injection / DoS). Odrzucaj rekordy z `notes` > 1000 znaków.
- **Ochrona przed powtórzeniami:** Opcjonalnie honoruj nagłówek `Idempotency-Key` (np. mapowanie na redis/cache) – opisać w backlogu. Na razie powtarzane żądania mogą duplikować rekordy; rozważ przyszłe rozszerzenie.
- **Logging & observability:** Loguj wszystkie błędy (`console.error` + `X-Request-Id`). Upewnij się, że logi nie zawierają danych wrażliwych (kwoty są dozwolone).
- **Ochrona przed nadużyciami:** Możliwość wprowadzenia rate limitów na poziomie CDN/Edge w kolejnych iteracjach.

---

## 6. Obsługa błędów

- **Walidacja wejścia (ZodError):** Zwróć `400` z `fields` wskazującym konkretne pole i kod błędu (np. `amount: "amount_must_be_positive"`).
- **Brak autoryzacji:** Jeśli `authHeader` pusty lub Supabase zwraca `authError`, zakończ `401` (`code: "unauthorized"`).
- **Constraint violations:** Mapuj kody Supabase / Postgres:
  - `23514` (CHECK) → `400` z komunikatem zależnym od pola (`acquired_at_cannot_be_future`, `amount_must_be_positive`).
  - `22P02` (invalid_date) → `400`.
- **Problemy infrastrukturalne:** Supabase downtime, sieć → loguj i zwracaj `500` z komunikatem ogólnym (`code: "internal"`).
- **Brak dedykowanej tabeli logów:** Na ten moment logowanie serwerowe. Jeżeli w przyszłości pojawi się tabela błędów, w serwisie dodaj hook rejestrujący wpis.

---

## 7. Wydajność

- **Zapis pojedynczego rekordu** – operacja O(1); używa indeksu `investments_user_id_idx` do RLS.
- **Minimalizacja roundtrips:** Użyj `insert(...).select().single()` w jednym zapytaniu.
- **Walidacja lokalna:** Odrzucaj błędne żądania zanim trafią do bazy (zmniejsza obciążenie DB).
- **Payload size:** Limit `notes` do 1000 znaków; to także chroni przed niepotrzebnym ruchem.
- **Monitoring:** Dodać metryki (czas odpowiedzi, liczba błędów) jeśli w projekcie dostępny jest mechanizm telemetryczny.

---

## 8. Kroki implementacji

1. **Struktura katalogów:** Utwórz (jeśli brak) `src/pages/api/v1/investments/index.ts`, `src/lib/services/investments.service.ts`, `src/lib/validation/investments.ts`.
2. **Walidacja:** Zaimplementuj schemat Zod + eksport typu wyjściowego. Dodaj normalizację `notes`.
3. **Serwis:** W `createInvestment` zaimplementuj logikę:
   - parametr: `{ supabase, userId, payload }`
   - budowanie `TablesInsert`
   - obsługa Supabase `insert` + mapowanie błędów (wrap w `try/catch`).
4. **Handler:** W pliku routingu:
   - Waliduj nagłówki (`Authorization`), rzuć `401` jeśli brak.
   - Użyj `context.locals.supabase`. Przypisz token do klienta (`supabase.auth.setSession({ access_token })` lub `setAuth` zależnie od SDK).
   - Wywołaj `createInvestment`.
   - Zbuduj odpowiedź `201` z JSON-em.
   - Obsłuż `Idempotency-Key` (na razie echo w odpowiedzi + TODO).
5. **Błędy:** Dodaj helper `mapSupabaseErrorToApiError`. Upewnij się, że `fields` w odpowiedziach 400 są spójne.
6. **Testy manualne / otomatis:** Przygotuj kolekcję (np. Thunder Client/Insomnia) lub testy jednostkowe (Vitest) dla walidacji schematu i mapowania błędów.
7. **Dokumentacja:** Uaktualnij README/Swagger (jeśli istnieje) oraz checklistę QA. Opcjonalnie dodaj wpis do changelog.

---

> Po wdrożeniu endpointu przetestuj przypadki: poprawny zapis, amount <= 0, data w przyszłości, notes = whitespace, brak tokenu, powtarzające się żądania z tym samym payloadem.

