# Specyfikacja UI/UX Artist Amplifier

## Wprowadzenie

Ten dokument definiuje cele doświadczenia użytkownika, architekturę informacji, przepływy użytkownika oraz specyfikacje projektowe interfejsu użytkownika aplikacji Artist Amplifier. Stanowi on podstawę dla projektowania wizualnego i developmentu front‑end, zapewniając spójne i zorientowane na użytkownika doświadczenie.

## Kontekst i zakres

- Wizja produktu: Lekki, jednostronicowy (SPA) mechanizm, który generuje profesjonalny opis prasowy utworu na podstawie danych artysty (nazwa + opis) i pojedynczego pliku audio (zob. `docs/brief.md`).
- Cel MVP: Szybka weryfikacja potrzeb rynku i zbieranie informacji zwrotnych od realnych użytkowników (zob. `docs/prd.md`).
- Główna persona: Niezależny muzyk lub mały zespół oczekujący szybkości, prostoty i natychmiastowych efektów bez onboardingu czy rejestracji.

## Ogólne cele UX i zasady

### Docelowe persony użytkowników

- Niezależny muzyk (główna) — szybkość, brak onboardingu, często na urządzeniach mobilnych.

### Cele użyteczności (MVP)

- Czas do pierwszego opisu ≤ 5 minut.
- Prosty przepływ: dane → plik → generuj → wynik.
- Jeden ekran (single page).
- Podstawowa dostępność: labels, kontrast, keyboard access.

### Zasady projektowe (MVP)

1. **Prostota ponad wszystko** — minimalne UI, tylko niezbędne elementy.
2. **Jeden ekran** — wszystkie zadania na jednej stronie bez skomplikowanej nawigacji.
3. **Podstawowe stany** — gotowe/przetwarzanie/sukces/błąd.
4. **Edytowalny wynik** — wygenerowany tekst można edytować.
5. **Funkcjonalność nad estetyką** — działający MVP bez ozdobników.

## Architektura informacji (IA) {#ia}

### Mapa strony / Inwentaryzacja ekranów

```mermaid
graph TD
  A[Single Page - Artist Amplifier Stepper 1-4] --> S1[1 Dane artysty]
  A --> S2[2 Analiza utworu]
  A --> S3[3 Generowanie opisu]
  A --> S4[4 Gotowe]

  S1 -->|Dane poprawne| S2
  S2 -->|Plik zaakceptowany| S3
  S3 -->|Wynik wygenerowany| S4

  S4 --> R[Reset]
  R --> S1

  S3 --> ST1[Analiza audio]
  S3 --> ST2[Generowanie]
  S3 --> ST3A[Blad analizy]
  S3 --> ST3B[Blad generowania]
  S3 --> ST4[Wynik edytowalny opis]

```

### Struktura nawigacji (MVP)

- Prosty progress indicator pokazujący aktualny krok (1-4).
- Brak skomplikowanej nawigacji - naturalny scroll na jednej stronie.

## Przepływy użytkownika {#flows}

### Warunki wstępne steppera

- Krok 2 wymaga poprawnych danych z kroku 1 (nazwa + opis zwalidowane i zapisane w sesji)
- Krok 3 wymaga poprawnych danych z kroku 1 + zaakceptowany plik z kroku 2
- Krok 4 wymaga wygenerowanego wyniku

#### Bramkowanie steppera

```mermaid
graph TD
  S1[1 Dane Artysty - poprawne] -->|tak| S2[2 Analiza utworu - zaakceptowany]
  S2 -->|tak| S3[3 Generowanie opisu - wynik]
  S3 -->|tak| S4[4 Gotowe]

```

### Przepływ 1: Wprowadzanie Danych Artysty {#flow-1}

- **Cel użytkownika:** Wprowadzić nazwę i opis artysty, aby spersonalizować opis.
- **Punkty wejścia:** Start ekranu; link z materiałów promocyjnych.
- **Kryteria sukcesu:** Oba pola zwalidowane; dane zapisane w sesji; a11y OK.
- **Stan po:** Poprawne dane w stanie sesji; brak błędów walidacji.

```mermaid
graph TD
  A[Start] --> B[Wpisz Nazwę - wymagane]
  B --> C[Wpisz Opis - wymagane, 50–1000 znaków]
  C --> D{Walidacja}
  D -- OK --> E[Zapis w stanie sesji]
  D -- Błąd --> C1[Pokaż komunikat i fokus na polu]
  E --> F[Gotowe do kroku 2]
```

- **Przypadki krawędziowe i błędy:** Puste/za krótkie/za długie pola → komunikaty i fokus; auto-scroll do błędnego pola; aria-describedby dla błędów; sesja utrzymuje dane po odświeżeniu; brak przewijania horyzontalnego przy 320px.
- **Notatki:** PRD 1.1 (AC 1–7).

### Przepływ 2: Analiza Utworu {#flow-2}

- **Warunki wstępne:** Flow 1 poprawny.
- **Cel użytkownika:** Wskazać plik .mp3/.wav ≤ 50MB do analizy.
- **Punkty wejścia:** Przycisk „Wybierz plik”.
- **Kryteria sukcesu:** Walidacja formatu/rozmiaru; możliwość zmiany pliku; stan „Gotowe do generowania”.
- **Stan po:** Plik zaakceptowany i gotowy dla kroku 3.

```mermaid
graph TD
  A[Wybierz plik] --> B{Walidacja format/rozmiar}
  B -- OK --> C[Plik zaakceptowany]
  B -- Błąd --> B1[Pokaż komunikat i pozwól wybrać ponownie]
  C --> D[Stan: Gotowe do generowania]
```

- **Przypadki krawędziowe i błędy:** Zbyt duży/nieobsługiwany format → komunikat i ponowny wybór; anulowanie wyboru → pozostaje poprzedni stan; „Zmień plik” dostępne.
- **Notatki:** PRD 1.2 (AC 1–7).

### Przepływ 3: Generowanie Opisu {#flow-3} (MVP)

- **Warunki wstępne:** Flow 1 + 2 poprawne.
- **Cel użytkownika:** Wygenerować edytowalny opis.
- **Punkty wejścia:** Klik „Generuj opis".

```mermaid
graph TD
  A[Klik: Generuj opis] --> B[Przetwarzanie...]
  B -->|Sukces| C[Wynik w edytowalnym polu]
  B -->|Błąd| D[Komunikat błędu + przycisk Spróbuj ponownie]
  D --> A
```

- **Uproszczona obsługa błędów:** Jeden komunikat "Coś poszło nie tak. Spróbuj ponownie." + przycisk ponowienia.
- **Notatki:** PRD 1.3 (AC 1–7).

### Przepływ 4: Gotowe {#flow-4}

- **Cel użytkownika:** Skopiować lub pobrać opis.
- **Punkty wejścia:** Pod textarea: „Kopiuj do schowka”, „Pobierz .txt”, „Reset”.
- **Kryteria sukcesu:** Pełna zawartość skopiowana/pobrana; potwierdzenie akcji; zsanityzowana nazwa pliku; „Reset” czyści sessionStorage (`aa:v1:*`) i lokalny stan UI.
- **Stan po:** Toast „Skopiowano!”; plik `nazwa_artysty_opis.txt` pobrany; po „Reset” — UI przywrócony do Kroku 1 (pola/plik/wynik wyczyszczone).

```mermaid
graph TD
  A[Edytowalny opis gotowy] --> B[Klik: Kopiuj]
  A --> C[Klik: Pobierz .txt]
  B --> B1[Toast „Skopiowano!”]
  C --> C1[Plik nazwa_artysty_opis.txt]
```

- **Przypadki krawędziowe i błędy:** Brak uprawnień do schowka → komunikat i instrukcja ręczna; sanitizacja nazwy pliku.
- **Notatki:** PRD 1.4 (AC 1–5).

### Śledzenie AC → PRD {#traceability}

- Mapowanie przepływów w tej specyfikacji na Story w `docs/prd.md`:

| Flow w spec                           | PRD Story | Zakres                                                |
| :------------------------------------ | :-------- | :---------------------------------------------------- |
| Flow 1 — Wprowadzanie Danych Artysty  | Story 1.1 | Formularz, walidacja, zapis w sesji                   |
| Flow 2 — Analiza Utworu               | Story 1.2 | Wybór/zmiana pliku, walidacja, stany analizy          |
| Flow 3 — Generowanie Opisu            | Story 1.3 | Analiza → Generowanie, edycja, anulowanie, ponowienie |
| Flow 4 — Gotowe                       | Story 1.4 | Kopiuj, Pobierz .txt, toast sukcesu                   |

## Makiety (tekstowe) {#wireframes}

Opis poniżej stanowi źródło prawdy dla układu ekranów (tekstowo, bez plików graficznych).

### Ekran: Jedna strona — Desktop (≥1024px)

- Cel: Zrealizować 4 kroki na jednej stronie z jasnym gatingiem i stanami.
- Kluczowe elementy:
  - Sticky Stepper (1–4) z wyróżnieniem bieżącego kroku; przyszłe kroki wyłączone do spełnienia warunków wstępnych
  - Krok 1: Nazwa (input), Opis (textarea + licznik 50–1000, walidacja inline)
  - Krok 2: Wybór pliku (.mp3/.wav ≤ 50MB), nazwa pliku, „Zmień plik”, walidacja format/rozmiar
  - Krok 3: „Generuj opis” ze stanami: „Analiza audio…” → „Generowanie…”, przycisk Anuluj/Stop
  - Krok 3 wynik: Edytowalne textarea (duże pole), aria-live dla statusów
  - Krok 4: „Kopiuj do schowka”, „Pobierz .txt”, „Reset” + toast „Skopiowano!”
- Uwagi dotyczące interakcji:
  - Aktywacja ściśle zależna od warunków wstępnych (1→2→3→4)
  - Po błędach: fokus na polu/bieżącej akcji; ponowienie tylko nieudanego etapu
  - aria-describedby dla błędów, aria-live=polite dla statusów

#### Struktura treści (kolejność DOM)

1. Nagłówek: Sticky Stepper (1–4)
2. Sekcja: Krok 1 (formularz Nazwa/Opis)
3. Sekcja: Krok 2 (Wybór/Zmiana pliku, walidacja)
4. Sekcja: Krok 3 (Przycisk „Generuj opis”, status/Anuluj, textarea wyniku)
5. Sekcja: Krok 4 (Kopiuj/Pobierz, toasty)
6. Stopka: proste stopki informacyjne (opcjonalnie)

#### Landmarks i nagłówki

- `header` (Stepper), `main` (sekcje kroków), `footer`
- Hierarchia H2/H3 zgodna z sekcjami; linki-kotwice do `#flow-1..4`

#### Odstępy i wymiary (desktop)

- Szerokość treści ~960px, wyśrodkowana; marginesy boczne 24px+
- Siatka odstępów: 8/12/16/24; przyciski: wysokość ~40–44px
- Textarea wynikowa: min-wys. ~240–320px; rośnie do bezpiecznej wysokości

#### Stany

- Puste: pola formularza z hintami; brak błędów
- Ładowanie: „Analiza audio…/Generowanie…” + spinner; akcje konfliktowe wyłączone
- Błąd: blok błędu nad właściwym obszarem; fokus na „Ponów”/polu

##### Mikro-wireframe (ASCII) — Desktop

```text
+----------------------------------------------------------------------------------+
| [Stepper — sticky]  1 Dane artysty  |  2 Analiza utworu  |  3 Generowanie opisu  |  4 Gotowe    |
+----------------------------------------------------------------------------------+
| H2: Krok 1 — Dane Artysty                                                       |
| Nazwa:  [______________________________]                                        |
| Opis:   [ textarea (50–1000) ............................................... ] |
|         (licznik: 0/1000)                                                      |
|                                                                                |
| H2: Krok 2 — Analiza Utworu                                                    |
| [Wybierz plik]   nazwa_pliku.mp3    [Zmień plik]                               |
| (Obsługiwane: .mp3, .wav; ≤50MB)                                               |
|                                                                                |
| H2: Krok 3 — Generowanie Opisu                                                 |
| [Generuj opis]     Status: Analiza audio... / Generowanie...      [Anuluj]           |
| [ edytowalne textarea wyniku .............................................. ] |
|                                                                                |
| H2: Krok 4 — Gotowe                                                            |
| [Kopiuj do schowka]     [Pobierz .txt]     [Reset]                             |
+----------------------------------------------------------------------------------+
```

### Ekran: Jedna strona — Mobile (320–390px)

- Cel: Mobile-first, minimal scroll, stała widoczność postępu i akcji.
- Kluczowe elementy:
  - Skompaktowany sticky Stepper (1–4) u góry; cele dotyku ≥44px
  - Pola w kolumnie; etykiety nad polami; licznik znaków inline
  - Sticky pasek statusu+Anuluj podczas długich operacji (nie zasłania pól; keyboard-aware)
  - Sekcja akcji (Kopiuj/Pobierz) nie nachodzi na textarea; toasty nieblokujące
- Uwagi dotyczące interakcji:
  - Auto-scroll do pierwszego błędnego pola i fokus
  - Brak przewijania horyzontalnego przy 320px; kontrast ≥ 4.5:1

#### Struktura treści (kolejność DOM)

1. Nagłówek: skompaktowany Sticky Stepper (≥44px cele dotyku)
2. Krok 1: pola w kolumnie, etykiety nad, licznik inline
3. Krok 2: wybór pliku, nazwa pliku, „Zmień plik”, walidacja
4. Krok 3: sticky pasek statusu+Anuluj podczas długich operacji; textarea wyniku
5. Krok 4: sekcja akcji pod textarea; toasty nieblokujące

#### Landmarks i nawigacja

- `header` (Stepper), `main` (sekcje), brak zbędnych bocznych paneli
- Kotwice do kroków; powrót do zakończonych kroków dozwolony

#### Odstępy i wymiary (mobile)

- Marginesy boczne ~16px; odstępy 8/12/16
- Sticky pasek nie zasłania pól (keyboard-aware)

#### Stany

- Identyczne jak desktop, z priorytetem czytelności na małych ekranach

##### Mikro-wireframe (ASCII) — Mobile

```text
+----------------------------------------------+
| [1] [2] [3] [4]   (Stepper — sticky)         |
+----------------------------------------------+
| Krok 1 — Dane Artysty                         |
| Nazwa                                         |
| [____________________]                        |
| Opis                                          |
| [ textarea (50–1000) ]  (licznik)             |
|                                              |
| Krok 2 — Analiza Utworu                       |
| [Wybierz plik]                                |
| nazwa_pliku.mp3    [Zmień plik]               |
|                                              |
| Krok 3 — Generowanie Opisu                    |
| [Generuj opis]                                |
| ── sticky pasek statusu + Anuluj ──────────── |
| Status: Analiza audio...           [Anuluj]         |
| [ textarea wyniku ]                           |
|                                              |
| Krok 4 — Gotowe                               |
| [Kopiuj]     [Pobierz .txt]     [Reset]       |
+----------------------------------------------+
```

## Dostępność (MVP - Podstawowa) {#a11y}

### Zasady i cele (MVP)

- Kontrast tekstu ≥ 4.5:1.
- Podstawowa obsługa klawiatury (Tab, Enter, Space).
- Widoczne etykiety dla wszystkich pól formularza.
- Podstawowe komunikaty błędów.
- Język strony ustawiony na `pl-PL`.

### Kryteria dla każdego przepływu

- Flow 1 (Dane Artysty):
  - Etykiety i opisy (nazwa, opis) jednoznaczne; licznik znaków ogłaszany; limity opisane.
  - Walidacja inline: komunikat błędu powiązany przez `aria-describedby`; auto-scroll + fokus na polu.
- Flow 2 (Przesyłanie utworu):
  - Pole pliku opisane (akceptowane formaty/rozmiar) w tekście, nie tylko w atrybucie accept.
  - Błędy formatu/rozmiaru ogłaszane; przycisk „Zmień plik” dostępny z klawiatury.
- Flow 3 (Generowanie i Edycja):
  - Statusy „Analiza audio…”/„Generowanie…” ogłaszane przez `aria-live`/`role="status"`.
  - „Anuluj/Stop” fokusowalny; po anulowaniu zachowaj fokus na najbliższej akcji.
  - Po błędzie: komunikat opisowy, fokus na przycisku „Ponów” lub odpowiednim polu.
  - Ochrona przed zamknięciem/odświeżeniem w trakcie operacji; ostrzeżenie z opcją anulowania.
- Flow 4 (Kopiuj/Pobierz):
  - Nazwy dostępności dla przycisków; toast sukcesu ogłaszany (polite) i nieblokujący.
  - Nazwa pliku zsanityzowana i komunikowana w tekście.
  - Przycisk „Reset” dostępny z klawiatury; po aktywacji czyści stan sesji i przenosi fokus do pierwszej sensownej akcji Kroku 1.

### Plan testów (ręczne + automatyczne)

- Klawiatura: kompletna ścieżka 1→4; widoczny focus; brak pułapek.
- Czytniki ekranu: NVDA/VoiceOver — odczyt etykiet, błędów, statusów live, toasta.
- Mobile: TalkBack — dostępność elementów dotykowych i sticky pasków.
- Kontrast: weryfikacja kolorów dla tekstu i komponentów (≥4.5:1 / ≥3:1).
- Automaty: axe DevTools/Lighthouse — 0 krytycznych błędów dostępności.
- Unload protection: podczas długich operacji (Analiza/Generowanie) wyświetla się ostrzeżenie przed zamknięciem/odświeżeniem; weryfikuj czytelność, brak utraty danych i możliwość kontynuacji.

### Lista akceptacyjna

- [ ] Wszystkie akcje dostępne z klawiatury; focus-visible konsekwentny.
- [ ] Etykiety i błędy formularzy powiązane i ogłaszane.
- [ ] Statusy async ogłaszane przez aria-live/role=status; nie przerywają pracy.
- [ ] Brak poziomego scrolla przy 320px; 200% zoom OK.
- [ ] Kontrast spełnia progi WCAG; cele dotyku ≥44×44.

## Komponenty (MVP - Minimalne) {#components}

### Komponenty (atomy/molekuły)

- Button
  - Warianty: primary, secondary, ghost; Rozmiary: md (domyślny)
  - Stany: default, hover, focus-visible, active, disabled, loading
  - Zawartość: etykieta; opcjonalny spinner (loading). A11y: role=button, aria-busy podczas ładowania
- Input (text) / Textarea
  - Z etykietą, pomocą i błędem; licznik dla textarea (50–1000)
  - Stany: default, focus-visible, error, disabled
  - A11y: label for/id; aria-describedby łączy pomoc/błąd; ogłaszaj zmiany licznika
- FileInput
  - Accept: .mp3,.wav; Max: 50MB; pokazuje nazwę pliku; akcja „Zmień plik”
  - Stany: idle, validating, accepted, error
  - A11y: dostępne z klawiatury; komunikaty błędów ogłaszane; jasne wskazówki dot. formatów/rozmiaru
- Stepper
  - Kroki 1–4 ze stanami: disabled, active (aria-current=step), completed
  - Możliwość powrotu do ukończonych kroków; przyszłe kroki wyłączone do spełnienia warunków wstępnych
- StatusBanner / Progress
  - Pokazuje „Analiza audio…”, „Generowanie…”, błędy; opcjonalny spinner
  - A11y: role="status" lub aria-live="polite"; nieblokujące
- Toast
  - Typy: success, error; auto‑zamykanie 3–5 s; ręczny przycisk zamknięcia
  - A11y: aria-live=polite; nie przejmuje fokusu
- SectionHeader
  - Tytuł + opcjonalny opis; kotwice do głębokich linków
- FormField (wrapper)

  - Standaryzuje etykietę, pomoc, błąd, odstępy i układ

- ResetButton
  - Akcja: przywraca UI do stanu początkowego (Krok 1); czyści sessionStorage (`aa:v1:*`)
  - A11y: dostępny z klawiatury; po aktywacji fokus wraca do pierwszej sensownej akcji Kroku 1
  - Test: `data-testid="reset-button"`; semantyka zdarzenia: `onReset()`

### Stany i interakcje

- Traktowanie focusu: 2px kontur o wysokim kontraście; respektuje prefers-contrast
- Zasady ładowania: wyłącz kolidujące akcje; pokaż spinner + tekst statusu
- Zasady błędów: inline, konkretne; ścieżki odzyskiwania (ponów, zmień plik) per flow

### Tokeny projektowe (role, nie finalne heksy)

- Role kolorów: surface, surface-elev, text-primary, text-secondary, accent, accent-contrast, success, warning, error, border
- Skala odstępów: 4, 8, 12, 16, 24, 32
- Promienie: 6, 10
- Cienie: sm, md (niekrytyczne; respektuj reduced-motion dla animowanych cieni)
- Typografia: Bazowa 16px; Skala 12, 14, 16, 18, 20, 24, 32; Wagi 400/600

### QA / Testy (MVP)

Minimalny zakres wymagany dla wydania MVP:

- **Unit tests** — walidacja logiki i komponentów.
- **Manual smoke test** — pełny flow 1→4 na mobile (≈360 px) i desktop (≥1024 px).

Rozszerzone automaty (Playwright), Lighthouse i pełna matryca viewportów przeniesiono do [Future Enhancements](#future-enhancements).

### Mechanizmy dostępności

{{ ... }}

- Każdy element interaktywny: dostępny z klawiatury, widoczny fokus, poprawne name/role/value
- aria-describedby łączy pomoc/błąd; aria-live lub role=status dla stanów asynchronicznych
- Pole pliku ma jasne instrukcje dla czytników ekranu (format, rozmiar). Toasty ogłaszane grzecznie

### Test Hooks (data-testid i role) {#test-hooks}

- Przycisk „Generuj opis”: `data-testid="generate-button"`
- Przycisk „Anuluj”: `data-testid="cancel-button"`
- Pasek statusu: `role="status"`, `aria-live="polite"`, `data-testid="status-banner"`
- Pole pliku: `data-testid="file-input"`
- Przycisk „Ponów” (analiza/generowanie): `data-testid="retry-analyze"` / `data-testid="retry-generate"`
- Textarea wyniku: `data-testid="result-textarea"`
- Przyciski „Kopiuj”/„Pobierz .txt”: `data-testid="copy-button"` / `data-testid="download-button"`
- Przycisk „Reset”: `data-testid="reset-button"`
- Stepper: `data-testid="stepper"`; aktywny krok z `aria-current="step"`

### Kontrakt implementacyjny (przekazanie do dev)

- Zdarzenia: onGenerate, onCancel, onRetry, onCopy, onDownload, onFileChange, onReset
- Semantyka zdarzeń: onCancel może wystąpić w fazie 'analyze' lub 'generate'; callback onCancel({ phase: 'analyze' | 'generate' })
- Powierzchnia walidacji: zwraca { valid: boolean, errors: {field: message} }
- i18n: wszystkie teksty widoczne dla użytkownika przez słownik messages; język strony ustawiony na pl-PL

### Persistencja stanu (MVP) {#state-persistence}

- Cel: Spełnić PRD (`docs/prd.md`, Story 1.3, AC 7): „Stan interfejsu jest utrzymany w obrębie bieżącej sesji (odświeżenie nie resetuje postępu)”.
- Mechanizm: sessionStorage (po stronie przeglądarki) — dane przetrwają odświeżenie, znikają po zamknięciu karty/okna. Brak localStorage/IndexedDB w MVP.
- Przestrzeń nazw kluczy i wersjonowanie: prefix `aa:v1:`.
  - `aa:v1:step` → number | '1' | '2' | '3' | '4' (aktywny krok / gating)
  - `aa:v1:artist` → JSON { artistName: string, artistDescription: string }
  - `aa:v1:analysis` → JSON (subset wyników potrzebnych w UI), np. { durationSec, bpm?, musicalKey?, energy? }
  - `aa:v1:description` → JSON { language: 'pl'|'en', text: string }
- Czego NIE zapisujemy:
  - Pliku audio ani jego binariów (wymóg prywatności/NFR). Dopuszczalne meta (nazwa, typ, rozmiar) trzymane tylko w pamięci runtime lub w `aa:v1:fileMeta` (opcjonalnie), bez zawartości.
- Zasady lifecycle:
  - Zapisywać po każdej udanej walidacji Kroku 1, akceptacji pliku w Kroku 2 i sukcesie generowania w Kroku 3.
  - Przy starcie aplikacji: odczytać klucze; ustawić krok/gating tak, by odtworzyć postęp. Brak automatycznego wznowienia requestów sieciowych.
  - Przycisk „Reset” (MVP, wymagany): usuwa `aa:v1:*` i resetuje UI do Kroku 1 (czyści pola formularza, meta pliku i wygenerowany wynik).
  - Migracje: zmiana schematu → nowy prefix (np. `aa:v2:`); stary namespace można ignorować.
- Unload‑protection:
  - Podczas trwających operacji (Analiza/Generowanie) rejestrujemy ostrzeżenie `beforeunload`. Po zakończeniu operacji event jest zdejmowany.
- A11y:
  - Odtwarzanie stanu po refresh nie przenosi fokusu gwałtownie; fokus na pierwszej sensownej akcji w aktywnym kroku. Statusy ogłaszane przez `aria-live`/`role="status"`.

## Stany (pusty/ładowanie/błąd) {#states}

### Puste stany

- Aplikacja po starcie: kroki 2–4 nieaktywne; copy kontekstowe zachęcające do uzupełnienia Krok 1.
- Krok 1: pola puste z krótkimi hintami (placeholder/description), licznik znaków 0/1000.
- Krok 2: brak wybranego pliku → komunikat o akceptowanych formatach/rozmiarze.
- Krok 3: brak wyniku do edycji do czasu powodzenia generowania.

Przykłady copy:

- Krok 1: „Podaj nazwę i krótki opis artysty (50–1000 znaków).”
- Krok 2: „Wybierz plik .mp3 lub .wav (≤ 50MB).”

### Copy checklist (stany i komunikaty) {#copy-checklist}

- Każdy komunikat ma tytuł + krótki opis + jasną akcję naprawczą.
- Unikaj żargonu; jeśli konieczny (np. timeout), dodaj proste wyjaśnienie.
- CTA w trybie rozkazującym i konkretne (np. „Ponów analizę”, „Zmień plik”).
- Toasty: nieblokujące, auto‑zamykanie 3–5 s, możliwość ręcznego zamknięcia.
- Komunikaty stanów mówią „co dalej” (kolejny krok lub akcja).
- Schowek: pokaż fallback (zaznacz + Ctrl/Cmd+C) przy braku uprawnień.

### Stany ładowania

- Analiza → „Analiza audio…” z nieblokującym `role="status"`/`aria-live="polite"`; spinner.
- Generowanie → „Generowanie…” analogicznie; brak skoków layoutu; CTA konfliktowe wyłączone.
- Mobile: sticky pasek statusu + „Anuluj”; nie zasłania pól (keyboard-aware).
- Unload-protection: ostrzeżenie przy zamknięciu/odświeżeniu trwającej operacji (Analiza/Generowanie).

### Stany błędu

- Błąd analizy (Flow 3):
  - Tytuł: „Nie udało się przeanalizować pliku.”
  - Treść: krótka przyczyna, instrukcja naprawy (np. format/rozmiar).
  - Akcje: „Zmień plik”, „Ponów analizę”. Fokus na akcji naprawczej.
- Błąd generowania (Flow 3):
  - Tytuł: „Nie udało się wygenerować opisu.”
  - Treść: spróbuj ponownie; dane z Kroków 1–2 pozostają.
  - Akcje: „Ponów generowanie”, „Anuluj”.
- Brak uprawnień do schowka (Flow 4):
  - Tytuł: „Nie można skopiować do schowka.”
  - Treść: pokaż instrukcję ręczną (zaznacz + Ctrl/Cmd+C).
- Timeout/dostawca: jasny komunikat + bezpieczne ponowienie tylko dla nieudanego etapu.
- W stanie błędu dostępny „Reset” — szybki powrót do Kroku 1 (czyści sessionStorage `aa:v1:*` i lokalny stan UI).

### A11y dla stanów

- Statusy: `aria-live="polite"` lub `role="status"`; nie przejmują focusu.
- Błędy: opisowe, powiązane przez `aria-describedby`; auto-scroll i fokus na akcji.
- `onCancel({ phase })` dostępne z klawiatury; po anulowaniu fokus wraca do najbliższej sensownej akcji.

### Lista akceptacyjna

- [ ] Empty: jasne wskazówki co dalej na każdym kroku; brak mylących CTA.
- [ ] Loading: brak CLS; CTA konfliktowe wyłączone; status ogłaszany SR.
- [ ] Error: komunikat z przyczyną i instrukcją naprawy; focus na akcji naprawczej.
- [ ] Ponowienie tylko dla nieudanego etapu (analiza vs generowanie).
- [ ] Unload-protection działa podczas Analiza/Generowanie.

## Branding i przewodnik stylu {#branding}

### Esencja marki i ton

- Ton: nowoczesny, odważny, cyfrowy, z nutą retro-futuryzmu (cyberpunk/neon).
- Głos: pomocny, nastawiony na szybki efekt; etykiety akcji w trybie rozkazującym (np. „Generuj opis”).
- Język UI: PL (domyślnie), gotowość do i18n; zwięzłe komunikaty błędów.

### System kolorów (Retro Neon Dark Theme)

Oficjalnym motywem aplikacji jest ciemny motyw "retro neon", który wykorzystuje głęboką czerń i kontrasty z żywymi, neonowymi kolorami, aby stworzyć charakterystyczny, nowoczesny wygląd.

#### Paleta podstawowa

| Rola | Kolor | Hex | Zastosowanie |
| :--- | :--- | :--- | :--- |
| Neon Primary | Turkusowy/Cyan | `#00f2ff` | Główne przyciski, aktywne stany, nagłówki, elementy interaktywne |
| Neon Primary (hover) | Jasny turkus | `#66f9ff` | Stan hover dla głównych elementów |
| Neon Secondary | Magenta | `#ff00ff` | Drugorzędne akcenty, przyciski ghost, dodatkowe wyróżnienia |
| Background | Ciemna czerń | `#1a1a1a` | Główne tło aplikacji |
| Surface | Bardzo ciemny szary | `#121212` | Tło dla głównych sekcji i kontentu |
| Surface-Elevated | Ciemny szary | `#1c1c1f` | Tła dla podniesionych elementów, karty, modale |
| Text Primary | Jasny szary | `#e0e0e0` | Główny tekst, etykiety |
| Text Secondary | Szary | `#9aa4aa` | Tekst pomocniczy, opisy, placeholdery |
| Border | Przezroczysty neon | `rgba(0, 242, 255, 0.35)` | Obramowania, separatory |
| Field Background | Bardzo ciemny szary | `#0f1011` | Tło dla pól formularzy |

#### Kolory funkcjonalne

| Rola | Kolor | Hex | Zastosowanie |
| :--- | :--- | :--- | :--- |
| Success | Zielony | `#22C55E` | Komunikaty sukcesu, potwierdzenia |
| Warning | Pomarańczowy | `#F59E0B` | Ostrzeżenia, komunikaty informacyjne |
| Error | Czerwony | `#EF4444` | Błędy, komunikaty krytyczne |
| Focus | Niebieski | `#3B82F6` | Obramowanie elementów z fokusem (a11y) |

#### Warianty przycisków

| Wariant | Tło | Tekst | Border | Hover/Focus Effects |
| :--- | :--- | :--- | :--- | :--- |
| Primary (`aa-btn-primary`) | `var(--neon-primary)` | `#0b0b0c` | brak | `background-color: var(--neon-primary-hover)`, neonowy `box-shadow` |
| Ghost (`aa-btn-ghost`) | `transparent` | `var(--neon-secondary)` | `1px solid rgba(255, 0, 255, 0.55)` | `background: rgba(255, 0, 255, 0.06)`, neonowy `box-shadow` |

#### Zasady kontrastu

- Tekst na tle: kontrast ≥ 4.5:1 (WCAG AA).
- Elementy interaktywne/stany: kontrast ≥ 3:1.
- Kolory neonowe są używane na ciemnym tle, aby zapewnić maksymalną czytelność i efekt wizualny.

#### Dostępność kolorów

- Paleta zweryfikowana pod kątem dostępności dla osób z daltonizmem.
- Informacje nie są przekazywane wyłącznie za pomocą koloru (zawsze z tekstem/ikoną).
- Tryb wysokiego kontrastu: obsługa `prefers-contrast: more` z ciemniejszymi kolorami tekstu i wyraźniejszymi obramowaniami.

### Typografia

- Preferencja: Inter, system-ui, -apple-system, Segoe UI, Roboto, „Helvetica Neue”, Arial, sans-serif.
- Skala (bazowa 16px): 12, 14, 16, 18, 20, 24, 32; wagi 400/600.
- Zastosowanie: H1 (32/600), H2 (24/600), H3 (20/600), Body (16/400), Small (14/400).

### Odstępy i układ

- Siatka odstępów: 4, 8, 12, 16, 24, 32 (spójna z tokenami).
- Max szerokość treści: ~960px desktop; marginesy boczne 16px mobile.
- Promienie: 6/10; cienie: sm/md (subtelne, bez migotania).

### Ikony i grafiki

- Ikony tylko dla jasności (np. plik/muzyka, sukces/błąd); bez nadmiaru metafor.
- Ilustracje opcjonalne, płaskie, niskokontrastowe tła; brak zdjęć stockowych o krzykliwej estetyce.

### Wytyczne copywritingu

- Etykiety przycisków: czasowniki („Wybierz plik”, „Generuj opis”).
- Błędy: konkretne, z instrukcją naprawy; unikać „wystąpił błąd” bez kontekstu.
- Statusy: krótkie („Analiza audio…”, „Generowanie…”); toasty nieblokujące.

### Logo i zasoby marki

- Logo: TBD (link/plik); wersje na jasnym/ciemnym tle; minimalny rozmiar 24px wysokości.
- Tokeny i style (kolor/typografia/spacing) utrzymywane w repo (bez Figma).

### Przykłady — Rób/Nie rób

- Rób: „Generuj opis” (konkretna akcja), wyraźny focus, kontrast ≥ 4.5:1.
- Nie rób: „Kliknij tutaj”, ściana tekstu bez nagłówków, ikony bez etykiet.

## Strategia responsywności (MVP) {#responsiveness}

### Progi (uproszczone)

- Mobile: ≤768px (główny cel)
- Desktop: >768px (szerokość treści ~960px)

### Zachowanie układu (MVP)

- Formularze: jedna kolumna, etykiety nad polami.
- Prosty progress indicator zamiast skomplikowanego steppera.
- Podstawowy responsive layout bez sticky elementów.

### Gęstość i dotyk

- Cele dotyku ≥44×44px na mobile; w razie potrzeby skala odstępów zmniejszona o jeden stopień.
- Unikaj przewijania horyzontalnego przy 320px. Treść reflow; siatki bez stałych szerokości.

### Wydajność i zasoby

- Brak ciężkich obrazów; tylko ikony wektorowe. Odłóż ładowanie niekrytycznego JS/CSS.
- Szanuj reduced motion; unikaj paralaksy i kosztownych animacji.

### Macierz testów

- Viewporty: 320, 360, 390, 768, 1024.
- Orientacja: portret/pejzaż (mobile).
- Zoom/Reflow: 200% desktop; upewnij się, że nie ma utraty treści; weryfikacja klawiaturą + SR.

### Lista akceptacyjna

- [ ] Brak poziomego scrolla przy 320px; treść czytelna.
- [ ] Stepper czytelny i dostępny w każdej szerokości.
- [ ] Sticky status+Anuluj nie zasłania pól na mobile (keyboard-aware).
- [ ] Działają: Kopiuj/Pobierz na małych ekranach bez kolizji z textarea.
- [ ] Teksty i nazwy plików poprawnie się skracają; pełna treść dostępna SR.

## Animacje (MVP - Minimalne) {#animation}

### Zasady (MVP)

- Brak animacji w MVP - prostota i szybkość implementacji.
- Podstawowe hover states na przyciskach.
- Szanuj `prefers-reduced-motion`.

### Dostępność i ograniczony ruch

- Przy `prefers-reduced-motion`: animacje skrócone do 0–80ms lub wyłączone; brak parallax/ciągłych efektów
- Wszystkie komunikaty dostępne przez `aria-live`/`role=status`; brak migotania

### Ograniczenia wydajności

- Używaj właściwości GPU-friendly (opacity, transform). Unikaj layout thrash (top/left, height)
- Batchuj zmiany (requestAnimationFrame), limituj cienie/blur

### Lista akceptacyjna

- [ ] Brak skoków layoutu przy stanach (CLS≈0)
- [ ] `prefers-reduced-motion` respektowane we wszystkich przypadkach
- [ ] Spinner/Status ma tekst alternatywny i nie przejmuje focusu
- [ ] Toast nie zasłania krytycznych akcji; można szybko zamknąć

## Rozważania wydajnościowe {#performance}

### Docelowe metryki (MVP)

- TTI ≤ 2.5s (Slow 4G, mid-tier device, cold cache)
- LCP ≤ 2.5s, CLS ≤ 0.05
- INP ≤ 200ms (interakcje: klik „Generuj opis”, nawigacja stepper)
- TBT (desktop) ≤ 200ms

### Budżety zasobów (pierwsze wejście)

- JavaScript ≤ 150KB gz (initial); moduły opcjonalne ładowane on-demand
- CSS ≤ 50KB gz (critical CSS małe; reszta async)
- Fonts: ≤ 2 pliki; `font-display: swap`; fallback systemowy
- Obrazy: brak ciężkich; ikony wektorowe; brak bibliotek ikon ważących >30KB
- Audio pliki są WYŁĄCZNIE uploadowane przez użytkownika (nie w paczce)

### Taktyki

- Bundling/Minification: tree-shaking, minify, deduplicate deps
- Loading: `defer`/`async` dla JS; critical CSS inline (mała porcja), reszta `media`/async
- Code-splitting: rozdziel komponenty generatora/statusu; ładuj krok 3 dopiero po spełnieniu prereq
- Fonts: preload tylko jeśli realny zysk; `font-display: swap`; preferuj system-ui
- Caching: `Cache-Control: public, max-age=31536000, immutable` dla fingerprintowanych assetów
- Kompresja: brotli/gzip w serwie; unikaj inline base64 dużych zasobów
- Unikaj ciężkich obliczeń w kliencie; brak przetwarzania audio po stronie UI (deleguj do backendu)
- Unikaj thrashingu layoutu; używaj transform/opacity; batchuj przez rAF

### Monitorowanie i narzędzia

- Lighthouse (Mobile, Throttling): Performance ≥ 90
- Web Vitals (prod): LCP, CLS, INP wysyłane próbkująco (np. `web-vitals`)
- CI: raport Lighthouse przy PR (opcjonalnie); budżety wymuszane skryptem

### Plan testów

- Profile pod obciążeniem: Slow 4G + 4× CPU Throttle, Moto G4/Equiv
- Sprawdź: interakcje (klik „Generuj opis”), responsywność pola edycji, toasty
- Weryfikuj: brak CLS przy zmianach stanów; czasy LCP/INP w granicach

### Lista akceptacyjna

- [ ] Lighthouse Mobile ≥ 90; LCP ≤ 2.5s; CLS ≤ 0.05; INP ≤ 200ms
- [ ] JS ≤ 150KB gz i CSS ≤ 50KB gz dla pierwszego ekranu
- [ ] Brak ciężkiego przetwarzania po stronie klienta (audio)
- [ ] Assety statyczne z długim cache + fingerprint

## Kolejne kroki / Lista przekazania {#handoff}

### Artefakty do przekazania

- Biblioteka komponentów + tokeny (role, nie finalne heksy)
- Lista stringów i i18n (pl-PL, gotowość do tłumaczeń)

### Gotowość do developmentu

- Single-page ze stepperem 1–4; gating jak w `#flows`
- Krok 1: wymagane pola, limity, `aria-describedby`, licznik znaków
- Krok 2: `.mp3/.wav`, ≤50MB, błąd/ponów, „Zmień plik”
- Krok 3: „Analiza audio…”/„Generowanie…”, `onCancel({ phase })`, ponowienie per etap, unload protection
- Krok 4: Kopiuj/Pobierz/Reset, sanityzacja nazwy pliku, toasty sukcesu

### Dostępność (WCAG 2.1 AA)

- Pełna klawiatura + widoczny focus; poprawne name/role/value
- Statusy przez `aria-live`/`role=status`; błędy powiązane; cele ≥44×44px
- Reflow 200% bez utraty treści; kontrast spełnia progi
- Testy: NVDA/VoiceOver/TalkBack; axe; brak krytycznych błędów

### Wydajność

- Budżety: JS ≤150KB gz, CSS ≤50KB gz
- Web Vitals: LCP ≤2.5s, INP ≤200ms, CLS ≤0.05
- Code-splitting, defer/async, cache headers, kompresja (br/gz)

### System projektowy

- Tokeny (kolor/spacing/typografia/radius/shadow) zaimplementowane
- Stany: hover/focus/active/disabled/loading/error/success
- Reduced motion respektowane (`prefers-reduced-motion`)

### Kontrakty komponentów

- Zdarzenia: onGenerate, onCancel({ phase: 'analyze' | 'generate' }), onRetry, onCopy, onDownload, onFileChange, onReset
- Walidacja: `{ valid: boolean, errors: { [field]: message } }`
- i18n: wszystkie stringi z `messages`; `lang` ustawione na `pl-PL`

### QA / Testy (MVP)

Minimalny zakres wymagany dla wydania MVP:

- **Unit tests** — walidacja logiki i komponentów.
- **Manual smoke test** — pełny flow 1→4 na mobile (≈360 px) i desktop (≥1024 px).

Rozszerzone automaty (Playwright), Lighthouse i pełna matryca viewportów przeniesiono do [Future Enhancements](#future-enhancements).

## Future Enhancements {#future-enhancements}

The following improvements are **out of MVP scope** and can be addressed later:

- Automated E2E tests (Playwright) covering full user flows & visual regression integrated with CI.
- Continuous Web Vitals monitoring (LCP, INP, CLS) reporting to analytics endpoint.
- Advanced Lighthouse performance gating in CI.
- Edge or middleware rate-limiting backed by persistent storage for better resilience.
- Extended observability (OpenTelemetry tracing/logging) and configurable retry/backoff for external API calls.

### Otwarte pozycje

- Materiały wizualne (opcjonalnie) — TBD
- Logo/brand assets: TBD

### Akceptacja przekazania

- [ ] UX review

### Dziennik zmian

| Data       | Wersja | Opis                                   | Autor |
| :--------- | :----- | :------------------------------------- | :---- |
| 2025-08-26 | v0.1.0 | Pierwsza wersja specyfikacji front‑end | Rafał |
