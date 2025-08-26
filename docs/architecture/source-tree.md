# Source Tree (Next.js App Router, MVP)

Struktura dla pojedynczego projektu Next.js z wbudowanym BFF (Route Handlers). Minimalna, pod single‑screen SPA. Preferujemy npm scripts.

```text
artist-amplifier/
├── src/
│   └── app/
│       ├── api/
│       │   ├── audio/
│       │   │   └── analyze/route.ts        # POST: proxy do Audio Analysis API
│       │   └── press/
│       │       └── generate/route.ts       # POST (non‑stream): proxy do LLM API
│       ├── page.tsx                        # Single‑screen UI
│       ├── layout.tsx                      # Root layout
│       └── globals.css                     # Tailwind v4 (import @tailwindcss/postcss)
│   ├── components/                         # UI components
│   └── lib/
│       ├── api/                            # FE service layer (fetch do /api/...)
│       ├── validators.ts                   # Walidacje pliku/wejść
│       └── types.ts                        # Współdzielone typy (MVP)
├── public/
├── package.json                            # npm (nie pnpm)
├── next.config.ts
├── tsconfig.json
├── postcss.config.mjs
└── docs/
    └── architecture/
        ├── coding-standards.md
        ├── tech-stack.md
        └── source-tree.md
```

Opcjonalnie (jeśli pojawi się potrzeba współdzielenia typów/utili):

```text
artist-amplifier/
└── packages/
    └── shared/
        ├── src/
        │   ├── types/
        │   ├── constants/
        │   └── utils/
        └── package.json
```

Uwaga: brak trwałego storage’u i auth (MVP). Endpointy BFF ograniczone do niezbędnych `/api/audio/analyze` i `/api/press/generate` (YAGNI).

