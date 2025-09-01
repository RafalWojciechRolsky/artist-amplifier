# 5. API Specification

Kontrakty REST (Next.js Route Handlers w `src/app/api/.../route.ts`). Integracja z Music.ai przez SDK `@music.ai/sdk`. Streaming dla LLM – domyślnie OFF (pełna odpowiedź JSON).

## 5.1 POST `/api/audio/generate`

- Wejście: `multipart/form-data`
  - Pole `file`: `.mp3/.wav`, ≤ 50 MB
  - Pola tekstowe: `artistName` (wym.), `artistDescription` (wym., 50–1000 znaków), `language` (opc., domyślnie `pl`)
- Backend (BFF) — synchroniczna orkiestracja:

  1. Waliduje wejście (typ/rozmiar pliku, długości pól).
  2. Zapisuje plik tymczasowo (np. `/tmp`) lub buforuje w pamięci.
  3. Music.ai: `uploadFile(...)` → `inputUrl`; `addJob({ workflow: process.env.MUSIC_AI_WORKFLOW_ANALYZE, params: { inputUrl } })` → `jobId`; `waitForJobCompletion(jobId)`.
  4. Mapuje wynik analizy do `AudioAnalysis`.
  5. LLM: `llm.generateDescription({ artist, audio })` (non‑stream) → `GeneratedDescription`.
  6. Zwraca `200 OK` z `GeneratedDescription` (JSON).

- Sukces 200 (application/json):

```json
{
	"language": "pl",
	"text": "Wygenerowany opis...",
	"outline": ["..."],
	"modelName": "gpt-4o-mini",
	"tokensUsed": 1024
}
```

- Błędy: 400 (walidacja), 413 (za duży plik), 415 (typ), 429 (rate limit), 5xx (błąd zewn./wewn.).
- ENV: `MUSIC_AI_API_KEY`, `MUSIC_AI_WORKFLOW_ANALYZE`, `LLM_API_KEY`, `LLM_MODEL`.

## 5.2 Standard błędów (BE → FE)

```ts
interface ApiError {
	error: {
		code: string;
		message: string;
		details?: Record<string, any>;
		timestamp: string;
		requestId: string;
	};
}
```

## 5.3 Uwagi implementacyjne

- Synchroniczna orkiestracja w jednym żądaniu: BFF czeka na wynik analizy i generowania
- Brak endpointu statusu/pollingu; FE może anulować request (AbortController) i pokazywać prosty spinner.
- Brak trwałego storage; dane tymczasowe tylko na czas żądania.
- Utrzymuj limity rozmiaru i typów plików zarówno na FE, jak i BE.

---
