# 10. Frontend Architecture

Architektura FE jest minimalna (single‑screen, App Router, streaming OFF). Kluczowe zasady poniżej.

## 10.1 Routing

- Jedna trasa: `/` w `src/app/page.tsx` (Server Component jako kontener; interaktywne fragmenty jako Client Components).
- Brak podstron w MVP. Jeśli zajdzie potrzeba, dodamy `/about` lub `/privacy` jako proste Server Components.

## 10.2 Organizacja komponentów

- Prezentacyjne i mało‑stanowe komponenty w `src/components/`.
- Zasada: komponenty interaktywne oznaczamy `"use client"` na górze pliku.
- Nazewnictwo i odpowiedzialności zgodnie z sekcją 6 (Form, FileUpload, Status, Preview, ErrorBanner, GenerateButton).

## 10.3 Zarządzanie stanem

- `useReducer` w `src/app/page.tsx` trzyma maszynę stanów: `idle → generating → readyDescription` + `error`.
- Brak bibliotek global state (Redux/Zustand/React Query) — YAGNI.
- Wymiana danych między komponentami przez propsy i/lub prosty context lokalny ekranu.
- Persistencja w obrębie bieżącej sesji przeglądarki: sessionStorage (bez localStorage/IndexedDB) do odtworzenia postępu po odświeżeniu karty; brak trwałego storage zgodnie z NFR. Klucze i zakres danych zdefiniowane w `docs/front-end-spec.md#state-persistence`.
- Akcja `RESET`: zeruje reducer do stanu `idle`, usuwa klucze `aa:v1:*` z sessionStorage i czyści wartości formularza, meta pliku oraz wygenerowany wynik.

## 10.4 Warstwa usług (API client)

- `src/lib/api/generate.ts` — cienki wrapper `fetch` z:
  - Ustalonymi nagłówkami, obsługą JSON/FormData.
  - Rzucaniem błędów w formacie `ApiError` (z mapowaniem HTTP→`code`).
- Wspólne typy w `src/lib/types.ts`. Walidacje plików w `src/lib/validators.ts`.

## 10.5 Client vs Server Components

- Domyślnie Server Components w App Router; elementy wymagające interakcji/efektów — Client (`"use client"`).
- `page.tsx` może być Server i ładować Client children. Unikamy niepotrzebnego przenoszenia logiki na klienta.

## 10.6 Stylowanie i UI

- Tailwind CSS v4 (utility‑first). Prosty, czytelny layout (mobile‑first).
- Motyw „retro neon” zdefiniowany w `src/app/globals.css` oparty o CSS custom properties:
  - Tokeny: `--neon-primary` (cyan), `--neon-secondary` (magenta), `--color-surface`, `--color-surface-elev`, `--color-text-*`, `--color-border`, `--ui-field-bg`.
  - Klasy narzędziowe (prefiks `aa-`):
    - Typografia: `aa-heading`, `aa-heading-secondary` (neonowe tytuły, cień świetlny).
    - Przyciski: `aa-btn-primary` (główne CTA, cyan glow), `aa-btn-ghost` (drugorzędne, ghost neon), `aa-pulse` (animacja „busy”).
    - Pola: `aa-field` (tło i obramowanie pól), `aa-border` (kolor ramki), `aa-dashed` (styl przerywany).
  - Globalny focus: `*:focus-visible` z wyraźnym konturem dla dostępności.
- Mapowanie użycia w komponentach:
  - `src/app/page.tsx` — `aa-heading` na H1, `aa-heading-secondary` na nagłówku sekcji; przycisk „Generuj” z `aa-btn-primary` i `aa-pulse` w stanie `generating`.
  - `src/components/TextEditor.tsx` — `textarea` z `aa-field` + `aa-border`.
  - `src/components/AudioUpload.tsx` — input typu `file` z `aa-field` + `aa-border aa-dashed`; pomocniczy hint pod polem.
  - `src/components/ActionButtons.tsx` — przyciski kopiuj/pobierz/reset jako `aa-btn-ghost`.
- Spójne stany focus/disabled i kontrasty są zapewnione przez `globals.css`; semantyka, ARIA i logika pozostają bez zmian.

## 10.7 Błędy i UX

- Jeden komponent `ErrorBanner` do prezentacji `ApiError`.
- Blokady i wskaźniki postępu w trakcie generowania. Jasne komunikaty i retry manualny.
- UI nie implementuje automatycznych timeoutów ani fallbacków; błędy z BE prezentowane są z opcją ręcznego ponowienia.

## 10.8 Testy (MVP)

- Jednostkowe: prosta logika reduktora (Jest) i helpery walidacji.
- E2E smoke (Playwright): ścieżka szczęśliwa — upload pliku testowego → gotowy wynik analizy → generacja opisu.

---
