# Tech Stack (MVP — selected)

Wybrano Next.js (App Router) jako FE + minimalny BFF (Route Handlers). Poniżej tabela do doprecyzowania wersji.

## Tabela (do uzupełnienia)
| Category | Technology | Version | Purpose | Rationale |
| --- | --- | --- | --- | --- |
| Frontend Language | TypeScript | 5.x | Typy, DX | Stabilność, narzędzia |
| Frontend Framework | Next.js (App Router) | 15.5.0 | SPA (single‑screen) | FE+BFF w jednym projekcie |
| Frontend Runtime | React | 19.1.0 | UI runtime | Zgodne z Next 15.5.0 |
| UI Library | Tailwind CSS (opc. Headless UI) | 4.x | UI | Szybkie prototypowanie |
| State Management | useState/useReducer (bez lib) | - | Lokalny stan | Jeden widok; YAGNI |
| Backend (BFF) | Next.js Route Handlers (Vercel) | Node 22.18.0 | Proxy/keys/CORS/streaming | Bezpieczeństwo |
| API Style | REST (JSON) | - | Integracje | Najprostszy kontrakt |
| File Storage | Tymczasowe; ewent. signed URL (TBC) | - | Upload | Brak trwałego storage |
| Auth | Brak (MVP) | - | - | Brak kont użytkowników |
| Testing | Jest + Playwright (smoke) | 29.x / 1.x | Unit/E2E | Minimal pod MVP |
| Build/Deploy | Next.js + npm scripts | 15.5.0 | Build/Deploy | Jedna platforma (Vercel) |
| CI/CD | GitHub Actions (prosty) | - | CI | Lint/test/build |
| Monitoring | Konsola + minimalny tracking błędów | TBC | Observability | MVP |

## Notatki decyzyjne
- Wybór: Next.js (App Router) + Route Handlers (BFF) — prosty deploy na Vercel, sekrety w env, opcja streamingu.
- Stan: lokalny `useState/useReducer`; bez React Query/Zustand na start.
- Node runtime: 22.18.0 (lokalnie i na Vercel).
- YAGNI: jeden endpoint BFF (`/api/audio/generate`).
- Priorytet: UX i czas do wartości (NFR1–NFR3). Utrzymujemy minimalny stack i jeden kod bazowy.
