# Schemat bazy danych (PostgreSQL / Supabase) — MVP

Poniższy dokument opisuje docelowy schemat PostgreSQL (Supabase) dla aplikacji do list słów z trybem AI i testem sekwencyjnym.

Wartości ustalone:

- Limit generacji AI: **5/dzień** na użytkownika (egzekwowane serwerowo po UTC; UI mapuje reset na Europe/Warsaw).
- Eventy/analityka: tylko po zalogowaniu (**user_id NOT NULL**), tabela niewidoczna dla klienta (write-only przez backend/RPC/service role).

---

## 1. Lista tabel (kolumny, typy, ograniczenia)

### 1.0. Użytkownicy

To jest zażądzane prze Supabase Auth

- 'id': UUID PRIMARY KEY
- 'email': VARCHAR(255) NOT NULL UNIQUE
- 'created_at': TIMESTAMPTZ NOT NULL DEFAULT now()
- 'confirmed_at': TIMESTAMPTZ

### 1.1. Wymagane rozszerzenia

- `pgcrypto` (dla `gen_random_uuid()`)
- `unaccent` (dla normalizacji słów)

> W migracjach: `create extension if not exists pgcrypto;` oraz `create extension if not exists unaccent;`

### 1.2. Typy ENUM

#### `public.list_source`

- `manual`
- `ai`

#### `public.noun_category`

Stała lista kategorii rzeczowników dla AI:

- `animals`
- `food`
- `household_items`
- `transport`
- `jobs`

#### (opcjonalnie) `public.event_name`

Rekomendowane do spójności analityki (można rozszerzać ALTER TYPE):

- `open_app`
- `view_dashboard_empty`
- `start_ai_flow`
- `ai_generation_failed`
- `ai_generation_succeeded`
- `generate_ai_list`
- `save_ai_list`
- `create_list`
- `add_item`
- `start_test`
- `complete_test`
- `list_saved`
- `delete_list`
- `delete_account`

---

### 1.3. `public.profiles`

Preferencje UI użytkownika (1:1 z `auth.users`).

- `user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE`
- `theme_preference text NOT NULL DEFAULT 'system'`
  - `CHECK (theme_preference IN ('system','light','dark'))`
- `locale text NOT NULL DEFAULT 'pl-PL'`
- `timezone text NULL` (np. `Europe/Warsaw`, tylko do prezentacji)
- `created_at timestamptz NOT NULL DEFAULT now()`
- `updated_at timestamptz NOT NULL DEFAULT now()`

Uwagi:

- `updated_at` ustawiane triggerem „touch updated_at” (patrz sekcja 5).

---

### 1.4. `public.lists`

Lista słów (kolejność ma znaczenie), z denormalizacją ostatniego wyniku testu.

- `id uuid PRIMARY KEY DEFAULT gen_random_uuid()`
- `user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE`
- `name text NOT NULL`
  - `CHECK (char_length(btrim(name)) BETWEEN 1 AND 80)`
- `source public.list_source NOT NULL DEFAULT 'manual'`
- `category public.noun_category NULL`
- `story text NULL` (historia mnemoniczna; w MVP bez twardego limitu długości w DB)
- `first_tested_at timestamptz NULL` (ustawiane przy pierwszym ukończonym teście)
- `last_score smallint NULL`
  - `CHECK (last_score IS NULL OR (last_score BETWEEN 0 AND 100))`
- `last_tested_at timestamptz NULL`
- `last_correct integer NULL`
  - `CHECK (last_correct IS NULL OR last_correct >= 0)`
- `last_wrong integer NULL`
  - `CHECK (last_wrong IS NULL OR last_wrong >= 0)`
- `last_accessed_at timestamptz NULL` (sortowanie „ostatnio używane”)
- `created_at timestamptz NOT NULL DEFAULT now()`
- `updated_at timestamptz NOT NULL DEFAULT now()`

Constrainty spójności `source/category`:

- `CHECK (source <> 'ai' OR category IS NOT NULL)`
- `CHECK (source  = 'ai' OR category IS NULL)`

---

### 1.5. `public.list_items`

Elementy listy (pozycja 1..200), edytowalne do momentu pierwszego testu.

- `id uuid PRIMARY KEY DEFAULT gen_random_uuid()`
- `list_id uuid NOT NULL REFERENCES public.lists(id) ON DELETE CASCADE`
- `position integer NOT NULL`
  - `CHECK (position BETWEEN 1 AND 200)`
- `display text NOT NULL`
  - `CHECK (char_length(btrim(display)) BETWEEN 1 AND 80)`
- `normalized text GENERATED ALWAYS AS (`
  - `lower(trim(regexp_replace(unaccent(display), '\s+', ' ', 'g')))`
  - `) STORED`
- `created_at timestamptz NOT NULL DEFAULT now()`

Constrainty:

- `UNIQUE (list_id, position)`
- Duplikaty słów w obrębie listy są dozwolone (brak unikalności po `normalized`).

---

### 1.6. `public.tests`

Audit wyników testów — zapisujemy tylko ukończone testy.

- `id uuid PRIMARY KEY DEFAULT gen_random_uuid()`
- `user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE`
- `list_id uuid NOT NULL REFERENCES public.lists(id) ON DELETE CASCADE`
- `completed_at timestamptz NOT NULL`
- `items_count integer NOT NULL`
  - `CHECK (items_count BETWEEN 1 AND 200)`
- `correct integer NOT NULL CHECK (correct >= 0)`
- `wrong integer NOT NULL CHECK (wrong >= 0)`
- `score smallint NOT NULL CHECK (score BETWEEN 0 AND 100)`
- `created_at timestamptz NOT NULL DEFAULT now()`

Constrainty spójności:

- `CHECK (correct + wrong = items_count)`

Uwagi:

- Minimalny próg testu (min 5 elementów listy) egzekwujemy w RPC `complete_test` (sekcja 5).

---

### 1.7. `public.ai_usage_daily`

Licznik użycia generacji AI per user per UTC-day (egzekwowanie limitu 5/dzień).

- `user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE`
- `day_utc date NOT NULL` (dzień w UTC)
- `used integer NOT NULL DEFAULT 0`
  - `CHECK (used BETWEEN 0 AND 5)`
- `updated_at timestamptz NOT NULL DEFAULT now()`

Klucz:

- `PRIMARY KEY (user_id, day_utc)`

Uwagi:

- Modyfikacje wyłącznie przez RPC (klient nie ma bezpośredniego UPDATE/INSERT).

---

### 1.8. `public.events`

Tabela telemetrii/analityki (write-only), bez dostępu odczytu dla klienta.

Wariant A (rekomendowany, spójny):

- `id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY`
- `user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE`
- `name public.event_name NOT NULL`
- `payload jsonb NULL`
- `created_at timestamptz NOT NULL DEFAULT now()`

Wariant B (prostszy w rozwoju, mniej restrykcyjny):

- `name text NOT NULL` (zamiast `event_name`)

Uwagi:

- Brak eventów anonimowych: `user_id` jest zawsze `NOT NULL`.
- Brak SELECT/UPDATE/DELETE dla roli `authenticated`; insert tylko przez backend/RPC lub `service_role`.

---

## 2. Relacje między tabelami (kardynalność + zasady kasowania)

- `auth.users (1) -> (1) public.profiles`
  - FK: `profiles.user_id -> auth.users.id` (PK=FK), `ON DELETE CASCADE`
- `auth.users (1) -> (N) public.lists`
  - FK: `lists.user_id -> auth.users.id`, `ON DELETE CASCADE`
- `public.lists (1) -> (N) public.list_items`
  - FK: `list_items.list_id -> lists.id`, `ON DELETE CASCADE`
- `auth.users (1) -> (N) public.tests`
  - FK: `tests.user_id -> auth.users.id`, `ON DELETE CASCADE`
- `public.lists (1) -> (N) public.tests`
  - FK: `tests.list_id -> lists.id`, `ON DELETE CASCADE`
- `auth.users (1) -> (N) public.events`
  - FK: `events.user_id -> auth.users.id`, `ON DELETE CASCADE`
- `auth.users (1) -> (N) public.ai_usage_daily`
  - FK: `ai_usage_daily.user_id -> auth.users.id`, `ON DELETE CASCADE`

Usuwanie danych w MVP jest twarde:

- usunięcie listy usuwa `list_items` i `tests` tej listy
- usunięcie konta usuwa wszystko (`profiles/lists/list_items/tests/ai_usage_daily/events`)

---

## 3. Indeksy (wydajność zapytań)

### 3.1. Dashboard („ostatnio używane” + filtr po user)

- `CREATE INDEX lists_user_last_accessed_idx ON public.lists (user_id, last_accessed_at DESC NULLS LAST);`

### 3.2. Szybkie pobieranie listy + elementów

- `CREATE INDEX list_items_list_position_idx ON public.list_items (list_id, position);`
  - (częściowo pokryte przez `UNIQUE(list_id, position)`, ale jawny index bywa czytelniejszy; wystarczy jeden)

### 3.3. Historia testów (audit)

- `CREATE INDEX tests_list_completed_idx ON public.tests (list_id, completed_at DESC);`
- `CREATE INDEX tests_user_completed_idx ON public.tests (user_id, completed_at DESC);`

### 3.4. Sort/filtry pod wynik w dashboardzie (opcjonalnie)

- `CREATE INDEX lists_user_last_tested_idx ON public.lists (user_id, last_tested_at DESC NULLS LAST);`

### 3.5. Limity AI

- PK `(user_id, day_utc)` już jest optymalny dla „dzisiaj” po user.

### 3.6. Search po nazwie listy (MVP)

MVP (prosto):

- `CREATE INDEX lists_user_name_lower_idx ON public.lists (user_id, lower(name));`

Opcjonalnie „future” (fuzzy search):

- `pg_trgm` + GIN na `lower(name)` (nie w MVP, jeśli niepotrzebne).

---

## 4. Zasady PostgreSQL (RLS / uprawnienia)

### 4.1. RLS — zasada ogólna (multi-tenant)

- Dane domenowe są dostępne tylko dla właściciela: `user_id = auth.uid()`.

### 4.2. `public.profiles`

Włącz RLS i dodaj polityki:

- SELECT/INSERT/UPDATE/DELETE: `user_id = auth.uid()`

### 4.3. `public.lists`

Włącz RLS i dodaj polityki:

- SELECT/INSERT/UPDATE/DELETE: `user_id = auth.uid()`

### 4.4. `public.list_items`

Włącz RLS i dodaj polityki przez sprawdzenie ownera listy:

- SELECT/INSERT/UPDATE/DELETE: `EXISTS (SELECT 1 FROM public.lists l WHERE l.id = list_id AND l.user_id = auth.uid())`

### 4.5. `public.tests`

Włącz RLS i dodaj polityki:

- SELECT: `user_id = auth.uid()`
- INSERT: `user_id = auth.uid()` (albo brak direct INSERT i tylko przez RPC; rekomendowane w MVP)
- UPDATE/DELETE: zazwyczaj **DENY** (audit powinien być niemodyfikowalny z klienta)

### 4.6. `public.ai_usage_daily`

Włącz RLS:

- SELECT: `user_id = auth.uid()` (jeśli UI ma czytać licznik)
- INSERT/UPDATE/DELETE: **DENY** (modyfikacje wyłącznie przez security definer RPC)

### 4.7. `public.events`

Włącz RLS i nie dodawaj polityk dla roli `authenticated` (domyślnie DENY):

- SELECT/INSERT/UPDATE/DELETE dla `authenticated`: **DENY**
- Wstawianie tylko:
  - przez `service_role` (bypasses RLS), lub
  - przez security definer RPC (np. `log_event(...)`) uruchamiany przez backend/edge function

---

## 5. Dodatkowe uwagi (funkcje, triggery, decyzje projektowe)

### 5.1. Triggery pomocnicze

#### A) `set_updated_at` (profiles, ai_usage_daily)

BEFORE UPDATE:

- `NEW.updated_at = now()`

#### B) `set_lists_updated_at` (lists)

BEFORE UPDATE:

- `NEW.updated_at = now()` **tylko** gdy zmienia się „merytoryczna” treść (np. `name/story/source/category/last_*`), ale **nie** przy samym `last_accessed_at`.
  Cel: `touch_list()` nie powinien „brudzić” `updated_at`.

### 5.2. Blokada edycji sekwencji po pierwszym teście

Trigger na `public.list_items` (BEFORE INSERT OR UPDATE OR DELETE):

- jeśli `SELECT first_tested_at FROM public.lists WHERE id = NEW.list_id/OLD.list_id` jest NOT NULL → `RAISE EXCEPTION`.
  Efekt: po pierwszym ukończonym teście nie można zmieniać elementów/kolejności/tekstu słów.

### 5.3. Reset wyniku przy zmianach sekwencji (dla spójności)

Trigger na `public.list_items` (AFTER INSERT OR UPDATE OR DELETE):

- `UPDATE public.lists SET last_score=NULL, last_tested_at=NULL, last_correct=NULL, last_wrong=NULL WHERE id = list_id;`
  Uwaga: w praktyce po pierwszym teście i tak jest blokada zmian `list_items` (5.2), więc trigger to „safety net”.

### 5.4. RPC: `touch_list(p_list_id uuid)`

SECURITY DEFINER, w transakcji:

- Guard: lista należy do `auth.uid()` (owner-only).
- `UPDATE public.lists SET last_accessed_at = now() WHERE id = p_list_id;`
- Opcjonalnie zwraca zaktualizowany rekord.

### 5.5. RPC: `complete_test(p_list_id uuid, p_correct int, p_wrong int, p_completed_at timestamptz default now())`

SECURITY DEFINER, w transakcji:

- Guard: lista należy do `auth.uid()`.
- Guard: lista ma min. 5 elementów (`SELECT count(*) FROM list_items WHERE list_id = p_list_id`).
- Oblicza:
  - `items_count = p_correct + p_wrong`
  - `score = floor(100.0 * p_correct / nullif(items_count,0))` (lub inna ustalona metoda; ważne, by była stała)
- INSERT do `public.tests` (tylko ukończone; `completed_at` NOT NULL).
- UPDATE `public.lists` atomowo:
  - jeśli `first_tested_at IS NULL` → ustaw `first_tested_at = p_completed_at`
  - ustaw `last_*` (`last_score`, `last_tested_at`, `last_correct`, `last_wrong`)

Ważne:

- Przerwany test nie zapisuje się do DB (brak wywołania tej funkcji).
- Jeśli submit się nie uda, UI może ponowić próbę (idempotencja opcjonalnie: `request_id` po stronie klienta/backendu).

### 5.6. RPC: limit AI (5/dzień, UTC)

Rekomendowana funkcja: `consume_ai_generation()`

- SECURITY DEFINER
- `day_utc = (now() at time zone 'utc')::date`
- `SELECT ... FOR UPDATE` na `ai_usage_daily` dla `(auth.uid(), day_utc)` (albo UPSERT z blokadą).
- Jeśli `used >= 5` → błąd kontrolowany (np. SQLSTATE `P0001` i komunikat dla UI).
- Inkrementuje `used` o 1 i zwraca:
  - `used`, `remaining = 5 - used`
  - `reset_at = (day_utc + 1)::timestamptz at time zone 'UTC'` (do UI)

### 5.7. Egzekwowanie limitu 50 list / user i 200 itemów / list

- **200 itemów / list**: twardo przez `CHECK(position BETWEEN 1 AND 200)` + logika w aplikacji.
  Dodatkowo (opcjonalnie) RPC do zapisu listy może sprawdzić `count(*) <= 200`.
- **50 list / user**: egzekwować w dedykowanym RPC tworzącym listę (security definer) przez `SELECT count(*) ... FOR UPDATE` i kontrolowany błąd.

### 5.8. Normalizacja słów (`list_items.normalized`)

- Generated column zapewnia spójność i możliwość przyszłego wyszukiwania.
  Zasada: `lower(trim(regexp_replace(unaccent(display), '\s+', ' ', 'g'))))`.
