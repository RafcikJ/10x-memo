# Plan wdrożenia usługi OpenRouter (Chat Completions) – Astro + TypeScript + Supabase

## 1. Opis usługi

Usługa **OpenRouterChatService** to warstwa serwisowa po stronie serwera, która:

- wysyła żądania do **OpenRouter Chat Completions** (API kompatybilne z OpenAI),
- zapewnia spójne budowanie wiadomości (system/user/assistant),
- wspiera **ustrukturyzowane odpowiedzi** przez `response_format` (JSON Schema),
- kontroluje koszt i stabilność (timeouty, retry, limity tokenów, walidacja odpowiedzi),
- integruje się z architekturą projektu: **Astro API routes** (`src/pages/api/**`) + **Supabase locals** (`context.locals.supabase`, `context.locals.user`) + **Zod** do walidacji.

### 1.1. Kluczowe komponenty usługi (cel + funkcjonalność + wyzwania + rozwiązania)

1. **Warstwa konfiguracji (Config)**
   - **Cel**: centralne zarządzanie ustawieniami OpenRouter i domyślnymi parametrami modelu.
   - **Funkcjonalność**:
     - przechowuje `apiKey`, `baseUrl`, `appUrl`, `appTitle`,
     - domyślne `model`, parametry generacji, limity, timeouty,
     - możliwość override per request.
   - **Wyzwania**:
     1. Rozjazd konfiguracji między środowiskami (dev/prod).
     2. Przypadkowe wyniesienie klucza API na frontend.
   - **Rozwiązania (niezależne od technologii)**:
     1. Utrzymywać jedną “źródłową” definicję konfiguracji z sensownymi defaultami + walidacją przy starcie.
     2. Trzymać sekret wyłącznie po stronie serwera; nigdy nie serializować go do HTML/JS klienta.

2. **Budowniczy wiadomości (Message Builder)**
   - **Cel**: spójne i bezpieczne składanie `messages[]` w formacie chatowym.
   - **Funkcjonalność**:
     - buduje komunikat systemowy i użytkownika,
     - normalizuje/sanitizuje treści (np. trim, limity długości),
     - wspiera historię rozmowy.
   - **Wyzwania**:
     1. Prompt injection / nadpisanie instrukcji systemowych przez user content.
     2. Zbyt długa historia → przekroczenie limitu kontekstu.
   - **Rozwiązania**:
     1. Stosować niezmienny system prompt + dołączać dane użytkownika jako “input”, nie “instructions”; oddzielać role.
     2. Wprowadzić strategię przycinania historii (np. “windowing”, streszczenie, limit tokenów/znaków).

3. **Klient HTTP do OpenRouter (Transport)**
   - **Cel**: niezawodne wykonywanie requestów z timeoutem i identyfikacją.
   - **Funkcjonalność**:
     - wysyła POST do `/chat/completions`,
     - ustawia nagłówki `Authorization`, `HTTP-Referer`, `X-Title`,
     - timeout przez `AbortController`,
     - parsuje JSON i mapuje błędy.
   - **Wyzwania**:
     1. Timeouty / niestabilność sieci.
     2. 429/5xx oraz retry storm.
   - **Rozwiązania**:
     1. Stosować timeout + jednoznaczne kody błędów + idempotentne retry.
     2. Retry z wykładniczym backoff + jitter; ograniczyć liczbę prób; respektować `Retry-After`.

4. **Warstwa kontraktu danych (DTO + walidacja)**
   - **Cel**: walidować wejście/wyjście i utrzymać stabilny kontrakt API dla frontendu.
   - **Funkcjonalność**:
     - walidacja requestów do własnych endpointów (Zod),
     - walidacja odpowiedzi modelu (szczególnie przy `response_format`),
     - normalizacja odpowiedzi do DTO.
   - **Wyzwania**:
     1. Model zwraca niepoprawny JSON lub niezgodny ze schematem.
     2. Zmiany w promptach psują konsumentów.
   - **Rozwiązania**:
     1. Wymuszać `strict: true` + dodatkowo walidować po stronie serwera; w razie niespójności retry lub fallback.
     2. Wersjonować schematy i endpointy; trzymać schematy blisko kodu (single source of truth).

5. **Polityki generacji (Model & Params Policy)**
   - **Cel**: kontrola jakości, kosztu i deterministyczności odpowiedzi.
   - **Funkcjonalność**:
     - domyślne parametry (`temperature`, `max_tokens`, itp.),
     - whitelist/allowlist modeli per use-case (np. “cheap”, “quality”),
     - limity na input/output.
   - **Wyzwania**:
     1. Model w danym momencie niedostępny / zmienne ceny i limity.
     2. Odpowiedzi zbyt “kreatywne” lub niespójne (szczególnie JSON).
   - **Rozwiązania**:
     1. Wprowadzić fallback modelowy + możliwość ręcznego override z konfiguracji.
     2. Dla JSON: obniżyć temperaturę, wymusić structured output, walidować i retry.

6. **Obsługa błędów i mapowanie na odpowiedzi API**
   - **Cel**: spójne, przewidywalne błędy dla frontendu.
   - **Funkcjonalność**:
     - mapuje błędy OpenRouter/HTTP na kody (400/401/429/500),
     - zwraca użytkowe komunikaty + `retry_after`/`reset_at` gdzie ma sens.
   - **Wyzwania**:
     1. Nieprzewidywalne formaty błędów upstream.
     2. Zbyt “szczegółowe” błędy → wyciek informacji.
   - **Rozwiązania**:
     1. Utrzymać własną warstwę error types + defensywne parsowanie.
     2. Logować szczegóły tylko po stronie serwera; klientowi zwracać bezpieczne komunikaty.

7. **Integracja z Supabase (Auth + quota + audyt)**
   - **Cel**: egzekwować dostęp i limity per użytkownik.
   - **Funkcjonalność**:
     - używa `context.locals.user` do identyfikacji,
     - konsumuje quota (analogicznie jak istniejący limit generacji),
     - (opcjonalnie) zapisuje metryki/zdarzenia (np. succeeded/failed).
   - **Wyzwania**:
     1. Spójność limitów w strefie czasowej (UTC vs UI lokalne).
     2. Niezgodność między serwisem a DB przy błędach (np. quota skonsumowana, a request nieudany).
   - **Rozwiązania**:
     1. Liczyć limity w UTC i prezentować “resetAt” w UI w strefie użytkownika.
     2. Dla krytycznych operacji rozważyć “consume after success” lub mechanizm kompensacji; w MVP zwykle “consume before” (prościej) + retry w UI.

### 1.2. Jak włączyć elementy wymagane przez OpenRouter API (z przykładami)

Poniżej są **konkretne przykłady** payloadu `chat/completions`. Każdy element możesz składać w serwisie jako osobną funkcję/politykę.

1. **Komunikat systemowy (system message)**

Przykład 1 – stały “policy” prompt dla aplikacji:

```json
{
  "role": "system",
  "content": "You are a helpful assistant. Follow the schema strictly when asked for JSON. Do not include extra keys."
}
```

Przykład 2 – system prompt z kontekstem produktu (bez danych wrażliwych):

```json
{
  "role": "system",
  "content": "You support a language-learning app. Provide concise answers. If asked for structured output, return ONLY JSON that matches the schema."
}
```

2. **Komunikat użytkownika (user message)**

Przykład 1 – proste zapytanie:

```json
{
  "role": "user",
  "content": "Explain the difference between 'few' and 'a few' in English, with 3 examples."
}
```

Przykład 2 – zapytanie z danymi wejściowymi (odseparowane od instrukcji):

```json
{
  "role": "user",
  "content": "Input:\n- language: pl\n- topic: Past Simple\nTask: Generate a short quiz with 5 questions."
}
```

3. **Ustrukturyzowane odpowiedzi (`response_format` z `json_schema`)**

Wzorzec wymagany w tym projekcie:
`{ type: 'json_schema', json_schema: { name: [schema-name], strict: true, schema: [schema-obj] } }`

Przykład 1 – “Quiz” (5 pytań, odpowiedzi A/B, poprawna litera):

```json
{
  "response_format": {
    "type": "json_schema",
    "json_schema": {
      "name": "quiz_v1",
      "strict": true,
      "schema": {
        "type": "object",
        "additionalProperties": false,
        "required": ["title", "questions"],
        "properties": {
          "title": { "type": "string", "minLength": 1, "maxLength": 120 },
          "questions": {
            "type": "array",
            "minItems": 5,
            "maxItems": 5,
            "items": {
              "type": "object",
              "additionalProperties": false,
              "required": ["q", "a", "b", "correct"],
              "properties": {
                "q": { "type": "string", "minLength": 1, "maxLength": 240 },
                "a": { "type": "string", "minLength": 1, "maxLength": 120 },
                "b": { "type": "string", "minLength": 1, "maxLength": 120 },
                "correct": { "type": "string", "enum": ["A", "B"] }
              }
            }
          }
        }
      }
    }
  }
}
```

Przykład 2 – “Mnemonic story” (wymuszenie listy słów w kolejności + tekst historii):

```json
{
  "response_format": {
    "type": "json_schema",
    "json_schema": {
      "name": "mnemonic_story_v1",
      "strict": true,
      "schema": {
        "type": "object",
        "additionalProperties": false,
        "required": ["words", "story"],
        "properties": {
          "words": {
            "type": "array",
            "minItems": 1,
            "items": { "type": "string", "minLength": 1, "maxLength": 80 }
          },
          "story": { "type": "string", "minLength": 1, "maxLength": 4000 }
        }
      }
    }
  }
}
```

Wskazówki implementacyjne (serwis):

- `strict: true` + `additionalProperties: false` zmniejsza ryzyko “nadmiarowych” pól.
- Po stronie serwera **zawsze** wykonaj walidację odpowiedzi (nawet jeśli model deklaruje structured output).
- Jeśli model lub wybrany provider nie wspiera `json_schema`, przygotuj **fallback**:
  - wymuś “return only JSON” w system prompt,
  - parsuj JSON i waliduj; w razie błędu wykonaj 1 retry lub zwróć błąd `ai_invalid_output`.

4. **Nazwa modelu (model)**

Przykład 1 – model domyślny “koszt/efekt” (do prostych czatów):

```json
{ "model": "openai/gpt-3.5-turbo" }
```

Przykład 2 – model “quality” (do trudniejszych zadań / JSON):

```json
{ "model": "openai/gpt-4o-mini" }
```

Wskazówki:

- Utrzymuj **allowlist** modeli na serwerze (np. `cheap`, `quality`, `structured`) i mapuj use-case → model.
- Zapisuj do logów: model + latency + ewentualne `usage` (jeśli API zwraca).

5. **Parametry modelu**

Przykład 1 – stabilne JSON (nisko kreatywne):

```json
{
  "temperature": 0.2,
  "max_tokens": 600
}
```

Przykład 2 – bardziej kreatywne (np. historia/mnemonik):

```json
{
  "temperature": 0.8,
  "max_tokens": 1200
}
```

Wskazówki:

- Dla `response_format` preferuj niższą temperaturę.
- Wprowadzaj globalne limity (np. max input chars, max history messages) aby unikać kosztownych requestów.

### 1.3. Przykładowy kompletny request (wszystkie elementy naraz)

```json
{
  "model": "openai/gpt-4o-mini",
  "messages": [
    { "role": "system", "content": "Return ONLY JSON matching the schema. No extra keys." },
    { "role": "user", "content": "Generate a 5-question quiz about Past Simple (PL explanations)." }
  ],
  "response_format": {
    "type": "json_schema",
    "json_schema": {
      "name": "quiz_v1",
      "strict": true,
      "schema": {
        "type": "object",
        "additionalProperties": false,
        "required": ["title", "questions"],
        "properties": {
          "title": { "type": "string" },
          "questions": {
            "type": "array",
            "minItems": 5,
            "maxItems": 5,
            "items": {
              "type": "object",
              "additionalProperties": false,
              "required": ["q", "a", "b", "correct"],
              "properties": {
                "q": { "type": "string" },
                "a": { "type": "string" },
                "b": { "type": "string" },
                "correct": { "type": "string", "enum": ["A", "B"] }
              }
            }
          }
        }
      }
    }
  },
  "temperature": 0.2,
  "max_tokens": 600
}
```

## 2. Opis konstruktora

### 2.1. Konstruktor (kontrakt)

**OpenRouterChatService** powinien przyjmować konfigurację w jednym obiekcie:

- `apiKey: string` – klucz OpenRouter (sekret, tylko serwer).
- `baseUrl?: string` – domyślnie `https://openrouter.ai/api/v1`.
- `appUrl: string` – wartość do nagłówka `HTTP-Referer` (np. `PUBLIC_APP_URL`).
- `appTitle: string` – wartość do nagłówka `X-Title`.
- `defaultModel: string` – model domyślny.
- `timeoutMs: number` – np. 30_000.
- `maxRetries: number` – np. 1–2 (dla bezpiecznych retry).
- `logger?: { info; warn; error }` – abstrakcja logowania.
- `fetchImpl?: typeof fetch` – wstrzykiwane dla testów.

### 2.2. Walidacja w konstruktorze (guard clauses)

Konstruktor lub factory powinien od razu:

- rzucić błąd lub zwrócić stan “not configured”, jeśli `apiKey` brak,
- ustawić defaulty i normalizować `baseUrl` (bez końcowego `/`),
- przygotować stałe nagłówki.

## 3. Publiczne metody i pola

### 3.1. Publiczne pola (zalecane minimum)

- **`defaultModel`**: `string` – model domyślny (read-only).
- **`timeoutMs`**: `number` – timeout domyślny (read-only).

### 3.2. Publiczne metody (proponowany interfejs)

1. **`createChatCompletion(input)`**
   - **Cel**: standardowy czat bez wymuszonego schematu.
   - **Wejście (high-level)**:
     - `systemPrompt?: string`
     - `messages: Array<{ role: 'user'|'assistant'|'system'; content: string }>`
     - `model?: string`
     - `params?: { temperature?: number; max_tokens?: number; ... }`
   - **Wyjście**:
     - `content: string`
     - `raw?: unknown` (opcjonalnie, do debug po stronie serwera)

2. **`createStructuredCompletion<T>(input)`**
   - **Cel**: zwrócić odpowiedź **zgodną z JSON Schema** (przez `response_format`).
   - **Wejście**:
     - jak wyżej + `responseFormat: { type: 'json_schema', json_schema: { name; strict; schema } }`
   - **Wyjście**:
     - `value: T` (zwalidowane)
     - `content: string` (oryginał) – pomocne do logów/debug
   - **Zachowanie**:
     - jeśli parsowanie/validacja nie przejdzie → 1 retry (opcjonalnie) lub błąd `ai_invalid_output`.

## 4. Prywatne metody i pola

### 4.1. Prywatne pola

- **`apiKey`**: string (sekret, nieujawniany).
- **`baseUrl`**: string.
- **`headersBase`**: `{ Authorization; Content-Type; HTTP-Referer; X-Title }`.
- **`fetch`**: funkcja fetch (możliwa do mockowania).

### 4.2. Prywatne metody (z odpowiedzialnością)

1. **`callOpenRouter(payload, options)`**
   - wykonuje request + timeout + zwraca JSON,
   - mapuje `response.ok === false` na błąd domenowy z kodem HTTP.

2. **`withRetry(fn)`**
   - retry z backoff/jitter,
   - retry tylko na wybrane klasy błędów (timeout/5xx/429 zależnie od polityki).

3. **`parseAssistantContent(data)`**
   - defensywne wydobycie `choices[0].message.content`,
   - błąd, jeśli brak content.

4. **`parseJson(value)`**
   - bezpieczne `JSON.parse` z mapowaniem na `ai_invalid_json`.

5. **`validateAgainstSchema(value, schema)`**
   - walidacja zgodności odpowiedzi z JSON Schema (lub z równoległym walidatorem typu),
   - błąd `ai_schema_mismatch`.

6. **`sanitizeMessages(messages)`**
   - limity długości, odrzucanie pustych treści, opcjonalna normalizacja whitespace.

## 5. Obsługa błędów

Poniżej lista scenariuszy błędów dla całej usługi (numery do śledzenia w logach/telemetrii):

1. **Brak konfiguracji**: brak `OPENROUTER_API_KEY` (błąd serwera)
2. **Niepoprawny request klienta**: brak wymaganych pól / złe typy / za długi input (400)
3. **Brak autoryzacji w aplikacji**: `context.locals.user` null (401)
4. **Limit dzienny/quota**: Supabase RPC zwraca przekroczony limit (429 + `reset_at`)
5. **OpenRouter 401/403**: zły/wycofany klucz (500 w naszej aplikacji, ale log z kodem upstream)
6. **OpenRouter 429**: limit upstream / ograniczenia dostawcy (429, respektuj `Retry-After`)
7. **OpenRouter 404 / model not found**: błędna nazwa modelu (500/400 zależnie od tego, czy to błąd konfiguracji czy user choice)
8. **OpenRouter 5xx**: awaria upstream (500 + `retry_after`)
9. **Timeout / Abort**: przekroczony `timeoutMs` (500 + `retry_after`)
10. **Brak `choices[].message.content`**: nieoczekiwana odpowiedź (500)
11. **Niepoprawny JSON** (przy structured output): `JSON.parse` fail (500 lub retry → potem 500)
12. **Niezgodność ze schematem**: JSON nie pasuje do `json_schema` (500 lub retry → potem 500)
13. **Przekroczenie limitu kontekstu**: input/historia za długa (400 lub 500 zależnie od polityki)
14. **Błędy implementacyjne**: wyjątki runtime (500, log stacktrace po stronie serwera)

Zalecane mapowanie na odpowiedzi API (w stylu `src/lib/utils/api-errors.ts`):

- **400**: `validation_error`, `invalid_json` (request), `input_too_large`
- **401**: `unauthorized`
- **429**: `rate_limit_exceeded` (+ `reset_at` z quota) lub `upstream_rate_limited` (+ `retry_after`)
- **500**: `ai_service_error`, `ai_invalid_output`, `quota_check_failed`

## 6. Kwestie bezpieczeństwa

- **Sekrety**: `OPENROUTER_API_KEY` tylko po stronie serwera (Astro API routes). Nigdy nie używać w kodzie klienta/React.
- **Nagłówki OpenRouter**: ustawiaj `HTTP-Referer` i `X-Title` (lepsza identyfikowalność ruchu); nie umieszczaj tam danych użytkownika.
- **Logowanie**:
  - loguj: `requestId`, `userId`, `model`, `latencyMs`, kody HTTP, retry count,
  - nie loguj: pełnych promptów, danych osobowych, tokenów sesji, kluczy API.
- **Prompt injection**:
  - nie pozwalaj userowi edytować system promptu bez kontroli,
  - traktuj treści użytkownika jako dane wejściowe; utrzymuj stałe reguły w system prompt.
- **Kontrola kosztów**:
  - limity długości wiadomości/historii,
  - limity `max_tokens`,
  - allowlist modeli.
- **RLS / Auth**:
  - w API route korzystaj z `context.locals.user` oraz `context.locals.supabase`,
  - quota egzekwuj serwerowo (Supabase RPC / tabela usage).
- **Tryb testowy**:
  - `DISABLE_AUTH_FOR_TESTING=true` tylko lokalnie; przed deployem upewnij się, że jest wyłączony (patrz `TESTING_MODE.md`).

## 7. Plan wdrożenia krok po kroku (dostosowany do stacku)

### 7.1. Konfiguracja środowiska

1. Dodaj/zweryfikuj zmienne środowiskowe (lokalnie w `.env`, w produkcji w sekcji secrets):
   - `OPENROUTER_API_KEY` (sekret)
   - `PUBLIC_APP_URL` (do `HTTP-Referer`, już używane w istniejącym serwisie AI)
   - (opcjonalnie) `OPENROUTER_BASE_URL=https://openrouter.ai/api/v1`
   - (opcjonalnie) `OPENROUTER_DEFAULT_MODEL=...`
   - (opcjonalnie) `OPENROUTER_TIMEOUT_MS=30000`

2. Ustal politykę modeli (prosty config “use-case → model”), np.:
   - `chat_default` → model koszt/efekt,
   - `structured` → model stabilniejszy do JSON.

### 7.2. Definicja kontraktów (types/DTO)

1. W `src/types.ts` dodaj DTO dla endpointów czatu, np.:
   - `ChatCompletionRequestDTO`
   - `ChatCompletionResponseDTO`
   - `StructuredCompletionRequestDTO<TSchemaName>`
   - (opcjonalnie) typy błędów specyficzne dla czatu

2. Zdefiniuj minimalne role wiadomości i ograniczenia (np. max długość `content`).

### 7.3. Walidacja requestów (Zod)

1. Dodaj plik walidacji np. `src/lib/validation/openrouter.ts`:
   - schema dla requestu: wiadomości, model, parametry,
   - osobna schema dla structured requests (wymagany `response_format`).

2. W API route używaj `parse(...)` z early return na błędy (wzorzec jak w `src/pages/api/ai/generate-list.ts`).

### 7.4. Implementacja serwisu OpenRouterChatService

1. Utwórz serwis np. `src/lib/services/openrouter-chat.ts`:
   - implementuj konstruktor + `createChatCompletion` + `createStructuredCompletion`,
   - użyj `fetch` + `AbortController` (jak w `src/lib/services/ai-generator.ts`),
   - ustaw nagłówki:
     - `Authorization: Bearer ${OPENROUTER_API_KEY}`
     - `Content-Type: application/json`
     - `HTTP-Referer: PUBLIC_APP_URL`
     - `X-Title: <nazwa aplikacji>`

2. Dodaj mapowanie błędów:
   - `!response.ok` → błąd domenowy (z kodem HTTP i fragmentem payloadu błędu, jeśli bezpieczne),
   - timeout → osobny kod.

3. Dodaj walidację odpowiedzi:
   - dla “plain chat” – sprawdzaj, że jest content,
   - dla structured – `JSON.parse` + walidacja względem schematu.

4. Dodaj retry (max 1–2 próby):
   - tylko na timeout/5xx/wybrane 429,
   - nie retry’uj błędów walidacji requestu.

### 7.5. Wystawienie endpointu Astro (server-side)

1. Dodaj endpoint np. `src/pages/api/chat/completions.ts` (lub pod `/api/ai/chat` jeśli trzymacie AI razem):
   - `prerender = false`,
   - auth: `if (!locals.user) return unauthorizedResponse()`,
   - walidacja Zod,
   - quota (jeśli dotyczy czatów): analogicznie do `consumeAIQuota`.

2. Zwracaj spójne odpowiedzi błędów z `src/lib/utils/api-errors.ts`.

3. Ustaw `Cache-Control: no-store` (jak w istniejącym endpointzie AI).

### 7.6. Integracja po stronie UI (React/Astro)

1. Wywołuj własny endpoint (`/api/...`) z klienta – nigdy OpenRouter bezpośrednio.
2. Obsłuż:
   - 401 (redirect/login),
   - 429 (pokaz `reset_at`/`retry_after`),
   - 500 (bezpieczny komunikat + możliwość retry).

### 7.7. Monitoring i utrzymanie

1. Dodaj podstawowe logi serwerowe (bez promptów i PII).
2. (Opcjonalnie) dodaj eventy analityczne: `ai_chat_failed/succeeded`, `ai_structured_failed/succeeded`.
3. Okresowo weryfikuj:
   - listę modeli (availability),
   - koszty i limity,
   - jakość structured output (schematy, temperatury).
