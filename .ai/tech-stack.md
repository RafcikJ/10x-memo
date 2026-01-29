Frontend - Astro z React dla komponentów interaktywnych:

- Astro 5 pozwala na tworzenie szybkich, wydajnych stron i aplikacji z minimalną ilością JavaScript
- React 19 zapewni interaktywność tam, gdzie jest potrzebna
- TypeScript 5 dla statycznego typowania kodu i lepszego wsparcia IDE
- Tailwind 4 pozwala na wygodne stylowanie aplikacji
- Shadcn/ui zapewnia bibliotekę dostępnych komponentów React, na których oprzemy UI

Backend - Supabase jako kompleksowe rozwiązanie backendowe:

- Zapewnia bazę danych PostgreSQL
- Zapewnia SDK w wielu językach, które posłużą jako Backend-as-a-Service
- Jest rozwiązaniem open source, które można hostować lokalnie lub na własnym serwerze
- Posiada wbudowaną autentykację użytkowników

AI - Komunikacja z modelami przez usługę Openrouter.ai:

- Dostęp do szerokiej gamy modeli (OpenAI, Anthropic, Google i wiele innych), które pozwolą nam znaleźć rozwiązanie zapewniające wysoką efektywność i niskie koszta
- Pozwala na ustawianie limitów finansowych na klucze API

Testowanie - Kompleksowy stack testowy:

- **Vitest** do testów jednostkowych i komponentowych z wbudowanym wsparciem dla coverage (Istanbul/v8)
- **@testing-library/react** i **@testing-library/user-event** do testowania komponentów React z perspektywy użytkownika
- **Playwright** do testów E2E i testów API - najnowocześniejsze narzędzie z wsparciem dla wielu przeglądarek
- **MSW (Mock Service Worker)** do mockowania requestów HTTP w testach (OpenRouter, Supabase)
- **@axe-core/playwright** do automatycznych testów dostępności (a11y) zgodnych z WCAG 2.1 AA
- **Zod schemas** jako kontrakty API do contract testing
- **Supabase CLI** (local) do testów integracyjnych bazy danych i RLS

CI/CD i Hosting:

- Github Actions do tworzenia pipeline'ów CI/CD
- DigitalOcean do hostowania aplikacji za pośrednictwem obrazu docker
