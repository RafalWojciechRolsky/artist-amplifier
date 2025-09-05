# Epic 2: Prawdziwe integracje Music.ai + OpenAI oraz branding UI wg front-end-spec — Brownfield

Status: Proposed
Owner: PO/SM
Date: 2025-08-29
PRD: [Artist Amplifier (MVP)](./epic-1/index.md)

## Cel epiku
Nadać MVP wartość produkcyjną: realne wywołania Music.ai (analiza audio) i OpenAI (generowanie tekstu) po stronie BFF oraz zastosować branding/UI zgodnie z `docs/front-end-spec.md`, zachowując prostotę (KISS) i zgodność z istniejącymi przepływami 1.1–1.4.

## Kontekst istniejącego systemu
- Frontend: Next.js App Router, komponenty w `src/components/`, lokalny stan z `useReducer` + sessionStorage. Zgodność z `docs/architecture/10-frontend-architecture.md` i `docs/front-end-spec.md`.
- BFF: Next.js Route Handlers, kluczowy endpoint `POST /api/audio/generate` w `src/app/api/audio/generate/route.ts` (obecnie stub). Klient FE: `src/lib/api/generate.ts`.
- Brak trwałego storage; brak auth (MVP). 

## Opis usprawnienia
- Co dodajemy/zmieniamy: 
  - Realne integracje: Music.ai SDK do analizy audio; OpenAI (non-stream) do generowania tekstu.
  - # Epic 2: Prawdziwe integracje Music.ai + OpenAI oraz branding UI wg front-end-spec — Brownfield

Status: Proposed
Owner: PO/SM
Date: 2025-08-29
PRD: [Artist Amplifier (MVP)](./epic-1/index.md)

## Cel epiku
Nadać MVP wartość produkcyjną: realne wywołania Music.ai (analiza audio) i OpenAI (generowanie tekstu) po stronie BFF oraz zastosować branding/UI zgodnie z `docs/front-end-spec.md`, zachowując prostotę (KISS) i zgodność z istniejącymi przepływami 1.1–1.4.

## Kontekst istniejącego systemu
- Frontend: Next.js App Router, komponenty w `src/components/`, lokalny stan z `useReducer` + sessionStorage. Zgodność z `docs/architecture/10-frontend-architecture.md` i `docs/front-end-spec.md`.
- BFF: Next.js Route Handlers, kluczowy endpoint `POST /api/audio/generate` w `src/app/api/audio/generate/route.ts` (obecnie stub). Klient FE: `src/lib/api/generate.ts`.
- Brak trwałego storage; brak auth (MVP). 

## Opis usprawnienia
- Co dodajemy/zmieniamy: 
  - Realne integracje: Music.ai SDK do analizy audio; OpenAI (non-stream) do generowania tekstu.
  - Branding i UI zgodnie z `docs/front-end-spec.md` (kolory, komponenty, a11y, test hooks).
- Jak integrujemy: 
  - Integracje TYLKO w BFF; sekrety w ENV; retry/backoff przy 429/5xx; mapowanie błędów do standardu `ApiError`.
  - Nie zmieniamy formatu żądania FE (multipart) ani minimalnego kształtu odpowiedzi JSON.
- Kryteria sukcesu: 
  - Prawdziwe wywołania zewnętrznych usług działają w środowisku z ustawionymi sekretnymi kluczami.
  - UI spełnia specyfikację i nie degraduje przepływów 1.1–1.4.

## Stories (kolejność realizacji)

1. Story 2.3: Branding i UI wg `docs/front-end-spec.md`
   - Zakres:
     - Wprowadzić tokeny kolorów/typografii (Primary Accent `#6A3DE8`, hover `#5429D0`, itp.).
     - Ujednolicić komponenty: `Button` (Primary/Secondary/Ghost, loading), `Input`, `Textarea` (licznik i błędy), `FileInput` (format/rozmiar i „Zmień plik”), prosty `Stepper/Progress`, `Toast`, `StatusBanner` (`role="status"/aria-live`).
     - A11y: focus-visible, kontrast ≥ 4.5:1, test hooks (`data-testid`).
   - AC:
     - UI zgodny z sekcjami „Branding”, „Komponenty”, „A11y” w `docs/front-end-spec.md`.
     - Smoke 1→4 przechodzi na mobile i desktop; brak regresji Stories 1.1–1.4.

2. Story 2.1: Integracja Music.ai w BFF (real)
   - Zakres:
     - Użyć `@music.ai/sdk`: zapisać plik do `/tmp`, `uploadFile(filePath)` → `addJob({ name, workflow, params: { inputUrl } })` → `waitForJobCompletion(jobId)`.
     - Zamapować `job.result` do `AudioAnalysis`; retry/backoff na 429/5xx; mapowanie błędów do `ApiError`.
     - ENV: `MUSIC_AI_API_KEY`, `MUSIC_AI_WORKFLOW_ANALYZE`; uzupełnić `.env.example` i README.
   - AC:
     - Realne wywołanie Music.ai; błędy → `ApiError` 502/429 z `requestId`.
     - Brak zmian w formacie żądania z FE; FE (`src/lib/api/generate.ts`) działa bez modyfikacji.

3. Story 2.2: Integracja LLM (OpenAI, non‑stream) w BFF
   - Zakres:
     - Wywołanie OpenAI JSON (non‑stream) z promptem bazującym na `artistName`, `artistDescription` oraz `AudioAnalysis`.
     - Zwraca `text`, `modelName`, `tokensUsed` zgodnie z `docs/architecture/5-api-specification.md`.
     - ENV: `LLM_API_KEY`, `LLM_MODEL`; obsługa 429/5xx → `ApiError`.
   - AC:
     - Realny opis generowany przez LLM zwracany w `text`; poprawne `modelName` i `tokensUsed`.
     - Brak zmian w kontrakcie wejścia/wyjścia endpointu.

4. Story 2.4: Implementacja podstawowego workflow CI
   - Zakres:
     - Dodać prosty workflow CI: lint + test + build; opcjonalny smoke (uruchomienie minimalnego testu e2e/snapshot).
     - *Uwaga: Walidacja zmiennych środowiskowych oraz dokumentacja (.env.example, README) zostały już zaimplementowane w ramach poprzednich historyjek.*
   - AC:
     - Podstawowy workflow CI jest zaimplementowany i uruchamia się poprawnie na pull requestach.
     - CI przechodzi pomyślnie (lint, test, build).

## Wymagania kompatybilności
- Brak zmian w kontrakcie FE↔BFF dla `POST /api/audio/generate`:
  - Wejście: multipart/form-data z `file`, `artistName`, `artistDescription`, `language?`.
  - Wyjście: JSON z `language`, `text`, `outline`, `modelName`, `tokensUsed` (+ standard `ApiError`).
- UI zgodny z `docs/front-end-spec.md` i `docs/architecture/6-components.md`.

## Ryzyko i mitigacja
- Limity/awarie dostawców → retry/backoff, `ApiError` ze standardowym kształtem i minimalnym komunikatem.
- Sekrety/ENV → walidacja ENV (zaimplementowana); brak ekspozycji w kliencie; użycie Secret Manager na prod.
- Rollback: revert + poprzedni build (Vercel).

## Definition of Done (epik)
- 2.1 i 2.2: realne integracje w BFF, testy jednostkowe/mocks, `.env.example` i README uzupełnione.
- 2.3: UI z brand palette i a11y; smoke test 1→4 przechodzi (mobile/desktop).
- 2.4: Implementacja podstawowego workflow CI.
- Brak regresji funkcjonalności 1.1–1.4.

## Walidacja zakresu (KISS)
- 1–4 małe stories; brak zmian architektonicznych; integracja o niskiej złożoności.
- Ryzyko niskie; rollback łatwy.
- Kryteria sukcesu mierzalne (realne integracje + wdrożony UI, smoke OK).

## Handoff do Story Managera
Prośba o przygotowanie szczegółowych user stories zgodnie z kolejnością (najpierw 2.3 UI/Branding), z uwzględnieniem:
- Integracje w BFF z zachowaniem kontraktu `/api/audio/generate`.
- Wymogi a11y, test hooks i kolory z `docs/front-end-spec.md`.
- Krytyczne wymagania kompatybilności i prosta obsługa błędów (`ApiError`).

- Jak integrujemy: 
  - Integracje TYLKO w BFF; sekrety w ENV; retry/backoff przy 429/5xx; mapowanie błędów do standardu `ApiError`.
  - Nie zmieniamy formatu żądania FE (multipart) ani minimalnego kształtu odpowiedzi JSON.
- Kryteria sukcesu: 
  - Prawdziwe wywołania zewnętrznych usług działają w środowisku z ustawionymi sekretnymi kluczami.
  - UI spełnia specyfikację i nie degraduje przepływów 1.1–1.4.

## Stories (kolejność realizacji)

1. Story 2.3: Branding i UI wg `docs/front-end-spec.md`
   - Zakres:
     - Wprowadzić tokeny kolorów/typografii (Primary Accent `#6A3DE8`, hover `#5429D0`, itp.).
     - Ujednolicić komponenty: `Button` (Primary/Secondary/Ghost, loading), `Input`, `Textarea` (licznik i błędy), `FileInput` (format/rozmiar i „Zmień plik”), prosty `Stepper/Progress`, `Toast`, `StatusBanner` (`role="status"/aria-live`).
     - A11y: focus-visible, kontrast ≥ 4.5:1, test hooks (`data-testid`).
   - AC:
     - UI zgodny z sekcjami „Branding”, „Komponenty”, „A11y” w `docs/front-end-spec.md`.
     - Smoke 1→4 przechodzi na mobile i desktop; brak regresji Stories 1.1–1.4.

2. Story 2.1: Integracja Music.ai w BFF (real)
   - Zakres:
     - Użyć `@music.ai/sdk`: zapisać plik do `/tmp`, `uploadFile(filePath)` → `addJob({ name, workflow, params: { inputUrl } })` → `waitForJobCompletion(jobId)`.
     - Zamapować `job.result` do `AudioAnalysis`; retry/backoff na 429/5xx; mapowanie błędów do `ApiError`.
     - ENV: `MUSIC_AI_API_KEY`, `MUSIC_AI_WORKFLOW_ANALYZE`; uzupełnić `.env.example` i README.
   - AC:
     - Realne wywołanie Music.ai; błędy → `ApiError` 502/429 z `requestId`.
     - Brak zmian w formacie żądania z FE; FE (`src/lib/api/generate.ts`) działa bez modyfikacji.

3. Story 2.2: Integracja LLM (OpenAI, non‑stream) w BFF
   - Zakres:
     - Wywołanie OpenAI JSON (non‑stream) z promptem bazującym na `artistName`, `artistDescription` oraz `AudioAnalysis`.
     - Zwraca `text`, `modelName`, `tokensUsed` zgodnie z `docs/architecture/5-api-specification.md`.
     - ENV: `LLM_API_KEY`, `LLM_MODEL`; obsługa 429/5xx → `ApiError`.
   - AC:
     - Realny opis generowany przez LLM zwracany w `text`; poprawne `modelName` i `tokensUsed`.
     - Brak zmian w kontrakcie wejścia/wyjścia endpointu.

4. Story 2.4: Walidacja ENV + README + minimalny smoke w CI
   - Zakres:
     - Walidacja ENV w runtime (guard w BFF). 
     - Uzupełnić `.env.example` i README (konfiguracja Music.ai/OpenAI).
     - Dodać prosty workflow CI: lint + test + build; opcjonalny smoke (uruchomienie minimalnego testu e2e/snapshot).
   - AC:
     - Braki ENV → jasne logi / `ApiError` 500 z minimalnym komunikatem.
     - CI przechodzi; dokumentacja aktualna.

## Wymagania kompatybilności
- Brak zmian w kontrakcie FE↔BFF dla `POST /api/audio/generate`:
  - Wejście: multipart/form-data z `file`, `artistName`, `artistDescription`, `language?`.
  - Wyjście: JSON z `language`, `text`, `outline`, `modelName`, `tokensUsed` (+ standard `ApiError`).
- UI zgodny z `docs/front-end-spec.md` i `docs/architecture/6-components.md`.

## Ryzyko i mitigacja
- Limity/awarie dostawców → retry/backoff, `ApiError` ze standardowym kształtem i minimalnym komunikatem.
- Sekrety/ENV → walidacja w 2.4; brak ekspozycji w kliencie; użycie Secret Manager na prod.
- Rollback: revert + poprzedni build (Vercel).

## Definition of Done (epik)
- 2.1 i 2.2: realne integracje w BFF, testy jednostkowe/mocks, `.env.example` i README uzupełnione.
- 2.3: UI z brand palette i a11y; smoke test 1→4 przechodzi (mobile/desktop).
- 2.4: Walidacja ENV i minimalny smoke w CI.
- Brak regresji funkcjonalności 1.1–1.4.

## Walidacja zakresu (KISS)
- 1–4 małe stories; brak zmian architektonicznych; integracja o niskiej złożoności.
- Ryzyko niskie; rollback łatwy.
- Kryteria sukcesu mierzalne (realne integracje + wdrożony UI, smoke OK).

## Handoff do Story Managera
Prośba o przygotowanie szczegółowych user stories zgodnie z kolejnością (najpierw 2.3 UI/Branding), z uwzględnieniem:
- Integracje w BFF z zachowaniem kontraktu `/api/audio/generate`.
- Wymogi a11y, test hooks i kolory z `docs/front-end-spec.md`.
- Krytyczne wymagania kompatybilności i prosta obsługa błędów (`ApiError`).
