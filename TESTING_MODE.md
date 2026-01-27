# Tryb testowy - Wyłączenie autoryzacji

## ⚠️ OSTRZEŻENIE
**Ten tryb jest przeznaczony TYLKO do testowania lokalnego i developmentu. NIGDY nie włączaj go w produkcji!**

## Jak włączyć tryb testowy?

### Krok 1: Znajdź ID istniejącego użytkownika testowego

Najpierw musisz znaleźć UUID użytkownika, który już istnieje w Twojej bazie Supabase:

```sql
-- Uruchom to zapytanie w Supabase SQL Editor
SELECT id, email FROM auth.users LIMIT 5;
```

Skopiuj `id` użytkownika, którego chcesz użyć do testowania.

### Krok 2: Skonfiguruj zmienne środowiskowe

Utwórz plik `.env` w głównym katalogu projektu (jeśli nie istnieje) i dodaj następujące zmienne:

```env
# Włączenie trybu testowego
DISABLE_AUTH_FOR_TESTING=true

# ID użytkownika testowego (MUSI istnieć w bazie!)
TEST_USER_ID=your-user-uuid-from-supabase

# Email użytkownika (opcjonalne, tylko do wyświetlania)
TEST_USER_EMAIL=test@example.com
```

### Krok 3: Zrestartuj serwer deweloperski

```bash
npm run dev
```

### Krok 4: Testuj aplikację

Teraz możesz:
- Wchodzić na chronione strony bez logowania (`/dashboard`, `/profile`, `/lists/new`)
- Korzystać z API endpointów bez tokenu autoryzacyjnego
- Testować całą funkcjonalność biznesową jako wybrany użytkownik

## Jak wyłączyć tryb testowy?

### Opcja 1: Wyłącz całkowicie

W pliku `.env` ustaw:

```env
DISABLE_AUTH_FOR_TESTING=false
```

lub po prostu usuń/zakomentuj linię.

### Opcja 2: Usuń zmienną

Usuń zmienną `DISABLE_AUTH_FOR_TESTING` z pliku `.env`.

Następnie zrestartuj serwer deweloperski.

## Jak to działa?

### Middleware

Middleware (`src/middleware/index.ts`) sprawdza zmienną `DISABLE_AUTH_FOR_TESTING`. Jeśli jest ustawiona na `true`:

1. Pomija sprawdzanie sesji Supabase
2. Wstawia fałszywego użytkownika testowego do `context.locals.user`
3. Używa ID i email z zmiennych środowiskowych

### Chronione strony

Wszystkie chronione strony sprawdzają `session` poprzez:

```typescript
const { data: { session } } = await Astro.locals.supabase.auth.getSession();
```

W trybie testowym, `context.locals.user` jest już wypełniony, więc możesz normalnie korzystać z aplikacji.

### API endpointy

API endpointy sprawdzają `context.locals.user`. W trybie testowym, ten obiekt zawiera dane użytkownika testowego.

## Przykładowa konfiguracja `.env`

```env
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
PUBLIC_SUPABASE_URL=https://your-project.supabase.co
PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# OpenRouter AI
OPENROUTER_API_KEY=your-api-key

# Tryb testowy (TYLKO development!)
DISABLE_AUTH_FOR_TESTING=true
TEST_USER_ID=12345678-1234-1234-1234-123456789abc
TEST_USER_EMAIL=test@example.com
```

## Weryfikacja

Po uruchomieniu serwera w trybie testowym, w konsoli zobaczysz:

```
⚠️  [Auth Middleware] TESTING MODE ACTIVE - Authentication bypassed!
[Auth Middleware] Using test user: test@example.com (12345678-1234-1234-1234-123456789abc)
```

## Troubleshooting

### Problem: Nadal widzę redirect do strony logowania

**Rozwiązanie:**
- Sprawdź, czy zrestartowałeś serwer deweloperski po zmianie `.env`
- Upewnij się, że `DISABLE_AUTH_FOR_TESTING=true` (bez spacji)
- Sprawdź, czy plik `.env` jest w głównym katalogu projektu

### Problem: Błąd podczas zapisu danych

**Rozwiązanie:**
- Upewnij się, że `TEST_USER_ID` to UUID **istniejącego** użytkownika w Supabase
- Sprawdź, czy użytkownik ma odpowiednie uprawnienia w Row Level Security (RLS)

### Problem: Brak danych użytkownika

**Rozwiązanie:**
- W trybie testowym, aplikacja używa `TEST_USER_ID` - wszystkie dane będą powiązane z tym użytkownikiem
- Jeśli użytkownik testowy nie ma jeszcze list/danych, dashboard będzie pusty (to normalne)

## Bezpieczeństwo

### ✅ Bezpieczne praktyki:
- Używaj tego trybu TYLKO lokalnie na swoim komputerze
- Nigdy nie commituj pliku `.env` do repozytorium
- Używaj dedykowanego użytkownika testowego (nie konta produkcyjnego)

### ❌ Niebezpieczne praktyki:
- Włączanie tego trybu na serwerze produkcyjnym
- Udostępnianie pliku `.env` z włączonym trybem testowym
- Używanie konta produkcyjnego jako TEST_USER_ID

## Usuwanie trybu testowego przed deployem

Przed deployem na production, upewnij się, że:

1. ✅ Plik `.env` zawiera `DISABLE_AUTH_FOR_TESTING=false` lub nie ma tej zmiennej w ogóle
2. ✅ Zmienne `TEST_USER_ID` i `TEST_USER_EMAIL` są usunięte lub zakomentowane
3. ✅ Serwer został zrestartowany

Możesz też dodać sprawdzenie w CI/CD pipeline:

```bash
# Sprawdź, czy tryb testowy nie jest włączony
if grep -q "DISABLE_AUTH_FOR_TESTING=true" .env 2>/dev/null; then
  echo "ERROR: Testing mode is enabled in .env!"
  exit 1
fi
```
