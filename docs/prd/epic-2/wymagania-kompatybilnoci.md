# Wymagania kompatybilności
- Brak zmian w kontrakcie FE↔BFF dla `POST /api/audio/generate`:
  - Wejście: multipart/form-data z `file`, `artistName`, `artistDescription`, `language?`.
  - Wyjście: JSON z `language`, `text`, `outline`, `modelName`, `tokensUsed` (+ standard `ApiError`).
- UI zgodny z `docs/front-end-spec.md` i `docs/architecture/6-components.md`.
