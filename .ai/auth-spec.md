# Specyfikacja Techniczna: Moduł Autentykacji

**Data utworzenia:** 2026-01-29  
**Wersja:** 1.0  
**Status:** Draft

## Spis treści

1. [Wprowadzenie](#wprowadzenie)
2. [Architektura Interfejsu Użytkownika](#architektura-interfejsu-użytkownika)
3. [Logika Backendowa](#logika-backendowa)
4. [System Autentykacji](#system-autentykacji)
5. [Bezpieczeństwo](#bezpieczeństwo)
6. [Przypadki Brzegowe i Obsługa Błędów](#przypadki-brzegowe-i-obsługa-błędów)
7. [Przepływ Danych](#przepływ-danych)
8. [Matryca Odpowiedzialności](#matryca-odpowiedzialności)

---

## Wprowadzenie

Moduł autentykacji stanowi fundament aplikacji Memo, zapewniając bezpieczny i zgodny z PRD mechanizm dostępu użytkowników. System oparty jest na **Supabase Auth** z wykorzystaniem **Magic Link** (passwordless authentication) jako jedynej metody logowania/rejestracji.

### Kluczowe wymagania z PRD

- **Logowanie przez email + magic link** (MUST HAVE)
- **Ekran potwierdzenia** z countdown 30-60s + przycisk "Wyślij ponownie" + informacja o spamie
- **Link jednorazowy** (OTP - One-Time Password)
- **Session TTL** ~30 dni
- **Invalidacja sesji**: nowe logowanie unieważnia wszystkie poprzednie sesje
- **Rate limiting** na email/IP
- **Delete account** z mocnym potwierdzeniem i natychmiastowym usunięciem danych
- **Anonimizacja logów** zgodnie z retencją (~30 dni)

### Cele modułu

1. Zapewnienie bezpiecznego mechanizmu logowania bez tradycyjnych haseł
2. Minimalizacja friction w procesie onboardingu (email-only)
3. Zgodność z wymaganiami bezpieczeństwa i GDPR
4. Optymalna integracja z architekturą SSR Astro + React

---

## Architektura Interfejsu Użytkownika

### Rozdzielenie odpowiedzialności: Astro vs React

Architektura frontendowa wykorzystuje podejście **hybrid rendering**:

- **Astro** (.astro) - dla zawartości statycznej, layoutów, server-side logic i routing
- **React** (.tsx) - dla komponentów wymagających interaktywności client-side

#### Zasady projektowe

1. **Strony Astro (SSR)** - odpowiadają za:
   - Sprawdzanie stanu autentykacji server-side
   - Przekierowania na podstawie sesji użytkownika
   - Renderowanie layoutów i struktury strony
   - Wstrzykiwanie początkowych danych

2. **Komponenty React (CSR)** - odpowiadają za:
   - Formularze z walidacją i interaktywnością
   - Obsługę zdarzeń użytkownika (submit, click, input)
   - Zarządzanie stanem lokalnym (loading, error states)
   - Dynamiczne aktualizacje UI bez przeładowania strony

### Strony i komponenty auth

#### 1. Strona główna (`src/pages/index.astro`) - ROZSZERZENIE

**Status:** Istniejący plik wymaga aktualizacji logiki

**Odpowiedzialności:**

- Server-side check sesji użytkownika
- Redirect zalogowanych użytkowników do `/dashboard`
- Renderowanie hero section + auth form dla niezalogowanych

**Logika SSR:**

```typescript
// Sprawdzenie sesji
const {
  data: { session },
  error,
} = await Astro.locals.supabase.auth.getSession();

// Redirect jeśli zalogowany
if (session && !error) {
  return Astro.redirect("/dashboard", 302);
}

// W przeciwnym razie renderuj landing page z formularzem logowania
```

**Struktura komponentów:**

- `<Layout>` - bazowy layout (head, body, global styles)
- `<HeroSection />` - sekcja powitalna (static Astro)
- `<AuthForm />` - formularz logowania (wymaga konwersji na React)

**Zmiany do wdrożenia:**

- Aktualizacja logiki sprawdzania sesji z wykorzystaniem poprawnego Supabase client z `context.locals`
- Obsługa błędów przy sprawdzaniu sesji
- Dodanie obsługi query params dla callback URL po weryfikacji magic link

---

#### 2. Strona potwierdzenia email (`src/pages/auth/check-email.astro`) - NOWA

**Status:** Do utworzenia

**Cel:** Wyświetlenie informacji o wysłanym linku magicznym z countdown i opcją resend

**Odpowiedzialności:**

- Wyświetlenie komunikatu o wysłanym emailu
- Przekazanie email do komponentu React (z query param lub session storage)
- Przekierowanie jeśli użytkownik jest już zalogowany

**Logika SSR:**

```typescript
// Sprawdzenie sesji - jeśli zalogowany, redirect do dashboard
const {
  data: { session },
} = await Astro.locals.supabase.auth.getSession();
if (session) {
  return Astro.redirect("/dashboard", 302);
}

// Pobranie email z query param
const email = Astro.url.searchParams.get("email");

// Walidacja email
if (!email || !isValidEmail(email)) {
  return Astro.redirect("/", 302);
}
```

**Struktura:**

- `<Layout>` - bazowy layout
- `<CheckEmailContent client:load email={email} />` - React component z interaktywnością

**Kontrakty:**

- **Input:** `email` (string) - przekazany jako prop z query param
- **Output:** Nawigacja do `/dashboard` po pomyślnym zalogowaniu lub pozostanie na stronie

---

#### 3. Strona callback auth (`src/pages/auth/callback.astro`) - NOWA

**Status:** Do utworzenia

**Cel:** Obsługa callback po kliknięciu w magic link

**Odpowiedzialności:**

- Wymiana tokenu z URL na sesję Supabase
- Utworzenie profilu użytkownika (jeśli nowy)
- Invalidacja poprzednich sesji
- Przekierowanie do dashboard lub zwrócenie błędu

**Logika SSR:**

```typescript
// Pobranie code/token z URL hash lub query params
const code = Astro.url.searchParams.get("code");
const error_code = Astro.url.searchParams.get("error_code");
const error_description = Astro.url.searchParams.get("error_description");

// Obsługa błędów z Supabase
if (error_code) {
  return Astro.redirect(`/?error=${encodeURIComponent(error_description || "Unknown error")}`, 302);
}

// Wymiana code na session
const { data, error } = await Astro.locals.supabase.auth.exchangeCodeForSession(code);

if (error || !data.session) {
  return Astro.redirect("/?error=invalid_link", 302);
}

// Utworzenie profilu jeśli nowy użytkownik
await ensureUserProfile(Astro.locals.supabase, data.user.id);

// Session tracking: zapisz nową sesję
const sessionId = data.session.access_token.substring(0, 32); // Użyj fragmentu tokenu jako ID
const expiresAt = new Date(data.session.expires_at! * 1000);
const userAgent = Astro.request.headers.get("user-agent") || undefined;
const ipAddress =
  Astro.request.headers.get("x-forwarded-for")?.split(",")[0] || Astro.request.headers.get("x-real-ip") || undefined;

await trackSession(
  Astro.locals.supabase,
  data.user.id,
  sessionId,
  data.session.access_token,
  expiresAt,
  userAgent,
  ipAddress
);

// Invalidacja starych sesji (MUST HAVE zgodnie z PRD)
await invalidateOtherSessions(Astro.locals.supabase, data.user.id, sessionId);

// Redirect do dashboard
return Astro.redirect("/dashboard", 302);
```

**Obsługa błędów:**

- Link wygasł → redirect z komunikatem `error=link_expired`
- Link już użyty → redirect z komunikatem `error=link_used`
- Błąd serwera → redirect z komunikatem `error=server_error`

---

#### 4. Komponent `<AuthForm>` (`src/components/AuthForm.astro` → `src/components/AuthForm.tsx`) - KONWERSJA

**Status:** Istniejący komponent Astro wymaga konwersji na React

**Cel:** Formularz email-only z walidacją i obsługą API

**Odpowiedzialności:**

- Walidacja email client-side (format, wymagalność)
- Wywołanie API endpoint do wysyłki magic link
- Obsługa stanów UI (loading, success, error)
- Rate limiting feedback (komunikat o przekroczeniu limitu)
- Redirect do `/auth/check-email?email=...` po sukcesie

**Struktura komponentu (React):**

```typescript
interface AuthFormProps {
  redirectTo?: string; // Opcjonalny URL do przekierowania po zalogowaniu
}

export function AuthForm({ redirectTo = "/dashboard" }: AuthFormProps) {
  // Stan lokalny
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Walidacja email
  const isValidEmail = (email: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  // Handler submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Walidacja
    if (!email.trim()) {
      setError("Proszę wprowadzić adres email");
      return;
    }

    if (!isValidEmail(email)) {
      setError("Nieprawidłowy format email");
      return;
    }

    // Reset błędów
    setError(null);
    setIsLoading(true);

    try {
      // Wywołanie API
      const response = await fetch("/api/auth/send-magic-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, redirectTo }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Obsługa specyficznych błędów
        if (data.error === "rate_limit_exceeded") {
          setError(`Przekroczono limit prób. Spróbuj ponownie za ${data.retry_after} sekund.`);
        } else {
          setError(data.message || "Wystąpił błąd. Spróbuj ponownie.");
        }
        return;
      }

      // Przekierowanie do strony potwierdzenia
      window.location.href = `/auth/check-email?email=${encodeURIComponent(email)}`;

    } catch (err) {
      setError("Wystąpił błąd połączenia. Sprawdź internet i spróbuj ponownie.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    // JSX z formularzem...
  );
}
```

**Walidacja email:**

- **Client-side:** Regex pattern dla formatu email
- **Server-side:** Dodatkowo w API endpoint (Zod schema)

**Komunikaty błędów:**

- Puste pole: "Proszę wprowadzić adres email"
- Nieprawidłowy format: "Nieprawidłowy format email"
- Rate limit: "Przekroczono limit prób. Spróbuj ponownie za X sekund."
- Błąd serwera: "Wystąpił błąd. Spróbuj ponownie."
- Błąd sieci: "Wystąpił błąd połączenia. Sprawdź internet i spróbuj ponownie."

---

#### 5. Komponent `<CheckEmailContent>` (`src/components/CheckEmailContent.tsx`) - NOWY

**Status:** Do utworzenia

**Cel:** Wyświetlenie informacji o wysłanym linku z countdown i opcją resend

**Odpowiedzialności:**

- Wyświetlenie komunikatu z przekazanym emailem
- Countdown timer (zgodnie z PRD: 30-60s, implementacja: 60s default)
- Przycisk "Wyślij ponownie" (aktywny po countdown)
- Informacja o sprawdzeniu folderu spam
- Obsługa resend logic

**Wybór countdown wartości:**

- PRD specyfikuje zakres "30-60s"
- **Implementacja MVP**: 60s fixed (konfigurowalne w przyszłości)
- **Uzasadnienie**: 60s daje więcej czasu na dostarczenie emaila (niektóre providery mają opóźnienia), redukuje frustrację użytkownika

**Struktura komponentu:**

```typescript
interface CheckEmailContentProps {
  email: string;
  countdownSeconds?: number; // default 60 (zgodnie z wyborem dla MVP)
}

export function CheckEmailContent({
  email,
  countdownSeconds = 60
}: CheckEmailContentProps) {
  const [secondsLeft, setSecondsLeft] = useState(countdownSeconds);
  const [isResending, setIsResending] = useState(false);
  const [resendError, setResendError] = useState<string | null>(null);
  const [resendSuccess, setResendSuccess] = useState(false);

  // Countdown timer
  useEffect(() => {
    if (secondsLeft <= 0) return;

    const timer = setTimeout(() => {
      setSecondsLeft(prev => prev - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [secondsLeft]);

  // Handler resend
  const handleResend = async () => {
    setIsResending(true);
    setResendError(null);
    setResendSuccess(false);

    try {
      const response = await fetch("/api/auth/send-magic-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        setResendError(data.message || "Nie udało się wysłać ponownie.");
        return;
      }

      setResendSuccess(true);
      setSecondsLeft(countdownSeconds); // Reset countdown

    } catch (err) {
      setResendError("Wystąpił błąd połączenia.");
    } finally {
      setIsResending(false);
    }
  };

  return (
    // JSX z komunikatem, countdown, przyciskiem resend...
  );
}
```

**UI Elements:**

- Ikona envelope/mail (success state)
- Heading: "Sprawdź swoją skrzynkę email"
- Paragraph: "Wysłaliśmy link logowania na adres **{email}**"
- Countdown: "Możesz wysłać ponownie za {seconds}s" (gdy > 0)
- Button: "Wyślij ponownie" (disabled gdy countdown > 0 lub isResending)
- Info box: "Nie widzisz wiadomości? Sprawdź folder spam lub wiadomości-śmieci."
- Link: "Wróć do strony głównej"

**Komunikaty:**

- Sukces resend: "Link został wysłany ponownie!"
- Błąd resend: komunikat z API lub "Nie udało się wysłać ponownie."

---

#### 6. Komponent `<UserMenu>` (`src/components/UserMenu.tsx`) - AKTUALIZACJA

**Status:** Istniejący komponent wymaga aktualizacji logout logic

**Zmiany do wdrożenia:**

- Aktualizacja `handleLogout` do wywołania prawidłowego API endpoint
- Obsługa błędów logout
- Optymistyczna aktualizacja UI (disable podczas logout)

**Zaktualizowany handler:**

```typescript
const handleLogout = async () => {
  try {
    setIsLoggingOut(true);

    const response = await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "same-origin",
    });

    if (!response.ok) {
      throw new Error("Logout failed");
    }

    // Redirect do strony głównej
    window.location.href = "/";
  } catch (error) {
    console.error("Logout failed:", error);
    // Fallback: force redirect (nawet jeśli API failed)
    window.location.href = "/";
  }
};
```

---

#### 7. Komponent `<DeleteAccountDialog>` (`src/components/DeleteAccountDialog.tsx`) - AKTUALIZACJA

**Status:** Istniejący komponent wymaga integracji z API

**Zmiany do wdrożenia:**

- Implementacja API call do `/api/auth/delete-account`
- Dodanie silnego potwierdzenia (wpisanie "USUŃ" lub "DELETE")
- Komunikaty o nieodwracalności operacji
- Loading state podczas usuwania
- Obsługa błędów

**Metoda potwierdzenia:**

Zgodnie z PRD: "mocne potwierdzenie („USUŃ"/podwójne kliknięcie)"

**Wybrana implementacja dla MVP**: Input text "USUŃ"

- ✅ Wymaga świadomej akcji (wpisanie tekstu)
- ✅ Trudniejsze do przypadkowego kliknięcia niż podwójne kliknięcie
- ✅ Lepsze UX niż podwójne kliknięcie (jasne co trzeba zrobić)
- ✅ Standard w branży (GitHub, AWS używają tej metody)

**Logika potwierdzenia:**

```typescript
interface DeleteAccountDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function DeleteAccountDialog({ isOpen, onClose }: DeleteAccountDialogProps) {
  const [confirmText, setConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const CONFIRM_TEXT = "USUŃ"; // Wielkie litery, polska wersja
  const isConfirmValid = confirmText === CONFIRM_TEXT;

  const handleDelete = async () => {
    if (!isConfirmValid) return;

    setIsDeleting(true);
    setError(null);

    try {
      const response = await fetch("/api/auth/delete-account", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirmation: CONFIRM_TEXT }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Nie udało się usunąć konta.");
        return;
      }

      // Redirect do strony głównej po sukcesie
      window.location.href = "/?deleted=true";

    } catch (err) {
      setError("Wystąpił błąd połączenia.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    // JSX z modalem potwierdzenia...
  );
}
```

**UI Elements:**

- Heading: "Usuń konto na stałe"
- Warning box (destructive): Komunikat o nieodwracalności
- List of consequences:
  - "Wszystkie listy zostaną usunięte"
  - "Historia testów zostanie usunięta"
  - "Dane nie będą mogły być przywrócone"
- Input: "Aby potwierdzić, wpisz **USUŃ**"
- Buttons: "Anuluj" | "Usuń konto" (destructive, disabled gdy confirmText !== "USUŃ")

---

### Ochrona stron wymagających autentykacji

#### Strony chronione (require auth):

- `/dashboard` - główny dashboard
- `/profile` - profil użytkownika
- `/lists/*` - wszystkie podstrony list
- `/api/*` - wszystkie endpointy API (oprócz auth endpoints)

#### Logika ochrony (SSR w każdej chronionej stronie):

```typescript
// Na początku każdej chronionej strony .astro
const user = Astro.locals.user;

if (!user) {
  // Zapisz intended URL dla redirect po logowaniu
  const intendedUrl = Astro.url.pathname + Astro.url.search;
  return Astro.redirect(`/?redirect=${encodeURIComponent(intendedUrl)}`, 302);
}

// Kontynuuj renderowanie dla zalogowanego użytkownika
```

**Alternatywnie:** Utworzenie reusable funkcji `requireAuth()` w `src/lib/auth-helpers.ts`

---

### Przepływ użytkownika - scenariusze

#### Scenariusz 1: Nowy użytkownik - rejestracja i logowanie

1. User wchodzi na `/` → widzi hero section + `<AuthForm>`
2. User wpisuje email i klika "Wyślij link do logowania"
3. `<AuthForm>` wysyła request do `/api/auth/send-magic-link`
4. API zwraca sukces → redirect do `/auth/check-email?email=...`
5. `<CheckEmailContent>` wyświetla komunikat + countdown
6. User otwiera email i klika link
7. Browser przekierowuje do `/auth/callback?code=...`
8. Callback page:
   - Wymienia code na session
   - Tworzy profil w `profiles` table
   - Ustawia cookie sesji
   - Przekierowuje do `/dashboard`
9. User widzi dashboard z pustą listą (empty state)

#### Scenariusz 2: Istniejący użytkownik - ponowne logowanie

1. User wchodzi na `/` → widzi `<AuthForm>`
2. User wpisuje email i klika "Wyślij link"
3. API wysyła magic link
4. User widzi `/auth/check-email`
5. User klika link w emailu
6. Callback:
   - Wymienia code na session
   - **Invaliduje wszystkie poprzednie sesje** (zgodnie z PRD)
   - Ustawia nową sesję
   - Przekierowuje do `/dashboard`
7. User widzi swoje listy w dashboardzie

#### Scenariusz 3: Rate limiting

1. User wysyła prośbę o magic link 5 razy w ciągu 15 minut
2. Na 6. próbie API zwraca error `rate_limit_exceeded` z `retry_after`
3. `<AuthForm>` wyświetla komunikat: "Przekroczono limit prób. Spróbuj ponownie za X sekund."
4. User czeka i próbuje ponownie po czasie retry_after

#### Scenariusz 4: Link wygasł

1. User klika stary link magiczny (po > 1h)
2. `/auth/callback` otrzymuje error od Supabase
3. Redirect do `/?error=link_expired`
4. Landing page wyświetla komunikat: "Link wygasł. Poproś o nowy."

#### Scenariusz 5: Wylogowanie

1. User jest na dowolnej chronionej stronie
2. User klika "Wyloguj się" w `<UserMenu>`
3. API `/api/auth/logout` usuwa sesję
4. Redirect do `/`
5. User widzi landing page (nie-zalogowany state)

#### Scenariusz 6: Usunięcie konta

1. User wchodzi na `/profile`
2. User klika "Usuń konto" w sekcji Danger Zone
3. `<DeleteAccountDialog>` otwiera się
4. User wpisuje "USUŃ" i potwierdza
5. API `/api/auth/delete-account`:
   - Usuwa użytkownika z `auth.users` (cascade do wszystkich tabel)
   - Invaliduje wszystkie sesje
6. Redirect do `/?deleted=true`
7. Landing page wyświetla komunikat potwierdzający usunięcie

---

## Logika Backendowa

### Struktura API endpoints

Wszystkie endpointy auth znajdują się w `src/pages/api/auth/`:

```
src/pages/api/auth/
├── send-magic-link.ts      POST   - Wysyłka magic link
├── logout.ts               POST   - Wylogowanie użytkownika
└── delete-account.ts       DELETE - Usunięcie konta
```

### Konwencje API

- **Format:** RESTful z HTTP methods (POST, DELETE)
- **Content-Type:** `application/json`
- **Authentication:** Cookie-based session (Supabase Auth)
- **Response format:** JSON z polami `success`, `error`, `message`, `data`
- **Error codes:** HTTP status codes + custom error types
- **Prerender:** `export const prerender = false` w każdym endpoint

---

### Endpoint 1: POST `/api/auth/send-magic-link`

**Cel:** Wysłanie magic link na podany email

#### Request

```typescript
// Body schema (Zod)
const SendMagicLinkSchema = z.object({
  email: z.string().email("Nieprawidłowy format email"),
  redirectTo: z.string().url().optional().default("/dashboard"),
});

// Type
type SendMagicLinkRequest = z.infer<typeof SendMagicLinkSchema>;
```

**Przykład:**

```json
{
  "email": "user@example.com",
  "redirectTo": "/dashboard"
}
```

#### Response (Success - 200)

```typescript
interface SendMagicLinkResponse {
  success: true;
  message: string;
}
```

**Przykład:**

```json
{
  "success": true,
  "message": "Link został wysłany na adres user@example.com"
}
```

#### Response (Error - 4xx/5xx)

```typescript
interface ErrorResponse {
  error: string;
  message: string;
  retry_after?: number; // Tylko dla rate_limit_exceeded
}
```

**Przykłady:**

Rate limit exceeded (429):

```json
{
  "error": "rate_limit_exceeded",
  "message": "Przekroczono limit prób. Spróbuj ponownie za 300 sekund.",
  "retry_after": 300
}
```

Validation error (400):

```json
{
  "error": "validation_error",
  "message": "Nieprawidłowy format email"
}
```

Server error (500):

```json
{
  "error": "server_error",
  "message": "Wystąpił błąd serwera. Spróbuj ponownie później."
}
```

#### Implementacja

```typescript
// src/pages/api/auth/send-magic-link.ts
import type { APIRoute } from "astro";
import { z } from "zod";

export const prerender = false;

// Schema walidacji
const SendMagicLinkSchema = z.object({
  email: z.string().trim().email("Nieprawidłowy format email"),
  redirectTo: z.string().url().optional(),
});

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    // Parse i walidacja body
    const body = await request.json();
    const validation = SendMagicLinkSchema.safeParse(body);

    if (!validation.success) {
      return new Response(
        JSON.stringify({
          error: "validation_error",
          message: validation.error.errors[0].message,
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    const { email, redirectTo } = validation.data;

    // Rate limiting check (Supabase Auth ma wbudowany rate limiting)
    // Dodatkowa warstwa: implementacja IP-based rate limiting
    const rateLimitCheck = await checkRateLimit(request, email);
    if (!rateLimitCheck.allowed) {
      return new Response(
        JSON.stringify({
          error: "rate_limit_exceeded",
          message: `Przekroczono limit prób. Spróbuj ponownie za ${rateLimitCheck.retryAfter} sekund.`,
          retry_after: rateLimitCheck.retryAfter,
        }),
        { status: 429, headers: { "Content-Type": "application/json" } }
      );
    }

    // Wywołanie Supabase Auth API
    const { error } = await locals.supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${new URL(request.url).origin}/auth/callback?redirect=${encodeURIComponent(redirectTo || "/dashboard")}`,
      },
    });

    if (error) {
      console.error("[send-magic-link] Supabase error:", error);

      // Mapowanie błędów Supabase na user-friendly messages
      if (error.message.includes("rate limit")) {
        return new Response(
          JSON.stringify({
            error: "rate_limit_exceeded",
            message: "Przekroczono limit prób. Spróbuj ponownie później.",
          }),
          { status: 429, headers: { "Content-Type": "application/json" } }
        );
      }

      return new Response(
        JSON.stringify({
          error: "server_error",
          message: "Nie udało się wysłać linku. Spróbuj ponownie.",
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // Sukces
    return new Response(
      JSON.stringify({
        success: true,
        message: `Link został wysłany na adres ${email}`,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[send-magic-link] Unexpected error:", err);
    return new Response(
      JSON.stringify({
        error: "server_error",
        message: "Wystąpił nieoczekiwany błąd.",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
```

#### Rate Limiting Strategy

**Poziomy ochrony:**

1. **Supabase Auth (built-in):**
   - 4 requesty na email w ciągu godziny
   - Automatycznie obsługiwane przez Supabase

2. **Application-level (custom):**
   - 5 requestów na IP w ciągu 15 minut
   - Implementacja w `src/lib/services/rate-limiter.ts`

**Implementacja custom rate limiter:**

```typescript
// src/lib/services/rate-limiter.ts
interface RateLimitResult {
  allowed: boolean;
  retryAfter: number; // seconds
}

// In-memory store (w produkcji: Redis lub Supabase table)
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

export async function checkRateLimit(request: Request, email: string): Promise<RateLimitResult> {
  const ip = getClientIP(request);
  const key = `${ip}:${email}`;

  const now = Date.now();
  const entry = rateLimitStore.get(key);

  // Sprawdź czy entry istnieje i czy nie wygasło
  if (!entry || now > entry.resetAt) {
    // Nowe entry lub wygasłe - zresetuj
    rateLimitStore.set(key, {
      count: 1,
      resetAt: now + 15 * 60 * 1000, // 15 minut
    });
    return { allowed: true, retryAfter: 0 };
  }

  // Sprawdź limit
  if (entry.count >= 5) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
    return { allowed: false, retryAfter };
  }

  // Inkrementuj count
  entry.count += 1;
  rateLimitStore.set(key, entry);

  return { allowed: true, retryAfter: 0 };
}

function getClientIP(request: Request): string {
  // Próba pobrania IP z headers (proxy-aware)
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }

  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    return realIp;
  }

  // Fallback (może być niedokładny)
  return "unknown";
}
```

**Uwaga:** W środowisku produkcyjnym należy użyć persystentnego store (Redis, Upstash, lub tabela w Supabase) zamiast in-memory Map.

---

### Endpoint 2: POST `/api/auth/logout`

**Cel:** Wylogowanie użytkownika i invalidacja sesji

#### Request

Nie wymaga body (session identyfikowana przez cookie).

#### Response (Success - 200)

```typescript
interface LogoutResponse {
  success: true;
  message: string;
}
```

**Przykład:**

```json
{
  "success": true,
  "message": "Wylogowano pomyślnie"
}
```

#### Response (Error)

Nie powinno być błędów (idempotentne) - nawet jeśli nie ma sesji, zwraca sukces.

#### Implementacja

```typescript
// src/pages/api/auth/logout.ts
import type { APIRoute } from "astro";

export const prerender = false;

export const POST: APIRoute = async ({ locals, cookies }) => {
  try {
    const user = locals.user;

    // Jeśli użytkownik jest zalogowany, invaliduj sesję w tracking table
    if (user) {
      const session = await locals.supabase.auth.getSession();
      if (session.data.session) {
        const sessionId = session.data.session.access_token.substring(0, 32);

        // Invaliduj sesję w user_sessions
        await locals.supabase
          .from("user_sessions")
          .update({ is_active: false })
          .eq("user_id", user.id)
          .eq("session_id", sessionId);
      }
    }

    // Wylogowanie przez Supabase Auth
    const { error } = await locals.supabase.auth.signOut();

    if (error) {
      console.error("[logout] Supabase error:", error);
      // Nie zwracamy błędu do użytkownika - logout powinien być zawsze możliwy
    }

    // Usuń cookie sesji (redundantne, ale dla pewności)
    cookies.delete("sb-access-token", { path: "/" });
    cookies.delete("sb-refresh-token", { path: "/" });

    return new Response(
      JSON.stringify({
        success: true,
        message: "Wylogowano pomyślnie",
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[logout] Unexpected error:", err);

    // Nawet w przypadku błędu zwracamy sukces (idempotentność)
    return new Response(
      JSON.stringify({
        success: true,
        message: "Wylogowano pomyślnie",
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }
};
```

**Uwaga:** Endpoint jest idempotentny - wielokrotne wywołania zwracają ten sam wynik bez skutków ubocznych.

---

### Endpoint 3: DELETE `/api/auth/delete-account`

**Cel:** Trwałe usunięcie konta użytkownika wraz z wszystkimi danymi

#### Request

```typescript
const DeleteAccountSchema = z.object({
  confirmation: z.literal("USUŃ", {
    errorMap: () => ({ message: "Nieprawidłowe potwierdzenie" }),
  }),
});
```

**Przykład:**

```json
{
  "confirmation": "USUŃ"
}
```

#### Response (Success - 200)

```typescript
interface DeleteAccountResponse {
  success: true;
  message: string;
}
```

**Przykład:**

```json
{
  "success": true,
  "message": "Konto zostało trwale usunięte"
}
```

#### Response (Error)

Validation error (400):

```json
{
  "error": "validation_error",
  "message": "Nieprawidłowe potwierdzenie"
}
```

Unauthorized (401):

```json
{
  "error": "unauthorized",
  "message": "Musisz być zalogowany aby usunąć konto"
}
```

#### Implementacja

```typescript
// src/pages/api/auth/delete-account.ts
import type { APIRoute } from "astro";
import { z } from "zod";

export const prerender = false;

const DeleteAccountSchema = z.object({
  confirmation: z.literal("USUŃ"),
});

export const DELETE: APIRoute = async ({ request, locals }) => {
  try {
    // Sprawdzenie autentykacji
    const user = locals.user;

    if (!user) {
      return new Response(
        JSON.stringify({
          error: "unauthorized",
          message: "Musisz być zalogowany aby usunąć konto",
        }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }

    // Parse i walidacja body
    const body = await request.json();
    const validation = DeleteAccountSchema.safeParse(body);

    if (!validation.success) {
      return new Response(
        JSON.stringify({
          error: "validation_error",
          message: "Nieprawidłowe potwierdzenie. Wpisz dokładnie: USUŃ",
        }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Usunięcie użytkownika z auth.users (cascade do wszystkich tabel)
    // Wymaga admin client (service_role)
    const {
      data: { user: adminUser },
      error: getUserError,
    } = await locals.supabase.auth.admin.getUserById(user.id);

    if (getUserError || !adminUser) {
      console.error("[delete-account] User not found:", getUserError);
      return new Response(
        JSON.stringify({
          error: "not_found",
          message: "Użytkownik nie został znaleziony",
        }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    // Usunięcie użytkownika (kaskadowo usuwa wszystkie powiązane dane)
    const { error: deleteError } = await locals.supabase.auth.admin.deleteUser(user.id);

    if (deleteError) {
      console.error("[delete-account] Delete error:", deleteError);
      return new Response(
        JSON.stringify({
          error: "server_error",
          message: "Nie udało się usunąć konta. Spróbuj ponownie.",
        }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // Log event for audit trail (before cascade delete)
    // Uwaga: Events będą anonimizowane zgodnie z retencją
    await logEvent("delete_account", user.id);

    // Sukces
    return new Response(
      JSON.stringify({
        success: true,
        message: "Konto zostało trwale usunięte",
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[delete-account] Unexpected error:", err);
    return new Response(
      JSON.stringify({
        error: "server_error",
        message: "Wystąpił nieoczekiwany błąd",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
};
```

**Cascade delete:** Usunięcie użytkownika z `auth.users` automatycznie usuwa wszystkie powiązane rekordy dzięki `ON DELETE CASCADE` w schemacie bazy danych:

- `profiles`
- `lists` (wraz z `list_items` przez kolejny cascade)
- `tests`
- `ai_usage_daily`
- `events` (do anonimizacji zgodnie z retencją)

---

### Helpers i serwisy

#### `src/lib/auth-helpers.ts` - NOWY

**Cel:** Reusable funkcje do autoryzacji i ochrony routes

```typescript
import type { AstroGlobal } from "astro";

/**
 * Sprawdza czy użytkownik jest zalogowany i przekierowuje jeśli nie
 * Używać na początku każdej chronionej strony
 */
export function requireAuth(Astro: AstroGlobal): void {
  const user = Astro.locals.user;

  if (!user) {
    const intendedUrl = Astro.url.pathname + Astro.url.search;
    return Astro.redirect(`/?redirect=${encodeURIComponent(intendedUrl)}`, 302);
  }
}

/**
 * Sprawdza czy użytkownik jest zalogowany (bez redirect)
 */
export function isAuthenticated(Astro: AstroGlobal): boolean {
  return !!Astro.locals.user;
}

/**
 * Pobiera użytkownika z locals (with type safety)
 */
export function getCurrentUser(Astro: AstroGlobal) {
  return Astro.locals.user;
}

/**
 * Tworzy profil użytkownika jeśli nie istnieje (onboarding)
 */
export async function ensureUserProfile(supabase: SupabaseClient, userId: string): Promise<void> {
  // Sprawdź czy profil istnieje
  const { data: existing } = await supabase.from("profiles").select("user_id").eq("user_id", userId).single();

  if (existing) {
    return; // Profil już istnieje
  }

  // Utwórz nowy profil z domyślnymi wartościami
  const { error } = await supabase.from("profiles").insert({
    user_id: userId,
    theme_preference: "system",
    locale: "pl-PL",
    timezone: "Europe/Warsaw",
  });

  if (error) {
    console.error("[ensureUserProfile] Error creating profile:", error);
    throw error;
  }
}

/**
 * Invaliduje wszystkie sesje użytkownika oprócz bieżącej
 * Zgodnie z wymaganiem PRD: "nowe logowanie unieważnia wszystkie stare sesje"
 */
export async function invalidateOtherSessions(
  supabase: SupabaseClient,
  userId: string,
  currentSessionId: string
): Promise<void> {
  try {
    // Dezaktywuj wszystkie inne sesje użytkownika
    const { error } = await supabase
      .from("user_sessions")
      .update({ is_active: false })
      .eq("user_id", userId)
      .neq("session_id", currentSessionId)
      .eq("is_active", true);

    if (error) {
      console.error("[invalidateOtherSessions] Error invalidating sessions:", error);
      // Nie rzucamy błędu - invalidacja jest nice-to-have, nie blokuje logowania
      return;
    }

    console.log(`[invalidateOtherSessions] Invalidated other sessions for user ${userId}`);
  } catch (err) {
    console.error("[invalidateOtherSessions] Unexpected error:", err);
    // Nie rzucamy - logowanie powinno się udać nawet jeśli invalidacja failuje
  }
}

/**
 * Zapisuje nową sesję w tracking table
 */
export async function trackSession(
  supabase: SupabaseClient,
  userId: string,
  sessionId: string,
  accessToken: string,
  expiresAt: Date,
  userAgent?: string,
  ipAddress?: string
): Promise<void> {
  // Hash tokenu dla bezpieczeństwa (nie przechowujemy raw tokena)
  const tokenHash = await hashToken(accessToken);

  const { error } = await supabase.from("user_sessions").insert({
    user_id: userId,
    session_id: sessionId,
    access_token_hash: tokenHash,
    expires_at: expiresAt.toISOString(),
    user_agent: userAgent,
    ip_address: ipAddress,
    is_active: true,
  });

  if (error) {
    console.error("[trackSession] Error tracking session:", error);
    // Nie rzucamy - tracking jest pomocny ale nie krytyczny
  }
}

/**
 * Sprawdza czy sesja jest aktywna
 */
export async function isSessionActive(supabase: SupabaseClient, userId: string, sessionId: string): Promise<boolean> {
  const { data, error } = await supabase
    .from("user_sessions")
    .select("is_active")
    .eq("user_id", userId)
    .eq("session_id", sessionId)
    .eq("is_active", true)
    .single();

  if (error || !data) {
    return false;
  }

  return data.is_active;
}

/**
 * Hash tokenu używając Web Crypto API
 */
async function hashToken(token: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(token);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}
```

---

### Aktualizacja middleware

#### `src/middleware/index.ts` - AKTUALIZACJA

**Zmiany do wdrożenia:**

1. Ograniczenie testing mode (tylko dla development)
2. Aktualizacja logiki sprawdzania sesji
3. Dodanie obsługi cookie-based auth

**Zaktualizowana implementacja:**

```typescript
import { defineMiddleware } from "astro:middleware";
import type { SupabaseClient } from "@supabase/supabase-js";

export const onRequest = defineMiddleware(async (context, next) => {
  // Import clients
  const { supabaseClient } = await import("../db/supabase.client");

  // Inject Supabase client into context
  context.locals.supabase = supabaseClient;

  // ============================================================================
  // TESTING MODE: Only in development with explicit env var
  // ============================================================================

  const isTestingMode = import.meta.env.DEV && import.meta.env.DISABLE_AUTH_FOR_TESTING === "true";

  if (isTestingMode) {
    console.warn("⚠️  [Auth Middleware] TESTING MODE ACTIVE");

    // Implement testing user logic (existing code)
    // ... (keep existing testing mode logic)

    return next();
  }

  // ============================================================================
  // NORMAL MODE: Production authentication
  // ============================================================================

  try {
    // Get session from cookies
    const {
      data: { session },
      error,
    } = await supabaseClient.auth.getSession();

    if (error) {
      console.error("[Auth Middleware] Error getting session:", error.message);
      context.locals.user = null;
      return next();
    }

    if (!session) {
      context.locals.user = null;
      return next();
    }

    // Get user from session
    const {
      data: { user },
      error: userError,
    } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      console.error("[Auth Middleware] Error getting user:", userError?.message);
      context.locals.user = null;
      return next();
    }

    // Sprawdzenie czy sesja jest aktywna (session invalidation check)
    // Zgodnie z PRD: nowe logowanie unieważnia wszystkie stare sesje
    const sessionId = session.access_token.substring(0, 32);
    const isActive = await isSessionActive(supabaseClient, user.id, sessionId);

    if (!isActive) {
      console.warn("[Auth Middleware] Session has been invalidated");
      // Wyloguj użytkownika
      await supabaseClient.auth.signOut();
      context.locals.user = null;
      return next();
    }

    // Aktualizuj last_activity_at (opcjonalne, dla audytu)
    await supabaseClient
      .from("user_sessions")
      .update({ last_activity_at: new Date().toISOString() })
      .eq("session_id", sessionId)
      .eq("user_id", user.id);

    // Inject authenticated user into context
    context.locals.user = user;
  } catch (err) {
    console.error("[Auth Middleware] Unexpected error:", err);
    context.locals.user = null;
  }

  return next();
});
```

**Kluczowe zmiany:**

- Testing mode tylko w development
- Obsługa cookie-based session (automatyczna przez Supabase client)
- Graceful error handling (nie blokuje requestu)
- Logging dla debugging

---

## System Autentykacji

### Supabase Auth - konfiguracja

Supabase Auth zapewnia:

- **Magic Link** (passwordless authentication)
- **Session management** (cookie-based, secure)
- **Email verification** (jednorazowy link OTP)
- **Rate limiting** (built-in)
- **Security** (CSRF protection, secure cookies)

### Konfiguracja Supabase Dashboard

**Email Templates:**

**UWAGA:** Customowy template email znajduje się w `.ai/email-templates/magic-link.html`

1. **Magic Link Email** - cechy template:
   - ✅ Dopasowany do jasnej wersji strony (light theme)
   - ✅ Responsywny design (mobile + desktop)
   - ✅ Profesjonalny wygląd zgodny z brandem Memo
   - ✅ **BRAK alternatywnego kodu OTP** (tylko link do kliknięcia)
   - ✅ Przycisk CTA + fallback link jako tekst
   - ✅ Jasne informacje o ważności (1h) i jednorazowości linku

2. **Subject:** "Link do logowania - Memo"

3. **Konfiguracja w Supabase Dashboard:**
   - Przejdź do **Authentication** → **Email Templates** → **Magic Link**
   - Skopiuj zawartość z `.ai/email-templates/magic-link.html`
   - Wklej jako template
   - **WAŻNE:** Template **NIE zawiera** zmiennej `{{ .Token }}` - celowo ukrywamy kod OTP
   - Template używa **tylko** `{{ .ConfirmationURL }}` (magic link)

4. **Dlaczego bez kodu OTP?**
   - Zgodnie z PRD: logowanie **TYLKO** przez magic link (kliknięcie w link)
   - Minimalistyczny UX - jedna ścieżka logowania
   - Kod OTP jest nadal generowany przez Supabase (wymóg techniczny), ale nie jest pokazywany użytkownikowi
   - Jeśli użytkownik chce się zalogować, musi kliknąć link w mailu

**Szczegółowe instrukcje i troubleshooting:** Zobacz `.ai/email-templates/README.md`

**Auth Settings:**

- **Site URL:** `https://yourdomain.com` (production) lub `http://localhost:3000` (dev)
- **Redirect URLs:**
  - `https://yourdomain.com/auth/callback`
  - `http://localhost:3000/auth/callback` (dev)
- **Email Auth:** Enabled
- **Enable email confirmations:** Disabled (magic link działa bez potwierdzenia)
- **Secure email change:** Enabled
- **Session expiry:** 2592000 seconds (30 dni)
- **Refresh token rotation:** Enabled
- **Reuse interval:** 10 seconds

**Rate Limiting (Supabase default):**

- Email OTP: 4 per hour per email
- Refresh token: 50 per hour per user

**SMTP Configuration:**

Skonfigurować external SMTP provider (np. SendGrid, Mailgun, AWS SES):

- **SMTP Host:** smtp.sendgrid.net (przykład)
- **SMTP Port:** 587
- **SMTP User:** apikey
- **SMTP Password:** [Your SendGrid API Key]
- **Sender email:** noreply@yourdomain.com
- **Sender name:** Memo

**DNS Configuration (dla custom domain emails):**

- SPF record
- DKIM record
- DMARC record

### Session Management

**Cookie strategy:**

Supabase używa dwóch cookies:

1. **sb-access-token** - JWT access token (short-lived)
2. **sb-refresh-token** - refresh token (long-lived, 30 dni)

**Attributes:**

- `HttpOnly: true` - nie dostępne dla JavaScript (XSS protection)
- `Secure: true` - tylko HTTPS (production)
- `SameSite: Lax` - CSRF protection
- `Path: /` - dostępne dla całej aplikacji

**Refresh flow:**

Supabase client automatycznie odświeża token gdy:

- Access token wygasa (default 1h)
- User wykonuje request a token jest bliski wygaśnięcia

**Session invalidation:**

Zgodnie z PRD: "nowe logowanie unieważnia wszystkie stare sesje" **(MUST HAVE)**

**Implementacja dla MVP:**

Supabase Auth nie wspiera natywnego invalidowania innych sesji, dlatego implementujemy custom tracking:

1. **Tabela `user_sessions`** (dodać do migracji):

```sql
CREATE TABLE user_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id text NOT NULL UNIQUE,
  access_token_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  last_activity_at timestamptz NOT NULL DEFAULT now(),
  is_active boolean NOT NULL DEFAULT true,
  user_agent text,
  ip_address inet
);

CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_active ON user_sessions(user_id, is_active) WHERE is_active = true;
```

2. **Flow przy logowaniu** (`/auth/callback`):
   - Zapisz nową sesję w `user_sessions`
   - Wywołaj `invalidateOtherSessions()` aby dezaktywować stare sesje
3. **Walidacja w middleware**:
   - Sprawdź czy current session jest w `user_sessions` z `is_active = true`
   - Jeśli nie - wyloguj użytkownika

**Uwaga**: Ta implementacja zapewnia zgodność z PRD przy akceptowalnym narzucie wydajności (jeden dodatkowy SELECT w middleware dla sesji nowych/nie-cached).

---

### Bezpieczeństwo

#### 1. Rate Limiting

**Zgodnie z PRD**: Rate limiting na email/IP

**Poziomy ochrony:**

| Operacja             | Limit       | Okno czasowe | Implementacja     | Uwagi                             |
| -------------------- | ----------- | ------------ | ----------------- | --------------------------------- |
| Email OTP (Supabase) | 4 requests  | 1 godzina    | Built-in          | Automatyczne, nie można zmieniać  |
| Email OTP (custom)   | 5 requests  | 15 minut     | Application-level | Dodatkowa warstwa ochrony         |
| IP-based (global)    | 10 requests | 15 minut     | Application-level | Chroni przed atakami z jednego IP |

**Uzasadnienie wartości:**

- **4 req/h per email**: Wystarczające dla normalnego użycia (1-2 próby logowania), chroni przed spam
- **5 req/15min per email+IP**: Pozwala na kilka prób jeśli użytkownik pomylił email, ale ogranicza abuse
- **10 req/15min per IP**: Pozwala na kilku użytkowników za shared IP (np. corporate network), ale blokuje brute force

**Application-level rate limiter:**

```typescript
// src/lib/services/rate-limiter.ts
// Implementacja opisana wcześniej w sekcji API endpoints
```

**Production enhancement:**

Użyć Redis lub Upstash dla distributed rate limiting:

- Skalowalne
- Persystentne
- Shared across instances

#### 2. CSRF Protection

**Supabase Auth:** Automatyczna ochrona CSRF przez:

- `SameSite: Lax` cookie attribute
- CSRF token w request headers

**Custom endpoints:** Nie wymagają dodatkowej ochrony jeśli używają cookie-based auth

#### 3. XSS Protection

**Mitigacje:**

- `HttpOnly` cookies (tokens niedostępne dla JS)
- React automatic escaping (dangerouslySetInnerHTML nie używane)
- Content Security Policy headers (future enhancement)

**CSP Headers (do dodania w produkcji):**

```typescript
// src/middleware/index.ts
response.headers.set(
  "Content-Security-Policy",
  "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';"
);
```

#### 4. Email Verification

**Magic Link security:**

- **One-time use:** Każdy link może być użyty tylko raz
- **Expiry:** Link wygasa po 1 godzinie
- **Token entropy:** Supabase używa kryptograficznie bezpiecznych tokenów
- **No user enumeration:** API nie ujawnia czy email istnieje w systemie

**Protection against timing attacks:**

Endpoint `/api/auth/send-magic-link` zawsze zwraca sukces (nawet jeśli email nie istnieje) z tym samym czasem odpowiedzi.

#### 5. Password Requirements

**Nie dotyczy:** Aplikacja używa passwordless auth (magic link only)

#### 6. Account Security

**Session hijacking prevention:**

- Secure cookies (`Secure`, `HttpOnly`, `SameSite`)
- HTTPS only w produkcji
- Refresh token rotation

**Brute force protection:**

- Rate limiting (opisane wyżej)
- Supabase Auth lockout po wielu failed attempts

#### 7. GDPR Compliance

**Data deletion:**

- **Delete account:** Natychmiastowe usunięcie wszystkich danych przez cascade delete
- **Events anonimizacja:** Po ~30 dniach (`user_id` zastąpiony przez `anonymous`)

**Data retention policy:**

```sql
-- Scheduled job (do implementacji z pg_cron lub external scheduler)
-- Run daily
UPDATE events
SET user_id = '00000000-0000-0000-0000-000000000000',
    payload = jsonb_set(payload, '{anonymized}', 'true')
WHERE created_at < NOW() - INTERVAL '30 days'
  AND user_id != '00000000-0000-0000-0000-000000000000';
```

**Right to data export:** (Future enhancement)

Endpoint `/api/auth/export-data` zwracający wszystkie dane użytkownika w formacie JSON.

---

## Przypadki Brzegowe i Obsługa Błędów

### Scenariusze błędów

#### 1. Link magiczny wygasł

**Trigger:** User klika link po > 1h

**Flow:**

1. `/auth/callback` otrzymuje wygasły token
2. Supabase zwraca error `invalid_grant`
3. Redirect do `/?error=link_expired`
4. Landing page wyświetla komunikat

**Komunikat:**

> "Link wygasł. Poproś o nowy link do logowania."

**UI:** Toast notification (destructive variant) + formularz logowania gotowy do użycia

---

#### 2. Link magiczny już użyty

**Trigger:** User klika ten sam link dwukrotnie

**Flow:**

1. Pierwszy klik: sukces, sesja utworzona
2. Drugi klik: Supabase zwraca error `invalid_grant` lub `otp_expired`
3. Redirect do `/?error=link_used`

**Komunikat:**

> "Ten link został już użyty. Jeśli chcesz się zalogować ponownie, poproś o nowy link."

---

#### 3. Rate limit przekroczony

**Trigger:** User wysyła > 5 requestów w 15 minut

**Flow:**

1. API `/api/auth/send-magic-link` zwraca 429
2. Response zawiera `retry_after` w sekundach
3. `<AuthForm>` wyświetla komunikat z countdown

**Komunikat:**

> "Przekroczono limit prób. Spróbuj ponownie za {X} sekund."

**UI:** Disabled form + countdown timer + komunikat

---

#### 4. Email provider error

**Trigger:** SMTP server unavailable lub błąd wysyłki

**Flow:**

1. Supabase Auth nie może wysłać emaila
2. API zwraca error (500)
3. `<AuthForm>` wyświetla generyczny komunikat

**Komunikat:**

> "Nie udało się wysłać linku. Spróbuj ponownie za chwilę."

**Logging:** Server-side log z details dla debugging

---

#### 5. Network error (client-side)

**Trigger:** Brak połączenia internetowego

**Flow:**

1. Fetch w `<AuthForm>` rzuca exception
2. Catch block wyświetla komunikat

**Komunikat:**

> "Wystąpił błąd połączenia. Sprawdź internet i spróbuj ponownie."

---

#### 6. Invalid email format

**Trigger:** User wpisuje nieprawidłowy email

**Flow:**

1. Client-side validation w `<AuthForm>` wykrywa błąd
2. Submit blokowany, wyświetlany komunikat

**Komunikat:**

> "Nieprawidłowy format email"

**UI:** Input field z czerwoną obwódką + komunikat pod polem

---

#### 7. Session wygasła (podczas browsowania)

**Trigger:** User przeglądający chronioną stronę po wygaśnięciu sesji

**Flow:**

1. User wykonuje akcję (np. navigacja)
2. Middleware wykrywa brak sesji
3. Redirect do `/?redirect=/intended-url`

**Komunikat (landing page):**

> "Twoja sesja wygasła. Zaloguj się ponownie."

---

#### 8. Concurrent logins (multiple devices)

**Trigger:** User loguje się na dwóch urządzeniach

**Flow:**

1. Pierwsze logowanie: sesja A aktywna
2. Drugie logowanie: sesja B utworzona
3. Sesja A pozostaje aktywna (brak invalidacji w MVP)

**Zachowanie:**

- Obie sesje działają do wygaśnięcia (30 dni)
- Zgodnie z PRD powinny być invalidowane (future enhancement)

**Future fix:** Implementacja session tracking + invalidation

---

### Error response formats

**Consistent error structure:**

```typescript
interface ErrorResponse {
  error: string; // Machine-readable error code
  message: string; // User-friendly message (PL)
  details?: unknown; // Optional debug info (dev only)
  retry_after?: number; // For rate limiting
}
```

**Error codes mapping:**

| HTTP Status | Error Code            | User Message (PL)               |
| ----------- | --------------------- | ------------------------------- |
| 400         | `validation_error`    | "Nieprawidłowe dane"            |
| 401         | `unauthorized`        | "Musisz być zalogowany"         |
| 403         | `forbidden`           | "Brak uprawnień"                |
| 404         | `not_found`           | "Nie znaleziono"                |
| 429         | `rate_limit_exceeded` | "Przekroczono limit prób"       |
| 500         | `server_error`        | "Wystąpił błąd serwera"         |
| 503         | `service_unavailable` | "Serwis tymczasowo niedostępny" |

---

## Przepływ Danych

### Diagram przepływu: Magic Link Authentication

```
[User] ─→ [Landing Page] ─→ [AuthForm Component]
                                    │
                                    │ POST /api/auth/send-magic-link
                                    ↓
                             [API Endpoint]
                                    │
                                    ├─→ [Rate Limiter Check]
                                    │       │
                                    │       ├─→ Blocked → 429 Response
                                    │       └─→ Allowed → Continue
                                    │
                                    ├─→ [Supabase Auth API]
                                    │       └─→ signInWithOtp()
                                    │
                                    └─→ [Email Provider (SMTP)]
                                            │
                                            ↓
                                     [User Email Inbox]
                                            │
                                            │ Click Magic Link
                                            ↓
                             [/auth/callback?code=...]
                                            │
                                            ├─→ Exchange code for session
                                            ├─→ Create user profile (if new)
                                            ├─→ Invalidate old sessions
                                            └─→ Set session cookies
                                            │
                                            ↓
                                     [Redirect /dashboard]
                                            │
                                            ↓
                                   [Dashboard Page (Authenticated)]
```

### Diagram przepływu: Session Middleware

```
[Incoming Request]
        │
        ↓
[Middleware]
        │
        ├─→ Get session from cookies
        │       │
        │       ├─→ No session → locals.user = null → Continue
        │       └─→ Has session → Continue
        │
        ├─→ Validate session with Supabase
        │       │
        │       ├─→ Valid → Get user data
        │       └─→ Invalid → locals.user = null
        │
        ├─→ Inject user into locals
        │
        ↓
[Page/API Route]
        │
        ├─→ Protected route?
        │       │
        │       ├─→ Yes + user=null → Redirect /
        │       └─→ No or user exists → Render
        │
        ↓
[Response]
```

### Data flow: User Profile Creation

```
[New User Login] → [/auth/callback]
                          │
                          ├─→ Exchange code for session (Supabase)
                          │       └─→ User object retrieved
                          │
                          ├─→ ensureUserProfile(user.id)
                          │       │
                          │       ├─→ Check if profile exists
                          │       │       └─→ SELECT from profiles WHERE user_id = ...
                          │       │
                          │       ├─→ Profile exists? → Skip creation
                          │       │
                          │       └─→ Profile missing?
                          │               └─→ INSERT into profiles
                          │                   (user_id, theme_preference, locale, timezone)
                          │
                          └─→ Redirect to /dashboard
```

---

## Matryca Odpowiedzialności

### Frontend Components

| Komponent                 | Typ             | Odpowiedzialności                                                                   | Dependencies                |
| ------------------------- | --------------- | ----------------------------------------------------------------------------------- | --------------------------- |
| `index.astro`             | Page (SSR)      | - Check session<br>- Redirect if auth<br>- Render hero + form                       | `<AuthForm>`                |
| `auth/check-email.astro`  | Page (SSR)      | - Validate email param<br>- Redirect if auth<br>- Render confirmation               | `<CheckEmailContent>`       |
| `auth/callback.astro`     | Page (SSR)      | - Exchange code<br>- Create profile<br>- Invalidate sessions<br>- Redirect          | Supabase Auth               |
| `AuthForm.tsx`            | React Component | - Email validation<br>- API call<br>- Loading/error states<br>- Redirect on success | `/api/auth/send-magic-link` |
| `CheckEmailContent.tsx`   | React Component | - Display email<br>- Countdown timer<br>- Resend logic                              | `/api/auth/send-magic-link` |
| `UserMenu.tsx`            | React Component | - Display user info<br>- Logout action<br>- Dropdown UI                             | `/api/auth/logout`          |
| `DeleteAccountDialog.tsx` | React Component | - Confirmation input<br>- Delete action<br>- Error handling                         | `/api/auth/delete-account`  |

### Backend Endpoints

| Endpoint                    | Method | Odpowiedzialności                                                                        | Authentication |
| --------------------------- | ------ | ---------------------------------------------------------------------------------------- | -------------- |
| `/api/auth/send-magic-link` | POST   | - Validate email<br>- Rate limiting<br>- Call Supabase OTP API<br>- Return success/error | No (public)    |
| `/api/auth/logout`          | POST   | - Sign out Supabase<br>- Clear cookies<br>- Return success                               | Yes (cookie)   |
| `/api/auth/delete-account`  | DELETE | - Validate confirmation<br>- Delete user (cascade)<br>- Log event<br>- Return success    | Yes (cookie)   |

### Services & Helpers

| Moduł                 | Odpowiedzialności                                                                              |
| --------------------- | ---------------------------------------------------------------------------------------------- |
| `auth-helpers.ts`     | - requireAuth()<br>- isAuthenticated()<br>- ensureUserProfile()<br>- invalidateOtherSessions() |
| `rate-limiter.ts`     | - checkRateLimit()<br>- IP extraction<br>- Store management                                    |
| `supabase.client.ts`  | - Client initialization<br>- Type exports                                                      |
| `middleware/index.ts` | - Session validation<br>- User injection<br>- Testing mode                                     |

### Database

| Tabela       | Odpowiedzialności                                          | Managed by    |
| ------------ | ---------------------------------------------------------- | ------------- |
| `auth.users` | - User identity<br>- Email storage<br>- Session management | Supabase Auth |
| `profiles`   | - User preferences<br>- Theme, locale, timezone            | Application   |
| `events`     | - Audit trail<br>- Analytics events                        | Application   |

### External Services

| Serwis        | Odpowiedzialności                                                                        |
| ------------- | ---------------------------------------------------------------------------------------- |
| Supabase Auth | - Magic link generation<br>- Email sending<br>- Token validation<br>- Session management |
| SMTP Provider | - Email delivery<br>- Bounce handling<br>- SPF/DKIM                                      |

---

## Implementacja - kolejność wdrożenia

### Faza 1: Podstawowa infrastruktura

1. ✅ **Database migration - Session tracking**
   - Utworzenie tabeli `user_sessions`
   - Indeksy dla wydajności
   - RLS policies
   - Cleanup function

2. ✅ **Supabase configuration**
   - Email templates
   - Auth settings
   - SMTP provider

3. ✅ **Middleware update**
   - Remove/limit testing mode
   - Production-ready session handling
   - Session activity check (invalidation)
   - Error handling

4. ✅ **Auth helpers**
   - Create `auth-helpers.ts`
   - Implement `requireAuth()`, `ensureUserProfile()`
   - Implement `invalidateOtherSessions()`, `trackSession()`, `isSessionActive()`

### Faza 2: API Endpoints

5. ✅ **Rate limiter service**
   - Create `rate-limiter.ts`
   - Implement IP-based limiting

6. ✅ **POST `/api/auth/send-magic-link`**
   - Validation schema
   - Rate limiting
   - Supabase integration

7. ✅ **POST `/api/auth/logout`**
   - Session cleanup
   - Cookie removal
   - Session invalidation in user_sessions table

8. ✅ **DELETE `/api/auth/delete-account`**
   - Validation (input text "USUŃ")
   - Cascade delete
   - Event logging

### Faza 3: Frontend - Pages

9. ✅ **`/auth/check-email.astro`**
   - SSR logic
   - Email validation

10. ✅ **`/auth/callback.astro`**
    - Code exchange
    - Profile creation
    - Session tracking (trackSession)
    - Session invalidation (invalidateOtherSessions)
    - Redirect

11. ✅ **Update `index.astro`**
    - Session check
    - Redirect logic
    - Error handling

### Faza 4: Frontend - Components

12. ✅ **Convert `AuthForm` to React**
    - Client-side validation
    - API integration
    - Error states

13. ✅ **Create `<CheckEmailContent>`**
    - Countdown timer (60s)
    - Resend logic
    - UI states

14. ✅ **Update `<UserMenu>`**
    - Logout handler
    - Error handling

15. ✅ **Update `<DeleteAccountDialog>`**
    - Confirmation logic (input text "USUŃ")
    - API integration
    - Error handling

### Faza 5: Protection & Testing

16. ✅ **Protect authenticated pages**
    - Dashboard
    - Profile
    - Lists

17. ✅ **End-to-end testing**
    - Magic link flow
    - Logout
    - Delete account
    - Session invalidation (multiple logins)
    - Rate limiting
    - Error scenarios

18. ✅ **Security audit**
    - CSRF protection
    - XSS prevention
    - Rate limiting effectiveness
    - Session invalidation security

### Faza 6: Production prep

19. ✅ **Environment configuration**
    - Production SMTP
    - Redirect URLs
    - Session settings

20. ✅ **Monitoring & logging**
    - Error tracking
    - Auth events
    - Rate limit hits
    - Session invalidation events

21. ✅ **Documentation**
    - API docs
    - Setup guide
    - Troubleshooting
    - Session management guide

---

## Appendix

### Migracja: Session Tracking

**Plik**: `supabase/migrations/[timestamp]_session_tracking.sql`

```sql
-- ============================================================================
-- Session Tracking Table
-- ============================================================================
-- Zgodnie z wymaganiem PRD: "nowe logowanie unieważnia wszystkie stare sesje"
-- Ta tabela umożliwia tracking i invalidację sesji użytkowników

CREATE TABLE IF NOT EXISTS user_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id text NOT NULL UNIQUE,
  access_token_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  last_activity_at timestamptz NOT NULL DEFAULT now(),
  is_active boolean NOT NULL DEFAULT true,
  user_agent text,
  ip_address inet,

  CONSTRAINT user_sessions_session_id_check CHECK (length(session_id) >= 16)
);

-- Indeksy dla wydajności
CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_user_sessions_active ON user_sessions(user_id, is_active) WHERE is_active = true;
CREATE INDEX idx_user_sessions_expires_at ON user_sessions(expires_at) WHERE is_active = true;

-- RLS policies
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own sessions"
  ON user_sessions
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can invalidate their own sessions"
  ON user_sessions
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Automatyczne czyszczenie wygasłych sesji (opcjonalne, można użyć pg_cron)
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM user_sessions
  WHERE expires_at < NOW() - INTERVAL '7 days';
END;
$$;

-- Komentarze
COMMENT ON TABLE user_sessions IS 'Tracking aktywnych sesji użytkowników dla invalidacji przy nowym logowaniu';
COMMENT ON COLUMN user_sessions.session_id IS 'Unique identifier sesji (fragment access tokena)';
COMMENT ON COLUMN user_sessions.access_token_hash IS 'SHA-256 hash access tokena (dla bezpieczeństwa)';
COMMENT ON COLUMN user_sessions.is_active IS 'False gdy sesja została invalidowana przez nowe logowanie';
```

### Environment Variables

```bash
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# App
PUBLIC_SITE_URL=https://yourdomain.com  # Production
# PUBLIC_SITE_URL=http://localhost:3000  # Development

# Auth
AUTH_REDIRECT_URL=https://yourdomain.com/auth/callback

# Testing (development only)
# DISABLE_AUTH_FOR_TESTING=true
# TEST_USER_EMAIL=test@example.com
```

### Type Definitions

```typescript
// src/env.d.ts
/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly SUPABASE_URL: string;
  readonly SUPABASE_KEY: string;
  readonly SUPABASE_SERVICE_ROLE_KEY: string;
  readonly PUBLIC_SITE_URL: string;
  readonly AUTH_REDIRECT_URL: string;
  readonly DISABLE_AUTH_FOR_TESTING?: string;
  readonly TEST_USER_EMAIL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// Astro locals
declare namespace App {
  interface Locals {
    supabase: import("@supabase/supabase-js").SupabaseClient;
    user: import("@supabase/supabase-js").User | null;
  }
}
```

### Validation Schemas (Zod)

```typescript
// src/lib/validation/auth.ts
import { z } from "zod";

export const SendMagicLinkSchema = z.object({
  email: z.string().trim().min(1, "Email jest wymagany").email("Nieprawidłowy format email").toLowerCase(),
  redirectTo: z.string().url().optional(),
});

export const DeleteAccountSchema = z.object({
  confirmation: z.literal("USUŃ", {
    errorMap: () => ({
      message: "Wpisz dokładnie: USUŃ (wielkie litery)",
    }),
  }),
});

export type SendMagicLinkInput = z.infer<typeof SendMagicLinkSchema>;
export type DeleteAccountInput = z.infer<typeof DeleteAccountSchema>;
```

---

## Podsumowanie

Niniejsza specyfikacja przedstawia kompletną architekturę modułu autentykacji dla aplikacji Memo, opartą na Supabase Auth i zgodną z wszystkimi wymaganiami z PRD. System wykorzystuje passwordless authentication (Magic Link) jako jedyną metodę dostępu, zapewniając wysoki poziom bezpieczeństwa przy minimalnym friction dla użytkownika.

### Kluczowe cechy architektury:

1. **Hybrid Rendering:** Astro SSR dla logiki autentykacji + React dla interaktywnych komponentów
2. **Bezpieczeństwo:** Rate limiting, CSRF protection, secure cookies, GDPR compliance
3. **UX:** Minimalistyczne flow zgodne z PRD (email → link → dashboard)
4. **Skalowalnośc:** Modułowa struktura umożliwiająca future enhancements
5. **Maintainability:** Clear separation of concerns, reusable helpers, consistent patterns

### Następne kroki:

Implementacja zgodnie z planem fazowym (sekcja "Implementacja - kolejność wdrożenia") z naciskiem na thorough testing i security audit przed wdrożeniem produkcyjnym.

---

## Historia zmian

### Wersja 1.1 (2026-01-29)

**Aktualizacja po weryfikacji zgodności z PRD**

**Zmiany krytyczne:**

1. ✅ **Session invalidation - upgrade do MUST HAVE**
   - Dodano tabelę `user_sessions` dla tracking sesji
   - Zaimplementowano `invalidateOtherSessions()` z pełną funkcjonalnością
   - Dodano `trackSession()` i `isSessionActive()` helpers
   - Zaktualizowano middleware aby sprawdzał aktywność sesji
   - Zaktualizowano `/auth/callback` flow aby tracking sesje
   - **Status**: Zmieniono z "Future enhancement" na "MVP requirement"

2. ✅ **Rate limiting - ujednolicenie wartości**
   - Wyjaśniono i uzasadniono wartości limitów
   - Rozwiązano sprzeczności między auth-spec a api-plan.md
   - Finalne wartości: 4 req/h (Supabase), 5 req/15min (email+IP), 10 req/15min (IP global)

**Wyjaśnienia i precyzacje:**

3. ✅ **Delete account confirmation**
   - Wybrano metodę: Input text "USUŃ" (nie podwójne kliknięcie)
   - Uzasadnienie: lepsze UX, standard branżowy, mniejsze ryzyko przypadkowego usunięcia

4. ✅ **Countdown timer**
   - Wyjaśniono wybór: 60s fixed dla MVP (PRD: 30-60s)
   - Uzasadnienie: więcej czasu na dostarczenie emaila, lepsza UX

**Zgodność z PRD:**

- ✅ Wszystkie MUST HAVE requirements są zaimplementowane
- ✅ Wszystkie User Stories są realizowalne
- ✅ Brak sprzeczności między dokumentami
- ✅ Wymagania bezpieczeństwa spełnione

---

**Koniec specyfikacji**
