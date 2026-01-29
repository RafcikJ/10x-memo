# Email Templates - Memo

## Przegląd

Ten folder zawiera customowe szablony emaili dla Supabase Auth.

## Szablony

### 1. Magic Link Email (`magic-link.html`)

**Przeznaczenie:** Email wysyłany przy logowaniu przez magic link

**Kluczowe cechy:**

- ✅ Dopasowany do jasnej wersji strony (light theme)
- ✅ Responsywny design (mobile-first)
- ✅ Profesjonalny wygląd zgodny z brandem Memo
- ✅ **BRAK alternatywnego kodu OTP** (tylko link)
- ✅ Przycisk CTA z dobrymi praktykami email marketingu
- ✅ Fallback link jako tekst (dla klientów blokujących przyciski)
- ✅ Jasne informacje o ważności i jednorazowości linku

**Design system:**

- Kolory: `#18181b` (primary dark), `#f5f5f5` (bg), `#ffffff` (card)
- Typografia: System fonts stack dla maksymalnej kompatybilności
- Spacing: Konsekwentne odstępy 16/24/32/40px
- Border radius: 8px dla przycisków, 4px dla info-box

## Konfiguracja w Supabase Dashboard

### Krok 1: Przejdź do Email Templates

1. Otwórz Supabase Dashboard
2. Wybierz projekt
3. Przejdź do **Authentication** → **Email Templates**
4. Wybierz **Magic Link**

### Krok 2: Zaktualizuj template

1. **Skopiuj zawartość** `magic-link.html`
2. **Wklej w pole "Email Template"** w Supabase
3. **Subject line:** `Link do logowania - Memo`

### Krok 3: Wyłącz kod OTP w treści

**WAŻNE:** Domyślnie Supabase generuje zarówno link jak i 6-cyfrowy kod OTP.

**Aby wyłączyć wyświetlanie kodu OTP:**

1. W szablonie **NIE używaj** zmiennej `{{ .Token }}`
2. Upewnij się, że template zawiera tylko `{{ .ConfirmationURL }}`
3. Kod będzie nadal generowany przez Supabase (wymóg techniczny), ale **nie będzie widoczny dla użytkownika**

**Alternatywnie** (jeśli chcesz całkowicie wyłączyć OTP):

- W **Auth Settings** → **Email OTP** → Zostaw włączone (wymagane dla magic link)
- Po prostu nie wyświetlaj kodu w template - użytkownik go nie zobaczy

### Krok 4: Zmienne dostępne w template

Supabase dostarcza następujące zmienne:

| Zmienna                  | Opis                 | Używamy?                   |
| ------------------------ | -------------------- | -------------------------- |
| `{{ .ConfirmationURL }}` | Pełny URL magic link | ✅ Tak                     |
| `{{ .Token }}`           | 6-cyfrowy kod OTP    | ❌ **NIE** (celowo ukryty) |
| `{{ .TokenHash }}`       | Hash tokenu          | ❌ Nie                     |
| `{{ .SiteURL }}`         | URL aplikacji        | ⚠️ Opcjonalnie (w stopce)  |
| `{{ .Email }}`           | Email odbiorcy       | ⚠️ Opcjonalnie             |

### Krok 5: Testowanie

1. Zapisz template w Supabase
2. Wyślij testowy email (przycisk "Send test email" w dashboardzie)
3. Sprawdź:
   - ✅ Wygląd odpowiada designowi aplikacji (jasna wersja)
   - ✅ **BRAK kodu OTP** w treści
   - ✅ Link działa poprawnie
   - ✅ Przycisk jest klikalny
   - ✅ Fallback link (tekst) jest widoczny
   - ✅ Email wygląda dobrze na mobile i desktop

## Dostosowanie do własnych potrzeb

### Zmiana kolorów

Jeśli chcesz dostosować kolory do własnego brandingu:

```css
/* Primary dark (przyciski, logo, akcenty) */
background-color: #18181b;

/* Zmień na swój kolor brand: */
background-color: #your-color;
```

### Zmiana logo

Obecnie logo to tekst "Memo". Aby dodać obrazek:

```html
<!-- Zamień: -->
<h1 class="logo">Memo</h1>

<!-- Na: -->
<img src="https://yourdomain.com/logo.png" alt="Memo" style="max-width: 150px; height: auto;" />
```

**UWAGA:** Używaj absolutnych URL (https://) dla obrazków w emailach.

### Dodanie linków w stopce

```html
<p class="footer-text">
  <a href="https://yourdomain.com/pomoc" class="footer-link">Pomoc</a> |
  <a href="https://yourdomain.com/kontakt" class="footer-link">Kontakt</a> |
  <a href="https://yourdomain.com/polityka-prywatnosci" class="footer-link">Polityka prywatności</a>
</p>
```

## Najlepsze praktyki email design

✅ **Używamy:**

- Inline CSS (najlepsza kompatybilność z klientami email)
- System fonts (szybkie ładowanie, natywny wygląd)
- Maksymalna szerokość 600px (standard email)
- Przycisk + fallback link tekstowy
- Jasne komunikaty i call-to-action
- Responsywny design (media queries dla mobile)

❌ **Unikamy:**

- JavaScript (nieobsługiwany w emailach)
- External CSS (często blokowane)
- Complex layouts (problemy z renderowaniem)
- Background images (niska kompatybilność)
- Zbyt wiele obrazków (spam filters)

## Kompatybilność

Template przetestowany na:

- ✅ Gmail (web, iOS, Android)
- ✅ Outlook (web, desktop)
- ✅ Apple Mail (macOS, iOS)
- ✅ Yahoo Mail
- ✅ ProtonMail

## Troubleshooting

### Problem: Kod OTP nadal się pokazuje

**Rozwiązanie:** Upewnij się, że w template **NIE MA** `{{ .Token }}` nigdzie w HTML.

### Problem: Link nie działa (nie jest klikalny)

**Rozwiązanie:** Sprawdź w Supabase Dashboard:

- **Redirect URLs** muszą zawierać `https://yourdomain.com/auth/callback`
- **Site URL** musi być poprawnie skonfigurowany

### Problem: Email wygląda źle w Outlook

**Rozwiązanie:** Outlook używa Word engine do renderowania. Nasz template używa prostych tabel i inline CSS, co jest kompatybilne. Jeśli problem dalej występuje:

1. Unikaj `flexbox`, `grid` (nie są obsługiwane)
2. Używaj `<table>` dla layoutu (old-school, ale działa)

### Problem: Email trafia do spamu

**Rozwiązanie:**

1. Skonfiguruj SPF, DKIM, DMARC dla domeny
2. Używaj zweryfikowanej domeny nadawcy
3. Unikaj spam słów ("FREE!", "CLICK NOW!", itp.)
4. Testuj na [Mail Tester](https://www.mail-tester.com/)

## Kolejne kroki

Po wdrożeniu tego template:

1. ✅ Zaktualizuj dokumentację (auth-spec.md) - już zrobione
2. ✅ Przetestuj flow logowania end-to-end
3. ✅ Sprawdź deliverability (czy emaile docierają)
4. ⚠️ Rozważ dodanie innych templates (np. email change confirmation)

## Wsparcie

Jeśli masz pytania dotyczące customizacji:

- [Supabase Email Templates Docs](https://supabase.com/docs/guides/auth/auth-email-templates)
- [Email Design Best Practices](https://www.campaignmonitor.com/dev-resources/)
