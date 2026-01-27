# Testy API dla AI Quota Service

Ten folder zawiera narzędzia do testowania serwisu `ai-quota.ts` za pomocą Postmana lub cURL.

## 📁 Zawartość

- **`postman-curl-examples.md`** - Szczegółowe przykłady zapytań cURL z opisami
- **`AI-Quota-Tests.postman_collection.json`** - Gotowa kolekcja Postmana (27 requestów)
- **`AI-Quota-Tests.postman_environment.json`** - Environment file dla Postmana
- **`README.md`** - Ten plik (instrukcja)

## 🚀 Szybki start

### Opcja 1: Import do Postmana (ZALECANE)

1. **Otwórz Postman**

2. **Zaimportuj kolekcję:**
   - Kliknij przycisk **Import** (góra, po lewej)
   - Przeciągnij plik `AI-Quota-Tests.postman_collection.json`
   - Lub kliknij **Choose Files** i wybierz plik
   - Kliknij **Import**

3. **Zaimportuj environment:**
   - Kliknij przycisk **Import** ponownie
   - Przeciągnij plik `AI-Quota-Tests.postman_environment.json`
   - Kliknij **Import**

4. **Skonfiguruj environment:**
   - W prawym górnym rogu wybierz **AI Quota Tests - Local**
   - Kliknij ikonę oka (👁️) → **Edit**
   - Ustaw wartość dla `auth_token` (patrz sekcja poniżej)
   - **Save**

5. **Gotowe!** Możesz teraz uruchamiać testy z kolekcji.

### Opcja 2: Użycie cURL

Otwórz plik `postman-curl-examples.md` i kopiuj przykładowe komendy.

Pamiętaj, aby ustawić zmienne:
```bash
export BASE_URL="http://localhost:4321"
export AUTH_TOKEN="twój_token_tutaj"
```

## 🔑 Jak uzyskać token autoryzacji

Token `auth_token` jest potrzebny do autoryzacji żądań API.

### Metoda 1: Z przeglądarki (najprostsze)

1. Uruchom aplikację lokalnie:
   ```bash
   npm run dev
   ```

2. Otwórz aplikację w przeglądarce: `http://localhost:4321`

3. **Zaloguj się** do aplikacji

4. Otwórz **DevTools** (F12)

5. Przejdź do zakładki **Application** (Chrome) lub **Storage** (Firefox)

6. Znajdź **Session Storage** lub **Cookies**

7. Szukaj klucza podobnego do:
   - `sb-access-token`
   - `supabase.auth.token`
   - Lub podobnego zawierającego "token"

8. **Skopiuj wartość tokenu** (długi ciąg znaków)

9. Wklej token w Postmanie jako wartość zmiennej `auth_token`

### Metoda 2: Z Supabase Dashboard

1. Zaloguj się do [Supabase Dashboard](https://app.supabase.com)
2. Wybierz swój projekt
3. Idź do **Authentication** → **Users**
4. Znajdź swojego użytkownika
5. Kliknij **...** → **Copy Access Token**
6. Wklej token w Postmanie

### Metoda 3: Programowo (dla deweloperów)

Dodaj tymczasowo w kodzie aplikacji:
```javascript
const { data: { session } } = await supabase.auth.getSession();
console.log('Token:', session?.access_token);
```

## 📋 Struktura kolekcji Postmana

Kolekcja zawiera 4 foldery z testami:

### 1. Sukces - Generowanie listy (7 requestów)
- Testuje wszystkie kategorie: animals, food, household_items, transport, jobs
- Testuje różne liczby: min (10), max (50), średnie (15-30)
- **Wszystkie powinny zwrócić 200 OK** (jeśli nie przekroczono limitu)

### 2. Błędy walidacji - 400 (7 requestów)
- Nieprawidłowa kategoria
- Count poniżej/powyżej limitu
- Nieprawidłowy JSON
- Brakujące pola
- **Wszystkie powinny zwrócić 400 Bad Request**

### 3. Błędy autoryzacji - 401 (2 requesty)
- Brak tokenu
- Nieprawidłowy token
- **Wszystkie powinny zwrócić 401 Unauthorized**

### 4. Test Rate Limit - 429 (6 requestów)
- Requesty 1-5: **Powinny zwrócić 200 OK**
- Request 6: **Powinien zwrócić 429 Too Many Requests**

## 🧪 Jak testować

### Podstawowy test flow:

1. **Sprawdź, czy aplikacja działa:**
   ```bash
   curl http://localhost:4321
   ```

2. **Uruchom podstawowy request sukcesu** (z folderu 1)
   - Powinien zwrócić 200 OK z listą słów

3. **Przetestuj błędy walidacji** (folder 2)
   - Każdy request powinien zwrócić 400 Bad Request

4. **Przetestuj autoryzację** (folder 3)
   - Ustaw pusty/nieprawidłowy token
   - Powinno zwrócić 401 Unauthorized

5. **Przetestuj rate limiting** (folder 4)
   - **WAŻNE:** Uruchamiaj requesty po kolei (1→2→3→4→5→6)
   - Pierwsze 5 powinno zwrócić 200 OK
   - Szósty powinien zwrócić 429 Too Many Requests

### Test rate limitu krok po kroku:

```
✅ Request 1/5 → 200 OK (remaining: 4)
✅ Request 2/5 → 200 OK (remaining: 3)
✅ Request 3/5 → 200 OK (remaining: 2)
✅ Request 4/5 → 200 OK (remaining: 1)
✅ Request 5/5 → 200 OK (remaining: 0)
❌ Request 6/5 → 429 Too Many Requests
```

### Resetowanie limitu:

Limit resetuje się **o północy UTC**. 

Aby przetestować ponownie przed północą:
1. Otwórz **Supabase Dashboard**
2. Idź do **Table Editor** → `ai_usage_daily`
3. **Usuń** rekord dla swojego użytkownika
4. Możesz teraz ponownie wykonać 5 requestów

## 📊 Oczekiwane odpowiedzi

### ✅ Sukces (200 OK)
```json
{
  "success": true,
  "items": [
    { "position": 1, "display": "Cat" },
    { "position": 2, "display": "Dog" },
    ...
  ]
}
```

### ❌ Błąd walidacji (400)
```json
{
  "error": "validation_error",
  "message": "Invalid request data",
  "details": {
    "category": ["Invalid enum value"]
  }
}
```

### ❌ Brak autoryzacji (401)
```json
{
  "error": "unauthorized",
  "message": "Authentication required"
}
```

### ❌ Przekroczenie limitu (429)
```json
{
  "error": "rate_limit_exceeded",
  "message": "Daily AI generation limit exceeded (5/day)",
  "reset_at": "2026-01-28T00:00:00.000Z",
  "retry_after": 43200
}
```

## 🔧 Troubleshooting

### Problem: Wszystkie requesty zwracają 401

**Rozwiązanie:**
- Sprawdź, czy token jest prawidłowy
- Sprawdź, czy token nie wygasł (tokeny Supabase wygasają po 1 godzinie)
- Zaloguj się ponownie i pobierz nowy token

### Problem: Request 1/5 zwraca 429

**Rozwiązanie:**
- Już wykorzystałeś dzienny limit
- Poczekaj do północy UTC lub usuń rekord z `ai_usage_daily` w Supabase

### Problem: 500 Internal Server Error

**Rozwiązanie:**
- Sprawdź logi serwera (terminal gdzie działa `npm run dev`)
- Sprawdź, czy masz ustawione zmienne środowiskowe:
  - `OPENROUTER_API_KEY`
  - `SUPABASE_URL`
  - `SUPABASE_ANON_KEY`

### Problem: Connection refused

**Rozwiązanie:**
- Upewnij się, że aplikacja działa: `npm run dev`
- Sprawdź, czy port 4321 jest wolny

## 📝 Dodatkowe zasoby

- **Dokumentacja Postman:** https://learning.postman.com/docs/
- **Dokumentacja cURL:** https://curl.se/docs/
- **Supabase Docs:** https://supabase.com/docs

## 💡 Wskazówki

- Używaj **Collection Runner** w Postmanie do automatycznego uruchomienia wszystkich testów
- Dodaj **Tests** w Postmanie do automatycznej weryfikacji odpowiedzi
- Użyj **Pre-request Scripts** do automatycznego odświeżania tokenu
- Zapisz różne tokeny jako osobne environments (dev, staging, prod)

## ✅ Checklist testowy

Upewnij się, że przetestowałeś:

- [ ] ✅ Generowanie listy dla każdej kategorii (animals, food, household_items, transport, jobs)
- [ ] ✅ Walidacja: nieprawidłowa kategoria
- [ ] ✅ Walidacja: count poniżej/powyżej limitu
- [ ] ✅ Walidacja: brakujące pola
- [ ] ✅ Walidacja: nieprawidłowy JSON
- [ ] ✅ Autoryzacja: brak tokenu
- [ ] ✅ Autoryzacja: nieprawidłowy token
- [ ] ✅ Rate limit: 5 requestów sukces
- [ ] ✅ Rate limit: 6. request zwraca 429
- [ ] ✅ Reset limitu o północy UTC

---

**Powodzenia w testowaniu! 🚀**
