# 3. Tech Stack

Krótki szkielet tabeli (pełna tabela w `docs/architecture/tech-stack.md`).

| Category                   | Technology                               | Version      | Purpose                   | Rationale                 |
| -------------------------- | ---------------------------------------- | ------------ | ------------------------- | ------------------------- |
| Frontend Framework         | Next.js (App Router)                     | 15.x         | SPA (single‑screen)       | FE+BFF w jednym projekcie |
| Backend (BFF – opcjonalny) | Next.js Route Handlers (Vercel)          | Node 22.18.0 | Proxy/keys/CORS/streaming | Bezpieczeństwo i prostota |
| API Style                  | REST (JSON)                              | -            | Integracje                | Najprostszy kontrakt      |
| File Storage (tymczasowe)  | Brak trwałego storage; ewent. signed URL | -            | Upload                    | Zgodność z NFR2           |

---
