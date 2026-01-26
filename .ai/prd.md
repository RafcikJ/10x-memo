<conversation_summary>

<decisions>
1. Cel MVP: aplikacja webowa do zapamiętywania list słów (rzeczowników) z opcją wsparcia AI i prostym testem sekwencyjnym; bez współdzielenia, gamifikacji, statystyk pro i multimediów.
2. Platforma: tylko web (mobile-first) + podstawowe A11y + dark mode; przełącznik dark mode w nagłówku, preferencja trzymana lokalnie (localStorage).
3. Logowanie: MUST HAVE przez email + magic link; ekran „sprawdź skrzynkę” z countdown 30–60s + „Wyślij ponownie” + info o spamie; link jednorazowy; Session TTL ~30 dni; nowe logowanie unieważnia wszystkie stare sesje; rate limiting na email/IP.
4. Model listy (MVP): lista słów z zachowaniem kolejności; elementy to zawsze 1 rzeczownik; przechowujemy „display”..
5. Tworzenie list: jeden ekran tworzenia z dwoma trybami: AI oraz Wklej (manual paste). Listy nie mogą być puste: lista powstaje dopiero przy zapisie, po min. 1 poprawnym słowie (szkic trzymany po stronie klienta).
6. Manual paste: wklejanie wielu linii (1 linia = 1 rzeczownik).
7. AI generowanie list: wybór jednej z 5 kategorii rzeczowników (np. Zwierzęta, Jedzenie, Przedmioty domowe, Transport, Zawody) + liczba pozycji; suwak/ustawienie ograniczone do 10–50, domyślnie 10; generacja uruchamiana po kliknięciu „Generuj”; brak pola dodatkowego kontekstu (MVP).
13. Edycja list: inline edycja elementów + przyciski góra/dół/usuń; dodawanie przez pole + Enter; zmiana elementów/kolejności/tekstu słowa resetuje lastScore/lastTestedAt; zmiana nazwy nie resetuje daty i stanu testu.
14. Blokada po teście: po pierwszym wykonanym teście blokujemy tylko zmiany wpływające na sekwencję (dodaj/usuń/zmień słowo/kolejność); zmiana nazwy i praca na historii dozwolone zawsze.
15. Test: użytkownik wybiera istniejącą listę; test zawsze obejmuje całą listę i iteruje po kolei od pierwszego elementu; format pytania: „Poprzednie: X” + wybór następnego słowa z 2 opcji; brak wpisywania, brak limitu czasu, brak cofania; minimalny próg do testu: min. 5 elementów.
16. Dystraktory: błędna odpowiedź z tej samej listy; przy krótkich listach fallback na losowy z listy (inny niż poprawny).
17. Wyniki testu: zapisujemy procent + liczba poprawnych/błędnych + data ukończenia; przerwany test nie nadpisuje wyniku; stan testu trzymany lokalnie i wysyłany na końcu, a przy błędzie submit UI oferuje „Spróbuj wysłać ponownie” bez kasowania wyniku.
18. Dashboard: sortowanie „ostatnio używane” + search po nazwie; na kafelku listy pokazujemy: nazwa, liczba słów, lastScore, lastTestedAt (dla nietestowanych: „Nie testowano”); kategoria widoczna tylko tam, gdzie jest dostępna (AI flow), manual nie wymaga kategorii.
19. Limity: 50 list na użytkownika, 200 słów/lista, 5 generacje AI/dzień; limit liczony serwerowo w UTC z mapowaniem na Europe/Warsaw; UI pokazuje czas resetu i licznik pozostałych generacji.
20. Usuwanie: twarde usuwanie listy z modalem potwierdzającym; Delete account jako must-have z mocnym potwierdzeniem („USUŃ”/podwójne kliknięcie); natychmiastowe usunięcie danych + anonimizacja logów zgodnie z retencją (~30 dni).
21. Analityka: eventy minimum: open_app, view_dashboard_empty, start_ai_flow, ai_generation_failed/succeeded, generate_ai_list, save_ai_list, create_list, add_item, start_test, complete_test, list_saved, delete_list, delete_account.
22. Metryki sukcesu: liczymy tylko zapisane listy; dla sukcesu „>5 list” liczymy aktualnie istniejące listy per user w danym oknie czasowym; AI usage jako lejek (generate_ai_list) i realne użycie (save_ai_list).
23. Komunikaty UX (minimalistyczne): tylko jeden komunikat systemowy dla problemów z generacją: „Spróbuj ponownie”.
24. Scope (priorytety): MUST = logowanie + dashboard + tworzenie list (AI+manual) + test + metryki + delete account; SHOULD = historia; WON’T = współdzielenie, gamifikacja, statystyki pro, multimedia.
25. PRD ma zawierać sekcję Constraints (szybkość dostarczenia > perfekcja) oraz Risks & Mitigations (ryzyko → metryka alarmowa → działanie) i „must-pass checklist” testów krytycznych.
</decisions>

<matched_recommendations>
1. Skoncentrowanie się na web-only i szybkim MVP: wybrano web (mobile-first) jako jedyną platformę oraz uproszczony UX (minimal komunikaty, proste flow).
2. Minimalny model danych + konsekwencja w UI/API: zdefiniowano listę, elementy (display/normalized), wynik testu (lastScore/lastTestedAt + poprawne/błędne), zasady resetu po edycji.
3. Jeden ekran tworzenia z 2 trybami (AI vs Wklej): ustandaryzowano ścieżki tworzenia, minimalizując liczbę ekranów i złożoność.
4. Prosty test bez wpisywania: wybrano quiz 2-opcyjny, sekwencyjny, bez limitu czasu i bez cofania — redukcja frustracji i prostota implementacji.
5. Guardrails dla AI: czyszczenie wyników, 1 retry braków, modal przy X/Y, limit generacji/dzień, cache + seed — kontrola kosztów i jakości.
6. Minimalistyczna analityka eventowa: ustalono zestaw eventów pokrywający lejek i kryteria sukcesu bez budowy rozbudowanych statystyk.
7. bezpieczeństwo: magic link z jednorazowością, TTL sesji, unieważnianie sesji przy logowaniu, delete account z natychmiastowym usunięciem i anonimizacją logów.
8. UX onboarding: ekran startowy zależny od zalogowania + „3 kroki” w pustym dashboardzie; CTA prowadzące do flow A.
9. Priorytetyzacja scope: rozdzielono MUST/SHOULD/WON’T, co stabilizuje zakres PRD.
10. Jakość release: wymaganie „must-pass checklist” na krytyczne obszary (logowanie, AI, manual, test, reset, delete, dark+A11y).
</matched_recommendations>

<prd_planning_summary>
### a) Główne wymagania funkcjonalne (MVP)
- Autoryzacja: email + magic link; ekran oczekiwania z resend; jednorazowy link; TTL sesji ~30 dni; relogin unieważnia stare sesje.
- Dashboard: lista list (sort „ostatnio używane”), search po nazwie, kafelki z nazwą, liczbą słów, lastScore i lastTestedAt („Nie testowano”).
- Tworzenie list:
  - Tryb AI: wybór kategorii (5 kategorii rzeczowników) + liczba 10–50 (default 10) → „Generuj” → podgląd/edycja → zapis.
  - Tryb manual: wklej wiele linii; walidacja wulgaryzmów; blokada duplikatów; zapis dopiero przy min. 1 poprawnym słowie.
- Edycja listy: inline; góra/dół/usuń; dodawanie Enter; po teście blokada zmian sekwencji (elementy/kolejność/tekst słów); nazwa i historia dalej edytowalne.
- Test: sekwencyjny dla całej listy; wybór z 2 opcji; kontekst „Poprzednie: X” + progres; brak limitu czasu i cofania; min 5 słów.
- Wyniki testu: procent + poprawne/błędne + data ukończenia; tylko ostatni wynik; przerwany test nie nadpisuje.
- AI jakość/koszty: czyszczenie wyników, 1 retry braków, modal przy X/Y, limit 3 generacje/dzień, cache 10–30 min z seed per user/day.
- Usuwanie: delete list (twarde) + delete account (must-have) z silnym potwierdzeniem; anonimizacja logów; retencja ~30 dni.
- Analityka: eventy pokrywające funnel i użycie (generate/save AI list), tworzenie, testy, usuwanie.

### b) Kluczowe historie użytkownika i ścieżki
- Flow A (AI):
  1) Użytkownik loguje się (magic link) → dashboard z „3 krokami”.
  2) Wybiera „Generuj listę” → wybiera kategorię i liczbę (default 10) → klik „Generuj”.
  3) Otrzymuje listę, przegląda i ewentualnie edytuje kolejność/pozycje → zapisuje.
  4) Zapoznaje się z listą (nauka) → przechodzi do testu z widoku listy.
  5) Po teście widzi wynik (procent, poprawne/błędne) i data jest widoczna w dashboardzie.
- Flow B (istniejąca lista → test):
  1) Użytkownik loguje się → dashboard → wybiera listę.
  2) Testuje całą listę → widzi wynik.
- Manual fallback:
  1) Tworzenie listy → tryb „Wklej” → wkleja linie → system odrzuca tylko złe linie → zapis → test.
- Historia:
  - W widoku listy użytkownik klika „Generuj historię” → otrzymuje historię → edytuje/regeneruje; historia nie jest dostępna podczas testu.

### c) Kryteria sukcesu i pomiar
- Sukces 1: 90% użytkowników ma >5 list.
  - Pomiar: liczba aktualnie istniejących list per user w zdefiniowanym oknie czasowym (np. 30 dni); eventy create_list/list_saved/delete_list + stan w DB.
- Sukces 2: 70% użytkowników korzysta z list generowanych przez AI.
  - Pomiar: udział użytkowników z eventem save_ai_list (lub list_saved z source=AI) w kohorcie aktywnych; dodatkowo funnel: start_ai_flow → generate_ai_list → save_ai_list.
- Metryki wspierające:
  - Konwersja logowania (wejście → wysłanie linku → klik linku → dashboard).
  - Ukończenie testu (test_started → test_completed).
  - Jakość AI (ai_generation_failed/succeeded, odsetek modal X/Y).
  - Retencja (np. aktywni w tygodniu 4 na bazie open_app/test_completed/list_saved).

### d) Nierozwiązane kwestie / obszary do doprecyzowania
- Provider email: wybór konkretnego dostawcy (SES/SendGrid/Mailgun) i minimalne ustawienia (SPF/DKIM, nadawca).
- Definicja okna czasowego dla metryk sukcesu (np. 30 dni) i definicja „aktywny użytkownik” do kohort.
- Dokładna reprezentacja kategorii na dashboardzie: manual listy nie mają kategorii — czy UI pokazuje „—”/puste, czy ukrywa kolumnę/ikonę.
- Dokładny sposób liczenia „1000 słów” vs. „max znaków” dla historii (masz oba limity: miękki w UI i twardy w DB) — wymaga jednoznacznej specyfikacji w PRD.
- Wymagania niefunkcjonalne: docelowe SLA (czas generacji AI, czas ładowania dashboardu) i minimalne wymagania kompatybilności przeglądarek.
</prd_planning_summary>

<unresolved_issues>
1. Wybór konkretnego providera do wysyłki magic linków (oraz konfiguracja SPF/DKIM i dane nadawcy).
2. Ustalenie okna czasowego dla metryk sukcesu (np. 30 dni) oraz definicji „aktywny użytkownik” dla kohort.
4. Sposób prezentacji kategorii dla list manualnych na dashboardzie (brak kategorii w modelu manualnym).
5. Minimalne wymagania niefunkcjonalne (SLA dla AI, wydajność, kompatybilność przeglądarek) do wpisania w PRD.
</unresolved_issues>

</conversation_summary>
