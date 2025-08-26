# Project Brief: Artist Amplifier (MVP)

**Data:** 17 sierpnia 2025

## 1\. Podsumowanie i Główne Cele

### 1.1. Problem

Niezależni artyści muzyczni i małe zespoły często nie mają czasu, budżetu ani wiedzy marketingowej, aby profesjonalnie promować swoją muzykę. Stworzenie dobrego opisu prasowego jest kluczowe dla promocji, ale jest to zadanie trudne i czasochłonne, które odciąga ich od pracy twórczej.

### 1.2. Proponowane Rozwiązanie (MVP)

"Artist Amplifier" to ultralekkie, jednostronicowe narzędzie webowe, które na podstawie minimalnej ilości danych o artyście i jednego pliku audio, natychmiast generuje profesjonalny, gotowy do użycia opis prasowy utworu. Aplikacja ma na celu dostarczenie maksymalnej wartości przy minimalnym wysiłku ze strony użytkownika.

### 1.3. Główny Cel Biznesowy MVP

Błyskawicznie zweryfikować hipotezę, że istnieje realne zapotrzebowanie rynkowe na narzędzie automatyzujące tworzenie kluczowych treści promocyjnych dla muzyków. Celem jest zebranie feedbacku od społeczności i ocena potencjału dalszego rozwoju produktu.

## 2\. Persona Użytkownika (MVP)

- **Profil:** Niezależny Muzyk / Zespół Muzyczny.
- **Scenariusz:** Właśnie kończy pracę nad nowym utworem i chce go jak najszybciej wydać. Potrzebuje "na wczoraj" profesjonalnego opisu, który może wysłać do mediów, wkleić na Spotify czy użyć w swoich mediach społecznościowych.
- **Potrzeby:** Szybkość, prostota, natychmiastowy rezultat. Nie ma czasu na naukę skomplikowanych narzędzi ani na przechodzenie przez proces rejestracji.

## 3\. Zakres Funkcjonalny MVP

### Epik 1: Od Utworu do Profesjonalnego Opisu w 5 Minut

- **Cel Epiku:** Dostarczenie użytkownikowi realnej, namacalnej wartości – gotowego opisu prasowego – w jak najkrótszym czasie i przy minimalnym wysiłku, w ramach jednej sesji.
- **User Story:** Jako artysta, chcę szybko wprowadzić podstawowe informacje o mnie i moim nowym utworze, aby natychmiast otrzymać profesjonalny opis prasowy, który mogę od razu wykorzystać.

### Minimalne, Niezbędne Funkcjonalności (Kroki w Aplikacji)

1. **Krok 1: Wprowadź Dane Artysty (Minimum)**
   - Pole tekstowe: Nazwa artysty/zespołu.
   - Pole tekstowe (textarea): Krótka informacja o artyście (kilka zdań, gatunek, inspiracje).
   - Pole tekstowe (opcjonalne): Link do profilu na Spotify/SoundCloud do pobrania dodatkowego kontekstu.
2. **Krok 2: Prześlij Utwór**
   - Przycisk do uploadu pliku audio (obsługiwane formaty: MP3, WAV).
   - W tle: Plik jest wysyłany do zewnętrznego API (np. music.ai) w celu analizy i uzyskania wyniku analizy audio (np. tempo/BPM, tonacja, energia, tagi nastroju/gatunku).
3. **Krok 3: Wygeneruj i Edytuj Opis**
   - Przycisk "Generuj opis".
   - W tle: Dane od artysty, wynik analizy audio oraz wewnętrzny szablon są wysyłane do modelu językowego (AI), który tworzy opis prasowy.
   - Wyświetlenie wygenerowanego opisu w edytowalnym polu tekstowym (textarea).
4. **Krok 4: Skopiuj lub Pobierz**
   - Przycisk "Kopiuj do schowka".
   - Przycisk "Pobierz jako .txt" lub .md, html, doc.

## 4\. Kluczowe Decyzje i Założenia Techniczne dla MVP

1. **Architektura:** Aplikacja jednostronicowa (Single Page Application - SPA), bez systemu logowania i baz danych użytkowników.
2. **Monetyzacja:** Brak. MVP jest w 100% darmowe.
3. **Zależności Zewnętrzne:** Kluczowa zależność techniczna od zewnętrznego API do analizy audio (np. music.ai) oraz od API modelu językowego do generowania tekstu.
4. **Interfejs Użytkownika:** Wszystkie generowane treści muszą być w pełni edytowalne przed skopiowaniem/pobraniem.
5. **Prywatność:** Żadne dane (pliki audio, informacje o artyście) nie są trwale przechowywane na serwerze po zakończeniu sesji użytkownika.

## 5\. Funkcjonalności Poza Zakresem MVP (Pomysły na Przyszłość)

Następujące funkcje są świadomie wykluczone z MVP, ale będą brane pod uwagę w dalszym rozwoju produktu, jeśli hipoteza MVP zostanie potwierdzona:

- Rozbudowany Profil Artysty (konta użytkowników, logowanie, zapisywanie profili, biblioteka mediów).
- Generator Treści do Social Media (tworzenie postów, grafik, krótkich wideo).
- Promocja Koncertów i Dystrybucja do Mediów.
- Inteligentny Asystent Strategiczny (AI) w formie interfejsu konwersacyjnego.

## 6\. Następne Kroki (Handoff zgodny z BMAD)

### 6.1. Handoff do Product Managera (PM)

Ten dokument "Project Brief" stanowi fundament dla dalszych prac. Zgodnie z metodyką BMAD, następnym krokiem jest przekazanie go do roli Product Managera (PM) w celu stworzenia szczegółowego **Product Requirements Document (PRD)**.

**Zadanie dla PM:**

- Na podstawie tego briefu, stwórz dokument PRD.
- Rozpisz **Epik 1 (MVP)** na konkretne, sekwencyjne User Stories z precyzyjnymi kryteriami akceptacji.
- Zdefiniuj dokładne wymagania niefunkcjonalne (np. dotyczące wydajności, obsługiwanych formatów plików, czasu odpowiedzi API).
- Przygotuj dokument PRD w taki sposób, aby mógł on posłużyć jako bezpośredni wkład dla Architekta i Deweloperów.
