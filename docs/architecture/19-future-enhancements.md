# 19. Future Enhancements

Poniższe pozycje **nie są** wymagane do uruchomienia MVP, ale zostały zidentyfikowane jako potencjalne usprawnienia:

- **Zaawansowany rate-limiting** – middleware edge/proxy lub dedykowany serwis (Redis, Upstash) z trwałą pamięcią i metrykami.
- **Automatyczne testy E2E (Playwright)** – pełna ścieżka 1→4 na głównych przeglądarkach, test regresji wizualnej.
- **Monitorowanie Web Vitals** – próbkujące raportowanie LCP/INP/CLS do zewnętrznego endpointu (np. `web-vitals`).
- **Rozszerzona obserwowalność** – zbieranie trace/logów w OpenTelemetry.
- **Retry/Backoff konfigurowalny** – adaptive throttling dla Music.ai/LLM.

---

- Komunikaty krótkie, nietechniczne. Dłuższe detale tylko w `details`/logach.
- Wersje językowe PL/EN (spójne z `UILanguage`).

---
