# Zmiany UI: kafelek listy na dashboardzie (usunięcie etykiety AI/Manual + brak nachodzenia menu)

## Cel

- Usunąć etykietę źródła listy (**AI/Manual**) z kafelka listy (zbędna w MVP).
- Naprawić problem nachodzenia na siebie elementów w prawym górnym rogu kafelka (kebab menu vs. elementy nagłówka).

## Kontekst / gdzie to jest

- Kafelek listy jest renderowany w: `src/components/ListCard.astro`
- Siatka kafelków na dashboardzie używa: `src/components/DashboardGrid.astro` (importuje `ListCard.astro`)

## Przyczyna problemu

W `ListCard.astro`:

- menu (kebab) jest pozycjonowane absolutnie: `absolute right-4 top-4`
- nagłówek kafelka ma po prawej stronie badge źródła (`AI` / `Manual`) w układzie `flex justify-between`

Na mniejszych szerokościach oba elementy lądują w tej samej strefie w prawym górnym rogu i nachodzą na siebie.

## Zakres zmian (MVP)

### 1) Usunięcie badge AI/Manual

W `src/components/ListCard.astro` usuń blok:

- `<span ...>{list.source === "ai" ? "AI" : "Manual"}</span>`

To eliminuje element, który jest zbędny w MVP i jednocześnie zmniejsza ryzyko kolizji w nagłówku.

### 2) Rezerwa miejsca na kebab menu + poprawne zachowanie długiego tytułu

Ponieważ kebab jest absolutnie pozycjonowany nad treścią, treść pod spodem powinna mieć „pustą przestrzeń” po prawej stronie:

- dodaj `pr-12` (lub równoważne) do kontenera klikalnego `<a ... class="... p-6">`
- ustaw tytuł tak, żeby nie wypychał się pod menu:
  - dodaj `min-w-0 flex-1 truncate` do `<h3>`

Przykład klas (docelowo):

- `a`: `class="flex flex-col p-6 pr-12"`
- `h3`: `class="min-w-0 flex-1 truncate text-lg font-semibold leading-tight"`

> Uwaga: `pr-12` jest dobrane tak, żeby pokryć typowy rozmiar przycisku (8x8) + marginesy (`right-4`). Jeśli w przyszłości zmieni się rozmiar przycisku lub offset, dostosuj padding.

## Kroki implementacji (checklista)

- [ ] Otwórz `src/components/ListCard.astro`
- [ ] Usuń badge `AI/Manual` z nagłówka
- [ ] Dodaj `pr-12` do `<a ...>` aby nie nachodziło na kebab
- [ ] Dodaj `min-w-0 flex-1 truncate` do `<h3>` aby długie nazwy list się nie nakładały
- [ ] Sprawdź wizualnie na wąskiej szerokości (mobile) i na desktopie (hover na kafelku)

## Kryteria akceptacji

- **Brak etykiety** „AI” / „Manual” na kafelku listy.
- **Menu (kebab) nie nachodzi** na tytuł ani inne elementy kafelka.
- Długa nazwa listy **ucina się** (truncate) zamiast wchodzić pod menu.
- Kafelek pozostaje w całości klikalny (link do `/lists/[id]` działa jak wcześniej).

## Notatki / przyszłe ulepszenia (po MVP)

- Jeśli potrzebna będzie informacja o źródle listy, można:
  - pokazać ją w widoku szczegółów listy, albo
  - dodać tooltip/ikonę w menu zamiast badge w nagłówku.
- Gdy dropdown menu zostanie faktycznie zaimplementowane, warto upewnić się, że kliknięcie w przycisk menu nie nawiguję przez `<a>` (np. przez `stopPropagation` w komponentach React lub przez zmianę struktury DOM).
