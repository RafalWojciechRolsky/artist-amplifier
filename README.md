# Artist Amplifier

Artist Amplifier to aplikacja internetowa zaprojektowana, aby pomóc muzykom i ich zespołom marketingowym w tworzeniu atrakcyjnych materiałów promocyjnych. Narzędzie pozwala artystom przesyłać utwory muzyczne, podawać podstawowe metadane i automatycznie generować profesjonalne notatki prasowe lub opisy promocyjne.

## ✨ Kluczowe funkcje

- **Prosty interfejs użytkownika**: Czysta, jednostronicowa aplikacja zapewniająca intuicyjną obsługę.
- **Wprowadzanie danych o artyście i utworze**: Podstawowe pola formularza na nazwę artysty i tytuł utworu.
- **Przesyłanie plików audio**: Interfejs do przesyłania utworów metodą "przeciągnij i upuść" lub przez wybór pliku.
- **Integracja z Music.ai**: Komunikacja z Music.ai SDK w celu szczegółowej analizy utworu (gatunek, nastrój, instrumenty itp.).
- **Generowanie treści przez LLM**: Wykorzystanie zaawansowanego modelu językowego (LLM) do tworzenia kreatywnych, angażujących tekstów na podstawie analizy AI.
- **Edytor tekstu**: Prosty edytor tekstu, w którym użytkownicy mogą dopracowywać wygenerowany opis.
- **Kopiowanie i pobieranie**: Przyciski do łatwego kopiowania gotowego tekstu do schowka lub pobierania go jako plik `.txt`.
- **Responsywny design**: Aplikacja jest w pełni funkcjonalna na urządzeniach stacjonarnych i mobilnych.

## ⚙️ Stos technologiczny

- **Frontend**: [Next.js](https://nextjs.org/) (React) z TypeScript.
- **Backend**: Next.js API Routes (BFF - Backend for Frontend).
- **Styling**: [Tailwind CSS](https://tailwindcss.com/).
- **Testowanie**: [Jest](https://jestjs.io/), [Playwright](https://playwright.dev/), [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/).
- **Zewnętrzne API**:
  - **Analiza audio**: Do analizy audio.
  - **Generowanie tekstu (LLM)**: Do generowania tekstu.

## 🚀 Pierwsze kroki

Aby uruchomić projekt lokalnie, postępuj zgodnie z poniższymi krokami.

### Wymagania wstępne

- [Node.js](https://nodejs.org/) (wersja 20 lub nowsza)
- `npm`

### Instalacja

1.  **Sklonuj repozytorium:**

    ```bash
    git clone https://github.com/twoja-nazwa-uzytkownika/artist-amplifier.git
    cd artist-amplifier
    ```

2.  **Zainstaluj zależności:**

    ```bash
    npm install
    ```

3.  **Skonfiguruj zmienne środowiskowe:**
    Utwórz plik `.env.local` na podstawie `.env.example` i uzupełnij wymagane wartości.

    ```bash
    cp .env.example .env.local
    ```

    Otwórz plik `.env.local` i wprowadź swoje klucze API oraz konfigurację.

4.  **Uruchom serwer deweloperski:**
    ```bash
    npm run dev
    ```

Otwórz [http://localhost:3000](http://localhost:3000) w przeglądarce, aby zobaczyć aplikację.

## 📜 Dostępne skrypty

- `npm run dev`: Uruchamia serwer deweloperski z Turbopack.
- `npm run build`: Buduje aplikację do wersji produkcyjnej.
- `npm run start`: Uruchamia serwer produkcyjny.
- `npm run lint`: Uruchamia ESLint w celu analizy kodu.
- `npm run test`: Uruchamia testy jednostkowe i integracyjne za pomocą Jest.

## 🎨 System designu (Neon)

Interfejs użytkownika wykorzystuje motyw retro neon, zdefiniowany w `src/app/globals.css` za pomocą klas użytkowych:

- `aa-heading`, `aa-heading-secondary` — neonowe nagłówki (cyjan / magenta).
- `aa-btn-primary` — główny przycisk CTA (cyjanowa poświata).
- `aa-btn-ghost` — drugorzędne przyciski typu "ghost".
- `aa-field`, `aa-border`, `aa-dashed` — style dla pól input/textarea i przerywanych ramek.
- `aa-pulse` — animacja pulsowania dla stanu zajętości (np. przycisk "Generuj" podczas generowania).

## 🌐 Wdrożenie na Vercel

Najprostszym sposobem na wdrożenie aplikacji Next.js jest użycie [platformy Vercel](https://vercel.com/new) od twórców Next.js.
