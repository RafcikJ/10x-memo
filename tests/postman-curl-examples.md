# Przykłady zapytań cURL do testowania AI Quota

Ten dokument zawiera przykładowe zapytania cURL do testowania funkcjonalności `ai-quota.ts` w Postmanie.

## Konfiguracja

Przed rozpoczęciem testów ustaw następujące zmienne:

```bash
# URL aplikacji (development)
BASE_URL="http://localhost:4321"

# Token autoryzacji Supabase
# Musisz się zalogować w aplikacji i skopiować token z session storage/cookies
AUTH_TOKEN="your_supabase_access_token_here"
```

### Jak uzyskać token autoryzacji:

1. Otwórz aplikację w przeglądarce
2. Zaloguj się do aplikacji
3. Otwórz DevTools (F12) → Application/Storage → Session Storage lub Cookies
4. Znajdź token `sb-access-token` lub podobny
5. Skopiuj wartość tokenu

---

## 1. Podstawowe zapytanie - Generowanie listy (konsumuje quota)

### Sukces (200 OK)

```bash
curl -X POST "${BASE_URL}/api/ai/generate-list" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${AUTH_TOKEN}" \
  -d '{
    "category": "animals",
    "count": 10
  }'
```

**Oczekiwana odpowiedź:**

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

---

## 2. Test różnych kategorii

### Kategoria: food

```bash
curl -X POST "${BASE_URL}/api/ai/generate-list" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${AUTH_TOKEN}" \
  -d '{
    "category": "food",
    "count": 15
  }'
```

### Kategoria: household_items

```bash
curl -X POST "${BASE_URL}/api/ai/generate-list" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${AUTH_TOKEN}" \
  -d '{
    "category": "household_items",
    "count": 20
  }'
```

### Kategoria: transport

```bash
curl -X POST "${BASE_URL}/api/ai/generate-list" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${AUTH_TOKEN}" \
  -d '{
    "category": "transport",
    "count": 25
  }'
```

### Kategoria: jobs

```bash
curl -X POST "${BASE_URL}/api/ai/generate-list" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${AUTH_TOKEN}" \
  -d '{
    "category": "jobs",
    "count": 30
  }'
```

---

## 3. Test limitów count

### Minimalna liczba (10)

```bash
curl -X POST "${BASE_URL}/api/ai/generate-list" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${AUTH_TOKEN}" \
  -d '{
    "category": "animals",
    "count": 10
  }'
```

### Maksymalna liczba (50)

```bash
curl -X POST "${BASE_URL}/api/ai/generate-list" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${AUTH_TOKEN}" \
  -d '{
    "category": "animals",
    "count": 50
  }'
```

---

## 4. Błędy walidacji (400 Bad Request)

### Nieprawidłowa kategoria

```bash
curl -X POST "${BASE_URL}/api/ai/generate-list" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${AUTH_TOKEN}" \
  -d '{
    "category": "invalid_category",
    "count": 10
  }'
```

**Oczekiwana odpowiedź:**

```json
{
  "error": "validation_error",
  "message": "Invalid request data",
  "details": {
    "category": ["Invalid enum value. Expected 'animals' | 'food' | 'household_items' | 'transport' | 'jobs'"]
  }
}
```

### Count poniżej minimum (< 10)

```bash
curl -X POST "${BASE_URL}/api/ai/generate-list" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${AUTH_TOKEN}" \
  -d '{
    "category": "animals",
    "count": 5
  }'
```

**Oczekiwana odpowiedź:**

```json
{
  "error": "validation_error",
  "message": "Invalid request data",
  "details": {
    "count": ["Number must be greater than or equal to 10"]
  }
}
```

### Count powyżej maksimum (> 50)

```bash
curl -X POST "${BASE_URL}/api/ai/generate-list" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${AUTH_TOKEN}" \
  -d '{
    "category": "animals",
    "count": 100
  }'
```

**Oczekiwana odpowiedź:**

```json
{
  "error": "validation_error",
  "message": "Invalid request data",
  "details": {
    "count": ["Number must be less than or equal to 50"]
  }
}
```

### Nieprawidłowy JSON

```bash
curl -X POST "${BASE_URL}/api/ai/generate-list" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${AUTH_TOKEN}" \
  -d 'invalid json'
```

**Oczekiwana odpowiedź:**

```json
{
  "error": "invalid_json",
  "message": "Request body must be valid JSON"
}
```

### Brakujące pola

```bash
curl -X POST "${BASE_URL}/api/ai/generate-list" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${AUTH_TOKEN}" \
  -d '{}'
```

**Oczekiwana odpowiedź:**

```json
{
  "error": "validation_error",
  "message": "Invalid request data",
  "details": {
    "category": ["Required"],
    "count": ["Required"]
  }
}
```

---

## 5. Test autoryzacji (401 Unauthorized)

### Brak tokenu

```bash
curl -X POST "${BASE_URL}/api/ai/generate-list" \
  -H "Content-Type: application/json" \
  -d '{
    "category": "animals",
    "count": 10
  }'
```

**Oczekiwana odpowiedź:**

```json
{
  "error": "unauthorized",
  "message": "Authentication required"
}
```

### Nieprawidłowy token

```bash
curl -X POST "${BASE_URL}/api/ai/generate-list" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer invalid_token_12345" \
  -d '{
    "category": "animals",
    "count": 10
  }'
```

**Oczekiwana odpowiedź:**

```json
{
  "error": "unauthorized",
  "message": "Authentication required"
}
```

---

## 6. Test Rate Limit (429 Too Many Requests)

### Przekroczenie dziennego limitu (5 generacji)

Wywołaj endpoint 5 razy, a przy 6. próbie otrzymasz błąd rate limit:

```bash
# Wywołaj 6 razy:
for i in {1..6}; do
  echo "Request $i:"
  curl -X POST "${BASE_URL}/api/ai/generate-list" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer ${AUTH_TOKEN}" \
    -d '{
      "category": "animals",
      "count": 10
    }'
  echo -e "\n\n"
  sleep 1
done
```

**Oczekiwana odpowiedź (przy 6. żądaniu):**

```json
{
  "error": "rate_limit_exceeded",
  "message": "Daily AI generation limit exceeded (5/day)",
  "reset_at": "2026-01-28T00:00:00.000Z",
  "retry_after": 43200
}
```

---

## 7. Test z verbose output (debugging)

Dodaj `-v` flag aby zobaczyć szczegóły HTTP:

```bash
curl -v -X POST "${BASE_URL}/api/ai/generate-list" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${AUTH_TOKEN}" \
  -d '{
    "category": "animals",
    "count": 10
  }'
```

---

## 8. Zapisywanie odpowiedzi do pliku

```bash
curl -X POST "${BASE_URL}/api/ai/generate-list" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${AUTH_TOKEN}" \
  -d '{
    "category": "animals",
    "count": 10
  }' \
  -o response.json
```

---

## 9. Import do Postmana

### Sposób 1: Import cURL bezpośrednio

1. Otwórz Postman
2. Kliknij **Import**
3. Wybierz **Raw text**
4. Wklej polecenie cURL
5. Kliknij **Continue** → **Import**

### Sposób 2: Tworzenie kolekcji ręcznie

1. Utwórz nową kolekcję: **AI Quota Tests**
2. Dodaj zmienne środowiskowe:
   - `base_url`: `http://localhost:4321`
   - `auth_token`: (twój token)
3. Dodaj requesty z powyższych przykładów
4. W URL użyj: `{{base_url}}/api/ai/generate-list`
5. W Headers użyj: `Authorization: Bearer {{auth_token}}`

---

## 10. Testowanie scenariuszy quota

### Sprawdzenie stanu quota (logika biznesowa)

Aby przetestować działanie quota, wykonaj następujące kroki:

1. **Sprawdź bieżący stan** - wywołaj endpoint pierwszy raz
2. **Zużyj 4 kolejne** - wywołaj endpoint 4 razy
3. **Sprawdź ostatnią próbę** - 5. wywołanie powinno zadziałać
4. **Testuj przekroczenie** - 6. wywołanie powinno zwrócić 429
5. **Sprawdź reset time** - zapisz wartość `reset_at` z odpowiedzi
6. **Testuj po resecie** - poczekaj do północy UTC i spróbuj ponownie

### Skrypt bash do automatycznego testowania quota

```bash
#!/bin/bash

BASE_URL="http://localhost:4321"
AUTH_TOKEN="your_token_here"
ENDPOINT="${BASE_URL}/api/ai/generate-list"

echo "=== Testing AI Quota System ==="
echo ""

for i in {1..6}; do
  echo "--- Request $i/6 ---"

  response=$(curl -s -w "\nHTTP_STATUS:%{http_code}" -X POST "$ENDPOINT" \
    -H "Content-Type: application/json" \
    -H "Authorization: Bearer $AUTH_TOKEN" \
    -d "{\"category\": \"animals\", \"count\": 10}")

  http_status=$(echo "$response" | grep "HTTP_STATUS" | cut -d: -f2)
  body=$(echo "$response" | sed '/HTTP_STATUS/d')

  echo "Status: $http_status"
  echo "Response: $body" | jq '.' 2>/dev/null || echo "$body"
  echo ""

  if [ "$http_status" == "429" ]; then
    echo "✓ Rate limit reached at request $i"
    break
  fi

  sleep 1
done

echo "=== Test completed ==="
```

---

## Uwagi końcowe

### Najważniejsze rzeczy do przetestowania:

1. ✅ **Sukces** - Generowanie działa poprawnie
2. ✅ **Walidacja** - Nieprawidłowe dane są odrzucane
3. ✅ **Autoryzacja** - Tylko zalogowani użytkownicy mają dostęp
4. ✅ **Rate Limit** - Limit 5/dzień jest egzekwowany
5. ✅ **Reset Time** - Quota resetuje się o północy UTC
6. ✅ **Error Handling** - Wszystkie błędy zwracają odpowiednie kody HTTP

### Kody statusów HTTP:

- `200 OK` - Sukces
- `400 Bad Request` - Błąd walidacji
- `401 Unauthorized` - Brak/nieprawidłowa autoryzacja
- `429 Too Many Requests` - Przekroczony limit
- `500 Internal Server Error` - Błąd serwera/AI

### Debugowanie:

Jeśli napotkasz problemy:

1. Sprawdź logi serwera (konsola gdzie działa dev server)
2. Użyj `-v` flag w cURL dla szczegółów HTTP
3. Sprawdź czy aplikacja działa: `curl http://localhost:4321`
4. Zweryfikuj token autoryzacji w Supabase Dashboard
