# Plan Testów - FlashLearn MVP

**Projekt**: FlashLearn (Astro 5 + React 19 + Supabase + OpenRouter AI)  
**Wersja dokumentu**: 2.0  
**Data**: 29.01.2026  
**Autor**: QA Team  
**Status**: Zaktualizowany - uproszczony stack testowy

---

## 1. Kontekst i cel dokumentu

### 1.1. Opis aplikacji
FlashLearn to web app do nauki słówek/pojęć z wykorzystaniem AI:
- **Tworzenie list**: manualne wklejanie lub generowanie przez AI (OpenRouter)
- **Flashcardy**: tryb nauki/testu z oceną rezultatów
- **Auth**: magic link (Supabase Auth)
- **Limity**: 3 generacje AI/dzień (free tier), 10 list/user, 200 itemów/lista
- **Stack**: Astro 5 SSR, React 19, TypeScript 5, Tailwind 4, Supabase (PostgreSQL + Auth + RLS)

### 1.2. Cel MVP
- Weryfikacja core flow: signup → create list (manual/AI) → test → see results
- Walidacja limitów AI i rate limiting
- Sprawdzenie RLS (Row Level Security)
- Baseline dla a11y, security, performance
- Przygotowanie do certyfikacji 10xDevs

### 1.3. Cel planu testów
- Identyfikacja ryzyk i priorytetów testowych
- Określenie strategii (unit, integration, E2E, security, a11y)
- Stworzenie harmonogramu i listy przypadków testowych
- Definicja narzędzi i środowiska (zgodnych ze stackiem projektu)

---

## 2. Analiza ryzyk

### Ryzyka wysokie (P1)
1. **Auth flow**: błędy w magic link → blokada dostępu
2. **AI quota**: niepoprawne liczenie/reset → nadużycia lub frustracja userów
3. **Rate limiting**: brak ochrony → DoS lub koszty OpenRouter
4. **RLS**: luki → wyciek danych innych użytkowników
5. **Data integrity**: duplikaty, usuwanie locked list → corrupted state

### Ryzyka średnie (P2)
1. **AI timeouty**: brak obsługi → zawieszone UI
2. **Validation bypass**: błędne payloady akceptowane → crash lub niespójność
3. **Tryb testowy w prod**: przypadkowe użycie service role key → luka
4. **Test results**: niepoprawna logika oceny → błędne wyniki
5. **Limity (10 list, 200 items)**: obejście → nadużycia

### Ryzyka niskie (P3)
1. **UI glitches**: drobne layout issues
2. **A11y**: nieoptymalne (ale powinno przejść podstawy WCAG)
3. **Performance na dev env**: wolne, ale działające
4. **Dependencies vulnerabilities**: ryzyko zewnętrzne (mitigowane przez npm audit)

---

## 3. Strategia testowania

### Zakres (MVP)
- **In scope**: core flows (auth, lists CRUD, AI, test, delete account), limity, RLS, validation, basic a11y/security/performance
- **Out of scope**: edge cases UI/UX, advanced performance tuning, penetration testing (OWASP ZAP - post-MVP)

### Poziomy testów i narzędzia (kompatybilne ze stackiem)
- **Unit/Component**: `Vitest` + `@testing-library/react` + `@testing-library/user-event` + `jsdom`
- **Mocki sieci**: `MSW` (Mock Service Worker - dla `fetch` w komponentach)
- **E2E i API**: `Playwright` (E2E + API testing + performance metrics)
- **Contract Testing**: `Playwright` + `Zod schemas` (walidacja API zgodności z kontraktami)
- **DB/RLS/RPC**: Supabase CLI (lokalnie) + testy integracyjne (Vitest) wykonujące zapytania przez `supabase-js`
- **A11y**: `@axe-core/playwright`
- **Bezpieczeństwo**: `npm audit` + Dependabot/Snyk (opcjonalnie), OWASP ZAP baseline (post-MVP)
- **Coverage**: `Vitest --coverage` (wbudowany Istanbul/v8)
- **Wydajność**: Playwright performance metrics (MVP), `k6` (post-MVP dla load testing)

### Środowisko testowe
- **Lokalne**: Supabase local (Docker), tryb testowy z `SUPABASE_SERVICE_ROLE_KEY`, seed data
- **CI/CD**: GitHub Actions (Vitest, Playwright, npm audit)
- **Mock OpenRouter**: MSW (unikamy kosztów API w testach)

### Kryteria akceptacji MVP
- **Coverage**: >70% unit/component (measured by Vitest), >80% E2E krytycznych flow (Playwright)
- **Blocker bugs**: 0 (P1)
- **Security**: npm audit zero high/critical vulnerabilities
- **A11y**: axe-core zero critical violations
- **Performance baseline**: dashboard load < 3s LCP, API endpoints p95 < 800ms (dev env)

---

## 4. Środowisko i dane testowe

### 4.1. Tryb testowy (już zaimplementowany)
- `import.meta.env.TESTING_MODE === 'true'`
- Używa `SUPABASE_SERVICE_ROLE_KEY` do bypass RLS dla seedów
- **Kontrola**: weryfikować, że NIE jest włączony w prod (CI check)

### 4.2. Seed data (Supabase local)
- **2 profile**: `test-user-1@example.com`, `test-user-2@example.com`
- **Listy**: user1 ma 2 listy (1 manual, 1 AI-generated z 20 items), user2 ma 1 listę
- **AI usage**: user1 ma 2/3 dziennego quota wykorzystane
- **Test results**: 1 completed test dla user1

### 4.3. Mock OpenRouter (MSW)
```typescript
// Przykład handlera MSW
http.post('https://openrouter.ai/api/v1/chat/completions', () => {
  return HttpResponse.json({
    choices: [{ message: { content: JSON.stringify({ items: [...] }) } }]
  });
});
```

---

## 5. Przypadki testowe (high-level)

### 5.1. Autoryzacja (magic link)

- **Funkcjonalność**: signup/signin przez email, callback z tokenem, session, logout, delete account
- **Typy testów**: E2E (Playwright), Unit (validation schemas - Vitest)
- **Priorytet**: **Wysoki**
- **Narzędzia**: Vitest + RTL, Playwright (E2E + API testing)

**Scenariusze:**
1. **Happy path**: valid email → magic link wysłany → redirect `/auth/check-email` → klik link → authenticated → redirect `/dashboard`
2. **Invalid email**: `invalid-email` → validation error, brak wysłania
3. **Rate limit**: 5 requestów w 15 min → `429 Too Many Requests`, `Retry-After` header
4. **Tryb testowy**: `?mode=test` → auto-login (tylko dev/test env)
5. **Logout**: session niszczona, redirect `/`
6. **Delete account**: soft delete profilu, listy usunięte, AI quota wyczyszczony, event zalogowany

**Playwright E2E przykład:**
```typescript
test('magic link signup flow', async ({ page, context }) => {
  await page.goto('/');
  await page.fill('[name="email"]', 'newuser@example.com');
  await page.click('button:has-text("Send Magic Link")');
  await expect(page).toHaveURL('/auth/check-email');
  
  // Symulacja kliknięcia magic link (tryb testowy lub intercepted callback)
  await page.goto('/auth/callback?token_hash=...&type=email');
  await expect(page).toHaveURL('/dashboard');
});
```

**Vitest Unit przykład:**
```typescript
import { emailSchema } from '@/lib/validation/auth';

describe('emailSchema', () => {
  it('accepts valid email', () => {
    expect(emailSchema.safeParse('test@example.com').success).toBe(true);
  });
  
  it('rejects invalid email', () => {
    const result = emailSchema.safeParse('invalid');
    expect(result.success).toBe(false);
  });
});
```

---

### 5.2. CRUD list (manual paste)

- **Funkcjonalność**: create/read/update/delete list ręcznie wklejanej (format `term:definition`)
- **Typy testów**: E2E (Playwright), Integration (API - Playwright), Unit (parsing, validation - Vitest)
- **Priorytet**: **Wysoki**
- **Narzędzia**: Vitest, Playwright

**Scenariusze:**
1. **Create valid list**: 20 items w formacie `term:def` → `POST /api/lists` → 201, lista w DB, redirect `/lists/[id]`
2. **Create 200 items**: max items → success
3. **Create 201 items**: validation error `400 Max 200 items`
4. **Invalid format**: `term without colon` → parsing error lub skip line (zależnie od logiki)
5. **10th list**: user ma 9 list → 10th OK
6. **11th list**: user ma 10 list → `403 List limit reached`
7. **Update list name**: `PATCH /api/lists/[id]` → 200, zmiana w DB
8. **Delete unlocked list**: `DELETE /api/lists/[id]` → 200, kaskadowe usunięcie items
9. **Delete locked list** (ma testy): `DELETE /api/lists/[id]` → `403 Cannot delete list with test results`
10. **RLS**: user A próbuje usunąć listę user B → 404 (lub 403)

**Playwright API przykład:**
```typescript
test('POST /api/lists with valid data', async ({ request }) => {
  const response = await request.post('/api/lists', {
    data: {
      name: 'Test List',
      items: [{ term: 'hello', definition: 'world' }]
    },
    headers: { 'Cookie': `sb-access-token=${token}` }
  });
  expect(response.status()).toBe(201);
  const json = await response.json();
  expect(json.list.id).toBeDefined();
});
```

---

### 5.3. CRUD list items (single operations)

- **Funkcjonalność**: dodawanie/usuwanie pojedynczych itemów w istniejącej liście
- **Typy testów**: E2E, Integration (API)
- **Priorytet**: **Średni**
- **Narzędzia**: Playwright

**Scenariusze:**
1. **POST /api/lists/[listId]/items**: dodaj 1 item → 201
2. **DELETE /api/lists/[listId]/items/[itemId]**: usuń item → 200
3. **Locked list**: próba dodania/usunięcia → `403 List is locked`
4. **200 items limit**: lista ma 200 → próba dodania → `400 Max items reached`

---

### 5.4. AI generowanie (OpenRouter)

- **Funkcjonalność**: generowanie listy przez AI (category + count)
- **Typy testów**: E2E (z MSW mock), Integration (API + quota logic), Unit (validation)
- **Priorytet**: **Wysoki**
- **Narzędzia**: Vitest, MSW (mock OpenRouter), Playwright (E2E + API testing)

**Scenariusze:**
1. **Happy path**: user ma 0/3 quota → `POST /api/ai/generate-list` z `category=animals, count=20` → 201, lista zwrócona, quota 1/3
2. **Quota exceeded**: user ma 3/3 → `429 Daily AI generation limit reached`, `Retry-After: <seconds until midnight UTC>`
3. **Invalid category**: empty string → `400 validation error`
4. **Invalid count**: 201 → `400 Max 200 items`
5. **OpenRouter timeout**: mock z opóźnieniem 35s → `504 Gateway Timeout` (server timeout 30s)
6. **OpenRouter error**: mock 500 → `500 AI service error`
7. **Malformed AI response**: mock z invalid JSON → `500 Failed to parse AI response`
8. **Rate limit**: 3 requesty w 60s → `429 Too many requests`
9. **Quota reset**: następnego dnia (mock system time lub test na local Supabase z manipulacją `ai_usage_daily.date`)

**MSW Mock przykład:**
```typescript
import { http, HttpResponse } from 'msw';

const aiHandler = http.post('https://openrouter.ai/api/v1/chat/completions', () => {
  return HttpResponse.json({
    choices: [{
      message: {
        content: JSON.stringify({
          items: [
            { term: 'cat', definition: 'A feline animal' },
            // ... 19 more
          ]
        })
      }
    }]
  });
});

server.use(aiHandler);
```

**Vitest Integration przykład:**
```typescript
import { consumeAiGeneration } from '@/lib/services/ai-quota';

describe('AI quota logic', () => {
  it('increments usage and respects limit', async () => {
    const userId = 'test-user-id';
    // Setup: user ma 2/3
    await consumeAiGeneration(userId); // 3/3
    
    const result = await consumeAiGeneration(userId);
    expect(result.success).toBe(false);
    expect(result.error).toBe('daily_limit_exceeded');
  });
});
```

---

### 5.5. Test/Quiz flow

- **Funkcjonalność**: wybór listy → start test → odpowiadanie → submit → results
- **Typy testów**: E2E (Playwright), Unit (scoring logic - Vitest)
- **Priorytet**: **Wysoki**
- **Narzędzia**: Vitest (scoring), Playwright (flow)

**Scenariusze:**
1. **Complete test**: all correct → score 100%, test result zapisany w DB, lista locked
2. **Partial correct**: 15/20 correct → score 75%
3. **All incorrect**: score 0%
4. **Lista już locked**: "Start Test" disabled lub info message
5. **Empty list**: nie można rozpocząć testu
6. **Test state persistence**: refresh page → test state zachowany (jeśli implemented, else reset)

**Vitest scoring przykład:**
```typescript
import { calculateScore } from '@/lib/utils/scoring';

describe('calculateScore', () => {
  it('calculates 100% for all correct', () => {
    const answers = [
      { correct: true }, { correct: true }, { correct: true }
    ];
    expect(calculateScore(answers)).toBe(100);
  });
  
  it('calculates 50% for half correct', () => {
    const answers = [
      { correct: true }, { correct: false }
    ];
    expect(calculateScore(answers)).toBe(50);
  });
});
```

---

### 5.6. Dashboard (wyświetlanie list, stats)

- **Funkcjonalność**: wyświetlanie wszystkich list usera, stats (lists count, AI quota), quick actions
- **Typy testów**: E2E (Playwright), Component (Vitest + RTL)
- **Priorytet**: **Średni**
- **Narzędzia**: Vitest + RTL, Playwright

**Scenariusze:**
1. **Empty dashboard**: user bez list → "No lists yet" message + CTA "Create your first list"
2. **User z listami**: wyświetlanie all lists, locked badge na liście z testami
3. **Stats correctness**: liczba list, AI quota (X/3) się zgadzają z DB
4. **Delete list action**: klik "Delete" → confirmation dialog → lista usunięta, dashboard refresh
5. **Locked list delete**: próba usunięcia → error message

---

### 5.7. Profile & delete account

- **Funkcjonalność**: wyświetlanie profilu, stats, delete account
- **Typy testów**: E2E (Playwright), Integration (RPC - Vitest)
- **Priorytet**: **Średni**
- **Narzędzia**: Vitest, Playwright

**Scenariusze:**
1. **View profile**: email, created_at, total lists, total tests
2. **Delete account confirmation**: click "Delete Account" → dialog → confirm → `POST /api/auth/delete-account` → logout + redirect `/`
3. **Delete account cascade**: profile soft deleted, listy usunięte, ai_usage usunięty, event zalogowany
4. **Delete account RPC**: wywołanie `delete_user_and_data(user_id)` → sprawdzenie DB cleanup

---

### 5.8. Validation & error handling

- **Funkcjonalność**: wszystkie endpointy validują input, zwracają spójne error responses
- **Typy testów**: Integration (API - Playwright), Unit (Zod schemas - Vitest)
- **Priorytet**: **Wysoki**
- **Narzędzia**: Vitest (Zod), Playwright API

**Scenariusze (wybrane):**
1. **POST /api/lists bez auth**: 401 Unauthorized
2. **POST /api/lists z invalid body**: 400 validation error
3. **POST /api/ai/generate-list z invalid count**: 400
4. **GET /api/lists/[invalid-uuid]**: 400 invalid UUID format
5. **Error response format**: zawsze `{ error: string, message?: string }`

**Vitest Zod przykład:**
```typescript
import { listCreateSchema } from '@/lib/validation/lists';

describe('listCreateSchema', () => {
  it('validates correct payload', () => {
    const payload = { name: 'Test', items: [{ term: 'a', definition: 'b' }] };
    expect(listCreateSchema.safeParse(payload).success).toBe(true);
  });
  
  it('rejects empty items array', () => {
    const payload = { name: 'Test', items: [] };
    const result = listCreateSchema.safeParse(payload);
    expect(result.success).toBe(false);
  });
});
```

---

### 5.9. Bezpieczeństwo (RLS, tryb testowy, dane wrażliwe)

- **Funkcjonalność**:
  - RLS: użytkownik widzi tylko swoje rekordy (`profiles`, `lists`, `list_items`, `tests`, `ai_usage_daily`)
  - `events`: brak dostępu (write-only / brak policy)
  - tryb testowy nie może działać w produkcji
  - dependency vulnerabilities
- **Typy testów**: Integration + SAST/dependency scanning
- **Priorytet**: **Wysoki**
- **Narzędzia**: Vitest integracyjnie (2 userów), `npm audit`, Dependabot/Snyk (opcjonalnie), OWASP ZAP baseline (post-MVP)

**Scenariusze:**
1. **RLS test**: user A próbuje `GET /api/lists` → widzi tylko swoje listy (nie user B)
2. **RLS bypass attempt**: user A próbuje `DELETE /api/lists/[user-B-list-id]` → 404/403, brak modyfikacji
3. **events table**: authenticated user próbuje `SELECT * FROM events` → denied (через supabase-js)
4. **TESTING_MODE w prod**: CI check weryfikujący, że `import.meta.env.TESTING_MODE !== 'true'` w build prod
5. **Service role key exposure**: smoke test sprawdzający, że `SUPABASE_SERVICE_ROLE_KEY` nie jest w client bundle
6. **npm audit**: CI pipeline z `npm audit --audit-level=high` → fail on high/critical vulnerabilities
7. **Post-MVP**: OWASP ZAP baseline scan, penetration testing

**Vitest RLS przykład:**
```typescript
describe('RLS - lists isolation', () => {
  it('user A cannot see user B lists', async () => {
    const clientA = createClient(userAToken);
    const { data } = await clientA.from('lists').select('*');
    const userBListIds = ['user-b-list-1', 'user-b-list-2'];
    expect(data.some(list => userBListIds.includes(list.id))).toBe(false);
  });
});
```

---

### 5.10. Wydajność i stabilność

- **Priorytet**: **Średni**
- **Narzędzia**: Playwright performance metrics (MVP), k6/autocannon (post-MVP)

**Minimalne kryteria (lokal/dev) - mierzone przez Playwright:**
- `POST /api/auth/send-magic-link`: response time p95 < 500ms
- `POST /api/ai/generate-list`: timeout 30s, poprawne `Retry-After` i brak zawieszeń UI
- `POST /api/lists` dla 200 itemów: response time p95 < 800ms
- Dashboard load (FCP): < 2s, LCP < 3s
- Profile page: TTI < 2.5s

**Playwright performance przykład:**
```typescript
test('API performance baseline', async ({ request }) => {
  const start = Date.now();
  const response = await request.post('/api/lists', {
    data: validPayload,
    headers: { 'Cookie': authCookie }
  });
  const duration = Date.now() - start;
  expect(response.ok()).toBeTruthy();
  expect(duration).toBeLessThan(800);
});

test('Dashboard LCP', async ({ page }) => {
  await page.goto('/dashboard');
  const metrics = await page.evaluate(() => {
    return performance.getEntriesByType('navigation')[0];
  });
  expect(metrics.loadEventEnd - metrics.fetchStart).toBeLessThan(3000);
});
```

**Post-MVP**: Load testing z k6 dla symulacji 100+ concurrent users:
```javascript
import http from 'k6/http';
import { check } from 'k6';

export let options = {
  stages: [
    { duration: '1m', target: 50 },
    { duration: '2m', target: 100 },
  ],
};

export default function () {
  let res = http.get('https://staging.flashlearn.app/dashboard');
  check(res, { 'status is 200': (r) => r.status === 200 });
}
```

---

### 5.11. Contract Testing (API kontrakty)

- **Funkcjonalność**:
  - Walidacja, że API endpoints zwracają dane zgodne z zadeklarowanymi Zod schemas
  - Spójność między frontend types a backend responses
  - Regresja formatów błędów (`validation_error`, `rate_limit_exceeded`, `list_locked`, etc.)
- **Typy testów**: Integration z wykorzystaniem istniejących Zod schemas jako kontraktów
- **Priorytet**: **Średni**
- **Narzędzia**: Playwright API testing + Zod schemas z `@/lib/validation`

**Kluczowe przypadki:**
1. `POST /api/lists`: response body validowany przez `listCreateSchema` (success) i error schema (failure)
2. `POST /api/ai/generate-list`: request/response zgodne z `generateListSchema`
3. `GET /api/lists`: array of lists zgodny z `List[]` type z `@/types`
4. Wszystkie endpointy: error responses mają spójny format `{ error: string, message?: string, code?: string }`
5. Type safety: TypeScript types generowane z Zod schemas (`z.infer<>`)

**Playwright contract test przykład:**
```typescript
import { generateListSchema } from '@/lib/validation/ai';

test('AI generate endpoint matches schema contract', async ({ request }) => {
  const response = await request.post('/api/ai/generate-list', {
    data: { category: 'animals', count: 20 },
    headers: { 'Cookie': authCookie }
  });
  
  expect(response.ok()).toBeTruthy();
  const json = await response.json();
  
  // Walidacja odpowiedzi przez Zod schema
  const result = generateListSchema.safeParse(json);
  expect(result.success).toBe(true);
  
  if (result.success) {
    expect(result.data.items).toHaveLength(20);
    expect(result.data.items[0]).toHaveProperty('term');
    expect(result.data.items[0]).toHaveProperty('definition');
  }
});

test('Error responses follow contract', async ({ request }) => {
  const response = await request.post('/api/lists', {
    data: { invalid: 'payload' },
    headers: { 'Cookie': authCookie }
  });
  
  expect(response.status()).toBe(400);
  const json = await response.json();
  expect(json).toHaveProperty('error');
  expect(typeof json.error).toBe('string');
});
```

---

### 5.12. Accessibility (a11y)

- **Funkcjonalność**: basic keyboard navigation, screen reader support, WCAG 2.1 AA minimum
- **Typy testów**: Automated (axe-core), Manual (keyboard nav)
- **Priorytet**: **Średni**
- **Narzędzia**: `@axe-core/playwright`, manual testing

**Scenariusze:**
1. **Axe scan**: all pages → zero critical violations
2. **Keyboard nav**: Tab przez formularz logowania → focus visible, Enter submits
3. **Screen reader**: headings hierarchy, button labels, form labels
4. **Color contrast**: minimum WCAG AA (4.5:1 for text)

**Playwright axe przykład:**
```typescript
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('Dashboard accessibility', async ({ page }) => {
  await page.goto('/dashboard');
  
  const accessibilityScanResults = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa'])
    .analyze();
  
  expect(accessibilityScanResults.violations).toEqual([]);
});

test('Keyboard navigation on auth form', async ({ page }) => {
  await page.goto('/');
  await page.keyboard.press('Tab'); // Focus na email input
  await expect(page.locator('[name="email"]')).toBeFocused();
  
  await page.keyboard.type('test@example.com');
  await page.keyboard.press('Tab'); // Focus na button
  await expect(page.locator('button[type="submit"]')).toBeFocused();
});
```

---

## 6. Harmonogram i zasoby

### Proponowany harmonogram (MVP, 1–2 tyg.)
- **Dzień 1–2**: analiza ryzyk + przygotowanie środowiska testowego (Supabase local, dane testowe, tryb testowy, setup Vitest + Playwright + MSW)
- **Dzień 3–5**: testy manualne krytycznych flow + spis przypadków + bug triage
- **Dzień 6–8**: automatyzacja E2E (Playwright): login (test mode), create list manual/AI (MSW mock), test, delete list, delete account + API testing (Playwright) + contract tests (Zod)
- **Dzień 9–10**: unit/component tests (Vitest + RTL), integracyjne DB/RPC (Vitest), smoke security (RLS, npm audit)
- **Dzień 11**: A11y tests (@axe-core/playwright), performance baselines (Playwright metrics), coverage report (Vitest), dokumentacja

### Zasoby
- **1 QA/Test Engineer** (plan, manual, automatyzacja E2E, unit tests, documentation)
- **Wsparcie 0.25–0.5 dev** (seed danych, ewentualne hooki testowe, stabilizacja endpointów, review testów, bugfixes)

### Stack testowy (uproszczony - zgodny z projektem):
| Kategoria | Narzędzie | Dlaczego |
|-----------|-----------|----------|
| **Unit/Component** | Vitest + @testing-library/react | Natywne dla Vite/Astro, ultra szybkie, kompatybilne API z Jest |
| **E2E** | Playwright | Najlepsze obecnie E2E, multi-browser, trace viewer, native Astro support |
| **API Testing** | Playwright | Built-in API testing, ten sam stack co E2E, TypeScript native |
| **Contract Testing** | Playwright + Zod | Istniejące schemas jako kontrakty, zero dodatkowego setupu |
| **Mocki** | MSW | Standard branżowy, działa w node i browser |
| **DB/RLS** | Supabase local + Vitest | Kontrolowane środowisko, deterministyczne testy |
| **Coverage** | Vitest --coverage | Wbudowane Istanbul/v8, HTML reports |
| **Security** | npm audit | Wbudowane, zero setup, CI-ready (post-MVP: OWASP ZAP) |
| **A11y** | @axe-core/playwright | Automatyzacja WCAG, integracja z Playwright |
| **Performance** | Playwright metrics | Performance API, Navigation Timing (post-MVP: k6 load testing) |

**Zalety uproszczonego stacku:**
- ✅ 2 główne frameworki (Vitest, Playwright) zamiast 5-6 narzędzi
- ✅ Lepsza integracja z TypeScript/Astro
- ✅ Mniej konfiguracji, łatwiejsze onboarding
- ✅ Kod jako źródło prawdy (vs JSON collections w Postman)
- ✅ Szybsze CI/CD (mniej dependencies)

---

## 7. Deliverables

### Dokumenty
- ✅ **Plan testów** (ten dokument)
- ⏳ **Test cases** (szczegółowe, w formie Playwright/Vitest test files)
- ⏳ **Bug reports** (GitHub Issues z template)
- ⏳ **Coverage report** (HTML z Vitest)
- ⏳ **A11y audit** (axe-core results)
- ⏳ **Security audit** (npm audit output)

### Automatyzacja
- ⏳ **Vitest suite**: unit/component tests, RLS integration, validation
- ⏳ **Playwright suite**: E2E flows, API testing, contract tests, a11y, performance
- ⏳ **MSW handlers**: OpenRouter mocks
- ⏳ **CI pipeline**: GitHub Actions z Vitest + Playwright + npm audit

### Środowisko
- ⏳ **Supabase local setup** (z seedami)
- ⏳ **Tryb testowy** (dokumentacja użycia)
- ⏳ **README**: instrukcje uruchomienia testów

---

## 8. Definicje i kryteria

### Severity
- **P1 (Critical)**: blokuje core flow, data loss, security breach
- **P2 (High)**: major functionality broken, workaround exists
- **P3 (Medium)**: minor functionality, UI glitch, można postpone
- **P4 (Low)**: cosmetic, nice-to-have

### Exit criteria (MVP ready for prod)
- ✅ All P1 bugs fixed
- ✅ Zero high/critical security vulnerabilities (npm audit)
- ✅ Unit/component coverage >70%
- ✅ E2E coverage >80% critical flows (auth, create list, AI, test, delete)
- ✅ Zero critical a11y violations (axe-core)
- ✅ Performance baselines met (dashboard LCP < 3s, API p95 < 800ms)
- ✅ RLS verified (users isolated)
- ✅ AI quota logic verified (limit + reset)
- ✅ Contract tests passing (API responses match schemas)

---

## 9. Ryzyka projektu testowego

### Ryzyka
1. **OpenRouter rate limits w testach**: mitigacja = MSW mock (bez real API calls)
2. **Supabase local instability**: mitigacja = Docker setup w docs, fallback na cloud dev instance
3. **Playwright flaky tests**: mitigacja = proper waiters (`waitForSelector`, auto-wait), retry logic
4. **Time budget**: mitigacja = priorytetyzacja (P1 first), defer P3 post-MVP

### Assumptions
- Supabase local działa stabilnie (Docker)
- OpenRouter API jest mockowany (MSW) w 100% testów
- Dev ma dostęp do pomocy przy bugfixach (0.25–0.5 FTE)
- CI/CD pipeline (GitHub Actions) dostępny

---

## 10. Kontakty i review

**Owner**: QA Team  
**Reviewers**: Dev Team, Product Owner  
**Last updated**: 29.01.2026  
**Next review**: Po pierwszym tygodniu testów (retrospektywa)

---

## Appendix A: Quick Start Commands

### Setup lokalnego środowiska testowego
```bash
# 1. Install dependencies
npm install

# 2. Setup Supabase local
npx supabase start

# 3. Run migrations + seed
npx supabase db reset

# 4. Install test dependencies
npm install -D vitest @testing-library/react @testing-library/user-event jsdom
npm install -D @playwright/test msw @axe-core/playwright

# 5. Run unit tests
npm run test

# 6. Run E2E tests
npm run test:e2e

# 7. Coverage report
npm run test:coverage

# 8. Playwright UI mode (debug)
npx playwright test --ui
```

### Przykładowa konfiguracja Vitest (`vitest.config.ts`)
```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      exclude: ['node_modules/', 'tests/', '*.config.*'],
    },
  },
});
```

### Przykładowa konfiguracja Playwright (`playwright.config.ts`)
```typescript
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  use: {
    baseURL: 'http://localhost:4321',
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:4321',
    reuseExistingServer: !process.env.CI,
  },
});
```

---

**Koniec dokumentu** 🎯
