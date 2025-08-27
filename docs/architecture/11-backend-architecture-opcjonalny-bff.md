# 11. Backend Architecture (opcjonalny BFF)

Minimalny BFF oparty o Next.js Route Handlers. Brak trwałego storage; streaming OFF. Node runtime 22.18.0.

## 11.1 Struktura katalogów

- **Route Handlers**:
  - `src/app/api/audio/generate/route.ts` (POST multipart/form-data — synchroniczna orkiestracja)
- **Warstwa usług (server‑only)**:
  - `src/lib/server/musicai.ts` — integracja z `@music.ai/sdk` (upload → job → wait → mapowanie wyników)
  - `src/lib/server/llm.ts` — klient LLM (provider TBC), wywołanie non‑stream
  - `src/lib/server/errors.ts` — `ApiError`, mapowanie kodów i HTTP
  - (opcjonalnie) `src/lib/server/rateLimit.ts` — prosty limiter per‑IP
    ENV na starcie procesu
  - (opcjonalnie) `src/lib/server/rateLimit.ts` — prosty limiter per‑IP

## 11.2 Kontrakty endpointów

- `/api/audio/generate`:
  - Metoda: POST
  - Wejście: `multipart/form-data`
    - Pola tekstowe: `artistName` (wym.), `artistDescription` (wym., 50–1000 znaków)
    - Plik: `file` (`.mp3` lub `.wav`, ≤ 50 MB)
  - Sukces `200 OK` (`application/json`):
    - `GeneratedDescription` — `{ language: 'pl'|'en', text: string, outline?: string[], modelName?: string, tokensUsed?: number }`
  - Błędy: `400` (walidacja), `413` (za duży plik), `415` (typ), `429` (rate limit), `5xx` (błąd zewn./wewn.)
    - Format: `ApiError` — `{"error": { code, message, details?, timestamp, requestId }}`

```text
artist-amplifier/
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   └── audio/generate/route.ts    # POST (synchroniczna orkiestracja)
│   │   ├── page.tsx
│   │   └── layout.tsx
│   ├── components/
│   └── lib/
│       ├── api/
│       ├── validators.ts
│       └── types.ts
└── docs/
└── architecture/
└── source-tree.md
```
