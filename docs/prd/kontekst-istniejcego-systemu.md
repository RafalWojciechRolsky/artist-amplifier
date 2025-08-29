# Kontekst istniejącego systemu
- Frontend: Next.js App Router, komponenty w `src/components/`, lokalny stan z `useReducer` + sessionStorage. Zgodność z `docs/architecture/10-frontend-architecture.md` i `docs/front-end-spec.md`.
- BFF: Next.js Route Handlers, kluczowy endpoint `POST /api/audio/generate` w `src/app/api/audio/generate/route.ts` (obecnie stub). Klient FE: `src/lib/api/generate.ts`.
- Brak trwałego storage; brak auth (MVP). 
