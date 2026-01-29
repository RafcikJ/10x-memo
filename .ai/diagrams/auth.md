<authentication_analysis>

## 1) Przepływy autentykacji z dokumentacji

- Logowanie / rejestracja przez email + magic link (bez hasła).
- Ekran „sprawdź skrzynkę” z countdown 30–60s + „Wyślij ponownie”.
- Callback po kliknięciu linku: wymiana kodu na sesję, ustawienie cookies,
  utworzenie profilu (onboarding).
- Ochrona stron wymagających autentykacji (SSR): redirect niezalogowanych.
- Obsługa wygasania tokenu oraz odświeżanie sesji (refresh token rotation).
- Invalidacja poprzednich sesji po nowym logowaniu (wymóg PRD).
- Rate limiting na email/IP dla wysyłki linków.
- Wylogowanie.
- Usunięcie konta z mocnym potwierdzeniem („USUŃ”) i natychmiastowym usunięciem
  danych (cascade delete) oraz unieważnieniem sesji.
- Obsługa błędów: link wygasł / już użyty, rate limit, błędy sieci/SMTP.

## 2) Główni aktorzy i interakcje

- Przeglądarka: UI (landing + formularz), klik linku w mailu, nawigacja.
- Middleware: weryfikacja sesji z cookies i wstrzyknięcie `locals.user`.
- Astro API: endpointy auth (wysyłka linku, logout, delete account).
- Supabase Auth: generowanie magic link, wymiana kodu na sesję, refresh,
  wylogowanie, operacje admin (delete user).

## 3) Weryfikacja i odświeżanie tokenów

- Weryfikacja: middleware/SSR sprawdza sesję na podstawie cookies; gdy brak lub
  sesja nieważna → `locals.user=null` i redirect do logowania.
- Odświeżanie: gdy access token wygasa, Supabase może odświeżyć sesję przy
  kolejnym żądaniu (z użyciem refresh tokena); aplikacja kontynuuje „happy path”.
- Invalidacja sesji po nowym logowaniu (PRD): aplikacja prowadzi tracking sesji
  (np. tabela `user_sessions`) i w middleware sprawdza, czy bieżąca sesja jest
  aktywna; jeśli nie → signOut i wymuszenie ponownego logowania.

## 4) Krótki opis kroków

- Użytkownik wpisuje email → Astro API waliduje + rate limit → Supabase wysyła
  magic link → UI pokazuje ekran „sprawdź skrzynkę” i pozwala na resend.
- Klik w link → strona callback wymienia kod na sesję → zapis cookies → opcjonalnie
  tworzy profil → invaliduje poprzednie sesje → redirect do dashboard/intended.
- Każde wejście na stronę chronioną przechodzi przez middleware: sesja OK → render,
  sesja brak/wygasła → redirect do landing i ponowny login.
- Logout i delete account realizowane przez Astro API i Supabase Auth.

## Szybki kontekst z codebase (co znaleziono)

- Jest middleware (`src/middleware/index.ts`) ustawiający `context.locals.user`.
- Strony chronione (`/dashboard`, `/profile`, `/lists/*`) robią SSR-check i redirect
  gdy `Astro.locals.user` jest puste.
- Brak jeszcze dedykowanych stron `/auth/*` i endpointów `/api/auth/*`
  opisanych w `auth-spec` (to jest docelowy przepływ).
  </authentication_analysis>

<mermaid_diagram>

```mermaid
sequenceDiagram
autonumber

participant B as Przeglądarka
participant M as Middleware
participant A as Astro API
participant S as Supabase Auth

Note over B,M: Wejście na stronę chronioną (SSR)
B->>M: Żądanie strony chronionej
activate M
M->>S: Weryfikacja sesji z cookies
activate S
S-->>M: Sesja: brak / ważna / do odświeżenia
deactivate S

alt Brak sesji lub niepoprawna
  M-->>B: Brak użytkownika w locals
  deactivate M
  B->>B: Redirect do strony logowania
else Sesja ważna
  M-->>B: Użytkownik w locals
  deactivate M
  B->>B: Render strony chronionej
else Token wygasł, możliwy refresh
  M->>S: Odświeżenie sesji
  activate S
  S-->>M: Nowe cookies sesji
  deactivate S
  M-->>B: Użytkownik w locals
  deactivate M
  B->>B: Kontynuuj render strony
end

Note over B,A: Logowanie przez magic link (email-only)
B->>A: Wysłanie emaila do logowania
activate A
A->>A: Walidacja email + rate limit (email/IP)

alt Rate limit przekroczony
  A-->>B: Odrzuć z informacją o czasie ponowienia
  deactivate A
  B->>B: UI: blokada i countdown + „Wyślij ponownie”
else Dane poprawne
  A->>S: Zleć wysłanie magic link
  activate S
  S-->>A: Potwierdzenie wysyłki
  deactivate S
  A-->>B: Sukces wysyłki
  deactivate A
  B->>B: UI: ekran „Sprawdź skrzynkę” + countdown
end

par Resend po countdown
  B->>A: Ponowna prośba o link
  activate A
  A->>A: Rate limit (ponownie)
  alt Dozwolone
    A->>S: Wyślij magic link ponownie
    activate S
    S-->>A: Potwierdzenie
    deactivate S
    A-->>B: Sukces
  else Zablokowane
    A-->>B: Odrzuć z informacją
  end
  deactivate A
and Klik w link w mailu
  Note over B,S: Link jest jednorazowy i ma ograniczony czas ważności
  B->>B: Otwarcie strony callback
end

Note over B,A: Callback po kliknięciu magic link
B->>A: Wymiana kodu na sesję
activate A
A->>S: Exchange code na sesję
activate S
alt Kod poprawny
  S-->>A: Sesja + cookies
  deactivate S
  A->>A: Onboarding: utwórz profil (jeśli nowy)
  A->>A: Tracking bieżącej sesji
  A->>A: Invaliduj poprzednie sesje (PRD)
  A-->>B: Redirect do dashboard / intended
  deactivate A
else Kod błędny, link wygasł lub użyty
  S-->>A: Błąd weryfikacji
  deactivate S
  A-->>B: Redirect do logowania z komunikatem
  deactivate A
end

Note over B,M: Normalne użycie po zalogowaniu
B->>M: Kolejne żądanie strony / API
activate M
M->>S: Weryfikacja sesji
activate S
S-->>M: Sesja ważna
deactivate S

alt Sesja unieważniona przez nowe logowanie
  M->>S: Wyloguj i wyczyść sesję
  activate S
  S-->>M: Potwierdzenie
  deactivate S
  M-->>B: Redirect do logowania
  deactivate M
else Sesja aktywna
  M-->>B: Kontynuuj
  deactivate M
end

Note over B,A: Wylogowanie
B->>A: Żądanie wylogowania
activate A
A->>S: Sign out
activate S
S-->>A: Potwierdzenie
deactivate S
A-->>B: Sukces + wyczyszczenie cookies
deactivate A
B->>B: Redirect do strony logowania

Note over B,A: Usunięcie konta (mocne potwierdzenie)
B->>A: Żądanie usunięcia konta
Note over B,A: Użytkownik wpisuje „USUŃ” w formularzu potwierdzenia
activate A
A->>A: Walidacja potwierdzenia i autoryzacji
alt Potwierdzenie błędne
  A-->>B: Odrzuć z komunikatem
  deactivate A
else Potwierdzenie poprawne
  A->>S: Usuń użytkownika (admin)
  activate S
  S-->>A: Potwierdzenie usunięcia
  deactivate S
  A-->>B: Sukces + redirect
  deactivate A
  B->>B: UI: komunikat o usunięciu konta
end
```

</mermaid_diagram>
