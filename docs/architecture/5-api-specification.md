# 5. API Specification

Architektura API opiera się na wieloetapowym, asynchronicznym procesie obsługiwanym przez Next.js Route Handlers. Proces został rozdzielony na walidację, analizę (z odpytywaniem o status) i generowanie.

## 5.1 `POST /api/validate-audio`

Przeprowadza szybką walidację pliku audio przed rozpoczęciem kosztownych operacji.

-   **Metoda**: `POST`
-   **Wejście**: `multipart/form-data`
    -   Pole `file`: Plik audio (`.mp3` lub `.wav`), ≤ 50 MB.
-   **Przepływ**:
    1.  Sprawdza typ MIME i rozmiar pliku.
    2.  Wykonuje analizę sygnatury pliku (content sniffing), aby upewnić się, że zawartość odpowiada deklarowanemu typowi.
-   **Odpowiedź sukces (200 OK)**:
    ```json
    { "ok": true }
    ```
-   **Odpowiedzi błędu**:
    -   `400 BAD_REQUEST`: Brak pliku, błąd odczytu lub niezgodność sygnatury.
    -   `413 PAYLOAD_TOO_LARGE`: Plik przekracza 50 MB.
    -   `415 UNSUPPORTED_MEDIA_TYPE`: Nieprawidłowy typ MIME.
    -   `429 RATE_LIMIT`: Przekroczono limit żądań.

## 5.2 `POST /api/audio/analyze`

Inicjuje proces analizy audio w zewnętrznym serwisie (Music.ai).

-   **Metoda**: `POST`
-   **Wejście**: `multipart/form-data`
    -   Pole `file`: Plik audio, który pomyślnie przeszedł walidację.
-   **Przepływ**:
    1.  Zapisuje plik tymczasowo.
    2.  Wysyła plik do serwisu Music.ai i tworzy zadanie analizy.
    3.  Jeśli analiza zakończy się szybko, zwraca pełny wynik.
    4.  Jeśli analiza wymaga czasu, zwraca status `202 Accepted` z identyfikatorem zadania (`jobId`), instruując klienta, aby rozpoczął odpytywanie.
-   **Odpowiedź synchroniczna (200 OK)**:
    -   Zwraca obiekt `AnalysisResult` z pełnymi danymi analizy.
-   **Odpowiedź asynchroniczna (202 Accepted)**:
    ```json
    { "status": "processing", "jobId": "some-job-identifier" }
    ```
-   **Odpowiedzi błędu**: `400`, `413`, `415`, `429`, `502` (błąd serwisu zewnętrznego).

## 5.3 `GET /api/audio/analyze/status`

Sprawdza status długotrwałego zadania analizy audio.

-   **Metoda**: `GET`
-   **Parametry zapytania (Query Params)**:
    -   `jobId` (string, wymagany): Identyfikator zadania zwrócony przez `/api/audio/analyze`.
-   **Przepływ**:
    1.  Odpytuje serwis Music.ai o status zadania o podanym `jobId`.
    2.  Jeśli zadanie wciąż jest przetwarzane, zwraca `202 Accepted`.
    3.  Jeśli zadanie zakończyło się sukcesem, zwraca `200 OK` z pełnym wynikiem analizy.
-   **Odpowiedź "w toku" (202 Accepted)**:
    ```json
    { "status": "processing", "jobId": "some-job-identifier" }
    ```
-   **Odpowiedź sukces (200 OK)**:
    -   Zwraca obiekt `AnalysisResult` z danymi analizy.
-   **Odpowiedzi błędu**: `400` (brak `jobId`), `502` (błąd serwisu zewnętrznego).

## 5.4 `POST /api/audio/generate`

Generuje opis prasowy na podstawie zakończonej analizy audio.

-   **Metoda**: `POST`
-   **Wejście**: `application/json`
    -   `artistName` (string): Nazwa artysty.
    -   `artistDescription` (string): Opis artysty.
    -   `language` (string, opcjonalny): Język generowania.
    -   `analysis` (object): Obiekt `AnalysisResult` uzyskany z poprzednich kroków.
-   **Przepływ**:
    1.  Formułuje prompt dla LLM, łącząc dane artysty i wyniki analizy.
    2.  Wywołuje LLM i czeka na wygenerowany tekst.
-   **Odpowiedź sukces (200 OK)**:
    ```json
    {
      "language": "pl",
      "text": "Wygenerowany opis...",
      "outline": ["..."],
      "modelName": "gpt-4o-mini",
      "tokensUsed": 1024
    }
    ```
-   **Odpowiedzi błędu**: `400` (nieprawidłowy JSON), `429`, `502` (błąd LLM).

## 5.5 Standard błędów (BE → FE)

Format błędu pozostaje spójny dla wszystkich punktów końcowych.

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

## 5.6 Uwagi implementacyjne

-   **Asynchroniczność**: Klient (frontend) jest odpowiedzialny za orkiestrację całego przepływu: walidacja → analiza → odpytywanie o status → generowanie.
-   **Stan**: Klient musi zarządzać stanem `jobId` podczas odpytywania.
-   **Brak trwałości**: Dane (pliki, wyniki) nie są przechowywane na serwerze między wywołaniami. Wynik analizy musi być przechowywany po stronie klienta i przesłany do endpointu generowania.

---
