# 🚀 Quick Start - Email Template Setup

## TL;DR - 5 minut do wdrożenia

### Krok 1: Skopiuj template (30 sekund)

```bash
# Otwórz plik:
.ai/email-templates/magic-link.html

# Zaznacz wszystko i skopiuj do schowka
```

### Krok 2: Wklej do Supabase (2 minuty)

1. Otwórz [Supabase Dashboard](https://app.supabase.com)
2. **Authentication** → **Email Templates** → **Magic Link**
3. **Subject:** `Link do logowania - Memo`
4. **Message (HTML):** Wklej skopiowany kod
5. **Zapisz** (Save button)

### Krok 3: Test (1 minuta)

1. Na dole strony: **"Send test email"**
2. Wpisz swój email
3. Kliknij **Send**
4. Sprawdź skrzynkę

### ✅ Checklist sukcesu

Sprawdź w emailu testowym:

- [ ] Temat: "Link do logowania - Memo"
- [ ] Wygląd przypomina jasną wersję strony (biały + czarny)
- [ ] Przycisk "Zaloguj się do Memo" jest widoczny
- [ ] **BRAK 6-cyfrowego kodu** w treści
- [ ] Info box z informacjami (1h, jednorazowy)
- [ ] Fallback link pod przyciskiem

### ❌ Jeśli coś nie działa

**Problem:** Kod OTP (123456) jest widoczny
→ **Rozwiązanie:** Upewnij się, że template NIE zawiera `{{ .Token }}`

**Problem:** Link nie działa (404)
→ **Rozwiązanie:** Dodaj Redirect URL w **Authentication** → **Settings**:

```
https://yourdomain.com/auth/callback
http://localhost:4321/auth/callback
```

**Problem:** Email nie dotarł
→ **Rozwiązanie:** Sprawdź spam/junk folder

---

## Więcej informacji

**Szczegółowy setup:** `.ai/email-templates/CONFIGURATION_GUIDE.md`  
**Podgląd designu:** `.ai/email-templates/PREVIEW.md`  
**Techniczne detale:** `.ai/email-templates/README.md`

---

## Pytania?

### Czy muszę coś zmienić w kodzie aplikacji?

❌ **NIE.** To tylko konfiguracja w Supabase Dashboard. Kod aplikacji pozostaje bez zmian.

### Czy to działa od razu na production?

✅ **TAK**, ale zalecamy:

1. Skonfigurować custom SMTP (SendGrid/Mailgun)
2. Dodać SPF/DKIM records
3. Przetestować deliverability

### Co z kodem OTP?

Supabase nadal generuje kod (wymóg API), ale **nie jest on wyświetlany** użytkownikowi.  
Zgodnie z PRD: logowanie **TYLKO** przez magic link (kliknięcie).

### Mogę dostosować kolory?

✅ **TAK.** Edytuj sekcję `<style>` w `magic-link.html` przed wklejeniem do Supabase.

---

## Gotowe! 🎉

Po wykonaniu 3 kroków powyżej, Twoje emaile magic link:

- ✅ Wyglądają profesjonalnie
- ✅ Pasują do designu aplikacji (jasna wersja)
- ✅ Nie pokazują niechcianego kodu OTP
- ✅ Są responsywne (mobile + desktop)
- ✅ Mają wysoką deliverability

**Czas realizacji:** 5 minut  
**Poziom trudności:** Łatwy (copy-paste)  
**Wymagane uprawnienia:** Admin/Owner w Supabase
