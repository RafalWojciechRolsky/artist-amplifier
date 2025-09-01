# 11. Backend Architecture (BFF)

Minimalny BFF oparty o Next.js Route Handlers. Brak trwałego storage; streaming OFF. Node runtime 22.18.0.

## 11.1 Struktura katalogów

-   **Route Handlers**:
    -   `src/app/api/validate-audio/route.ts` (POST - walidacja pliku)
    -   `src/app/api/audio/analyze/route.ts` (POST - inicjalizacja analizy)
    -   `src/app/api/audio/analyze/status/route.ts` (GET - odpytywanie o status analizy)
    -   `src/app/api/audio/generate/route.ts` (POST - generowanie opisu z wyników analizy)
-   **Warstwa usług (server-only)**:
    -   `src/lib/server/musicai.ts` — integracja z `@music.ai/sdk`.
    -   `src/lib/server/llm.ts` — klient LLM.
    -   `src/lib/server/errors.ts` — `ApiError`, mapowanie kodów i HTTP.
    -   `src/lib/server/musicaiTransform.ts` - transformacja wyników z Music.ai.

## 11.2 Kontrakty endpointów

Architektura API została zmieniona z pojedynczego, synchronicznego endpointu na wieloetapowy proces asynchroniczny, aby lepiej zarządzać długotrwałymi operacjami analizy audio.

Nowy przepływ obejmuje następujące punkty końcowe:

1.  **`POST /api/validate-audio`**: Waliduje plik audio przed wysłaniem.
2.  **`POST /api/audio/analyze`**: Inicjuje analizę, potencjalnie zwracając `jobId` do śledzenia.
3.  **`GET /api/audio/analyze/status`**: Umożliwia odpytywanie o status zadania analizy przy użyciu `jobId`.
4.  **`POST /api/audio/generate`**: Generuje opis, przyjmując dane artysty oraz **wynik zakończonej analizy**.

Szczegółowe kontrakty dla każdego z tych punktów końcowych znajdują się w dokumencie [5. API Specification](./5-api-specification.md).
