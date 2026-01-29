<test_plan>

# Plan Testów Projektu "Memo"

## 1. Wprowadzenie i Cel Testów
Projekt **Memo** to nowoczesna aplikacja webowa do nauki języków, wykorzystująca sztuczną inteligencję do generowania list słówek oraz interaktywne testy do weryfikacji wiedzy. 

**Cel testów:** 
Zapewnienie wysokiej jakości i niezawodności aplikacji poprzez weryfikację poprawności działania mechanizmów generowania AI, bezpieczeństwa danych użytkownika (Supabase Auth/RLS), logiki testów oraz responsywności interfejsu użytkownika.

---

## 2. Zakres Testów
### W zakresie (In-scope):
*   **Autoryzacja:** System Magic Link, sesje użytkownika, Middleware.
*   **Zarządzanie Listami:** Tworzenie (AI/Manual), edycja, usuwanie, walidacja pozycji.
*   **AI Generator:** Integracja z OpenRouter, system limitów (Quota), obsługa błędów API zewnętrznego.
*   **Test Runner:** Logika losowania odpowiedzi, punktacja, blokowanie edycji list po teście.
*   **Profil i Ustawienia:** Zmiana motywu (Dark/Light), statystyki, trwałe usuwanie konta (GDPR/RODO).
*   **Responsywność:** Działanie nawigacji mobilnej (BottomNav) vs desktopowej (Sidebar).

### Poza zakresem (Out-of-scope):
*   Infrastruktura Supabase (zakładamy niezawodność dostawcy).
*   Dostępność serwerów OpenRouter (testujemy jedynie reakcję aplikacji na ich brak).
*   Moduł analityki (Post-MVP).

---

## 3. Strategia Testowania
Zastosujemy podejście piramidy testów, aby zoptymalizować koszty i czas:

*   **Testy Jednostkowe (Unit Tests):** Weryfikacja czystych funkcji logicznych, walidacji Zod oraz narzędzi pomocniczych.
*   **Testy Integracyjne:** Weryfikacja komunikacji między API Astro a bazą danych Supabase (Local/Mocked).
*   **Testy E2E (End-to-End):** Scenariusze przejścia użytkownika od logowania, przez wygenerowanie listy, aż po zakończenie testu.
*   **Testy Regresji:** Uruchamiane przy każdym Pull Request, aby zapobiec psuciu istniejących funkcji.

---

## 4. Środowisko Testowe
*   **Framework testowy:** Vitest (kompatybilny z Vite/Astro) do testów jednostkowych i integracyjnych.
*   **Testy E2E:** Playwright (najlepsze wsparcie dla aplikacji SSR i interakcji React).
*   **Baza danych:** Supabase CLI (lokalna instancja Dockerowa) do izolowanych testów bazodanowych.
*   **CI/CD:** GitHub Actions do automatycznego uruchamiania testów.
*   **Narzędzia wspomagające:** MSW (Mock Service Worker) do symulacji odpowiedzi OpenRouter API.

---

## 5. Przypadki Testowe

### 5.1. Moduł Autoryzacji (`src/pages/api/auth/*`)
| ID | Opis Funkcjonalności | Typ testu | Priorytet |
|:---|:---|:---|:---|
| A1 | Próba wysłania Magic Link na nieprawidłowy format email. | Jednostkowy (Zod) | Wysoki |
| A2 | Weryfikacja działania Rate Limitera (blokada po 5 próbach/15 min). | Integracyjny | Wysoki |
| A3 | Dostęp do `/dashboard` bez aktywnej sesji (Middleware redirect). | Integracyjny | Krytyczny |
| A4 | Pełny proces wylogowania i czyszczenia ciasteczek Supabase. | E2E | Średni |

### 5.2. AI Generator i Limity (`src/lib/services/ai-*`)
| ID | Opis Funkcjonalności | Typ testu | Priorytet |
|:---|:---|:---|:---|
| AI1 | Blokada generowania listy przy Quota = 0. | Integracyjny | Krytyczny |
| AI2 | Obsługa błędu OpenRouter (Timeout/API Error) – komunikat UI. | E2E/Mock | Wysoki |
| AI3 | Walidacja odpowiedzi AI (czy zawiera wymaganą liczbę słów). | Jednostkowy | Średni |
| AI4 | Reset limitu dziennego o północy UTC. | Jednostkowy | Wysoki |

### 5.3. Zarządzanie Listami i Walidacja (`src/pages/api/lists/*`)
| ID | Opis Funkcjonalności | Typ testu | Priorytet |
|:---|:---|:---|:---|
| L1 | Tworzenie listy manualnej z mniej niż 5 elementami (walidacja). | E2E | Wysoki |
| L2 | Próba edycji słówka w liście, która posiada już `first_tested_at`. | Integracyjny | Krytyczny |
| L3 | Reindeksacja pozycji słówek po usunięciu elementu ze środka listy. | Jednostkowy | Średni |
| L4 | Unikalność nazw list w obrębie jednego użytkownika. | Integracyjny | Średni |

### 5.4. Test Runner i UX (`src/components/TestRunner.tsx`)
| ID | Opis Funkcjonalności | Typ testu | Priorytet |
|:---|:---|:---|:---|
| T1 | Losowanie błędnej odpowiedzi (czy pochodzi z tej samej listy). | Jednostkowy | Wysoki |
| T2 | Poprawność naliczania wyniku procentowego na koniec testu. | Jednostkowy | Wysoki |
| T3 | Wyświetlanie FlashFeedback (kolor zielony/czerwony) po odpowiedzi. | E2E (Visual) | Średni |
| T4 | Zapisanie wyniku testu do bazy przez RPC `complete_test`. | Integracyjny | Krytyczny |

### 5.5. Usuwanie Konta (`src/components/DeleteAccountDialog.tsx`)
| ID | Opis Funkcjonalności | Typ testu | Priorytet |
|:---|:---|:---|:---|
| D1 | Wymóg wpisania "USUŃ" (case-sensitive) przed aktywacją przycisku. | E2E | Wysoki |
| D2 | Kaskadowe usunięcie danych (listy, testy) po usunięciu profilu. | Integracyjny | Krytyczny |

---

## 6. Harmonogram i Zasoby
*   **Faza 1 (Przygotowanie):** Konfiguracja Vitest i Playwright (2 dni).
*   **Faza 2 (Testy Krytyczne):** Implementacja testów Auth, AI Quota i RLS (4 dni).
*   **Faza 3 (UI/UX):** Testy E2E kluczowych ścieżek i responsywności (3 dni).
*   **Zasoby:** 1 Inżynier QA, dostęp do konta OpenRouter (klucze testowe), lokalne środowisko Docker.

---

## 7. Kryteria Akceptacji
*   100% testów krytycznych (Prio: Krytyczny) zakończonych sukcesem.
*   Brak błędów uniemożliwiających logowanie lub naukę (testowanie).
*   Poprawne działanie aplikacji na urządzeniach mobilnych (Viewport iPhone 14 / Pixel 7).
*   Pokrycie kluczowej logiki biznesowej (`src/lib/services`) na poziomie min. 80%.

---

## 8. Ryzyka i Założenia
*   **Ryzyko:** Zmiany w formacie odpowiedzi OpenRouter mogą zepsuć parser. 
    *   *Mitygacja:* Rozbudowane testy jednostkowe parsera tekstowego.
*   **Ryzyko:** Flaky tests w Playwright ze względu na animacje (FlashFeedback). 
    *   *Mitygacja:* Użycie `waitFor` zamiast statycznych timeoutów.
*   **Założenie:** Środowisko testowe ma dostęp do internetu w celu komunikacji z Supabase Auth podczas testów integracyjnych (lub używamy Supabase CLI lokalnie).

</test_plan>