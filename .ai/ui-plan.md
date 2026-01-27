# Architektura UI dla Memo

## 1. Przegląd struktury UI

Interfejs użytkownika aplikacji Memo został zaprojektowany w oparciu o podejście **Mobile-First**, wykorzystując nowoczesny stack technologiczny (Astro, React, Tailwind 4, Shadcn/ui). Architektura opiera się na płaskiej strukturze routingu z centralnym zarządzaniem stanem poprzez **TanStack Query**.

### Główne założenia:
*   **Minimalizm kognitywny**: Użytkownik skupia się na jednym zadaniu naraz (tworzenie, nauka, testowanie).
*   **Responsywność**: Płynne przejście między nawigacją dolną (mobile) a bocznym paskiem (desktop).
*   **Optymistyczne UI**: Natychmiastowa reakcja interfejsu na akcje użytkownika z wycofaniem zmian w przypadku błędu.
*   **Dostępność (A11y)**: Pełna obsługa klawiaturą, odpowiedni kontrast i wsparcie dla czytników ekranu (WCAG 2.1 AA).

---

## 2. Lista widoków

### 2.1. Landing Page / Redirect
*   **Ścieżka**: `/`
*   **Cel**: Punkt wejścia dla niezalogowanych i przekierowanie dla powracających.
*   **Kluczowe informacje**: Value proposition (tylko dla niezalogowanych).
*   **Logika**:
    *   SSR sprawdza ciasteczko sesji.
    *   Jeśli sesja istnieje → Redirect 302 do `/dashboard`.
    *   Jeśli brak sesji → Renderuje widok logowania (Magic Link).
*   **Komponenty**: `AuthForm`, `HeroSection`.

### 2.2. Dashboard (Główny Pulpit)
*   **Ścieżka**: `/dashboard`
*   **Cel**: Centralny hub zarządzania listami i śledzenia postępów.
*   **Kluczowe informacje**:
    *   Listy słówek (kafelki).
    *   Stan "Quota" AI na dziś.
    *   Skrót do tworzenia nowej listy.
*   **Stany**:
    *   **Empty State**: Ilustracja Hero + 3 kroki onboardingu + Główny przycisk CTA "Generuj pierwszą listę AI".
    *   **Populated State**: Grid kafelków (1 kolumna mobile, do 3 desktop).
*   **UX/A11y**:
    *   Sortowanie list (Ostatnio używane, Wynik, Nazwa) zapamiętywane w `localStorage`.
    *   Klawiatura: Nawigacja strzałkami po gridzie lub Tab.
*   **Kluczowe komponenty**: `DashboardGrid`, `ListCard` (z progress bar), `SortDropdown`, `AiQuotaIndicator`.

### 2.3. Kreator List (Dual Mode)
*   **Ścieżka**: `/lists/new`
*   **Cel**: Stworzenie nowej listy słówek za pomocą AI lub ręcznie.
*   **Kluczowe informacje**:
    *   Formularz konfiguracji AI (Kategoria, Liczba słów).
    *   Obszar wklejania tekstu (Tryb manualny).
    *   Podgląd wygenerowanych/wklejonych słów (Draft).
*   **Logika**:
    *   Przełącznik trybu (Segmented Control) czyści dane po zmianie (z ostrzeżeniem).
    *   Walidacja limitu AI przed wysłaniem żądania (blokada przycisku przy 0/5).
    *   Zapis listy (`POST`) następuje dopiero po akceptacji podglądu.
*   **UX/Bezpieczeństwo**:
    *   Wieletapowy loader dla AI ("Łączę...", "Generuję...", "Weryfikuję...").
    *   Sanityzacja wklejanego tekstu po stronie klienta.
*   **Kluczowe komponenty**: `ModeSwitcher`, `AiGeneratorForm`, `ManualPasteForm`, `DraftListPreview`.

### 2.4. Szczegóły Listy / Edycja
*   **Ścieżka**: `/lists/[id]`
*   **Cel**: Przegląd słówek, edycja treści i uruchomienie testu.
*   **Kluczowe informacje**:
    *   Nagłówek z nazwą (edytowalną inline).
    *   Lista numerowana słówek.
    *   Statystyki listy (ostatni wynik, data testu).
*   **Stany**:
    *   **Edytowalny**: Przed pierwszym testem (pełna edycja, usuwanie, dodawanie).
    *   **Zablokowany**: Po wykonaniu testu (edycja zablokowana, tooltip wyjaśniający).
*   **UX/A11y**:
    *   Przyciski akcji (usuń/edytuj) dostępne zawsze na mobile, na hover na desktop.
    *   Blokada edycji zapobiega fałszowaniu historii wyników.
*   **Kluczowe komponenty**: `ListHeader`, `WordListItem`, `StartTestButton` (Sticky bottom on mobile).

### 2.5. Widok Testu (Immersive)
*   **Ścieżka**: `/lists/[id]/test`
*   **Cel**: Weryfikacja wiedzy w izolowanym środowisku.
*   **Kluczowe informacje**:
    *   Pasek postępu (X / Total).
    *   Aktualne słowo (pytanie).
    *   Dwie opcje odpowiedzi (A / B).
*   **UX/A11y**:
    *   Ukrycie nawigacji głównej (Full screen mode).
    *   Duże przyciski dotykowe (min. 44x44px).
    *   Animacja Feedbacku (Zielony/Czerwony flash).
    *   Brak możliwości cofania.
*   **Kluczowe komponenty**: `TestRunnerLayout`, `QuestionCard`, `AnswerButton`, `TestResultSummary` (Modal/Overlay).

### 2.6. Profil Użytkownika
*   **Ścieżka**: `/profile`
*   **Cel**: Zarządzanie ustawieniami i kontem.
*   **Kluczowe informacje**:
    *   Przełącznik motywu (Jasny/Ciemny/System).
    *   Statystyki użycia AI.
    *   Strefa niebezpieczna (Usuwanie konta).
*   **UX/Bezpieczeństwo**:
    *   Usuwanie konta wymaga dwuetapowego potwierdzenia (Modal + wpisanie słowa "USUŃ").
*   **Kluczowe komponenty**: `ThemeSelector`, `DeleteAccountDialog`, `ProfileStats`.

---

## 3. Mapa podróży użytkownika (User Journey)

### Główny przepływ: "Od zera do pierwszego testu"

1.  **Wejście**: Użytkownik wchodzi na stronę główną. Loguje się przez Magic Link.
2.  **Onboarding**: Widzi pusty Dashboard z numerowanymi krokami.
3.  **Akcja**: Klika główny przycisk "Generuj pierwszą listę AI".
4.  **Konfiguracja**:
    *   Przeniesienie do `/lists/new`.
    *   Wybiera kategorię "Jedzenie" i suwak na 10 słów.
    *   Widzi informację o limicie: "Pozostało 5/5".
5.  **Generowanie**:
    *   Klika "Generuj".
    *   Widzi animowane komunikaty statusu (ok. 3-5 sekund).
6.  **Weryfikacja (Draft)**:
    *   Otrzymuje listę 10 słówek.
    *   Usuwa jedno słówko, które wydaje się za trudne.
    *   Klika "Zapisz listę".
7.  **Przejście do szczegółów**:
    *   System zapisuje listę i przekierowuje do `/lists/[id]`.
    *   Pojawia się powiadomienie Toast: "Lista utworzona pomyślnie".
8.  **Nauka**: Użytkownik przegląda słówka na liście.
9.  **Test**:
    *   Klika "Rozpocznij test".
    *   Interfejs przechodzi w tryb pełnoekranowy (`/lists/[id]/test`).
    *   Odpowiada na 9 pytań (wybór A/B).
10. **Wynik**:
    *   Ekran końcowy pokazuje wynik 8/9 (88%).
    *   Animacja konfetti.
    *   Przycisk "Wróć do listy".
11. **Powrót**:
    *   Powrót do `/lists/[id]`.
    *   Lista jest teraz zablokowana do edycji.
    *   Na Dashboardzie kafelek listy pokazuje progress bar wypełniony w 88%.

---

## 4. Układ i struktura nawigacji

Struktura nawigacji dostosowuje się dynamicznie do urządzenia (Responsive Design).

### 4.1. Layout Główny (`MainLayout.astro`)
Kontener dla wszystkich stron autoryzowanych.

*   **Header (Pasek górny)**:
    *   Logo (lewa strona).
    *   Licznik Quota AI (desktop).
    *   User Menu / Avatar (prawa strona).
*   **Main Content**: Obszar roboczy z `max-width` i paddingiem.
*   **Navigation**:
    *   **Mobile (< 640px)**: `BottomNav` - stały pasek na dole ekranu.
        *   Ikony: Dashboard (Dom), Nowa Lista (Plus), Profil (Osoba).
    *   **Tablet/Desktop (≥ 640px)**: `Sidebar` - boczny pasek nawigacyjny.
        *   Logo przeniesione do sidebara.
        *   Rozwinięte etykiety linków.

### 4.2. Layout Testu (`FocusLayout.astro`)
Specjalny layout dla widoku `/lists/[id]/test`.

*   Brak nawigacji głównej (Header/Sidebar/BottomNav ukryte).
*   **Top Bar**: Przycisk "Przerwij test" (X) i prosty Progress Bar.
*   **Center**: Karta pytania.
*   Cel: Maksymalne skupienie, eliminacja przypadkowych kliknięć.

---

## 5. Kluczowe komponenty

Komponenty bazują na bibliotece **Shadcn/ui** i są dostosowane do wymagań projektu.

### Globalne
1.  **`Navigation`**: Responsywny komponent renderujący `BottomNav` lub `Sidebar` w zależności od viewportu.
2.  **`ThemeToggle`**: Przełącznik motywu z obsługą `localStorage` dla uniknięcia FOUC (Flash of Unstyled Content).
3.  **`QuotaIndicator`**: Komponent wyświetlający dostępny limit generacji AI (np. "3/5").

### Dashboard
4.  **`ListCard`**: Interaktywny kafelek listy.
    *   Header: Nazwa + Badge (AI/Manual).
    *   Body: Liczba słów + Ikona flagi.
    *   Footer: Pasek postępu ostatniego wyniku + Czas względny ("2 dni temu").
    *   Actions: Dropdown menu (Testuj, Edytuj, Usuń).
5.  **`EmptyDashboard`**: Komponent onboardingowy z ilustracją i listą kroków.

### Listy & Kreator
6.  **`AiGeneratorForm`**: Formularz z walidacją i obsługą stanów ładowania (multi-step messages).
7.  **`EditableList`**: Lista (`<ol>`) z możliwością edycji inline (`contentEditable` lub Input) i usuwania elementów.
8.  **`ModeSegmentedControl`**: Przełącznik trybu tworzenia (AI vs Manual) z logiką czyszczenia stanu.

### Testowanie
9.  **`TestRunner`**: Logika maszyny stanów testu (pytanie -> odpowiedź -> feedback -> delay -> next).
10. **`FlashFeedback`**: Nakładka pełnoekranowa lub animacja koloru tła sygnalizująca poprawność odpowiedzi.
11. **`ResultSummary`**: Modal/Ekran podsumowania z wykresem kołowym wyniku i animacją konfetti.

### Modale & Dialogi
12. **`ConfirmDeleteDialog`**: Modal potwierdzenia usunięcia listy (Safety Check).
13. **`DeleteAccountFlow`**: Dwuetapowy proces usuwania konta (wymaga wpisania tekstu potwierdzającego).
