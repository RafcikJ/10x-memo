# 🚨 Instrukcja wdrożenia Email Template w Supabase Dashboard

## Problem

Email przychodzi w domyślnej formie Supabase z kodem OTP, mimo że template jest gotowy.

## Rozwiązanie - 5 kroków

---

### Krok 1: Otwórz plik template

W VSCode/Cursor:

1. Otwórz plik: `.ai/email-templates/magic-link.html`
2. Zaznacz **całą zawartość** (Ctrl+A / Cmd+A)
3. Skopiuj do schowka (Ctrl+C / Cmd+C)

---

### Krok 2: Otwórz Supabase Dashboard

1. Przejdź do: https://app.supabase.com
2. Zaloguj się (jeśli nie jesteś)
3. Wybierz swój projekt z listy

---

### Krok 3: Przejdź do Email Templates (WAŻNE!)

**DOKŁADNA ŚCIEŻKA:**

1. W lewym menu kliknij: **Authentication** (ikona klucza 🔑)
2. W górnym menu (pod tytułem "Authentication") kliknij zakładkę: **Email Templates**
3. Na liście typów emaili znajdź i kliknij: **"Magic Link"**

**⚠️ UWAGA:** NIE wybieraj "Confirm signup" ani innych - **TYLKO "Magic Link"**!

---

### Krok 4: Wklej template

Teraz zobaczysz formularz z polami:

#### A. Pole "Subject"

- **Usuń** obecny tekst (np. "Magic Link")
- **Wpisz:** `Link do logowania - Memo`

#### B. Pole "Message (HTML)" - duży textarea

- **Usuń CAŁĄ** obecną zawartość (domyślny HTML)
- **Wklej** skopiowany kod z `magic-link.html` (Ctrl+V / Cmd+V)

#### C. Sprawdź zawartość

Przewiń w dół wklejonego kodu i **ZWERYFIKUJ**:

- ✅ Na pewno widzisz: `{{ .ConfirmationURL }}`
- ❌ NIE MOŻE być: `{{ .Token }}` (jeśli jest - usuń linijkę z tym tekstem)

---

### Krok 5: Zapisz i przetestuj

1. **Przewiń na dół** strony
2. Kliknij przycisk: **"Save"** (zielony przycisk)
3. Poczekaj na potwierdzenie (zielony toast "Template updated")

**Test:**

1. Przewiń jeszcze niżej do sekcji "Send test email"
2. Wpisz swój email testowy
3. Kliknij **"Send test email"**
4. Sprawdź skrzynkę

---

## ✅ Jak powinien wyglądać email PO wdrożeniu

**Temat:** `Link do logowania - Memo`

**Treść:**

```
        Memo
────────────────────────

Zaloguj się do swojego konta

[Jasny komunikat]

┌─────────────────────────┐
│  Zaloguj się do Memo    │  ← Czarny przycisk
└─────────────────────────┘

┌────────────────────────┐
│ ℹ️ Ważne informacje:    │
│ • Ważny 1h             │
│ • Jednorazowy          │
└────────────────────────┘
```

**⚠️ KRYTYCZNE:** NIE MOŻE być widoczny kod (np. "enter the code: 152635")

---

## 🐛 Troubleshooting

### Problem: "Nadal widzę stary template"

**Możliwe przyczyny i rozwiązania:**

#### 1. Template nie został zapisany

- Sprawdź czy kliknąłeś **"Save"**
- Sprawdź czy zobaczyłeś zielony toast "Template updated"

#### 2. Cache w przeglądarce

- **Hard refresh:** Ctrl+Shift+R (Chrome/Edge) / Cmd+Shift+R (Mac)
- Lub otwórz Supabase Dashboard w trybie incognito
- Wyślij testowy email ponownie

#### 3. Edytowałeś zły typ emaila

- Sprawdź czy wybrałeś **"Magic Link"**, nie "Confirm signup"
- Wróć do Authentication → Email Templates → **Magic Link**
- Sprawdź czy tam jest Twój customowy template

#### 4. Projekt Supabase - multiple environments

- Sprawdź czy jesteś w **właściwym projekcie**
- Dev vs Production - upewnij się który używasz lokalnie

#### 5. Kod OTP nadal się pokazuje

- Wróć do Email Templates → Magic Link
- Znajdź w HTML: `{{ .Token }}`
- **USUŃ całą linię** z tym tekstem (np. `<p>Alternatively, enter the code: {{ .Token }}</p>`)
- Zapisz ponownie

---

### Problem: "Link w emailu nie działa (404)"

**Rozwiązanie:**

1. **Authentication** → **URL Configuration**
2. **Redirect URLs** - dodaj:
   ```
   http://localhost:4321/auth/callback
   ```
   (NIE `localhost:3000` - Astro używa `4321`!)

---

### Problem: "Email w ogóle nie przychodzi"

**Rozwiązanie:**

1. Sprawdź spam/junk folder
2. Sprawdź czy email jest poprawny
3. Sprawdź rate limit (max 4 emaile/godzinę w dev)
4. Sprawdź Supabase logs: **Logs** → **Auth Logs**

---

## 📋 Checklist przed potwierdzeniem sukcesu

Po wysłaniu testowego emaila, sprawdź:

- [ ] Email dotarł (sprawdziłem spam)
- [ ] Temat: "Link do logowania - Memo" (nie "Magic Link")
- [ ] Widoczne logo "Memo" w nagłówku
- [ ] Czarny przycisk "Zaloguj się do Memo"
- [ ] **BRAK** kodu 6-cyfrowego (np. "152635")
- [ ] Info box z informacjami (1h, jednorazowy)
- [ ] Fallback link (mały tekst) pod przyciskiem
- [ ] Email wygląda profesjonalnie (jasne tło, czarne akcenty)

---

## 🎯 Szybka weryfikacja

Jeśli otrzymałeś email zawierający:

```html
<h2>Magic Link</h2>
<p>Alternatively, enter the code: 152635</p>
```

To znaczy że template **NIE ZOSTAŁ** wklejony w Supabase.

Jeśli otrzymałeś email zawierający:

```html
<h2 class="email-title">Zaloguj się do swojego konta</h2>
```

To znaczy że template **ZOSTAŁ POPRAWNIE** wdrożony! 🎉

---

## Dodatkowe uwagi

### Local Supabase (jeśli używasz `supabase start`)

Jeśli pracujesz z lokalnym Supabase:

1. Email templates NIE są synchronizowane z Dashboard
2. Musisz edytować je w `supabase/config.toml`:
   ```toml
   [auth.email.template.magic_link]
   subject = "Link do logowania - Memo"
   content_path = "./supabase/templates/magic-link.html"
   ```
3. Utwórz folder `supabase/templates/`
4. Skopiuj tam `magic-link.html`
5. Zrestartuj local Supabase: `supabase stop && supabase start`

### Production vs Development

- **Development:** Wklej template w projekcie DEV w Supabase Dashboard
- **Production:** Wklej TEN SAM template w projekcie PROD

Możesz mieć różne projekty Supabase dla dev/prod - upewnij się że konfigurujesz właściwy!

---

**Potrzebujesz pomocy?** Zobacz też:

- `.ai/email-templates/QUICKSTART.md` - TL;DR wersja
- `.ai/email-templates/CONFIGURATION_GUIDE.md` - Pełna instrukcja
- `.ai/email-templates/PREVIEW.md` - Jak powinien wyglądać email

---

**Autor:** AI Assistant  
**Data:** 2026-01-29  
**Status:** ✅ Gotowe do użycia
