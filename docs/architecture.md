# Fullstack Architecture Document: Artist Amplifier (MVP)

Odniesienia: `docs/prd.md` (MVP, NFR), `docs/brief.md`

## Change Log

| Data       | Wersja | Opis                                          | Autor               |
| :--------- | :----- | :-------------------------------------------- | :------------------ |
| 24.08.2025 | 0.1    | Utworzenie szkieletu dokumentu + Introduction | Winston (Architect) |

---

## 1. Introduction

Ten dokument definiuje pełnostosową (full‑stack) architekturę dla projektu Artist Amplifier jako MVP typu single‑page, single‑screen. Celem jest dostarczenie jednego, mierzalnego rezultatu: edytowalnego opisu prasowego na podstawie minimalnych danych artysty i pojedynczego pliku audio.

- UI pozostaje responsywne; wskaźniki postępu podczas generowania. Brak twardego limitu czasu po stronie UI (NFR1) — analiza może trwać do kilku minut; dla MVP realizujemy synchroniczny przepływ (jedno żądanie oczekujące ~1–2 min po stronie BFF).
- Prywatność: brak logowania i baz użytkowników; brak trwałego przechowywania danych. Wszystkie dane przetwarzane w pamięci/tymczasowo i usuwane po sesji (NFR2).
- Użyteczność: cały przepływ na jednym ekranie (single page, single screen) (NFR3).
- Kompatybilność: przyjmowane formaty .mp3/.wav do 50 MB; walidacja i czytelne komunikaty błędów (NFR4).
- Integracje zewnętrzne (analiza audio, LLM): bezpośrednio z klienta, gdy bezpieczne; minimalny BFF wyłącznie jeśli konieczny (ochrona kluczy, CORS, limity). Zasada YAGNI.

Starter Template / Existing Project: N/A — Greenfield project.

---

## 2. High Level Architecture

Wybór: Next.js (App Router) jako frontend + minimalny BFF (Route Handlers) w jednym repo. Single‑screen SPA bez SSR (komponenty klienckie), a BFF obsługuje sekrety API.

### 2.1. Technical Summary

- Frontend: Next.js (App Router) + TypeScript + Tailwind. Jeden ekran (`src/app/page.tsx`), komponenty klienckie dla prostoty.
- BFF: Next.js Route Handlers (`src/app/api/audio/generate/route.ts`) na Vercel do ukrycia kluczy API.
- Integracje: Music.ai (analiza audio) + LLM (generowanie tekstu).
- Prywatność: brak auth i storage (dane tymczasowe zgodnie z NFR2).
- UX: synchroniczne przetwarzanie w jednym żądaniu, status "Generowanie..." na przycisku.

### 2.2. Platform Choice

**Wybór: Next.js + Vercel (REKOMENDACJA)**

- Plusy: wbudowane API routes, łatwy deploy, ukryte klucze API
- Minusy: minimalnie większa złożoność niż czyste SPA
- Uzasadnienie: potrzebujemy ukryć klucze API przed przeglądarką

### 2.3. Repository Structure

Jedno repo Next.js (FE + BFF razem). Proste typy w `src/lib/types.ts`.

### 2.4. High Level Architecture Diagram (Mermaid)

```mermaid
flowchart LR
  User[Browser SPA] --> Page[Next.js src/app/page.tsx]
  Page -->|fetch| API[/api/audio/generate/]
  API --> AudioAPI[(Audio Analysis API)]
  API --> LLM[(LLM API)]
```

### 2.5. Architectural Patterns

- Jamstack + minimalny BFF (Route Handlers) zamiast pełnego backendu.
- FE: proste komponenty wywołują API bezpośrednio.
- BE: podstawowy format błędów, walidacja wejścia.
- YAGNI: tylko jeden endpoint (`/api/audio/generate`).

---

## 3. Tech Stack

Krótki szkielet tabeli (pełna tabela w `docs/architecture/tech-stack.md`).

| Category                   | Technology                               | Version      | Purpose                   | Rationale                 |
| -------------------------- | ---------------------------------------- | ------------ | ------------------------- | ------------------------- |
| Frontend Framework         | Next.js (App Router)                     | 15.x         | SPA (single‑screen)       | FE+BFF w jednym projekcie |
| Backend (BFF – opcjonalny) | Next.js Route Handlers (Vercel)          | Node 22.18.0 | Proxy/keys/CORS/streaming | Bezpieczeństwo i prostota |
| API Style                  | REST (JSON)                              | -            | Integracje                | Najprostszy kontrakt      |
| File Storage (tymczasowe)  | Brak trwałego storage; ewent. signed URL | -            | Upload                    | Zgodność z NFR2           |

---

## 4. Data Models

Minimalne interfejsy TypeScript (MVP). Współdzielone typy umieszczamy w `src/lib/types.ts` (ew. później w `packages/shared`).

```ts
export type SupportedAudioMime = 'audio/mpeg' | 'audio/wav';
export type UILanguage = 'pl' | 'en';

export interface ArtistInput {
	artistName: string;
	artistDescription: string; // wymagane, 50–1000 znaków
	language?: UILanguage; // opcjonalne, domyślnie 'pl'
	// Atrybuty pliku (plik wysyłamy do /api/audio/generate jako FormData)
	audioFileName: string;
	audioMimeType: SupportedAudioMime;
	audioSizeBytes: number; // ≤ 50 MB
}

export interface AudioAnalysis {
	durationSec: number;
	bpm?: number;
	musicalKey?: string; // np. "C", "Am"
	energy?: number; // 0..1
}

export interface GeneratedDescription {
	language: UILanguage;
	text: string;
	outline?: string[];
	modelName?: string;
	tokensUsed?: number;
}

export interface ApiError {
	error: {
		code: string;
		message: string;
		details?: Record<string, any>;
		timestamp: string;
		requestId: string;
	};
}
```

---

## 5. API Specification

Kontrakty REST (Next.js Route Handlers w `src/app/api/.../route.ts`). Integracja z Music.ai przez SDK `@music.ai/sdk`. Streaming dla LLM – domyślnie OFF (pełna odpowiedź JSON).

### 5.1 POST `/api/audio/generate`

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

### 5.2 Standard błędów (BE → FE)

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

### 5.3 Uwagi implementacyjne

- Synchroniczna orkiestracja w jednym żądaniu: BFF czeka na wynik analizy i generowania
- Brak endpointu statusu/pollingu; FE może anulować request (AbortController) i pokazywać prosty spinner.
- Brak trwałego storage; dane tymczasowe tylko na czas żądania.
- Utrzymuj limity rozmiaru i typów plików zarówno na FE, jak i BE.

---

## 6. Components

Przejrzysta lista komponentów i odpowiedzialności (MVP, single screen, brak storage, streaming OFF).

### 6.1 Frontend (React, Next.js App Router)

- **`src/app/page.tsx` (AppShell/Screen)`**

  - Składa cały ekran. Trzyma prostą maszynę stanów (`useReducer`).
  - Stany: `idle → generating → readyDescription` (oraz `error`).
  - Orkiestruje wywołania do service layer.

- **`src/components/ArtistForm.tsx`**

  - Pola: `artistName` (wym.) oraz `artistDescription` (wym., textarea 50–1000 z licznikiem).
  - Walidacje: wymagane `artistName` i `artistDescription` (limity znaków).
  - Język UI/wyniku: domyślnie `pl` (brak selektora języka w MVP).

- **`src/components/FileUpload.tsx`**

  - Drag&drop + przycisk wybierz plik.
  - Walidacja typu (`audio/mpeg|audio/wav`) i rozmiaru (≤ 50 MB) przed wysyłką.

- **`src/components/AnalysisStatus.tsx`**

  - Status tekstowy etapu (bez paska postępu): „Generowanie…”.

- **`src/components/DescriptionPreview.tsx`**

  - Prezentacja `GeneratedDescription` (tekst + opcjonalny `outline`).
  - Akcje: kopiuj do schowka, pobierz `.txt` (`DownloadTxtButton`), Reset (przywrócenie stanu początkowego).

- **`src/components/ResetButton.tsx`**

  - Przywraca UI do stanu początkowego (Krok 1); czyści sessionStorage (`aa:v1:*`), formularz, meta pliku i wynik.
  - Dostępny w Kroku 4 oraz w stanie błędu jako szybki powrót do startu; potwierdzenie niewymagane (MVP).

- **`src/components/ErrorBanner.tsx`**

  - Standardowe wyświetlanie `ApiError`.

- **`src/components/GenerateButton.tsx`**

  - Pojedynczy przycisk uruchamiający cały proces w jednym żądaniu do BFF.
  - W trakcie pracy prezentuje status: „Generowanie…”.
  - Aktywny, gdy formularz (Story 1.1) jest poprawny i wskazano plik audio (Story 1.2).
  - W razie błędu analizy/generowania pokazuje komunikat i umożliwia ponowienie po poprawkach.

- **Service layer (FE)**
  - `src/lib/api/generate.ts` → `generate(formData: FormData): Promise<GeneratedDescription>`
  - `src/lib/validators.ts` → walidacje typu/rozmiaru audio.
  - `src/lib/types.ts` → współdzielone interfejsy (sekcja 4).

### 6.2 Backend (BFF – Next.js Route Handlers)

- **`src/app/api/audio/generate/route.ts`**

  - Przyjmuje `multipart/form-data` (`file`).
  - Waliduje typ i rozmiar, wykonuje `uploadFile` → `addJob` → `waitForJobCompletion` → mapuje do `AudioAnalysis` → `llm.generateDescription(...)`.
  - Zwraca `200 OK` z `GeneratedDescription` lub `ApiError` (400/413/415/429/5xx/504).

- **Warstwa integracyjna (BE)**
  - `src/lib/server/musicai.ts`
    - `uploadFile(...)`, `addJob(...)`, `waitForJobCompletion(...)`, `mapToAudioAnalysis(result)`; obsługa retry/backoff.
  - `src/lib/server/llm.ts`
    - Prosty klient do providera LLM (TBC) – non‑stream.
  - `src/lib/server/errors.ts`
    - Helpery do `ApiError`, mapowanie kodów/HTTP.
  - (opcjonalnie) `src/lib/server/rateLimit.ts`
    - Minimalny limiter (np. token bucket / per‑IP) – do rozważenia.

### 6.3 Komunikacja i kontrakty

- FE komunikuje się wyłącznie z `/api/...` (BFF). Brak bezpośrednich wywołań do Music.ai/LLM.
- Formaty żądań/odpowiedzi zgodnie z sekcją 5. Typy z `src/lib/types.ts`.

### 6.4 Błędy i UX

- Jeden spójny `ApiError` na BE → wyświetlany przez `ErrorBanner`.
- Blokada przycisków w stanach pracy, wyraźne komunikaty i retry manualny.
- W stanie błędu oferuj przycisk „Reset” jako szybki powrót do stanu początkowego (czyści sessionStorage `aa:v1:*` i lokalny stan UI).

### 6.5 Dostępność (A11y) i i18n (MVP)

- Label/aria dla inputów i przycisków; focus states; klawisz Enter/Space tam gdzie ma sens.
- `language` w `ArtistForm` steruje językiem wyniku; i18n UI minimalne (PL/EN copy w stałych).

---

## 7. External APIs

Zewnętrzne integracje obsługujemy wyłącznie z BFF (Route Handlers) — klucze nigdy nie trafiają do przeglądarki.

### 7.1 Music.ai — Audio Analysis

- **Dostęp**: SDK `@music.ai/sdk` (Node, w BFF). Auth przez `MUSIC_AI_API_KEY` (SDK dodaje nagłówki).
- **Workflow**: identyfikator przechowywany w `MUSIC_AI_WORKFLOW_ANALYZE` (ENV), aby móc zmieniać bez modyfikacji kodu.
- **Metody SDK używane**:
  - `uploadFile(localPathOrBuffer) → inputUrl`
  - `addJob({ name, workflow, params: { inputUrl } }) → jobId`
  - `waitForJobCompletion(jobId) → job` (status: `SUCCEEDED`/`FAILED`)
  - (opcjonalnie) `downloadJobResults(...)`
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

### 7.2 LLM — Text Generation (Provider TBC)

- **Dostęp**: provider do potwierdzenia (OpenAI‑compatible lub inny). Klucze w ENV (`LLM_API_KEY`).
- **Model**: `LLM_MODEL` w ENV (np. `gpt-4o-mini` lub inny odpowiednik). Możliwy parametr `temperature` (domyślnie umiarkowany).
- **Wywołanie**: endpoint JSON (non‑stream). Streaming OFF w MVP. BFF formułuje prompt z `ArtistInput` + `AudioAnalysis` i zwraca `GeneratedDescription`.
- **Błędy**: 429/5xx → mapowane na 502/429 w standardzie `ApiError`; logujemy `providerRequestId` jeśli dostępne.
- **Bezpieczeństwo**: klucz tylko w BFF; FE nigdy nie woła LLM bezpośrednio.

### 7.3 Zmienne środowiskowe (ENV)

- `MUSIC_AI_API_KEY` — klucz do Music.ai.
- `MUSIC_AI_WORKFLOW_ANALYZE` — identyfikator/nazwa workflow analizy audio.
- `LLM_API_KEY` — klucz do dostawcy LLM (TBC).
- `LLM_MODEL` — model LLM (TBC).

### 7.4 Obserwowalność i logowanie (minimalne)

- Logujemy: `requestId`, `jobId` (Music.ai), `workflow`, czasy: upload → job start → completion.
- Nie logujemy PII ani treści plików; tylko dane techniczne (np. rozmiar pliku, typ, czasy) i statusy.

### 7.5 Bezpieczeństwo i zgodność z MVP

- Klucze w BFF i w sekcjach Secret Manager (np. Vercel). Brak ekspozycji w kliencie.
- Brak trwałego storage; dane przetwarzane w pamięci/tymczasowo.
- Proste, klarowne komunikaty błędów na FE; pełniejsze detale tylko w logach BE.

---

## 8. Core Workflows (Mermaid Sequence)

### 8.1 Generate Description (sync orchestration)

```mermaid
sequenceDiagram
  participant U as User
  participant P as Page (src/app/page.tsx)
  participant G as GenerateButton
  participant FU as FileSelect
  participant AN as ArtistNameInput
  participant AD as ArtistDescriptionInput
  participant API as BFF /api/audio/generate
  participant MAI as Music.ai
  participant LLM as LLM Provider

  U->>FU: wybór pliku (mp3/wav)
  FU->>P: onFileSelected(file)

  U->>AN: wpisuje nazwę artysty
  AN->>P: onArtistNameChange(artistName)

  U->>AD: wpisuje opis artysty
  AD->>P: onArtistDescriptionChange(artistDescription)

  P->>P: state.form = { artistName, artistDescription, file }

  Note over P,G: Przycisk Generate aktywny TYLKO gdy<br/>artistName && artistDescription && file są ustawione

  U->>G: click Generate
  G->>P: onGenerate({ artistName, artistDescription, file })

  P->>API: POST multipart/form-data (artistName, artistDescription, file)

  API->>MAI: uploadFile(file) → inputUrl
  API->>MAI: addJob({ workflow, inputUrl }) → jobId
  API->>MAI: waitForJobCompletion(jobId) → result
  API->>API: map to AudioAnalysis

  API->>LLM: generateDescription("artist: { name: artistName, description: artistDescription }, audio: AudioAnalysis")
  LLM-->>API: text + tokens

  API-->>P: 200 GeneratedDescription
  P->>P: state = readyDescription

  opt błąd
    MAI-->>API: FAILED / 429 / 5xx
    API-->>P: ApiError (502/429/4xx)
    LLM-->>API: 429 / 5xx
    API-->>P: ApiError (502/429)
    P->>P: state = error
  end
```

### 8.3 Copy/Download/Reset & Edit loop

```mermaid
sequenceDiagram
  participant U as User
  participant P as Page (src/app/page.tsx)
  participant D as DescriptionPreview
  participant R as ResetButton

  U->>D: Copy to clipboard
  D-->>U: success toast
  U->>D: Download .txt
  D-->>U: file (nazwa_artysty_opis.txt)

  U->>P: Zmiana pól formularza / nowy upload
  P->>P: przejście stanów (idle|analyzing|readyAnalysis|generating|readyDescription|error)

  U->>R: click Reset
  R->>P: onReset()
  P->>P: clear sessionStorage (aa:v1:*)
  P->>P: state = idle
  P-->>U: UI wraca do Kroku 1 (pola/plik/wynik wyczyszczone)
```

---

## 9. Database Schema

MVP bez jakiejkolwiek bazy danych ani cache. Brak trwałego przechowywania danych.

### 9.1 Założenia

- Brak przechowywania PII oraz plików audio.
- Dane przetwarzane wyłącznie w trakcie obsługi żądania (request-scope).
- Brak KV/Redis i brak lokalnych cache metadanych w MVP.

### 9.2 Retencja i prywatność

- Po zakończeniu żądania dane są odrzucane; brak retencji.
- Rate limiting rozważany w przyszłości – patrz **Future Enhancements**.

### 9.3 Konfiguracja

- Brak flag/zmiennych ENV związanych ze storage (usuwamy `ENABLE_KV`, `KV_*`).

---

## 10. Frontend Architecture

Architektura FE jest minimalna (single‑screen, App Router, streaming OFF). Kluczowe zasady poniżej.

### 10.1 Routing

- Jedna trasa: `/` w `src/app/page.tsx` (Server Component jako kontener; interaktywne fragmenty jako Client Components).
- Brak podstron w MVP. Jeśli zajdzie potrzeba, dodamy `/about` lub `/privacy` jako proste Server Components.

### 10.2 Organizacja komponentów

- Prezentacyjne i mało‑stanowe komponenty w `src/components/`.
- Zasada: komponenty interaktywne oznaczamy `"use client"` na górze pliku.
- Nazewnictwo i odpowiedzialności zgodnie z sekcją 6 (Form, FileUpload, Status, Preview, ErrorBanner, GenerateButton).

### 10.3 Zarządzanie stanem

- `useReducer` w `src/app/page.tsx` trzyma maszynę stanów: `idle → generating → readyDescription` + `error`.
- Brak bibliotek global state (Redux/Zustand/React Query) — YAGNI.
- Wymiana danych między komponentami przez propsy i/lub prosty context lokalny ekranu.
- Persistencja w obrębie bieżącej sesji przeglądarki: sessionStorage (bez localStorage/IndexedDB) do odtworzenia postępu po odświeżeniu karty; brak trwałego storage zgodnie z NFR. Klucze i zakres danych zdefiniowane w `docs/front-end-spec.md#state-persistence`.
- Akcja `RESET`: zeruje reducer do stanu `idle`, usuwa klucze `aa:v1:*` z sessionStorage i czyści wartości formularza, meta pliku oraz wygenerowany wynik.

### 10.4 Warstwa usług (API client)

- `src/lib/api/generate.ts` — cienki wrapper `fetch` z:
  - Ustalonymi nagłówkami, obsługą JSON/FormData.
  - Rzucaniem błędów w formacie `ApiError` (z mapowaniem HTTP→`code`).
- Wspólne typy w `src/lib/types.ts`. Walidacje plików w `src/lib/validators.ts`.

### 10.5 Client vs Server Components

- Domyślnie Server Components w App Router; elementy wymagające interakcji/efektów — Client (`"use client"`).
- `page.tsx` może być Server i ładować Client children. Unikamy niepotrzebnego przenoszenia logiki na klienta.

### 10.6 Stylowanie i UI

- Tailwind CSS v4 (utility‑first). Prosty, czytelny layout (mobile‑first).
- Spójne stany focus/disabled, dostępne kontrasty. Reużywalne klasy pomocnicze.

### 10.7 Błędy i UX

- Jeden komponent `ErrorBanner` do prezentacji `ApiError`.
- Blokady i wskaźniki postępu w trakcie generowania. Jasne komunikaty i retry manualny.
- UI nie implementuje automatycznych timeoutów ani fallbacków; błędy z BE prezentowane są z opcją ręcznego ponowienia.

### 10.8 Testy (MVP)

- Jednostkowe: prosta logika reduktora (Jest) i helpery walidacji.
- E2E smoke (Playwright): ścieżka szczęśliwa — upload pliku testowego → gotowy wynik analizy → generacja opisu.

---

## 11. Backend Architecture (opcjonalny BFF)

Minimalny BFF oparty o Next.js Route Handlers. Brak trwałego storage; streaming OFF. Node runtime 22.18.0.

### 11.1 Struktura katalogów

- **Route Handlers**:
  - `src/app/api/audio/generate/route.ts` (POST multipart/form-data — synchroniczna orkiestracja)
- **Warstwa usług (server‑only)**:
  - `src/lib/server/musicai.ts` — integracja z `@music.ai/sdk` (upload → job → wait → mapowanie wyników)
  - `src/lib/server/llm.ts` — klient LLM (provider TBC), wywołanie non‑stream
  - `src/lib/server/errors.ts` — `ApiError`, mapowanie kodów i HTTP
  - (opcjonalnie) `src/lib/server/rateLimit.ts` — prosty limiter per‑IP
    ENV na starcie procesu
  - (opcjonalnie) `src/lib/server/rateLimit.ts` — prosty limiter per‑IP

### 11.2 Kontrakty endpointów

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

## {{ ... }}

## 13. Development Workflow

Minimalny, szybki cykl pracy z naciskiem na prostotę (npm, App Router, brak persistence).

### 13.1 Wymagania lokalne

- Node.js 22.18.0 (LTS) i npm (używamy npm, nie pnpm).
- Git. Opcjonalnie: VS Code (lub inny IDE) + wtyczki: Tailwind CSS IntelliSense, ESLint.

### 13.2 Instalacja i uruchomienie

```bash
npm install
npm run dev
```

- Dev server: http://localhost:3000
- Build: `npm run build`, produkcyjne uruchomienie: `npm start`.

### 13.3 Zmienne środowiskowe

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

### 13.4 NPM scripts (propozycja)

- `dev` — start środowiska deweloperskiego.
- `build` — produkcyjny build.
- `start` — run produkcyjny.
- `test` — testy jednostkowe (Jest) – reduktor + walidatory.
- `test:e2e` — testy E2E (Playwright) – ścieżka szczęśliwa.
- `lint` — (opcjonalnie) ESLint dla projektu.

### 13.5 Testowanie

- Jednostkowe (Jest):
  - Reducer maszyny stanów z `src/app/page.tsx` (wydzielić do modułu).
  - Walidacje plików w `src/lib/validators.ts`.
- E2E (Playwright):
  - `npx playwright install` (pierwszy raz).
  - Scenariusz: załaduj plik testowy → czekaj na wynik analizy → generuj opis → sprawdź wynik.

### 13.6 Gałęzie i PR

- Krótko żyjące feature branche od `develop` (np. `feat/press-generate-be`).
- PR z checklistą: build przechodzi, testy green, uzupełniona dokumentacja gdy dotyczy.

### 13.7 Higiena kodu

- Trzymaj typy w `src/lib/types.ts`. Jednolity `ApiError`.
- Nie wprowadzaj dodatkowych bibliotek stanowych bez potrzeby (YAGNI).

---

## 14. Deployment Architecture

Strategia minimalna na Vercel: statyczny frontend + Route Handlers jako Serverless (Node runtime). Brak SSR i bazy.

### 14.1 Platforma i topologia

- Hosting: Vercel (domyślny wybór dla Next.js 15).
- Frontend: statyczne assety serwowane z CDN Vercel.
- Backend (BFF): `src/app/api/.../route.ts` jako Serverless Functions (runtime Node). Uzasadnienie: potrzebny dostęp do `/tmp` i kompatybilność z SDK (Music.ai) — Edge pomijamy w MVP.

### 14.2 Środowiska i gałęzie

- Production: gałąź `master` → produkcja.
- Staging: gałąź `develop` → stały alias np. `staging` (Preview Deployment z przypiętym aliasem).
- Preview: każdy PR/feature branch → automatyczny Preview URL (testy ręczne/E2E).

### 14.3 Zmienne środowiskowe (Vercel Project Settings → Environment Variables)

- `MUSIC_AI_API_KEY`, `MUSIC_AI_WORKFLOW_ANALYZE`, `LLM_API_KEY`, `LLM_MODEL`.
- Konfiguruj oddzielnie dla Production/Staging/Preview. Brak prefiksu `NEXT_PUBLIC_`.

### 14.4 Build i runtime

- Build Command: `npm run build`
- Install Command: `npm install`
- Output: domyślnie Next.js
- Node.js: 22.x (zgodnie z sekcją 13)
- Route Handlers: runtime „Node.js”, region auto (lub najbliższy targetowym użytkownikom)

### 14.5 CI/CD (lekko)

- Integracja Vercel z GitHub: push do `master`/`develop`/PR → auto build & deploy.
- Bramka jakości przed deploy do produkcji: GitHub Actions uruchamia `npm ci && npm run lint && npm test`. Gdy zielone, merge do `master` → Vercel deploy prod.

Przykładowy szkic workflow (skrót w dokumentacji, niekoniecznie do włączenia od razu):

```yaml
name: CI
on: [pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '22' }
      - run: npm ci
      - run: npm run lint --if-present
      - run: npm test --if-present
```

### 14.6 Cache i nagłówki

- Statyczne assety: zarządzane przez CDN Vercel (immutable file hashing).
- API (BFF): `Cache-Control: no-store` (wyniki zależne od wejścia, zawierają sekrety/limity).
- Pliki do pobrania (`.txt`): `Content-Type: text/plain; charset=utf-8`, `Content-Disposition: attachment; filename="nazwa_artysty_opis.txt"`.

### 14.7 Bezpieczeństwo i sekrety

- Klucze wyłącznie w Vercel Secrets/Env; brak ekspozycji do klienta.
- CORS: domyślnie ten sam origin (SPA+BFF razem). Jeśli potrzebne — whitelist domen w Route Handlers.
- Rate limiting: TBD – patrz sekcja **Future Enhancements**.

### 14.8 Rollback i obserwowalność

- Każdy deploy w Vercel jest wersją z możliwością natychmiastowego rollbacku.
- Logi i metryki requestów dostępne w panelu Vercel (szczegóły → sekcja 19).

### 14.9 Kroki wdrożenia (skrót)

1. Załóż projekt w Vercel, podłącz repo GitHub.
2. Ustaw Node 22 oraz komendy: Install=`npm install`, Build=`npm run build`.
3. Skonfiguruj ENV: `MUSIC_AI_API_KEY`, `MUSIC_AI_WORKFLOW_ANALYZE`, `LLM_API_KEY`, `LLM_MODEL` (Preview/Staging/Production).
4. Skonfiguruj alias `staging` dla gałęzi `develop` (opcjonalnie).
5. Push na `develop` → Preview/Staging. PR → Preview URL. Merge do `master` → Production.
6. W razie problemu użyj Instant Rollback do poprzedniego builda.

---

## 15. Security and Performance

Minimalny, praktyczny zestaw zasad bezpieczeństwa i wydajności dla MVP (Next.js + Vercel, BFF, brak storage).

### 15.1 Założenia i model zagrożeń (MVP)

- Brak trwałego storage – redukcja ryzyka wycieku danych w spoczynku.
- Sekrety tylko na backendzie (Route Handlers). FE nie łączy się z zewnętrznymi API.
- Wejścia użytkownika: formularz tekstowy + plik audio (≤ 50 MB) → walidowane na FE i BE.

### 15.2 Kontrole po stronie serwera (BFF)

- Sekrety/ENV: `MUSIC_AI_API_KEY`, `MUSIC_AI_WORKFLOW_ANALYZE`, `LLM_API_KEY`, `LLM_MODEL` – przechowywane w Vercel ENV (Production/Staging/Preview). Brak `NEXT_PUBLIC_`.
- Walidacja wejścia:
  - `/api/audio/generate`: `multipart/form-data` z `file` (`audio/mpeg|audio/wav`, ≤ 50 MB) oraz polami tekstowymi. Odrzucaj inne typy/rozmiary kodami 400/413/415.
- CORS: ten sam origin; jeśli konieczne, whitelist domen w Route Handlers.
- Błędy: jeden format `ApiError` (sekcja 5.3). Nie ujawniaj detali providerów w odpowiedzi (tylko skrótowy `code`).
- Podstawowe nagłówki bezpieczeństwa (Vercel domyślne).
- Pliki tymczasowe: zapisuj do `/tmp` tylko na czas żądania; po użyciu `unlink`. Brak buforowania w długotrwałej pamięci.

### 15.3 Logowanie (minimalne)

- Podstawowe logi: endpoint, kody HTTP, błędy.
- Nie loguj PII ani zawartości plików.

### 15.4 Cache (podstawowy)

- Statyczne assety: CDN Vercel (domyślne).
- API: `Cache-Control: no-store`.

### 15.5 Wydajność (MVP)

- Upload: ≤ 50 MB; walidacja na FE i BE.
- UI: responsywne; status "Generowanie..." na przycisku.

### 15.6 Optymalizacje (MVP)

- FE: minimalny bundle, Tailwind, zwykły tekst (bez `dangerouslySetInnerHTML`).
- BE: Node runtime dla SDK, tymczasowe pliki w `/tmp`.

---

### 16.1 Zakres i narzędzia

- Unit: Jest (TypeScript). Brak realnych wywołań sieciowych.
- E2E: Playwright (Chromium) – ścieżka szczęśliwa.

### 16.2 Struktura testów

- Colocation preferowana dla unit: `src/**/__tests__/*.test.ts` lub `*.test.ts` obok modułów.
- E2E: `tests/e2e/*.spec.ts`, fixture audio w `tests/fixtures/` (≤ 1 MB).

### 16.3 Cele testów jednostkowych (przykłady)

- Reducer maszyny stanów (wydziel do `src/lib/state/reducer.ts`).
- Walidacje pliku/ wejścia użytkownika: `src/lib/validators.ts`.
- API clienty (FE): `src/lib/api/audio.ts`, `src/lib/api/press.ts` – mock `fetch` i asercje mapowania `ApiError`.
- Integracje serwerowe (BFF): `src/lib/server/musicai.ts`, `src/lib/server/llm.ts` – mock przez `jest.mock(...)` i test mapowania wyników/błędów.

### 16.4 Testy E2E (smoke)

- Scenariusz: uruchom app → wgraj plik fixture → oczekuj metadanych → klik "Generate" → sprawdź, że pojawił się opis.
- Selektory: `data-testid` w kluczowych elementach (upload, status, generate, output).
- Konfiguracja: `baseURL` do `http://localhost:3000` (dev) lub Preview URL z Vercel.

### 16.5 Mockowanie i izolacja

- Unit: nie używamy sieci. Mock `fetch` (np. `global.fetch = jest.fn()`), mock modułów integracji (`musicai.ts`, `llm.ts`).
- E2E: realny flow end‑to‑end – jeśli zbyt kosztowny, dopuszczalny toggle "mock backend" via ENV w Preview.

### 16.6 Dane testowe i limity

- Fixture audio: mały `.mp3`/`.wav` (≤ 1 MB) z legalnym źródłem, przechowywany w repo.
- Sprawdzenia brzegowe: maksymalny rozmiar pliku, nieobsługiwany MIME, brak wymaganych pól w JSON.

### 16.7 Uruchamianie i CI

- Lokalne: `npm test` (unit), `npm run test:e2e` (Playwright; pierwszy raz `npx playwright install`).
- CI (PR): uruchamiaj unit (`npm test`) i lint; E2E opcjonalnie na gałęzi `develop` lub w oddzielnym jobie z artefaktem wideo/trace.

### 16.8 Pokrycie i kryteria akceptacji

- Minimalne progi (rekomendacja): 70% statements/branches dla modułów `state/`, `validators/`, `api/`.
- PR zielony, gdy: build OK, unit green, E2E smoke zielony na `develop` lub ręczny test na Preview URL.

---

## 17. Coding Standards

Szczegóły w: `docs/architecture/coding-standards.md`.

---

## 18. Error Handling Strategy

Spójny model błędów między BFF i FE; jasne kody i komunikaty dla użytkownika; logi z `requestId`.

### 18.1 Standard błędów (ApiError)

Używamy jednego formatu (sekcja 5.3):

```ts
interface ApiError {
	error: {
		code: string; // INVALID_INPUT | PROVIDER_ERROR | INTERNAL_ERROR
		message: string; // zrozumiały komunikat dla użytkownika
		timestamp: string; // ISO 8601
	};
}
```

### 18.2 Backend (BFF): mapowanie i zasady (MVP)

- Błędne dane → 400 `INVALID_INPUT`
- Błąd dostawcy → 502 `PROVIDER_ERROR`
- Błąd serwera → 500 `INTERNAL_ERROR`
- Podstawowy `timestamp` w odpowiedzi.

### 18.3 Frontend: prezentacja (MVP)

- Komponent `ErrorBanner` renderuje `ApiError.error.message`.
- Przycisk "Spróbuj ponownie" po błędzie.
- Komunikaty inline (aria-live=polite).

### 18.4 Błędy (MVP)

Podstawowy przepływ: błąd → ErrorBanner → "Spróbuj ponownie"

### 18.5 Komunikaty i i18n (minimal)

- Komunikaty krótkie, nietechniczne. Dłuższe detale tylko w `details`/logach.
- Wersje językowe PL/EN (spójne z `UILanguage`).

---

## 19. Future Enhancements

Poniższe pozycje **nie są** wymagane do uruchomienia MVP, ale zostały zidentyfikowane jako potencjalne usprawnienia:

- **Zaawansowany rate-limiting** – middleware edge/proxy lub dedykowany serwis (Redis, Upstash) z trwałą pamięcią i metrykami.
- **Automatyczne testy E2E (Playwright)** – pełna ścieżka 1→4 na głównych przeglądarkach, test regresji wizualnej.
- **Monitorowanie Web Vitals** – próbkujące raportowanie LCP/INP/CLS do zewnętrznego endpointu (np. `web-vitals`).
- **Rozszerzona obserwowalność** – zbieranie trace/logów w OpenTelemetry.
- **Retry/Backoff konfigurowalny** – adaptive throttling dla Music.ai/LLM.

---

- Komunikaty krótkie, nietechniczne. Dłuższe detale tylko w `details`/logach.
- Wersje językowe PL/EN (spójne z `UILanguage`).

---
