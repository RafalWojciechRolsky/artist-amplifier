# **Product Requirements Document (PRD): Artist Amplifier (MVP)**

Data: 17 sierpnia 2025  
Wersja: 1.0  
Autor: John, Product Manager

## **1\. Cele i Kontekst Biznesowy**

### **1.1. Tło**

Ten dokument bazuje na zatwierdzonym "Project Brief: Artist Amplifier MVP (BMAD)". Celem jest stworzenie ultralekkiego narzędzia MVP do weryfikacji hipotezy rynkowej dotyczącej automatyzacji tworzenia treści promocyjnych dla muzyków.

### **1.2. Cele**

- **Dla Użytkownika:** Dostarczenie natychmiastowej wartości w postaci profesjonalnego opisu prasowego przy minimalnym wysiłku.
- **Dla Projektu:** Zebranie danych i opinii od rzeczywistych użytkowników w celu podjęcia decyzji o dalszym rozwoju produktu.

### **1.3. Dziennik Zmian (Change Log)**

| Data       | Wersja | Opis                       | Autor     |
| :--------- | :----- | :------------------------- | :-------- |
| 17.08.2025 | 1.0    | Pierwsza wersja dokumentu. | John (PM) |

## **2\. Wymagania**

### **2.1. Wymagania Funkcjonalne (Functional Requirements)**

Wszystkie wymagania funkcjonalne dla MVP zostały ujęte w ramach jednego Epiku, rozbitego na cztery sekwencyjne User Stories.

### **2.2. Wymagania Niefunkcjonalne (Non-Functional Requirements)**

- **NFR1 (Wydajność):** UI pozostaje responsywne w trakcie wywołań zewnętrznych (analiza audio, generowanie tekstu). Interfejs prezentuje czytelny status etapu (np. "Analiza audio...", "Generowanie...") bez wymogu procentowego paska postępu; dostępność szczegółowego postępu zależy od dostawców. Brak twardego limitu czasu po stronie UI; użytkownik może przerwać oczekiwanie (zatrzymanie pollingu) w dowolnym momencie.
- **NFR2 (Prywatność):** Aplikacja nie może przechowywać żadnych danych wprowadzonych przez użytkownika (plików audio, tekstów) po zakończeniu sesji. Wszystkie dane muszą być przetwarzane w pamięci lub tymczasowo i usuwane natychmiast po przetworzeniu.
- **NFR3 (Użyteczność):** Interfejs musi być w pełni intuicyjny i nie wymagać żadnych instrukcji ani samouczków. Cały proces powinien być możliwy do ukończenia na jednym ekranie (single page).
- **NFR4 (Kompatybilność):** System przesyłania plików musi akceptować formaty .mp3 i .wav. Maksymalny rozmiar pliku to 50MB.
- **NFR5 (Dostępność i Mobile):** Interfejs jest responsywny (mobile‑first) i spełnia podstawowe wymagania a11y (obsługa fokusu, role ARIA, kontrast, czytelne komunikaty błędów).

## **3\. Epik 1 (MVP): Od Utworu do Profesjonalnego Opisu w 5 Minut**

**Cel Epiku:** Dostarczenie użytkownikowi realnej, namacalnej wartości – gotowego opisu prasowego – w jak najkrótszym czasie i przy minimalnym wysiłku, w ramach jednej sesji.

### **Historyjki Użytkownika (User Stories)**

#### **Story 1.1: Wprowadzanie Danych Artysty**

**Jako** artysta, **chcę** wprowadzić podstawowe informacje o sobie, **aby** wygenerowany opis był spersonalizowany i wiarygodny.

- **Kryteria Akceptacji (Acceptance Criteria):**
  1. Użytkownik widzi na ekranie dwa pola do wprowadzenia danych: "Nazwa artysty/zespołu" i "Opis artysty".
  2. Pole "Nazwa artysty/zespołu" jest polem wymaganym.
  3. Pole "Opis artysty" jest polem wymaganym.
  4. Aplikacja poprawnie przechowuje wprowadzone dane w stanie sesji przeglądarki na czas jej trwania.
  5. Pole "Opis artysty" jest polem typu textarea z licznikiem znaków; minimalnie 50, maksymalnie 1000 znaków; walidacja z czytelnym komunikatem w razie naruszenia limitów.
  6. Etykiety i komunikaty walidacyjne są jednoznaczne; kolejność fokusu jest logiczna i zgodna z a11y.
  7. Layout formularza działa na ekranach mobilnych w ramach jednego ekranu (single page).

#### **Story 1.2: Przesyłanie Utworu do Analizy**

**Jako** artysta, **chcę** wskazać plik mojego utworu, **aby** aplikacja mogła go przeanalizować i wykorzystać te dane do stworzenia lepszej notki prasowej o utworze.

- **Kryteria Akceptacji:**
  1. Użytkownik może wskazać plik audio w formacie .mp3 lub .wav (≤ 50MB); po wyborze widoczna jest nazwa pliku.
  2. Walidacja rozmiaru i formatu następuje natychmiast po wskazaniu pliku; w razie naruszenia użytkownik otrzymuje czytelny komunikat.
  3. Przesłanie i analiza audio rozpoczynają się dopiero po kliknięciu przycisku "Generuj opis".
  4. W trakcie analizy interfejs prezentuje status na przycisku: "Analiza audio..."; procentowy pasek postępu nie jest wymagany (szczegóły postępu zależą od dostawcy). Użytkownik może przerwać oczekiwanie.
  5. W przypadku błędu analizy użytkownik widzi czytelny komunikat oraz może zmienić plik i ponowić próbę.
  6. Po zakończeniu analizy aplikacja odbiera i przechowuje w stanie sesji wynik analizy audio zwrócony przez API; zakres i pola wyników zależą od dostawcy.
  7. Interfejs prezentuje co najmniej stany: "Gotowe do generowania", "Analiza", "Błąd analizy"; stan "Ukończono analizę" jest opcjonalny i może być przejściowy.

#### **Story 1.3: Generowanie i Edycja Opisu**

**Jako** artysta, **chcę** jednym kliknięciem wygenerować notkę prasową o utworze na podstawie moich danych i analizy audio, **aby** móc ją przejrzeć i w razie potrzeby poprawić.

- **Kryteria Akceptacji:**
  1. Przycisk "Generuj opis" jest aktywny dopiero po pomyślnym wprowadzeniu wymaganych danych (Story 1.1) oraz wskazaniu pliku audio (Story 1.2).
  2. Po kliknięciu przycisku aplikacja najpierw analizuje audio, a następnie generuje opis; status prezentowany jest na przycisku: "Analiza audio..." → "Generowanie...".
  3. Aplikacja wysyła: nazwę artysty, opis artysty (ze Story 1.1), wynik analizy audio oraz szablon do API modelu językowego.
  4. Wygenerowany tekst pojawia się w edytowalnym polu tekstowym (textarea).
  5. Użytkownik może swobodnie edytować tekst w polu.
  6. W przypadku błędu analizy lub generowania użytkownik widzi czytelny komunikat oraz może poprawić dane/zmienić plik i ponowić próbę.
  7. Stan interfejsu jest utrzymany w obrębie bieżącej sesji (odświeżenie nie resetuje postępu).

#### **Story 1.4: Wykorzystanie Gotowego Opisu**

**Jako** artysta, **chcę** w prosty sposób skopiować lub pobrać gotowy opis, **aby** móc go natychmiast użyć w swoich kanałach promocyjnych.

- **Kryteria Akceptacji:**
  1. Pod polem z wygenerowanym tekstem znajdują się dwa przyciski: "Kopiuj do schowka" i "Pobierz jako .txt".
  2. Kliknięcie "Kopiuj do schowka" kopiuje całą zawartość pola tekstowego do schowka systemowego.
  3. Po skopiowaniu, użytkownik widzi wizualne potwierdzenie (np. krótki komunikat "Skopiowano!").
  4. Kliknięcie "Pobierz jako .txt" inicjuje pobranie pliku tekstowego o nazwie nazwa_artysty_opis.txt, zawierającego treść z pola tekstowego.

## **4\. Następne Kroki (Handoff zgodny z BMAD)**

### **4.1. Handoff do Architekta**

Ten dokument PRD jest gotowy i stanowi kompletny zbiór wymagań dla wersji MVP. Zgodnie z metodyką BMAD, następnym krokiem jest przekazanie go do roli **Architekta**.  
**Zadanie dla Architekta:**

- Na podstawie tego PRD, stwórz dokument architecture.md.
- Zaprojektuj architekturę aplikacji jednostronicowej (SPA).
- Wybierz i uzasadnij konkretny stack technologiczny (np. React, Vue, Svelte).
- Zdefiniuj, w jaki sposób będą obsługiwane wywołania do zewnętrznych API (audio i AI) po stronie klienta lub przez prosty backend (BFF \- Backend For Frontend).
- Przygotuj architekturę w taki sposób, aby była gotowa do implementacji przez deweloperów.
