# 7. External APIs

Zewnętrzne integracje obsługujemy wyłącznie z BFF (Route Handlers) — klucze nigdy nie trafiają do przeglądarki.

## 7.1 Music.ai — Audio Analysis

- **Dostęp**: SDK `@music.ai/sdk` (Node, w BFF). Auth przez `MUSIC_AI_API_KEY` (SDK dodaje nagłówki).
- **Workflow**: identyfikator przechowywany w `MUSIC_AI_WORKFLOW_ANALYZE` (ENV), aby móc zmieniać bez modyfikacji kodu.
- **Metody SDK używane**:
  - `uploadFile(filePath: string) → inputUrl`
    - Uwaga: w MVP zapisujemy plik do ścieżki tymczasowej (np. `/tmp/<uuid>.wav`) i przekazujemy tę ścieżkę do `uploadFile`.
  - `addJob({ name, workflow, params: { inputUrl } }) → jobId` (preferujemy wariant obiektowy; stabilniejszy interfejs)
  - `waitForJobCompletion(jobId) → job` (status: `SUCCEEDED`/`FAILED`)
  - (opcjonalnie) `downloadJobResults(...)` — nieużywane w MVP, chyba że workflow zwróci przydatne artefakty do diagnostyki
  - (opcjonalne API SDK, niewykorzystywane w MVP): `deleteJob`, `listJobs`, `listWorkflows`
- **Kontrakt**: mapujemy `job.result` na `AudioAnalysis` (`durationSec`, `bpm?`, `musicalKey?`, `energy?`). Nazwy kluczy wyników zależą od konkretnego workflow — mapowanie zamykamy w warstwie BFF.
- **Limity/Timeouty**:
  - Wejście: `.mp3/.wav` ≤ 50 MB (walidujemy na FE i BE).
  - `waitForJobCompletion`: BFF czeka synchronicznie w ramach budżetu czasu endpointu (ok. 120–180 s w MVP).
- **Błędy i mapowanie**:
  - `FAILED` → 502 (`code: MUSIC_AI_JOB_FAILED`, `details: { jobId }`).
  - 429/5xx z Music.ai → 502 lub 429 (zależnie od kontekstu), z `requestId` i krótkim komunikatem.
  - Nie ujawniamy surowych detali zewnętrznych w `message`; pełniejsze szczegóły tylko w logach serwera.
- **Retry/Backoff**: na 429/5xx max 2 próby z exponential backoff (np. 250 ms, 750 ms) w ramach budżetu czasu.
- **Dane**: brak trwałego storage; plik tylko tymczasowo (np. `/tmp`) na czas uploadu do Music.ai.

## 7.2 LLM — Text Generation (Provider TBC)

- **Dostęp**: provider do potwierdzenia (OpenAI‑compatible lub inny). Klucze w ENV (`LLM_API_KEY`).
- **Model**: `LLM_MODEL` w ENV (np. `gpt-4o-mini` lub inny odpowiednik). Możliwy parametr `temperature` (domyślnie umiarkowany).
- **Wywołanie**: endpoint JSON (non‑stream). Streaming OFF w MVP. BFF formułuje prompt z `ArtistInput` + `AudioAnalysis` i zwraca `GeneratedDescription`.
- **Błędy**: 429/5xx → mapowane na 502/429 w standardzie `ApiError`; logujemy `providerRequestId` jeśli dostępne.
- **Bezpieczeństwo**: klucz tylko w BFF; FE nigdy nie woła LLM bezpośrednio.

## 7.3 Zmienne środowiskowe (ENV)

- `MUSIC_AI_API_KEY` — klucz do Music.ai.
- `MUSIC_AI_WORKFLOW_ANALYZE` — identyfikator/nazwa workflow analizy audio.
- `LLM_API_KEY` — klucz do dostawcy LLM (TBC).
- `LLM_MODEL` — model LLM (TBC).

## 7.4 Obserwowalność i logowanie (minimalne)

- Logujemy: `requestId`, `jobId` (Music.ai), `workflow`, czasy: upload → job start → completion.
- Nie logujemy PII ani treści plików; tylko dane techniczne (np. rozmiar pliku, typ, czasy) i statusy.

## 7.5 Bezpieczeństwo i zgodność z MVP

- Klucze w BFF i w sekcjach Secret Manager (np. Vercel). Brak ekspozycji w kliencie.
- Brak trwałego storage; dane przetwarzane w pamięci/tymczasowo.
- Proste, klarowne komunikaty błędów na FE; pełniejsze detale tylko w logach BE.

---
