## Noun Lists Trainer (MVP)

[![Node.js](https://img.shields.io/badge/node-22.14.0-339933?logo=node.js&logoColor=white)](./.nvmrc)
![Astro](https://img.shields.io/badge/Astro-5-FF5D01?logo=astro&logoColor=white)
![React](https://img.shields.io/badge/React-19-149ECA?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)
![Tailwind](https://img.shields.io/badge/Tailwind-4-06B6D4?logo=tailwindcss&logoColor=white)

## Table of contents

- [1. Project name](#1-project-name)
- [2. Project description](#2-project-description)
- [3. Tech stack](#3-tech-stack)
- [4. Getting started locally](#4-getting-started-locally)
- [5. Available scripts](#5-available-scripts)
- [6. Project scope](#6-project-scope)
- [7. Project status](#7-project-status)
- [8. License](#8-license)

## 1. Project name

**Noun Lists Trainer (MVP)** — a web app for memorizing ordered noun lists with optional AI assistance and a simple sequential test.

## 2. Project description

This project is an MVP web application focused on **learning and testing ordered lists of nouns**.

- **Web-only**: mobile-first, basic accessibility (A11y), and **dark mode** (toggle in the header; preference stored locally in `localStorage`).
- **Authentication (must-have)**: email + magic link; “check your inbox” screen with 30–60s countdown, resend, and spam-folder hint. Session TTL ~30 days; new login invalidates old sessions; rate limiting (email/IP).
- **Lists (MVP model)**: lists preserve order; each item is a single noun; store a user-facing display value.
- **Create lists**: a single creation screen with two modes:
  - **AI mode**: choose 1 of 5 noun categories + number of items (10–50, default 10) → click “Generate” → preview/edit → save.
  - **Manual paste**: paste multiple lines (1 line = 1 noun). List is created only on save and must contain at least 1 valid word.
- **Edit lists**: inline edit items; move up/down; delete; add via input + Enter. Editing items/order/word text resets `lastScore`/`lastTestedAt`; changing only the name does not.
- **Locking after test**: after the first completed test, block changes that affect sequence (add/remove/edit word/reorder). Renaming and mnemonic story editing remain allowed.
- **Test**: sequential quiz over the entire list from the first item. Prompt format: “Previous: X” + pick the next word from 2 options. No typing, no time limit, no back. Minimum list size to test: 5.
- **Distractors**: wrong option comes from the same list; for short lists fallback to a random different word from the list.
- **Results**: store percent + correct/incorrect counts + completion date. Interrupted test must not overwrite the last result. Submit at the end; on submit error UI offers retry without losing the result.
- **Dashboard**: sort “recently used” + search by name; show name, word count, `lastScore`, `lastTestedAt` (or “Not tested”); category only where applicable (AI lists).
- **Limits**: 50 lists/user, 200 words/list, 5 AI generations/day; server-side counting in UTC mapped to `Europe/Warsaw` with UI showing reset time + remaining count.
- **Deletion**: hard-delete list with confirmation modal; delete account with strong confirmation (“DELETE” / double click) + immediate deletion and log anonymization with ~30-day retention.
- **Analytics (minimum events)**: `open_app`, `view_dashboard_empty`, `start_ai_flow`, `ai_generation_failed/succeeded`, `generate_ai_list`, `save_ai_list`, `create_list`, `add_item`, `start_test`, `complete_test`, `list_saved`, `delete_list`, `delete_account`.

Additional project docs:

- **PRD**: `./.ai/prd.md`
- **Tech notes**: `./.ai/tech-stack.md`

## 3. Tech stack

- **Frontend**
  - **Astro 5** (with **React 19** islands for interactivity)
  - **TypeScript 5**
  - **Tailwind CSS 4**
  - **shadcn/ui** (Radix primitives + Tailwind)
- **Backend**
  - **Supabase** (PostgreSQL + Auth; intended for magic links, DB, and server-side limits)
- **AI**
  - **OpenRouter** (provider for LLMs used to generate noun lists and mnemonic stories)
- **Tooling**
  - ESLint + Prettier
  - Husky + lint-staged
- **CI/CD & Hosting (planned)**
  - GitHub Actions
  - DigitalOcean (Docker-based deployment)

## 4. Getting started locally

### Prerequisites

- **Node.js `22.14.0`** (see `./.nvmrc`)
- **npm** (bundled with Node.js)

### Install & run

```bash
npm install
npm run dev
```

### Build & preview

```bash
npm run build
npm run preview
```

> Note: Supabase/OpenRouter setup (env vars, keys, and provider configuration) is not documented in this repo yet; see [Project status](#7-project-status) and `./.ai/prd.md` unresolved items.

### Testing mode (bypass authentication)

For **development and testing only**, you can bypass authentication to test business functionality without logging in.

⚠️ **WARNING**: This should **NEVER** be enabled in production!

**Quick Start**: See [`TESTING_QUICKSTART.md`](./TESTING_QUICKSTART.md) for a 2-minute setup guide.

**Full Documentation**: See [`TESTING_MODE.md`](./TESTING_MODE.md) for detailed instructions and troubleshooting.

## 5. Available scripts

From `package.json`:

- **`npm run dev`**: start Astro dev server
- **`npm run build`**: build for production
- **`npm run preview`**: preview the production build locally
- **`npm run astro`**: run the Astro CLI
- **`npm run lint`**: run ESLint
- **`npm run lint:fix`**: run ESLint with auto-fix
- **`npm run format`**: run Prettier on the repo

## 6. Project scope

### MUST HAVE (MVP)

- **Auth**: email magic link + resend UI + session rules + rate limiting
- **Dashboard**: list overview, search, “recently used” sort, last test info
- **Create lists**: AI generation + manual paste
- **Edit lists**: inline edit + reorder; reset rules for test state
- **Test**: sequential 2-choice quiz; min 5 items
- **Metrics**: event tracking listed in PRD
- **Delete account**: strong confirmation + immediate removal + log anonymization policy

### SHOULD HAVE

- **Mnemonic story**: AI-generated on demand; must include all words in exact order as literal tokens; fully editable/regenerable; soft UI counter + DB hard limit.

### WON’T (for MVP)

- Sharing, gamification, pro-level statistics, multimedia.

## 7. Project status

**Status: in progress (MVP planning + starter codebase).**

Based on `./.ai/prd.md`, the current focus is delivering the MVP features listed in the MUST HAVE scope. Unresolved items called out in the PRD include:

- **Email provider choice** for magic links and deliverability setup (SPF/DKIM/sender)
- **Success metric window** and “active user” definition
- **Mnemonic story limits**: “soft 1000 words” vs DB hard character limit (exact values)
- **How to present categories** for manual lists on the dashboard
- **Non-functional requirements** (SLA/performance/browser support)

## 8. License

**MIT** (a dedicated `LICENSE` file is not present in the repository yet).
