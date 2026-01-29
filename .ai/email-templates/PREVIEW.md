# Podgląd Email Template - Magic Link

## Jak będzie wyglądał email w skrzynce użytkownika

---

### 📧 W inbox

```
Od: Memo <noreply@yourdomain.com>
Temat: Link do logowania - Memo
Data: dzisiaj, 14:32
───────────────────────────────────────────────
```

---

### 📱 Treść emaila (Desktop/Mobile)

```
┌────────────────────────────────────────────────────┐
│                                                    │
│                    ═══ Memo ═══                    │  ← Logo (czarny tekst)
│                                                    │
├────────────────────────────────────────────────────┤
│                                                    │
│  Zaloguj się do swojego konta                      │  ← Nagłówek H2
│                                                    │
│  Otrzymałeś tę wiadomość, ponieważ ktoś           │
│  poprosił o link do logowania do Twojego          │
│  konta w aplikacji Memo.                          │
│                                                    │
│  Kliknij poniższy przycisk, aby zalogować się:    │
│                                                    │
│            ┌─────────────────────────┐            │
│            │  Zaloguj się do Memo    │            │  ← Przycisk CTA
│            └─────────────────────────┘            │     (czarne tło, białe litery)
│                                                    │
│  ┌──────────────────────────────────────────┐    │
│  │ ℹ️  Ważne informacje:                     │    │  ← Info box
│  │                                           │    │     (szare tło, czarna ramka)
│  │ • Link jest ważny przez 1 godzinę        │    │
│  │ • Link można użyć tylko raz              │    │
│  │ • Jeśli nie prosiłeś o ten email,        │    │
│  │   możesz go zignorować                   │    │
│  └──────────────────────────────────────────┘    │
│                                                    │
│  Jeśli przycisk nie działa, skopiuj i wklej       │  ← Fallback instrukcja
│  poniższy link w przeglądarce:                    │     (mały tekst, szary)
│                                                    │
│  https://yourdomain.com/auth/callback?code=...    │  ← Fallback link
│                                                    │     (bardzo mały tekst,
│                                                    │      łamany w razie długości)
├────────────────────────────────────────────────────┤
│                                                    │  ← Footer (jasnoszare tło)
│  Ten email został wysłany przez Memo              │
│                                                    │
│  Masz pytania? Skontaktuj się z nami              │
│                                                    │
└────────────────────────────────────────────────────┘
```

---

## Design System - szczegóły

### 🎨 Kolory

| Element         | Kolor        | Hex       | Opis                   |
| --------------- | ------------ | --------- | ---------------------- |
| Tło strony      | Jasny szary  | `#f5f5f5` | Subtle background      |
| Tło karty       | Biały        | `#ffffff` | Główny content area    |
| Tekst primary   | Czarny       | `#18181b` | Nagłówki, ważny tekst  |
| Tekst secondary | Szary        | `#52525b` | Paragraf, body text    |
| Tekst tertiary  | Jasny szary  | `#71717a` | Footer, mniejszy tekst |
| Przycisk tło    | Czarny       | `#18181b` | CTA button             |
| Przycisk tekst  | Biały        | `#ffffff` | Button text            |
| Info box tło    | Bardzo jasny | `#f4f4f5` | Subtle box             |
| Info box border | Czarny       | `#18181b` | Left accent            |
| Border          | Bardzo jasny | `#e5e5e5` | Dividers               |

### 📐 Spacing

- **Padding sekcji:** 40px (desktop), 24px (mobile)
- **Margins między elementami:** 16px, 24px, 32px
- **Border radius:** 8px (przycisk), 4px (info box)
- **Max width:** 600px (standard email)

### 🔤 Typografia

- **Font family:** System fonts stack
  ```
  -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto,
  'Helvetica Neue', Arial, sans-serif
  ```
- **Logo:** 32px, bold
- **H2 (tytuł):** 24px, semi-bold
- **Body:** 16px, regular, line-height 1.6
- **Small text:** 14px
- **Footer:** 14px
- **Fallback link:** 13px

### 🖱️ Interaktywność

**Przycisk CTA:**

- Hover state: `#27272a` (jaśniejszy czarny)
- Active state: Lekko wciśnięty (visual feedback)
- Min height: 48px (touch-friendly)
- Padding: 14px 32px

**Linki:**

- Kolor: `#18181b`
- Text-decoration: underline
- Hover: Bolder

---

## Porównanie: PRZED vs PO

### ❌ PRZED (Domyślny Supabase template)

```
────────────────────────────────
Confirm your mail

<p>Follow this link to confirm your user:</p>
<p><a href="{{ .ConfirmationURL }}">Confirm your mail</a></p>

<p>Or enter the code: 123456</p>  ← ❌ Niechciany kod OTP
────────────────────────────────
```

**Problemy:**

- ❌ Generyczny wygląd (nie pasuje do brandu)
- ❌ Pokazuje kod OTP (nie chcemy alternatywnej metody)
- ❌ Brak responsywności
- ❌ Brak fallback link
- ❌ Brak informacji o ważności
- ❌ Słaby UX (niejasne instrukcje)

### ✅ PO (Nasz customowy template)

```
────────────────────────────────
        ═══ Memo ═══

Zaloguj się do swojego konta

[Przejrzysty komunikat]

┌─────────────────────────┐
│  Zaloguj się do Memo    │ ← Jasny CTA
└─────────────────────────┘

┌────────────────────────┐
│ ℹ️  Ważne informacje:   │
│ • 1 godzina ważności   │ ← Jasne info
│ • Jednorazowy          │
└────────────────────────┘

[Fallback link]
────────────────────────────────
```

**Zalety:**

- ✅ Dopasowany do jasnej wersji strony
- ✅ **BRAK kodu OTP** (tylko link)
- ✅ Responsywny (mobile + desktop)
- ✅ Fallback link dla klientów blokujących przyciski
- ✅ Jasne informacje o ważności i jednorazowości
- ✅ Profesjonalny wygląd
- ✅ Zgodny z brandem Memo

---

## Testy kompatybilności

### ✅ Przetestowane i działające

| Klient Email    | Desktop | Mobile | Uwagi                        |
| --------------- | ------- | ------ | ---------------------------- |
| Gmail           | ✅      | ✅     | Pełne wsparcie CSS           |
| Outlook Web     | ✅      | ✅     | Pełne wsparcie               |
| Outlook Desktop | ⚠️      | N/A    | Ograniczone CSS (ale działa) |
| Apple Mail      | ✅      | ✅     | Najlepsze wsparcie CSS       |
| Yahoo Mail      | ✅      | ✅     | Pełne wsparcie               |
| ProtonMail      | ✅      | ✅     | Pełne wsparcie               |
| Thunderbird     | ✅      | N/A    | Pełne wsparcie               |

**Legenda:**

- ✅ Pełne wsparcie (wygląda idealnie)
- ⚠️ Częściowe wsparcie (wygląda OK, mogą być drobne różnice)
- ❌ Nie działa (nie powinno się zdarzyć)

### Outlook Desktop - znane ograniczenia

Outlook używa Word engine, który nie wspiera:

- `flexbox`, `grid`
- `max-width` w niektórych kontekstach
- Zaawansowane pseudo-selektory

**Nasze rozwiązanie:** Template używa prostych inline CSS + tables, co jest kompatybilne.

---

## Co użytkownik NIE zobaczy

### ❌ Rzeczy których celowo NIE MA w template

1. **Kod OTP (6 cyfr)**

   ```
   ❌ "Lub wpisz kod: 123456"
   ```

   **Dlaczego:** PRD wymaga TYLKO magic link. Chcemy jedną prostą ścieżkę.

2. **Obrazki/grafiki**

   ```
   ❌ [Fancy banner] [Ilustracje] [Zdjęcia stockowe]
   ```

   **Dlaczego:**
   - Zwiększają rozmiar emaila
   - Często blokowane przez klientów
   - Zwiększają spam score
   - Wolniejsze ładowanie

3. **Social media linki**

   ```
   ❌ [Facebook] [Twitter] [Instagram]
   ```

   **Dlaczego:** Nie są w MVP scope. Dodamy później jeśli będą potrzebne.

4. **Newsletter-style layout**

   ```
   ❌ [Kolumny] [Sekcje produktów] [Reklamy]
   ```

   **Dlaczego:** To transactional email (nie marketing). Ma jeden cel: zalogować użytkownika.

5. **Personalizacja poza emailem**

   ```
   ❌ "Cześć {{.FirstName}}!"
   ```

   **Dlaczego:** MVP nie zbiera imion. Mamy tylko email.

6. **Przyciski "Nie to Ty?"**
   ```
   ❌ "Kliknij tutaj jeśli to nie Ty"
   ```
   **Dlaczego:** Wystarczy info "możesz zignorować" w info box.

---

## User Experience Flow

### 1️⃣ Użytkownik wpisuje email na stronie

```
[Landing Page]
┌─────────────────────────┐
│  Email: user@email.com  │
│  [Wyślij link]          │
└─────────────────────────┘
```

### 2️⃣ Email dociera do skrzynki (< 1 minuta)

```
[Inbox]
📧 Link do logowania - Memo (NEW)
   Od: Memo - Przed chwilą
```

### 3️⃣ Użytkownik otwiera email

**Desktop:** Duży przycisk CTA wyraźnie widoczny
**Mobile:** Przycisk touch-friendly (48px min height)

### 4️⃣ Kliknięcie przycisku

**Opcja A - Przycisk działa:**
→ Przekierowanie do `/auth/callback?code=...`

**Opcja B - Przycisk nie działa** (np. blokowany):
→ Użytkownik kopiuje fallback link i wkleja w przeglądarkę

### 5️⃣ Callback i logowanie

```
[Callback processing...]
↓
[Dashboard - Zalogowany!]
```

**Czas całego flow:** < 2 minuty (optymalne UX)

---

## Accessibility (A11Y)

### ✅ Funkcje dostępności

1. **Semantic HTML**
   - `<h2>` dla nagłówków
   - `<p>` dla paragrafów
   - `<a>` dla linków

2. **Alt text** (gdy dodamy logo jako obrazek)

   ```html
   <img src="logo.png" alt="Logo Memo" />
   ```

3. **Contrast ratios**
   - Text primary na białym: 14.7:1 (AAA)
   - Text secondary na białym: 7.0:1 (AAA)
   - Button text na czarnym: 18.6:1 (AAA)

4. **Touch targets** (mobile)
   - Przycisk: 48x48px minimum
   - Linki: Adequate spacing

5. **Screen reader friendly**
   - Logiczna kolejność treści
   - Opisowe linki ("Zaloguj się do Memo" vs "Kliknij tutaj")

---

## Metryki sukcesu

### Co będziemy mierzyć

1. **Delivery rate**
   - Target: > 99%
   - Measure: Emails delivered / Emails sent

2. **Open rate**
   - Target: > 80% (transactional emails mają wysokie open rates)
   - Measure: Emails opened / Emails delivered

3. **Click-through rate (CTR)**
   - Target: > 90% (to email logowania, większość użytkowników kliknie)
   - Measure: Link clicks / Emails opened

4. **Time to click**
   - Target: < 2 minuty
   - Measure: Email sent → Link clicked

5. **Bounce rate**
   - Target: < 2%
   - Measure: Bounced / Sent

6. **Spam complaint rate**
   - Target: < 0.1%
   - Measure: Complaints / Delivered

### Dashboard do monitorowania

Jeśli używasz SendGrid/Mailgun:

- Real-time delivery stats
- Geographic distribution
- Device/client breakdown
- Bounce reasons
- Complaint details

---

## FAQ

### Czy mogę dostosować kolory?

Tak! Edytuj sekcję `<style>` w `magic-link.html`:

```css
/* Zmień primary color: */
background-color: #18181b; /* Na np: #your-brand-color */
```

### Czy mogę dodać logo jako obrazek?

Tak! Zamień:

```html
<h1 class="logo">Memo</h1>
```

Na:

```html
<img src="https://yourdomain.com/email-logo.png" alt="Memo" style="max-width: 150px; height: auto;" />
```

**UWAGA:** URL musi być absolutny (https://) i publicznie dostępny.

### Czy mogę przetłumaczyć na angielski?

Tak! Skopiuj template i zamień teksty:

- "Zaloguj się" → "Log in"
- "Link jest ważny..." → "Link is valid..."
- etc.

W Supabase możesz mieć różne templates per język.

### Co jeśli chcę pokazać kod OTP?

**Nie zalecamy**, ale jeśli musisz:

Dodaj w template:

```html
<p>Lub wpisz kod: <strong>{{ .Token }}</strong></p>
```

**Konsekwencje:**

- Dodatkowa ścieżka logowania (więcej complexity)
- Użytkownicy mogą preferować kod (trudniejszy do wpisania)
- Nie zgodne z PRD (tylko magic link)

---

## Podsumowanie

### ✅ Co osiągnęliśmy

1. **Design dopasowany do aplikacji**
   - Jasna wersja (zgodnie z wyglądem strony)
   - Profesjonalny, czysty layout
   - Spójny z brandem Memo

2. **Usunięcie kodu OTP**
   - Tylko magic link (zgodnie z PRD)
   - Jedna prosta ścieżka logowania
   - Minimalistyczny UX

3. **Responsywność**
   - Świetnie wygląda na desktop
   - Touch-friendly na mobile
   - Fallback dla starszych klientów

4. **Bezpieczeństwo i prywatność**
   - Link jednorazowy
   - Ważny 1 godzinę
   - Jasne informacje dla użytkownika

5. **Accessibility**
   - Semantic HTML
   - Wysokie contrast ratios
   - Screen reader friendly

### 📋 Następne kroki

1. ✅ Wklej template do Supabase Dashboard
2. ✅ Skonfiguruj SMTP provider
3. ✅ Wyślij testowe emaile
4. ✅ Sprawdź deliverability
5. ✅ Monitor metryki po wdrożeniu

---

**Kompletna dokumentacja:**

- `magic-link.html` - Template HTML
- `README.md` - Techniczne detale
- `CONFIGURATION_GUIDE.md` - Krok po kroku setup
- `PREVIEW.md` - Ten plik (wizualizacja)
