# 🧪 Środowisko Testowe - Przegląd

## ✅ Co zostało skonfigurowane

### 1. **Zależności Testowe**

Wszystkie niezbędne pakiety zostały zainstalowane:

#### Testy jednostkowe i integracyjne:
- `vitest` - framework do testów jednostkowych
- `@vitest/ui` - interfejs webowy dla Vitest
- `jsdom` - implementacja DOM dla Node.js
- `@testing-library/react` - narzędzia do testowania komponentów React
- `@testing-library/user-event` - symulacja interakcji użytkownika
- `@testing-library/jest-dom` - dodatkowe matchery DOM
- `msw` - Mock Service Worker do mockowania API

#### Testy E2E:
- `@playwright/test` - framework do testów end-to-end
- `@axe-core/playwright` - testy dostępności (a11y)

### 2. **Pliki Konfiguracyjne**

#### ✅ `vitest.config.ts`
- Środowisko jsdom
- Konfiguracja coverage (v8)
- Progi pokrycia kodu: 70%
- Globalne setup i mocki
- Aliasy ścieżek (`@/*`)

#### ✅ `playwright.config.ts`
- Konfiguracja dla przeglądarki Chromium
- Automatyczne uruchamianie serwera dev
- Zrzuty ekranu i nagrania video przy błędach
- Trace przy pierwszym retry
- HTML reporter

### 3. **Struktura Katalogów**

```
tests/
├── setup/
│   ├── vitest.setup.ts          # Setup globalny Vitest
│   └── playwright.setup.ts       # Setup globalny Playwright
├── helpers/
│   ├── test-utils.tsx            # Narzędzia do testów React
│   └── playwright-utils.ts       # Narzędzia do testów E2E
├── mocks/
│   ├── handlers.ts               # Handlery MSW
│   ├── server.ts                 # MSW server (Node.js)
│   └── browser.ts                # MSW worker (Browser)
├── unit/                         # Testy jednostkowe
│   ├── example.test.tsx          # Przykładowy test jednostkowy
│   └── services/
│       └── example-service.test.ts
├── integration/                  # Testy integracyjne
│   └── example-integration.test.ts
└── e2e/                          # Testy E2E
    └── example.spec.ts           # Przykładowy test E2E
```

### 4. **Skrypty NPM**

Dodano następujące skrypty w `package.json`:

```json
{
  "test": "vitest",                      // Uruchom Vitest w watch mode
  "test:unit": "vitest run",             // Uruchom testy jednostkowe raz
  "test:unit:watch": "vitest",           // Watch mode dla testów jednostkowych
  "test:unit:ui": "vitest --ui",         // UI mode dla Vitest
  "test:coverage": "vitest run --coverage", // Pokrycie kodu
  "test:e2e": "playwright test",         // Uruchom testy E2E
  "test:e2e:ui": "playwright test --ui", // UI mode dla Playwright
  "test:e2e:debug": "playwright test --debug", // Debug mode
  "test:e2e:report": "playwright show-report", // Pokaż raport
  "test:all": "npm run test:unit && npm run test:e2e", // Wszystkie testy
  "playwright:install": "playwright install chromium" // Instaluj przeglądarki
}
```

### 5. **Przykładowe Pliki Testowe**

Utworzono kompletne przykłady testów:
- ✅ `tests/unit/example.test.tsx` - testy komponentów React
- ✅ `tests/unit/services/example-service.test.ts` - testy serwisów
- ✅ `tests/integration/example-integration.test.ts` - testy integracyjne z MSW
- ✅ `tests/e2e/example.spec.ts` - testy E2E z Playwright

### 6. **Pomocnicze Pliki**

- ✅ `tests/helpers/test-utils.tsx` - funkcje pomocnicze dla testów React
- ✅ `tests/helpers/playwright-utils.ts` - funkcje pomocnicze dla Playwright
- ✅ `tests/mocks/handlers.ts` - definicje mocków API
- ✅ `.gitignore` - zaktualizowany o katalogi testowe

### 7. **Dokumentacja**

- ✅ `tests/TEST_SETUP.md` - kompletna dokumentacja setupu testowego

## 🚀 Szybki Start

### 1. Uruchom testy jednostkowe

```bash
# Wszystkie testy jednostkowe
npm run test:unit

# Z interfejsem UI
npm run test:unit:ui

# Watch mode (rekomendowane podczas developmentu)
npm run test:unit:watch
```

### 2. Uruchom testy E2E

```bash
# Wszystkie testy E2E
npm run test:e2e

# Z interfejsem UI
npm run test:e2e:ui

# Debug mode
npm run test:e2e:debug
```

### 3. Sprawdź pokrycie kodu

```bash
npm run test:coverage
```

Raport będzie dostępny w `coverage/index.html`

## 📝 Jak Pisać Testy

### Test Jednostkowy (Vitest + Testing Library)

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MyComponent } from '@/components/MyComponent';

describe('MyComponent', () => {
  it('should render correctly', () => {
    render(<MyComponent />);
    expect(screen.getByText('Hello')).toBeInTheDocument();
  });
});
```

### Test E2E (Playwright)

```typescript
import { test, expect } from '@playwright/test';

test('should navigate to homepage', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/My App/);
});
```

### Mockowanie API (MSW)

```typescript
// tests/mocks/handlers.ts
import { http, HttpResponse } from 'msw';

export const handlers = [
  http.get('/api/data', () => {
    return HttpResponse.json({ data: 'mocked' });
  }),
];
```

## 🎯 Następne Kroki

1. **Zapoznaj się z przykładami** w `tests/unit/example.test.tsx` i `tests/e2e/example.spec.ts`
2. **Przeczytaj dokumentację** w `tests/TEST_SETUP.md`
3. **Napisz pierwsze testy** dla swojego kodu
4. **Skonfiguruj CI/CD** do automatycznego uruchamiania testów
5. **Dodaj pre-commit hook** do uruchamiania testów przed commitem

## 📊 Weryfikacja

✅ Wszystkie zależności zainstalowane  
✅ Vitest skonfigurowany i działa  
✅ Playwright skonfigurowany (Chromium zainstalowany)  
✅ Przykładowe testy utworzone i przechodzą  
✅ MSW skonfigurowany do mockowania API  
✅ Narzędzia pomocnicze gotowe do użycia  
✅ Dokumentacja kompletna  

## 🔗 Przydatne Linki

- [Vitest Documentation](https://vitest.dev/)
- [Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Playwright Documentation](https://playwright.dev/)
- [MSW Documentation](https://mswjs.io/)
- [Axe Accessibility Testing](https://github.com/dequelabs/axe-core-npm)

## 💡 Wskazówki

### Dla testów jednostkowych (Vitest):
- Używaj `vi.mock()` do mockowania modułów
- Wykorzystuj `setupFiles` dla globalnych mocków
- Watch mode (`npm run test:unit:watch`) to najlepszy sposób podczas developmentu
- UI mode (`npm run test:unit:ui`) świetnie nadaje się do debugowania

### Dla testów E2E (Playwright):
- Używaj Page Object Model dla wielokrotnie używanych interakcji
- Lokatory (`page.getByRole()`) są lepsze niż selektory CSS
- Debug mode (`npm run test:e2e:debug`) pozwala krok po kroku przejść przez test
- Sprawdzaj accessibility z `checkAccessibility()` helper

### Ogólne:
- Uruchamiaj testy przed każdym commitem
- Dąż do sensownego pokrycia kodu, nie 100% za wszelką cenę
- Testuj zachowanie, nie implementację
- Trzymaj testy szybkimi i izolowanymi

---

**Środowisko testowe jest w pełni gotowe do użycia! 🎉**
