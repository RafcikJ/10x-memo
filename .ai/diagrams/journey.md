<user_journey_analysis>

## 1) Wszystkie ścieżki użytkownika wymienione w dokumentacji (PRD + auth-spec)

- Wejście do aplikacji jako niezalogowany użytkownik (landing).
- Próba wejścia w główną funkcjonalność bez logowania (pulpit / listy / profil) → przekierowanie do logowania.
- Logowanie / rejestracja przez email + magic link (passwordless):
  - wpisanie emaila → wysłanie linku
  - ekran „sprawdź skrzynkę” z countdown (30–60s) i „Wyślij ponownie”
  - kliknięcie linku w emailu → weryfikacja linku → przekierowanie do pulpitu
- Alternatywy/błędy:
  - niepoprawny email (walidacja)
  - błąd sieci / błąd serwera wysyłki
  - rate limiting (email/IP)
  - link wygasł / link już użyty
  - sesja wygasła podczas korzystania z aplikacji → ponowne logowanie
- Wylogowanie użytkownika.
- Usunięcie konta (mocne potwierdzenie „USUŃ”) i powrót do stanu niezalogowanego.
- Odzyskiwanie dostępu: w praktyce „wyślij nowy link” (w modelu bez hasła).

## 2) Główne podróże i odpowiadające im stany

- Podróż „Gość”:
  - Strona główna (landing)
  - Formularz logowania
  - (opcjonalnie) Komunikat o konieczności logowania po przekierowaniu

- Podróż „Logowanie / Rejestracja magic link”:
  - Formularz logowania → Wysyłka linku → Ekran „Sprawdź skrzynkę”
  - Oczekiwanie (countdown) → Ponowne wysłanie linku (opcjonalnie)
  - Kliknięcie linku → Weryfikacja linku → Ustawienie sesji → Pulpit

- Podróż „Użytkownik zalogowany”:
  - Pulpit (główna funkcjonalność aplikacji)
  - Nawigacja do Profilu
  - Wylogowanie
  - Usunięcie konta

- Podróż „Sesja i ponowne logowanie”:
  - Wygasła sesja / brak sesji → przekierowanie do logowania
  - Nowe logowanie (unieważnia poprzednie sesje – wymaganie PRD)

## 3) Punkty decyzyjne i alternatywne ścieżki

- Czy użytkownik jest zalogowany?
  - Tak → wejście do pulpitu / profilu
  - Nie → landing + formularz logowania

- Czy email jest poprawny?
  - Tak → wysyłka linku
  - Nie → błąd walidacji

- Czy można wysłać link (rate limiting)?
  - Tak → sukces wysyłki
  - Nie → komunikat o limicie + oczekiwanie do ponownej próby

- Czy link magiczny jest poprawny?
  - Tak → sesja aktywna → pulpit
  - Nie (wygasł / użyty / błędny) → komunikat → powrót do logowania

- Czy użytkownik chce ponowić wysyłkę linku?
  - Tak → resend (po countdown)
  - Nie → pozostaje na ekranie „sprawdź skrzynkę” / wraca do logowania

- Czy użytkownik potwierdzi usunięcie konta?
  - Tak (wpisane „USUŃ”) → konto usunięte → powrót na landing
  - Nie → anuluj i powrót do profilu

## 4) Krótki opis celu każdego stanu

- StronaGlowna: umożliwić start bez logowania i pokazać CTA do logowania.
- FormularzLogowania: zebrać email i rozpocząć proces logowania/rejestracji.
- WalidacjaEmail: szybko wychwycić błędny email i nie wysyłać linku.
- WysylkaLinku: zainicjować wysłanie magic linku (bez ujawniania czy konto istnieje).
- EkranSprawdzSkrzynke: poinformować użytkownika co dalej, pokazać countdown i możliwość ponowienia.
- PonownaWysylkaLinku: umożliwić wysłanie kolejnego linku po odczekaniu.
- WeryfikacjaLinku: potwierdzić poprawność linku i utworzyć/odświeżyć sesję.
- SesjaAktywna: użytkownik jest zalogowany i może korzystać z aplikacji.
- Pulpit: dostęp do głównej funkcjonalności (listy, testy).
- Profil: ustawienia i akcje konta (logout, delete account).
- Wylogowanie: zakończyć sesję i wrócić do stanu niezalogowanego.
- UsuwanieKonta: zebrać mocne potwierdzenie i trwale usunąć konto wraz z danymi.
- Blad: pokazać jasny komunikat i wskazać kolejne kroki (spróbuj ponownie / poproś o nowy link).
  </user_journey_analysis>

<mermaid_diagram>

```mermaid
stateDiagram-v2
  [*] --> StronaGlowna

  state "Użytkownik niezalogowany" as Niezalogowany {
    [*] --> StronaGlowna
    StronaGlowna --> FormularzLogowania: Klik "Zaloguj się"

    state FormularzLogowania: Email + przycisk wysłania linku
    FormularzLogowania --> WalidacjaEmail: Wyślij link

    state if_email_poprawny <<choice>>
    WalidacjaEmail --> if_email_poprawny
    if_email_poprawny --> BladWalidacji: Email błędny
    if_email_poprawny --> if_rate_limit: Email poprawny

    BladWalidacji --> FormularzLogowania: Popraw dane

    state if_rate_limit <<choice>>
    if_rate_limit --> BladLimit: Limit przekroczony
    if_rate_limit --> WysylkaLinku: Limit OK

    state WysylkaLinku: Rozpoczęcie wysyłki linku
    WysylkaLinku --> EkranSprawdzSkrzynke: Link wysłany
    WysylkaLinku --> BladWysylki: Nie udało się wysłać

    BladWysylki --> FormularzLogowania: Spróbuj ponownie

    state "Ekran Sprawdź skrzynkę" as EkranSprawdzSkrzynke {
      [*] --> InformacjaODalszychKrokach
      state InformacjaODalszychKrokach: Wskazówka o spamie + email

      state Oczekiwanie: Countdown 30–60s
      InformacjaODalszychKrokach --> Oczekiwanie

      Oczekiwanie --> MozliwyResend: Countdown 0
      state MozliwyResend: Przycisk "Wyślij ponownie" aktywny

      MozliwyResend --> PonownaWysylkaLinku: Klik "Wyślij ponownie"
      PonownaWysylkaLinku --> Oczekiwanie: Wysłano ponownie
      PonownaWysylkaLinku --> BladResend: Błąd wysyłki
      BladResend --> MozliwyResend: Spróbuj ponownie
    }

    EkranSprawdzSkrzynke --> WeryfikacjaLinku: Klik link w emailu

    state if_link_ok <<choice>>
    WeryfikacjaLinku --> if_link_ok
    if_link_ok --> SesjaAktywna: Link poprawny
    if_link_ok --> BladLinku: Link wygasł / użyty

    BladLinku --> FormularzLogowania: Poproś o nowy link
    BladLimit --> FormularzLogowania: Spróbuj później
  }

  state "Użytkownik zalogowany" as Zalogowany {
    [*] --> SesjaAktywna
    SesjaAktywna --> Pulpit: Wejście do aplikacji
    Pulpit --> Profil: Przejdź do profilu

    state Profil: Ustawienia + strefa niebezpieczna

    Profil --> Wylogowanie: Klik "Wyloguj się"
    Wylogowanie --> StronaGlowna: Powrót na start

    Profil --> UsuwanieKonta: Klik "Usuń konto"

    state UsuwanieKonta: Potwierdzenie "USUŃ"
    state if_usun_ok <<choice>>
    UsuwanieKonta --> if_usun_ok
    if_usun_ok --> KontoUsuniete: Potwierdzenie poprawne
    if_usun_ok --> Profil: Anuluj / potwierdzenie błędne

    KontoUsuniete --> StronaGlowna: Konto usunięte
  }

  state "Ochrona dostępu" as Ochrona {
    [*] --> ProbaWejsciaDoFunkcji
    state ProbaWejsciaDoFunkcji: Wejście do pulpitu/list/profilu
    state if_zalogowany <<choice>>
    ProbaWejsciaDoFunkcji --> if_zalogowany
    if_zalogowany --> SesjaAktywna: Zalogowany
    if_zalogowany --> FormularzLogowania: Niezalogowany
  }

  StronaGlowna --> Ochrona: Próba wejścia w funkcje aplikacji

  note right of EkranSprawdzSkrzynke
    UX wymagany w PRD:
    countdown 30–60s,
    przycisk "Wyślij ponownie",
    informacja o spamie.
  end note

  note right of WeryfikacjaLinku
    Link jednorazowy.
    Nowe logowanie unieważnia poprzednie sesje.
    TTL sesji ok. 30 dni.
  end note
```

</mermaid_diagram>
