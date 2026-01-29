# Przewodnik Konfiguracji Email Templates w Supabase

## Problem do rozwiązania

### 1. Brak dopasowania do designu aplikacji

**Problem:** Domyślny template Supabase jest generyczny i nie pasuje do jasnej wersji strony Memo.

**Rozwiązanie:** Customowy template HTML dopasowany do brand identity (jasne kolory, czysty design, profesjonalny wygląd).

### 2. Niechciany kod OTP w emailu

**Problem:** Supabase domyślnie generuje i wyświetla 6-cyfrowy kod OTP jako alternatywną metodę logowania.

**Zgodnie z PRD i auth-spec:**

- ✅ Logowanie **TYLKO** przez magic link (kliknięcie)
- ❌ **BRAK** wpisywania kodu
- ❌ **BRAK** alternatywnych metod

**Rozwiązanie:** Template nie zawiera zmiennej `{{ .Token }}`, więc kod nie jest wyświetlany użytkownikowi.

---

## Instrukcja krok po kroku

### Przygotowanie

**Wymagania:**

- Dostęp do Supabase Dashboard (owner lub admin)
- Projekt Supabase z włączonym Email Auth
- Skonfigurowany SMTP provider (lub Supabase default)

### Krok 1: Kopiowanie template

1. Otwórz plik `.ai/email-templates/magic-link.html`
2. Zaznacz całą zawartość (Ctrl+A / Cmd+A)
3. Skopiuj do schowka (Ctrl+C / Cmd+C)

### Krok 2: Konfiguracja w Supabase Dashboard

#### A. Przejdź do Email Templates

1. Zaloguj się do [Supabase Dashboard](https://app.supabase.com)
2. Wybierz swój projekt
3. W lewym menu kliknij **Authentication**
4. Kliknij zakładkę **Email Templates**

#### B. Wybierz Magic Link template

W sekcji "Email Templates" zobaczysz listę typów emaili:

- Confirm signup
- Invite user
- **Magic Link** ← Wybierz ten
- Change email address
- Reset password

Kliknij na **"Magic Link"**

#### C. Edytuj template

1. W polu **"Subject"** wpisz:

   ```
   Link do logowania - Memo
   ```

2. W polu **"Message (HTML)"** (duży text area):
   - Usuń istniejącą zawartość
   - Wklej skopiowany kod z `magic-link.html`

3. **Sprawdź zmienne:**
   - ✅ Template powinien zawierać `{{ .ConfirmationURL }}` (link)
   - ❌ Template **NIE powinien** zawierać `{{ .Token }}` (kod OTP)

#### D. Zapisz zmiany

1. Kliknij przycisk **"Save"** na dole strony
2. Poczekaj na potwierdzenie (zielony toast "Template updated")

### Krok 3: Testowanie

#### A. Wyślij testowy email

W Supabase Dashboard, na stronie Email Templates:

1. Przewiń na dół do sekcji **"Send test email"**
2. Wpisz swój email testowy
3. Kliknij **"Send test email"**

#### B. Sprawdź email

Otwórz swoją skrzynkę i sprawdź:

**Checklist:**

- [ ] Email dotarł (sprawdź spam/junk jeśli nie)
- [ ] Temat: "Link do logowania - Memo"
- [ ] Wygląd przypomina jasną wersję strony
- [ ] Logo "Memo" jest widoczne w nagłówku
- [ ] Przycisk "Zaloguj się do Memo" jest widoczny i klikalny
- [ ] **Brak 6-cyfrowego kodu** w treści emaila
- [ ] Fallback link (jako tekst) jest widoczny pod przyciskiem
- [ ] Info box z informacjami o ważności linku (1h, jednorazowy)
- [ ] Email wygląda dobrze na mobile (jeśli testujesz na telefonie)

#### C. Przetestuj link

1. Kliknij przycisk "Zaloguj się do Memo" w emailu
2. Powinieneś zostać przekierowany do `/auth/callback`
3. Po pomyślnej weryfikacji → redirect do `/dashboard`

**Możliwe problemy:**

- Jeśli link nie działa: sprawdź konfigurację **Redirect URLs** (krok 4)
- Jeśli kod OTP jest widoczny: upewnij się, że template nie zawiera `{{ .Token }}`

### Krok 4: Weryfikacja konfiguracji Auth Settings

Wróć do **Authentication** → **Settings** i sprawdź:

#### Site URL

```
https://yourdomain.com        # Production
http://localhost:4321          # Development (Astro dev)
```

#### Redirect URLs

Dodaj następujące URL (osobne linie):

```
https://yourdomain.com/auth/callback
http://localhost:4321/auth/callback
```

#### Email Auth

- **Enable Email provider:** ✅ ON
- **Confirm email:** ❌ OFF (magic link działa bez potwierdzenia)
- **Secure email change:** ✅ ON

#### Session

- **JWT expiry:** 3600 (1 godzina)
- **Refresh token expiry:** 2592000 (30 dni)
- **Enable refresh token rotation:** ✅ ON

### Krok 5: SMTP Configuration (Production)

Dla production używamy external SMTP provider (nie Supabase default).

#### Przejdź do SMTP Settings

1. **Authentication** → **Settings** → **SMTP Settings**
2. Kliknij **"Enable Custom SMTP"**

#### Konfiguracja (przykład SendGrid)

```
SMTP Host: smtp.sendgrid.net
SMTP Port: 587
SMTP User: apikey
SMTP Password: [Your SendGrid API Key]
Sender email: noreply@yourdomain.com
Sender name: Memo
```

**Alternatywni providerzy:**

- **Mailgun:** smtp.mailgun.org, port 587
- **AWS SES:** email-smtp.region.amazonaws.com, port 587
- **Postmark:** smtp.postmarkapp.com, port 587

#### Weryfikacja domeny

**WAŻNE:** Aby emaile nie trafiały do spamu, skonfiguruj DNS records:

1. **SPF Record** (TXT):

   ```
   v=spf1 include:sendgrid.net ~all
   ```

2. **DKIM Record** (TXT):

   ```
   [Generowany przez SMTP providera]
   ```

3. **DMARC Record** (TXT):
   ```
   v=DMARC1; p=quarantine; rua=mailto:dmarc@yourdomain.com
   ```

Sprawdź deliverability na: https://www.mail-tester.com/

---

## Troubleshooting

### Problem 1: Kod OTP nadal się pokazuje

**Objaw:** W emailu widzisz 6-cyfrowy kod (np. "123456")

**Przyczyna:** Template zawiera zmienną `{{ .Token }}`

**Rozwiązanie:**

1. Wróć do Email Templates w Supabase Dashboard
2. Edytuj template Magic Link
3. Usuń **wszystkie** wystąpienia `{{ .Token }}`
4. Zapisz i wyślij testowy email ponownie

**Uwaga:** Kod OTP nadal będzie generowany przez Supabase (wymóg techniczny API), ale nie będzie widoczny dla użytkownika.

### Problem 2: Link nie działa (404 error)

**Objaw:** Po kliknięciu linku → "Page not found"

**Przyczyna:** Brak strony `/auth/callback` lub błędna konfiguracja Redirect URLs

**Rozwiązanie:**

1. Sprawdź czy istnieje plik `src/pages/auth/callback.astro`
2. W Supabase: **Authentication** → **URL Configuration** → **Redirect URLs**
3. Dodaj `https://yourdomain.com/auth/callback`
4. Zapisz i spróbuj ponownie

### Problem 3: Link wygasł natychmiast

**Objaw:** Po kliknięciu → "Link expired" (nawet po 10 sekundach)

**Przyczyna:** Niewłaściwa konfiguracja email confirmation

**Rozwiązanie:**

1. **Authentication** → **Email Auth Settings**
2. **Confirm email:** Ustaw na ❌ OFF
3. Magic Link nie wymaga potwierdzenia emaila (działa od razu)

### Problem 4: Email wygląda źle (bez stylów)

**Objaw:** Email to plain text bez formatowania

**Przyczyna:** Niektórzy klienci email blokują CSS lub HTML

**Rozwiązanie:**

- Nasz template używa **inline CSS** (najlepsza kompatybilność)
- Sprawdź czy wklejony template to plik `.html` (nie `.txt`)
- Jeśli problem występuje tylko w Outlook: to normalne (Outlook ma ograniczenia)

### Problem 5: Email trafia do spamu

**Objaw:** Email nie dociera lub jest w folderze spam

**Przyczyna:** Brak konfiguracji SPF/DKIM lub zły reputation score

**Rozwiązanie:**

1. Skonfiguruj SPF, DKIM, DMARC dla domeny (patrz krok 5)
2. Użyj zweryfikowanej domeny nadawcy (nie @gmail.com)
3. Unikaj spam words w temacie/treści
4. Test na: https://www.mail-tester.com/ (cel: score > 8/10)
5. Rozgrzej domenę (wysyłaj małe ilości na początku)

### Problem 6: "Rate limit exceeded" przy testowaniu

**Objaw:** Nie można wysłać kolejnego testowego emaila

**Przyczyna:** Supabase limit: 4 emaile/godzinę na jeden adres

**Rozwiązanie:**

- Użyj różnych adresów email do testowania (test1@, test2@, itd.)
- Poczekaj 1 godzinę
- W production to nie będzie problem (różni użytkownicy)

---

## Checklist przed wdrożeniem production

Przed przełączeniem na produkcję sprawdź:

### Email Template

- [ ] Template wklejony w Supabase Dashboard
- [ ] Subject line ustawiony: "Link do logowania - Memo"
- [ ] **Brak** `{{ .Token }}` w template
- [ ] Testowy email wysłany i wygląda poprawnie
- [ ] Przycisk działa (redirect do callback)

### Supabase Configuration

- [ ] Site URL ustawiony na production domain
- [ ] Redirect URLs zawierają production callback URL
- [ ] Email Auth włączony
- [ ] Confirm email wyłączony
- [ ] Session settings prawidłowe (30 dni)

### SMTP

- [ ] Custom SMTP provider skonfigurowany (nie Supabase default)
- [ ] Test email wysłany przez production SMTP
- [ ] SPF record dodany do DNS
- [ ] DKIM record dodany do DNS
- [ ] DMARC record dodany do DNS
- [ ] Mail-tester score > 8/10

### Testing

- [ ] End-to-end test: login → email → link → callback → dashboard
- [ ] Test na różnych klientach email (Gmail, Outlook, Apple Mail)
- [ ] Test na mobile (iOS, Android)
- [ ] Test rate limiting (5 prób w 15 min)
- [ ] Test link expiry (po 1 godzinie)

### Monitoring

- [ ] Logging włączony dla auth events
- [ ] Alert dla delivery failures
- [ ] Dashboard do monitorowania email deliverability

---

## Kolejne kroki po wdrożeniu

### 1. Monitorowanie

Śledź metryki:

- **Delivery rate:** % emaili dostarczonych
- **Open rate:** % emaili otwartych
- **Click rate:** % kliknięć w link
- **Bounce rate:** % odrzuconych emaili
- **Spam complaints:** Liczba zgłoszeń jako spam

**Narzędzia:**

- SendGrid Analytics (jeśli używasz SendGrid)
- Mailgun Dashboard (jeśli używasz Mailgun)
- Google Analytics (track konwersję po kliknięciu)

### 2. Optymalizacja

Na podstawie metryk:

- Jeśli niski open rate → test różnych subject lines
- Jeśli niski click rate → test różnych CTA (przycisk)
- Jeśli wysoki spam rate → zmień treść/nadawcę

### 3. Rozszerzenie

Dodaj inne templates (opcjonalnie):

- **Email Change Confirmation** - gdy użytkownik zmienia email
- **Password Reset** - jeśli w przyszłości dodamy hasła
- **Welcome Email** - po pierwszym zalogowaniu

### 4. Lokalizacja

Jeśli w przyszłości chcesz wiele języków:

- Supabase wspiera różne templates per język
- Dodaj templates EN, DE, etc.
- Wykrywaj język z browser headers

---

## Wsparcie i dokumentacja

### Oficjalna dokumentacja Supabase

- [Email Templates](https://supabase.com/docs/guides/auth/auth-email-templates)
- [SMTP Configuration](https://supabase.com/docs/guides/auth/auth-smtp)
- [Rate Limiting](https://supabase.com/docs/guides/auth/rate-limits)

### Email Design Resources

- [Email on Acid](https://www.emailonacid.com/) - Testing tool
- [Litmus](https://www.litmus.com/) - Email testing
- [Can I Email](https://www.caniemail.com/) - CSS support matrix

### SMTP Providers

- [SendGrid](https://sendgrid.com/)
- [Mailgun](https://www.mailgun.com/)
- [AWS SES](https://aws.amazon.com/ses/)
- [Postmark](https://postmarkapp.com/)

---

## Changelog

### 2026-01-29 - Initial version

- ✅ Stworzono customowy template dopasowany do jasnej wersji strony
- ✅ Usunięto kod OTP z template (tylko magic link)
- ✅ Dodano responsywny design
- ✅ Dodano fallback link tekstowy
- ✅ Dodano info box z ważnymi informacjami

### Następne aktualizacje

- [ ] Dodanie logo jako obrazek (obecnie tekst)
- [ ] A/B testing różnych CTA buttonów
- [ ] Lokalizacja (EN, DE)

---

**Pytania?** Sprawdź również `.ai/email-templates/README.md` dla szczegółów technicznych.
