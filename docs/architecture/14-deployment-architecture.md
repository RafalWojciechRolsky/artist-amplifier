# 14. Deployment Architecture

Strategia minimalna na Vercel: statyczny frontend + Route Handlers jako Serverless (Node runtime). Brak SSR i bazy.

## 14.1 Platforma i topologia

- Hosting: Vercel (domyślny wybór dla Next.js 15).
- Frontend: statyczne assety serwowane z CDN Vercel.
- Backend (BFF): `src/app/api/.../route.ts` jako Serverless Functions (runtime Node). Uzasadnienie: potrzebny dostęp do `/tmp` i kompatybilność z SDK (Music.ai) — Edge pomijamy w MVP.

## 14.2 Środowiska i gałęzie

- Production: gałąź `master` → produkcja.
- Staging: gałąź `develop` → stały alias np. `staging` (Preview Deployment z przypiętym aliasem).
- Preview: każdy PR/feature branch → automatyczny Preview URL (testy ręczne/E2E).

## 14.3 Zmienne środowiskowe (Vercel Project Settings → Environment Variables)

- `MUSIC_AI_API_KEY`, `MUSIC_AI_WORKFLOW_ANALYZE`, `LLM_API_KEY`, `LLM_MODEL`.
- Konfiguruj oddzielnie dla Production/Staging/Preview. Brak prefiksu `NEXT_PUBLIC_`.

## 14.4 Build i runtime

- Build Command: `npm run build`
- Install Command: `npm install`
- Output: domyślnie Next.js
- Node.js: 22.x (zgodnie z sekcją 13)
- Route Handlers: runtime „Node.js”, region auto (lub najbliższy targetowym użytkownikom)

## 14.5 CI/CD (lekko)

- Integracja Vercel z GitHub: push do `master`/`develop`/PR → auto build & deploy.
- Bramka jakości przed deploy do produkcji: GitHub Actions uruchamia `npm ci && npm run lint && npm test`. Gdy zielone, merge do `master` → Vercel deploy prod.

Przykładowy szkic workflow (skrót w dokumentacji, niekoniecznie do włączenia od razu):

```yaml
name: CI
on: [pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '22' }
      - run: npm ci
      - run: npm run lint --if-present
      - run: npm test --if-present
```

## 14.6 Cache i nagłówki

- Statyczne assety: zarządzane przez CDN Vercel (immutable file hashing).
- API (BFF): `Cache-Control: no-store` (wyniki zależne od wejścia, zawierają sekrety/limity).
- Pliki do pobrania (`.txt`): `Content-Type: text/plain; charset=utf-8`, `Content-Disposition: attachment; filename="nazwa_artysty_opis.txt"`.

## 14.7 Bezpieczeństwo i sekrety

- Klucze wyłącznie w Vercel Secrets/Env; brak ekspozycji do klienta.
- CORS: domyślnie ten sam origin (SPA+BFF razem). Jeśli potrzebne — whitelist domen w Route Handlers.
- Rate limiting: TBD – patrz sekcja **Future Enhancements**.

## 14.8 Rollback i obserwowalność

- Każdy deploy w Vercel jest wersją z możliwością natychmiastowego rollbacku.
- Logi i metryki requestów dostępne w panelu Vercel (szczegóły → sekcja 19).

## 14.9 Kroki wdrożenia (skrót)

1. Załóż projekt w Vercel, podłącz repo GitHub.
2. Ustaw Node 22 oraz komendy: Install=`npm install`, Build=`npm run build`.
3. Skonfiguruj ENV: `MUSIC_AI_API_KEY`, `MUSIC_AI_WORKFLOW_ANALYZE`, `LLM_API_KEY`, `LLM_MODEL` (Preview/Staging/Production).
4. Skonfiguruj alias `staging` dla gałęzi `develop` (opcjonalnie).
5. Push na `develop` → Preview/Staging. PR → Preview URL. Merge do `master` → Production.
6. W razie problemu użyj Instant Rollback do poprzedniego builda.

---
