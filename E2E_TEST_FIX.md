# E2E Test Fix - Environment Variables

## Problem

Testy E2E failowały, ponieważ zmienne środowiskowe z `.env.test` nie były przekazywane do serwera deweloperskiego Astro uruchamianego przez Playwright.

### Objawy
- Wszystkie testy w `ai-list-generation.spec.ts` failowały
- Middleware nie wykrywał trybu testowego (`DISABLE_AUTH_FOR_TESTING`)
- Testy wymagały autentykacji mimo ustawienia `DISABLE_AUTH_FOR_TESTING=true`

## Rozwiązanie

### 1. Zaktualizowano `playwright.config.ts`

Dodano przekazywanie zmiennych środowiskowych do serwera deweloperskiego Astro:

```typescript
webServer: {
  command: e2eConfig.webServer.command,
  url: e2eConfig.webServer.url,
  reuseExistingServer: e2eConfig.webServer.reuseExistingServer,
  timeout: e2eConfig.webServer.timeout,
  stdout: "pipe",
  stderr: "pipe",
  // Pass test environment variables to Astro dev server
  env: {
    // Testing mode flags
    DISABLE_AUTH_FOR_TESTING: process.env.DISABLE_AUTH_FOR_TESTING || "true",
    DISABLE_AI_QUOTA_FOR_TESTING: process.env.DISABLE_AI_QUOTA_FOR_TESTING || "true",
    
    // Test user configuration
    TEST_USER_EMAIL: process.env.TEST_USER_EMAIL || "test@example.com",
    TEST_USER_ID: process.env.TEST_USER_ID || "",
    
    // Supabase configuration
    PUBLIC_SUPABASE_URL: process.env.PUBLIC_SUPABASE_URL || "",
    PUBLIC_SUPABASE_ANON_KEY: process.env.PUBLIC_SUPABASE_ANON_KEY || "",
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || "",
    
    // OpenRouter API (for AI generation tests)
    OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY || "",
    
    // App configuration
    PUBLIC_APP_URL: process.env.PUBLIC_APP_URL || "http://localhost:4321",
  },
},
```

### 2. Jak to działa

1. **Playwright ładuje `.env.test`** przez `tests/test.config.ts` (używa `dotenv`)
2. **Zmienne są dostępne w `process.env`** dla Playwright
3. **Playwright przekazuje zmienne do serwera Astro** przez właściwość `webServer.env`
4. **Serwer Astro otrzymuje zmienne** i są one dostępne przez `import.meta.env`
5. **Middleware wykrywa tryb testowy** i pomija autentykację

## Weryfikacja

### Sprawdź, czy zmienne są załadowane

```bash
# Uruchom testy z logowaniem
npm run test:e2e:ui
```

W konsoli serwera deweloperskiego powinny pojawić się logi:
```
⚠️  [Auth Middleware] TESTING MODE ACTIVE (dev only)
[Auth Middleware] Using test user: test@example.com
```

### Sprawdź w Playwright UI

1. Uruchom testy w trybie UI: `npm run test:e2e:ui`
2. Sprawdź logi w zakładce "Console"
3. Powinny być widoczne logi z middleware o trybie testowym

## Ważne uwagi

### Zmienne muszą być w `.env.test`

Upewnij się, że plik `.env.test` w głównym katalogu projektu zawiera:

```env
# Testing mode
DISABLE_AUTH_FOR_TESTING=true
DISABLE_AI_QUOTA_FOR_TESTING=true

# Test user
TEST_USER_EMAIL=test@example.com
TEST_USER_ID=your-test-user-uuid

# Supabase (should point to local instance for tests)
PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
PUBLIC_SUPABASE_ANON_KEY=your-local-anon-key

# OpenRouter API
OPENROUTER_API_KEY=your-api-key
```

### Lokalna instancja Supabase

Dla testów E2E zaleca się używanie lokalnej instancji Supabase:

```bash
# Start local Supabase
npx supabase start

# Get keys from output and add to .env.test
```

### Bezpieczeństwo

- ⚠️ `DISABLE_AUTH_FOR_TESTING` działa **TYLKO w trybie deweloperskim** (`import.meta.env.DEV`)
- ⚠️ Nigdy nie używaj tych flag w produkcji
- ⚠️ `.env.test` jest w `.gitignore` - nie commituj prawdziwych kluczy

## Troubleshooting

### Testy nadal failują

1. **Sprawdź, czy serwer się restartował**
   - Zatrzymaj Playwright UI (Ctrl+C)
   - Uruchom ponownie: `npm run test:e2e:ui`

2. **Sprawdź logi middleware**
   - Powinny zawierać: `[Auth Middleware] TESTING MODE ACTIVE`
   - Jeśli nie ma, zmienne nie są przekazywane

3. **Sprawdź wartości w `.env.test`**
   ```bash
   # Windows PowerShell
   Get-Content .env.test | Select-String -Pattern "DISABLE_AUTH_FOR_TESTING"
   
   # Linux/Mac
   grep DISABLE_AUTH_FOR_TESTING .env.test
   ```

4. **Sprawdź, czy port 4321 jest wolny**
   ```bash
   # Windows
   netstat -ano | findstr :4321
   
   # Linux/Mac
   lsof -i :4321
   ```

### Zmienne nie są widoczne w Astro

Jeśli middleware nie wykrywa trybu testowego:

1. Sprawdź, czy `import.meta.env.DEV` jest `true`
2. Sprawdź, czy zmienne są przekazywane w `playwright.config.ts`
3. Sprawdź logi serwera deweloperskiego w Playwright UI

## Related Files

- `playwright.config.ts` - Konfiguracja Playwright z przekazywaniem zmiennych
- `tests/test.config.ts` - Ładowanie zmiennych z `.env.test`
- `src/middleware/index.ts` - Middleware z obsługą trybu testowego
- `.env.test` - Zmienne środowiskowe dla testów

## Status

✅ **Naprawione** - 2026-01-30

Testy E2E powinny teraz działać z wyłączoną autentykacją w trybie testowym.
