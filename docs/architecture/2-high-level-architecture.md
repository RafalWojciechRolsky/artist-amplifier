# 2. High Level Architecture

Wybór: Next.js (App Router) jako frontend + minimalny BFF (Route Handlers) w jednym repo. Single‑screen SPA bez SSR (komponenty klienckie), a BFF obsługuje sekrety API.

## 2.1. Technical Summary

- **Frontend**: Next.js (App Router) + TypeScript + Tailwind. Jeden ekran (`src/app/page.tsx`), komponenty klienckie dla interaktywności.
- **BFF**: Zestaw handlerów tras Next.js (`src/app/api/...`) działających na Vercel w celu ukrycia kluczy API i orkiestracji zadań.
- **Integracje**: Music.ai (analiza audio) + LLM (generowanie tekstu).
- **Prywatność**: Brak uwierzytelniania i stałego przechowywania danych (dane tymczasowe zgodnie z NFR2).
- **UX**: Przetwarzanie **asynchroniczne**. Użytkownik wysyła plik, a interfejs użytkownika odpytuje (poll) o status analizy przed wygenerowaniem ostatecznego opisu.

## 2.2. Platform Choice

**Wybór: Next.js + Vercel (REKOMENDACJA)**

- **Plusy**: Wbudowane trasy API, łatwe wdrożenie, ukryte klucze API, obsługa funkcji bezserwerowych.
- **Minusy**: Zwiększona złożoność w porównaniu do czystego SPA z powodu asynchronicznego przepływu.
- **Uzasadnienie**: Konieczność ukrycia kluczy API i orkiestracji wieloetapowego procesu w tle.

## 2.3. Repository Structure

Jedno repo Next.js (FE + BFF razem). Współdzielone typy w `src/lib/types.ts`.

## 2.4. High Level Architecture Diagram (Mermaid)

```mermaid
flowchart LR
    subgraph Browser SPA
        direction LR
        Page[Next.js src/app/page.tsx]
    end

    subgraph BFF (Next.js Route Handlers)
        direction LR
        Validate[/api/validate-audio/]
        Analyze[/api/audio/analyze/]
        Status[/api/audio/analyze/status/]
        Generate[/api/audio/generate/]
    end

    subgraph External Services
        direction LR
        AudioAPI[(Audio Analysis API)]
        LLM[(LLM API)]
    end

    Page -->|1. fetch| Validate
    Page -->|2. fetch| Analyze
    Analyze --> AudioAPI
    Analyze -- 202 Accepted --> Page
    Page -->|3. poll| Status
    Status --> Page
    Page -->|4. fetch| Generate
    Generate --> LLM
    Generate --> Page
```

## 2.5. Architectural Patterns

- **Jamstack + BFF**: Wykorzystanie Route Handlers jako lekkiego backendu.
- **Asynchronous Polling**: Frontend inicjuje zadania (analiza) i okresowo sprawdza ich status, zamiast czekać na synchroniczną odpowiedź.
- **Separacja zadań**: Architektura API rozdziela walidację, analizę i generowanie na odrębne, dedykowane punkty końcowe.


---
