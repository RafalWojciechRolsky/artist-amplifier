# **2\. Wymagania**

## **2.1. Wymagania Funkcjonalne (Functional Requirements)**

Wszystkie wymagania funkcjonalne dla MVP zostały ujęte w ramach jednego Epiku, rozbitego na cztery sekwencyjne User Stories.

## **2.2. Wymagania Niefunkcjonalne (Non-Functional Requirements)**

- **NFR1 (Wydajność - MVP):** UI prezentuje prosty status "Przetwarzanie..." podczas wywołań zewnętrznych. Brak skomplikowanych mechanizmów anulowania - jeśli użytkownik zamknie stronę, to jego wybór.
- **NFR2 (Prywatność):** Aplikacja nie może przechowywać żadnych danych wprowadzonych przez użytkownika (plików audio, tekstów) po zakończeniu sesji. Wszystkie dane muszą być przetwarzane w pamięci i usuwane natychmiast po przetworzeniu.
- **NFR3 (Użyteczność):** Interfejs musi być w pełni intuicyjny i nie wymagać żadnych instrukcji ani samouczków. Cały proces powinien być możliwy do ukończenia na jednym ekranie (single page).
- **NFR4 (Kompatybilność):** System przesyłania plików musi akceptować formaty .mp3 i .wav. Maksymalny rozmiar pliku to 50MB.
- **NFR5 (Dostępność i Mobile - MVP):** Interfejs jest responsywny z jednym breakpointem (768px) i spełnia podstawowe wymagania dostępności (labels, kontrast, keyboard access).
