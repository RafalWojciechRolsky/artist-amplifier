# 6. Components

Przejrzysta lista komponentów i odpowiedzialności (MVP, single screen, brak storage, streaming OFF).

## 6.1 Frontend (React, Next.js App Router)

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

## 6.2 Backend (BFF – Next.js Route Handlers)

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

## 6.3 Komunikacja i kontrakty

- FE komunikuje się wyłącznie z `/api/...` (BFF). Brak bezpośrednich wywołań do Music.ai/LLM.
- Formaty żądań/odpowiedzi zgodnie z sekcją 5. Typy z `src/lib/types.ts`.

## 6.4 Błędy i UX

- Jeden spójny `ApiError` na BE → wyświetlany przez `ErrorBanner`.
- Blokada przycisków w stanach pracy, wyraźne komunikaty i retry manualny.
- W stanie błędu oferuj przycisk „Reset” jako szybki powrót do stanu początkowego (czyści sessionStorage `aa:v1:*` i lokalny stan UI).

## 6.5 Dostępność (A11y) i i18n (MVP)

- Label/aria dla inputów i przycisków; focus states; klawisz Enter/Space tam gdzie ma sens.
- `language` w `ArtistForm` steruje językiem wyniku; i18n UI minimalne (PL/EN copy w stałych).

---
