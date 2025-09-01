# Stories (kolejność realizacji)

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
     - Wprowadzono nowy, asynchroniczny kontrakt API, wymagający modyfikacji po stronie FE w celu obsługi wieloetapowego procesu (validate, analyze, poll status).

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

