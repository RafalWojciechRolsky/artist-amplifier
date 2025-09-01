# 15. Security and Performance

Minimalny, praktyczny zestaw zasad bezpieczeństwa i wydajności dla MVP (Next.js + Vercel, BFF, brak storage).

## 15.1 Założenia i model zagrożeń (MVP)

- Brak trwałego storage – redukcja ryzyka wycieku danych w spoczynku.
- Sekrety tylko na backendzie (Route Handlers). FE nie łączy się z zewnętrznymi API.
- Wejścia użytkownika: formularz tekstowy + plik audio (≤ 50 MB) → walidowane na FE i BE.

## 15.2 Kontrole po stronie serwera (BFF)

- Sekrety/ENV: `MUSIC_AI_API_KEY`, `MUSIC_AI_WORKFLOW_ANALYZE`, `LLM_API_KEY`, `LLM_MODEL` – przechowywane w Vercel ENV (Production/Staging/Preview). Brak `NEXT_PUBLIC_`.
- Walidacja wejścia:
  - `/api/audio/generate`: `multipart/form-data` z `file` (`audio/mpeg|audio/wav`, ≤ 50 MB) oraz polami tekstowymi. Odrzucaj inne typy/rozmiary kodami 400/413/415.
- CORS: ten sam origin; jeśli konieczne, whitelist domen w Route Handlers.
- Błędy: jeden format `ApiError` (sekcja 5.3). Nie ujawniaj detali providerów w odpowiedzi (tylko skrótowy `code`).
- Podstawowe nagłówki bezpieczeństwa (Vercel domyślne).
- Pliki tymczasowe: zapisuj do `/tmp` tylko na czas żądania; po użyciu `unlink`. Brak buforowania w długotrwałej pamięci.

## 15.3 Logowanie (minimalne)

- Podstawowe logi: endpoint, kody HTTP, błędy.
- Nie loguj PII ani zawartości plików.

## 15.4 Cache (podstawowy)

- Statyczne assety: CDN Vercel (domyślne).
- API: `Cache-Control: no-store`.

## 15.5 Wydajność (MVP)

- Upload: ≤ 50 MB; walidacja na FE i BE.
- UI: responsywne; status "Generowanie..." na przycisku.

## 15.6 Optymalizacje (MVP)

- FE: minimalny bundle, Tailwind, zwykły tekst (bez `dangerouslySetInnerHTML`).
- BE: Node runtime dla SDK, tymczasowe pliki w `/tmp`.

---

## 16.1 Zakres i narzędzia

- Unit: Jest (TypeScript). Brak realnych wywołań sieciowych.
- E2E: Playwright (Chromium) – ścieżka szczęśliwa.

## 16.2 Struktura testów

- Colocation preferowana dla unit: `src/**/__tests__/*.test.ts` lub `*.test.ts` obok modułów.
- E2E: `tests/e2e/*.spec.ts`, fixture audio w `tests/fixtures/` (≤ 1 MB).

## 16.3 Cele testów jednostkowych (przykłady)

- Reducer maszyny stanów (wydziel do `src/lib/state/reducer.ts`).
- Walidacje pliku/ wejścia użytkownika: `src/lib/validators.ts`.
- API clienty (FE): `src/lib/api/audio.ts`, `src/lib/api/press.ts` – mock `fetch` i asercje mapowania `ApiError`.
- Integracje serwerowe (BFF): `src/lib/server/musicai.ts`, `src/lib/server/llm.ts` – mock przez `jest.mock(...)` i test mapowania wyników/błędów.

## 16.4 Testy E2E (smoke)

- Scenariusz: uruchom app → wgraj plik fixture → oczekuj metadanych → klik "Generate" → sprawdź, że pojawił się opis.
- Selektory: `data-testid` w kluczowych elementach (upload, status, generate, output).
- Konfiguracja: `baseURL` do `http://localhost:3000` (dev) lub Preview URL z Vercel.

## 16.5 Mockowanie i izolacja

- Unit: nie używamy sieci. Mock `fetch` (np. `global.fetch = jest.fn()`), mock modułów integracji (`musicai.ts`, `llm.ts`).
- E2E: realny flow end‑to‑end – jeśli zbyt kosztowny, dopuszczalny toggle "mock backend" via ENV w Preview.

## 16.6 Dane testowe i limity

- Fixture audio: mały `.mp3`/`.wav` (≤ 1 MB) z legalnym źródłem, przechowywany w repo.
- Sprawdzenia brzegowe: maksymalny rozmiar pliku, nieobsługiwany MIME, brak wymaganych pól w JSON.

## 16.7 Uruchamianie i CI

- Lokalne: `npm test` (unit), `npm run test:e2e` (Playwright; pierwszy raz `npx playwright install`).
- CI (PR): uruchamiaj unit (`npm test`) i lint; E2E opcjonalnie na gałęzi `develop` lub w oddzielnym jobie z artefaktem wideo/trace.

## 16.8 Pokrycie i kryteria akceptacji

- Minimalne progi (rekomendacja): 70% statements/branches dla modułów `state/`, `validators/`, `api/`.
- PR zielony, gdy: build OK, unit green, E2E smoke zielony na `develop` lub ręczny test na Preview URL.

---
