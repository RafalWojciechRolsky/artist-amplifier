# Opis usprawnienia
- Co dodajemy/zmieniamy: 
  - Realne integracje: Music.ai SDK do analizy audio; OpenAI (non-stream) do generowania tekstu.
  - Branding i UI zgodnie z `docs/front-end-spec.md` (kolory, komponenty, a11y, test hooks).
- Jak integrujemy: 
  - Integracje TYLKO w BFF; sekrety w ENV; retry/backoff przy 429/5xx; mapowanie błędów do standardu `ApiError`.
  - Nie zmieniamy formatu żądania FE (multipart) ani minimalnego kształtu odpowiedzi JSON.
- Kryteria sukcesu: 
  - Prawdziwe wywołania zewnętrznych usług działają w środowisku z ustawionymi sekretnymi kluczami.
  - UI spełnia specyfikację i nie degraduje przepływów 1.1–1.4.
