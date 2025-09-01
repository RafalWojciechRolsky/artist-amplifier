# 13. Development Workflow

Minimalny, szybki cykl pracy z naciskiem na prostotę (npm, App Router, brak persistence).

## 13.1 Wymagania lokalne

- Node.js 22.18.0 (LTS) i npm (używamy npm, nie pnpm).
- Git. Opcjonalnie: VS Code (lub inny IDE) + wtyczki: Tailwind CSS IntelliSense, ESLint.

## 13.2 Instalacja i uruchomienie

```bash
npm install
npm run dev
```

- Dev server: http://localhost:3000
- Build: `npm run build`, produkcyjne uruchomienie: `npm start`.

## 13.3 Zmienne środowiskowe

Utwórz plik `.env.local` (nie commitujemy). Przykład (`.env.example`):

```env
MUSIC_AI_API_KEY=sk-...
MUSIC_AI_WORKFLOW_ANALYZE=your-workflow-slug-or-id
LLM_API_KEY=sk-...
LLM_MODEL=gpt-4o-mini
```

Uwagi:

- Nie używaj prefiksu `NEXT_PUBLIC_` dla kluczy — mają pozostać po stronie serwera.
- Route Handlers (`src/app/api/...`) odczytują `process.env.*` bez ich ekspozycji do klienta.

## 13.4 NPM scripts (propozycja)

- `dev` — start środowiska deweloperskiego.
- `build` — produkcyjny build.
- `start` — run produkcyjny.
- `test` — testy jednostkowe (Jest) – reduktor + walidatory.
- `test:e2e` — testy E2E (Playwright) – ścieżka szczęśliwa.
- `lint` — (opcjonalnie) ESLint dla projektu.

## 13.5 Testowanie

- Jednostkowe (Jest):
  - Reducer maszyny stanów z `src/app/page.tsx` (wydzielić do modułu).
  - Walidacje plików w `src/lib/validators.ts`.
- E2E (Playwright):
  - `npx playwright install` (pierwszy raz).
  - Scenariusz: załaduj plik testowy → czekaj na wynik analizy → generuj opis → sprawdź wynik.

## 13.6 Gałęzie i PR

- Krótko żyjące feature branche od `develop` (np. `feat/press-generate-be`).
- PR z checklistą: build przechodzi, testy green, uzupełniona dokumentacja gdy dotyczy.

## 13.7 Higiena kodu

- Trzymaj typy w `src/lib/types.ts`. Jednolity `ApiError`.
- Nie wprowadzaj dodatkowych bibliotek stanowych bez potrzeby (YAGNI).

---
