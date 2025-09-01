# 6. Components

Przejrzysta lista komponentów i odpowiedzialności, dostosowana do asynchronicznego przepływu z odpytywaniem (polling).

## 6.1 Frontend (React, Next.js App Router)

-   **`src/app/page.tsx` (AppShell/Screen)`**

    -   Składa cały ekran i zarządza główną maszyną stanów (`useReducer`).
    -   **Stany**: `idle` → `validating` → `analyzing` → `polling` → `generating` → `readyDescription` (oraz `error`).
    -   Orkiestruje sekwencję wywołań do warstwy usług: `validate` → `analyze` → `checkStatus` (w pętli) → `generate`.

-   **`src/components/ArtistForm.tsx`**

    -   Bez zmian: Pola `artistName` i `artistDescription` z walidacją.

-   **`src/components/FileUpload.tsx`**

    -   Bez zmian: Drag&drop i walidacja klienta (typ/rozmiar).

-   **`src/components/AnalysisStatus.tsx`**

    -   Wyświetla bardziej szczegółowe statusy z maszyny stanów: „Walidacja...”, „Analiza...”, „Generowanie...”.

-   **`src/components/DescriptionPreview.tsx`**

    -   Bez zmian: Prezentuje wynik, oferuje akcje kopiuj/pobierz/reset.

-   **`src/components/ResetButton.tsx`**

    -   Bez zmian: Resetuje stan aplikacji.

-   **`src/components/ErrorBanner.tsx`**

    -   Bez zmian: Wyświetla błędy z `ApiError`.

-   **`src/components/GenerateButton.tsx`**

    -   Uruchamia **całą sekwencję** asynchronicznego przepływu.
    -   Jest zablokowany podczas każdego etapu (`validating`, `analyzing`, `polling`, `generating`).
    -   Wyświetla dynamiczny tekst w zależności od aktualnego stanu.

-   **Service layer (FE)**
    -   `src/lib/api/client.ts` (lub podobny) eksportuje funkcje orkiestracji:
        -   `validateAudio(file: File)`
        -   `analyzeAudio(file: File): Promise<{ jobId?: string; analysisResult?: AnalysisResult }>`
        -   `checkAnalysisStatus(jobId: string): Promise<{ status: string; analysisResult?: AnalysisResult }>`
        -   `generateDescription(data: { ... }): Promise<GeneratedDescription>`
    -   `src/lib/validators.ts` → walidacje klienta.
    -   `src/lib/types.ts` → współdzielone interfejsy.

## 6.2 Backend (BFF – Next.js Route Handlers)

-   **`src/app/api/validate-audio/route.ts`**
    -   Przyjmuje plik, zwraca `200 OK` jeśli jest prawidłowy.
-   **`src/app/api/audio/analyze/route.ts`**
    -   Przyjmuje plik, rozpoczyna analizę, zwraca `200` z wynikiem lub `202` z `jobId`.
-   **`src/app/api/audio/analyze/status/route.ts`**
    -   Przyjmuje `jobId`, zwraca status `202` (w toku) lub `200` z wynikiem.
-   **`src/app/api/audio/generate/route.ts`**
    -   Przyjmuje dane artysty i **wynik analizy**, zwraca `GeneratedDescription`.

-   **Warstwa integracyjna (BE)**
    -   `src/lib/server/musicai.ts`: Logika integracji z Music.ai.
    -   `src/lib/server/llm.ts`: Klient LLM.
    -   `src/lib/server/errors.ts`: Helpery `ApiError`.

## 6.3 Komunikacja i kontrakty

-   FE komunikuje się z czterema różnymi punktami końcowymi `/api/...` w celu ukończenia przepływu.
-   Kontrakty zgodne z [sekcją 5](./5-api-specification.md).

## 6.4 Błędy i UX

-   `ErrorBanner` obsługuje błędy na każdym etapie asynchronicznego procesu.
-   UI musi poprawnie zarządzać stanem (np. `jobId`) i logiką odpytywania, w tym obsługą błędów sieciowych i timeoutów po stronie klienta.

---
