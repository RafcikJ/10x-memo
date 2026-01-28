# Szybki start - Testowanie bez autoryzacji

## ⏱️ 2 minuty do działającej aplikacji

### Krok 1: Znajdź ID użytkownika w Supabase

Otwórz **Supabase SQL Editor** i uruchom:

```sql
SELECT id, email FROM auth.users LIMIT 5;
```

Skopiuj `id` (UUID) jednego z użytkowników.

### Krok 2: Utwórz plik `.env`

W głównym katalogu projektu utwórz plik `.env` i wklej:

```env
# Twoje normalne zmienne Supabase
SUPABASE_URL=https://twoj-projekt.supabase.co
SUPABASE_KEY=twoj-anon-key
SUPABASE_SERVICE_ROLE_KEY=twoj-service-role-key
PUBLIC_SUPABASE_URL=https://twoj-projekt.supabase.co
PUBLIC_SUPABASE_ANON_KEY=twoj-anon-key

# OpenRouter (jeśli testujesz AI)
OPENROUTER_API_KEY=twoj-api-key

# ⚡ TRYB TESTOWY
DISABLE_AUTH_FOR_TESTING=true
TEST_USER_ID=WKLEJ-TUTAJ-UUID-Z-KROKU-1
TEST_USER_EMAIL=test@example.com
```

### Krok 3: Uruchom serwer

```bash
npm run dev
```

### ✅ Gotowe!

W konsoli zobaczysz:

```
⚠️  [Auth Middleware] TESTING MODE ACTIVE - Authentication bypassed!
[Auth Middleware] Using test user: test@example.com (...)
```

Teraz możesz:

- ✅ Wejść na `/dashboard` bez logowania
- ✅ Tworzyć nowe listy (`/lists/new`)
- ✅ Testować listy
- ✅ Zarządzać profilem
- ✅ Używać wszystkich funkcji API

## 🔴 Wyłączanie trybu testowego

W pliku `.env` zmień:

```env
DISABLE_AUTH_FOR_TESTING=false
```

lub usuń tę linię całkowicie. Potem zrestartuj serwer.

## 📖 Więcej informacji

Pełna dokumentacja w [`TESTING_MODE.md`](./TESTING_MODE.md)

## 🐛 Problemy?

### Nadal przekierowuje do logowania

- ✅ Sprawdź, czy `DISABLE_AUTH_FOR_TESTING=true` (bez spacji)
- ✅ Zrestartuj serwer `npm run dev`

### Błąd zapisu danych

- ✅ Upewnij się, że `TEST_USER_ID` to UUID **istniejącego** użytkownika
- ✅ Sprawdź czy użytkownik ma uprawnienia RLS w Supabase

### Pusta strona dashboard

- ✅ To normalne! Użytkownik testowy może nie mieć jeszcze żadnych danych
- ✅ Stwórz nową listę, aby przetestować funkcjonalność
