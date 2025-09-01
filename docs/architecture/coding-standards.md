# Coding Standards (MVP)

Cel: minimalny, krytyczny zestaw zasad zapobiegających typowym błędom. Dopasowany do MVP (nie enterprise).

## Critical Fullstack Rules
- **Type Sharing:** MVP: trzymaj współdzielone typy w `src/lib/types.ts`. `packages/shared` — dopiero gdy realnie potrzebne (YAGNI).
- **API Calls:** Nie wywołuj HTTP bezpośrednio z komponentów — używaj warstwy `src/lib/api/*` (service layer).
- **Environment Variables:** Korzystaj z centralnego modułu `src/lib/server/env.ts`; nie używaj `process.env` bezpośrednio w kodzie domenowym.
- **Error Handling:** API (BFF) używa standardowego formatu błędów; FE posiada wspólny handler.
- **State Updates:** Nie mutuj stanu bezpośrednio – stosuj wybrane wzorce/state manager.
- **File Limits:** Waliduj `.mp3/.wav` i rozmiar do 50 MB zanim wyślesz żądanie.
- **Progress UX:** Zawsze emituj stany: `uploading`, `analyzing`, `generating`.
- **YAGNI:** Dodawaj BFF tylko jeśli wymagane (sekrety/CORS/limity/rate‑limit).

## React/JSX (MVP)
- Klucze w listach; nie używaj indexu jako `key`.
- Hooki tylko na top‑level funkcji komponentu; włącz `react-hooks/exhaustive-deps`.
- Nie definiuj komponentów wewnątrz innych komponentów.
- Nie używaj `dangerouslySetInnerHTML` (chyba że istnieje twarde uzasadnienie + sanitacja).
- Używaj `<>...</>` zamiast `<Fragment>...</Fragment>`.
- Zdarzenia tylko na elementach semantycznie interaktywnych; inaczej dodaj `role` i `tabIndex={0}` + obsługa Enter/Space.
- Brak `fetch` w komponentach – używaj `src/lib/api/*`.

## TypeScript (MVP)
- Nie wprowadzaj `enum`; używaj obiektów `as const` + typy pochodne.
- Stosuj `import type` / `export type` dla typów.
- Jawne typy zwrotu dla eksportowanych utili (komponenty mogą inferować `JSX.Element`).
- Preferuj discriminated unions przy wariantach danych (`type` field).
- Dodawaj `readonly` tam, gdzie chroni przed przypadkową mutacją.
- Unikaj `any`; jeśli musisz, lokalnie i z komentarzem dlaczego.
- Bez default exports (chyba że framework tego wymaga).

## Next.js specifics (MVP)
- Sekrety i klucze tylko w Route Handlers/BE; brak `NEXT_PUBLIC_*` dla tajnych wartości.
- Odpowiedzi z API: dodaj `Cache-Control: no-store` (brak persistence w MVP).
- Podstawowe nagłówki bezpieczeństwa (np. `X-Content-Type-Options: nosniff`, `Referrer-Policy: same-origin`).
- Brak SSR/ISR w MVP; interaktywne części jako Client Components.
- Używaj `next/image` zamiast `<img>` tam, gdzie to ma sens (bezpieczne domyślne i optymalizacja).

## Accessibility (MVP)
- Każdy input ma label (połącz `htmlFor`/`id`) lub `aria-label`.
- Przyciski mają `type` (`button`/`submit`).
- Komunikaty błędów/statusu używają `aria-live="polite"`.
- Unikaj `tabIndex > 0`; nie używaj `aria-hidden` na fokusowalnych elementach.
- Preferuj semantyczne elementy (button, a, form) i zapewnij `alt` dla obrazów.

## Naming Conventions
| Element | Frontend | Backend | Example |
| --- | --- | --- | --- |
| Components | PascalCase | - | `ArtistForm.tsx` |
| Hooks | camelCase with `use` | - | `useUpload.ts` |
| API Routes | - | path segments | `/api/audio/generate` |
| Database Tables | - | snake_case | `user_profiles` (N/A for MVP) |

## Error Response (standard)
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

## Linting i Formatowanie
- ESLint: `eslint:recommended`, `@typescript-eslint/recommended`, `plugin:react-hooks/recommended`, `plugin:jsx-a11y/recommended`.
- Prettier do formatowania (bez kolizji reguł z ESLint).
- Kluczowe reguły: `react-hooks/exhaustive-deps: error`, `@typescript-eslint/no-explicit-any: warn`, `import/order: warn`, `no-default-export: warn`.

## Testy (lekkie)
- Jednostkowe tam, gdzie logika nie jest trywialna.
- E2E smoke (np. jeden flow: dane → upload → generuj → kopiuj/pobierz).
